import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, FileSpreadsheet, Plus, Columns3 } from "lucide-react";
import * as XLSX from "xlsx";
import { fetchAllLitigationData } from "../api";
import { useLitigationListStore as useStore } from "../store/caseListStore";
import {getSessionOrganisationId ,getCurrentUserId} from "../../../utils/authSession";


const BASE_PATH = "/legal/court-cases";
const PAGE_SIZE = 10;
const ACTIVE_STATUSES = ["Case Initiated", "Counter Affidavit Filed", "Hearing started", "Interim order Passed", "No Status"];

const COLUMNS = [
  { key: "organisation_name", label: "Organisation Name", orgOnly: true },
  { key: "case_id", label: "Case ID" },
  { key: "cnr_number", label: "CNR Number" },
  { key: "case_number", label: "Case Number" },
  { key: "domain", label: "Domain", hiddenByDefault: true },
  { key: "sub_domain", label: "Sub Domain", hiddenByDefault: true },
  { key: "caseType", label: "Case Type", hiddenByDefault: true },
  { key: "created_date", label: "Created Date", date: true, hiddenByDefault: true },
  { key: "updated_date", label: "Updated Date", date: true, hiddenByDefault: true },
  { key: "stage", label: "Case Status", badge: true },
];

const isDisposed = (r) => (r.stage || "").toLowerCase().trim() === "judgment finalized";
const stageText = (r) => r.stage || "No status";

const sanitizeCell = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return ["=", "+", "-", "@"].some((t) => s.trim().startsWith(t)) ? `'${s}` : s;
};

export default function LitigationList() {
  const navigate = useNavigate();
  const userID = getCurrentUserId();
  const { roleID, organisationID } = getSessionOrganisationId();

  const showOrg = ![6, 7].includes(roleID);        
  const showOrgFilter = [1, 2, 3, 4, 5].includes(roleID);
  const canAdd = ![2, 3, 4, 5, 8].includes(roleID);
  const canDelete = roleID !== 8;

  const rows = useStore((s) => s.rows);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.tab);
  const org = useStore((s) => s.org);
  const status = useStore((s) => s.status);
  const search = useStore((s) => s.query);
  const page = useStore((s) => s.page);
  const hidden = useStore((s) => s.hidden);
  const {
    setTab: setView, setOrg, setStatus, setQuery: setSearch, setPage, toggleColumn, load, deleteCase,
  } = useStore.getState();
  const [colMenu, setColMenu] = useState(false);

  useEffect(() => { load(roleID, organisationID); }, [load, roleID, organisationID]);

  const orgOptions = useMemo(
    () => [...new Set(rows.map((r) => r.organisation_name).filter(Boolean))].sort(),
    [rows]
  );

  const visibleCols = COLUMNS.filter((c) => !hidden.includes(c.key) && (showOrg || !c.orgOnly));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (view === "active" ? isDisposed(r) : !isDisposed(r)) return false;
      if (org && r.organisation_name !== org) return false;
      if (view === "active" && status && stageText(r).toLowerCase() !== status.toLowerCase()) return false;
      if (q && !COLUMNS.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, view, org, status, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (row) => {
    if (!window.confirm("Deleting the record will also delete the data stored. Are you sure you want to delete?")) return;
    const ok = await deleteCase(row.case_id, row.created_by);
    if (!ok) alert("Delete failed. Please try again later.");
  };

  const exportAll = async () => {
    try {
      const res = await fetchAllLitigationData(userID);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : data?.data || [];
      const sheet = XLSX.utils.json_to_sheet(
        list.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, sanitizeCell(v)])))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Litigation Court Case list");
      const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
      XLSX.writeFile(wb, `Litigation Court Case list ${stamp}.xlsx`);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed.");
    }
  };

  const cell = (r, c) => {
    const v = r[c.key];
    if (c.date) return v ? String(v).slice(0, 10) : "--";
    if (c.badge)
      return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white ${r.stage_id >= 1 ? "bg-blue-600" : "bg-sky-500"}`}>
          {stageText(r)}
        </span>
      );
    return v || "--";
  };

  const toggleBtn = (mode, label) => (
    <button type="button" onClick={() => { setView(mode); setStatus(""); }}
      className={`px-4 py-2 text-sm font-semibold border border-blue-600 first:rounded-l-lg last:rounded-r-lg
        ${view === mode ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex">{toggleBtn("active", "Active Cases")}{toggleBtn("completed", "Disposed Cases")}</div>
        {/* {canAdd && (
          <button type="button" onClick={() => navigate(`${BASE_PATH}/input-form/litigation`)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
            <Plus size={16} /> Add Case
          </button>
        )} */}
      </div>

      {/* filters */}
      <div className="grid gap-4 rounded-lg border border-blue-900/40 p-4 md:grid-cols-3">
        {showOrgFilter && (
          <label className="text-sm font-medium">Organisation
            <select value={org} onChange={(e) => setOrg(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2">
              <option value="">Show All</option>
              {orgOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm font-medium">Case Status
          {view === "active" ? (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2">
              <option value="">Show All</option>
              {ACTIVE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <select disabled className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2">
              <option>Judgment Finalized</option>
            </select>
          )}
        </label>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={exportAll}
          className="flex items-center gap-2 rounded-lg border border-green-700 bg-white px-3 py-2 text-sm text-green-800 hover:bg-green-700 hover:text-white">
          All Litigation Data <FileSpreadsheet size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setColMenu((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <Columns3 size={16} /> Columns
            </button>
            {colMenu && (
              <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border bg-white p-2 shadow-lg">
                {COLUMNS.filter((c) => showOrg || !c.orgOnly).map((c) => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <input type="checkbox" checked={!hidden.includes(c.key)}
                      onChange={() => toggleColumn(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* table */}
      {loading ? <p className="text-slate-500">Loading...</p>
        : error ? <p className="text-red-600">{error}</p>
        : (
        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-[#28408f] text-white">
              <tr>
                <th className="px-3 py-3 text-center w-16">S.No</th>
                {visibleCols.map((c) => <th key={c.key} className="px-3 py-3 text-center">{c.label}</th>)}
                <th className="px-3 py-3 text-center w-32">Update</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={visibleCols.length + 2} className="px-4 py-8 text-center text-slate-400">No cases found.</td></tr>
              )}
              {pageRows.map((r, i) => (
                <tr key={r.case_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 text-center">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  {visibleCols.map((c) => <td key={c.key} className="px-3 py-3 text-center">{cell(r, c)}</td>)}
                  <td className="px-3 py-3">
                    <div className="flex justify-center gap-2">
                      <button type="button" title="Edit"
                        onClick={() => navigate(`${BASE_PATH}/input-form/litigation?edit=${encodeURIComponent(r.case_id)}`)}
                        className="rounded-md bg-amber-500 p-2 text-white hover:bg-amber-600"><Pencil size={14} /></button>
                      {canDelete && (
                        <button type="button" title="Delete" onClick={() => handleDelete(r)}
                          className="rounded-md bg-red-600 p-2 text-white hover:bg-red-700"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-600">
            <span>{filtered.length} case(s)</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
              <span>Page {page} of {pages}</span>
              <button type="button" disabled={page === pages} onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}