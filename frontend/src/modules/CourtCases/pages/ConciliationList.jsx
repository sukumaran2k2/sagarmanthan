import React, { useState, useEffect } from "react";
import { fetchCourtCases } from "../api";
import { getSessionClaims } from "../../../utils/authSession";

const COLUMNS = [
  { key: "case_id", label: "Case ID" },
  { key: "organisation_name", label: "Organisation" },
  { key: "case_number", label: "Case Number" },
  { key: "domain", label: "Domain" },
  { key: "sub_domain", label: "Sub Domain" },
  { key: "stage", label: "Stage" },
  { key: "updated_date", label: "Last Updated" },
];

export default function ConciliationList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const claims = getSessionClaims();
    if (!claims) { setLoading(false); return; }
    const roleID = claims.roleId || claims.role_id || 0;
    const orgID = claims.organisationId || claims.organisation_id || 0;
    fetchCourtCases(roleID, orgID)
      .then((res) => {
        const all = res.data || [];
        setRows(all.filter((r) => String(r.case_id || "").startsWith("CO")));
      })
      .catch((err) => setError(err.message || "Failed to load conciliation cases"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Conciliation Cases</h2>
        <input
          type="text" placeholder="Search..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm w-64"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No conciliation cases found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-bold uppercase text-xs">S.No</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-left font-bold uppercase text-xs">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((row, i) => (
                <tr key={row.case_id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3">{i + 1}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-4 py-3">{row[c.key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
