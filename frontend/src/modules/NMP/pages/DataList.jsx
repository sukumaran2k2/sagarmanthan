import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { Search, X, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { fetchLandAbstractList, fetchPastLandList, fetchFutureLandList, deleteNmpEntry } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import ConfirmModal from '../../../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// ── Dropdown options (keep in sync with the add form) ──
const OPT = {
  leasePast: [[1, 'Planned'], [2, 'Active'], [3, 'Expired'], [4, 'Renewed']],
  leaseFuture: [[1, 'Planned'], [2, 'Active'], [3, 'Expired']],
  status: [[1, 'Identified'], [2, 'NIT issued'], [3, 'Land allotted'], [4, 'Agreement signed/leased'], [5, 'Completion of construction']],
  mode: [[1, 'Nomination'], [2, 'Tender cum Auction']],
  purpose: [[1, 'Commercial'], [2, 'Industrial'], [3, 'Residential'], [4, 'Others']],
  lessee: [[1, 'Government'], [2, 'PSU'], [3, 'Autonomous'], [4, 'Private'], [5, 'Others']],
  sector: [[1, 'Connectivity'], [2, 'Warehousing & Storage'], [3, 'Oil, Gas & Energy'], [4, 'Manufacturing'], [5, 'Logistics Parks & Trade Zones'], [6, 'Shops'], [7, 'Office'], [8, 'Plazas'], [9, 'Hotels'], [10, 'Mercantile buildings'], [11, 'Other']],
  agreement: [[1, 'Yes'], [2, 'No'], [3, 'In Progress']],
};


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
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const dateCellRenderer = (p) => <span className="text-slate-600 dark:text-slate-300">{fmtDate(p.value)}</span>;
const rawDate = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || '-');
};

const sorDateCell = (p) => <span className="text-slate-600 dark:text-slate-300">{rawDate(p.value)}</span>;
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


// Returns the label for a row's dropdown value.
// Handles a numeric id, a numeric string, or an old text label, under any of the given keys.
// Works for a numeric id, a numeric string, or an old text label, under any of the given keys.
const toLabel = (options, row, keys) => {
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === '') continue;
    if (typeof v === 'string' && isNaN(Number(v))) return v; // already a label
    const m = options.find(([id]) => id === Number(v));
    if (m) return m[1];
  }
  return '-';
};
const multiCell = (p) => {
  const parts = String(p.value ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return <span className="text-slate-600 dark:text-slate-300">-</span>;
  return (
    <div className="flex flex-col leading-tight py-1.5 text-slate-600 dark:text-slate-300">
      {parts.map((x, i) => <span key={i}>{x}</span>)}
    </div>
  );
};

const totalCell = (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.value ?? '-'}</span>;

const srCol = { field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true, cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center' };
const parcelCol = { field: 'parcel_details', headerName: 'Parcel Detail', minWidth: 160, pinned: 'left', cellRenderer: boldCell };

const milestoneCols = [
  { field: 'nit_target_date', headerName: 'NIT Original Target Date', minWidth: 170, cellRenderer: dateCellRenderer },
  { field: 'actual_nit_date', headerName: 'NIT Actual Date', minWidth: 150, cellRenderer: dateCellRenderer },
  { field: 'target_agreement_date', headerName: 'Agreement Original Target Date', minWidth: 210, cellRenderer: dateCellRenderer },
  { field: 'actual_agreement_date', headerName: 'Agreement Actual Date', minWidth: 170, cellRenderer: dateCellRenderer },
  { field: 'target_completion_date', headerName: 'Construction Original Target Date', minWidth: 210, cellRenderer: dateCellRenderer },
  { field: 'actual_completion_date', headerName: 'Construction Actual Date', minWidth: 180, cellRenderer: dateCellRenderer },
];
const statusLabel = (row) => {
  let v = row?.status_id ?? row?.status;
  if (Array.isArray(v)) v = v[0];            // duplicate column names arrive as arrays
  if (v == null || v === '') return '-';
  if (typeof v === 'string' && isNaN(Number(v))) return v;   // already text
  const m = OPT.status.find(([id]) => id === Number(v));
  return m ? m[1] : '-';
};
// ── PAST LAND ──
function buildPastLandCols(actions) {
  return [
    srCol,
    parcelCol,
    { field: 'unique_nmp_id', headerName: 'NMP ID', minWidth: 120, cellRenderer: textCell },
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 160, cellRenderer: textCell },
    { field: 'area_acres', headerName: 'Area (Acres)', minWidth: 110, cellRenderer: numCell },
    { field: 'purpose', headerName: 'Purpose', minWidth: 120, cellRenderer: textCell },
    { field: 'sector', headerName: 'Sector', minWidth: 160, cellRenderer: textCell },
    { field: 'target_year', headerName: 'Year of Allotment', minWidth: 140, cellRenderer: textCell },
    { field: 'mode_of_allotment', headerName: 'Mode of Allotment', minWidth: 150, cellRenderer: textCell },
    { field: 'status', headerName: 'Status', minWidth: 150, cellRenderer: textCell },
    { field: 'lease_status', headerName: 'Lease Status', minWidth: 120, cellRenderer: textCell },
    { field: 'upfront_premium', headerName: 'Upfront Premium [A]', minWidth: 150, cellRenderer: numCell },
    { field: 'npv_lease_rentals', headerName: 'NPV @12% [B]', minWidth: 140,
      valueGetter: (p) => p.data?.npv_lease_rentals ?? p.data?.npv_lease_rental, cellRenderer: numCell },
    { field: 'estimated_private_investment', headerName: 'Private Inv [C]', minWidth: 150, cellRenderer: numCell },
    { field: 'total_monetisation_value', headerName: 'Total [A+B+C]', minWidth: 140,
      valueGetter: (p) => p.data?.total_monetisation_value ?? p.data?.total_monetization_value, cellRenderer: totalCell },
    { field: 'type_of_agency_lessee', headerName: 'Type of Lessee', minWidth: 140, cellRenderer: textCell },
    ...milestoneCols,
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, cellRenderer: textCell },
    { field: 'created_date', headerName: 'Last Updated', minWidth: 150, cellRenderer: dateCellRenderer },
    buildActionCol(actions),
  ];
}

// ── PAST LAND: SoR details (one row per lease/rental entry) ──
function buildSorCols() {
  return [
    srCol,
    parcelCol,
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 160, cellRenderer: textCell },
    { field: 'unique_nmp_id', headerName: 'NMP ID', minWidth: 120, cellRenderer: textCell },
    { field: 'sor_from', headerName: 'Period of SoR From', minWidth: 170, cellRenderer: sorDateCell },
    { field: 'sor_to', headerName: 'Period of SoR To', minWidth: 170, cellRenderer: sorDateCell },
    { field: 'annual_base_lease_rental', headerName: 'Annual Base Lease Rental (INR Cr)', minWidth: 210, cellRenderer: numCell },
    { field: 'escalation_rate', headerName: 'Escalation Rate (% YoY)', minWidth: 170, cellRenderer: numCell },
    { field: 'frequency_of_escalation', headerName: 'Escalation Freq (Yrs)', minWidth: 160, cellRenderer: numCell },
    { field: 'lease_tenure', headerName: 'Lease Tenure (Yrs)', minWidth: 150, cellRenderer: numCell },
    { field: 'npv', headerName: 'NPV @12% [B] (INR Cr)', minWidth: 170, cellRenderer: numCell },
  ];
}

// ── FUTURE LAND ──
function buildFutureLandCols(actions) {
  return [
    srCol,
    parcelCol,
    { field: 'unique_nmp_id', headerName: 'NMP ID', minWidth: 120, cellRenderer: textCell },
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 160, cellRenderer: textCell },
    { field: 'area', headerName: 'Area (Acres)', minWidth: 110, cellRenderer: numCell },
    { field: 'purpose', headerName: 'Purpose', minWidth: 120, cellRenderer: textCell },
    { field: 'sector', headerName: 'Sector', minWidth: 160, cellRenderer: textCell },
    { field: 'target_year', headerName: 'Target Yr of Monetisation', minWidth: 190, cellRenderer: textCell },
    { field: 'mode_of_allotment', headerName: 'Mode of Allotment', minWidth: 150, cellRenderer: textCell },
    { field: 'status', headerName: 'Status', minWidth: 120, cellRenderer: textCell },
    { field: 'lease_status', headerName: 'Lease Status', minWidth: 120, cellRenderer: textCell },
    { field: 'upfront_premium', headerName: 'Upfront Premium [A]', minWidth: 150, cellRenderer: numCell },
    { field: 'npv_lease_rentals', headerName: 'NPV @12% [B]', minWidth: 140,
      valueGetter: (p) => p.data?.npv_lease_rentals ?? p.data?.npv_lease_rental, cellRenderer: numCell },
    { field: 'extimated_private_investment', headerName: 'Est. Private Inv [C]', minWidth: 160, cellRenderer: numCell },
    { field: 'total_monetisation_value', headerName: 'Total [A+B+C]', minWidth: 140,
      valueGetter: (p) => p.data?.total_monetisation_value ?? p.data?.total_monetization_value, cellRenderer: totalCell },
    { field: 'agency_name', headerName: 'Agency/Lessee', minWidth: 160, cellRenderer: textCell },
    { field: 'type_of_agency', headerName: 'Type of Agency', minWidth: 140, cellRenderer: textCell },
    
    ...milestoneCols,

    { field: 'allotment_target_date', headerName: 'Allotment Original Target Date', minWidth: 210, cellRenderer: dateCellRenderer },
    { field: 'actual_allotment_date', headerName: 'Allotment Actual Date', minWidth: 170, cellRenderer: dateCellRenderer },
    { field: 'lease_expiration_date', headerName: 'Date of Lease Expiration', minWidth: 180, cellRenderer: dateCellRenderer },
    
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, cellRenderer: textCell },
    { field: 'created_date', headerName: 'Last Updated', minWidth: 150, cellRenderer: dateCellRenderer },
    buildActionCol(actions),
  ];
}
const lesseeLabel = (row) => {
  let v = row?.type_of_agency ?? row?.type_of_lessee_id;
  if (Array.isArray(v)) v = v[0];
  if (v == null || v === '') return '-';
  const id = Number(v);
  if (id === 5) return row.other_agency || 'Others';
  return OPT.lessee.find(([i]) => i === id)?.[1] ?? '-';
};
const rawId = (v) => {
  const x = Array.isArray(v) ? v[0] : v;
  return x == null || x === '' || isNaN(Number(x)) ? '' : Number(x);
};
const enrichRow = (row, tab) => {
  if (tab === 'land-abstract') return row;

  const purposeId = Number(row.purpose_id ?? row.purpose);
  const sectorId = Number(row.sector_id ?? row.sector);

  const futureIds = tab === 'future-land' || tab === 'past-land' ? {
    lease_status: toLabel(OPT.leasePast, row, ['lease_status_id', 'lease_status']),
    purpose_id: rawId(row.purpose_id ?? row.purpose),
    sector_id: rawId(row.sector_id ?? row.sector),
    status_id: rawId(row.status_id ?? row.status),
    mode_of_allotment_id: rawId(row.mode_of_allotment_id ?? row.mode_of_allotment),
    type_of_lessee_id: rawId(row.type_of_agency),
    agreement_signed_id: rawId(row.agreement_signed_id ?? row.agreement_signed),
  } : {};

  return {
    ...row,
    parcel_detail: row.parcel_detail ?? row.parcel_details ?? '',
    lease_status: toLabel(tab === 'past-land' ? OPT.leasePast : OPT.leaseFuture, row, ['lease_status_id', 'lease_status']),

    purpose: purposeId === 4
      ? (row.other_purpose || 'Others')
      : toLabel(OPT.purpose, row, ['purpose_id', 'purpose']),

    sector: sectorId === 11
      ? (row.other_sector || 'Other')
      : toLabel(OPT.sector, row, ['sector_id', 'sector']),

    type_of_lessee_id: row.type_of_agency ?? row.type_of_lessee_id,
    type_of_agency: lesseeLabel(row),
    type_of_agency_lessee: lesseeLabel(row),

    status: statusLabel(row),
    mode_of_allotment: toLabel(OPT.mode, row, ['mode_of_allotment_id', 'mode_of_allotment']),
    agreement_signed: toLabel(OPT.agreement, row, ['agreement_signed_id', 'agreement_signed']),
    nit_target_date: row.nit_target_date ?? row.target_nit_date,

    ...futureIds,   // must be last so the raw ids win
  };
};
const FETCH_MAP = {
  'land-abstract': (userId) => fetchLandAbstractList(userId),
  'past-land':     (userId) => fetchPastLandList(userId),
  'future-land':   (userId) => fetchFutureLandList(userId),
};

function ColumnChooser({ columns, hidden, onToggle, onShowAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const hiddenCount = columns.filter((c) => hidden[c.field]).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs cursor-pointer"
      >
        Visibility{hiddenCount > 0 && ` (${columns.length - hiddenCount}/${columns.length})`}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-30 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2">
          <button
            type="button"
            onClick={onShowAll}
            className="w-full text-left text-[11px] font-bold text-[#0f417a] dark:text-blue-400 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Show all columns
          </button>
          {columns.map((c) => (
            <label key={c.field} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={!hidden[c.field]}
                onChange={() => onToggle(c.field)}
                className="cursor-pointer"
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NmpDataList({ onEdit, onAddNew, triggerNotification, canEdit, canAdd, canRemove }) {
  const userId = getCurrentUserId();
 
  const gridRef = useRef(null); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState(() => sessionStorage.getItem('nmpTab') || 'land-abstract');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [tabCounts, setTabCounts] = useState({ 'land-abstract': 0, 'past-land': 0, 'future-land': 0 });
  const [pastView, setPastView] = useState('parcel');
  const [deleteAsk, setDeleteAsk] = useState(null); // the row to delete
const [deleting, setDeleting] = useState(false);
const [exporting, setExporting] = useState(false);
const [hiddenCols, setHiddenCols] = useState({}); // { 'past-land:parcel': { remarks: true } }

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const latestRequestRef = useRef(0);
  const fetchData = useCallback(async () => {
  if (!userId) {
    triggerNotification?.('Session expired. Please log in again.', 'error');
    setLoading(false);
    return;
  }
  const requestId = ++latestRequestRef.current;
  const isStale = () => requestId !== latestRequestRef.current;
  setLoading(true);
  try {
    const fetcher = FETCH_MAP[subTab] || FETCH_MAP['future-land'];
    const res = await fetcher(userId);
    if (isStale()) return;
    const rows = Array.isArray(res.data) ? res.data : [];
    setData(rows.map((item, idx) => ({ ...enrichRow(item, subTab), sNo: idx + 1 })));
    setTabCounts(prev => ({ ...prev, [subTab]: rows.length }));
  } catch {
    if (isStale()) return;
    setData([]);
  } finally {
    if (!isStale()) setLoading(false);
  }
}, [subTab, userId]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch counts for all tabs once on mount so badges show immediately
 useEffect(() => {
  if (!userId) return;
  Object.entries(FETCH_MAP).forEach(async ([tabId, fetcher]) => {
    try {
      const res = await fetcher(userId);
      const rows = Array.isArray(res.data) ? res.data : [];
      setTabCounts(prev => ({ ...prev, [tabId]: rows.length }));
    } catch {
      setTabCounts(prev => ({ ...prev, [tabId]: 0 }));
    }
  });
}, [userId]);

  // Trash icon only opens the modal
const handleDelete = useCallback((item) => {
  setDeleteAsk(item);
}, []);

// Modal "confirm" does the real delete
const confirmDelete = async () => {
  const idKey = subTab === 'land-abstract' ? 'land_abstract_id' : subTab === 'past-land' ? 'nmp_past_id' : 'nmp_id';
  const id = deleteAsk?.[idKey];
  if (!id) { setDeleteAsk(null); return; }
  setDeleting(true);
  try {
    const userId = getCurrentUserId();
    await deleteNmpEntry(id, userId, subTab);
    triggerNotification?.('NMP entry deleted successfully.', 'success');
    setDeleteAsk(null);
    fetchData();
  } catch (err) {
    triggerNotification?.(err?.response?.data?.message || 'Failed to delete NMP entry.', 'error');
  } finally {
    setDeleting(false);
  }
};

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

  const isPastSor = (subTab === 'past-land' || subTab === 'future-land') && pastView === 'sor';

const tableRows = useMemo(() => {
  if (!isPastSor) return filteredData;
  let n = 0;
  return filteredData.flatMap((parcel) =>
    (parcel.sor_rows || []).map((sor) => ({ ...parcel, ...sor, sNo: ++n }))
  );
}, [filteredData, isPastSor]);

const allColumnDefs = useMemo(() => {
  const actions = { onEditRow: handleEdit, onDeleteRow: handleDelete, canEdit, canRemove: canRemove && pastView !== 'sor' };
  if (subTab === 'land-abstract') return buildLandAbstractCols(actions);
  if (pastView === 'sor') return buildSorCols();
  return subTab === 'past-land' ? buildPastLandCols(actions) : buildFutureLandCols(actions);
}, [subTab, pastView, handleEdit, handleDelete, canEdit, canRemove]);

// each tab/view remembers its own hidden columns
const viewKey = `${subTab}:${subTab === 'land-abstract' ? 'parcel' : pastView}`;
const hiddenForView = hiddenCols[viewKey] || {};

const toggleCol = useCallback((field) => {
  setHiddenCols((prev) => {
    const cur = prev[viewKey] || {};
    return { ...prev, [viewKey]: { ...cur, [field]: !cur[field] } };
  });
}, [viewKey]);

const showAllCols = useCallback(() => {
  setHiddenCols((prev) => ({ ...prev, [viewKey]: {} }));
}, [viewKey]);

// S.No and Action are not in the list, so they always stay
const toggleableCols = useMemo(
  () => allColumnDefs
    .filter((c) => c.field && c.field !== 'sNo' && c.headerName)
    .map((c) => ({ field: c.field, label: c.headerName })),
  [allColumnDefs]
);

const columnDefs = useMemo(
  () => allColumnDefs.filter((c) => !hiddenForView[c.field]),
  [allColumnDefs, hiddenForView]
);

 // Every column of the current tab (S.No included), with values as the grid shows them
const exportColumns = useMemo(
  () =>
    columnDefs
      .filter((c) => c.headerName && c.headerName !== 'Action')
      .map((c) => ({
        field: c.field,
        label: c.headerName,
        exportValue: (row) => {
        if (c.field === 'sNo') return row.sNo ?? '';
        let v = typeof c.valueGetter === 'function' ? c.valueGetter({ data: row }) : row[c.field];
        if (Array.isArray(v)) v = v[0];
        if (c.cellRenderer === dateCellRenderer) return fmtDate(v);
        if (c.cellRenderer === sorDateCell) return rawDate(v);
       
        return v == null || v === '' ? '-' : v;
      },
      })),
  [columnDefs]
);

const exportBaseName = `NMP_${subTab}${isPastSor ? '_SoR' : ''}_${new Date().toISOString().slice(0, 10)}`;

const handlePdf = () => {
  if (loading || exporting) return;
  if (!tableRows.length) {
    triggerNotification?.('There is no data to export.', 'error');
    return;
  }
  setExporting(true);
  try {
    const title = SUB_TABS.find((t) => t.id === subTab)?.label || 'NMP Data';
    const fullTitle = `NMP - ${title}${isPastSor ? ' (SoR Details)' : ''}`;

    const safe = (v) =>
      String(v ?? '')
        .replace(/₹/g, 'Rs. ')
        .replace(/[–—]/g, '-')
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"');

  

    // Fit every visible column on one page width
const colCount = exportColumns.length;
const pageW = colCount > 22 ? 1684 : colCount > 14 ? 1191 : 842;   // A2 / A3 / A4 landscape, in pt
const pageH = pageW === 1684 ? 1191 : pageW === 1191 ? 842 : 595;
const margin = 20;
const snoW = 28;
const colW = (pageW - margin * 2 - snoW) / Math.max(colCount - 1, 1);
const fontSize = colCount > 22 ? 6.5 : colCount > 14 ? 6 : 7;

const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [pageW, pageH], compress: true });
doc.setFontSize(12);
doc.text(safe(fullTitle), margin, 24);
doc.setFontSize(8);
doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${tableRows.length}`, margin, 38);

const columnStyles = {};
exportColumns.forEach((c, i) => {
  columnStyles[i] = { cellWidth: c.field === 'sNo' ? snoW : colW };
});

autoTable(doc, {
  startY: 46,
  head: [exportColumns.map((c) => safe(c.label))],
  body: tableRows.map((row) => exportColumns.map((c) => safe(c.exportValue(row)))),
  columnStyles,
  tableWidth: pageW - margin * 2,
  styles: { fontSize, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
  headStyles: { fillColor: [15, 65, 122], textColor: 255, halign: 'center', fontSize },
  alternateRowStyles: { fillColor: [245, 247, 250] },
  margin: { left: margin, right: margin, bottom: 20 },
});

doc.save(`${exportBaseName}.pdf`);

    doc.save(`${exportBaseName}.pdf`);
    triggerNotification?.(`Downloaded ${exportBaseName}.pdf`, 'success');
  } catch (err) {
    console.error('NMP PDF export failed:', err);
    triggerNotification?.('PDF export failed. Please try again.', 'error');
  } finally {
    setExporting(false);
  }
};



const handleExport = (type) => {
  if (type === 'Excel') {
    gridRef.current?.api?.exportDataAsCsv({ fileName: exportBaseName });
    triggerNotification?.(`Downloaded ${exportBaseName}.csv`, 'success');
  }
};

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Sub-tab strip */}
      <div className="module-subtabs-strip">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSubTab(tab.id); setPastView('parcel'); sessionStorage.setItem('nmpTab', tab.id); setSearchTerm(''); }}
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

              {/* <-- paste the toggle here */}
  {(subTab === 'past-land' || subTab === 'future-land') && (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      {[
        { id: 'parcel', label: 'PARCEL DETAILS' },
        { id: 'sor', label: 'SOR DETAILS' },
      ].map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => setPastView(v.id)}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
            pastView === v.id
              ? 'bg-[#0f417a] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
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
              Total: {tableRows.length}
            </div>

            {/* Copy */}
            {/* Columns */}
          <ColumnChooser
        columns={toggleableCols}
        hidden={hiddenForView}
        onToggle={toggleCol}
        onShowAll={showAllCols}
      />

          {/* Copy — let CopyButton build the TSV, copy (with fallback) and toast */}
          <CopyButton
            headers={exportColumns.map((c) => c.label)}
            rows={() => tableRows.map((row) => exportColumns.map((c) => c.exportValue(row)))}
            triggerNotification={triggerNotification}
            color="#0f417a"
            hoverBg="#f1f5f9"
          />

            {/* Export */}
          <ExportDropdown
          onExportExcel={() => handleExport('Excel')}
          onExportPdf={handlePdf}
          color="#0f417a"
          hoverColor="#1d5594"
        />
          </div>
        </div>

        {/* AG Grid table */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
  ref={gridRef}
  theme="legacy"
  rowData={tableRows}
  columnDefs={columnDefs}
  loading={loading}
  pagination={true}
  paginationPageSize={pageSize}
  enableExport={false}
  defaultColDef={{
    minWidth: 90,
    filter: false,
    sortable: true,
    resizable: true,
  }}
/>
        </div>

      </div>
        <ConfirmModal
        isOpen={!!deleteAsk}
        onClose={() => setDeleteAsk(null)}
        onConfirm={confirmDelete}
        title="Delete Entry?"
        message={`Are you sure you want to delete ${deleteAsk?.parcel_details || deleteAsk?.parcel_detail || 'this entry'}? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
