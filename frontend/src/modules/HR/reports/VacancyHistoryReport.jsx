import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, CheckCircle2, FileText, Ban } from 'lucide-react';
import {
  fetchDepartmentWisePostStatus,
  fetchDepartmentWisePostStatusFiltered,
  fetchHrDashboardContent,
  fetchHrDashboardContentFiltered,
  fetchHrDepartments,
  fetchOrganisationsByCluster,
  fetchVacancyLogYearsAndMonths,
} from '../api';
import { useHRPermissions } from '../hooks/useHRPermissions';
import ReportLayout, { FilterSelect } from './ReportLayout';
import { REPORT_THEME as T } from './theme';
import { asList, yearMonthOptions } from './reportUtils';
import { CLASS_OPTIONS } from '../utils/hrAdministration';

const MAJOR_PORTS_CLUSTER = 1;

const num = (v) => Number(v) || 0;

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

// Report H-2.0.1, ported from pages/HR/hrVacancyHistory.html: post totals for the Major Ports,
// optionally as recorded in a given month's vacancy log, plus a department-wise breakdown.
export default function VacancyHistoryReport({ report, onBack, notify }) {
  const { orgId: sessionOrgId, isMinistryView } = useHRPermissions();
  // Ministry users see every Major Port (organisation 0); organisation users their own.
  const scopeOrgId = isMinistryView ? 0 : sessionOrgId;

  const [kpis, setKpis] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState({ years: [], months: [] });
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [organisations, setOrganisations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  useEffect(() => {
    if (scopeOrgId == null) return undefined;
    let alive = true;
    fetchVacancyLogYearsAndMonths(scopeOrgId)
      .then((res) => { if (alive) setPeriods(yearMonthOptions(asList(res))); })
      .catch(() => {});
    fetchHrDepartments(scopeOrgId)
      .then((res) => { if (alive) setDepartments(asList(res)); })
      .catch(() => {});
    if (isMinistryView) {
      fetchOrganisationsByCluster(MAJOR_PORTS_CLUSTER)
        .then((res) => { if (alive) setOrganisations(asList(res)); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [scopeOrgId, isMinistryView]);

  // The month view applies only once both a year and a month are chosen.
  const hasPeriod = Boolean(year && month);

  const load = useCallback(async () => {
    if (scopeOrgId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [kpiRes, tableRes] = await Promise.allSettled([
      hasPeriod
        ? fetchHrDashboardContentFiltered(MAJOR_PORTS_CLUSTER, scopeOrgId, year, month)
        : fetchHrDashboardContent(MAJOR_PORTS_CLUSTER, scopeOrgId),
      hasPeriod
        ? fetchDepartmentWisePostStatusFiltered(MAJOR_PORTS_CLUSTER, scopeOrgId, year, month)
        : fetchDepartmentWisePostStatus(MAJOR_PORTS_CLUSTER, scopeOrgId),
    ]);
    if (kpiRes.status === 'fulfilled') {
      const d = kpiRes.value.data || {};
      setKpis({
        sanctioned: d.totalSanctionedAndFilledPost?.total_sanctioned_strength,
        filled: d.totalSanctionedAndFilledPost?.filled_post,
        live: d.totalLiveVacantPost?.totalLivePost,
        abolished: d.totalAbolishedVacantPost?.totalAbolishedPost,
      });
    } else {
      setKpis(null);
    }
    if (tableRes.status === 'fulfilled') {
      setRows(asList(tableRes.value).map((r) => ({ ...r, totalVacant: num(r.totalLivePost) + num(r.totalAbolishedPost) })));
    } else {
      setRows([]);
      notifyRef.current?.('Could not load the vacancy history.', 'error');
    }
    setLoading(false);
  }, [scopeOrgId, hasPeriod, year, month]);

  // Deferred a tick so the load's setState does not run synchronously in the effect.
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

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

  const getTotals = useCallback(
    (shown) => {
      if (!shown.length) return null;
      const sum = (f) => shown.reduce((acc, r) => acc + num(r[f]), 0);
      return {
        [isMinistryView ? 'organisation_name' : 'department_name']: 'Total',
        total_sanctioned_strength: sum('total_sanctioned_strength'),
        filled_post: sum('filled_post'),
        totalLivePost: sum('totalLivePost'),
        totalAbolishedPost: sum('totalAbolishedPost'),
        totalVacant: sum('totalVacant'),
      };
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
    setYear('');
    setMonth('');
    setOrgFilter('');
    setClassFilter('');
    setDeptFilter('');
  };

  const filters = (
    <>
      <FilterSelect label="Year" value={year} onChange={setYear} options={periods.years} placeholder="--Year--" />
      <FilterSelect label="Month" value={month} onChange={setMonth} options={periods.months} placeholder="--Month--" />
      {isMinistryView && (
        <FilterSelect
          label="Organisation"
          value={orgFilter}
          onChange={setOrgFilter}
          options={organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name }))}
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
        options={departments.map((d) => ({ value: String(d.department_id), label: d.department_name }))}
      />
    </>
  );

  const periodLabel = hasPeriod ? `${periods.months.find((m) => m.value === month)?.label} ${year}` : 'Current position';

  const summary = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Sanctioned Strength" value={kpis?.sanctioned} icon={Users} accent="#b7791f" />
      <KpiCard label="Total Filled Posts" value={kpis?.filled} icon={CheckCircle2} accent="#2f855a" />
      <KpiCard label="Live Vacant Posts" value={kpis?.live} icon={FileText} accent={T.brand} />
      <KpiCard label="Abolished Vacant Posts" value={kpis?.abolished} icon={Ban} accent="#c53030" />
    </div>
  );

  return (
    <ReportLayout
      report={report}
      meta={<>Major Ports • Period — <strong style={{ color: T.brand }}>{periodLabel}</strong></>}
      rows={filteredRows}
      columns={columns}
      getTotals={getTotals}
      loading={loading}
      onRefresh={load}
      filters={filters}
      onBack={onBack}
      filtersActive={Boolean(year || month || orgFilter || classFilter || deptFilter)}
      note="Choose both a year and a month to see the position recorded in that month's vacancy log."
      onResetFilters={resetFilters}
      summary={summary}
      notify={notify}
      emptyMessage={scopeOrgId == null ? 'Your organisation could not be read from the session. Please sign in again.' : '-- No data available --'}
    />
  );
}
