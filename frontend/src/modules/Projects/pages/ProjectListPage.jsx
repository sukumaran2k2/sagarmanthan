import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, FolderArchive } from 'lucide-react';
import {
  fetchProjectList,
  fetchProjectAllData,
  fetchExpenditureLogs,
  fetchProjectScheduleAlerts,
  requestProjectMediaFilesDownload,
  requestDropProject,
  fetchMmtDropdown,
} from '../api';
import ProjectsListTable from '../components/ProjectsListTable';
import ProjectScheduleAlertsBanner from '../components/ProjectScheduleAlertsBanner';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import {
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_STAGE_OPTIONS,
} from '../utils/constants';
import { downloadExpenditureLogsExcel } from '../utils/exportExpenditureLogs';
import { downloadProjectAllDataExcel } from '../utils/exportProjectAllData';
import { mapProjectListRow } from '../utils/mapProject';
import { getSessionClaims } from '../../../utils/authSession';

const DEFAULT_FILTERS = {
  search: '',
  projectStage: 'All',
  projectCategory: 'All',
  schemeId: 'All',
  isSagarmalaFunded: 'All',
  organisationId: '',
  implementationMode: 'All',
  implementationType: 'All',
  state: '',
  district: '',
  physicalProgressMin: '',
  physicalProgressMax: '',
  financialProgressMin: '',
  financialProgressMax: '',
  underTenderingSubStage: '',
};

const DEFAULT_PROGRESS_FILTERS = {
  physicalProgressMin: '',
  physicalProgressMax: '',
  financialProgressMin: '',
  financialProgressMax: '',
};

const FILTER_DEBOUNCE_MS = 300;
const IMPLEMENTATION_MODE_OPTIONS = ['All', 'EPC', 'PPP'];

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

function getSessionEmail(claims = {}) {
  return String(claims.email || claims.userEmail || claims.mail || '').trim();
}

function getCountsFilterKey(filters = {}) {
  return JSON.stringify({
    search: String(filters.search || '').trim(),
    projectCategory: filters.projectCategory || 'All',
    schemeId: filters.schemeId || 'All',
    isSagarmalaFunded: filters.isSagarmalaFunded || 'All',
    organisationId: filters.organisationId || '',
    implementationMode: filters.implementationMode || 'All',
    implementationType: filters.implementationType || 'All',
    state: filters.state || '',
    district: filters.district || '',
    physicalProgressMin: filters.physicalProgressMin ?? '',
    physicalProgressMax: filters.physicalProgressMax ?? '',
    financialProgressMin: filters.financialProgressMin ?? '',
    financialProgressMax: filters.financialProgressMax ?? '',
    underTenderingSubStage: filters.underTenderingSubStage || '',
  });
}

export default function ProjectListPage({
  notify,
  onOpenBasicInfo,
  onAddNew,
  onOpenProjectDetail,
}) {
  const permissions = useProjectsPermissions();
  const claims = getSessionClaims() || {};

  const [rows, setRows] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const [categories, setCategories] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [underTenderingSubStages, setUnderTenderingSubStages] = useState([]);
  const [stageCounts, setStageCounts] = useState({
    all: 0,
    planning: 0,
    tendering: 0,
    ui: 0,
    completed: 0,
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedProgressFilters, setDebouncedProgressFilters] = useState(DEFAULT_PROGRESS_FILTERS);
  const [listHydrated, setListHydrated] = useState(false);
  const [dropBusyId, setDropBusyId] = useState(null);
  const [dropConfirmModal, setDropConfirmModal] = useState({
    open: false,
    row: null,
    reason: '',
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [scheduleAlerts, setScheduleAlerts] = useState(null);
  const [exportingAllData, setExportingAllData] = useState(false);
  const [exportingExpenditureLogs, setExportingExpenditureLogs] = useState(false);
  const [requestingMediaFiles, setRequestingMediaFiles] = useState(false);
  const [mediaFilesModal, setMediaFilesModal] = useState({
    open: false,
    email: '',
    submittedEmail: '',
    step: 'form', // 'form' | 'success'
  });

  const countsFilterKeyRef = useRef('');
  const hasLoadedRowsRef = useRef(false);

  const isExportBusy = exportingAllData || exportingExpenditureLogs || requestingMediaFiles;
  const showInitialLoader = isFetching && !hasLoadedRowsRef.current;
  const isRefreshing = isFetching && hasLoadedRowsRef.current;

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      fetchMmtDropdown('mmt_organisation'),
      fetchMmtDropdown('mmt_state'),
      fetchMmtDropdown('mmt_project_category'),
      fetchMmtDropdown('mmt_scheme'),
      fetchMmtDropdown('tbl_project_sub_stage'),
    ]).then(([orgRes, stateRes, catRes, schemeRes, subStageRes]) => {
      if (!mounted) return;
      if (orgRes.status === 'fulfilled' && Array.isArray(orgRes.value?.data)) {
        setOrganisations(orgRes.value.data);
      }
      if (stateRes.status === 'fulfilled' && Array.isArray(stateRes.value?.data)) {
        setStates(stateRes.value.data);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data)) {
        setCategories(catRes.value.data);
      }
      if (schemeRes.status === 'fulfilled' && Array.isArray(schemeRes.value?.data)) {
        setSchemes(schemeRes.value.data);
      }
      if (
        subStageRes.status === 'fulfilled' &&
        Array.isArray(subStageRes.value?.data)
      ) {
        setUnderTenderingSubStages(subStageRes.value.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!listHydrated) return undefined;
    let mounted = true;

    fetchMmtDropdown('mmt_district')
      .then((res) => {
        if (mounted && Array.isArray(res?.data)) {
          setDistricts(res.data);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      mounted = false;
    };
  }, [listHydrated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProgressFilters({
        physicalProgressMin: filters.physicalProgressMin,
        physicalProgressMax: filters.physicalProgressMax,
        financialProgressMin: filters.financialProgressMin,
        financialProgressMax: filters.financialProgressMax,
      });
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    filters.physicalProgressMin,
    filters.physicalProgressMax,
    filters.financialProgressMin,
    filters.financialProgressMax,
  ]);

  const effectiveFilters = useMemo(
    () => ({
      search: debouncedSearch,
      projectStage: filters.projectStage,
      projectCategory: filters.projectCategory,
      schemeId: filters.schemeId,
      isSagarmalaFunded: filters.isSagarmalaFunded,
      organisationId: filters.organisationId,
      implementationMode: filters.implementationMode,
      implementationType: filters.implementationType,
      state: filters.state,
      district: filters.district,
      underTenderingSubStage: filters.underTenderingSubStage,
      ...debouncedProgressFilters,
    }),
    [
      debouncedSearch,
      filters.projectStage,
      filters.projectCategory,
      filters.schemeId,
      filters.isSagarmalaFunded,
      filters.organisationId,
      filters.implementationMode,
      filters.implementationType,
      filters.state,
      filters.district,
      filters.underTenderingSubStage,
      debouncedProgressFilters,
    ]
  );

  const countsFilterKey = useMemo(
    () => getCountsFilterKey(effectiveFilters),
    [effectiveFilters]
  );

  const buildListParams = useCallback(
    (overrides = {}) => {
      const params = {
        userId: permissions.userId,
        page,
        limit: pageSize,
        search: effectiveFilters.search,
        projectStage: effectiveFilters.projectStage,
        projectCategory: effectiveFilters.projectCategory,
        schemeId: effectiveFilters.schemeId,
        isSagarmalaFunded: effectiveFilters.isSagarmalaFunded,
        organisationId: effectiveFilters.organisationId,
        implementationMode: effectiveFilters.implementationMode,
        implementationType: effectiveFilters.implementationType,
        state: effectiveFilters.state,
        district: effectiveFilters.district,
        physicalProgressMin: effectiveFilters.physicalProgressMin,
        physicalProgressMax: effectiveFilters.physicalProgressMax,
        financialProgressMin: effectiveFilters.financialProgressMin,
        financialProgressMax: effectiveFilters.financialProgressMax,
        underTenderingSubStage: effectiveFilters.underTenderingSubStage,
        includeCounts: false,
        ...overrides,
      };

      if (permissions.viewMode === 'org' && permissions.organisationId) {
        params.organisationId = permissions.organisationId;
      }

      return params;
    },
    [
      permissions.userId,
      permissions.viewMode,
      permissions.organisationId,
      page,
      pageSize,
      effectiveFilters,
    ]
  );

  const loadProjects = useCallback(
    async (signal) => {
      if (!permissions.canView || !permissions.userId) return;

      setIsFetching(true);
      const needsCounts = countsFilterKeyRef.current !== countsFilterKey;

      try {
        const pagePromise = fetchProjectList(
          buildListParams({ includeCounts: false }),
          { signal }
        );
        const countsPromise = needsCounts
          ? fetchProjectList(
              buildListParams({
                page: 1,
                limit: 1,
                includeCounts: true,
                countsOnly: true,
                // Badge counts ignore the active stage tab.
                projectStage: 'All',
              }),
              { signal }
            )
          : null;

        const res = await pagePromise;
        if (signal?.aborted) return;

        const payload = res?.data || {};
        const serverRows = Array.isArray(payload?.data) ? payload.data : [];
        const mappedRows = serverRows.map(mapProjectListRow);

        setRows(mappedRows);
        hasLoadedRowsRef.current = true;
        setListHydrated(true);

        setPagination((prev) => ({
          total: Number(payload?.pagination?.total) || 0,
          page: Number(payload?.pagination?.page) || page,
          limit: Number(payload?.pagination?.limit) || pageSize,
          totalPages: Number(payload?.pagination?.totalPages) || 0,
          counts: prev?.counts ?? null,
        }));

        if (!signal?.aborted) {
          setIsFetching(false);
        }

        if (countsPromise && !signal?.aborted) {
          try {
            const countsRes = await countsPromise;
            if (signal?.aborted) return;

            const counts = countsRes?.data?.pagination?.counts;
            if (counts) {
              setStageCounts(counts);
              countsFilterKeyRef.current = countsFilterKey;
              setPagination((prev) => ({
                ...prev,
                counts,
              }));
            }
          } catch (countsError) {
            if (countsError?.code === 'ERR_CANCELED' || signal?.aborted) return;
            console.error(countsError);
          }
        }
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || signal?.aborted) return;
        console.error(error);

        if (!hasLoadedRowsRef.current) {
          setRows([]);
          setPagination({ total: 0, page: 1, limit: pageSize, totalPages: 0 });
        }

        const timeoutMessage =
          error?.code === 'ECONNABORTED'
            ? 'Project list request timed out. Please try again.'
            : null;

        notify?.(
          timeoutMessage ||
            error?.response?.data?.message ||
            'Failed to load projects list. Please try again.',
          'error'
        );

        if (!signal?.aborted) {
          setIsFetching(false);
        }
      }
    },
    [
      permissions.canView,
      permissions.userId,
      buildListParams,
      page,
      pageSize,
      countsFilterKey,
      notify,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    if (refreshTick > 0) {
      countsFilterKeyRef.current = '';
    }
    loadProjects(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProjects, refreshTick]);

  useEffect(() => {
    if (!permissions.userId || !permissions.canView || !listHydrated) return undefined;
    let mounted = true;
    const controller = new AbortController();

    fetchProjectScheduleAlerts(permissions.userId, { signal: controller.signal })
      .then((res) => {
        if (mounted) setScheduleAlerts(res?.data || { tendering: [], implementation: [] });
      })
      .catch((error) => {
        if (error?.code === 'ERR_CANCELED') return;
        console.error(error);
        if (mounted) setScheduleAlerts({ tendering: [], implementation: [] });
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [permissions.userId, permissions.canView, refreshTick, listHydrated]);

  const closeDropConfirmModal = () => {
    if (dropBusyId) return;
    setDropConfirmModal({ open: false, row: null, reason: '' });
  };

  const canRequestDrop = Boolean(
    permissions.canView
    && permissions.canEdit
    && permissions.isOrgScope
    && !permissions.isViewOnlyAdmin
  );

  const handleDropProject = (row) => {
    if (!canRequestDrop) {
      notify?.('You do not have permission to request a project drop.', 'error');
      return;
    }
    if (!row?.projectId) return;

    const currentStageId = Number(row?.raw?.current_project_stage_id || 0);
    if (currentStageId === 14) {
      notify?.('Completed projects cannot be dropped.', 'error');
      return;
    }

    setDropConfirmModal({ open: true, row, reason: '' });
  };

  const confirmDropProject = async () => {
    const row = dropConfirmModal.row;
    const reason = String(dropConfirmModal.reason || '').trim();
    if (!row?.projectId) {
      closeDropConfirmModal();
      return;
    }
    if (!reason) {
      notify?.('Drop reason is required.', 'error');
      return;
    }

    setDropBusyId(row.id);
    try {
      await requestDropProject({
        userID: permissions.userId,
        email: claims.email || claims.userEmail || '',
        projectID: row.projectId,
        subProjectID: row.subProjectId,
        reason,
      });
      notify?.('Drop project request submitted successfully.', 'success');
      window.dispatchEvent(new Event('drop-request-updated'));
      window.dispatchEvent(new Event('notifications-updated'));
      setDropConfirmModal({ open: false, row: null, reason: '' });
      setRefreshTick((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to submit drop request.', 'error');
    } finally {
      setDropBusyId(null);
    }
  };

  useEffect(() => {
    if (!dropConfirmModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dropConfirmModal.open]);

  useEffect(() => {
    if (!mediaFilesModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mediaFilesModal.open]);

  const closeMediaFilesModal = () => {
    if (requestingMediaFiles) return;
    setMediaFilesModal({
      open: false,
      email: '',
      submittedEmail: '',
      step: 'form',
    });
  };

  const openMediaFilesModal = () => {
    if (!permissions.canView || !permissions.userId) {
      notify?.('You do not have permission to request media files.', 'error');
      return;
    }
    if (isExportBusy) return;

    setMediaFilesModal({
      open: true,
      email: getSessionEmail(claims),
      submittedEmail: '',
      step: 'form',
    });
  };

  const handleExportAllData = async () => {
    if (!permissions.canView || !permissions.userId) {
      notify?.('You do not have permission to export project data.', 'error');
      return;
    }
    if (isExportBusy) return;

    setExportingAllData(true);
    notify?.('Preparing All Data export. This may take a moment...', 'info');

    try {
      const response = await fetchProjectAllData(permissions.userId);
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (!rows.length) {
        notify?.('No project data available to export.', 'info');
        return;
      }

      const rowCount = downloadProjectAllDataExcel(rows);
      notify?.(`Exported ${rowCount} project row(s) successfully.`, 'success');
    } catch (error) {
      console.error(error);
      const timeoutMessage =
        error?.code === 'ECONNABORTED'
          ? 'All Data export timed out. Please try again.'
          : null;
      notify?.(
        timeoutMessage ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to export All Data. Please try again.',
        'error'
      );
    } finally {
      setExportingAllData(false);
    }
  };

  const handleExportExpenditureLogs = async () => {
    if (!permissions.canView || !permissions.userId) {
      notify?.('You do not have permission to export expenditure logs.', 'error');
      return;
    }
    if (isExportBusy) return;

    setExportingExpenditureLogs(true);
    notify?.('Preparing Expenditure Logs export. This may take a moment...', 'info');

    try {
      const response = await fetchExpenditureLogs(permissions.userId);
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (!rows.length) {
        notify?.('No expenditure logs available to export.', 'info');
        return;
      }

      const rowCount = downloadExpenditureLogsExcel(rows);
      notify?.(`Exported ${rowCount} expenditure log row(s) successfully.`, 'success');
    } catch (error) {
      console.error(error);
      const timeoutMessage =
        error?.code === 'ECONNABORTED'
          ? 'Expenditure Logs export timed out. Please try again.'
          : null;
      notify?.(
        timeoutMessage ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to export Expenditure Logs. Please try again.',
        'error'
      );
    } finally {
      setExportingExpenditureLogs(false);
    }
  };

  const confirmMediaFilesRequest = async () => {
    if (!permissions.canView || !permissions.userId) {
      notify?.('You do not have permission to request media files.', 'error');
      return;
    }

    const email = String(mediaFilesModal.email || '').trim();
    if (!email) {
      notify?.('Please enter an email address.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      notify?.('Please enter a valid email address.', 'error');
      return;
    }
    if (requestingMediaFiles) return;

    setRequestingMediaFiles(true);
    try {
      await requestProjectMediaFilesDownload(permissions.userId, email);
      setMediaFilesModal({
        open: true,
        email,
        submittedEmail: email,
        step: 'success',
      });
      notify?.('Media files request submitted successfully.', 'success');
    } catch (error) {
      console.error(error);
      const timeoutMessage =
        error?.code === 'ECONNABORTED'
          ? 'Media files request timed out. Please try again.'
          : null;
      notify?.(
        timeoutMessage ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to request media files. Please try again.',
        'error'
      );
    } finally {
      setRequestingMediaFiles(false);
    }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={openMediaFilesModal}
          disabled={!permissions.canView || isExportBusy}
          title="Request Media Files"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm transition hover:from-violet-100 hover:to-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FolderArchive className="h-4 w-4" />
          <span>{requestingMediaFiles ? 'Requesting Media Files...' : 'Media Files'}</span>
        </button>
        <button
          type="button"
          onClick={handleExportExpenditureLogs}
          disabled={!permissions.canView || isExportBusy}
          title="Export Expenditure Logs"
          className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:from-sky-100 hover:to-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>
            {exportingExpenditureLogs ? 'Exporting Expenditure Logs...' : 'Expenditure Logs'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleExportAllData}
          disabled={!permissions.canView || isExportBusy}
          title="Export All Data"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:from-emerald-100 hover:to-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>{exportingAllData ? 'Exporting All Data...' : 'Export All Data'}</span>
        </button>
      </div>

      <ProjectScheduleAlertsBanner
        alerts={scheduleAlerts}
        onOpenProjectDetail={onOpenProjectDetail}
        notify={notify}
      />

      <ProjectsListTable
        rows={rows}
        loading={showInitialLoader}
        isRefreshing={isRefreshing}
        page={page}
        pageSize={pageSize}
        pagination={pagination}
        stageCounts={stageCounts}
        filters={filters}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);

          const nextProgress = {
            physicalProgressMin: nextFilters.physicalProgressMin ?? '',
            physicalProgressMax: nextFilters.physicalProgressMax ?? '',
            financialProgressMin: nextFilters.financialProgressMin ?? '',
            financialProgressMax: nextFilters.financialProgressMax ?? '',
          };
          const progressCleared = Object.values(nextProgress).every((value) => value === '');
          if (progressCleared) {
            setDebouncedProgressFilters(nextProgress);
          }
        }}
        stageOptions={PROJECT_STAGE_OPTIONS}
        categoryOptions={categories?.length ? categories : PROJECT_CATEGORY_OPTIONS}
        schemeOptions={schemes}
        implementationModeOptions={IMPLEMENTATION_MODE_OPTIONS}
        implementationTypeOptions={['All', 'Single Funded', 'Self Funded', 'Multi Funded']}
        organisations={organisations}
        states={states}
        districts={districts}
        underTenderingSubStageOptions={underTenderingSubStages}
        canAdd={Boolean(permissions.canAdd && permissions.isOrgScope)}
        canEdit={Boolean(permissions.canEdit && !permissions.isViewOnlyAdmin)}
        canView={permissions.canView}
        canDropProject={canRequestDrop}
        isOrganisationUser={permissions.isOrganisationUser}
        dropBusyId={dropBusyId}
        onAddNew={
          permissions.canAdd && permissions.isOrgScope
            ? onAddNew
            : undefined
        }
        onOpenBasicInfo={onOpenBasicInfo}
        onOpenProjectDetail={onOpenProjectDetail}
        onDropProject={canRequestDrop ? handleDropProject : undefined}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
        exportFileName="projects_module_list"
      />

      {dropConfirmModal.open
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              onClick={closeDropConfirmModal}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Request Drop Project</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter a reason to request dropping{' '}
                    <span className="font-semibold text-slate-700">
                      {dropConfirmModal.row?.subProjectName &&
                      dropConfirmModal.row.subProjectName !== '-'
                        ? dropConfirmModal.row.subProjectName
                        : dropConfirmModal.row?.projectName ||
                          dropConfirmModal.row?.projectId ||
                          'this project'}
                    </span>
                    .
                  </p>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white text-sm p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                    rows={3}
                    placeholder="Enter reason for drop request..."
                    value={dropConfirmModal.reason}
                    onChange={(e) =>
                      setDropConfirmModal((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    disabled={Boolean(dropBusyId)}
                  />
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDropConfirmModal}
                    disabled={Boolean(dropBusyId)}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDropProject}
                    disabled={Boolean(dropBusyId)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {dropBusyId ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mediaFilesModal.open
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              onClick={closeMediaFilesModal}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {mediaFilesModal.step === 'success' ? (
                  <>
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="text-sm font-black text-slate-800">Processing Media Files</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        The media files are currently being processed and will be sent to{' '}
                        <span className="font-semibold text-slate-700">
                          {mediaFilesModal.submittedEmail}
                        </span>{' '}
                        within the next 15 minutes.
                      </p>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={closeMediaFilesModal}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-[#0f417a] text-white hover:bg-[#0c3564]"
                      >
                        OK
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="text-sm font-black text-slate-800">Request Media Files</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Enter the email address where the project media ZIP should be delivered.
                      </p>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      <label
                        htmlFor="media-files-email"
                        className="block text-xs font-bold text-slate-600"
                      >
                        Email address
                      </label>
                      <input
                        id="media-files-email"
                        type="email"
                        autoFocus
                        autoComplete="email"
                        placeholder="example@domain.com"
                        value={mediaFilesModal.email}
                        onChange={(e) =>
                          setMediaFilesModal((prev) => ({ ...prev, email: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmMediaFilesRequest();
                          }
                        }}
                        disabled={requestingMediaFiles}
                        className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
                      />
                    </div>
                    <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeMediaFilesModal}
                        disabled={requestingMediaFiles}
                        className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmMediaFilesRequest}
                        disabled={requestingMediaFiles}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {requestingMediaFiles ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
