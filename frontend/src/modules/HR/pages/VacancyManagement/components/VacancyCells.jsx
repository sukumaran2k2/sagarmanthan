import { ChevronRight } from 'lucide-react';

// Vacancy count that opens the post's vacancy list. Zero is plain text: there is nothing to open.
const CHIP_TONES = {
  live: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60',
  abolished: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60',
};

export function PostNameCell({ value }) {
  return (
    <span title={value || ''} className="line-clamp-2 whitespace-normal break-words leading-[18px] font-semibold text-slate-800 dark:text-slate-200">
      {value || '--'}
    </span>
  );
}

export function VacancyCountChip({ count, tone, onOpen }) {
  const n = Number(count) || 0;
  if (n === 0) return <span className="text-slate-400 dark:text-slate-500">0</span>;
  const label = tone === 'live' ? 'live' : 'abolished';
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`View ${n} ${label} vacanc${n === 1 ? 'y' : 'ies'}`}
      className={`inline-flex h-7 min-w-11 items-center justify-center gap-0.5 rounded-md border pl-2.5 pr-1.5 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${CHIP_TONES[tone]}`}
    >
      {n}
      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}
