import { useState } from 'react';

const DEFAULT_TENDER_ROWS = [
  'Tech. Sanction obtained',
  'Tender Document approved',
  'Tender Notice Issued',
  'Technical Evaluation completed',
  'Financial Evaluation completed',
  'Sanction of Competent Authority obtained for Award',
  'Work Awarded / LOA Issued',
  'Contract Agreement Signed',
].map((label, index) => ({
  id: index + 1,
  label,
  plannedDate: '',
  revisedDate: '',
  actualDate: '',
  notApplicable: false,
  hasCost: label === 'Tech. Sanction obtained' || label === 'Work Awarded / LOA Issued',
  cost: '',
}));

export default function UnderTenderingStage({ canSubmit, readOnly, onSubmitStage }) {
  const [onNominationBasisAwarded, setOnNominationBasisAwarded] = useState('0');
  const [numberOfTenderCalls, setNumberOfTenderCalls] = useState('');
  const [rows, setRows] = useState(DEFAULT_TENDER_ROWS);
  const [foundationLaid, setFoundationLaid] = useState('');
  const [foundationLaidDate, setFoundationLaidDate] = useState('');
  const [foundationTentativeDate, setFoundationTentativeDate] = useState('');

  const disabled = !canSubmit || readOnly;

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-800">Is the project awarded on nomination basis?</p>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="1" checked={onNominationBasisAwarded === '1'} disabled={disabled} onChange={(e) => setOnNominationBasisAwarded(e.target.value)} /> Yes
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="0" checked={onNominationBasisAwarded === '0'} disabled={disabled} onChange={(e) => setOnNominationBasisAwarded(e.target.value)} /> No
            </label>
          </div>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <label className="block text-xs font-bold text-slate-800 mb-2">Number of Tender Calls till Date</label>
          <input
            type="number"
            value={numberOfTenderCalls}
            onChange={(e) => setNumberOfTenderCalls(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-[#0f417a] text-white">
            <tr>
              <th className="text-left px-3 py-2.5">Stage</th>
              <th className="text-left px-3 py-2.5">Targeted Completion Date</th>
              <th className="text-left px-3 py-2.5">Revised Date</th>
              <th className="text-center px-3 py-2.5">Revise</th>
              <th className="text-center px-3 py-2.5">History</th>
              <th className="text-left px-3 py-2.5">Actual Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3 min-w-[240px]">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  <label className="inline-flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-semibold">
                    <input
                      type="checkbox"
                      checked={row.notApplicable}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.id, { notApplicable: e.target.checked })}
                    />
                    (Not Applicable)
                  </label>
                  {row.hasCost && (
                    <div className="mt-2 max-w-[220px]">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cost (In Cr)</label>
                      <input
                        type="number"
                        value={row.cost}
                        onChange={(e) => updateRow(row.id, { cost: e.target.value })}
                        disabled={disabled}
                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-3"><input type="date" value={row.plannedDate} disabled={disabled} onChange={(e) => updateRow(row.id, { plannedDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                <td className="px-3 py-3"><input type="date" value={row.revisedDate} disabled className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-100" /></td>
                <td className="px-3 py-3 text-center"><button type="button" disabled className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">Revise</button></td>
                <td className="px-3 py-3 text-center"><button type="button" disabled className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">History</button></td>
                <td className="px-3 py-3"><input type="date" value={row.actualDate} disabled={disabled || row.notApplicable} onChange={(e) => updateRow(row.id, { actualDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
        <p className="text-xs font-bold text-slate-800">Whether project foundation is laid?</p>
        <div className="flex gap-6 text-xs font-semibold text-slate-700">
          <label className="inline-flex items-center gap-2"><input type="radio" value="yes" checked={foundationLaid === 'yes'} disabled={disabled} onChange={(e) => setFoundationLaid(e.target.value)} /> Yes</label>
          <label className="inline-flex items-center gap-2"><input type="radio" value="no" checked={foundationLaid === 'no'} disabled={disabled} onChange={(e) => setFoundationLaid(e.target.value)} /> No</label>
        </div>

        {foundationLaid === 'yes' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date of laying of foundation</label>
            <input type="date" value={foundationLaidDate} disabled={disabled} onChange={(e) => setFoundationLaidDate(e.target.value)} className="w-full md:w-72 text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
        )}

        {foundationLaid === 'no' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tentative date of laying of foundation</label>
            <input type="date" value={foundationTentativeDate} disabled={disabled} onChange={(e) => setFoundationTentativeDate(e.target.value)} className="w-full md:w-72 text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmitStage?.('tendering', { onNominationBasisAwarded, numberOfTenderCalls, rows, foundationLaid, foundationLaidDate, foundationTentativeDate })}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Under Tendering
        </button>
      </div>
    </div>
  );
}
