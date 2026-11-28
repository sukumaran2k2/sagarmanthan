import { TONE } from '../utils/dataEntryStatus';
import { TONE_DOT } from '../utils/toneStyles';

const ITEMS = [
  { tone: TONE.CURRENT, label: 'Up to date', hint: 'Updated in the current or previous period' },
  { tone: TONE.OVERDUE, label: 'Update due', hint: 'Last update is older, or nothing entered yet' },
  { tone: TONE.NEUTRAL, label: 'Not applicable / nothing pending', hint: 'Module does not apply, or no open items' },
];

/** What the cell colours mean. */
export default function StatusLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
      {ITEMS.map((item) => (
        <li key={item.tone} className="inline-flex items-center gap-1.5" title={item.hint}>
          <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
