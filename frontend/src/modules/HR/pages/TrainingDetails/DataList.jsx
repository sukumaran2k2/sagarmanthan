import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { fetchAllTrainingData } from '../../api';
import { Eye } from 'lucide-react';
import Table from '../../../../components/Table';
import { getCurrentUserId, isOrganisationUser } from '../../../../utils/authSession';
import { COMMON_TOASTS } from '../../../../utils/notify';
import TrainingDetailView from './DetailView';
import { useHrStore } from '../../store/useHrStore';
import { useDebouncedSearch } from '../../hooks/usePagedList';
import { useGridPage } from '../../hooks/useGridPage';
import { createTableExporter } from '../../utils/exportTable';
import { HrFilterPanel, FilterSelect } from '../../components/HrFilterPanel';
import { EditActionButton } from '../../components/HrFormControls';
import { useHRPermissions } from '../../hooks/useHRPermissions';
import { HR_TOASTS } from '../../toastMessages';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';
import { formatDate } from '../../utils/dates';

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
  // As in 2.0: offered in Visibility, unticked by default
  'To date': false,
  'Last Updated Date': false,
  'View Details': true,
  'Action': true
};
const formatTrainingDate = (value) => formatDate(value, 0, '-');

export default function TrainingDetails({ notify }) {
  // Editing opens Input Forms, which only users with create / update rights have
  const { canUseInputForm } = useHRPermissions();

  const [trainings, setTrainings] = useState([]);
  // Drill-down (training list of an organisation-year): view state of this page
  const [selectedDetail, setSelectedDetail] = useState(null);
  // Nothing loads without a signed-in user (see the load effect)
  const [loading, setLoading] = useState(() => Boolean(getCurrentUserId()));

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
    const userId = getCurrentUserId();
    if (!userId) {
      // No signed-in user in the token: never load as someone else
      notifyRef.current?.(HR_TOASTS.sessionExpired());
      return undefined;
    }

    fetchAllTrainingData(userId)
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
                'Last Updated Date': row['Date Updated'],
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
          valueFormatter: (params) => formatTrainingDate(params.value)
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
          field: 'To date', headerName: 'To Date', minWidth: 120, cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center',
          valueFormatter: (p) => formatTrainingDate(p.value),
        },
        {
          field: 'Last Updated Date', headerName: 'Last Updated Date', minWidth: 140, cellClass: 'text-center flex justify-center items-center', headerClass: 'text-center',
          valueFormatter: (p) => formatTrainingDate(p.value),
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
        ...(visibleCols['To date'] ? [{ field: 'To date', label: 'To Date', value: (t) => formatTrainingDate(t['To date']) }] : []),
        ...(visibleCols['Last Updated Date'] ? [{ field: 'Last Updated Date', label: 'Last Updated Date', value: (t) => formatTrainingDate(t['Last Updated Date']) }] : []),
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

          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={showFilterPanel}
              activeCount={activeFiltersCount}
              onToggle={() => actions.setShowFilterPanel(prev => !prev)}
              onReset={resetFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrRowsSelect value={pageSize} onChange={actions.setPageSize} />
            <HrTotalBadge count={filteredTrainings.length} />
            <HrSearchBox value={searchTerm} onChange={actions.setSearchTerm} />
            <HrColumnPicker
              capitalize
              columns={Object.keys(visibleCols).map((col) => ({ key: col, label: col, visible: visibleCols[col] }))}
              onToggle={toggleColumn}
            />
            <HrCopyExport onCopy={() => runExport('copy')} onExcel={() => runExport('excel')} onPdf={() => runExport('pdf')} />
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
