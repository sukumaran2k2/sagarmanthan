import { useMemo, useState } from 'react';
import GEMReportView from '../components/GEMReportView';
import GEMSummaryReport from '../components/reports/GEMSummaryReport';
import GEMYoYReport from '../components/reports/GEMYoYReport';

const MINISTRY_REPORT_TABS = [
  { id: 'summary', label: '1.1 Summary Report' },
  { id: 'detailed', label: '1.2 Detailed Report' },
  { id: 'yoy', label: '1.3 Year-on-Year' },
];

const ORG_REPORT_TABS = [
  { id: 'summary', label: '1.1 Summary Report' },
  { id: 'detailed', label: '1.2 Detailed Report' },
];

export default function GEMReports({ showToast, viewMode = 'ministry' }) {
  const [activeReport, setActiveReport] = useState('detailed');

  const reportTabs = viewMode === 'org' ? ORG_REPORT_TABS : MINISTRY_REPORT_TABS;
  const effectiveActiveReport = reportTabs.some((r) => r.id === activeReport)
    ? activeReport
    : reportTabs[0]?.id || 'detailed';

  const activeMeta = useMemo(
    () => reportTabs.find((r) => r.id === effectiveActiveReport) || reportTabs[0],
    [effectiveActiveReport, reportTabs]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1 mb-2 px-1 overflow-x-auto">
        {reportTabs.map((report) => {
          const active = report.id === effectiveActiveReport;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => setActiveReport(report.id)}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {report.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 font-medium px-1">{activeMeta?.label}</div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-6">
        {effectiveActiveReport === 'summary' && (
          <GEMSummaryReport showToast={showToast} viewMode={viewMode} />
        )}
        {effectiveActiveReport === 'detailed' && (
          <GEMReportView showToast={showToast} viewMode={viewMode} />
        )}
        {effectiveActiveReport === 'yoy' && <GEMYoYReport showToast={showToast} viewMode={viewMode} />}
      </div>
    </div>
  );
}
