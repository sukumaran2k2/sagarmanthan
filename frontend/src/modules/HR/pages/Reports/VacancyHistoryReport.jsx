import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, CheckCircle2, FileText, Ban, Sigma } from 'lucide-react';
import { fetchDepartmentWisePostStatus } from '../../api';
import { useHRPermissions } from '../../hooks/useHRPermissions';
import ReportLayout, { FilterSelect } from './components/ReportLayout';
import { REPORT_THEME as T } from './theme';
import { asList } from './reportUtils';
import { CLASS_OPTIONS } from '../../constants';
import { COMMON_TOASTS } from '../../../../utils/notify';

const MAJOR_PORTS_CLUSTER = 1;

const num = (v) => Number(v) || 0;

const COUNT_FIELDS = ['total_sanctioned_strength', 'filled_post', 'totalLivePost', 'totalAbolishedPost', 'totalVacant'];

const sumCounts = (rows) =>
  Object.fromEntries(COUNT_FIELDS.map((f) => [f, rows.reduce((acc, r) => acc + num(r[f]), 0)]));

// One dropdown option per distinct id found in the rows, sorted by name.
const uniqueOptions = (rows, idField, labelField) => {
  const byId = new Map(
    rows.filter((r) => r[idField] != null && r[labelField]).map((r) => [String(r[idField]), String(r[labelField])])
  );
  return Array.from(byId, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
};

function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border bg-white px-5 py-4 shadow-sm dark:bg-slate-900 dark:border-slate-700" style={{ borderColor: T.line, borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.1em]" style={{ color: accent }}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1.5 text-3xl font-black tabular-nums" style={{ color: T.brand }}>{value ?? '—'}</p>
    </div>
  );
}

const COLUMNS_BASE = [
  { headerName: 'Department', field: 'department_name', minWidth: 220, align: 'left' },
  { headerName: 'Class', field: 'class', minWidth: 90 },
  { headerName: 'Sanctioned', field: 'total_sanctioned_strength' },
  { headerName: 'Actual', field: 'filled_post' },
  {
    headerName: 'Vacancy',
    children: [
      { headerName: 'Live', field: 'totalLivePost' },
      { headerName: 'Abolished', field: 'totalAbolishedPost' },
      { headerName: 'Total', field: 'totalVacant' },
    ],
  },
];

// Report H-2.0.1, ported from pages/HR/hrVacancyHistory.html: current post totals for the Major
export default function VacancyHistoryReport({ report, onBack, notify }) {
  const { orgId: sessionOrgId, isMinistryView } = useHRPermissions();
  // Ministry users see every Major Port (organisation 0); organisation users their own.
  const scopeOrgId = isMinistryView ? 0 : sessionOrgId;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const load = useCallback(async () => {
    if (scopeOrgId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDepartmentWisePostStatus(MAJOR_PORTS_CLUSTER, scopeOrgId);
      setRows(
        asList(res).map((r) => ({
          ...r,
          // Posts whose post master has no class are logged without one.
          class: r.class ?? '-',
          totalVacant: num(r.totalLivePost) + num(r.totalAbolishedPost),
        }))
      );
    } catch {
      setRows([]);
      notifyRef.current?.(COMMON_TOASTS.loadFailed('The vacancy history'));
    } finally {
      setLoading(false);
    }
  }, [scopeOrgId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const organisationOptions = useMemo(() => uniqueOptions(rows, 'organisation_id', 'organisation_name'), [rows]);

  const departmentOptions = useMemo(
    () =>
      uniqueOptions(
        rows.filter((r) => !orgFilter || String(r.organisation_id) === orgFilter),
        'department_id',
        'department_name'
      ),
    [rows, orgFilter]
  );

  const changeOrganisation = (value) => {
    setOrgFilter(value);
    setDeptFilter('');
  };

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!orgFilter || String(r.organisation_id) === orgFilter) &&
          (!classFilter || String(r.class ?? '').trim() === classFilter) &&
          (!deptFilter || String(r.department_id) === deptFilter)
      ),
    [rows, orgFilter, classFilter, deptFilter]
  );

  const kpis = useMemo(() => sumCounts(filteredRows), [filteredRows]);

  const getTotals = useCallback(
    (shown) => {
      if (!shown.length) return null;
      return { [isMinistryView ? 'organisation_name' : 'department_name']: 'Total', ...sumCounts(shown) };
    },
    [isMinistryView]
  );

  const columns = useMemo(() => {
    const serial = { headerName: 'S.No', minWidth: 56, value: (_row, i) => i + 1 };
    const org = isMinistryView
      ? [{ headerName: 'Organisation', field: 'organisation_name', minWidth: 220, align: 'left', emphasis: true }]
      : [];
    return [serial, ...org, ...COLUMNS_BASE];
  }, [isMinistryView]);

  const resetFilters = () => {
    setOrgFilter('');
    setClassFilter('');
    setDeptFilter('');
  };

  const filters = (
    <>
      {isMinistryView && (
        <FilterSelect
          label="Organisation"
          value={orgFilter}
          onChange={changeOrganisation}
          options={organisationOptions}
        />
      )}
      <FilterSelect
        label="Class"
        value={classFilter}
        onChange={setClassFilter}
        options={CLASS_OPTIONS.map((c) => ({ value: c, label: c }))}
      />
      <FilterSelect
        label="Department"
        value={deptFilter}
        onChange={setDeptFilter}
        options={departmentOptions}
      />
    </>
  );

  const summary = (
    // Same order as the table: Sanctioned, Actual, then Vacancy (Live, Abolished, Total).
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Sanctioned Strength" value={loading ? null : kpis.total_sanctioned_strength} icon={Users} accent="#b7791f" />
      <KpiCard label="Actual Strength" value={loading ? null : kpis.filled_post} icon={CheckCircle2} accent="#2f855a" />
      <KpiCard label="Live Vacancy" value={loading ? null : kpis.totalLivePost} icon={FileText} accent={T.brand} />
      <KpiCard label="Abolished Vacancy" value={loading ? null : kpis.totalAbolishedPost} icon={Ban} accent="#c53030" />
      <KpiCard label="Total Vacancy" value={loading ? null : kpis.totalVacant} icon={Sigma} accent="#6b46c1" />
    </div>
  );

  return (
    <ReportLayout
      report={report}
      meta={<>Major Ports • Period — <strong style={{ color: T.brand }}>Current position</strong></>}
      rows={filteredRows}
      columns={columns}
      getTotals={getTotals}
      loading={loading}
      onRefresh={load}
      filters={filters}
      onBack={onBack}
      filtersActive={Boolean(orgFilter || classFilter || deptFilter)}
      onResetFilters={resetFilters}
      summary={summary}
      notify={notify}
      emptyMessage={scopeOrgId == null ? 'Your organisation could not be read from the session. Please sign in again.' : '-- No data available --'}
    />
  );
}