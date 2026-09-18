import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet } from 'lucide-react';
import { fetchProjectList, fetchProjectAllData, requestDropProject, fetchMmtDropdown } from '../api';
import ProjectsListTable from '../components/ProjectsListTable';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import {
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_STAGE_OPTIONS,
} from '../utils/constants';
import { downloadProjectAllDataExcel } from '../utils/exportProjectAllData';
import { mapProjectListRow } from '../utils/mapProject';
import { getSessionClaims } from '../../../utils/authSession';

const DEFAULT_FILTERS = {
  search: '',
  projectStage: 'All',
  projectCategory: 'All',
  organisationId: '',
  state: '',
};

export default function ProjectListPage({
  notify,
  onOpenBasicInfo,
  onAddNew,
  onOpenProjectDetail,
}) {
  const permissions = useProjectsPermissions();
  const claims = getSessionClaims() || {};

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const [organisations, setOrganisations] = useState([]);
  const [states, setStates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stageCounts, setStageCounts] = useState({
    all: 0,
    planning: 0,
    tendering: 0,
    ui: 0,
    completed: 0,
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dropBusyId, setDropBusyId] = useState(null);
  const [dropConfirmModal, setDropConfirmModal] = useState({
    open: false,
    row: null,
    reason: '',
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [exportingAllData, setExportingAllData] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetchMmtDropdown('mmt_organisation'),
      fetchMmtDropdown('mmt_state'),
      fetchMmtDropdown('mmt_project_category'),
    ]).then(([orgRes, stateRes, catRes]) => {
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
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const loadProjects = useCallback(
    async (signal) => {
      if (!permissions.canView || !permissions.userId) return;

      setLoading(true);

      try {
        const params = {
          userId: permissions.userId,
          page,
          limit: pageSize,
          search: effectiveFilters.search,
          projectStage: effectiveFilters.projectStage,
          projectCategory: effectiveFilters.projectCategory,
          organisationId: effectiveFilters.organisationId,
          state: effectiveFilters.state,
        };

        if (permissions.viewMode === 'org' && permissions.organisationId) {
          params.organisationId = permissions.organisationId;
        }

        const res = await fetchProjectList(params, { signal });
        const payload = res?.data || {};
        const serverRows = Array.isArray(payload?.data) ? payload.data : [];
        const mappedRows = serverRows.map(mapProjectListRow);

        setRows(mappedRows);
        if (payload?.pagination?.counts) {
          setStageCounts(payload.pagination.counts);
        }
        setPagination({
          total: Number(payload?.pagination?.total) || 0,
          page: Number(payload?.pagination?.page) || page,
          limit: Number(payload?.pagination?.limit) || pageSize,
          totalPages: Number(payload?.pagination?.totalPages) || 0,
          counts: payload?.pagination?.counts || null,
        });
      } catch (error) {
        if (error?.code === 'ERR_CANCELED') return;
        console.error(error);
        setRows([]);
        setPagination({ total: 0, page: 1, limit: pageSize, totalPages: 0 });

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
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      permissions.canView,
      permissions.userId,
      permissions.viewMode,
      permissions.organisationId,
      page,
      pageSize,
      effectiveFilters,
      notify,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadProjects(controller.signal);
    }, 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadProjects, refreshTick]);

  const closeDropConfirmModal = () => {
    if (dropBusyId) return;
    setDropConfirmModal({ open: false, row: null, reason: '' });
  };

  const canRequestDrop = Boolean(permissions.canRemove && permissions.viewMode === 'org');

  const handleDropProject = (row) => {
    if (!canRequestDrop) {
      notify?.('Only organisation users can request a project drop.', 'error');
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

  const handleExportAllData = async () => {
    if (!permissions.canView || !permissions.userId) {
      notify?.('You do not have permission to export project data.', 'error');
      return;
    }
    if (exportingAllData) return;

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

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={handleExportAllData}
          disabled={!permissions.canView || exportingAllData}
          title="Export All Data"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:from-emerald-100 hover:to-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>{exportingAllData ? 'Exporting All Data...' : 'Export All Data'}</span>
        </button>
      </div>

      <ProjectsListTable
        rows={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        pagination={pagination}
        stageCounts={stageCounts}
        filters={filters}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        stageOptions={PROJECT_STAGE_OPTIONS}
        categoryOptions={categories?.length ? categories : PROJECT_CATEGORY_OPTIONS}
        organisations={organisations}
        states={states}
        canAdd={Boolean(permissions.canAdd && (permissions.isOrganisationUser || permissions.viewMode === 'org'))}
        canEdit={permissions.canEdit}
        canView={permissions.canView}
        canDropProject={canRequestDrop}
        isOrganisationUser={permissions.isOrganisationUser}
        dropBusyId={dropBusyId}
        onAddNew={
          permissions.canAdd && (permissions.isOrganisationUser || permissions.viewMode === 'org')
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
    </>
  );
}
