import ModuleName from './ModuleName';
import { StatusCell } from './StatusCell';

/**
 * Modules down the side, wings or organisations across the top, each cell the module's latest
 * update there. The module column stays put while the table scrolls sideways.
 */
export default function StatusMatrix({
  columns,
  rows,
  rowConfig,
  asOn,
  cornerLabel = 'Module',
  highlightColumnId,
  onNavigate,
  columnTitle = (c) => c.name,
  columnLabel = (c) => c.name,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 min-w-[250px] bg-[#0f417a] px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-white"
            >
              {cornerLabel}
            </th>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                title={columnTitle(c)}
                className={`min-w-[108px] max-w-[140px] border-l border-white/10 px-2 py-2.5 text-center text-[11px] font-semibold leading-tight text-white ${
                  c.id === highlightColumnId ? 'bg-sky-700' : 'bg-[#0f417a]'
                }`}
              >
                {columnLabel(c)}
                {c.id === highlightColumnId && (
                  <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-sky-200">Your wing</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const config = rowConfig[row.key] || {};
            return (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 text-left text-[12.5px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {/* Number and name side by side; a long name wraps under itself, not under the number */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-5 flex-shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-400">
                      {index + 1}.
                    </span>
                    <ModuleName
                      label={row.label}
                      moduleCode={row.moduleCode}
                      config={config}
                      onNavigate={onNavigate}
                      className="min-w-0 leading-snug"
                    />
                  </div>
                </th>
                {columns.map((c) => (
                  <StatusCell
                    key={c.id}
                    cell={row.cells[c.id]}
                    rowType={row.type}
                    asOn={asOn}
                    statusText={config.statusText}
                    highlight={c.id === highlightColumnId}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
