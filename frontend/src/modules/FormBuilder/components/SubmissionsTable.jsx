import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Search, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import TablePagination from '../../../components/TablePagination';
import api from '../api';

const MOCK_SUBMISSIONS = [
  {
    id: 'SUB_001',
    portName: 'Jawaharlal Nehru Port Authority (JNPA)',
    submittedBy: 'Sanjay Kumar (Nodal Officer)',
    submittedOn: '2026-09-24 14:30',
    data: {
      'Project Name': 'Fourth Container Terminal Expansion',
      'Sanctioned Cost (Rs Cr)': '1,250.00',
      'Implementation Stage': 'Under Construction',
      'Target Completion Date': '2027-03-31',
      'Status': 'On Track'
    }
  },
  {
    id: 'SUB_002',
    portName: 'Deendayal Port Authority (Kandla)',
    submittedBy: 'Rajesh Sharma (Chief Engineer)',
    submittedOn: '2026-09-23 11:15',
    data: {
      'Project Name': 'Oil Jetty No. 7 Modernization',
      'Sanctioned Cost (Rs Cr)': '340.50',
      'Implementation Stage': 'Completed',
      'Target Completion Date': '2026-08-15',
      'Status': 'Completed'
    }
  },
  {
    id: 'SUB_003',
    portName: 'Chennai Port Authority',
    submittedBy: 'V. Ramanathan (Dy. Conservator)',
    submittedOn: '2026-09-22 16:45',
    data: {
      'Project Name': 'Coastal Protection Works Phase 2',
      'Sanctioned Cost (Rs Cr)': '88.20',
      'Implementation Stage': 'Under Tendering',
      'Target Completion Date': '2027-06-30',
      'Status': 'In Progress'
    }
  }
];

export default function SubmissionsTable({ selectedForm, triggerNotification, onBackToDirectory }) {
  const [searchQuery, setSearchQuery] = useState('');

  const gridRef = useRef(null);

  // Forms from the DB have numeric ids; mock forms ('form_101') keep showing mock submissions.
  const isRealForm = !!selectedForm && /^\d+$/.test(String(selectedForm.id));
  const [realData, setRealData] = useState(null);

  // Real forms are paged and searched on the server; mock forms filter in the browser.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setRealData(null);
  }, [selectedForm?.id]);

  useEffect(() => {
    if (!isRealForm) return;
    api.get(`/get-form-submissions/${selectedForm.id}`, { params: { page, limit: PAGE_SIZE, search: debouncedSearch } })
      .then((res) => setRealData(res.data))
      .catch((err) => {
        console.error('Failed to load submissions', err);
        triggerNotification && triggerNotification(err.response?.data?.message || 'Failed to load submissions', 'error');
      });
  }, [isRealForm, selectedForm?.id, page, debouncedSearch]);

  const formTitle = selectedForm ? selectedForm.formName : 'Monthly Capex Expenditure Telemetry';

  const handleExportExcel = async () => {
    // The grid only holds one page for real forms, so export fetches every matching row.
    if (isRealForm) {
      try {
        const res = await api.get(`/get-form-submissions/${selectedForm.id}`, { params: { all: true, search: debouncedSearch } });
        const cell = (v) => {
          const text = v === null || v === undefined ? '' : String(v);
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const lines = [
          columnDefs.map(c => cell(c.headerName)).join(','),
          ...res.data.submissions.map((row, i) => columnDefs.map(c => cell(
            c.colId === 'sno' ? i + 1 : c.valueGetter ? c.valueGetter({ data: row }) : row[c.field]
          )).join(',')),
        ];
        const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `Submissions_${formTitle}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        triggerNotification && triggerNotification(`Exported ${res.data.submissions.length} submissions to CSV`, 'success');
      } catch (err) {
        console.error('Export failed', err);
        triggerNotification && triggerNotification('Could not export submissions', 'error');
      }
      return;
    }
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: `Submissions_${formTitle}` });
      triggerNotification && triggerNotification('Exporting submissions report to CSV...', 'success');
    }
  };

  const filtered = isRealForm
    ? (realData?.submissions || [])
    : MOCK_SUBMISSIONS.filter(s => 
      (s.portName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.submittedBy || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  const pagination = realData?.pagination;

  const stats = realData?.stats;
  const complianceText = !isRealForm
    ? '84% Compliance'
    : stats?.assignedOrganisations
      ? `${Math.round((stats.respondedOrganisations / stats.assignedOrganisations) * 100)}% Compliance`
      : '—';

  const formatValue = (v) => (
    Array.isArray(v) ? v.join(', ')
      : typeof v === 'boolean' ? (v ? 'Yes' : 'No')
      : v && typeof v === 'object' && 'fileName' in v ? v.fileName
      : v
  );

  // Files need the login token, so they're fetched as a blob rather than linked directly.
  const downloadFile = async (submissionUid, fieldId, fileName) => {
    try {
      const res = await api.get(`/download-form-file/${submissionUid}/${fieldId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('File download failed', err);
      triggerNotification && triggerNotification('Could not download the file', 'error');
    }
  };

  // One column per field; file fields show a download button.
  const realFieldColumns = (realData?.form?.fields || [])
    .filter(f => f.columnName || f.inputType === 'file')
    .map(f => ({
      headerName: f.inputLabel,
      valueGetter: (p) => formatValue(p.data.data[f.id]),
      cellStyle: { color: '#1e293b', fontSize: '11px' },
      flex: 1.5,
      ...(f.inputType === 'file' && {
        cellRenderer: (params) => {
          const file = params.data.data[f.id];
          if (!file?.fileName) return null;
          return (
            <button
              type="button"
              onClick={() => downloadFile(params.data.submissionUid, f.id, file.fileName)}
              className="inline-flex items-center space-x-1 text-[#4b2424] hover:text-[#6b3535] font-semibold cursor-pointer"
              title={`Download ${file.fileName}`}
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </button>
          );
        },
      }),
    }));

  const baseColumnDefs = [
    {
      colId: 'sno',
      headerName: 'S.No',
      // Real forms are paged on the server, so page 2 continues from 11.
      valueGetter: (params) => (params.node && !params.node.rowPinned
        ? params.node.rowIndex + 1 + (isRealForm ? (page - 1) * PAGE_SIZE : 0)
        : ''),
      width: 70,
      pinned: 'left',
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    { field: 'portName', headerName: 'Port Authority', cellStyle: { fontWeight: 'bold', color: '#0f172a', fontSize: '11px' }, flex: 2.5 },
    { field: 'submittedBy', headerName: 'Submitted By', cellStyle: { fontSize: '11px' }, flex: 1.5 },
    { field: 'submittedOn', headerName: 'Submission Date', cellStyle: { color: '#64748b', fontSize: '11px' } },
    {
      colId: 'status',
      headerName: 'Status',
      // Mock rows carry no status; they are all submitted responses.
      valueGetter: (p) => p.data?.status || 'Submitted',
      cellRenderer: (params) => (
        <div className="flex items-center h-full">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border leading-none whitespace-nowrap ${
            params.value === 'Not submitted'
              ? 'bg-red-100 text-red-700 border-red-200'
              : 'bg-[#f7f3f3] text-[#4b2424] border-[#eadede]'
          }`}>
            {params.value}
          </span>
        </div>
      ),
      width: 130,
    },
  ];

  const mockColumnDefs = [
    { headerName: 'Project Name', valueGetter: (p) => p.data.data['Project Name'], cellStyle: { fontWeight: '600', color: '#1e293b', fontSize: '11px' }, flex: 1.5 },
    { headerName: 'Cost (Rs Cr)', valueGetter: (p) => p.data.data['Sanctioned Cost (Rs Cr)'], type: 'rightAligned', cellStyle: { fontWeight: '900', color: '#0f172a', fontSize: '11px' } },
    { 
      headerName: 'Stage',
      valueGetter: (p) => p.data.data['Implementation Stage'],
      cellRenderer: (params) => (
        <div className="flex items-center h-full">
          <span className="px-2 py-0.5 bg-[#f7f3f3] text-[#4b2424] font-bold rounded text-[10px] uppercase border border-[#eadede] shadow-sm inline-block whitespace-nowrap leading-none">
            {params.value}
          </span>
        </div>
      )
    }
  ];

  const columnDefs = [...baseColumnDefs, ...(isRealForm ? realFieldColumns : mockColumnDefs)];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden animate-fade-in">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDirectory}
            className="flex items-center space-x-1.5 text-xs font-bold text-[#4b2424] hover:text-[#6b3535] dark:text-[#eadede] mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Form Directory</span>
          </button>

          {/* Brown report styling, same palette as the other modules' Reports pages */}
          <div className="flex items-center gap-1.5 mb-1">
            <FileSpreadsheet size={14} className="text-[#8c4242] dark:text-[#eadede]" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-[#eadede] uppercase tracking-widest">Form Builder - Submissions & Responses</span>
          </div>
          <h2 className="text-xl font-bold text-[#4b2424] dark:text-[#eadede] tracking-wide">{formTitle}</h2>
          <div className="text-xs text-slate-500 mt-1">
            As on date: <strong className="text-[#4b2424] dark:text-[#eadede]">{new Date(Date.now() + 330 * 60 * 1000).toISOString().split('T')[0]}</strong>
          </div>
        </div>
        
        <ExportDropdown 
          onExportExcel={handleExportExcel} 
          onExportPdf={() => window.print()} 
          color="#4b2424"
          hoverColor="#6b3535"
        />
      </div>

      {/* Toolbar & Stats Section */}
      <div className="p-5 border-b border-slate-200/80 bg-[#f7f3f3]/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Search Bar */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#4b2424]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by port authority or officer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-[#4b2424] focus:ring-[3px] focus:ring-[#4b2424]/10 outline-none transition shadow-sm"
          />
        </div>

        {/* Stats Highlights */}
        <div className="flex items-center space-x-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Submissions</span>
            <div className="text-lg font-black text-[#4b2424]">{isRealForm ? (stats?.totalSubmissions ?? 0) : filtered.length}</div>
          </div>
          
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Submission Rate</span>
            <div className="text-lg font-black text-[#8c4242]">{complianceText}</div>
          </div>

          {isRealForm && (
            <>
              <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Not Submitted</span>
                <div className="text-lg font-black text-red-600">{stats?.notSubmitted ?? 0}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Submissions Data Table */}
      <div className="w-full">
        {/* Assigned organisations/wings that haven't submitted are listed in red. */}
        <style>{`
          .fb-row-pending .ag-cell { background-color: #fef2f2 !important; color: #0f172a !important; }
          .fb-row-pending.ag-row-hover .ag-cell { background-color: #fee2e2 !important; }
        `}</style>
        <Table 
          ref={gridRef}
          rowData={filtered} 
          columnDefs={columnDefs} 
          rowClassRules={{ 'fb-row-pending': (p) => !!p.data?.isPending }}
          pagination={!isRealForm}
          paginationPageSize={10}
          enableExport={false}
          domLayout="autoHeight"
          color="#4b2424"
          rowHeight={34}
        />
        {isRealForm && pagination?.totalPages > 0 && (
          <TablePagination
            currentPage={Math.max(0, page - 1)}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            pageSize={PAGE_SIZE}
            onPageChange={(pageIndex) => setPage(pageIndex + 1)}
            color="#4b2424"
          />
        )}
      </div>
    </div>
  );
}
