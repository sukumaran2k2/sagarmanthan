import { average, baseStats, daysBetween, largestGroup, sum } from '../aggregate';
import { num, financialYearFromLabel, formatCrore, formatDays } from '../format';
import { COL, FILTER, colSpec } from '../fields';
import { countLabel, fyCompletionPhrase, isSingleOrganisation } from '../text';

const delayedProgressReport = {
  id: 'delayed-progress',
  annexure: '2',
  code: 'MIS-2',
  shortLabel: 'Delayed > 100 days',
  group: 'Schedule risk',
  accent: 'amber',
  title: 'Projects delayed by more than 100 days',
  rule: 'Expected completion at the current rate of physical progress is more than 100 days after the target date.',
  filters: [FILTER.organisation, FILTER.mode],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation'],
  totalField: { field: 'awardedCostCr', label: 'Awarded cost' },
  defaultSortField: 'delayDays',
  kpis: [
    { id: 'count', label: 'Projects', format: 'count' },
    { id: 'totalAwardedCostCr', label: 'Awarded cost', format: 'crore' },
    { id: 'averageDelayDays', label: 'Avg. delay', format: 'days' },
  ],
  columns: [
    COL.projectId,
    COL.organisation,
    COL.projectName,
    COL.mode,
    COL.awarded,
    COL.physical,
    COL.targetDate,
    colSpec({
      field: 'expectedCompletionDate',
      headerName: 'Expected Completion',
      headerTooltip: 'Expected date of completion as per current speed',
      type: 'date',
      minWidth: 170,
      align: 'center',
    }),
    colSpec({
      field: 'delayDays',
      headerName: 'Delay (Days)',
      headerTooltip: 'Expected completion minus target completion',
      type: 'days',
      minWidth: 130,
      align: 'right',
    }),
  ],
  prepareRows(rows) {
    return rows.map((row) => ({
      ...row,
      delayDays: num(row.delayDays) ?? daysBetween(row.targetCompletionDate, row.expectedCompletionDate),
    }));
  },
  deriveStats(rows) {
    return {
      ...baseStats(rows),
      totalAwardedCostCr: sum(rows, 'awardedCostCr'),
      averageDelayDays: average(rows, 'delayDays'),
    };
  },
  buildInsights(rows, { audience, financialYear } = {}) {
    const fy = financialYearFromLabel(financialYear);
    const lines = [
      `${countLabel(rows.length, 'project')} ${rows.length === 1 ? 'is' : 'are'} delayed by more than 100 days on physical progress.`,
    ];
    const topOrg = isSingleOrganisation(rows, audience) ? null : largestGroup(rows, 'organisationName');
    const subject = topOrg?.rows || rows;

    if (topOrg) {
      lines.push(`${topOrg.name} has the most delayed projects (${subject.length}). ${fyCompletionPhrase(subject, fy)}`);
      lines.push(`Awarded cost of those ${subject.length} projects is ₹${formatCrore(sum(subject, 'awardedCostCr'), { fixed: true })} Cr, with an average delay of ${formatDays(average(subject, 'delayDays'))} days.`);
    } else {
      const phrase = fyCompletionPhrase(rows, fy);
      if (phrase) lines.push(phrase);
      lines.push(`Total awarded cost is ₹${formatCrore(sum(rows, 'awardedCostCr'), { fixed: true })} Cr, with an average delay of ${formatDays(average(rows, 'delayDays'))} days.`);
    }
    return lines.filter(Boolean);
  },
};

export default delayedProgressReport;
