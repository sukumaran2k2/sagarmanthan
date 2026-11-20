import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Columns3, FileSpreadsheet, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { BASE_PATH } from "../CourtCases";

const PAGE_SIZE = 10;

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

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

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
  const { setTab, setStatus: setStageFilter, setQuery, setPage, toggleColumn, load, deleteCase } = useStore.getState();
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef(null);

  const columns = useMemo(
    () => [
      { key: "sno", label: "S.No", align: "left", alwaysOn: true },
      { key: "organisation_name", label: "Organisation Name", align: "center" },
      { key: "case_id", label: "Case ID", align: "center" },
      ...(showCaseInfo
        ? [
            { key: "cnr_number", label: "CNR Number", align: "center" },
            { key: "case_number", label: "Case Number", align: "center" },
          ]
        : []),
      { key: "stage", label: "Case Status", align: "center" },
      { key: "update", label: "Update", align: "center", alwaysOn: true },
    ],
    [showCaseInfo]
  );
  const visibleCols = columns.filter((c) => !hidden.includes(c.key));

  useEffect(() => {
    load(roleID, organisationID);
  }, [load, roleID, organisationID]);

  useEffect(() => {
    const h = (e) => colsRef.current && !colsRef.current.contains(e.target) && setColsOpen(false);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabRows.filter((r) => {
      if (stageFilter && r.stage !== stageFilter) return false;
      if (!q) return true;
      return [r.organisation_name, r.case_id, r.cnr_number, r.case_number, r.stage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [tabRows, stageFilter, query]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openForm = (caseId) =>
    navigate(`${BASE_PATH}/input-form/${formKey}?caseId=${encodeURIComponent(caseId)}`);

  const handleDelete = async (caseId) => {
    if (!window.confirm(`Delete case ${caseId} and all related data? This cannot be undone.`)) return;
    const ok = await deleteCase(caseId, userID);
    if (!ok) alert("Failed to delete the case.");
  };

  const exportCsv = () => {
    const cols = columns.filter((c) => c.key !== "sno" && c.key !== "update");
    const head = ["S.No", ...cols.map((c) => c.label)].map(csvCell).join(",");
    const body = filtered.map((r, i) => [i + 1, ...cols.map((c) => r[c.key] ?? "")].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${label.toLowerCase()}-cases-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const renderCell = (col, r, idx) => {
    switch (col.key) {
      case "sno":
        return (page - 1) * PAGE_SIZE + idx + 1;
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

  return (
    <div>
      {/* Active / Disposed toggle */}
      <div className="mb-5 inline-flex overflow-hidden rounded-lg border border-blue-600">
        {[
          { key: "active", label: "Active Cases" },
          { key: "disposed", label: "Disposed Cases" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Case status filter */}
      <div className="mb-5 rounded-xl border border-blue-300 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Case Status</label>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
        >
          <option value="">Show All</option>
          {stageOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* actions row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-lg border border-green-700 bg-white px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          All {label} Data <FileSpreadsheet size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative" ref={colsRef}>
            <button
              type="button"
              onClick={() => setColsOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Columns3 size={16} /> Columns
            </button>
            {colsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {columns
                  .filter((c) => !c.alwaysOn)
                  .map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={!hidden.includes(c.key)}
                        onChange={() => toggleColumn(c.key)}
                      />
                      {c.label}
                    </label>
                  ))}
              </div>
            )}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2b3f8c] text-white">
                {visibleCols.map((c) => (
                  <th
                    key={c.key}
                    className={`whitespace-nowrap px-6 py-4 font-bold ${c.align === "center" ? "text-center" : "text-left"}`}
                  >
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
                    {error} <button className="font-bold underline" onClick={load}>Retry</button>
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

              {!loading &&
                !error &&
                pageRows.map((r, i) => (
                  <tr key={r.case_id} className="hover:bg-slate-50">
                    {visibleCols.map((c) => (
                      <td
                        key={c.key}
                        className={`px-6 py-4 ${c.align === "center" ? "text-center" : "text-left"}`}
                      >
                        {renderCell(c, r, i)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-500">
          <span>
            {filtered.length} case{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}