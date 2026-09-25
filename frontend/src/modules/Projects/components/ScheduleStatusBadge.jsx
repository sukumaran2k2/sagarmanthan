import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, Hourglass, Timer } from 'lucide-react';
import { SCHEDULE_STATUS } from '../utils/scheduleStatus';

const TONE_STYLES = {
  neutral: {
    wrap: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'text-slate-500',
  },
  info: {
    wrap: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: 'text-sky-600',
  },
  caution: {
    wrap: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'text-amber-600',
  },
  warning: {
    wrap: 'bg-orange-50 text-orange-800 border-orange-200',
    icon: 'text-orange-600',
  },
  danger: {
    wrap: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: 'text-rose-600',
  },
  success: {
    wrap: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: 'text-emerald-600',
  },
};

function StatusIcon({ statusKey, className }) {
  const props = { className: className || 'h-3.5 w-3.5', strokeWidth: 2.25 };

  switch (statusKey) {
    case SCHEDULE_STATUS.OVERDUE:
      return <AlertTriangle {...props} />;
    case SCHEDULE_STATUS.AT_RISK:
      return <Timer {...props} />;
    case SCHEDULE_STATUS.COMPLETED_LATE:
      return <Clock3 {...props} />;
    case SCHEDULE_STATUS.COMPLETED_ON_TIME:
      return <CheckCircle2 {...props} />;
    case SCHEDULE_STATUS.ON_TRACK:
      return <Hourglass {...props} />;
    case SCHEDULE_STATUS.TARGET_MISSING:
    case SCHEDULE_STATUS.NOT_APPLICABLE:
    case SCHEDULE_STATUS.PENDING:
      return <CircleDashed {...props} />;
    default:
      return <Clock3 {...props} />;
  }
}

function daysCaption(status) {
  if (!status || status.days == null) return null;

  switch (status.key) {
    case SCHEDULE_STATUS.OVERDUE:
      return `${status.days}d overdue`;
    case SCHEDULE_STATUS.COMPLETED_LATE:
      return `${status.days}d late`;
    case SCHEDULE_STATUS.AT_RISK:
      return status.days === 0 ? 'due today' : `${status.days}d left`;
    case SCHEDULE_STATUS.ON_TRACK:
      return `${status.days}d left`;
    case SCHEDULE_STATUS.COMPLETED_ON_TIME:
      return status.days > 0 ? `${status.days}d early` : null;
    default:
      return null;
  }
}

/**
 * Compact status chip for schedule comparisons.
 * Hide N/A so nomination / skipped steps stay visually quiet.
 */
export default function ScheduleStatusBadge({ status, compact = false }) {
  if (!status) return null;
  if (status.key === SCHEDULE_STATUS.NOT_APPLICABLE || status.key === SCHEDULE_STATUS.ON_TRACK) return null;

  const tone = TONE_STYLES[status.tone] || TONE_STYLES.neutral;
  const daysText = daysCaption(status);
  const label = compact
    ? status.shortLabel || status.label
    : status.label || status.shortLabel;

  return (
    <span
      title={status.description}
      className={`inline-flex max-w-full items-center gap-1.5 border leading-none ${tone.wrap} ${
        compact ? 'rounded-full px-2 py-0.5 text-[10px] font-semibold' : 'rounded-lg px-2 py-1 text-[11px] font-bold'
      }`}
    >
      <StatusIcon statusKey={status.key} className={`h-3.5 w-3.5 shrink-0 ${tone.icon}`} />
      <span className="whitespace-nowrap">{label}</span>
      {!compact && daysText ? (
        <span className="shrink-0 font-semibold opacity-80 border-l border-current/20 pl-1.5 whitespace-nowrap">
          {daysText}
        </span>
      ) : null}
    </span>
  );
}

const SUMMARY_CARDS = [
  {
    key: 'overdue',
    label: 'Overdue',
    accent: 'from-rose-50 to-white border-rose-200 text-rose-700',
    pip: 'bg-rose-500',
  },
  {
    key: 'at_risk',
    label: 'At Risk',
    accent: 'from-amber-50 to-white border-amber-200 text-amber-800',
    pip: 'bg-amber-500',
  },
  {
    key: 'completed_late',
    label: 'Completed Late',
    accent: 'from-orange-50 to-white border-orange-200 text-orange-800',
    pip: 'bg-orange-500',
  },
  {
    key: 'completed_on_time',
    label: 'Completed On Time',
    accent: 'from-emerald-50 to-white border-emerald-200 text-emerald-800',
    pip: 'bg-emerald-500',
  },
];

/**
 * Top summary strip for tendering / milestone schedule health.
 */
export function ScheduleStatusSummary({
  summary,
  attentionItems = [],
  bottleneck = null,
  titleWhenOverdue = 'Schedule attention required',
  titleWhenWatch = 'Upcoming step watch',
}) {
  const items =
    Array.isArray(attentionItems) && attentionItems.length > 0
      ? attentionItems
      : bottleneck
        ? [bottleneck]
        : [];

  const needsAttention =
    items.length > 0 ||
    (summary?.overdue || 0) + (summary?.at_risk || 0) + (summary?.completed_late || 0) > 0;

  if (!needsAttention) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {SUMMARY_CARDS.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border bg-gradient-to-br px-3 py-2.5 ${card.accent}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`h-1.5 w-1.5 rounded-full ${card.pip}`} />
            <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
              {card.label}
            </p>
          </div>
          <p className="text-lg font-black tabular-nums leading-none">
            {summary?.[card.key] || 0}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl border bg-gradient-to-br px-3 py-2.5 ${card.accent}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-1.5 w-1.5 rounded-full ${card.pip}`} />
              <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
                {card.label}
              </p>
            </div>
            <p className="text-lg font-black tabular-nums leading-none">
              {summary?.[card.key] || 0}
            </p>
          </div>
        ))}
      </div>

      {items.length > 0 ? (
        <div
          className={`rounded-xl border px-3.5 py-3 space-y-2.5 ${
            (summary?.overdue || 0) > 0
              ? 'border-rose-200 bg-rose-50/80'
              : 'border-amber-200 bg-amber-50/80'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">
            {(summary?.overdue || 0) > 0 ? titleWhenOverdue : titleWhenWatch}
          </p>
          <ul className="space-y-2">
            {items.map((item) => {
              const label = item.label || item.row?.label || item.row?.milestone || 'Step';
              const key = `${item.row?.id ?? label}-${item.status?.key}`;
              return (
                <li
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <p className="text-xs text-slate-600 min-w-0">
                    <span className="font-bold text-slate-800">{label}</span>
                    {' - '}
                    <span className="font-semibold">{item.status?.description}</span>
                  </p>
                  <ScheduleStatusBadge status={item.status} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Alias for milestone screens. */
export function MilestoneScheduleSummary(props) {
  return (
    <ScheduleStatusSummary
      titleWhenWatch="Upcoming milestone watch"
      {...props}
    />
  );
}

export function scheduleRowClassName() {
  return '';
}
