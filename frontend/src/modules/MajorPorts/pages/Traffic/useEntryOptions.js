import { useMemo } from 'react';
import { FY_MONTHS, buildFinancialYearOptions, isFuturePeriod } from './trafficConstants';

const ALL_FY_OPTIONS = buildFinancialYearOptions();

/**
 * Financial years and months an organisation may enter now: every past or current
 * month while the monthly window is open, else only the periods the Ministry unlocked.
 * entryStatus: GET /kpi/<section>/entry-status
 */
export function useEntryOptions(entryStatus, fiscalYear) {
  return useMemo(() => {
    if (!entryStatus) return { fyOptions: [], monthOptions: [] };
    const grants = entryStatus.grants || [];
    const fyOptions = entryStatus.windowOpen || grants.some((g) => g.financialYear === 'ALL')
      ? ALL_FY_OPTIONS
      : ALL_FY_OPTIONS.filter((fy) => grants.some((g) => g.financialYear === fy));

    const unlocked = new Set(
      grants.filter((g) => g.financialYear === 'ALL' || g.financialYear === fiscalYear).flatMap((g) => g.months)
    );
    const monthOptions = FY_MONTHS.filter(
      (m) => (entryStatus.windowOpen || unlocked.has(m.value)) && !isFuturePeriod(fiscalYear, m.value)
    );
    return { fyOptions, monthOptions };
  }, [entryStatus, fiscalYear]);
}
