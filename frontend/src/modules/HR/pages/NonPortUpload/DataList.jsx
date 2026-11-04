import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchNonPortVacancyData } from '../../api';
import { Filter, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { 
  getSessionOrganisationId, 
  getSessionOrganisationName 
} from '../../../../utils/authSession';
import { storedDate } from '../../utils/nonPortDashboard';
import { HrColumnPicker, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';
import { toYmd } from '../../utils/dates';

// ---- Month helpers (outside the component so they are created once) ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// 11 or "11" -> "November". If it is already a name (or anything else) it is returned as is.
const getMonthName = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? MONTH_NAMES[n - 1] : value;
};

// Tidy the uploaded spreadsheet values once, right after fetching: month number -> name,
// stray / doubled spaces removed, and 'filled' / 'Vacant' / 'vacant' -> 'Filled' / 'Vacant'.
const tidy = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value);
const statusLabel = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  return v ? v[0].toUpperCase() + v.slice(1) : '';
};

const normalizeRows = (rows) =>
  rows.map(r => {
    const m = r['Month'] ?? r.Uploaded_month ?? r.month;
    const name = getMonthName(m);
    return {
      ...r,
      Month: name,
      Uploaded_month: name,
      Department: tidy(r['Department'] ?? r.department),
      'Post ID': tidy(r['Post ID'] ?? r.post_id),
      'Post Name': tidy(r['Post Name'] ?? r.post_name),
      Class: tidy(r['Class'] ?? r.class),
      'Vacant or Filled': statusLabel(r['Vacant or Filled'] ?? r.vacant_or_filled),
      'Employee Name': tidy(r['Employee Name'] ?? r.name_of_employee),
      'Employee Reference ID': tidy(r['Employee Reference ID'] ?? r.staff_reference_id),
    };
  });

// Column alignment / wrapping for this grid (styles in ../hrTables.css, .hr-nonport-grid)
const LEFT = { headerClass: 'np-left', cellClass: 'np-left' };
const CENTER = { headerClass: 'np-center', cellClass: 'np-center' };
const WRAP = { wrapText: true, autoHeight: true };
const withClass = (base, extra) => ({ ...base, cellClass: `${base.cellClass} ${extra}` });

const START_YEAR = 2023;
const END_YEAR = 2026;

const YEAR_OPTIONS = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, i) => String(END_YEAR - i)   // 2026, 2025, 2024, 2023
);

export default function NonPortVacancyList({ triggerNotification }) {
  // The server pins organisation users to their own organisation; these are for the request and the PDF title
  const currentOrgId = getSessionOrganisationId();
  const currentOrgName = getSessionOrganisationName() || 'Your organisation';

  // Filters State
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Rows for the year / month they were fetched for; loading until the current pair has arrived
  const dataKey = `${currentOrgId}|${selectedYear}|${selectedMonth}`;
  const [loaded, setLoaded] = useState({ key: null, rows: [] });
  const vacancyData = loaded.rows;
  const loading = Boolean(currentOrgId) && loaded.key !== dataKey;
  const [pageSize, setPageSize] = useState(10);

  // Dropdown / Panel Toggle States
  const [filterOpen, setFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  // The filter panel closes on an outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toasts only (no alert); every call passes its own type
  const notify = (msg, type) => triggerNotification?.(msg, type);

  // Fetch Vacancy Data
useEffect(() => {
  if (!currentOrgId) return undefined;
  let isMounted = true;

  const params = {};
  if (selectedYear)  params.year  = selectedYear;
  if (selectedMonth) params.month = MONTH_NAMES.indexOf(selectedMonth) + 1; // "November" -> 11

  fetchNonPortVacancyData(currentOrgId, params)
    .then(res => {
      if (!isMounted) return;
      const list = Array.isArray(res.data?.rowData) ? res.data.rowData
                 : Array.isArray(res.data) ? res.data
                 : [];
      setLoaded({ key: dataKey, rows: normalizeRows(list) });
    })
    .catch(err => {
      console.warn('Error loading vacancy data:', err);
      if (isMounted) setLoaded({ key: dataKey, rows: [] });
    });

  return () => { isMounted = false; };
}, [currentOrgId, selectedYear, selectedMonth, dataKey]);

  // Unique filter option values
  const uniqueDepts = useMemo(() => {
    return [...new Set(vacancyData.map(r => r['Department'] || r.department).filter(Boolean))].sort();
  }, [vacancyData]);

  const uniqueClasses = useMemo(() => {
    return [...new Set(vacancyData.map(r => r['Class'] || r.class).filter(Boolean))].sort();
  }, [vacancyData]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDept) count++;
    if (selectedClass) count++;
    if (selectedStatus) count++;
    if (selectedYear) count++;
    if (selectedMonth) count++;
    return count;
  }, [selectedDept, selectedClass, selectedStatus, selectedYear, selectedMonth]);

  const resetFilters = () => {
    setSelectedDept('');
    setSelectedClass('');
    setSelectedStatus('');
    setSelectedYear('');
    setSelectedMonth('');
    setSearchTerm('');
  };

  // Filtered rows
  const filteredData = useMemo(() => {
    return vacancyData.filter(item => {
      const dept = item['Department'] || item.department || '';
      const cls = item['Class'] || item.class || '';
      const status = String(item['Vacant or Filled'] || item.vacant_or_filled || '').toLowerCase();
      const year = String(item['Year'] || item.Uploaded_year || '');
      const month = item['Month'] || item.Uploaded_month || '';

      if (selectedDept && dept !== selectedDept) return false;
      if (selectedClass && cls !== selectedClass) return false;
      if (selectedStatus && status !== selectedStatus.toLowerCase()) return false;
      if (selectedYear && year !== selectedYear) return false;
      if (selectedMonth && month !== selectedMonth) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const searchPool = [
          dept,
          cls,
          status,
          year,
          month,
          item['Post ID'] || item.post_id || '',
          item['Post Name'] || item.post_name || '',
          item['Employee Name'] || item.name_of_employee || '',
          item['Employee Reference ID'] || item.staff_reference_id || '',
        ].join(' ').toLowerCase();

        if (!searchPool.includes(query)) return false;
      }

      return true;
    });
  }, [vacancyData, selectedDept, selectedClass, selectedStatus, selectedYear, selectedMonth, searchTerm]);

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState({
    'Year': true,
    'Month': true,
    'Department': true,
    'Post ID': true,
    'Post Name': true,
    'Class': true,
    'Vacant or Filled': true,
    'Date of Arise in Vacancy': true,
    'Employee Name': true,
    'Employee Reference ID': true,
    'Date of Retirement': true
  });

  // Base Column Definitions: S.No, Year and Month stay on the left while scrolling sideways;
  // names wrap, codes / dates / status are centred
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      minWidth: 72,
      maxWidth: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      ...withClass(CENTER, 'np-muted'),
    },
    {
      headerName: 'Year',
      field: 'Year',
      minWidth: 86,
      maxWidth: 96,
      pinned: 'left',
      valueGetter: (params) => params.data?.['Year'] ?? params.data?.Uploaded_year ?? '-',
      ...CENTER,
    },
    {
      headerName: 'Month',
      field: 'Month',
      minWidth: 108,
      maxWidth: 124,
      pinned: 'left',
      valueGetter: (params) => params.data?.['Month'] || '-',
      ...CENTER,
    },
    {
      headerName: 'Department',
      field: 'Department',
      flex: 1.2,
      minWidth: 170,
      valueGetter: (params) => params.data?.['Department'] || '-',
      ...WRAP,
      ...LEFT,
    },
    {
      headerName: 'Post ID',
      field: 'Post ID',
      minWidth: 110,
      valueGetter: (params) => params.data?.['Post ID'] || '-',
      ...WRAP,
      ...withClass(CENTER, 'np-break-all'),
    },
    {
      headerName: 'Post Name',
      field: 'Post Name',
      flex: 2,
      minWidth: 230,
      valueGetter: (params) => params.data?.['Post Name'] || '-',
      ...WRAP,
      ...withClass(LEFT, 'np-strong'),
    },
    {
      headerName: 'Class',
      field: 'Class',
      minWidth: 90,
      valueGetter: (params) => params.data?.['Class'] || '-',
      ...CENTER,
    },
    {
      headerName: 'Vacant or Filled',
      field: 'Vacant or Filled',
      minWidth: 120,
      ...CENTER,
      cellRenderer: (params) => {
        const label = params.data?.['Vacant or Filled'];
        if (!label) return '-';
        return <span className={`np-status ${label === 'Filled' ? 'np-status-filled' : 'np-status-vacant'}`}>{label}</span>;
      }
    },
    {
      headerName: 'Date of Arise in Vacancy',
      field: 'Date of Arise in Vacancy',
      minWidth: 130,
      valueGetter: (params) => storedDate(params.data?.['Date of Arise in Vacancy'] ?? params.data?.date_of_arise_in_vacancy),
      ...CENTER,
    },
    {
      headerName: 'Employee Name',
      field: 'Employee Name',
      flex: 1.4,
      minWidth: 180,
      valueGetter: (params) => params.data?.['Employee Name'] || '-',
      ...WRAP,
      ...LEFT,
    },
    {
      headerName: 'Employee Reference ID',
      field: 'Employee Reference ID',
      minWidth: 140,
      valueGetter: (params) => params.data?.['Employee Reference ID'] || '-',
      ...WRAP,
      ...withClass(CENTER, 'np-break-all'),
    },
    {
      headerName: 'Date of Retirement',
      field: 'Date of Retirement',
      minWidth: 140,
      valueGetter: (params) => storedDate(params.data?.['Date of Retirement'] ?? params.data?.date_of_retirement),
      ...CENTER,
    }
  ], []);

  // Filter columns based on visibility
  const activeColumnDefs = useMemo(() => {
    return columnDefs.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [columnDefs, visibleCols]);

  // Export headers & rows for Copy / Excel / PDF
  const exportHeaders = useMemo(() => {
    return [
      'S.No', 'Year', 'Month', 'Department', 'Post ID', 'Post Name', 
      'Class', 'Status', 'Date of Arise in Vacancy', 'Employee Name', 
      'Employee Ref ID', 'Date of Retirement'
    ];
  }, []);

  const exportRows = useMemo(() => {
    return filteredData.map((row, idx) => [
      idx + 1,
      row['Year'] || row.Uploaded_year || '-',
      row['Month'] || row.Uploaded_month || '-',
      row['Department'] || row.department || '-',
      row['Post ID'] || row.post_id || '-',
      row['Post Name'] || row.post_name || '-',
      row['Class'] || row.class || '-',
      row['Vacant or Filled'] || row.vacant_or_filled || '-',
      storedDate(row['Date of Arise in Vacancy'] ?? row.date_of_arise_in_vacancy),
      row['Employee Name'] || row.name_of_employee || '-',
      row['Employee Reference ID'] || row.staff_reference_id || '-',
      storedDate(row['Date of Retirement'] ?? row.date_of_retirement)
    ]);
  }, [filteredData]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      notify('No data available to export', 'warning');
      return;
    }

    try {
      const exportObjects = filteredData.map((row, idx) => ({
        'S.No': idx + 1,
        'Year': row['Year'] || row.Uploaded_year || '-',
        'Month': row['Month'] || row.Uploaded_month || '-',
        'Department': row['Department'] || row.department || '-',
        'Post ID': row['Post ID'] || row.post_id || '-',
        'Post Name': row['Post Name'] || row.post_name || '-',
        'Class': row['Class'] || row.class || '-',
        'Status': row['Vacant or Filled'] || row.vacant_or_filled || '-',
        'Date of Arise in Vacancy': storedDate(row['Date of Arise in Vacancy'] ?? row.date_of_arise_in_vacancy),
        'Employee Name': row['Employee Name'] || row.name_of_employee || '-',
        'Employee Ref ID': row['Employee Reference ID'] || row.staff_reference_id || '-',
        'Date of Retirement': storedDate(row['Date of Retirement'] ?? row.date_of_retirement)
      }));

      const ws = XLSX.utils.json_to_sheet(exportObjects);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vacancy_Details');
      XLSX.writeFile(wb, `Non_Port_Vacancy_Details_${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Excel exported successfully!', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      notify('Failed to export Excel', 'error');
    }
  };

  // Export to PDF handler
  const handleExportPdf = () => {
    if (!filteredData || filteredData.length === 0) {
      notify('No data available to export', 'warning');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.setTextColor(15, 65, 122);
      doc.text('Ministry of Ports, Shipping and Waterways - Sagarmanthan', 14, 15);
      
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`Monthly Vacancy Details - ${currentOrgName}`, 14, 22);
      doc.setFontSize(8);
      doc.text(`Generated on: ${toYmd(new Date())} ${new Date().toTimeString().slice(0, 5)}`, 14, 28);

      autoTable(doc, {
        startY: 32,
        head: [exportHeaders],
        body: exportRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 65, 122], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 2 },
      });

      doc.save(`Non_Port_Vacancy_Details_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('PDF Export Error:', err);
      notify('Failed to generate PDF', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Action Bar matching standard Sagarmanthan design */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">
          
          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={filterOpen}
              activeCount={activeFiltersCount}
              onToggle={() => setFilterOpen(prev => !prev)}
              onReset={resetFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <HrSearchBox placeholder="Search vacancy details..." value={searchTerm} onChange={setSearchTerm} />
            <HrRowsSelect value={pageSize} onChange={setPageSize} />
            <HrTotalBadge count={filteredData.length} />
            <HrColumnPicker
              capitalize
              columns={Object.keys(visibleCols).map(col => ({ key: col, label: col, visible: visibleCols[col] }))}
              onToggle={(col) => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
            />

            {/* Copy Button */}
            <CopyButton 
              headers={exportHeaders} 
              data={exportRows} 
              triggerNotification={triggerNotification} 
              color="#0f417a" 
              hoverBg="#f1f5f9" 
            />

            {/* Export Dropdown */}
            <ExportDropdown 
              onExportExcel={handleExportExcel} 
              onExportPdf={handleExportPdf} 
              color="#0f417a" 
              hoverColor="#134e96" 
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {filterOpen && (
          <div ref={filterDropdownRef} className="bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 p-4 shadow-xs animate-fade-in z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Filter Vacancy Details
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Department Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">All Departments</option>
                  {uniqueDepts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Vacant / Filled
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">All Statuses</option>
                  <option value="filled">Filled</option>
                  <option value="vacant">Vacant</option>
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">All Months</option>
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table Viewport */}
        <div className="p-4 hr-nonport-grid">
          <Table
            rowData={filteredData}
            columnDefs={activeColumnDefs}
            loading={loading}
            loadingMessage="Loading vacancy details..."
            paginationPageSize={pageSize}
            color="#0f417a"
            domLayout="autoHeight"
          />
        </div>
      </div>
    </div>
  );
}
