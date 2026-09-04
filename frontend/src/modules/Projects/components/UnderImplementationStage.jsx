import { useState } from 'react';

const DEFAULT_MILESTONES = [
  { id: 1, milestone: 'Milestone 0 (<20%)', targetedEndDate: '', actualEndDate: '' },
  { id: 2, milestone: 'Milestone 1 (>=20% and <40%)', targetedEndDate: '', actualEndDate: '' },
  { id: 3, milestone: 'Milestone 2 (>=40% and <60%)', targetedEndDate: '', actualEndDate: '' },
  { id: 4, milestone: 'Milestone 3 (>=60% and <80%)', targetedEndDate: '', actualEndDate: '' },
  { id: 5, milestone: 'Milestone 4 (>=80% and <100%)', targetedEndDate: '', actualEndDate: '' },
  { id: 6, milestone: 'Final Milestone (Completion Report =100%)', targetedEndDate: '', actualEndDate: '' },
];

const COMPONENT_FIELDS = [
  'GBS Components (In Cr.)',
  'IEBR Components (In Cr.)',
  'PPP-Private Components (In Cr.)',
  'Loans Components (In Cr.)',
  'Multilateral Funding Components (In Cr.)',
  'State Govt. Fund Components (In Cr.)',
  'PMMSY Components (In Cr.)',
  'Sagarmala Components (In Cr.)',
  'Other Components (In Cr.)',
];

export default function UnderImplementationStage({ canSubmit, readOnly, onSubmitStage }) {
  const [progressDate, setProgressDate] = useState('');
  const [progressValue, setProgressValue] = useState('0');
  const [delayReason, setDelayReason] = useState('');
  const [inauguration, setInauguration] = useState('');
  const [inaugurationDate, setInaugurationDate] = useState('');
  const [tentativeInaugurationDate, setTentativeInaugurationDate] = useState('');
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [components, setComponents] = useState(() =>
    COMPONENT_FIELDS.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
  );

  const disabled = !canSubmit || readOnly;

  const updateMilestone = (id, patch) => {
    setMilestones((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-2xl p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress as on</label>
            <input type="date" value={progressDate} disabled={disabled} onChange={(e) => setProgressDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress (%)</label>
            <input type="number" min="0" max="100" value={progressValue} disabled={disabled} onChange={(e) => setProgressValue(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 bg-blue-50">Edit</button>
            <button type="button" disabled className="px-3 py-2 text-xs font-bold rounded-lg border border-rose-200 text-rose-700 bg-rose-50">Cancel</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-[#0f417a] text-white">
            <tr>
              <th className="text-left px-3 py-2.5">Milestone</th>
              <th className="text-left px-3 py-2.5">Targeted End Date</th>
              <th className="text-left px-3 py-2.5">Actual End Date</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2.5 font-semibold text-slate-800">{row.milestone}</td>
                <td className="px-3 py-2.5"><input type="date" value={row.targetedEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { targetedEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                <td className="px-3 py-2.5"><input type="date" value={row.actualEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { actualEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Reasons for Delay (if any)</label>
          <input type="text" value={delayReason} disabled={disabled} onChange={(e) => setDelayReason(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700">Whether the Project is Inaugurated?</p>
          <div className="flex gap-6 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2"><input type="radio" value="yes" checked={inauguration === 'yes'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> Yes</label>
            <label className="inline-flex items-center gap-2"><input type="radio" value="no" checked={inauguration === 'no'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> No</label>
          </div>
          {inauguration === 'yes' && <input type="date" value={inaugurationDate} disabled={disabled} onChange={(e) => setInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />}
          {inauguration === 'no' && <input type="date" value={tentativeInaugurationDate} disabled={disabled} onChange={(e) => setTentativeInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />}
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0f417a] uppercase">Expenditure Logs</h3>
          <button type="button" disabled className="px-3 py-1.5 text-xs font-bold border border-blue-200 rounded-lg text-blue-700 bg-blue-50">View Expenditure Log</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
            <select value={financialYear} disabled={disabled} onChange={(e) => setFinancialYear(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <option value="">--Select Financial Year--</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
            <select value={month} disabled={disabled} onChange={(e) => setMonth(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <option value="">--Select Month--</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMPONENT_FIELDS.map((field) => (
            <div key={field}>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{field}</label>
              <input
                type="number"
                value={components[field]}
                disabled={disabled}
                onChange={(e) => setComponents((prev) => ({ ...prev, [field]: e.target.value }))}
                className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmitStage?.('implementation', { progressDate, progressValue, milestones, delayReason, inauguration, inaugurationDate, tentativeInaugurationDate, financialYear, month, components })}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Under Implementation
        </button>
      </div>
    </div>
  );
}
