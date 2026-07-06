import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  FolderSync,
  FilePieChart,
  AlertTriangle
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

const INITIAL_DROP_REQUESTS = [
  {
    id: 1,
    orgName: 'Cochin Port Authority',
    projectId: 'PR1315',
    subProjectId: '-',
    projectName: 'Up-gradation of IG Road and Bristow Road',
    subProjectName: '-',
    submittedBy: 'Shri.B.Kasiviswanathan, IRSME',
    submittedOn: '2026-06-23',
    dropDate: '',
    reason: 'duplication of project',
    status: 'Pending'
  },
  {
    id: 2,
    orgName: 'Cochin Port Authority',
    projectId: 'PR0147',
    subProjectId: '-',
    projectName: 'Implementation of 1.5MWp grid connected floating solar PV power plant under RESCO model',
    subProjectName: '-',
    submittedBy: 'Shri.B.Kasiviswanathan, IRSME',
    submittedOn: '2026-06-23',
    dropDate: '',
    reason: 'KSERC rejected the proposal for Tariff approval by stating that the tariff obtained through competitive bidding is 60 % higher than the average market rate. Hence the project is dropped as directed by KSERC',
    status: 'Pending'
  },
  {
    id: 3,
    orgName: 'Cochin Port Authority',
    projectId: 'PR0147',
    subProjectId: '-',
    projectName: 'Implementation of 1.5MWp grid connected floating solar PV power plant under RESCO model',
    subProjectName: '-',
    submittedBy: 'Shri.B.Kasiviswanathan, IRSME',
    submittedOn: '2026-06-23',
    dropDate: '',
    reason: 'KSERC rejected the proposal for Tariff approval by stating that the tariff obtained through competitive bidding is 60 % higher than the average market rate. Hence the project is dropped as directed by KSERC',
    status: 'Pending'
  },
  {
    id: 4,
    orgName: 'V.O. Chidambaranar Port Authority',
    projectId: 'PR0747',
    subProjectId: '-',
    projectName: 'Refurbishment, Upgradation, Development, Operation and Maintenance of the Existing Hospital at V.O.Chidambaranar Port Tuticorin to a 100 Bedded Super Speciality Hospital through Public Private Partnership',
    subProjectName: '-',
    submittedBy: 'Chairman',
    submittedOn: '2026-06-19',
    dropDate: '',
    reason: 'yes',
    status: 'Pending'
  },
  {
    id: 5,
    orgName: 'Cochin Port Authority',
    projectId: 'PR1319',
    subProjectId: 'SPR0408',
    projectName: 'Augmentation of Fire Fighting Facilities at NTB',
    subProjectName: '-',
    submittedBy: 'Shri.B.Kasiviswanathan, IRSME',
    submittedOn: '2026-06-16',
    dropDate: '',
    reason: 'Duplication',
    status: 'Pending'
  },
  {
    id: 6,
    orgName: 'Cochin Port Authority',
    projectId: 'PR1319',
    subProjectId: 'SPR0408',
    projectName: 'Augmentation of Fire Fighting Facilities at NTB',
    subProjectName: '-',
    submittedBy: 'Shri.B.Kasiviswanathan, IRSME',
    submittedOn: '2026-06-16',
    dropDate: '',
    reason: 'Duplication',
    status: 'Pending'
  },
  {
    id: 7,
    orgName: 'Deendayal Port Authority',
    projectId: 'PR1124',
    subProjectId: '-',
    projectName: 'Up-gradation of Back up area of berth No. 11 and 12',
    subProjectName: '-',
    submittedBy: 'SUSHIL KUMAR SINGH',
    submittedOn: '2026-06-15',
    dropDate: '2026-06-18',
    reason: 'Duplicacy of project',
    status: 'Dropped'
  },
  {
    id: 8,
    orgName: 'Directorate General of Lighthouses and Lightships',
    projectId: 'PR0429',
    subProjectId: '-',
    projectName: 'Phase II Development of Rani Lakshmibai Shila',
    subProjectName: '-',
    submittedBy: 'N. Muruganandam',
    submittedOn: '2026-06-10',
    dropDate: '',
    reason: 'The Ministry has directed that the project be stopped',
    status: 'Pending'
  },
  {
    id: 9,
    orgName: 'V.O. Chidambaranar Port Authority',
    projectId: 'PR0747',
    subProjectId: '-',
    projectName: 'Refurbishment, Upgradation, Development, Operation and Maintenance of the Existing Hospital at V.O.Chidambaranar Port Tuticorin to a 100 Bedded Super Speciality Hospital through Public Private Partnership',
    subProjectName: '-',
    submittedBy: 'Chairman',
    submittedOn: '2026-06-06',
    dropDate: '',
    reason: 'Constraints are i) Tuticorin being a tier II city has poor demand from the market ii) low volume and poor market response to the Tender and issues aﬀecting the overall feasibility of the project iii) low return on investment iv) Other available bigger Super Speciality hospitals at Tirunelveli, Madurai and upcoming AIIMS in Madurai, which are not far from Tuticorin. (approximately 100 kms)',
    status: 'Pending'
  },
  {
    id: 10,
    orgName: 'V.O. Chidambaranar Port Authority',
    projectId: 'PR0747',
    subProjectId: '-',
    projectName: 'Refurbishment, Upgradation, Development, Operation and Maintenance of the Existing Hospital at V.O.Chidambaranar Port Tuticorin to a 100 Bedded Super Speciality Hospital through Public Private Partnership',
    subProjectName: '-',
    submittedBy: 'Chairman',
    submittedOn: '2026-06-06',
    dropDate: '',
    reason: 'Constraints are i) Tuticorin being a tier II city has poor demand from the market ii) low volume and poor market response to the Tender and issues aﬀecting the overall feasibility of the project iii) low return on investment iv) Other available bigger Super Speciality hospitals at Tirunelveli, Madurai and upcoming AIIMS in Madurai, which are not far from Tuticorin. (approximately 100 km).Letters dated 17.12.2025 & 17.04.2026 were submitted to Ministry of Ports Shipping & waterways in this regard.',
    status: 'Pending'
  }
];

// Generate extra mock entries to reach 122 count
for (let i = 11; i <= 122; i++) {
  const isDropped = i % 8 === 0;
  INITIAL_DROP_REQUESTS.push({
    id: i,
    orgName: i % 2 === 0 ? 'Chennai Port Authority' : 'Mumbai Port Authority',
    projectId: `PR${1000 + i}`,
    subProjectId: '-',
    projectName: `Mock Port Infrastructure Project ${i}`,
    subProjectName: '-',
    submittedBy: 'Shri. T. K. Ramachandran, IAS',
    submittedOn: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
    dropDate: isDropped ? `2026-06-${String((i % 28) + 1).padStart(2, '0')}` : '',
    reason: `Routine cleanup of duplicate records or feasibility concerns. Reference ID ${100 + i}`,
    status: isDropped ? 'Dropped' : 'Pending'
  });
}

export default function ViewDropRequest({ activeTab, setActiveTab }) {
  const gridRef = useRef();
  const [entries, setEntries] = useState(INITIAL_DROP_REQUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Confirmation Overlays states
  const [confirmingApprove, setConfirmingApprove] = useState(null);
  const [confirmingReject, setConfirmingReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const handleApproveClick = (row) => {
    setConfirmingApprove(row);
  };

  const handleRejectClick = (row) => {
    setConfirmingReject(row);
    setRejectionReason('');
    setRejectionError('');
  };

  const confirmApprove = () => {
    const today = new Date().toISOString().split('T')[0];
    setEntries(prev => prev.map(item => {
      if (item.id === confirmingApprove.id) {
        return {
          ...item,
          status: 'Dropped',
          dropDate: today
        };
      }
      return item;
    }));
    setConfirmingApprove(null);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Rejection reason is required.');
      return;
    }

    setEntries(prev => prev.map(item => {
      if (item.id === confirmingReject.id) {
        return {
          ...item,
          status: 'Rejected',
          reason: `${item.reason} | REJECTED: ${rejectionReason}`
        };
      }
      return item;
    }));
    setConfirmingReject(null);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const q = searchQuery.toLowerCase();
      return !searchQuery.trim() || 
        item.orgName.toLowerCase().includes(q) || 
        item.projectId.toLowerCase().includes(q) || 
        item.projectName.toLowerCase().includes(q) || 
        item.submittedBy.toLowerCase().includes(q);
    });
  }, [entries, searchQuery]);

  const totalEntries = filteredEntries.length;

  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('paginationPageSize', entriesLimit);
    }
  }, [entriesLimit]);

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      const total = gridRef.current.api.paginationGetTotalPages();
      setCurrentPage(page);
      setTotalPages(total || 1);
    }
  };

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  // Columns layout with S.No and Organisation Name frozen left
  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-semibold text-slate-500 flex items-center justify-center'
    },
    {
      headerName: 'Organisation Name',
      field: 'orgName',
      width: 240,
      minWidth: 240,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 flex items-center'
    },
    {
      headerName: 'Project ID',
      field: 'projectId',
      width: 140,
      minWidth: 140,
      cellClass: 'font-bold text-orange-600 flex items-center'
    },
    {
      headerName: 'Sub Project ID',
      field: 'subProjectId',
      width: 140,
      minWidth: 140,
      cellClass: 'text-center text-slate-400 font-medium flex items-center justify-center',
      valueFormatter: (params) => params.value && params.value !== '-' ? params.value : '-'
    },
    {
      headerName: 'Project Name',
      field: 'projectName',
      width: 320,
      minWidth: 320,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params) => (
        <span className="font-bold text-slate-850 block text-xs leading-relaxed whitespace-normal py-2 flex items-center h-full">
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Sub Project Name',
      field: 'subProjectName',
      width: 160,
      minWidth: 160,
      cellClass: 'text-slate-500 font-semibold flex items-center',
      valueFormatter: (params) => params.value && params.value !== '-' ? params.value : '-'
    },
    {
      headerName: 'Submitted By',
      field: 'submittedBy',
      width: 240,
      minWidth: 240,
      cellClass: 'text-slate-655 font-semibold flex items-center'
    },
    {
      headerName: 'Submitted On',
      field: 'submittedOn',
      width: 150,
      minWidth: 150,
      cellClass: 'text-slate-600 font-medium text-center flex items-center justify-center'
    },
    {
      headerName: 'Drop date',
      field: 'dropDate',
      width: 150,
      minWidth: 150,
      cellClass: 'text-slate-600 font-medium text-center flex items-center justify-center',
      valueFormatter: (params) => params.value ? params.value : '-'
    },
    {
      headerName: 'Reason',
      field: 'reason',
      width: 350,
      minWidth: 350,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params) => (
        <span className="text-slate-600 block text-xs leading-relaxed whitespace-normal py-2 flex items-center h-full">
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Action',
      width: 220,
      minWidth: 220,
      cellClass: 'text-center flex items-center justify-center gap-2',
      cellRenderer: (params) => {
        const row = params.data;
        if (row.status === 'Dropped') {
          return (
            <div className="flex items-center justify-center h-full">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Dropped
              </span>
            </div>
          );
        }
        if (row.status === 'Rejected') {
          return (
            <div className="flex items-center justify-center h-full">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Rejected
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => handleApproveClick(row)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition cursor-pointer"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Approve Drop</span>
            </button>
            <button
              onClick={() => handleRejectClick(row)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-sm transition cursor-pointer"
            >
              <XCircle className="h-3 w-3" />
              <span>Reject</span>
            </button>
          </div>
        );
      }
    }
  ], []);

  return (
    <div className="p-6 space-y-6 animate-fade-in text-slate-855">
      
      {/* Navigation and Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display">View Drop Requests</h2>
        </div>
        <InternalNavigation
          tabs={[
            { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
            { id: 'projects', label: 'Project List', icon: ClipboardList },
            { id: 'less5cr', label: 'Projects Less Than 5 Cr', icon: TrendingDown },
            { id: 'lumpsum', label: 'Lumpsum - IWAI', icon: TrendingUp },
            { id: 'dropRequests', label: 'View Drop Request', icon: FolderSync },
            { id: 'reports', label: 'Reports', icon: FilePieChart },
          ]}
          currentTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
          <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span className="text-xs text-slate-500 whitespace-nowrap font-medium">entries</span>
          </div>

          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search project..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto">
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={filteredEntries}
          columnDefs={colDefs}
          defaultColDef={{ resizable: true, suppressSizeToFit: true, minWidth: 100 }}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={65}
          headerHeight={48}
          suppressColumnVirtualisation={true}
        />

        {/* Custom Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
          <span className="text-slate-500 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
            <span className="font-bold text-slate-800">{totalEntries}</span> entries
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
              if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                }
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p
                    ? 'bg-[#0f417a] text-white shadow-sm'
                    : 'border border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Approve Drop */}
      {confirmingApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center space-x-3 text-emerald-600">
              <CheckCircle className="h-7 w-7" />
              <h3 className="text-base font-black uppercase tracking-wider font-display">Confirm Approve Drop</h3>
            </div>
            
            <div className="space-y-2 text-xs leading-relaxed text-slate-600 font-medium">
              <p>Are you sure you want to approve the drop request for the following project?</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 mt-2">
                <p><strong>Project ID:</strong> {confirmingApprove.projectId}</p>
                <p><strong>Project Name:</strong> {confirmingApprove.projectName}</p>
                <p><strong>Organisation:</strong> {confirmingApprove.orgName}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingApprove(null)}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                className="px-5.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/10 hover:shadow-lg transition cursor-pointer"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reject Drop */}
      {confirmingReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="h-7 w-7" />
              <h3 className="text-base font-black uppercase tracking-wider font-display">Reject Drop Request</h3>
            </div>

            <div className="space-y-4">
              <div className="text-xs leading-relaxed text-slate-600 font-medium space-y-1">
                <p>Please provide the rejection reason for dropping project <strong>{confirmingReject.projectId}</strong>:</p>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mt-1">
                  <p className="truncate"><strong>Name:</strong> {confirmingReject.projectName}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Rejection Reason *</label>
                <textarea
                  rows="3"
                  value={rejectionReason}
                  onChange={(e) => { setRejectionReason(e.target.value); setRejectionError(''); }}
                  placeholder="Enter detailed reason for rejection..."
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${rejectionError ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800`}
                />
                {rejectionError && <p className="text-[10px] text-red-500 font-semibold mt-1">{rejectionError}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingReject(null)}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="px-5.5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/10 hover:shadow-lg transition cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
