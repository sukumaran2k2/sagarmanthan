import { useMemo, useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  BarChart2 as ChartIcon
} from 'lucide-react';
import axios from 'axios';
import Table from '../../components/table';
import Chart from '../../components/Chart';

const decodeToken = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
  } catch (e) {
    return null;
  }
};

const DateCellRenderer = (params) => {
  const val = params.value;
  if (!val || val === '--' || val === '-') return <span className="text-slate-350 font-bold">-</span>;
  if (val === 'Not Applicable') return <span className="text-slate-400 text-xs italic">N/A</span>;
  const parts = val.split('-');
  if (parts.length === 3) {
    const diffDays = (new Date() - new Date(parts[2], parts[1] - 1, parts[0])) / 86400000;
    return <span className={diffDays <= 15 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{val}</span>;
  }
  return <span className="text-slate-700 font-semibold">{val}</span>;
};

const getOrgKey = (name) => {
  const n = name.toLowerCase();
  const keys = {
    chennai: 'cpa', cochin: 'cochin', shipyard: 'csl', csl: 'csl', deendayal: 'dpa', jawaharlal: 'jnpa', jnpa: 'jnpa',
    kamarajar: 'kpl', kpl: 'kpl', mormugao: 'mpa2', mumbai: 'mbpa', mangalore: 'nmpa', nmpa: 'nmpa', paradip: 'paradip',
    haldia: 'smpa_hdc', kolkata: 'smpa_kds', chidambaranar: 'voc', voc: 'voc', visakhapatnam: 'vizag', vizag: 'vizag',
    andaman: 'alhw', alhw: 'alhw', lighthouses: 'dgll', dgll: 'dgll', dgs: 'dgs', dredging: 'dci', dci: 'dci',
    'ports global': 'ipgl', ipgl: 'ipgl', imu: 'imu', ipa: 'ipa', iprc: 'iprc', iwai: 'iwai', sfc: 'sfc', sci: 'sci', tamp: 'tamp'
  };
  const match = Object.keys(keys).find(k => n.includes(k));
  return match ? keys[match] : null;
};

const FILE_UPLOAD_MODULES = [
  { id: 'cpgrams', title: '1. CPGRAMS', date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'May - 2026' },
  { id: 'file-pendency', title: '2a. File Pendency', date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'receipt-pendency', title: '2b. Receipt Pendency', date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'file-disposal', title: '2c. File Disposal', date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'attendance', title: '3. Attendance', date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 4 - June 2026' },
];

export default function LandingView({ onNavigate }) {
  const [orgSubSection, setOrgSubSection] = useState('ports');
  const [deViewType, setDeViewType] = useState('table');
  const [orgViewType, setOrgViewType] = useState('table');

  const [isFileUploadExpanded, setIsFileUploadExpanded] = useState(true);
  const [isDataEntryExpanded, setIsDataEntryExpanded] = useState(true);
  const [isOrgExpanded, setIsOrgExpanded] = useState(true);

  const [dataEntryRows, setDataEntryRows] = useState([]);
  const [orgRows, setOrgRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded = decodeToken(token);
      return decoded?.userId || 1;
    }
    return 1;
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        const deRes = await axios.get(`http://localhost:3000/get-wing-wise-dashboard/${userId}`);
        setDataEntryRows(deRes.data.map((row, idx) => ({
          sno: idx + 1,
          moduleName: row['Module Name'] || row['moduleName'],
          shipping: row['Shipping'] || '--',
          vigilance: row['Vigilance'] || '--',
          ports: row['Ports'] || '--',
          iwt: row['IWT'] || '--',
          admin: row['Administration'] || '--',
          coordI: row['Coord-I'] || '--',
          coordII: row['Coord-II'] || '--',
          dgll: row['DGLL, Parliament & TRW'] || row['DGLL'] || '--',
          dev: row['Development'] || '--',
          finance: row['Finance'] || '--',
          sagarmala: row['Sagarmala'] || '--',
          it: row['Information Technology'] || '--',
          special: row['Special Initiatives & Proj'] || row['Special Initiatives'] || '--'
        })));

        const orgRes = await axios.get(`http://localhost:3000/get-dashboard-organisation-view/${userId}`);
        const transposedOrgs = [
          { sno: 17, module: 'Projects', fieldName: 'max_last_updated_date' },
          { sno: 18, module: 'CSR Projects', fieldName: 'max_csr_updated_date' },
          { sno: 19, module: 'HR Management', fieldName: 'emp_last_transaction_date' },
          { sno: 20, module: 'Court Cases', fieldName: 'codeCases_max_updated_date' }
        ];

        setOrgRows(transposedOrgs.map(tRow => {
          const rowObj = { sno: tRow.sno, module: tRow.module };
          orgRes.data.forEach(org => {
            const orgKey = getOrgKey(org.organisation_name);
            if (orgKey) {
              const val = org[tRow.fieldName];
              let formattedVal = '--';
              if (val) {
                const dateObj = new Date(val);
                if (!isNaN(dateObj.getTime())) {
                  formattedVal = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
                } else {
                  formattedVal = val;
                }
              }
              rowObj[orgKey] = formattedVal;
            }
          });
          return rowObj;
        }));
      } catch (err) {
        console.error("Error loading telemetry:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTelemetry();
  }, [userId]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', field: 'sno', width: 65, pinned: 'left', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center border-r border-slate-200' },
    { headerName: 'Module Name', field: 'moduleName', minWidth: 240, pinned: 'left', cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200 cursor-pointer hover:text-blue-700' },
    {
      headerName: 'Departments / Wings', marryChildren: true,
      children: [
        { headerName: 'Shipping', field: 'shipping', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Vigilance', field: 'vigilance', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Ports', field: 'ports', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'IWT', field: 'iwt', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Administration', field: 'admin', minWidth: 130, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Coord-I', field: 'coordI', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Coord-II', field: 'coordII', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'DGLL, Parliament & TRW', field: 'dgll', minWidth: 170, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Development', field: 'dev', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Finance', field: 'finance', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Sagarmala', field: 'sagarmala', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Information Technology', field: 'it', minWidth: 160, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Special Initiatives & Proj', field: 'special', minWidth: 170, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer }
      ]
    }
  ], []);

  const orgColDefs = useMemo(() => {
    const baseCols = [
      { headerName: 'S.No', field: 'sno', width: 65, pinned: 'left', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center border-r border-slate-200' },
      { headerName: 'Module', field: 'module', minWidth: 160, pinned: 'left', cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200' }
    ];
    const portsCols = [
      { headerName: 'Chennai PA', field: 'cpa', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Cochin PA', field: 'cochin', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Deendayal PA', field: 'dpa', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'JNPA', field: 'jnpa', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Kamarajar PL', field: 'kpl', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Mormugao PA', field: 'mpa2', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Mumbai PA', field: 'mbpa', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'New Mang PA', field: 'nmpa', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Paradip PA', field: 'paradip', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'SMPA-HDC', field: 'smpa_hdc', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'SMPA-KDS', field: 'smpa_kds', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'VOC PA', field: 'voc', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'Vizag PA', field: 'vizag', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer }
    ];
    const otherOrgsCols = [
      { headerName: 'ALHW', field: 'alhw', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'CSL', field: 'csl', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'DGLL', field: 'dgll', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'DGS', field: 'dgs', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'DCI', field: 'dci', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'IPGL', field: 'ipgl', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'IMU', field: 'imu', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'IPA', field: 'ipa', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'IPRC', field: 'iprc', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'IWAI', field: 'iwai', minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'SFC', field: 'sfc', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'SCI', field: 'sci', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      { headerName: 'TAMP', field: 'tamp', minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer }
    ];
    return [
      ...baseCols,
      {
        headerName: orgSubSection === 'ports' ? 'Major Ports' : 'Other Organisations',
        marryChildren: true,
        children: orgSubSection === 'ports' ? portsCols : otherOrgsCols
      }
    ];
  }, [orgSubSection]);

  const handleRowClicked = (event) => {
    const moduleName = event.data.moduleName;
    const routeMap = {
      'Young Professional': 'YP Reports', 'Consultant Appointment': 'Consultant Reports', 'VIP Reference': 'VIP Reference',
      'Cabinet Notes-Other Ministry': 'Cabinet Notes - Other Ministries', 'Cabinet Notes-MoPSW': 'Cabinet Notes - MoPSW',
      'Audit Para': 'Audit Paras', 'MOM OF PSW Meetings': 'MOM Of PSW Meetings', 'Promotion of Indian Flagged Ships': 'Flagged Ships / FOB Basis',
      'Parliamentary Issues': 'Parliamentary Issue', 'Review Items': 'Review Items', 'MoPSW Tracker': 'Project Milestones',
      'Foreign Visit': 'Foreign Visit', 'Inter State and Inter Ministerial Issues': 'Inter State & Inter Ministerial',
      'Acts & Rules': 'Acts & Rules', 'Media Outreach': 'Media Outreach'
    };
    const targetTab = routeMap[moduleName];
    if (targetTab) onNavigate(targetTab);
  };

  const deChartData = useMemo(() => {
    const wings = [
      { key: 'shipping', label: 'Shipping' }, { key: 'vigilance', label: 'Vigilance' }, { key: 'ports', label: 'Ports' },
      { key: 'iwt', label: 'IWT' }, { key: 'admin', label: 'Admin' }, { key: 'coordI', label: 'Coord-I' },
      { key: 'coordII', label: 'Coord-II' }, { key: 'dgll', label: 'DGLL' }, { key: 'dev', label: 'Dev' },
      { key: 'finance', label: 'Finance' }, { key: 'sagarmala', label: 'Sagarmala' }, { key: 'it', label: 'IT' },
      { key: 'special', label: 'Special' }
    ];
    return wings.map(w => {
      const activeCount = dataEntryRows.filter(row => {
        const val = row[w.key];
        return val && val !== '--' && val !== 'Not Applicable' && val !== 'No Data' && val !== 'No Active Notes' && val !== 'No Active Paras' && val !== 'No Active Matters';
      }).length;
      return { name: w.label, 'Active Modules': activeCount };
    });
  }, [dataEntryRows]);

  const orgChartData = useMemo(() => {
    const majorPorts = [
      { key: 'cpa', label: 'Chennai PA' }, { key: 'cochin', label: 'Cochin PA' }, { key: 'dpa', label: 'Deendayal PA' },
      { key: 'jnpa', label: 'JNPA' }, { key: 'kpl', label: 'Kamarajar PL' }, { key: 'mpa2', label: 'Mormugao PA' },
      { key: 'mbpa', label: 'Mumbai PA' }, { key: 'nmpa', label: 'New Mang PA' }, { key: 'paradip', label: 'Paradip PA' },
      { key: 'smpa_hdc', label: 'SMPA-HDC' }, { key: 'smpa_kds', label: 'SMPA-KDS' }, { key: 'voc', label: 'VOC PA' },
      { key: 'vizag', label: 'Vizag PA' }
    ];
    const otherOrgs = [
      { key: 'alhw', label: 'ALHW' }, { key: 'csl', label: 'CSL' }, { key: 'dgll', label: 'DGLL' },
      { key: 'dgs', label: 'DGS' }, { key: 'dci', label: 'DCI' }, { key: 'ipgl', label: 'IPGL' },
      { key: 'imu', label: 'IMU' }, { key: 'ipa', label: 'IPA' }, { key: 'iprc', label: 'IPRC' },
      { key: 'iwai', label: 'IWAI' }, { key: 'sfc', label: 'SFC' }, { key: 'sci', label: 'SCI' },
      { key: 'tamp', label: 'TAMP' }
    ];
    const currentOrgs = orgSubSection === 'ports' ? majorPorts : otherOrgs;
    return currentOrgs.map(o => {
      const activeCount = orgRows.filter(row => {
        const val = row[o.key];
        return val && val !== '--' && val !== '-';
      }).length;
      return { name: o.label, 'Active Modules': activeCount };
    });
  }, [orgRows, orgSubSection]);

  const handleCardClick = (id) => {
    const routeMap = {
      'cpgrams': ['CPGRAMS'],
      'file-pendency': ['E Office', 'file-pendency'],
      'receipt-pendency': ['E Office', 'receipt-pendency'],
      'file-disposal': ['E Office', 'file-disposal'],
      'attendance': ['Attendance']
    };
    const args = routeMap[id];
    if (args) onNavigate(...args);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="h-8 w-8 rounded-full border-4 border-[#0f417a]/30 border-t-[#0f417a] animate-spin"></div>
        <span className="text-xs font-bold text-slate-500">Compiling real-time telemetry from databases...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      <div className="space-y-4 mt-2">
        <div className="relative w-full h-48 md:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/30 border border-slate-200">
          <img
            src="/cargo-ship.jpg"
            alt="Maritime Port Banner"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-left">
            <span className="text-[10px] text-white tracking-widest uppercase font-bold">
              Ministry of Ports, Shipping and Waterways
            </span>
            <h1 className="text-xl md:text-5xl font-black text-white tracking-tight uppercase mt-1">
              Data Entry Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* MINISTRY EXCLUSIVE MODULES */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Ministry Exclusive Modules</h2>
        </div>

        {/* File Upload Modules */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div
            onClick={() => setIsFileUploadExpanded(!isFileUploadExpanded)}
            className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-slate-50 transition-all duration-200"
          >
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">File Upload Modules</h3>
            <button className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm cursor-pointer">
              {isFileUploadExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {isFileUploadExpanded && (
            <div className="border-t border-slate-100 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
              {FILE_UPLOAD_MODULES.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCardClick(item.id)}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 cursor-pointer transition duration-350 select-none"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#0f417a]">{item.title}</span>
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">{item.date}</span>
                  </div>
                  <div className="py-4 text-center space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.status}</p>
                    <div className="inline-flex items-center justify-center px-4 py-1.5 bg-[#0f417a] text-white text-[11px] font-black rounded-full shadow-sm">
                      {item.badge}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Entry Modules */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div
            onClick={() => setIsDataEntryExpanded(!isDataEntryExpanded)}
            className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-slate-50 transition-all duration-200"
          >
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Data Entry Modules</h3>
            <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center bg-slate-105 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setDeViewType('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${deViewType === 'table' ? 'bg-[#0f417a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Table View"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeViewType('chart')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${deViewType === 'chart' ? 'bg-[#0f417a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Visualization"
                >
                  <ChartIcon className="h-4 w-4" />
                </button>
              </div>
              <button className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm cursor-pointer">
                {isDataEntryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isDataEntryExpanded && (
            <div className="border-t border-slate-100 p-5 space-y-4">
              {deViewType === 'table' ? (
                <Table
                  rowData={dataEntryRows}
                  colDefs={colDefs}
                  onRowClicked={handleRowClicked}
                  enableExport={true}
                  exportFileName="Ministry_Data_Entry_Modules"
                  exportPdfTitle="Ministry Data Entry Modules Report"
                />
              ) : (
                <Chart data={deChartData} barColor1="#0f417a" barColor2="#1e3a8a" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ORGANISATION EXCLUSIVE MODULES */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Organisation Exclusive Modules</h2>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div
            onClick={() => setIsOrgExpanded(!isOrgExpanded)}
            className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-slate-50 transition-all duration-200"
          >
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Organisation Exclusive Modules</h3>
            <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center bg-slate-105 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setOrgViewType('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${orgViewType === 'table' ? 'bg-[#0f417a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Table View"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOrgViewType('chart')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${orgViewType === 'chart' ? 'bg-[#0f417a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Visualization"
                >
                  <ChartIcon className="h-4 w-4" />
                </button>
              </div>
              <button className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm cursor-pointer">
                {isOrgExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isOrgExpanded && (
            <div className="border-t border-slate-100 p-5 space-y-4">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/65 shadow-sm">
                <button
                  onClick={() => setOrgSubSection('ports')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all select-none cursor-pointer ${orgSubSection === 'ports' ? 'bg-white text-[#0f417a] shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Major Ports
                </button>
                <button
                  onClick={() => setOrgSubSection('others')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all select-none cursor-pointer ${orgSubSection === 'others' ? 'bg-white text-[#0f417a] shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Other Organizations
                </button>
              </div>

              {orgViewType === 'table' ? (
                <Table
                  rowData={orgRows}
                  colDefs={orgColDefs}
                  enableExport={true}
                  exportFileName={`${orgSubSection === 'ports' ? 'Major_Ports' : 'Other_Orgs'}_Telemetry`}
                  exportPdfTitle={`${orgSubSection === 'ports' ? 'Major Ports' : 'Other Orgs'} Telemetry Report`}
                />
              ) : (
                <Chart data={orgChartData} barColor1="#d97706" barColor2="#b45309" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
