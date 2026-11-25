import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil, Trash2, Search, Filter, ChevronDown, Copy, Check, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useNotifier, toastSuccess, toastError } from "../../../utils/notify";
import ConfirmModal from "../../../components/ConfirmModal";
import { exportExcel, exportPdf } from "./exportHelpers";
import { fetchAllLitigationData } from "../api";
import { useLitigationListStore as useStore } from "../store/caseListStore";
import {getSessionOrganisationId,
  getCurrentUserId,
  getSessionClaims, } from "../../../utils/authSession";

const BASE_PATH = "/legal/court-cases";
const ROW_OPTIONS = [10, 25, 50, 100];
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
  { key: "updated_date", label: "Updated Date", date: true },
  { key: "stage", label: "Case Status", badge: true },
];

// the store hides "updated_date" by default; show it the first time this page opens in a session
let updatedDateShown = false;

const isDisposed = (r) => (r.stage || "").toLowerCase().trim() === "judgment finalized";
const stageText = (r) => r.stage || "No status";

const sanitizeCell = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return ["=", "+", "-", "@"].some((t) => s.trim().startsWith(t)) ? `'${s}` : s;
};

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const menuBtn =
  "flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50";

export default function LitigationList({ triggerNotification }) {
  const navigate = useNavigate();
  const notifier = useNotifier(triggerNotification);
  const notify = (type, message, title) => {
    try {
      if (typeof triggerNotification === "function") {
        return notifier(type === "success" ? toastSuccess(title, message) : toastError(title, message));
      }
    } catch (err) {
      console.error("notifier failed:", err);
    }
    alert(`${title}: ${message}`);
  };
  const claims = getSessionClaims();

  const userID = getCurrentUserId();

  const roleID = Number(claims?.roleId ?? claims?.role_id);

  const organisationID = getSessionOrganisationId();

  const showOrg = ![6, 7].includes(roleID);
  const showOrgFilter = [1, 2, 3, 4, 5].includes(roleID);
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

  const [pageSize, setPageSize] = useState(10);
  const [menu, setMenu] = useState(null); // "cols" | "export" | null
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(roleID) || !Number.isFinite(organisationID)) {
      console.error("Missing Role ID or Organisation ID", {
        roleID,
        organisationID,
      });
      return;
    }

    load(roleID, organisationID);
  }, [load, roleID, organisationID]);

  useEffect(() => {
    if (updatedDateShown) return;
    updatedDateShown = true;
    if (useStore.getState().hidden.includes("updated_date")) toggleColumn("updated_date");
  }, [toggleColumn]);

  useEffect(() => {
    const h = (e) => barRef.current && !barRef.current.contains(e.target) && setMenu(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages, setPage]);

  const [pendingDelete, setPendingDelete] = useState(null); // the row
  const [deleting, setDeleting] = useState(false);
  const handleDelete = (row) => setPendingDelete(row);
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const ok = await deleteCase(pendingDelete.case_id, userID);
      if (!ok) {
        notify("error", `Case ${pendingDelete.case_id} could not be deleted. Please try again.`, "Delete Failed");
      } else {
        notify("success", `Case ${pendingDelete.case_id} and all its related data were deleted.`, "Case Deleted");
        setPendingDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const stamp = () => new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");

  // downloads ALL litigation data from the API (separate button, top row)
  const exportAll = async () => {
    setMenu(null);
    setExportingAll(true);
    try {
      const res = await fetchAllLitigationData(userID);
      const data = res?.data ?? res;
      const raw = Array.isArray(data) ? data : data?.data || [];

      // safety net: one row per case
      const unique = [...new Map(raw.map((r) => [r["Case ID"], r])).values()];

      // list total = Active + Disposed litigation cases
      const expected = rows.filter((r) => String(r.case_id || "").startsWith("LI")).length;
      if (expected && unique.length !== expected) {
        console.warn(`Export has ${unique.length} rows but the list has ${expected}`);
      }

      const sheet = XLSX.utils.json_to_sheet(
        unique.map((r, i) => ({
          ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, sanitizeCell(v)])),
          "S No": i + 1,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Litigation Court Case list");
      XLSX.writeFile(wb, `Litigation Court Case list ${stamp()}.xlsx`);

      notify("success", `${unique.length} cases exported.`, "Export Complete");
    } catch (e) {
      console.error("Export failed", e);
      notify("error", "Could not export litigation data.", "Export Failed");
    } finally {
      setExportingAll(false);
    }
  };

  // exports exactly what is on screen (filters + visible columns)
  const viewTable = () => ({
    headers: ["S.No", ...visibleCols.map((c) => c.label)],
    rows: filtered.map((r, i) => [
      i + 1,
      ...visibleCols.map((c) => (c.badge ? stageText(r) : c.date ? String(r[c.key] ?? "").slice(0, 10) : r[c.key] ?? "")),
    ]),
    fileName: `Litigation Cases ${view}`,
  });
  const exportView = () => { setMenu(null); exportExcel({ ...viewTable(), sheetName: "Litigation Cases" }); };
  const exportPdfFile = async () => {
    setMenu(null);
    try {
      await exportPdf({ ...viewTable(), title: `Litigation Cases (${view})` });
    } catch (e) {
      console.error("PDF export failed", e);
      alert("PDF export failed.");
    }
  };

  const copyRows = async () => {
    const text = [
      ["S.No", ...visibleCols.map((c) => c.label)].join("\t"),
      ...filtered.map((r, i) =>
        [i + 1, ...visibleCols.map((c) => (c.badge ? stageText(r) : c.date ? String(r[c.key] ?? "").slice(0, 10) : r[c.key] ?? ""))].join("\t")
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Copy failed.");
    }
  };

  const cell = (r, c) => {
    const v = r[c.key];
    if (c.date) return v ? String(v).slice(0, 10) : "--";
    if (c.badge)
      return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${r.stage_id >= 1 ? "bg-blue-600" : "bg-sky-500"}`}>
          {stageText(r)}
        </span>
      );
    return v || "--";
  };

  const toggleBtn = (mode, label) => (
    <button type="button" onClick={() => { setView(mode); setStatus(""); setPage(1); }}
      className={`px-4 py-2 text-sm font-semibold border border-blue-600 first:rounded-l-lg last:rounded-r-lg
        ${view === mode ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}>
      {label}
    </button>
  );

  const filterCount = (org ? 1 : 0) + (status ? 1 : 0);
  const clearFilters = () => { setOrg(""); setStatus(""); setPage(1); };

  return (
    <div className="space-y-4">
      {/* top row: Active/Disposed toggle (left) + All Litigation Data button (right) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex">
          {toggleBtn("active", "Active Cases")}
          {toggleBtn("completed", "Disposed Cases")}
        </div>

        <button
          type="button"
          onClick={exportAll}
          disabled={exportingAll}
          className="flex h-10 items-center gap-2 rounded-lg border border-green-600 bg-green-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
        >
          {exportingAll ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          {exportingAll ? "Preparing..." : "All Litigation Data"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* toolbar */}
        <div ref={barRef} className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3">
          {/* Filters toggle (panel opens below the toolbar) */}
          <button
            type="button"
            onClick={() => setShowFilters((o) => !o)}
            className={`${menuBtn} ${showFilters ? "border-blue-400 bg-blue-50 text-blue-700" : ""}`}
          >
            <Filter size={14} /> Filters
            {filterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{filterCount}</span>
            )}
            <ChevronDown size={14} className={`transition ${showFilters ? "rotate-180" : ""}`} />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..."
                className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-600" />
            </div>

            <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-500">
              Rows:
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none">
                {ROW_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <span className="flex h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-bold uppercase text-slate-600">
              Total: {total}
            </span>

            <div className="relative">
              <button type="button" className={menuBtn} onClick={() => setMenu(menu === "cols" ? null : "cols")}>
                Visibility <ChevronDown size={14} />
              </button>
              {menu === "cols" && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {COLUMNS.filter((c) => showOrg || !c.orgOnly).map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className={menuBtn} onClick={copyRows} disabled={total === 0}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </button>

            <div className="relative">
              <button type="button" onClick={() => setMenu(menu === "export" ? null : "export")}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#1e2f6b] px-4 text-xs font-bold text-white hover:bg-[#16245a]">
                Export <ChevronDown size={14} className={`transition ${menu === "export" ? "rotate-180" : ""}`} />
              </button>
              {menu === "export" && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button type="button" onClick={exportView} disabled={total === 0}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <FileSpreadsheet size={16} className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button type="button" onClick={exportPdfFile} disabled={total === 0}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <FileText size={16} className="text-red-500" /> Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {showOrgFilter && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Organisation</label>
                  <select value={org} onChange={(e) => { setOrg(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600">
                    <option value="">-- All Organisations --</option>
                    {orgOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Case Status</label>
                {view === "active" ? (
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600">
                    <option value="">-- All Statuses --</option>
                    {ACTIVE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <select disabled className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600 bg-slate-100">
                    <option>Judgment Finalized</option>
                  </select>
                )}
              </div>
            </div>
            {filterCount > 0 && (
              <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#28408f] text-white">
                <tr>
                  <th className="w-16 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide">S.No</th>
                  {visibleCols.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide">{c.label}</th>
                  ))}
                  <th className="w-32 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading && (
                  <tr><td colSpan={visibleCols.length + 2} className="py-12 text-center text-slate-400">Loading...</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={visibleCols.length + 2} className="py-12 text-center text-red-600">{error}</td></tr>
                )}
                {!loading && !error && pageRows.length === 0 && (
                  <tr><td colSpan={visibleCols.length + 2} className="py-12 text-center text-slate-400">No cases found.</td></tr>
                )}
                {!loading && !error && pageRows.map((r, i) => (
                  <tr key={r.case_id} className="h-[42px] hover:bg-slate-50">
                    <td className="px-4 py-1.5 text-center text-[12.5px] font-bold text-slate-500">{start + i + 1}</td>
                    {visibleCols.map((c) => (
                      <td key={c.key} className={`px-4 py-1.5 text-center text-[12.5px] ${c.key === "organisation_name" ? "font-bold text-slate-900" : "font-medium"}`}>{cell(r, c)}</td>
                    ))}
                    <td className="px-4 py-1.5">
                      <div className="flex justify-center gap-2">
                        <button type="button" title="Edit"
                          onClick={() => navigate(`${BASE_PATH}/input-form/litigation?edit=${encodeURIComponent(r.case_id)}`)}
                          className="rounded-md bg-amber-500 p-1.5 text-white hover:bg-amber-600"><Pencil size={14} /></button>
                        {canDelete && (
                          <button type="button" title="Delete" onClick={() => handleDelete(r)}
                            className="rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
            <span>
              Showing <b>{total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)}</b> of <b>{total}</b>
            </span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40">
                <ChevronLeft size={14} /> Previous
              </button>
              {pageList(safePage, pages).map((n, i) =>
                n === "…" ? (
                  <span key={`d${i}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <button key={n} type="button" onClick={() => setPage(n)}
                    className={`h-8 w-8 rounded-lg border text-xs font-bold ${
                      n === safePage ? "border-[#1e2f6b] bg-[#1e2f6b] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}>
                    {n}
                  </button>
                )
              )}
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Case"
        message={`Delete case ${pendingDelete?.case_id || ""} and all its stored data? This cannot be undone.`}
        confirmText="Delete"
        loadingText="Deleting..."
      />
    </div>
  );
}