import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { Search, X, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { fetchLandAbstractList, fetchPastLandList, fetchFutureLandList, deleteNmpEntry } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import { exportRowsToFile, exportGridApiToExcel } from '../../../utils/exportGridReport';

const SUB_TABS = [
  { id: 'land-abstract', label: 'LAND ABSTRACT' },
  { id: 'past-land', label: 'PAST LAND' },
  { id: 'future-land', label: 'FUTURE LAND' },
];

const LAND_ABSTRACT_BASE_COLS = [
  { field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true, cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center' },
  { field: 'port_name', headerName: 'Port Name', minWidth: 160, pinned: 'left', cellRenderer: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.value || '-'}</span> },
  { field: 'total_land_acres', headerName: 'Total Land (Acres)', minWidth: 140, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300 font-medium">{p.value ?? '-'}</span> },
  { field: 'port_operation', headerName: 'Port Operations (Acres)', minWidth: 170, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300">{p.value ?? '-'}</span> },
  { field: 'vacant_land_acres', headerName: 'Vacant Land (Acres)', minWidth: 150, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300">{p.value ?? '-'}</span> },
  { field: 'land_under_litigation_acres', headerName: 'Litigation/Encumbered (Acres)', minWidth: 190, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300">{p.value ?? '-'}</span> },
  { field: 'land_not_developable', headerName: 'Not Developable (Acres)', minWidth: 170, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300">{p.value ?? '-'}</span> },
];

function buildLandAbstractCols(actions) {
  return [...LAND_ABSTRACT_BASE_COLS, buildActionCol(actions)];
}

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateCellRenderer = (p) => <span className="text-slate-600 dark:text-slate-300">{fmtDate(p.value)}</span>;
const textCell = (p) => <span className="text-slate-600 dark:text-slate-300">{p.value || '-'}</span>;
const numCell = (p) => <span className="text-slate-600 dark:text-slate-300">{p.value ?? '-'}</span>;
const boldCell = (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.value || '-'}</span>;

function buildActionCol({ onEditRow, onDeleteRow, canEdit, canRemove }) {
  return {
    headerName: 'Action',
    width: 110,
    pinned: 'right',
    headerClass: 'text-center',
    cellClass: 'text-center flex items-center justify-center',
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    cellRenderer: (params) => {
      const item = params.data;
      if (!item) return null;
      return (
        <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
          {canEdit && (
            <button
              onClick={() => onEditRow(item)}
              title="Edit"
              className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDeleteRow(item)}
              title="Delete"
              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    },
  };
}

function buildNmpPlanCols({ onEditRow, onDeleteRow, canEdit, canRemove }) {
  return [
    { field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true, cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center' },
    { field: 'parcel_detail', headerName: 'Parcel Detail', minWidth: 160, pinned: 'left', cellRenderer: boldCell },
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 160, cellRenderer: (p) => <span className="text-slate-600 dark:text-slate-300 font-medium">{p.value || '-'}</span> },
    { field: 'area_acres', headerName: 'Area (Acres)', minWidth: 110, cellRenderer: numCell },
    { field: 'lease_status', headerName: 'Lease Status', minWidth: 120, cellRenderer: textCell },
    { field: 'upfront_premium', headerName: 'Upfront Premium [A]', minWidth: 150, cellRenderer: numCell },
    { field: 'annual_base_lease_rental', headerName: 'Annual Lease Rental', minWidth: 160, cellRenderer: numCell },
    { field: 'lease_tenure_years', headerName: 'Lease Tenure (Yrs)', minWidth: 140, cellRenderer: numCell },
    { field: 'escalation_rate', headerName: 'Escalation Rate (%)', minWidth: 140, cellRenderer: numCell },
    { field: 'frequency_of_escalation', headerName: 'Escalation Freq (Yrs)', minWidth: 150, cellRenderer: numCell },
    { field: 'npv_lease_rentals', headerName: 'NPV @12% [B]', minWidth: 140, cellRenderer: numCell },
    { field: 'estimated_private_investment', headerName: 'Est. Private Inv [C]', minWidth: 160, cellRenderer: numCell },
    { field: 'total_monetisation_value', headerName: 'Total [A+B+C]', minWidth: 140, cellRenderer: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.value ?? '-'}</span> },
    { field: 'lease_rental_received', headerName: 'Lease Rental FY25-26', minWidth: 160, cellRenderer: numCell },
    { field: 'agency_lessee_name', headerName: 'Agency/Lessee', minWidth: 160, cellRenderer: textCell },
    { field: 'type_of_agency_lessee', headerName: 'Type of Agency', minWidth: 140, cellRenderer: textCell },
    { field: 'agreement_signed', headerName: 'Agreement Signed', minWidth: 140, cellRenderer: textCell },
    { field: 'nit_original_target_date', headerName: 'NIT Original Target Date', minWidth: 170, cellRenderer: dateCellRenderer },
    { field: 'nit_actual_date', headerName: 'NIT Actual Date', minWidth: 150, cellRenderer: dateCellRenderer },
    { field: 'agreement_original_target_date', headerName: 'Agreement Original Target Date', minWidth: 210, cellRenderer: dateCellRenderer },
    { field: 'actual_agreement_date', headerName: 'Agreement Actual Date', minWidth: 170, cellRenderer: dateCellRenderer },
    { field: 'original_completion_date', headerName: 'Construction Original Target Date', minWidth: 210, cellRenderer: dateCellRenderer },
    { field: 'actual_completion_date', headerName: 'Construction Actual Date', minWidth: 180, cellRenderer: dateCellRenderer },
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, cellRenderer: textCell },
    { field: 'created_date', headerName: 'Last Updated', minWidth: 150, cellRenderer: dateCellRenderer },
    buildActionCol({ onEditRow, onDeleteRow, canEdit, canRemove }),
  ];
}

const FETCH_MAP = {
  'land-abstract': fetchLandAbstractList,
  'past-land': fetchPastLandList,
  'future-land': fetchFutureLandList,
};

export default function NmpDataList({ onEdit, onAddNew, triggerNotification, canEdit, canAdd, canRemove }) {
  const gridApiRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('future-land');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [tabCounts, setTabCounts] = useState({ 'land-abstract': 0, 'past-land': 0, 'future-land': 0 });

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const latestRequestRef = useRef(0);
  const fetchData = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    try {
      const fetcher = FETCH_MAP[subTab] || fetchFutureLandList;
      const res = await fetcher();
      if (isStale()) return;
      const rows = Array.isArray(res.data) ? res.data : [];
      setData(rows.map((item, idx) => ({ ...item, sNo: idx + 1 })));
      setTabCounts(prev => ({ ...prev, [subTab]: rows.length }));
    } catch {
      if (!latestRequestRef.current) return;
      setData([]);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [subTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch counts for all tabs once on mount so badges show immediately
  useEffect(() => {
    const tabs = Object.entries(FETCH_MAP);
    tabs.forEach(async ([tabId, fetcher]) => {
      try {
        const res = await fetcher();
        const rows = Array.isArray(res.data) ? res.data : [];
        setTabCounts(prev => ({ ...prev, [tabId]: rows.length }));
      } catch {
        setTabCounts(prev => ({ ...prev, [tabId]: 0 }));
      }
    });
  }, []);

  const handleDelete = useCallback(async (item) => {
    const idKey = subTab === 'land-abstract' ? 'land_abstract_id' : subTab === 'past-land' ? 'nmp_past_id' : 'nmp_id';
    const id = item[idKey];
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      const userId = getCurrentUserId();
      await deleteNmpEntry(id, userId, subTab);
      triggerNotification?.('Entry deleted successfully.', 'success');
      fetchData();
    } catch (err) {
      triggerNotification?.(err?.response?.data?.message || 'Failed to delete entry.', 'error');
    }
  }, [subTab, fetchData, triggerNotification]);

  const handleEdit = useCallback((item) => {
    const idKey = subTab === 'land-abstract' ? 'land_abstract_id' : subTab === 'past-land' ? 'nmp_past_id' : 'nmp_id';
    onEdit?.({ ...item, id: item[idKey], form_type: subTab });
  }, [subTab, onEdit]);

  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q))
    );
  }, [data, debouncedSearch]);

  const columnDefs = useMemo(() => {
    const actions = { onEditRow: handleEdit, onDeleteRow: handleDelete, canEdit, canRemove };
    if (subTab === 'land-abstract') return buildLandAbstractCols(actions);
    return buildNmpPlanCols(actions);
  }, [subTab, handleEdit, handleDelete, canEdit, canRemove]);


  const handleExport = (type) => {
    if (type === 'Copy') {
      const headers = columnDefs.filter(c => c.headerName).map(c => c.headerName);
      let tsv = headers.join('\t') + '\n';
      filteredData.forEach((row) => {
        const line = columnDefs.filter(c => c.headerName).map(c => {
          if (c.field === 'sNo') return row.sNo || '';
          return row[c.field] !== undefined ? row[c.field] : '';
        });
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).catch(() => {});
    } else if (type === 'Excel') {
      if (gridApiRef.current) {
        // Excel (.xlsx) of the table as shown
        exportGridApiToExcel(gridApiRef.current, { title: SUB_TABS.find((t) => t.id === subTab)?.label || 'NMP Data', fileName: `NMP_${subTab}` });
      }
    } else if (type === 'PDF') {
      // PDF straight to a file (no print dialog or new tab): the columns on show
      const pdfCols = columnDefs.filter((c) => c.headerName && !c.hide);
      exportRowsToFile('pdf', {
        title: SUB_TABS.find((t) => t.id === subTab)?.label || 'NMP Data',
        headers: pdfCols.map((c) => c.headerName),
        rows: filteredData.map((row) => pdfCols.map((c) => (c.field === 'sNo' ? row.sNo : (row[c.field] ?? '')))),
        fileName: `NMP_${subTab}`,
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Sub-tab strip */}
      <div className="module-subtabs-strip">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSubTab(tab.id); setSearchTerm(''); }}
            className={`module-subtab-btn ${subTab === tab.id ? 'active' : ''}`}
          >
            {tab.label} ({subTab === tab.id ? filteredData.length : (tabCounts[tab.id] ?? '–')})
          </button>
        ))}
      </div>

      {/* Main table card */}
      <div className="module-card space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">

          {/* Left: Add button */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {canAdd && onAddNew && (
              <button
                onClick={onAddNew}
                className="px-4 py-2 bg-[#0f417a] hover:bg-[#0d3566] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                + Add NMP Data
              </button>
            )}
          </div>

          {/* Spacer */}
          <div className="hidden lg:block flex-1" />

          {/* Right: Search + Rows + Total + Copy + Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search NMP data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows selector */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Total count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            {/* Copy */}
            <CopyButton onCopy={() => handleExport('Copy')} color="#0f417a" hoverBg="#f1f5f9" />

            {/* Export */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1d5594"
            />
          </div>
        </div>

        {/* AG Grid table */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            enableExport={false}
            onGridReady={(params) => { gridApiRef.current = params.api; }}
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true,
            }}
          />
        </div>

      </div>
    </div>
  );
}
