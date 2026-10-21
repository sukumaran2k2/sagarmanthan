import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import { getSessionClaims, getSessionOrganisationId } from '../../../utils/authSession';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const EMPLOYEE_STAGES = [
  { id: 'basic', number: '01', title: 'Basic Details', subtitle: 'Personal & Demographics' },
  { id: 'education', number: '02', title: 'Educational Qualification', subtitle: 'Degrees & Highest Level' },
  { id: 'designation', number: '03', title: 'Designation & Post', subtitle: 'Post, Dept & Joining' },
];

export default function EmployeeDataForm({ triggerNotification, onCancel }) {
  const navigate = useNavigate();
  const claims = useMemo(() => getSessionClaims() || {}, []);
  const orgId = useMemo(() => getSessionOrganisationId() || claims.organisationId || 1, [claims]);

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

    // Stage 3: Designation & Post Details
    department: '',
    departmentName: '',
    empPostId: '',
    empPostName: '',
    appoinmentMethod: '',
    postCode: '',
    vacancyAriseDate: '',
    joiningDate: '',
    parentOrganisation: '',
    parentOrgJoiningDate: '',
  });

  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postCodes, setPostCodes] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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
      formData.joiningDate
    );

    return {
      basic: isBasicComplete,
      education: isEducationComplete,
      designation: isDesignationComplete,
    };
  }, [formData]);

  // Fetch Departments and Organisations on mount
  useEffect(() => {
    let isMounted = true;

    axios.get(`${API_BASE_URL}/get-hr-department-list/${orgId}`)
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDepartments([
            { department_id: '001', department_name: 'Civil Engineering' },
            { department_id: '002', department_name: 'Finance and Accounts' },
            { department_id: '003', department_name: 'General Administration Department' },
            { department_id: '004', department_name: 'Marine Department' },
            { department_id: '005', department_name: 'Mechanical & Electrical Engineering' },
            { department_id: '006', department_name: 'Medical Department' },
            { department_id: '007', department_name: 'Traffic' },
          ]);
        }
      });

    axios.get(`${API_BASE_URL}/get-all-organisations`)
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setOrganisations(res.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOrganisations([
            { organisation_id: 1, organisation_name: 'Chennai Port Authority' },
            { organisation_id: 2, organisation_name: 'Cochin Port Authority' },
            { organisation_id: 3, organisation_name: 'Deendayal Port Authority' },
            { organisation_id: 4, organisation_name: 'Jawaharlal Nehru Port Authority' },
            { organisation_id: 5, organisation_name: 'Kolkata Port Authority' },
            { organisation_id: 6, organisation_name: 'Mormugao Port Authority' },
            { organisation_id: 7, organisation_name: 'Mumbai Port Authority' },
            { organisation_id: 8, organisation_name: 'New Mangalore Port Authority' },
            { organisation_id: 9, organisation_name: 'Paradip Port Authority' },
            { organisation_id: 10, organisation_name: 'Syama Prasad Mookerjee Port' },
            { organisation_id: 11, organisation_name: 'V.O. Chidambaranar Port Authority' },
            { organisation_id: 12, organisation_name: 'Visakhapatnam Port Authority' },
          ]);
        }
      });

    return () => { isMounted = false; };
  }, [orgId]);

  // Fetch posts when department changes
  useEffect(() => {
    if (!formData.department) {
      setPosts([]);
      return;
    }
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

  // Fetch post codes when post or method of appointment changes
  useEffect(() => {
    if (!formData.empPostId || !formData.appoinmentMethod) {
      setPostCodes([]);
      return;
    }
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
  }, [formData.empPostId, formData.appoinmentMethod]);

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
        autoRetirementDate = retDateObj.toISOString().slice(0, 10);
      }
    }
    setFormData(prev => ({
      ...prev,
      dateOfBirth: dobValue,
      retirementDate: autoRetirementDate || prev.retirementDate
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

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      const count = Object.keys(errors).length;
      const firstMsg = Object.values(errors)[0];
      const warningMsg = count > 1 
        ? `Please fill all ${count} mandatory fields (*) in Basic Details before proceeding.`
        : `${firstMsg}`;
      triggerNotification?.(warningMsg, 'warning');
      return false;
    }
    return true;
  };

  // Stage 2 Validation: Educational Qualification
  const validateEducationStage = () => {
    const errors = {};
    if (!formData.empHighestEdu) errors.empHighestEdu = 'Highest Educational Qualification is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      const firstMsg = Object.values(errors)[0];
      triggerNotification?.(firstMsg, 'warning');
      return false;
    }
    return true;
  };

  // Stage 3 Validation: Designation & Post Details
  const validateDesignationStage = () => {
    const errors = {};
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.empPostId) errors.empPostId = 'Post Name is required';
    if (!formData.appoinmentMethod) errors.appoinmentMethod = 'Method of Appointment is required';
    if (!formData.postCode) errors.postCode = 'Post Code is required';
    if (!formData.vacancyAriseDate) errors.vacancyAriseDate = 'Date of Arise in Vacancy is required';
    if (!formData.joiningDate) errors.joiningDate = 'Date of Joining is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      const count = Object.keys(errors).length;
      const firstMsg = Object.values(errors)[0];
      const warningMsg = count > 1 
        ? `Please fill all ${count} mandatory fields (*) in Designation & Post before submitting.`
        : `${firstMsg}`;
      triggerNotification?.(warningMsg, 'warning');
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
        userID: claims.userId || claims.id || 1,
        technicalResPerson: 0
      };

      const res = await axios.post(`${API_BASE_URL}/add-new-emplyee`, payload);

      if (res.status === 200 || res.status === 201) {
        if (triggerNotification) {
          triggerNotification('Employee record added successfully!', 'success');
        }
        navigate('/hr/hr-management/employee-database');
      } else {
        throw new Error(res.data?.message || 'Failed to submit employee data');
      }
    } catch (err) {
      console.error('Error submitting employee data:', err);
      const errMsg = err.response?.data?.message || err.message || 'Error adding employee record.';
      if (triggerNotification) {
        triggerNotification(errMsg, 'error');
      } else {
        alert(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onCancel) {
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
              title="Back to Employee Database"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase font-display text-white whitespace-nowrap">
                Add Employee Data
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
                    placeholder="Enter Reference Number"
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
                    <option value="NA">Not Applicable (NA)</option>
                    <option value="OH">Orthopedically Handicapped (OH)</option>
                    <option value="VH">Visually Handicapped (VH)</option>
                    <option value="MD">Multiple Disability (MD)</option>
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
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
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
                    <option value="Doctorate">Doctorate</option>
                    <option value="Post Graduate">Post Graduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Higher Secondary (12th)">Higher Secondary (12th)</option>
                    <option value="Secondary (10th)">Secondary (10th)</option>
                    <option value="Below 10th">Below 10th</option>
                    <option value="Others">Others</option>
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
                      value={formData.ugCount}
                      onChange={e => handleInputChange('ugCount', e.target.value)}
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
                      value={formData.pgCount}
                      onChange={e => handleInputChange('pgCount', e.target.value)}
                      placeholder="Enter NO. of PG degrees"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                    />
                  </div>
                </div>
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
                  {formErrors.department && <p className="text-2xs text-rose-500 mt-1">{formErrors.department}</p>}
                </div>

                {/* Post Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Post Name <span className="text-rose-500">*</span>
                  </label>
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
                  {formErrors.empPostId && <p className="text-2xs text-rose-500 mt-1">{formErrors.empPostId}</p>}
                </div>

                {/* Method Of Appointment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Method Of Appointment <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.appoinmentMethod}
                    onChange={e => handleInputChange('appoinmentMethod', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.appoinmentMethod ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  >
                    <option value="">--Select Appointment Method--</option>
                    <option value="Direct Recruitment">Direct Recruitment</option>
                    <option value="Direct Recruitment (Compassionate Method)">Direct Recruitment (Compassionate Method)</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Composite Method">Composite Method</option>
                    <option value="Deputation In">Deputation In</option>
                    <option value="Absorption">Absorption</option>
                    <option value="Transfer In">Transfer In</option>
                  </select>
                  {formErrors.appoinmentMethod && <p className="text-2xs text-rose-500 mt-1">{formErrors.appoinmentMethod}</p>}
                </div>

                {/* Post Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Post Code <span className="text-rose-500">*</span>
                  </label>
                  {postCodes.length > 0 ? (
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
                  <input
                    type="date"
                    value={formData.vacancyAriseDate}
                    onChange={e => handleInputChange('vacancyAriseDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.vacancyAriseDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.vacancyAriseDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.vacancyAriseDate}</p>}
                </div>

                {/* Date of Joining in Current Organisation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Joining in Current Organisation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    min={formData.vacancyAriseDate || undefined}
                    onChange={e => handleInputChange('joiningDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                      formErrors.joiningDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                  />
                  {formErrors.joiningDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.joiningDate}</p>}
                </div>

                {/* Parent Organisation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Parent Organisation
                  </label>
                  <select
                    value={formData.parentOrganisation}
                    onChange={e => handleInputChange('parentOrganisation', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
                  >
                    <option value="">--Select Organisation Name--</option>
                    {organisations.map(o => (
                      <option key={o.organisation_id || o.organisationId} value={o.organisation_id || o.organisationId}>
                        {o.organisation_name || o.organisationName}
                      </option>
                    ))}
                  </select>
                </div>

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
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-8 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Employee Data'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>

    </div>
  );
}
