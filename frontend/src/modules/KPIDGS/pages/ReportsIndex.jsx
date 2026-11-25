import IndexCardGrid from '../components/IndexCardGrid';
import REPORTS_INDEX, { REPORTS_LEAVES } from '../data/reportsIndex';
import GenericReportPage from '../components/GenericReportPage';
import FlaggingReport from '../components/FlaggingReport';
import VesselSurveyReport from '../components/VesselSurveyReport';
import FlagStateInspectionReport from '../components/FlagStateInspectionReport';
import * as api from '../api';

// Slugs whose report page has its own grouped-header layout and cannot be
// rendered by the generic auto-inferred table.
const CUSTOM_PAGE_BY_SLUG = {
  'flagging-addition': { Component: FlaggingReport, props: { kind: 'addition' } },
  'flagging-deletion': { Component: FlaggingReport, props: { kind: 'deletion' } },
   'vessel-survey-performance': {
    Component: VesselSurveyReport,
    props: { title: 'Vessel Survey by MMDs Performance' },
  },
  'vessel-survey-monthly-trends': {
  Component: VesselSurveyReport,
  props: { title: 'Vessel & Port Surveys by MMDs Monthly Trends (For the Current Year)', showTotal: false },
},
'vessel-survey-yearly-trends': {
  Component: VesselSurveyReport,
  props: { title: 'Vessel & Port Surveys by MMDs Yearly Trends', showTotal: false },
},
  // K-2.6 Flag State Inspection reports use backend-provided grouped column defs
  // (period × metric) with a weighted Total row. Monthly / Yearly Trend pages are rows
  // of category totals rather than aggregable records, so they skip the Total.
  'flag-state-mmd-wise': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection - MMD Wise', filenameSuffix: 'FSI_MMD_Wise' },
  },
  'flag-state-vessel-all-ages': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection & GI Performance Vessel Wise (All Ages)', filenameSuffix: 'FSI_Vessel_All_Ages' },
  },
  'flag-state-vessel-upto-5': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection & GI Performance Vessel Wise (Upto 5 Years Age)', filenameSuffix: 'FSI_Vessel_Upto_5' },
  },
  'flag-state-vessel-5-15': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection & GI Performance Vessel Wise (Above 5 Years & upto 15 Years Age)', filenameSuffix: 'FSI_Vessel_5_15' },
  },
  'flag-state-vessel-15-25': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection & GI Performance Vessel Wise (Above 15 Years & upto 25 Years Age)', filenameSuffix: 'FSI_Vessel_15_25' },
  },
  'flag-state-vessel-above-25': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection & GI Performance Vessel Wise (Above 25 Years Age)', filenameSuffix: 'FSI_Vessel_Above_25' },
  },
  'flag-state-monthly-trends': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection (FSI) Monthly Trends (For the Current Year)', filenameSuffix: 'FSI_Monthly_Trends', showTotal: false },
  },
  'flag-state-yearly-trends': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Flag State Inspection (FSI) Yearly Trends', filenameSuffix: 'FSI_Yearly_Trends', showTotal: false },
  },
  // K-2.7 Port State Control (PSC) — same backend contract as K-2.6, just different age bands
  // and labels. Reuses the generic grouped-column report component.
  'psc-mmd-wise': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Inspection - MMD Wise', filenameSuffix: 'PSC_MMD_Wise' },
  },
  'psc-vessel-all-ages': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Performance Vessel Wise (All Ages)', filenameSuffix: 'PSC_Vessel_All_Ages' },
  },
  'psc-vessel-upto-12': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Performance Vessel Wise (Upto 10 Years Age)', filenameSuffix: 'PSC_Vessel_Upto_10' },
  },
  'psc-vessel-12-20': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Performance Vessel Wise (Above 10 Years & upto 20 Years Age)', filenameSuffix: 'PSC_Vessel_10_20' },
  },
  'psc-vessel-above-20': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Performance Vessel Wise (Above 20 Years)', filenameSuffix: 'PSC_Vessel_Above_20' },
  },
  'psc-monthly-trends': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Inspection Monthly Trends (For the Current Year)', filenameSuffix: 'PSC_Monthly_Trends', showTotal: false },
  },
  'psc-yearly-trends': {
    Component: FlagStateInspectionReport,
    props: { title: 'Abstract - Port State Control (PSC) Inspection Yearly Trends', filenameSuffix: 'PSC_Yearly_Trends', showTotal: false },
  },
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
