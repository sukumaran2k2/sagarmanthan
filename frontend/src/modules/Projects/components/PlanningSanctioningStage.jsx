import { useState } from 'react';

const DEFAULT_ROWS = [
  { key: 'preFeasibility', label: 'Preliminary-Feasibility', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'dpr', label: 'DPR', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'submittedToMinistry', label: 'Submitted to Ministry', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'daConcurrence', label: 'DA concurrence obtained', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'ifwConcurrence', label: 'IFW concurrence obtained', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'imcApproval', label: 'Circulated for IMC - Approval', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'responseComments', label: 'Response to Comments Received', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'approvedSfc', label: 'Approved by SFC/DIB/EFC/PIB/PPPAC', notApplicable: false, actualDate: '', remarks: '' },
  { key: 'adminApproval', label: 'Admn. Approval / Estimate Sanction by Competent Authority', notApplicable: false, actualDate: '', remarks: '', sanctionedCost: '' },
  { key: 'chairmanApproval', label: 'Chairman Board Approval', notApplicable: false, actualDate: '', remarks: '', sanctionedCost: '' },
];

export default function PlanningSanctioningStage({ canSubmit, readOnly, onSubmitStage }) {
  const [rows, setRows] = useState(DEFAULT_ROWS);

  const disabled = !canSubmit || readOnly;

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const submit = () => {
    onSubmitStage?.('planning', { rows });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs font-semibold text-amber-900">
        Project stage details are structured as in legacy planning/sanctioning flow.
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-[#0f417a] text-white">
            <tr>
              <th className="text-left px-3 py-2.5">Stages</th>
              <th className="text-left px-3 py-2.5">Actual Date</th>
              <th className="text-left px-3 py-2.5">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  <label className="inline-flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-semibold">
                    <input
                      type="checkbox"
                      checked={row.notApplicable}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { notApplicable: e.target.checked })}
                    />
                    (Not Applicable)
                  </label>
                  {'sanctionedCost' in row && (
                    <div className="mt-2 max-w-[240px]">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Sanctioned Cost (In Cr)</label>
                      <input
                        type="number"
                        value={row.sanctionedCost || ''}
                        onChange={(e) => updateRow(row.key, { sanctionedCost: e.target.value })}
                        disabled={disabled}
                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 min-w-[170px]">
                  <input
                    type="date"
                    value={row.actualDate}
                    onChange={(e) => updateRow(row.key, { actualDate: e.target.value })}
                    disabled={disabled || row.notApplicable}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </td>
                <td className="px-3 py-3 min-w-[220px]">
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={row.remarks}
                    onChange={(e) => updateRow(row.key, { remarks: e.target.value })}
                    disabled={disabled}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Planning & Sanctioning
        </button>
      </div>
    </div>
  );
}
