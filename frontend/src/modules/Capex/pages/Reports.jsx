import { useEffect, useMemo } from 'react';
import { useCapexStore } from '../store/useCapexStore';
import CapexForm32Report from '../components/CapexForm32Report';
import CapexMinistrySummaryReport from '../components/reports/CapexMinistrySummaryReport';
import CapexMinistryYoYReport from '../components/reports/CapexMinistryYoYReport';
import CapexOrgSummaryReport from '../components/reports/CapexOrgSummaryReport';

const MINISTRY_REPORTS = [
  { id: 'summary', label: '1.1 Summary Report' },
  { id: 'detailed', label: '1.2 Detailed Report' },
  { id: 'yoy', label: '1.3 Year-on-Year' },
];

const ORG_REPORTS = [
  { id: 'summary', label: '1.1 Summary Report' },
  { id: 'detailed', label: '1.2 Detailed Report' },
];

export default function CapexReports({ viewMode = 'ministry', notify }) {
  const reports = viewMode === 'org' ? ORG_REPORTS : MINISTRY_REPORTS;
  // The selected report lives in the module store so it survives leaving the module
  const activeReport = useCapexStore((state) => state.activeReport);
  const setActiveReport = useCapexStore((state) => state.setActiveReport);

  useEffect(() => {
    if (!reports.some((r) => r.id === activeReport)) {
      setActiveReport(reports[0]?.id || 'detailed');
    }
  }, [viewMode, reports, activeReport, setActiveReport]);

  const activeMeta = useMemo(
    () => reports.find((r) => r.id === activeReport) || reports[0],
    [reports, activeReport]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2 select-none px-1 overflow-x-auto">
        {reports.map((report) => {
          const active = report.id === activeReport;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => setActiveReport(report.id)}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-[#4b2424] text-[#4b2424] dark:border-[#eadede] dark:text-[#eadede] bg-[#f7f3f3] dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {report.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 font-medium px-1">
        {activeMeta?.label}
        {viewMode === 'org' ? ' · Organisation view' : ' · Ministry view'}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-6">
        {viewMode === 'ministry' && activeReport === 'summary' && (
          <CapexMinistrySummaryReport notify={notify} />
        )}
        {viewMode === 'ministry' && activeReport === 'detailed' && (
          <CapexForm32Report notify={notify} />
        )}
        {viewMode === 'ministry' && activeReport === 'yoy' && (
          <CapexMinistryYoYReport notify={notify} />
        )}

        {viewMode === 'org' && activeReport === 'summary' && (
          <CapexOrgSummaryReport notify={notify} />
        )}
        {viewMode === 'org' && activeReport === 'detailed' && (
          <CapexForm32Report notify={notify} orgScoped />
        )}
      </div>
    </div>
  );
}
