import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IndexCardGrid from '../components/IndexCardGrid';
import INPUT_FORM_INDEX, { INPUT_FORM_LEAVES } from '../data/inputFormIndex';
import GenericReportPage from '../components/GenericReportPage';
import VesselSurveyDataList from '../components/VesselSurveyDataList';
import * as api from '../api';
import { useKPIDGSPermissions } from '../hooks/useKPIDGSPermissions';
import { examMonthlyColumns, examOverallColumns } from '../components/examPerformanceColumns';
import { flagStateMmdWiseColumns, flagStateVesselWiseColumns } from '../components/flagStateInspectionColumns';
import { portStateMmdWiseColumns, portStateVesselWiseColumns } from '../components/portStateInspectionColumns';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useDgsStore, DGS_STORED_LIST_SLUGS } from '../store/useDgsStore';
import { ExamFilterButton, ExamFilterPanel } from '../components/ExamListFilters';
import {
  EXAM_FILTER_FIELDS, countActiveFilters, filterExamRows, yearOptionsFrom, mmdOptionsFrom,
} from '../data/examListFilters';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { DGS_TOASTS } from '../toastMessages';
import { monthName } from '../data/periodOptions';

const LIST_FETCH_BY_SLUG = {
  'flagging-of-vessels': () => api.fetchKpi2_1_List(),
  'sbfap-shipyard-list': () => api.fetchShipyardList(),
  'sbfap-inprincipal-approval': () => api.fetchKpi2_2_List(),
  'sbfap-financial-assistance': () => api.fetchKpi2_2_Fa_List(),
  'exam-monthly-performance': () => api.fetchKpi2_3_1_List(),
  'exam-overall-performance': () => api.fetchKpi2_3_2_List(),
  'entry-exit-of-candidates': () => api.fetchEntryExitList(),
  'marine-casualty-previous-current': () => api.fetchKpi2_1_List(),
  'marine-casualty-yearwise': () => api.fetchKpi2_1_List(),
  'marine-casualty-country-wise': () => api.fetchKpi2_1_List(),
  'marine-casualty-vessel-wise': () => api.fetchKpi2_1_List(),
  'flag-state-inspection-mmd-wise': () => api.fetchKpi2_6_1_List(),
  'flag-state-inspection-vessel-wise': () => api.fetchKpi2_6_2_List(),
  'port-state-inspection-mmd-wise': () => api.fetchKpi2_7_1_List(),
  'port-state-inspection-vessel-wise': () => api.fetchKpi2_7_2_List(),
  'vessel-port-survey': () => api.fetchVesselSurveyList(),
  'mti-master': () => api.fetchMtiMasterList(),
  'course-master': () => api.fetchCourseMasterList(),
  'capacity-utilisation': () => api.fetchCourseMasterList(),
  'placement-record': () => api.fetchMtiMasterList(),
};

// Lists with the portal's standard Copy / Excel (.xlsx) / PDF exports; the others keep the
// table's own export until they are moved over
const EXPORTS_BY_SLUG = {
  'exam-monthly-performance': { exportTitle: 'DGS K-2.3.1 Exam Monthly Performance - Data List', exportFileName: 'DGS_K2_3_1_Exam_Monthly_Performance' },
  'exam-overall-performance': { exportTitle: 'DGS K-2.3.2 Exam Overall Performance Statistics - Data List', exportFileName: 'DGS_K2_3_2_Exam_Overall_Performance' },
  'flag-state-inspection-mmd-wise': { exportTitle: 'DGS K-2.6.1 Flag State Inspection - MMD Wise - Data List', exportFileName: 'DGS_K2_6_1_Flag_State_Inspection_MMD_Wise' },
  'flag-state-inspection-vessel-wise': { exportTitle: 'DGS K-2.6.2 Flag State Inspection & GI Performance - Vessel Wise - Data List', exportFileName: 'DGS_K2_6_2_Flag_State_Inspection_Vessel_Wise' },
  'port-state-inspection-mmd-wise': { exportTitle: 'DGS K-2.7.1 Port State Inspection - MMD Wise - Data List', exportFileName: 'DGS_K2_7_1_Port_State_Inspection_MMD_Wise' },
  'port-state-inspection-vessel-wise': { exportTitle: 'DGS K-2.7.2 Port State Inspection & GI Performance - Vessel Wise - Data List', exportFileName: 'DGS_K2_7_2_Port_State_Inspection_Vessel_Wise' },
};

// Lists that need an MMD filter populate the MMD panel from the fetched rows
const MMD_FILTER_SLUGS = new Set([
  'flag-state-inspection-mmd-wise',
  'port-state-inspection-mmd-wise',
]);

// Data List reuses the same merged-layout / sticky-header / scrollable-body
// pattern as Reports, but keeps the existing blue theme instead of the Reports
// brown — so Data List and Reports read as siblings of the module, not clones.
const BLUE = '#0f417a';
const BLUE_HOVER = '#1d5594';

// Column map the table starts with (same keys the table uses: field, else header)
function defaultVisibleCols(columns) {
  return Object.fromEntries((columns || [])
    .map((col) => [col.field || col.headerName, col.hide !== true])
    .filter(([key]) => key));
}

// Data List for a section whose search text, filters and column visibility are kept in the DGS
// store, so they survive switching section or tab. Subscribes to its own slot only.
function StoredDataList({ slug, columns, ...props }) {
  const notify = useNotifier(props.triggerNotification);
  const slot = useDgsStore((state) => state.lists[slug]);
  const setListSearch = useDgsStore((state) => state.setListSearch);
  const setListFilter = useDgsStore((state) => state.setListFilter);
  const resetListFilters = useDgsStore((state) => state.resetListFilters);
  const toggleListFilterPanel = useDgsStore((state) => state.toggleListFilterPanel);
  const setListVisibleCols = useDgsStore((state) => state.setListVisibleCols);
  const defaults = useMemo(() => defaultVisibleCols(columns), [columns]);

  // Filters this list offers (the ones the old portal's list had); none for other sections
  const fields = EXAM_FILTER_FIELDS[slug];
  const { filters, showFilterPanel } = slot;
  const filterRows = useCallback((rows) => filterExamRows(rows, slug, fields, filters), [slug, fields, filters]);
  const handleReset = useCallback(() => {
    resetListFilters(slug);
    notify(COMMON_TOASTS.filtersReset());
  }, [resetListFilters, slug, notify]);

  const filterProps = fields ? {
    filterRows,
    filterToolbar: (
      <ExamFilterButton
        activeCount={countActiveFilters(fields, filters)}
        open={showFilterPanel}
        onToggle={() => toggleListFilterPanel(slug)}
        onReset={handleReset}
      />
    ),
    renderFilterPanel: (allRows) => (showFilterPanel ? (
      <ExamFilterPanel
        fields={fields}
        filters={filters}
        yearOptions={yearOptionsFrom(allRows, slug)}
        mmdOptions={MMD_FILTER_SLUGS.has(slug) ? mmdOptionsFrom(allRows, slug) : []}
        onChange={(field, value) => setListFilter(slug, field, value)}
      />
    ) : null),
  } : {};

  return (
    <GenericReportPage
      {...props}
      columns={columns}
      searchTerm={slot.searchTerm}
      onSearchChange={(value) => setListSearch(slug, value)}
      visibleCols={slot.visibleCols ?? defaults}
      onVisibleColsChange={(updater) => setListVisibleCols(slug, updater, defaults)}
      {...filterProps}
    />
  );
}

export default function DataListIndex({ triggerNotification }) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const { canEdit, canRemove } = useKPIDGSPermissions();
  // Bumped after a successful delete so the active list refetches.
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // K-2.1 Flagging: Edit icon -> input form with year + month
  const editFlagging = useCallback((row) => {
    const qs = new URLSearchParams({
      year: String(row.year ?? ''),
      month: String(row.month ?? ''),
    }).toString();
    navigate(`/kpi/dgs/input-forms/flagging-of-vessels?${qs}`);
  }, [navigate]);


  // Pending delete opens the overlay confirm; its `run` is awaited when the user confirms.
  // Each delete handler below sets this, and the confirm button calls `run()` via the modal.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const askDelete = useCallback((spec) => setPendingDelete(spec), []);
  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
  }, [deleting]);
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await pendingDelete.run();
      notify(DGS_TOASTS.deleted(pendingDelete.section, pendingDelete.label));
      refresh();
      setPendingDelete(null);
    } catch (err) {
      console.error(`Delete ${pendingDelete.section} failed:`, err);
      notify(DGS_TOASTS.deleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, deleting, notify, refresh]);

  const deleteKpi2_6_1 = useCallback((row) => {
    const { mmd_year, mmd_month, mmd_id, mmd_name } = row || {};
    if (mmd_year == null || mmd_month == null || mmd_id == null) {
      notify(DGS_TOASTS.deleteFailed('Missing row identifiers.'));
      return;
    }
    const label = `${mmd_name || 'this MMD'} — ${monthName(mmd_month)} ${mmd_year}`;
    askDelete({
      title: 'Delete Flag State Inspection entry?',
      message: `This will permanently remove the Flag State Inspection entry for ${label}. This action cannot be undone.`,
      section: 'Flag State Inspection - MMD Wise',
      label,
      run: () => api.deleteKpi2_6_1(mmd_year, mmd_month, mmd_id),
    });
  }, [notify, askDelete]);

  const deleteKpi2_6_2 = useCallback((row) => {
    const { year, month } = row || {};
    if (year == null || month == null) {
      notify(DGS_TOASTS.deleteFailed('Missing row identifiers.'));
      return;
    }
    const label = `${monthName(month)} ${year}`;
    askDelete({
      title: 'Delete Flag State Inspection entry?',
      message: `This will remove every ship-type row recorded for ${label} under Flag State Inspection & GI Performance. This action cannot be undone.`,
      section: 'Flag State Inspection - Vessel Wise',
      label,
      run: () => api.deleteKpi2_6_2(year, month),
    });
  }, [notify, askDelete]);

  const deleteKpi2_7_1 = useCallback((row) => {
    const { mmd_year, mmd_month, mmd_id, mmd_name } = row || {};
    if (mmd_year == null || mmd_month == null || mmd_id == null) {
      notify(DGS_TOASTS.deleteFailed('Missing row identifiers.'));
      return;
    }
    const label = `${mmd_name || 'this MMD'} — ${monthName(mmd_month)} ${mmd_year}`;
    askDelete({
      title: 'Delete Port State Inspection entry?',
      message: `This will permanently remove the Port State Inspection entry for ${label}. This action cannot be undone.`,
      section: 'Port State Inspection - MMD Wise',
      label,
      run: () => api.deleteKpi2_7_1(mmd_year, mmd_month, mmd_id),
    });
  }, [notify, askDelete]);

  const deleteKpi2_7_2 = useCallback((row) => {
    const { year, month } = row || {};
    if (year == null || month == null) {
      notify(DGS_TOASTS.deleteFailed('Missing row identifiers.'));
      return;
    }
    const label = `${monthName(month)} ${year}`;
    askDelete({
      title: 'Delete Port State Inspection entry?',
      message: `This will remove every ship-type row recorded for ${label} under Port State Control (PSC) Performance. This action cannot be undone.`,
      section: 'Port State Inspection - Vessel Wise',
      label,
      run: () => api.deleteKpi2_7_2(year, month),
    });
  }, [notify, askDelete]);

  // Sections with their own columns (labels, formatting, Update / Delete actions); others infer columns.
  // Update opens the section's input form with the row's keys as query params.
  // Sections with their own columns (labels, formatting, Update / Delete actions); others infer columns.
  // Update opens the section's input form with the row's keys as query params.
  const columnsBySlug = useMemo(() => {
    const editIn = (slug) => (item) => navigate(`/kpi/dgs/input-forms/${slug}`, { state: { slug, item } });
    const editMmdWiseFor = (slug) => (row) => {
      const qs = new URLSearchParams({
        year: String(row.mmd_year ?? ''),
        month: String(row.mmd_month ?? ''),
        mmdId: String(row.mmd_id ?? ''),
      }).toString();
      navigate(`/kpi/dgs/input-forms/${slug}?${qs}`);
    };
    const editVesselWiseFor = (slug) => (row) => {
      const qs = new URLSearchParams({
        year: String(row.year ?? ''),
        month: String(row.month ?? ''),
      }).toString();
      navigate(`/kpi/dgs/input-forms/${slug}?${qs}`);
    };
    return {
      'exam-monthly-performance': examMonthlyColumns({ canEdit, onEdit: editIn('exam-monthly-performance') }),
      'exam-overall-performance': examOverallColumns({ canEdit, onEdit: editIn('exam-overall-performance') }),
      'flag-state-inspection-mmd-wise': flagStateMmdWiseColumns({
        canEdit, canDelete: canRemove,
        onEdit: editMmdWiseFor('flag-state-inspection-mmd-wise'),
        onDelete: deleteKpi2_6_1,
      }),
      'flag-state-inspection-vessel-wise': flagStateVesselWiseColumns({
        canEdit, canDelete: canRemove,
        onEdit: editVesselWiseFor('flag-state-inspection-vessel-wise'),
        onDelete: deleteKpi2_6_2,
      }),
      'port-state-inspection-mmd-wise': portStateMmdWiseColumns({
        canEdit, canDelete: canRemove,
        onEdit: editMmdWiseFor('port-state-inspection-mmd-wise'),
        onDelete: deleteKpi2_7_1,
      }),
      'port-state-inspection-vessel-wise': portStateVesselWiseColumns({
        canEdit, canDelete: canRemove,
        onEdit: editVesselWiseFor('port-state-inspection-vessel-wise'),
        onDelete: deleteKpi2_7_2,
      }),
    };
  }, [navigate, canEdit, canRemove, deleteKpi2_6_1, deleteKpi2_6_2, deleteKpi2_7_1, deleteKpi2_7_2]);
  return (
    <>
      <ConfirmDeleteModal
        open={!!pendingDelete}
        title={pendingDelete?.title}
        message={pendingDelete?.message}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />
      <IndexCardGrid
      title="Data List"
      subtitle="Pick a section to view its saved entries on the right."
      rows={INPUT_FORM_INDEX}
      routePrefix="/kpi/dgs/data-list"
      accentColor={BLUE}
      mergedLayout
      renderRight={(slug, { flat } = {}) => {
        if (!slug) return null;

        if (slug === 'vessel-port-survey') {
          return (
            <VesselSurveyDataList
              notify={triggerNotification}
              onEdit={(row) => navigate(`/kpi/dgs/input-forms/${slug}?id=${row.id}`)}
              onDelete={(row) => api.deleteVesselSurvey(row.id)}
            />
          );
        }

        const leaf = INPUT_FORM_LEAVES.find((l) => l.slug === slug);
        const fetchFn = LIST_FETCH_BY_SLUG[slug];
        if (!leaf || !fetchFn) {
          return <p className="text-sm text-slate-600">No data list is registered for slug "{slug}".</p>;
        }
        const pageProps = {
          code: leaf.code,
          title: leaf.label,
          fetchFn,
          columns: columnsBySlug[slug] || null,
          triggerNotification,
          showBack: false,
          flat,
          color: BLUE,
          hoverColor: BLUE_HOVER,
          // Last column la Edit icon (K-2.1 only, update permission irundha mattum)
          ...(slug === 'flagging-of-vessels' && canEdit
            ? { showEditAction: true, onEditRow: editFlagging }
            : {}),
          ...EXPORTS_BY_SLUG[slug],
        };
        // Re-key on refreshTick so a successful delete triggers a refetch for the active list.
        const key = `${slug}-${refreshTick}`;
        return DGS_STORED_LIST_SLUGS.includes(slug)
          ? <StoredDataList key={key} slug={slug} {...pageProps} />
          : <GenericReportPage key={key} {...pageProps} />;
      }}
    />
    </>
  );
}
