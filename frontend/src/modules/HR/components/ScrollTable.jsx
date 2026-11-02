/**
 * Table whose body scrolls under a fixed header (and optional totals row): the scrollbar runs beside
 * the rows only. Header, body and footer are separate tables with the same column widths, and each
 * reserves the scrollbar's space (scrollbar-gutter), so the columns stay aligned.
 *
 * columns: [{ key, label, width?, align?: 'left' | 'center' | 'right', render: (row, index) => node }]
 *   width: a CSS width ('4rem', '20%'); columns without one share the rest.
 * footer: optional array of cells (one per column) for a totals row.
 * rowClassName: classes for every row, or (row, index) => classes.
 */
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
const GUTTER = { scrollbarGutter: 'stable' };

function ColGroup({ columns }) {
  return (
    <colgroup>
      {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
    </colgroup>
  );
}

export default function ScrollTable({
  columns, rows, rowKey = (row, i) => i, maxHeight = '20rem', minWidth = '0',
  footer = null, emptyText = 'No records found', headerClassName = 'bg-[#0f417a] text-white',
  rowClassName = 'odd:bg-slate-50/60 dark:odd:bg-slate-800/30',
}) {
  const tableStyle = { tableLayout: 'fixed', width: '100%', minWidth };
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className={`overflow-hidden ${headerClassName}`} style={GUTTER}>
          <table className="text-xs" style={tableStyle}>
            <ColGroup columns={columns} />
            <thead className="uppercase text-[10px] tracking-wide">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2.5 font-bold ${ALIGN[c.align] || ALIGN.left}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div className="overflow-y-auto overflow-x-hidden" style={{ ...GUTTER, maxHeight }}>
          <table className="text-xs" style={tableStyle}>
            <ColGroup columns={columns} />
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">{emptyText}</td></tr>
              ) : rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className={`border-t border-slate-100 dark:border-slate-800 first:border-t-0 ${typeof rowClassName === 'function' ? rowClassName(row, i) : rowClassName}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 break-words ${ALIGN[c.align] || ALIGN.left} ${c.align === 'right' ? 'tabular-nums' : ''}`}>
                      {c.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {footer && rows.length > 0 && (
          <div className="overflow-hidden bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700" style={GUTTER}>
            <table className="text-xs font-bold" style={tableStyle}>
              <ColGroup columns={columns} />
              <tfoot>
                <tr>
                  {columns.map((c, i) => (
                    <td key={c.key} className={`px-3 py-2 ${ALIGN[c.align] || ALIGN.left} ${c.align === 'right' ? 'tabular-nums' : ''}`}>{footer[i] ?? ''}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
