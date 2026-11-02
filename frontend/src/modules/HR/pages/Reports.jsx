import { useMemo } from 'react';
import Table from '../../../components/Table';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { useHRPermissions } from '../hooks/useHRPermissions';
import { REPORTS_BASE, indexRows, portCategoryLabel, sectionOf } from '../reports/reportCatalog';
import { FilterSelect } from '../reports/ReportLayout';
import { formatAsOnDate } from '../reports/reportUtils';
import { REPORT_THEME as T } from '../reports/theme';
import MisReport from '../reports/MisReport';
import VacancyHistoryReport from '../reports/VacancyHistoryReport';
import ContractualDetailsReport from '../reports/ContractualDetailsReport';
import TrainingDetailsReport from '../reports/TrainingDetailsReport';

const REPORT_VIEWS = {
  vacancyHistory: VacancyHistoryReport,
  mis: MisReport,
  contractual: ContractualDetailsReport,
  training: TrainingDetailsReport,
};

// HR - Reports index: every report the user may open, each linking to its page.
function ReportIndex({ identity }) {
  const navigate = useNavigate();
  const rows = useMemo(() => indexRows(identity), [identity]);

  // S.No and Description left-aligned, the report code centred; section rows are shaded.
  const columnDefs = useMemo(() => [
    { field: 'sNo', headerName: 'S.NO.', minWidth: 70, maxWidth: 90, headerClass: 'hr-rpt-head-left', cellClass: 'hr-rpt-left font-black', cellStyle: { textAlign: 'left' } },
    {
      field: 'coding', headerName: 'CODING', minWidth: 120, maxWidth: 160, headerClass: 'hr-rpt-head-center',
      cellClass: 'hr-rpt-center font-mono font-bold', cellStyle: { textAlign: 'center' },
    },
    {
      field: 'title', headerName: 'DESCRIPTION', flex: 1, minWidth: 260, headerClass: 'hr-rpt-head-left',
      cellClass: 'hr-rpt-left', cellStyle: { textAlign: 'left' }, wrapText: true, autoHeight: true,
      cellRenderer: (p) => p.data.isSection ? (
        <span className="font-black uppercase tracking-wide">{p.value}</span>
      ) : (
        <button
          type="button"
          onClick={() => navigate(`${REPORTS_BASE}/${p.data.report.id}`)}
          className="group inline-flex items-center gap-1 text-left font-bold underline underline-offset-2 cursor-pointer hover:opacity-80"
          style={{ color: T.brand }}
        >
          {p.value}
          <ChevronRight size={13} className="opacity-0 transition group-hover:opacity-100" />
        </button>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div
        className="rounded-2xl px-[26px] py-5 shadow-sm bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] dark:from-slate-900 dark:to-slate-900"
        style={{ border: `1px solid ${T.line}` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp size={14} strokeWidth={2.5} style={{ color: T.brandSoft }} />
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em]" style={{ color: T.brandSoft }}>
            HR Module
          </span>
        </div>
        <h3 className="m-0 text-xl font-bold tracking-wide" style={{ color: T.brand }}>
          HR - Reports
        </h3>
        <p className="mt-1.5 text-xs font-semibold" style={{ color: T.brandSoft }}>
          As on date: <strong style={{ color: T.brand }}>{formatAsOnDate()}</strong>
        </p>
      </div>

      <div className="hr-report-grid">
        <Table
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.key}
          rowClassRules={{ 'hr-rpt-section': (p) => Boolean(p.data?.isSection) }}
          pagination={false}
          color="var(--module-report-header-bg, #4b2424)"
          suppressMovableColumns
          defaultColDef={{ resizable: true, sortable: false, filter: false }}
        />
      </div>
    </div>
  );
}

function ReportView({ identity, notify }) {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const section = sectionOf(identity, reportId);
  if (!section) return <Navigate to={REPORTS_BASE} replace />;

  const report = section.reports.find((r) => r.id === reportId);
  const View = REPORT_VIEWS[report.kind];

  // Sections holding a Major Ports and a Non-Major Ports report switch with a filter.
  const categoryFilter =
    section.reports.length > 1 ? (
      <FilterSelect
        label="Port Category"
        value={report.id}
        onChange={(id) => id && navigate(`${REPORTS_BASE}/${id}`)}
        options={section.reports.map((r) => ({ value: r.id, label: portCategoryLabel(r) }))}
        placeholder="Select category"
      />
    ) : null;

  return (
    <View
      key={report.id}
      report={report}
      categoryFilter={categoryFilter}
      onBack={() => navigate(REPORTS_BASE)}
      notify={notify}
    />
  );
}

export default function HrReports({ notify }) {
  const { isOrgUser, orgId, hrView } = useHRPermissions();
  const identity = useMemo(() => ({ isOrgUser, orgId, hrView }), [isOrgUser, orgId, hrView]);

  return (
    <Routes>
      <Route index element={<ReportIndex identity={identity} />} />
      <Route path=":reportId" element={<ReportView identity={identity} notify={notify} />} />
      <Route path="*" element={<Navigate to={REPORTS_BASE} replace />} />
    </Routes>
  );
}
