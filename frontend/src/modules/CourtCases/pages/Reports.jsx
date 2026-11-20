import React, { useEffect } from "react";
import { getCurrentUserId } from "../../../utils/authSession";
import { useReportStore } from "../store/reportStore";

export default function CourtCaseReports() {
  const data = useReportStore((s) => s.data);
  const loading = useReportStore((s) => s.loading);
  const error = useReportStore((s) => s.error);
  const load = useReportStore((s) => s.load);

  useEffect(() => {
    load(getCurrentUserId());
  }, [load]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!data || !data.rowData || data.rowData.length === 0) {
    return <div className="text-center py-12 text-slate-400">No report data available.</div>;
  }

  const { columnDefs, rowData } = data;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Court Case Report — Organisation Summary</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              {columnDefs.map((col) => (
                <th key={col.field} className="px-4 py-3 text-left font-bold uppercase text-xs whitespace-nowrap">
                  {col.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rowData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                {columnDefs.map((col) => (
                  <td key={col.field} className="px-4 py-3 whitespace-nowrap">
                    {row[col.field] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}