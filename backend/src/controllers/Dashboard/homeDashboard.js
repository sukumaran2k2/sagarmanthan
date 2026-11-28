// Home page "Data Entry Status" dashboard.
//
// One endpoint, scoped by the signed-in user's token (never by an id in the URL):
//   - Ministry users (MASTER / MINISTRY scope, or MoPSW's own staff) get the E-Office/Attendance
//     upload cards, the wing-wise table and the organisation-wise table for every organisation.
//   - Organisation users get their own organisation only, limited to the modules it has.
//
// The server decides the business rules (which records count, what is "not applicable", what
// "no active items" means). The client only formats the values and colours them by age.
//
// Every cell is one of:
//   { value: 'YYYY-MM-DD' }        last update date            (row.type 'date')
//   { value: 'YYYY-MM' }           latest reported month       (row.type 'month')
//   { value: 'YYYY-MM-W<n>' }      latest reported week        (row.type 'week' / 'eofficeWeek')
//   { value, type: 'fy' }          a date shown as its financial year (KPI of DGS, CSL, ...)
//   { status: 'NO_DATA' }          nothing entered yet
//   { status: 'NONE_ACTIVE' }      nothing open to report on (e.g. every VIP reference disposed)
//   { status: 'NOT_APPLICABLE' }   the module does not apply to this wing / organisation
//   { status: 'UNAVAILABLE' }      the query for this row failed (logged on the server)
//
// Business rules follow the old portal (pages/Dashboard/dashboard.html and
// controllers/Dashboard/dashboard.js in the 2.0 backend), with these fixes:
//   - a record that was never edited (updated date empty) still counts, using its created date;
//   - Capex reads the weekly long-format tbl_capex_monthly;
//   - KPI also counts the dwell-time, entry-log, DGS 2.3 and CSL update tables;
//   - OVOD ignores deleted rows; Media Outreach puts Jan-Mar in the right calendar year;
//   - E-Office cards pick the latest reported period, not the last inserted row.

import sql from "mssql";
import { pool } from "../../db.js";
import { getDataScope, MOPSW_ORGANISATION_ID } from "../../middleware/dataScope.js";
import { isSafeIdentifier } from "../formBuilder/formBuilderUtils.js";

// ---------------------------------------------------------------------------------------------
// Organisations and wings shown on the board (same lists as the old portal)
// ---------------------------------------------------------------------------------------------

const MAJOR_PORT_CLUSTER_ID = 1;
// Syama Prasad Mookerjee Port is reported as its two dock systems; NTCPWC and Vadhavan are not reported
const HIDDEN_ORGANISATION_IDS = [4, 69, 74];
const OTHER_ORGANISATION_IDS = [23, 15, 27, 21, 25, 22, 16, 17, 24, 18, 19, 20, 62];
// Office of Economic Advisor has no data-entry modules
const HIDDEN_WING_IDS = [13];

const IWAI_ORGANISATION_ID = 17;
const SHIPPING_WING_ID = 1;
const COORD_WING_IDS = [6, 7];

// KPI of these organisations is yearly, so it is shown and judged by financial year
const KPI_BY_FINANCIAL_YEAR = { DGS: 21, CSL: 18, DGLL: 19, SCI: 15, IMU: 25 };

// ---------------------------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------------------------

/**
 * The later of two dates, ignoring NULLs (a record never edited has no updated date).
 * A CASE, not a VALUES subquery, so it can sit inside MAX().
 */
const latest = (a, b) => {
  const x = `CAST(${a} AS datetime2)`;
  const y = `CAST(${b} AS datetime2)`;
  return `(CASE WHEN ${y} IS NULL OR ${x} > ${y} THEN ${x} ELSE ${y} END)`;
};

/** 'YYYY-MM-DD' text, so no time-zone shift happens on the way to the browser. */
const asDateText = (expr) => `CONVERT(char(10), ${expr}, 23)`;

/** Month number (1-12) from an English month name such as 'September'. */
const monthNumber = (col) =>
  `((CHARINDEX(LEFT(LTRIM(${col}), 3), 'JanFebMarAprMayJunJulAugSepOctNovDec') + 2) / 3)`;

/** Calendar year of a month inside a financial year written 'YYYY-YYYY' or 'YYYY-YY'. */
const yearInFinancialYear = (fyCol, monthCol) =>
  `(CAST(LEFT(${fyCol}, 4) AS int) + CASE WHEN ${monthCol} BETWEEN 1 AND 3 THEN 1 ELSE 0 END)`;

const TODAY_IST = "CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS date)";

/** A reported month that has not started yet (a slip in data entry) is ignored. */
const notFutureMonth = (yearExpr, monthExpr) => `DATEFROMPARTS(${yearExpr}, ${monthExpr}, 1) <= ${TODAY_IST}`;

const pad2 = (n) => String(n).padStart(2, "0");

async function runQuery(text, bind) {
  const conn = await pool;
  const request = conn.request();
  if (bind) bind(request);
  const result = await request.query(text);
  return result.recordset;
}

// ---------------------------------------------------------------------------------------------
// Section I: E-Office and Attendance upload cards (Ministry only)
// ---------------------------------------------------------------------------------------------

const UPLOAD_CARDS = [
  { key: "filePendency", label: "File Pendency", table: "tbl_file_pendancy", moduleCode: "E_OFFICE" },
  { key: "receiptPendency", label: "Receipt Pendency", table: "tbl_receipt_pendency", moduleCode: "E_OFFICE" },
  { key: "fileDisposal", label: "File Disposal", table: "tbl_file_disposal", moduleCode: "E_OFFICE" },
  { key: "attendance", label: "Attendance", table: "tbl_employee_attendance", moduleCode: "ATTENDANCE" },
];

async function loadUploadCards() {
  const queries = UPLOAD_CARDS.map(async (card) => {
    // The latest reported period (year, month, week), whatever order the files were uploaded in
    const rows = await runQuery(`
      SELECT TOP 1 Year AS year, ${monthNumber("Month")} AS month, week
      FROM ${card.table}
      WHERE Year IS NOT NULL AND week IS NOT NULL AND ${monthNumber("Month")} > 0
      ORDER BY Year DESC, ${monthNumber("Month")} DESC, week DESC
    `);
    const row = rows[0];
    return {
      key: card.key,
      label: card.label,
      moduleCode: card.moduleCode,
      cell: row ? { value: `${row.year}-${pad2(row.month)}-W${row.week}` } : { status: "NO_DATA" },
    };
  });
  const settled = await Promise.allSettled(queries);
  return settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    console.error(`Home dashboard: card ${UPLOAD_CARDS[i].key} failed:`, s.reason?.message);
    const { key, label, moduleCode } = UPLOAD_CARDS[i];
    return { key, label, moduleCode, cell: { status: "UNAVAILABLE" } };
  });
}

// ---------------------------------------------------------------------------------------------
// Section II: wing-wise data entry modules (Ministry only)
// Each query returns (wing_id, last_date). A NULL last_date means "nothing to report", shown as
// the row's emptyStatus. onlyWings limits the row to those wings (others are Not Applicable).
// ---------------------------------------------------------------------------------------------

/** Latest activity among a wing's open items; NULL when every item is closed (or none exist). */
const openItemsQuery = (table, completedCol, { wingExpr = "t.wing", join = "", extraWhere = "" } = {}) => `
  SELECT ${wingExpr} AS wing_id,
         ${asDateText(`MAX(CASE WHEN t.${completedCol} IS NULL THEN ${latest("t.created_date", "t.updated_date")} END)`)} AS last_date
  FROM ${table} t ${join}
  WHERE ${wingExpr} IS NOT NULL ${extraWhere}
  GROUP BY ${wingExpr}`;

const WING_ROWS = [
  {
    key: "youngProfessionals",
    label: "Young Professionals",
    moduleCode: "YOUNG_PROFESSIONAL",
    emptyStatus: "NONE_ACTIVE",
    sql: `
      SELECT t.wing_id, ${asDateText(`MAX(${latest("t.created_date", "t.last_updated_date")})`)} AS last_date
      FROM tbl_young_professionals t
      WHERE t.wing_id IS NOT NULL
      GROUP BY t.wing_id`,
  },
  {
    key: "consultantAppointment",
    label: "Consultant Appointment",
    moduleCode: "CONSULTANT_APPOINTMENT",
    emptyStatus: "NONE_ACTIVE",
    // Open until the contract is signed
    sql: openItemsQuery("tbl_consultant_appointment", "contract_signed_date"),
  },
  {
    key: "vipReference",
    label: "VIP References",
    moduleCode: "VIP_REFERENCE",
    emptyStatus: "NONE_ACTIVE",
    sql: openItemsQuery("tbl_vip_reference", "disposed_date"),
  },
  {
    key: "cabinetNotesOther",
    label: "Cabinet Notes - Other Ministries",
    moduleCode: "CABINET_NOTES_OTHER_MINISTRIES",
    emptyStatus: "NO_DATA",
    onlyWings: COORD_WING_IDS,
    // No wing column: a note counts for each wing it was sent to for comments (ids or names)
    sql: `
      SELECT w.wing_id, ${asDateText(`MAX(${latest("t.created_date", "t.updated_date")})`)} AS last_date
      FROM tbl_cabinet_notes_ministry t
      CROSS APPLY STRING_SPLIT(ISNULL(t.sent_for_comments_wings, ''), ',') s
      JOIN mmt_wings w
        ON LTRIM(RTRIM(s.value)) IN (CAST(w.wing_id AS nvarchar(10)), LTRIM(RTRIM(w.wing_name)))
      GROUP BY w.wing_id`,
  },
  {
    key: "cabinetNotesMopsw",
    label: "Cabinet Notes - MoPSW",
    moduleCode: "CABINET_NOTES_MOPSW",
    emptyStatus: "NONE_ACTIVE",
    sql: openItemsQuery("tbl_cabinet_notes_mopsw", "completed_date"),
  },
  {
    key: "auditPara",
    label: "Audit Paras",
    moduleCode: "AUDIT_PARAS",
    emptyStatus: "NONE_ACTIVE",
    sql: openItemsQuery("tbl_audit_para", "disposed_date"),
  },
  {
    key: "bills",
    label: "Bills / Pre-Constitution Acts",
    moduleCode: "BILLS_PRE_CONSTITUTION",
    emptyStatus: "NONE_ACTIVE",
    // Bills keep only the division; the wing is the division's. Deleted bills are kept, flagged.
    sql: openItemsQuery("tbl_bill", "completed_date", {
      wingExpr: "d.wing_id",
      join: "JOIN mmt_division d ON d.division_id = t.division",
      extraWhere: "AND ISNULL(t.is_deleted, 0) = 0",
    }),
  },
  {
    key: "parliamentaryIssues",
    label: "Parliamentary Issues",
    moduleCode: "PARLIAMENTARY_ISSUES",
    emptyStatus: "NONE_ACTIVE",
    // Old portal rule, kept on request: once any matter in the wing is disposed of or replied
    // to, the wing shows "no pending matters"
    sql: `
      SELECT t.wing AS wing_id,
             CASE WHEN COUNT(t.matter_disposed_date) + COUNT(t.reply_send_date) > 0 THEN NULL
                  ELSE ${asDateText(`MAX(${latest("t.created_date", "t.updated_date")})`)} END AS last_date
      FROM tbl_parliamentary_issue t
      WHERE t.wing IS NOT NULL
      GROUP BY t.wing`,
  },
  {
    key: "foreignVisitWing",
    label: "Foreign Visits",
    moduleCode: "FOREIGN_VISIT",
    emptyStatus: "NO_DATA",
    onlyWings: [SHIPPING_WING_ID],
    // No wing column; the Shipping wing maintains the module, so the latest entry shows there
    sql: `
      SELECT ${SHIPPING_WING_ID} AS wing_id,
             ${asDateText(`MAX(${latest("t.created_date", "t.updated_date")})`)} AS last_date
      FROM tbl_official_foreign_visit t`,
  },
  {
    key: "formBuilderWing",
    label: "Form Builder",
    moduleCode: "FORM_BUILDER",
    // Wings with no active form assigned; assigned but nothing submitted is NO_DATA
    emptyStatus: "NO_DATA",
    load: loadFormBuilderByWing,
  },
];

async function loadWingColumns() {
  const rows = await runQuery(
    `SELECT wing_id, wing_name, wing_code FROM mmt_wings
     WHERE ISNULL(status, 1) = 1 AND wing_id NOT IN (${HIDDEN_WING_IDS.join(",")})
     ORDER BY wing_id`
  );
  return rows.map((w) => ({ id: w.wing_id, name: w.wing_name, code: w.wing_code }));
}

function toWingCells(row, wings, lastDateByWing, assignedWings) {
  const cells = {};
  for (const wing of wings) {
    if (row.onlyWings && !row.onlyWings.includes(wing.id)) {
      cells[wing.id] = { status: "NOT_APPLICABLE" };
    } else if (assignedWings && !assignedWings.has(wing.id)) {
      cells[wing.id] = { status: "NONE_ACTIVE" };
    } else {
      const date = lastDateByWing.get(wing.id);
      cells[wing.id] = date ? { value: date } : { status: row.emptyStatus };
    }
  }
  return cells;
}

async function loadWingSection() {
  const wings = await loadWingColumns();
  const settled = await Promise.allSettled(
    WING_ROWS.map(async (row) => {
      if (row.load) return row.load();
      const records = await runQuery(row.sql);
      return { lastDateByWing: new Map(records.map((r) => [r.wing_id, r.last_date])) };
    })
  );

  const rows = WING_ROWS.map((row, i) => {
    const base = { key: row.key, label: row.label, moduleCode: row.moduleCode, type: "date" };
    const result = settled[i];
    if (result.status === "rejected") {
      console.error(`Home dashboard: wing row ${row.key} failed:`, result.reason?.message);
      return { ...base, cells: Object.fromEntries(wings.map((w) => [w.id, { status: "UNAVAILABLE" }])) };
    }
    const { lastDateByWing, assignedWings } = result.value;
    return { ...base, cells: toWingCells(row, wings, lastDateByWing, assignedWings) };
  });

  return { columns: wings, rows };
}

// ---------------------------------------------------------------------------------------------
// Form Builder: forms are assigned to organisations (by code) or wings (by name); responses are
// stored one table per form. A response counts for the submitting user's organisation / wing.
// ---------------------------------------------------------------------------------------------

async function loadActiveFormTables() {
  const forms = await runQuery(
    `SELECT id, table_name FROM mmt_form_definitions WHERE active_status = '1' AND table_name IS NOT NULL`
  );
  return forms.filter((f) => Number.isInteger(f.id) && isSafeIdentifier(f.table_name));
}

/** Submitted responses of the active forms: (form_id, submitted_by, submitted_date). */
function submissionsSql(forms) {
  return forms
    .map(
      (f) => `SELECT ${Number(f.id)} AS form_id, submitted_by, submitted_date
              FROM [${f.table_name}] WHERE submission_status = 'Submitted'`
    )
    .join("\n UNION ALL ");
}

async function loadFormBuilderByWing() {
  const forms = await loadActiveFormTables();
  if (forms.length === 0) return { lastDateByWing: new Map(), assignedWings: new Set() };
  const formIds = forms.map((f) => Number(f.id)).join(",");
  const records = await runQuery(`
    WITH subs AS (${submissionsSql(forms)})
    SELECT w.wing_id,
           ${asDateText(`MAX(CASE WHEN u.wing_id = w.wing_id THEN s.submitted_date END)`)} AS last_date
    FROM mmt_form_assignments a
    JOIN mmt_wings w ON LTRIM(RTRIM(w.wing_name)) = LTRIM(RTRIM(a.value))
    LEFT JOIN subs s ON s.form_id = a.form_id
    LEFT JOIN tbl_user u ON u.user_id = s.submitted_by
    WHERE a.kind = 'W' AND a.form_id IN (${formIds})
    GROUP BY w.wing_id
  `);
  return {
    lastDateByWing: new Map(records.map((r) => [r.wing_id, r.last_date])),
    assignedWings: new Set(records.map((r) => r.wing_id)),
  };
}

async function loadFormBuilderByOrganisation() {
  const forms = await loadActiveFormTables();
  if (forms.length === 0) return { valueByOrg: new Map(), assignedOrgs: new Set() };
  const formIds = forms.map((f) => Number(f.id)).join(",");
  const records = await runQuery(`
    WITH subs AS (${submissionsSql(forms)})
    SELECT o.organisation_id,
           ${asDateText(`MAX(CASE WHEN u.organisation_id = o.organisation_id THEN s.submitted_date END)`)} AS value
    FROM mmt_form_assignments a
    JOIN mmt_organisation o ON o.organisation_code = a.value
    LEFT JOIN subs s ON s.form_id = a.form_id
    LEFT JOIN tbl_user u ON u.user_id = s.submitted_by
    WHERE a.kind = 'O' AND a.form_id IN (${formIds})
    GROUP BY o.organisation_id
  `);
  return {
    valueByOrg: new Map(records.map((r) => [r.organisation_id, r.value])),
    assignedOrgs: new Set(records.map((r) => r.organisation_id)),
  };
}

// ---------------------------------------------------------------------------------------------
// Section III: organisation-wise modules
// Each loader returns Map(organisation_id -> value text). Missing => row.emptyStatus.
// ---------------------------------------------------------------------------------------------

const toValueMap = (records) => new Map(records.map((r) => [r.organisation_id, r.value]));

/** Latest month with a GeM figure, newest financial year first: 'YYYY-MM'. */
function gemLatestMonthSql(kind) {
  const months = [
    ["april", 4], ["may", 5], ["june", 6], ["july", 7], ["august", 8], ["september", 9],
    ["october", 10], ["november", 11], ["december", 12], ["january", 1], ["february", 2], ["march", 3],
  ];
  const values = months
    .map(([name, num]) => `(${num}, COALESCE(gm.procurement_through_gem_${name}, gm.procurement_outside_gem_${name}))`)
    .join(",\n        ");
  return `
    WITH ranked AS (
      SELECT g.${kind}_organisation_id AS organisation_id,
             ${yearInFinancialYear(`g.${kind}_financial_year`, "m.month_num")} AS yr,
             m.month_num,
             ROW_NUMBER() OVER (
               PARTITION BY g.${kind}_organisation_id
               ORDER BY g.${kind}_financial_year DESC, (m.month_num + 8) % 12 DESC
             ) AS rn
      FROM tbl_gem_procurement_${kind}_monthly gm
      JOIN tbl_gem_procurement_${kind} g ON g.${kind}_gem_id = gm.${kind}_gem_id
      CROSS APPLY (VALUES
        ${values}
      ) m(month_num, amount)
      WHERE m.amount IS NOT NULL
        AND ${notFutureMonth(yearInFinancialYear(`g.${kind}_financial_year`, "m.month_num"), "m.month_num")}
    )
    SELECT organisation_id, CONCAT(yr, '-', RIGHT('0' + CAST(month_num AS varchar(2)), 2)) AS value
    FROM ranked WHERE rn = 1`;
}

const kpiTables = (tables) =>
  tables.map((t) => `SELECT MAX(${latest("created_date", "updated_date")}) AS d FROM ${t}`).join("\n UNION ALL ");

// Organisation-specific KPI tables carry no organisation column; the module belongs to one organisation
const KPI_TABLES_BY_ORGANISATION = {
  [KPI_BY_FINANCIAL_YEAR.DGS]: [
    "tbl_kpi_dgs_entry_exit", "tbl_kpi_dgs_entry_exit_log", "tbl_kpi_incident_prev_curr_year",
    "tbl_kpi_incident_year_wise", "tbl_kpi_incident_country_wise", "tbl_kpi_vessel_incident",
    "tbl_vessel_survey", "mmt_mti", "mmt_mti_course", "tbl_kpi_dgs_2_3_1", "tbl_kpi_dgs_2_3_2",
    "tbl_kpi_dgs_2_9_approved_intake_capacity", "tbl_kpi_dgs_2_9_capacity_utilisation",
    "tbl_kpi_dgs_2_9_placement_record",
  ],
  [KPI_BY_FINANCIAL_YEAR.CSL]: [
    "tbl_csl_vessels_built", "tbl_csl_ship_building_orders", "tbl_csl_ship_building_orders_update",
    "tbl_csl_ship_delivery_performance", "tbl_csl_ship_delivery_performance_update",
    "tbl_csl_capacity_utilization", "tbl_csl_fabrication_of_steels", "tbl_csl_fabrication_of_steels_update",
    "tbl_csl_ships_repaired", "tbl_csl_ships_repaired_UPDATE",
  ],
  [KPI_BY_FINANCIAL_YEAR.DGLL]: [
    "tbl_light_house_master", "tbl_nais_uptime", "tbl_vtms_integration",
    "tbl_kpi_dgll_3_5_1", "tbl_kpi_dgll_3_5_2", "tbl_dgll_k_3_6",
  ],
  [KPI_BY_FINANCIAL_YEAR.SCI]: [
    "tbl_sci_vessel_availability", "tbl_sci_time_voyage_bulk", "tbl_sci_time_voyage_tanker",
    "tbl_sci_time_voyage_offshore", "tbl_sci_vessel_availability_linear", "tbl_sci_vessel_procurement",
    "tbl_sci_secondhand_vessel_procurement", "tbl_sci_ship_dry_docking", "tbl_sci_repair_and_maintanace",
    "tbl_sci_sale_and_recycling_oldvessels", "tbl_sci_sale_and_recycling_oldvessels_green_recycling",
    "tbl_sci_manning_of_owned_ships", "tbl_sci_ship_management_business",
  ],
  [KPI_BY_FINANCIAL_YEAR.IMU]: [
    "tbl_imu_k_5_1", "tbl_imu_k_5_1_1", "tbl_imu_k_5_2", "tbl_imu_k_5_3", "tbl_imu_k_5_4", "tbl_imu_k_5_5",
  ],
};

// Major Port KPI tables, keyed by organisation_id
const PORT_KPI_TABLES = [
  "tbl_financial_parameter", "tbl_traffic_commodity_data", "tbl_traffic_ro_ro_pax_data", "tbl_traffic_vessel",
  "tbl_kpi_time_performance", "tbl_kpi_time_performance_dwell", "tbl_kpi_renewable_energy",
];

async function loadKpi() {
  const fixed = Object.entries(KPI_TABLES_BY_ORGANISATION)
    .map(([orgId, tables]) => `SELECT ${Number(orgId)} AS organisation_id, d FROM (${kpiTables(tables)}) x`)
    .join("\n UNION ALL ");
  const ports = PORT_KPI_TABLES.map(
    (t) => `SELECT organisation_id, MAX(${latest("created_date", "updated_date")}) AS d FROM ${t} GROUP BY organisation_id`
  ).join("\n UNION ALL ");
  const records = await runQuery(`
    SELECT organisation_id, ${asDateText("MAX(d)")} AS value
    FROM (
      ${fixed}
      UNION ALL ${ports}
      UNION ALL SELECT organisation_id, MAX(CAST(created_date AS datetime2)) FROM tbl_kpi_major_ports_entry_log GROUP BY organisation_id
    ) all_kpi
    WHERE organisation_id IS NOT NULL
    GROUP BY organisation_id
  `);
  return toValueMap(records);
}

// tbl_nmp.updated_date is written by the NMP module but may be missing on an older database
let nmpHasUpdatedDate;
async function loadNmp() {
  if (nmpHasUpdatedDate === undefined) {
    const [row] = await runQuery(`SELECT COL_LENGTH('tbl_nmp', 'updated_date') AS len`);
    nmpHasUpdatedDate = row?.len != null;
  }
  const nmpDate = nmpHasUpdatedDate ? latest("created_date", "updated_date") : "CAST(created_date AS datetime2)";
  const records = await runQuery(`
    SELECT organisation_id, ${asDateText("MAX(d)")} AS value
    FROM (
      SELECT organisation_id, ${nmpDate} AS d FROM tbl_nmp
      UNION ALL SELECT organisation_id, ${latest("created_date", "updated_date")} FROM tbl_nmp_past
      UNION ALL SELECT organisation_id, ${latest("created_date", "updated_date")} FROM tbl_land_abstract
      UNION ALL SELECT organisation_id, CAST(created_date AS datetime2) FROM tbl_lease_rental_details_past
    ) x
    WHERE organisation_id IS NOT NULL
    GROUP BY organisation_id
  `);
  return toValueMap(records);
}

const simpleLatest = (table, { orgCol = "organisation_id", created = "created_date", updated = "updated_date", where = "1 = 1" } = {}) => `
  SELECT t.${orgCol} AS organisation_id, ${asDateText(`MAX(${latest(`t.${created}`, `t.${updated}`)})`)} AS value
  FROM ${table} t
  WHERE ${where}
  GROUP BY t.${orgCol}`;

const ORGANISATION_ROWS = [
  {
    key: "projects",
    label: "Projects",
    moduleCode: "PROJECTS",
    type: "date",
    emptyStatus: "NO_DATA",
    // Projects split into sub-projects are reported per sub-project organisation. Dropped (stage 14) excluded.
    sql: `
      SELECT organisation_id, ${asDateText("MAX(d)")} AS value
      FROM (
        SELECT p.organisation_id, p.last_updated AS d
        FROM tbl_project p
        WHERE ISNULL(p.on_sub_project_available, 0) <> 1 AND p.status = 1 AND p.project_stage_id <> 14
        UNION ALL
        SELECT sp.sub_organisation_id, sp.sub_last_updated
        FROM tbl_project p
        JOIN tbl_sub_project sp ON sp.project_id = p.project_id
        WHERE p.on_sub_project_available = 1 AND sp.sub_status = 1 AND sp.sub_project_stage_id <> 14
      ) x
      GROUP BY organisation_id`,
  },
  {
    key: "csr",
    label: "CSR Projects",
    moduleCode: "CSR_PROJECTS",
    type: "date",
    emptyStatus: "NO_DATA",
    notApplicableTo: [IWAI_ORGANISATION_ID],
    sql: simpleLatest("tbl_csr_projects", { where: "ISNULL(t.project_status, '') <> 'Completed'" }),
  },
  {
    key: "capex",
    label: "Capex",
    moduleCode: "CAPEX",
    type: "week",
    emptyStatus: "NOT_APPLICABLE",
    // The latest week with a non-zero amount, newest financial year first (Apr..Mar order)
    sql: `
      WITH ranked AS (
        SELECT c.capex_organisation_id AS organisation_id,
               ${yearInFinancialYear("c.capex_financial_year", "m.month_number")} AS yr,
               m.month_number, m.week_number,
               ROW_NUMBER() OVER (
                 PARTITION BY c.capex_organisation_id
                 ORDER BY c.capex_financial_year DESC, (m.month_number + 8) % 12 DESC, m.week_number DESC
               ) AS rn
        FROM tbl_capex c
        JOIN tbl_capex_monthly m ON m.capex_id = c.capex_id
        WHERE ISNULL(m.amount, 0) <> 0 AND m.month_number BETWEEN 1 AND 12 AND m.week_number IS NOT NULL
          AND ${notFutureMonth(yearInFinancialYear("c.capex_financial_year", "m.month_number"), "m.month_number")}
      )
      SELECT organisation_id,
             CONCAT(yr, '-', RIGHT('0' + CAST(month_number AS varchar(2)), 2), '-W', week_number) AS value
      FROM ranked WHERE rn = 1`,
  },
  {
    key: "kpi",
    label: "KPI",
    moduleCode: "KPI",
    type: "month",
    emptyStatus: "NOT_APPLICABLE",
    load: loadKpi,
    // A date; the client shows it as a month, or as a financial year for the yearly KPI orgs
    toCell: (orgId, value) => {
      if (Object.values(KPI_BY_FINANCIAL_YEAR).includes(orgId)) return { value, type: "fy" };
      return { value: value.slice(0, 7) };
    },
  },
  {
    key: "hr",
    label: "HR Management",
    moduleCode: "HR_MANAGEMENT",
    type: "month",
    emptyStatus: "NO_DATA",
    // Major Ports maintain employee and post records; other organisations upload a vacancy file
    sql: `
      SELECT organisation_id, LEFT(${asDateText("MAX(d)")}, 7) AS value
      FROM (
        SELECT emp_working_org_id AS organisation_id, ${latest("created_date", "updated_date")} AS d
        FROM tbl_employee_transaction_details
        WHERE emp_working_org_id NOT IN (${OTHER_ORGANISATION_IDS.join(",")})
        UNION ALL
        SELECT organisation_id, ${latest("created_date", "updated_date")}
        FROM tbl_hr_post_strength
        WHERE organisation_id NOT IN (${OTHER_ORGANISATION_IDS.join(",")})
        UNION ALL
        SELECT organisation_id, CAST(uploaded_date AS datetime2)
        FROM tbl_hr_other_org_vacancy_file_details
        WHERE organisation_id IN (${OTHER_ORGANISATION_IDS.join(",")})
      ) x
      WHERE organisation_id IS NOT NULL
      GROUP BY organisation_id`,
  },
  { key: "gemGoods", label: "GeM Procurement - Goods", moduleCode: "GEM_PROCUREMENT", type: "month", emptyStatus: "NO_DATA", sql: gemLatestMonthSql("goods") },
  { key: "gemServices", label: "GeM Procurement - Services", moduleCode: "GEM_PROCUREMENT", type: "month", emptyStatus: "NO_DATA", sql: gemLatestMonthSql("service") },
  { key: "gemWorks", label: "GeM Procurement - Works", moduleCode: "GEM_PROCUREMENT", type: "month", emptyStatus: "NO_DATA", sql: gemLatestMonthSql("works") },
  {
    key: "courtCases",
    label: "Court Cases",
    moduleCode: "COURT_CASES",
    type: "date",
    emptyStatus: "NO_DATA",
    // Stage 7 = closed
    sql: simpleLatest("tbl_litigation_cases", { where: "ISNULL(t.stage_id, 0) <> 7" }),
  },
  {
    key: "miv",
    label: "MIV 2030",
    moduleCode: "MIV_2030",
    type: "date",
    emptyStatus: "NOT_APPLICABLE",
    sql: simpleLatest("tbl_initiative", { where: "ISNULL(t.status_current, '') <> 'Completed'" }),
  },
  {
    key: "ovod",
    label: "OVOD",
    moduleCode: "DRISHTI_PORTAL",
    type: "date",
    emptyStatus: "NO_DATA",
    // Recorded against the implementing agency, which matches the organisation by code
    sql: `
      SELECT o.organisation_id, ${asDateText(`MAX(${latest("t.created_date", "t.updated_date")})`)} AS value
      FROM tbl_one_vision_doc t
      JOIN mmt_implementing_agency ia ON ia.ia_id = t.imp_agency
      JOIN mmt_organisation o ON o.organisation_code = ia.ia_code
      WHERE ISNULL(t.delete_status, 0) = 0 AND ISNULL(t.current_status, '') <> 'Completed'
      GROUP BY o.organisation_id`,
  },
  {
    key: "gmis",
    label: "GMIS IMW MoU",
    moduleCode: "GMIS_IMW_MOU_TRACKING",
    type: "date",
    emptyStatus: "NO_DATA",
    sql: simpleLatest("tbl_gmis_mou", {
      created: "created_on",
      updated: "updated_on",
      where: "ISNULL(t.present_status, '') NOT IN ('Work completed', 'Dropped')",
    }),
  },
  {
    key: "mediaOutreach",
    label: "Media Outreach",
    moduleCode: "MEDIA_OUTREACH",
    type: "month",
    emptyStatus: "NO_DATA",
    // The latest reported month
    sql: `
      SELECT organisation_id,
             CONCAT(MAX(yr * 100 + mon) / 100, '-', RIGHT('0' + CAST(MAX(yr * 100 + mon) % 100 AS varchar(2)), 2)) AS value
      FROM (
        SELECT organisation_id, ${monthNumber("month")} AS mon,
               ${yearInFinancialYear("financial_year", monthNumber("month"))} AS yr
        FROM tbl_social_media
        WHERE financial_year IS NOT NULL AND ${monthNumber("month")} > 0
      ) x
      WHERE ${notFutureMonth("yr", "mon")}
      GROUP BY organisation_id`,
  },
  {
    key: "foreignVisit",
    label: "Foreign Visits",
    moduleCode: "FOREIGN_VISIT",
    type: "date",
    emptyStatus: "NO_DATA",
    sql: simpleLatest("tbl_official_foreign_visit", { orgCol: "organisation" }),
  },
  {
    key: "nmp",
    label: "National Monetisation Pipeline",
    moduleCode: "NMP",
    type: "date",
    emptyStatus: "NOT_APPLICABLE",
    load: loadNmp,
  },
  {
    key: "formBuilder",
    label: "Form Builder",
    moduleCode: "FORM_BUILDER",
    type: "date",
    emptyStatus: "NO_DATA",
    load: loadFormBuilderByOrganisation,
  },
];

async function loadOrganisationColumns({ ministryView, organisationId }) {
  if (!ministryView) {
    const rows = await runQuery(
      `SELECT organisation_id, organisation_name, organisation_code, organisation_label
       FROM mmt_organisation WHERE organisation_id = @organisationId`,
      (r) => r.input("organisationId", sql.Int, organisationId)
    );
    return rows.map((o) => toOrganisationColumn(o, "OWN"));
  }
  const rows = await runQuery(`
    SELECT organisation_id, organisation_name, organisation_code, organisation_label, hr_cluster_id
    FROM mmt_organisation
    WHERE ISNULL(status, 1) = 1
      AND organisation_id NOT IN (${HIDDEN_ORGANISATION_IDS.join(",")})
      AND (hr_cluster_id = ${MAJOR_PORT_CLUSTER_ID} OR organisation_id IN (${OTHER_ORGANISATION_IDS.join(",")}))
    ORDER BY organisation_name
  `);
  return rows.map((o) =>
    toOrganisationColumn(o, o.hr_cluster_id === MAJOR_PORT_CLUSTER_ID ? "MAJOR_PORTS" : "OTHER_ORGANISATIONS")
  );
}

function toOrganisationColumn(o, group) {
  return {
    id: o.organisation_id,
    name: o.organisation_name,
    shortName: o.organisation_label || o.organisation_code || o.organisation_name,
    group,
  };
}

function toOrganisationCells(row, organisations, loaded) {
  const { valueByOrg, assignedOrgs } = loaded;
  const cells = {};
  for (const org of organisations) {
    const value = valueByOrg.get(org.id);
    if (row.notApplicableTo?.includes(org.id)) cells[org.id] = { status: "NOT_APPLICABLE" };
    else if (assignedOrgs && !assignedOrgs.has(org.id)) cells[org.id] = { status: "NONE_ACTIVE" };
    else if (value) cells[org.id] = row.toCell ? row.toCell(org.id, value) : { value };
    else cells[org.id] = { status: row.emptyStatus };
  }
  return cells;
}

/** Whether an organisation user's organisation has the module (KPI covers every KPI_* module). */
function organisationHasModule(user, moduleCode) {
  const codes = (Array.isArray(user?.allowedModuleCodes) ? user.allowedModuleCodes : []).map((c) =>
    String(c).toUpperCase()
  );
  if (moduleCode === "KPI") return codes.some((c) => c.startsWith("KPI_"));
  return codes.includes(moduleCode);
}

async function loadOrganisationSection(user, view) {
  const organisations = await loadOrganisationColumns(view);
  const rowsForUser = view.ministryView
    ? ORGANISATION_ROWS
    : ORGANISATION_ROWS.filter((row) => organisationHasModule(user, row.moduleCode));

  const settled = await Promise.allSettled(
    rowsForUser.map(async (row) => {
      if (row.load) {
        const loaded = await row.load();
        return loaded instanceof Map ? { valueByOrg: loaded } : loaded;
      }
      return { valueByOrg: toValueMap(await runQuery(row.sql)) };
    })
  );

  const rows = rowsForUser.map((row, i) => {
    const base = { key: row.key, label: row.label, moduleCode: row.moduleCode, type: row.type };
    const result = settled[i];
    if (result.status === "rejected") {
      console.error(`Home dashboard: organisation row ${row.key} failed:`, result.reason?.message);
      return { ...base, cells: Object.fromEntries(organisations.map((o) => [o.id, { status: "UNAVAILABLE" }])) };
    }
    return { ...base, cells: toOrganisationCells(row, organisations, result.value) };
  });

  return { columns: organisations, rows };
}

// ---------------------------------------------------------------------------------------------
// GET /home-dashboard
// ---------------------------------------------------------------------------------------------

async function getHomeDashboard(req, res) {
  try {
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    // MoPSW's own staff are Ministry users for Ministry-internal modules (see ministryOnly)
    const ministryView = isWide || organisationId === MOPSW_ORGANISATION_ID;

    if (!ministryView && !(isOrganisation && Number.isInteger(organisationId) && organisationId > 0)) {
      return res.status(403).json({ message: "Your role has no data scope for the dashboard." });
    }

    const view = { ministryView, organisationId };
    const [[today], cards, wings, organisations] = await Promise.all([
      runQuery(`SELECT ${asDateText(TODAY_IST)} AS as_on`),
      ministryView ? loadUploadCards() : null,
      ministryView ? loadWingSection() : null,
      loadOrganisationSection(req.user, view),
    ]);

    return res.status(200).json({
      asOn: today.as_on,
      view: ministryView ? "MINISTRY" : "ORGANISATION",
      cards,
      wings,
      organisations,
    });
  } catch (error) {
    console.error("Home dashboard failed:", error);
    return res.status(500).json({ message: "Failed to load the dashboard." });
  }
}

export default { getHomeDashboard };
