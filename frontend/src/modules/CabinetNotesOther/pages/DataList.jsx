import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { Search, Edit, Trash2, Filter, ChevronDown, X } from 'lucide-react';
import { fetchDropdownAllValues, fetchMinistryList } from '../api';

export default function DataList({
  rowData = [],
  loading = false,
  canEdit = true,
  canDelete = false,
  onEdit,
  onDelete,
  onRefresh,
  triggerNotification
}) {
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [gridApi, setGridApi] = useState(null);
  
  // Filter panel collapse/expand state
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility checklist dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  const [stageMasterList, setStageMasterList] = useState([]);
  const [ministryMasterList, setMinistryMasterList] = useState([]);

  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    subject: true,
    ministry: true,
    fileNumber: true,
    stage: true,
    remarks: false,
    lastUpdatedDate: false,
    actions: true
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch stage master list using /allvalue-dropdown/mmt_cabinet_ministry_stage
  useEffect(() => {
    fetchDropdownAllValues('mmt_cabinet_ministry_stage')
      .then(res => {
        const rows = res.data || [];
        setStageMasterList(rows);
      })
      .catch(err => console.error("Error fetching stage master dropdown:", err));
  }, []);

  // Fetch ministry master list using /allvalue-dropdown/mmt_ministry
  useEffect(() => {
    fetchMinistryList()
      .then(res => {
        const rows = res.data || [];
        setMinistryMasterList(rows);
      })
      .catch(err => console.error("Error fetching ministry master dropdown:", err));
  }, []);

  const cleanMinistryName = (name) => {
    if (!name) return '';
    const parts = String(name).split(',').map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(parts)).join(' / ') || String(name);
  };

  // Derive Ministry Options from /allvalue-dropdown/mmt_ministry
  const ministryOptions = useMemo(() => {
    if (ministryMasterList.length > 0) {
      return ministryMasterList
        .map(m => {
          const name = cleanMinistryName(m.ministry_name || m.name);
          return { value: name, label: name };
        })
        .filter(item => item.value)
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    const set = new Set();
    rowData.forEach(item => {
      if (item.ministry_name) set.add(cleanMinistryName(item.ministry_name));
    });
    return Array.from(set).map(m => ({ value: m, label: m })).sort((a, b) => a.label.localeCompare(b.label));
  }, [ministryMasterList, rowData]);

  // Active vs Completed sub-tabs state
  const [activeCategory, setActiveCategory] = useState('active'); // 'active' or 'completed'

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSelectedStage('');
    setCurrentPage(1);
  };

  const checkIsCompleted = (item) => {
    if (!item) return false;
    if (item.stage_id == 5) return true;
    const stName = String(item.stage_name || '').toLowerCase();
    return stName.includes('reply furnished to other ministry') || stName.includes('completed');
  };

  const { activeCount, completedCount } = useMemo(() => {
    let active = 0;
    let completed = 0;
    (rowData || []).forEach(item => {
      if (checkIsCompleted(item)) {
        completed++;
      } else {
        active++;
      }
    });
    return { activeCount: active, completedCount: completed };
  }, [rowData]);

  // Derive Stage Options: exclude "Reply Furnished to Other Ministry" / Stage 5 from stage options in active tab
  const stageOptions = useMemo(() => {
    let list = [];
    if (stageMasterList.length > 0) {
      list = stageMasterList.map(s => ({
        value: s.cab_ministry_stage_name || s.stage_name || s.name,
        label: s.cab_ministry_stage_name || s.stage_name || s.name
      })).filter(o => o.value);
    } else {
      const set = new Set();
      (rowData || []).forEach(item => {
        if (checkIsCompleted(item)) return;
        if (item.stage_name) set.add(item.stage_name);
      });
      list = Array.from(set).map(s => ({ value: s, label: s }));
    }

    return list.filter(opt => {
      const valLower = String(opt.value || '').toLowerCase();
      return !valLower.includes('reply furnished to other ministry') && !valLower.startsWith('5');
    });
  }, [rowData, stageMasterList]);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMinistry) count++;
    if (activeCategory === 'active' && selectedStage) count++;
    return count;
  }, [selectedMinistry, selectedStage, activeCategory]);

  const handleResetFilters = () => {
    setSelectedMinistry('');
    setSelectedStage('');
    setSearchTerm('');
    setCurrentPage(1);
    triggerNotification?.('Filters have been reset', 'info');
  };

  // Filter data by active/completed category and filters
  const filteredData = useMemo(() => {
    return (rowData || []).filter(item => {
      const isCompleted = checkIsCompleted(item);
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesMinistry = selectedMinistry
        ? cleanMinistryName(item.ministry_name) === selectedMinistry
        : true;

      const stageText = item.stage_name || '';
      const matchesStage = (activeCategory === 'active' && selectedStage)
        ? stageText === selectedStage
        : true;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || [
        item.subject,
        item.ministry_name,
        item.eoffice_file_number,
        item.stage_name,
        item.remarks
      ].some(val => String(val || '').toLowerCase().includes(q));

      return matchesMinistry && matchesStage && matchesSearch;
    });
  }, [rowData, selectedMinistry, selectedStage, activeCategory, searchTerm]);

  // Paginated records for table view
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  // AG Grid Column Definitions
  const columnDefs = useMemo(() => [
    {
      field: 'sNo',
      headerName: 'S.NO',
      valueGetter: (params) => (params.node ? (currentPage - 1) * pageSize + params.node.rowIndex + 1 : ''),
      width: 80,
      minWidth: 70,
      maxWidth: 90,
      pinned: 'left',
      filter: false,
      headerClass: 'text-center font-bold',
      cellClass: 'text-center flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 font-mono text-xs',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center font-bold">
          {params.value}
        </div>
      ),
      hide: !visibleCols.sNo
    },
    {
      field: 'subject',
      headerName: 'SUBJECT',
      pinned: 'left',
      minWidth: 220,
      flex: 2,
      wrapText: true,
      autoHeight: true,
      headerClass: 'text-center font-bold',
      cellClass: 'mopsw-wrap-cell flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-center',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        lineHeight: '1.4',
        padding: '8px'
      },
      cellRenderer: (params) => (
        <div className="w-full max-w-full flex items-center justify-center text-center font-bold text-slate-800 dark:text-slate-200 whitespace-normal break-words py-1 leading-snug">
          {params.value || '-'}
        </div>
      ),
      hide: !visibleCols.subject
    },
    {
      field: 'ministry_name',
      headerName: 'NAME OF THE MINISTRY',
      minWidth: 200,
      flex: 1.8,
      wrapText: true,
      autoHeight: true,
      valueGetter: (params) => cleanMinistryName(params.data?.ministry_name),
      headerClass: 'text-center font-bold',
      cellClass: 'mopsw-wrap-cell flex items-center justify-center font-medium text-slate-700 dark:text-slate-350 text-center',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        lineHeight: '1.4',
        padding: '8px'
      },
      cellRenderer: (params) => (
        <div className="w-full max-w-full flex items-center justify-center text-center font-semibold text-slate-700 dark:text-slate-300 whitespace-normal break-words py-1 leading-snug">
          {params.value || '-'}
        </div>
      ),
      hide: !visibleCols.ministry
    },
    {
      field: 'eoffice_file_number',
      headerName: 'E-OFFICE FILE NO',
      minWidth: 160,
      flex: 1.3,
      headerClass: 'text-center font-bold',
      cellClass: 'text-center flex items-center justify-center font-mono text-xs text-slate-600 dark:text-slate-400',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center font-mono text-xs text-slate-600 dark:text-slate-400">
          {params.value || '-'}
        </div>
      ),
      hide: !visibleCols.fileNumber
    },
    {
      field: 'stage_name',
      headerName: 'STAGE',
      minWidth: 180,
      flex: 1.5,
      headerClass: 'text-center font-bold',
      cellClass: 'text-center flex items-center justify-center font-semibold',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
      valueGetter: (params) => params.data?.stage_name || '-',
      cellRenderer: (params) => {
        const rawVal = String(params.value || '').trim();
        const upperVal = rawVal.toUpperCase();
        const isCompleted = upperVal.includes('REPLY FURNISHED');
        const color = isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-[#0f417a] dark:text-blue-400 font-extrabold';
        return (
          <div className="w-full flex items-center justify-center text-center font-bold">
            <span className={`${color} text-xs uppercase tracking-wider text-center`}>
              {upperVal || '-'}
            </span>
          </div>
        );
      },
      hide: !visibleCols.stage
    },
    {
      field: 'remarks',
      headerName: 'REMARKS',
      minWidth: 150,
      flex: 1.2,
      wrapText: true,
      autoHeight: true,
      valueGetter: (params) => params.data?.remarks || '-',
      headerClass: 'text-center font-bold',
      cellClass: 'mopsw-wrap-cell flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 text-center',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        lineHeight: '1.4',
        padding: '8px'
      },
      cellRenderer: (params) => (
        <div className="w-full max-w-full flex items-center justify-center text-center text-xs text-slate-600 dark:text-slate-400 whitespace-normal break-words py-1 leading-snug">
          {params.value || '-'}
        </div>
      ),
      hide: !visibleCols.remarks
    },
    {
      field: 'updated_date',
      headerName: 'LAST UPDATED DATE',
      minWidth: 130,
      flex: 1,
      headerClass: 'text-center font-bold',
      cellClass: 'text-center flex items-center justify-center text-slate-600 dark:text-slate-400 font-mono text-xs',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
      valueGetter: (params) => {
        const item = params.data;
        if (!item) return '-';
        const rawDate = item.updated_date || item.updatedAt || item.updated_at;
        if (!rawDate) return '-';
        try {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) return String(rawDate).split('T')[0];
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch {
          return String(rawDate).split('T')[0];
        }
      },
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center text-slate-600 dark:text-slate-400 font-mono text-xs">
          {params.value || '-'}
        </div>
      ),
      hide: !visibleCols.lastUpdatedDate
    },
    {
      headerName: 'ACTIONS',
      field: 'actions',
      minWidth: 110,
      pinned: 'right',
      headerClass: 'text-center font-bold',
      cellClass: 'text-center flex items-center justify-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      hide: !visibleCols.actions,
      cellRenderer: (params) => {
        const note = params.data;
        if (!note) return null;
        return (
          <div className="flex items-center justify-center w-full h-full space-x-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(note)}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-500 hover:text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                title="Update Note"
              >
                <Edit className="h-4.5 w-4.5" />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(note)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                title="Delete Note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [onEdit, onDelete, canEdit, canDelete, visibleCols, currentPage, pageSize]);

  const toggleableCols = useMemo(() => [
    { key: 'sNo', label: 'S.No' },
    { key: 'subject', label: 'Subject' },
    { key: 'ministry', label: 'Name of Ministry' },
    { key: 'fileNumber', label: 'File Number' },
    { key: 'stage', label: 'Stage' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'lastUpdatedDate', label: 'Last Updated Date' },
    ...(canEdit || (canDelete && onDelete) ? [{ key: 'actions', label: 'Actions' }] : [])
  ], [canEdit, canDelete, onDelete]);

  const handleShowAllCols = () => {
    setVisibleCols({
      sNo: true,
      subject: true,
      ministry: true,
      fileNumber: true,
      stage: true,
      remarks: true,
      lastUpdatedDate: true,
      actions: true
    });
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: true,
    suppressMovable: true,
    flex: 1,
    wrapHeaderText: true,
    autoHeaderHeight: true
  }), []);

  // Copy to clipboard handler
  const handleCopy = () => {
    let tsv = '';
    const activeCols = columnDefs.filter(c => c.headerName && c.headerName !== 'ACTIONS' && !c.hide);
    tsv += activeCols.map(c => c.headerName).join('\t') + '\n';

    filteredData.forEach((row, rowIndex) => {
      const line = activeCols.map(col => {
        if (col.field === 'sNo' || col.headerName === 'S.NO') {
          return rowIndex + 1;
        }
        if (col.valueGetter && typeof col.valueGetter === 'function') {
          return col.valueGetter({ data: row, node: { rowIndex } });
        }
        return row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '-';
      });
      tsv += line.join('\t') + '\n';
    });

    navigator.clipboard.writeText(tsv)
      .then(() => {
        if (triggerNotification) triggerNotification('Table data copied to clipboard!', 'success');
        else alert('Table data copied to clipboard!');
      })
      .catch(() => {
        if (triggerNotification) triggerNotification('Failed to copy table data.', 'error');
        else alert('Failed to copy table data.');
      });
  };

  // Export handlers
  const handleExport = (type) => {
    if (type === 'Excel') {
      const activeCols = columnDefs.filter(c => c.headerName && c.headerName !== 'ACTIONS' && !c.hide);
      let csvContent = '\uFEFF';
      csvContent += activeCols.map(c => `"${c.headerName}"`).join(',') + '\r\n';

      filteredData.forEach((row, rowIndex) => {
        const line = activeCols.map(col => {
          let val = '';
          if (col.field === 'sNo' || col.headerName === 'S.NO') {
            val = rowIndex + 1;
          } else if (col.valueGetter && typeof col.valueGetter === 'function') {
            val = col.valueGetter({ data: row, node: { rowIndex } });
          } else {
            val = row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '';
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvContent += line.join(',') + '\r\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Cabinet_Notes_Other_Ministry_Register_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (triggerNotification) {
        triggerNotification(`Register data exported to Excel (CSV) successfully!`, 'success');
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`, 'info');
      }

      const printWindow = window.open('', '_blank');
      const title = 'Cabinet Notes - Other Ministry Data List';

      const activeCols = columnDefs.filter(c => c.headerName && c.headerName !== 'ACTIONS' && !c.hide);
      let headersHtml = '';
      activeCols.forEach(col => {
        headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #0f417a; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
      });

      let rowsHtml = '';
      filteredData.forEach((row, rowIndex) => {
        const bg = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        rowsHtml += `<tr style="background-color: ${bg};">`;
        activeCols.forEach(col => {
          let val = '';
          if (col.field === 'sNo' || col.headerName === 'S.NO') {
            val = rowIndex + 1;
          } else if (col.valueGetter && typeof col.valueGetter === 'function') {
            val = col.valueGetter({ data: row, node: { rowIndex } });
          } else {
            val = row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '-';
          }
          rowsHtml += `<td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 11px;">${val}</td>`;
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 5px; color: #0f417a; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headersHtml}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Category Sub-tabs (Active Notes vs Completed Notes) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
        <button
          onClick={() => handleCategoryChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'active'
              ? 'border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          ACTIVE NOTES ({activeCount})
        </button>
        <button
          onClick={() => handleCategoryChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          COMPLETED NOTES ({completedCount})
        </button>
      </div>

      {/* Main Container Card matching CSR Projects format */}
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
                placeholder="Search Subject, File No, Ministry..."
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
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredData.length}</span>
            </div>

            {/* Visibility Column Toggle Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
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
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              fileName="Cabinet_Notes_Other_Ministry_Register_export"
              title="Cabinet Notes - Other Ministry Register"
              color="#0f417a"
              hoverColor="#1d5594"
              triggerNotification={triggerNotification}
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3">
              
              {/* Ministry Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Name of the Ministry
                </label>
                <select
                  value={selectedMinistry}
                  onChange={(e) => {
                    setSelectedMinistry(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Ministries ({ministryOptions.length})</option>
                  {ministryOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Stage
                </label>
                <select
                  value={selectedStage}
                  disabled={activeCategory === 'completed'}
                  onChange={(e) => {
                    setSelectedStage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                >
                  <option value="">{activeCategory === 'completed' ? 'N/A - Completed' : 'All Stages'}</option>
                  {activeCategory === 'active' && stageOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* AG Grid Table with Integrated Pagination */}
        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedData}
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
            totalRows={filteredData.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>
      </div>
    </div>
  );
}
