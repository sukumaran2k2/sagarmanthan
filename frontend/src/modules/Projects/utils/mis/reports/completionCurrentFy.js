import { baseStats, largestGroup, maxBy, sum } from '../aggregate';
import { financialYearFromLabel, formatCrore } from '../format';
import { COL, FILTER } from '../fields';
import { countLabel, isSingleOrganisation, projectQuote, stageBreakdown } from '../text';

const completionCurrentFyReport = {
  id: 'completion-current-fy',
  annexure: '4',
  code: 'MIS-4',
  shortLabel: 'Due this FY',
  group: 'Award and completion',
  accent: 'sky',
  title: 'Projects scheduled for completion this financial year',
  rule: 'Target completion date falls in the current financial year, across every stage.',
  filters: [FILTER.organisation, FILTER.mode, FILTER.currentStage],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation', 'currentStage'],
  totalField: { field: 'estimatedCostCr', label: 'Estimated cost' },
  defaultSortField: 'targetCompletionDate',
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
    COL.targetDate,
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
  buildInsights(rows, { audience, financialYear } = {}) {
    const fy = financialYearFromLabel(financialYear);
    const lines = [
      `${countLabel(rows.length, 'project')} ${rows.length === 1 ? 'is' : 'are'} scheduled for completion in FY ${fy.label}.`,
    ];
    const top = maxBy(rows, 'estimatedCostCr');
    const topQuote = projectQuote(top);
    if (topQuote) lines.push(`The highest estimated cost is ${topQuote}, at ₹${formatCrore(top.estimatedCostCr)} Cr.`);

    if (!isSingleOrganisation(rows, audience)) {
      const topOrg = largestGroup(rows, 'organisationName');
      const breakdown = topOrg ? stageBreakdown(topOrg.rows) : '';
      if (topOrg) {
        lines.push(`${topOrg.name} has the most projects due this year (${topOrg.rows.length}), with an estimated cost of ₹${formatCrore(sum(topOrg.rows, 'estimatedCostCr'), { fixed: true })} Cr.${breakdown ? ` Of these, ${breakdown}.` : ''}`);
      }
    } else {
      const breakdown = stageBreakdown(rows);
      if (breakdown) lines.push(`By current stage, ${breakdown}.`);
    }
    return lines;
  },
};

export default completionCurrentFyReport;
