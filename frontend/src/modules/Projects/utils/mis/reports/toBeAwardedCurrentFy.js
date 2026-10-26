import { baseStats, sum } from '../aggregate';
import { financialYearFromLabel } from '../format';
import { COL, FILTER, colSpec } from '../fields';
import { countLabel, projectQuote } from '../text';

const toBeAwardedCurrentFyReport = {
  id: 'to-be-awarded-current-fy',
  annexure: '5',
  code: 'MIS-5',
  shortLabel: 'To be awarded',
  group: 'Award and completion',
  accent: 'violet',
  title: 'Projects to be awarded this financial year',
  rule: 'Planned LOA / award date falls in the current financial year, and the work is not yet awarded.',
  filters: [FILTER.organisation, FILTER.mode, FILTER.currentStage],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation', 'currentStage'],
  totalField: { field: 'estimatedCostCr', label: 'Estimated cost' },
  defaultSortField: 'loaPlannedDate',
  defaultSortDir: 'asc',
  kpis: [
    { id: 'count', label: 'Projects', format: 'count' },
    { id: 'totalEstimatedCostCr', label: 'Estimated cost', format: 'crore' },
    { id: 'organisationCount', label: 'Organisations', format: 'count' },
  ],
  columns: [
    COL.projectId,
    COL.organisation,
    COL.projectName,
    COL.estimated,
    COL.mode,
    COL.physical,
    COL.financial,
    colSpec({
      field: 'loaActualDate',
      headerName: 'LOA Issued (Actual)',
      headerTooltip: 'Work Awarded / LOA Issued — Actual Date',
      type: 'date',
      minWidth: 160,
      align: 'center',
    }),
    colSpec({
      field: 'loaPlannedDate',
      headerName: 'LOA Issued (Planned)',
      headerTooltip: 'Work Awarded / LOA Issued — Planned Date',
      type: 'date',
      minWidth: 170,
      align: 'center',
    }),
    COL.currentStage,
  ],
  prepareRows(rows) {
    return rows;
  },
  deriveStats(rows) {
    return {
      ...baseStats(rows),
      totalEstimatedCostCr: sum(rows, 'estimatedCostCr'),
    };
  },
  buildInsights(rows, { financialYear } = {}) {
    const fy = financialYearFromLabel(financialYear);
    const lines = [
      `${countLabel(rows.length, 'project')} ${rows.length === 1 ? 'is' : 'are'} scheduled to be awarded in FY ${fy.label}.`,
    ];
    if (rows.length <= 4) {
      rows.forEach((row) => {
        const quote = projectQuote(row);
        if (quote) lines.push(`${quote}.`);
      });
    }
    return lines;
  },
};

export default toBeAwardedCurrentFyReport;
