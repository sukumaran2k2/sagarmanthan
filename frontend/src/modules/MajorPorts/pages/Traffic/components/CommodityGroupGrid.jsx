import {
  TRAFFIC_CATEGORIES,
  TRAFFIC_CELL_DIMENSIONS,
  TRAFFIC_DIRECTIONS,
  TRAFFIC_FLAG_TYPES,
} from '../trafficConstants';
import {
  cellKey,
  commodityUnitLabel,
  isTeuCommodity,
  sumColumnTotals,
  sumCommodityRow,
} from '../trafficUtils';

const inputClass =
  'w-full min-w-[4.5rem] text-[11px] px-1.5 py-1.5 text-right bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-[#0f417a] font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-60';

export default function CommodityGroupGrid({
  title,
  commodities = [],
  valuesMap = {},
  onChange,
  disabled = false,
  loading = false,
  fieldErrors = {},
}) {
  // Don't sum TEUs and tonnes into one footer total (Container group)
  const hasMixedUnits =
    commodities.some((c) => isTeuCommodity(c.commodity_id)) &&
    commodities.some((c) => !isTeuCommodity(c.commodity_id));
  const { totals, grand } = hasMixedUnits
    ? { totals: [], grand: 0 }
    : sumColumnTotals(valuesMap, commodities);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-8 text-center text-sm font-semibold text-slate-500">
        Loading commodities…
      </div>
    );
  }

  if (!commodities.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm font-semibold text-slate-500">
        No commodities found for {title}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            {hasMixedUnits
              ? 'Enter values by category, direction and flag. Row totals update live (TEUs and tonnes are kept separate).'
              : 'Enter values by category, direction and flag. Row and column totals update live.'}
          </p>
        </div>
        {!hasMixedUnits ? (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Group total</p>
            <p className="text-lg font-black text-[#0f417a] dark:text-blue-300 tabular-nums">
              {grand.toFixed(2)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="min-w-max w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0f417a] text-white">
              <th rowSpan={4} className="sticky left-0 z-20 bg-[#0f417a] px-3 py-2 text-left min-w-[180px] border border-[#0a2d55]">
                Commodity
              </th>
              <th colSpan={8} className="px-2 py-1.5 border border-[#0a2d55] font-bold">
                Direct
              </th>
              <th colSpan={12} className="px-2 py-1.5 border border-[#0a2d55] font-bold bg-[#1a5ba3]">
                Transhipment
              </th>
              <th
                rowSpan={4}
                className="sticky right-0 z-20 bg-[#0f417a] px-3 py-2 border border-[#0a2d55] min-w-[96px] shadow-[-4px_0_8px_rgba(0,0,0,0.15)]"
              >
                TOTAL
              </th>
            </tr>
            <tr className="bg-[#134a8a] text-white">
              {TRAFFIC_CATEGORIES.map((cat) => (
                <th
                  key={cat.id}
                  colSpan={4}
                  className={`px-2 py-1.5 border border-[#0a2d55] font-bold ${cat.transhipment ? 'bg-[#1a5ba3]' : ''}`}
                >
                  {cat.name}
                </th>
              ))}
            </tr>
            <tr className="bg-[#1a5ba3] text-white">
              {TRAFFIC_CATEGORIES.map((cat) =>
                TRAFFIC_DIRECTIONS.map((dir) => (
                  <th
                    key={`${cat.id}-${dir.id}`}
                    colSpan={2}
                    className="px-2 py-1 border border-[#0a2d55] font-semibold"
                  >
                    {dir.name}
                  </th>
                ))
              )}
            </tr>
            <tr className="bg-[#2466ad] text-white">
              {TRAFFIC_CATEGORIES.map((cat) =>
                TRAFFIC_DIRECTIONS.map((dir) =>
                  TRAFFIC_FLAG_TYPES.map((flag) => (
                    <th
                      key={`${cat.id}-${dir.id}-${flag.id}`}
                      className="px-1.5 py-1 border border-[#0a2d55] font-medium whitespace-nowrap min-w-[78px]"
                    >
                      {flag.name}
                    </th>
                  ))
                )
              )}
            </tr>
          </thead>
          <tbody>
            {commodities.map((commodity, rowIndex) => {
              const rowTotal = sumCommodityRow(valuesMap, commodity.commodity_id);
              const unit = commodityUnitLabel(commodity.commodity_id);
              return (
                <tr
                  key={commodity.commodity_id}
                  className={rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/80 dark:bg-slate-900/60'}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 min-w-[180px]">
                    <span>{commodity.commodity_name}</span>
                    {unit ? (
                      <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">{unit}</span>
                    ) : null}
                  </td>
                  {TRAFFIC_CELL_DIMENSIONS.map((dim) => {
                    const key = cellKey(
                      commodity.commodity_id,
                      dim.categoryId,
                      dim.directionId,
                      dim.flagTypeId
                    );
                    const hasError = Boolean(fieldErrors[key]);
                    return (
                      <td key={key} className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          disabled={disabled}
                          value={valuesMap[key] ?? ''}
                          onChange={(e) => onChange?.(key, e.target.value)}
                          title={fieldErrors[key] || undefined}
                          aria-invalid={hasError}
                          className={`${inputClass} ${
                            hasError
                              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 focus:border-rose-500'
                              : ''
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-inherit px-2 py-2 text-right font-black text-[#0f417a] dark:text-blue-300 border border-slate-200 dark:border-slate-700 tabular-nums shadow-[-4px_0_8px_rgba(0,0,0,0.08)] min-w-[96px]">
                    {rowTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {!hasMixedUnits ? (
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-700">
                  Total
                </td>
                {totals.map((sum, index) => (
                  <td
                    key={`col-total-${index}`}
                    className="px-2 py-2 text-right tabular-nums border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {sum.toFixed(2)}
                  </td>
                ))}
                <td className="sticky right-0 z-10 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-right font-black text-[#0f417a] dark:text-blue-300 border border-slate-200 dark:border-slate-700 tabular-nums shadow-[-4px_0_8px_rgba(0,0,0,0.08)] min-w-[96px]">
                  {grand.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
