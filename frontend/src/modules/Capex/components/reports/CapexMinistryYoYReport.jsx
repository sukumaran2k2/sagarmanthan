import { Info } from 'lucide-react';

const SAMPLE_ROWS = [
  {
    sno: 1,
    organisation: 'Sample Port Authority A',
    fy1: { be: 100, exp: 74.16 },
    fy2: { be: 120, exp: 90.5 },
  },
  {
    sno: 2,
    organisation: 'Sample Port Authority B',
    fy1: { be: 80, exp: 40 },
    fy2: { be: 95, exp: 110 },
  },
];

function pct(exp, be) {
  if (!be) return '0.00';
  return ((exp / be) * 100).toFixed(2);
}

export default function CapexMinistryYoYReport() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black text-[#4b2424] uppercase tracking-wide">
          Organisation-wise Year-on-Year CAPEX Performance
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Compare Budget Estimate, Actual Expenditure and % of BE Achieved across two FYs.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          UI placeholder only. Live YoY data binding will be added later. Sample layout shown.
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#4b2424] text-white text-center uppercase tracking-wider">
              <th rowSpan={2} className="p-3 border border-[#6b3535]">
                S.No
              </th>
              <th rowSpan={2} className="p-3 border border-[#6b3535] text-left">
                Name of the Organization
              </th>
              <th colSpan={3} className="p-3 border border-[#6b3535]">
                FY 2022-2023
              </th>
              <th colSpan={3} className="p-3 border border-[#6b3535]">
                FY 2023-2024
              </th>
            </tr>
            <tr className="bg-[#163a66] text-white text-center text-[11px]">
              <th className="p-2 border border-[#6b3535]">Budget Estimate</th>
              <th className="p-2 border border-[#6b3535]">Actual Expenditure</th>
              <th className="p-2 border border-[#6b3535] bg-slate-600">% of BE Achieved</th>
              <th className="p-2 border border-[#6b3535]">Budget Estimate</th>
              <th className="p-2 border border-[#6b3535]">Actual Expenditure</th>
              <th className="p-2 border border-[#6b3535] bg-slate-600">% of BE Achieved</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row) => (
              <tr key={row.sno} className="text-center border-b border-slate-100">
                <td className="p-2.5 border border-slate-100 font-semibold text-slate-600">
                  {row.sno}
                </td>
                <td className="p-2.5 border border-slate-100 text-left font-bold text-slate-800">
                  {row.organisation}
                </td>
                <td className="p-2.5 border border-slate-100">{row.fy1.be.toFixed(2)}</td>
                <td className="p-2.5 border border-slate-100">{row.fy1.exp.toFixed(2)}</td>
                <td className="p-2.5 border border-slate-100 font-black text-[#4b2424] bg-slate-50">
                  {pct(row.fy1.exp, row.fy1.be)}
                </td>
                <td className="p-2.5 border border-slate-100">{row.fy2.be.toFixed(2)}</td>
                <td className="p-2.5 border border-slate-100">{row.fy2.exp.toFixed(2)}</td>
                <td className="p-2.5 border border-slate-100 font-black text-[#4b2424] bg-slate-50">
                  {pct(row.fy2.exp, row.fy2.be)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
