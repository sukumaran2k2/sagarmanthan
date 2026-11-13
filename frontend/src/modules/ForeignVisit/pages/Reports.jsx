import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Download, Loader2, RotateCcw, ChevronDown } from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import {
  fetchForeignVisitReport,
  fetchOfficerNames,
  downloadForeignVisitDocument,
} from '../api';
import { useFvStore } from '../store/useFvStore';
import { YEAR_OPTIONS, formatDisplayDate } from '../utils/constants';
import { useNotifier } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

/** Columns the grid should not show: the primary key is only there to key the rows. */
const HIDDEN_COLUMNS = new Set(['id']);

/** Columns whose value is a stored file name rather than text. */
const FILE_COLUMNS = new Set(['Tour File', 'Sanctioned Report']);

const DATE_COLUMNS = new Set(['From Date', 'To Date']);

/**
 * Every filter is sent as 0 when unset. The controller tests each one with `!== 0`, so sending
 * '' or null would be read as a real value and the report would come back empty.
 */
const UNSET = 0;

const emptyFilters = {
  year: '',
  officerName: '',
  visitType: '',
  fromDate: '',
  toDate: '',
  keywords: '',
  status: '',
  organisation: '',
  country: '',
  designation: '',
};

export default function Reports({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);

  const organisations = useFvStore((s) => s.organisations);
  const designations = useFvStore((s) => s.designations);
  const visitTypes = useFvStore((s) => s.visitTypes);
  const stages = useFvStore((s) => s.stages);
  const countries = useFvStore((s) => s.countries);

  const [filters, setFilters] = useState(emptyFilters);
  const [officers, setOfficers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Ten filters is a lot of vertical space above the grid, so the panel starts closed and the
  // report opens showing its rows.
  const [showFilterPanel, setShowFilterPanel] = useState(false);


  // Officer names come from the visits already recorded, so the filter can only offer names
  // that will actually match something.
  useEffect(() => {
    let cancelled = false;
    fetchOfficerNames()
      .then((res) => {
        if (cancelled) return;
        const names = (Array.isArray(res.data) ? res.data : [])
          .map((r) => String(r.name || '').trim())
          .filter(Boolean);
        setOfficers([...new Set(names)].sort());
      })
      .catch((err) => console.error('Foreign Visit: officer list failed', err));
    return () => { cancelled = true; };
  }, []);

  const set = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDownload = useCallback(async (fileName) => {
    if (!fileName) return;
    try {
      const res = await downloadForeignVisitDocument(fileName);
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Foreign Visit: download failed', err);
      notify(FV_TOASTS.downloadFailed(err));
    }
  }, [notify]);

  /**
   * Runs the report for the filters passed in, rather than for whatever is in state.
   *
   * Reset needs this: calling setFilters then runReport would send the filters from before the
   * reset, because the state update has not been applied yet when the request goes out.
   */
  const runReportWith = useCallback(async (f) => {
    setLoading(true);
    try {
      const res = await fetchForeignVisitReport({
        year: f.year || UNSET,
        fromDate: f.fromDate || UNSET,
        toDate: f.toDate || UNSET,
        officerName: f.officerName || UNSET,
        // The server names this `visit` but matches it against visit_type.
        visit: f.visitType || UNSET,
        status: f.status || UNSET,
        organisation: f.organisation || UNSET,
        country: f.country || UNSET,
        designation: f.designation || UNSET,
      });

      setColumns(res.data?.columnDefs || []);
      setRows(res.data?.rowData || []);
    } catch (err) {
      // The endpoint answers 404 rather than an empty array when nothing matches, so that is a
      // normal outcome here, not a failure.
      if (err?.response?.status === 404) {
        setColumns([]);
        setRows([]);
        notify(FV_TOASTS.reportEmpty());
      } else {
        console.error('Foreign Visit: report failed', err);
        notify(FV_TOASTS.reportFailed(err));
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const runReport = useCallback(() => runReportWith(filters), [runReportWith, filters]);

  useEffect(() => { runReportWith(emptyFilters); /* initial, unfiltered run */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Clears the filters and reloads, so the grid matches the empty filter panel. */
  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
    runReportWith(emptyFilters);
  }, [runReportWith]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => String(v).trim() !== '').length,
    [filters]
  );

  /** Keywords is not a server filter, so it is applied to Purpose/Keywords here. */
  const viewRows = useMemo(() => {
    const term = filters.keywords.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => String(r['Purpose/Keywords'] ?? '').toLowerCase().includes(term));
  }, [rows, filters.keywords]);

  const columnDefs = useMemo(() => {
    if (!columns.length) return [];
    return columns
      .filter((col) => !HIDDEN_COLUMNS.has(col.field))
      .map((col) => {
        const base = {
          headerName: col.headerName,
          field: col.field,
          minWidth: 140,
          wrapText: true,
          autoHeight: true,
          valueFormatter: (p) => (p.value == null || p.value === '' ? '--' : p.value),
        };

        if (DATE_COLUMNS.has(col.field)) {
          return {
            ...base,
            width: 140,
            valueGetter: (p) => formatDisplayDate(p.data?.[col.field]) || '--',
          };
        }

        if (FILE_COLUMNS.has(col.field)) {
          return {
            ...base,
            width: 220,
            cellRenderer: (p) => {
              if (!p.value) return <span className="text-slate-400">--</span>;
              return (
                <button type="button" onClick={() => handleDownload(p.value)}
                  className="module-report-tag inline-flex items-center gap-1 text-[11px] underline decoration-dotted underline-offset-2 hover:decoration-solid break-all cursor-pointer"
                  title={`Download ${p.value}`}>
                  <Download className="h-3 w-3 flex-shrink-0" />
                  <span className="break-all">{p.value}</span>
                </button>
              );
            },
          };
        }

        if (col.field === 'Purpose/Keywords') return { ...base, width: 340, minWidth: 260 };
        if (col.field === 'Name of the Officer') return { ...base, width: 200 };
        if (col.field === 'Organisation') return { ...base, width: 230 };

        return { ...base, width: 160 };
      });
  }, [columns, handleDownload]);

  // The toggle lives in the report toolbar; the panel itself is simply not rendered when closed,
  // which is how the other modules' report filters behave.
  const toolbarExtra = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowFilterPanel((open) => !open)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold border transition cursor-pointer ${
          showFilterPanel || activeFilterCount > 0
            ? 'bg-[#f7f3f3] border-[#4b2424] text-[#4b2424] dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
        aria-expanded={showFilterPanel}
      >
        <Filter size={14} className="text-[#4b2424] dark:text-amber-400" />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="bg-[#4b2424] dark:bg-amber-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
      </button>

      {/* Reachable while the panel is closed, so filters can be cleared without reopening it. */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-[9px] border border-rose-200 dark:border-rose-900 transition cursor-pointer disabled:opacity-60"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );

  const filterPanel = showFilterPanel ? (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <Field label="Year">
          <select value={filters.year} onChange={set('year')} className="module-form-select cursor-pointer">
            <option value="">Show All</option>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>

        <Field label="Name of the Officer">
          <select value={filters.officerName} onChange={set('officerName')} className="module-form-select cursor-pointer">
            <option value="">Show All</option>
            {officers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>

        <Field label="Visit Type">
          <select value={filters.visitType} onChange={set('visitType')} className="module-form-select cursor-pointer">
            <option value="">Show All</option>
            {visitTypes.map((t) => <option key={t.Id} value={t.Id}>{t.visit_type_name}</option>)}
          </select>
        </Field>

        <Field label="From Date">
          <input type="date" value={filters.fromDate} onChange={set('fromDate')} className="module-form-input" />
        </Field>

        <Field label="To Date">
          <input type="date" value={filters.toDate} onChange={set('toDate')}
            min={filters.fromDate || undefined} className="module-form-input" />
        </Field>

        <Field label="Keywords">
          <input type="text" value={filters.keywords} onChange={set('keywords')}
            placeholder="Search a word in the purpose" className="module-form-input" />
        </Field>

        <Field label="Tour Status">
          <select value={filters.status} onChange={set('status')} className="module-form-select cursor-pointer">
            <option value="">Show All</option>
            {stages.map((s) => (
              <option key={s.fv_stage_id} value={s.fv_stage_name}>{s.fv_stage_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Organisation">
          <select value={filters.organisation} onChange={set('organisation')} className="module-form-select cursor-pointer">
            <option value="">Show All Organisations</option>
            {organisations.map((o) => (
              <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Country">
          <select value={filters.country} onChange={set('country')} className="module-form-select cursor-pointer">
            <option value="">Show All</option>
            {countries.map((c) => <option key={c.id} value={c.country}>{c.country}</option>)}
          </select>
        </Field>

        <Field label="Designation">
          <select value={filters.designation} onChange={set('designation')} className="module-form-select cursor-pointer">
            <option value="">Select Designation</option>
            {designations.map((d) => <option key={d.id} value={d.id}>{d.designation}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Nothing re-runs on change -- the server is only called when this is pressed. */}
        <button type="button" onClick={runReport} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#4b2424] hover:bg-[#6b3535] text-white transition cursor-pointer disabled:opacity-60">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
          <span>{loading ? 'Running…' : 'Apply Filters'}</span>
        </button>

        <button type="button" onClick={() => setShowFilterPanel(false)} disabled={loading}
          className="module-report-control-pill !py-2.5 !px-3.5 !rounded-xl hover:opacity-80 transition cursor-pointer disabled:opacity-60">
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          <span>Hide Filters</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <ReportTable
      title="Form No.: P.1.1 - Tour Details"
      subtitle={`As On date: ${formatDisplayDate(new Date().toISOString())}`}
      eyebrow="Official Foreign Visit"
      rowData={viewRows}
      viewData={viewRows}
      rawData={viewRows}
      columnDefs={columnDefs}
      loading={loading}
      onRefresh={runReport}
      triggerNotification={triggerNotification}
      filterPanel={filterPanel}
      toolbarExtra={toolbarExtra}
      totalLabel="Total Rows"
      pagination
      autoHeaderHeight
      reportExport
      // Classic brown report theme, same as every other module's Reports page. The CSS
      // variables carry the dark-mode steps; the hex values are the light-mode fallback.
      themeClass="yp-pro-grid"
      brandColor="var(--module-report-brand-color, #4b2424)"
      brandColorHover="var(--module-report-brand-color-hover, #6b3535)"
      accentColor="var(--module-report-accent-color, #f7f3f3)"
      oddRowColor="var(--module-report-odd-row-bg, #f8faf6)"
    />
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="module-report-tag text-[10px] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
