import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllTrainingData, getHRTrainingDataByID } from '../../api';
import { ArrowLeft, ChevronDown, Building2, BookOpen, Users, IndianRupee, Filter } from 'lucide-react';
import Table from '../../../../components/Table';
import { getCurrentUserId } from '../../../../utils/authSession';
import { createTableExporter } from '../../utils/exportTable';
import ParticipantsView from './components/ParticipantsView';
import { formatDateYYYYMMDD, formatExpenditureInLakh, getParticipantCount } from './trainingConfig';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';

export default function TrainingDetailView({
  detail,
  onBack,
  notify
}) {
  const [trainings, setTrainings] = useState(() => detail?.trainingsList || []);
  const [loading, setLoading] = useState(() => (!detail?.trainingsList || detail.trainingsList.length === 0) && Boolean(getCurrentUserId()));
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

  // Load data: either from detail.trainingsList or fetch from API
  useEffect(() => {
  let isMounted = true;

  const userId = getCurrentUserId();
  // No signed-in user in the token: never load as someone else (the list page shows the toast)
  if (!userId) return undefined;

  fetchAllTrainingData(userId)
    .then(res => {
      if (!isMounted) return;

      const rawData = Array.isArray(res.data) ? res.data : [];

      const filtered = rawData.filter(row => {
        const rowOrg = (row['Organisation Name'] || '')
          .trim()
          .toLowerCase();

        const targetOrg = organisationName
          .trim()
          .toLowerCase();

        const matchOrg = rowOrg === targetOrg;

        const toDate = row['To date']
          ? new Date(row['To date'])
          : null;

        const fromDate = row['From date']
          ? new Date(row['From date'])
          : null;

        const rowYear = toDate
          ? toDate.getFullYear().toString()
          : fromDate
            ? fromDate.getFullYear().toString()
            : '';

        const matchYear =
          !year ||
          year === 'All Years' ||
          year === 'N/A' ||
          rowYear === String(year);

        return matchOrg && matchYear;
      });

      setTrainings(filtered);
    })
    .catch(err => {
      console.error(
        "Error loading training detail records:",
        err
      );
    })
    .finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

  return () => {
    isMounted = false;
  };
}, [organisationName, year]);

  // Load participant records and full training details when a training is selected
  useEffect(() => {
  let isMounted = true;
  // Deferred a tick so the effect never sets state synchronously
  const timer = setTimeout(() => {
  if (!selectedTrainingForParticipants) {
    setParticipantStaffList([]);
    setTrainingFullDetails(null);
    return;
  }

  const trainingId =
    selectedTrainingForParticipants['Training ID'] ||
    selectedTrainingForParticipants.training_id ||
    selectedTrainingForParticipants.TRAINING_ID;

  setParticipantLoading(true);
  setParticipantStaffList([]);
  setTrainingFullDetails(null);

  if (!trainingId) {
    setParticipantLoading(false);
    return;
  }

  getHRTrainingDataByID(trainingId)
    .then(res => {
      if (!isMounted) return;

      if (res.data?.training) {
        setTrainingFullDetails(res.data.training);
      }

      const participants = Array.isArray(res.data?.participants)
        ? res.data.participants
        : [];

      setParticipantStaffList(participants);
    })
    .catch(err => {
      console.error('Error fetching participant roster:', err);

      if (isMounted) {
        setParticipantStaffList([]);
      }
    })
    .finally(() => {
      if (isMounted) {
        setParticipantLoading(false);
      }
    });
  }, 0);

  return () => {
    isMounted = false;
    clearTimeout(timer);
  };
}, [selectedTrainingForParticipants]);
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
    const exp = parseFloat(
      row['Expenditure'] ??
      row['Expenditure (In Lakh)'] ??
      row.expenditure ??
      0
    );

    if (!isNaN(exp) && exp > 0) {
      totalExpenditure += exp < 1000 ? exp : exp / 100000;
    }

    const parts = getParticipantCount(row);

    totalParticipants += parts;
  });

  return {
    totalTrainings: filteredRows.length,
    totalParticipants,
    totalExpenditureLakh:
      totalExpenditure > 0
        ? totalExpenditure.toFixed(2)
        : '0.00'
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
        cellClass: 'text-center flex justify-center items-center font-bold text-slate-500',
        headerClass: 'text-center'
      },
      {
        headerName: 'Training Title',
        field: 'Title',
        valueGetter: (params) => params.data?.['Title'] || params.data?.['Training Title'] || params.data?.['TRAINING TITLE'] || '-',
        minWidth: 260,
        flex: 2,
        pinned: 'left',
        cellClass: 'text-center flex justify-center items-center font-extrabold text-slate-900 dark:text-slate-100 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Training Type',
        field: 'Training Type',
        valueGetter: (params) => params.data?.['Training Type'] || params.data?.['TRAINING TYPE'] || params.data?.['TRAINING_TYPE_NAME'] || '-',
        minWidth: 170,
        cellClass: 'text-center flex justify-center items-center font-medium text-slate-700 dark:text-slate-300',
        headerClass: 'text-center'
      },
      {
        headerName: 'From Date',
        field: 'From date',
        valueGetter: (params) => formatDateYYYYMMDD(params.data?.['From date'] || params.data?.['From Date'] || params.data?.from_date),
        minWidth: 130,
        cellClass: 'text-center flex justify-center items-center text-slate-600 dark:text-slate-400',
        headerClass: 'text-center'
      },
      {
        headerName: 'To Date',
        field: 'To date',
        valueGetter: (params) => formatDateYYYYMMDD(params.data?.['To date'] || params.data?.['To Date'] || params.data?.to_date),
        minWidth: 130,
        cellClass: 'text-center flex justify-center items-center text-slate-600 dark:text-slate-400',
        headerClass: 'text-center'
      },
      {
        headerName: 'Expenditure (In Lakh)',
        field: 'Expenditure',
        valueGetter: (params) => formatExpenditureInLakh(params.data?.['Expenditure'] || params.data?.['Expenditure (In Lakh)'] || params.data?.expenditure),
        minWidth: 170,
        cellClass: 'text-center flex justify-center items-center font-bold text-slate-800 dark:text-slate-200',
        headerClass: 'text-center'
      },
      {
  headerName: 'Number of Participants',
  field: 'NO_OF_PARTICIPANTS',
  minWidth: 170,
  cellClass: 'text-center flex justify-center items-center',
  headerClass: 'text-center',
  cellRenderer: (params) => {
    const count = getParticipantCount(params.data);

    return (
      <div className="flex items-center justify-center h-full">
        <button
          type="button"
          onClick={() => handleOpenParticipants(params.data)}
          className="text-blue-600 hover:underline"
        >
          {count}
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
        cellClass: 'text-center flex justify-center items-center font-bold text-slate-500',
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
        cellClass: 'text-center flex justify-center items-center font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Name',
        field: 'emp_name',
        valueGetter: (params) => params.data?.emp_name || params.data?.name || '-',
        minWidth: 200,
        flex: 2,
        pinned: 'left',
        cellClass: 'text-center flex justify-center items-center font-extrabold text-slate-900 dark:text-slate-100 flex items-center',
        headerClass: 'text-center'
      },
      {
        headerName: 'Designation',
        field: 'emp_post_name',
        valueGetter: (params) => params.data?.emp_post_name || params.data?.post_name || params.data?.designation || '-',
        minWidth: 200,
        cellClass: 'text-center flex justify-center items-center font-medium text-slate-700 dark:text-slate-300',
        headerClass: 'text-center'
      },
      {
        headerName: 'Department',
        field: 'emp_department_name',
        valueGetter: (params) => params.data?.emp_department_name || params.data?.department_name || params.data?.department || '-',
        minWidth: 200,
        cellClass: 'text-center flex justify-center items-center font-medium text-slate-700 dark:text-slate-300',
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

  // Column Visibility state for Participant Table
  const [participantVisibleCols, setParticipantVisibleCols] = useState({
    'Staff ID': true,
    'Name': true,
    'Designation': true,
    'Department': true,
  });

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

  // Copy / Export: the rows on the grid's current page (page tracked from the grid)
  const [trainingPage, setTrainingPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const trackPage = (setPage) => (params) => {
    if (params?.api) setPage(params.api.paginationGetCurrentPage() + 1);
  };
  const trainingExportColumns = [
    { field: 'title', label: 'Training Title', value: (r) => r['Title'] || r['Training Title'] || r['TRAINING TITLE'] || '-' },
    { field: 'type', label: 'Training Type', value: (r) => r['Training Type'] || r['TRAINING TYPE'] || '-' },
    { field: 'from', label: 'From Date', value: (r) => formatDateYYYYMMDD(r['From date'] || r.from_date) },
    { field: 'to', label: 'To Date', value: (r) => formatDateYYYYMMDD(r['To date'] || r.to_date) },
    { field: 'expenditure', label: 'Expenditure (In Lakh)', value: (r) => formatExpenditureInLakh(r['Expenditure'] ?? r['Expenditure (In Lakh)'] ?? r.expenditure) },
    { field: 'participants', label: 'Number of Participants', value: (r) => getParticipantCount(r) },
  ];
  const participantExportColumns = [
    {
      field: 'staff', label: 'Staff ID', value: (p) => {
        const staffId = p.employee_id || p.emp_reference_id || p.staff_id;
        const name = p.emp_name || p.name;
        return staffId && name && !String(staffId).includes(name) ? `${staffId} - ${name}` : (staffId || name || '-');
      },
    },
    { field: 'name', label: 'Name', value: (p) => p.emp_name || p.name || '-' },
    { field: 'designation', label: 'Designation', value: (p) => p.emp_post_name || p.post_name || p.designation || '-' },
    { field: 'department', label: 'Department', value: (p) => p.emp_department_name || p.department_name || p.department || '-' },
  ];
  const exportPage = (kind, { rows, page, size, columns, title, fileName, label, busy }) => {
    const start = (page - 1) * size;
    return createTableExporter({
      loadRows: () => rows.slice(start, start + size),
      serialStart: start,
      getColumns: () => columns,
      notify,
      isBusy: busy,
      title: `${title} (Page ${page})`,
      fileName: `${fileName}_Page_${page}`,
      label,
    })[kind]();
  };

  // -------------------------------------------------------------
  // VIEW 1: PARTICIPANT DETAILS & TRAINING DATA (DYNAMIC TABLE VIEW)
  // -------------------------------------------------------------
  if (selectedTrainingForParticipants) {
    return (
      <ParticipantsView
        activeParticipantColumnDefs={activeParticipantColumnDefs}
        exportPage={exportPage}
        filteredParticipants={filteredParticipants}
        organisationName={organisationName}
        participantExportColumns={participantExportColumns}
        participantLoading={participantLoading}
        participantPage={participantPage}
        participantPageSize={participantPageSize}
        participantSearchTerm={participantSearchTerm}
        participantVisibleCols={participantVisibleCols}
        selectedTrainingForParticipants={selectedTrainingForParticipants}
        setParticipantPage={setParticipantPage}
        setParticipantPageSize={setParticipantPageSize}
        setParticipantSearchTerm={setParticipantSearchTerm}
        setParticipantVisibleCols={setParticipantVisibleCols}
        setSelectedTrainingForParticipants={setSelectedTrainingForParticipants}
        trackPage={trackPage}
        trainingFullDetails={trainingFullDetails}
      />
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: MAIN TRAINING DETAILS DYNAMIC TABLE VIEW (MATCHING SCREENSHOT)
  // -------------------------------------------------------------
  const trainingExport = {
    rows: filteredRows, page: trainingPage, size: pageSize, columns: trainingExportColumns,
    title: `${organisationName} - Training Details`, fileName: `${organisationName.replace(/\s+/g, '_')}_Training_Details`,
    label: 'Training details', busy: loading,
  };

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

          <div className="flex flex-wrap items-center gap-2.5">
            <HrRowsSelect value={pageSize} onChange={setPageSize} />
            <HrTotalBadge count={filteredRows.length} />
            <HrFilterToggle
              open={showFilterPanel}
              activeCount={activeFiltersCount}
              onToggle={() => setShowFilterPanel(prev => !prev)}
              onReset={() => {
                setSelectedTitle('');
                setSelectedType('');
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrSearchBox value={searchTerm} onChange={setSearchTerm} />
            <HrColumnPicker
              capitalize
              label="Column visibility"
              columns={Object.keys(visibleCols).map(col => ({ key: col, label: col, visible: visibleCols[col] }))}
              onToggle={(col) => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
            />
            <HrCopyExport
              onCopy={() => exportPage('copy', trainingExport)}
              onExcel={() => exportPage('excel', trainingExport)}
              onPdf={() => exportPage('pdf', trainingExport)}
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
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredRows}
            onPaginationChanged={trackPage(setTrainingPage)}
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
