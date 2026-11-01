import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Eye } from 'lucide-react';
import ReportTable from '../../../../components/ReportTable';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { fetchProjectsDashboardProject, fetchProjectsDashboardProjects } from '../../api';
import { Loading } from './DashboardParts';
import { formatAmount, formatDate, formatNumber, formatPercent, formatDays } from './dashboardTheme';

// Drill-down of the Projects dashboard: the projects behind a clicked figure (a searchable,
// exportable list), and one project's fields grouped as on the workbook's Project Drilldown
// sheet. Both open in place of the dashboard with a Back button, as on the Major Ports dashboard.

const DASHBOARD_TABLE_THEME = {
  themeClass: 'yp-pro-grid',
  brandColor: '#4f46e5',
  brandColorHover: '#4338ca',
  accentColor: '#eef2ff',
  oddRowColor: '#f8fafc',
};
const DEFAULT_COL_DEF = { sortable: true, filter: true, resizable: true, minWidth: 110 };
const amount = (p) => (p.value === null || p.value === undefined ? '' : formatAmount(p.value));
const percent = (p) => (p.value === null || p.value === undefined ? '' : formatPercent(p.value));
const date = (p) => (p.value ? formatDate(p.value) : '');

/** Title bar of a drill-down page, in the shared dashboard theme, with a Back button. */
export function DrillHeader({ title, subtitle, onBack, actions }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-4 py-3 flex items-center gap-3 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:bg-white/10 transition cursor-pointer flex-shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-wider truncate">{title}</h2>
        {subtitle ? <p className="text-[11px] text-indigo-100 truncate">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

// drill = { title, params: { dim, value, dim2?, value2? } }
export function ProjectListDrill({ drill, filters, filterSummary, onBack, onOpenProject, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const [result, setResult] = useState(null);
  // Tagged with its request so a stale list shows as loading until the new one arrives.
  const key = JSON.stringify({ filters, params: drill.params });

  useEffect(() => {
    let current = true;
    fetchProjectsDashboardProjects(filters, drill.params)
      .then((res) => { if (current) setResult({ key, rows: Array.isArray(res.data) ? res.data : [] }); })
      .catch(() => {
        if (!current) return;
        setResult({ key, rows: [] });
        notify(COMMON_TOASTS.loadFailed('The project list'));
      });
    return () => { current = false; };
    // filters and drill.params are captured in key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, notify]);

  const loading = result?.key !== key;
  const rows = useMemo(() => (loading ? [] : result.rows.map((r, i) => ({ ...r, sNo: i + 1 }))), [result, loading]);

  const columns = useMemo(() => [
    { field: 'sNo', headerName: 'S.No', width: 80, maxWidth: 80, pinned: 'left', filter: false },
    {
      field: 'code',
      headerName: 'Project ID',
      width: 150,
      pinned: 'left',
      cellRenderer: (p) => (
        <button
          type="button"
          onClick={() => onOpenProject(p.data)}
          title="View project details"
          className="inline-flex items-center gap-1 font-bold text-[#4f46e5] hover:underline underline-offset-2 cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" /> {p.value}
        </button>
      ),
    },
    { field: 'projectName', headerName: 'Project Name', minWidth: 280, flex: 2, wrapText: true, autoHeight: true },
    { field: 'subProjectName', headerName: 'Sub Project Name', minWidth: 200, flex: 1, wrapText: true, autoHeight: true },
    { field: 'organisationName', headerName: 'Port / Organisation', minWidth: 200 },
    { field: 'stageName', headerName: 'Current Stage', minWidth: 170 },
    { field: 'delayStatus', headerName: 'Delay Status', minWidth: 130, valueFormatter: (p) => p.value || (p.data?.stageName === 'Completed' ? 'Completed' : '') },
    { field: 'category', headerName: 'Project Category', minWidth: 180 },
    { field: 'mode', headerName: 'Mode', width: 100 },
    { field: 'approvalRoute', headerName: 'Approval Route', minWidth: 150 },
    { field: 'estimatedCost', headerName: 'Estimated Cost (₹ Cr)', minWidth: 150, type: 'numericColumn', valueFormatter: amount },
    { field: 'sanctionedCost', headerName: 'Sanctioned Cost (₹ Cr)', minWidth: 150, type: 'numericColumn', valueFormatter: amount },
    { field: 'awardedCost', headerName: 'Awarded Cost (₹ Cr)', minWidth: 150, type: 'numericColumn', valueFormatter: amount },
    { field: 'expenditure', headerName: 'Expenditure Till Date (₹ Cr)', minWidth: 170, type: 'numericColumn', valueFormatter: amount },
    { field: 'currentFyExpenditure', headerName: 'Current FY Expenditure (₹ Cr)', minWidth: 170, type: 'numericColumn', valueFormatter: amount },
    { field: 'physicalProgress', headerName: 'Physical Progress', minWidth: 130, type: 'numericColumn', valueFormatter: percent },
    { field: 'financialProgress', headerName: 'Financial Progress', minWidth: 130, type: 'numericColumn', valueFormatter: percent },
    { field: 'capacityAddition', headerName: 'Capacity Addition (MTPA)', minWidth: 150, type: 'numericColumn' },
    { field: 'sanctionDate', headerName: 'Sanction Date', minWidth: 130, valueFormatter: date },
    { field: 'awardActualDate', headerName: 'Award / LOA Date', minWidth: 130, valueFormatter: date },
    { field: 'originalTargetDate', headerName: 'Original Target Completion', minWidth: 170, valueFormatter: date },
    { field: 'latestTargetDate', headerName: 'Latest Target Completion', minWidth: 160, valueFormatter: date },
    { field: 'actualCompletionDate', headerName: 'Actual Completion', minWidth: 140, valueFormatter: date },
    { field: 'foundationDate', headerName: 'Foundation Laying (Actual / Tentative)', minWidth: 190, valueFormatter: date },
    { field: 'inaugurationDate', headerName: 'Inauguration (Actual / Tentative)', minWidth: 180, valueFormatter: date },
    { field: 'lastUpdated', headerName: 'Last Updated', minWidth: 130, valueFormatter: date },
  ], [onOpenProject]);

  return (
    <div className="space-y-4 animate-fade-in">
      <DrillHeader title={drill.title} subtitle={filterSummary} onBack={onBack} />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <ReportTable
          title={drill.title}
          eyebrow="Projects Dashboard · Drill-down"
          subtitle={filterSummary}
          loading={loading}
          rawData={rows}
          viewData={rows}
          columns={columns}
          defaultColDef={DEFAULT_COL_DEF}
          triggerNotification={triggerNotification}
          pagination
          {...DASHBOARD_TABLE_THEME}
        />
      </div>
    </div>
  );
}

// Field groups of the workbook's Project Drilldown sheet (delivery status, days late and
// the data-quality note are left out).
const DETAIL_GROUPS = [
  {
    title: 'Identification',
    fields: [
      ['Project ID', (p) => p.projectId],
      ['Sub Project ID', (p) => p.subProjectId ?? '—'],
      ['Project Name', (p) => p.projectName],
      ['Sub Project Name', (p) => p.subProjectName || '—'],
      ['Port / Organisation', (p) => p.organisationName],
      ['State', (p) => p.state],
      ['District', (p) => p.district],
      ['Primary Implementing Agency', (p) => p.implementingAgency || '—'],
    ],
  },
  {
    title: 'Classification',
    fields: [
      ['Project Category', (p) => p.category],
      ['Broad Category', (p) => p.broadCategory],
      ['Mode of Implementation', (p) => p.mode],
      ['Project Type / Approval Route', (p) => p.approvalRoute],
      ['Scheme', (p) => p.scheme],
      ['Source of Funding', (p) => p.funding],
    ],
  },
  {
    title: 'Status',
    fields: [
      ['Current Stage', (p) => p.stageName],
      ['Delay Status', (p) => p.delayStatus || (p.stageGroup === 'completed' ? 'Completed (not classified)' : '—')],
      ['Physical Progress', (p) => formatPercent(p.physicalProgress)],
      ['Financial Progress', (p) => formatPercent(p.financialProgress)],
      ['Implementation Milestone', (p) => p.progressBand],
    ],
  },
  {
    title: 'Key dates',
    fields: [
      ['Project Initiated Date', (p) => formatDate(p.initiatedDate)],
      ['Chairman / Board Approval Date', (p) => formatDate(p.chairmanApprovalDate)],
      ['Admin Approval Date', (p) => formatDate(p.adminApprovalDate)],
      ['Award / LOA Issued Date - Planned', (p) => formatDate(p.awardPlannedDate)],
      ['Award / LOA Issued Date - Latest Target', (p) => formatDate(p.awardLatestDate)],
      ['Award / LOA Issued Date - Actual', (p) => formatDate(p.awardActualDate)],
      ['Original Target Completion Date', (p) => formatDate(p.originalTargetDate)],
      ['Latest Target Completion Date', (p) => formatDate(p.latestTargetDate)],
      ['Actual Date of Completion', (p) => formatDate(p.actualCompletionDate)],
      ['Foundation Laying Date', (p) => formatDate(p.foundationDate)],
      ['Tentative Foundation Laying Date', (p) => formatDate(p.foundationTentativeDate)],
      ['Date of Inauguration', (p) => formatDate(p.inaugurationDate)],
      ['Tentative Inauguration Date', (p) => formatDate(p.inaugurationTentativeDate)],
      ['Last Updated Date', (p) => formatDate(p.lastUpdated)],
    ],
  },
  {
    title: 'Schedule performance',
    fields: [
      ['No. of Revisions to Target Date', (p) => p.revisions],
      ['Slippage vs Original Target', (p) => formatDays(p.slippageDays)],
      ['Days from Sanction to Award', (p) => formatDays(p.daysSanctionToAward)],
      ['Days from Initiation to Award', (p) => formatDays(p.daysInitiationToAward)],
    ],
  },
  {
    title: 'Cost and expenditure (₹ Cr)',
    fields: [
      ['Estimated Cost', (p) => formatAmount(p.estimatedCost)],
      ['Sanctioned Cost', (p) => formatAmount(p.sanctionedCost)],
      ['Awarded Cost', (p) => formatAmount(p.awardedCost)],
      ['Expenditure Till Date', (p) => formatAmount(p.expenditure)],
      ['Target Expenditure Current Year', (p) => formatAmount(p.currentFyTarget)],
      ['Expenditure Current Year', (p) => formatAmount(p.currentFyExpenditure)],
      ['Cost Band', (p) => p.costBand],
    ],
  },
  {
    title: 'Outcome',
    fields: [
      ['Capacity Addition (MTPA)', (p) => formatNumber(p.capacityAddition)],
      ['Capacity Band', (p) => p.capacityBand],
      ['Is Project Foundation Laid', (p) => p.foundationLaid],
      ['Is Project Inaugurated', (p) => p.inaugurated],
    ],
  },
];

// One project's dashboard fields. project = a list row ({ projectId, subProjectId, code, ... }).
export function ProjectDetailDrill({ project, onBack, triggerNotification }) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const [result, setResult] = useState(null);
  const key = `${project.projectId}::${project.subProjectId ?? '-1'}`;

  useEffect(() => {
    let current = true;
    fetchProjectsDashboardProject(project.projectId, project.subProjectId ?? '-1')
      .then((res) => { if (current) setResult({ key, data: res.data }); })
      .catch(() => {
        if (!current) return;
        setResult({ key, error: true });
        notify(COMMON_TOASTS.loadFailed('The project details'));
      });
    return () => { current = false; };
  }, [key, project.projectId, project.subProjectId, notify]);

  const openFullProject = () => {
    const sub = project.subProjectId;
    navigate(`/projects/project/view-project/${project.projectId}${sub !== null && sub !== undefined ? `?subId=${sub}` : ''}`);
  };

  const data = result?.key === key ? result.data : null;
  return (
    <div className="space-y-4 animate-fade-in">
      <DrillHeader
        title={`Project ${project.code}`}
        subtitle={project.subProjectName || project.projectName}
        onBack={onBack}
        actions={(
          <button
            type="button"
            onClick={openFullProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer flex-shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open full project
          </button>
        )}
      />
      {result?.key !== key ? (
        <Loading text="Loading project..." />
      ) : result.error ? (
        <p className="py-16 text-center text-sm text-red-500">Failed to load this project.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {DETAIL_GROUPS.map((group) => (
            <div key={group.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-2.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{group.title}</h3>
              </div>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.fields.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-5 gap-3 px-5 py-2 text-[12px]">
                    <dt className="col-span-2 text-slate-500 dark:text-slate-400 font-semibold">{label}</dt>
                    <dd className="col-span-3 text-slate-800 dark:text-slate-100 font-semibold break-words">{value(data) ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
