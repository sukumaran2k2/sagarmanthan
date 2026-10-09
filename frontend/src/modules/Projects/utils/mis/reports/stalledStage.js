import { average, baseStats, largestGroup, maxBy, mostCommon, sum } from '../aggregate';
import { formatCrore, formatDays } from '../format';
import { COL, FILTER, colSpec } from '../fields';
import { countLabel, isSingleOrganisation, projectQuote } from '../text';

const stalledStageReport = {
  id: 'stalled-stage',
  annexure: '1',
  code: 'MIS-1',
  shortLabel: 'Stalled > 3 months',
  group: 'Schedule risk',
  accent: 'rose',
  title: 'Projects stalled for more than 3 months',
  rule: 'Estimated cost above ₹50 Cr, with no movement on the current stage for more than 3 months.',
  filters: [FILTER.organisation, FILTER.mode, FILTER.lastStage],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation', 'lastStage'],
  totalField: { field: 'estimatedCostCr', label: 'Estimated cost' },
  defaultSortField: 'daysPending',
  kpis: [
    { id: 'count', label: 'Projects', format: 'count' },
    { id: 'totalEstimatedCostCr', label: 'Estimated cost', format: 'crore' },
    { id: 'averageDaysPending', label: 'Avg. days pending', format: 'days' },
  ],
  columns: [
    COL.projectId,
    COL.organisation,
    COL.projectName,
    COL.estimated,
    COL.mode,
    colSpec({ field: 'lastStage', headerName: 'Last Stage', type: 'text', minWidth: 180 }),
    colSpec({ field: 'lastStageDate', headerName: 'Last Stage Date', type: 'date', minWidth: 140, align: 'center' }),
    colSpec({ field: 'daysPending', headerName: 'Days Pending', type: 'days', minWidth: 130, align: 'right' }),
  ],
  prepareRows(rows) {
    return rows;
  },
  deriveStats(rows) {
    return {
      ...baseStats(rows),
      totalEstimatedCostCr: sum(rows, 'estimatedCostCr'),
      averageDaysPending: average(rows, 'daysPending'),
    };
  },
  buildInsights(rows, { audience } = {}) {
    const lines = [
      `${countLabel(rows.length, 'project')}, each valued over ₹50 Cr, ${rows.length === 1 ? 'is' : 'are'} stalled for more than 3 months. Combined estimated cost is ₹${formatCrore(sum(rows, 'estimatedCostCr'), { fixed: true })} Cr.`,
    ];
    const avg = average(rows, 'daysPending');
    if (avg != null) lines.push(`The average delay across these projects is ${formatDays(avg)} days.`);

    const top = maxBy(rows, 'estimatedCostCr');
    const topQuote = projectQuote(top);
    if (topQuote) lines.push(`The highest estimated cost is ${topQuote}, at ₹${formatCrore(top.estimatedCostCr)} Cr.`);

    if (!isSingleOrganisation(rows, audience)) {
      const topOrg = largestGroup(rows, 'organisationName');
      if (topOrg) {
        lines.push(`${topOrg.name} has the most stalled projects (${topOrg.rows.length}), with a combined estimated cost of ₹${formatCrore(sum(topOrg.rows, 'estimatedCostCr'), { fixed: true })} Cr and an average delay of ${formatDays(average(topOrg.rows, 'daysPending'))} days.`);
      }
    }

    const stage = mostCommon(rows, 'lastStage');
    if (stage) lines.push(`The most common stage of delay is “${stage.name}”, accounting for ${countLabel(stage.count, 'project')}.`);
    return lines;
  },
};

export default stalledStageReport;
