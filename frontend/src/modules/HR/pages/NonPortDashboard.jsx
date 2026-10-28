import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, FileClock, Ban, CalendarDays, PieChart, Upload, Info } from 'lucide-react';
import StatCard from '../../../components/StatCard';
import DonutChart from '../components/DonutChart';
import { Section, ChartCard, FilterSelect, DashboardTable } from '../components/HrDashboardParts';
import { Button } from '../components/HrFormControls';
import {
  fetchNonPortTotals,
  fetchNonPortGender,
  fetchNonPortExService,
  fetchNonPortPwbd,
  fetchNonPortCommunity,
  fetchNonPortAbolishing,
  fetchNonPortRetiring,
  fetchNonPortLastUpload,
} from '../api';
import { getSessionOrganisationId } from '../../../utils/authSession';
import { COMMON_TOASTS } from '../../../utils/notify';
import { genderSlices, optionsFrom, classOptionsFrom } from '../utils/hrDashboard';
import {
  GENDER_COLORS, EX_SERVICE_COLORS, PWBD_COLORS, COMMUNITY_COLORS, EX_SERVICE_TOOLTIP, PWBD_TOOLTIP, exportRows,
} from '../utils/hrDashboardShared';
import {
  nonPortDataMonth, nonPortTotals, nonPortExServiceSlices, nonPortPwbdSlices, nonPortCommunitySlices,
} from '../utils/nonPortDashboard';

const EMPTY = {
  totals: { sanctioned: 0, filled: 0, live: 0, abolished: 0 },
  charts: { gender: [], exService: [], pwbd: [], community: [] },
  abolishing: [],
  retiring: [],
  lastUpload: null,
  failed: false,
};

/** Everything the non-port dashboard shows for one organisation. Never throws. */
async function fetchNonPortDashboard(orgId) {
  const results = await Promise.allSettled([
    fetchNonPortTotals(0, orgId),
    fetchNonPortGender(0, orgId),
    fetchNonPortExService(0, orgId),
    fetchNonPortPwbd(0, orgId),
    fetchNonPortCommunity(0, orgId),
    fetchNonPortAbolishing(0, orgId),
    fetchNonPortRetiring(0, orgId),
    fetchNonPortLastUpload(orgId),
  ]);
  const data = (i) => (results[i]?.status === 'fulfilled' ? results[i].value?.data : undefined);
  const list = (i) => (Array.isArray(data(i)) ? data(i) : []);
  return {
    totals: nonPortTotals(data(0)),
    charts: {
      gender: genderSlices(list(1)),
      exService: nonPortExServiceSlices(list(2)),
      pwbd: nonPortPwbdSlices(list(3)),
      community: nonPortCommunitySlices(list(4)),
    },
    abolishing: list(5),
    retiring: list(6),
    lastUpload: data(7)?.lastUploadDate || null,
    failed: results.some((r) => r.status === 'rejected'),
  };
}

// The stored calendar date of an ISO value, as dd-mm-yyyy (see formatUploadDate in the upload form)
const ddmmyyyy = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '--';
};

const byFilter = (filter) => (r) => (!filter.cls || r.class === filter.cls) && (!filter.dept || r.department === filter.dept);

/** HR landing page for non-port organisations: last month's upload, as on the legacy otherOrg dashboard. */
export default function NonPortDashboard({ notify, canUpload }) {
  const navigate = useNavigate();
  const orgId = useMemo(() => getSessionOrganisationId() || 0, []);
  const dataMonth = useMemo(() => nonPortDataMonth(), []);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(EMPTY);
  const { totals, charts, abolishing, retiring, lastUpload } = dashboard;

  const [abFilter, setAbFilter] = useState({ cls: '', dept: '' });
  const [retFilter, setRetFilter] = useState({ cls: '', dept: '' });

  useEffect(() => {
    let active = true;
    fetchNonPortDashboard(orgId).then((next) => {
      if (!active) return;
      setDashboard(next);
      setLoading(false);
      if (next.failed) notify?.(COMMON_TOASTS.loadFailed('Some dashboard sections'));
    });
    return () => { active = false; };
  }, [orgId, notify]);

  const filteredAbolishing = useMemo(() => abolishing.filter(byFilter(abFilter)), [abolishing, abFilter]);
  const filteredRetiring = useMemo(() => retiring.filter(byFilter(retFilter)), [retiring, retFilter]);

  const abolishingColumns = [
    { label: 'Post Name', value: (r) => r.post_name || '--' },
    { label: 'Post ID', value: (r) => r.post_id || '--', width: '7rem' },
    { label: 'Department', value: (r) => r.department || '--' },
    { label: 'Date of Arise in Vacancy', value: (r) => r.date_of_arise || '--', width: '8.5rem' },
    { label: 'Post Abolition Date', value: (r) => r.abolish_date || '--', width: '8.5rem' },
  ];
  const retiringColumns = [
    { label: 'Employee Name', value: (r) => r.name_of_employee || '--' },
    { label: 'Post Name', value: (r) => r.post_name || '--' },
    { label: 'Reference ID / Personnel No.', value: (r) => r.staff_reference_id || '--', width: '9rem' },
    { label: 'Date of Retirement', value: (r) => r.date_of_retirement || '--', width: '8.5rem' },
  ];

  const stats = [
    { title: 'Sanctioned Strength', value: totals.sanctioned, icon: Users, color: 'blue' },
    { title: 'Total Filled Posts', value: totals.filled, icon: CheckCircle2, color: 'emerald' },
    { title: 'Live Vacant Posts', value: totals.live, icon: FileClock, color: 'amber' },
    { title: 'Abolished Vacant Posts', value: totals.abolished, icon: Ban, color: 'rose' },
  ];
  const noUpload = !loading && totals.sanctioned === 0;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 font-display">HR Dashboard</h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[11px] font-bold text-[#0f417a] dark:text-blue-300">
            <CalendarDays className="h-3.5 w-3.5" /> {dataMonth.label} upload
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Last upload: <strong>{ddmmyyyy(lastUpload)}</strong></span>
        </div>
        {canUpload && (
          <Button variant="primary" onClick={() => navigate('/hr/hr-management/input-form/non-port-upload')}>
            <Upload className="h-4 w-4" /> Upload Monthly File
          </Button>
        )}
      </div>

      {noUpload && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            No vacancy details have been uploaded for <strong>{dataMonth.label}</strong>. Upload that month&apos;s Excel file
            to see your organisation&apos;s posts, vacancies and employee analytics here.
          </span>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {stats.map((s) => <StatCard key={s.title} title={s.title} value={s.value.toLocaleString('en-IN')} icon={s.icon} color={s.color} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <DashboardTable
          title="Upcoming Post Abolitions"
          subtitle="Vacant posts reaching 5 years within a month"
          rows={filteredAbolishing}
          columns={abolishingColumns}
          filters={<RowFilters filter={abFilter} setFilter={setAbFilter} rows={abolishing} />}
          onExport={() => exportRows(filteredAbolishing, abolishingColumns, 'Upcoming Post Abolitions', notify)}
        />
        <DashboardTable
          title="Upcoming Retirements"
          subtitle="Employees retiring within six months"
          rows={filteredRetiring}
          columns={retiringColumns}
          filters={<RowFilters filter={retFilter} setFilter={setRetFilter} rows={retiring} />}
          onExport={() => exportRows(filteredRetiring, retiringColumns, 'Upcoming Retirements', notify)}
        />
      </div>

      <Section title="Employee Analytics" icon={PieChart}>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          <ChartCard title="Gender" asOn={dataMonth.label}>
            <DonutChart data={charts.gender} colors={GENDER_COLORS} fileName="hr_gender_analytics" />
          </ChartCard>
          <ChartCard title="Ex-Service Employees" asOn={dataMonth.label}>
            <DonutChart data={charts.exService} colors={EX_SERVICE_COLORS} tooltipText={EX_SERVICE_TOOLTIP} fileName="hr_ex_service_employees" />
          </ChartCard>
          <ChartCard title="Employee Disability (PwBD)" asOn={dataMonth.label}>
            <DonutChart data={charts.pwbd} colors={PWBD_COLORS} tooltipText={PWBD_TOOLTIP} fileName="hr_employee_disability" />
          </ChartCard>
          <ChartCard title="Community" asOn={dataMonth.label}>
            <DonutChart data={charts.community} colors={COMMUNITY_COLORS} fileName="hr_community_analytics" />
          </ChartCard>
        </div>
      </Section>
    </div>
  );
}

// Class and department come from the uploaded rows (non-port departments are free text, not the master)
function RowFilters({ filter, setFilter, rows }) {
  return (
    <>
      <FilterSelect label="Class" value={filter.cls} onChange={(cls) => setFilter((f) => ({ ...f, cls }))}
        options={classOptionsFrom(rows).map((c) => ({ value: c, label: c }))} />
      <FilterSelect label="Department" value={filter.dept} onChange={(dept) => setFilter((f) => ({ ...f, dept }))}
        options={optionsFrom(rows, 'department')} />
    </>
  );
}
