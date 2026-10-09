function col(spec) {
  return spec;
}

export const COL = {
  projectId: col({
    field: 'projectId',
    headerName: 'Project ID',
    type: 'text',
    minWidth: 110,
    maxWidth: 140,
    align: 'center',
    bold: true,
  }),
  organisation: col({
    field: 'organisationName',
    headerName: 'Organisation',
    type: 'text',
    minWidth: 140,
    bold: true,
  }),
  projectName: col({
    field: 'projectName',
    headerName: 'Project Name',
    type: 'text',
    flex: 2.2,
    minWidth: 240,
  }),
  mode: col({
    field: 'modeOfImplementation',
    headerName: 'Mode of Implementation',
    type: 'text',
    minWidth: 160,
    align: 'center',
  }),
  physical: col({
    field: 'physicalProgress',
    headerName: 'Physical Progress',
    type: 'percent',
    minWidth: 140,
    align: 'right',
  }),
  financial: col({
    field: 'financialProgress',
    headerName: 'Financial Progress',
    type: 'percent',
    minWidth: 150,
    align: 'right',
  }),
  estimated: col({
    field: 'estimatedCostCr',
    headerName: 'Estimated Cost (₹ Cr)',
    type: 'money',
    minWidth: 160,
    align: 'right',
  }),
  awarded: col({
    field: 'awardedCostCr',
    headerName: 'Awarded Cost (₹ Cr)',
    type: 'money',
    minWidth: 160,
    align: 'right',
  }),
  currentStage: col({
    field: 'currentStage',
    headerName: 'Current Stage',
    type: 'text',
    minWidth: 170,
  }),
  targetDate: col({
    field: 'targetCompletionDate',
    headerName: 'Target Completion',
    type: 'date',
    minWidth: 150,
    align: 'center',
  }),
};

export const FILTER = {
  organisation: { id: 'organisation', field: 'organisationName', label: 'Organisation' },
  mode: { id: 'mode', field: 'modeOfImplementation', label: 'Mode of implementation' },
  lastStage: { id: 'stage', field: 'lastStage', label: 'Last stage' },
  currentStage: { id: 'stage', field: 'currentStage', label: 'Current stage' },
};

export function colSpec(spec) {
  return col(spec);
}
