import sql from 'mssql';
import { pool } from '../../db.js';
import { getDataScope } from '../../middleware/dataScope.js';
import { PROJECT_DROP_REQUEST_APPLY, formatProjectCode } from '../Reports/dataQc/shared.js';

// Projects dashboard (Major Port Projects - Monitoring & Review Dashboard workbook).
//
// One register row per project, or per sub-project when a project has sub-projects
// (as in the Data List), limited to the caller's data scope. Dropped projects and
// projects with a pending / approved drop request are left out. Every figure on the
// dashboard is worked out from the same filtered register, so the cards, tables,
// charts and drill-down lists always agree. Amounts are in ₹ crore.

const STAGE = Object.freeze({ TENDERING: 12, IMPLEMENTATION: 13, COMPLETED: 14, DROPPED: 99 });

export const STAGE_GROUPS = [
  { id: 'planning', name: 'Planning & Sanctioning' },
  { id: 'tendering', name: 'Under Tendering' },
  { id: 'implementation', name: 'Under Implementation' },
  { id: 'completed', name: 'Completed' },
];

// Bands as defined in the workbook's Project Data sheet.
const COST_BANDS = ['Under 10 Cr', '10 - 50 Cr', '50 - 100 Cr', '100 - 500 Cr', '500 - 1000 Cr', 'Above 1000 Cr', 'Not entered'];
const CAPACITY_BANDS = ['No capacity addition', 'Under 1 MTPA', '1 - 5 MTPA', '5 - 20 MTPA', 'Above 20 MTPA', 'Not entered'];
// Physical progress bands follow the implementation milestones of the input form (20% steps).
const PROGRESS_BANDS = [
  'Milestone 0 (<20%)',
  'Milestone 1 (20-40%)',
  'Milestone 2 (40-60%)',
  'Milestone 3 (60-80%)',
  'Milestone 4 (80-<100%)',
  'Final Milestone (100%)',
  'Not entered',
];
const NOT_ENTERED = 'Not entered';

// Delay status of ongoing projects (completed projects are not classified).
//   Planning & Sanctioning: time from the Project Initiated date to approval (or to today).
//   Under Tendering: the Work Awarded (LOA) date - revised if entered, else planned - against
//   the actual award.
//   Under Implementation: the current target completion date (latest revision, else the
//   first target - as the input form shows it) against completion.
// On time: the due date has not passed (or the step was done by it). Delayed: up to
// DELAY_GRACE_DAYS past the due date. Badly delayed: more than DELAY_GRACE_DAYS past it.
export const DELAY_STATUS = Object.freeze({
  ON_TIME: 'On time',
  DELAYED: 'Delayed',
  BADLY_DELAYED: 'Badly delayed',
  NOT_AVAILABLE: 'Not available',
});
const DELAY_STATUSES = Object.values(DELAY_STATUS);
const DELAY_GRACE_DAYS = 180;
const PLANNING_DELAYED_DAYS = 365;
const PLANNING_BADLY_DELAYED_DAYS = 730;
const PORT_LEVEL_APPROVAL = 'port level approval';

// Date range filters: query key → register field.
const DATE_FILTERS = {
  initiated: 'initiatedDate',
  chairmanApproval: 'chairmanApprovalDate',
  adminApproval: 'adminApprovalDate',
  sanctioned: 'sanctionDate',
  awardOriginal: 'awardPlannedDate',
  awardLatest: 'awardLatestDate',
  awardActual: 'awardActualDate',
  targetOriginal: 'originalTargetDate',
  targetLatest: 'latestTargetDate',
  completion: 'actualCompletionDate',
  foundationActual: 'foundationDate',
  foundationExpected: 'foundationTentativeDate',
  inaugurationActual: 'inaugurationDate',
  inaugurationExpected: 'inaugurationTentativeDate',
  lastUpdated: 'lastUpdated',
};

// Value range filters: query key → register field.
const RANGE_FILTERS = {
  estimatedCost: 'estimatedCost',
  physicalProgress: 'physicalProgress',
  capacity: 'capacityAddition',
};

// Selection filters: query key → register field (an exact match on the label).
const SELECT_FILTERS = {
  delayStatus: 'delayStatus',
  broadCategory: 'broadCategory',
  category: 'category',
  mode: 'mode',
  approvalRoute: 'approvalRoute',
  state: 'state',
  scheme: 'scheme',
  funding: 'funding',
  costBand: 'costBand',
  capacityBand: 'capacityBand',
  progressBand: 'progressBand',
  foundationLaid: 'foundationLaid',
  inaugurated: 'inaugurated',
};

// Financial-year columns of the Date Analysis sheet: key → register FY field.
const FY_EVENTS = {
  initiated: 'initiatedFy',
  sanctioned: 'sanctionFy',
  awarded: 'awardFy',
  completed: 'completionFy',
  foundation: 'foundationFy',
  inauguration: 'inaugurationFy',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FILTER_LENGTH = 300;

const crore = (v) => Math.round((Number(v) || 0) * 100) / 100;
const round1 = (v) => (v === null ? null : Math.round(v * 10) / 10);
const hasNumber = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const sumOf = (rows, field) => rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
const average = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// Child tables store project-level rows with sub_project_id '-1' (or a blank-ish value).
const childSubKey = (column) => `CASE
  WHEN ${column} IS NULL OR TRIM(CAST(${column} AS varchar(50))) IN ('-1', '-', '0', '', 'null', 'undefined') THEN '-1'
  ELSE TRIM(CAST(${column} AS varchar(50)))
END`;

const splitNames = (column, table, idColumn, nameColumn) => `(
  SELECT STRING_AGG(m.${nameColumn}, ', ')
  FROM STRING_SPLIT(CONVERT(varchar(max), ${column}), ',') x
  JOIN ${table} m ON m.${idColumn} = TRY_CAST(LTRIM(RTRIM(x.value)) AS int)
)`;

const EXPENDITURE_SUM = `
  COALESCE(e.gbs_components, 0) + COALESCE(e.iebr_components, 0) + COALESCE(e.ppp_components, 0) +
  COALESCE(e.loans_components, 0) + COALESCE(e.multilateral_components, 0) + COALESCE(e.state_gov_fund_components, 0) +
  COALESCE(e.pmmsy_components, 0) + COALESCE(e.sagarmala_components, 0) + COALESCE(e.other_source_funding_comp, 0)`;

// The register: one row per project / sub-project with every field the dashboard uses.
function registerSql(scopeSql) {
  return `
    WITH Units AS (
      SELECT
        p.project_id,
        sp.sub_project_id,
        ISNULL(CAST(sp.sub_project_id AS varchar(50)), '-1') AS sub_key,
        p.project_name,
        sp.sub_project_name,
        ISNULL(sp.sub_organisation_id, p.organisation_id) AS organisation_id,
        ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) AS stage_id,
        ISNULL(sp.sub_project_type, p.project_type) AS approval_route,
        ISNULL(sp.sub_mode_of_implememtation, p.mode_of_implememtation) AS mode,
        ISNULL(sp.sub_scheme_id, p.scheme_id) AS scheme_id,
        CONVERT(nvarchar(max), ISNULL(sp.sub_project_category_id, p.project_category_id)) AS category_ids,
        CONVERT(nvarchar(max), ISNULL(sp.sub_state_id, p.state_id)) AS state_ids,
        CONVERT(nvarchar(max), ISNULL(sp.sub_district_id, p.district_id)) AS district_ids,
        CONVERT(nvarchar(max), ISNULL(sp.sub_source_of_funding_id, p.source_of_funding_id)) AS funding_ids,
        ISNULL(sp.sub_primary_ia_id, p.primary_ia_id) AS ia_id,
        TRY_CAST(ISNULL(sp.sub_estimated_cost, p.estimated_cost) AS float) AS estimated_cost,
        TRY_CAST(ISNULL(sp.sub_sanctioned_cost, p.sanctioned_cost) AS float) AS sanctioned_cost,
        TRY_CAST(ISNULL(sp.sub_award_project_cost, p.award_project_cost) AS float) AS awarded_cost,
        TRY_CAST(ISNULL(sp.sub_capacity_addition, p.capacity_addition) AS float) AS capacity_addition,
        TRY_CAST(ISNULL(sp.sub_project_intiated_date, p.project_intiated_date) AS date) AS initiated_date,
        TRY_CAST(ISNULL(sp.sub_chairman_approval_date, p.chairman_approval_date) AS date) AS chairman_approval_date,
        TRY_CAST(ISNULL(sp.sub_admin_approval_approval_date, p.admin_approval_approval_date) AS date) AS admin_approval_date,
        TRY_CAST(ISNULL(sp.sub_target_completion_date, p.target_completion_date) AS date) AS original_target_date,
        TRY_CAST(ISNULL(sp.sub_actual_date_of_completion, p.actual_date_of_completion) AS date) AS actual_completion_date,
        TRY_CAST(ISNULL(sp.sub_foundation_laid, p.foundation_laid) AS int) AS foundation_laid,
        TRY_CAST(ISNULL(sp.sub_foundation_laid_date, p.foundation_laid_date) AS date) AS foundation_date,
        TRY_CAST(ISNULL(sp.sub_foundation_tentative_date, p.foundation_tentative_date) AS date) AS foundation_tentative_date,
        TRY_CAST(ISNULL(sp.sub_inauguration_value, p.inauguration_value) AS int) AS inaugurated,
        TRY_CAST(ISNULL(sp.sub_inauguration_date, p.inauguration_date) AS date) AS inauguration_date,
        TRY_CAST(ISNULL(sp.sub_tentative_inauguration_date, p.tentative_inauguration_date) AS date) AS inauguration_tentative_date,
        ISNULL(sp.sub_last_updated, p.last_updated) AS last_updated
      FROM tbl_project p
      LEFT JOIN tbl_sub_project sp ON sp.project_id = p.project_id
      ${PROJECT_DROP_REQUEST_APPLY}
      WHERE ISNULL(sp.sub_status, p.status) != 0
        AND (dropReq.drop_status IS NULL OR dropReq.drop_status = 'Rejected')
        AND ISNULL(ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id), 0) != ${STAGE.DROPPED}
        ${scopeSql}
    ),
    Progress AS (
      SELECT project_id, ${childSubKey('sub_project_id')} AS sub_key, MAX(TRY_CAST(physical_progress AS float)) AS physical_progress
      FROM tbl_project_physical_progress
      GROUP BY project_id, ${childSubKey('sub_project_id')}
    ),
    Expenditure AS (
      SELECT e.project_id, ${childSubKey('e.sub_project_id')} AS sub_key,
             SUM(${EXPENDITURE_SUM}) AS till_date,
             SUM(CASE WHEN TRY_CAST(e.expenditure_date AS date) BETWEEN @fyStart AND @today THEN ${EXPENDITURE_SUM} ELSE 0 END) AS current_fy
      FROM tbl_project_expenditure e
      GROUP BY e.project_id, ${childSubKey('e.sub_project_id')}
    ),
    Outlay AS (
      SELECT project_id, ${childSubKey('sub_project_id')} AS sub_key, SUM(TRY_CAST(expenditure_outlay AS float)) AS outlay
      FROM tbl_project_expenditure_outlay
      WHERE year = @financialYear
      GROUP BY project_id, ${childSubKey('sub_project_id')}
    ),
    Award AS (
      SELECT project_id, ${childSubKey('sub_project_id')} AS sub_key,
             MAX(TRY_CAST(planned_date AS date)) AS planned_date,
             MAX(TRY_CAST(revised_date AS date)) AS revised_date,
             MAX(TRY_CAST(actual_date AS date)) AS actual_date
      FROM tbl_project_date
      WHERE TRY_CAST(sub_stage_id AS int) = 9
      GROUP BY project_id, ${childSubKey('sub_project_id')}
    ),
    Revisions AS (
      SELECT project_id, sub_key, COUNT(*) AS revisions,
             MAX(CASE WHEN rn = 1 THEN revised_date END) AS latest_revised_date
      FROM (
        SELECT project_id, ${childSubKey('sub_project_id')} AS sub_key,
               TRY_CAST(revised_target_completion_date AS date) AS revised_date,
               ROW_NUMBER() OVER (PARTITION BY project_id, ${childSubKey('sub_project_id')} ORDER BY revised_on DESC) AS rn
        FROM tbl_project_target_date_history
        WHERE revised_target_completion_date IS NOT NULL
      ) h
      GROUP BY project_id, sub_key
    )
    SELECT
      u.project_id, u.sub_project_id, u.sub_key, u.project_name, u.sub_project_name,
      u.organisation_id, o.organisation_name, o.organisation_code,
      o.organisation_category_id, oc.organisation_category_name,
      u.stage_id, LTRIM(RTRIM(stage.stage_name)) AS stage_name,
      u.approval_route, u.mode, sch.scheme_name, ia.ia_name,
      ${splitNames('u.category_ids', 'mmt_project_category', 'project_category_id', 'project_category_name')} AS category_names,
      bc.broad_category_name,
      ${splitNames('u.state_ids', 'mmt_state', 'state_id', 'state_name')} AS state_names,
      ${splitNames('u.district_ids', 'mmt_district', 'district_id', 'district_name')} AS district_names,
      ${splitNames('u.funding_ids', 'mmt_source_of_funding', 'source_of_funding_id', 'source_of_funding_name')} AS funding_names,
      u.estimated_cost, u.sanctioned_cost, u.awarded_cost, u.capacity_addition,
      ex.till_date AS expenditure, ex.current_fy AS current_fy_expenditure, ol.outlay AS current_fy_target,
      pg.physical_progress,
      u.initiated_date, u.chairman_approval_date, u.admin_approval_date,
      aw.planned_date AS award_planned_date, aw.revised_date AS award_revised_date, aw.actual_date AS award_actual_date,
      u.original_target_date, rv.latest_revised_date, ISNULL(rv.revisions, 0) AS revisions,
      u.actual_completion_date,
      u.foundation_laid, u.foundation_date, u.foundation_tentative_date,
      u.inaugurated, u.inauguration_date, u.inauguration_tentative_date,
      u.last_updated
    FROM Units u
    LEFT JOIN mmt_organisation o ON o.organisation_id = u.organisation_id
    LEFT JOIN mmt_organisation_category oc ON oc.organisation_category_id = o.organisation_category_id
    LEFT JOIN tbl_project_stage stage ON stage.stage_id = u.stage_id
    LEFT JOIN mmt_scheme sch ON sch.scheme_id = u.scheme_id
    LEFT JOIN mmt_implementing_agency ia ON ia.ia_id = u.ia_id
    -- Broad category of the first project category, as in the earlier portal.
    LEFT JOIN mmt_project_category firstCat
      ON firstCat.project_category_id = TRY_CAST(LTRIM(RTRIM(LEFT(u.category_ids, CHARINDEX(',', u.category_ids + ',') - 1))) AS int)
    LEFT JOIN mmt_broad_category bc ON bc.broad_category_id = firstCat.broad_category_id
    LEFT JOIN Progress pg ON pg.project_id = u.project_id AND pg.sub_key = u.sub_key
    LEFT JOIN Expenditure ex ON ex.project_id = u.project_id AND ex.sub_key = u.sub_key
    LEFT JOIN Outlay ol ON ol.project_id = u.project_id AND ol.sub_key = u.sub_key
    LEFT JOIN Award aw ON aw.project_id = u.project_id AND aw.sub_key = u.sub_key
    LEFT JOIN Revisions rv ON rv.project_id = u.project_id AND rv.sub_key = u.sub_key;
  `;
}

// Financial year (April–March) a date falls in, e.g. "2026-2027".
function financialYearOf(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

// Dates outside these years (e.g. 01-01-0001, or 0026 for 2026) cannot be true and are
// treated as not recorded, as the workbook does.
const MIN_YEAR = 1950;
const MAX_YEAR = 2100;

function toIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return d.toISOString().slice(0, 10);
}

const daysBetween = (from, to) => (from && to ? Math.round((new Date(to) - new Date(from)) / DAY_MS) : null);

function stageGroupOf(stageId) {
  const id = Number(stageId);
  if (id === STAGE.COMPLETED) return 'completed';
  if (id === STAGE.IMPLEMENTATION) return 'implementation';
  if (id === STAGE.TENDERING) return 'tendering';
  return 'planning';
}

function costBandOf(v) {
  if (!hasNumber(v)) return NOT_ENTERED;
  if (v < 10) return COST_BANDS[0];
  if (v < 50) return COST_BANDS[1];
  if (v < 100) return COST_BANDS[2];
  if (v < 500) return COST_BANDS[3];
  if (v < 1000) return COST_BANDS[4];
  return COST_BANDS[5];
}

function capacityBandOf(v) {
  if (!hasNumber(v)) return NOT_ENTERED;
  if (v <= 0) return CAPACITY_BANDS[0];
  if (v < 1) return CAPACITY_BANDS[1];
  if (v < 5) return CAPACITY_BANDS[2];
  if (v < 20) return CAPACITY_BANDS[3];
  return CAPACITY_BANDS[4];
}

// Same steps as milestoneIndexForProgress in the input form: 20% bands, 100% = Final.
function progressBandOf(v) {
  if (!hasNumber(v)) return NOT_ENTERED;
  if (v >= 100) return PROGRESS_BANDS[5];
  return PROGRESS_BANDS[Math.min(Math.floor(Math.max(v, 0) / 20), 4)];
}

// Due date against the date the step was done (or today).
function scheduleDelay(dueDate, doneDate, today) {
  if (!dueDate) return DELAY_STATUS.NOT_AVAILABLE;
  const reference = doneDate || today;
  if (reference <= dueDate) return DELAY_STATUS.ON_TIME;
  return daysBetween(dueDate, reference) <= DELAY_GRACE_DAYS ? DELAY_STATUS.DELAYED : DELAY_STATUS.BADLY_DELAYED;
}

function delayStatusOf(row, today) {
  if (row.stageGroup === 'completed') return null;
  if (row.stageGroup === 'tendering') {
    return scheduleDelay(row.awardLatestDate, row.awardActualDate, today);
  }
  if (row.stageGroup === 'implementation') {
    return scheduleDelay(row.latestTargetDate, row.actualCompletionDate, today);
  }
  if (!row.initiatedDate) return DELAY_STATUS.NOT_AVAILABLE;
  const elapsed = daysBetween(row.initiatedDate, row.sanctionDate || today);
  if (elapsed <= PLANNING_DELAYED_DAYS) return DELAY_STATUS.ON_TIME;
  return elapsed <= PLANNING_BADLY_DELAYED_DAYS ? DELAY_STATUS.DELAYED : DELAY_STATUS.BADLY_DELAYED;
}

const label = (v) => (v === null || v === undefined || String(v).trim() === '' ? NOT_ENTERED : String(v).trim());
const yesNo = (v) => (Number(v) === 1 ? 'Yes' : 'No');

// One register row → the shape every summary, filter and list works from.
function shapeRow(r, today) {
  const row = shapeFields(r);
  row.delayStatus = delayStatusOf(row, today);
  return row;
}

function shapeFields(r) {
  const awardActualDate = toIsoDate(r.award_actual_date);
  const initiatedDate = toIsoDate(r.initiated_date);
  const chairmanApprovalDate = toIsoDate(r.chairman_approval_date);
  const adminApprovalDate = toIsoDate(r.admin_approval_date);
  // Sanction (approval) date follows the stage gate: the chairman / board approval for
  // Port Level Approval projects, the administrative approval for every other route.
  const sanctionDate = String(r.approval_route || '').trim().toLowerCase() === PORT_LEVEL_APPROVAL
    ? chairmanApprovalDate
    : adminApprovalDate;
  const originalTargetDate = toIsoDate(r.original_target_date);
  const latestTargetDate = toIsoDate(r.latest_revised_date) || originalTargetDate;
  const foundationDate = toIsoDate(r.foundation_date);
  const foundationTentativeDate = toIsoDate(r.foundation_tentative_date);
  const inaugurationDate = toIsoDate(r.inauguration_date);
  const inaugurationTentativeDate = toIsoDate(r.inauguration_tentative_date);
  const actualCompletionDate = toIsoDate(r.actual_completion_date);
  const estimatedCost = hasNumber(r.estimated_cost) ? Number(r.estimated_cost) : null;
  const awardedCost = hasNumber(r.awarded_cost) ? Number(r.awarded_cost) : null;
  const expenditure = Number(r.expenditure) || 0;
  const physicalProgress = hasNumber(r.physical_progress) ? Number(r.physical_progress) : null;
  const capacityAddition = hasNumber(r.capacity_addition) ? Number(r.capacity_addition) : null;
  const sanctionToAward = daysBetween(sanctionDate, awardActualDate);
  const initiationToAward = daysBetween(initiatedDate, awardActualDate);
  const subProjectId = r.sub_project_id ?? null;

  return {
    key: `${r.project_id}::${r.sub_key}`,
    projectId: r.project_id,
    subProjectId,
    code: formatProjectCode(r.project_id, subProjectId),
    projectName: r.project_name || '',
    subProjectName: r.sub_project_name || '',
    organisationId: r.organisation_id,
    organisationName: r.organisation_name || NOT_ENTERED,
    organisationCode: r.organisation_code || r.organisation_name || NOT_ENTERED,
    organisationTypeId: r.organisation_category_id ?? null,
    organisationType: r.organisation_category_name || NOT_ENTERED,
    stageId: hasNumber(r.stage_id) ? Number(r.stage_id) : 0,
    stageName: label(r.stage_name),
    stageGroup: stageGroupOf(r.stage_id),
    category: label(r.category_names),
    broadCategory: label(r.broad_category_name),
    mode: label(r.mode),
    approvalRoute: label(r.approval_route),
    state: label(r.state_names),
    district: label(r.district_names),
    scheme: label(r.scheme_name),
    funding: label(r.funding_names),
    implementingAgency: r.ia_name || '',
    estimatedCost,
    sanctionedCost: hasNumber(r.sanctioned_cost) ? Number(r.sanctioned_cost) : null,
    awardedCost,
    expenditure,
    currentFyTarget: Number(r.current_fy_target) || 0,
    currentFyExpenditure: Number(r.current_fy_expenditure) || 0,
    physicalProgress,
    financialProgress: awardedCost > 0 ? (expenditure / awardedCost) * 100 : null,
    capacityAddition,
    costBand: costBandOf(estimatedCost),
    capacityBand: capacityBandOf(capacityAddition),
    progressBand: progressBandOf(physicalProgress),
    initiatedDate,
    chairmanApprovalDate,
    adminApprovalDate,
    sanctionDate,
    awardPlannedDate: toIsoDate(r.award_planned_date),
    awardRevisedDate: toIsoDate(r.award_revised_date),
    awardLatestDate: toIsoDate(r.award_revised_date) || toIsoDate(r.award_planned_date),
    awardActualDate,
    originalTargetDate,
    revisedTargetDate: toIsoDate(r.latest_revised_date),
    latestTargetDate,
    revisions: Number(r.revisions) || 0,
    actualCompletionDate,
    foundationLaid: yesNo(r.foundation_laid),
    foundationDate,
    foundationTentativeDate,
    inaugurated: yesNo(r.inaugurated),
    inaugurationDate,
    inaugurationTentativeDate,
    lastUpdated: toIsoDate(r.last_updated),
    // Days are counted only when the later date is on or after the earlier one.
    daysSanctionToAward: sanctionToAward !== null && sanctionToAward >= 0 ? sanctionToAward : null,
    daysInitiationToAward: initiationToAward !== null && initiationToAward >= 0 ? initiationToAward : null,
    slippageDays: originalTargetDate && latestTargetDate ? daysBetween(originalTargetDate, latestTargetDate) : null,
    initiatedFy: financialYearOf(initiatedDate),
    sanctionFy: financialYearOf(sanctionDate),
    awardFy: financialYearOf(awardActualDate),
    completionFy: financialYearOf(actualCompletionDate),
    foundationFy: financialYearOf(foundationDate || foundationTentativeDate),
    inaugurationFy: financialYearOf(inaugurationDate || inaugurationTentativeDate),
  };
}

// Ministry / master users see every organisation; organisation users only their own.
function scopeFilter(req, request) {
  const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
  if (isWide) return '';
  if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) return ' AND 1 = 0';
  request.input('scopeOrgId', sql.Int, organisationId);
  return ' AND ISNULL(sp.sub_organisation_id, p.organisation_id) = @scopeOrgId';
}

function currentFinancialYear(today = new Date()) {
  const start = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return { label: `${start}-${start + 1}`, start: new Date(Date.UTC(start, 3, 1)) };
}

// Every register row the caller may see, before the dashboard filters.
async function loadRegister(req) {
  const conn = await pool;
  const request = conn.request();
  const today = new Date();
  const fy = currentFinancialYear(today);
  request.input('financialYear', sql.NVarChar(20), fy.label);
  request.input('fyStart', sql.Date, fy.start);
  request.input('today', sql.Date, today);
  const scopeSql = scopeFilter(req, request);
  const { recordset } = await request.query(registerSql(scopeSql));
  const asOn = toIsoDate(today);
  return { rows: recordset.map((r) => shapeRow(r, asOn)), financialYear: fy.label };
}

const cleanText = (v) => {
  const text = String(v ?? '').trim();
  return text && text !== 'all' && text.length <= MAX_FILTER_LENGTH ? text : null;
};
const cleanNumber = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const cleanDate = (v) => (DATE_PATTERN.test(String(v || '')) ? String(v) : null);

// Dashboard filters from the query string; anything left out (or "all") is not applied.
function parseFilters(query) {
  const filters = {
    organisationTypeId: cleanNumber(cleanText(query.organisationTypeId)),
    organisationId: cleanNumber(cleanText(query.organisationId)),
    stageGroup: STAGE_GROUPS.some((g) => g.id === query.stageGroup) ? query.stageGroup : null,
    stageId: cleanNumber(cleanText(query.stageId)),
    select: {},
    ranges: {},
    dates: {},
  };
  Object.keys(SELECT_FILTERS).forEach((key) => {
    const value = cleanText(query[key]);
    if (value) filters.select[key] = value;
  });
  Object.keys(RANGE_FILTERS).forEach((key) => {
    const min = cleanNumber(query[`${key}Min`]);
    const max = cleanNumber(query[`${key}Max`]);
    if (min !== null || max !== null) filters.ranges[key] = { min, max };
  });
  Object.keys(DATE_FILTERS).forEach((key) => {
    const from = cleanDate(query[`${key}From`]);
    const to = cleanDate(query[`${key}To`]);
    if (from || to) filters.dates[key] = { from, to };
  });
  return filters;
}

// The workbook's "In Current Filter" flag: selection, value-range and date-range filters.
// A range end left blank is open; a row with no value fails a range that is set.
function matchesFilters(row, filters) {
  if (filters.organisationTypeId !== null && row.organisationTypeId !== filters.organisationTypeId) return false;
  if (filters.organisationId !== null && row.organisationId !== filters.organisationId) return false;
  if (filters.stageGroup && row.stageGroup !== filters.stageGroup) return false;
  if (filters.stageId !== null && row.stageId !== filters.stageId) return false;
  for (const [key, value] of Object.entries(filters.select)) {
    if (row[SELECT_FILTERS[key]] !== value) return false;
  }
  for (const [key, { min, max }] of Object.entries(filters.ranges)) {
    const v = row[RANGE_FILTERS[key]];
    if (!hasNumber(v)) return false;
    if (min !== null && v < min) return false;
    if (max !== null && v > max) return false;
  }
  for (const [key, { from, to }] of Object.entries(filters.dates)) {
    const v = row[DATE_FILTERS[key]];
    if (!v) return false;
    if (from && v < from) return false;
    if (to && v > to) return false;
  }
  return true;
}

// Drill-down: which rows a clicked figure stands for. dim → the row's value for that dimension.
const DRILL_DIMENSIONS = {
  stageGroup: (r) => r.stageGroup,
  completion: (r) => (r.stageGroup === 'completed' ? 'completed' : 'ongoing'),
  delayStatus: (r) => r.delayStatus,
  ongoingMode: (r) => (r.stageGroup === 'completed' ? null : r.mode),
  stage: (r) => String(r.stageId),
  organisation: (r) => String(r.organisationId),
  organisationType: (r) => String(r.organisationTypeId),
  category: (r) => r.category,
  broadCategory: (r) => r.broadCategory,
  mode: (r) => r.mode,
  approvalRoute: (r) => r.approvalRoute,
  state: (r) => r.state,
  scheme: (r) => r.scheme,
  funding: (r) => r.funding,
  costBand: (r) => r.costBand,
  capacityBand: (r) => r.capacityBand,
  progressBand: (r) => r.progressBand,
  foundationLaid: (r) => r.foundationLaid,
  inaugurated: (r) => r.inaugurated,
  revisedTarget: (r) => (r.revisions > 0 ? 'Yes' : 'No'),
  capacityAdded: (r) => (r.capacityAddition > 0 ? 'Yes' : 'No'),
  currentFyTarget: (r) => (r.currentFyTarget > 0 ? 'Yes' : 'No'),
  sanctionToAward: (r) => (r.daysSanctionToAward !== null ? r.mode : null),
  initiationToAward: (r) => (r.daysInitiationToAward !== null ? r.mode : null),
  ...Object.fromEntries(Object.entries(FY_EVENTS).map(([event, field]) => [`fy-${event}`, (r) => r[field]])),
};

// Rows behind a clicked figure. dim/value pick the figure; dim2/value2 narrow a matrix cell
// (e.g. organisation × stage). With no dim, every filtered row is returned.
function drillRows(rows, query) {
  const pick = (list, dim, value) => {
    const fn = DRILL_DIMENSIONS[dim];
    if (!fn || value === null) return list;
    return list.filter((r) => String(fn(r)) === value);
  };
  const first = pick(rows, String(query.dim || ''), cleanText(query.value));
  return pick(first, String(query.dim2 || ''), cleanText(query.value2));
}

// Group rows by a key and summarise each group with the given builder, in a fixed order
// (order list first, the rest by project count).
function groupBy(rows, keyOf, build, order = null) {
  const groups = new Map();
  rows.forEach((r) => {
    const key = keyOf(r);
    if (key === null || key === undefined) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  const entries = [...groups.entries()].map(([key, list]) => ({ key, ...build(list, key) }));
  if (order) {
    const rank = new Map(order.map((k, i) => [k, i]));
    return entries.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
  }
  return entries.sort((a, b) => b.projects - a.projects || String(a.key).localeCompare(String(b.key)));
}

const avgProgress = (list) => round1(average(list.filter((r) => hasNumber(r.physicalProgress)).map((r) => r.physicalProgress)));
const avgDays = (list, field) => {
  const v = average(list.map((r) => r[field]).filter((d) => d !== null));
  return v === null ? null : Math.round(v);
};

// Projects / estimated cost / expenditure / average physical progress, as on the
// Parameter Analysis sheet.
const parameterGroup = (list) => ({
  projects: list.length,
  estimatedCost: crore(sumOf(list, 'estimatedCost')),
  expenditure: crore(sumOf(list, 'expenditure')),
  avgProgress: avgProgress(list),
});

const modeSplit = (list, costField) => Object.fromEntries(['EPC', 'PPP'].map((mode) => {
  const m = list.filter((r) => r.mode === mode);
  return [mode.toLowerCase(), { projects: m.length, cost: crore(sumOf(m, costField)) }];
}));

function buildSummary(rows) {
  const ongoing = rows.filter((r) => r.stageGroup !== 'completed');
  const byGroup = (id) => rows.filter((r) => r.stageGroup === id);
  const estimatedCost = sumOf(rows, 'estimatedCost');
  const expenditure = sumOf(rows, 'expenditure');
  const currentFyTarget = sumOf(rows, 'currentFyTarget');
  const currentFyExpenditure = sumOf(rows, 'currentFyExpenditure');
  const epc = rows.filter((r) => r.mode === 'EPC');
  const ppp = rows.filter((r) => r.mode === 'PPP');

  const kpis = {
    projects: rows.length,
    completed: byGroup('completed').length,
    implementation: byGroup('implementation').length,
    tendering: byGroup('tendering').length,
    planning: byGroup('planning').length,
    estimatedCost: crore(estimatedCost),
    sanctionedCost: crore(sumOf(rows, 'sanctionedCost')),
    // Awarded cost counts non-negative amounts only, as in the workbook.
    awardedCost: crore(rows.reduce((acc, r) => acc + (r.awardedCost > 0 ? r.awardedCost : 0), 0)),
    expenditure: crore(expenditure),
    expenditurePercent: estimatedCost > 0 ? round1((expenditure / estimatedCost) * 100) : null,
    currentFyTarget: crore(currentFyTarget),
    currentFyExpenditure: crore(currentFyExpenditure),
    currentFySpendPercent: currentFyTarget > 0 ? round1((currentFyExpenditure / currentFyTarget) * 100) : null,
    avgProgressOngoing: avgProgress(ongoing),
    capacityAddition: crore(rows.reduce((acc, r) => acc + (r.capacityAddition > 0 ? r.capacityAddition : 0), 0)),
    revisedTarget: rows.filter((r) => r.revisions > 0).length,
    foundationLaid: rows.filter((r) => r.foundationLaid === 'Yes').length,
    inaugurated: rows.filter((r) => r.inaugurated === 'Yes').length,
    avgDaysSanctionToAward: { epc: avgDays(epc, 'daysSanctionToAward'), ppp: avgDays(ppp, 'daysSanctionToAward') },
    avgDaysInitiationToAward: { epc: avgDays(epc, 'daysInitiationToAward'), ppp: avgDays(ppp, 'daysInitiationToAward') },
    ongoing: ongoing.length,
    ongoingEstimatedCost: crore(sumOf(ongoing, 'estimatedCost')),
  };

  // Delay status of ongoing projects, overall and per stage.
  const delayCounts = (list) => Object.fromEntries(DELAY_STATUSES.map((s) => [s, list.filter((r) => r.delayStatus === s).length]));
  const delay = {
    statuses: DELAY_STATUSES,
    total: delayCounts(ongoing),
    byStage: Object.fromEntries(STAGE_GROUPS.filter((g) => g.id !== 'completed').map((g) => [g.id, delayCounts(byGroup(g.id))])),
  };

  // Stage cards of the earlier portal: count, cost, capacity and the EPC / PPP split.
  // Planning shows the estimated cost; later stages the awarded cost.
  const stageCards = STAGE_GROUPS.map((g) => {
    const list = byGroup(g.id);
    const costField = g.id === 'planning' ? 'estimatedCost' : 'awardedCost';
    return {
      id: g.id,
      name: g.name,
      projects: list.length,
      costLabel: g.id === 'planning' ? 'Estimated cost' : 'Awarded cost',
      cost: crore(sumOf(list, costField)),
      capacity: crore(list.reduce((acc, r) => acc + (r.capacityAddition > 0 ? r.capacityAddition : 0), 0)),
      ...modeSplit(list, costField),
    };
  });

  const byStage = groupBy(rows, (r) => r.stageId, (list) => ({
    name: list[0].stageName,
    group: list[0].stageGroup,
    projects: list.length,
    estimatedCost: crore(sumOf(list, 'estimatedCost')),
  })).sort((a, b) => a.key - b.key);

  const stages = byStage.map((s) => ({ id: s.key, name: s.name }));

  // Port Analysis sheet (Overdue, On-time rate and Avg overrun left out). Current-year
  // spend counts projects under implementation only.
  const byOrganisation = groupBy(rows, (r) => r.organisationId, (list) => {
    const first = list[0];
    const implementation = list.filter((r) => r.stageGroup === 'implementation');
    const completed = list.filter((r) => r.stageGroup === 'completed').length;
    return {
      name: first.organisationName,
      code: first.organisationCode,
      projects: list.length,
      completed,
      ongoing: list.length - completed,
      estimatedCost: crore(sumOf(list, 'estimatedCost')),
      sanctionedCost: crore(sumOf(list, 'sanctionedCost')),
      awardedCost: crore(list.reduce((acc, r) => acc + (r.awardedCost > 0 ? r.awardedCost : 0), 0)),
      expenditure: crore(sumOf(list, 'expenditure')),
      currentFyTarget: crore(sumOf(list, 'currentFyTarget')),
      currentFySpendImplementation: crore(sumOf(implementation, 'currentFyExpenditure')),
      avgProgress: avgProgress(list),
      capacity: crore(list.reduce((acc, r) => acc + (r.capacityAddition > 0 ? r.capacityAddition : 0), 0)),
      byStage: Object.fromEntries(stages.map((s) => [s.id, list.filter((r) => r.stageId === s.id).length])),
      byProgressBand: Object.fromEntries(PROGRESS_BANDS.map((b) => [b, list.filter((r) => r.progressBand === b).length])),
      byDelayStatus: delayCounts(list.filter((r) => r.stageGroup !== 'completed')),
    };
  })
    .map(({ key, ...o }) => ({ id: key, ...o }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  // Category Analysis sheet (Overdue and Avg physical progress left out).
  const byCategory = groupBy(rows, (r) => r.category, (list) => {
    const completed = list.filter((r) => r.stageGroup === 'completed').length;
    return {
      projects: list.length,
      completed,
      ongoing: list.length - completed,
      estimatedCost: crore(sumOf(list, 'estimatedCost')),
      awardedCost: crore(list.reduce((acc, r) => acc + (r.awardedCost > 0 ? r.awardedCost : 0), 0)),
      expenditure: crore(sumOf(list, 'expenditure')),
      capacity: crore(list.reduce((acc, r) => acc + (r.capacityAddition > 0 ? r.capacityAddition : 0), 0)),
    };
  });

  // Broad category with the EPC / PPP split of ongoing projects (earlier portal).
  const byBroadCategory = groupBy(rows, (r) => r.broadCategory, (list) => {
    const live = list.filter((r) => r.stageGroup !== 'completed');
    return {
      projects: list.length,
      ongoing: live.length,
      ongoingEpc: live.filter((r) => r.mode === 'EPC').length,
      ongoingPpp: live.filter((r) => r.mode === 'PPP').length,
      estimatedCost: crore(sumOf(list, 'estimatedCost')),
      ongoingEstimatedCost: crore(sumOf(live, 'estimatedCost')),
    };
  });

  // Date Analysis sheet: events per financial year (targets due and cost columns left out).
  const years = [...new Set(rows.flatMap((r) => Object.values(FY_EVENTS).map((f) => r[f])).filter(Boolean))].sort();
  const byFinancialYear = years.map((fy) => ({
    financialYear: fy,
    ...Object.fromEntries(Object.entries(FY_EVENTS).map(([event, field]) => [event, rows.filter((r) => r[field] === fy).length])),
  }));

  // Parameter Analysis sheet (Overdue left out). Core category is not stored in the
  // portal, so broad category takes its place.
  const parameters = {
    broadCategory: groupBy(rows, (r) => r.broadCategory, parameterGroup),
    mode: groupBy(rows, (r) => r.mode, parameterGroup),
    approvalRoute: groupBy(rows, (r) => r.approvalRoute, parameterGroup),
    state: groupBy(rows, (r) => r.state, parameterGroup),
    scheme: groupBy(rows, (r) => r.scheme, parameterGroup),
    funding: groupBy(rows, (r) => r.funding, parameterGroup),
    costBand: groupBy(rows, (r) => r.costBand, parameterGroup, COST_BANDS),
    capacityBand: groupBy(rows, (r) => r.capacityBand, parameterGroup, CAPACITY_BANDS),
    progressBand: groupBy(rows, (r) => r.progressBand, parameterGroup, PROGRESS_BANDS),
  };

  // Watchlist: the twenty largest projects by estimated cost.
  const largest = rows
    .filter((r) => hasNumber(r.estimatedCost))
    .sort((a, b) => b.estimatedCost - a.estimatedCost)
    .slice(0, 20)
    .map(listRow);

  const lastUpdated = rows.reduce((max, r) => (r.lastUpdated && (!max || r.lastUpdated > max) ? r.lastUpdated : max), null);

  return {
    kpis,
    delay,
    stageCards,
    byStage,
    stages,
    progressBands: PROGRESS_BANDS,
    byOrganisation,
    byCategory,
    byBroadCategory,
    byFinancialYear,
    parameters,
    largest,
    lastUpdated,
  };
}

// A project as shown in drill-down lists.
function listRow(r) {
  return {
    key: r.key,
    projectId: r.projectId,
    subProjectId: r.subProjectId,
    code: r.code,
    projectName: r.projectName,
    subProjectName: r.subProjectName,
    organisationName: r.organisationName,
    stageName: r.stageName,
    category: r.category,
    mode: r.mode,
    approvalRoute: r.approvalRoute,
    scheme: r.scheme,
    estimatedCost: r.estimatedCost === null ? null : crore(r.estimatedCost),
    sanctionedCost: r.sanctionedCost === null ? null : crore(r.sanctionedCost),
    awardedCost: r.awardedCost === null ? null : crore(r.awardedCost),
    expenditure: crore(r.expenditure),
    currentFyExpenditure: crore(r.currentFyExpenditure),
    physicalProgress: r.physicalProgress === null ? null : round1(r.physicalProgress),
    financialProgress: r.financialProgress === null ? null : round1(r.financialProgress),
    capacityAddition: r.capacityAddition,
    delayStatus: r.delayStatus,
    sanctionDate: r.sanctionDate,
    awardActualDate: r.awardActualDate,
    originalTargetDate: r.originalTargetDate,
    latestTargetDate: r.latestTargetDate,
    actualCompletionDate: r.actualCompletionDate,
    foundationDate: r.foundationDate || r.foundationTentativeDate,
    inaugurationDate: r.inaugurationDate || r.inaugurationTentativeDate,
    lastUpdated: r.lastUpdated,
  };
}

const sortedLabels = (rows, field, order = null) => {
  const values = [...new Set(rows.map((r) => r[field]))];
  if (order) return order.filter((v) => values.includes(v));
  return values.sort((a, b) => (a === NOT_ENTERED) - (b === NOT_ENTERED) || String(a).localeCompare(String(b)));
};

// Organisation types and organisations, read the way the User Matrix reads them
// (orgModulePermission.js): every mmt_organisation_category row, and the active
// mmt_organisation rows with their category. Organisation users get their own only.
async function loadOrganisationOptions(req) {
  const conn = await pool;
  const request = conn.request();
  const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
  let orgScope = '';
  if (!isWide) {
    if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) {
      orgScope = ' AND 1 = 0';
    } else {
      request.input('scopeOrgId', sql.Int, organisationId);
      orgScope = ' AND o.organisation_id = @scopeOrgId';
    }
  }
  const [categories, organisations] = (await request.query(`
    SELECT organisation_category_id AS id, organisation_category_name AS name
    FROM mmt_organisation_category
    ORDER BY organisation_category_id;
    SELECT o.organisation_id AS id, o.organisation_name AS name, o.organisation_code AS code,
           o.organisation_category_id AS typeId
    FROM mmt_organisation o
    WHERE ISNULL(o.status, 1) = 1 ${orgScope}
    ORDER BY o.organisation_name;
  `)).recordsets;
  const usedTypes = new Set(organisations.map((o) => o.typeId));
  return {
    organisationTypes: isWide ? categories : categories.filter((c) => usedTypes.has(c.id)),
    organisations,
  };
}

// GET /projects-dashboard/filters: options for every filter. Organisation types and
// organisations come from the masters (as in the User Matrix); the other lists hold the
// values found on the projects the caller can see.
async function getProjectsDashboardFilters(req, res) {
  try {
    const [{ rows, financialYear }, { organisationTypes, organisations }] = await Promise.all([
      loadRegister(req),
      loadOrganisationOptions(req),
    ]);
    const stages = groupBy(rows, (r) => r.stageId, (list) => ({ name: list[0].stageName, group: list[0].stageGroup }))
      .map((s) => ({ id: s.key, name: s.name, group: s.group }))
      .sort((a, b) => a.id - b.id);

    res.json({
      financialYear,
      organisationTypes,
      organisations,
      stageGroups: STAGE_GROUPS,
      stages,
      options: {
        delayStatus: DELAY_STATUSES,
        broadCategory: sortedLabels(rows, 'broadCategory'),
        category: sortedLabels(rows, 'category'),
        mode: sortedLabels(rows, 'mode'),
        approvalRoute: sortedLabels(rows, 'approvalRoute'),
        state: sortedLabels(rows, 'state'),
        scheme: sortedLabels(rows, 'scheme'),
        funding: sortedLabels(rows, 'funding'),
        costBand: sortedLabels(rows, 'costBand', COST_BANDS),
        capacityBand: sortedLabels(rows, 'capacityBand', CAPACITY_BANDS),
        progressBand: sortedLabels(rows, 'progressBand', PROGRESS_BANDS),
        foundationLaid: ['Yes', 'No'],
        inaugurated: ['Yes', 'No'],
      },
    });
  } catch (err) {
    console.error('getProjectsDashboardFilters error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// GET /projects-dashboard/summary?<filters>: every card, chart and table of the dashboard.
async function getProjectsDashboardSummary(req, res) {
  try {
    const { rows, financialYear } = await loadRegister(req);
    const filters = parseFilters(req.query);
    res.json({ financialYear, ...buildSummary(rows.filter((r) => matchesFilters(r, filters))) });
  } catch (err) {
    console.error('getProjectsDashboardSummary error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// GET /projects-dashboard/projects?<filters>&dim=stage&value=13[&dim2=organisation&value2=12]
// The projects behind a clicked figure, within the dashboard filters.
async function getProjectsDashboardProjects(req, res) {
  try {
    const { rows } = await loadRegister(req);
    const filters = parseFilters(req.query);
    const list = drillRows(rows.filter((r) => matchesFilters(r, filters)), req.query)
      .sort((a, b) => String(a.organisationName).localeCompare(String(b.organisationName)) || String(a.code).localeCompare(String(b.code)))
      .map(listRow);
    res.json(list);
  } catch (err) {
    console.error('getProjectsDashboardProjects error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// GET /projects-dashboard/project?projectId=PR0001&subProjectId=-1
// Every dashboard field for one project (the workbook's Project Drilldown sheet).
async function getProjectsDashboardProject(req, res) {
  try {
    const projectId = cleanText(req.query.projectId);
    if (!projectId) return res.status(400).json({ message: 'projectId is required.' });
    const subKey = cleanText(req.query.subProjectId) || '-1';
    const { rows } = await loadRegister(req);
    const row = rows.find((r) => String(r.projectId) === projectId && String(r.subProjectId ?? '-1') === subKey);
    if (!row) return res.status(404).json({ message: 'Project not found.' });
    return res.json({
      ...row,
      estimatedCost: row.estimatedCost === null ? null : crore(row.estimatedCost),
      sanctionedCost: row.sanctionedCost === null ? null : crore(row.sanctionedCost),
      awardedCost: row.awardedCost === null ? null : crore(row.awardedCost),
      expenditure: crore(row.expenditure),
      currentFyTarget: crore(row.currentFyTarget),
      currentFyExpenditure: crore(row.currentFyExpenditure),
      physicalProgress: row.physicalProgress === null ? null : round1(row.physicalProgress),
      financialProgress: row.financialProgress === null ? null : round1(row.financialProgress),
    });
  } catch (err) {
    console.error('getProjectsDashboardProject error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default {
  getProjectsDashboardFilters,
  getProjectsDashboardSummary,
  getProjectsDashboardProjects,
  getProjectsDashboardProject,
};
