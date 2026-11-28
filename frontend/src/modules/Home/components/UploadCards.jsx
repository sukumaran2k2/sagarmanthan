import { cellTone, TONE } from '../utils/dataEntryStatus';
import { CARD_CONFIG, CARD_STATUS_TEXT } from '../config/dashboardModules';
import ModuleName from './ModuleName';
import { StatusPill } from './StatusCell';

const ACCENT = {
  [TONE.CURRENT]: 'from-emerald-500 to-emerald-400',
  [TONE.OVERDUE]: 'from-rose-500 to-rose-400',
  [TONE.NEUTRAL]: 'from-slate-400 to-slate-300',
  [TONE.UNAVAILABLE]: 'from-amber-500 to-amber-400',
};

/** E-Office and Attendance: the latest reporting week uploaded. */
export default function UploadCards({ cards, asOn, onNavigate }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const config = CARD_CONFIG[card.key] || {};
        const Icon = config.icon;
        const tone = cellTone(card.cell, 'eofficeWeek', asOn);
        return (
          <article
            key={card.key}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ACCENT[tone]}`} aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Last upload</p>
                <h3 className="mt-1 font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                  <ModuleName label={card.label} moduleCode={card.moduleCode} config={config} onNavigate={onNavigate} />
                </h3>
              </div>
              {Icon && (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#0f417a]/10 text-[#0f417a] dark:bg-sky-400/10 dark:text-sky-300">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              )}
            </div>
            <StatusPill className="mt-3" cell={card.cell} rowType="eofficeWeek" asOn={asOn} statusText={CARD_STATUS_TEXT} />
          </article>
        );
      })}
    </div>
  );
}
