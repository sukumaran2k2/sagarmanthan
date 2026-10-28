import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import { Search, ChevronDown, Eye, X, Filter } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { getCurrentUserId, isOrganisationUser } from '../../../utils/authSession';
import { COMMON_TOASTS } from '../../../utils/notify';
import TrainingDetailView from './TrainingDetailView';
import { useHrStore } from '../store/useHrStore';
import { useDebouncedSearch } from '../hooks/usePagedList';
import { useGridPage } from '../hooks/useGridPage';
import { createTableExporter } from '../utils/exportTable';
import { HrFilterPanel, FilterSelect } from '../components/HrFilterPanel';
import { EditActionButton } from '../components/HrFormControls';
import { useHRPermissions } from '../hooks/useHRPermissions';

const MINISTRY_COLUMNS = {
  'Organisation': true,
  'Year': true,
  'Total Trainings': true,
  'Total Participants': true,
  'Total Expenditure (In Lakh)': true,
  'Last Training Date': true,
  'View Details': true
};
const ORG_COLUMNS = {
  'Training Title': true,
  'Training Type': true,
  'Training Source': true,
  'Expenditure (In Lakh)': true,
  'Year': true,
  'Number of Participants': true,
  'View Details': true,
  'Action': true
};
const formatTrainingDate = (value) => (value ? new Date(value).toLocaleDateString('en-CA') : '-');

export default function TrainingDetails({ notify }) {
  // Editing opens Input Forms, which only users with create / update rights have
  const { canUseInputForm } = useHRPermissions();

  const [trainings, setTrainings] = useState([]);
  // Drill-down (training list of an organisation-year): view state of this page
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters, search, paging and column visibility live in the HR store
  const {
    selectedYear, selectedOrg, selectedType, selectedSource, searchTerm, debouncedSearch,
    showFilterPanel, currentPage, pageSize, colChanges,
  } = useHrStore(useShallow((state) => ({
    selectedYear: state.training.year,
    selectedOrg: state.training.organisation,
    selectedType: state.training.type,
    selectedSource: state.training.source,
    searchTerm: state.training.searchTerm,
    debouncedSearch: state.training.debouncedSearch,
    showFilterPanel: state.training.showFilterPanel,
    currentPage: state.training.currentPage,
    pageSize: state.training.pageSize,
    colChanges: state.training.visibleCols,
  })));
  const actions = useHrStore((state) => state.trainingActions);
  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);
  const gridPage = useGridPage(currentPage, actions.setCurrentPage);

  const navigate = useNavigate();
  // The record being edited travels with the route (location.state.item)
  const handleEdit = useCallback((data) => {
    navigate('/hr/hr-management/input-form/training-data', { state: { item: data } });
  }, [navigate]);

  // Read the notifier through a ref so a failed load does not refetch after the toast
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);


  useEffect(() => {
    // Stale-response guard: a response that arrives after unmount is ignored
    let isMounted = true;
    const userId = getCurrentUserId() || '1';

    axios.get(`${API_BASE_URL}/get-all-training-data/${userId}`)
      .then(res => {
        if (!isMounted) return;
        const rawData = res.data || [];

        const isMinistry = !isOrganisationUser();
        let formattedData;

        if (isMinistry) {
          // Aggregate raw data by Organisation and Year
          const aggregated = {};
          rawData.forEach(row => {
            const org = row['Organisation Name'] || 'Unknown';
            const toDate = row['To date'] ? new Date(row['To date']) : null;
            const fromDate = row['From date'] ? new Date(row['From date']) : null;
            const year = toDate ? toDate.getFullYear().toString() : (fromDate ? fromDate.getFullYear().toString() : 'N/A');
            const trainingId = row['Training ID'];
            const expenditure = parseFloat(row['Expenditure'] || 0);
            const participants = parseInt(row['No of Participants'] || 1, 10);

            const key = `${org}-${year}`;
            if (!aggregated[key]) {
              aggregated[key] = {
                Organisation: org,
                OrganisationId: row['Organisation ID'],
                Year: year,
                trainingIds: new Set(),
                trainingsList: [],
                TotalParticipants: 0,
                TotalExpenditure: 0,
                LastTrainingDate: toDate || fromDate,
              };
            }
            if (trainingId && !aggregated[key].trainingIds.has(trainingId)) {
              aggregated[key].trainingIds.add(trainingId);
              aggregated[key].TotalExpenditure += expenditure;
              aggregated[key].TotalParticipants += participants;
              aggregated[key].trainingsList.push(row);
            }
            if (toDate && (!aggregated[key].LastTrainingDate || toDate > aggregated[key].LastTrainingDate)) {
              aggregated[key].LastTrainingDate = toDate;
            }
          });
          formattedData = Object.values(aggregated).map(item => ({
            Organisation: item.Organisation,
            OrganisationId: item.OrganisationId,
            Year: item.Year,
            'Total Trainings': item.trainingIds.size,
            'Total Participants': item.TotalParticipants,
            'Total Expenditure (In Lakh)': item.TotalExpenditure > 0 ? (item.TotalExpenditure / 100000).toFixed(2) : '-',
            'Last Training Date': item.LastTrainingDate,
            trainingsList: item.trainingsList
          }));
        } else {
          // Org View: Aggregate by Training ID to count participants
          const orgAggregated = {};
          rawData.forEach(row => {
            const tId = row['Training ID'] || Math.random().toString();
            if (!orgAggregated[tId]) {
              const toDate = row['To date'] ? new Date(row['To date']) : null;
              const year = toDate ? toDate.getFullYear().toString() : 'N/A';
              const exp = parseFloat(row['Expenditure'] || 0);
              const parts = parseInt(row['No of Participants'] || 1, 10);
              orgAggregated[tId] = {
                'Training ID': tId,
                'Training Title': row['Title'] || '-',
                'Training Type': row['Training Type'] || '-',
                'Training Source': row['Training Source'] || '-',
                'Expenditure (In Lakh)': exp > 0 ? (exp / 100000).toFixed(2) : '-',
                'Year': year,
                'Number of Participants': parts,
                'From date': row['From date'],
                'To date': row['To date'],
                'Organisation Name': row['Organisation Name'],
                'raw': row
              };
            }
          });
          formattedData = Object.values(orgAggregated);
        }

        setTrainings(formattedData);
      })
      .catch(err => {
        console.error("Error loading training details:", err);
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('Training details'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const isMinistryView = useMemo(() => {
    return !isOrganisationUser();
  }, []);

  const columnDefs = useMemo(() => {
    const cols = [
      { 
        headerName: 'S.No', 
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70, maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500',
        headerClass: 'text-center'
      }
    ];

    if (isMinistryView) {
      cols.push(
        { field: 'Organisation', headerName: 'Organisation', flex: 2, minWidth: 220, wrapText: true, autoHeight: true, cellClass: 'font-extrabold text-slate-900 text-left leading-snug py-2', headerClass: 'text-center' },
        { field: 'Year', headerName: 'Year', minWidth: 120, cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center' },
        { field: 'Total Trainings', headerName: 'Total Trainings', minWidth: 150, cellClass: 'text-center flex justify-center items-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Total Participants', headerName: 'Total Participants', minWidth: 160, cellClass: 'text-center flex justify-center items-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Total Expenditure (In Lakh)', headerName: 'Total Expenditure (In Lakh)', minWidth: 220, cellClass: 'text-center flex justify-center items-center font-semibold text-slate-800', headerClass: 'text-center' },
        { 
          field: 'Last Training Date', 
          headerName: 'Last Training Date', 
          minWidth: 180,
          cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center',
          valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-CA') : '-'
        },
        {
          headerName: 'View Details',
          minWidth: 150,
          cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center',
          cellRenderer: (params) => (
            <div className="flex items-center justify-center h-full">
              <button 
                type="button"
                onClick={() => setSelectedDetail(params.data)}
                title="View Training Details"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )
        }
      );
    } else {
      cols.push(
        // Long text wraps onto more lines (row grows) instead of widening the column off-screen
        { field: 'Training Title', headerName: 'Training Title', flex: 3, minWidth: 260, wrapText: true, autoHeight: true, cellClass: 'font-extrabold text-slate-900 text-left leading-snug py-2', headerClass: 'text-center' },
        { field: 'Training Type', headerName: 'Training Type', flex: 1.2, minWidth: 140, wrapText: true, autoHeight: true, cellClass: 'text-center leading-snug py-2', headerClass: 'text-center' },
        { field: 'Training Source', headerName: 'Training Source', flex: 1, minWidth: 120, wrapText: true, autoHeight: true, cellClass: 'text-center leading-snug py-2', headerClass: 'text-center' },
        { field: 'Expenditure (In Lakh)', headerName: 'Expenditure (In Lakh)', flex: 1, minWidth: 120, cellClass: 'text-center flex justify-center items-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Year', headerName: 'Year', flex: 0.7, minWidth: 90, cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center' },
        { 
          field: 'Number of Participants', 
          headerName: 'Number of Participants', 
          flex: 1, minWidth: 120, 
          cellClass: 'text-center flex justify-center items-center', 
          headerClass: 'text-center',
          cellRenderer: (params) => {
            const count = params.value ?? 1;
            return (
              <div className="flex items-center justify-center h-full">
                <button
                  type="button"
                  onClick={() => setSelectedDetail({
                    Organisation: params.data?.['Organisation Name'],
                    OrganisationId: params.data?.['Organisation ID'],
                    Year: params.data?.Year,
                    trainingsList: [params.data?.raw || params.data],
                    initialSelectedTraining: params.data?.raw || params.data
                  })}
                  title="Click to view details & participant roster"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-extrabold hover:underline cursor-pointer px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-xs flex items-center gap-1"
                >
                  <span>{count}</span>
                </button>
              </div>
            );
          }
        },
        {
          headerName: 'View Details',
          minWidth: 120,
          cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center',
          cellRenderer: (params) => (
            <div className="flex items-center justify-center space-x-2 h-full">
              <button 
                type="button"
                onClick={() => setSelectedDetail({
                  Organisation: params.data?.['Organisation Name'],
                  OrganisationId: params.data?.['Organisation ID'],
                  Year: params.data?.Year,
                  trainingsList: [params.data?.raw || params.data],
                  initialSelectedTraining: params.data?.raw || params.data
                })}
                title="View Training Details"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )
        },
        canUseInputForm && {
          headerName: 'Action',
          minWidth: 100,
          cellClass: 'text-center flex justify-center items-center',
          headerClass: 'text-center',
          cellRenderer: (params) => (
            <div className="flex items-center justify-center h-full">
              <EditActionButton label="Edit training" onClick={() => handleEdit(params.data)} />
            </div>
          )
        }
      );
    }
    return cols.filter(Boolean);
  }, [isMinistryView, canUseInputForm, handleEdit]);

  const uniqueYears = useMemo(() => {
    return [...new Set(trainings.map(item => item['Year']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueOrgs = useMemo(() => {
    return [...new Set(trainings.map(item => item['Organisation']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(trainings.map(item => item['Training Type']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueSources = useMemo(() => {
    return [...new Set(trainings.map(item => item['Training Source']).filter(Boolean))].sort();
  }, [trainings]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const matchYear = selectedYear === '' || t['Year'] === selectedYear;
      const matchOrg = selectedOrg === '' || t['Organisation'] === selectedOrg;
      const matchType = selectedType === '' || t['Training Type'] === selectedType;
      const matchSource = selectedSource === '' || t['Training Source'] === selectedSource;

      const term = debouncedSearch.toLowerCase();
      const matchSearch = !debouncedSearch || 
                          (t['Organisation'] || '').toLowerCase().includes(term) ||
                          (t['Year'] || '').toLowerCase().includes(term) ||
                          (t['Training Title'] || '').toLowerCase().includes(term);

      if (isMinistryView) {
        return matchYear && matchOrg && matchSearch;
      }
      return matchType && matchSource && matchSearch;
    });
  }, [trainings, selectedYear, selectedOrg, selectedType, selectedSource, debouncedSearch, isMinistryView]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedOrg) count++;
    if (selectedYear) count++;
    if (selectedType) count++;
    if (selectedSource) count++;
    return count;
  }, [selectedOrg, selectedYear, selectedType, selectedSource]);

  // Store keeps only the user's changes; merge them over this view's defaults
  const visibleCols = useMemo(
    () => ({ ...(isMinistryView ? MINISTRY_COLUMNS : ORG_COLUMNS), ...colChanges }),
    [isMinistryView, colChanges]
  );
  const toggleColumn = (col) => actions.setVisibleCols((prev) => ({ ...prev, [col]: !visibleCols[col] }));
  const resetFilters = () => {
    actions.resetFilters();
    notify?.(COMMON_TOASTS.filtersReset());
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColumnDefs = useMemo(() => {
    return columnDefs.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.headerName === 'Action') return visibleCols['Action'] !== false;
      if (col.headerName === 'View Details') return visibleCols['View Details'] !== false;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [columnDefs, visibleCols]);

  // Copy / Export: the rows on the current page, same columns as the table
  const pageStart = (currentPage - 1) * pageSize;
  const runExport = (kind) => createTableExporter({
    loadRows: () => filteredTrainings.slice(pageStart, pageStart + pageSize),
    serialStart: pageStart,
    getColumns: () => (isMinistryView
      ? [
        { field: 'Organisation', label: 'Organisation' },
        { field: 'Year', label: 'Year' },
        { field: 'Total Trainings', label: 'Total Trainings', value: (t) => t['Total Trainings'] || 0 },
        { field: 'Total Participants', label: 'Total Participants', value: (t) => t['Total Participants'] || 0 },
        { field: 'Total Expenditure (In Lakh)', label: 'Total Expenditure (In Lakh)' },
        { field: 'Last Training Date', label: 'Last Training Date', value: (t) => formatTrainingDate(t['Last Training Date']) },
      ]
      : [
        { field: 'Training Title', label: 'Training Title' },
        { field: 'Training Type', label: 'Training Type' },
        { field: 'Training Source', label: 'Training Source' },
        { field: 'Expenditure (In Lakh)', label: 'Expenditure (In Lakh)' },
        { field: 'Year', label: 'Year' },
        { field: 'Number of Participants', label: 'Number of Participants', value: (t) => t['Number of Participants'] || 0 },
      ]),
    notify,
    isBusy: loading,
    title: `${isMinistryView ? 'HR Training Summary Report' : 'HR Training Details Report'} (Page ${currentPage})`,
    fileName: `${isMinistryView ? 'HR_Training_Summary_Report' : 'HR_Training_Details_Report'}_Page_${currentPage}`,
    label: 'Training details',
  })[kind]();

  if (selectedDetail) {
    return (
      <TrainingDetailView
        detail={selectedDetail}
        onBack={() => setSelectedDetail(null)}
        notify={notify}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Content Card */}
      <div className="module-card space-y-4">

        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* 1. Left: Collapsible Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Collapsible Filter Toggle Button */}
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel(prev => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter className="h-3.5 w-3.5" />
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
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center space-x-1"
                title="Reset Filters"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 2. Right: Rows, Total Count, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">

            {/* Rows Limit */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredTrainings.length}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button type="button" aria-label="Clear search" onClick={() => actions.setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
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
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => toggleColumn(col)}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#134e96" chevron />
          </div>
        </div>

        {/* Filter Panel (shared HR design) */}
        <div className={showFilterPanel ? 'px-4 pt-4' : ''}>
          <HrFilterPanel show={showFilterPanel} columns={4}>
            {isMinistryView ? (
              <>
                <FilterSelect label="Organisation" value={selectedOrg} onChange={(value) => actions.setFilters({ organisation: value })}
                  allLabel="-- All Organisations --" options={uniqueOrgs} />
                <FilterSelect label="Year" value={selectedYear} onChange={(value) => actions.setFilters({ year: value })}
                  allLabel="-- All Years --" options={uniqueYears} />
              </>
            ) : (
              <>
                <FilterSelect label="Training Type" value={selectedType} onChange={(value) => actions.setFilters({ type: value })}
                  allLabel="-- All Types --" options={uniqueTypes} />
                <FilterSelect label="Training Source" value={selectedSource} onChange={(value) => actions.setFilters({ source: value })}
                  allLabel="-- All Sources --" options={uniqueSources} />
              </>
            )}
          </HrFilterPanel>
        </div>

        {/* Table Area */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredTrainings}
            columnDefs={activeColumnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            {...gridPage}
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
