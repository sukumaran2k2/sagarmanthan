import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHRPermissions, SESSION_EXPIRED_MESSAGE } from '../hooks/useHRPermissions';
import {
  fetchChdEmployeesByOrg,
  fetchCompositeEmployeeList,
  fetchDeputedEmployeesByOrgId,
  fetchEmpDetailsForVacancyManagement,
  fetchMmtDropdown,
  fetchTransferInEmployeesByOrg,
  fetchVacancyLogDetailsByPostCode,
  updateHrPostActivity,
  updatePostStrengthLog,
} from '../api';
import {
  ALL_STAGE_KEYS,
  DR_PORT_STAGES,
  EMPLOYEE_SOURCE,
  MODES_WITH_ORGANISATION,
  ORG_OTHER,
  ROOT_KEY,
  getChain,
  getNormalizedMode,
  savesThenAddsEmployee,
} from './config';
import { EMPTY_FORM, buildPayload, initialForm, toInputDate, validateActivity } from './form';

// Anticipated vacancies and actual vacancies are stored through different endpoints.
const SAVE_BY_TARGET = {
  anticipated: updateHrPostActivity,
  vacant: updatePostStrengthLog,
};

const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

function firstLogRow(body) {
  if (Array.isArray(body)) return body[0];
  if (Array.isArray(body?.data)) return body.data[0];
  if (body?.data && typeof body.data === 'object') return body.data;
  return body;
}

// Organisation master changes rarely; share it across popup opens.
let organisationCache = null;
function loadOrganisations() {
  if (!organisationCache) {
    organisationCache = fetchMmtDropdown('mmt_organisation')
      .then((res) => asList(res).map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })))
      .catch((err) => {
        organisationCache = null;
        throw err;
      });
  }
  return organisationCache;
}

function employeesRequest(source, { orgId, organisationOfEmp }) {
  switch (source) {
    case 'composite':
      return fetchCompositeEmployeeList(orgId);
    case 'chd':
      return fetchChdEmployeesByOrg(orgId);
    case 'deputed':
      return organisationOfEmp && organisationOfEmp !== ORG_OTHER
        ? fetchDeputedEmployeesByOrgId(organisationOfEmp, orgId)
        : null;
    case 'transferIn':
      return organisationOfEmp ? fetchTransferInEmployeesByOrg(organisationOfEmp) : null;
    default:
      return null;
  }
}

/**
 * State and actions for one vacancy activity popup. The popup is mounted per open,
 * so loading happens once per mount.
 */
export function useVacancyActivity({
  post,
  method,
  expectedMethod,
  dateOfVacancy,
  reasonForExemption,
  target,
  userCanEdit,
  notify,
  onClose,
  onSuccess,
  onAddEmployee,
}) {
  const { orgId, userId } = useHRPermissions();
  const mode = useMemo(() => getNormalizedMode(method || expectedMethod), [method, expectedMethod]);
  const source = EMPLOYEE_SOURCE[mode.key];

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    vacancyType: expectedMethod || 'Regular',
    reasonForExemption: reasonForExemption || '',
    dateOfAriseInVacancy: toInputDate(dateOfVacancy),
  }));
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [organisations, setOrganisations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(source === 'composite' || source === 'chd');
  const [details, setDetails] = useState({ open: false, loading: false, data: null });

  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);
  const say = useCallback((msg, type) => notifyRef.current?.(msg, type), []);

  const latestEmployeesRequest = useRef(0);
  const loadEmployees = useCallback(
    (organisationOfEmp) => {
      const request = employeesRequest(source, { orgId, organisationOfEmp });
      const id = ++latestEmployeesRequest.current;
      if (!request) {
        setEmployees([]);
        setEmployeesLoading(false);
        return;
      }
      setEmployeesLoading(true);
      request
        .then((res) => {
          if (id === latestEmployeesRequest.current) setEmployees(asList(res));
        })
        .catch(() => {
          if (id === latestEmployeesRequest.current) {
            setEmployees([]);
            say('Failed to load the employee list.', 'error');
          }
        })
        .finally(() => {
          if (id === latestEmployeesRequest.current) setEmployeesLoading(false);
        });
    },
    [source, orgId, say]
  );

  // Load once: saved log, organisations and the employee list for the mode.
  useEffect(() => {
    let alive = true;

    if (MODES_WITH_ORGANISATION.includes(mode.key)) {
      loadOrganisations()
        .then((list) => alive && setOrganisations(list))
        .catch(() => alive && say('Failed to load organisations.', 'error'));
    }

    if (source === 'composite' || source === 'chd') {
      Promise.resolve().then(() => alive && loadEmployees());
    }

    fetchVacancyLogDetailsByPostCode(post.code)
      .then((res) => {
        if (!alive) return;
        const next = initialForm(firstLogRow(res?.data) || {}, {
          vacancyType: expectedMethod,
          dateOfVacancy,
          reasonForExemption,
        });
        setForm(next);
        setLoading(false);
        if ((source === 'deputed' || source === 'transferIn') && next.organisationOfEmp) {
          loadEmployees(next.organisationOfEmp);
        }
      })
      .catch(() => {
        if (!alive) return;
        // Never let the user save over a log we could not read.
        say('Failed to fetch vacancy log details.', 'error');
        onClose?.();
      });

    return () => {
      alive = false;
    };
    // Mounted per open; inputs are fixed for the lifetime of the popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearErrors = (...keys) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearErrors(key);
  };

  /** Stage dates cascade: clearing a required stage clears the required stages after it. */
  const setStage = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (!value) {
        if (key === ROOT_KEY) {
          ALL_STAGE_KEYS.forEach((k) => {
            next[k] = '';
          });
        } else {
          const chain = getChain(mode.key, next);
          const idx = chain.findIndex((s) => s.key === key);
          if (idx >= 0 && chain[idx].required) {
            chain.slice(idx + 1).forEach((s) => {
              if (s.required) next[s.key] = '';
            });
          }
        }
      }
      const finalStage = { deputation: 'orderIssuedDeputation', composite: 'orderIssuedDeputation', promotion: 'orderDatePromotion' }[mode.key];
      if (finalStage && !next[finalStage]) {
        next.employeeId = '';
        next.empMasterId = '';
        next.joiningDate = '';
        if (mode.key === 'deputation') next.organisationOfEmp = '';
      }
      return next;
    });
    if (mode.key === 'deputation' && (!value || key === 'orderIssuedDeputation')) setEmployees([]);
    clearErrors(key, ROOT_KEY);
  };

  const setRecruitmentThrough = (value) => {
    setForm((prev) => {
      if (prev.recruitmentThrough === value) return prev;
      const next = { ...prev, recruitmentThrough: value };
      DR_PORT_STAGES.forEach((s) => {
        next[s.key] = '';
      });
      return next;
    });
    clearErrors('recruitmentThrough');
  };

  const changeOrganisation = (value) => {
    setForm((prev) => ({ ...prev, organisationOfEmp: value, employeeId: '', empMasterId: '' }));
    clearErrors('organisationOfEmp', 'employeeId');
    loadEmployees(value);
  };

  const changeEmployee = (value) => {
    const match = employees.find((e) => String(e.employee_id) === String(value));
    setForm((prev) => ({ ...prev, employeeId: value, empMasterId: match ? match.emp_master_id : '' }));
    clearErrors('employeeId');
  };

  const showEmployeeDetails = async () => {
    if (!form.employeeId) {
      say('Please select an employee first.', 'error');
      return;
    }
    setDetails({ open: true, loading: true, data: null });
    try {
      const rows = asList(await fetchEmpDetailsForVacancyManagement(form.employeeId));
      if (!rows.length) say('No details found for the selected employee.', 'error');
      setDetails({ open: true, loading: false, data: rows[0] || null });
    } catch {
      say('Failed to fetch employee details.', 'error');
      setDetails({ open: true, loading: false, data: null });
    }
  };

  const validate = () => {
    const found = validateActivity(form, mode.key);
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  // Returns true when a parent took over the Add Employee hand-off.
  const handOffToAddEmployee = () => {
    if (typeof onAddEmployee === 'function') {
      onAddEmployee({ postId: post.id, postCode: post.code, method: mode.label });
      return true;
    }
    say('Activity saved. The Add Employee page is not available yet, so add the employee details later.', 'info');
    return false;
  };

  const save = async ({ addEmployee = false } = {}) => {
    if (saving || !userCanEdit) return false;
    if (!validate()) return false;

    if (!userId || !orgId) {
      say(SESSION_EXPIRED_MESSAGE, 'error');
      return false;
    }

    const saveActivity = SAVE_BY_TARGET[target];
    setSaving(true);
    try {
      await saveActivity(buildPayload(form, mode, { organisationID: orgId, userID: userId, postId: post.id, postCode: post.code }));

      say(`Post activity updated for ${post.code}.`, 'success');
      onClose?.();
      const wantsAddEmployee = addEmployee || savesThenAddsEmployee(mode.key, form);
      if (!(wantsAddEmployee && handOffToAddEmployee())) onSuccess?.();
      return true;
    } catch (err) {
      say(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update post activity.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    mode,
    form,
    errors,
    loading,
    saving,
    organisations,
    employees,
    employeesLoading,
    details,
    closeDetails: () => setDetails((d) => ({ ...d, open: false })),
    validate,
    actions: {
      setField,
      setStage,
      setRecruitmentThrough,
      changeOrganisation,
      changeEmployee,
      showEmployeeDetails,
      save,
    },
  };
}
