import { Construction, FilePlus2, List } from 'lucide-react';

export default function SectionPlaceholder({
  section,
  mode = 'list',
  onSwitchTab,
}) {
  const isAdd = mode === 'add';
  const ModeIcon = isAdd ? FilePlus2 : List;

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#0f417a]/8 border border-[#0f417a]/15 mb-4">
        <Construction className="h-7 w-7 text-[#0f417a]" />
      </div>

      <div className="inline-flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0f417a] bg-[#0f417a]/8 px-2 py-0.5 rounded-md">
          <ModeIcon className="h-3 w-3" />
          {isAdd ? 'Input Form' : 'Data List'}
        </span>
      </div>

      <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 font-display">
        {section.fullLabel}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md font-medium leading-relaxed">
        {section.description}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-semibold">
        Coming soon
      </p>

      {onSwitchTab && (
        <button
          type="button"
          onClick={() => onSwitchTab(isAdd ? 'list' : 'add')}
          className="mt-6 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Go to {isAdd ? 'Data List' : 'Input Form'}
        </button>
      )}
    </div>
  );
}
