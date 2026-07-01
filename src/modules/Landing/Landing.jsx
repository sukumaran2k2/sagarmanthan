import { useMemo } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function LandingView({ onNavigate }) {
  const fileUploadModules = [
    {
      id: 'cpgrams',
      title: '1.CPGRAMS',
      date: 'As on 23 Jun 2026',
      status: 'Last file uploaded on',
      badge: 'May - 2026'
    },
    {
      id: 'file-pendency',
      title: '2a.File Pendency',
      date: 'As on 23 Jun 2026',
      status: 'Last file uploaded on',
      badge: 'Week 3 - June 2026'
    },
    {
      id: 'receipt-pendency',
      title: '2b.Receipt Pendency',
      date: 'As on 23 Jun 2026',
      status: 'Last file uploaded on',
      badge: 'Week 3 - June 2026'
    },
    {
      id: 'file-disposal',
      title: '2c.File Disposal',
      date: 'As on 23 Jun 2026',
      status: 'Last file uploaded on',
      badge: 'Week 3 - June 2026'
    },
    {
      id: 'attendance',
      title: '3.Attendance',
      date: 'As on 23 Jun 2026',
      status: 'Last file uploaded on',
      badge: 'Week 3 - June 2026'
    }
  ];

  const rowData = [
    { sno: 4, moduleName: 'Young Professional', shipping: '17-03-2025', vigilance: '--', ports: '17-03-2025', iwt: '19-01-2024', admin: '19-01-2024' },
    { sno: 5, moduleName: 'Consultant Appointment', shipping: '17-03-2025', vigilance: '--', ports: '17-03-2025', iwt: '--', admin: '17-03-2025' },
    { sno: 6, moduleName: 'VIP Reference', shipping: '22-06-2026', vigilance: '--', ports: '15-06-2026', iwt: '29-05-2026', admin: '--' },
    { sno: 7, moduleName: 'Cabinet Notes-Other Ministry', shipping: 'Not Applicable', vigilance: 'Not Applicable', ports: 'Not Applicable', iwt: 'Not Applicable', admin: 'Not Applicable' },
    { sno: 8, moduleName: 'Cabinet Notes-MoPSW', shipping: '--', vigilance: '--', ports: '16-06-2026', iwt: '--', admin: '--' },
    { sno: 9, moduleName: 'Audit Para', shipping: '--', vigilance: '--', ports: '11-06-2026', iwt: '--', admin: '--' },
    { sno: 10, moduleName: 'Bills/PreConstitutions Act', shipping: '17-03-2025', vigilance: '--', ports: '--', iwt: '--', admin: '--' },
    { sno: 11, moduleName: 'MOM OF PSW Meetings', shipping: '--', vigilance: '--', ports: '02-06-2026', iwt: '--', admin: '--' },
    { sno: 12, moduleName: 'Promotion of Indian Flagged Ships', shipping: '--', vigilance: 'Not Applicable', ports: 'Not Applicable', iwt: 'Not Applicable', admin: 'Not Applicable' },
    { sno: 13, moduleName: 'Parliamentary Issues', shipping: '26-02-2026', vigilance: '--', ports: '06-04-2026', iwt: '06-12-2024', admin: '09-03-2026' },
    { sno: 14, moduleName: 'Review Items', shipping: '--', vigilance: '--', ports: '--', iwt: '--', admin: '--' },
    { sno: 15, moduleName: 'MoPSW Tracker', shipping: '--', vigilance: '--', ports: '--', iwt: '--', admin: '--' },
    { sno: 16, moduleName: 'Expenditure', shipping: '--', vigilance: '--', ports: '--', iwt: '--', admin: '--' },
    { sno: 17, moduleName: 'Foreign Visit', shipping: '17-06-2026', vigilance: 'Not Applicable', ports: 'Not Applicable', iwt: 'Not Applicable', admin: 'Not Applicable' },
    { sno: 18, moduleName: 'Inter State and Inter Ministerial Issues', shipping: '--', vigilance: '--', ports: '--', iwt: '--', admin: '--' },
    { sno: 19, moduleName: 'Acts & Rules', shipping: '--', vigilance: '--', ports: '--', iwt: '--', admin: '--' }
  ];

  const DateCellRenderer = (params) => {
    const val = params.value;
    if (!val || val === '--') {
      return <span className="text-slate-400 font-medium select-none">--</span>;
    }
    if (val === 'Not Applicable') {
      return <span className="text-slate-400 font-medium select-none">Not Applicable</span>;
    }
    if (val.includes('-')) {
      const parts = val.split('-');
      const year = parts[2];
      if (year === '2026') {
        return <span className="text-emerald-600 font-bold">{val}</span>;
      } else {
        return <span className="text-rose-600 font-bold">{val}</span>;
      }
    }
    return <span className="text-slate-700 font-semibold">{val}</span>;
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sno',
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center border-r border-slate-200'
    },
    {
      headerName: 'Module Name',
      field: 'moduleName',
      minWidth: 280,
      pinned: 'left',
      cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200 cursor-pointer hover:text-blue-700'
    },
    {
      headerName: 'Departments / Wings',
      marryChildren: true,
      children: [
        {
          headerName: 'Shipping',
          field: 'shipping',
          minWidth: 140,
          cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
          cellRenderer: DateCellRenderer
        },
        {
          headerName: 'Vigilance',
          field: 'vigilance',
          minWidth: 140,
          cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
          cellRenderer: DateCellRenderer
        },
        {
          headerName: 'Ports',
          field: 'ports',
          minWidth: 140,
          cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
          cellRenderer: DateCellRenderer
        },
        {
          headerName: 'IWT',
          field: 'iwt',
          minWidth: 140,
          cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
          cellRenderer: DateCellRenderer
        },
        {
          headerName: 'Administration',
          field: 'admin',
          minWidth: 140,
          cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
          cellRenderer: DateCellRenderer
        }
      ]
    }
  ], []);

  const handleCardClick = (id) => {
    if (id === 'cpgrams') {
      onNavigate('CPGRAMS');
    } else if (id === 'file-pendency') {
      onNavigate('E Office', 'file-pendency');
    } else if (id === 'receipt-pendency') {
      onNavigate('E Office', 'receipt-pendency');
    } else if (id === 'file-disposal') {
      onNavigate('E Office', 'file-disposal');
    } else if (id === 'attendance') {
      onNavigate('Attendance');
    }
  };

  const handleRowClicked = (event) => {
    const moduleName = event.data.moduleName;
    const routeMap = {
      'Young Professional': 'YP Reports',
      'Consultant Appointment': 'Consultant Reports',
      'VIP Reference': 'VIP Reference',
      'Cabinet Notes-Other Ministry': 'Cabinet Notes - Other Ministries',
      'Cabinet Notes-MoPSW': 'Cabinet Notes - MoPSW',
      'Audit Para': 'Audit Paras',
      'MOM OF PSW Meetings': 'MOM Of PSW Meetings',
      'Promotion of Indian Flagged Ships': 'Flagged Ships / FOB Basis',
      'Parliamentary Issues': 'Parliamentary Issues',
      'Review Items': 'Review Items',
      'MoPSW Tracker': 'Project Milestones',
      'Foreign Visit': 'Foreign Visit',
      'Inter State and Inter Ministerial Issues': 'Inter State & Inter Ministerial',
      'Acts & Rules': 'Acts & Rules'
    };
    const targetTab = routeMap[moduleName];
    if (targetTab) {
      onNavigate(targetTab);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Centered Banner & Hero Image */}
      <div className="space-y-4 mt-2">
        <div className="relative w-full h-48 md:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/30 border border-slate-200">
          <img 
            src="/cargo-ship.jpg" 
            alt="Maritime Port Banner" 
            className="w-full h-full object-cover object-center" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-left">
            <span className="text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold">
              Ministry of Ports, Shipping and Waterways
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-display mt-1">
              Data Entry Dashboard
            </h1>
            <p className="text-xs text-slate-200 mt-1 font-medium max-w-xl leading-relaxed">
              Access and manage National maritime database modules, real-time cargo telemetry, and GIGW compliant file submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Action Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5 items-start md:items-center">
        <div className="flex items-center space-x-2 text-slate-800 py-2">
          {/*<span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>*/}
          <span className="font-bold text-l tracking-wider uppercase text-slate-800 font-display select-none">
            Ministry Exclusive Modules
          </span>
        </div>
        
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button 
            onClick={() => {}}
            className="inline-flex items-center space-x-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Data Entry Report</span>
          </button>
          <button 
            onClick={() => {}}
            className="inline-flex items-center space-x-2 px-4.5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Data Entry Report as PDF</span>
          </button>
        </div>
      </div>

      {/* Section I: File Upload Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          I. File Upload Modules
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fileUploadModules.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => handleCardClick(item.id)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-300 select-none"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-extrabold text-[#0f417a] font-display">{item.title}</span>
                <span className="text-[9px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1.5 py-0.5 rounded-md">{item.date}</span>
              </div>
              <div className="py-4 text-center space-y-2">
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{item.status}</p>
                <div className="inline-flex items-center justify-center px-4 py-1.5 bg-emerald-500 text-white text-[11px] font-black rounded-full shadow-sm">
                  {item.badge}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section II: Data Entry Modules Table */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            II. Data Entry Modules
          </h2>
          <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">
            (As on 23 Jun 2026)
          </span>
        </div>

        <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={(e) => {
          const vp = e.currentTarget.querySelector('.ag-body-viewport');
          if (vp && vp.scrollWidth > vp.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            vp.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}>
          <AgGridReact 
            theme="legacy"
            rowData={rowData}
            columnDefs={colDefs}
            domLayout="autoHeight"
            rowHeight={46}
            headerHeight={44}
            onRowClicked={handleRowClicked}
            suppressColumnVirtualisation={true}
            autoSizeStrategy={{
              type: 'fitCellContents'
            }}
            onFirstDataRendered={(params) => {
              const allCols = params.api.getAllGridColumns();
              const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
              const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
                if (containerWidth > 0 && totalColWidth < containerWidth) {
                  params.api.sizeColumnsToFit();
                }
            }}
          />
        </div>
      </div>

    </div>
  );
}
