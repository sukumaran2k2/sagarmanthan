import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp } from "lucide-react";
import { BASE_PATH } from "../CourtCases";
import { REPORTS } from "./reports.config";
import "./reports.css";

export default function ReportsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REPORTS.filter((r) => !r.hidden).filter(
      (r) => !q || `${r.code} ${r.title}`.toLowerCase().includes(q)
    );
  }, [query]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const open = (id) => navigate(`${BASE_PATH}/reports/${id}`);

  return (
    <div className="rpt">
      <div className="rpt-card">
        <div className="rpt-banner">
          <div className="rpt-eyebrow"><TrendingUp size={14} /> Court Case Reports</div>
          <h1 className="rpt-title">Reports</h1>
          <p className="rpt-sub"></p>
        </div>

        <div className="rpt-panel">
          <div className="rpt-toolbar">
            <div className="rpt-toolbar-title">
              <div className="rpt-eyebrow"><TrendingUp size={14} /> Report list</div>
              <h3>All Court Case Reports</h3>
            </div>
            <div className="rpt-controls">
              <label className="rpt-search">
                <Search size={16} />
                <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search reports..." />
              </label>
              <span className="text-sm font-semibold" style={{ color: "var(--rpt-muted)" }}>Rows</span>
              <select className="rpt-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Report No.</th>
                  <th>Report Name</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={2} style={{ textAlign: "center", padding: 32, color: "var(--rpt-muted)" }}>No reports found.</td></tr>
                )}
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td className="rpt-code">{r.code || "-"}</td>
                    <td>
                      <button type="button" className="rpt-link" onClick={() => open(r.id)}>{r.title}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rpt-footer">
            <span>
              {rows.length === 0 ? "Showing 0 of 0" : `Showing ${start + 1}–${start + pageRows.length} of ${rows.length}`}
            </span>
            <div className="rpt-pager">
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
              <button type="button" className="cur">{current}</button>
              <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}