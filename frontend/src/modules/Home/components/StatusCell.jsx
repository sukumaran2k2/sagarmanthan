import { cellText, cellTone } from '../utils/dataEntryStatus';
import { TONE_CLASSES, TONE_DOT, TONE_LABEL } from '../utils/toneStyles';

/** One table cell of the status matrix. */
export function StatusCell({ cell, rowType, asOn, statusText, highlight = false }) {
  const tone = cellTone(cell, rowType, asOn);
  const text = cellText(cell, rowType, statusText);
  return (
    <td
      className={`px-2 py-2 text-center text-[11.5px] font-semibold leading-tight whitespace-nowrap border-b border-r border-white dark:border-slate-900 ${TONE_CLASSES[tone]} ${
        highlight ? 'ring-2 ring-inset ring-[#0f417a]/40 dark:ring-sky-400/40' : ''
      }`}
      title={`${text} - ${TONE_LABEL[tone]}`}
    >
      {text}
    </td>
  );
}

/** A rounded status chip, for cards and the single-organisation list. */
export function StatusPill({ cell, rowType, asOn, statusText, className = '' }) {
  const tone = cellTone(cell, rowType, asOn);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
      title={TONE_LABEL[tone]}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {cellText(cell, rowType, statusText)}
    </span>
  );
}
