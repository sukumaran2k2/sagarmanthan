import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import {
  Search, X, Edit, Trash2, Filter, ChevronDown,
  Landmark, Anchor, Building
} from 'lucide-react';
import { MONTHS, FINANCIAL_YEARS, MEDIA_TABS_ALL } from '../utils/constants';
import { getOrgCategory, calculateCategoryCounts } from '../utils/categoryHelpers';
import { aggregateYearWiseData } from '../utils/dataTransformers';
import { useMediaOutreachStore } from '../store/useMediaOutreachStore';

// Every column is visible by default; the store keeps only the user's changes
const DEFAULT_VISIBLE_COLS = {
  sNo: true,
  organisation: true,
  financialYear: true,
  month: true,
  national: true,
  regional: true,
  overall: true,
  facebook: true,
  instagram: true,
  linkedIn: true,
  twitter: true,
  youTube: true,
  action: true
};

// visKey is the Visibility checkbox that controls the column
const SECTION_COLUMNS = {
  broadcast: [
    { field: 'broadcast_national', header: 'National', visKey: 'national' },
    { field: 'broadcast_regional', header: 'Regional', visKey: 'regional' },
    { field: 'broadcast_overall', header: 'Overall', visKey: 'overall' },
  ],
  print_media: [
    { field: 'print_media_national', header: 'National', visKey: 'national' },
    { field: 'print_media_regional', header: 'Regional', visKey: 'regional' },
    { field: 'print_media_overall', header: 'Overall', visKey: 'overall' },
  ],
  online: [
    { field: 'online_english', header: 'English', visKey: 'national' },
    { field: 'online_vernacular', header: 'Vernacular', visKey: 'regional' },
    { field: 'online_overall', header: 'Overall', visKey: 'overall' },
  ],
};

const CHANNEL_COLUMNS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'youTube', label: 'YouTube' },
];

const METRIC_COLUMNS = [
  { key: 'posts', label: 'No. of Posts' },
  { key: 'impression', label: 'Impression' },
  { key: 'engagement', label: 'Engagement' },
];

const HEADER_CLASS = 'text-center-header font-bold text-white';

// Organisation chip panel styles; Ministry has no chip panel
const CHIP_STYLES = {
  major_port: {
    panel: 'bg-emerald-50/15 border-emerald-255/30 border-l-4 border-l-emerald-500',
    dot: 'bg-emerald-500',
    label: 'text-emerald-700 dark:text-emerald-455',
    name: 'Major Port',
    all: 'All Major Ports',
    active: 'bg-emerald-600 border-emerald-600 text-white shadow-md transform scale-[1.02]',
  },
  non_port: {
    panel: 'bg-indigo-50/15 border-indigo-255/30 border-l-4 border-l-indigo-500',
    dot: 'bg-indigo-500',
    label: 'text-indigo-700 dark:text-indigo-405',
    name: 'Non-Port',
    all: 'All Non-Ports',
    active: 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-[1.02]',
  },
};

export default function DataList({
  rowData = [],
  loading,
  activeMediaType,
  onEdit,
  onDelete,
  organisations = [],
  getOrgName,
  triggerNotification,
  isStandardView = false,
  permissions
}) {
  const isOrgView = isStandardView || permissions?.isStandardView || permissions?.isOrgScoped;
  const canEdit = !!permissions?.canEdit;
  const canDelete = !!permissions?.canRemove;

  // Filters, search, pagination and columns live in the store so they survive tab switches
  const {
    financialYear: financialYearFilter,
    month: monthFilter,
    organisationId: organisationFilter,
    showYearWise,
    category: activeCategory, // 'all' | 'major_port' | 'ministry' | 'non_port'
    subOrgId: selectedSubOrgId,
    searchTerm,
    showFilterPanel,
    currentPage: storedPage,
    pageSize,
    visibleCols: colChanges,
  } = useMediaOutreachStore(useShallow((state) => state.list));
  const actions = useMediaOutreachStore((state) => state.listActions);
  const visibleCols = useMemo(() => ({ ...DEFAULT_VISIBLE_COLS, ...colChanges }), [colChanges]);

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rows carry the organisation name from the API; the dropdown list is only a fallback
  const orgNameOf = useCallback((row) => row.organisation_name || getOrgName(row.organisation_id), [getOrgName]);

  const organisationOptions = useMemo(() => {
    const names = new Map();
    organisations.forEach(o => {
      if (o.organisation_id && o.organisation_name) names.set(String(o.organisation_id), o.organisation_name);
    });
    rowData.forEach(row => {
      const name = orgNameOf(row);
      if (row.organisation_id && name !== '-') names.set(String(row.organisation_id), name);
    });
    return [...names].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [organisations, rowData, orgNameOf]);

  // Standard years plus any other year that records were saved under
  const yearOptions = useMemo(
    () => [...new Set([...FINANCIAL_YEARS, ...rowData.map(row => row.financial_year).filter(Boolean)])].sort(),
    [rowData]
  );

  const handleShowAllCols = () => actions.setVisibleCols({});

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (financialYearFilter) count++;
    if (!showYearWise && monthFilter) count++;
    if (!isOrgView && organisationFilter) count++;
    if (showYearWise) count++;
    return count;
  }, [financialYearFilter, monthFilter, organisationFilter, showYearWise, isOrgView]);

  const handleResetFilters = () => {
    actions.resetFilters();
    triggerNotification?.('Filters have been reset', 'info');
  };

  // Year-wise view sums each organisation's months into one row per financial year
  const baseRows = useMemo(
    () => (showYearWise ? aggregateYearWiseData(rowData) : rowData),
    [rowData, showYearWise]
  );

  // Rows matching the filter panel and search; the category cards apply on top
  const panelFilteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return baseRows.filter(row => {
      if (financialYearFilter && row.financial_year !== financialYearFilter) return false;
      if (!showYearWise && monthFilter && row.month !== monthFilter) return false;
      if (organisationFilter && String(row.organisation_id) !== String(organisationFilter)) return false;
      if (!search) return true;
      return orgNameOf(row).toLowerCase().includes(search)
        || (row.financial_year || '').toLowerCase().includes(search)
        || (!showYearWise && (row.month || '').toLowerCase().includes(search));
    });
  }, [baseRows, financialYearFilter, monthFilter, organisationFilter, searchTerm, showYearWise, orgNameOf]);

  const categoryCounts = useMemo(
    () => calculateCategoryCounts(panelFilteredRows, organisations, getOrgCategory),
    [panelFilteredRows, organisations]
  );

  const categoryOf = useCallback(
    (row) => getOrgCategory(row.organisation_id, row.organisation_category_name, organisations),
    [organisations]
  );

  const filteredRowData = useMemo(() => panelFilteredRows.filter(row => {
    if (activeCategory !== 'all' && categoryOf(row) !== activeCategory) return false;
    if (selectedSubOrgId && String(row.organisation_id) !== String(selectedSubOrgId)) return false;
    return true;
  }), [panelFilteredRows, activeCategory, selectedSubOrgId, categoryOf]);

  const chipStyle = CHIP_STYLES[activeCategory];

  // Organisations in the active category, for the organisation chips
  const subOrganisations = useMemo(() => {
    if (activeCategory === 'all') return [];
    const names = new Map();
    rowData.forEach(row => {
      if (categoryOf(row) === activeCategory) names.set(row.organisation_id, orgNameOf(row));
    });
    return [...names]
      .map(([organisation_id, organisation_name]) => ({ organisation_id, organisation_name }))
      .sort((a, b) => a.organisation_name.localeCompare(b.organisation_name));
  }, [rowData, activeCategory, categoryOf, orgNameOf]);

  // Clamp the stored page so a shorter list never opens on an empty page
  const totalPages = Math.ceil(filteredRowData.length / pageSize) || 1;
  const currentPage = Math.min(storedPage, totalPages);

  // S.No is set on each row so it always matches the page shown
  const paginatedRowData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRowData
      .slice(startIndex, startIndex + pageSize)
      .map((row, i) => ({ ...row, sNo: startIndex + i + 1 }));
  }, [filteredRowData, currentPage, pageSize]);

  // Summed year-wise rows are not real records, so they cannot be edited or deleted
  const showActions = (canEdit || canDelete) && !showYearWise;

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.NO',
        minWidth: 70,
        width: 75,
        maxWidth: 80,
        pinned: 'left',
        suppressSizeToFit: true,
        headerClass: HEADER_CLASS,
        cellClass: 'font-semibold text-slate-700 dark:text-slate-200 text-center',
        hide: !visibleCols.sNo
      }
    ];

    if (!isOrgView) {
      cols.push({
        field: 'organisation_id',
        headerName: 'ORGANISATION NAME',
        minWidth: 220,
        flex: 2,
        wrapText: true,
        autoHeight: true,
        pinned: 'left',
        headerClass: HEADER_CLASS,
        cellClass: 'mopsw-wrap-cell text-center flex items-center justify-center font-bold text-slate-800 dark:text-slate-100',
        cellStyle: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.35',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        valueGetter: (params) => (params.data ? orgNameOf(params.data) : ''),
        cellRenderer: (p) => (
          <div className="w-full flex items-center justify-center text-center font-bold text-slate-800 dark:text-slate-100 whitespace-normal break-words py-1.5 leading-snug">
            {p.value || '-'}
          </div>
        ),
        hide: !visibleCols.organisation
      });
    }

    cols.push({
      field: 'financial_year',
      headerName: 'FINANCIAL YEAR',
      minWidth: 130,
      flex: 1,
      headerClass: HEADER_CLASS,
      cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
      hide: !visibleCols.financialYear
    });

    if (!showYearWise) {
      cols.push({
        field: 'month',
        headerName: 'MONTH',
        minWidth: 110,
        flex: 1,
        headerClass: HEADER_CLASS,
        cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
        hide: !visibleCols.month
      });
    }

    if (SECTION_COLUMNS[activeMediaType]) {
      SECTION_COLUMNS[activeMediaType].forEach(({ field, header, visKey }) => {
        cols.push({
          field,
          headerName: header.toUpperCase(),
          minWidth: 120,
          cellClass: visKey === 'overall' ? 'text-center font-bold text-blue-700 dark:text-blue-400' : 'text-center font-medium',
          headerClass: HEADER_CLASS,
          hide: !visibleCols[visKey],
          valueFormatter: (p) => p.value ?? 0
        });
      });
    } else if (activeMediaType === 'social_media') {
      CHANNEL_COLUMNS.filter(ch => visibleCols[ch.key]).forEach(ch => {
        cols.push({
          headerName: ch.label.toUpperCase(),
          headerClass: HEADER_CLASS,
          children: METRIC_COLUMNS.map(m => ({
            field: `${ch.key}_${m.key}`,
            headerName: m.label.toUpperCase(),
            minWidth: 135,
            cellClass: 'text-center font-medium',
            headerClass: 'text-center-header text-[10px] font-bold text-white',
            valueFormatter: (p) => p.value ?? 0
          }))
        });
      });
    }

    if (showActions) {
      cols.push({
        headerName: 'ACTIONS',
        field: 'media_outreach_id',
        minWidth: 110,
        width: 110,
        pinned: 'right',
        suppressSizeToFit: true,
        headerClass: HEADER_CLASS,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const item = params.data;
          if (!item) return null;
          return (
            <div className="flex items-center justify-center space-x-1.5">
              {canEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-500 hover:text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
        hide: !visibleCols.action
      });
    }

    return cols;
  }, [activeMediaType, orgNameOf, onEdit, onDelete, visibleCols, showYearWise, isOrgView, canEdit, canDelete, showActions]);

  const toggleableCols = useMemo(() => {
    const list = [
      { key: 'sNo', label: 'S.No' },
      ...(!isOrgView ? [{ key: 'organisation', label: 'Organisation Name' }] : []),
      { key: 'financialYear', label: 'Financial Year' },
      ...(!showYearWise ? [{ key: 'month', label: 'Month' }] : [])
    ];

    if (SECTION_COLUMNS[activeMediaType]) {
      SECTION_COLUMNS[activeMediaType].forEach(c => list.push({ key: c.visKey, label: c.header }));
    } else if (activeMediaType === 'social_media') {
      CHANNEL_COLUMNS.forEach(ch => list.push({ key: ch.key, label: ch.label }));
    }

    if (showActions) list.push({ key: 'action', label: 'Actions' });
    return list;
  }, [activeMediaType, isOrgView, showYearWise, showActions]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: true,
    suppressMovable: true,
    flex: 1,
    wrapHeaderText: true,
    autoHeaderHeight: true
  }), []);

  // Copy, Excel and PDF use the visible columns (no Actions) and every filtered row
  const exportColumns = useMemo(() => {
    const cols = [];
    if (visibleCols.sNo) cols.push({ header: 'S.No', value: (row, i) => i + 1 });
    if (!isOrgView && visibleCols.organisation) cols.push({ header: 'Organisation Name', value: orgNameOf });
    if (visibleCols.financialYear) cols.push({ header: 'Financial Year', value: row => row.financial_year });
    if (!showYearWise && visibleCols.month) cols.push({ header: 'Month', value: row => row.month });

    if (SECTION_COLUMNS[activeMediaType]) {
      SECTION_COLUMNS[activeMediaType].forEach(({ field, header, visKey }) => {
        if (visibleCols[visKey]) cols.push({ header, value: row => row[field] ?? 0 });
      });
    } else if (activeMediaType === 'social_media') {
      CHANNEL_COLUMNS.filter(ch => visibleCols[ch.key]).forEach(ch => {
        METRIC_COLUMNS.forEach(m => cols.push({ header: `${ch.label} - ${m.label}`, value: row => row[`${ch.key}_${m.key}`] ?? 0 }));
      });
    }
    return cols;
  }, [activeMediaType, visibleCols, isOrgView, showYearWise, orgNameOf]);

  const exportHeaders = useMemo(() => exportColumns.map(c => c.header), [exportColumns]);
  // Built only when Copy or Export is clicked
  const buildExportRows = useCallback(
    () => filteredRowData.map((row, i) => exportColumns.map(c => c.value(row, i))),
    [filteredRowData, exportColumns]
  );
  const mediaLabel = MEDIA_TABS_ALL.find(tab => tab.id === activeMediaType)?.label || 'Media Outreach';

  return (
    <div className="space-y-4 font-sans text-black select-none">
      
      {!isOrgView && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => {
                actions.setCategory(prev => prev === 'ministry' ? 'all' : 'ministry');
              }}
              className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
                activeCategory === 'ministry'
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-2 ring-amber-500/30 transform scale-[1.02]'
                  : 'bg-amber-50/60 hover:bg-amber-50/90 border-amber-200/60 shadow-sm hover:shadow-md hover:scale-[1.01] dark:bg-amber-950/20 dark:hover:bg-amber-950/35 dark:border-amber-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors duration-350 ${
                  activeCategory === 'ministry' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                }`}>
                  <Landmark className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'ministry' ? 'text-amber-900 dark:text-amber-300' : 'text-amber-800 dark:text-amber-400'}`}>
                  Ministry
                </h3>
              </div>
              <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
                activeCategory === 'ministry'
                  ? 'bg-amber-600 text-white shadow-sm scale-105'
                  : 'bg-amber-100 text-amber-700 border border-amber-200/70 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50'
              }`}>
                {categoryCounts.ministry}
              </div>
            </div>

            <div
              onClick={() => {
                actions.setCategory(prev => prev === 'major_port' ? 'all' : 'major_port');
              }}
              className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
                activeCategory === 'major_port'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md ring-2 ring-emerald-500/30 transform scale-[1.02]'
                  : 'bg-emerald-50/60 hover:bg-emerald-50/90 border-emerald-200/60 shadow-sm hover:shadow-md hover:scale-[1.01] dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35 dark:border-emerald-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors duration-350 ${
                  activeCategory === 'major_port' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                }`}>
                  <Anchor className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'major_port' ? 'text-emerald-900 dark:text-emerald-300' : 'text-emerald-800 dark:text-emerald-400'}`}>
                  Major Port Organisations
                </h3>
              </div>
              <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
                activeCategory === 'major_port'
                  ? 'bg-emerald-600 text-white shadow-sm scale-105'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50'
              }`}>
                {categoryCounts.majorPort}
              </div>
            </div>

            <div
              onClick={() => {
                actions.setCategory(prev => prev === 'non_port' ? 'all' : 'non_port');
              }}
              className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
                activeCategory === 'non_port'
                  ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md ring-2 ring-indigo-500/30 transform scale-[1.02]'
                  : 'bg-indigo-50/60 hover:bg-indigo-50/90 border-indigo-200/60 shadow-sm hover:shadow-md hover:scale-[1.01] dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35 dark:border-indigo-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors duration-350 ${
                  activeCategory === 'non_port' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                }`}>
                  <Building className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'non_port' ? 'text-indigo-900 dark:text-indigo-300' : 'text-indigo-800 dark:text-indigo-400'}`}>
                  Non-Port Organisations
                </h3>
              </div>
              <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
                activeCategory === 'non_port'
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800/50'
              }`}>
                {categoryCounts.nonPort}
              </div>
            </div>
          </div>

          {chipStyle && subOrganisations.length > 0 && (
            <div className={`border rounded-2xl p-5 space-y-3.5 backdrop-blur-md animate-fade-in shadow-xs transition-all duration-300 dark:bg-slate-900/10 dark:border-slate-800/80 ${chipStyle.panel}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${chipStyle.dot}`} />
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${chipStyle.label}`}>
                    Filter by {chipStyle.name} Organisation
                  </span>
                </div>
                {selectedSubOrgId && (
                  <button
                    onClick={() => {
                      actions.setFilters({ subOrgId: '' });
                    }}
                    className="text-[10px] font-black text-[#0f417a] dark:text-blue-400 hover:underline uppercase tracking-wide cursor-pointer flex items-center gap-1"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                <button
                  onClick={() => {
                    actions.setFilters({ subOrgId: '' });
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                    !selectedSubOrgId
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm transform scale-[1.02] dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-350 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                  }`}
                >
                  {chipStyle.all}
                </button>
                {subOrganisations.map(org => {
                  const isSelected = String(org.organisation_id) === String(selectedSubOrgId);
                  return (
                    <button
                      key={org.organisation_id}
                      onClick={() => {
                        actions.setFilters({ subOrgId: isSelected ? '' : org.organisation_id });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                        isSelected
                          ? chipStyle.active
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-355 hover:scale-[1.01] dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                      }`}
                    >
                      {org.organisation_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => actions.setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredRowData.length}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen(!colDropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button
                      type="button"
                      onClick={handleShowAllCols}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  {toggleableCols.map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[key] !== false}
                        onChange={() => actions.setVisibleCols(prev => ({ ...prev, [key]: visibleCols[key] === false }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton
              headers={exportHeaders}
              rows={buildExportRows}
              color="#0f417a"
              hoverBg="#f1f5f9"
              triggerNotification={triggerNotification}
            />

            <ExportDropdown
              headers={exportHeaders}
              rows={buildExportRows}
              fileName={`Media_Outreach_${activeMediaType}_Export`}
              title={`Media Outreach - ${mediaLabel}`}
              color="#0f417a"
              hoverColor="#1d5594"
              triggerNotification={triggerNotification}
            />
          </div>
        </div>

        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className={`grid grid-cols-1 ${isOrgView ? 'sm:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4'} gap-3`}>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Financial Year
                </label>
                <select
                  value={financialYearFilter}
                  onChange={(e) => {
                    actions.setFilters({ financialYear: e.target.value });
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show All</option>
                  {yearOptions.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>

              <div className={showYearWise ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Month
                </label>
                <select
                  value={monthFilter}
                  disabled={showYearWise}
                  onChange={(e) => {
                    actions.setFilters({ month: e.target.value });
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                >
                  <option value="">{showYearWise ? 'N/A - Year Wise' : 'Show All'}</option>
                  {!showYearWise && MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {!isOrgView && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Organisation
                  </label>
                  <select
                    value={organisationFilter}
                    onChange={(e) => {
                      actions.setFilters({ organisationId: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">Show All Organisations ({organisationOptions.length})</option>
                    {organisationOptions.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Summary View
                </label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-950 w-full h-[38px]">
                  <button
                    type="button"
                    onClick={() => {
                      actions.setFilters({ showYearWise: false });
                    }}
                    className={`flex-1 text-center py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      !showYearWise
                        ? 'bg-[#0f417a] dark:bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Month-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.setFilters({ showYearWise: true, month: '' });
                    }}
                    className={`flex-1 text-center py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      showYearWise
                        ? 'bg-[#0f417a] dark:bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Year-Wise
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedRowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
          />

          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={filteredRowData.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => actions.setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => actions.setCurrentPage(Math.max(1, currentPage - 1))}
            onNextPage={() => actions.setCurrentPage(Math.min(totalPages, currentPage + 1))}
            color="#0f417a"
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          font-weight: bold !important;
          color: white !important;
          white-space: nowrap !important;
          word-break: normal !important;
        }
        .text-center-header {
          background-color: #0f417a !important;
        }
        .ag-header-row {
          background-color: #0f417a !important;
        }
        .ag-header-cell {
          background-color: #0f417a !important;
          border-right: 1px solid #1a5ba3 !important;
        }
        .ag-header-cell-text {
          color: white !important;
          font-weight: bold !important;
          white-space: nowrap !important;
          word-break: normal !important;
        }
        .ag-header-group-cell {
          background-color: #0f417a !important;
          border-right: 1px solid #1a5ba3 !important;
          border-bottom: 1px solid #1a5ba3 !important;
        }
        .ag-header-group-cell-label {
          justify-content: center !important;
          text-align: center !important;
          font-weight: bold !important;
          color: white !important;
        }
        .ag-cell {
          color: #000000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 500 !important;
        }
        .ag-row {
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .ag-row-odd {
          background-color: #f8fafc !important;
        }
      `}} />
    </div>
  );
}
