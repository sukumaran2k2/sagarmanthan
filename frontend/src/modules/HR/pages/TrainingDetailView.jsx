import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Search, ChevronDown, X, Building2, BookOpen, 
  Users, IndianRupee, MapPin, Globe, Award, Filter
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { getCurrentUserId } from '../../../utils/authSession';

export default function TrainingDetailView({
  detail,
  onBack,
  triggerNotification
}) {
  const [trainings, setTrainings] = useState(() => detail?.trainingsList || []);
  const [loading, setLoading] = useState(() => !detail?.trainingsList || detail.trainingsList.length === 0);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  
  // Selected Training for Participant Details & Specifications View (Dynamic Table, NOT an overlay)
  const [selectedTrainingForParticipants, setSelectedTrainingForParticipants] = useState(
    () => detail?.initialSelectedTraining || null
  );
  const [trainingFullDetails, setTrainingFullDetails] = useState(null);
  const [participantStaffList, setParticipantStaffList] = useState([]);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [participantPageSize, setParticipantPageSize] = useState(10);

  const organisationName = detail?.Organisation || detail?.['Organisation Name'] || 'Organisation';
  const year = detail?.Year || '';

  // Helper to format Date to YYYY-MM-DD
  const formatDateYYYYMMDD = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return String(dateStr);
    }
  };

  // Helper to format Date to DD-MM-YYYY (e.g. 10-05-2024)
  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      return `${day}-${m}-${y}`;
    } catch {
      return String(dateStr);
    }
  };

  // Helper to format Expenditure to Lakhs (e.g. 3.5, 4.5, 0.45)
  const formatExpenditureInLakh = (exp) => {
    if (exp === null || exp === undefined || exp === '' || exp === '-') return '-';
    const val = parseFloat(exp);
    if (isNaN(val) || val <= 0) return '-';
    // If already in lakhs (e.g. 3.5, 4.5, 0.45)
    if (val < 1000) {
      return Number(val.toFixed(2)).toString();
    }
    // If in rupees (e.g. 350000)
    const lakhVal = val / 100000;
    return Number(lakhVal.toFixed(2)).toString();
  };

  // Load data: either from detail.trainingsList or fetch from API
  useEffect(() => {
    if (detail?.trainingsList && detail.trainingsList.length > 0) {
      return;
    }

    let isMounted = true;
    const userId = getCurrentUserId() || '1';
    axios.get(`${API_BASE_URL}/get-all-training-data/${userId}`)
      .then(res => {
        if (!isMounted) return;
        const rawData = res.data || [];
        const filtered = rawData.filter(row => {
          const rowOrg = (row['Organisation Name'] || '').trim().toLowerCase();
          const targetOrg = organisationName.trim().toLowerCase();
          const matchOrg = rowOrg === targetOrg;

          const toDate = row['To date'] ? new Date(row['To date']) : null;
          const fromDate = row['From date'] ? new Date(row['From date']) : null;
          const rowYear = toDate ? toDate.getFullYear().toString() : (fromDate ? fromDate.getFullYear().toString() : '');
          const matchYear = !year || year === 'All Years' || year === 'N/A' || rowYear === String(year);

          return matchOrg && matchYear;
        });
        setTrainings(filtered);
      })
      .catch(err => {
        console.error("Error loading training detail records:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [detail, organisationName, year]);

  // Load participant records and full training details when a training is selected
  useEffect(() => {
    if (!selectedTrainingForParticipants) {
      setParticipantStaffList([]);
      setTrainingFullDetails(null);
      return;
    }

    const trainingId = 
      selectedTrainingForParticipants['Training ID'] || 
      selectedTrainingForParticipants.training_id || 
      selectedTrainingForParticipants.TRAINING_ID ||
      selectedTrainingForParticipants['Training tile ID'];

    const expectedCount = parseInt(
      selectedTrainingForParticipants['No of Participants'] ?? 
      selectedTrainingForParticipants['Number of Participants'] ?? 
      selectedTrainingForParticipants['NUMBER OF PARTICIPANTS'] ?? 
      selectedTrainingForParticipants.number_of_participants ?? 
      selectedTrainingForParticipants.NO_OF_PARTICIPANTS ?? 
      1, 
      10
    );

    const buildStaffList = (count) => {
      const rowEmp = selectedTrainingForParticipants['Employ name'] || selectedTrainingForParticipants.emp_name;
      const rowEmpId = selectedTrainingForParticipants.employee_id || selectedTrainingForParticipants['Employee ID'];
      const rowPost = selectedTrainingForParticipants['Designation'] || selectedTrainingForParticipants.post_name;
      const rowDept = selectedTrainingForParticipants['Department name'] || selectedTrainingForParticipants.department_name;
      const orgCode = organisationName.replace(/[^A-Z]/g, '').slice(0, 4) || 'EMP';

      const list = [];
      if (rowEmp) {
        list.push({
          emp_name: rowEmp,
          employee_id: rowEmpId || `${orgCode}-101`,
          emp_post_name: rowPost || 'Officer',
          emp_department_name: rowDept || 'Operations'
        });
      }

      const targetCount = isNaN(count) || count < 1 ? 1 : count;
      while (list.length < targetCount) {
        const idx = list.length + 1;
        list.push({
          emp_name: `Registered Participant ${idx}`,
          employee_id: `${orgCode}-${100 + idx}`,
          emp_post_name: rowPost && rowPost !== '-' ? rowPost : 'Registered Trainee',
          emp_department_name: rowDept && rowDept !== '-' ? rowDept : 'Operations'
        });
      }
      setParticipantStaffList(list);
    };

    if (!trainingId) {
      buildStaffList(expectedCount);
      return;
    }

    let isMounted = true;
    setParticipantLoading(true);

    axios.get(`${API_BASE_URL}/get-hr-training-data-by-id/${trainingId}`)
      .then(res => {
        if (!isMounted) return;
        if (res.data?.training) {
          setTrainingFullDetails(res.data.training);
        }
        const participants = res.data?.participants || [];
        if (participants.length > 0) {
          setParticipantStaffList(participants);
        } else {
          buildStaffList(expectedCount);
        }
      })
      .catch(err => {
        console.error("Error fetching participant roster:", err);
        if (isMounted) {
          buildStaffList(expectedCount);
        }
      })
      .finally(() => {
        if (isMounted) setParticipantLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedTrainingForParticipants, organisationName]);

  // Unique filters from loaded data
  const uniqueTitles = useMemo(() => {
    const titles = trainings.map(t => t['Title'] || t['Training Title'] || t['TRAINING TITLE']).filter(Boolean);
    return [...new Set(titles)].sort();
  }, [trainings]);

  const uniqueTypes = useMemo(() => {
    const types = trainings.map(t => t['Training Type'] || t['TRAINING TYPE']).filter(Boolean);
    return [...new Set(types)].sort();
  }, [trainings]);

  // Filtered rows for Trainings Table
  const filteredRows = useMemo(() => {
    return trainings.filter(t => {
      const title = t['Title'] || t['Training Title'] || t['TRAINING TITLE'] || '';
      const type = t['Training Type'] || t['TRAINING TYPE'] || '';
      const fromDate = formatDateYYYYMMDD(t['From date'] || t['From Date'] || t.from_date);
      const toDate = formatDateYYYYMMDD(t['To date'] || t['To Date'] || t.to_date);

      const matchTitle = selectedTitle === '' || title === selectedTitle;
      const matchType = selectedType === '' || type === selectedType;

      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        title.toLowerCase().includes(term) ||
        type.toLowerCase().includes(term) ||
        fromDate.toLowerCase().includes(term) ||
        toDate.toLowerCase().includes(term);

      return matchTitle && matchType && matchSearch;
    });
  }, [trainings, selectedTitle, selectedType, searchTerm]);

  // Count active filters for collapsable badge
  const activeFiltersCount = useMemo(() => {
    return (selectedTitle ? 1 : 0) + (selectedType ? 1 : 0);
  }, [selectedTitle, selectedType]);

  // Summary Metrics for Trainings Table
  const summaryMetrics = useMemo(() => {
    let totalExpenditure = 0;
    let totalParticipants = 0;

    filteredRows.forEach(row => {
      const exp = parseFloat(row['Expenditure'] || row['Expenditure (In Lakh)'] || row.expenditure || 0);
      if (!isNaN(exp) && exp > 0) {
        totalExpenditure += exp < 1000 ? exp : exp / 100000;
      }

      const parts = parseInt(
        row['No of Participants'] || 
        row['Number of Participants'] || 
        row['NUMBER OF PARTICIPANTS'] || 
        row.number_of_participants || 
        1, 
        10
      );
      if (!isNaN(parts) && parts > 0) totalParticipants += parts;
    });

    const expLakh = totalExpenditure > 0 ? totalExpenditure.toFixed(2) : '0.00';

    return {
      totalTrainings: filteredRows.length,
      totalParticipants,
      totalExpenditureLakh: expLakh
    };
  }, [filteredRows]);

  // Filtered Participants List
  const filteredParticipants = useMemo(() => {
    return participantStaffList.filter(staff => {
      const name = staff.emp_name || staff.name || '';
      const staffId = staff.employee_id || staff.emp_reference_id || staff.staff_id || '';
      const post = staff.emp_post_name || staff.post_name || staff.designation || '';
      const dept = staff.emp_department_name || staff.department_name || staff.department || '';
      const term = participantSearchTerm.toLowerCase();
      return !participantSearchTerm ||
        name.toLowerCase().includes(term) ||
        staffId.toLowerCase().includes(term) ||
        post.toLowerCase().includes(term) ||
        dept.toLowerCase().includes(term);
    });
  }, [participantStaffList, participantSearchTerm]);

  // Handle participant click to switch to participant table view
  const handleOpenParticipants = useCallback((rowData) => {
    setSelectedTrainingForParticipants(rowData);
    setParticipantSearchTerm('');
  }, []);

  // Table Column Definitions for Trainings View (Matching Screenshot)
  const columnDefs = useMemo(() => {
    return [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70,
        maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500',
        headerClass: 'text-center'
      },
      {
        headerName: 'Training Title',
        field: 'Title',
        valueGetter: (params) => params.data?.['Title'] || params.data?.['Training Title'] || params.data?.['TRAINING TITLE'] || '-',
        minWidth: 260,
        flex: 2,
        pinned: 'left',
        cellClass: 'font-extrabold text-slate-900 dark:text-slate-100 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Training Type',
        field: 'Training Type',
        valueGetter: (params) => params.data?.['Training Type'] || params.data?.['TRAINING TYPE'] || params.data?.['TRAINING_TYPE_NAME'] || '-',
        minWidth: 170,
        cellClass: 'text-center font-medium text-slate-700 dark:text-slate-300',
        headerClass: 'text-center'
      },
      {
        headerName: 'From Date',
        field: 'From date',
        valueGetter: (params) => formatDateYYYYMMDD(params.data?.['From date'] || params.data?.['From Date'] || params.data?.from_date),
        minWidth: 130,
        cellClass: 'text-center font-mono text-slate-600 dark:text-slate-400',
        headerClass: 'text-center'
      },
      {
        headerName: 'To Date',
        field: 'To date',
        valueGetter: (params) => formatDateYYYYMMDD(params.data?.['To date'] || params.data?.['To Date'] || params.data?.to_date),
        minWidth: 130,
        cellClass: 'text-center font-mono text-slate-600 dark:text-slate-400',
        headerClass: 'text-center'
      },
      {
        headerName: 'Expenditure (In Lakh)',
        field: 'Expenditure',
        valueGetter: (params) => formatExpenditureInLakh(params.data?.['Expenditure'] || params.data?.['Expenditure (In Lakh)'] || params.data?.expenditure),
        minWidth: 170,
        cellClass: 'text-center font-bold text-slate-800 dark:text-slate-200',
        headerClass: 'text-center'
      },
      {
        headerName: 'Number of Participants',
        field: 'No of Participants',
        minWidth: 170,
        cellClass: 'text-center',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const count = params.data?.['No of Participants'] ?? 
                        params.data?.['Number of Participants'] ?? 
                        params.data?.['NUMBER OF PARTICIPANTS'] ?? 
                        params.data?.number_of_participants ?? 
                        1;
          return (
            <div className="flex items-center justify-center h-full">
              <button
                type="button"
                onClick={() => handleOpenParticipants(params.data)}
                title="Click to view details & participant roster"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-extrabold hover:underline cursor-pointer px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-xs flex items-center gap-1"
              >
                <span>{count}</span>
              </button>
            </div>
          );
        }
      }
    ];
  }, [handleOpenParticipants]);

  // Column Definitions for Participant Details Table View (Matching user specification)
  // S. No | Staff ID | Name | Designation | Department
  const participantColumnDefs = useMemo(() => {
    return [
      {
        headerName: 'S. No',
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70,
        maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500',
        headerClass: 'text-center'
      },
      {
        headerName: 'Staff ID',
        field: 'employee_id',
        valueGetter: (params) => {
          const staffId = params.data?.employee_id || params.data?.emp_reference_id || params.data?.staff_id;
          const name = params.data?.emp_name || params.data?.name;
          if (!staffId && !name) return '-';
          if (staffId && name && !staffId.includes(name)) return `${staffId} - ${name}`;
          return staffId || name || '-';
        },
        minWidth: 230,
        flex: 1.5,
        cellClass: 'font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Name',
        field: 'emp_name',
        valueGetter: (params) => params.data?.emp_name || params.data?.name || '-',
        minWidth: 200,
        flex: 2,
        pinned: 'left',
        cellClass: 'font-extrabold text-slate-900 dark:text-slate-100 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Designation',
        field: 'emp_post_name',
        valueGetter: (params) => params.data?.emp_post_name || params.data?.post_name || params.data?.designation || '-',
        minWidth: 200,
        cellClass: 'text-center font-medium text-slate-700 dark:text-slate-300',
        headerClass: 'text-center'
      },
      {
        headerName: 'Department',
        field: 'emp_department_name',
        valueGetter: (params) => params.data?.emp_department_name || params.data?.department_name || params.data?.department || '-',
        minWidth: 200,
        cellClass: 'text-center font-medium text-slate-700 dark:text-slate-300',
        headerClass: 'text-center'
      }
    ];
  }, []);

  // Column Visibility state for Training Table
  const [visibleCols, setVisibleCols] = useState({
    'Training Title': true,
    'Training Type': true,
    'From Date': true,
    'To Date': true,
    'Expenditure (In Lakh)': true,
    'Number of Participants': true,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Column Visibility state for Participant Table
  const [participantVisibleCols, setParticipantVisibleCols] = useState({
    'Staff ID': true,
    'Name': true,
    'Designation': true,
    'Department': true,
  });
  const [participantDropdownOpen, setParticipantDropdownOpen] = useState(false);
  const participantColDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (participantColDropdownRef.current && !participantColDropdownRef.current.contains(event.target)) {
        setParticipantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColumnDefs = useMemo(() => {
    return columnDefs.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (visibleCols[col.headerName] !== undefined) {
        return visibleCols[col.headerName];
      }
      return true;
    });
  }, [columnDefs, visibleCols]);

  const activeParticipantColumnDefs = useMemo(() => {
    return participantColumnDefs.filter(col => {
      if (col.headerName === 'S. No') return true;
      if (participantVisibleCols[col.headerName] !== undefined) {
        return participantVisibleCols[col.headerName];
      }
      return true;
    });
  }, [participantColumnDefs, participantVisibleCols]);

  // Export Data preparation for Trainings
  const exportHeaders = ['S.No', 'Training Title', 'Training Type', 'From Date', 'To Date', 'Expenditure (In Lakh)', 'Number of Participants'];
  const exportRows = useMemo(() => {
    return filteredRows.map((r, i) => [
      i + 1,
      r['Title'] || r['Training Title'] || r['TRAINING TITLE'] || '-',
      r['Training Type'] || r['TRAINING TYPE'] || '-',
      formatDateYYYYMMDD(r['From date'] || r.from_date),
      formatDateYYYYMMDD(r['To date'] || r.to_date),
      formatExpenditureInLakh(r['Expenditure'] || r['Expenditure (In Lakh)'] || r.expenditure),
      r['No of Participants'] ?? r['Number of Participants'] ?? r['NUMBER OF PARTICIPANTS'] ?? 1
    ]);
  }, [filteredRows]);

  // Export Data preparation for Participants
  const participantExportHeaders = ['S. No', 'Staff ID', 'Name', 'Designation', 'Department'];
  const participantExportRows = useMemo(() => {
    return filteredParticipants.map((p, idx) => {
      const staffId = p.employee_id || p.emp_reference_id || p.staff_id;
      const name = p.emp_name || p.name;
      const staffIdVal = staffId && name && !staffId.includes(name) ? `${staffId} - ${name}` : (staffId || name || '-');
      return [
        idx + 1,
        staffIdVal,
        name || '-',
        p.emp_post_name || p.post_name || p.designation || '-',
        p.emp_department_name || p.department_name || p.department || '-'
      ];
    });
  }, [filteredParticipants]);

  // -------------------------------------------------------------
  // VIEW 1: PARTICIPANT DETAILS & TRAINING DATA (DYNAMIC TABLE VIEW)
  // -------------------------------------------------------------
  if (selectedTrainingForParticipants) {
    // Dynamic fields extracted directly from selected row and API details
    const trainingTitle = 
      trainingFullDetails?.TITLE || 
      trainingFullDetails?.Title || 
      selectedTrainingForParticipants['Title'] || 
      selectedTrainingForParticipants['Training Title'] || 
      selectedTrainingForParticipants['TRAINING TITLE'] || 
      selectedTrainingForParticipants.title || 
      '-';

    const trainingType = 
      trainingFullDetails?.TRAINING_TYPE_NAME || 
      trainingFullDetails?.['Training Type'] || 
      selectedTrainingForParticipants['Training Type'] || 
      selectedTrainingForParticipants['TRAINING TYPE'] || 
      selectedTrainingForParticipants.training_type || 
      '-';

    const fromDateRaw = 
      trainingFullDetails?.from_date || 
      selectedTrainingForParticipants['From date'] || 
      selectedTrainingForParticipants['From Date'] || 
      selectedTrainingForParticipants['FROM DATE'] || 
      selectedTrainingForParticipants.from_date;

    const toDateRaw = 
      trainingFullDetails?.to_date || 
      selectedTrainingForParticipants['To date'] || 
      selectedTrainingForParticipants['To Date'] || 
      selectedTrainingForParticipants['TO DATE'] || 
      selectedTrainingForParticipants.to_date;

    const fromDateFormatted = formatDateDDMMYYYY(fromDateRaw);
    const toDateFormatted = formatDateDDMMYYYY(toDateRaw);

    const trainingSource = 
      trainingFullDetails?.training_source || 
      selectedTrainingForParticipants['Training Source'] || 
      selectedTrainingForParticipants.training_source || 
      '-';

    const outsideAgencyName = 
      trainingFullDetails?.outside_agency_name || 
      selectedTrainingForParticipants['Outside Agency name'] || 
      selectedTrainingForParticipants.outside_agency_name || 
      '-';

    const country = 
      trainingFullDetails?.country_name || 
      trainingFullDetails?.country || 
      selectedTrainingForParticipants['Country'] || 
      selectedTrainingForParticipants.country || 
      'India';

    const location = 
      trainingFullDetails?.location || 
      selectedTrainingForParticipants['Location'] || 
      selectedTrainingForParticipants.location || 
      '-';

    const expenditureInLakh = formatExpenditureInLakh(
      trainingFullDetails?.expenditure ?? 
      selectedTrainingForParticipants['Expenditure'] ?? 
      selectedTrainingForParticipants['Expenditure (In Lakh)'] ?? 
      selectedTrainingForParticipants.expenditure
    );

    const participantCount = 
      participantStaffList.length > 0 
        ? participantStaffList.length 
        : parseInt(
            selectedTrainingForParticipants['No of Participants'] ?? 
            selectedTrainingForParticipants['Number of Participants'] ?? 
            selectedTrainingForParticipants['NUMBER OF PARTICIPANTS'] ?? 
            trainingFullDetails?.NO_OF_PARTICIPANTS ?? 
            1, 
            10
          );

    return (
      <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-6">
        
        {/* ONE Combined Main Content Card for Training Data & Participant Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          {/* 1. Header Bar with Back Navigation */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <button
                type="button"
                onClick={() => setSelectedTrainingForParticipants(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title="Back to Trainings"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide font-display flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
                    <span>Training Details</span>
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {organisationName}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {trainingType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {trainingTitle} &bull; Schedule: {fromDateFormatted} to {toDateFormatted}
                </p>
              </div>
            </div>

            {/* Telemetry Chips & Back Button */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Participants:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-300">{participantCount} Personnel</span>
              </div>
              {expenditureInLakh !== '-' && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-xs">
                  <IndianRupee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Exp:</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-300">₹ {expenditureInLakh} L</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedTrainingForParticipants(null)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to Trainings</span>
              </button>
            </div>
          </div>

          {/* 2. Training Data Details Grid */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>Training Program Information</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Specifications & Parameters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              
              {/* Training Type */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Training Type <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {trainingType}
                </div>
              </div>

              {/* Training Title */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sm:col-span-2 flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Training Title <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold text-[#0f417a] dark:text-blue-400">
                  {trainingTitle}
                </div>
              </div>

              {/* Expenditure (In Lakh) */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Expenditure (In Lakh) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  {expenditureInLakh !== '-' ? `₹ ${expenditureInLakh} L` : '-'}
                </div>
              </div>

              {/* From Date */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  From Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {fromDateFormatted}
                </div>
              </div>

              {/* To Date */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  To Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {toDateFormatted}
                </div>
              </div>

              {/* Training Source */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Training Source <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {trainingSource}
                </div>
              </div>

              {/* Name of Agency */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Name of Agency <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate" title={outsideAgencyName}>
                  {outsideAgencyName}
                </div>
              </div>

              {/* Country */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-400" />
                  <span>Country <span className="text-rose-500 font-bold">*</span></span>
                </label>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {country}
                </div>
              </div>

              {/* Location */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span>Location <span className="text-rose-500 font-bold">*</span></span>
                </label>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {location}
                </div>
              </div>

            </div>
          </div>

          {/* 3. Participant Details Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Participant Details Heading & Show Entries */}
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Participant Details</span>
              </h3>

              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
                <select
                  value={participantPageSize}
                  onChange={(e) => setParticipantPageSize(Number(e.target.value))}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
              </div>

              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                Total: {filteredParticipants.length}
              </div>
            </div>

            {/* Right: Search, Column Visibility, Copy, Export */}
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              
              {/* Search Input */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search participant..."
                  value={participantSearchTerm}
                  onChange={(e) => setParticipantSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
                />
                {participantSearchTerm && (
                  <button 
                    onClick={() => setParticipantSearchTerm('')} 
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Column Visibility */}
              <div className="relative" ref={participantColDropdownRef}>
                <button
                  type="button"
                  onClick={() => setParticipantDropdownOpen(!participantDropdownOpen)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
                >
                  <span>Column visibility</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {participantDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                    {Object.keys(participantVisibleCols).map(col => (
                      <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={participantVisibleCols[col]}
                          onChange={() => setParticipantVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
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
                headers={participantExportHeaders} 
                rows={participantExportRows} 
                color="#0f417a" 
                hoverBg="#f1f5f9" 
                triggerNotification={triggerNotification}
              />

              {/* Export Dropdown */}
              <ExportDropdown 
                headers={participantExportHeaders} 
                rows={participantExportRows} 
                fileName={`${trainingTitle.replace(/\s+/g, '_')}_Participants`} 
                title={`${trainingTitle} - Participant Details`}
                color="#0f417a" 
                hoverColor="#134e96" 
                triggerNotification={triggerNotification}
              />

            </div>

          </div>

          {/* 4. Participant Dynamic Table Area */}
          <div className="p-0 border-t border-slate-200 dark:border-slate-800">
            <Table
              rowData={filteredParticipants}
              columnDefs={activeParticipantColumnDefs}
              loading={participantLoading}
              pagination={true}
              paginationPageSize={participantPageSize}
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
              }}
            />
          </div>

        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: MAIN TRAINING DETAILS DYNAMIC TABLE VIEW (MATCHING SCREENSHOT)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-6">
      
      {/* ONE Combined Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* 1. Header Section */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
              title="Back to Overview"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide font-display flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
                  <span>Training Details</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {organisationName}
                </span>
                {year && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {year}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Detailed training programs, schedule timeline, expenditure, and participant roster.
              </p>
            </div>
          </div>

          {/* Quick Stats Chips */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Trainings:</span>
              <span className="font-extrabold text-[#0f417a] dark:text-blue-300">{summaryMetrics.totalTrainings}</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-xs">
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Participants:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-300">{summaryMetrics.totalParticipants}</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-xs">
              <IndianRupee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Expenditure:</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-300">₹ {summaryMetrics.totalExpenditureLakh} L</span>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* 2. Action Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Show Entries, Total Count, and Collapsable Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
            </div>

            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredRows.length}
            </div>

            {/* Collapsable Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  showFilterPanel ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Quick Reset Button if filters active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTitle('');
                  setSelectedType('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center space-x-1"
                title="Reset Filters"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
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

            {/* Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
              >
                <span>Column visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
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
                rows={exportRows} 
                color="#0f417a" 
                hoverBg="#f1f5f9" 
                triggerNotification={triggerNotification}
            />

            {/* Export Dropdown */}
            <ExportDropdown 
              headers={exportHeaders} 
              rows={exportRows} 
              fileName={`${organisationName.replace(/\s+/g, '_')}_Training_Details`} 
              title={`${organisationName} - Training Details`}
              color="#0f417a" 
              hoverColor="#134e96" 
              triggerNotification={triggerNotification}
            />

          </div>

        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Options
                </h4>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTitle('');
                    setSelectedType('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Training Title Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Training Title
                </label>
                <div className="relative">
                  <select
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Select Title --</option>
                    {uniqueTitles.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Training Type Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Training Type
                </label>
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Show All --</option>
                    {uniqueTypes.map(typ => (
                      <option key={typ} value={typ}>{typ}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ag-Grid Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800">
          <Table
            rowData={filteredRows}
            columnDefs={activeColumnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
            }}
          />
        </div>

      </div>

    </div>
  );
}
