import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { Edit, Trash2, SlidersHorizontal, ChevronDown, Landmark, Anchor, Building } from 'lucide-react';
import { SOCIAL_CHANNELS_KEYS, SOCIAL_METRICS } from '../utils/constants';
import { getOrgCategory, calculateCategoryCounts } from '../utils/categoryHelpers';
import { aggregateYearWiseData } from '../utils/dataTransformers';
import { copyTableToClipboard, exportTableCSV, printTablePDF } from '../utils/exportHelpers';

export default function DataList({
  rowData,
  loading,
  activeMediaType,
  setActiveMediaType,
  mediaTabs,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  organisations,
  getOrgName,
  triggerNotification,
  isStandardView = false,
  permissions
}) {
  const hideOrgFilter = isStandardView || permissions?.isStandardView;
  const [gridApi, setGridApi] = useState(null);

  // Compute current Indian financial year (April–March)
  const currentFY = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based
    // FY starts in April (month 4); if Jan–Mar we are still in previous FY
    const fyStart = month >= 4 ? year : year - 1;
    return `${fyStart}-${fyStart + 1}`;
  }, []);

  // States for filters
  const [financialYearFilter, setFinancialYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [organisationFilter, setOrganisationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showYearWise, setShowYearWise] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'major_port' | 'ministry' | 'non_port'
  const [selectedSubOrgId, setSelectedSubOrgId] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

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

  // Set default visibility for columns depending on media type
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

  // Unique lists for filters derived from data
  const financialYears = useMemo(() => {
    const years = rowData.map(r => r.financial_year).filter(Boolean);
    return [...new Set(years)].sort();
  }, [rowData]);

  const months = useMemo(() => {
    const mList = rowData.map(r => r.month).filter(Boolean);
    return [...new Set(mList)];
  }, [rowData]);

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
  }, [rowData, activeCategory, getOrgCategory, organisations]);

  // Filter rowData based on user selections (handles year-wise summation/aggregation, activeCategory and selectedSubOrgId)
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
        headerClass: 'font-bold text-white',
        cellClass: 'font-semibold text-slate-700 dark:text-slate-200 text-center',
        valueGetter: (params) => params.node ? params.node.rowIndex + 1 : '',
        hide: !visibleCols.sNo
      },
      {
        field: 'organisation_id',
        headerName: 'ORGANISATION NAME',
        minWidth: 200,
        flex: 1.8,
        pinned: 'left',
        headerClass: 'font-bold text-white',
        cellClass: 'font-bold text-slate-800 dark:text-slate-100',
        valueGetter: (params) => {
          if (!params.data) return '';
          return getOrgName(params.data.organisation_id ?? params.data.organisation);
        },
        hide: !visibleCols.organisation
      },
      {
        field: 'financial_year',
        headerName: 'FINANCIAL YEAR',
        minWidth: 130,
        flex: 1,
        headerClass: 'font-bold text-white',
        cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
        hide: !visibleCols.financialYear
      }
    ];

    if (!showYearWise) {
      baseCols.push({
        field: 'month',
        headerName: 'MONTH',
        minWidth: 110,
        flex: 1,
        headerClass: 'font-bold text-white',
        cellClass: 'font-semibold text-slate-700 dark:text-slate-300 text-center',
        hide: !visibleCols.month
      });
    }

    let dataCols = [];

    if (activeMediaType === 'broadcast') {
      dataCols = [
        { field: 'broadcast_national', headerName: 'NATIONAL', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'broadcast_regional', headerName: 'REGIONAL', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'broadcast_overall', headerName: 'OVERALL', minWidth: 110, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'print_media') {
      dataCols = [
        { field: 'print_media_national', headerName: 'NATIONAL', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'print_media_regional', headerName: 'REGIONAL', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'print_media_overall', headerName: 'OVERALL', minWidth: 110, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'online') {
      dataCols = [
        { field: 'online_english', headerName: 'ENGLISH', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.national, valueFormatter: (p) => p.value ?? 0 },
        { field: 'online_vernacular', headerName: 'VERNACULAR', minWidth: 110, cellClass: 'text-center font-medium', hide: !visibleCols.regional, valueFormatter: (p) => p.value ?? 0 },
        { field: 'online_overall', headerName: 'OVERALL', minWidth: 110, cellClass: 'text-center font-bold text-blue-700 dark:text-blue-400', hide: !visibleCols.overall, valueFormatter: (p) => p.value ?? 0 }
      ];
    } else if (activeMediaType === 'social_media') {
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
                minWidth: 110,
                cellClass: 'text-center font-medium',
                headerClass: 'text-center-header text-[10px] font-bold text-white',
                valueFormatter: (p) => p.value ?? 0
              },
              {
                field: `${config.key}_impression`,
                headerName: 'IMPRESSION',
                minWidth: 110,
                cellClass: 'text-center font-medium',
                headerClass: 'text-center-header text-[10px] font-bold text-white',
                valueFormatter: (p) => p.value ?? 0
              },
              {
                field: `${config.key}_engagement`,
                headerName: 'ENGAGEMENT',
                minWidth: 110,
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
          return (
            <div className="flex items-center justify-center space-x-1.5">
              {canEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
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
  }, [activeMediaType, getOrgName, onEdit, onDelete, visibleCols, showYearWise, permissions]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
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
      showYearWise
    });
  };

  const handleToggleColumn = (colKey) => {
    setVisibleCols(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  };

  return (
    <div className="space-y-4 font-sans text-black select-none">
      


      {/* KPI Card Style Tabs (Glassmorphism effect with Landmark/Anchor/Building Icons) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ministry Category Card */}
        <div
          onClick={() => setActiveCategory(prev => prev === 'ministry' ? 'all' : 'ministry')}
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
          onClick={() => setActiveCategory(prev => prev === 'major_port' ? 'all' : 'major_port')}
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
          onClick={() => setActiveCategory(prev => prev === 'non_port' ? 'all' : 'non_port')}
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
                onClick={() => setSelectedSubOrgId('')}
                className="text-[10px] font-black text-[#28408f] dark:text-blue-400 hover:underline uppercase tracking-wide cursor-pointer flex items-center gap-1"
              >
                Clear Selection
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
            <button
              onClick={() => setSelectedSubOrgId('')}
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
                  onClick={() => setSelectedSubOrgId(prev => String(prev) === String(org.organisation_id) ? '' : org.organisation_id)}
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

      {/* Unified Filters Card Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 border-l-4 border-l-[#28408f] dark:bg-slate-950 dark:border-slate-800 dark:border-l-blue-500">
        
        {/* Card Header (Title & Toggle Button) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xs font-black text-[#28408f] dark:text-blue-400 uppercase tracking-wider">Outreach Reports Filters</h2>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer select-none"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-550" />
            <span>{isFiltersOpen ? 'Hide Filters' : 'Show Filters'}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${isFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Card Body (Collapsible Filter Fields Grid) */}
        {isFiltersOpen && (
          <div className={`px-5 py-4 grid grid-cols-1 ${hideOrgFilter ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-4 animate-fade-in animate-duration-300`}>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Financial Year</label>
              <select
                value={financialYearFilter}
                onChange={(e) => setFinancialYearFilter(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
              >
                <option value="">Show All</option>
                {financialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>

            <div className={`space-y-1.5 transition-all duration-300 ${showYearWise ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Month</label>
              <select
                value={monthFilter}
                disabled={showYearWise}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
              >
                <option value="">{showYearWise ? 'N/A - Year Wise' : 'Show All'}</option>
                {!showYearWise && months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {!hideOrgFilter && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Organisation</label>
                <select
                  value={organisationFilter}
                  onChange={(e) => setOrganisationFilter(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
                >
                  <option value="">Show All Organisations</option>
                  {organisationOptions.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Summary View</label>
              <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50 w-full h-[42px] dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearWise(false);
                  }}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !showYearWise
                      ? 'bg-[#28408f] dark:bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-855 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Month-Wise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowYearWise(true);
                    setMonthFilter('');
                  }}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    showYearWise
                      ? 'bg-[#28408f] dark:bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-855 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Year-Wise
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TableWithToolbar
        rowData={filteredRowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={(params) => setGridApi(params.api)}
        loading={loading}
        searchPlaceholder="Search media outreach details..."
        exportFileName={`Media_Outreach_${activeMediaType}_Export`}
        color="#0f417a"
        hoverColor="#1d5594"
        triggerNotification={triggerNotification}
        onCopy={handleCopy}
        onExportExcel={handleExportCSV}
        onExportPdf={handlePrintPDF}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
      />

      {/* Global CSS injection to match the table headers and cell text */}
      <style dangerouslySetInnerHTML={{ __html: `
        .text-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          font-weight: bold !important;
          color: white !important;
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
        .ag-theme-quartz .ag-paging-panel {
          color: #1e293b !important;
          font-weight: 700 !important;
          opacity: 1 !important;
        }
        .ag-theme-quartz .ag-paging-button {
          color: #0f417a !important;
          opacity: 1 !important;
        }
        .ag-theme-quartz .ag-paging-panel .ag-icon {
          color: #0f417a !important;
          opacity: 1 !important;
        }
        .ag-theme-quartz .ag-paging-row-summary-panel select {
          color: #1e293b !important;
          background-color: #fff !important;
          opacity: 1 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
        }
        .ag-theme-quartz select option {
          color: #1e293b !important;
          background-color: #ffffff !important;
        }
        .media-outreach-table-wrapper > div {
          margin-top: 0 !important;
        }
        .media-outreach-table-wrapper .ag-theme-quartz {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      ` }} />
    </div>
  );
}
