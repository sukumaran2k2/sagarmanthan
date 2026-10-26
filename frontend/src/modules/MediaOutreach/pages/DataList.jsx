import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { 
  Search, X, Edit, Trash2, Filter, ChevronDown, 
  Landmark, Anchor, Building 
} from 'lucide-react';
import { SOCIAL_CHANNELS_KEYS, SOCIAL_METRICS, MONTHS, FINANCIAL_YEARS } from '../utils/constants';
import { getOrgCategory, calculateCategoryCounts } from '../utils/categoryHelpers';
import { aggregateYearWiseData } from '../utils/dataTransformers';
import { copyTableToClipboard, exportTableCSV, printTablePDF } from '../utils/exportHelpers';

export default function DataList({
  rowData = [],
  loading,
  activeMediaType,
  setActiveMediaType,
  mediaTabs,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  organisations = [],
  getOrgName,
  triggerNotification,
  isStandardView = false,
  permissions
}) {
  const hideOrgFilter = isStandardView || permissions?.isStandardView;
  const [gridApi, setGridApi] = useState(null);

  // Filter states
  const [financialYearFilter, setFinancialYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [organisationFilter, setOrganisationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showYearWise, setShowYearWise] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'major_port' | 'ministry' | 'non_port'
  const [selectedSubOrgId, setSelectedSubOrgId] = useState('');
  
  // Filter panel collapse/expand state
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility checklist dropdown
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

  const organisationOptions = useMemo(() => {
    const list = [];
    const map = new Map();

    (organisations || []).forEach(o => {
      if (o.organisation_id && o.organisation_name) {
        map.set(String(o.organisation_id), o.organisation_name);
      }
    });

    (rowData || []).forEach(r => {
      const id = r.organisation_id ?? r.organisation;
      const name = r.organisation_name || r['Organisation Name'] || getOrgName(id);
      if (id && name && name !== '-' && !name.startsWith('Org ')) {
        map.set(String(id), name);
      }
    });

    map.forEach((name, id) => {
      list.push({ id, name });
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [organisations, rowData, getOrgName]);
  
  // Clear selectedSubOrgId whenever activeCategory changes
  useEffect(() => {
    setSelectedSubOrgId('');
  }, [activeCategory]);

  // Default visibility for columns
  const [visibleCols, setVisibleCols] = useState({
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
  });

  const handleShowAllCols = () => {
    setVisibleCols({
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
    });
  };

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (financialYearFilter) count++;
    if (!showYearWise && monthFilter) count++;
    if (!hideOrgFilter && organisationFilter) count++;
    if (showYearWise) count++;
    return count;
  }, [financialYearFilter, monthFilter, organisationFilter, showYearWise, hideOrgFilter]);

  const handleResetFilters = () => {
    setFinancialYearFilter('');
    setMonthFilter('');
    setOrganisationFilter('');
    setShowYearWise(false);
    setSelectedSubOrgId('');
    setSearchTerm('');
    setCurrentPage(1);
    triggerNotification?.('Filters have been reset', 'info');
  };

  // Category counts computed based on current filters (except activeCategory itself)
  const categoryCounts = useMemo(() => {
    const baseFiltered = rowData.filter(row => {
      const matchesFY = financialYearFilter ? row.financial_year === financialYearFilter : true;
      const matchesMonth = monthFilter ? row.month === monthFilter : true;
      const rowOrgId = row.organisation_id ?? row.organisation;
      const matchesOrg = organisationFilter ? String(rowOrgId) === String(organisationFilter) : true;
      
      const search = searchTerm.toLowerCase();
      const orgName = getOrgName(rowOrgId).toLowerCase();
      const matchesSearch = search ? (
        orgName.includes(search) ||
        (row.financial_year || '').toLowerCase().includes(search) ||
        (row.month || '').toLowerCase().includes(search)
      ) : true;

      return matchesFY && matchesMonth && matchesOrg && matchesSearch;
    });

    return calculateCategoryCounts(baseFiltered, organisations, getOrgCategory);
  }, [rowData, financialYearFilter, monthFilter, organisationFilter, searchTerm, getOrgName, organisations]);

  // Unique list of sub-organisations belonging to the active category
  const subOrganisations = useMemo(() => {
    if (activeCategory === 'all') return [];

    const orgIds = rowData
      .filter(row => getOrgCategory(row.organisation_id ?? row.organisation, row.organisation_category_name) === activeCategory)
      .map(row => row.organisation_id ?? row.organisation);
    const uniqueIds = [...new Set(orgIds)];

    return uniqueIds
      .map(id => organisations.find(o => o.organisation_id === id))
      .filter(Boolean)
      .sort((a, b) => a.organisation_name.localeCompare(b.organisation_name));
  }, [rowData, activeCategory, organisations]);

  // Filter rowData based on user selections (handles year-wise aggregation, activeCategory and selectedSubOrgId)
  const filteredRowData = useMemo(() => {
    if (!showYearWise) {
      return rowData.filter(row => {
        const matchesFY = financialYearFilter ? row.financial_year === financialYearFilter : true;
        const matchesMonth = monthFilter ? row.month === monthFilter : true;
        const rowOrgId = row.organisation_id ?? row.organisation;
        const matchesOrg = organisationFilter ? String(rowOrgId) === String(organisationFilter) : true;
        
        // Category filter
        if (activeCategory !== 'all') {
          const cat = getOrgCategory(rowOrgId, row.organisation_category_name);
          if (cat !== activeCategory) return false;
        }

        // Sub organisation filter
        if (selectedSubOrgId && String(rowOrgId) !== String(selectedSubOrgId)) {
          return false;
        }

        const search = searchTerm.toLowerCase();
        const orgName = getOrgName(rowOrgId).toLowerCase();
        const matchesSearch = search ? (
          orgName.includes(search) ||
          (row.financial_year || '').toLowerCase().includes(search) ||
          (row.month || '').toLowerCase().includes(search)
        ) : true;

        return matchesFY && matchesMonth && matchesOrg && matchesSearch;
      });
    }

    // Group and sum all numerical fields by Financial Year + Organisation ID
    const aggregated = aggregateYearWiseData(rowData);

    return aggregated.filter(row => {
      const matchesFY = financialYearFilter ? row.financial_year === financialYearFilter : true;
      const rowOrgId = row.organisation_id ?? row.organisation;
      const matchesOrg = organisationFilter ? String(rowOrgId) === String(organisationFilter) : true;
      
      // Category filter
      if (activeCategory !== 'all') {
        const cat = getOrgCategory(rowOrgId, row.organisation_category_name, organisations);
        if (cat !== activeCategory) return false;
      }

      // Sub organisation filter
      if (selectedSubOrgId && String(rowOrgId) !== String(selectedSubOrgId)) {
        return false;
      }

      const search = searchTerm.toLowerCase();
      const orgName = getOrgName(rowOrgId).toLowerCase();
      const matchesSearch = search ? (
        orgName.includes(search) ||
        (row.financial_year || '').toLowerCase().includes(search)
      ) : true;

      return matchesFY && matchesOrg && matchesSearch;
    });
  }, [rowData, showYearWise, financialYearFilter, monthFilter, organisationFilter, searchTerm, getOrgName, activeCategory, organisations, selectedSubOrgId]);

  // Paginated records for table view
  const paginatedRowData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRowData.slice(startIndex, startIndex + pageSize);
  }, [filteredRowData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRowData.length / pageSize) || 1;

  const isOrgView = isStandardView || permissions?.isStandardView;

  // Define table columns
  const columnDefs = useMemo(() => {
    const baseCols = [
      {
        field: 'sNo',
        headerName: 'S.NO',
        minWidth: 70,
        width: 75,
        maxWidth: 80,
        pinned: 'left',
        suppressSizeToFit: true,
        headerClass: 'font-bold text-white text-center-header',
        cellClass: 'font-semibold text-slate-700 dark:text-slate-200 text-center',
        valueGetter: (params) => (params.node ? (currentPage - 1) * pageSize + params.node.rowIndex + 1 : ''),
        hide: !visibleCols.sNo
      }
    ];

    if (!isOrgView) {
      baseCols.push({
        field: 'organisation_id',
        headerName: 'ORGANISATION NAME',
        minWidth: 220,
        flex: 2,
        wrapText: true,
        autoHeight: true,
        pinned: 'left',
        headerClass: 'font-bold text-white text-center-header',
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
        valueGetter: (params) => {
          if (!params.data) return '';
          return getOrgName(params.data.organisation_id ?? params.data.organisation);
        },
        cellRenderer: (p) => (
          <div className="w-full flex items-center justify-center text-center font-bold text-slate-800 dark:text-slate-100 whitespace-normal break-words py-1.5 leading-snug">
            {p.value || '-'}
          </div>
        ),
        hide: !visibleCols.organisation
      });
    }

    baseCols.push({
      field: 'financial_year',
      headerName: 'FINANCIAL YEAR',
      minWidth: 130,
      flex: 1,
      headerClass: 'font-bold text-white text-center-header',
      cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
      hide: !visibleCols.financialYear
    });

    if (!showYearWise) {
      baseCols.push({
        field: 'month',
        headerName: 'MONTH',
        minWidth: 110,
        flex: 1,
        headerClass: 'font-bold text-white text-center-header',
        cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
        hide: !visibleCols.month
      });
    }

    let dataCols = [];

    if (activeMediaType === 'broadcast') {
      dataCols = [
        { field: 'broadcast_national', headerName: 'NATIONAL', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'broadcast_regional', headerName: 'REGIONAL', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'broadcast_overall', headerName: 'OVERALL', minWidth: 120, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'print_media' || activeMediaType === 'print') {
      dataCols = [
        { field: 'print_media_national', headerName: 'NATIONAL', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'print_media_regional', headerName: 'REGIONAL', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'print_media_overall', headerName: 'OVERALL', minWidth: 120, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'online') {
      dataCols = [
        { field: 'online_english', headerName: 'ENGLISH', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'online_vernacular', headerName: 'VERNACULAR', minWidth: 120, cellClass: 'text-center font-medium', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'online_overall', headerName: 'OVERALL', minWidth: 120, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', headerClass: 'text-center-header font-bold text-white', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'social_media' || activeMediaType === 'social') {
      const channelConfigs = [
        { key: 'facebook', label: 'FACEBOOK', visible: visibleCols.facebook },
        { key: 'instagram', label: 'INSTAGRAM', visible: visibleCols.instagram },
        { key: 'linkedIn', label: 'LINKEDIN', visible: visibleCols.linkedIn },
        { key: 'twitter', label: 'TWITTER / X', visible: visibleCols.twitter },
        { key: 'youTube', label: 'YOUTUBE', visible: visibleCols.youTube }
      ];

      channelConfigs.forEach(config => {
        if (config.visible) {
          dataCols.push({
            headerName: config.label,
            headerClass: 'font-bold text-white text-center-header',
            children: [
              {
                field: `${config.key}_posts`,
                headerName: 'NO. OF POSTS',
                minWidth: 135,
                cellClass: 'text-center font-medium',
                headerClass: 'text-center-header text-[10px] font-bold text-white',
                valueFormatter: (p) => p.value ?? 0
              },
              {
                field: `${config.key}_impression`,
                headerName: 'IMPRESSION',
                minWidth: 135,
                cellClass: 'text-center font-medium',
                headerClass: 'text-center-header text-[10px] font-bold text-white',
                valueFormatter: (p) => p.value ?? 0
              },
              {
                field: `${config.key}_engagement`,
                headerName: 'ENGAGEMENT',
                minWidth: 135,
                cellClass: 'text-center font-medium',
                headerClass: 'text-center-header text-[10px] font-bold text-white',
                valueFormatter: (p) => p.value ?? 0
              }
            ]
          });
        }
      });
    }

    const canEdit = permissions ? permissions.canEdit : true;
    const canDelete = permissions ? permissions.canRemove : true;

    if (canEdit || canDelete) {
      const actionCol = {
        headerName: 'ACTIONS',
        field: 'media_outreach_id',
        minWidth: 110,
        width: 110,
        pinned: 'right',
        suppressSizeToFit: true,
        headerClass: 'text-center-header font-bold text-white',
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
                  title="Edit Note"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete && onDelete(item)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
        hide: !visibleCols.action
      };

      return [...baseCols, ...dataCols, actionCol];
    }

    return [...baseCols, ...dataCols];
  }, [activeMediaType, getOrgName, onEdit, onDelete, visibleCols, showYearWise, permissions, isOrgView, currentPage, pageSize]);

  // Dynamic list of toggleable columns for Visibility dropdown
  const toggleableCols = useMemo(() => {
    const list = [
      { key: 'sNo', label: 'S.No' },
      ...(!isOrgView ? [{ key: 'organisation', label: 'Organization Name' }] : []),
      { key: 'financialYear', label: 'Financial Year' },
      ...(!showYearWise ? [{ key: 'month', label: 'Month' }] : [])
    ];

    if (activeMediaType === 'broadcast' || activeMediaType === 'print_media' || activeMediaType === 'print') {
      list.push(
        { key: 'national', label: 'National' },
        { key: 'regional', label: 'Regional' },
        { key: 'overall', label: 'Overall' }
      );
    } else if (activeMediaType === 'online') {
      list.push(
        { key: 'national', label: 'English' },
        { key: 'regional', label: 'Vernacular' },
        { key: 'overall', label: 'Overall' }
      );
    } else if (activeMediaType === 'social_media' || activeMediaType === 'social') {
      list.push(
        { key: 'facebook', label: 'Facebook' },
        { key: 'instagram', label: 'Instagram' },
        { key: 'linkedIn', label: 'LinkedIn' },
        { key: 'twitter', label: 'Twitter / X' },
        { key: 'youTube', label: 'YouTube' }
      );
    }

    if (permissions?.canEdit || permissions?.canRemove) {
      list.push({ key: 'action', label: 'Actions' });
    }

    return list;
  }, [activeMediaType, isOrgView, showYearWise, permissions]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: true,
    suppressMovable: true,
    flex: 1,
    wrapHeaderText: true,
    autoHeaderHeight: true
  }), []);

  // Export handlers using exportHelpers
  const handleCopy = () => {
    copyTableToClipboard({
      gridApi,
      columnDefs,
      filteredRowData,
      activeMediaType,
      getOrgName,
      showYearWise,
      isOrgView,
      triggerNotification
    });
  };

  const handleExportCSV = () => {
    exportTableCSV(gridApi, activeMediaType);
  };

  const handlePrintPDF = () => {
    printTablePDF({
      filteredRowData,
      activeMediaType,
      getOrgName,
      showYearWise,
      isOrgView
    });
  };

  return (
    <div className="space-y-4 font-sans text-black select-none">
      
      {/* KPI Card Style Tabs (Glassmorphism effect with Landmark/Anchor/Building Icons) */}
      {!isOrgView && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ministry Category Card */}
            <div
              onClick={() => {
                setActiveCategory(prev => prev === 'ministry' ? 'all' : 'ministry');
                setCurrentPage(1);
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

            {/* Major Port Category Card */}
            <div
              onClick={() => {
                setActiveCategory(prev => prev === 'major_port' ? 'all' : 'major_port');
                setCurrentPage(1);
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

            {/* Non-Port Category Card */}
            <div
              onClick={() => {
                setActiveCategory(prev => prev === 'non_port' ? 'all' : 'non_port');
                setCurrentPage(1);
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

          {/* Deep-down Organisation Selector */}
          {activeCategory !== 'all' && activeCategory !== 'ministry' && subOrganisations.length > 0 && (
            <div className={`border rounded-2xl p-5 space-y-3.5 backdrop-blur-md animate-fade-in shadow-xs transition-all duration-300 dark:bg-slate-900/10 dark:border-slate-800/80 ${
              activeCategory === 'major_port'
                ? 'bg-emerald-50/15 border-emerald-255/30 border-l-4 border-l-emerald-500'
                : activeCategory === 'ministry'
                  ? 'bg-amber-50/15 border-amber-255/30 border-l-4 border-l-amber-500'
                  : 'bg-indigo-50/15 border-indigo-255/30 border-l-4 border-l-indigo-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    activeCategory === 'major_port' ? 'bg-emerald-500 animate-pulse' : activeCategory === 'ministry' ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500 animate-pulse'
                  }`} />
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    activeCategory === 'major_port' ? 'text-emerald-700 dark:text-emerald-455' : activeCategory === 'ministry' ? 'text-amber-700 dark:text-amber-455' : 'text-indigo-700 dark:text-indigo-405'
                  }`}>
                    Filter by {activeCategory === 'major_port' ? 'Major Port' : activeCategory === 'ministry' ? 'Ministry' : 'Non-Port'} Organisation
                  </span>
                </div>
                {selectedSubOrgId && (
                  <button
                    onClick={() => {
                      setSelectedSubOrgId('');
                      setCurrentPage(1);
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
                    setSelectedSubOrgId('');
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                    !selectedSubOrgId
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm transform scale-[1.02] dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-350 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                  }`}
                >
                  All {activeCategory === 'major_port' ? 'Major Ports' : activeCategory === 'ministry' ? 'Ministries' : 'Non-Ports'}
                </button>
                {subOrganisations.map(org => {
                  const isSelected = String(org.organisation_id) === String(selectedSubOrgId);
                  let activeColorClass = 'bg-emerald-600 border-emerald-600 text-white shadow-md transform scale-[1.02]';
                  if (activeCategory === 'ministry') {
                    activeColorClass = 'bg-amber-600 border-amber-600 text-white shadow-md transform scale-[1.02]';
                  } else if (activeCategory === 'non_port') {
                    activeColorClass = 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-[1.02]';
                  }
                  
                  return (
                    <button
                      key={org.organisation_id}
                      onClick={() => {
                        setSelectedSubOrgId(prev => String(prev) === String(org.organisation_id) ? '' : org.organisation_id);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                        isSelected
                          ? activeColorClass
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

      {/* Main Container matching CSR Projects design */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Toolbar matching CSR Projects */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* Left: Dedicated Filter Button + Reset Filters */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
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

          {/* Right-aligned Tools: Search bar, Rows, Total, Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows Limit Selector */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            {/* Total Badge */}
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredRowData.length}</span>
            </div>

            {/* Visibility Column Toggle Dropdown */}
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
                        onChange={() => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              onCopy={handleCopy}
              color="#0f417a"
              hoverBg="#f1f5f9"
              triggerNotification={triggerNotification}
            />

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={handleExportCSV}
              onExportPdf={handlePrintPDF}
              fileName={`Media_Outreach_${activeMediaType}_Export`}
              title={`Media Outreach - ${activeMediaType}`}
              color="#0f417a"
              hoverColor="#1d5594"
              triggerNotification={triggerNotification}
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className={`grid grid-cols-1 ${hideOrgFilter ? 'sm:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4'} gap-3`}>
              
              {/* Financial Year Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Financial Year
                </label>
                <select
                  value={financialYearFilter}
                  onChange={(e) => {
                    setFinancialYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show All</option>
                  {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>

              {/* Month Filter */}
              <div className={showYearWise ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Month
                </label>
                <select
                  value={monthFilter}
                  disabled={showYearWise}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                >
                  <option value="">{showYearWise ? 'N/A - Year Wise' : 'Show All'}</option>
                  {!showYearWise && MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Organisation Filter */}
              {!hideOrgFilter && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Organisation
                  </label>
                  <select
                    value={organisationFilter}
                    onChange={(e) => {
                      setOrganisationFilter(e.target.value);
                      setCurrentPage(1);
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

              {/* Summary View Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Summary View
                </label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-950 w-full h-[38px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearWise(false);
                      setCurrentPage(1);
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
                      setShowYearWise(true);
                      setMonthFilter('');
                      setCurrentPage(1);
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

        {/* AG Grid Table with Integrated Pagination */}
        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedRowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
          />

          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={filteredRowData.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>
      </div>

      {/* Global CSS injection to match the table headers and cell text */}
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
