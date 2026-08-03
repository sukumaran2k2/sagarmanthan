import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import Table from './Table';
import CopyButton from './CopyButton';
import ExportDropdown from './ExportDropdown';
export default function TableWithToolbar({
  searchTerm: controlledSearchTerm,
  onSearchChange,
  visibleCols: controlledVisibleCols,
  onVisibleColsChange,
  rowData = [],
  columnDefs = [],
  defaultColDef = {},
  onGridReady,
  loading = false,
  searchPlaceholder = 'Search records...',
  exportFileName = 'export_data',
  color = '#0f417a',
  hoverColor = '#1d5594',
  triggerNotification,
  onCopy,
  onExportExcel,
  onExportPdf,
  extraLeftToolbarContent,
  extraRightToolbarContent,
  pagination = true,
  paginationPageSize = 10,
  ...props
}) {
  const [gridApi, setGridApi] = useState(null);
  const [pageSize, setPageSize] = useState(paginationPageSize);
  
  // Controlled vs Uncontrolled searchTerm state
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const isSearchControlled = controlledSearchTerm !== undefined;
  const searchTerm = isSearchControlled ? controlledSearchTerm : localSearchTerm;
  const setSearchTerm = isSearchControlled ? onSearchChange : setLocalSearchTerm;

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Close visibility dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Controlled vs Uncontrolled visibility map state
  const [localVisibleCols, setLocalVisibleCols] = useState({});
  const isVisibleColsControlled = controlledVisibleCols !== undefined;
  const visibleCols = isVisibleColsControlled ? controlledVisibleCols : localVisibleCols;
  const setVisibleCols = isVisibleColsControlled ? onVisibleColsChange : setLocalVisibleCols;

  useEffect(() => {
    if (isVisibleColsControlled) return;

    const initialMap = {};
    columnDefs.forEach(col => {
      const key = col.field || col.headerName;
      if (key) {
        initialMap[key] = col.hide ? false : true;
      }
      if (col.children) {
        col.children.forEach(child => {
          const childKey = child.field || child.headerName;
          if (childKey) {
            initialMap[childKey] = child.hide ? false : true;
          }
        });
      }
    });
    setLocalVisibleCols(initialMap);
  }, [columnDefs, isVisibleColsControlled]);

  // Compute processed columns based on visibility toggles
  const processedColumnDefs = useMemo(() => {
    return columnDefs.map(col => {
      const key = col.field || col.headerName;
      let hide = col.hide === true;
      if (key && visibleCols[key] === false) {
        hide = true;
      }

      if (col.children) {
        const processedChildren = col.children.map(child => {
          const childKey = child.field || child.headerName;
          return {
            ...child,
            hide: child.hide === true || (childKey && visibleCols[childKey] === false)
          };
        });
        // Hide parent group if all children are hidden
        const allChildrenHidden = processedChildren.every(c => c.hide);
        return {
          ...col,
          children: processedChildren,
          hide: allChildrenHidden || hide
        };
      }

      return {
        ...col,
        hide
      };
    });
  }, [columnDefs, visibleCols]);

  // Dynamic list of toggleable columns for Visibility dropdown
  const toggleableCols = useMemo(() => {
    const list = [];
    columnDefs.forEach(col => {
      // Ignore serial number or action columns in standard visibility checklists
      if (col.field === 'sNo' || col.field === 'media_outreach_id' || col.headerName === 'Update' || col.headerName === 'Action') {
        return;
      }
      const key = col.field || col.headerName;
      if (key && col.headerName) {
        list.push({ key, label: col.headerName, isGroup: !!col.children, children: col.children });
      }
    });
    return list;
  }, [columnDefs]);

  // Local filtering based on search query
  const filteredRowData = useMemo(() => {
    if (!searchTerm) return rowData;
    const lower = searchTerm.toLowerCase();
    return rowData.filter(row => {
      return Object.entries(row).some(([key, val]) => {
        // Exclude internal IDs and serials from standard search string matching
        if (key.includes('id') || key === 'sNo') return false;
        return String(val ?? '').toLowerCase().includes(lower);
      });
    });
  }, [rowData, searchTerm]);

  // Automated clipboard TSV copy handler
  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      return;
    }

    if (!gridApi) return;
    const columns = gridApi.getAllDisplayedColumns();
    const headers = columns.map(col => col.getColDef().headerName || col.getColId());
    let tsv = headers.join('\t') + '\n';

    gridApi.forEachNodeAfterFilterAndSort((node) => {
      const data = node.data;
      if (data) {
        const rowValues = columns.map(col => {
          const val = gridApi.getValue(col, node);
          return val ?? '';
        });
        tsv += rowValues.join('\t') + '\n';
      }
    });

    navigator.clipboard.writeText(tsv)
      .then(() => {
        if (triggerNotification) triggerNotification('Table data copied to clipboard!');
        else alert('Table data copied to clipboard!');
      })
      .catch(() => {
        if (triggerNotification) triggerNotification('Failed to copy table data.', 'error');
        else alert('Failed to copy table data.');
      });
  };

  const handleExportCSV = () => {
    if (onExportExcel) {
      onExportExcel();
      return;
    }
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `${exportFileName}.csv`
      });
      if (triggerNotification) triggerNotification('Exported to CSV successfully!');
    }
  };

  const handlePrintPDF = () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }
    window.print();
  };

  const handleToggleColumn = (key) => {
    setVisibleCols(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col w-full relative dark:bg-slate-950 dark:border-slate-800">
      
      {/* Integrated Toolbar header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f8fafc]/95 border-b border-slate-200 px-4 py-3 select-none dark:bg-slate-900/95 dark:border-slate-800">
        
        {/* Left Cluster: Search & Custom Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {extraLeftToolbarContent}
        </div>
 
        {/* Right Cluster: Total Rows count, Copy, Export, Column Visibility */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Rows Limit Select Dropdown */}
          {pagination && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-755 focus:outline-none cursor-pointer p-0 animate-fade-in"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="500">500</option>
              </select>
            </div>
          )}
 
          <div className="text-xs font-bold text-slate-555 uppercase tracking-wider bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
            Total Rows: {filteredRowData.length}
          </div>
          
          <CopyButton
            onCopy={handleCopy}
            color={color}
            hoverBg="#f1f5f9"
          />
          
          <ExportDropdown
            onExportExcel={handleExportCSV}
            onExportPdf={handlePrintPDF}
            color={color}
            hoverColor={hoverColor}
          />
 
          {extraRightToolbarContent}
 
          {/* Visibility Dropdown list */}
          {toggleableCols.length > 0 && (
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setColDropdownOpen(prev => !prev)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 text-slate-750 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-555" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 max-h-64 overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
                  {toggleableCols.map(col => {
                    if (col.isGroup && col.children) {
                      return (
                        <div key={col.key} className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                          <span className="block px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {col.label}
                          </span>
                          {col.children.map(child => {
                            const childKey = child.field || child.headerName;
                            return (
                              <label key={childKey} className="flex items-center space-x-2 px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-655 dark:text-slate-300 cursor-pointer select-none pl-4">
                                <input
                                  type="checkbox"
                                  checked={visibleCols[childKey] !== false}
                                  onChange={() => handleToggleColumn(childKey)}
                                  className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="capitalize">{child.headerName || child.field}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <label key={col.key} className="flex items-center space-x-2 px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={visibleCols[col.key] !== false}
                          onChange={() => handleToggleColumn(col.key)}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Styled AG Grid wrapper */}
      <div className="media-outreach-table-wrapper w-full">
        <Table
          rowData={filteredRowData}
          columnDefs={processedColumnDefs}
          defaultColDef={defaultColDef}
          onGridReady={(params) => {
            setGridApi(params.api);
            if (onGridReady) onGridReady(params);
          }}
          pagination={pagination}
          paginationPageSize={pageSize}
          loading={loading}
          enableExport={false}
          {...props}
        />
      </div>
    </div>
  );
}
