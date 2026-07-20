import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Table from '../../../components/table';
import { Pencil, ChevronDown, Copy, FileSpreadsheet, FileText, LayoutGrid } from 'lucide-react';
import CopyButton from '../../../components/CopyButton';

const SOCIAL_CHANNELS = ['facebook', 'instagram', 'linkedIn', 'twitter', 'youTube'];
const SOCIAL_METRICS = ['posts', 'engagement', 'impression']; // Ordered as shown in screenshot

export default function DataList({
  rowData,
  loading,
  activeMediaType,
  setActiveMediaType,
  mediaTabs,
  onEdit,
  onAddNew,
  onRefresh,
  organisations,
  getOrgName
}) {
  const [gridApi, setGridApi] = useState(null);

  // States for filters
  const [financialYearFilter, setFinancialYearFilter] = useState('');
  const [organisationFilter, setOrganisationFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showYearWise, setShowYearWise] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'major_port' | 'ministry' | 'non_port'
  const [selectedSubOrgId, setSelectedSubOrgId] = useState('');
  
  // Clear selectedSubOrgId whenever activeCategory changes
  useEffect(() => {
    setSelectedSubOrgId('');
  }, [activeCategory]);
  
  // Column visibility checklist dropdown states
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Helper mapping: resolves dynamic organisation ID to its specific category based on DB category or name
  const getOrgCategory = useCallback((orgId) => {
    const org = organisations.find(o => o.organisation_id === orgId);
    if (!org) return 'non_port';
    const name = org.organisation_name.toLowerCase();
    
    // Major Ports: category_id = 1 or containing specific port tags
    if (
      org.organisation_category_id === 1 ||
      name.includes('port authority') ||
      name.includes('port limited') ||
      name.includes('mookeerjii port') ||
      name.includes('dock system') ||
      name.includes('dock complex') ||
      name.includes('vadhavan port')
    ) {
      return 'major_port';
    }
    
    // Ministry: containing 'ministry' or specific IDs
    if (
      name.includes('ministry of') ||
      org.organisation_id === 14 ||
      org.organisation_id === 49
    ) {
      return 'ministry';
    }
    
    // Non Port Organisations
    return 'non_port';
  }, [organisations]);

  // Category counts computed based on current filters (except activeCategory itself)
  const categoryCounts = useMemo(() => {
    const baseFiltered = rowData.filter(row => {
      const matchesFY = financialYearFilter ? row.financial_year === financialYearFilter : true;
      const matchesOrg = organisationFilter ? String(row.organisation_id) === String(organisationFilter) : true;
      const matchesMonth = monthFilter ? row.month === monthFilter : true;
      
      const search = searchTerm.toLowerCase();
      const orgName = getOrgName(row.organisation_id).toLowerCase();
      const matchesSearch = search ? (
        orgName.includes(search) ||
        (row.financial_year || '').toLowerCase().includes(search) ||
        (row.month || '').toLowerCase().includes(search)
      ) : true;

      return matchesFY && matchesOrg && matchesMonth && matchesSearch;
    });

    let majorPort = 0;
    let ministry = 0;
    let nonPort = 0;

    baseFiltered.forEach(row => {
      const cat = getOrgCategory(row.organisation_id);
      if (cat === 'major_port') majorPort++;
      else if (cat === 'ministry') ministry++;
      else nonPort++;
    });

    return { majorPort, ministry, nonPort };
  }, [rowData, financialYearFilter, organisationFilter, monthFilter, searchTerm, getOrgName, getOrgCategory]);

  // Unique list of sub-organisations belonging to the active category
  const subOrganisations = useMemo(() => {
    if (activeCategory === 'all') return [];

    const orgIds = rowData
      .filter(row => getOrgCategory(row.organisation_id) === activeCategory)
      .map(row => row.organisation_id);
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
        const matchesOrg = organisationFilter ? String(row.organisation_id) === String(organisationFilter) : true;
        const matchesMonth = monthFilter ? row.month === monthFilter : true;
        
        // Category filter
        if (activeCategory !== 'all') {
          const cat = getOrgCategory(row.organisation_id);
          if (cat !== activeCategory) return false;
        }

        // Sub organisation filter
        if (selectedSubOrgId && String(row.organisation_id) !== String(selectedSubOrgId)) {
          return false;
        }

        const search = searchTerm.toLowerCase();
        const orgName = getOrgName(row.organisation_id).toLowerCase();
        const matchesSearch = search ? (
          orgName.includes(search) ||
          (row.financial_year || '').toLowerCase().includes(search) ||
          (row.month || '').toLowerCase().includes(search)
        ) : true;

        return matchesFY && matchesOrg && matchesMonth && matchesSearch;
      });
    }

    // Group and sum all numerical fields by Financial Year + Organisation ID
    const groups = {};
    rowData.forEach(row => {
      const key = `${row.financial_year}_${row.organisation_id}`;
      if (!groups[key]) {
        groups[key] = {
          financial_year: row.financial_year,
          organisation_id: row.organisation_id,
          broadcast_national: 0,
          broadcast_regional: 0,
          broadcast_overall: 0,
          print_media_national: 0,
          print_media_regional: 0,
          print_media_overall: 0,
          online_english: 0,
          online_vernacular: 0,
          online_overall: 0,
          // Social media post, engagement, impression counts
          twitter_posts: 0, twitter_impression: 0, twitter_engagement: 0,
          instagram_posts: 0, instagram_impression: 0, instagram_engagement: 0,
          facebook_posts: 0, facebook_impression: 0, facebook_engagement: 0,
          linkedIn_posts: 0, linkedIn_impression: 0, linkedIn_engagement: 0,
          youTube_posts: 0, youTube_impression: 0, youTube_engagement: 0,
          media_outreach_id: `yearwise_${row.financial_year}_${row.organisation_id}`
        };
      }

      groups[key].broadcast_national += row.broadcast_national || 0;
      groups[key].broadcast_regional += row.broadcast_regional || 0;
      groups[key].broadcast_overall += row.broadcast_overall || 0;

      groups[key].print_media_national += row.print_media_national || 0;
      groups[key].print_media_regional += row.print_media_regional || 0;
      groups[key].print_media_overall += row.print_media_overall || 0;

      groups[key].online_english += row.online_english || 0;
      groups[key].online_vernacular += row.online_vernacular || 0;
      groups[key].online_overall += row.online_overall || 0;

      SOCIAL_CHANNELS.forEach(ch => {
        groups[key][`${ch}_posts`] += row[`${ch}_posts`] || 0;
        groups[key][`${ch}_impression`] += row[`${ch}_impression`] || 0;
        groups[key][`${ch}_engagement`] += row[`${ch}_engagement`] || 0;
      });
    });

    return Object.values(groups).filter(row => {
      const matchesFY = financialYearFilter ? row.financial_year === financialYearFilter : true;
      const matchesOrg = organisationFilter ? String(row.organisation_id) === String(organisationFilter) : true;
      
      // Category filter
      if (activeCategory !== 'all') {
        const cat = getOrgCategory(row.organisation_id);
        if (cat !== activeCategory) return false;
      }

      // Sub organisation filter
      if (selectedSubOrgId && String(row.organisation_id) !== String(selectedSubOrgId)) {
        return false;
      }

      const search = searchTerm.toLowerCase();
      const orgName = getOrgName(row.organisation_id).toLowerCase();
      const matchesSearch = search ? (
        orgName.includes(search) ||
        (row.financial_year || '').toLowerCase().includes(search)
      ) : true;

      return matchesFY && matchesOrg && matchesSearch;
    });
  }, [rowData, showYearWise, financialYearFilter, organisationFilter, monthFilter, searchTerm, getOrgName, activeCategory, organisations, selectedSubOrgId, getOrgCategory]);

  // Define table columns
  const columnDefs = useMemo(() => {
    const baseCols = [
      {
        headerName: 'S No',
        valueGetter: 'node.rowIndex + 1',
        width: 80,
        pinned: 'left',
        suppressSizeToFit: true,
        headerClass: 'text-center-header font-bold text-white',
        cellStyle: { color: '#000000', fontWeight: '500', textAlign: 'center' },
        hide: !visibleCols.sNo
      },
      {
        headerName: 'Organisation',
        field: 'organisation_id',
        minWidth: 260,
        headerClass: 'text-center-header font-bold text-white',
        valueFormatter: (params) => getOrgName(params.value),
        cellStyle: { color: '#000000', textAlign: 'center' },
        hide: !visibleCols.organisation
      },
      {
        headerName: 'Financial Year',
        field: 'financial_year',
        minWidth: 140,
        headerClass: 'text-center-header font-bold text-white',
        cellStyle: { color: '#000000', textAlign: 'center' },
        hide: !visibleCols.financialYear
      },
      {
        headerName: 'Month',
        field: 'month',
        minWidth: 120,
        headerClass: 'text-center-header font-bold text-white',
        cellStyle: { color: '#000000', textAlign: 'center' },
        hide: showYearWise || !visibleCols.month
      },
    ];

    let dataCols = [];

    if (activeMediaType === 'broadcast') {
      dataCols = [
        { headerName: 'National', field: 'broadcast_national', minWidth: 120, hide: !visibleCols.national },
        { headerName: 'Regional', field: 'broadcast_regional', minWidth: 120, hide: !visibleCols.regional },
        { headerName: 'Overall', field: 'broadcast_overall', minWidth: 120, hide: !visibleCols.overall },
      ];
    } else if (activeMediaType === 'print_media') {
      dataCols = [
        { headerName: 'National', field: 'print_media_national', minWidth: 120, hide: !visibleCols.national },
        { headerName: 'Regional', field: 'print_media_regional', minWidth: 120, hide: !visibleCols.regional },
        { headerName: 'Overall', field: 'print_media_overall', minWidth: 120, hide: !visibleCols.overall },
      ];
    } else if (activeMediaType === 'online') {
      dataCols = [
        { headerName: 'English', field: 'online_english', minWidth: 120, hide: !visibleCols.national },
        { headerName: 'Vernacular', field: 'online_vernacular', minWidth: 120, hide: !visibleCols.regional },
        { headerName: 'Overall', field: 'online_overall', minWidth: 120, hide: !visibleCols.overall },
      ];
    } else if (activeMediaType === 'social_media') {
      SOCIAL_CHANNELS.forEach(channel => {
        const label = channel === 'youTube' ? 'YouTube' : channel === 'linkedIn' ? 'LinkedIn' : channel.charAt(0).toUpperCase() + channel.slice(1);
        const isChannelVisible = visibleCols[channel];
        
        dataCols.push({
          headerName: label,
          headerClass: 'text-center-header font-bold text-white',
          marryChildren: true,
          hide: !isChannelVisible,
          children: SOCIAL_METRICS.map(metric => ({
            headerName: metric.charAt(0).toUpperCase() + metric.slice(1),
            field: `${channel}_${metric}`,
            minWidth: 110,
            headerClass: 'text-center-header font-bold text-white',
            cellStyle: { color: '#000000', textAlign: 'center' },
            valueFormatter: (params) => params.value ?? '0',
          }))
        });
      });
    }

    // Style flat data columns (non-grouped)
    if (activeMediaType !== 'social_media') {
      dataCols = dataCols.map(col => ({
        ...col,
        headerClass: 'text-center-header font-bold text-white',
        cellStyle: { color: '#000000', textAlign: 'center' },
        valueFormatter: (params) => params.value ?? '0',
      }));
    }

    // Action column (Update) matching orange pencil button from screenshot
    const actionCol = {
      headerName: 'Update',
      field: 'media_outreach_id',
      width: 100,
      pinned: 'right',
      suppressSizeToFit: true,
      headerClass: 'text-center-header font-bold text-white',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params) => (
        <button
          onClick={() => onEdit(params.data)}
          className="p-1.5 bg-[#f0ad4e] hover:bg-[#ec971f] text-white rounded transition cursor-pointer border border-[#d58512]"
          title="Update"
          style={{ width: '32px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Pencil className="h-4 w-4 text-white" />
        </button>
      ),
      hide: showYearWise || !visibleCols.action
    };

    return [...baseCols, ...dataCols, actionCol];
  }, [activeMediaType, getOrgName, onEdit, visibleCols, showYearWise]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
  }), []);

  // Export handlers
  const handleCopy = () => {
    if (!gridApi) return;
    let tsv = '';
    // Flattened headers for Copy
    const headers = [];
    columnDefs.forEach(c => {
      if (c.children) {
        c.children.forEach(ch => {
          headers.push(`${c.headerName} - ${ch.headerName}`);
        });
      } else if (c.headerName) {
        headers.push(c.headerName);
      }
    });
    tsv += headers.join('\t') + '\n';
    
    // Rows
    filteredRowData.forEach((row, idx) => {
      const line = [
        idx + 1,
        getOrgName(row.organisation_id),
        row.financial_year
      ];
      if (!showYearWise) {
        line.push(row.month);
      }
      if (activeMediaType === 'broadcast') {
        line.push(row.broadcast_national ?? 0, row.broadcast_regional ?? 0, row.broadcast_overall ?? 0);
      } else if (activeMediaType === 'print_media') {
        line.push(row.print_media_national ?? 0, row.print_media_regional ?? 0, row.print_media_overall ?? 0);
      } else if (activeMediaType === 'online') {
        line.push(row.online_english ?? 0, row.online_vernacular ?? 0, row.online_overall ?? 0);
      } else if (activeMediaType === 'social_media') {
        SOCIAL_CHANNELS.forEach(channel => {
          SOCIAL_METRICS.forEach(metric => {
            line.push(row[`${channel}_${metric}`] ?? 0);
          });
        });
      }
      tsv += line.join('\t') + '\n';
    });

    navigator.clipboard.writeText(tsv)
      .then(() => alert('Table data copied to clipboard!'))
      .catch(() => alert('Failed to copy table data.'));
  };

  const handleExportCSV = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        marryChildren: true,
        fileName: `Media_Outreach_${activeMediaType}_Export.csv`
      });
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    const title = `Media Outreach - ${activeMediaType === 'broadcast' ? 'Broadcast' : activeMediaType === 'print_media' ? 'Print Media' : activeMediaType === 'online' ? 'Online' : 'Social Media'}`;
    
    let tableHeaders = `<th>S.No</th><th>Organisation</th><th>Financial Year</th>${showYearWise ? '' : '<th>Month</th>'}`;
    if (activeMediaType === 'broadcast') {
      tableHeaders += '<th>National</th><th>Regional</th><th>Overall</th>';
    } else if (activeMediaType === 'print_media') {
      tableHeaders += '<th>National</th><th>Regional</th><th>Overall</th>';
    } else if (activeMediaType === 'online') {
      tableHeaders += '<th>English</th><th>Vernacular</th><th>Overall</th>';
    } else if (activeMediaType === 'social_media') {
      SOCIAL_CHANNELS.forEach(ch => {
        const label = ch.charAt(0).toUpperCase() + ch.slice(1);
        SOCIAL_METRICS.forEach(m => {
          tableHeaders += `<th>${label} ${m}</th>`;
        });
      });
    }

    let tableRows = '';
    filteredRowData.forEach((row, idx) => {
      tableRows += '<tr>';
      tableRows += `<td>${idx + 1}</td>`;
      tableRows += `<td>${getOrgName(row.organisation_id)}</td>`;
      tableRows += `<td>${row.financial_year || ''}</td>`;
      if (!showYearWise) {
        tableRows += `<td>${row.month || ''}</td>`;
      }
      
      if (activeMediaType === 'broadcast') {
        tableRows += `<td>${row.broadcast_national ?? 0}</td><td>${row.broadcast_regional ?? 0}</td><td>${row.broadcast_overall ?? 0}</td>`;
      } else if (activeMediaType === 'print_media') {
        tableRows += `<td>${row.print_media_national ?? 0}</td><td>${row.print_media_regional ?? 0}</td><td>${row.print_media_overall ?? 0}</td>`;
      } else if (activeMediaType === 'online') {
        tableRows += `<td>${row.online_english ?? 0}</td><td>${row.online_vernacular ?? 0}</td><td>${row.online_overall ?? 0}</td>`;
      } else if (activeMediaType === 'social_media') {
        SOCIAL_CHANNELS.forEach(ch => {
          SOCIAL_METRICS.forEach(m => {
            tableRows += `<td>${row[`${ch}_${m}`] ?? 0}</td>`;
          });
        });
      }
      tableRows += '</tr>';
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0f417a; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 12px; color: #000; }
            th { background-color: #0f417a; color: white; }
          </style>
        </head>
        <body onload="window.print()">
          <h1>${title}</h1>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleToggleColumn = (colKey) => {
    setVisibleCols(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  };

  return (
    <div className="space-y-4 font-sans text-black select-none">
      


      {/* KPI Card Style Tabs (Glassmorphism effect) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Major Port Category Card */}
        <div
          onClick={() => setActiveCategory(prev => prev === 'major_port' ? 'all' : 'major_port')}
          className={`flex items-center justify-between p-4.5 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
            activeCategory === 'major_port'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30 text-emerald-900 transform scale-[1.01]'
              : 'bg-white/45 hover:bg-slate-50/50 text-slate-700 border-slate-200/60 shadow-sm'
          }`}
        >
          <div className="space-y-0.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeCategory === 'major_port' ? 'text-emerald-700' : 'text-slate-400'}`}>
              Category
            </span>
            <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'major_port' ? 'text-emerald-900' : 'text-slate-800'}`}>
              Major Port Organisations
            </h3>
          </div>
          <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
            activeCategory === 'major_port'
              ? 'bg-emerald-600 text-white shadow-sm scale-105'
              : 'bg-slate-100/80 text-slate-600 border border-slate-200/50'
          }`}>
            {categoryCounts.majorPort}
          </div>
        </div>

        {/* Ministry Category Card */}
        <div
          onClick={() => setActiveCategory(prev => prev === 'ministry' ? 'all' : 'ministry')}
          className={`flex items-center justify-between p-4.5 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
            activeCategory === 'ministry'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30 text-amber-900 transform scale-[1.01]'
              : 'bg-white/45 hover:bg-slate-50/50 text-slate-700 border-slate-200/60 shadow-sm'
          }`}
        >
          <div className="space-y-0.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeCategory === 'ministry' ? 'text-amber-700' : 'text-slate-400'}`}>
              Category
            </span>
            <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'ministry' ? 'text-amber-900' : 'text-slate-800'}`}>
              Ministry
            </h3>
          </div>
          <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
            activeCategory === 'ministry'
              ? 'bg-amber-600 text-white shadow-sm scale-105'
              : 'bg-slate-100/80 text-slate-600 border border-slate-200/50'
          }`}>
            {categoryCounts.ministry}
          </div>
        </div>

        {/* Non-Port Category Card */}
        <div
          onClick={() => setActiveCategory(prev => prev === 'non_port' ? 'all' : 'non_port')}
          className={`flex items-center justify-between p-4.5 border rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md ${
            activeCategory === 'non_port'
              ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/30 text-indigo-900 transform scale-[1.01]'
              : 'bg-white/45 hover:bg-slate-50/50 text-slate-700 border-slate-200/60 shadow-sm'
          }`}
        >
          <div className="space-y-0.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeCategory === 'non_port' ? 'text-indigo-700' : 'text-slate-400'}`}>
              Category
            </span>
            <h3 className={`text-sm font-bold tracking-wide ${activeCategory === 'non_port' ? 'text-indigo-900' : 'text-slate-800'}`}>
              Non-Port Organisations
            </h3>
          </div>
          <div className={`text-sm font-extrabold font-mono px-3.5 py-1.5 rounded-lg transition-all duration-300 ${
            activeCategory === 'non_port'
              ? 'bg-indigo-600 text-white shadow-sm scale-105'
              : 'bg-slate-100/80 text-slate-600 border border-slate-200/50'
          }`}>
            {categoryCounts.nonPort}
          </div>
        </div>
      </div>

      {/* Deep-down Organisation Selector */}
      {activeCategory !== 'all' && subOrganisations.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4.5 space-y-2.5 backdrop-blur-sm animate-fade-in shadow-sm animate-duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Filter by {activeCategory === 'major_port' ? 'Major Port' : activeCategory === 'ministry' ? 'Ministry' : 'Non-Port'} Organisation
            </span>
            {selectedSubOrgId && (
              <button
                onClick={() => setSelectedSubOrgId('')}
                className="text-[10px] font-extrabold text-[#28408f] hover:underline uppercase tracking-wide cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedSubOrgId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                !selectedSubOrgId
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All {activeCategory === 'major_port' ? 'Major Ports' : activeCategory === 'ministry' ? 'Ministries' : 'Non-Ports'}
            </button>
            {subOrganisations.map(org => {
              const isSelected = String(org.organisation_id) === String(selectedSubOrgId);
              let activeColorClass = 'bg-emerald-600 border-emerald-600 text-white shadow-sm';
              if (activeCategory === 'ministry') {
                activeColorClass = 'bg-amber-600 border-amber-600 text-white shadow-sm';
              } else if (activeCategory === 'non_port') {
                activeColorClass = 'bg-indigo-600 border-indigo-600 text-white shadow-sm';
              }
              
              return (
                <button
                  key={org.organisation_id}
                  onClick={() => setSelectedSubOrgId(prev => String(prev) === String(org.organisation_id) ? '' : org.organisation_id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? activeColorClass
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {org.organisation_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Box (Fully open, styled exactly like the screenshots) */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 border-l-4 border-l-[#28408f]">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Financial Year</label>
          <select
            value={financialYearFilter}
            onChange={(e) => setFinancialYearFilter(e.target.value)}
            className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-355 rounded focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer"
          >
            <option value="">Show All</option>
            {financialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Organisation</label>
          <select
            value={organisationFilter}
            onChange={(e) => setOrganisationFilter(e.target.value)}
            className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-355 rounded focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer"
          >
            <option value="">--Show All Organisation--</option>
            {organisations.map(o => (
              <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
            ))}
          </select>
        </div>
        {!showYearWise ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Month</label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showYearWise}
                  onChange={(e) => {
                    setShowYearWise(e.target.checked);
                    if (e.target.checked) setMonthFilter('');
                  }}
                  className="h-3.5 w-3.5 text-[#28408f] focus:ring-[#28408f] border-gray-300 rounded cursor-pointer"
                />
                <span className="text-[10px] font-extrabold text-[#28408f] uppercase tracking-wide">Year Wise</span>
              </label>
            </div>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-355 rounded focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer"
            >
              <option value="">Show All</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : (
          <div className="space-y-1 flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg shadow-sm">
              <input
                type="checkbox"
                checked={showYearWise}
                onChange={(e) => {
                  setShowYearWise(e.target.checked);
                  if (e.target.checked) setMonthFilter('');
                }}
                className="h-4 w-4 text-[#28408f] focus:ring-[#28408f] border-gray-300 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-[#28408f] uppercase tracking-wide">Year-Wise Summary Enabled</span>
            </label>
          </div>
        )}
      </div>

      {/* Toolbar: Export options and search box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 bg-[#f8fafc] px-4 py-2.5 rounded-lg">
        <div className="flex flex-wrap gap-1.5">
          <CopyButton
            onCopy={handleCopy}
            color="#1e293b"
            hoverBg="#e2e8f0"
            className="!py-1.5 !px-3 bg-[#e2e8f0] border-slate-300 text-slate-800 rounded font-semibold transition"
          />
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#e2e8f0] text-black border border-slate-300 text-xs font-semibold hover:bg-slate-300 transition rounded cursor-pointer"
          >
            Excel
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3 py-1.5 bg-[#e2e8f0] text-black border border-slate-300 text-xs font-semibold hover:bg-slate-300 transition rounded cursor-pointer"
          >
            PDF
          </button>

          {/* Column visibility dropdown */}
          <div className="relative inline-block" ref={colDropdownRef}>
            <button
              onClick={() => setColDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e2e8f0] text-black border border-slate-300 text-xs font-semibold hover:bg-slate-300 transition rounded cursor-pointer"
            >
              <span>Column visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {colDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded shadow-xl z-20 py-1.5">
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={visibleCols.sNo} onChange={() => handleToggleColumn('sNo')} />
                  <span>S.No</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={visibleCols.organisation} onChange={() => handleToggleColumn('organisation')} />
                  <span>Organisation</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={visibleCols.financialYear} onChange={() => handleToggleColumn('financialYear')} />
                  <span>Financial Year</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={visibleCols.month} onChange={() => handleToggleColumn('month')} />
                  <span>Month</span>
                </label>

                {activeMediaType === 'social_media' ? (
                  SOCIAL_CHANNELS.map(ch => (
                    <label key={ch} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                      <input type="checkbox" checked={visibleCols[ch]} onChange={() => handleToggleColumn(ch)} />
                      <span>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                    </label>
                  ))
                ) : (
                  <>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                      <input type="checkbox" checked={visibleCols.national} onChange={() => handleToggleColumn('national')} />
                      <span>{activeMediaType === 'online' ? 'English' : 'National'}</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                      <input type="checkbox" checked={visibleCols.regional} onChange={() => handleToggleColumn('regional')} />
                      <span>{activeMediaType === 'online' ? 'Vernacular' : 'Regional'}</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                      <input type="checkbox" checked={visibleCols.overall} onChange={() => handleToggleColumn('overall')} />
                      <span>Overall</span>
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search bar on the right */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <span className="text-xs font-semibold text-slate-700">Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-350 rounded text-xs focus:outline-none focus:border-[#28408f] font-semibold bg-white text-black"
            placeholder=""
          />
        </div>
      </div>

      {/* Styled AG Grid using reusable Table component */}
      <Table
        rowData={filteredRowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={(params) => setGridApi(params.api)}
        pagination={true}
        paginationPageSize={10}
        loading={loading}
        enableExport={false}
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
      ` }} />
    </div>
  );
}
