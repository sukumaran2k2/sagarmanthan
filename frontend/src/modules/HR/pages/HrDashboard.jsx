import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, CheckCircle2, FileClock, Ban, CalendarDays, PieChart, BarChart3 } from 'lucide-react';
import StatCard from '../../../components/StatCard';
import DonutChart from '../components/DonutChart';
import { PostCodeTag } from '../components/HrFormControls';
import { Section, ChartCard, FilterSelect, DashboardTable } from '../components/HrDashboardParts';
import {
  GENDER_COLORS, EX_SERVICE_COLORS, PWBD_COLORS, COMMUNITY_COLORS, EX_SERVICE_TOOLTIP, PWBD_TOOLTIP, exportRows,
} from '../utils/hrDashboardShared';
import {
  getDropDownData,
  fetchOrganisationsByCluster,
  fetchHrDepartments,
  fetchHrDashboardTotals,
  fetchHrDashboardGender,
  fetchHrDashboardExService,
  fetchHrDashboardPwbd,
  fetchHrDashboardCommunity,
  fetchHrDashboardDepartmentWise,
  fetchHrDashboardAbolishing,
  fetchHrDashboardRetiring,
} from '../api';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';
import { COMMON_TOASTS } from '../../../utils/notify';
import {
  dashboardAsOnDate, toDdMmYyyy, readDashboardTotals, genderSlices, exServiceSlices, pwbdSlices,
  communitySlices, optionsFrom, classOptionsFrom, vacancyTotals, departmentOptions,
} from '../utils/hrDashboard';

const shortDate = (v) => (v ? String(v).split('T')[0] : '--');

const EMPTY_DASHBOARD = {
  totals: { sanctioned: 0, filled: 0, live: 0, abolished: 0 },
  charts: { gender: [], exService: [], pwbd: [], community: [] },
  vacancyRows: [],
  abolishing: [],
  retiring: [],
  failed: false,
};

/** Everything the dashboard shows for one category / organisation (0 = all). Never throws. */
async function fetchDashboard(cluster, org, withUpcomingLists) {
  const calls = [
    fetchHrDashboardTotals(cluster, org),
    fetchHrDashboardGender(cluster, org),
    fetchHrDashboardExService(cluster, org),
    fetchHrDashboardPwbd(cluster, org),
    fetchHrDashboardCommunity(cluster, org),
    fetchHrDashboardDepartmentWise(cluster, org),
    ...(withUpcomingLists ? [fetchHrDashboardAbolishing(cluster, org), fetchHrDashboardRetiring(cluster, org)] : []),
  ];
  const results = await Promise.allSettled(calls);
  const data = (i) => (results[i]?.status === 'fulfilled' ? results[i].value?.data : undefined);
  const list = (i) => (Array.isArray(data(i)) ? data(i) : []);
  return {
    totals: readDashboardTotals(data(0)),
    charts: {
      gender: genderSlices(list(1)),
      exService: exServiceSlices(list(2)),
      pwbd: pwbdSlices(list(3)),
      community: communitySlices(list(4)),
    },
    vacancyRows: list(5),
    abolishing: list(6),
    retiring: list(7),
    failed: results.some((r) => r.status === 'rejected'),
  };
}

/** HR landing page: strength, workforce analytics and department-wise vacancies. */
export default function HrDashboard({ notify }) {
  const isOrg = useMemo(() => isOrganisationUser(), []);
  const ownOrgId = useMemo(() => {
    const claims = getSessionClaims() || {};
    return Number(getSessionOrganisationId() || claims.organisationId) || 0;
  }, []);

  const [clusters, setClusters] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [clusterId, setClusterId] = useState('0');
  const [orgId, setOrgId] = useState(isOrg ? String(ownOrgId) : '0');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const { totals, charts, vacancyRows, abolishing, retiring } = dashboard;
  const latestRequest = useRef(0);

  // Table filters
  const [vFilter, setVFilter] = useState({ org: '', cls: '', dept: '' });
  const [abFilter, setAbFilter] = useState({ cls: '', dept: '' });
  const [retFilter, setRetFilter] = useState({ cls: '', dept: '' });

  const asOnDate = useMemo(() => toDdMmYyyy(dashboardAsOnDate(clusterId)), [clusterId]);

  // Only the latest request is shown (the user may switch organisation before a load finishes)
  const load = useCallback((cluster, org) => {
    const requestId = ++latestRequest.current;
    return fetchDashboard(cluster, org, isOrg).then((next) => {
      if (requestId !== latestRequest.current) return;
      setDashboard(next);
      setLoading(false);
      if (next.failed) notify?.(COMMON_TOASTS.loadFailed('Some dashboard sections'));
    });
  }, [isOrg, notify]);

  // Department filters: the HR department master for the organisation (0 = all), as on the legacy dashboard
  const [departments, setDepartments] = useState([]);
  const loadDepartments = useCallback((org) => {
    fetchHrDepartments(Number(org) || 0)
      .then((res) => setDepartments(departmentOptions(res.data)))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    loadDepartments(isOrg ? ownOrgId : 0);
    if (!isOrg) {
      getDropDownData('mmt_hr_cluster')
        .then((res) => setClusters((res.data || []).filter((c) => Number(c.hr_cluster_id) !== 3)))
        .catch(() => setClusters([]));
      fetchOrganisationsByCluster(0).then((res) => setOrgs(res.data || [])).catch(() => setOrgs([]));
    }
    load(0, isOrg ? ownOrgId : 0);
  }, [isOrg, ownOrgId, load, loadDepartments]);

  const resetFilters = () => {
    setVFilter({ org: '', cls: '', dept: '' });
    setAbFilter({ cls: '', dept: '' });
    setRetFilter({ cls: '', dept: '' });
  };

  const onClusterChange = (value) => {
    setClusterId(value);
    setOrgId('0');
    resetFilters();
    fetchOrganisationsByCluster(value).then((res) => setOrgs(res.data || [])).catch(() => setOrgs([]));
    loadDepartments(0);
    setLoading(true);
    load(value, 0);
  };

  const onOrgChange = (value) => {
    setOrgId(value);
    resetFilters();
    loadDepartments(value);
    setLoading(true);
    load(clusterId, value);
  };

  // Tables
  const filteredVacancy = useMemo(() => vacancyRows.filter((r) =>
    (!vFilter.org || String(r.organisation_id) === vFilter.org) &&
    (!vFilter.cls || r.class === vFilter.cls) &&
    (!vFilter.dept || String(r.department_id).trim() === vFilter.dept)
  ), [vacancyRows, vFilter]);
  const vTotals = useMemo(() => vacancyTotals(filteredVacancy), [filteredVacancy]);

  const filteredAbolishing = useMemo(() => abolishing.filter((r) =>
    (!abFilter.cls || r.class === abFilter.cls) && (!abFilter.dept || String(r.department_id).trim() === abFilter.dept)
  ), [abolishing, abFilter]);
  const filteredRetiring = useMemo(() => retiring.filter((r) =>
    (!retFilter.cls || r.class === retFilter.cls) && (!retFilter.dept || String(r.emp_department_id).trim() === retFilter.dept)
  ), [retiring, retFilter]);

  const showOrgColumn = !isOrg && Number(orgId) === 0;
  const vacancyColumns = [
    ...(showOrgColumn ? [{ label: 'Organisation', value: (r) => r.organisation_name || '' }] : []),
    { label: 'Department', value: (r) => r.departmentname || '' },
    { label: 'Class', value: (r) => r.class || '', width: '5rem' },
    { label: 'Sanctioned', value: (r) => Number(r.total_sanctioned_strength) || 0, num: true, width: '7rem' },
    { label: 'Actual', value: (r) => Number(r.filled_post) || 0, num: true, width: '6rem' },
    { label: 'Live Vacancy', value: (r) => Number(r.totalLivePost) || 0, num: true, width: '7rem' },
    { label: 'Abolished Vacancy', value: (r) => Number(r.totalAbolishedPost) || 0, num: true, width: '7.5rem' },
    { label: 'Total Vacancy', value: (r) => (Number(r.totalLivePost) || 0) + (Number(r.totalAbolishedPost) || 0), num: true, width: '7rem' },
  ];
  const abolishingColumns = [
    { label: 'Post Name', value: (r) => r.post_name || '--' },
    { label: 'Post Code', value: (r) => r.post_code || '--', render: (r) => <PostCodeTag>{r.post_code}</PostCodeTag>, width: '9.5rem' },
    { label: 'Date of Arise in Vacancy', value: (r) => shortDate(r.date_of_arise_in_vacancy), width: '8.5rem' },
    { label: 'Post Abolition Date', value: (r) => shortDate(r.abolish_date), width: '8.5rem' },
  ];
  const retiringColumns = [
    { label: 'Post Name', value: (r) => r.emp_post_name || '--' },
    { label: 'Employee Name', value: (r) => r.emp_name || '--' },
    { label: 'Reference ID / Personnel No.', value: (r) => r.emp_reference_id || '--', width: '9rem' },
    { label: 'Date of Retirement', value: (r) => shortDate(r.emp_dor), width: '8.5rem' },
  ];

  const stats = [
    { title: 'Sanctioned Strength', value: totals.sanctioned, icon: Users, color: 'blue' },
    { title: 'Total Filled Posts', value: totals.filled, icon: CheckCircle2, color: 'emerald' },
    { title: 'Live Vacant Posts', value: totals.live, icon: FileClock, color: 'amber' },
    { title: 'Abolished Vacant Posts', value: totals.abolished, icon: Ban, color: 'rose' },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Header: as-on date and, for ministry users, category / organisation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 font-display">HR Dashboard</h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[11px] font-bold text-[#0f417a] dark:text-blue-300">
            <CalendarDays className="h-3.5 w-3.5" /> As on {asOnDate}
          </span>
        </div>
        {!isOrg && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Organisation category"
              value={clusterId}
              onChange={(e) => onClusterChange(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="0">All organisation categories</option>
              {clusters.map((c) => <option key={c.hr_cluster_id} value={c.hr_cluster_id}>{c.hr_cluster_name}</option>)}
            </select>
            <select
              aria-label="Organisation"
              value={orgId}
              onChange={(e) => onOrgChange(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-xs"
            >
              <option value="0">All organisations</option>
              {orgs.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {stats.map((s) => <StatCard key={s.title} title={s.title} value={s.value.toLocaleString('en-IN')} icon={s.icon} color={s.color} />)}
      </div>

      {isOrg && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <DashboardTable
            title="Upcoming Post Abolitions"
            subtitle="Vacant posts reaching 5 years within a month"
            rows={filteredAbolishing}
            columns={abolishingColumns}
            filters={<TableFilters filter={abFilter} setFilter={setAbFilter} rows={abolishing} departments={departments} />}
            onExport={() => exportRows(filteredAbolishing, abolishingColumns, 'Upcoming Post Abolitions', notify)}
          />
          <DashboardTable
            title="Upcoming Retirements"
            subtitle="Employees retiring within six months"
            rows={filteredRetiring}
            columns={retiringColumns}
            filters={<TableFilters filter={retFilter} setFilter={setRetFilter} rows={retiring} departments={departments} />}
            onExport={() => exportRows(filteredRetiring, retiringColumns, 'Upcoming Retirements', notify)}
          />
        </div>
      )}

      <Section title="Employee Analytics" icon={PieChart}>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          <ChartCard title="Gender" asOn={asOnDate}>
            <DonutChart data={charts.gender} colors={GENDER_COLORS} fileName="hr_gender_analytics" />
          </ChartCard>
          <ChartCard title="Ex-Service Employees" asOn={asOnDate}>
            <DonutChart data={charts.exService} colors={EX_SERVICE_COLORS} tooltipText={EX_SERVICE_TOOLTIP} fileName="hr_ex_service_employees" />
          </ChartCard>
          <ChartCard title="Employee Disability (PwBD)" asOn={asOnDate}>
            <DonutChart data={charts.pwbd} colors={PWBD_COLORS} tooltipText={PWBD_TOOLTIP} fileName="hr_employee_disability" />
          </ChartCard>
          <ChartCard title="Community" asOn={asOnDate}>
            <DonutChart data={charts.community} colors={COMMUNITY_COLORS} fileName="hr_community_analytics" />
          </ChartCard>
        </div>
      </Section>

      <DashboardTable
        title="Vacancy Analytics"
        subtitle="Department-wise sanctioned, actual and vacant posts"
        icon={BarChart3}
        rows={filteredVacancy}
        columns={vacancyColumns}
        totals={vacancyColumns.map((c) => {
          if (c.label === 'Sanctioned') return vTotals.sanctioned;
          if (c.label === 'Actual') return vTotals.actual;
          if (c.label === 'Live Vacancy') return vTotals.live;
          if (c.label === 'Abolished Vacancy') return vTotals.abolished;
          if (c.label === 'Total Vacancy') return vTotals.live + vTotals.abolished;
          return null;
        })}
        maxHeight="28rem"
        filters={(
          <>
            {showOrgColumn && (
              <FilterSelect label="Organisation" value={vFilter.org} onChange={(org) => setVFilter((f) => ({ ...f, org }))}
                options={optionsFrom(vacancyRows, 'organisation_id', 'organisation_name')} />
            )}
            <FilterSelect label="Class" value={vFilter.cls} onChange={(cls) => setVFilter((f) => ({ ...f, cls }))}
              options={classOptionsFrom(vacancyRows).map((c) => ({ value: c, label: c }))} />
            <FilterSelect label="Department" value={vFilter.dept} onChange={(dept) => setVFilter((f) => ({ ...f, dept }))}
              options={departments} />
          </>
        )}
        onExport={() => exportRows(filteredVacancy, vacancyColumns, 'Department wise post status', notify)}
      />
    </div>
  );
}

function TableFilters({ filter, setFilter, rows, departments }) {
  return (
    <>
      <FilterSelect label="Class" value={filter.cls} onChange={(cls) => setFilter((f) => ({ ...f, cls }))}
        options={classOptionsFrom(rows).map((c) => ({ value: c, label: c }))} />
      <FilterSelect label="Department" value={filter.dept} onChange={(dept) => setFilter((f) => ({ ...f, dept }))}
        options={departments} />
    </>
  );
}

