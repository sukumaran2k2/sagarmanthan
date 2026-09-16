import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Building2, Calendar, DollarSign, 
  FileText, CheckCircle2, AlertTriangle, Layers, Upload, 
  Users, Sparkles, X, ChevronRight, Check, TrendingUp, ChevronLeft,
  Edit3, History, XCircle, Percent
} from 'lucide-react';
import { 
  submitGmisMouData, updateGmisMouData, uploadGmisDocument, 
  fetchOrganisations, fetchMouCategoryNames, fetchGmisNavicVibhas,
  fetchGmisMouDataById,
  addRevisedPhysicalProgressDate, addRevisedFinancialProgressDate,
  fetchRevisedPhysicalProgressDate, fetchRevisedFinancialProgressDate
} from '../api';

const EVENT_OPTIONS = [
  'GMIS 2025',
  'GMIS 2023',
  'GMIS 2021',
  'GMIS 2016',
  'IMW 2025'
];

const NATURE_OF_SECOND_PARTY_OPTIONS = [
  'National',
  'International',
  'Joint Venture',
  'State Govt / PSU',
  'Central Govt / Ministry',
  'Private / Industry',
  'Academic / Research',
  'Other'
];

const STATUS_OPTIONS = [
  'Under Implementation',
  'Completed',
  'Yet to Start',
  'Dropped'
];

const GMIS_STAGES = [
  { id: 'event', number: '01', title: 'Summit & Event', subtitle: 'Event & Org' },
  { id: 'scope', number: '02', title: 'Scope & Parties', subtitle: 'Stakeholder & Value' },
  { id: 'status', number: '03', title: 'Status & Progress', subtitle: 'Progress & Milestones' },
  { id: 'document', number: '04', title: 'MoU Document', subtitle: 'Attachment & Submit' },
];

export default function GMISInputForm({
  editData: editDataProp,
  onSuccess,
  onCancel,
  triggerNotification
}) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [editData, setEditData] = useState(editDataProp || location.state?.item || null);
  const [organisations, setOrganisations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [navicList, setNavicList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(editData?.document_uploader || editData?.gmisDocumentFileName || '');
  const [activeSection, setActiveSection] = useState('event');

  // Revision & History Modal States
  const [historyModalType, setHistoryModalType] = useState(null); // 'physical' | 'financial' | null
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [reviseModalType, setReviseModalType] = useState(null); // 'physical' | 'financial' | null
  const [reviseForm, setReviseForm] = useState({ date: '', percentage: '' });
  const [savingRevision, setSavingRevision] = useState(false);

  const isEditMode = Boolean(editData && (editData.id || editData.mouID || editData.mou_id));

  // If URL has /edit/:mouId and editData is not yet loaded, fetch by ID
  useEffect(() => {
    if (params?.mouId && !editData) {
      fetchGmisMouDataById(params.mouId)
        .then(res => {
          const item = Array.isArray(res.data) ? res.data[0] : res.data;
          if (item) setEditData(item);
        })
        .catch(err => console.warn('Failed to load MoU by ID:', err));
    }
  }, [params?.mouId, editData]);

  // Keep internal editData in sync if prop changes
  useEffect(() => {
    if (editDataProp) {
      setEditData(editDataProp);
    }
  }, [editDataProp]);

  // Form State with exact field names matching image
  const [formData, setFormData] = useState({
    mouID: editData?.id || editData?.mouID || editData?.mou_id || null,
    eventName: editData?.event_name || editData?.eventName || '',
    organisationName: editData?.organisation_id || editData?.organisationId || editData?.organisationName || '',
    firstPartyName: editData?.name_of_first_party || editData?.firstPartyName || '',
    stakeholderName: editData?.name_of_second_party || editData?.stakeholderName || '',
    natureOfSecondParty: editData?.nature_of_second_party || editData?.natureOfSecondParty || '',
    vibhasNavicID: editData?.navic_vibhas_id || editData?.vibhasNavicID || '',
    mouProjectName: editData?.name_of_mou || editData?.mouProjectName || '',
    mouCategory: editData?.mou_category_id || editData?.mouCategory || '',
    amount: editData?.amount !== undefined && editData?.amount !== null ? String(editData.amount) : '',
    presentStatus: editData?.present_status || editData?.presentStatus || '',
    revisedAmount: editData?.revised_amount !== undefined && editData?.revised_amount !== null ? String(editData.revised_amount) : (editData?.revisedAmount ? String(editData.revisedAmount) : ''),
    physicalProgressDate: editData?.physical_progress_date ? String(editData.physical_progress_date).substring(0, 10) : (editData?.physicalProgressDate ? String(editData.physicalProgressDate).substring(0, 10) : ''),
    physicalPercentage: editData?.physical_progress_percentage !== undefined && editData?.physical_progress_percentage !== null ? String(editData.physical_progress_percentage) : (editData?.physicalPercentage !== undefined ? String(editData.physicalPercentage) : ''),
    financialProgressDate: editData?.financial_progress_date ? String(editData.financial_progress_date).substring(0, 10) : (editData?.financialProgressDate ? String(editData.financialProgressDate).substring(0, 10) : ''),
    financialPercentage: editData?.financial_progress_percentage !== undefined && editData?.financial_progress_percentage !== null ? String(editData.financial_progress_percentage) : (editData?.financialPercentage !== undefined ? String(editData.financialPercentage) : ''),
    detailedRemarks: editData?.remark_or_detailed_status || editData?.detailedRemarks || '',
    mouBrief: editData?.mou_brief || editData?.mouBrief || '',
    nextSteps: editData?.next_steps || editData?.nextSteps || '',
    reasonForDropping: editData?.reason_for_dropping || editData?.reasonForDropping || '',
  });

  // Re-sync form state whenever editData prop updates
  useEffect(() => {
    if (editData) {
      setFormData({
        mouID: editData.id || editData.mouID || editData.mou_id || null,
        eventName: editData.event_name || editData.eventName || '',
        organisationName: editData.organisation_id || editData.organisationId || editData.organisationName || '',
        firstPartyName: editData.name_of_first_party || editData.firstPartyName || '',
        stakeholderName: editData.name_of_second_party || editData.stakeholderName || '',
        natureOfSecondParty: editData.nature_of_second_party || editData.natureOfSecondParty || '',
        vibhasNavicID: editData.navic_vibhas_id || editData.vibhasNavicID || '',
        mouProjectName: editData.name_of_mou || editData.mouProjectName || '',
        mouCategory: editData.mou_category_id || editData.mouCategory || '',
        amount: editData.amount !== undefined && editData.amount !== null ? String(editData.amount) : '',
        presentStatus: editData.present_status || editData.presentStatus || '',
        revisedAmount: editData.revised_amount !== undefined && editData.revised_amount !== null ? String(editData.revised_amount) : (editData.revisedAmount ? String(editData.revisedAmount) : ''),
        physicalProgressDate: editData.physical_progress_date ? String(editData.physical_progress_date).substring(0, 10) : (editData.physicalProgressDate ? String(editData.physicalProgressDate).substring(0, 10) : ''),
        physicalPercentage: editData.physical_progress_percentage !== undefined && editData.physical_progress_percentage !== null ? String(editData.physical_progress_percentage) : (editData.physicalPercentage !== undefined ? String(editData.physicalPercentage) : ''),
        financialProgressDate: editData.financial_progress_date ? String(editData.financial_progress_date).substring(0, 10) : (editData.financialProgressDate ? String(editData.financialProgressDate).substring(0, 10) : ''),
        financialPercentage: editData.financial_progress_percentage !== undefined && editData.financial_progress_percentage !== null ? String(editData.financial_progress_percentage) : (editData.financialPercentage !== undefined ? String(editData.financialPercentage) : ''),
        detailedRemarks: editData.remark_or_detailed_status || editData.detailedRemarks || '',
        mouBrief: editData.mou_brief || editData.mouBrief || '',
        nextSteps: editData.next_steps || editData.nextSteps || '',
        reasonForDropping: editData.reason_for_dropping || editData.reasonForDropping || '',
      });
      setUploadedFileName(editData.document_uploader || editData.gmisDocumentFileName || '');
    } else {
      setFormData({
        mouID: null,
        eventName: '',
        organisationName: '',
        firstPartyName: '',
        stakeholderName: '',
        natureOfSecondParty: '',
        vibhasNavicID: '',
        mouProjectName: '',
        mouCategory: '',
        amount: '',
        presentStatus: '',
        revisedAmount: '',
        physicalProgressDate: '',
        physicalPercentage: '',
        financialProgressDate: '',
        financialPercentage: '',
        detailedRemarks: '',
        mouBrief: '',
        nextSteps: '',
        reasonForDropping: '',
      });
      setUploadedFileName('');
    }
  }, [editData]);

  const [errors, setErrors] = useState({});

  const stageProgress = {
    event: !!formData.eventName && !!formData.organisationName && !!formData.mouCategory && !!formData.vibhasNavicID,
    scope: !!formData.stakeholderName && !!formData.natureOfSecondParty && !!formData.mouProjectName && !!formData.amount,
    status: !!formData.presentStatus && !!formData.physicalProgressDate && formData.physicalPercentage !== '' && !!formData.financialProgressDate && formData.financialPercentage !== '',
    document: !!uploadedFileName,
  };

  useEffect(() => {
    fetchOrganisations()
      .then(res => { if (Array.isArray(res.data)) setOrganisations(res.data); })
      .catch(err => console.warn('Failed to load organisations:', err));

    fetchMouCategoryNames()
      .then(res => { if (Array.isArray(res.data)) setCategories(res.data); })
      .catch(err => console.warn('Failed to load categories:', err));

    fetchGmisNavicVibhas()
      .then(res => { if (Array.isArray(res.data)) setNavicList(res.data); })
      .catch(err => console.warn('Failed to load NAVIC cells:', err));
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      triggerNotification?.('File size exceeds 20 MB limit', 'warning');
      return;
    }

    const data = new FormData();
    data.append('file', file);
    setUploadingFile(true);

    try {
      const res = await uploadGmisDocument(data);
      const filename = res.data?.uniqueFileName || res.data?.filename || file.name;
      setUploadedFileName(filename);
      triggerNotification?.('MoU document uploaded successfully!', 'success');
    } catch (err) {
      console.error('File upload failed:', err);
      triggerNotification?.('Failed to upload MoU document', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenHistory = async (type) => {
    setHistoryModalType(type);
    const mouId = formData.mouID || editData?.id || editData?.mouID || editData?.mou_id;
    if (mouId) {
      setHistoryLoading(true);
      try {
        const fetchFn = type === 'physical' ? fetchRevisedPhysicalProgressDate : fetchRevisedFinancialProgressDate;
        const res = await fetchFn(mouId);
        const records = Array.isArray(res.data) ? res.data : [];
        if (records.length === 0) {
          const baseline = [];
          if (type === 'physical' && formData.physicalProgressDate) {
            baseline.push({
              revised_physical_progress_date: formData.physicalProgressDate,
              revised_physical_progress_percentage: formData.physicalPercentage,
              revised_on: editData?.updated_on || editData?.created_on || new Date().toISOString()
            });
          } else if (type === 'financial' && formData.financialProgressDate) {
            baseline.push({
              revised_financial_progress_date: formData.financialProgressDate,
              revised_financial_progress_percentage: formData.financialPercentage,
              revised_on: editData?.updated_on || editData?.created_on || new Date().toISOString()
            });
          }
          setHistoryData(baseline);
        } else {
          setHistoryData(records);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
        const baseline = [];
        if (type === 'physical' && formData.physicalProgressDate) {
          baseline.push({
            revised_physical_progress_date: formData.physicalProgressDate,
            revised_physical_progress_percentage: formData.physicalPercentage,
            revised_on: editData?.updated_on || editData?.created_on || new Date().toISOString()
          });
        } else if (type === 'financial' && formData.financialProgressDate) {
          baseline.push({
            revised_financial_progress_date: formData.financialProgressDate,
            revised_financial_progress_percentage: formData.financialPercentage,
            revised_on: editData?.updated_on || editData?.created_on || new Date().toISOString()
          });
        }
        setHistoryData(baseline);
      } finally {
        setHistoryLoading(false);
      }
    } else {
      const baseline = [];
      if (type === 'physical' && formData.physicalProgressDate) {
        baseline.push({
          revised_physical_progress_date: formData.physicalProgressDate,
          revised_physical_progress_percentage: formData.physicalPercentage,
          revised_on: new Date().toISOString()
        });
      } else if (type === 'financial' && formData.financialProgressDate) {
        baseline.push({
          revised_financial_progress_date: formData.financialProgressDate,
          revised_financial_progress_percentage: formData.financialPercentage,
          revised_on: new Date().toISOString()
        });
      }
      setHistoryData(baseline);
    }
  };

  const handleOpenRevise = (type) => {
    setReviseModalType(type);
    setReviseForm({
      date: type === 'physical' ? (formData.physicalProgressDate || '') : (formData.financialProgressDate || ''),
      percentage: type === 'physical' ? (formData.physicalPercentage || '') : (formData.financialPercentage || '')
    });
  };

  const handleSaveRevision = async () => {
    if (!reviseForm.date) {
      triggerNotification?.(`Please enter ${reviseModalType === 'physical' ? 'Physical' : 'Financial'} Progress Date`, 'warning');
      return;
    }
    if (reviseForm.percentage === '' || isNaN(Number(reviseForm.percentage)) || Number(reviseForm.percentage) < 0 || Number(reviseForm.percentage) > 100) {
      triggerNotification?.('Please enter a valid percentage between 0 and 100', 'warning');
      return;
    }

    const mouId = formData.mouID || editData?.id || editData?.mouID || editData?.mou_id;
    setSavingRevision(true);

    try {
      if (mouId) {
        if (reviseModalType === 'physical') {
          await addRevisedPhysicalProgressDate({
            mouID: mouId,
            targetphysicalProgressDate: reviseForm.date,
            targetphysicalPercentage: Number(reviseForm.percentage)
          });
        } else {
          await addRevisedFinancialProgressDate({
            mouID: mouId,
            targetfinancialProgressDate: reviseForm.date,
            targetfinancialPercentage: Number(reviseForm.percentage)
          });
        }
      }

      // Update parent form fields
      if (reviseModalType === 'physical') {
        handleChange('physicalProgressDate', reviseForm.date);
        handleChange('physicalPercentage', reviseForm.percentage);
        triggerNotification?.('Physical Progress revision saved successfully!', 'success');
      } else {
        handleChange('financialProgressDate', reviseForm.date);
        handleChange('financialPercentage', reviseForm.percentage);
        triggerNotification?.('Financial Progress revision saved successfully!', 'success');
      }

      setReviseModalType(null);
    } catch (err) {
      console.error('Failed to save revision:', err);
      triggerNotification?.('Failed to save progress revision', 'error');
    } finally {
      setSavingRevision(false);
    }
  };

  // Stage 1 Validation: Summit & Event
  const validateEventStage = () => {
    const stageErrors = {};
    if (!formData.eventName) stageErrors.eventName = 'Event Name is required';
    if (!formData.organisationName) stageErrors.organisationName = 'Organization Name is required';
    if (!formData.mouCategory) stageErrors.mouCategory = 'MoU Category/Industry is required';
    if (!formData.vibhasNavicID) stageErrors.vibhasNavicID = 'Relevant VIBHAS / NAVIC cell is required';
    
    if (Object.keys(stageErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stageErrors }));
      const count = Object.keys(stageErrors).length;
      const firstMsg = Object.values(stageErrors)[0];
      const warningMsg = count > 1 
        ? `Warning: Please fill all ${count} mandatory fields (*) in Stage 1 before proceeding.`
        : `Warning: ${firstMsg}`;
      triggerNotification?.(warningMsg, 'warning');
      return false;
    }
    return true;
  };

  // Stage 2 Validation: Scope & Parties
  const validateScopeStage = () => {
    const stageErrors = {};
    if (!formData.stakeholderName || !formData.stakeholderName.trim()) stageErrors.stakeholderName = 'Name of Stakeholder(s)/2nd Party is required';
    if (!formData.natureOfSecondParty) stageErrors.natureOfSecondParty = 'Nature of 2nd Party is required';
    if (!formData.mouProjectName || !formData.mouProjectName.trim()) stageErrors.mouProjectName = 'Name of MoU/Project is required';
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      stageErrors.amount = 'Amount (in Cr) is required';
    }
    
    if (Object.keys(stageErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stageErrors }));
      const count = Object.keys(stageErrors).length;
      const firstMsg = Object.values(stageErrors)[0];
      const warningMsg = count > 1 
        ? `Warning: Please fill all ${count} mandatory fields (*) in Stage 2 before proceeding.`
        : `Warning: ${firstMsg}`;
      triggerNotification?.(warningMsg, 'warning');
      return false;
    }
    return true;
  };

  // Stage 3 Validation: Status & Progress
  const validateStatusStage = () => {
    const stageErrors = {};
    if (!formData.presentStatus) stageErrors.presentStatus = 'Status of MoU is required';
    if (!formData.physicalProgressDate) stageErrors.physicalProgressDate = 'Physical Progress as on Date is required';
    if (formData.physicalPercentage === '' || formData.physicalPercentage === null || isNaN(Number(formData.physicalPercentage))) {
      stageErrors.physicalPercentage = 'Physical Progress (in %) is required';
    }
    if (!formData.financialProgressDate) stageErrors.financialProgressDate = 'Financial Progress as on Date is required';
    if (formData.financialPercentage === '' || formData.financialPercentage === null || isNaN(Number(formData.financialPercentage))) {
      stageErrors.financialPercentage = 'Financial Progress (in %) is required';
    }
    if (formData.presentStatus.toLowerCase().includes('dropped') && (!formData.reasonForDropping || !formData.reasonForDropping.trim())) {
      stageErrors.reasonForDropping = 'Reason for dropping is required';
    }

    if (Object.keys(stageErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stageErrors }));
      const count = Object.keys(stageErrors).length;
      const firstMsg = Object.values(stageErrors)[0];
      const warningMsg = count > 1 
        ? `Warning: Please fill all ${count} mandatory fields (*) in Stage 3 before proceeding.`
        : `Warning: ${firstMsg}`;
      triggerNotification?.(warningMsg, 'warning');
      return false;
    }
    return true;
  };

  const validateForm = () => {
    const isStage1Valid = validateEventStage();
    const isStage2Valid = validateScopeStage();
    const isStage3Valid = validateStatusStage();
    return isStage1Valid && isStage2Valid && isStage3Valid;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        mouID: formData.mouID || editData?.id || editData?.mouID || editData?.mou_id,
        gmisDocumentFileName: uploadedFileName,
        uniqueFileName: uploadedFileName,
        amount: Number(formData.amount),
        revisedAmount: formData.revisedAmount ? Number(formData.revisedAmount) : null,
        physicalPercentage: formData.physicalPercentage !== '' ? Number(formData.physicalPercentage) : null,
        financialPercentage: formData.financialPercentage !== '' ? Number(formData.financialPercentage) : null,
      };

      if (isEditMode) {
        await updateGmisMouData(payload);
        triggerNotification?.('MoU details updated successfully!', 'success');
      } else {
        await submitGmisMouData(payload);
        triggerNotification?.('New MoU details submitted successfully!', 'success');
      }

      onSuccess?.();
    } catch (err) {
      console.error('Submission failed:', err);
      triggerNotification?.('Failed to save MoU record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Stage Navigation Controller with Mandatory Field Validation
  const handleNavigateToStage = (targetStageId) => {
    const stageOrder = ['event', 'scope', 'status', 'document'];
    const currentIndex = stageOrder.indexOf(activeSection);
    const targetIndex = stageOrder.indexOf(targetStageId);

    // If navigating backwards, allow freely
    if (targetIndex < currentIndex) {
      setActiveSection(targetStageId);
      return;
    }

    // Moving forward to Scope (Stage 2) requires valid Stage 1
    if (targetIndex >= 1) {
      if (!validateEventStage()) {
        setActiveSection('event');
        return;
      }
    }

    // Moving forward to Status (Stage 3) requires valid Stage 2
    if (targetIndex >= 2) {
      if (!validateScopeStage()) {
        setActiveSection('scope');
        return;
      }
    }

    // Moving forward to Document (Stage 4) requires valid Stage 3
    if (targetIndex >= 3) {
      if (!validateStatusStage()) {
        setActiveSection('status');
        return;
      }
    }

    setActiveSection(targetStageId);
  };

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
              onClick={onCancel}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer backdrop-blur-sm border border-white/10"
              title="Back to List"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase font-display text-white whitespace-nowrap">
                {editData ? 'Update MoU Details' : 'Add MoU Details'}
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
                <div className="absolute top-[14px] md:top-[16px] left-[12%] right-[12%] h-1.5 bg-white/20 rounded-full -translate-y-1/2 z-0" />
                
                {/* Completed Green Progress Fill Line */}
                <div
                  className="absolute top-[14px] md:top-[16px] left-[12%] h-1.5 bg-emerald-400 rounded-full -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                  style={{
                    width: `${(GMIS_STAGES.findIndex(s => s.id === activeSection) / (GMIS_STAGES.length - 1)) * 76}%`
                  }}
                />

                {/* Step Nodes Grid */}
                <div className="relative z-10 w-full grid grid-cols-4 items-start">
                  {GMIS_STAGES.map((stage, idx) => {
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
                              : 'bg-white/15 text-white/50 border border-white/20 backdrop-blur-md hover:bg-white/25 hover:text-white'
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
                          <span className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight transition-colors truncate max-w-[85px] sm:max-w-none ${
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
              Stage {activeSection === 'event' ? '1' : activeSection === 'scope' ? '2' : activeSection === 'status' ? '3' : '4'} of 4
            </span>
          </div>

        </div>

      </div>

      {/* Form Content Body */}
      <div className="p-6 space-y-6">

        {/* ==================================================== */}
        {/* Stage 1: Summit & Event Details */}
        {/* ==================================================== */}
        {activeSection === 'event' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>1. Summit & Event Details</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the international summit, primary lead organisation, MoU category, and NAVIC cell.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Event Name<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.eventName}
                    onChange={(e) => handleChange('eventName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.eventName ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Event--</option>
                    {EVENT_OPTIONS.map((ev, i) => (
                      <option key={i} value={ev}>{ev}</option>
                    ))}
                  </select>
                  {formData.eventName && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.eventName && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.eventName}</p>}
              </div>

              {/* Organization Name/Name of 1st Party */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Organization Name/Name of 1st Party<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.organisationName}
                    onChange={(e) => handleChange('organisationName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.organisationName ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Organization Name--</option>
                    {organisations.map((org, i) => (
                      <option key={i} value={org.organisation_id || org.id}>
                        {org.organisation_name || org.organisation_label || org}
                      </option>
                    ))}
                  </select>
                  {formData.organisationName && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.organisationName && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.organisationName}</p>}
              </div>

              {/* MoU Category/Industry */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  MoU Category/Industry<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.mouCategory}
                    onChange={(e) => handleChange('mouCategory', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.mouCategory ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select MoU Category--</option>
                    {categories.map((c, i) => (
                      <option key={i} value={c.mou_category_id || c.id || c.mou_category_name}>
                        {c.mou_category_name || c}
                      </option>
                    ))}
                  </select>
                  {formData.mouCategory && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.mouCategory && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.mouCategory}</p>}
              </div>

              {/* Relevant VIBHAS / NAVIC cell */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Relevant VIBHAS / NAVIC cell<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.vibhasNavicID}
                    onChange={(e) => handleChange('vibhasNavicID', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.vibhasNavicID ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Vibhas / Navic--</option>
                    {navicList.map((n, i) => (
                      <option key={i} value={n.id || n.navic_vibhas_id || n.navic_name}>
                        {n.navic_name || n}
                      </option>
                    ))}
                  </select>
                  {formData.vibhasNavicID && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.vibhasNavicID && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.vibhasNavicID}</p>}
              </div>

            </div>

            {/* Stage 1 Footer Navigation */}
            <div className="flex items-center justify-end pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleNavigateToStage('scope')}
                className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
              >
                <span>Next Stage (Scope & Parties)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Stage 2: Scope & Stakeholder Parties */}
        {/* ==================================================== */}
        {activeSection === 'scope' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>2. Scope & Stakeholder Parties</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the MoU project name, 2nd party partner, nature of 2nd party, and investment amount.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Name of Stakeholder(s)/2nd Party */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Name of Stakeholder(s)/2nd Party<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.stakeholderName}
                    onChange={(e) => handleChange('stakeholderName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                      errors.stakeholderName ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {formData.stakeholderName && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.stakeholderName && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.stakeholderName}</p>}
              </div>

              {/* Nature of 2nd Party */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Nature of 2nd Party<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.natureOfSecondParty}
                    onChange={(e) => handleChange('natureOfSecondParty', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.natureOfSecondParty ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Nature--</option>
                    {NATURE_OF_SECOND_PARTY_OPTIONS.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {formData.natureOfSecondParty && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.natureOfSecondParty && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.natureOfSecondParty}</p>}
              </div>

              {/* Name of MoU/Project */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Name of MoU/Project<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.mouProjectName}
                    onChange={(e) => handleChange('mouProjectName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                      errors.mouProjectName ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {formData.mouProjectName && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.mouProjectName && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.mouProjectName}</p>}
              </div>

              {/* Amount (in Cr) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Amount (in Cr)<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                      errors.amount ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {formData.amount && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.amount && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.amount}</p>}
              </div>

              {/* Revised Amount (in Cr) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Revised Amount (in Cr)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.revisedAmount}
                    onChange={(e) => handleChange('revisedAmount', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9"
                  />
                  {formData.revisedAmount && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* MoU Brief (if any) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  MoU Brief (if any)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={formData.mouBrief}
                    onChange={(e) => handleChange('mouBrief', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 resize-none"
                  />
                  {formData.mouBrief && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>

            </div>

            {/* Stage 2 Footer Navigation */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('event')}
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Stage</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigateToStage('status')}
                className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
              >
                <span>Next Stage (Status & Progress)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Stage 3: Present Status & Progress Milestones */}
        {/* ==================================================== */}
        {activeSection === 'status' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>3. Present Status & Progress Milestones</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record current implementation status, physical/financial completion percentages, and milestone dates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Status of MoU */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Status of MoU<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.presentStatus}
                    onChange={(e) => handleChange('presentStatus', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-9 ${
                      errors.presentStatus ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Status of MOU--</option>
                    {STATUS_OPTIONS.map((st, i) => (
                      <option key={i} value={st}>{st}</option>
                    ))}
                  </select>
                  {formData.presentStatus && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.presentStatus && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.presentStatus}</p>}
              </div>

              {/* Physical Progress as on Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Physical Progress as on Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={formData.physicalProgressDate}
                      onChange={(e) => handleChange('physicalProgressDate', e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                        errors.physicalProgressDate ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    {formData.physicalProgressDate && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                    )}
                  </div>
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenRevise('physical')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#172554] rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        title="Revise Physical Progress"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Revise</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenHistory('physical')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        title="Physical Progress Revision History"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>History</span>
                      </button>
                    </>
                  )}
                </div>
                {errors.physicalProgressDate && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.physicalProgressDate}</p>}
              </div>

              {/* Physical Progress (in %) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Physical Progress (in %)<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.physicalPercentage}
                    onChange={(e) => handleChange('physicalPercentage', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                      errors.physicalPercentage ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {formData.physicalPercentage !== '' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.physicalPercentage && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.physicalPercentage}</p>}
              </div>

              {/* Financial Progress as on Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Financial Progress as on Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={formData.financialProgressDate}
                      onChange={(e) => handleChange('financialProgressDate', e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                        errors.financialProgressDate ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    {formData.financialProgressDate && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                    )}
                  </div>
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenRevise('financial')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#172554] rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        title="Revise Financial Progress"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Revise</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenHistory('financial')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        title="Financial Progress Revision History"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>History</span>
                      </button>
                    </>
                  )}
                </div>
                {errors.financialProgressDate && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.financialProgressDate}</p>}
              </div>

              {/* Financial Progress (in %) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Financial Progress (in %)<span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.financialPercentage}
                    onChange={(e) => handleChange('financialPercentage', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 ${
                      errors.financialPercentage ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {formData.financialPercentage !== '' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
                {errors.financialPercentage && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.financialPercentage}</p>}
              </div>

              {/* Next Steps */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Next Steps
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.nextSteps}
                    onChange={(e) => handleChange('nextSteps', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9"
                  />
                  {formData.nextSteps && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>

            </div>

            {/* Remarks / Detailed Status */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Remarks / Detailed Status
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={formData.detailedRemarks}
                  onChange={(e) => handleChange('detailedRemarks', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pr-9 resize-none"
                />
                {formData.detailedRemarks && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Conditional Reason for Dropping */}
            {formData.presentStatus.toLowerCase().includes('dropped') && (
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-1">
                <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                  Reason for Dropping<span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.reasonForDropping}
                  onChange={(e) => handleChange('reasonForDropping', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                {errors.reasonForDropping && <p className="text-[11px] text-rose-600 font-semibold">{errors.reasonForDropping}</p>}
              </div>
            )}

            {/* Stage 3 Footer Navigation */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('scope')}
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Stage</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigateToStage('document')}
                className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
              >
                <span>Next Stage (MoU Document)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Stage 4: Signed MoU Document Attachment */}
        {/* ==================================================== */}
        {activeSection === 'document' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>4. Signed MoU Document Attachment</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload final signed agreement copy for ministry record verification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Upload MoU Document
              </label>
              
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between shadow-2xs">
                <label className="flex items-center gap-2 px-5 py-2 bg-[#0070ba] hover:bg-[#005c99] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>

                <span className="text-xs text-slate-400 font-medium select-none">
                  {uploadingFile ? 'Uploading...' : uploadedFileName ? `Attached: ${uploadedFileName}` : 'Drag & Drop Files'}
                </span>

                {uploadedFileName && (
                  <button
                    type="button"
                    onClick={() => setUploadedFileName('')}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    title="Remove uploaded file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 font-medium italic">
                NOTE: Only PDF and Microsoft Word documents files can be uploaded. File Size: Max. 20 MB.
              </p>
            </div>

            {/* Stage 4 Footer Navigation & Final Submit */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('status')}
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Stage</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 bg-[#dc3545] hover:bg-[#bb2d3b] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                >
                  Exit
                </button>
                
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center space-x-2 px-8 py-2.5 text-xs font-bold text-white bg-[#198754] hover:bg-[#157347] rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Saving...' : editData ? 'Update' : 'Submit'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* REVISION HISTORY MODAL (Matching Reference Image)    */}
      {/* ==================================================== */}
      {historyModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-scale-in">
            
            {/* Modal Blue Header */}
            <div className="bg-[#0070ba] px-6 py-3.5 flex items-center justify-between text-white select-none">
              <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                <History className="h-4 w-4" />
                <span>Revision History</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalType(null)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Table */}
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 w-16 text-center">Sl. No.</th>
                      <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-700">
                        {historyModalType === 'physical' ? 'Revised Physical Progress Date' : 'Revised Financial Progress Date'}
                      </th>
                      <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center">
                        {historyModalType === 'physical' ? 'Revised Physical Progress Percentage' : 'Revised Financial Progress Percentage'}
                      </th>
                      <th className="px-4 py-3 text-center">Revised On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-semibold">
                          Loading revision history records...
                        </td>
                      </tr>
                    ) : historyData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-semibold">
                          No revision history records found.
                        </td>
                      </tr>
                    ) : (
                      historyData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-center">{idx + 1}</td>
                          <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-semibold">
                            {historyModalType === 'physical'
                              ? (item.revised_physical_progress_date ? new Date(item.revised_physical_progress_date).toLocaleDateString('en-GB') : '-')
                              : (item.revised_financial_progress_date ? new Date(item.revised_financial_progress_date).toLocaleDateString('en-GB') : '-')}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-[#0f417a] dark:text-blue-400 text-center">
                            {historyModalType === 'physical'
                              ? `${item.revised_physical_progress_percentage !== null && item.revised_physical_progress_percentage !== undefined ? item.revised_physical_progress_percentage : '-'}%`
                              : `${item.revised_financial_progress_percentage !== null && item.revised_financial_progress_percentage !== undefined ? item.revised_financial_progress_percentage : '-'}%`}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px] text-center">
                            {item.revised_on ? new Date(item.revised_on).toLocaleString('en-GB') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Red Exit Button Matching Image */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryModalType(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#dc3545] hover:bg-[#bb2d3b] rounded-lg shadow-sm transition cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Exit</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REVISE MODAL                                         */}
      {/* ==================================================== */}
      {reviseModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-[#0070ba] px-6 py-3.5 flex items-center justify-between text-white select-none">
              <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                <span>
                  {reviseModalType === 'physical' ? 'Physical Progress as on Date' : 'Financial Progress as on Date'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setReviseModalType(null)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-6 space-y-4">
              
              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {reviseModalType === 'physical' ? 'Physical Progress Date' : 'Financial Progress Date'}<span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={reviseForm.date}
                  onChange={(e) => setReviseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="dd-mm-yyyy"
                />
              </div>

              {/* Percentage Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {reviseModalType === 'physical' ? 'Physical Progress %' : 'Financial Progress %'}<span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={reviseForm.percentage}
                  onChange={(e) => setReviseForm(prev => ({ ...prev, percentage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter percentage (0-100)"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviseModalType(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#dc3545] hover:bg-[#bb2d3b] rounded-xl shadow-sm transition cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Exit</span>
                </button>
                <button
                  type="button"
                  disabled={savingRevision}
                  onClick={handleSaveRevision}
                  className="inline-flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-[#198754] hover:bg-[#157347] rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingRevision ? 'Saving...' : 'Save Revision'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
