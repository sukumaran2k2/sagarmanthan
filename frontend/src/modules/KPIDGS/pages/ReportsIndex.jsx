import IndexCardGrid from '../components/IndexCardGrid';
import REPORTS_INDEX, { REPORTS_LEAVES } from '../data/reportsIndex';
import GenericReportPage from '../components/GenericReportPage';
import FlaggingReport from '../components/FlaggingReport';
import { EntryExitAbstractReport, EntryExitMonthlyReport, EntryExitYearlyReport } from './reports/EntryExitReports';
import * as api from '../api';

// Slugs whose report page has its own grouped-header layout and cannot be
// rendered by the generic auto-inferred table.
const CUSTOM_PAGE_BY_SLUG = {
  'flagging-addition': { Component: FlaggingReport, props: { kind: 'addition' } },
  'flagging-deletion': { Component: FlaggingReport, props: { kind: 'deletion' } },
  // K-2.4: month / financial-year pickers, totals and charts
  'entry-exit': { Component: EntryExitAbstractReport, props: {} },
  'entry-exit-monthly-trends': { Component: EntryExitMonthlyReport, props: {} },
  'entry-exit-yearly-trends': { Component: EntryExitYearlyReport, props: {} },
};

const FETCH_BY_SLUG = {
  'flagging-addition': api.fetchReportKpi2_1_1,
  'flagging-deletion': api.fetchReportKpi2_1_2,
  'flagging-cumulative': api.fetchReportKpi2_1_3,
  'flagging-monthly-trends': api.fetchReportKpi2_1_4,
  'flagging-yearly-trends': api.fetchReportKpi2_1_5,
  'sbfap-overview': api.fetchReportKpi2_2_0,
  'sbfap-ip-approved': api.fetchReportKpi2_2_1,
  'sbfap-ip-in-process': api.fetchReportKpi2_2_2,
  'sbfap-ip-rejected': api.fetchReportKpi2_2_3,
  'sbfap-fr-approved': api.fetchReportKpi2_2_4,
  'sbfap-fr-in-process': api.fetchReportKpi2_2_5,
  'sbfap-fr-rejected': api.fetchReportKpi2_2_6,
  'exam-overall': api.fetchReportKpi2_3_1,
  'exam-monthly-trends': api.fetchReportKpi2_3_2,
  'exam-yearly-trends': api.fetchReportKpi2_3_3,
  'entry-exit': api.fetchReportKpi2_4_1,
  'entry-exit-monthly-trends': api.fetchReportKpi2_4_2,
  'entry-exit-yearly-trends': api.fetchReportKpi2_4_3,
  'marine-casualty-previous-current': api.fetchReportKpi2_5_1,
  'marine-casualty-yearwise': api.fetchReportKpi2_5_2,
  'marine-casualty-country-wise': api.fetchReportKpi2_5_3,
  'marine-casualty-vessel-wise': api.fetchReportKpi2_5_4,
  'flag-state-mmd-wise': api.fetchReportKpi2_6_1,
  'flag-state-vessel-all-ages': api.fetchReportKpi2_6_2,
  'flag-state-vessel-upto-5': api.fetchReportKpi2_6_3,
  'flag-state-vessel-5-15': api.fetchReportKpi2_6_4,
  'flag-state-vessel-15-25': api.fetchReportKpi2_6_5,
  'flag-state-vessel-above-25': api.fetchReportKpi2_6_6,
  'flag-state-monthly-trends': api.fetchReportKpi2_6_7,
  'flag-state-yearly-trends': api.fetchReportKpi2_6_8,
  'psc-mmd-wise': api.fetchReportKpi2_7_1,
  'psc-vessel-all-ages': api.fetchReportKpi2_7_2,
  'psc-vessel-upto-12': api.fetchReportKpi2_7_3,
  'psc-vessel-12-20': api.fetchReportKpi2_7_4,
  'psc-vessel-above-20': api.fetchReportKpi2_7_5,
  'psc-monthly-trends': api.fetchReportKpi2_7_6,
  'psc-yearly-trends': api.fetchReportKpi2_7_7,
  'vessel-survey-performance': api.fetchReportKpi2_8_1,
  'vessel-survey-monthly-trends': api.fetchReportKpi2_8_2,
  'vessel-survey-yearly-trends': api.fetchReportKpi2_8_3,
  'mti-performance': api.fetchReportKpi2_9_1,
  'mti-stream-wise': api.fetchReportKpi2_9_2,
  'mti-affiliation-wise': api.fetchReportKpi2_9_3,
  'mti-placement-previous-fy': api.fetchReportKpi2_9_4_1,
  'mti-placement-previous-fy-2': api.fetchReportKpi2_9_4_2,
};

export default function ReportsIndex({ triggerNotification }) {
  return (
    <IndexCardGrid
      title="Output Reports"
      subtitle="Pick a report to open it on the right."
      rows={REPORTS_INDEX}
      routePrefix="/kpi/dgs/reports"
      accentColor="#4b2424"
      mergedLayout
      renderRight={(slug, { flat } = {}) => {
        if (!slug) return null;
        const leaf = REPORTS_LEAVES.find((l) => l.slug === slug);
        const fetchFn = FETCH_BY_SLUG[slug];
        if (!leaf || !fetchFn) {
          return (
            <p className="text-sm text-slate-600">No report is registered for slug "{slug}".</p>
          );
        }
        const custom = CUSTOM_PAGE_BY_SLUG[slug];
        if (custom) {
          const { Component, props } = custom;
          return (
            <Component
              key={slug}
              code={leaf.code}
              fetchFn={fetchFn}
              triggerNotification={triggerNotification}
              flat={flat}
              {...props}
            />
          );
        }
        return (
          <GenericReportPage
            key={slug}
            code={leaf.code}
            title={leaf.label}
            fetchFn={fetchFn}
            triggerNotification={triggerNotification}
            showBack={false}
            flat={flat}
          />
        );
      }}
    />
  );
}
