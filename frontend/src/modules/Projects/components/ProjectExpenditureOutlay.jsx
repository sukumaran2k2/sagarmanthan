import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { fetchExpenditureOutlay, submitExpenditureOutlay } from '../api';

const FY_OPTIONS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
  '2028-2029',
];

function emptyRow() {
  return { financialYear: '', expenditureOutlayValue: '' };
}

export default function ProjectExpenditureOutlay({
  projectID,
  subProjectID,
  canSubmit = false,
  readOnly = false,
  notify,
}) {
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const disabled = !canSubmit || readOnly;

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchExpenditureOutlay(projectID, subProjectID);
        const data = Array.isArray(res?.data) ? res.data : [];
        if (!mounted) return;
        if (data.length) {
          setRows(
            data.map((row) => ({
              financialYear: String(row.year || row.financial_year || ''),
              expenditureOutlayValue: String(row.expenditure_outlay ?? ''),
            }))
          );
        } else {
          setRows([emptyRow()]);
        }
      } catch (error) {
        console.error(error);
        notify?.('Failed to load expenditure outlay.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, notify]);

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index) => {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, idx) => idx !== index)));
  };

  const handleSave = async () => {
    if (disabled || !projectID) return;

    const validRows = rows.filter(
      (row) => String(row.financialYear || '').trim() && String(row.expenditureOutlayValue || '').trim()
    );

    if (!validRows.length) {
      notify?.('Add at least one year and outlay value.', 'error');
      return;
    }

    for (const row of validRows) {
      if (Number(row.expenditureOutlayValue) <= 0) {
        notify?.('Target expenditure value should be greater than 0.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      for (const row of validRows) {
        await submitExpenditureOutlay({
          projectID,
          subProjectID,
          financialYear: row.financialYear,
          expenditureOutlayValue: row.expenditureOutlayValue,
        });
      }
      notify?.('Expenditure outlay saved successfully.', 'success');
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to save expenditure outlay.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">
          Target Expenditure Outlay
        </h3>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Year
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading outlay...</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={`outlay-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Financial Year
                </label>
                <select
                  value={row.financialYear}
                  onChange={(e) => updateRow(index, { financialYear: e.target.value })}
                  disabled={disabled}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select year</option>
                  {FY_OPTIONS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Outlay (₹ Cr)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.expenditureOutlayValue}
                  onChange={(e) => updateRow(index, { expenditureOutlayValue: e.target.value })}
                  disabled={disabled}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="p-2 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                title="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60"
        >
          {saving ? 'Saving Outlay...' : 'Save Expenditure Outlay'}
        </button>
      </div>
    </div>
  );
}

