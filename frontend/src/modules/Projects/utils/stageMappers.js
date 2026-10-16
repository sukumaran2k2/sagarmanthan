export function sliceDate(value) {
  if (!value) return '';
  const text = String(value);
  if (text.includes('T')) return text.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

export function toBitFlag(value) {
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

export function yearForMonth(month, yearRange) {
  if (typeof yearRange !== 'string' || !yearRange.includes('-')) return null;
  const [startYear, endYear] = yearRange.split('-').map(Number);
  const m = Number(month);
  if (m >= 1 && m <= 3) return endYear;
  return startYear;
}

export function mapPlanningRowsFromApi(row = {}) {
  const sanctioned = row.sanctioned_cost ?? '';
  return [
    {
      key: 'preFeasibility',
      label: 'Preliminary-Feasibility',
      notApplicable: Boolean(toBitFlag(row.is_prefeasibility_notapplicable)),
      actualDate: sliceDate(row.prefeasiblity_actual_date),
      remarks: row.prefeasibility_remarks || '',
    },
    {
      key: 'dpr',
      label: 'DPR',
      notApplicable: Boolean(toBitFlag(row.is_dpr_notapplicable)),
      actualDate: sliceDate(row.dpr_actual_date),
      remarks: row.dpr_remarks || '',
    },
    {
      key: 'submittedToMinistry',
      label: 'Submitted to Ministry',
      notApplicable: false,
      actualDate: sliceDate(row.ministry_submission_date),
      remarks: row.ministry_remarks || '',
    },
    {
      key: 'daConcurrence',
      label: 'DA concurrence obtained',
      notApplicable: false,
      actualDate: sliceDate(row.da_approval_date),
      remarks: row.da_remarks || '',
    },
    {
      key: 'ifwConcurrence',
      label: 'IFW concurrence obtained',
      notApplicable: false,
      actualDate: sliceDate(row.ifw_approval_date),
      remarks: row.ifw_remarks || '',
    },
    {
      key: 'imcApproval',
      label: 'Circulated for IMC - Approval',
      notApplicable: false,
      actualDate: sliceDate(row.imc_approval_date),
      remarks: row.imc_approval_remarks || '',
    },
    {
      key: 'responseComments',
      label: 'Response to Comments Received',
      notApplicable: false,
      actualDate: sliceDate(row.response_com_rec_approval_date),
      remarks: row.response_com_rec_remarks || '',
    },
    {
      key: 'approvedSfc',
      label: 'Approved by SFC/DIB/EFC/PIB/PPPAC',
      notApplicable: false,
      actualDate: sliceDate(row.sfc_approval_date),
      remarks: row.sfc_remarks || '',
    },
    {
      key: 'adminApproval',
      label: 'Admn. Approval / Estimate Sanction by Competent Authority',
      notApplicable: false,
      actualDate: sliceDate(row.admin_approval_approval_date),
      remarks: row.admin_approval_remarks || '',
      sanctionedCost: sanctioned,
    },
    {
      key: 'chairmanApproval',
      label: 'Chairman Board Approval',
      notApplicable: false,
      actualDate: sliceDate(row.chairman_approval_date),
      remarks: row.chairman_approval_remarks || '',
      sanctionedCost: sanctioned,
    },
  ];
}

export function uiIdToSubStageId(uiId) {
  return Number(uiId) + 2;
}

export const DEFAULT_TENDER_LABELS = [
  'Tech. Sanction obtained',
  'Tender Document approved',
  'Tender Notice Issued',
  'Technical Evaluation completed',
  'Financial Evaluation completed',
  'Sanction of Competent Authority obtained for Award',
  'Work Awarded / LOA Issued',
  'Contract Agreement Signed',
];

export function buildDefaultTenderRows() {
  return DEFAULT_TENDER_LABELS.map((label, index) => ({
    id: index + 1,
    label,
    plannedDate: '',
    revisedDate: '',
    actualDate: '',
    notApplicable: false,
    hasCost: label === 'Tech. Sanction obtained' || label === 'Work Awarded / LOA Issued',
    cost: '',
  }));
}

export function mapTenderRowsFromApi(dateRows = [], costRow = null) {
  const next = buildDefaultTenderRows();
  const bySubStage = new Map(
    (Array.isArray(dateRows) ? dateRows : []).map((row) => [Number(row.sub_stage_id), row])
  );

  next.forEach((row) => {
    const apiRow = bySubStage.get(uiIdToSubStageId(row.id));
    if (!apiRow) return;
    row.plannedDate = sliceDate(apiRow.planned_date);
    row.revisedDate = sliceDate(apiRow.revised_date);
    row.actualDate = sliceDate(apiRow.actual_date);
    row.notApplicable = Boolean(toBitFlag(apiRow.not_applicable_date));
  });

  if (costRow) {
    const tech = next.find((r) => r.id === 1);
    const award = next.find((r) => r.id === 7);
    if (tech) tech.cost = costRow.technical_sanction_cost ?? '';
    if (award) award.cost = costRow.award_project_cost ?? '';
  }

  return next;
}

export function mapTenderMetaFromCostApi(costRow = null) {
  if (!costRow) {
    return {
      onNominationBasisAwarded: '0',
      numberOfTenderCalls: '',
      foundationLaid: '',
      foundationLaidDate: '',
      foundationTentativeDate: '',
    };
  }

  let foundationLaid = '';
  if (costRow.foundation_laid === true || costRow.foundation_laid === 1 || costRow.foundation_laid === '1') {
    foundationLaid = 'yes';
  } else if (costRow.foundation_laid === false || costRow.foundation_laid === 0 || costRow.foundation_laid === '0') {
    foundationLaid = 'no';
  }

  return {
    onNominationBasisAwarded: String(costRow.on_nomination_basis ?? '0'),
    numberOfTenderCalls: costRow.num_ut_tender_calls ?? '',
    foundationLaid,
    foundationLaidDate: sliceDate(costRow.foundation_laid_date),
    foundationTentativeDate: sliceDate(costRow.foundation_tentative_date),
  };
}

export const DEFAULT_MILESTONES = [
  { id: 1, milestoneId: 0, milestone: 'Milestone 0 (<20%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
  { id: 2, milestoneId: 1, milestone: 'Milestone 1 (>=20% and <40%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
  { id: 3, milestoneId: 2, milestone: 'Milestone 2 (>=40% and <60%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
  { id: 4, milestoneId: 3, milestone: 'Milestone 3 (>=60% and <80%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
  { id: 5, milestoneId: 4, milestone: 'Milestone 4 (>=80% and <100%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
  { id: 6, milestoneId: 5, milestone: 'Final Milestone (Completion Report =100%)', targetedEndDate: '', actualEndDate: '', activityId: '' },
];

export function mapMilestonesFromApi(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  return DEFAULT_MILESTONES.map((item, index) => {
    const apiRow = list[index] || list.find((r) => Number(r.milestone_id) === item.milestoneId) || {};
    return {
      ...item,
      activityId: apiRow.activity_id || '',
      targetedEndDate: sliceDate(apiRow.start_date),
      actualEndDate: sliceDate(apiRow.end_date),
    };
  });
}
