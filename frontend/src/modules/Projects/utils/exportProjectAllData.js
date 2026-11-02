import * as XLSX from 'xlsx';

const EXPORT_HEADERS = [
  'Organization ID',
  'Organization Name',
  'Project Id',
  'Sub Project ID',
  'Project Name',
  'Sub Project Name',
  'Sagarmala Project Id',
  'Project Initiated Date',
  'Target Completion Date',
  'Revised Target Completion Date 1',
  'Revised Target Completion Date 2',
  'Revised Target Completion Date 3',
  'Preliminary Feasibility - Actual Date',
  'DPR - Actual Date',
  'Chairman Board Approval - Actual Date',
  'Submitted to Ministry - Actual Date',
  'DA concurrence obtained - Actual Date',
  'IFW concurrence obtained - Actual Date',
  'Circulated for IMC - Actual Date',
  'Response to Comments Received - Actual Date',
  'Approved by SFC/DIB/EFC/PIB/DIB/PPPAC - Actual Date',
  'Admin Approval Date ',
  'Project Type',
  'State',
  'District',
  'Taluka',
  'Village',
  'MP Constituency',
  'Project Category',
  'Project Core Category',
  'Mode of Implementation',
  'Implementation Type',
  'Scheme',
  'Project Initiative',
  'IS Sagarmala Funded',
  'Source Of Funding',
  'GBS Components (In Cr.)',
  'IEBR Components (In Cr.)',
  'PPP-Private Components (In Cr.)',
  'Loans Components (In Cr.)',
  'Multilateral Funding Components (In Cr.)',
  'State Govt.Fund Components (In Cr.)',
  'PMMSY Components (In Cr.)',
  'Sagarmala Component (In Cr.)',
  'Others Component (In Cr.)',
  'Estimated Cost (In Cr.)',
  'Sanctioned Cost (In Cr.)',
  'Technical Sanctioned Cost (In Cr.)',
  'Awarded Cost (In Cr.)',
  'Project Output',
  'Project Outcome',
  'Primary Implementing Agency',
  'Secondary Implementing Agency',
  'Primary Funding Agency',
  'Secondary Funding Agency',
  'Is Land Acquisition required for Project',
  'Land Area Required (In Hectare)',
  'Is the Acquisition completed',
  'Percent of Land Acquired',
  'Actual Date of Completion',
  'Closure Cost (In Cr)',
  'Current Stage',
  'Number of Tender Calls',
  'Tech Sanction Obtained - Planned Date',
  'Tech Sanction Obtained - Actual Date',
  'Tender Document Approved - Planned Date',
  'Tender Document Approved - Actual Date',
  'Tender Notice Issued - Planned Date',
  'Tender Notice Issued - Actual Date',
  'Technical Evaluation Completed - Planned Date',
  'Technical Evaluation Completed - Actual Date',
  'Financial Evaluation Completed - Planned Date',
  'Financial Evaluation Completed - Actual Date',
  'Sanction of Competent Authority obtained for Award - Planned Date',
  'Sanction of Competent Authority obtained for Award - Actual Date',
  'Work Awarded / LOA Issued - Planned Date',
  'Work Awarded / LOA Issued - Actual Date',
  'Contract Agreement Signed - Planned Date',
  'Contract Agreement Signed - Actual Date',
  'Physical Progress',
  'Milestone 0 - Target End Date',
  'Milestone 0 - Actual End date',
  'Milestone 1 - Target End date',
  'Milestone 1 - Actual End date',
  'Milestone 2 - Target End date',
  'Milestone 2 - Actual End date',
  'Milestone 3 - Target End date',
  'Milestone 3 - Actual End date',
  'Milestone 4 - Target End date',
  'Milestone 4 - Actual End date',
  'Milestone 5 - Target End date',
  'Milestone 5 - Actual End date',
  'Delay Reason',
  'Expenditure Till Date (In Cr.)',
  'Financial Progress',
  'Expenditure till date (Current Year)',
  'Target Expenditure (In Cr.) (Current Year)',
  'Capacity Addition (In MTPA)',
  'Is Project Foundation Laid',
  'Foundation Laying Date',
  'Tentative Foundation Laying Date',
  'Is Project Inaugurated',
  'Date of Inauguration',
  'Tentative Inauguration Date',
  'Last Updated Date',
];

function formatExportDate(value) {
  if (!value) return '';
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split('-');
  if (!year || !month || !day) return text;
  return `${day}-${month}-${year}`;
}

function formatYesNo(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '';
}

function formatFinancialProgress(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toFixed(2);
}

function removeDuplicates(rows, keys) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keys.map((k) => row?.[k]).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapExportRow(row) {
  const isSubProject = row.sub_project_id != null && String(row.sub_project_id) !== '';
  const stateName = isSubProject ? row.sub_state_names : row.state_names;
  const districtName = isSubProject ? row.sub_district_names : row.district_names;
  const mpcName = isSubProject ? row.sub_mp_constituency_names : row.mp_constituency_names;

  return [
    row.organisation_id,
    row.organisation_name,
    row.project_id,
    row.sub_project_id,
    row.project_name,
    row.sub_project_name,
    row.sagarmala_project_id,
    formatExportDate(row.project_intiated_date),
    formatExportDate(row.target_completion_date),
    formatExportDate(row.revised_target_date_1),
    formatExportDate(row.revised_target_date_2),
    formatExportDate(row.revised_target_date_3),
    formatExportDate(row.prefeasibility_actual_date),
    formatExportDate(row.dpr_actual_date),
    formatExportDate(row.chairman_approval_date),
    formatExportDate(row.ministry_submission_date),
    formatExportDate(row.da_approval_date),
    formatExportDate(row.ifw_approval_date),
    formatExportDate(row.imc_approval_date),
    formatExportDate(row.response_com_rec_approval_date),
    formatExportDate(row.sfc_approval_date),
    formatExportDate(row.admin_approval_approval_date),
    row.project_type,
    stateName,
    districtName,
    row.taluka_id,
    row.village_id,
    mpcName,
    row.project_category_names,
    row.project_core_category,
    row.mode_of_implememtation,
    row.implememtation_type,
    row.scheme_name,
    row.initiative_names,
    row.is_sagarmala_funded,
    row.source_of_funding_names,
    row.gbs_components,
    row.iebr_components,
    row.ppp_components,
    row.loans_components,
    row.multilateral_components,
    row.state_gov_fund_components,
    row.pmmsy_components,
    row.sagarmala_components,
    row.other_source_funding_comp,
    row.estimated_cost,
    row.sanctioned_cost,
    row.technical_sanction_cost,
    row.award_project_cost,
    row.project_output_name,
    row.project_outcome_name,
    row.primary_ia_name,
    row.sec_imp_agency,
    row.primary_fa_name,
    row.secondary_fa_name,
    row.on_land_acquisition,
    row.land_area_req,
    row.on_acquisition_completed,
    row.percent_land_acq,
    formatExportDate(row.actual_date_of_completion),
    row.closure_cost,
    row.stage_name,
    row.num_ut_tender_calls,
    formatExportDate(row.planned_tech_sanction_date),
    formatExportDate(row.tech_sanction_date),
    formatExportDate(row.planned_tender_doc_approved_date),
    formatExportDate(row.tender_doc_approved_date),
    formatExportDate(row.planned_tender_notice_issued_date),
    formatExportDate(row.tender_notice_issued_date),
    formatExportDate(row.planned_technical_evaluation_completed_date),
    formatExportDate(row.technical_evaluation_completed_date),
    formatExportDate(row.planned_financial_evaluation_completed_date),
    formatExportDate(row.financial_evaluation_completed_date),
    formatExportDate(row.planned_sanction_of_authority_obtained_date),
    formatExportDate(row.sanction_of_authority_obtained_date),
    formatExportDate(row.planned_work_awarded_date),
    formatExportDate(row.work_awarded_date),
    formatExportDate(row.planned_contract_sign_date),
    formatExportDate(row.contract_sign_date),
    row.physical_progress,
    formatExportDate(row.milestone_0_target_date),
    formatExportDate(row.milestone_0_actual_date),
    formatExportDate(row.milestone_1_target_date),
    formatExportDate(row.milestone_1_actual_date),
    formatExportDate(row.milestone_2_target_date),
    formatExportDate(row.milestone_2_actual_date),
    formatExportDate(row.milestone_3_target_date),
    formatExportDate(row.milestone_3_actual_date),
    formatExportDate(row.milestone_4_target_date),
    formatExportDate(row.milestone_4_actual_date),
    formatExportDate(row.milestone_5_target_date),
    formatExportDate(row.milestone_5_actual_date),
    row.delay_reason || '',
    row.expenditure_till_date,
    formatFinancialProgress(row.financial_progress),
    row.expenditure_till_date_currentFY_only,
    row.expenditure_outlay,
    row.capacity_addition,
    formatYesNo(row.foundation_laid),
    formatExportDate(row.foundation_laid_date),
    formatExportDate(row.foundation_tentative_date),
    formatYesNo(row.inauguration_value),
    formatExportDate(row.inauguration_date),
    formatExportDate(row.tentative_inauguration_date),
    formatExportDate(row.last_updated_date),
  ];
}

function buildExportFileName() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `Project List ${day}-${month}-${year} ${hours}:${minutes}:${seconds}.xlsx`;
}

export function buildProjectAllDataWorkbook(rows = []) {
  const uniqueRows = removeDuplicates(Array.isArray(rows) ? rows : [], [
    'project_id',
    'sub_project_id',
  ]);
  const data = uniqueRows.map(mapExportRow);
  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Project List');
  return { workbook, rowCount: uniqueRows.length };
}

export function downloadProjectAllDataExcel(rows = []) {
  const { workbook, rowCount } = buildProjectAllDataWorkbook(rows);
  XLSX.writeFile(workbook, buildExportFileName());
  return rowCount;
}
