import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import {
  User,
  GraduationCap,
  Briefcase,
  ArrowLeft,
  Save,
  Check,
  ChevronRight,
  ChevronLeft,
  Lock } from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import { getSessionClaims, getSessionOrganisationId } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import { checkAadhaarExists, checkReferenceNumberExists, fetchHrEmployeeById, fetchMmtDropdown, fetchPostByPostCode, updateHrEmployee } from '../api';
import { HIGHEST_EDUCATION, employeeFormFromRecord, readEmployeeEditIds } from '../utils/employeeEdit';
import { DISCIPLINES, PWBD_OPTIONS } from '../utils/employeeOptions';
import { Button } from './HrFormControls';
import { useLatestRef } from '../hooks/usePagedList';
import {
  OTHER_ORGANISATION_ID,
  SELECTABLE_APPOINTMENT_METHODS,
  readAddEmployeeHandoff,
  vacancyFromPostRow,
} from '../utils/addEmployeeHandoff';

const MAX_DEGREES = 10;
const DEGREE_KEYS = { ugCount: 'ugDisciplines', pgCount: 'pgDisciplines' };

// Column sizes in tbl_employee_master: longer text fails the insert (SQL error 2628)
const MAX_LENGTH = { employeeName: 50, referenceNumber: 50, empDivisionName: 100, otherParentOrg: 100 };

// yyyy-mm-dd from a local date (toISOString would convert to UTC: a day early in India)
const toLocalIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A value fixed by the vacancy hand-off: shown read-only, in the same box as an editable field
function LockedValue({ value, type = 'text', label }) {
  return (
    <input
      type={type}
      value={value || ''}
      readOnly
      aria-readonly="true"
      aria-label={label}
      title="This value can't be changed here"
      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 cursor-not-allowed focus:outline-none"
    />
  );
}

const EMPLOYEE_STAGES = [
  { id: 'basic', number: '01', title: 'Basic Details', subtitle: 'Personal & Demographics' },
  { id: 'education', number: '02', title: 'Educational Qualification', subtitle: 'Degrees & Highest Level' },
  { id: 'designation', number: '03', title: 'Designation & Post', subtitle: 'Post, Dept & Joining' },
];

// editData: the Employee Database row being edited (from location.state.item, via InputForm); null when adding
export default function EmployeeDataForm({ notify, onCancel, editData = null }) {
  const navigate = useNavigate();
  const claims = useMemo(() => getSessionClaims() || {}, []);
  // From the login only (no fallback organisation): the backend also takes them from the login
  const orgId = useMemo(() => getSessionOrganisationId() || claims.organisationId || null, [claims]);

  // Opened from a vacant post's activity ("Add employee"): the URL names the post code only. The
  // vacancy (department, post, method of appointment, date of arise, vacant/filled) is read from
  // the backend and fixed in the form; an employee can be added only while the post is vacant.
  const [searchParams] = useSearchParams();
  const editIds = useMemo(() => readEmployeeEditIds(editData), [editData]);
  const isEditMode = Boolean(editIds);
  const handoff = useMemo(() => (isEditMode ? null : readAddEmployeeHandoff(searchParams)), [isEditMode, searchParams]);
  // Edit: 'loading' until the record is read, then 'ready' (or 'error'); the employee's
  // current employee id and the values the duplicate checks may skip
  const [edit, setEdit] = useState(() => ({ status: isEditMode ? 'loading' : null, employeeId: editIds?.employeeId, original: {}, discipline: null }));
  // null while loading (or when opened normally); otherwise vacancyFromPostRow(), or
  // { status: 'missing' | 'error' } when the post code is unknown or could not be read
  const [vacancy, setVacancy] = useState(null);
  const notifyRef = useLatestRef(notify);

  const vacancyFound = Boolean(vacancy?.postId);
  // Editing changes personal details only: the posting changes through HR Administration activities
  const lockMethod = isEditMode || (vacancyFound && Boolean(vacancy.method));
  const lockVacancyDate = isEditMode || (vacancyFound && Boolean(vacancy.vacancyDate));
  const isDeputationHandoff = vacancyFound && vacancy.method === 'Deputation In';
  // Why this hand-off can't be submitted (null = it can, or the form was opened normally)
  const handoffBlockedToast = !handoff
    ? null
    : !vacancy
      ? HR_TOASTS.addEmployeePostLoading()
      : vacancy.status === 'vacant'
        ? null
        : vacancy.status === 'filled'
          ? HR_TOASTS.addEmployeePostFilled(handoff.postCode)
          : vacancy.status === 'otherOrganisation'
            ? HR_TOASTS.addEmployeePostOtherOrganisation(handoff.postCode)
            : vacancy.status === 'missing'
              ? HR_TOASTS.addEmployeePostNotFound(handoff.postCode)
              : vacancy.status === 'unverified'
                ? HR_TOASTS.addEmployeePostUnverified(handoff.postCode)
                : COMMON_TOASTS.loadFailed('The vacant post');

  const [activeSection, setActiveSection] = useState('basic');

  // Form State
  const [formData, setFormData] = useState({
    // Stage 1: Basic Employee Details
    employeeName: '',
    referenceNumber: '',
    dateOfBirth: '',
    employeeAadhar: '',
    whethVhorOh: '',
    religion: '',
    ethnicOrigin: '',
    domicileState: '',
    gender: 'Male',
    exService: '0',
    retirementDate: '',
    empDivisionName: '',

    // Stage 2: Educational Qualification
    empHighestEdu: '',
    ugCount: '',
    pgCount: '',
    ugDisciplines: [],
    pgDisciplines: [],

    // Stage 3: Designation & Post Details
    department: '',
    departmentName: '',
    empPostId: '',
    empPostName: '',
    appoinmentMethod: '',
    postCode: handoff?.postCode || '',
    vacancyAriseDate: '',
    joiningDate: '',
    parentOrganisation: '',
    otherParentOrg: '',
    parentOrgJoiningDate: '' });

  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [deptPosts, setPosts] = useState([]);
  const [postCodeList, setPostCodes] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [states, setStates] = useState([]); // mmt_state: { state_id, state_name }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  // Values found to belong to another employee: { referenceNumber: 'REF-1', employeeAadhar: '1234…' }
  const [duplicates, setDuplicates] = useState({});

  // Stage completion tracker for the stepper progress indicators
  const stageProgress = useMemo(() => {
    const isBasicComplete = Boolean(
      formData.employeeName?.trim() &&
      formData.referenceNumber?.trim() &&
      formData.dateOfBirth &&
      formData.whethVhorOh &&
      formData.religion &&
      formData.ethnicOrigin &&
      formData.domicileState &&
      formData.retirementDate &&
      (!formData.employeeAadhar || /^\d{12}$/.test(formData.employeeAadhar.replace(/\s+/g, '')))
    );

    const isEducationComplete = Boolean(
      formData.empHighestEdu
    );

    const isDesignationComplete = Boolean(
      formData.department &&
      formData.empPostId &&
      formData.appoinmentMethod &&
      formData.postCode &&
      formData.vacancyAriseDate &&
      formData.joiningDate &&
      (formData.parentOrganisation !== OTHER_ORGANISATION_ID || formData.otherParentOrg?.trim())
    );

    return {
      basic: isBasicComplete,
      education: isEducationComplete,
      designation: isDesignationComplete };
  }, [formData]);

  // Fetch Departments and Organisations on mount
  useEffect(() => {
    let isMounted = true;

    // A failed load is reported, never replaced by a guessed list: guessed ids would be saved
    axios.get(`${API_BASE_URL}/get-hr-department-list/${orgId}`)
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      })
      .catch(() => {
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('The list of departments'));
      });

    // Parent organisations from the organisation master (emp_parent_org_id is its organisation_id),
    // as the legacy page loaded them; it includes "Other Organisation" (73)
    fetchMmtDropdown('mmt_organisation')
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setOrganisations(res.data);
        }
      })
      .catch(() => {
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('The list of organisations'));
      });

    return () => { isMounted = false; };
  }, [orgId, notifyRef]);

  // The vacancy behind the handed-off post code, from the backend (the URL carries no copies)
  useEffect(() => {
    if (!handoff) return undefined;
    let isMounted = true;
    fetchPostByPostCode(handoff.postCode)
      .then(res => {
        if (!isMounted) return;
        const found = vacancyFromPostRow(Array.isArray(res.data) ? res.data[0] : null, getSessionOrganisationId());
        if (!found) {
          setVacancy({ status: 'missing' });
          notifyRef.current?.(HR_TOASTS.addEmployeePostNotFound(handoff.postCode));
          return;
        }
        setVacancy(found);
        if (found.status === 'filled') notifyRef.current?.(HR_TOASTS.addEmployeePostFilled(handoff.postCode));
        if (found.status === 'otherOrganisation') {
          notifyRef.current?.(HR_TOASTS.addEmployeePostOtherOrganisation(handoff.postCode));
        }
        if (found.status === 'unverified') notifyRef.current?.(HR_TOASTS.addEmployeePostUnverified(handoff.postCode));
        setFormData(prev => ({
          ...prev,
          department: found.department,
          departmentName: found.departmentName,
          empPostId: found.postId,
          empPostName: found.postName,
          appoinmentMethod: found.method || prev.appoinmentMethod,
          vacancyAriseDate: found.vacancyDate || prev.vacancyAriseDate,
          // Deputation from another organisation: the parent organisation is "Other", named below
          parentOrganisation: found.method === 'Deputation In' ? OTHER_ORGANISATION_ID : prev.parentOrganisation,
        }));
      })
      .catch(() => {
        if (!isMounted) return;
        setVacancy({ status: 'error' });
        notifyRef.current?.(COMMON_TOASTS.loadFailed('The vacant post'));
      });
    return () => { isMounted = false; };
  }, [handoff, notifyRef]);

  // Edit: the employee's record with their current posting
  useEffect(() => {
    if (!editIds) return undefined;
    let isMounted = true;
    fetchHrEmployeeById(editIds.masterId)
      .then(res => {
        if (!isMounted) return;
        const emp = res.data?.employee;
        if (!emp) throw new Error('Employee not found');
        const fields = employeeFormFromRecord(emp);
        setFormData(prev => ({ ...prev, ...fields }));
        setEdit({
          status: 'ready',
          employeeId: emp.current_employee_id || editIds.employeeId,
          original: { referenceNumber: fields.referenceNumber, employeeAadhar: fields.employeeAadhar.replace(/\s+/g, '') },
          // Not on this form, so it is sent back unchanged
          discipline: emp.emp_discipline ?? null,
        });
      })
      .catch(err => {
        if (!isMounted) return;
        setEdit(prev => ({ ...prev, status: 'error' }));
        notifyRef.current?.(COMMON_TOASTS.loadFailed(`The employee record (${getErrorMessage(err)})`));
      });
    return () => { isMounted = false; };
  }, [editIds, notifyRef]);

  const lockPost = vacancyFound || isEditMode;
  const otherOrganisation = formData.parentOrganisation === OTHER_ORGANISATION_ID;
  const otherOrganisationLabel =
    organisations.find(o => String(o.organisation_id ?? o.organisationId) === OTHER_ORGANISATION_ID)?.organisation_name
    || 'Other Organisation';

  // Domicile states from the state master; the backend stores the state_id
  useEffect(() => {
    let isMounted = true;
    fetchMmtDropdown('mmt_state')
      .then(res => {
        if (isMounted && Array.isArray(res.data)) setStates(res.data);
      })
      .catch(() => {
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('The list of states'));
      });
    return () => { isMounted = false; };
  }, [notifyRef]);

  // Lists that depend on a selection are empty while nothing is selected
  const posts = formData.department ? deptPosts : [];
  const postCodes = formData.empPostId && formData.appoinmentMethod ? postCodeList : [];

  // Fetch posts when department changes
  useEffect(() => {
    if (!formData.department) return undefined;
    let isMounted = true;
    axios.get(`${API_BASE_URL}/get-hr-postList-by-department-organisation/${formData.department}/${orgId}`)
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setPosts(res.data);
        }
      })
      .catch(() => {
        if (isMounted) setPosts([]);
      });
    return () => { isMounted = false; };
  }, [formData.department, orgId]);

  // Fetch post codes when post or method of appointment changes (a hand-off fixes the post code)
  useEffect(() => {
    if (handoff || !formData.empPostId || !formData.appoinmentMethod) return undefined;
    let isMounted = true;
    axios.get(`${API_BASE_URL}/get-post-code-by-postId/${formData.empPostId}/${formData.appoinmentMethod}`)
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setPostCodes(res.data);
        }
      })
      .catch(() => {
        if (isMounted) setPostCodes([]);
      });
    return () => { isMounted = false; };
  }, [handoff, formData.empPostId, formData.appoinmentMethod]);

  // Auto-calculate Date of Retirement from Date of Birth
  const handleDobChange = (e) => {
    const dobValue = e.target.value;
    let autoRetirementDate = '';
    if (dobValue) {
      const dob = new Date(dobValue);
      if (!isNaN(dob.getTime())) {
        const retirementAge = (formData.department === '06' || formData.department === '006') ? 62 : 60;
        const retirementYear = dob.getFullYear() + retirementAge;
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();

        let retDateObj;
        if (dobDate === 1) {
          retDateObj = new Date(retirementYear, dobMonth, 0);
        } else {
          retDateObj = new Date(retirementYear, dobMonth + 1, 0);
        }
        autoRetirementDate = toLocalIsoDate(retDateObj);
      }
    }
    setFormData(prev => ({
      ...prev,
      dateOfBirth: dobValue,
      retirementDate: autoRetirementDate || prev.retirementDate
    }));
    // Clear the errors of both fields this change fills, as handleInputChange does for one field
    setFormErrors(prev => ({
      ...prev,
      dateOfBirth: dobValue ? null : prev.dateOfBirth,
      retirementDate: autoRetirementDate ? null : prev.retirementDate,
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Number of UG / PG degrees: one discipline per degree, kept in step with the count
  const setDegreeCount = (countKey, raw) => {
    const n = raw === '' ? '' : Math.max(0, Math.min(MAX_DEGREES, Math.trunc(Number(raw)) || 0));
    const listKey = DEGREE_KEYS[countKey];
    setFormData(prev => {
      const size = n === '' ? 0 : n;
      const list = prev[listKey].slice(0, size);
      while (list.length < size) list.push('');
      return { ...prev, [countKey]: n === '' ? '' : String(n), [listKey]: list };
    });
    setFormErrors(prev => ({ ...prev, [countKey]: null, [listKey]: null }));
  };

  const setDiscipline = (listKey, index, value) => {
    setFormData(prev => ({ ...prev, [listKey]: prev[listKey].map((v, i) => (i === index ? value : v)) }));
    setFormErrors(prev => ({ ...prev, [listKey]: null }));
  };

  // Duplicate checks (as the legacy page did before saving). Each returns true when the value is free.
  const checkDuplicate = async (field) => {
    const value = field === 'employeeAadhar'
      ? formData.employeeAadhar.replace(/\s+/g, '')
      : formData.referenceNumber.trim();
    if (!value || (field === 'employeeAadhar' && !/^\d{12}$/.test(value)) || (field === 'referenceNumber' && !orgId)) return true;
    // Editing: the employee's own unchanged value is not a duplicate
    if (isEditMode && edit.original[field] === value) return true;
    try {
      const res = field === 'employeeAadhar'
        ? await checkAadhaarExists(value)
        : await checkReferenceNumberExists(value, orgId);
      const exists = Number(res.data?.exists) === 1;
      setDuplicates(prev => ({ ...prev, [field]: exists ? value : null }));
      if (exists) {
        setFormErrors(prev => ({
          ...prev,
          [field]: field === 'employeeAadhar'
            ? 'An employee with this Aadhaar number already exists.'
            : 'An employee with this reference / personnel number already exists in your organisation.',
        }));
      }
      return !exists;
    } catch {
      // The server checks again on save, so an unavailable check does not block the user here
      return true;
    }
  };

  const handleDepartmentChange = (e) => {
    const depId = e.target.value;
    const depObj = departments.find(d => String(d.department_id || d.departmentId) === String(depId));
    setFormData(prev => ({
      ...prev,
      department: depId,
      departmentName: depObj ? (depObj.department_name || depObj.departmentName) : '',
      empPostId: '',
      empPostName: '',
      postCode: ''
    }));
  };

  const handlePostChange = (e) => {
    const postId = e.target.value;
    const postObj = posts.find(p => String(p.post_id || p.postId) === String(postId));
    setFormData(prev => ({
      ...prev,
      empPostId: postId,
      empPostName: postObj ? (postObj.post_name || postObj.postName) : '',
      postCode: ''
    }));
  };

  // Stage 1 Validation: Basic Employee Details
  const validateBasicStage = () => {
    const errors = {};
    if (!formData.employeeName.trim()) errors.employeeName = 'Employee Name is required';
    if (!formData.referenceNumber.trim()) errors.referenceNumber = 'Reference / Personnel Number is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of Birth is required';
    if (!formData.whethVhorOh) errors.whethVhorOh = 'PwBD status is required';
    if (!formData.religion) errors.religion = 'Religion is required';
    if (!formData.ethnicOrigin) errors.ethnicOrigin = 'Community is required';
    if (!formData.domicileState) errors.domicileState = 'Domicile State is required';
    if (!formData.retirementDate) errors.retirementDate = 'Date of Retirement is required';

    if (formData.employeeAadhar && !/^\d{12}$/.test(formData.employeeAadhar.replace(/\s+/g, ''))) {
      errors.employeeAadhar = 'Aadhaar Number must be 12 digits';
    }
    if (duplicates.referenceNumber && duplicates.referenceNumber === formData.referenceNumber.trim()) {
      errors.referenceNumber = 'An employee with this reference / personnel number already exists in your organisation.';
    }
    if (duplicates.employeeAadhar && duplicates.employeeAadhar === formData.employeeAadhar.replace(/\s+/g, '')) {
      errors.employeeAadhar = 'An employee with this Aadhaar number already exists.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      const count = Object.keys(errors).length;
      const firstMsg = Object.values(errors)[0];
      notify?.(count > 1
        ? COMMON_TOASTS.fixValidationErrors(`fill all ${count} mandatory fields (*) in Basic Details`)
        : COMMON_TOASTS.fixValidationErrors(firstMsg));
      return false;
    }
    return true;
  };

  // Stage 2 Validation: Educational Qualification
  const validateEducationStage = () => {
    const errors = {};
    if (!formData.empHighestEdu) errors.empHighestEdu = 'Highest Educational Qualification is required';
    if (formData.ugDisciplines.some(d => !d)) errors.ugDisciplines = 'Select the discipline of every UG degree';
    if (formData.pgDisciplines.some(d => !d)) errors.pgDisciplines = 'Select the discipline of every PG degree';

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notify?.(COMMON_TOASTS.fixValidationErrors(Object.values(errors)[0]));
      return false;
    }
    return true;
  };

  // Stage 3 Validation: Designation & Post Details
  const validateDesignationStage = () => {
    const errors = {};
    // Editing: the posting is shown for reference only and is not saved from here
    if (!isEditMode) {
      if (!formData.department) errors.department = 'Department is required';
      if (!formData.empPostId) errors.empPostId = 'Post Name is required';
      if (!formData.appoinmentMethod) errors.appoinmentMethod = 'Method of Appointment is required';
      if (!formData.postCode) errors.postCode = 'Post Code is required';
      if (!formData.vacancyAriseDate) errors.vacancyAriseDate = 'Date of Arise in Vacancy is required';
      if (!formData.joiningDate) errors.joiningDate = 'Date of Joining is required';
    }
    if (formData.parentOrganisation === OTHER_ORGANISATION_ID && !formData.otherParentOrg.trim()) {
      errors.otherParentOrg = 'Name of the organisation is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      const count = Object.keys(errors).length;
      const firstMsg = Object.values(errors)[0];
      notify?.(count > 1
        ? COMMON_TOASTS.fixValidationErrors(`fill all ${count} mandatory fields (*) in Designation & Post`)
        : COMMON_TOASTS.fixValidationErrors(firstMsg));
      return false;
    }
    return true;
  };

  // Stage Navigation Controller with Mandatory Field Validation
  const handleNavigateToStage = (targetStageId) => {
    const stageOrder = ['basic', 'education', 'designation'];
    const currentIndex = stageOrder.indexOf(activeSection);
    const targetIndex = stageOrder.indexOf(targetStageId);

    // Navigating backwards is allowed freely
    if (targetIndex < currentIndex) {
      setActiveSection(targetStageId);
      return;
    }

    // Moving to Education (Stage 2) requires valid Stage 1
    if (targetIndex >= 1) {
      if (!validateBasicStage()) {
        setActiveSection('basic');
        return;
      }
    }

    // Moving to Designation (Stage 3) requires valid Stage 2
    if (targetIndex >= 2) {
      if (!validateEducationStage()) {
        setActiveSection('education');
        return;
      }
    }

    setActiveSection(targetStageId);
  };

  // Overall Form Submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // A hand-off is submitted only against a vacant post of this organisation
    if (handoffBlockedToast) {
      notify?.(handoffBlockedToast);
      return;
    }
    if (isEditMode && edit.status !== 'ready') {
      notify?.(COMMON_TOASTS.loadFailed('The employee record'));
      return;
    }

    if (!validateBasicStage()) {
      setActiveSection('basic');
      return;
    }
    if (!validateEducationStage()) {
      setActiveSection('education');
      return;
    }
    if (!validateDesignationStage()) {
      setActiveSection('designation');
      return;
    }

    setIsSubmitting(true);
    // Checked again right before saving (the values may have been taken meanwhile)
    const [refFree, aadhaarFree] = await Promise.all([checkDuplicate('referenceNumber'), checkDuplicate('employeeAadhar')]);
    if (!refFree || !aadhaarFree) {
      setIsSubmitting(false);
      setActiveSection('basic');
      notify?.(!refFree ? HR_TOASTS.referenceNumberExists() : HR_TOASTS.aadhaarExists());
      return;
    }
    if (isEditMode) {
      await submitUpdate();
      return;
    }
    try {
      const payload = {
        employeeName: formData.employeeName.trim(),
        referenceNumber: formData.referenceNumber.trim(),
        dateOfBirth: formData.dateOfBirth,
        employeeAadhar: formData.employeeAadhar ? formData.employeeAadhar.replace(/\s+/g, '') : null,
        whethVhorOh: formData.whethVhorOh,
        religion: formData.religion,
        ethnicOrigin: formData.ethnicOrigin,
        empDivisionName: formData.empDivisionName.trim() || null,
        gender: formData.gender,
        experience: formData.exService, // exService mapped to experience in backend
        department: formData.department,
        departmentName: formData.departmentName,
        organisationID: orgId,
        empPostId: formData.empPostId,
        empPostName: formData.empPostName,
        postCode: formData.postCode,
        parentOrganisation: formData.parentOrganisation || null,
        otherParentOrg: formData.parentOrganisation === OTHER_ORGANISATION_ID ? formData.otherParentOrg.trim() : null,
        domicileState: formData.domicileState,
        parentOrgJoiningDate: formData.parentOrgJoiningDate || null,
        retirementDate: formData.retirementDate,
        appoinmentMethod: formData.appoinmentMethod,
        vacancyAriseDate: formData.vacancyAriseDate,
        joiningDate: formData.joiningDate,
        empPostJoinDate: formData.joiningDate,
        empHighestEdu: formData.empHighestEdu,
        ugCount: formData.ugCount ? parseInt(formData.ugCount) || 0 : null,
        pgCount: formData.pgCount ? parseInt(formData.pgCount) || 0 : null,
        ugDisciplines: formData.ugDisciplines,
        pgDisciplines: formData.pgDisciplines,
        userID: claims.userId || claims.id || null,
        technicalResPerson: 0
      };

      const res = await axios.post(`${API_BASE_URL}/add-new-emplyee`, payload);

      if (res.status === 200 || res.status === 201) {
        notify?.(HR_TOASTS.employeeAdded(formData.employeeName.trim()));
        // replace: Back must not reopen the submitted form. A hand-off returns to its vacancy.
        navigate(handoff?.returnTo || '/hr/hr-management/employee-database', { replace: true });
      } else {
        throw new Error(res.data?.message || 'Failed to submit employee data');
      }
    } catch (err) {
      console.error('Error submitting employee data:', err);
      notify?.(HR_TOASTS.employeeAddFailed(getErrorMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit: personal, education and joining details (the backend updates nothing else)
  const submitUpdate = async () => {
    try {
      await updateHrEmployee(editIds.masterId, edit.employeeId, {
        employeeName: formData.employeeName.trim(),
        referenceNumber: formData.referenceNumber.trim(),
        dateOfBirth: formData.dateOfBirth,
        employeeAadhar: formData.employeeAadhar ? formData.employeeAadhar.replace(/\s+/g, '') : null,
        whethVhorOh: formData.whethVhorOh,
        religion: formData.religion,
        ethnicOrigin: formData.ethnicOrigin,
        empDivisionName: formData.empDivisionName.trim() || null,
        gender: formData.gender,
        experience: formData.exService,
        parentOrganisation: formData.parentOrganisation || null,
        otherParentOrg: formData.parentOrganisation === OTHER_ORGANISATION_ID ? formData.otherParentOrg.trim() : null,
        domicileState: formData.domicileState,
        parentOrgJoiningDate: formData.parentOrgJoiningDate || null,
        retirementDate: formData.retirementDate,
        // The organisation joining date is not editable here, so it is not sent
        empDiscipline: edit.discipline,
        empHighestEdu: formData.empHighestEdu,
        ugCount: formData.ugCount ? parseInt(formData.ugCount, 10) || 0 : null,
        pgCount: formData.pgCount ? parseInt(formData.pgCount, 10) || 0 : null,
        ugDisciplines: formData.ugDisciplines,
        pgDisciplines: formData.pgDisciplines,
      });
      notify?.(HR_TOASTS.employeeUpdated(formData.employeeName.trim()));
      navigate(`/hr/hr-management/employee-details/${encodeURIComponent(editIds.masterId)}`, { replace: true });
    } catch (err) {
      const field = err?.response?.status === 409 ? err.response.data?.field : null;
      if (field) {
        setFormErrors(prev => ({ ...prev, [field]: err.response.data.message }));
        setActiveSection('basic');
      }
      notify?.(HR_TOASTS.employeeUpdateFailed(getErrorMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      navigate(`/hr/hr-management/employee-details/${encodeURIComponent(editIds.masterId)}`);
    } else if (handoff?.returnTo) {
      navigate(handoff.returnTo);
    } else if (onCancel) {
      onCancel();
    } else {
      navigate('/hr/hr-management/employee-database');
    }
  };

  const stageIndex = EMPLOYEE_STAGES.findIndex(s => s.id === activeSection);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in text-slate-800 dark:text-slate-100">

      {/* ==================================================== */}
      {/* UNIFIED EXECUTIVE FORM HEADING WITH CENTERED STEPPER */}
      {/* ==================================================== */}
      <div className="bg-gradient-to-r from-[#0f417a] via-[#134e96] to-[#1a5ba3] px-6 py-4 text-white border-b border-[#0a2d55]/30">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 select-none">

          {/* Left Column: Back Button + Title */}
          <div className="lg:col-span-3 flex items-center space-x-3.5 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer backdrop-blur-sm border border-white/10"
              title={isEditMode ? 'Back to employee details' : handoff?.returnTo ? 'Back to the vacancy' : 'Back to Employee Database'}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase font-display text-white whitespace-nowrap">
                {isEditMode ? 'Update Employee Data' : 'Add Employee Data'}
              </h2>
              <p className="text-[10px] text-blue-100/80 font-medium mt-0.5 whitespace-nowrap">
                Ministry of Ports, Shipping and Waterways
              </p>
            </div>
          </div>

          {/* Center Column: Connected Gradient Progress Stepper */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <div className="w-full max-w-lg xl:max-w-xl">
              <div className="relative flex items-center justify-between px-2">

                {/* Background Track Line */}
                <div className="absolute top-[14px] md:top-[16px] left-[15%] right-[15%] h-1.5 bg-white/20 rounded-full -translate-y-1/2 z-0" />

                {/* Completed Green Progress Fill Line */}
                <div
                  className="absolute top-[14px] md:top-[16px] left-[15%] h-1.5 bg-emerald-400 rounded-full -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                  style={{
                    width: `${(stageIndex / (EMPLOYEE_STAGES.length - 1)) * 70}%`
                  }}
                />

                {/* Step Nodes Grid */}
                <div className="relative z-10 w-full grid grid-cols-3 items-start">
                  {EMPLOYEE_STAGES.map((stage, idx) => {
                    const isActive = activeSection === stage.id;
                    const isCompleted = !!stageProgress[stage.id];

                    return (
                      <div
                        key={stage.id}
                        onClick={() => handleNavigateToStage(stage.id)}
                        className="flex flex-col items-center text-center cursor-pointer group px-1"
                      >
                        {/* Circular Number Node */}
                        <div
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-md ${
                            isCompleted && !isActive
                              ? 'bg-emerald-500 text-white shadow-emerald-900/30 hover:bg-emerald-400 hover:scale-105'
                              : isActive
                              ? 'bg-white text-[#0f417a] ring-4 ring-emerald-400/60 scale-110 shadow-lg'
                              : 'bg-white/15 text-white/60 border border-white/20 backdrop-blur-md hover:bg-white/25 hover:text-white'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {/* Step Label */}
                        <div className="mt-1.5 flex flex-col items-center">
                          <span className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight transition-colors truncate max-w-[110px] sm:max-w-none ${
                            isActive
                              ? 'text-white font-black drop-shadow-sm'
                              : isCompleted
                              ? 'text-emerald-200 font-semibold'
                              : 'text-blue-100/50 font-medium'
                          }`}>
                            {stage.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stage Indicator Pill */}
          <div className="lg:col-span-2 hidden lg:flex justify-end items-center">
            <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white font-mono tracking-wider shadow-sm">
              Stage {stageIndex + 1} of 3
            </span>
          </div>

        </div>
      </div>

      {isEditMode && (
        <div
          role="status"
          className={`mx-6 mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
            edit.status === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-blue-200 bg-blue-50 text-[#0f417a] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
          }`}
        >
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            {edit.status === 'loading' && 'Loading the employee record…'}
            {edit.status === 'error' && 'The employee record could not be loaded, so it cannot be updated now.'}
            {edit.status === 'ready' && (
              <>
                Updating <strong>{formData.employeeName || 'the employee'}</strong> ({edit.employeeId}). The posting and joining date in
                {' '}<strong>Designation &amp; Post</strong> are shown for reference and can&apos;t be changed here.
              </>
            )}
          </p>
        </div>
      )}

      {handoff && (
        <div
          role="status"
          className={`mx-6 mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
            vacancy && handoffBlockedToast
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-blue-200 bg-blue-50 text-[#0f417a] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
          }`}
        >
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          {!vacancy ? (
            <p className="leading-relaxed">Loading vacant post <strong className="font-mono">{handoff.postCode}</strong>…</p>
          ) : handoffBlockedToast ? (
            <p className="leading-relaxed">{handoffBlockedToast.message}</p>
          ) : (
            <p className="leading-relaxed">
              Adding the employee for vacant post <strong className="font-mono">{handoff.postCode}</strong>
              {vacancy.method ? <> through <strong>{vacancy.method}</strong></> : null}.
              {' '}The post details in <strong>Designation &amp; Post</strong> come from the vacancy and can&apos;t be changed here.
              {isDeputationHandoff ? " Name the employee's parent organisation there." : ''}
            </p>
          )}
        </div>
      )}

      {/* Form Content Body */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ==================================================== */}
          {/* STAGE 1: Basic Employee Details                      */}
          {/* ==================================================== */}
          {activeSection === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>1. Basic Employee Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter employee personal identification, date of birth, demographics, community, and retirement schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name of Employee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Name of Employee <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={e => handleInputChange('employeeName', e.target.value)}
                    placeholder="Enter Name of Employee"
                    maxLength={MAX_LENGTH.employeeName}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.employeeName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.employeeName && <p className="text-2xs text-rose-500 mt-1">{formErrors.employeeName}</p>}
                </div>

                {/* Reference Number / Personnel Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reference Number / Personnel Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={e => handleInputChange('referenceNumber', e.target.value)}
                    onBlur={() => checkDuplicate('referenceNumber')}
                    placeholder="Enter Reference Number"
                    maxLength={MAX_LENGTH.referenceNumber}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.referenceNumber ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.referenceNumber && <p className="text-2xs text-rose-500 mt-1">{formErrors.referenceNumber}</p>}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleDobChange}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.dateOfBirth ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.dateOfBirth && <p className="text-2xs text-rose-500 mt-1">{formErrors.dateOfBirth}</p>}
                </div>

                {/* Aadhar Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={formData.employeeAadhar}
                    onChange={e => handleInputChange('employeeAadhar', e.target.value)}
                    onBlur={() => checkDuplicate('employeeAadhar')}
                    placeholder="Enter Aadhaar Number"
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.employeeAadhar ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.employeeAadhar && <p className="text-2xs text-rose-500 mt-1">{formErrors.employeeAadhar}</p>}
                </div>

                {/* Whether PwBD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Whether PwBD? <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.whethVhorOh}
                    onChange={e => handleInputChange('whethVhorOh', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.whethVhorOh ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select--</option>
                    {PWBD_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formErrors.whethVhorOh && <p className="text-2xs text-rose-500 mt-1">{formErrors.whethVhorOh}</p>}
                </div>

                {/* Religion */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Religion <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.religion}
                    onChange={e => handleInputChange('religion', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.religion ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Religion--</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Christian">Christian</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Buddhist">Buddhist</option>
                    <option value="Jain">Jain</option>
                    <option value="Others">Others</option>
                  </select>
                  {formErrors.religion && <p className="text-2xs text-rose-500 mt-1">{formErrors.religion}</p>}
                </div>

                {/* Community */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Community <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.ethnicOrigin}
                    onChange={e => handleInputChange('ethnicOrigin', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.ethnicOrigin ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Community--</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="UR">UR</option>
                    <option value="OBC">OBC</option>
                    <option value="EWS">EWS</option>
                  </select>
                  {formErrors.ethnicOrigin && <p className="text-2xs text-rose-500 mt-1">{formErrors.ethnicOrigin}</p>}
                </div>

                {/* Domicile State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Domicile State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.domicileState}
                    onChange={e => handleInputChange('domicileState', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.domicileState ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Domicile State--</option>
                    {states.map(st => (
                      <option key={st.state_id} value={st.state_id}>{st.state_name}</option>
                    ))}
                  </select>
                  {formErrors.domicileState && <p className="text-2xs text-rose-500 mt-1">{formErrors.domicileState}</p>}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-6 pt-1">
                    {['Male', 'Female', 'Transgender'].map(g => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={formData.gender === g}
                          onChange={e => handleInputChange('gender', e.target.value)}
                          className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Whether Ex-Service Personnel? */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Whether Ex-Service Personnel? <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="exService"
                        value="1"
                        checked={formData.exService === '1'}
                        onChange={e => handleInputChange('exService', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="exService"
                        value="0"
                        checked={formData.exService === '0'}
                        onChange={e => handleInputChange('exService', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* Date of Retirement */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Retirement <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.retirementDate}
                    onChange={e => handleInputChange('retirementDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.retirementDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.retirementDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.retirementDate}</p>}
                </div>

                {/* Division */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Division
                  </label>
                  <input
                    type="text"
                    value={formData.empDivisionName}
                    onChange={e => handleInputChange('empDivisionName', e.target.value)}
                    placeholder="Enter name of division"
                    maxLength={MAX_LENGTH.empDivisionName}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                  />
                </div>
              </div>

              {/* Stage 1 Footer Navigation */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('education')}
                  className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>Next Stage (Educational Qualification)</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 2: Educational Qualification                   */}
          {/* ==================================================== */}
          {activeSection === 'education' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>2. Educational Qualification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the highest educational attainment and specify degrees held.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Highest educational Qualification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.empHighestEdu}
                    onChange={e => handleInputChange('empHighestEdu', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.empHighestEdu ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Highest Qualification--</option>
                    {HIGHEST_EDUCATION.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                    {/* A legacy free-text value (e.g. "B. Tech. (Civil)") stays visible until it is changed */}
                    {formData.empHighestEdu && !HIGHEST_EDUCATION.includes(formData.empHighestEdu) && (
                      <option value={formData.empHighestEdu}>{formData.empHighestEdu} (as recorded)</option>
                    )}
                  </select>
                  {formErrors.empHighestEdu && <p className="text-2xs text-rose-500 mt-1">{formErrors.empHighestEdu}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      No. Of UG Degrees
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={MAX_DEGREES}
                      value={formData.ugCount}
                      onChange={e => setDegreeCount('ugCount', e.target.value)}
                      placeholder="Enter NO. of UG degrees"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      No. Of PG Degrees
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={MAX_DEGREES}
                      value={formData.pgCount}
                      onChange={e => setDegreeCount('pgCount', e.target.value)}
                      placeholder="Enter NO. of PG degrees"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Discipline of each UG / PG degree */}
                {(formData.ugDisciplines.length > 0 || formData.pgDisciplines.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[['ugDisciplines', 'UG'], ['pgDisciplines', 'PG']].map(([listKey, level]) => (
                      <div key={listKey} className="space-y-3">
                        {formData[listKey].map((value, i) => (
                          <div key={`${listKey}-${i}`}>
                            <label htmlFor={`${listKey}-${i}`} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              {level} Discipline {i + 1} <span className="text-rose-500">*</span>
                            </label>
                            <select
                              id={`${listKey}-${i}`}
                              value={value}
                              onChange={e => setDiscipline(listKey, i, e.target.value)}
                              className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                                formErrors[listKey] && !value ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                            >
                              <option value="">--Select Discipline--</option>
                              {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                        ))}
                        {formErrors[listKey] && <p className="text-2xs text-rose-500">{formErrors[listKey]}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 2 Footer Navigation */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('basic')}
                  className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous Stage (Basic Details)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('designation')}
                  className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>Next Stage (Designation & Post)</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 3: Designation & Post Details                  */}
          {/* ==================================================== */}
          {activeSection === 'designation' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>3. Designation & Post Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select department, official designation, method of appointment, post codes, and service joining records.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  {lockPost ? (
                    <LockedValue value={formData.departmentName} label="Department" />
                  ) : (
                  <select
                    value={formData.department}
                    onChange={handleDepartmentChange}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.department ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Department--</option>
                    {departments.map(d => (
                      <option key={d.department_id || d.departmentId} value={d.department_id || d.departmentId}>
                        {d.department_name || d.departmentName}
                      </option>
                    ))}
                  </select>
                  )}
                  {formErrors.department && <p className="text-2xs text-rose-500 mt-1">{formErrors.department}</p>}
                </div>

                {/* Post Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Post Name <span className="text-rose-500">*</span>
                  </label>
                  {lockPost ? (
                    <LockedValue value={formData.empPostName} label="Post Name" />
                  ) : (
                  <select
                    value={formData.empPostId}
                    onChange={handlePostChange}
                    disabled={!formData.department}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.empPostId ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs disabled:opacity-50`}
                  >
                    <option value="">--Select Post Name--</option>
                    {posts.map(p => (
                      <option key={p.post_id || p.postId} value={p.post_id || p.postId}>
                        {p.post_name || p.postName}
                      </option>
                    ))}
                  </select>
                  )}
                  {formErrors.empPostId && <p className="text-2xs text-rose-500 mt-1">{formErrors.empPostId}</p>}
                </div>

                {/* Method Of Appointment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Method Of Appointment <span className="text-rose-500">*</span>
                  </label>
                  {lockMethod ? (
                    <LockedValue value={formData.appoinmentMethod} label="Method Of Appointment" />
                  ) : (
                  <select
                    value={formData.appoinmentMethod}
                    onChange={e => handleInputChange('appoinmentMethod', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.appoinmentMethod ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Appointment Method--</option>
                    {SELECTABLE_APPOINTMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  )}
                  {formErrors.appoinmentMethod && <p className="text-2xs text-rose-500 mt-1">{formErrors.appoinmentMethod}</p>}
                </div>

                {/* Post Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Post Code <span className="text-rose-500">*</span>
                  </label>
                  {handoff || isEditMode ? (
                    <LockedValue value={formData.postCode} label="Post Code" />
                  ) : postCodes.length > 0 ? (
                    <select
                      value={formData.postCode}
                      onChange={e => handleInputChange('postCode', e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                        formErrors.postCode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                    >
                      <option value="">--Select Post Code--</option>
                      {postCodes.map(pc => (
                        <option key={pc.post_code || pc.postCode} value={pc.post_code || pc.postCode}>
                          {pc.post_code || pc.postCode}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.postCode}
                      onChange={e => handleInputChange('postCode', e.target.value)}
                      placeholder="Enter Post Code"
                      className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                        formErrors.postCode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                    />
                  )}
                  {formErrors.postCode && <p className="text-2xs text-rose-500 mt-1">{formErrors.postCode}</p>}
                </div>

                {/* Date of Arise in Vacancy */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Arise in Vacancy <span className="text-rose-500">*</span>
                  </label>
                  {lockVacancyDate ? (
                    <LockedValue type="date" value={formData.vacancyAriseDate} label="Date of Arise in Vacancy" />
                  ) : (
                  <input
                    type="date"
                    value={formData.vacancyAriseDate}
                    onChange={e => handleInputChange('vacancyAriseDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.vacancyAriseDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  )}
                  {formErrors.vacancyAriseDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.vacancyAriseDate}</p>}
                </div>

                {/* Date of Joining in Current Organisation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Joining in Current Organisation <span className="text-rose-500">*</span>
                  </label>
                  {/* Editing: the joining date is shown, not changed */}
                  {isEditMode ? (
                    <LockedValue type="date" value={formData.joiningDate} label="Date of Joining in Current Organisation" />
                  ) : (
                  <input
                    type="date"
                    value={formData.joiningDate}
                    min={formData.vacancyAriseDate || undefined}
                    onChange={e => handleInputChange('joiningDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.joiningDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  )}
                  {formErrors.joiningDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.joiningDate}</p>}
                </div>

                {/* Parent Organisation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Parent Organisation
                  </label>
                  {isDeputationHandoff ? (
                    <LockedValue value={otherOrganisationLabel} label="Parent Organisation" />
                  ) : (
                  <select
                    value={formData.parentOrganisation}
                    onChange={e => {
                      handleInputChange('parentOrganisation', e.target.value);
                      // The free-text name belongs to "Other organisation" only
                      if (e.target.value !== OTHER_ORGANISATION_ID) handleInputChange('otherParentOrg', '');
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                  >
                    <option value="">--Select Organisation Name--</option>
                    {organisations.map(o => (
                      <option key={o.organisation_id || o.organisationId} value={o.organisation_id || o.organisationId}>
                        {o.organisation_name || o.organisationName}
                      </option>
                    ))}
                  </select>
                  )}
                </div>

                {/* Name of the parent organisation when it is "Other organisation" (sent as otherParentOrg) */}
                {otherOrganisation && (
                  <div>
                    <label htmlFor="otherParentOrg" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Please specify the organisation name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="otherParentOrg"
                      type="text"
                      value={formData.otherParentOrg}
                      onChange={e => handleInputChange('otherParentOrg', e.target.value)}
                      placeholder="Enter other organisation name"
                      maxLength={MAX_LENGTH.otherParentOrg}
                      className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                        formErrors.otherParentOrg ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                    />
                    {formErrors.otherParentOrg && <p className="text-2xs text-rose-500 mt-1">{formErrors.otherParentOrg}</p>}
                  </div>
                )}

                {/* Initial Date of Joining in Port Service */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Initial Date of Joining in Port Service
                  </label>
                  <input
                    type="date"
                    value={formData.parentOrgJoiningDate}
                    onChange={e => handleInputChange('parentOrgJoiningDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                  />
                </div>
              </div>

              {/* Stage 3 Footer Navigation & Final Submit */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('education')}
                  className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous Stage (Educational Qualification)</span>
                </button>

                <div className="flex items-center space-x-3">
                  <Button onClick={handleBack} disabled={isSubmitting} className="h-10 px-5">
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    type="submit"
                    busy={isSubmitting}
                    disabled={isSubmitting || Boolean(handoffBlockedToast) || (isEditMode && edit.status !== 'ready')}
                    title={handoffBlockedToast?.message}
                    className="h-10 px-6"
                  >
                    {!isSubmitting && <Save className="h-4 w-4" />}
                    <span>
                      {isSubmitting
                        ? (isEditMode ? 'Updating...' : 'Submitting...')
                        : (isEditMode ? 'Update Employee Data' : 'Submit Employee Data')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>

    </div>
  );
}
