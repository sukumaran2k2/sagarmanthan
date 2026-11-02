import {
  TRAFFIC_CATEGORIES,
  TRAFFIC_CELL_DIMENSIONS,
  TRAFFIC_DIRECTIONS,
  TRAFFIC_FLAG_TYPES,
} from '../trafficConstants';
import {
  cellKey,
  isTeuCommodity,
  sumColumnTotals,
  sumCommodityRow,
} from '../trafficUtils';

import { CheckCircle2 } from 'lucide-react';

// Same look as the GeM monthly-data entry table
const TH = 'p-2.5 border border-white/40 font-extrabold uppercase tracking-wider text-[11px] text-center';
const cellInputClass = (val, hasError) =>
  `w-full min-w-[4.5rem] px-2 py-1.5 border rounded-xl text-xs font-bold text-[#0f417a] dark:text-blue-200 text-center outline-none transition focus:ring-2 focus:ring-blue-100 focus:bg-white dark:focus:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed ${
    hasError
      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 focus:ring-rose-100'
      : Number(val) > 0
        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 font-black'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
  }`;

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

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] relative">
        <table className="min-w-max w-full border-collapse text-xs text-slate-800 dark:text-slate-100">
          <thead className="sticky top-0 z-30 bg-[#0f417a] text-white shadow-sm">
            <tr>
              <th rowSpan={4} className={`${TH} sticky left-0 z-40 bg-[#0f417a] min-w-[180px] text-left`}>
                Commodity
              </th>
              <th colSpan={8} className={TH}>
                Direct
              </th>
              <th colSpan={12} className={TH}>
                Transhipment
              </th>
              <th rowSpan={4} className={`${TH} sticky right-0 z-40 bg-[#0f417a] min-w-[96px]`}>
                Total
              </th>
            </tr>
            <tr>
              {TRAFFIC_CATEGORIES.map((cat) => (
                <th key={cat.id} colSpan={4} className={TH}>
                  {cat.name}
                </th>
              ))}
            </tr>
            <tr>
              {TRAFFIC_CATEGORIES.map((cat) =>
                TRAFFIC_DIRECTIONS.map((dir) => (
                  <th key={`${cat.id}-${dir.id}`} colSpan={2} className={TH}>
                    {dir.name}
                  </th>
                ))
              )}
            </tr>
            <tr>
              {TRAFFIC_CATEGORIES.map((cat) =>
                TRAFFIC_DIRECTIONS.map((dir) =>
                  TRAFFIC_FLAG_TYPES.map((flag) => (
                    <th key={`${cat.id}-${dir.id}-${flag.id}`} className={`${TH} whitespace-nowrap min-w-[90px]`}>
                      {flag.name}
                    </th>
                  ))
                )
              )}
            </tr>
          </thead>
          <tbody>
            {commodities.map((commodity) => {
              const rowTotal = sumCommodityRow(valuesMap, commodity.commodity_id);
              return (
                <tr
                  key={commodity.commodity_id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800 text-center"
                >
                  <td className="sticky left-0 z-10 p-3 border border-slate-200 dark:border-slate-700 font-black text-[#0f417a] dark:text-blue-200 text-sm bg-slate-50 dark:bg-slate-800 text-left min-w-[180px]">
                    {commodity.commodity_name}
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
                      <td key={key} className="p-2 border border-slate-100 dark:border-slate-800">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          disabled={disabled}
                          value={valuesMap[key] ?? ''}
                          onChange={(e) => onChange?.(key, e.target.value)}
                          title={fieldErrors[key] || undefined}
                          aria-label={`${commodity.commodity_name}, ${dim.label}`}
                          aria-invalid={hasError}
                          className={cellInputClass(valuesMap[key], hasError)}
                        />
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-[#0f417a] dark:text-blue-200 tabular-nums min-w-[96px]">
                    {rowTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {!hasMixedUnits ? (
              <tr className="bg-slate-100 dark:bg-slate-800 font-black border-b-2 border-slate-300 dark:border-slate-600 text-center text-[#0f417a] dark:text-blue-200">
                <td className="sticky left-0 z-10 p-2.5 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wider text-left">
                  Total
                </td>
                {totals.map((sum, index) => (
                  <td
                    key={`col-total-${index}`}
                    className="p-2.5 border border-slate-300 dark:border-slate-600 tabular-nums"
                  >
                    {sum.toFixed(2)}
                  </td>
                ))}
                <td className="sticky right-0 z-10 p-2.5 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
                  <div className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-xl text-xs font-black w-fit mx-auto tabular-nums">
                    <span>{grand.toFixed(2)}</span>
                    {grand > 0 && <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-300 flex-shrink-0" />}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
