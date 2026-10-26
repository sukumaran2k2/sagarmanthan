import { average, baseStats, maxBy, sum } from '../aggregate';
import { num, round2, formatCrore } from '../format';
import { COL, FILTER, colSpec } from '../fields';
import { countLabel, projectQuote } from '../text';

const progressGapReport = {
  id: 'progress-gap',
  annexure: '6',
  code: 'MIS-6',
  shortLabel: 'Progress gap > 10%',
  group: 'Physical and financial',
  accent: 'orange',
  title: 'Physical and financial progress gap above 10%',
  rule: 'Projects valued above ₹10 Cr where physical progress is more than 10 percentage points ahead of financial progress.',
  filters: [FILTER.organisation, FILTER.mode],
  searchFields: ['projectId', 'organisationName', 'projectName', 'modeOfImplementation'],
  totalField: { field: 'remainingExpenditureCr', label: 'Remaining expenditure' },
  defaultSortField: 'progressDifference',
  kpis: [
    { id: 'count', label: 'Projects', format: 'count' },
    { id: 'totalRemainingExpenditureCr', label: 'Remaining spend', format: 'crore' },
    { id: 'averageGap', label: 'Avg. gap', format: 'percent' },
  ],
  columns: [
    COL.projectId,
    COL.organisation,
    COL.projectName,
    COL.awarded,
    COL.physical,
    COL.financial,
    COL.mode,
    COL.targetDate,
    colSpec({
      field: 'progressDifference',
      headerName: 'Progress Difference',
      headerTooltip: 'Physical progress minus financial progress',
      type: 'percent',
      minWidth: 160,
      align: 'right',
    }),
    colSpec({
      field: 'remainingExpenditureCr',
      headerName: 'Remaining Expenditure (₹ Cr)',
      type: 'money',
      minWidth: 190,
      align: 'right',
    }),
  ],
  prepareRows(rows) {
    return rows.map((row) => {
      const physical = num(row.physicalProgress);
      const financial = num(row.financialProgress);
      const awarded = num(row.awardedCostCr);
      const progressDifference = num(row.progressDifference)
        ?? (physical != null && financial != null ? round2(physical - financial) : null);
      const remainingExpenditureCr = num(row.remainingExpenditureCr)
        ?? (awarded != null && progressDifference != null ? round2((awarded * progressDifference) / 100) : null);
      return { ...row, progressDifference, remainingExpenditureCr };
    });
  },
  deriveStats(rows) {
    return {
      ...baseStats(rows),
      totalRemainingExpenditureCr: sum(rows, 'remainingExpenditureCr'),
      averageGap: average(rows, 'progressDifference'),
    };
  },
  buildInsights(rows) {
    const lines = [
      `${countLabel(rows.length, 'project')} valued above ₹10 Cr ${rows.length === 1 ? 'shows' : 'show'} a gap of more than 10 percentage points between physical and financial progress.`,
    ];
    const topRemain = maxBy(rows, 'remainingExpenditureCr');
    const remainQuote = projectQuote(topRemain);
    if (remainQuote) {
      lines.push(`${remainQuote} has the highest remaining expenditure, ₹${formatCrore(topRemain.remainingExpenditureCr)} Cr, against an awarded cost of ₹${formatCrore(topRemain.awardedCostCr)} Cr.`);
    }
    const topAward = maxBy(rows, 'awardedCostCr');
    const awardQuote = projectQuote(topAward);
    if (awardQuote && topAward?.projectId !== topRemain?.projectId) {
      lines.push(`The highest awarded cost in this list is ${awardQuote}, at ₹${formatCrore(topAward.awardedCostCr)} Cr.`);
    }
    lines.push(`Total remaining expenditure is ₹${formatCrore(sum(rows, 'remainingExpenditureCr'), { fixed: true })} Cr.`);
    return lines;
  },
};

export default progressGapReport;
