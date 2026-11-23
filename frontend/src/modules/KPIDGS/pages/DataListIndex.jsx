import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import IndexCardGrid from '../components/IndexCardGrid';
import INPUT_FORM_INDEX, { INPUT_FORM_LEAVES } from '../data/inputFormIndex';
import GenericReportPage from '../components/GenericReportPage';
import VesselSurveyDataList from '../components/VesselSurveyDataList';
import * as api from '../api';
import { useKPIDGSPermissions } from '../hooks/useKPIDGSPermissions';
import { examMonthlyColumns, examOverallColumns } from '../components/examPerformanceColumns';
import { useDgsStore, DGS_STORED_LIST_SLUGS } from '../store/useDgsStore';
import { ExamFilterButton, ExamFilterPanel } from '../components/ExamListFilters';
import {
  EXAM_FILTER_FIELDS, countActiveFilters, filterExamRows, yearOptionsFrom,
} from '../data/examListFilters';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

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
  'flag-state-inspection': () => api.fetchKpi2_6_1_List(),
  'port-state-control': () => api.fetchKpi2_7_1_List(),
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
};

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
  const filterRows = useCallback((rows) => filterExamRows(rows, fields, filters), [fields, filters]);
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
        yearOptions={yearOptionsFrom(allRows)}
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
  const { canEdit } = useKPIDGSPermissions();

  // Sections with their own columns (labels, formatting, Edit action); others infer columns.
  // Edit opens the section's input form with the row in route state.
  const columnsBySlug = useMemo(() => {
    const editIn = (slug) => (item) => navigate(`/kpi/dgs/input-forms/${slug}`, { state: { slug, item } });
    return {
      'exam-monthly-performance': examMonthlyColumns({ canEdit, onEdit: editIn('exam-monthly-performance') }),
      'exam-overall-performance': examOverallColumns({ canEdit, onEdit: editIn('exam-overall-performance') }),
    };
  }, [navigate, canEdit]);

  return (
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
          ...EXPORTS_BY_SLUG[slug],
        };
        return DGS_STORED_LIST_SLUGS.includes(slug)
          ? <StoredDataList key={slug} slug={slug} {...pageProps} />
          : <GenericReportPage key={slug} {...pageProps} />;
      }}
    />
  );
}