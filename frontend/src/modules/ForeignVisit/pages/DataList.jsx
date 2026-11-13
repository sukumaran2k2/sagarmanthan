import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Edit, ChevronDown, Filter, Plus, Download, FileWarning } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchForeignVisits } from '../api';
import { downloadVisitDocument } from '../utils/downloadDocument';
import { useFvStore } from '../store/useFvStore';
import { LIST_TABS, STAGE_NAMES } from '../utils/constants';
import { getCurrentUserId, getSessionOrganisationId } from '../../../utils/authSession';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

/** The designation master has an "Others" row; those records carry the real text separately. */
const designationOf = (row) => row.other_designation?.trim() || row.designation || '--';
const visitTypeOf = (row) => row.other_visit_type?.trim() || row.visit_type_name || '--';

export default function DataList({ onEdit, onAdd, triggerNotification, canEdit, canAdd }) {
  const notify = useNotifier(triggerNotification);

  const activeTab = useFvStore((s) => s.activeTab);
  const setActiveTab = useFvStore((s) => s.setActiveTab);
  const searchTerm = useFvStore((s) => s.searchTerm);
  const setSearchTerm = useFvStore((s) => s.setSearchTerm);
  const selectedOrganisation = useFvStore((s) => s.selectedOrganisation);
  const setSelectedOrganisation = useFvStore((s) => s.setSelectedOrganisation);
  const selectedStage = useFvStore((s) => s.selectedStage);
  const setSelectedStage = useFvStore((s) => s.setSelectedStage);
  const selectedVisitType = useFvStore((s) => s.selectedVisitType);
  const setSelectedVisitType = useFvStore((s) => s.setSelectedVisitType);
  const selectedYear = useFvStore((s) => s.selectedYear);
  const setSelectedYear = useFvStore((s) => s.setSelectedYear);
  const showFilterPanel = useFvStore((s) => s.showFilterPanel);
  const toggleFilterPanel = useFvStore((s) => s.toggleFilterPanel);
  const resetFilters = useFvStore((s) => s.resetFilters);
  const pageSize = useFvStore((s) => s.pageSize);
  const setPageSize = useFvStore((s) => s.setPageSize);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const userId = getCurrentUserId();
  const organisationId = getSessionOrganisationId() || 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchForeignVisits(userId, organisationId)
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Foreign Visit: list load failed', err);
        setLoadError('The foreign visit list could not be loaded.');
        notify(FV_TOASTS.loadFailed('foreign visit list', err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // notify is stable for a given triggerNotification
  }, [userId, organisationId, notify]);

  /** Rows for the selected stage tab, before the field filters. */
  const tabRows = useMemo(() => {
    const tab = LIST_TABS.find((t) => t.id === activeTab) || LIST_TABS[0];
    return rows.filter((r) => tab.stages.includes(Number(r.visit)));
  }, [rows, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    LIST_TABS.forEach((tab) => {
      counts[tab.id] = rows.filter((r) => tab.stages.includes(Number(r.visit))).length;
    });
    return counts;
  }, [rows]);

  // Filter options come from the rows on the current tab, so a filter can never select nothing.
  const organisationOptions = useMemo(
    () => [...new Set(tabRows.map((r) => r.organisation_name).filter(Boolean))].sort(),
    [tabRows]
  );
  const stageOptions = useMemo(
    () => [...new Set(tabRows.map((r) => r.fv_stage_name).filter(Boolean))].sort(),
    [tabRows]
  );
  const visitTypeOptions = useMemo(
    () => [...new Set(tabRows.map((r) => visitTypeOf(r)).filter((v) => v && v !== '--'))].sort(),
    [tabRows]
  );
  const yearOptions = useMemo(
    () => [...new Set(tabRows.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a),
    [tabRows]
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tabRows.filter((r) => {
      if (selectedOrganisation !== 'All' && r.organisation_name !== selectedOrganisation) return false;
      if (selectedStage !== 'All' && r.fv_stage_name !== selectedStage) return false;
      if (selectedVisitType !== 'All' && visitTypeOf(r) !== selectedVisitType) return false;
      if (selectedYear !== 'All' && String(r.year) !== String(selectedYear)) return false;
      if (!term) return true;
      return [r.fv_id, r.name, r.organisation_name, r.purpose, designationOf(r), visitTypeOf(r)]
        .some((v) => String(v ?? '').toLowerCase().includes(term));
    });
  }, [tabRows, searchTerm, selectedOrganisation, selectedStage, selectedVisitType, selectedYear]);

  const activeFiltersCount = [selectedOrganisation, selectedStage, selectedVisitType, selectedYear]
    .filter((v) => v !== 'All').length;

  const handleDownload = useCallback(async (fileName) => {
    try {
      await downloadVisitDocument(fileName);
    } catch (err) {
      console.error('Foreign Visit: download failed', err);
      notify(FV_TOASTS.downloadFailed(err));
    }
  }, [notify]);

  const exportRows = useMemo(
    () => filteredData.map((r, i) => ({
      'S.No': i + 1,
      'FV ID': r.fv_id || '',
      'Officer Name': r.name || '',
      Organisation: r.organisation_name || '',
      'Stage of Visit': r.fv_stage_name || '',
      'No. of Days': r.duration ?? '',
      'Year of Visit': r.year ?? '',
      Designation: designationOf(r),
      'Visit Type': visitTypeOf(r),
      'Purpose / Keywords': r.purpose || '',
      'Tour Report': r.tour_file_name || 'Not uploaded',
    })),
    [filteredData]
  );

  const exportHeaders = useMemo(
    () => (exportRows.length ? Object.keys(exportRows[0]) : []),
    [exportRows]
  );

  const handleCopy = useCallback(async () => {
    if (!exportRows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
    const text = [
      exportHeaders.join('\t'),
      ...exportRows.map((row) => exportHeaders.map((h) => String(row[h] ?? '')).join('\t')),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify(COMMON_TOASTS.copySuccess(exportRows.length, 'from the current filter'));
    } catch {
      notify(COMMON_TOASTS.copyFailed());
    }
  }, [exportRows, exportHeaders, notify]);

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 80, minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true,
      cellClass: 'text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 font-mono border-r border-slate-100 dark:border-slate-800',
    },
    {
      headerName: 'FV ID', field: 'fv_id',
      width: 120, minWidth: 110,
      cellClass: 'text-center flex items-center justify-center font-bold text-[#0f417a] dark:text-blue-400 font-mono border-r border-slate-100 dark:border-slate-800',
    },
    {
      headerName: 'Officer Name', field: 'name',
      width: 220, minWidth: 180, wrapText: true, autoHeight: true,
      cellClass: 'flex items-center font-semibold text-slate-800 dark:text-slate-100 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
    },
    {
      headerName: 'Organisation', field: 'organisation_name',
      width: 230, minWidth: 190, wrapText: true, autoHeight: true,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
      valueFormatter: (p) => p.value || '--',
    },
    {
      headerName: 'Stage of Visit', field: 'fv_stage_name',
      width: 190, minWidth: 160,
      cellClass: 'text-center flex items-center justify-center font-bold border-r border-slate-100 dark:border-slate-800',
      cellRenderer: (p) => {
        const stage = Number(p.data?.visit);
        const tone =
          stage === 3 ? 'text-emerald-600 dark:text-emerald-400'
            : stage === 5 ? 'text-rose-600 dark:text-rose-400'
              : stage === 4 ? 'text-amber-600 dark:text-amber-400'
                : 'text-[#0f417a] dark:text-blue-400';
        return <span className={tone}>{p.value || STAGE_NAMES[stage] || '--'}</span>;
      },
    },
    {
      headerName: 'No. of Days', field: 'duration',
      width: 120, minWidth: 110,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      valueFormatter: (p) => (p.value ?? '--'),
    },
    {
      headerName: 'Year of Visit', field: 'year',
      width: 120, minWidth: 110,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      valueFormatter: (p) => (p.value ?? '--'),
    },
    {
      headerName: 'Designation', colId: 'designation',
      width: 190, minWidth: 160, wrapText: true, autoHeight: true,
      valueGetter: (p) => designationOf(p.data),
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
    },
    {
      headerName: 'Visit Type', colId: 'visitType',
      width: 170, minWidth: 140, wrapText: true, autoHeight: true,
      valueGetter: (p) => visitTypeOf(p.data),
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
    },
    {
      headerName: 'Purpose / Keywords', field: 'purpose',
      width: 320, minWidth: 260, wrapText: true, autoHeight: true,
      cellClass: 'flex items-center text-slate-600 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 font-medium whitespace-normal leading-relaxed',
      valueFormatter: (p) => p.value || '--',
    },
    {
      headerName: 'Tour Report', field: 'tour_file_name',
      width: 210, minWidth: 170, wrapText: true, autoHeight: true,
      cellClass: 'text-center flex items-center justify-center py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
      cellRenderer: (p) => {
        if (!p.value) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <FileWarning className="h-3 w-3" /> Not uploaded
            </span>
          );
        }
        return (
          <button type="button" onClick={() => handleDownload(p.value)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 underline break-all cursor-pointer"
            title={`Download ${p.value}`}>
            <Download className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{p.value}</span>
          </button>
        );
      },
      valueFormatter: (p) => p.value || 'Not uploaded',
    },
    {
      headerName: 'Tour Report Status', colId: 'tourStatus',
      width: 160, minWidth: 140,
      valueGetter: (p) => (p.data?.tour_file_name ? 'Uploaded' : 'Pending'),
      cellClass: 'text-center flex items-center justify-center font-bold border-r border-slate-100 dark:border-slate-800',
      cellRenderer: (p) => (
        <span className={p.value === 'Uploaded'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'}>
          {p.value}
        </span>
      ),
    },
    {
      headerName: 'Update', field: 'id',
      width: 90, minWidth: 90, pinned: 'right',
      cellClass: 'text-center flex items-center justify-center',
      sortable: false, filter: false,
      cellRenderer: (p) => {
        if (!canEdit) return null;
        return (
          <button type="button" onClick={() => onEdit?.(p.data)}
            className="p-1.5 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg text-orange-500 hover:text-orange-600 dark:text-orange-400 transition cursor-pointer"
            title="Update this visit">
            <Edit className="h-4 w-4" />
          </button>
        );
      },
    },
  ], [canEdit, onEdit, handleDownload]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stage tabs, matching the three lists in the 2.0 module */}
      <div className="module-subtabs-strip">
        {LIST_TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`module-subtab-btn ${activeTab === tab.id ? 'active' : ''}`}>
            {tab.label.toUpperCase()} ({tabCounts[tab.id] ?? 0})
          </button>
        ))}
      </div>

      <div className="module-card space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button type="button" onClick={toggleFilterPanel}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}>
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button type="button"
                onClick={() => { resetFilters(); notify(COMMON_TOASTS.filtersReset()); }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer">
                Reset
              </button>
            )}
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search FV ID / Officer / Purpose…"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full module-search-input" />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            <CopyButton onCopy={handleCopy} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown
              headers={exportHeaders}
              rows={exportRows.map((row) => exportHeaders.map((h) => row[h]))}
              data={exportRows}
              fileName="Foreign_Visits"
              title="Foreign Visit"
              triggerNotification={triggerNotification}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />

            {canAdd && (
              <button type="button" onClick={onAdd}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer">
                <Plus className="h-4 w-4" />
                <span>Add Visit Proposal</span>
              </button>
            )}
          </div>
        </div>

        {showFilterPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-2 animate-fade-in">
            <FilterSelect label="Organisation" value={selectedOrganisation}
              onChange={setSelectedOrganisation} options={organisationOptions} />
            <FilterSelect label="Stage of Visit" value={selectedStage}
              onChange={setSelectedStage} options={stageOptions} />
            <FilterSelect label="Type of Visit" value={selectedVisitType}
              onChange={setSelectedVisitType} options={visitTypeOptions} />
            <FilterSelect label="Year of Visit" value={selectedYear}
              onChange={setSelectedYear} options={yearOptions} />
          </div>
        )}

        {loadError && !loading ? (
          <div className="p-6 text-center text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl">
            {loadError}
          </div>
        ) : (
          <Table
            rowData={filteredData}
            columnDefs={colDefs}
            loading={loading}
            loadingMessage="Fetching official foreign visits…"
            paginationPageSize={pageSize}
            className="module-datalist-grid"
          />
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="module-form-select cursor-pointer">
        <option value="All">Show All</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
