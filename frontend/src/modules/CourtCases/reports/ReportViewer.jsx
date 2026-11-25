import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft, FileSpreadsheet, FileText, Loader2,
  Search, Copy, RefreshCw, ChevronDown, Eye,TrendingUp
} from "lucide-react";
import { BASE_PATH } from "../CourtCases";
import { getDropDownData } from "../api";
import { getCurrentUserId } from "../../../utils/authSession";
import { getErrorMessage } from "../../../utils/notify";
import { getReport, STAGE_OPTIONS } from "./reports.config";
import "./reports.css";
import * as XLSX from "xlsx";
import { getReportAccess, canView } from "./reportAccess";

const HIDE = new Set(["DivisionID", "WingID", "organisation_id", "Court Case Id"]);
const isSNo = (s) => /^s\.?\s?no$/i.test(String(s || "").trim());

const getUserId = () => {
  const u = getCurrentUserId();
  return u && typeof u === "object" ? u.userID ?? u.user_id ?? u.userId : u;
};

const leafFields = (defs) =>
  defs.flatMap((c) => (c.children ? leafFields(c.children) : c.field ? [c.field] : []));

// sums every numeric column of the rows currently shown
function calcTotals(rows, fields, cfg) {
  const t = {};
  fields.forEach((f) => {
    if (f === cfg.labelField) { t[f] = "Total"; return; }
    if (HIDE.has(f) || isSNo(f)) return;
    const vals = rows.map((r) => r[f]).filter((v) => v !== null && v !== undefined && v !== "");
    if (vals.length && vals.every((v) => !isNaN(Number(v)))) t[f] = vals.reduce((s, v) => s + Number(v), 0);
  });
  return t;
}

// hides id columns, pins S.No, turns drill-down columns into links (recursive for grouped headers)
function decorate(defs, drill, go) {
  return defs.map((c) => {
    if (c.children) return { ...c, children: decorate(c.children, drill, go) };
    const d = { ...c };
    if (HIDE.has(d.field)) d.hide = true;
    if (isSNo(d.headerName)) { d.width = 70; d.minWidth = 70; d.flex = 0; d.pinned = "left"; }
    if (drill?.[d.field]) {
      d.cellRenderer = (p) => {
        if (p.node.rowPinned || p.value === null || p.value === undefined || p.value === "") return p.value ?? "";
        return (
          <button type="button" className="text-blue-600 underline"
            onClick={() => go(drill[p.colDef.field], p.data)}>
            {p.value}
          </button>
        );
      };
    }
    return d;
  });
}

// reports whose API does not send an S.No column get one added automatically
const SNO_COL = {
  headerName: "S.No",
  colId: "__sno",
  width: 70, minWidth: 70, maxWidth: 90, flex: 0,
  pinned: "left",
  sortable: false, filter: false, suppressMovable: true,
  valueGetter: (p) => (p.node?.rowPinned || p.node?.rowIndex == null ? "" : p.node.rowIndex + 1),
};
const hasSNo = (defs) =>
  defs.some((c) => (c.children ? hasSNo(c.children) : isSNo(c.headerName)));

// gives the first data column (organisation / domain name) more room so names do not wrap
function widenFirst(defs) {
  let done = false;
  const walk = (cols) =>
    cols.map((c) => {
      if (done) return c;
      if (c.children) return { ...c, children: walk(c.children) };
      if (c.hide || isSNo(c.headerName)) return c;
      done = true;
      return { ...c, minWidth: 230 };
    });
  return walk(defs);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ").replace(/:/g, "-");

// builds grouped, merged header rows for the Excel file
function buildHeader(defs, skip) {
  const visible = (c) =>
    c.children ? c.children.some(visible) : !!c.field && !skip(c);

  const depthOf = (cols) =>
    cols.filter(visible).reduce((d, c) => Math.max(d, c.children ? 1 + depthOf(c.children) : 1), 0);

  const depth = Math.max(1, depthOf(defs));
  const rows = Array.from({ length: depth }, () => ({}));
  const merges = [];
  const leaves = [];
  let col = 1; // column 0 is S.No

  const walk = (cols, d) => {
    cols.filter(visible).forEach((c) => {
      if (c.children) {
        const start = col;
        walk(c.children, d + 1);
        rows[d][start] = c.headerName ?? "";
        if (col - 1 > start) merges.push({ s: { r: d, c: start }, e: { r: d, c: col - 1 } });
      } else {
        rows[d][col] = c.headerName ?? c.field;
        if (depth - 1 > d) merges.push({ s: { r: d, c: col }, e: { r: depth - 1, c: col } });
        leaves.push(c);
        col++;
      }
    });
  };
  walk(defs, 0);

  rows[0][0] = "S.No";
  if (depth > 1) merges.push({ s: { r: 0, c: 0 }, e: { r: depth - 1, c: 0 } });

  const total = col;
  const matrix = rows.map((r) => Array.from({ length: total }, (_, i) => r[i] ?? ""));
  return { matrix, merges, leaves };
}

export default function ReportViewer() {
  const { reportId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const report = getReport(reportId);
  const access = useMemo(() => getReportAccess(), []);

  const gridApi = useRef(null);
  const filterRef = useRef("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [hiddenCols, setHiddenCols] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [menu, setMenu] = useState("");    
  const [state, setState] = useState({ loading: true, error: "", columnDefs: [], rowData: [] });
  const [orgOptions, setOrgOptions] = useState([]);
  const [filter, setFilter] = useState("");
  const [pinned, setPinned] = useState([]);

  const [pg, setPg] = useState({ page: 0, pages: 1, total: 0, from: 0, to: 0 });

  const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  /* ---- load the report from ITS OWN api ---- */
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    filterRef.current = "";
    setFilter("");
    setPinned([]);
    setSearch("");
    setHiddenCols([]);
    setState({ loading: true, error: "", columnDefs: [], rowData: [] });

    (async () => {
      try {
        const res = await report.load({
          userID: getUserId(),
          organisationID: access.isAdmin ? params.get("organisationID") : access.organisationID,
          stageID: params.get("stage_id"),
        });
        if (cancelled) return;
        const body = res?.data ?? res ?? {};
        let rowData = body.rowData || [];

        // safety net: an organisation user only ever sees their own rows
        if (!access.isAdmin && access.organisationID != null) {
          rowData = rowData.filter(
            (r) => r.organisation_id == null || String(r.organisation_id) === String(access.organisationID)
          );
        }
        setState({ loading: false, error: "", columnDefs: body.columnDefs || [], rowData });
      } catch (e) {
        if (cancelled) return;
        const msg = e?.response?.status === 404
          ? "No data available for this report."
          : getErrorMessage(e) || "The report could not be loaded.";
        setState({ loading: false, error: msg, columnDefs: [], rowData: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [reportId, params.toString(),reloadKey]);

  /* ---- organisation dropdown (only for reports that use it) ---- */
  useEffect(() => {
    if (report?.filter?.kind !== "organisation") return;
    getDropDownData("mmt_organisation")
      .then((res) => setOrgOptions(res?.data ?? res ?? []))
      .catch(() => setOrgOptions([]));
  }, [reportId]);

  const go = useCallback((target, row) => {
    const q = new URLSearchParams({
      organisationID: row.organisation_id,
      OrganisationName: row["Organisation Name"] ?? "",
      stage_id: target.stage,
    });
    navigate(`${BASE_PATH}/reports/${target.to}?${q}`);
  }, [navigate]);

  const columnDefs = useMemo(() => {
    if (!state.columnDefs.length) return [];
    const decorated = widenFirst(decorate(state.columnDefs, report?.drill, go));
    return hasSNo(state.columnDefs) ? decorated : [SNO_COL, ...decorated];
  }, [state.columnDefs, report, go]);
  const fields = useMemo(() => leafFields(state.columnDefs), [state.columnDefs]);

  const refreshTotals = useCallback(() => {
    if (!report?.totals || !gridApi.current) return;
    const rows = [];
    gridApi.current.forEachNodeAfterFilter((n) => n.data && rows.push(n.data));
    setPinned(rows.length ? [calcTotals(rows, fields, report.totals)] : []);
  }, [report, fields]);

  /* ---- external dropdown filter ---- */
  const isExternalFilterPresent = useCallback(() => !!filterRef.current, []);
  const doesExternalFilterPass = useCallback(
    (node) => !node.data || String(node.data[report?.filter?.field]) === String(filterRef.current),
    [report]
  );
  const onFilterChange = (v) => {
    filterRef.current = v;
    setFilter(v);
    gridApi.current?.onFilterChanged();
  };

  const leafDefs = (defs) =>
  defs.flatMap((c) => (c.children ? leafDefs(c.children) : c.field ? [c] : []));

const toggleCol = (field) => {
  const hide = !hiddenCols.includes(field);
  setHiddenCols((h) => (hide ? [...h, field] : h.filter((x) => x !== field)));
  gridApi.current?.setColumnsVisible([field], !hide);
};

const copyTable = async () => {
  const api = gridApi.current;
  if (!api) return;
  const cols = api.getAllDisplayedColumns().filter((c) => c.getColDef().field);
  const lines = [["S.No", ...cols.filter((c) => !isSNo(c.getColDef().headerName)).map((c) => c.getColDef().headerName ?? c.getColDef().field)].join("\t")];
  const dataCols = cols.filter((c) => !isSNo(c.getColDef().headerName));
  let n = 1;
  api.forEachNodeAfterFilterAndSort(
    (node) => node.data && lines.push([n++, ...dataCols.map((c) => node.data[c.getColDef().field] ?? "")].join("\t"))
  );
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
  } catch (e) {
    console.warn("Copy failed", e);
  }
};
const syncPaging = () => {
  const api = gridApi.current;
  if (!api) return;
  const size = api.paginationGetPageSize();
  const page = api.paginationGetCurrentPage();
  const total = api.paginationGetRowCount();
  setPg({
    page,
    pages: Math.max(1, api.paginationGetTotalPages()),
    total,
    from: total ? page * size + 1 : 0,
    to: Math.min(total, (page + 1) * size),
  });
};

const goPage = (n) => gridApi.current?.paginationGoToPage(n);

// up to 5 page numbers around the current page
const pageNumbers = () => {
  const start = Math.max(0, Math.min(pg.page - 2, pg.pages - 5));
  const end = Math.min(pg.pages, start + 5);
  return Array.from({ length: end - start }, (_, i) => start + i);
};

  /* ---- exports ---- */
const exportExcel = () => {
  const api = gridApi.current;
  if (!api) return;

  const skip = (c) =>
    HIDE.has(c.field) || hiddenCols.includes(c.field) || isSNo(c.headerName);
  const { matrix, merges, leaves } = buildHeader(state.columnDefs, skip);

  const body = [];
  let n = 1;
  api.forEachNodeAfterFilterAndSort((node) => {
    if (node.data) body.push([n++, ...leaves.map((c) => node.data[c.field] ?? "")]);
  });
  if (pinned[0]) body.push(["", ...leaves.map((c) => pinned[0][c.field] ?? "")]);
  if (!body.length) return;

  const ws = XLSX.utils.aoa_to_sheet([...matrix, ...body]);
  ws["!merges"] = merges;
  ws["!cols"] = matrix[0].map((_, i) => ({ wch: i === 0 ? 8 : i === 1 ? 32 : 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (report.code || "Report").slice(0, 31));
  XLSX.writeFile(wb, `${report.code || report.id} ${stamp()}.xlsx`);
};

  const exportPdf = () => {
    const api = gridApi.current;
    const cols = api.getAllDisplayedColumns().filter((c) => !isSNo(c.getColDef().headerName));
    const head = [["S.No", ...cols.map((c) => c.getColDef().headerName ?? c.getColDef().field)]];
    const body = [];
    let n = 1;
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) body.push([n++, ...cols.map((c) => node.data[c.getColDef().field] ?? "")]);
    });
    if (pinned[0]) body.push(["", ...cols.map((c) => pinned[0][c.getColDef().field] ?? "")]);
    if (!body.length) return;

    const doc = new jsPDF("landscape", "pt", "a2");
    doc.setFontSize(18);
    doc.text(`${report.title} | As on Date: ${today}`, doc.internal.pageSize.getWidth() / 2, 30, { align: "center" });
    autoTable(doc, {
      head, body, startY: 60, theme: "grid",
      styles: { fontSize: 8, halign: "center", valign: "middle", cellPadding: 4 },
      headStyles: { fillColor: [27, 77, 137], textColor: 255, fontStyle: "bold" },
    });
    doc.save(`${report.code || report.id} ${stamp()}.pdf`);
  };

  if (!report || !canView(report, access)) {
  return (
    <div className="p-6">
      <p className="text-red-600">Report not found or you do not have access.</p>
      <Link to={`${BASE_PATH}/reports`} className="text-blue-600 underline">Back to reports</Link>
    </div>
  );
}
    const f = report.filter;
  // go back in history when the user came from inside the app (list or CC01 drill-down);
  // if the page was opened directly / reloaded there is no history, so fall back to a fixed route
  const goBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(report.hidden ? `${BASE_PATH}/reports/overview` : `${BASE_PATH}/reports`, { replace: true });
    }
  };
  const fullTitle = `${report.code ? `Report No. ${report.code} - ` : ""}${report.title}`;

  return (
    <div className="rpt rpt-list" onClick={() => setMenu("")}>
      <div className="rpt-card">
        <div className="rpt-banner">
          <div className="rpt-banner-top">
            <div className="rpt-eyebrow"><TrendingUp size={14} /> Court Case Reports</div>
            <button type="button" className="rpt-btn" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <h1 className="rpt-title">{fullTitle}</h1>
          <p className="rpt-sub">
            As on date: <b>{today}</b><span className="rpt-dot">·</span>Report for the month — <b>{month}</b>
          </p>
        </div>

        <div className="rpt-panel" onClick={(e) => e.stopPropagation()}>
          <div className="rpt-toolbar">
            <div className="rpt-toolbar-title">
              <div className="rpt-eyebrow">
                <TrendingUp size={14} /> {report.code ? `Report No.: ${report.code}` : "Court Case Report"}
              </div>
              <h3>{fullTitle}</h3>
            </div>

            <div className="rpt-controls">
              <label className="rpt-search">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..." />
              </label>

              <span className="text-sm font-semibold" style={{ color: "var(--rpt-muted)" }}>Rows</span>
              <select className="rpt-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>

              <div className="relative">
                <button type="button" className="rpt-btn" onClick={() => setMenu(menu === "vis" ? "" : "vis")}>
                  <Eye size={16} /> Visibility <ChevronDown size={14} />
                </button>
                {menu === "vis" && (
                  <div className="rpt-menu">
                    {leafDefs(state.columnDefs).filter((c) => !HIDE.has(c.field)).map((c) => (
                      <label key={c.field}>
                        <input type="checkbox" checked={!hiddenCols.includes(c.field)} onChange={() => toggleCol(c.field)} />
                        {c.headerName || c.field}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className="rpt-btn" onClick={copyTable} disabled={state.loading || !!state.error}>
                <Copy size={16} /> Copy
              </button>

              <div className="relative">
                <button type="button" className="rpt-btn primary" disabled={state.loading || !!state.error}
                  onClick={() => setMenu(menu === "exp" ? "" : "exp")}>
                  Export <ChevronDown size={14} />
                </button>
                {menu === "exp" && (
                  <div className="rpt-menu">
                    <button type="button" onClick={() => { exportExcel(); setMenu(""); }}><FileSpreadsheet size={16} /> Excel</button>
                    <button type="button" onClick={() => { exportPdf(); setMenu(""); }}><FileText size={16} /> PDF</button>
                  </div>
                )}
              </div>

              <button type="button" className="rpt-btn" onClick={() => setReloadKey((k) => k + 1)} title="Refresh">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {f && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold" style={{ color: "var(--rpt-muted)" }}>{f.label}</label>
              <select className="rpt-select w-full max-w-md" value={filter} onChange={(e) => onFilterChange(e.target.value)}>
                <option value="">Show All</option>
                {f.kind === "organisation"
                  ? orgOptions.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)
                  : STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {state.loading && <div className="py-16 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" /></div>}
          {!state.loading && state.error && <p className="py-12 text-center text-red-500">{state.error}</p>}

          {!state.loading && !state.error && (
  <>
    <div className="ag-theme-quartz report-grid" style={{ width: "100%" }}>
      <AgGridReact
        domLayout="autoHeight"
        rowHeight={42}
        headerHeight={40}
        groupHeaderHeight={36}
        columnDefs={columnDefs}
        rowData={state.rowData}
        pinnedBottomRowData={pinned}
        quickFilterText={search}
        pagination
        paginationPageSize={pageSize}
        paginationPageSizeSelector={false}
        suppressPaginationPanel
        defaultColDef={{
          sortable: true, filter: true, wrapText: true,
          wrapHeaderText: true, autoHeaderHeight: true,
          flex: 1, minWidth: 110, cellStyle: { textAlign: "center" },
        }}
        getRowStyle={(p) => (p.node.rowPinned ? { fontWeight: "bold" } : undefined)}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        onGridReady={(p) => { gridApi.current = p.api; refreshTotals(); syncPaging(); }}
        onFilterChanged={refreshTotals}
        onPaginationChanged={syncPaging}
      />
    </div>

    <div className="rpt-footer">
      <span>
        {pg.total === 0
          ? "Showing 0 of 0"
          : <>Showing <b>{pg.from}–{pg.to}</b> of <b>{pg.total}</b></>}
      </span>
      <div className="rpt-pager">
        <button type="button" disabled={pg.page <= 0} onClick={() => goPage(pg.page - 1)}>‹ Previous</button>
        {pageNumbers().map((i) => (
          <button key={i} type="button" className={i === pg.page ? "cur" : ""} onClick={() => goPage(i)}>
            {i + 1}
          </button>
        ))}
        <button type="button" disabled={pg.page >= pg.pages - 1} onClick={() => goPage(pg.page + 1)}>Next ›</button>
      </div>
    </div>
  </>
)}
        </div>
      </div>
    </div>
  );
}