import React, { useState, useEffect } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import {
  FY_MONTHS,
  createEmptyMonthsData,
  rowsToMonthsData,
  monthsDataToEntries,
} from '../utils/capexUtils';
import { fetchCapexMonthlyData, saveCapexMonthlyData } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { CAPEX_TOASTS } from '../toastMessages';

const labelClass = 'module-form-label';
const inputClass = 'module-form-input disabled:opacity-60 disabled:cursor-not-allowed';
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm';

export default function CapexActualExpenditurePage({
  capexRecord,
  onBack,
  notify,
  onRefresh,
  canEdit = true,
}) {
  // Starts as loading so Save stays off until the saved figures arrive
  const [loading, setLoading] = useState(Boolean(capexRecord));
  const [saving, setSaving] = useState(false);
  const [selectedYear] = useState(
    capexRecord?.capex_financial_year || '2026-2027'
  );
  const [allMonthsData, setAllMonthsData] = useState(createEmptyMonthsData());
  // Saving replaces the record's actuals, so never save a grid that did not load
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (capexRecord) fetchMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capexRecord]);

  const fetchMonthlyData = async () => {
    if (!capexRecord) return;
    setLoading(true);
    try {
      const res = await fetchCapexMonthlyData(capexRecord.capex_id);
      const rows = Array.isArray(res.data) ? res.data : [];
      setAllMonthsData(rowsToMonthsData(rows));
      setLoadFailed(false);
    } catch (err) {
      console.error('Failed to fetch monthly Capex data:', err?.message);
      setAllMonthsData(createEmptyMonthsData());
      setLoadFailed(true);
      notify?.(COMMON_TOASTS.loadFailed('The monthly actual expenditure'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (month, weekNum, field, value) => {
    if (!canEdit) return;
    const val = value === '' ? 0 : parseFloat(value) || 0;
    if (val < 0) {
      notify?.(CAPEX_TOASTS.invalidAmount(field === 'iebr' ? 'IR / IEBR' : field.toUpperCase()));
      return;
    }
    setAllMonthsData((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        [`${field}Week${weekNum}`]: val,
      },
    }));
  };

  const calculateWeekTotal = (monthData, weekNum) => {
    if (!monthData) return 0;
    const gbs = Number(monthData[`gbsWeek${weekNum}`]) || 0;
    const iebr = Number(monthData[`iebrWeek${weekNum}`]) || 0;
    const ppp = Number(monthData[`pppWeek${weekNum}`]) || 0;
    return gbs + iebr + ppp;
  };

  const calculateMonthTotal = (monthData) => {
    if (!monthData) return { gbs: 0, iebr: 0, ppp: 0, total: 0 };
    let gbs = 0;
    let iebr = 0;
    let ppp = 0;
    for (let w = 1; w <= 4; w++) {
      gbs += Number(monthData[`gbsWeek${w}`]) || 0;
      iebr += Number(monthData[`iebrWeek${w}`]) || 0;
      ppp += Number(monthData[`pppWeek${w}`]) || 0;
    }
    return { gbs, iebr, ppp, total: gbs + iebr + ppp };
  };

  const handleSave = async () => {
    if (!capexRecord || !canEdit || loading || loadFailed) return;
    setSaving(true);
    try {
      await saveCapexMonthlyData({
        capexID: capexRecord.capex_id,
        userID: getCurrentUserId(),
        entries: monthsDataToEntries(allMonthsData),
      });
      notify?.(CAPEX_TOASTS.actualsSaved());
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save monthly Capex error:', err);
      notify?.(CAPEX_TOASTS.actualsSaveFailed(getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const cellInputClass = (val) =>
    `w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#0f417a] text-center outline-none transition focus:ring-2 focus:ring-blue-100 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed ${
      Number(val) > 0
        ? 'border-emerald-500 bg-emerald-50/60 font-black'
        : 'border-slate-200'
    }`;

  return (
    <div className="module-form-card overflow-hidden animate-fade-in w-full">
      <div className="module-form-banner flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h3 className="module-form-banner-title">
            Actual Expenditure
          </h3>
          <p className="module-form-banner-subtext">
            {capexRecord?.organisation_name || 'Organisation'} • Financial Year:{' '}
            {capexRecord?.capex_financial_year || selectedYear}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMonthlyData}
          className="self-start sm:self-auto p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className={sectionCardClass}>
          <div className="space-y-1.5 max-w-xs">
            <label className={labelClass}>Financial Year</label>
            <div className={`${inputClass} bg-slate-100 cursor-not-allowed select-none`}>
              {capexRecord?.capex_financial_year || selectedYear}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[420px] relative">
            <table className="w-full text-xs text-slate-800 border-collapse table-fixed">
              <thead className="sticky top-0 z-20 bg-[#0f417a] text-white shadow-sm">
                <tr className="font-extrabold text-center uppercase tracking-wider text-[11px]">
                  <th className="p-3 border border-[#1a528f] w-[12%] text-left">Months</th>
                  <th className="p-3 border border-[#1a528f] w-[12%]">Week (in Cr)</th>
                  <th className="p-3 border border-[#1a528f] w-[20%]">GBS (in Cr)</th>
                  <th className="p-3 border border-[#1a528f] w-[20%]">IR (in Cr)</th>
                  <th className="p-3 border border-[#1a528f] w-[20%]">PPP (in Cr)</th>
                  <th className="p-3 border border-[#1a528f] w-[16%]">Total (in Cr)</th>
                </tr>
              </thead>
              <tbody>
                {FY_MONTHS.map((month) => {
                  const monthData = allMonthsData[month] || {};
                  const mTotals = calculateMonthTotal(monthData);
                  const hasMonthEntries = mTotals.total > 0;

                  return (
                    <React.Fragment key={month}>
                      {[1, 2, 3, 4].map((weekNum) => {
                        const weekTotal = calculateWeekTotal(monthData, weekNum);
                        const gbsVal = monthData[`gbsWeek${weekNum}`];
                        const iebrVal = monthData[`iebrWeek${weekNum}`];
                        const pppVal = monthData[`pppWeek${weekNum}`];

                        return (
                          <tr
                            key={`${month}-w${weekNum}`}
                            className="hover:bg-slate-50 transition border-b border-slate-100 text-center"
                          >
                            {weekNum === 1 && (
                              <td
                                rowSpan={5}
                                className="p-3 border border-slate-200 font-black text-[#0f417a] text-sm bg-slate-50 align-top text-left"
                              >
                                {month}
                              </td>
                            )}
                            <td className="p-2.5 border border-slate-100 font-bold text-slate-600 bg-slate-50/80">
                              Week {weekNum}
                            </td>
                            <td className="p-2 border border-slate-100">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                disabled={!canEdit}
                                value={gbsVal || ''}
                                onChange={(e) =>
                                  handleInputChange(month, weekNum, 'gbs', e.target.value)
                                }
                                className={cellInputClass(gbsVal)}
                              />
                            </td>
                            <td className="p-2 border border-slate-100">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                disabled={!canEdit}
                                value={iebrVal || ''}
                                onChange={(e) =>
                                  handleInputChange(month, weekNum, 'iebr', e.target.value)
                                }
                                className={cellInputClass(iebrVal)}
                              />
                            </td>
                            <td className="p-2 border border-slate-100">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                disabled={!canEdit}
                                value={pppVal || ''}
                                onChange={(e) =>
                                  handleInputChange(month, weekNum, 'ppp', e.target.value)
                                }
                                className={cellInputClass(pppVal)}
                              />
                            </td>
                            <td className="p-2 border border-slate-100 font-extrabold text-[#0f417a]">
                              {weekTotal > 0 ? (
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[#0f417a] font-black border border-slate-200">
                                  {weekTotal.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-400">0.00</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-100 font-black border-b-2 border-slate-300 text-center text-[#0f417a]">
                        <td className="p-2.5 border border-slate-300 text-xs font-black uppercase tracking-wider">
                          Total {month}
                        </td>
                        <td className="p-2.5 border border-slate-300">{mTotals.gbs.toFixed(2)}</td>
                        <td className="p-2.5 border border-slate-300">{mTotals.iebr.toFixed(2)}</td>
                        <td className="p-2.5 border border-slate-300">{mTotals.ppp.toFixed(2)}</td>
                        <td className="p-2.5 border border-slate-300">
                          <div className="flex items-center justify-center space-x-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black w-fit mx-auto">
                            <span>{mTotals.total.toFixed(2)}</span>
                            {hasMonthEntries && (
                              <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
          >
            Discard
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || loadFailed}
              title={loadFailed ? 'The saved figures could not be loaded. Refresh before saving.' : undefined}
              className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                saving || loading || loadFailed
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg'
              }`}
            >
              {saving ? 'Saving...' : 'Save Expenditure'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
