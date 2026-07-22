import { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  UserCheck, 
  ChevronLeft, 
  ChevronDown, 
  FileSpreadsheet, 
  FileCheck, 
  Search,
  Calendar,
  Upload,
  Download,
  Trash2,
  X,
  TrendingUp,
  RefreshCw,
  Users
} from 'lucide-react';
import Table from '../../components/table';
import ExportDropdown from '../../components/ExportDropdown';
import CopyButton from '../../components/CopyButton';

function colorFromString(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

// Formats initials for employee avatar badges
function getInits(n) {
  return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
}

// Formats full ISO datetime string (e.g., "1970-01-01T09:30:00.000Z") to clean time string "09:30:00"
function formatTimeStr(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    if (val.includes('T')) {
      const parts = val.split('T');
      if (parts[1]) {
        return parts[1].slice(0, 8);
      }
    } else if (val.includes(' ')) {
      const parts = val.split(' ');
      if (parts[1]) {
        return parts[1].slice(0, 8);
      }
    }
    return val;
  }
  // Handle Date objects
  if (val instanceof Date) {
    return val.toTimeString().split(' ')[0];
  }
  return String(val);
}

export default function AttendanceView() {
  const [subTab, setSubTab] = useState('report'); // 'report' | 'data' | 'files'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data lists from DB
  const [filesList, setFilesList] = useState([]);
  const [employeeRows, setEmployeeRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Toast notification states
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#3B82F6');
  const [toastVisible, setToastVisible] = useState(false);

  // ---- ABSTRACT REPORT TAB STATE ----
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState('July');
  const [reportYear, setReportYear] = useState('2026');
  const [reportWeek, setReportWeek] = useState(2);

  // ---- DRILL DOWN REPLACE-UI STATE (NO OVERLAY) ----
  const [reportViewMode, setReportViewMode] = useState('summary'); // 'summary' | 'detail'
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');

  // Page limit for tables
  const [pageSize, setPageSize] = useState(15);
  const gridRef = useRef(null);

  const showToast = (msg, color = '#3B82F6') => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- FETCH FROM DATABASE ----
  const fetchFilesAndData = () => {
    setLoading(true);
    
    // Fetch uploaded files list
    const p1 = axios.get("http://localhost:3000/attendance")
      .then(res => setFilesList(res.data || []))
      .catch(err => console.error("Error fetching files list:", err));

    // Fetch parsed employee excel rows
    const p2 = axios.get("http://localhost:3000/excelData")
      .then(res => setEmployeeRows(res.data || []))
      .catch(err => console.error("Error fetching employee attendance rows:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  };

  // ---- CONNECT WITH DB (CHECK LATEST FILE) ----
  // Runs once on mount to find the latest uploaded parameters in DB
  useEffect(() => {
    fetchFilesAndData();

    axios.get("http://localhost:3000/employee-attendance-check")
      .then(res => {
        const data = res.data;
        if (data && data.length > 0) {
          const latestMonth = data[0].Month || 'July';
          const latestYear = String(data[0].Year || '2026');
          const latestWeek = Number(data[0].Week || 2);
          
          setReportMonth(latestMonth);
          setReportYear(latestYear);
          setReportWeek(latestWeek);
          
          // Fetch abstract report for these parameters
          setReportLoading(true);
          axios.get(`http://localhost:3000/employee-attendance-weekone-report/${latestMonth}/${latestYear}/${latestWeek}`)
            .then(r => setReportData(r.data.rowData || []))
            .catch(e => console.error("Report fetch error:", e))
            .finally(() => setReportLoading(false));
        } else {
          // Fallback if no records found in DB yet
          handleFetchReport();
        }
      })
      .catch(err => {
        console.error("Latest file parameters fetch error:", err);
        // Fallback to fetch report with initial state
        handleFetchReport();
      });
  }, []);

  // Fetch report based on user filter selections
  const handleFetchReport = () => {
    setReportLoading(true);
    setReportViewMode('summary'); // Switch back to summary when fetching new parameters
    axios.get(`http://localhost:3000/employee-attendance-weekone-report/${reportMonth}/${reportYear}/${reportWeek}`)
      .then(res => {
        setReportData(res.data.rowData || []);
      })
      .catch(err => {
        console.error("Report fetch error:", err);
        setReportData([]);
        showToast("⚠ No data available for this selection", "#F59E0B");
      })
      .finally(() => {
        setReportLoading(false);
      });
  };

  // Dynamically populate Year Dropdown Options matching the logic in old code
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2022; y <= currentYear + 1; y++) {
      years.push(String(y));
    }
    return years.reverse(); // Newest first
  }, []);

  // ---- KPI CARD METRICS ----
  const avgAttendancePct = useMemo(() => {
    if (employeeRows.length === 0) return '—';
    const totalDaysMarked = employeeRows.reduce((acc, row) => acc + (row.AttendanceMarked || 0), 0);
    const avg = (totalDaysMarked / (employeeRows.length * 30)) * 100;
    return avg.toFixed(2) + '%';
  }, [employeeRows]);

  const avgDaysPresent = useMemo(() => {
    if (employeeRows.length === 0) return '—';
    const sum = employeeRows.reduce((acc, row) => acc + (row.AttendanceMarked || 0), 0);
    return (sum / employeeRows.length).toFixed(1) + ' Days';
  }, [employeeRows]);

  // ---- REPORT AGGREGATES ----
  const aggregates = useMemo(() => {
    if (reportData.length === 0) return null;
    const totalEmployees = reportData.reduce((sum, r) => sum + Number(r['Number Of Employees'] || 0), 0);
    const avgHours = reportData.reduce((sum, r) => sum + Number(r['Average Working Hours'] || 0), 0) / reportData.length;
    const totalLess8 = reportData.reduce((sum, r) => sum + Number(r['Number Of Employees - Average Working Hours Less Than 8 1/2 hrs'] || 0), 0);
    const totalBefore930 = reportData.reduce((sum, r) => sum + Number(r['Number Of Employees InTime Before 9:30AM'] || 0), 0);
    const totalAfter930 = reportData.reduce((sum, r) => sum + Number(r['Number Of Employees InTime After 9:30AM'] || 0), 0);
    const totalBefore530 = reportData.reduce((sum, r) => sum + Number(r['Number Of Employees OutTime before 5:30PM'] || 0), 0);
    
    return {
      totalEmployees,
      avgHours: avgHours.toFixed(2),
      totalLess8,
      totalBefore930,
      totalAfter930,
      totalBefore530
    };
  }, [reportData]);

  // ---- FILTERS ----
  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return filesList;
    return filesList.filter(f => 
      (f.file_name || '').toLowerCase().includes(q) ||
      (f.date_of_upload || '').toLowerCase().includes(q)
    );
  }, [filesList, searchTerm]);

  const filteredEmployeeRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return employeeRows;
    return employeeRows.filter(r => 
      (r.EmpName || '').toLowerCase().includes(q) ||
      (r.Designation || '').toLowerCase().includes(q) ||
      (r.Wing || '').toLowerCase().includes(q) ||
      (r.Division || '').toLowerCase().includes(q) ||
      String(r.EmpId).toLowerCase().includes(q)
    );
  }, [employeeRows, searchTerm]);

  // ---- FILE ACTIONS ----
  const handleDownloadFile = (id, fileName) => {
    axios.get(`http://localhost:3000/attendance/download/${id}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'attendance.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Download error:", err);
        showToast("❌ Failed to download file", "#EF4444");
      });
  };

  const handleDeleteFile = (id) => {
    if (!window.confirm("Deleting the record will also delete all employee rows parsed from this file. Are you sure you want to delete?")) return;
    
    axios.delete(`http://localhost:3000/attendance/${id}`)
      .then(() => {
        showToast("✅ Attendance record deleted successfully", "#10B981");
        fetchFilesAndData();
        setReportData([]); // clear report cache
      })
      .catch(err => {
        console.error("Delete error:", err);
        showToast("❌ Failed to delete record", "#EF4444");
      });
  };

  const handleDownloadSample = () => {
    axios.get('http://localhost:3000/attendance/downloadSampleDocument', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Attendance_Sample.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Template download error:", err);
        showToast("❌ Failed to download sample template", "#EF4444");
      });
  };

  // ---- COPY REPORT TO CLIPBOARD (YP REPLICATED ENGINE) ----
  const handleCopy = () => {
    if (!gridRef.current?.api) return;
    let tsv = '';
    const activeCols = (reportViewMode === 'summary' ? reportColDefs : detailColDefs)
      .filter(c => c.headerName && c.field !== 'S.No');
    tsv += activeCols.map(c => c.headerName).join('\t') + '\n';
    
    let index = 1;
    gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data;
      if (!row) return;
      const rowTsv = activeCols.map(col => {
        let val = '';
        if (col.field === 'S.No') val = index++;
        else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
        else val = row[col.field] !== undefined ? row[col.field] : '';
        val = String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return val;
      }).join('\t');
      tsv += rowTsv + '\n';
    });
    
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 Report copied to clipboard!', '#10B981');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  };

  // ---- EXPORT REPORT TO EXCEL / PDF (YP REPLICATED ENGINE) ----
  const handleExport = (type) => {
    const title = reportViewMode === 'summary' 
      ? `Form_1.3A_Abstract_Attendance_Week_${reportWeek}_${reportMonth}_${reportYear}`
      : detailTitle.replace(/\s+/g, '_');

    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Report exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = reportViewMode === 'summary' ? reportColDefs : detailColDefs;

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      const activeRows = reportViewMode === 'summary' ? reportData : detailData;
      activeRows.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      // Include totals row for summary print layout
      if (reportViewMode === 'summary' && aggregates) {
        rowsHtml += `<tr style="background:#f1f5f9; font-weight:800; border-top: 2px solid #D3D6D9;">
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;"></td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">Total</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalEmployees}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.avgHours}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalLess8}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalBefore930}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalAfter930}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalBefore530}</td>
        </tr>`;
      }

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- EXPORT RAW EMPLOYEE DATA TO EXCEL / PDF (MATCHING SCREENSHOT ACTION) ----
  const handleExportRawData = (type) => {
    const title = `Employee_Attendance_Raw_Records_${reportMonth}_${reportYear}`;
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Raw data exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = colDefs;

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredEmployeeRows.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- EXPORT UPLOAD HISTORY FILE LIST TO EXCEL / PDF (MATCHING SCREENSHOT ACTION) ----
  const handleExportHistory = (type) => {
    const title = 'History_Of_Employee_Attendance_File_Uploaded';
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Upload history exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = historyColDefs.filter(c => c.headerName !== 'Actions');

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredFiles.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.field === 'file_name') val = row.file_name;
            else if (col.headerName === 'Uploaded By') val = 'Sandeep Gupta';
            else if (col.field === 'date_of_upload') val = formatDate(row.date_of_upload);
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- DRILL DOWN REPLACE-UI ACTION (NO OVERLAYS) ----
  const handleCellClick = (row, type, label) => {
    setDetailTitle(`${label} - ${row.Wing}`);
    setDetailLoading(true);
    setReportViewMode('detail'); // Swap summary table view with detail table view directly in page
    
    axios.get(`http://localhost:3000/employee-attendance-weekone-detail/${reportYear}/${reportMonth}/${row.WingID}/null/${type}/${reportWeek}`)
      .then(res => {
        setDetailData(res.data.rowData || []);
      })
      .catch(err => {
        console.error("Detail error:", err);
        setDetailData([]);
        showToast("⚠ No detail data available", "#F59E0B");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  // ---- UPLOAD FLOW ----
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) { showToast("⚠ Please select an Excel file", "#F59E0B"); return; }
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    axios.post("http://localhost:3000/attendance", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
      .then(res => {
        const id = res.data.id;
        showToast("📁 Parsing file and storing spreadsheet rows...", "#3B82F6");
        return axios.post(`http://localhost:3000/attendance/storecsv/${id}`);
      })
      .then(() => {
        showToast("✅ Attendance sheets uploaded and stored successfully", "#10B981");
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        fetchFilesAndData();
        setReportData([]); // clear report cache
      })
      .catch(err => {
        console.error("Upload error:", err);
        showToast(err.response?.data?.error || "❌ File upload failed. Check spreadsheet format.", "#EF4444");
      })
      .finally(() => {
        setUploading(false);
      });
  };

  // Helper date formatter to dd/mm/yyyy
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // ---- AG GRID COLUMNS FOR RAW EMPLOYEE RECORDS (MATCHING SCREENSHOT LAYOUT) ----
  const colDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 60, 
      minWidth: 60,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'EmpId', 
      headerName: 'EMP ID', 
      flex: 1,
      minWidth: 90, 
      pinned: 'left', 
      cellClass: 'font-mono font-bold text-slate-800 flex items-center justify-center' 
    },
    { 
      field: 'EmpName', 
      headerName: 'EMP Name', 
      flex: 2,
      minWidth: 160, 
      cellClass: 'font-extrabold text-slate-900 flex items-center text-left',
      cellRenderer: (params) => (
        <div className="flex items-center gap-2">
          <div className="avatar flex-shrink-0" style={{ 
            background: colorFromString(params.value || ''), 
            width: '26px', 
            height: '26px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 700, 
            fontSize: '.65rem' 
          }}>
            {getInits(params.value || '')}
          </div>
          <span className="truncate">{params.value}</span>
        </div>
      )
    },
    { field: 'Designation', headerName: 'Designation', flex: 1.5, minWidth: 130, cellClass: 'flex items-center text-left' },
    { field: 'Wing', headerName: 'Wing', flex: 1.2, minWidth: 120, cellClass: 'flex items-center text-left' },
    { field: 'Division', headerName: 'Division', flex: 1.2, minWidth: 120, cellClass: 'flex items-center text-left' },
    { field: 'AttendanceMarked', headerName: 'No of days Attendance Marked', flex: 1.3, minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-bold text-slate-700 flex items-center justify-center' },
    { field: 'WorkingHours', headerName: 'Average Working Hours', flex: 1.3, minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-bold text-blue-700 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'InTimeAvg', headerName: 'In Time Avg', flex: 1.2, minWidth: 110, type: 'numericColumn', cellClass: 'text-center font-medium text-emerald-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'OutTimeAvg', headerName: 'Out Time Avg', flex: 1.2, minWidth: 110, type: 'numericColumn', cellClass: 'text-center font-medium text-amber-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'Month', headerName: 'Month', flex: 1, minWidth: 90, cellClass: 'text-center flex items-center justify-center' },
    { field: 'Year', headerName: 'Year', flex: 1, minWidth: 90, cellClass: 'text-center flex items-center justify-center' },
    { 
      field: 'Week', 
      headerName: 'Week', 
      flex: 1.1, 
      minWidth: 100, 
      cellClass: 'text-center flex items-center justify-center',
      valueFormatter: (params) => params.value ? `Week ${params.value}` : ''
    }
  ], []);

  // ---- AG GRID COLUMNS FOR WEEKLY ABSTRACT SUMMARY REPORT (FLEX STRETCHED) ----
  const reportColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => {
        if (params.data && params.data.Wing === 'Total') return '';
        return params.node.rowIndex + 1;
      }, 
      width: 55, 
      minWidth: 55,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'Wing', 
      headerName: 'Wing', 
      flex: 2,
      minWidth: 140, 
      pinned: 'left', 
      cellClass: 'font-semibold text-slate-800 flex items-center text-left' 
    },
    { 
      field: 'Number Of Employees', 
      headerName: 'Employees', 
      flex: 1.1,
      minWidth: 100, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'noOfEmp', 'Number Of Employees')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Average Working Hours', 
      headerName: 'Avg Working Hours', 
      flex: 1.2,
      minWidth: 110, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-blue-700 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'avgWorkHours', 'Average Working Hours')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees - Average Working Hours Less Than 8 1/2 hrs', 
      headerName: 'Avg Hours < 8.5', 
      flex: 1.3,
      minWidth: 120, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'avgWorkCount', 'Avg Working Hours < 8.5 hrs')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees InTime Before 9:30AM', 
      headerName: 'InTime Before 9:30 AM', 
      flex: 1.3,
      minWidth: 130, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-emerald-600 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'beforeIn', 'InTime Before 9:30 AM')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees InTime After 9:30AM', 
      headerName: 'InTime After 9:30 AM', 
      flex: 1.3,
      minWidth: 130, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-amber-600 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'afterIn', 'InTime After 9:30 AM')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees OutTime before 5:30PM', 
      headerName: 'OutTime Before 5:30 PM', 
      flex: 1.3,
      minWidth: 130, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'beforeOut', 'OutTime Before 5:30 PM')}>
            {params.value || 0}
          </span>
        );
      }
    }
  ], [reportMonth, reportYear, reportWeek]);

  // ---- AG GRID COLUMNS FOR DRILL DOWN EMPLOYEE DETAIL LIST (FLEX STRETCHED) ----
  const detailColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 55, 
      minWidth: 55,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'EMP ID', 
      headerName: 'Emp ID', 
      flex: 1,
      minWidth: 90, 
      pinned: 'left', 
      cellClass: 'font-mono font-bold text-slate-800 flex items-center justify-center' 
    },
    { 
      field: 'EMP Name', 
      headerName: 'Employee Name', 
      flex: 2,
      minWidth: 160, 
      cellClass: 'font-extrabold text-slate-900 flex items-center text-left'
    },
    { field: 'Designation', headerName: 'Designation', flex: 1.5, minWidth: 130, cellClass: 'flex items-center text-left' },
    { 
      headerName: 'Wing / Division', 
      flex: 1.8,
      minWidth: 150, 
      cellClass: 'flex items-center text-left',
      valueGetter: (params) => {
        const wing = params.data.Wing || '';
        const div = params.data.Division || '';
        return div && div !== '-' ? `${wing} / ${div}` : wing;
      }
    },
    { field: 'No of days Attendance Marked', headerName: 'Days Marked', flex: 1, minWidth: 95, type: 'numericColumn', cellClass: 'text-center font-bold text-slate-700 flex items-center justify-center' },
    { field: 'Average Working Hours', headerName: 'Avg Working Hours', flex: 1.2, minWidth: 110, type: 'numericColumn', cellClass: 'text-center font-bold text-blue-700 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'In Time Avg', headerName: 'Avg In-Time', flex: 1.1, minWidth: 95, type: 'numericColumn', cellClass: 'text-center font-medium text-emerald-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'Out Time Avg', headerName: 'Avg Out-Time', flex: 1.1, minWidth: 95, type: 'numericColumn', cellClass: 'text-center font-medium text-amber-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) }
  ], []);

  // ---- AG GRID COLUMNS FOR UPLOADED FILE HISTORY (MATCHING SCREENSHOT LAYOUT) ----
  const historyColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 60, 
      minWidth: 60,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'file_name', 
      headerName: 'File Name', 
      flex: 3,
      minWidth: 250,
      cellClass: 'font-semibold flex items-center text-left',
      cellRenderer: (params) => (
        <span 
          onClick={() => handleDownloadFile(params.data.id, params.value)}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1.5"
          title="Download File"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{params.value}</span>
        </span>
      )
    },
    {
      headerName: 'Uploaded By',
      flex: 2,
      minWidth: 150,
      cellClass: 'flex items-center text-left text-slate-700 font-medium',
      valueGetter: () => 'Sandeep Gupta'
    },
    { 
      field: 'date_of_upload', 
      headerName: 'Date of Upload', 
      flex: 2,
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center font-medium text-slate-700',
      valueFormatter: (params) => formatDate(params.value)
    },
    {
      headerName: 'Actions',
      width: 90,
      minWidth: 90,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleDeleteFile(params.data.id)}
          className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition cursor-pointer"
          title="Delete Record"
        >
          <Trash2 size={15} />
        </button>
      )
    }
  ], []);

  // Pinned Bottom Totals Row for summary grid
  const pinnedBottomRowData = useMemo(() => {
    if (!aggregates) return [];
    return [{
      Wing: 'Total',
      'Number Of Employees': aggregates.totalEmployees,
      'Average Working Hours': parseFloat(aggregates.avgHours),
      'Number Of Employees - Average Working Hours Less Than 8 1/2 hrs': aggregates.totalLess8,
      'Number Of Employees InTime Before 9:30AM': aggregates.totalBefore930,
      'Number Of Employees InTime After 9:30AM': aggregates.totalAfter930,
      'Number Of Employees OutTime before 5:30PM': aggregates.totalBefore530
    }];
  }, [aggregates]);

  // Determine if top KPI cards should show
  const showKpiCards = useMemo(() => {
    // Hide cards when we are deepdown in report details
    if (subTab === 'report' && reportViewMode === 'detail') {
      return false;
    }
    return true;
  }, [subTab, reportViewMode]);

  return (
    <div className="w-full py-4 animate-fade-in text-slate-800 relative">
      
      {/* Breadcrumb Row dynamically changed matching YP layout & user screenshot */}
      <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 select-none px-4 md:px-6 mb-3 text-left">
        <span>Home</span>
        <span>/</span>
        <span>Attendance - Main page</span>
        <span>/</span>
        <span className="text-[#0f417a]">
          {subTab === 'files' ? 'History Of Employee Attendance File Uploaded' : 'View Employee Attendance'}
        </span>
      </div>

      {/* Page Heading Row styled with caption in Sagarmanthan Navy Blue (#0f417a) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none px-4 md:px-6 text-left">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            {subTab === 'files' ? 'History Of Employee Attendance File Uploaded' : 'View Employee Attendance'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            {subTab === 'files' 
              ? 'View and manage history records of attendance spreadsheet files uploaded to the platform.'
              : 'Manage, parse and monitor employee weekly abstract reports and raw attendance records.'
            }
          </p>
        </div>
      </div>

      {/* KPI Overviews - Hidden when deepdown inside report details */}
      {showKpiCards && (
        <div className="px-4 md:px-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Attendance</span>
                <span className="text-2xl font-black text-[#0f417a] block mt-1">{avgAttendancePct}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Across all spreadsheet inputs</span>
              </div>
              <div className="p-3.5 bg-blue-50 text-[#0f417a] rounded-xl border border-blue-100">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Uploaded Files</span>
                <span className="text-2xl font-black text-slate-900 block mt-1">{filesList.length}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Available for download</span>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Days Marked</span>
                <span className="text-2xl font-black text-amber-700 block mt-1">{avgDaysPresent}</span>
                <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Approved month-wise</span>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container taking absolute full width of parent viewport */}
      <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl shadow-sm overflow-hidden w-full">
        
        {/* Top Navigation Options: Padded */}
        <div className="p-4 sm:p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex gap-2">
              <button 
                onClick={() => { setSubTab('report'); setReportViewMode('summary'); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow ${subTab === 'report' ? 'bg-[#0f417a] hover:bg-[#0c3361] text-white' : 'bg-blue-50 text-[#0f417a] hover:bg-blue-100 cursor-pointer'}`}
              >
                Report
              </button>
              <button 
                onClick={() => setSubTab('data')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow ${subTab === 'data' ? 'bg-[#0f417a] hover:bg-[#0c3361] text-white' : 'bg-blue-50 text-[#0f417a] hover:bg-blue-100 cursor-pointer'}`}
              >
                Upload / View Data
              </button>
              <button 
                onClick={() => setSubTab('files')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow ${subTab === 'files' ? 'bg-[#0f417a] hover:bg-[#0c3361] text-white' : 'bg-blue-50 text-[#0f417a] hover:bg-blue-100 cursor-pointer'}`}
              >
                Upload / View History
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={handleDownloadSample}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Download User Manual excel template"
              >
                <span>User Manual</span>
              </button>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-[#198754] hover:bg-[#157347] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic content depending on active sub-tab */}
        {subTab === 'report' ? (
          /* Report View styled exactly like YP module Reports.jsx page (YP Brown Theme stays on for Report view) */
          <div className="space-y-0">
            
            {/* Unified Header & Toolbar mimicking YP Reports */}
            <div style={{
              background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
              padding: '20px 26px',
              borderBottom: '1px solid #eadede',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              position: 'relative'
            }} className="text-left">
              {/* Left Side: Back Button & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300 }}>
                {reportViewMode === 'detail' && (
                  <button
                    onClick={() => setReportViewMode('summary')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: 9,
                      background: '#fff', border: '1px solid #eadede',
                      color: '#4b2424', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f7f3f3'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <TrendingUp size={14} color="#8c4242" strokeWidth={2.5} />
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8c4242', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      Employee Attendance Report
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#4b2424', letterSpacing: '0.01em' }}>
                    {reportViewMode === 'summary' 
                      ? 'Form No.: 1.3A - Abstract - Attendance Sheet'
                      : detailTitle
                    }
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, fontWeight: 600, color: '#8c4242' }}>
                    <span>Report Period: <strong style={{ color: '#4b2424' }}>{reportMonth} {reportYear}</strong></span>
                    <span style={{ color: '#eadede' }}>•</span>
                    <span>Week: <strong style={{ color: '#4b2424' }}>{reportWeek}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Side Tools: Search box, Page limit, Total pill, CopyButton, ExportDropdown, Refresh button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                
                {/* Quick search input */}
                <div style={{ position: 'relative', width: 220 }}>
                  <Search size={14} color="#8c4242" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder={reportViewMode === 'summary' ? 'Search wing...' : 'Search name, designation...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', padding: '7.5px 34px 7.5px 34px',
                      border: '1px solid #eadede', borderRadius: 9,
                      fontSize: 13, fontWeight: 500, color: '#4b2424',
                      outline: 'none', background: '#fff',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#4b2424'; e.target.style.boxShadow = '0 0 0 3px rgba(75,36,36,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#eadede'; e.target.style.boxShadow = 'none'; }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Rows Limit Select Dropdown */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 9,
                  background: '#fff', border: '1px solid #eadede',
                  fontSize: 12.5, color: '#8c4242', fontWeight: 600
                }}>
                  <span style={{ fontSize: 9.5, uppercase: true, fontWeight: 800, color: '#94a3b8' }}>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                      background: 'transparent', border: 'none',
                      fontSize: 12.5, fontWeight: 700, color: '#4b2424',
                      outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                {/* Total Count Pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 9,
                  background: '#fff', border: '1px solid #eadede',
                }}>
                  <Users size={14} color="#4b2424" /> 
                  <span style={{ fontSize: 12.5, color: '#8c4242', fontWeight: 600 }}>
                    Total <strong style={{ color: '#4b2424', fontFamily: "'JetBrains Mono', monospace" }}>{reportViewMode === 'summary' ? reportData.length : detailData.length}</strong>
                  </span>
                </div>

                {/* Copy button component */}
                <CopyButton
                  onCopy={handleCopy}
                  color="#4b2424"
                  hoverBg="#f7f3f3"
                  className="!rounded-[9px] !py-[8px] !px-[14px]"
                />

                {/* Export dropdown component */}
                <ExportDropdown
                  onExportExcel={() => handleExport('Excel')}
                  onExportPdf={() => handleExport('PDF')}
                  color="#4b2424"
                  hoverColor="#6b3535"
                />

                {/* Refresh button */}
                <button
                  onClick={reportViewMode === 'summary' ? handleFetchReport : () => handleCellClick({Wing: detailTitle.split(' - ')[1]}, '', detailTitle.split(' - ')[0])}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 9,
                    background: '#fff', border: '1px solid #E4E6E2',
                    cursor: 'pointer', color: '#657386',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#4b2424'; e.currentTarget.style.borderColor = '#4b2424'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#657386'; e.currentTarget.style.borderColor = '#E4E6E2'; }}
                >
                  <RefreshCw size={15} className={reportLoading || detailLoading ? 'animate-spin' : ''} />
                </button>

              </div>
            </div>

            {/* Selectors card matching YP dashboard filter elements: Padded */}
            {reportViewMode === 'summary' && (
              <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-end gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#f7f3f3] font-bold text-slate-700 cursor-pointer"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Year</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#f7f3f3] font-bold text-slate-700 cursor-pointer"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Week</label>
                    <select
                      value={reportWeek}
                      onChange={(e) => setReportWeek(Number(e.target.value))}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#f7f3f3] font-bold text-slate-700 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5].map(w => (
                        <option key={w} value={w}>Week {w}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={handleFetchReport}
                    className="px-5 py-2.5 bg-[#4b2424] hover:bg-[#381a1a] text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center h-[38px]"
                  >
                    Fetch Report
                  </button>
                </div>
              </div>
            )}

            {/* Grid display section */}
            {reportViewMode === 'summary' ? (
              <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
                <Table 
                  ref={gridRef}
                  rowData={reportData}
                  columnDefs={reportColDefs}
                  pinnedBottomRowData={pinnedBottomRowData}
                  pagination={true}
                  paginationPageSize={pageSize}
                  domLayout="autoHeight"
                  quickFilterText={searchTerm}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 50
                  }}
                  color="#4b2424"
                />
              </div>
            ) : (
              /* IN-PLACE DETAILED ROW VIEW (NO OVERLAYS & NO TOP KPI CARDS) */
              <div className="space-y-0">
                {detailLoading ? (
                  <div className="text-center py-12 text-slate-500 font-bold text-xs">
                    Loading employee details...
                  </div>
                ) : detailData.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-bold text-xs">
                    No employee records found for this category.
                  </div>
                ) : (
                  /* Detailed report list rendered in Reusable Table Component */
                  <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
                    <Table 
                      ref={gridRef}
                      rowData={detailData}
                      columnDefs={detailColDefs}
                      pagination={true}
                      paginationPageSize={pageSize}
                      domLayout="autoHeight"
                      quickFilterText={searchTerm}
                      autoSizeStrategy={{
                        type: 'fitGridWidth',
                        defaultMinWidth: 50
                      }}
                      color="#4b2424"
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        ) : subTab === 'data' ? (
          /* View Raw Employee Data rendered in FULL width Table Component (matching original colors and layout) */
          <div className="space-y-0 pt-0">
            {/* Top Toolbar matching screenshot exactly with export buttons and search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 pb-4 bg-slate-50/40 border-b border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportRawData('Excel')}
                  className="px-4 py-2 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Report to Excel</span>
                </button>
                <button 
                  onClick={() => handleExportRawData('PDF')}
                  className="px-4 py-2 bg-[#4b2424] hover:bg-[#6b3535] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Report to PDF</span>
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search employee attendance..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
              </div>
            </div>

            <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
              <Table 
                ref={gridRef}
                rowData={filteredEmployeeRows}
                columnDefs={colDefs}
                pagination={true}
                paginationPageSize={pageSize}
                domLayout="autoHeight"
                quickFilterText={searchTerm}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 50
                }}
                color="#4b2424"
              />
            </div>
          </div>
        ) : (
          /* View History Files rendered in AG Grid layout matching user's screenshot */
          <div className="space-y-0 pt-0">
            {/* Top Toolbar matching screenshot exactly with export buttons and search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 pb-4 bg-slate-50/40 border-b border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportHistory('Excel')}
                  className="px-4 py-2 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Report to Excel</span>
                </button>
                <button 
                  onClick={() => handleExportHistory('PDF')}
                  className="px-4 py-2 bg-[#4b2424] hover:bg-[#6b3535] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Report to PDF</span>
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search uploaded files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
              </div>
            </div>

            <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
              <Table 
                ref={gridRef}
                rowData={filteredFiles}
                columnDefs={historyColDefs}
                pagination={true}
                paginationPageSize={pageSize}
                domLayout="autoHeight"
                quickFilterText={searchTerm}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 50
                }}
                color="#4b2424"
              />
            </div>
          </div>
        )}
      </div>

      {/* Upload File Modal Overlay */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-150">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-[#0f417a]" />
                <h3 className="text-sm font-black text-[#0f417a] uppercase tracking-wide">
                  Upload Excel Attendance Sheet
                </h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                style={{ border: 'none', background: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5 text-xs font-semibold text-slate-700">
              <div className="space-y-2 text-left">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Select spreadsheet file (.xlsx, .csv)</label>
                <input 
                  type="file" 
                  accept=".csv, .xlsx"
                  required
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#0f417a] hover:file:bg-blue-100 cursor-pointer border border-slate-250 p-2.5 rounded-xl bg-slate-50/50"
                />
              </div>

              {selectedFile && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-150">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 rounded-lg text-slate-655 hover:bg-slate-50 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 bg-[#0f417a] hover:bg-[#0c3361] text-white rounded-xl shadow cursor-pointer font-bold inline-flex items-center space-x-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Process</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast box */}
      <div className={`toast-box ${toastVisible ? 'show' : ''}`}>
        <div className="tdot" style={{ background: toastColor }}></div>
        <span>{toastMsg}</span>
      </div>
      
      {/* Custom Styles Injection to match YP Brown grid headers */}
      <style dangerouslySetInnerHTML={{ __html: `
        .toast-box { position: fixed; bottom: 20px; right: 20px; background: #1E293B; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: .82rem; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.2); transform: translateY(70px); opacity: 0; transition: all .3s; z-index: 9999; }
        .toast-box.show { transform: translateY(0); opacity: 1; }
        .tdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .attendance-pro-grid.ag-theme-quartz {
          --ag-font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --ag-font-size: 13px;
          --ag-border-color: #B9BDC2;
          --ag-row-border-color: #D3D6D9;
          --ag-row-height: 48px;
          --ag-active-color: #4b2424;
          --ag-checkbox-checked-color: #4b2424;
          --ag-input-focus-border-color: #4b2424;
          --ag-selected-row-background-color: #fcf9f9;
          font-size: 13px;
        }
        .attendance-pro-grid .ag-root-wrapper {
          border: none !important;
          border-radius: 0 !important;
        }
        .attendance-pro-grid .ag-header {
          background: #4b2424 !important;
          border-bottom: 2px solid #6b3535 !important;
        }
        .attendance-pro-grid .ag-header-row {
          background: transparent !important;
        }
        .attendance-pro-grid .ag-header-cell {
          color: #ffffff !important;
          font-weight: 750 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-right: 1px solid #6b3535 !important;
          transition: background 0.15s !important;
        }
        .attendance-pro-grid .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          width: 100% !important;
        }
        .attendance-pro-grid .ag-header-cell:hover {
          background: #6b3535 !important;
        }
        .attendance-pro-grid .ag-header-cell-label .ag-header-cell-text {
          color: #ffffff !important;
        }
        .attendance-pro-grid .ag-header-cell .ag-icon {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .attendance-pro-grid .ag-row {
          border-bottom: 1px solid #D3D6D9 !important;
        }
        /* Zebra styling: Even clean white, Odd soft cream sand tint */
        .attendance-pro-grid .ag-row-even {
          background: #ffffff !important;
        }
        .attendance-pro-grid .ag-row-odd {
          background: #fdfcfb !important;
        }
        .attendance-pro-grid .ag-row:hover {
          background: #faf7f5 !important;
        }
      `}} />

    </div>
  );
}
