import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, 
  FileText, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Save,
  ArrowLeft,
  Check,
  Layers,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Sparkles,
  DollarSign,
  Edit2,
  Info,
  X,
  Upload,
  Download
} from 'lucide-react';
import { 
  fetchImplementingAgencies,
  fetchOvdDropDownData,
  fetchOvdAddData,
  saveOvdB2B3Action, 
  updateOvdAction,
  fetchOvdItemDetails,
  updateOvdFullItem,
  uploadOvdDocument,
  fetchOvdDocuments,
  getUserIdFromToken 
} from '../api';
import { 
  CATEGORY_MAP,
  WINGS_MAP,
  PRIORITY_MAP,
  VIBHAS_MAP,
  OVOD_STATUSES
} from '../utils/constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const DEFAULT_AGENCIES = [
  { ia_id: 1, ia_name: "Chennai Port Authority" },
  { ia_id: 2, ia_name: "Cochin Port Authority" },
  { ia_id: 3, ia_name: "Deendayal Port Authority" },
  { ia_id: 4, ia_name: "Jawaharlal Nehru Port Authority" },
  { ia_id: 5, ia_name: "Kamarajar Port Limited" },
  { ia_id: 6, ia_name: "Mormugao Port Authority" },
  { ia_id: 7, ia_name: "Mumbai Port Authority" },
  { ia_id: 8, ia_name: "New Mangalore Port Authority" },
  { ia_id: 9, ia_name: "Paradip Port Authority" },
  { ia_id: 10, ia_name: "Syama Prasad Mookerjee Port Kolkata" },
  { ia_id: 11, ia_name: "V.O. Chidambaranar Port Authority" },
  { ia_id: 12, ia_name: "Visakhapatnam Port Authority" }
];

export default function InputForm({ 
  editData, 
  onSuccess, 
  onCancel, 
  triggerNotification 
}) {
  // If editData is provided, render the dedicated "Update Initiative" form
  if (editData) {
    return (
      <UpdateInitiativeView 
        editData={editData}
        onSuccess={onSuccess}
        onCancel={onCancel}
        triggerNotification={triggerNotification}
      />
    );
  }

  // Otherwise, render the "Add Initiative" form with cascading dropdowns
  return (
    <AddInitiativeView 
      onSuccess={onSuccess}
      onCancel={onCancel}
      triggerNotification={triggerNotification}
    />
  );
}

// =========================================================================
// ==================== UPDATE INITIATIVE VIEW (EDIT MODE) ==================
// =========================================================================
function UpdateInitiativeView({ editData, onSuccess, onCancel, triggerNotification }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    id: editData.id,
    goal_a1_label: editData['Goal (A1)'] || editData.goal_a1 || '',
    intervention_a2_label: editData['Intervention (A2)'] || editData.intervention_a2 || '',
    goal_b1_label: editData['Goal (B1)'] || editData.goal_b1 || '',
    intervention_b2_label: editData['Intervention (B2)'] || editData.intervention_b2 || '',
    action_b3_label: editData['Action (B3)'] || editData.action_b3 || '',
    
    b2_id: editData.intervention_b2_id || editData.intervention_b2 || null,
    b3_id: editData.action_b3_id || editData.action_b3 || null,

    category_label: editData.Category || editData.category || '',
    agency_label: editData.ia_name || editData.organisation_name || '',
    wing_label: editData.Wing || editData.wings || '',
    priority_label: editData.Priority || editData.priority || '',
    vibhas_label: editData.Vibhas || editData.vibhas || '',

    total_cost: editData.total_cost != null ? String(editData.total_cost) : '',
    current_status: editData.current_status || 'Under Implementation - On Time',

    // Output / Outcome
    direct_emp_gen: '0',
    indirect_emp_gen: '0',
    direct_inv_created: '0',
    indirect_inv_created: '0',
    outcomes: '',
    outcomes_remarks: '',

    // Timelines
    timeline_vision: '',
    expected_completion_date: '',

    // Others
    feedback_ministry: '',
    response_org: ''
  });

  // Monthly Progress Logs State
  const [progressLogs, setProgressLogs] = useState([
    { id: 1, month: 'Mar', year: '2026', physical_progress: '100', financial_progress: '100' }
  ]);

  // Modal State for Edit (B2/B3)
  const [showEditChoiceModal, setShowEditChoiceModal] = useState(false);
  const [editTargetType, setEditTargetType] = useState('B3'); // 'B2' or 'B3'
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [actionNameInput, setActionNameInput] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  // Document Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Load Full Details on Mount
  useEffect(() => {
    if (!editData?.id) return;
    setLoading(true);

    fetchOvdItemDetails(editData.id)
      .then(res => {
        const row = res?.result?.[0] || {};
        const logs = res?.progressLogResult || [];

        setFormData(prev => ({
          ...prev,
          b2_id: row.intervention_b2 || prev.b2_id,
          b3_id: row.action_b3 || prev.b3_id,
          total_cost: row.total_cost != null ? String(row.total_cost) : prev.total_cost,
          current_status: row.current_status || prev.current_status,
          direct_emp_gen: row.direct_Emp_Gen != null ? String(row.direct_Emp_Gen) : '0',
          indirect_emp_gen: row.inDirect_Emp_Gen != null ? String(row.inDirect_Emp_Gen) : '0',
          direct_inv_created: row.direct_Inv_Created != null ? String(row.direct_Inv_Created) : '0',
          indirect_inv_created: row.inDirect_Inv_Created != null ? String(row.inDirect_Inv_Created) : '0',
          outcomes: row.outcomes || '',
          outcomes_remarks: row.Outcomes_Remarks || '',
          feedback_ministry: row.Feedback || '',
          response_org: row.Response || '',
          timeline_vision: row.target_date ? String(row.target_date).slice(0, 10) : '',
          expected_completion_date: row.expected_date ? String(row.expected_date).slice(0, 10) : ''
        }));

        if (Array.isArray(logs) && logs.length > 0) {
          const formattedLogs = logs.map((log, idx) => {
            let m = 'Jan';
            let y = '2026';
            if (log.progress_date) {
              const parts = String(log.progress_date).split('-');
              if (parts.length >= 2) {
                // If numeric month like 03-26 or name like Mar-2026
                const monthNum = parseInt(parts[0], 10);
                if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                  m = MONTHS[monthNum - 1];
                } else if (MONTHS.includes(parts[0])) {
                  m = parts[0];
                }
                const yr = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
                if (YEARS.includes(yr)) y = yr;
              }
            }
            return {
              id: log.id || idx + 1,
              month: m,
              year: y,
              physical_progress: log.physical_progress != null ? String(log.physical_progress) : '0',
              financial_progress: log.financial_progress != null ? String(log.financial_progress) : '0'
            };
          });
          setProgressLogs(formattedLogs);
        }
      })
      .catch(err => {
        console.error("Error loading initiative details:", err);
      })
      .finally(() => setLoading(false));
  }, [editData]);

  // Handle Progress Log Row Add
  const handleAddLogRow = () => {
    setProgressLogs(prev => [
      ...prev,
      { id: Date.now(), month: 'Jan', year: '2026', physical_progress: '0', financial_progress: '0' }
    ]);
  };

  // Handle Progress Log Row Remove
  const handleRemoveLogRow = (index) => {
    if (progressLogs.length <= 1) return;
    setProgressLogs(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle Progress Log Row Change
  const handleLogRowChange = (index, field, value) => {
    setProgressLogs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Clear All Log Rows
  const handleClearAllLogs = () => {
    setProgressLogs([
      { id: Date.now(), month: 'Jan', year: '2026', physical_progress: '0', financial_progress: '0' }
    ]);
  };

  // Open Edit Name Modal
  const handleOpenEditChoice = () => {
    setShowEditChoiceModal(true);
  };

  const handleConfirmEditChoice = () => {
    setShowEditChoiceModal(false);
    if (editTargetType === 'B2') {
      const currentB2 = formData.intervention_b2_label;
      const cleanName = currentB2.includes(':') ? currentB2.split(':').slice(1).join(':').trim() : currentB2;
      setActionNameInput(cleanName);
    } else {
      const currentB3 = formData.action_b3_label;
      const cleanName = currentB3.includes(':') ? currentB3.split(':').slice(1).join(':').trim() : currentB3;
      setActionNameInput(cleanName);
    }
    setShowEditNameModal(true);
  };

  // Submit Updated B2 or B3 Name
  const handleSaveActionName = async () => {
    if (!actionNameInput.trim()) return;
    setUpdatingName(true);
    try {
      const payload = {
        bType: editTargetType,
        actionInput: actionNameInput.trim(),
        b2Intervention: editTargetType === 'B2' ? formData.b2_id : undefined,
        b3Actions: editTargetType === 'B3' ? formData.b3_id : undefined
      };
      await updateOvdAction(payload);
      triggerNotification?.(`${editTargetType} name updated successfully`, 'success');

      if (editTargetType === 'B2') {
        const prefix = formData.intervention_b2_label.includes(':') 
          ? formData.intervention_b2_label.split(':')[0].trim() 
          : 'B2';
        setFormData(prev => ({
          ...prev,
          intervention_b2_label: `${prefix} : ${actionNameInput.trim()}`
        }));
      } else {
        const prefix = formData.action_b3_label.includes(':') 
          ? formData.action_b3_label.split(':')[0].trim() 
          : 'B3';
        setFormData(prev => ({
          ...prev,
          action_b3_label: `${prefix} : ${actionNameInput.trim()}`
        }));
      }
      setShowEditNameModal(false);
    } catch (err) {
      console.error("Error updating action name:", err);
      triggerNotification?.(err.message || "Failed to update name", "error");
    } finally {
      setUpdatingName(false);
    }
  };

  // View Uploaded Docs
  const handleOpenDocsModal = async () => {
    setShowDocModal(true);
    setLoadingDocs(true);
    try {
      const docs = await fetchOvdDocuments(editData.id);
      setUploadedDocs(Array.isArray(docs) ? docs : []);
    } catch {
      setUploadedDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Submit Update Initiative Form
  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userId = getUserIdFromToken();
      const latestLog = progressLogs[progressLogs.length - 1] || {};

      const payload = {
        ID: editData.id,
        completedPercentage: parseInt(latestLog.physical_progress || 0, 10),
        financialProgress: parseInt(latestLog.financial_progress || 0, 10),
        directEmpGen: parseInt(formData.direct_emp_gen || 0, 10),
        inDirectEmpGen: parseInt(formData.indirect_emp_gen || 0, 10),
        directInvCreated: parseFloat(formData.direct_inv_created || 0),
        inDirectInvCreated: parseFloat(formData.indirect_inv_created || 0),
        totalCost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        statusCurrent: formData.current_status,
        outcomes: formData.outcomes,
        OutcomesRemarks: formData.outcomes_remarks,
        Response: formData.response_org,
        Feedback: formData.feedback_ministry,
        completionDate: formData.timeline_vision || null,
        actualDate: formData.expected_completion_date || null,
        Delay: null,
        reasonsForDrop: null,
        ovodFinanceData: [],
        ovodProgressLogData: progressLogs.map(log => ({
          progressDate: `${log.month}-${log.year}`,
          physicalProgress: log.physical_progress != null ? String(log.physical_progress) : '0',
          financialProgress: log.financial_progress != null ? String(log.financial_progress) : '0',
          progress_date: `${log.month}-${log.year}`,
          physical_progress: parseInt(log.physical_progress || 0, 10),
          financial_progress: parseInt(log.financial_progress || 0, 10)
        })),
        userID: userId
      };

      await updateOvdFullItem(payload);

      // Handle optional document upload
      if (selectedFile) {
        const docFormData = new FormData();
        docFormData.append('file', selectedFile);
        docFormData.append('ID', editData.id);
        await uploadOvdDocument(docFormData);
      }

      triggerNotification?.("Initiative updated successfully", "success");
      onSuccess ? onSuccess() : null;
    } catch (err) {
      console.error("Error updating initiative:", err);
      triggerNotification?.(err.message || "Failed to update initiative", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-800 dark:text-slate-100 pb-12 animate-fade-in font-sans">
      
      {/* Form Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden p-6 md:p-8">
        
        {/* Title matching screenshot */}
        <div className="pb-3 mb-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            Update Initiative
          </h1>
        </div>

        <form onSubmit={handleSubmitUpdate} className="space-y-8">
          
          {/* ========================================================================= */}
          {/* ======================= SECTION 1: GENERAL DETAILS ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                General Details
              </h2>
              
              {/* Edit (B2/B3) Button */}
              <button
                type="button"
                onClick={handleOpenEditChoice}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs transition cursor-pointer"
              >
                <Edit2 size={12} />
                <span>Edit (B2/B3)</span>
              </button>
            </div>

            {/* Row 1: National Level Goal A1 & Intervention A2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  National Level Goal (A1)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.goal_a1_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  National Level Intervention (A2)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.intervention_a2_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Row 2: Goal B1 & Intervention B2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal (B1)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.goal_b1_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intervention (B2)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.intervention_b2_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Row 3: Actionable Item (B3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Actionable Item (B3)<span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.action_b3_label}
                readOnly
                disabled
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
              />
            </div>

            {/* Row 4: Category, Total Cost, Implementing Agency, Wing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.category_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Cost (In. Cr)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="total_cost"
                    value={formData.total_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_cost: e.target.value }))}
                    placeholder="Enter cost..."
                    className="w-full text-xs px-3.5 py-2.5 pr-8 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 font-semibold focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500" title="Cost in Crores">
                    <Info size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Implementing Agency<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.agency_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wing<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.wing_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Row 5: Priority & Vibhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.priority_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vibhas/ Navic<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vibhas_label}
                  readOnly
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ============================ SECTION 2: STATUS ========================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Status
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Status<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_status: e.target.value }))}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 dark:border-emerald-500 pr-10 font-semibold focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">--Select Status--</option>
                  {OVOD_STATUSES.filter(s => s.id !== '0').map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ==================== SECTION 3: MONTHLY PROGRESS LOGS =================== */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Monthly Progress Logs
              </h2>
              <button
                type="button"
                onClick={handleClearAllLogs}
                className="bg-[#dc2626] hover:bg-rose-700 text-white px-4 py-1 text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
              >
                Clear All Rows
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#154b8a] text-white">
                  <tr>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-blue-900/40 w-1/3">Month & Year (MM-YY)</th>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-blue-900/40 w-1/3">Physical Progress</th>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-blue-900/40 w-1/4">Financial Progress (%)</th>
                    <th className="py-2.5 px-3 text-center font-bold w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {progressLogs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      
                      {/* Month & Year */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={log.month}
                              onChange={(e) => handleLogRowChange(index, 'month', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-7 font-semibold"
                            >
                              {MONTHS.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          <div className="relative flex-1">
                            <select
                              value={log.year}
                              onChange={(e) => handleLogRowChange(index, 'year', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-7 font-semibold"
                            >
                              {YEARS.map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </td>

                      {/* Physical Progress */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={log.physical_progress}
                            onChange={(e) => handleLogRowChange(index, 'physical_progress', e.target.value)}
                            className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold text-center"
                          />
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Financial Progress */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={log.financial_progress}
                            onChange={(e) => handleLogRowChange(index, 'financial_progress', e.target.value)}
                            className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold text-center"
                          />
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {progressLogs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLogRow(index)}
                              title="Delete row"
                              className="text-rose-500 hover:text-rose-700 transition cursor-pointer p-0.5"
                            >
                              <div className="w-5 h-5 rounded-full border border-rose-500 flex items-center justify-center">
                                <Minus size={12} className="stroke-[2.5]" />
                              </div>
                            </button>
                          )}

                          {index === progressLogs.length - 1 && (
                            <button
                              type="button"
                              onClick={handleAddLogRow}
                              title="Add new progress log row"
                              className="text-slate-600 hover:text-blue-600 transition cursor-pointer p-0.5"
                            >
                              <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center">
                                <Plus size={12} className="stroke-[2.5]" />
                              </div>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ======================= SECTION 4: OUTPUT / OUTCOME ===================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Output / Outcome
              </h2>
            </div>

            {/* Row 1: Direct & Indirect Employment Generated */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Direct Employment Generated (No. Of People)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.direct_emp_gen}
                    onChange={(e) => setFormData(prev => ({ ...prev, direct_emp_gen: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold"
                  />
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Indirect Employment Generated (No. Of People)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.indirect_emp_gen}
                    onChange={(e) => setFormData(prev => ({ ...prev, indirect_emp_gen: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold"
                  />
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Direct & Indirect Investment Created */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Direct Investment Created (In Cr.)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.direct_inv_created}
                    onChange={(e) => setFormData(prev => ({ ...prev, direct_inv_created: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold"
                  />
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Indirect Investment Created (In Cr.)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.indirect_inv_created}
                    onChange={(e) => setFormData(prev => ({ ...prev, indirect_inv_created: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-950 rounded border border-emerald-500 pr-8 font-semibold"
                  />
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: Output / Outcome Textareas */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 leading-snug">
                  Output / Outcome Of The Completed Initiative (Example : Reduction in turn-around time (hours), capacity created (MTPA), beneficiaries impacted (Number), Infrastructure Developed (road / rail with length in kilometres), etc.)
                </label>
                <textarea
                  rows={3}
                  value={formData.outcomes}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcomes: e.target.value }))}
                  placeholder="Enter outcome description..."
                  className="w-full text-xs p-3 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Output/Outcomes (Remarks)
                </label>
                <textarea
                  rows={3}
                  value={formData.outcomes_remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcomes_remarks: e.target.value }))}
                  placeholder="Enter remarks..."
                  className="w-full text-xs p-3 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ========================== SECTION 5: TIMELINES ========================= */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Timelines
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Timeline As Per Vision Document
                </label>
                <input
                  type="text"
                  value={formData.timeline_vision}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected/Actual Date Of Completion
                </label>
                <input
                  type="date"
                  value={formData.expected_completion_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_completion_date: e.target.value }))}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ============================ SECTION 6: OTHERS ========================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Others
              </h2>
              <button
                type="button"
                onClick={handleOpenDocsModal}
                className="bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 py-1 text-xs font-bold rounded shadow-xs transition cursor-pointer"
              >
                View Uploaded Documents
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Feedback By Ministry
                </label>
                <textarea
                  rows={3}
                  value={formData.feedback_ministry}
                  onChange={(e) => setFormData(prev => ({ ...prev, feedback_ministry: e.target.value }))}
                  placeholder="Enter ministry feedback..."
                  className="w-full text-xs p-3 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks/Response By Organisation
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={formData.response_org}
                    onChange={(e) => setFormData(prev => ({ ...prev, response_org: e.target.value }))}
                    placeholder="Enter organisation response..."
                    className="w-full text-xs p-3 bg-white dark:bg-slate-950 rounded border border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-3 bottom-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recent Executive Summary & PPT Of Initiative(If Any)
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                (Maximum file size is 5MB)
              </span>
            </div>

          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-xs font-bold text-white bg-[#16a34a] hover:bg-emerald-700 rounded shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-xs font-bold text-white bg-[#dc2626] hover:bg-rose-700 rounded shadow-sm transition cursor-pointer"
            >
              Exit
            </button>
          </div>

        </form>

        {/* Footer Note */}
        <div className="pt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Copyright © 2025 Ministry of Ports, Shipping and Waterways, Government of India, All Rights Reserved
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ================= MODAL 1: SELECT B2 OR B3 TO EDIT ======================= */}
      {/* ========================================================================= */}
      {showEditChoiceModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowEditChoiceModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Select Intervention(B2) / Actionable Item(B3) To Edit
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which level you want to modify
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditChoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Radio Selection */}
            <div className="px-5 py-6">
              <div className="flex items-center justify-center space-x-12">
                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="editTarget"
                    value="B2"
                    checked={editTargetType === 'B2'}
                    onChange={() => setEditTargetType('B2')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Intervention (B2)</span>
                </label>

                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="editTarget"
                    value="B3"
                    checked={editTargetType === 'B3'}
                    onChange={() => setEditTargetType('B3')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Actionable Item (B3)</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/60 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowEditChoiceModal(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEditChoice}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ================= MODAL 2: UPDATE ACTION NAME (B2 / B3) ================= */}
      {/* ========================================================================= */}
      {showEditNameModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => !updatingName && setShowEditNameModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Update Action Name
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter new name for {editTargetType === 'B2' ? 'Intervention (B2)' : 'Actionable Item (B3)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditNameModal(false)}
                disabled={updatingName}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Input Form Body */}
            <div className="px-5 py-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {editTargetType === 'B2' ? 'Enter Intervention Name (B2)' : 'Enter Action Name (B3)'}
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={actionNameInput}
                  onChange={(e) => setActionNameInput(e.target.value)}
                  placeholder={`Enter ${editTargetType} name...`}
                  disabled={updatingName}
                  className="w-full text-xs p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                />
                {actionNameInput.trim() && (
                  <CheckCircle className="h-4 w-4 text-emerald-600 absolute right-3 bottom-3 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/60 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowEditNameModal(false)}
                disabled={updatingName}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveActionName}
                disabled={updatingName || !actionNameInput.trim()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#16a34a] hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {updatingName ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ===================== MODAL 3: VIEW UPLOADED DOCUMENTS ================== */}
      {/* ========================================================================= */}
      {showDocModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowDocModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Uploaded Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supporting files and presentations for this initiative
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 max-h-80 overflow-y-auto">
              {loadingDocs ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading documents...</div>
              ) : uploadedDocs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">No documents uploaded for this initiative yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {uploadedDocs.map(doc => (
                    <li key={doc.id || doc.doc_name} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        {doc.doc_name || 'Document'}
                      </span>
                      <a
                        href={`http://localhost:3000/download-intervention-document/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-bold bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/60 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// =========================================================================
// ===================== ADD INITIATIVE VIEW (CREATE MODE) ==================
// =========================================================================
function AddInitiativeView({ onSuccess, onCancel, triggerNotification }) {
  const [agencies, setAgencies] = useState(DEFAULT_AGENCIES);
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  // Level Selector: 'B2' (Intervention) or 'B3' (Actionable Item)
  const [level, setLevel] = useState('B2');

  // Dynamic dropdown lists loaded by agency
  const [a1List, setA1List] = useState([]);
  const [allA2List, setAllA2List] = useState([]);
  const [allB1List, setAllB1List] = useState([]);
  const [allB2List, setAllB2List] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    organisation_id: '',
    goal_a1: '',
    intervention_a2: '',
    goal_b1: '',
    intervention_b2: '',
    intervention_code_b2: '',
    
    // Auto-filled Metadata
    category: '',
    rawCategory: 7,
    wings: '',
    rawWings: 3,
    priority: '',
    rawPriority: 2,
    vibhas: '',
    rawVibhas: 14,

    // Source Document & Status
    is_miv_2030: 'No',
    miv_chapter: '',
    is_makv_2047: 'No',
    makv_theme: '',
    is_sgos_2: 'No',
    is_additional_items: 'No',
    is_gmis: 'No',
    remarks: '',

    // Timelines
    timeline_vision: '',
    expected_completion_date: '',
    current_status: 'Implementation - On time',

    // B3 specific
    action_b3: '',
    action_code_b3: ''
  });

  // Dynamic Actionable Items (B3) Table rows for B2 Initiative
  const [b3Rows, setB3Rows] = useState([
    { id: 1, actionCode: '', actionDes: '' }
  ]);

  // Load Implementing Agencies on mount
  useEffect(() => {
    fetchImplementingAgencies()
      .then(res => {
        const list = Array.isArray(res) && res.length > 0 ? res : (res?.data || []);
        if (list.length > 0) {
          setAgencies(list);
        } else {
          setAgencies(DEFAULT_AGENCIES);
        }
      })
      .catch(() => setAgencies(DEFAULT_AGENCIES));
  }, []);

  // When Implementing Agency is selected, fetch cascading A1, A2, B1, B2 lists
  useEffect(() => {
    const orgId = formData.organisation_id;
    if (!orgId) {
      setA1List([]);
      setAllA2List([]);
      setAllB1List([]);
      setAllB2List([]);
      return;
    }

    fetchOvdDropDownData('org_a1_filter', orgId)
      .then(res => setA1List(Array.isArray(res) ? res : []))
      .catch(() => setA1List([]));

    fetchOvdDropDownData('org_a2_filter', orgId)
      .then(res => setAllA2List(Array.isArray(res) ? res : []))
      .catch(() => setAllA2List([]));

    fetchOvdDropDownData('org_b1_filter', orgId)
      .then(res => setAllB1List(Array.isArray(res) ? res : []))
      .catch(() => setAllB1List([]));

    fetchOvdDropDownData('org_b2_filter', orgId)
      .then(res => setAllB2List(Array.isArray(res) ? res : []))
      .catch(() => setAllB2List([]));

  }, [formData.organisation_id]);

  // Filter A2 based on selected A1
  const filteredA2List = useMemo(() => {
    if (!formData.goal_a1 || !a1List.length) return [];
    const selectedA1 = a1List.find(item => String(item.id) === String(formData.goal_a1));
    if (!selectedA1) return [];
    return allA2List.filter(item => item.a1_code === selectedA1.a1_code);
  }, [formData.goal_a1, a1List, allA2List]);

  // Filter B1 based on selected A2
  const filteredB1List = useMemo(() => {
    if (!formData.intervention_a2 || !filteredA2List.length) return [];
    const selectedA2 = filteredA2List.find(item => String(item.id) === String(formData.intervention_a2));
    if (!selectedA2) return [];
    return allB1List.filter(item => item.a2_code === selectedA2.a2_code);
  }, [formData.intervention_a2, filteredA2List, allB1List]);

  // Filter B2 based on selected B1 (for B3 mode)
  const filteredB2List = useMemo(() => {
    if (!formData.goal_b1 || !filteredB1List.length) return [];
    const selectedB1 = filteredB1List.find(item => String(item.id) === String(formData.goal_b1));
    if (!selectedB1) return [];
    return allB2List.filter(item => item.b1_code === selectedB1.b1_code);
  }, [formData.goal_b1, filteredB1List, allB2List]);

  // Handle Agency change
  const handleAgencyChange = (e) => {
    const orgId = e.target.value;
    setFormData(prev => ({
      ...prev,
      organisation_id: orgId,
      goal_a1: '',
      intervention_a2: '',
      goal_b1: '',
      intervention_b2: '',
      intervention_code_b2: '',
      category: '',
      wings: '',
      priority: '',
      vibhas: '',
      is_miv_2030: 'No',
      miv_chapter: '',
      is_makv_2047: 'No',
      makv_theme: '',
      is_sgos_2: 'No',
      is_additional_items: 'No',
      is_gmis: 'No',
      remarks: '',
      timeline_vision: '',
      expected_completion_date: '',
      action_b3: '',
      action_code_b3: ''
    }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle Goal A1 change
  const handleA1Change = (e) => {
    const a1Id = e.target.value;
    setFormData(prev => ({
      ...prev,
      goal_a1: a1Id,
      intervention_a2: '',
      goal_b1: '',
      intervention_b2: '',
      intervention_code_b2: '',
      category: '',
      wings: '',
      priority: '',
      vibhas: '',
      is_miv_2030: 'No',
      miv_chapter: '',
      is_makv_2047: 'No',
      makv_theme: '',
      is_sgos_2: 'No',
      is_additional_items: 'No',
      is_gmis: 'No',
      remarks: '',
      timeline_vision: '',
      expected_completion_date: '',
      action_b3: '',
      action_code_b3: ''
    }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle Intervention A2 change
  const handleA2Change = (e) => {
    const a2Id = e.target.value;
    setFormData(prev => ({
      ...prev,
      intervention_a2: a2Id,
      goal_b1: '',
      intervention_b2: '',
      intervention_code_b2: '',
      category: '',
      wings: '',
      priority: '',
      vibhas: '',
      is_miv_2030: 'No',
      miv_chapter: '',
      is_makv_2047: 'No',
      makv_theme: '',
      is_sgos_2: 'No',
      is_additional_items: 'No',
      is_gmis: 'No',
      remarks: '',
      timeline_vision: '',
      expected_completion_date: '',
      action_b3: '',
      action_code_b3: ''
    }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle Goal B1 change -> Auto fetch B2 Code & Metadata
  const handleB1Change = async (e) => {
    const b1Id = e.target.value;
    if (!b1Id) {
      setFormData(prev => ({
        ...prev,
        goal_b1: '',
        intervention_code_b2: '',
        category: '',
        wings: '',
        priority: '',
        vibhas: '',
        is_miv_2030: 'No',
        miv_chapter: '',
        is_makv_2047: 'No',
        makv_theme: '',
        is_sgos_2: 'No',
        is_additional_items: 'No',
        is_gmis: 'No',
        remarks: '',
        timeline_vision: '',
        expected_completion_date: ''
      }));
      setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
      return;
    }

    setFormData(prev => ({ ...prev, goal_b1: b1Id }));

    try {
      const res = await fetchOvdAddData(
        formData.goal_a1, 
        formData.intervention_a2, 
        b1Id, 
        0, 
        'B2', 
        formData.organisation_id
      );

      const generatedB2Code = res?.newCode?.[0]?.B2Code || '';
      const meta = res?.result?.[0] || {};

      const catLabel = CATEGORY_MAP[meta.category] || meta.category || '';
      const wingLabel = WINGS_MAP[meta.wings] || meta.wings || '';
      const prioLabel = PRIORITY_MAP[meta.priority] || meta.priority || '';
      const vibhasLabel = VIBHAS_MAP[meta.vibhas] || meta.vibhas || '';

      setFormData(prev => ({
        ...prev,
        intervention_code_b2: generatedB2Code,
        category: catLabel,
        rawCategory: meta.category || 7,
        wings: wingLabel,
        rawWings: meta.wings || 3,
        priority: prioLabel,
        rawPriority: meta.priority || 2,
        vibhas: vibhasLabel,
        rawVibhas: meta.vibhas || 14,
        is_miv_2030: meta.is_miv ? 'Yes' : 'No',
        miv_chapter: meta.miv_chapter || '',
        is_makv_2047: meta.is_makv ? 'Yes' : 'No',
        makv_theme: meta.makv_theme || '',
        is_sgos_2: meta.is_sgos ? 'Yes' : 'No',
        is_additional_items: meta.is_additional_item ? 'Yes' : 'No',
        is_gmis: meta.is_gmis ? 'Yes' : 'No',
        remarks: meta.Response || meta.remarks || meta.comments || meta.Outcomes_Remarks || '',
        timeline_vision: meta.target_date ? String(meta.target_date).slice(0, 10) : '',
        expected_completion_date: meta.expected_date ? String(meta.expected_date).slice(0, 10) : ''
      }));

      // Initialize first Actionable Item row with auto-generated code
      if (generatedB2Code) {
        setB3Rows([
          { id: 1, actionCode: `${generatedB2Code}.1`, actionDes: '' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching OVD add data for B1:', err);
    }
  };

  // Add B3 Row in Table
  const handleAddB3Row = () => {
    const b2Code = formData.intervention_code_b2;
    const nextIndex = b3Rows.length + 1;
    const nextCode = b2Code ? `${b2Code}.${nextIndex}` : '';
    setB3Rows(prev => [
      ...prev,
      { id: Date.now(), actionCode: nextCode, actionDes: '' }
    ]);
  };

  // Remove B3 Row from Table
  const handleRemoveB3Row = (indexToRemove) => {
    if (b3Rows.length <= 1) return;
    const b2Code = formData.intervention_code_b2;
    const updated = b3Rows
      .filter((_, idx) => idx !== indexToRemove)
      .map((row, idx) => ({
        ...row,
        actionCode: b2Code ? `${b2Code}.${idx + 1}` : ''
      }));
    setB3Rows(updated);
  };

  // Update B3 Row description
  const handleB3DesChange = (index, value) => {
    setB3Rows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], actionDes: value };
      return copy;
    });
  };

  // Clear B3 Rows
  const handleClearB3 = () => {
    const b2Code = formData.intervention_code_b2;
    setB3Rows([
      { id: 1, actionCode: b2Code ? `${b2Code}.1` : '', actionDes: '' }
    ]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Handler for Add Initiative
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setValidated(true);

    if (!formData.organisation_id) {
      triggerNotification?.("Please select an Implementing Agency", "error");
      return;
    }
    if (!formData.goal_a1) {
      triggerNotification?.("Please select a National Level Goal (A1)", "error");
      return;
    }
    if (!formData.intervention_a2) {
      triggerNotification?.("Please select a National Level Intervention (A2)", "error");
      return;
    }
    if (!formData.goal_b1) {
      triggerNotification?.("Please select a Goal (B1)", "error");
      return;
    }
    if (level === 'B2') {
      if (!formData.intervention_b2.trim()) {
        triggerNotification?.("Please enter Intervention (B2)", "error");
        return;
      }
      const hasB3 = b3Rows.some(r => r.actionDes && r.actionDes.trim().length > 0);
      if (!hasB3) {
        triggerNotification?.("Please enter at least one Actionable Item (B3) along with the B2 intervention", "error");
        return;
      }
    } else {
      if (!formData.action_b3.trim()) {
        triggerNotification?.("Please enter Actionable Item (B3)", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const userId = getUserIdFromToken();
      const validB3Rows = b3Rows.filter(r => r.actionDes && r.actionDes.trim().length > 0);

      const payload = {
        goalA1: parseInt(formData.goal_a1, 10),
        a2Intervention: parseInt(formData.intervention_a2, 10),
        goalB1: parseInt(formData.goal_b1, 10),
        interventionB2: formData.intervention_b2,
        interventionB2Code: formData.intervention_code_b2,
        actionB3: level === 'B2' ? validB3Rows.map(r => ({
          actionCode: r.actionCode,
          actionDes: r.actionDes
        })) : [{
          actionCode: formData.action_code_b3,
          actionDes: formData.action_b3
        }],
        category: formData.rawCategory || 7,
        implementingAgency: parseInt(formData.organisation_id, 10),
        wings: formData.rawWings || 3,
        priority: formData.rawPriority || 2,
        ViBhas: formData.rawVibhas || 14,
        partOfMIV2030: formData.is_miv_2030 === 'Yes' ? 1 : 0,
        partOfMAKV2047: formData.is_makv_2047 === 'Yes' ? 1 : 0,
        partOfSGoS2: formData.is_sgos_2 === 'Yes' ? 1 : 0,
        partOfGMIS: formData.is_gmis === 'Yes' ? 1 : 0,
        partOfAddItem: formData.is_additional_items === 'Yes' ? 1 : 0,
        party1: null,
        party2: null,
        mivChapterSelect: formData.miv_chapter || null,
        makvThemeSelect: formData.makv_theme || null,
        Remarks: formData.remarks || null,
        actualDate: formData.expected_completion_date || null,
        completionDate: formData.timeline_vision || null,
        userID: userId
      };

      await saveOvdB2B3Action(payload);
      triggerNotification?.(`New ${level === 'B2' ? 'Initiative' : 'Actionable Item'} submitted successfully`, "success");
      onSuccess ? onSuccess() : null;
    } catch (err) {
      console.error("OVOD Form submit error:", err);
      triggerNotification?.(err.response?.data?.message || err.message || "Failed to submit item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-800 dark:text-slate-100 pb-12 animate-fade-in font-sans">
      
      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden p-6 md:p-8">
        
        {/* Top Header Row matching screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              Add Initiative
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Level Selector */}
            <div className="inline-flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Level:</span>
              <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="B2"
                  checked={level === 'B2'}
                  onChange={() => setLevel('B2')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className={`text-xs ${level === 'B2' ? 'font-black text-amber-700 dark:text-amber-400' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                  Intervention (B2)
                </span>
              </label>
              <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="B3"
                  checked={level === 'B3'}
                  onChange={() => setLevel('B3')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className={`text-xs ${level === 'B3' ? 'font-black text-amber-700 dark:text-amber-400' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                  Actionable Item (B3)
                </span>
              </label>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic hidden lg:inline-block">
              *Note: While adding a new B2, you also need to enter at least one B3 along with it.
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitAdd} className="space-y-8">
          
          {/* ========================================================================= */}
          {/* ======================= SECTION 1: GENERAL DETAILS ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                General Details
              </h2>
            </div>

            {/* Implementing Agency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Implementing Agency<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="organisation_id"
                  value={formData.organisation_id}
                  onChange={handleAgencyChange}
                  required
                  className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer ${
                    formData.organisation_id 
                      ? 'border-emerald-500 dark:border-emerald-500 pr-10' 
                      : validated 
                      ? 'border-rose-400 dark:border-rose-500' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <option value="">--Select Implementing Agency--</option>
                  {agencies.map(a => (
                    <option key={a.ia_id} value={a.ia_id}>
                      {a.ia_name}
                    </option>
                  ))}
                </select>
                {formData.organisation_id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
              </div>
            </div>

            {/* National Level Goal (A1) & National Level Intervention (A2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* National Level Goal (A1) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  National Level Goal (A1)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="goal_a1"
                    value={formData.goal_a1}
                    onChange={handleA1Change}
                    disabled={!formData.organisation_id}
                    required
                    className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${
                      formData.goal_a1 
                        ? 'border-emerald-500 dark:border-emerald-500 pr-10' 
                        : validated 
                        ? 'border-rose-400 dark:border-rose-500' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Goal (A1)--</option>
                    {a1List.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.goal_a1}
                      </option>
                    ))}
                  </select>
                  {formData.goal_a1 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* National Level Intervention (A2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  National Level Intervention (A2)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="intervention_a2"
                    value={formData.intervention_a2}
                    onChange={handleA2Change}
                    disabled={!formData.goal_a1}
                    required
                    className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${
                      formData.intervention_a2 
                        ? 'border-emerald-500 dark:border-emerald-500 pr-10' 
                        : validated 
                        ? 'border-rose-400 dark:border-rose-500' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Intervention (A2)--</option>
                    {filteredA2List.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.intervention}
                      </option>
                    ))}
                  </select>
                  {formData.intervention_a2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Goal (B1), Intervention (B2), Intervention Code (B2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Goal (B1) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal (B1)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="goal_b1"
                    value={formData.goal_b1}
                    onChange={handleB1Change}
                    disabled={!formData.intervention_a2}
                    required
                    className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${
                      formData.goal_b1 
                        ? 'border-emerald-500 dark:border-emerald-500 pr-10' 
                        : validated 
                        ? 'border-rose-400 dark:border-rose-500' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">--Select Goal (B1)--</option>
                    {filteredB1List.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.b1_goals}
                      </option>
                    ))}
                  </select>
                  {formData.goal_b1 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Intervention (B2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intervention (B2)<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  {level === 'B2' ? (
                    <input
                      type="text"
                      name="intervention_b2"
                      value={formData.intervention_b2}
                      onChange={handleChange}
                      placeholder="Enter Intervention (B2)..."
                      required
                      className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all ${
                        formData.intervention_b2.trim()
                          ? 'border-emerald-500 dark:border-emerald-500 pr-10'
                          : validated
                          ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500/30'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                  ) : (
                    <select
                      name="intervention_b2"
                      value={formData.intervention_b2}
                      onChange={handleChange}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">--Select Intervention (B2)--</option>
                      {filteredB2List.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.intervention}
                        </option>
                      ))}
                    </select>
                  )}
                  {level === 'B2' && formData.intervention_b2.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  {level === 'B2' && validated && !formData.intervention_b2.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Intervention Code (B2) - Read Only */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intervention Code (B2)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="intervention_code_b2"
                  value={formData.intervention_code_b2}
                  readOnly
                  disabled
                  placeholder="Auto-generated (e.g. E-CB-23.2)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Category, Wings, Priority, Vibhas/Navic - Read Only Auto populated */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.category}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wings<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.wings}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.priority}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vibhas/ Navic<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vibhas}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ======================= SECTION 2: ACTIONABLE ITEM ====================== */}
          {/* ========================================================================= */}
          {level === 'B2' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-amber-600/70 pb-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Actionable Item
                </h2>
                <button
                  type="button"
                  onClick={handleClearB3}
                  className="bg-[#dc2626] hover:bg-rose-700 text-white px-4 py-1 text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {/* Actionable Item Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#154b8a] text-white">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16 font-bold border-r border-blue-900/40">S.No</th>
                      <th className="py-2.5 px-4 text-center w-64 font-bold border-r border-blue-900/40">Actionable Item Code (B3)</th>
                      <th className="py-2.5 px-4 text-center font-bold border-r border-blue-900/40">Actionable Item Description (B3)</th>
                      <th className="py-2.5 px-3 text-center w-24 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {b3Rows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {/* S.No */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                          {index + 1}
                        </td>

                        {/* Actionable Item Code (B3) */}
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={row.actionCode}
                            readOnly
                            disabled
                            placeholder="Auto-generated"
                            className="w-full text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                          />
                        </td>

                        {/* Actionable Item Description (B3) */}
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={row.actionDes}
                            onChange={(e) => handleB3DesChange(index, e.target.value)}
                            placeholder="Enter Actionable Item Description..."
                            className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>

                        {/* Action buttons (+ and trash) */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={handleAddB3Row}
                              title="Add another B3 actionable item"
                              className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition cursor-pointer p-1"
                            >
                              <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center hover:border-blue-600">
                                <Plus size={13} className="stroke-[2.5]" />
                              </div>
                            </button>

                            {b3Rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveB3Row(index)}
                                title="Remove this B3 item"
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Single B3 Entry Mode */
            <div className="space-y-4">
              <div className="border-b border-amber-600/70 pb-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Actionable Item (B3) Details
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Actionable Item (B3) Description<span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="action_b3"
                    value={formData.action_b3}
                    onChange={handleChange}
                    placeholder="Enter Actionable Item Description..."
                    required
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Actionable Item Code (B3)
                  </label>
                  <input
                    type="text"
                    name="action_code_b3"
                    value={formData.action_code_b3}
                    onChange={handleChange}
                    placeholder="e.g. E-CB-23.2.1"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ======================= SECTION 3: SOURCE DOCUMENT ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Source Document
              </h2>
            </div>

            {/* Row 1: MIV 2030 (Y/N) & MIV Chapter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is it part of MIV 2030? (Y/N)
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_miv_2030"
                      value="Yes"
                      checked={formData.is_miv_2030 === 'Yes'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_miv_2030"
                      value="No"
                      checked={formData.is_miv_2030 === 'No'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  MIV Chapter
                </label>
                <input
                  type="text"
                  value={formData.miv_chapter}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 2: MAKV 2047 (Y/N) & MAKV Theme */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is it part of MAKV 2047? (Y/N)
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_makv_2047"
                      value="Yes"
                      checked={formData.is_makv_2047 === 'Yes'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_makv_2047"
                      value="No"
                      checked={formData.is_makv_2047 === 'No'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  MAKV Theme
                </label>
                <input
                  type="text"
                  value={formData.makv_theme}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 3: SGoS-2 & Additional Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is it part of SGoS-2? (Y/N)
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_sgos_2"
                      value="Yes"
                      checked={formData.is_sgos_2 === 'Yes'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_sgos_2"
                      value="No"
                      checked={formData.is_sgos_2 === 'No'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is it part of Additional Items? (Y/N)
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_additional_items"
                      value="Yes"
                      checked={formData.is_additional_items === 'Yes'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_additional_items"
                      value="No"
                      checked={formData.is_additional_items === 'No'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 4: GMIS & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is it part of GMIS? (Y/N)
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_gmis"
                      value="Yes"
                      checked={formData.is_gmis === 'Yes'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed">
                    <input
                      type="radio"
                      name="is_gmis"
                      value="No"
                      checked={formData.is_gmis === 'No'}
                      readOnly
                      disabled
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ========================== SECTION 4: TIMELINES ========================= */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="border-b border-amber-600/70 pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Timelines
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Timeline As Per Vision Document
                </label>
                <input
                  type="text"
                  name="timeline_vision"
                  value={formData.timeline_vision}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected/Actual Date Of Completion
                </label>
                <input
                  type="date"
                  name="expected_completion_date"
                  value={formData.expected_completion_date}
                  onChange={handleChange}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{submitting ? "Saving..." : `Save ${level === 'B2' ? 'Initiative' : 'Actionable Item'}`}</span>
            </button>
          </div>

        </form>

        {/* Footer Note */}
        <div className="pt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Copyright © 2025 Ministry of Ports, Shipping and Waterways, Government of India, All Rights Reserved
        </div>

      </div>

    </div>
  );
}
