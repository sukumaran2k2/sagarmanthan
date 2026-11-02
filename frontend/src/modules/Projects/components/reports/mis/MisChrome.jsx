import { AlertCircle, Building2, Landmark } from 'lucide-react';
import { MIS_BORDER, MIS_BRAND, MIS_BRAND_SOFT } from '../../../utils/mis/theme';

export function AudienceChip({ audience }) {
  const organisation = audience === 'organisation';
  const Icon = organisation ? Building2 : Landmark;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white"
      style={{ borderColor: MIS_BORDER, color: MIS_BRAND }}
    >
      <Icon className="h-3.5 w-3.5" />
      {organisation ? 'Your organisation' : 'All organisations'}
    </span>
  );
}

export function MetaPill({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 min-w-[7.5rem]" style={{ border: `1px solid ${MIS_BORDER}` }}>
      <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: MIS_BRAND_SOFT }}>
        {label}
      </div>
      <div className="text-sm font-black tabular-nums" style={{ color: MIS_BRAND }}>
        {value}
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span className="inline-flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {message}
      </span>
      <button type="button" onClick={onRetry} className="text-xs font-black uppercase tracking-wider cursor-pointer">
        Retry
      </button>
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl px-5 py-5 sm:px-6 ${className}`}
      style={{
        border: `1px solid ${MIS_BORDER}`,
        background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
      }}
    >
      {children}
    </div>
  );
}
