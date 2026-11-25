import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, ChevronDown, Copy, Check, Pencil, Trash2, FileSpreadsheet, FileText, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { BASE_PATH } from "../CourtCases";
import { exportExcel, exportPdf } from "./exportHelpers";

const ROW_OPTIONS = [10, 25, 50, 100];

function getSession() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      userID: u.user_id ?? u.userID,
      roleID: u.role_id ?? u.roleID,
      organisationID: u.organisation_id ?? u.organisationID,
    };
  } catch {
    return {};
  }
}


// 1 2 3 … 9 10  style page list
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

export default function CaseListTable({ useStore, formKey, label = "", showCaseInfo = false }) {
  const navigate = useNavigate();
  const { userID, roleID, organisationID } = getSession();

  const rows = useStore((s) => s.rows);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const tab = useStore((s) => s.tab);
  const stageFilter = useStore((s) => s.status);
  const query = useStore((s) => s.query);
  const page = useStore((s) => s.page);
  const deletingId = useStore((s) => s.deletingId);
  const hidden = useStore((s) => s.hidden);
  const { setTab, setStatus: setStageFilter, setQuery, setPage, toggleColumn, load, deleteCase } =
    useStore.getState();

  const [pageSize, setPageSize] = useState(10);
  const [menu, setMenu] = useState(null); // "cols" | "export" | null
  const [showFilters, setShowFilters] = useState(false);
  const [org, setOrg] = useState("");
  const [copied, setCopied] = useState(false);
  const barRef = useRef(null);

  const columns = useMemo(
    () => [
      { key: "sno", label: "S.No", alwaysOn: true },
      { key: "organisation_name", label: "Organisation Name" },
      { key: "case_id", label: "Case ID" },
      ...(showCaseInfo
        ? [
            { key: "cnr_number", label: "CNR Number" },
            { key: "case_number", label: "Case Number" },
          ]
        : []),
      { key: "stage", label: "Case Status" },
      { key: "update", label: "Update", alwaysOn: true },
    ],
    [showCaseInfo]
  );
  const visibleCols = columns.filter((c) => !hidden.includes(c.key));

  useEffect(() => {
    load(roleID, organisationID);
  }, [load, roleID, organisationID]);

  useEffect(() => {
    const h = (e) => barRef.current && !barRef.current.contains(e.target) && setMenu(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const tabRows = useMemo(
    () => rows.filter((r) => (tab === "disposed" ? Number(r.stage_id) === 7 : Number(r.stage_id) !== 7)),
    [rows, tab]
  );

  const stageOptions = useMemo(
    () => [...new Set(tabRows.map((r) => r.stage).filter(Boolean))].sort(),
    [tabRows]
  );

  const orgOptions = useMemo(
    () => [...new Set(tabRows.map((r) => r.organisation_name).filter(Boolean))].sort(),
    [tabRows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabRows.filter((r) => {
      if (org && r.organisation_name !== org) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      if (!q) return true;
      return [r.organisation_name, r.case_id, r.cnr_number, r.case_number, r.stage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [tabRows, stageFilter, query, org]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  // keep the stored page valid when filters / page size shrink the list
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  const openForm = (caseId) =>
    navigate(`${BASE_PATH}/input-form/${formKey}?caseId=${encodeURIComponent(caseId)}`);

  const handleDelete = async (caseId) => {
    if (!window.confirm(`Delete case ${caseId} and all related data? This cannot be undone.`)) return;
    const ok = await deleteCase(caseId, userID);
    if (!ok) alert("Failed to delete the case.");
  };

  const dataCols = columns.filter((c) => c.key !== "sno" && c.key !== "update");

  // export exactly what is on screen: filtered rows + visible columns
  const exportTable = () => {
    const cols = dataCols.filter((c) => !hidden.includes(c.key));
    return {
      headers: ["S.No", ...cols.map((c) => c.label)],
      rows: filtered.map((r, i) => [i + 1, ...cols.map((c) => r[c.key] ?? "")]),
      fileName: `${label || formKey} Cases ${tab}`,
    };
  };
  const exportXlsx = () => { setMenu(null); exportExcel({ ...exportTable(), sheetName: "Cases" }); };
  const exportPdfFile = async () => {
    setMenu(null);
    try {
      await exportPdf({ ...exportTable(), title: `${label || formKey} Cases (${tab})` });
    } catch (e) {
      console.error("PDF export failed", e);
      alert("PDF export failed.");
    }
  };

  const copyRows = async () => {
    const cols = dataCols.filter((c) => !hidden.includes(c.key));
    const text = [
      ["S.No", ...cols.map((c) => c.label)].join("\t"),
      ...filtered.map((r, i) => [i + 1, ...cols.map((c) => r[c.key] ?? "")].join("\t")),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Copy failed.");
    }
  };

  const renderCell = (col, r, idx) => {
    switch (col.key) {
      case "sno":
        return start + idx + 1;
      case "stage":
        return r.stage ? (
          <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
            {r.stage}
          </span>
        ) : (
          "-"
        );
      case "update":
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              title="Edit"
              onClick={() => openForm(r.case_id)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500 text-white hover:bg-orange-600"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              title="Delete"
              disabled={deletingId === r.case_id}
              onClick={() => handleDelete(r.case_id)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deletingId === r.case_id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </div>
        );
      default:
        return r[col.key] || "-";
    }
  };

  const filterCount = (stageFilter ? 1 : 0) + (org ? 1 : 0);
  const clearFilters = () => { setOrg(""); setStageFilter(""); setPage(1); };

  return (
    <div>
      {/* Active / Disposed toggle */}
      <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-blue-600">
        {[
          { key: "active", label: "Active Cases" },
          { key: "disposed", label: "Disposed Cases" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setStageFilter("");
              setOrg("");
              setPage(1);
            }}
            className={`px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* toolbar */}
        <div ref={barRef} className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
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
            {/* search */}
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search..."
                className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-600"
              />
            </div>

            {/* rows */}
            <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-500">
              Rows:
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
              >
                {ROW_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            {/* total */}
            <span className="flex h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-bold uppercase text-slate-600">
              Total: {total}
            </span>

            {/* visibility */}
            <div className="relative">
              <button type="button" className={menuBtn} onClick={() => setMenu(menu === "cols" ? null : "cols")}>
                Visibility <ChevronDown size={14} />
              </button>
              {menu === "cols" && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {columns.filter((c) => !c.alwaysOn).map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* copy */}
            <button type="button" className={menuBtn} onClick={copyRows} disabled={total === 0}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </button>

            {/* export */}
            <div className="relative">
              <button
                type="button"
                disabled={total === 0}
                onClick={() => setMenu(menu === "export" ? null : "export")}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#1e2f6b] px-4 text-xs font-bold text-white hover:bg-[#16245a] disabled:opacity-50"
              >
                Export <ChevronDown size={14} className={`transition ${menu === "export" ? "rotate-180" : ""}`} />
              </button>
              {menu === "export" && (
                <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button type="button" onClick={exportXlsx} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <FileSpreadsheet size={16} className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button type="button" onClick={exportPdfFile} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <FileText size={16} className="text-red-500" /> Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Organisation</label>
                <select value={org} onChange={(e) => { setOrg(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600">
                  <option value="">-- All Organisations --</option>
                  {orgOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Case Status</label>
                <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600">
                  <option value="">-- All Statuses --</option>
                  {stageOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
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
              <thead>
                <tr className="bg-[#28408f] text-white">
                  {visibleCols.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-bold uppercase">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading && (
                  <tr>
                    <td colSpan={visibleCols.length} className="py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto animate-spin" size={22} />
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={visibleCols.length} className="py-12 text-center text-red-500">
                      {error}{" "}
                      <button className="font-bold underline" onClick={() => load(roleID, organisationID)}>
                        Retry
                      </button>
                    </td>
                  </tr>
                )}

                {!loading && !error && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={visibleCols.length} className="py-12 text-center text-slate-400">
                      No cases found.
                    </td>
                  </tr>
                )}

                {!loading && !error && pageRows.map((r, i) => (
                  <tr key={r.case_id} className="hover:bg-slate-50">
                    {visibleCols.map((c) => (
                      <td key={c.key} className="px-4 py-3.5 text-center font-medium">
                        {renderCell(c, r, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
            <span>
              Showing{" "}
              <b>{total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)}</b> of <b>{total}</b>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              {pageList(safePage, totalPages).map((n, i) =>
                n === "…" ? (
                  <span key={`d${i}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-8 w-8 rounded-lg border text-xs font-bold ${
                      n === safePage
                        ? "border-[#1e2f6b] bg-[#1e2f6b] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}