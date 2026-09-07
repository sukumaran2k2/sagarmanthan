import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchProjectList, requestDropProject, fetchMmtDropdown } from '../api';
import ProjectsListTable from '../components/ProjectsListTable';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import {
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_STAGE_OPTIONS,
} from '../utils/constants';
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
  const [refreshTick, setRefreshTick] = useState(0);

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

  const handleDropProject = async (row) => {
    if (!permissions.canRemove) {
      notify?.('You do not have permission to request project drop.', 'error');
      return;
    }
    if (!row?.projectId) return;

    const currentStageId = Number(row?.raw?.current_project_stage_id || 0);
    if (currentStageId === 14) {
      notify?.('Completed projects cannot be dropped.', 'error');
      return;
    }

    const reason = window.prompt('Enter reason for drop request:');
    if (!reason || !String(reason).trim()) {
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
        reason: String(reason).trim(),
      });
      notify?.('Drop project request submitted successfully.', 'success');
      setRefreshTick((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to submit drop request.', 'error');
    } finally {
      setDropBusyId(null);
    }
  };

  return (
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
      canAdd={permissions.canAdd}
      canEdit={permissions.canEdit}
      canView={permissions.canView}
      canDropProject={permissions.canRemove}
      dropBusyId={dropBusyId}
      onAddNew={onAddNew}
      onOpenBasicInfo={onOpenBasicInfo}
      onDropProject={handleDropProject}
      onPageChange={setPage}
      onPageSizeChange={(nextSize) => {
        setPageSize(nextSize);
        setPage(1);
      }}
      exportFileName="projects_module_list"
    />
  );
}
