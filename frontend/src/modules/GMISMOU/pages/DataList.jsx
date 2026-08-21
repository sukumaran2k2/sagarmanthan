import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Edit, Eye, Search, X, List, BarChart3, Building2, ChevronDown, Sparkles 
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import GMISDetailView from '../components/GMISDetailView';
import { fetchGmisMouPaginated, fetchOrganisations, fetchMouCategoryNames } from '../api';

const EVENT_FILTER_OPTIONS = [
  'All Summits',
  'GMIS 2025',
  'IMW 2025',
  'GMIS 2023',
  'GMIS 2021'
];

export default function GMISDataList({
  onEdit,
  onAddNew,
  triggerNotification
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Status tab filter
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [counts, setCounts] = useState({
    all: 0,
    ui: 0,
    completed: 0,
    yetToStart: 0,
    dropped: 0,
    totalAmount: 0
  });

  // Search & Filter Dropdown States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [organisations, setOrganisations] = useState([]);
  const [categories, setCategories] = useState([]);

  // In-place inline detail view selection
  const [selectedMou, setSelectedMou] = useState(null);

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState({
    event: true,
    org: true,
    name: true,
    party2: true,
    amount: true,
    category: true,
    physicalProgress: true,
    financialProgress: true,
    status: true,
  });

  // Search debounce ref
  const debounceTimeout = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  // Load organizations and categories on mount
  useEffect(() => {
    fetchOrganisations()
      .then(res => {
        if (Array.isArray(res.data)) setOrganisations(res.data);
      })
      .catch(err => console.warn('Could not load organisations:', err));

    fetchMouCategoryNames()
      .then(res => {
        if (Array.isArray(res.data)) setCategories(res.data);
      })
      .catch(err => console.warn('Could not load categories:', err));
  }, []);

  // Fetch paginated table data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGmisMouPaginated({
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        eventName: selectedEvent === 'All Summits' ? '' : selectedEvent,
        organisationId: selectedOrg,
        category: selectedCategory,
        status: activeStatusTab === 'all' ? '' : activeStatusTab,
      });

      const resData = res.data?.data || [];
      setData(resData);
      setTotalCount(res.data?.totalCount || 0);
      setTotalPages(res.data?.totalPages || 1);
      
      if (res.data?.counts) {
        setCounts({
          all: res.data.counts.all || 0,
          ui: res.data.counts.underImplementation || 0,
          completed: res.data.counts.completed || 0,
          yetToStart: res.data.counts.yetToStart || 0,
          dropped: res.data.counts.dropped || 0,
          totalAmount: res.data.counts.totalAmount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load GMIS MoUs:', err);
      if (triggerNotification) triggerNotification('Error fetching MoU data from server');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedEvent, selectedOrg, selectedCategory, activeStatusTab, triggerNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes
  const handleEventChange = (val) => {
    setSelectedEvent(val);
    setCurrentPage(1);
  };

  const handleOrgChange = (val) => {
    setSelectedOrg(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handleStatusTabChange = (tabKey) => {
    setActiveStatusTab(tabKey);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  // AG Grid Column Definitions
  // NOTE: 1st column and 2nd column fixed on LEFT, last column fixed on RIGHT
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sNo',
      width: 75,
      pinned: 'left',
      valueGetter: (params) => {
        return (currentPage - 1) * pageSize + params.node.rowIndex + 1;
      },
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center',
    },
    {
      headerName: 'Organisation Name',
      field: 'organisation_name',
      flex: 1.5,
      minWidth: 200,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.org,
    },
    {
      headerName: 'Summit / Event',
      field: 'event_name',
      width: 130,
      cellClass: 'text-xs font-bold text-blue-700 dark:text-blue-300',
      hide: !visibleCols.event,
      cellRenderer: (params) => (
        <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800">
          {params.value || 'GMIS 2025'}
        </span>
      ),
    },
    {
      headerName: 'Name of MoU / Project',
      field: 'name_of_mou',
      flex: 2.2,
      minWidth: 260,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-200 text-left',
      headerClass: 'text-left',
      hide: !visibleCols.name,
      cellRenderer: (params) => (
        <span className="truncate block py-1 text-left w-full" title={params.value}>
          {params.value || '-'}
        </span>
      ),
    },
    {
      headerName: '2nd Party (Partner)',
      field: 'name_of_second_party',
      flex: 1.5,
      minWidth: 180,
      cellClass: 'text-slate-600 dark:text-slate-300 text-xs',
      hide: !visibleCols.party2,
      cellRenderer: (params) => (
        <span className="truncate block py-1" title={params.value}>
          {params.value || '-'}
        </span>
      ),
    },
    {
      headerName: 'MoU Value (₹ Cr)',
      field: 'amount',
      width: 140,
      cellClass: 'font-bold text-emerald-600 dark:text-emerald-400 text-right',
      headerClass: 'text-right',
      hide: !visibleCols.amount,
      cellRenderer: (params) => (
        <span>
          {params.value !== undefined && params.value !== null && params.value !== ''
            ? `₹ ${Number(params.value).toLocaleString()}`
            : '-'}
        </span>
      ),
    },
    {
      headerName: 'Category',
      field: 'mou_category_name',
      width: 150,
      cellClass: 'text-slate-600 dark:text-slate-400 text-xs',
      hide: !visibleCols.category,
      cellRenderer: (params) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
          {params.value || 'General'}
        </span>
      ),
    },
    {
      headerName: 'Physical %',
      field: 'physical_progress_percentage',
      width: 100,
      cellClass: 'font-mono text-center font-bold text-purple-700 dark:text-purple-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.physicalProgress,
      cellRenderer: (params) => `${params.value || 0}%`,
    },
    {
      headerName: 'Financial %',
      field: 'financial_progress_percentage',
      width: 100,
      cellClass: 'font-mono text-center font-bold text-blue-700 dark:text-blue-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.financialProgress,
      cellRenderer: (params) => `${params.value || 0}%`,
    },
    {
      headerName: 'Present Status',
      field: 'present_status',
      width: 170,
      hide: !visibleCols.status,
      cellRenderer: (params) => {
        const status = params.value || 'Active';
        const isCompleted = status.toLowerCase().includes('completed');
        const isDelayed = status.toLowerCase().includes('delayed');
        const isDropped = status.toLowerCase().includes('dropped');
        const isOnTime = status.toLowerCase().includes('under') || status.toLowerCase().includes('implementation');

        const badgeClass = isCompleted 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : isDelayed
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          : isDropped
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          : isOnTime
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';

        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${badgeClass}`}>
            {status}
          </span>
        );
      },
    },
    {
      headerName: 'Actions',
      width: 110,
      pinned: 'right',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center space-x-1.5 h-full py-1">
          <button
            onClick={() => setSelectedMou(params.data)}
            title="View Details"
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(params.data)}
              title="Edit MoU"
              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
      sortable: false,
      filter: false,
    },
  ], [visibleCols, currentPage, pageSize, onEdit]);

  // Export handlers
  const handleExport = (type) => {
    if (type === 'Copy') {
      let tsv = 'S.No\tOrganisation\tSummit\tMoU Name\t2nd Party\tAmount (Cr)\tCategory\tPhysical %\tFinancial %\tStatus\n';
      data.forEach((row, idx) => {
        tsv += `${idx + 1}\t${row.organisation_name || ''}\t${row.event_name || ''}\t${row.name_of_mou || ''}\t${row.name_of_second_party || ''}\t${row.amount || ''}\t${row.mou_category_name || ''}\t${row.physical_progress_percentage || 0}%\t${row.financial_progress_percentage || 0}%\t${row.present_status || ''}\n`;
      });
      navigator.clipboard.writeText(tsv)
        .then(() => triggerNotification?.('Current page data copied to clipboard!'))
        .catch(() => alert('Failed to copy table data.'));
    } else if (type === 'Excel') {
      let csv = 'S.No,Organisation,Summit,MoU Name,2nd Party,Amount (Cr),Category,Physical %,Financial %,Status\n';
      data.forEach((row, idx) => {
        csv += `"${idx + 1}","${(row.organisation_name || '').replace(/"/g, '""')}","${row.event_name || ''}","${(row.name_of_mou || '').replace(/"/g, '""')}","${(row.name_of_second_party || '').replace(/"/g, '""')}","${row.amount || ''}","${row.mou_category_name || ''}","${row.physical_progress_percentage || 0}%","${row.financial_progress_percentage || 0}%","${row.present_status || ''}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `GMIS_IMW_MoUs_Page_${currentPage}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification?.('Exported to CSV successfully!');
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      const title = 'GMIS & IMW MoU Tracking Deliverables';
      let rowsHtml = '';
      data.forEach((row, idx) => {
        rowsHtml += `<tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${idx + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.organisation_name || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.event_name || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.name_of_mou || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.name_of_second_party || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">₹ ${row.amount || 0} Cr</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.present_status || '-'}</td>
        </tr>`;
      });
      printWindow.document.write(`
        <html>
          <head><title>${title}</title>
            <style>body { font-family: sans-serif; padding: 20px; color: #1e293b; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: left; }</style>
          </head>
          <body>
            <h2>${title}</h2>
            <p style="font-size: 11px; color: #64748b;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead><tr><th>S.No</th><th>Organisation</th><th>Summit</th><th>MoU Name</th><th>2nd Party</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // If in-place detail view is selected, render inline!
  if (selectedMou) {
    return (
      <GMISDetailView
        mou={selectedMou}
        onBack={() => setSelectedMou(null)}
        onEdit={(m) => {
          setSelectedMou(null);
          onEdit?.(m);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Stage / Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          onClick={() => handleStatusTabChange('all')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'all'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          ALL MoUs ({counts.all})
        </button>
        
        <button
          onClick={() => handleStatusTabChange('yet_to_start')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'yet_to_start'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          YET TO START ({counts.yetToStart})
        </button>

        <button
          onClick={() => handleStatusTabChange('under_implementation')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'under_implementation'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          UNDER IMPLEMENTATION ({counts.ui})
        </button>

        <button
          onClick={() => handleStatusTabChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          COMPLETED ({counts.completed})
        </button>

        <button
          onClick={() => handleStatusTabChange('dropped')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'dropped'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          DROPPED ({counts.dropped})
        </button>
      </div>

      {/* Main Table Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Search and Filters Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 w-full lg:w-auto">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search MoUs, partner, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Summit Event Filter */}
            <div className="relative min-w-[140px]">
              <select
                value={selectedEvent}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Summits</option>
                {EVENT_FILTER_OPTIONS.map((ev, i) => (
                  <option key={i} value={ev}>{ev}</option>
                ))}
              </select>
            </div>

            {/* Organisation Filter */}
            <div className="relative min-w-[170px]">
              <select
                value={selectedOrg}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Organisations ({organisations.length})</option>
                {organisations.map((org, i) => (
                  <option key={i} value={org.organisation_id || org.id || org.organisation_name}>
                    {org.organisation_name || org}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative min-w-[140px]">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c, i) => (
                  <option key={i} value={c.mou_category_name || c}>
                    {c.mou_category_name || c}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedEvent || selectedOrg || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEvent('');
                  setSelectedOrg('');
                  setSelectedCategory('');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}

          </div>

          {/* Action Toolbar: Add New, Export, Copy */}
          <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
            <CopyButton onClick={() => handleExport('Copy')} />
            <ExportDropdown onExport={handleExport} />
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add MoU</span>
              </button>
            )}
          </div>

        </div>

        {/* Table Container */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table
            rowData={data}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            domLayout="autoHeight"
          />
        </div>

        {/* Table Bottom Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />

      </div>

    </div>
  );
}
