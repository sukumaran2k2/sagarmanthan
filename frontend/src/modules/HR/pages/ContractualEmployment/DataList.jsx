import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { fetchAllContractualData } from '../../api';
import { X } from 'lucide-react';
import { HrFilterPanel, FilterSelect } from '../../components/HrFilterPanel';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';
import Table from '../../../../components/Table';
import { getCurrentUserId, getSessionOrganisationId, isOrganisationUser } from '../../../../utils/authSession';
import ConfirmModal from '../../../../components/ConfirmModal';
import { DeleteActionButton, EditActionButton } from '../../components/HrFormControls';
import { useHRPermissions } from '../../hooks/useHRPermissions';
import { COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { deleteContractualData } from '../../api.js';
import { HR_TOASTS } from '../../toastMessages';
import { useHrStore } from '../../store/useHrStore';
import { useDebouncedSearch } from '../../hooks/usePagedList';
import { useGridPage } from '../../hooks/useGridPage';
import { createTableExporter } from '../../utils/exportTable';

const DEFAULT_VISIBLE = {
  'Organisation Name': true,
  'Financial Year': true,
  'Total for officers level': true,
  'Total for Non-officers level': true,
  'Actions': true
};

export default function ContractualEmployment({ notify }) {
  // Editing opens Input Forms, which only users with create / update rights have
  const { canUseInputForm, delete: canDelete } = useHRPermissions();
  const [staff, setStaff] = useState([]);
  // Nothing loads without a signed-in user (see the load effect)
  const [loading, setLoading] = useState(() => Boolean(getCurrentUserId()));

  // Filters, search, paging and column visibility live in the HR store
  const {
    organisation: selectedOrg, year: selectedYear, searchTerm, debouncedSearch,
    showFilterPanel: filterOpen, currentPage, pageSize, visibleCols: colChanges,
  } = useHrStore(useShallow((state) => ({
    organisation: state.contractual.organisation,
    year: state.contractual.year,
    searchTerm: state.contractual.searchTerm,
    debouncedSearch: state.contractual.debouncedSearch,
    showFilterPanel: state.contractual.showFilterPanel,
    currentPage: state.contractual.currentPage,
    pageSize: state.contractual.pageSize,
    visibleCols: state.contractual.visibleCols,
  })));
  const actions = useHrStore((state) => state.contractualActions);
  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);
  const gridPage = useGridPage(currentPage, actions.setCurrentPage);

  const navigate = useNavigate();

  // The record being edited travels with the route (location.state.item)
  const handleEdit = useCallback((data) => {
    navigate('/hr/hr-management/input-form/contractual-data', { state: { item: data } });
  }, [navigate]);

  const getRowIds = (row) => ({
  contractId: row.contract_id ?? row.contractId ?? row.ContractId ?? row.id,
  organisationID: row.organisation_id ?? row.organisationID ?? row.organisationId ?? row.OrganisationID,
});

  // Delete asks in a popup (as other modules), then removes the row
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = useCallback((data) => setPendingDelete(data), []);

  const confirmDelete = async () => {
    const { contractId, organisationID: rowOrgId } = getRowIds(pendingDelete || {});
    // The record's organisation, else the signed-in user's organisation (never the user id)
    const organisationID = rowOrgId ?? getSessionOrganisationId();
    if (!contractId || !organisationID) {
      console.error('Missing ids for delete. Row was:', pendingDelete);
      notify?.(HR_TOASTS.recordIdMissing());
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteContractualData(contractId, organisationID);
      setStaff(prev => prev.filter(r => getRowIds(r).contractId !== contractId));
      notify?.(HR_TOASTS.contractualDeleted());
      setPendingDelete(null);
    } catch (err) {
      console.error('Delete error:', err.response?.status, err.response?.data || err.message);
      notify?.(HR_TOASTS.contractualDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

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

    fetchAllContractualData(userId)
      .then(res => {
        if (isMounted) setStaff(res.data || []);
      })
      .catch(err => {
        console.error("Error loading staff data:", err);
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('Contractual employment data'));
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
      { headerName: 'S.No', valueGetter: 'node.rowIndex + 1', minWidth: 80, maxWidth: 100, pinned: 'left', cellClass: 'text-center font-bold text-slate-500', headerClass: 'text-center' },
      { field: 'Organisation Name', headerName: 'Organisation', minWidth: 250, pinned: 'left', cellClass: 'font-extrabold text-slate-900 text-center flex justify-center', headerClass: 'text-center' },
      { field: 'Financial Year', headerName: 'Financial Year', minWidth: 150, cellClass: 'text-center flex justify-center', headerClass: 'text-center' },
      { field: 'Total for officers level', headerName: 'Total Contractual Employees at Officer level', minWidth: 250, cellClass: 'text-center font-bold text-blue-600', headerClass: 'text-center' },
      { field: 'Total for Non-officers level', headerName: 'Total Contractual Employees at Non Officer level', minWidth: 250, cellClass: 'text-center font-bold text-blue-600', headerClass: 'text-center' }
    ];

    if (!isMinistryView && (canUseInputForm || canDelete)) {
      cols.push({
        field: 'Actions',
        headerName: 'Action',
        minWidth: 150,
        cellClass: 'text-center',
        headerClass: 'text-center',
        cellRenderer: (params) => (
          <div className="flex items-center justify-center gap-1 h-full">
            {canUseInputForm && <EditActionButton label="Edit contractual data" onClick={() => handleEdit(params.data)} />}
            {canDelete && <DeleteActionButton label="Delete contractual data" onClick={() => handleDelete(params.data)} />}
          </div>
        )
      });
    }

    return cols;
  }, [isMinistryView, canUseInputForm, canDelete, handleEdit, handleDelete]);

  const uniqueOrgs = useMemo(() => {
    return [...new Set(staff.map(item => item['Organisation Name']).filter(Boolean))].sort();
  }, [staff]);

  const uniqueYears = useMemo(() => {
    return [...new Set(staff.map(item => item['Financial Year']).filter(Boolean))].sort();
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchOrg = selectedOrg === '' || s['Organisation Name'] === selectedOrg;
      const matchYear = selectedYear === '' || s['Financial Year'] === selectedYear;

      const term = debouncedSearch.toLowerCase();
      const matchSearch = !debouncedSearch || 
                          (s['Organisation Name'] || '').toLowerCase().includes(term) ||
                          (s['Financial Year'] || '').toLowerCase().includes(term);

      return matchOrg && matchYear && matchSearch;
    });
  }, [staff, selectedOrg, selectedYear, debouncedSearch]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear) count++;
    if (selectedOrg) count++;
    return count;
  }, [selectedYear, selectedOrg]);

  const resetFilters = () => {
    actions.resetFilters();
    actions.setSearchTerm('');
    notify?.(COMMON_TOASTS.filtersReset());
  };

  // Store keeps only the user's changes; merge them over this page's defaults
  const visibleCols = useMemo(() => ({ ...DEFAULT_VISIBLE, ...colChanges }), [colChanges]);
  const toggleColumn = (col) => actions.setVisibleCols((prev) => ({ ...prev, [col]: !visibleCols[col] }));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalType, setModalType] = useState(''); // 'officer' or 'non-officer'

  const activeColumnDefs = useMemo(() => {
    return columnDefs.map(col => {
      if (col.field === 'Total for officers level') {
        return {
          ...col,
          cellRenderer: (params) => (
            <div 
              className="cursor-pointer hover:underline h-full flex items-center justify-center w-full"
              onClick={() => {
                setModalData(params.data);
                setModalType('officer');
                setModalOpen(true);
              }}
            >
              {params.value}
            </div>
          )
        };
      }
      if (col.field === 'Total for Non-officers level') {
        return {
          ...col,
          cellRenderer: (params) => (
            <div 
              className="cursor-pointer hover:underline h-full flex items-center justify-center w-full"
              onClick={() => {
                setModalData(params.data);
                setModalType('non-officer');
                setModalOpen(true);
              }}
            >
              {params.value}
            </div>
          )
        };
      }
      return col;
    }).filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [columnDefs, visibleCols]);

  // Copy / Export: the rows on the current page, visible data columns only
  const pageStart = (currentPage - 1) * pageSize;
  const runExport = (kind) => createTableExporter({
    loadRows: () => filteredStaff.slice(pageStart, pageStart + pageSize),
    serialStart: pageStart,
    getColumns: () => activeColumnDefs
      .filter((c) => c.field && c.field !== 'Actions')
      .map((c) => ({ field: c.field, label: c.headerName })),
    notify,
    isBusy: loading,
    title: `Contractual Employment (Page ${currentPage})`,
    fileName: `Contractual_Employment_Page_${currentPage}`,
    label: 'Contractual employment',
  })[kind]();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Content Card */}
      <div className="module-card space-y-4">

        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">

          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={filterOpen}
              activeCount={activeFiltersCount}
              onToggle={() => actions.setShowFilterPanel(prev => !prev)}
              onReset={resetFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <HrSearchBox value={searchTerm} onChange={actions.setSearchTerm} />
            <HrRowsSelect value={pageSize} onChange={actions.setPageSize} />
            <HrTotalBadge count={filteredStaff.length} />
            <HrColumnPicker
              capitalize
              columns={Object.keys(visibleCols).map((col) => ({ key: col, label: col, visible: visibleCols[col] }))}
              onToggle={toggleColumn}
            />
            <HrCopyExport onCopy={() => runExport('copy')} onExcel={() => runExport('excel')} onPdf={() => runExport('pdf')} />
          </div>
        </div>

        {/* Filter Panel (shared HR design) */}
        <div className={filterOpen ? 'pb-4' : ''}>
          <HrFilterPanel show={filterOpen} columns={isMinistryView ? 2 : 3}>
            {isMinistryView && (
              <FilterSelect label="Organisation" value={selectedOrg} onChange={(value) => actions.setFilters({ organisation: value })}
                allLabel="-- All Organisations --" options={uniqueOrgs} />
            )}
            <FilterSelect label="Financial Year" value={selectedYear} onChange={(value) => actions.setFilters({ year: value })}
              allLabel="-- All Years --" options={uniqueYears} />
          </HrFilterPanel>
        </div>

        {/* Table Area */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredStaff}
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

      {/* Breakdown Modal */}
      {modalOpen && modalData && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          ></div>

          <div className="relative bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-[#0f417a] text-white">
              <div>
                <h3 className="text-xl font-bold tracking-wide">
                  {modalType === 'officer' ? 'Contractual Employees - Officer Level' : 'Contractual Employees - Non-Officer Level'}
                </h3>
                <p className="text-blue-100 text-sm mt-0.5 opacity-90">
                  Detailed breakdown of employment categories
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* Context Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {modalData['Organisation Name'] && (
                  <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-4 py-1.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <span className="uppercase text-xs tracking-wider opacity-80">Organisation</span>
                    <span className="text-sm">{modalData['Organisation Name']}</span>
                  </div>
                )}
                <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-4 py-1.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800 shadow-sm">
                  <span className="uppercase text-xs tracking-wider opacity-80">Financial Year</span>
                  <span className="text-sm">{modalData['Financial Year'] || 'N/A'}</span>
                </div>
              </div>
              {/* Grid of Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Direct Engagement */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Direct Engagement
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Direct engagement'] || 0) : (modalData['Non-officer Direct engagement'] || 0)}
                  </span>
                </div>

                {/* Retired from other Govt/PSU */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Retired from Govt/PSU
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Retired from Govt.'] || 0) : (modalData['Non-officer retired from Govt.'] || 0)}
                  </span>
                </div>

                {/* Retired From own Organisation */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Retired from own Org
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Retired from own organisation'] || 0) : (modalData['Non-officer retired from own organisation'] || 0)}
                  </span>
                </div>

                {/* Through Agency */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Through Agency
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Through agency'] || 0) : (modalData['Non-officer through agency'] || 0)}
                  </span>
                </div>

                {/* For Ministry */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center lg:col-span-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    For Ministry
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - For ministry'] || 0) : (modalData['Non-officer for ministry'] || 0)}
                  </span>
                </div>

              </div>

              {/* Total Summary Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Count:</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {modalType === 'officer' ? (modalData['Total for officers level'] || 0) : (modalData['Total for Non-officers level'] || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Contractual Data"
        message={`Delete the contractual employment record${pendingDelete?.['Financial Year'] ? ` for ${pendingDelete['Financial Year']}` : ''}? This cannot be undone.`}
        confirmText="Delete"
        loadingText="Deleting..."
      />
    </div>
  );
}
