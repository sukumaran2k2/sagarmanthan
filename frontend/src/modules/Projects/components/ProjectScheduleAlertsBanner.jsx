import { useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Download } from 'lucide-react';
import {
  SCHEDULE_STATUS,
  getScheduleStatus,
  getTenderStepScheduleStatus,
} from '../utils/scheduleStatus';
import { DEFAULT_MILESTONES, DEFAULT_TENDER_LABELS } from '../utils/stageMappers';
import { downloadScheduleAlertsExcel } from '../utils/exportScheduleAlerts';
import ScheduleStatusBadge from './ScheduleStatusBadge';

const ATTENTION_STATUS_KEYS = new Set([
  SCHEDULE_STATUS.OVERDUE,
  SCHEDULE_STATUS.AT_RISK,
]);

const STATUS_SORT_RANK = {
  [SCHEDULE_STATUS.OVERDUE]: 0,
  [SCHEDULE_STATUS.AT_RISK]: 1,
};

const STAGE_META = {
  tendering: {
    stageLabel: 'Under Tendering',
    chipClass:
      'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  implementation: {
    stageLabel: 'Under Implementation',
    chipClass:
      'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
};

/** Inverse of uiIdToSubStageId in stageMappers (sub_stage_id = uiId + 2). */
function subStageIdToUiId(subStageId) {
  return Number(subStageId) - 2;
}

function toProjectIds(apiRow = {}) {
  return {
    projectId: String(apiRow.project_id ?? ''),
    subProjectId: String(apiRow.sub_project_id ?? '-1'),
    projectName: apiRow.project_name || '',
    subProjectName: apiRow.sub_project_name || '',
  };
}

function buildTenderingAlert(apiRow = {}) {
  const subStageId = Number(apiRow.sub_stage_id);
  if (!Number.isFinite(subStageId)) return null;

  const stepUiId = subStageIdToUiId(subStageId);
  if (!Number.isFinite(stepUiId) || stepUiId < 1) return null;

  const nominationMode =
    apiRow.on_nomination_basis === true ||
    apiRow.on_nomination_basis === 1 ||
    apiRow.on_nomination_basis === '1';

  const status = getTenderStepScheduleStatus(
    {
      id: stepUiId,
      plannedDate: apiRow.planned_date,
      revisedDate: apiRow.revised_date,
      actualDate: '',
      notApplicable: false,
    },
    { nominationMode }
  );

  if (!status || !ATTENTION_STATUS_KEYS.has(status.key)) return null;

  const ids = toProjectIds(apiRow);
  return {
    key: `tendering-${ids.projectId}-${ids.subProjectId}-${subStageId}`,
    ...ids,
    stage: STAGE_META.tendering.stageLabel,
    stageMeta: STAGE_META.tendering,
    stepLabel: DEFAULT_TENDER_LABELS[stepUiId - 1] || 'Current tendering step',
    status,
  };
}

function buildImplementationAlert(apiRow = {}) {
  const milestoneId = Number(apiRow.milestone_id);
  if (!Number.isFinite(milestoneId)) return null;

  const milestoneMeta = DEFAULT_MILESTONES.find((item) => item.milestoneId === milestoneId);
  const status = getScheduleStatus({
    targetDate: apiRow.start_date,
    actualDate: '',
  });

  if (!status || !ATTENTION_STATUS_KEYS.has(status.key)) return null;

  const ids = toProjectIds(apiRow);
  return {
    key: `implementation-${ids.projectId}-${ids.subProjectId}-${milestoneId}`,
    ...ids,
    stage: STAGE_META.implementation.stageLabel,
    stageMeta: STAGE_META.implementation,
    stepLabel: milestoneMeta?.milestone || 'Current milestone',
    status,
  };
}

function buildAlertItems(alerts) {
  const tenderingAlerts = (Array.isArray(alerts?.tendering) ? alerts.tendering : [])
    .map(buildTenderingAlert)
    .filter(Boolean);
  const implementationAlerts = (Array.isArray(alerts?.implementation) ? alerts.implementation : [])
    .map(buildImplementationAlert)
    .filter(Boolean);

  return [...tenderingAlerts, ...implementationAlerts].sort((a, b) => {
    const rankA = STATUS_SORT_RANK[a.status?.key] ?? 99;
    const rankB = STATUS_SORT_RANK[b.status?.key] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return (b.status?.days || 0) - (a.status?.days || 0);
  });
}

function AlertItem({ alert, onOpenProjectDetail }) {
  const handleOpen = () => {
    onOpenProjectDetail?.({
      projectId: alert.projectId,
      subProjectId: alert.subProjectId,
      projectName: alert.projectName,
      subProjectName: alert.subProjectName,
      stage: alert.stage,
    });
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/80">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="truncate text-left text-xs font-bold text-slate-800 hover:text-blue-700 hover:underline cursor-pointer dark:text-slate-100 dark:hover:text-blue-400"
            title="Open project"
          >
            {alert.projectName}
            {alert.subProjectName && alert.subProjectName !== '-' ? (
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {' '}
                — {alert.subProjectName}
              </span>
            ) : null}
          </button>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${alert.stageMeta.chipClass}`}
          >
            {alert.stage}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">{alert.stepLabel}</span>
          {' — '}
          <span className="font-semibold">{alert.status?.description}</span>
        </p>
      </div>
      <ScheduleStatusBadge status={alert.status} />
    </li>
  );
}

export default function ProjectScheduleAlertsBanner({ alerts, onOpenProjectDetail, notify }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const alertItems = useMemo(() => buildAlertItems(alerts), [alerts]);

  if (alertItems.length === 0) return null;

  const overdueCount = alertItems.filter((item) => item.status?.key === SCHEDULE_STATUS.OVERDUE).length;
  const title =
    overdueCount > 0 ? 'Schedule attention required' : 'Upcoming steps to watch';
  const isUrgent = overdueCount > 0;

  const handleExport = (event) => {
    event.stopPropagation();
    if (exporting || alertItems.length === 0) return;

    try {
      setExporting(true);
      const count = downloadScheduleAlertsExcel(alertItems);
      notify?.(`Exported ${count} schedule alert${count === 1 ? '' : 's'} to Excel.`, 'success');
    } catch (error) {
      console.error(error);
      notify?.('Failed to export schedule alerts.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`mb-3 overflow-hidden rounded-2xl border shadow-xs ${
        isUrgent
          ? 'border-rose-200 bg-gradient-to-r from-rose-50 to-white dark:border-rose-900/60 dark:from-rose-950/30 dark:to-slate-900'
          : 'border-amber-200 bg-gradient-to-r from-amber-50 to-white dark:border-amber-900/60 dark:from-amber-950/30 dark:to-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer rounded-xl -ml-1 px-1 py-0.5 transition hover:bg-black/5 dark:hover:bg-white/5"
          aria-expanded={expanded}
          title={expanded ? 'Collapse alerts' : 'Expand alerts'}
        >
          <div
            className={`rounded-xl border p-1.5 shadow-xs ${
              isUrgent
                ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400'
            }`}
          >
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {title}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-xs ${
                  isUrgent ? 'bg-rose-600' : 'bg-amber-600'
                }`}
              >
                {alertItems.length}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Current open tendering step or milestone that is overdue or due within 7 days
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            title="Export schedule alerts to Excel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{expanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {expanded ? (
        <ul
          className={`max-h-72 space-y-2 overflow-y-auto border-t px-4 py-3 ${
            isUrgent
              ? 'border-rose-100 dark:border-rose-900/40'
              : 'border-amber-100 dark:border-amber-900/40'
          }`}
        >
          {alertItems.map((alert) => (
            <AlertItem key={alert.key} alert={alert} onOpenProjectDetail={onOpenProjectDetail} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
