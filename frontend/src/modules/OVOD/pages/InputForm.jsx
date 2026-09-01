import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  FileText, 
  Calendar, 
  Info,
  CheckCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  Star,
  Clock,
  DollarSign
} from 'lucide-react';
import { 
  fetchOrganisations, 
  saveOvdB2B3Action, 
  updateOvdAction, 
  getUserIdFromToken 
} from '../api';
import { 
  OVOD_WINGS, 
  OVOD_VIBHAS, 
  OVOD_PRIORITIES,
  OVOD_STATUSES,
  MIV_CHAPTERS,
  MAKV_THEMES
} from '../utils/constants';

const CATEGORIES = [
  '--Select Category--',
  'HR/Capacity Building',
  'Institutional Reforms',
  'Infrastructure',
  'Process Improvement',
  'Digital Transformation',
  'Operations',
  'Policy & Governance',
  'Environmental & Green Ports',
  'Other'
];

const B2_STAGES = [
  { id: 'general', title: 'General Details', subtitle: 'Agency & Alignments', icon: Layers },
  { id: 'source', title: 'Source Document', subtitle: 'MIV, MAKV & SGoS', icon: FileText },
  { id: 'timelines', title: 'Timelines', subtitle: 'Vision & Dates', icon: Calendar }
];

const B3_STAGES = [
  { id: 'general', title: 'General & B3 Action', subtitle: 'Agency, B2 & B3', icon: Layers },
  { id: 'source', title: 'Source & Status', subtitle: 'MIV, MAKV & Stage', icon: FileText },
  { id: 'financials', title: 'Financials & Timelines', subtitle: 'Cost & Dates', icon: DollarSign }
];

const DEFAULT_ORGANISATIONS = [
  { organisation_id: 1, organisation_name: "Indian Maritime University" },
  { organisation_id: 2, organisation_name: "Jawaharlal Nehru Port Authority" },
  { organisation_id: 3, organisation_name: "Deendayal Port Authority" },
  { organisation_id: 4, organisation_name: "Paradip Port Authority" },
  { organisation_id: 5, organisation_name: "Chennai Port Authority" },
  { organisation_id: 6, organisation_name: "Cochin Port Authority" },
  { organisation_id: 7, organisation_name: "Syama Prasad Mookerjee Port Kolkata" },
  { organisation_id: 8, organisation_name: "Mumbai Port Authority" },
  { organisation_id: 9, organisation_name: "Visakhapatnam Port Authority" },
  { organisation_id: 10, organisation_name: "Mormugao Port Authority" },
  { organisation_id: 11, organisation_name: "New Mangalore Port Authority" },
  { organisation_id: 12, organisation_name: "V.O. Chidambaranar Port Authority" },
  { organisation_id: 13, organisation_name: "Kamarajar Port Limited" },
  { organisation_id: 14, organisation_name: "Inland Waterways Authority of India (IWAI)" },
  { organisation_id: 15, organisation_name: "Directorate General of Shipping (DGS)" },
  { organisation_id: 16, organisation_name: "Directorate General of Lighthouses and Lightships (DGLL)" },
  { organisation_id: 17, organisation_name: "Indian Register of Shipping (IRS)" },
  { organisation_id: 18, organisation_name: "Cochin Shipyard Limited (CSL)" },
  { organisation_id: 19, organisation_name: "Shipping Corporation of India (SCI)" },
  { organisation_id: 20, organisation_name: "Sagarmala Development Company Limited (SDCL)" },
  { organisation_id: 21, organisation_name: "Indian Port Association (IPA)" }
];

export default function InputForm({ 
  editData, 
  onSuccess, 
  onCancel, 
  triggerNotification 
}) {
  const [organisations, setOrganisations] = useState(DEFAULT_ORGANISATIONS);
  const [submitting, setSubmitting] = useState(false);

  // Level Selector: 'B2' (Intervention) or 'B3' (Actionable Item) - moved inside form
  const [level, setLevel] = useState('B2');

  // Active Stage in the Wizard ('general' | 'source' | 'timelines' / 'financials')
  const [activeStage, setActiveStage] = useState('general');

  // Form State
  const [formData, setFormData] = useState({
    // General Details (B2 & B3)
    organisation_id: '',
    goal_a1: '',
    intervention_a2: '',
    action_a3: '',
    goal_b1: '',
    intervention_b2: '',
    intervention_code_b2: '',
    action_b3: '',
    action_code_b3: '',
    category: '--Select Category--',
    wings: '0',
    priority: '0',
    vibhas: '0',

    // Source Document & Status
    is_miv_2030: 'No',
    miv_chapter: '0',
    is_makv_2047: 'No',
    makv_theme: '0',
    is_sgos_2: 'No',
    is_additional_items: 'No',
    is_gmis: 'No',
    current_status: 'Implementation - On time',
    remarks: '',

    // Timelines & Financials
    timeline_vision: '',
    expected_completion_date: '',
    total_cost: '',
    fund_spent: '',
    source_of_funding: 'Internal Resources',
    progress: '0',
    reason_delay: ''
  });

  // Load Organisations
  useEffect(() => {
    fetchOrganisations()
      .then(res => {
        const list = Array.isArray(res) && res.length > 0 ? res : (res?.data || []);
        if (list.length > 0) {
          setOrganisations(list);
        } else {
          setOrganisations(DEFAULT_ORGANISATIONS);
        }
      })
      .catch(() => setOrganisations(DEFAULT_ORGANISATIONS));
  }, []);

  // Populate editData if available
  useEffect(() => {
    if (editData) {
      if (editData.action_b3) {
        setLevel('B3');
      }
      setFormData({
        organisation_id: editData.organisation_id || editData.org_id || '',
        goal_a1: editData.goal_a1 || '',
        intervention_a2: editData.intervention_a2 || '',
        action_a3: editData.action_a3 || '',
        goal_b1: editData.goal_b1 || '',
        intervention_b2: editData.intervention_b2 || '',
        intervention_code_b2: editData.intervention_code_b2 || editData.code_b2 || '',
        action_b3: editData.action_b3 || '',
        action_code_b3: editData.action_code_b3 || editData.code_b3 || '',
        category: editData.category || editData.jobTitle || '--Select Category--',
        wings: String(editData.wing_id || editData.wings || '0'),
        priority: String(editData.priority_id || editData.priority || '0'),
        vibhas: String(editData.vibhas_id || editData.vibhas || '0'),

        is_miv_2030: editData.is_miv_2030 || 'No',
        miv_chapter: String(editData.miv_chapter || '0'),
        is_makv_2047: editData.is_makv_2047 || 'No',
        makv_theme: String(editData.makv_theme || '0'),
        is_sgos_2: editData.is_sgos_2 || 'No',
        is_additional_items: editData.is_additional_items || 'No',
        is_gmis: editData.is_gmis || 'No',
        current_status: editData.current_status || 'Implementation - On time',
        remarks: editData.remarks || editData.reason_delay || '',

        timeline_vision: editData.target_date ? String(editData.target_date).slice(0, 10) : '',
        expected_completion_date: editData.expected_date ? String(editData.expected_date).slice(0, 10) : '',
        total_cost: editData.total_cost != null ? String(editData.total_cost) : '',
        fund_spent: editData.fund_spent != null ? String(editData.fund_spent) : '',
        source_of_funding: editData.source_of_funding || 'Internal Resources',
        progress: editData.progress != null ? String(editData.progress) : '0',
        reason_delay: editData.reason_delay || ''
      });
    }
  }, [editData]);

  // Track explicitly completed stages
  const [completedStages, setCompletedStages] = useState({
    general: false,
    source: false,
    timelines: false,
    financials: false
  });

  // Current Stages Definition based on Level
  const currentStages = useMemo(() => {
    return level === 'B2' ? B2_STAGES : B3_STAGES;
  }, [level]);

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Stage Navigation
  const currentStageIndex = currentStages.findIndex(s => s.id === activeStage);

  const handleNextStage = () => {
    if (activeStage === 'general') {
      if (!formData.organisation_id) {
        triggerNotification?.("Please select an Implementing Agency before continuing", "error");
        return;
      }
      setCompletedStages(prev => ({ ...prev, general: true }));
    } else if (activeStage === 'source') {
      setCompletedStages(prev => ({ ...prev, source: true }));
    }

    if (currentStageIndex < currentStages.length - 1) {
      setActiveStage(currentStages[currentStageIndex + 1].id);
    }
  };

  const handlePrevStage = () => {
    if (currentStageIndex > 0) {
      setActiveStage(currentStages[currentStageIndex - 1].id);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!formData.organisation_id) {
      setActiveStage('general');
      triggerNotification?.("Please select an Implementing Agency", "error");
      return;
    }

    setSubmitting(true);
    try {
      const userId = getUserIdFromToken();
      const payload = {
        ...formData,
        user_id: userId,
        action_b3: level === 'B2' ? formData.intervention_b2 : formData.action_b3,
        target_date: formData.timeline_vision,
        expected_date: formData.expected_completion_date,
        total_cost: parseFloat(formData.total_cost) || 0,
        fund_spent: parseFloat(formData.fund_spent) || 0,
        progress: parseInt(formData.progress, 10) || 0
      };

      if (editData && editData.id) {
        await updateOvdAction(payload);
        triggerNotification?.(`${level} item updated successfully`, "success");
      } else {
        await saveOvdB2B3Action(payload);
        triggerNotification?.(`New ${level} item submitted successfully`, "success");
      }

      onSuccess ? onSuccess() : null;
    } catch (err) {
      console.error("OVOD Form submit error:", err);
      triggerNotification?.(err.message || "Failed to submit item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Title based on Level
  const formTitle = useMemo(() => {
    if (editData) {
      return level === 'B2' ? 'Edit Initiative (B2)' : 'Edit Actionable Item (B3)';
    }
    return level === 'B2' ? 'Add Initiative' : 'Add Actionable Item (B3)';
  }, [editData, level]);

  return (
    <div className="w-full space-y-6 select-none animate-fade-in text-slate-800 dark:text-slate-100 pb-12">
      
      {/* Main Full-Width Card Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden w-full">
        
        {/* Navy Gradient Header Banner */}
        <div className="relative bg-gradient-to-r from-[#0f417a] via-[#155ca2] to-[#0f417a] p-5 md:p-6 text-white overflow-hidden">
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 min-h-[80px]">
            
            {/* Left Side: Title & Radio Selector below Title */}
            <div className="space-y-2.5 z-10">
              <div>
                <h2 className="text-lg md:text-xl font-black tracking-wide uppercase font-display text-white">
                  {formTitle}
                </h2>
                <p className="text-[11px] text-blue-100/80 font-medium mt-0.5">
                  Drishti Portal (Ministry View)
                </p>
              </div>

              {/* Radio Selector Directly Below Title */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">
                  Level:
                </span>
                <div className="inline-flex items-center space-x-3 bg-white/15 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20 shadow-xs">
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="level_selector"
                      value="B2"
                      checked={level === 'B2'}
                      onChange={() => {
                        setLevel('B2');
                        setActiveStage('general');
                        setCompletedStages({ general: false, source: false, timelines: false, financials: false });
                      }}
                      className="h-3.5 w-3.5 text-[#0f417a] accent-white cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${level === 'B2' ? 'text-white font-black' : 'text-blue-100/70'}`}>
                      Intervention (B2)
                    </span>
                  </label>

                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="level_selector"
                      value="B3"
                      checked={level === 'B3'}
                      onChange={() => {
                        setLevel('B3');
                        setActiveStage('general');
                        setCompletedStages({ general: false, source: false, timelines: false, financials: false });
                      }}
                      className="h-3.5 w-3.5 text-[#0f417a] accent-white cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${level === 'B3' ? 'text-white font-black' : 'text-blue-100/70'}`}>
                      Actionable Item (B3)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Center: Mathematically Centered Connected Progress Stepper */}
            <div className="w-full max-w-md lg:max-w-lg lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2 lg:-translate-y-1/2 z-10 flex justify-center py-2 lg:py-0">
              <div className="w-full">
                <div className="relative flex items-center justify-between px-2">
                  
                  {/* Background Track Line */}
                  <div className="absolute top-[14px] md:top-[16px] left-[15%] right-[15%] h-1 bg-white/20 rounded-full -translate-y-1/2 z-0" />
                  
                  {/* Active Green Progress Line */}
                  <div
                    className="absolute top-[14px] md:top-[16px] left-[15%] h-1 bg-emerald-400 rounded-full -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                    style={{
                      width: `${(currentStageIndex / (currentStages.length - 1)) * 70}%`
                    }}
                  />

                  {/* Step Nodes Grid */}
                  <div className="relative z-10 w-full grid grid-cols-3 items-start">
                    {currentStages.map((stage, idx) => {
                      const isActive = activeStage === stage.id;
                      const isCompleted = (completedStages[stage.id] || idx < currentStageIndex) && !isActive;

                      return (
                        <div
                          key={stage.id}
                          onClick={() => {
                            // Allow clicking visited/completed stages or current
                            if (isCompleted || idx <= currentStageIndex) {
                              setActiveStage(stage.id);
                            }
                          }}
                          className="flex flex-col items-center text-center cursor-pointer group px-1"
                        >
                          {/* Circular Number Node */}
                          <div
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-md ${
                              isCompleted
                                ? 'bg-emerald-500 text-white shadow-emerald-900/30 hover:bg-emerald-400 hover:scale-105'
                                : isActive
                                ? 'bg-white text-[#0f417a] ring-4 ring-emerald-400/60 scale-110 shadow-lg'
                                : 'bg-white/15 text-white/50 border border-white/20 backdrop-blur-md hover:bg-white/25 hover:text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          {/* Step Label */}
                          <div className="mt-1.5 flex flex-col items-center">
                            <span className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight transition-colors truncate max-w-[120px] sm:max-w-none ${
                              isActive
                                ? 'text-white font-black drop-shadow-sm'
                                : isCompleted
                                ? 'text-emerald-200 font-semibold'
                                : 'text-blue-100/60 font-medium'
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

            {/* Right Side: Stage Indicator Pill */}
            <div className="hidden lg:flex justify-end items-center z-10">
              <span className="text-[11px] font-black px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white font-mono tracking-wider shadow-sm">
                Stage {currentStageIndex + 1} of {currentStages.length}
              </span>
            </div>

          </div>
        </div>

        {/* Form Body Container */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 w-full">
          
          {/* ========================================================================= */}
          {/* ============================= B2 FORM STAGES ============================ */}
          {/* ========================================================================= */}

          {level === 'B2' && (
            <>
              {/* B2 - STAGE 1: GENERAL DETAILS */}
              {activeStage === 'general' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 1: General Details & Intervention Alignment
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Note: While adding a new B2, you also need to enter at least one B3 along with it.
                    </span>
                  </div>

                  {/* Implementing Agency */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Implementing Agency <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="organisation_id"
                      value={formData.organisation_id}
                      onChange={handleChange}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">--Select Implementing Agency--</option>
                      {organisations.map(o => (
                        <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* National Goal A1 & Intervention A2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        National Level Goal (A1) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="goal_a1"
                        placeholder="--Select Goal Name--"
                        value={formData.goal_a1}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        National Level Intervention (A2) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="intervention_a2"
                        placeholder="--Select Intervention Name--"
                        value={formData.intervention_a2}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Goal B1, Intervention B2, Intervention Code B2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Goal (B1) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="goal_b1"
                        placeholder="--Select Intervention Name--"
                        value={formData.goal_b1}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Intervention (B2) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="intervention_b2"
                        placeholder="Enter Intervention (B2)..."
                        value={formData.intervention_b2}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Intervention Code (B2) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="intervention_code_b2"
                        placeholder="e.g. E-CB-1.1"
                        value={formData.intervention_code_b2}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category, Wings, Priority, Vibhas/Navic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Wings <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="wings"
                        value={formData.wings}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Wing--</option>
                        {OVOD_WINGS.filter(w => w.id !== '0').map(w => (
                          <option key={w.id} value={w.id}>{w.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Priority <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Priority--</option>
                        {OVOD_PRIORITIES.filter(p => p.id !== '0').map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vibhas / Navic <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="vibhas"
                        value={formData.vibhas}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Navic/Vibhas--</option>
                        {OVOD_VIBHAS.filter(v => v.id !== '0').map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* B2 - STAGE 2: SOURCE DOCUMENT */}
              {activeStage === 'source' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 2: Source Document Alignment
                      </h3>
                    </div>
                  </div>

                  {/* MIV 2030 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of MIV 2030? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_miv_2030"
                            value="Yes"
                            checked={formData.is_miv_2030 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_miv_2030"
                            value="No"
                            checked={formData.is_miv_2030 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        MIV Chapter
                      </label>
                      <select
                        name="miv_chapter"
                        value={formData.miv_chapter}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MIV_CHAPTERS.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* MAKV 2047 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of MAKV 2047? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_makv_2047"
                            value="Yes"
                            checked={formData.is_makv_2047 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_makv_2047"
                            value="No"
                            checked={formData.is_makv_2047 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        MAKV Theme
                      </label>
                      <select
                        name="makv_theme"
                        value={formData.makv_theme}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MAKV_THEMES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SGoS-2 & Additional Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of SGoS-2? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_sgos_2"
                            value="Yes"
                            checked={formData.is_sgos_2 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_sgos_2"
                            value="No"
                            checked={formData.is_sgos_2 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of Additional Items? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_additional_items"
                            value="Yes"
                            checked={formData.is_additional_items === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_additional_items"
                            value="No"
                            checked={formData.is_additional_items === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* GMIS & Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of GMIS? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_gmis"
                            value="Yes"
                            checked={formData.is_gmis === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_gmis"
                            value="No"
                            checked={formData.is_gmis === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        name="remarks"
                        placeholder="Enter remarks..."
                        value={formData.remarks}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* B2 - STAGE 3: TIMELINES */}
              {activeStage === 'timelines' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 3: Timelines & Vision Schedules
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Timeline As Per Vision Document
                      </label>
                      <input
                        type="date"
                        name="timeline_vision"
                        value={formData.timeline_vision}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Expected/Actual Date Of Completion
                      </label>
                      <input
                        type="date"
                        name="expected_completion_date"
                        value={formData.expected_completion_date}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* ============================= B3 FORM STAGES ============================ */}
          {/* ========================================================================= */}

          {level === 'B3' && (
            <>
              {/* B3 - STAGE 1: GENERAL & B3 ACTION ITEM */}
              {activeStage === 'general' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 1: Actionable Item (B3) Details & Parent Intervention
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Define the specific Actionable Item (B3) under Intervention (B2)
                    </span>
                  </div>

                  {/* Implementing Agency & National Goal A1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Implementing Agency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="organisation_id"
                        value={formData.organisation_id}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">--Select Implementing Agency--</option>
                        {organisations.map(o => (
                          <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        National Level Goal (A1)
                      </label>
                      <input
                        type="text"
                        name="goal_a1"
                        placeholder="--Select Goal Name--"
                        value={formData.goal_a1}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* National Intervention A2 & Action A3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        National Level Intervention (A2)
                      </label>
                      <input
                        type="text"
                        name="intervention_a2"
                        placeholder="--Select Intervention Name--"
                        value={formData.intervention_a2}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        National Level Action (A3)
                      </label>
                      <input
                        type="text"
                        name="action_a3"
                        placeholder="--Select Action Name--"
                        value={formData.action_a3}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Goal B1 & Parent Intervention B2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Goal (B1)
                      </label>
                      <input
                        type="text"
                        name="goal_b1"
                        placeholder="Enter Goal (B1)..."
                        value={formData.goal_b1}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Parent Intervention (B2) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="intervention_b2"
                        placeholder="Enter Parent Intervention (B2)..."
                        value={formData.intervention_b2}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Actionable Item B3 & Action Code B3 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Actionable Item (B3) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="action_b3"
                        placeholder="Enter Actionable Item (B3)..."
                        value={formData.action_b3}
                        onChange={handleChange}
                        required
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Action Item Code (B3)
                      </label>
                      <input
                        type="text"
                        name="action_code_b3"
                        placeholder="e.g. E-CB-1.1.1"
                        value={formData.action_code_b3}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category, Wings, Priority, Vibhas/Navic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Wings
                      </label>
                      <select
                        name="wings"
                        value={formData.wings}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Wing--</option>
                        {OVOD_WINGS.filter(w => w.id !== '0').map(w => (
                          <option key={w.id} value={w.id}>{w.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Priority--</option>
                        {OVOD_PRIORITIES.filter(p => p.id !== '0').map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vibhas / Navic
                      </label>
                      <select
                        name="vibhas"
                        value={formData.vibhas}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0">--Select Navic/Vibhas--</option>
                        {OVOD_VIBHAS.filter(v => v.id !== '0').map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* B3 - STAGE 2: SOURCE DOCUMENT & STATUS */}
              {activeStage === 'source' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 2: Source Alignment & Current Stage
                      </h3>
                    </div>
                  </div>

                  {/* MIV 2030 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of MIV 2030? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_miv_2030"
                            value="Yes"
                            checked={formData.is_miv_2030 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_miv_2030"
                            value="No"
                            checked={formData.is_miv_2030 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        MIV Chapter
                      </label>
                      <select
                        name="miv_chapter"
                        value={formData.miv_chapter}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MIV_CHAPTERS.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* MAKV 2047 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of MAKV 2047? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_makv_2047"
                            value="Yes"
                            checked={formData.is_makv_2047 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_makv_2047"
                            value="No"
                            checked={formData.is_makv_2047 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        MAKV Theme
                      </label>
                      <select
                        name="makv_theme"
                        value={formData.makv_theme}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MAKV_THEMES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SGoS-2 & Additional Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of SGoS-2? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_sgos_2"
                            value="Yes"
                            checked={formData.is_sgos_2 === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_sgos_2"
                            value="No"
                            checked={formData.is_sgos_2 === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Is it part of Additional Items? (Y/N)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_additional_items"
                            value="Yes"
                            checked={formData.is_additional_items === 'Yes'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="is_additional_items"
                            value="No"
                            checked={formData.is_additional_items === 'No'}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Current Status / Stage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Current Status / Stage
                      </label>
                      <select
                        name="current_status"
                        value={formData.current_status}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {OVOD_STATUSES.filter(s => s.id !== '0').map(s => (
                          <option key={s.id} value={s.label}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        name="remarks"
                        placeholder="Enter remarks..."
                        value={formData.remarks}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* B3 - STAGE 3: FINANCIALS & TIMELINES */}
              {activeStage === 'financials' && (
                <div className="space-y-5 animate-fade-in">
                  
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Stage 3: Financials, Progress & Timelines
                      </h3>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Timeline As Per Vision Document
                      </label>
                      <input
                        type="date"
                        name="timeline_vision"
                        value={formData.timeline_vision}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Expected/Actual Date Of Completion
                      </label>
                      <input
                        type="date"
                        name="expected_completion_date"
                        value={formData.expected_completion_date}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Total Cost (in Cr.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="total_cost"
                        placeholder="0.00"
                        value={formData.total_cost}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fund Spent (in Cr.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="fund_spent"
                        placeholder="0.00"
                        value={formData.fund_spent}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Progress (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        name="progress"
                        value={formData.progress}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Source of Funding
                      </label>
                      <input
                        type="text"
                        name="source_of_funding"
                        placeholder="e.g. EBR, GBS"
                        value={formData.source_of_funding}
                        onChange={handleChange}
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Delay Reason */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Reason for Delay / Remarks
                    </label>
                    <textarea
                      rows={2}
                      name="reason_delay"
                      placeholder="Explain delay if any..."
                      value={formData.reason_delay}
                      onChange={handleChange}
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                </div>
              )}
            </>
          )}

          {/* Bottom Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            
            {/* Left Action: Prev (if not first stage) */}
            <div className="flex items-center space-x-2">
              {currentStageIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevStage}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </button>
              )}
            </div>

            {/* Right Action: Next or Submit */}
            <div className="flex items-center space-x-2">
              {currentStageIndex < currentStages.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStage}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0f417a] hover:bg-[#155ca2] transition shadow-md cursor-pointer"
                >
                  <span>Next Stage</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{submitting ? "Submitting..." : editData ? `Update ${level}` : `Submit ${level}`}</span>
                </button>
              )}
            </div>

          </div>

        </form>

      </div>

    </div>
  );
}
