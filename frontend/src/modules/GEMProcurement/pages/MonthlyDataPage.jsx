import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { fetchGemMonthlyData, saveGemMonthlyData } from '../api';
import {
  getGemRecordId,
  getGemFinancialYear,
  getGemPotential,
} from '../utils/gemUtils';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { GEM_TOASTS } from '../toastMessages';

const FY_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
];

const labelClass = 'module-form-label';
const inputClass = 'module-form-input disabled:opacity-60 disabled:cursor-not-allowed';
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm';

const createEmptyMonthsData = () => {
  const initial = {};
  FY_MONTHS.forEach((m) => {
    initial[m] = { through: '', outside: '', reason: '' };
  });
  return initial;
};

export default function GEMMonthlyDataPage({
  record = null,
  category = 'goods',
  categoryTitle = 'Goods',
  canEdit = true,
  onBack,
  onSaved,
  notify,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Stays true until a load succeeds, so a failed load can't save over stored data.
  const [loadFailed, setLoadFailed] = useState(false);
  const [allMonthsData, setAllMonthsData] = useState(createEmptyMonthsData());

  const recordId = getGemRecordId(record, category);

  const fetchMonthlyData = useCallback(async () => {
    if (!recordId) {
      setAllMonthsData(createEmptyMonthsData());
      setLoadFailed(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchGemMonthlyData(category, recordId);
      const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : {};
      const loaded = createEmptyMonthsData();
      FY_MONTHS.forEach((m) => {
        const key = m.toLowerCase();
        loaded[m] = {
          through: row[`procurement_through_gem_${key}`] ?? '',
          outside: row[`procurement_outside_gem_${key}`] ?? '',
          reason: row[`reason_for_non_procurement_${key}`] ?? '',
        };
      });
      setAllMonthsData(loaded);
      setLoadFailed(false);
    } catch (err) {
      console.error('Failed to fetch monthly GeM data:', err);
      setAllMonthsData(createEmptyMonthsData());
      setLoadFailed(true);
      notify?.(COMMON_TOASTS.loadFailed('The monthly procurement data'));
    } finally {
      setLoading(false);
    }
  }, [category, recordId, notify]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const handleInputChange = (month, field, value) => {
    if (!canEdit) return;
    setAllMonthsData((prev) => ({
      ...prev,
      [month]: { ...prev[month], [field]: value },
    }));
  };

  const totals = FY_MONTHS.reduce(
    (acc, m) => {
      acc.through += Number(allMonthsData[m]?.through) || 0;
      acc.outside += Number(allMonthsData[m]?.outside) || 0;
      return acc;
    },
    { through: 0, outside: 0 }
  );

  const handleSave = async () => {
    if (!recordId || !canEdit || loadFailed) return;
    setSaving(true);
    try {
      const payload = {};
      FY_MONTHS.forEach((m) => {
        const data = allMonthsData[m] || {};
        payload[`procurementThroughGem${m}`] =
          data.through === '' ? null : Number(data.through);
        payload[`procurementOutsideGem${m}`] =
          data.outside === '' ? null : Number(data.outside);
        payload[`reasonForNonProcurement${m}`] = data.reason || '';
      });
      payload.totalProcurementThroughGem = totals.through;
      payload.totalProcurementOutsideGem = totals.outside;

      await saveGemMonthlyData(category, recordId, payload);
      notify?.(GEM_TOASTS.monthlySaved());
      onSaved?.();
    } catch (err) {
      console.error('Save GeM monthly error:', err);
      notify?.(GEM_TOASTS.monthlySaveFailed(getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  if (!record) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 font-semibold">
        No record selected. Open Update from the Data List.
      </div>
    );
  }

  const cellInputClass = (val) =>
    `w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#0f417a] text-center outline-none transition focus:ring-2 focus:ring-blue-100 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed ${
      Number(val) > 0
        ? 'border-emerald-500 bg-emerald-50/60 font-black'
        : 'border-slate-200'
    }`;

  return (
    <div className="module-form-card overflow-hidden animate-fade-in w-full text-left">
      <div className="module-form-banner flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h3 className="module-form-banner-title">
            GeM Procurement ({categoryTitle}) — Monthly Data
          </h3>
          <p className="module-form-banner-subtext">
            {record.organisation_name || 'Organisation'} • Financial Year:{' '}
            {getGemFinancialYear(record) || '—'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Financial Year</label>
              <div className={`${inputClass} bg-slate-100 cursor-not-allowed select-none`}>
                {getGemFinancialYear(record) || '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                Planned Total Procurement (In Crore)
              </label>
              <div className={`${inputClass} bg-slate-100 cursor-not-allowed select-none`}>
                {Number(getGemPotential(record, category)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[420px] relative">
            <table className="w-full text-xs text-slate-800 border-collapse table-fixed">
              <thead className="sticky top-0 z-20 bg-[#0f417a] text-white shadow-sm">
                <tr className="font-extrabold text-center uppercase tracking-wider text-[11px]">
                  <th className="p-3 border border-[#1a528f] w-[14%] text-left">Months</th>
                  <th className="p-3 border border-[#1a528f] w-[22%]">
                    Procurement through GEM (In Crore)
                  </th>
                  <th className="p-3 border border-[#1a528f] w-[22%]">
                    Procurement Outside GEM (In Crore)
                  </th>
                  <th className="p-3 border border-[#1a528f] w-[42%]">
                    Reason for non Procurement through GEM
                  </th>
                </tr>
              </thead>
              <tbody>
                {FY_MONTHS.map((month) => {
                  const data = allMonthsData[month] || {};
                  return (
                    <tr
                      key={month}
                      className="hover:bg-slate-50 transition border-b border-slate-100 text-center"
                    >
                      <td className="p-3 border border-slate-200 font-black text-[#0f417a] text-sm bg-slate-50 text-left">
                        {month}
                      </td>
                      <td className="p-2 border border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          disabled={!canEdit}
                          value={data.through ?? ''}
                          onChange={(e) =>
                            handleInputChange(month, 'through', e.target.value)
                          }
                          className={cellInputClass(data.through)}
                        />
                      </td>
                      <td className="p-2 border border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          disabled={!canEdit}
                          value={data.outside ?? ''}
                          onChange={(e) =>
                            handleInputChange(month, 'outside', e.target.value)
                          }
                          className={cellInputClass(data.outside)}
                        />
                      </td>
                      <td className="p-2 border border-slate-100">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={data.reason ?? ''}
                          onChange={(e) =>
                            handleInputChange(month, 'reason', e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 text-left outline-none transition focus:ring-2 focus:ring-blue-100 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-slate-100 font-black border-b-2 border-slate-300 text-center text-[#0f417a]">
                  <td className="p-2.5 border border-slate-300 text-xs font-black uppercase tracking-wider text-left">
                    Total
                  </td>
                  <td className="p-2.5 border border-slate-300">
                    <div className="flex items-center justify-center space-x-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black w-fit mx-auto">
                      <span>{totals.through.toFixed(2)}</span>
                      {totals.through > 0 && (
                        <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 border border-slate-300">
                    {totals.outside.toFixed(2)}
                  </td>
                  <td className="p-2.5 border border-slate-300" />
                </tr>
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
              className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                saving || loading || loadFailed
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg'
              }`}
            >
              {saving ? 'Saving...' : 'Save Monthly Data'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
