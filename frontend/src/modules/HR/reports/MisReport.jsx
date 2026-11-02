import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchHrGenderWiseReport,
  fetchHrStaffingOverviewReport,
  fetchTotalManpowerClassWiseReport,
  fetchTotalManpowerSanctionActual,
} from '../api';
import { useHRPermissions } from '../hooks/useHRPermissions';
import ReportLayout, { FilterSelect, ToggleField } from './ReportLayout';
import { portCategoryLabel } from './reportCatalog';
import {
  CLASS_FILTER_OPTIONS,
  columnsForOrg,
  dropEmptyRows,
  dropMetaColumns,
  leafColumns,
  normaliseOrgName,
  orgNamesIn,
  sortColumns,
  totalRow,
  trimLabels,
  zeroToBlank,
} from './reportUtils';
import { COMMON_TOASTS } from '../../../utils/notify';

const GENDER_CLASS_SERIAL = { 'CLASS 1': 1, 'CLASS 2': 2, 'CLASS 3': 3, 'CLASS 4': 4 };

// How each MIS report is fetched and shaped (ported from pages/HR/hr*MisReport.html).
//   orgFilter 'rows'   - one row per organisation; the filter keeps that row.
//   orgFilter 'group'  - one column group per organisation; the filter keeps that group.
//   orgFilter 'column' - one column per organisation; the filter keeps that column.
const MIS = {
  // H-2.1.x  Manpower Overview
  staffingOverview: {
    fetch: (r) => fetchHrStaffingOverviewReport(r.orgCategory),
    labelKey: 'Organisation',
    orgFilter: 'rows',
    totals: true,
  },
  // H-2.2.x  Total Manpower Sanction and actual (Department / Class filters)
  sanctionActual: {
    // Department is filtered on the page by name, not sent as an id: with clusters the rows are
    // department clusters and the backend ignores the id, and the id list would only cover the
    // signed-in organisation's departments.
    fetch: (r, f) => fetchTotalManpowerSanctionActual(0, f.classId || 0, r.orgCategory, f.deptCategory),
    labelKey: 'Department',
    orgFilter: 'group',
    sortColumns: true,
    filters: { department: true, class: true },
    totals: true,
  },
  // H-2.3.x  Gender Wise Manpower (the backend already includes the Total rows)
  genderWise: {
    fetch: (r) => fetchHrGenderWiseReport(r.orgCategory),
    labelKey: 'CLASS',
    orgFilter: 'column',
    keep: ['CLASS', 'GENDER'],
    sortColumns: true,
    serial: (row) => GENDER_CLASS_SERIAL[row?.CLASS] ?? '',
    totals: false,
  },
  // H-2.4.x  Actual Manpower Regular - Class Wise
  classWise: {
    fetch: (r, f) => fetchTotalManpowerClassWiseReport(r.orgCategory, f.deptCategory),
    labelKey: 'Department',
    orgFilter: 'group',
    totals: true,
  },
};

export default function MisReport({ report, categoryFilter, onBack, notify }) {
  const config = MIS[report.mis];
  const { isMinistryView, orgName: sessionOrgName } = useHRPermissions();

  const [data, setData] = useState({ columnDefs: [], rowData: [] });
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');

  // null = the default: every organisation for ministry users, their own for organisation users.
  const [orgChoice, setOrgChoice] = useState(null);
  const [department, setDepartment] = useState('');
  const [classId, setClassId] = useState('');
  const [withCluster, setWithCluster] = useState(true);
  const deptCategory = report.clusterToggle && withCluster ? 1 : 0;

  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setEmptyMessage('');
    try {
      const res = await config.fetch(report, { classId, deptCategory });
      if (signal?.aborted) return;
      setData({
        columnDefs: Array.isArray(res.data?.columnDefs) ? res.data.columnDefs : [],
        rowData: Array.isArray(res.data?.rowData) ? res.data.rowData : [],
      });
    } catch (err) {
      if (signal?.aborted) return;
      setData({ columnDefs: [], rowData: [] });
      if (err?.response?.status === 404) {
        setEmptyMessage('Data not found.');
      } else {
        setEmptyMessage('Could not load the report.');
        notifyRef.current?.(COMMON_TOASTS.loadFailed('The report'));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [config, report, classId, deptCategory]);

  // Deferred a tick so the load's setState does not run synchronously in the effect;
  // a stale response (filters changed meanwhile) is ignored.
  useEffect(() => {
    const controller = { aborted: false };
    const timer = setTimeout(() => load(controller), 0);
    return () => {
      clearTimeout(timer);
      controller.aborted = true;
    };
  }, [load]);

  const base = useMemo(() => {
    let cols = dropMetaColumns(data.columnDefs);
    if (config.sortColumns) cols = sortColumns(cols, config.keep || [config.labelKey]);
    return { cols, rows: trimLabels(zeroToBlank(data.rowData), config.labelKey) };
  }, [data, config]);

  // Organisation and department choices come from the report itself, so they always match it.
  const orgOptions = useMemo(
    () => orgNamesIn(base.cols, base.rows, { mode: config.orgFilter, labelKey: config.labelKey, keep: config.keep || [] }),
    [base, config]
  );
  const departmentOptions = useMemo(
    () => (config.filters?.department ? [...new Set(base.rows.map((r) => r[config.labelKey]).filter(Boolean))] : []),
    [base, config]
  );

  const defaultOrg = useMemo(() => {
    if (isMinistryView) return '';
    return orgOptions.find((o) => normaliseOrgName(o) === normaliseOrgName(sessionOrgName)) || '';
  }, [isMinistryView, orgOptions, sessionOrgName]);
  const orgName = orgChoice ?? defaultOrg;

  const { rows, columns } = useMemo(() => {
    let cols = base.cols;
    let rowList = base.rows;

    if (department) rowList = rowList.filter((r) => r[config.labelKey] === department);

    if (orgName) {
      if (config.orgFilter === 'rows') {
        rowList = rowList.filter((r) => normaliseOrgName(r[config.labelKey]) === normaliseOrgName(orgName));
      } else {
        cols = columnsForOrg(cols, orgName, { mode: config.orgFilter, keep: [config.labelKey, ...(config.keep || [])] });
        if (config.orgFilter === 'group') {
          const fields = leafColumns(cols).map((c) => c.field).filter((f) => f && f !== config.labelKey);
          rowList = dropEmptyRows(rowList, fields);
        }
      }
    }

    const serial = {
      headerName: 'S.No',
      minWidth: 56,
      value: (row, i) => (config.serial ? config.serial(row) : i + 1),
    };
    const labelCol = (c) => (c.field === config.labelKey ? { ...c, minWidth: 220, align: 'left', emphasis: true } : c);

    return { rows: rowList, columns: [serial, ...cols.map(labelCol)] };
  }, [base, config, orgName, department]);

  const getTotals = useCallback(
    (shown) => (config.totals ? totalRow(shown, { labelKey: config.labelKey }) : null),
    [config]
  );

  // Cluster rows and department rows carry different names, so a chosen department is cleared.
  const changeCluster = (next) => {
    setWithCluster(next);
    setDepartment('');
  };

  const resetFilters = () => {
    setOrgChoice(null);
    setDepartment('');
    setClassId('');
    setWithCluster(true);
  };

  const filtersActive =
    orgName !== defaultOrg || Boolean(department || classId) || Boolean(report.clusterToggle && !withCluster);
  const clusterLabel = withCluster ? 'With Cluster' : 'Without Cluster';

  const filters = (
    <>
      {categoryFilter}
      <FilterSelect
        label="Organisation"
        value={orgName}
        onChange={setOrgChoice}
        options={orgOptions.map((o) => ({ value: o, label: o }))}
      />
      {report.clusterToggle && (
        <ToggleField
          label="Department Cluster"
          checked={withCluster}
          onChange={changeCluster}
          onLabel="With Cluster"
          offLabel="Without Cluster"
        />
      )}
      {config.filters?.department && (
        <FilterSelect
          label={report.clusterToggle && withCluster ? 'Department Cluster' : 'Department'}
          value={department}
          onChange={setDepartment}
          options={departmentOptions.map((d) => ({ value: d, label: d }))}
        />
      )}
      {config.filters?.class && (
        <FilterSelect label="Class" value={classId} onChange={setClassId} options={CLASS_FILTER_OPTIONS} />
      )}
    </>
  );

  return (
    <ReportLayout
      report={report}
      meta={report.clusterToggle ? `${portCategoryLabel(report)} • ${clusterLabel}` : portCategoryLabel(report)}
      onBack={onBack}
      filtersActive={filtersActive}
      rows={rows}
      columns={columns}
      getTotals={getTotals}
      loading={loading}
      onRefresh={() => load()}
      filters={filters}
      onResetFilters={resetFilters}
      notify={notify}
      emptyMessage={emptyMessage || 'No data available'}
    />
  );
}
