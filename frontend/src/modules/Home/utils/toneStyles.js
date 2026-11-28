import { TONE } from './dataEntryStatus';

/** Tailwind classes per tone: green = up to date, red = overdue / missing, grey = nothing to report. */
export const TONE_CLASSES = {
  [TONE.CURRENT]: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  [TONE.OVERDUE]: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  [TONE.NEUTRAL]: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
  [TONE.UNAVAILABLE]: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

export const TONE_DOT = {
  [TONE.CURRENT]: 'bg-emerald-500',
  [TONE.OVERDUE]: 'bg-rose-500',
  [TONE.NEUTRAL]: 'bg-slate-400',
  [TONE.UNAVAILABLE]: 'bg-amber-500',
};

export const TONE_LABEL = {
  [TONE.CURRENT]: 'Up to date',
  [TONE.OVERDUE]: 'Update due',
  [TONE.NEUTRAL]: 'Not applicable / nothing pending',
  [TONE.UNAVAILABLE]: 'Could not load',
};
