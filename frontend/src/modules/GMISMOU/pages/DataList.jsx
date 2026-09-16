import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Edit, Eye, Search, X, List, BarChart3, Building2, ChevronDown, Sparkles, FileText, Download, Filter 
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import GMISDetailView from '../components/GMISDetailView';
import InputForm from './InputForm';
import { 
  fetchGmisMouPaginated, 
  fetchOrganisations, 
  fetchMouCategoryNames, 
  fetchGmisNavicVibhas 
} from '../api';

const SUMMIT_TABS = [
  { id: 'all', label: 'All Summits' },
  { id: 'GMIS 2016', label: 'GMIS 2016' },
  { id: 'GMIS 2021', label: 'GMIS 2021' },
  { id: 'GMIS 2023', label: 'GMIS 2023' },
  { id: 'GMIS 2025', label: 'GMIS 2025' },
];

const EVENT_FILTER_OPTIONS = [
  'All Summits',
  'GMIS 2016',
  'GMIS 2021',
  'GMIS 2023',
  'GMIS 2025',
  'IMW 2025'
];

const NATURE_OF_SECOND_PARTY_OPTIONS = [
  'National',
  'International',
  'Joint Venture',
  'State Govt / PSU',
  'Central Govt / Ministry',
  'Private / Industry',
  'Academic / Research',
  'Other'
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

  // Dedicated Filter Panel Toggle State
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Search & Filter Dropdown States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedNavic, setSelectedNavic] = useState('');
  const [selectedNature, setSelectedNature] = useState('');
  
  const [organisations, setOrganisations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [navicList, setNavicList] = useState([]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedEvent && selectedEvent !== 'All Summits') count++;
    if (selectedOrg) count++;
    if (selectedCategory) count++;
    if (selectedNavic) count++;
    if (selectedNature) count++;
    return count;
  }, [selectedEvent, selectedOrg, selectedCategory, selectedNavic, selectedNature]);

  // Modal / Detail view / Inline Edit state
  const [selectedMou, setSelectedMou] = useState(null);
  const [editingMou, setEditingMou] = useState(null);

  // Column visibility dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Complete Column visibility state matching Update MoU Details form
  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    org: true,
    event: true,
    name: true,
    party2: true,
    nature: true,
    navic: true,
    category: true,
    amount: true,
    revisedAmount: true,
    status: true,
    physicalProgress: true,
    physicalDate: false,
    financialProgress: true,
    financialDate: false,
    mouBrief: false,
    remarks: false,
    nextSteps: false,
    reasonForDropping: false,
    document: true,
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

  // Load organizations, categories, and NAVIC cells on mount
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

    fetchGmisNavicVibhas()
      .then(res => {
        if (Array.isArray(res.data)) setNavicList(res.data);
      })
      .catch(err => console.warn('Could not load navic cells:', err));
  }, []);

  // Close visibility dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        natureOfSecondParty: selectedNature,
        navicName: selectedNavic,
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
      if (triggerNotification) triggerNotification('Error fetching MoU data from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedEvent, selectedOrg, selectedCategory, selectedNature, selectedNavic, activeStatusTab, triggerNotification]);

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

  const handleNavicChange = (val) => {
    setSelectedNavic(val);
    setCurrentPage(1);
  };

  const handleNatureChange = (val) => {
    setSelectedNature(val);
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
      hide: !visibleCols.sNo,
    },
    {
      headerName: 'Organisation (1st Party)',
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
      headerName: '2nd Party (Partner / Vendor)',
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
      headerName: 'Nature of 2nd Party',
      field: 'nature_of_second_party',
      width: 160,
      cellClass: 'text-xs text-slate-700 dark:text-slate-300',
      hide: !visibleCols.nature,
      cellRenderer: (params) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
          {params.value || '-'}
        </span>
      ),
    },
    {
      headerName: 'VIBHAS / NAVIC Cell',
      field: 'navic_name',
      width: 170,
      cellClass: 'text-xs font-semibold text-indigo-700 dark:text-indigo-300',
      hide: !visibleCols.navic,
      cellRenderer: (params) => (
        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
          {params.value || '-'}
        </span>
      ),
    },
    {
      headerName: 'MoU Category',
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
      headerName: 'Revised Amount (₹ Cr)',
      field: 'revised_amount',
      width: 150,
      cellClass: 'font-bold text-blue-600 dark:text-blue-400 text-right',
      headerClass: 'text-right',
      hide: !visibleCols.revisedAmount,
      cellRenderer: (params) => (
        <span>
          {params.value !== undefined && params.value !== null && params.value !== ''
            ? `₹ ${Number(params.value).toLocaleString()}`
            : '-'}
        </span>
      ),
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
      headerName: 'Physical %',
      field: 'physical_progress_percentage',
      width: 110,
      cellClass: 'font-mono text-center font-bold text-purple-700 dark:text-purple-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.physicalProgress,
      cellRenderer: (params) => `${params.value || 0}%`,
    },
    {
      headerName: 'Physical Date',
      field: 'physical_progress_date',
      width: 130,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center',
      hide: !visibleCols.physicalDate,
      cellRenderer: (params) => (
        <span>{params.value ? new Date(params.value).toLocaleDateString('en-GB') : '-'}</span>
      ),
    },
    {
      headerName: 'Financial %',
      field: 'financial_progress_percentage',
      width: 110,
      cellClass: 'font-mono text-center font-bold text-blue-700 dark:text-blue-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.financialProgress,
      cellRenderer: (params) => `${params.value || 0}%`,
    },
    {
      headerName: 'Financial Date',
      field: 'financial_progress_date',
      width: 130,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center',
      hide: !visibleCols.financialDate,
      cellRenderer: (params) => (
        <span>{params.value ? new Date(params.value).toLocaleDateString('en-GB') : '-'}</span>
      ),
    },
    {
      headerName: 'MoU Brief',
      field: 'mou_brief',
      width: 220,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.mouBrief,
      cellRenderer: (params) => (
        <span className="truncate block" title={params.value}>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'Remarks / Detailed Status',
      field: 'remark_or_detailed_status',
      width: 220,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.remarks,
      cellRenderer: (params) => (
        <span className="truncate block" title={params.value}>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'Next Steps',
      field: 'next_steps',
      width: 200,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.nextSteps,
      cellRenderer: (params) => (
        <span className="truncate block" title={params.value}>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'Reason for Dropping',
      field: 'reason_for_dropping',
      width: 200,
      cellClass: 'text-xs text-rose-600 dark:text-rose-400 font-medium',
      hide: !visibleCols.reasonForDropping,
      cellRenderer: (params) => (
        <span className="truncate block" title={params.value}>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'MoU Document',
      field: 'document_uploader',
      width: 130,
      cellClass: 'text-center',
      headerClass: 'text-center',
      hide: !visibleCols.document,
      cellRenderer: (params) => (
        params.value ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            <FileText className="h-3 w-3" />
            <span>PDF</span>
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
        )
      ),
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
          <button
            onClick={() => setEditingMou(params.data)}
            title="Edit / Update MoU"
            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ),
      sortable: false,
      filter: false,
    },
  ], [visibleCols, currentPage, pageSize]);

  // Export handlers
  const handleExport = (type) => {
    if (!data || data.length === 0) {
      triggerNotification?.('No MoU records available to export', 'warning');
      return;
    }

    try {
      if (type === 'Copy') {
        let tsv = 'S.No\tOrganisation\tSummit\tMoU Name\t2nd Party\tNature\tNAVIC Cell\tAmount (Cr)\tRevised Amount (Cr)\tCategory\tStatus\n';
        data.forEach((row, idx) => {
          tsv += `${idx + 1}\t${row.organisation_name || ''}\t${row.event_name || ''}\t${row.name_of_mou || ''}\t${row.name_of_second_party || ''}\t${row.nature_of_second_party || ''}\t${row.navic_name || ''}\t${row.amount || ''}\t${row.revised_amount || ''}\t${row.mou_category_name || ''}\t${row.present_status || ''}\n`;
        });

        const copyText = (text) => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
          }
          return fallbackCopy(text);
        };

        const fallbackCopy = (text) => {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (success) return Promise.resolve();
            return Promise.reject(new Error('execCommand failed'));
          } catch (err) {
            return Promise.reject(err);
          }
        };

        copyText(tsv)
          .then(() => triggerNotification?.('Table data copied to clipboard successfully!', 'success'))
          .catch((err) => {
            console.error('Clipboard copy error:', err);
            triggerNotification?.('Failed to copy table data to clipboard', 'error');
          });
      } else if (type === 'Excel') {
        let csv = 'S.No,Organisation,Summit,MoU Name,2nd Party,Nature,NAVIC Cell,Amount (Cr),Revised Amount (Cr),Category,Status\n';
        data.forEach((row, idx) => {
          csv += `"${idx + 1}","${(row.organisation_name || '').replace(/"/g, '""')}","${row.event_name || ''}","${(row.name_of_mou || '').replace(/"/g, '""')}","${(row.name_of_second_party || '').replace(/"/g, '""')}","${(row.nature_of_second_party || '').replace(/"/g, '""')}","${(row.navic_name || '').replace(/"/g, '""')}","${row.amount || ''}","${row.revised_amount || ''}","${row.mou_category_name || ''}","${row.present_status || ''}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `GMIS_IMW_MoUs_Page_${currentPage}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        triggerNotification?.('MoU records exported to CSV (Excel) successfully!', 'success');
      } else if (type === 'PDF') {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          triggerNotification?.('Pop-up blocked. Please allow pop-ups to print or export PDF.', 'warning');
          return;
        }

        const title = 'GMIS & IMW MoUs Registry';
        let headersHtml = '';
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Actions' && !col.hide) {
            headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #f8fafc; font-size: 10px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
          }
        });

        let rowsHtml = '';
        data.forEach((row, rowIndex) => {
          rowsHtml += '<tr>';
          columnDefs.forEach(col => {
            if (col.headerName && col.headerName !== 'Actions' && !col.hide) {
              const val = row[col.field] !== undefined ? row[col.field] : '';
              rowsHtml += `<td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 10px;">${val}</td>`;
            }
          });
          rowsHtml += '</tr>';
        });

        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; }
                h1 { font-size: 16px; margin-bottom: 4px; color: #0f417a; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              <p style="font-size: 10px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Generated on: ${new Date().toLocaleDateString()}</p>
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
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        triggerNotification?.('Print preview opened successfully!', 'info');
      }
    } catch (err) {
      console.error('Export error:', err);
      triggerNotification?.('Failed to export MoU records', 'error');
    }
  };

  // If inline Update Form is active, render directly on the same Data List page!
  if (editingMou) {
    return (
      <div className="space-y-4 animate-fade-in">
        <InputForm
          editData={editingMou}
          onSuccess={() => {
            setEditingMou(null);
            fetchData();
          }}
          onCancel={() => setEditingMou(null)}
          triggerNotification={triggerNotification}
        />
      </div>
    );
  }

  // If in-place detail view is selected, render inline!
  if (selectedMou) {
    return (
      <GMISDetailView
        mou={selectedMou}
        onBack={() => setSelectedMou(null)}
        onEdit={(m) => {
          setSelectedMou(null);
          setEditingMou(m);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in relative">
      
      {/* Combined Single-Line Header: Summit Tabs & Status Tabs */}
      <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2.5 select-none">
        
        {/* Summit Event Tabs (Matching Dashboard Style) */}
        <div className="flex flex-wrap items-center gap-2 select-none shrink-0">
          {SUMMIT_TABS.map((tab) => {
            const isActive = (selectedEvent === tab.id) || (tab.id === 'all' && (!selectedEvent || selectedEvent === 'All Summits' || selectedEvent === 'all'));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedEvent(tab.id === 'all' ? '' : tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Filter Tabs (Old Style with border-b-2) */}
        <div className="flex flex-wrap items-center justify-start 2xl:justify-end gap-1 overflow-x-auto">
          <button
            onClick={() => handleStatusTabChange('all')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none ${
              activeStatusTab === 'all'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            ALL MoUs ({counts.all})
          </button>
          
          <button
            onClick={() => handleStatusTabChange('yet_to_start')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none ${
              activeStatusTab === 'yet_to_start'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            YET TO START ({counts.yetToStart})
          </button>

          <button
            onClick={() => handleStatusTabChange('under_implementation')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none ${
              activeStatusTab === 'under_implementation'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            UNDER IMPLEMENTATION ({counts.ui})
          </button>

          <button
            onClick={() => handleStatusTabChange('completed')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none ${
              activeStatusTab === 'completed'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            COMPLETED ({counts.completed})
          </button>

          <button
            onClick={() => handleStatusTabChange('dropped')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none ${
              activeStatusTab === 'dropped'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            DROPPED ({counts.dropped})
          </button>
        </div>
      </div>

      {/* Main Table Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Search, Filters and Actions Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Dedicated Filter Button */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
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
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('');
                  setSelectedOrg('');
                  setSelectedCategory('');
                  setSelectedNavic('');
                  setSelectedNature('');
                  setCurrentPage(1);
                  triggerNotification?.('Filters have been reset', 'info');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* 2. Space */}
          <div className="hidden lg:block flex-1" />

          {/* 3. Search Bar, 4. Row Count Selector, 5. Visibility, 6. Copy, 7. Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search MoUs, partner, cell..."
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

            {/* Row Count Selector */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{totalCount}</span>
            </div>

            {/* Visibility Checklist Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Toggle Columns</span>
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>
                        {col === 'sNo' ? 'S.No' :
                         col === 'org' ? 'Organisation' :
                         col === 'event' ? 'Summit Event' :
                         col === 'name' ? 'MoU Name' :
                         col === 'party2' ? '2nd Party' :
                         col === 'nature' ? 'Nature of 2nd Party' :
                         col === 'navic' ? 'NAVIC / VIBHAS Cell' :
                         col === 'category' ? 'Category / Industry' :
                         col === 'amount' ? 'MoU Amount' :
                         col === 'revisedAmount' ? 'Revised Amount' :
                         col === 'status' ? 'Status' :
                         col === 'physicalProgress' ? 'Physical %' :
                         col === 'physicalDate' ? 'Physical Date' :
                         col === 'financialProgress' ? 'Financial %' :
                         col === 'financialDate' ? 'Financial Date' :
                         col === 'mouBrief' ? 'MoU Brief' :
                         col === 'remarks' ? 'Remarks / Details' :
                         col === 'nextSteps' ? 'Next Steps' :
                         col === 'reasonForDropping' ? 'Reason for Dropping' :
                         col === 'document' ? 'Document PDF' : col}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              onClick={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#134e96"
              triggerNotification={triggerNotification}
            />

          </div>

        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter MoU Records
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent('');
                    setSelectedOrg('');
                    setSelectedCategory('');
                    setSelectedNavic('');
                    setSelectedNature('');
                    setCurrentPage(1);
                    triggerNotification?.('Filters have been reset', 'info');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Summit Event Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Summit / Event</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => handleEventChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Summits</option>
                  {EVENT_FILTER_OPTIONS.map((ev, i) => (
                    <option key={i} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>

              {/* 2. Organisation Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Lead Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Organisations ({organisations.length})</option>
                  {organisations.map((org, i) => (
                    <option key={i} value={org.organisation_id || org.id || org.organisation_name}>
                      {org.organisation_name || org}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">MoU Category / Industry</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((c, i) => (
                    <option key={i} value={c.mou_category_name || c}>
                      {c.mou_category_name || c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. VIBHAS / NAVIC Cell Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">VIBHAS / NAVIC Cell</label>
                <select
                  value={selectedNavic}
                  onChange={(e) => handleNavicChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All NAVIC Cells</option>
                  {navicList.map((n, i) => (
                    <option key={i} value={n.navic_name || n}>{n.navic_name || n}</option>
                  ))}
                </select>
              </div>

              {/* 5. Nature of 2nd Party Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Nature of 2nd Party</label>
                <select
                  value={selectedNature}
                  onChange={(e) => handleNatureChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All 2nd Parties</option>
                  {NATURE_OF_SECOND_PARTY_OPTIONS.map((nat, i) => (
                    <option key={i} value={nat}>{nat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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
