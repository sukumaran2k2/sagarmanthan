import React, { useState, useEffect, useMemo, useRef } from 'react';
import { axiosInstance as axios } from '../../../api';
import { 
  Search, 
  ChevronDown, 
  X, 
  Filter, 
  RotateCcw,
  CalendarCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { 
  getSessionOrganisationId, 
  getSessionOrganisationName 
} from '../../../utils/authSession';

export default function NonPortMonthlyUpload({ triggerNotification }) {
  const currentOrgId = getSessionOrganisationId() || 20;
  const currentOrgName = getSessionOrganisationName() || 'Non-Port Organisation';

  // Data State
  const [vacancyData, setVacancyData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Dropdown / Panel Toggle States
  const [filterOpen, setFilterOpen] = useState(false);
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const colDropdownRef = useRef(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notify = (msg, type = 'success') => {
    if (triggerNotification) {
      triggerNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  // Fetch Vacancy Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    axios.get(`${API_BASE_URL}/get-data-from-vacancy-details/${currentOrgId}`)
      .then(res => {
        if (!isMounted) return;
        if (res.data?.rowData && Array.isArray(res.data.rowData)) {
          setVacancyData(res.data.rowData);
        } else if (Array.isArray(res.data)) {
          setVacancyData(res.data);
        } else {
          setVacancyData([]);
        }
      })
      .catch(err => {
        console.warn('Error loading vacancy data:', err);
        if (isMounted) setVacancyData([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentOrgId]);

  // Unique filter option values
  const uniqueDepts = useMemo(() => {
    return [...new Set(vacancyData.map(r => r['Department'] || r.department).filter(Boolean))].sort();
  }, [vacancyData]);

  const uniqueClasses = useMemo(() => {
    return [...new Set(vacancyData.map(r => r['Class'] || r.class).filter(Boolean))].sort();
  }, [vacancyData]);

  const uniqueYears = useMemo(() => {
    return [...new Set(vacancyData.map(r => String(r['Year'] || r.Uploaded_year || '')).filter(Boolean))].sort((a, b) => b - a);
  }, [vacancyData]);

  const uniqueMonths = useMemo(() => {
    return [...new Set(vacancyData.map(r => r['Month'] || r.Uploaded_month).filter(Boolean))];
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

  // Base Column Definitions
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      minWidth: 75,
      maxWidth: 90,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
    },
    {
      headerName: 'Year',
      field: 'Year',
      minWidth: 100,
      valueGetter: (params) => params.data?.['Year'] ?? params.data?.Uploaded_year ?? '-',
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'Month',
      field: 'Month',
      minWidth: 120,
      valueGetter: (params) => params.data?.['Month'] ?? params.data?.Uploaded_month ?? '-',
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'Department',
      field: 'Department',
      minWidth: 180,
      valueGetter: (params) => params.data?.['Department'] ?? params.data?.department ?? '-',
      cellClass: 'font-semibold text-slate-800 dark:text-slate-200',
    },
    {
      headerName: 'Post ID',
      field: 'Post ID',
      minWidth: 120,
      valueGetter: (params) => params.data?.['Post ID'] ?? params.data?.post_id ?? '-',
      cellClass: 'text-center font-mono text-xs',
      headerClass: 'text-center',
    },
    {
      headerName: 'Post Name',
      field: 'Post Name',
      minWidth: 200,
      valueGetter: (params) => params.data?.['Post Name'] ?? params.data?.post_name ?? '-',
      cellClass: 'font-medium',
    },
    {
      headerName: 'Class',
      field: 'Class',
      minWidth: 100,
      valueGetter: (params) => params.data?.['Class'] ?? params.data?.class ?? '-',
      cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300',
      headerClass: 'text-center',
    },
    {
      headerName: 'Vacant or Filled',
      field: 'Vacant or Filled',
      minWidth: 150,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        const val = String(params.data?.['Vacant or Filled'] || params.data?.vacant_or_filled || '').toLowerCase();
        const isFilled = val === 'filled';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
            isFilled 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}>
            {params.data?.['Vacant or Filled'] || params.data?.vacant_or_filled || '-'}
          </span>
        );
      }
    },
    {
      headerName: 'Date of Arise in Vacancy',
      field: 'Date of Arise in Vacancy',
      minWidth: 180,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        const val = params.data?.['Date of Arise in Vacancy'] || params.data?.date_of_arise_in_vacancy;
        return val ? new Date(val).toLocaleDateString('en-GB') : '-';
      }
    },
    {
      headerName: 'Employee Name',
      field: 'Employee Name',
      minWidth: 180,
      valueGetter: (params) => params.data?.['Employee Name'] ?? params.data?.name_of_employee ?? '-',
      cellClass: 'font-medium text-slate-800 dark:text-slate-200',
    },
    {
      headerName: 'Employee Reference ID',
      field: 'Employee Reference ID',
      minWidth: 180,
      valueGetter: (params) => params.data?.['Employee Reference ID'] ?? params.data?.staff_reference_id ?? '-',
      cellClass: 'text-center font-mono text-xs',
      headerClass: 'text-center',
    },
    {
      headerName: 'Date of Retirement',
      field: 'Date of Retirement',
      minWidth: 165,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        const val = params.data?.['Date of Retirement'] || params.data?.date_of_retirement;
        return val ? new Date(val).toLocaleDateString('en-GB') : '-';
      }
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
      row['Date of Arise in Vacancy'] || row.date_of_arise_in_vacancy || '-',
      row['Employee Name'] || row.name_of_employee || '-',
      row['Employee Reference ID'] || row.staff_reference_id || '-',
      row['Date of Retirement'] || row.date_of_retirement || '-'
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
        'Date of Arise in Vacancy': row['Date of Arise in Vacancy'] || row.date_of_arise_in_vacancy || '-',
        'Employee Name': row['Employee Name'] || row.name_of_employee || '-',
        'Employee Ref ID': row['Employee Reference ID'] || row.staff_reference_id || '-',
        'Date of Retirement': row['Date of Retirement'] || row.date_of_retirement || '-'
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
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

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
          
          {/* Left: Collapsible Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setFilterOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border shadow-xs select-none ${
                filterOpen || activeFiltersCount > 0
                  ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-blue-600 text-white text-[10px] h-4 w-4 rounded-full font-black">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  filterOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Quick Reset Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer dark:hover:bg-rose-900/30"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Search, Limits, Total, Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vacancy details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows Limit */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen(prev => !prev)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

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
                  {uniqueYears.map(y => (
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
                  {uniqueMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table Viewport */}
        <div className="p-4">
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
