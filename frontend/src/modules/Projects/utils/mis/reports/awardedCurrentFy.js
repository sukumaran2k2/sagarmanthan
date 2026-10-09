import { baseStats, sum } from '../aggregate';
import { financialYearFromLabel, formatCrore } from '../format';
import { COL, FILTER, colSpec } from '../fields';
import { countLabel, projectQuote } from '../text';

const awardedCurrentFyReport = {
  id: 'awarded-current-fy',
  annexure: '3',
  code: 'MIS-3',
  shortLabel: 'Awarded this FY',
  group: 'Award and completion',
  accent: 'emerald',
  title: 'Projects awarded in the current financial year',
  rule: 'Work awarded / LOA issued actual date falls in the current financial year.',
  filters: [FILTER.organisation, FILTER.mode, FILTER.currentStage],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation', 'currentStage'],
  totalField: { field: 'awardedCostCr', label: 'Awarded cost' },
  defaultSortField: 'loaActualDate',
  defaultSortDir: 'desc',
  kpis: [
    { id: 'count', label: 'Projects', format: 'count' },
    { id: 'totalAwardedCostCr', label: 'Awarded cost', format: 'crore' },
    { id: 'totalCapacityMtpa', label: 'Capacity (MTPA)', format: 'number' },
  ],
  columns: [
    COL.projectId,
    COL.organisation,
    COL.projectName,
    COL.awarded,
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
    COL.currentStage,
    colSpec({
      field: 'capacityAdditionMtpa',
      headerName: 'Capacity Addition (MTPA)',
      type: 'number',
      minWidth: 170,
      align: 'right',
    }),
  ],
  prepareRows(rows) {
    return rows;
  },
  deriveStats(rows) {
    return {
      ...baseStats(rows),
      totalAwardedCostCr: sum(rows, 'awardedCostCr'),
      totalCapacityMtpa: sum(rows, 'capacityAdditionMtpa'),
    };
  },
  buildInsights(rows, { financialYear } = {}) {
    const fy = financialYearFromLabel(financialYear);
    const lines = [
      `${countLabel(rows.length, 'project')} ${rows.length === 1 ? 'has' : 'have'} been awarded in FY ${fy.label}.`,
    ];
    if (rows.length <= 4) {
      rows.forEach((row) => {
        const quote = projectQuote(row);
        if (quote) lines.push(`${quote}, with an awarded cost of ₹${formatCrore(row.awardedCostCr)} Cr.`);
      });
    }
    lines.push(`Total awarded cost is ₹${formatCrore(sum(rows, 'awardedCostCr'), { fixed: true })} Cr.`);
    return lines;
  },
};

export default awardedCurrentFyReport;
