import React, { useState, useRef } from 'react';
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

  const formTitle = selectedForm ? selectedForm.formName : 'Monthly Capex Expenditure Telemetry';

  const handleExportExcel = () => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: `Submissions_${formTitle}` });
      triggerNotification && triggerNotification('Exporting submissions report to CSV...', 'success');
    }
  };

  const filtered = MOCK_SUBMISSIONS.filter(s => 
    s.portName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.submittedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columnDefs = [
    { field: 'id', headerName: 'Submission ID', cellStyle: { fontWeight: '900', color: '#2563eb', fontSize: '11px' }, flex: 1.2 },
    { field: 'portName', headerName: 'Port Authority', cellStyle: { fontWeight: 'bold', color: '#0f172a', fontSize: '11px' }, flex: 2.5 },
    { field: 'submittedBy', headerName: 'Submitted By', cellStyle: { fontSize: '11px' }, flex: 1.5 },
    { field: 'submittedOn', headerName: 'Submission Date', cellStyle: { color: '#64748b', fontSize: '11px' } },
    { headerName: 'Project Name', valueGetter: (p) => p.data.data['Project Name'], cellStyle: { fontWeight: '600', color: '#1e293b', fontSize: '11px' }, flex: 1.5 },
    { headerName: 'Cost (Rs Cr)', valueGetter: (p) => p.data.data['Sanctioned Cost (Rs Cr)'], type: 'rightAligned', cellStyle: { fontWeight: '900', color: '#0f172a', fontSize: '11px' } },
    { 
      headerName: 'Stage',
      valueGetter: (p) => p.data.data['Implementation Stage'],
      cellRenderer: (params) => (
        <div className="flex items-center h-full">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] uppercase border border-blue-200 shadow-sm inline-block whitespace-nowrap leading-none">
            {params.value}
          </span>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden animate-fade-in">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDirectory}
            className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Form Directory</span>
          </button>

          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <span>Submissions & Responses — {formTitle}</span>
          </h2>
        </div>
        
        <ExportDropdown 
          onExportExcel={handleExportExcel} 
          onExportPdf={() => window.print()} 
        />
      </div>

      {/* Toolbar & Stats Section */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Search Bar */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by port authority or officer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
          />
        </div>

        {/* Stats Highlights */}
        <div className="flex items-center space-x-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Submissions</span>
            <div className="text-lg font-black text-slate-800">{filtered.length}</div>
          </div>
          
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Verified Officers</span>
            <div className="text-lg font-black text-blue-600">3 Nodal Officers</div>
          </div>
          
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Submission Rate</span>
            <div className="text-lg font-black text-emerald-600">84% Compliance</div>
          </div>
        </div>
      </div>

      {/* Submissions Data Table */}
      <div className="w-full">
        <Table 
          ref={gridRef}
          rowData={filtered} 
          columnDefs={columnDefs} 
          pagination={true}
          paginationPageSize={10}
          enableExport={false}
          domLayout="autoHeight"
          color="#0f417a"
          rowHeight={34}
        />
      </div>
    </div>
  );
}
