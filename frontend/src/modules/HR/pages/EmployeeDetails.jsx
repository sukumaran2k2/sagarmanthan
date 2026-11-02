import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Pencil, User, Briefcase, GraduationCap, History, CalendarDays, CalendarClock, Building2,
  Eye, EyeOff, Download, AlertTriangle, RotateCcw, MapPin, BadgeCheck,
} from 'lucide-react';
import { fetchEmployeeServiceHistory, fetchHrEmployeeById, fetchMmtDropdown } from '../api';
import { isOrganisationUser, getSessionClaims } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import {
  formatDate, formatDuration, retirementStatus, maskAadhaar, pwbdLabel, disciplineNames, serviceHistoryRows, toDate,
} from '../utils/employeeDetails';
import { canonicalEducation } from '../utils/employeeEdit';
import { PostCodeTag } from '../components/HrFormControls';

const EMPLOYEE_DATABASE = '/hr/hr-management/employee-database';

const initials = (name) =>
  String(name || '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Employee profile: personal, service and education details, and the service history below. */
export default function EmployeeDetails({ notify, canEdit = false }) {
  const { empMasterId } = useParams();
  const navigate = useNavigate();
  const isMinistry = useMemo(() => !isOrganisationUser(), []);

  const [state, setState] = useState({ status: 'loading', employee: null, photo: null, history: [], historyError: null });
  const [lookups, setLookups] = useState({ states: [], organisations: [] });
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const claims = getSessionClaims() || {};
    const roleId = Number(claims.roleId || claims.role_id) || 0;
    Promise.allSettled([
      fetchHrEmployeeById(empMasterId),
      fetchEmployeeServiceHistory(empMasterId, isMinistry ? 0 : (claims.organisationId || 0), roleId),
    ]).then(([emp, hist]) => {
      if (!alive) return;
      if (emp.status === 'rejected' || !emp.value?.data?.employee) {
        const status = emp.reason?.response?.status;
        setState({ status: status === 404 ? 'missing' : status === 403 ? 'forbidden' : 'error', employee: null, photo: null, history: [], historyError: null });
        if (!status || status >= 500) notify?.(COMMON_TOASTS.loadFailed(`The employee record (${getErrorMessage(emp.reason)})`));
        return;
      }
      setState({
        status: 'ready',
        employee: emp.value.data.employee,
        photo: emp.value.data.profileImage || null,
        history: hist.status === 'fulfilled' && Array.isArray(hist.value?.data) ? hist.value.data : [],
        historyError: hist.status === 'rejected' ? getErrorMessage(hist.reason) : null,
      });
    });
    return () => { alive = false; };
  }, [empMasterId, isMinistry, notify, reloadKey]);

  // Names for the state id and the organisation ids in the history (masters; optional)
  useEffect(() => {
    let alive = true;
    Promise.allSettled([fetchMmtDropdown('mmt_state'), fetchMmtDropdown('mmt_organisation')]).then(([st, org]) => {
      if (!alive) return;
      setLookups({
        states: st.status === 'fulfilled' && Array.isArray(st.value?.data) ? st.value.data : [],
        organisations: org.status === 'fulfilled' && Array.isArray(org.value?.data) ? org.value.data : [],
      });
    });
    return () => { alive = false; };
  }, []);

  const emp = state.employee;
  const orgName = (id) => lookups.organisations.find((o) => String(o.organisation_id) === String(id))?.organisation_name || '';
  const history = useMemo(
    () => serviceHistoryRows(state.history, (id) => lookups.organisations.find((o) => String(o.organisation_id) === String(id))?.organisation_name || ''),
    [state.history, lookups.organisations]
  );

  if (state.status === 'loading') return <DetailsSkeleton />;
  if (state.status !== 'ready') {
    const message = {
      missing: 'This employee record was not found.',
      forbidden: 'This employee belongs to another organisation, so their details are not available to you.',
      error: 'The employee record could not be loaded.',
    }[state.status];
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{message}</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => navigate(EMPLOYEE_DATABASE)} className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer">
            Back to Employee Database
          </button>
          {state.status === 'error' && (
            <button type="button" onClick={() => { setState((s) => ({ ...s, status: 'loading' })); setReloadKey((k) => k + 1); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#0f417a] text-white hover:bg-[#0c3463] cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const active = Number(emp.emp_status) === 1;
  const current = history.find((h) => h.isCurrent);
  const stateName = lookups.states.find((s) => String(s.state_id) === String(emp.emp_domicile_state))?.state_name
    || (emp.emp_domicile_state ? String(emp.emp_domicile_state) : '--');
  const parentOrg = emp.parent_organisation_name || orgName(emp.emp_parent_org_id) || '--';
  const ug = disciplineNames(emp.ug_discipline);
  const pg = disciplineNames(emp.pg_discipline);
  const dob = toDate(emp.emp_dob);
  const retirement = retirementStatus(emp.emp_dor);

  const openEdit = () => navigate('/hr/hr-management/input-form/employee-data', {
    state: { item: { emp_master_id: emp.emp_master_id, employee_id: emp.current_employee_id, emp_name: emp.emp_name } },
  });

  // As on today: the current posting runs to today (as the legacy page shows it)
  const asOn = formatDate(new Date());
  const toDateText = (h) => (h.pending ? '--' : h.isCurrent ? asOn : formatDate(h.to));
  const methodActivity = (h) => (h.activity ? `${h.method} / ${h.activity}` : h.method);

  const exportHistory = () => {
    const rows = history.map((h, i) => ({
      'S.No': i + 1,
      'From Date': formatDate(h.from),
      'To Date': toDateText(h),
      Department: h.department,
      'Post Name': h.post,
      'Post Code': h.postCode,
      'Method of Appointment / Activity': [methodActivity(h), h.activityDetail].filter(Boolean).join(' - '),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Service History');
    const fileName = `Employee Service History - ${emp.emp_name} (as on ${asOn}).xlsx`;
    XLSX.writeFile(wb, fileName);
    notify?.(COMMON_TOASTS.excelExported(fileName));
  };

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Profile header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#0f417a] via-[#134e96] to-[#1a5ba3] px-6 py-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <button
              type="button"
              onClick={() => navigate(EMPLOYEE_DATABASE)}
              title="Back to Employee Database"
              aria-label="Back to Employee Database"
              className="self-start md:self-center p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {state.photo ? (
              <img src={state.photo} alt="" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/20 shrink-0" />
            ) : (
              <div aria-hidden="true" className="h-20 w-20 rounded-2xl bg-white/15 ring-4 ring-white/10 flex items-center justify-center text-2xl font-black tracking-wide shrink-0">
                {initials(emp.emp_name)}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-wide font-display truncate">{emp.emp_name || '--'}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${active ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-400/90 text-rose-950'}`}>
                  {active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-blue-100 flex flex-wrap gap-x-4 gap-y-1">
                <span>Employee ID <strong className="text-white">{emp.current_employee_id || '--'}</strong></span>
                <span>Reference / Personnel No. <strong className="text-white">{emp.emp_reference_id || '--'}</strong></span>
              </p>
              <p className="text-xs text-blue-100 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                {emp.emp_post_name
                  ? <span><strong className="text-white">{emp.emp_post_name}</strong> · {emp.emp_department_name || '--'} · <span className="font-bold tracking-tight">{String(emp.emp_post_code || '').trim()}</span></span>
                  : <span>No current posting</span>}
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openEdit}
                className="self-start md:self-center inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white text-[#0f417a] hover:bg-blue-50 shadow-sm cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Details
              </button>
            )}
          </div>
        </div>

        {/* Key dates */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800">
          <KeyFact icon={Building2} label="Joined Current Organisation" value={formatDate(emp.emp_curr_org_join_date)}
            hint={toDate(emp.emp_curr_org_join_date) ? `${formatDuration(emp.emp_curr_org_join_date)} in service` : null} />
          <KeyFact icon={BadgeCheck} label="In Current Post Since" value={current ? formatDate(current.from) : '--'}
            hint={current ? current.method : null} />
          <KeyFact icon={CalendarDays} label="Date of Birth" value={formatDate(emp.emp_dob)}
            hint={dob ? `Age ${formatDuration(dob).split(' ')[0]}` : null} />
          <KeyFact icon={CalendarClock} label="Date of Retirement" value={formatDate(emp.emp_dor)} hint={retirement}
            tone={retirement === 'Retired' ? 'rose' : null} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card title="Personal Details" icon={User}>
          <Field label="Gender" value={emp.emp_gender} />
          <Field label="Religion" value={emp.emp_religion} />
          <Field label="Community" value={emp.emp_ethnic_origin} />
          <Field label="Domicile State" value={stateName} icon={MapPin} />
          <Field label="Whether PwBD?" value={pwbdLabel(emp.emp_disability)} />
          <Field label="Ex-Service Personnel" value={Number(emp.ex_service_or_not) === 1 ? 'Yes' : 'No'} />
          <Field
            label="Aadhaar Number"
            value={showAadhaar ? (emp.emp_aadhar_number || '--') : maskAadhaar(emp.emp_aadhar_number)}
            mono
            action={emp.emp_aadhar_number ? (
              <button
                type="button"
                onClick={() => setShowAadhaar((v) => !v)}
                aria-label={showAadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                title={showAadhaar ? 'Hide' : 'Show'}
                className="p-1 text-slate-400 hover:text-[#0f417a] cursor-pointer"
              >
                {showAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          />
        </Card>

        <Card title="Service Details" icon={Briefcase}>
          <Field label="Division" value={emp.emp_division_name} />
          <Field label="Pay Scale Range" value={emp.payscale_range} />
          <Field nowrap label="Date of Joining in Current Organisation" value={formatDate(emp.emp_curr_org_join_date)} />
          <Field label="Parent Organisation" value={parentOrg} />
          {Number(emp.emp_parent_org_id) === 73 && <Field label="Other Organisation" value={emp.emp_other_parent_org} />}
          <Field nowrap label="Initial Date of Joining Port Service" value={formatDate(emp.emp_parent_org_joined_date)} />
          <Field label="Method of Appointment (current post)" value={emp.method_of_appointment} />
        </Card>

        <Card title="Educational Qualification" icon={GraduationCap}>
          <Field label="Highest Qualification" value={canonicalEducation(emp.emp_highest_edu)} />
          <Field label="UG Degrees" value={ug.length || Number(emp.ug_count) || 0} />
          {ug.length > 0 && <Chips label="UG Disciplines" items={ug} />}
          <Field label="PG Degrees" value={pg.length || Number(emp.pg_count) || 0} />
          {pg.length > 0 && <Chips label="PG Disciplines" items={pg} />}
          {emp.emp_discipline && <Field label="Discipline" value={emp.emp_discipline} />}
        </Card>
      </div>

      {/* Employee service history (columns as on the legacy page) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <History className="h-4 w-4 text-[#0f417a] dark:text-blue-400" /> Employee Service History
            <span className="normal-case tracking-normal font-semibold text-slate-500 dark:text-slate-400">(as on {asOn})</span>
          </h3>
          <button
            type="button"
            onClick={exportHistory}
            disabled={!history.length}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
        </div>

        <div className="p-5">
          {state.historyError ? (
            <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-4 py-3">The service history could not be loaded ({state.historyError}).</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No service records.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-[#0f417a] text-white text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">S.No</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">From Date</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">To Date</th>
                    <th className="px-3 py-2.5 text-center">Department</th>
                    <th className="px-3 py-2.5 text-center">Post Name</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Post Code</th>
                    <th className="px-3 py-2.5 text-center">Method of Appointment / Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={h.id} className="border-t border-slate-100 dark:border-slate-800 align-middle text-center bg-white even:bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-slate-900 dark:even:bg-slate-800/40 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{h.pending ? '--' : formatDate(h.from)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{toDateText(h)}</td>
                      <td className="px-3 py-2.5">{h.department}</td>
                      <td className="px-3 py-2.5">{h.pending ? 'Awaiting posting' : h.post}</td>
                      <td className="px-3 py-2.5">{h.postCode === '--' ? <PostCodeTag /> : <PostCodeTag>{h.postCode}</PostCodeTag>}</td>
                      <td className="px-3 py-2.5">
                        <div>{methodActivity(h)}</div>
                        {h.activityDetail && <div className="text-[10px] text-slate-500 mt-0.5">{h.activityDetail}</div>}
                        {isMinistry && h.organisation && <div className="text-[10px] text-slate-400 mt-0.5">{h.organisation}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KeyFact({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" /> {label}
      </div>
      <div className="text-base font-extrabold mt-1 tabular-nums">{value}</div>
      {hint && <div className={`text-[11px] mt-0.5 ${tone === 'rose' ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>{hint}</div>}
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
        <Icon className="h-4 w-4 text-[#0f417a] dark:text-blue-400" /> {title}
      </h3>
      <dl className="divide-y divide-slate-100 dark:divide-slate-800">{children}</dl>
    </section>
  );
}

function Field({ label, value, mono, nowrap, action, icon: Icon }) {
  const shown = value === 0 ? '0' : (value == null || String(value).trim() === '' ? '--' : String(value));
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-xs font-semibold text-right flex items-center justify-end gap-1 ${mono ? 'font-bold tracking-tight' : ''} ${mono || nowrap ? 'whitespace-nowrap shrink-0' : ''}`}>
        {Icon && shown !== '--' && <Icon className="h-3 w-3 text-slate-400" />}
        {shown}
        {action}
      </dd>
    </div>
  );
}

function Chips({ label, items }) {
  return (
    <div className="py-2">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((d, i) => (
          <span key={`${d}-${i}`} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">{d}</span>
        ))}
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  const block = 'bg-slate-200/70 dark:bg-slate-800 rounded-xl animate-pulse';
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading employee details">
      <div className={`${block} h-44`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className={`${block} h-64`} /><div className={`${block} h-64`} /><div className={`${block} h-64`} />
      </div>
      <div className={`${block} h-56`} />
    </div>
  );
}
