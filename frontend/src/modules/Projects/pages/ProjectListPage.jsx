import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchProjectList, requestDropProject } from '../api';
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
};

export default function ProjectListPage({
  notify,
  onOpenBasicInfo,
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

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dropBusyId, setDropBusyId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

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
        };

        if (permissions.viewMode === 'org' && permissions.organisationId) {
          params.organisationId = permissions.organisationId;
        }

        const res = await fetchProjectList(params, { signal });
        const payload = res?.data || {};
        const serverRows = Array.isArray(payload?.data) ? payload.data : [];
        const mappedRows = serverRows.map(mapProjectListRow);

        setRows(mappedRows);
        setPagination({
          total: Number(payload?.pagination?.total) || 0,
          page: Number(payload?.pagination?.page) || page,
          limit: Number(payload?.pagination?.limit) || pageSize,
          totalPages: Number(payload?.pagination?.totalPages) || 0,
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
      filters={filters}
      onFiltersChange={(nextFilters) => {
        setFilters(nextFilters);
        setPage(1);
      }}
      stageOptions={PROJECT_STAGE_OPTIONS}
      categoryOptions={PROJECT_CATEGORY_OPTIONS}
      canCreate={permissions.canAdd}
      canEdit={permissions.canEdit}
      canDropProject={permissions.canRemove || permissions.canEdit}
      dropBusyId={dropBusyId}
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
