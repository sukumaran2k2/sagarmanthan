import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Save, ArrowLeft, Upload, FileText, CheckCircle2, 
  AlertCircle, DollarSign, Calendar, Layers, Building2, 
  Clock, X, Check, ArrowRight, Users, UploadCloud 
} from 'lucide-react';
import { getCurrentUserId, getSessionOrganisationId } from '../../../utils/authSession';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const CATEGORY_OPTIONS = [
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'policy', label: 'Policy' },
  { value: 'institution building', label: 'Institution Building' },
  { value: 'call of action', label: 'Call of Action' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'reports', label: 'Reports' },
  { value: 'Legislative/Legal', label: 'Legislative/Legal' },
  { value: 'Digitisation / Digital', label: 'Digitisation / Digital' },
  { value: 'Human Resource', label: 'Human Resource' },
  { value: 'International Cooperation', label: 'International Cooperation' },
  { value: 'Energy transition / Green Energy', label: 'Energy transition / Green Energy' },
  { value: 'Financial / Economic policy/ intervention', label: 'Financial / Economic policy/ intervention' },
  { value: 'Traffic / Cargo', label: 'Traffic / Cargo' },
];

const FUNDING_OPTIONS = [
  'Central Grant (GBS)',
  'IEBR (Own Fund)',
  'Loans',
  'Multilateral Funding',
  'Others',
];

const STATUS_OPTIONS = [
  'Yet to be Started',
  'Under Implementation - On Time',
  'Under Implementation - Delayed',
  'Completed',
  'Dropped',
  'Not Applicable',
];

const INITIATIVE_STAGES = [
  { 
    id: 'general', 
    number: '01', 
    title: 'General Details', 
    subtitle: 'Scope & Cost', 
    icon: Layers 
  },
  { 
    id: 'status', 
    number: '02', 
    title: 'Status & Progress', 
    subtitle: 'Current Status', 
    icon: Clock 
  },
  { 
    id: 'timelines', 
    number: '03', 
    title: 'Timelines', 
    subtitle: 'Target Dates', 
    icon: Calendar 
  },
  { 
    id: 'others', 
    number: '04', 
    title: 'Others & PPT', 
    subtitle: 'Files & Notes', 
    icon: FileText 
  },
];

export default function MIVInputForm({ editData, initialFormType = 'initiative', onSuccess, onCancel, triggerNotification }) {
  const [formType, setFormType] = useState(initialFormType || 'initiative'); // 'initiative' | 'meeting'
  const [activeSection, setActiveSection] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialFormType) {
      setFormType(initialFormType);
    }
  }, [initialFormType]);
  
  // Initiative Dropdowns
  const [initiativeList, setInitiativeList] = useState([]);
  const [initiativeNameList, setInitiativeNameList] = useState([]);
  const [initiativeMasterName, setInitiativeMasterName] = useState('');
  const [organisations, setOrganisations] = useState([]);

  // Initiative Form State
  const [formData, setFormData] = useState({
    initiativeID: '',
    initiativeName: '',
    projectDetails: '',
    totalCost: '',
    sourceOfFunding: [],
    category: '',
    statusOn: '',
    statusCurrent: '',
    physicalProgress: '',
    reasonsForDrop: '',
    reasonsForDelay: '',
    startDate: '',
    completionDate: '',
    actualDate: '',
    Feedback: '',
    Response: '',
  });

  const [supportDocFile, setSupportDocFile] = useState(null);
  const [pptFiles, setPptFiles] = useState([]);

  // Meeting Form State
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingOrgId, setMeetingOrgId] = useState('');
  const [meetingFile, setMeetingFile] = useState(null);
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  // Load Dropdowns
  useEffect(() => {
    const headers = authHeaders();

    // Fetch MIV New Initiatives list (public + fallback)
    axios.get(`${API}/miv-new-initiatives`, { headers })
      .then(res => {
        if (res.data && res.data.length > 0) {
          setInitiativeList(res.data);
        } else {
          return axios.get(`${API}/mmt-dropdown/mmt_new_initiatives`, { headers });
        }
      })
      .then(res => {
        if (res && res.data) setInitiativeList(res.data);
      })
      .catch(err => {
        console.error("Error loading initiative IDs:", err);
      });

    // Fetch Organisations
    axios.get(`${API}/mmt-dropdown/mmt_organisation`, { headers })
      .then(res => {
        setOrganisations(res.data || []);
        if (res.data && res.data.length > 0) {
          const userOrg = getSessionOrganisationId() || res.data[0].organisation_id;
          setMeetingOrgId(userOrg);
        }
      })
      .catch(() => {
        // Fallback organisations from meeting data
        axios.get(`${API}/miv-meetingsdata`, { headers })
          .then(res => {
            const list = (res.data || []).map(m => ({
              organisation_id: m.organisation_id,
              organisation_name: m.organisation_name
            }));
            setOrganisations(list);
            if (list.length > 0) setMeetingOrgId(list[0].organisation_id);
          })
          .catch(() => {});
      });
  }, []);

  // Populate when in Edit Mode
  useEffect(() => {
    if (editData) {
      setFormType('initiative');
      const parseDate = (d) => {
        if (!d) return '';
        try {
          const date = new Date(d);
          return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const sources = Array.isArray(editData.source_of_funding) 
        ? editData.source_of_funding 
        : (editData.source_of_funding ? String(editData.source_of_funding).split(',').map(s => s.trim()) : []);

      setFormData({
        initiativeID: editData.initiative_id || editData.initiativeID || '',
        initiativeName: editData.initiative_name || '',
        projectDetails: editData.project_detail || editData.projectDetails || '',
        totalCost: editData.total_cost || '',
        sourceOfFunding: sources,
        category: editData.category || '',
        statusOn: editData.status_on || '',
        statusCurrent: editData.status_current || '',
        physicalProgress: editData.physical_progress || '',
        reasonsForDrop: editData.reasons_for_drop || '',
        reasonsForDelay: editData.reasons_for_delay || '',
        startDate: parseDate(editData.start_date),
        completionDate: parseDate(editData.completion_date),
        actualDate: parseDate(editData.actual_date),
        Feedback: editData.feedback || editData.Feedback || '',
        Response: editData.response || editData.Response || '',
      });

      if (editData.initiative_id) {
        fetchActivityNames(editData.initiative_id);
      }
    }
  }, [editData]);

  // Fetch activities when Initiative ID changes
  const fetchActivityNames = (id) => {
    if (!id) return;
    axios.get(`${API}/get-initiative-name/${id}`, { headers: authHeaders() })
      .then(res => {
        setInitiativeNameList(res.data || []);
      })
      .catch((err) => {
        console.error("Error loading activities for initiative ID:", err);
        setInitiativeNameList([]);
      });
  };

  const handleInitiativeIdChange = (id) => {
    const matched = initiativeList.find(i => String(i.Initiaitive_ID) === String(id));
    setInitiativeMasterName(matched ? matched.Initiaitive_name : '');
    setFormData(prev => ({
      ...prev,
      initiativeID: id,
      initiativeName: '',
      completionDate: '',
    }));
    clearError('initiativeID');
    clearError('initiativeName');
    fetchActivityNames(id);
  };

  const handleActivityNameChange = (nameOrId) => {
    const matched = initiativeNameList.find(item => String(item.id) === String(nameOrId) || item.key_activity === nameOrId);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        initiativeName: matched.key_activity || nameOrId,
        completionDate: matched.target_date_of_completion ? matched.target_date_of_completion.slice(0, 10) : prev.completionDate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        initiativeName: nameOrId
      }));
    }
    clearError('initiativeName');
    if (matched?.target_date_of_completion) {
      clearError('completionDate');
    }
  };

  const handleFundingToggle = (funding) => {
    setFormData(prev => {
      const list = [...prev.sourceOfFunding];
      const index = list.indexOf(funding);
      if (index > -1) {
        list.splice(index, 1);
      } else {
        list.push(funding);
      }
      return { ...prev, sourceOfFunding: list };
    });
  };

  const isDelayed = (formData.statusCurrent || '').toLowerCase().includes('delayed');
  const isDropped = (formData.statusCurrent || '').toLowerCase().includes('dropped');
  const isUnderImpl = (formData.statusCurrent || '').toLowerCase().includes('under implementation');

  // Error validation state
  const [errors, setErrors] = useState({});

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Stage 1: General Details Validation
  const validateGeneralStage = () => {
    const errs = {};
    if (!formData.initiativeID) {
      errs.initiativeID = 'Initiative ID is required';
    }
    if (!formData.initiativeName || !formData.initiativeName.trim()) {
      errs.initiativeName = 'Initiative / Activity Name is required';
    }
    if (formData.totalCost === '' || formData.totalCost === undefined || formData.totalCost === null) {
      errs.totalCost = 'Total Cost is required';
    }
    if (!formData.category) {
      errs.category = 'Category is required';
    }

    if (Object.keys(errs).length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      const firstMsg = Object.values(errs)[0];
      triggerNotification?.(firstMsg);
      return false;
    }
    return true;
  };

  // Stage 2: Status & Progress Validation
  const validateStatusStage = () => {
    const errs = {};
    if (!formData.statusOn) {
      errs.statusOn = 'Status As on 1st April 2023 is required';
    }
    if (!formData.statusCurrent) {
      errs.statusCurrent = 'Current Status is required';
    }
    if (isDelayed && (!formData.reasonsForDelay || !formData.reasonsForDelay.trim())) {
      errs.reasonsForDelay = 'Reason for Delay is required for delayed initiatives';
    }
    if (isDropped && (!formData.reasonsForDrop || !formData.reasonsForDrop.trim())) {
      errs.reasonsForDrop = 'Reason for Dropped is required for dropped initiatives';
    }

    if (Object.keys(errs).length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      const firstMsg = Object.values(errs)[0];
      triggerNotification?.(firstMsg);
      return false;
    }
    return true;
  };

  // Stage 3: Timelines Validation
  const validateTimelinesStage = () => {
    const errs = {};
    if (!formData.completionDate) {
      errs.completionDate = 'Target Date of Completion is required';
    }
    if (!formData.actualDate) {
      errs.actualDate = 'Expected / Actual Date of Completion is required';
    }

    if (Object.keys(errs).length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      const firstMsg = Object.values(errs)[0];
      triggerNotification?.(firstMsg);
      return false;
    }
    return true;
  };

  // Stage Navigation Controller with Mandatory Field Validation
  const handleNavigateToStage = (targetStageId) => {
    if (targetStageId === activeSection) return;

    const stageOrder = ['general', 'status', 'timelines', 'others'];
    const targetIndex = stageOrder.indexOf(targetStageId);

    // If moving forward to Stage 2, 3, or 4 -> Stage 1 must be valid
    if (targetIndex >= 1) {
      if (!validateGeneralStage()) {
        setActiveSection('general');
        return;
      }
    }

    // If moving forward to Stage 3 or 4 -> Stage 2 must also be valid
    if (targetIndex >= 2) {
      if (!validateStatusStage()) {
        setActiveSection('status');
        return;
      }
    }

    // If moving forward to Stage 4 -> Stage 3 must also be valid
    if (targetIndex >= 3) {
      if (!validateTimelinesStage()) {
        setActiveSection('timelines');
        return;
      }
    }

    setActiveSection(targetStageId);
  };

  // Stage validation status checks for progress badges
  const isGeneralValid = Boolean(
    formData.initiativeID &&
    formData.initiativeName &&
    (formData.totalCost !== '' && formData.totalCost !== undefined && formData.totalCost !== null) &&
    formData.category
  );
  const isStatusValid = Boolean(
    formData.statusOn &&
    formData.statusCurrent &&
    (!isDelayed || (formData.reasonsForDelay && formData.reasonsForDelay.trim())) &&
    (!isDropped || (formData.reasonsForDrop && formData.reasonsForDrop.trim()))
  );
  const isTimelinesValid = Boolean(formData.completionDate && formData.actualDate);
  const isOthersValid = Boolean(formData.Feedback || formData.Response || pptFiles.length > 0);

  const stageProgress = {
    general: isGeneralValid,
    status: isStatusValid,
    timelines: isTimelinesValid,
    others: isOthersValid,
  };

  const completedCount = Object.values(stageProgress).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  // Submit Initiative Form
  const handleSubmitInitiative = async (e) => {
    if (e) e.preventDefault();

    // Comprehensive multi-stage check before submission
    if (!validateGeneralStage()) {
      setActiveSection('general');
      return;
    }
    if (!validateStatusStage()) {
      setActiveSection('status');
      return;
    }
    if (!validateTimelinesStage()) {
      setActiveSection('timelines');
      return;
    }

    setSubmitting(true);
    try {
      const payloadData = {
        organisationID: getSessionOrganisationId() || 1,
        initiativeID: formData.initiativeID,
        initiativeName: formData.initiativeName,
        projectDetail: formData.projectDetails || '',
        totalCost: Number(formData.totalCost) || 0,
        category: formData.category,
        sourceOfFunding: Array.isArray(formData.sourceOfFunding) ? formData.sourceOfFunding.join(', ') : (formData.sourceOfFunding || ''),
        statusOn: formData.statusOn,
        statusCurrent: formData.statusCurrent,
        physicalProgress: formData.physicalProgress || 0,
        reasonsForDrop: formData.reasonsForDrop || '',
        reasonsForDelay: formData.reasonsForDelay || '',
        startDate: formData.startDate || null,
        completionDate: formData.completionDate || null,
        actualDate: formData.actualDate || null,
        Feedback: formData.Feedback || '',
        Response: formData.Response || '',
        OutcomesRemarks: formData.OutcomesRemarks || '',
        userID: getCurrentUserId() || 1
      };

      let createdOrUpdatedId = (editData && (editData.ID || editData.id)) ? (editData.ID || editData.id) : null;

      if (createdOrUpdatedId) {
        await axios.put(`${API}/miv-data/${createdOrUpdatedId}`, payloadData, {
          headers: authHeaders()
        });
        triggerNotification?.("Initiative updated successfully!");
      } else {
        const res = await axios.post(`${API}/miv-data`, payloadData, {
          headers: authHeaders()
        });
        triggerNotification?.("Initiative created successfully!");
        if (res.data && res.data.ID) {
          createdOrUpdatedId = res.data.ID;
        }
      }

      // If PPT files or supporting documents were attached, upload them
      if ((pptFiles && pptFiles.length > 0) || supportDocFile) {
        try {
          const filesPayload = new FormData();
          filesPayload.append('ID', createdOrUpdatedId || -1);
          if (supportDocFile) {
            filesPayload.append('supportDocument', supportDocFile);
          }
          if (pptFiles && pptFiles.length > 0) {
            for (let i = 0; i < pptFiles.length; i++) {
              filesPayload.append('latestImage', pptFiles[i]);
            }
          }
          await axios.post(`${API}/miv-data/upload-files`, filesPayload, {
            headers: {
              ...authHeaders(),
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (fileErr) {
          console.error("Error uploading attachments:", fileErr);
        }
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error saving initiative:", err);
      triggerNotification?.("Failed to save initiative. Please check required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit MVIC Meeting Form
  const handleSubmitMeeting = async (e) => {
    if (e) e.preventDefault();

    if (!meetingDate) {
      triggerNotification?.("Please specify the date of the meeting.");
      return;
    }
    if (!meetingOrgId) {
      triggerNotification?.("Please select an organisation.");
      return;
    }

    setSubmittingMeeting(true);
    try {
      const payload = new FormData();
      payload.append('date_of_upload', meetingDate);
      payload.append('organisationID', meetingOrgId);
      if (meetingFile) {
        payload.append('file', meetingFile);
      }

      await axios.post(`${API}/meeting`, payload, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      triggerNotification?.("MVIC Meeting document registered successfully!");
      setMeetingDate('');
      setMeetingFile(null);
      onSuccess?.();
    } catch (err) {
      console.error("Error adding meeting:", err);
      triggerNotification?.("Failed to register meeting. Please try again.");
    } finally {
      setSubmittingMeeting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative pb-10">
      
      {/* Sub-Tabs: ADD INITIATIVE vs ADD MVIC MEETING */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
        <button
          type="button"
          onClick={() => setFormType('initiative')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            formType === 'initiative'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>ADD INITIATIVE</span>
        </button>

        <button
          type="button"
          onClick={() => setFormType('meeting')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            formType === 'meeting'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>ADD MVIC MEETING</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* 1. ADD INITIATIVE FORM */}
      {/* ==================================================== */}
      {formType === 'initiative' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800 animate-fade-in">
          
          {/* ==================================================== */}
          {/* EXECUTIVE CLEAN & MODERN STAGE STEPPER */}
          {/* ==================================================== */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-slate-100 dark:border-slate-800/80 pb-5">
            
            {/* Left: Back Button + Title + Status */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                title="Back to List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display whitespace-nowrap">
                    {editData ? 'Edit Initiative' : 'Add Initiative'}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono">
                    Stage {activeSection === 'general' ? '1' : activeSection === 'status' ? '2' : activeSection === 'timelines' ? '3' : '4'} of 4
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                  Register a new MIV 2030 strategic activity under your port/organisation.
                </p>
              </div>
            </div>

            {/* Right: Clean Segmented Stepper Track */}
            <div className="flex-1 min-w-0 max-w-full xl:max-w-3xl">
              <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-1.5 shadow-inner">
                {INITIATIVE_STAGES.map((stage) => {
                  const Icon = stage.icon;
                  const isActive = activeSection === stage.id;
                  const isCompleted = stageProgress[stage.id];

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleNavigateToStage(stage.id)}
                      className={`relative min-w-0 flex items-center space-x-2 px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer text-left overflow-hidden ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-[#0f417a] dark:text-blue-400 shadow-md ring-1 ring-slate-200/90 dark:ring-slate-700'
                          : isCompleted
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:text-slate-800'
                      }`}
                    >
                      {/* Step Number or Checkmark */}
                      <div
                        className={`flex items-center justify-center h-6 w-6 rounded-lg text-[10px] font-black shrink-0 transition-all ${
                          isActive
                            ? 'bg-[#0f417a] dark:bg-blue-600 text-white shadow-sm font-mono'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 font-mono'
                        }`}
                      >
                        {isCompleted && !isActive ? (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        ) : (
                          stage.number
                        )}
                      </div>

                      {/* Title & Subtitle */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <span className={`text-[11px] font-black truncate block leading-tight ${
                          isActive ? 'text-[#0f417a] dark:text-blue-400' : isCompleted ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {stage.title}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate block mt-0.5">
                          {isCompleted ? '✓ Done' : stage.subtitle}
                        </span>
                      </div>

                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0f417a] dark:bg-blue-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Stage 1: General Details */}
          {activeSection === 'general' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Initiative ID */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Initiative ID <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      required
                      value={formData.initiativeID}
                      onChange={(e) => handleInitiativeIdChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                        errors.initiativeID ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <option value="" disabled>-- Select Initiative ID --</option>
                      {initiativeList.map((item, idx) => (
                        <option key={idx} value={item.Initiaitive_ID}>
                          {item.Initiaitive_ID}
                        </option>
                      ))}
                      {formData.initiativeID && !initiativeList.some(i => String(i.Initiaitive_ID) === String(formData.initiativeID)) && (
                        <option value={formData.initiativeID}>{formData.initiativeID}</option>
                      )}
                    </select>
                    {errors.initiativeID && (
                      <p className="text-[11px] text-rose-500 font-semibold">{errors.initiativeID}</p>
                    )}

                    {initiativeMasterName && (
                      <input
                        type="text"
                        disabled
                        value={initiativeMasterName}
                        className="w-full px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* Sub Activity / Sub Project Details */}
                <div className="md:row-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Sub Activity / Sub Project Details
                  </label>
                  <textarea
                    rows={5}
                    maxLength={200}
                    placeholder="Enter specific milestones, scope, or sub-deliverables..."
                    value={formData.projectDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectDetails: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 block text-right mt-1">
                    {(formData.projectDetails || '').length}/200 characters
                  </span>
                </div>

                {/* Initiative / Activity Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Initiative / Activity Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {initiativeNameList.length > 0 ? (
                    <select
                      required
                      value={formData.initiativeName}
                      onChange={(e) => handleActivityNameChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                        errors.initiativeName ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <option value="" disabled>-- Select Initiative Name --</option>
                      {initiativeNameList.map((act, idx) => (
                        <option key={idx} value={act.key_activity}>
                          {act.key_activity}
                        </option>
                      ))}
                      {formData.initiativeName && (
                        <option value={formData.initiativeName}>{formData.initiativeName}</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="-- Enter Initiative Name --"
                      value={formData.initiativeName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, initiativeName: e.target.value }));
                        clearError('initiativeName');
                      }}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                        errors.initiativeName ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  )}
                  {errors.initiativeName && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.initiativeName}</p>
                  )}
                </div>

                {/* Total Cost */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Total Cost (in Cr.) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.totalCost}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, totalCost: e.target.value }));
                        clearError('totalCost');
                      }}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                        errors.totalCost ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">₹ Cr</span>
                  </div>
                  {errors.totalCost && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.totalCost}</p>
                  )}
                </div>

                {/* Source of Funding */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Source of Funding
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {FUNDING_OPTIONS.map((f, i) => {
                        const isSelected = formData.sourceOfFunding.includes(f);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleFundingToggle(f)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                    <small className="text-[10px] text-slate-400 block italic">
                      You can select multiple sources of funding
                    </small>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Category <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, category: e.target.value }));
                      clearError('category');
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 capitalize ${
                      errors.category ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="" disabled>-- Select Category --</option>
                    {CATEGORY_OPTIONS.map((c, i) => (
                      <option key={i} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.category}</p>
                  )}
                </div>

              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 italic">
                  * Fields marked with red asterisk are mandatory
                </span>
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('status')}
                  className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>Proceed to Status</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 2: Status */}
          {activeSection === 'status' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Status As On 1st April 2023 */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Status As on 1st April 2023 <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={formData.statusOn}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, statusOn: e.target.value }));
                      clearError('statusOn');
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                      errors.statusOn ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="" disabled>-- Select Status --</option>
                    {STATUS_OPTIONS.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.statusOn && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.statusOn}</p>
                  )}
                </div>

                {/* Current Status */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Current Status <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={formData.statusCurrent}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, statusCurrent: e.target.value }));
                      clearError('statusCurrent');
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                      errors.statusCurrent ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="" disabled>-- Select Current Status --</option>
                    {STATUS_OPTIONS.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.statusCurrent && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.statusCurrent}</p>
                  )}
                </div>

                {/* Conditional: Physical Progress */}
                {isUnderImpl && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Physical Progress (In Percentage)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formData.physicalProgress}
                        onChange={(e) => setFormData(prev => ({ ...prev, physicalProgress: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                )}

                {/* Conditional: Reasons for Dropped */}
                {isDropped && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Reasons for Dropped <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={200}
                      placeholder="Explain why this initiative was dropped..."
                      value={formData.reasonsForDrop}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, reasonsForDrop: e.target.value }));
                        clearError('reasonsForDrop');
                      }}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                        errors.reasonsForDrop ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {errors.reasonsForDrop && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.reasonsForDrop}</p>
                    )}
                  </div>
                )}

                {/* Conditional: Reasons for Delay */}
                {isDelayed && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Reasons for Delay (if Any) / Brief Status (Not more than 200 words) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <textarea
                        rows={3}
                        maxLength={200}
                        placeholder="Describe bottlenecks, approvals, land acquisition, or contractor issues..."
                        value={formData.reasonsForDelay}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, reasonsForDelay: e.target.value }));
                          clearError('reasonsForDelay');
                        }}
                        className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                          errors.reasonsForDelay ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {errors.reasonsForDelay && (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.reasonsForDelay}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Support Document (If Any)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setSupportDocFile(e.target.files[0])}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      <small className="text-[10px] text-slate-400 block mt-1">
                        Allows only PDF files (Maximum file size is 20MB)
                      </small>
                    </div>
                  </>
                )}

              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('general')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  ← Previous Stage
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('timelines')}
                  className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>Proceed to Timelines</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Timelines */}
          {activeSection === 'timelines' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Start Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Start Date of Initiative
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Target Date as per MIV 2030 document */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Target Date of Completion as per MIV 2030 document <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.completionDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, completionDate: e.target.value }));
                      clearError('completionDate');
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                      errors.completionDate ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {errors.completionDate && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.completionDate}</p>
                  )}
                </div>

                {/* Expected/Actual Date of Completion */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Expected/Actual Date of Completion <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.actualDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, actualDate: e.target.value }));
                      clearError('actualDate');
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 ${
                      errors.actualDate ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {errors.actualDate && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.actualDate}</p>
                  )}
                </div>

              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('status')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  ← Previous Stage
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateToStage('others')}
                  className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>Proceed to Others</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 4: Others */}
          {activeSection === 'others' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Feedback */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Feedback
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    placeholder="Enter feedback or review observations..."
                    value={formData.Feedback}
                    onChange={(e) => setFormData(prev => ({ ...prev, Feedback: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Response */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Response
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    placeholder="Enter action taken or port response..."
                    value={formData.Response}
                    onChange={(e) => setFormData(prev => ({ ...prev, Response: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Recent Executive Summary & PPT */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Recent Executive Summary & PPT of Initiative
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx"
                    onChange={(e) => setPptFiles(e.target.files)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <small className="text-[10px] text-slate-400 block mt-1">
                    Multiple files can be uploaded (Maximum file size is 20MB)
                  </small>
                </div>

              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('timelines')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  ← Previous Stage
                </button>
                <button
                  type="button"
                  onClick={handleSubmitInitiative}
                  disabled={submitting}
                  className="flex items-center space-x-2 px-8 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Initiative'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* 2. ADD MVIC MEETING FORM */}
      {/* ==================================================== */}
      {formType === 'meeting' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800 animate-fade-in">
          
          {/* Header Row */}
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
              title="Back to List"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
                Add MVIC Meeting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload Minutes of Meeting (MoM) and documentation for Maritime India Vision Coordination.
              </p>
            </div>
          </div>

          {/* Meeting Form Content */}
          <form onSubmit={handleSubmitMeeting} className="space-y-6">
            
            {/* 2-Column Responsive Layout: Left Fields & Right File Dropzone */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (5 cols): Date & Organisation stacked */}
              <div className="lg:col-span-5 space-y-5">
                {/* Date of Meeting */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Date of Meeting <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 shadow-sm"
                  />
                </div>

                {/* Organisation */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Organisation / Port <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={meetingOrgId}
                    onChange={(e) => setMeetingOrgId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 shadow-sm"
                  >
                    <option value="" disabled>-- Select Organisation --</option>
                    {organisations.map((org) => (
                      <option key={org.organisation_id} value={org.organisation_id}>
                        {org.organisation_name || org.organisation_label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column (7 cols): MoM Document Uploader */}
              <div className="lg:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Minutes of Meeting (MoM) Document (.pdf only) <span className="text-rose-500 font-bold">*</span>
                </label>

                <div className="p-6 bg-slate-50/60 dark:bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center hover:border-blue-400 transition-colors">
                  <div className="mx-auto w-10 h-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                    Upload Signed Minutes of Meeting Document (.pdf only)
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3 max-w-md mx-auto">
                    Attach the official signed minutes PDF for documentation and auditing (Max: 20MB)
                  </p>

                  <div className="inline-block">
                    <label className="cursor-pointer inline-flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
                      <Upload className="h-4 w-4" />
                      <span>Choose PDF File</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setMeetingFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {meetingFile && (
                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl inline-flex items-center space-x-3 text-left">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate max-w-[280px]">
                          {meetingFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {(meetingFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMeetingFile(null)}
                        className="p-1 hover:bg-emerald-200/50 rounded-lg text-emerald-700 dark:text-emerald-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 italic">
                * All marked fields are mandatory for meeting documentation
              </span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMeeting}
                  className="flex items-center space-x-2 px-8 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>{submittingMeeting ? 'Uploading...' : 'Submit Meeting'}</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
