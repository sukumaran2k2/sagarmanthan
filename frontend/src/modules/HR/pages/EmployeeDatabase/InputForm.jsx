import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getSessionClaims, getSessionOrganisationId } from '../../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import { addNewEmployee, checkAadhaarExists, checkReferenceNumberExists, fetchHrDepartments, fetchHrEmployeeById, fetchHrPostsByDepartment, fetchMmtDropdown, fetchPostByPostCode, fetchPostCodesByPost, updateHrEmployee } from '../../api';
import { employeeFormFromRecord, readEmployeeEditIds } from './employeeEdit';
import { useLatestRef } from '../../hooks/usePagedList';
import { OTHER_ORGANISATION_ID } from '../../constants';
import { DEGREE_KEYS, EMPLOYEE_STAGES, MAX_DEGREES } from './employeeFormConfig';
import EmployeeFormStepper from './components/EmployeeFormStepper';
import BasicDetailsStage from './components/BasicDetailsStage';
import EducationStage from './components/EducationStage';
import DesignationStage from './components/DesignationStage';
import { readAddEmployeeHandoff, vacancyFromPostRow } from '../../utils/addEmployeeHandoff';

// yyyy-mm-dd from a local date (toISOString would convert to UTC: a day early in India)
const toLocalIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    fetchHrDepartments(orgId)
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
    fetchHrPostsByDepartment(formData.department, orgId)
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
    fetchPostCodesByPost(formData.empPostId, formData.appoinmentMethod)
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

      const res = await addNewEmployee(payload);

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

      <EmployeeFormStepper
        activeSection={activeSection}
        handleBack={handleBack}
        handleNavigateToStage={handleNavigateToStage}
        handoff={handoff}
        isEditMode={isEditMode}
        stageIndex={stageIndex}
        stageProgress={stageProgress}
      />

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
            <BasicDetailsStage
              checkDuplicate={checkDuplicate}
              formData={formData}
              formErrors={formErrors}
              handleBack={handleBack}
              handleDobChange={handleDobChange}
              handleInputChange={handleInputChange}
              handleNavigateToStage={handleNavigateToStage}
              states={states}
            />
          )}

          {/* ==================================================== */}
          {/* STAGE 2: Educational Qualification                   */}
          {/* ==================================================== */}
          {activeSection === 'education' && (
            <EducationStage
              formData={formData}
              formErrors={formErrors}
              handleInputChange={handleInputChange}
              handleNavigateToStage={handleNavigateToStage}
              setDegreeCount={setDegreeCount}
              setDiscipline={setDiscipline}
            />
          )}

          {/* ==================================================== */}
          {/* STAGE 3: Designation & Post Details                  */}
          {/* ==================================================== */}
          {activeSection === 'designation' && (
            <DesignationStage
              departments={departments}
              edit={edit}
              formData={formData}
              formErrors={formErrors}
              handleBack={handleBack}
              handleDepartmentChange={handleDepartmentChange}
              handleInputChange={handleInputChange}
              handleNavigateToStage={handleNavigateToStage}
              handlePostChange={handlePostChange}
              handoff={handoff}
              handoffBlockedToast={handoffBlockedToast}
              isDeputationHandoff={isDeputationHandoff}
              isEditMode={isEditMode}
              isSubmitting={isSubmitting}
              lockMethod={lockMethod}
              lockPost={lockPost}
              lockVacancyDate={lockVacancyDate}
              organisations={organisations}
              otherOrganisation={otherOrganisation}
              otherOrganisationLabel={otherOrganisationLabel}
              postCodes={postCodes}
              posts={posts}
            />
          )}

        </form>
      </div>

    </div>
  );
}
