/** A titled white panel for one dashboard section. */
export default function SectionCard({ index, title, description, actions, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          {index && (
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#0f417a]/10 font-display text-xs font-black text-[#0f417a] dark:bg-sky-400/10 dark:text-sky-300">
              {index}
            </span>
          )}
          <div>
            <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
