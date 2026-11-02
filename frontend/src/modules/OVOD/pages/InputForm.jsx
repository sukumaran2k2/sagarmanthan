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
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { OVOD_TOASTS } from '../toastMessages';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

// MONTHS and YEARS still used by AddInitiativeView progress log rows (do not remove)

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
  const notify = useNotifier(triggerNotification);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    id: editData.id,
    goal_a1_label: editData['Goal (A1)'] || editData.goal_a1 || '',
    intervention_a2_label: editData['Intervention (A2)'] || editData.intervention_a2 || '',
    action_a3_label: editData['Action (A3)'] || editData.action_a3 || '',
    a3_id: editData.action_a3_id || null,

    category_label: editData.Category || editData.category || '',
    agency_label: editData.ia_name || editData.organisation_name || '',
    wing_label: editData.Wing || editData.wings || '',
    priority_label: editData.Priority || editData.priority || '',
    vibhas_label: editData.Vibhas || editData.vibhas || '',

    total_cost: editData.total_cost != null ? String(editData.total_cost) : '',
    current_status: editData.current_status || 'No Update',
    reasons_for_delay: '',
    reasons_for_drop: '',

    // Output / Outcome (shown when Completed)
    direct_employment: '',
    indirect_employment: '',
    direct_investment: '',
    indirect_investment: '',
    output_outcome_desc: '',
    output_outcome_remarks: '',

    // Timelines
    timeline_vision: '',
    expected_completion_date: '',

    // Others
    feedback_ministry: '',
    response_org: ''
  });

  // Monthly Progress Log Rows State (shown only when Under Implementation)
  const [progressLogRows, setProgressLogRows] = useState([
    { id: 1, month: '', year: '', physicalProgress: '', financialProgress: '' }
  ]);

  // Fund Requirement Rows State
  const [financeRows, setFinanceRows] = useState([{
    id: 1, capExpenditure: '', sourceOfFund: '', fundSpend: '',
    oneYear: '', threeYear: '', threeFiveYear: '', greaterFive: '', detailedBreakUp: '',
    annexureFile: null, annexureFileName: ''
  }]);

  // Modal State for Edit (A3)
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

        setFormData(prev => ({
          ...prev,
          total_cost: row.total_cost != null ? String(row.total_cost) : prev.total_cost,
          current_status: row.current_status || prev.current_status,
          // Auto-populate from lookup maps (DB stores numeric IDs)
          category_label: row.category != null ? (CATEGORY_MAP[row.category] || String(row.category)) : prev.category_label,
          wing_label: row.wings != null ? (WINGS_MAP[row.wings] || String(row.wings)) : prev.wing_label,
          priority_label: row.priority != null ? (PRIORITY_MAP[row.priority] || String(row.priority)) : prev.priority_label,
          vibhas_label: row.vibhas != null ? (VIBHAS_MAP[row.vibhas] || String(row.vibhas)) : prev.vibhas_label,
          feedback_ministry: row.Feedback || '',
          response_org: row.Response || '',
          timeline_vision: row.target_date ? String(row.target_date).slice(0, 10) : '',
          expected_completion_date: row.expected_date ? String(row.expected_date).slice(0, 10) : ''
        }));

        const financeData = res?.financeResult || [];
        if (Array.isArray(financeData) && financeData.length > 0) {
          setFinanceRows(financeData.map((f, idx) => ({
            id: idx + 1,
            capExpenditure: f.capital_expenditure != null ? String(f.capital_expenditure) : '',
            sourceOfFund: f.source_of_funding || '',
            fundSpend: f.fund_spend != null ? String(f.fund_spend) : '',
            oneYear: f.one_year != null ? String(f.one_year) : '',
            threeYear: f.three_year != null ? String(f.three_year) : '',
            threeFiveYear: f.three_five_year != null ? String(f.three_five_year) : '',
            greaterFive: f.greater_five_year != null ? String(f.greater_five_year) : '',
            detailedBreakUp: f.detail_breakup || '',
            annexureFile: null,
            annexureFileName: f.annexure_file || ''
          })));
        }

        const progressData = res?.progressLogResult || [];
        if (Array.isArray(progressData) && progressData.length > 0) {
          setProgressLogRows(progressData.map((p, idx) => {
            // progress_date stored as "Oct-2026" → split back to month + year
            const parts = p.progress_date ? String(p.progress_date).split('-') : [];
            return {
              id: idx + 1,
              month: parts[0] || '',
              year: parts[1] || '',
              physicalProgress: p.physical_progress != null ? String(p.physical_progress) : '',
              financialProgress: p.financial_progress != null ? String(p.financial_progress) : ''
            };
          }));
        }
      })
      .catch(err => {
        console.error("Error loading initiative details:", err);
      })
      .finally(() => setLoading(false));
  }, [editData]);

  // Open Edit A3 Name Modal directly
  const handleOpenEditChoice = () => {
    const currentA3 = formData.action_a3_label;
    const cleanName = currentA3.includes(':') ? currentA3.split(':').slice(1).join(':').trim() : currentA3;
    setActionNameInput(cleanName);
    setShowEditNameModal(true);
  };

  // Submit Updated A3 Name
  const handleSaveActionName = async () => {
    if (!actionNameInput.trim()) return;
    setUpdatingName(true);
    try {
      const payload = {
        bType: 'B3',
        actionInput: actionNameInput.trim(),
        b3Actions: formData.a3_id
      };
      await updateOvdAction(payload);
      notify(OVOD_TOASTS.nameUpdated('A3'));

      const prefix = formData.action_a3_label.includes(':')
        ? formData.action_a3_label.split(':')[0].trim()
        : 'A3';
      setFormData(prev => ({
        ...prev,
        action_a3_label: `${prefix} : ${actionNameInput.trim()}`
      }));
      setShowEditNameModal(false);
    } catch (err) {
      console.error("Error updating action name:", err);
      notify(OVOD_TOASTS.nameUpdateFailed('A3', getErrorMessage(err)));
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

  // Fund requirement totals (derived from financeRows)
  const financeTotals = useMemo(() => {
    const rowCapEx = (r) => {
      // Use stored value if the user has typed one; otherwise fall back to auto-formula
      if (r.capExpenditure !== '') return parseFloat(r.capExpenditure) || 0;
      return (parseFloat(r.fundSpend) || 0) +
        (parseFloat(r.oneYear) || 0) + (parseFloat(r.threeYear) || 0) +
        (parseFloat(r.threeFiveYear) || 0) + (parseFloat(r.greaterFive) || 0);
    };
    const fundReq = financeRows.reduce((acc, r) =>
      acc + (parseFloat(r.oneYear) || 0) + (parseFloat(r.threeYear) || 0) +
      (parseFloat(r.threeFiveYear) || 0) + (parseFloat(r.greaterFive) || 0), 0);
    const fundSpent = financeRows.reduce((acc, r) => acc + (parseFloat(r.fundSpend) || 0), 0);
    const capEx = financeRows.reduce((acc, r) => acc + rowCapEx(r), 0);
    return { fundReq, fundSpent, capEx, totalCost: parseFloat(formData.total_cost) || 0 };
  }, [financeRows, formData.total_cost]);

  // Submit Update Initiative Form
  const handleSubmitUpdate = async (e) => {
    e.preventDefault();

    // Validate fund requirement balance only when total_cost and finance rows are filled
    if (formData.total_cost && String(formData.total_cost).trim() !== '') {
      const { fundReq, fundSpent, capEx, totalCost } = financeTotals;
      const round2 = (n) => Math.round(n * 100) / 100;
      if (round2(capEx) !== round2(totalCost)) {
        triggerNotification?.('error', 'Validation Error', `Capital Expenditure total (${round2(capEx)}) must equal Total Cost (${round2(totalCost)})`);
        return;
      }
    }

    // Monthly Progress Logs are shown for Under Implementation AND Completed
    const showProgressLog = formData.current_status && (
      formData.current_status.toLowerCase().includes('under implementation') ||
      formData.current_status === 'Completed'
    );
    const finalProgressRows = [...progressLogRows];

    setSubmitting(true);
    try {
      const userId = getUserIdFromToken();

      const payload = {
        ID: editData.id,
        totalCost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        statusCurrent: formData.current_status,
        Response: formData.response_org,
        Feedback: formData.feedback_ministry,
        completionDate: formData.timeline_vision || null,
        actualDate: formData.expected_completion_date || null,
        Delay: formData.reasons_for_delay || null,
        reasonsForDrop: formData.reasons_for_drop || null,
        directEmployment: formData.direct_employment ? parseFloat(formData.direct_employment) : null,
        indirectEmployment: formData.indirect_employment ? parseFloat(formData.indirect_employment) : null,
        directInvestment: formData.direct_investment ? parseFloat(formData.direct_investment) : null,
        indirectInvestment: formData.indirect_investment ? parseFloat(formData.indirect_investment) : null,
        outputOutcomeDesc: formData.output_outcome_desc || null,
        outputOutcomeRemarks: formData.output_outcome_remarks || null,
        ovodProgressLogData: showProgressLog
          ? finalProgressRows
              .filter(r => r.month && r.year)
              .map(r => ({
                progressDate: `${r.month}-${r.year}`,
                physicalProgress: r.physicalProgress || '0',
                financialProgress: r.financialProgress || '0'
              }))
          : [],
        ovodFinanceData: financeRows.filter(r =>
          r.capExpenditure || r.sourceOfFund || r.fundSpend ||
          r.oneYear || r.threeYear || r.threeFiveYear || r.greaterFive || r.detailedBreakUp
        ),
        userID: userId
      };

      await updateOvdFullItem(payload);

      // The initiative is saved at this point; report an upload failure separately so the
      // user isn't told the whole update failed
      if (selectedFile) {
        const docFormData = new FormData();
        docFormData.append('file', selectedFile);
        docFormData.append('ID', editData.id);
        try {
          await uploadOvdDocument(docFormData);
        } catch (uploadErr) {
          console.error("Error uploading initiative document:", uploadErr);
          notify(OVOD_TOASTS.documentUploadFailed(getErrorMessage(uploadErr)));
          if (onSuccess) onSuccess();
          return;
        }
      }

      notify(OVOD_TOASTS.updated());
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error updating initiative:", err);
      notify(OVOD_TOASTS.updateFailed(getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-800 dark:text-slate-100 pb-12 animate-fade-in font-sans">
      
      {/* Form Container */}
      <div className="module-form-card">
        
        <div className="module-form-banner">
          <div>
            <h3 className="module-form-banner-title">Update Initiative</h3>
            <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
          </div>
        </div>

        <form onSubmit={handleSubmitUpdate} className="px-6 md:px-8 pt-6 md:pt-8 space-y-8">
          
          {/* ========================================================================= */}
          {/* ======================= SECTION 1: GENERAL DETAILS ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">General Details</h2>
              <button
                type="button"
                onClick={handleOpenEditChoice}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs transition cursor-pointer"
              >
                <Edit2 size={12} />
                <span>Edit (A3)</span>
              </button>
            </div>

            {/* Row 1: A1 & A2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">National Level Goal (A1)<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.goal_a1_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
              <div>
                <label className="module-form-label">National Level Intervention (A2)<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.intervention_a2_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
            </div>

            {/* Row 2: A3 */}
            <div>
              <label className="module-form-label">Actionable Item (A3)<span className="text-rose-500">*</span></label>
              <input type="text" value={formData.action_a3_label} readOnly disabled
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
            </div>

            {/* Row 3: Category | Total Cost | Implementing Agency | Wing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="module-form-label">Category<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.category_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
              <div>
                <label className="module-form-label">Total Cost (In. Cr)</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" name="total_cost"
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
                <label className="module-form-label">Implementing Agency<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.agency_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
              <div>
                <label className="module-form-label">Wing<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.wing_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
            </div>

            {/* Row 4: Priority & Vibhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">Priority<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.priority_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
              <div>
                <label className="module-form-label">Vibhas/ Navic<span className="text-rose-500">*</span></label>
                <input type="text" value={formData.vibhas_label} readOnly disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ============================ SECTION 2: STATUS ========================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">Status</h2>
            </div>
            <div>
              <label className="module-form-label">Current Status<span className="text-rose-500">*</span></label>
              <div className="relative">
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_status: e.target.value }))}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-emerald-500 dark:border-emerald-500 pr-10 font-semibold focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">--Select Status--</option>
                  {OVOD_STATUSES.filter(s => s.id !== '0' && s.id !== 'No Update').map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Reasons for Dropped — shown only when Dropped */}
          {formData.current_status === 'Dropped' && (
            <div>
              <label className="module-form-label">Reasons For Dropped</label>
              <textarea
                value={formData.reasons_for_drop}
                onChange={e => setFormData(prev => ({ ...prev, reasons_for_drop: e.target.value }))}
                rows={4}
                placeholder="Describe reasons for dropping this initiative..."
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Reasons for Delay — shown only when Delayed */}
          {formData.current_status && formData.current_status.toLowerCase().includes('delayed') && (
            <div>
              <label className="module-form-label">
                Reasons For Delay (if Any) / Brief Status <span className="font-normal text-slate-400">(Not More Than 200 Words)</span>
              </label>
              <textarea
                value={formData.reasons_for_delay}
                onChange={e => setFormData(prev => ({ ...prev, reasons_for_delay: e.target.value }))}
                maxLength={1400}
                rows={4}
                placeholder="Describe reasons for delay or current brief status..."
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* ================= SECTION 2.5: MONTHLY PROGRESS LOGS =================== */}
          {/* Shown only when status is Under Implementation                           */}
          {/* ========================================================================= */}
          {formData.current_status && (formData.current_status.toLowerCase().includes('under implementation') || formData.current_status === 'Completed') && (
            <div className="space-y-3">
              <div className="module-form-section-header">
                <h2 className="module-form-section-heading">Monthly Progress Logs</h2>
                <button
                  type="button"
                  onClick={() => setProgressLogRows([{ id: Date.now(), month: '', year: '', physicalProgress: '', financialProgress: '' }])}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition"
                >
                  Clear All Rows
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#154b8a] text-white">
                      <th className="px-3 py-2 font-semibold text-center border border-blue-900/40">Month &amp; Year (MM-YY)</th>
                      <th className="px-3 py-2 font-semibold text-center border border-blue-900/40">Physical Progress</th>
                      <th className="px-3 py-2 font-semibold text-center border border-blue-900/40">Financial Progress (%)</th>
                      <th className="px-3 py-2 font-semibold text-center border border-blue-900/40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressLogRows.map((row, idx) => {
                      const updateLog = (field, val) =>
                        setProgressLogRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
                      return (
                        <tr key={row.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <div className="flex gap-1">
                              <select
                                value={row.month}
                                onChange={e => updateLog('month', e.target.value)}
                                className="flex-1 px-1.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                              >
                                <option value="">Month</option>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <select
                                value={row.year}
                                onChange={e => updateLog('year', e.target.value)}
                                className="flex-1 px-1.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                              >
                                <option value="">Year</option>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                          </td>
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={row.physicalProgress}
                              onChange={e => updateLog('physicalProgress', e.target.value)}
                              placeholder="Physical Progress %"
                              className="w-full px-1.5 py-1 text-[11px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={row.financialProgress}
                              onChange={e => updateLog('financialProgress', e.target.value)}
                              placeholder="Financial Progress %"
                              className="w-full px-1.5 py-1 text-[11px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {progressLogRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setProgressLogRows(prev => prev.filter((_, i) => i !== idx))}
                                  title="Delete row"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-rose-500 text-rose-500 hover:text-rose-700 hover:border-rose-700 transition cursor-pointer"
                                >
                                  <Minus size={10} className="stroke-[2.5]" />
                                </button>
                              )}
                              {idx === progressLogRows.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => setProgressLogRows(prev => [
                                    ...prev,
                                    { id: Date.now(), month: '', year: '', physicalProgress: '', financialProgress: '' }
                                  ])}
                                  title="Add row"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-500 text-slate-600 hover:text-blue-600 hover:border-blue-600 transition cursor-pointer"
                                >
                                  <Plus size={10} className="stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Output / Outcome — shown only when Completed */}
          {formData.current_status === 'Completed' && (
            <div className="space-y-4">
              <div className="module-form-section-header">
                <h2 className="module-form-section-heading">Output / Outcome</h2>
              </div>

              {/* Employment & Investment grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="module-form-label">Direct Employment Generated (No. Of People)<span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="0"
                    value={formData.direct_employment}
                    onChange={e => setFormData(prev => ({ ...prev, direct_employment: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="module-form-label">Indirect Employment Generated (No. Of People)<span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="0"
                    value={formData.indirect_employment}
                    onChange={e => setFormData(prev => ({ ...prev, indirect_employment: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="module-form-label">Direct Investment Created (In Cr.)<span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.direct_investment}
                    onChange={e => setFormData(prev => ({ ...prev, direct_investment: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="module-form-label">Indirect Investment Created (In Cr.)<span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.indirect_investment}
                    onChange={e => setFormData(prev => ({ ...prev, indirect_investment: e.target.value }))}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Description + Remarks side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="module-form-label text-[11px] leading-tight">
                    Output / Outcome Of The Completed Initiative{' '}
                    <span className="font-normal text-slate-400 italic">
                      (Example: Reduction in turn-around time (hours) capacity created (MTPA), beneficiaries impacted (Number), Infrastructure Developed (road/rail with length in kilometres), etc)
                    </span>
                  </label>
                  <textarea
                    value={formData.output_outcome_desc}
                    onChange={e => setFormData(prev => ({ ...prev, output_outcome_desc: e.target.value }))}
                    rows={4}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="module-form-label">Output/Outcomes<br />(Remarks)</label>
                  <textarea
                    value={formData.output_outcome_remarks}
                    onChange={e => setFormData(prev => ({ ...prev, output_outcome_remarks: e.target.value }))}
                    rows={4}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ========================== SECTION 5: TIMELINES ========================= */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">
                Timelines
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">
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
                <label className="module-form-label">
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
          {/* ====================== SECTION 5.5: FUND REQUIREMENT ==================== */}
          {/* ========================================================================= */}
          {formData.total_cost && String(formData.total_cost).trim() !== '' && (
            <div className="space-y-3">
              <div className="module-form-section-header">
                <h2 className="module-form-section-heading">Fund Requirement</h2>
                <button
                  type="button"
                  onClick={() => setFinanceRows([{
                    id: Date.now(), capExpenditure: '', sourceOfFund: '', fundSpend: '',
                    oneYear: '', threeYear: '', threeFiveYear: '', greaterFive: '', detailedBreakUp: '',
                    annexureFile: null, annexureFileName: ''
                  }])}
                  className="bg-[#dc2626] hover:bg-rose-700 text-white px-4 py-1 text-xs font-bold rounded shadow-xs transition cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#154b8a] text-white">
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Source of Funding</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Fund Spent<br />(In. Cr)</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" colSpan={4}>Fund Requirement (In. Cr)</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Capital Expenditure<br />(INR Crore)</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Detailed Break up<br />of the Requirement</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Annexure &amp; Concept Note</th>
                      <th className="px-2 py-2 font-semibold text-center border border-blue-900/40" rowSpan={2}>Actions</th>
                    </tr>
                    <tr className="bg-[#1e5fa3] text-white">
                      <th className="px-2 py-1 font-semibold text-center border border-blue-900/40">1 YEAR</th>
                      <th className="px-2 py-1 font-semibold text-center border border-blue-900/40">3 YEARS</th>
                      <th className="px-2 py-1 font-semibold text-center border border-blue-900/40">&gt;3 years up to 5 years</th>
                      <th className="px-2 py-1 font-semibold text-center border border-blue-900/40">&gt; 5 years</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeRows.map((row, idx) => {
                      const updateRow = (field, val) =>
                        setFinanceRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
                      const numInput = (field) => (
                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number" min="0" step="0.01"
                            value={row[field]}
                            onChange={e => updateRow(field, e.target.value)}
                            className="w-full px-1.5 py-1 text-[11px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                            placeholder="0.00"
                          />
                        </td>
                      );
                      const autoCapEx = (
                        (parseFloat(row.fundSpend) || 0) +
                        (parseFloat(row.oneYear) || 0) +
                        (parseFloat(row.threeYear) || 0) +
                        (parseFloat(row.threeFiveYear) || 0) +
                        (parseFloat(row.greaterFive) || 0)
                      );
                      return (
                        <tr key={row.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <select
                              value={row.sourceOfFund}
                              onChange={e => updateRow('sourceOfFund', e.target.value)}
                              className="w-full px-1.5 py-1 text-[11px] bg-white dark:bg-slate-900 border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                            >
                              <option value="">Select Source of Fund</option>
                              <option value="GBS">GBS</option>
                              <option value="IEBR">IEBR</option>
                              <option value="PPP/SPV">PPP/SPV</option>
                              <option value="Debt">Debt</option>
                              <option value="Other (Angel investment, VC fund, etc.)">Other (Angel investment, VC fund, etc.)</option>
                            </select>
                          </td>
                          {numInput('fundSpend')}
                          {numInput('oneYear')}
                          {numInput('threeYear')}
                          {numInput('threeFiveYear')}
                          {numInput('greaterFive')}
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <input
                              type="number" min="0" step="0.01"
                              value={row.capExpenditure !== '' ? row.capExpenditure : (autoCapEx > 0 ? autoCapEx.toFixed(2) : '')}
                              onChange={e => updateRow('capExpenditure', e.target.value)}
                              onFocus={() => { if (row.capExpenditure === '' && autoCapEx > 0) updateRow('capExpenditure', autoCapEx.toFixed(2)); }}
                              className="w-full px-1.5 py-1 text-[11px] bg-[#fffbeb] dark:bg-slate-800 border-0 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded text-slate-700 dark:text-slate-200 font-medium"
                              placeholder="Auto"
                              title="Auto-calculated from Fund Requirement total. Editable."
                            />
                          </td>
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={row.detailedBreakUp}
                              onChange={e => updateRow('detailedBreakUp', e.target.value)}
                              className="w-full px-1.5 py-1 text-[11px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-700 dark:text-slate-200"
                              placeholder="Details..."
                            />
                          </td>

                          {/* Annexure & Concept Note column */}
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Upload button */}
                              <label
                                title="Upload annexure"
                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#f59e0b] hover:bg-amber-600 text-white cursor-pointer transition"
                              >
                                <Upload size={12} />
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                  onChange={e => {
                                    const file = e.target.files?.[0] || null;
                                    updateRow('annexureFile', file);
                                    updateRow('annexureFileName', file ? file.name : '');
                                  }}
                                />
                              </label>

                              {/* Download/view button — active only when a file exists */}
                              <button
                                type="button"
                                title={row.annexureFileName ? `Download: ${row.annexureFileName}` : 'No file uploaded'}
                                disabled={!row.annexureFileName}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-white transition ${row.annexureFileName ? 'bg-[#16a34a] hover:bg-emerald-700 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'}`}
                              >
                                <Download size={12} />
                              </button>
                            </div>
                            {row.annexureFileName && (
                              <p className="text-[9px] text-slate-500 truncate max-w-[80px] mt-0.5" title={row.annexureFileName}>
                                {row.annexureFileName}
                              </p>
                            )}
                          </td>

                          {/* Actions column */}
                          <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {financeRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setFinanceRows(prev => prev.filter((_, i) => i !== idx))}
                                  title="Delete row"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-rose-500 text-rose-500 hover:text-rose-700 hover:border-rose-700 transition cursor-pointer"
                                >
                                  <Minus size={10} className="stroke-[2.5]" />
                                </button>
                              )}
                              {idx === financeRows.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => setFinanceRows(prev => [
                                    ...prev,
                                    { id: Date.now(), capExpenditure: '', sourceOfFund: '', fundSpend: '', oneYear: '', threeYear: '', threeFiveYear: '', greaterFive: '', detailedBreakUp: '', annexureFile: null, annexureFileName: '' }
                                  ])}
                                  title="Add new row"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-500 text-slate-600 hover:text-blue-600 hover:border-blue-600 transition cursor-pointer"
                                >
                                  <Plus size={10} className="stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals footer row */}
                  <tfoot>
                    <tr className="bg-[#0f2f5c] text-white text-[11px] font-bold">
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center text-[10px] uppercase tracking-wide">Total</td>
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums">
                        {financeTotals.fundSpent.toFixed(2)}
                      </td>
                      {/* 1Y */}
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums">
                        {financeRows.reduce((s, r) => s + (parseFloat(r.oneYear) || 0), 0).toFixed(2)}
                      </td>
                      {/* 3Y */}
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums">
                        {financeRows.reduce((s, r) => s + (parseFloat(r.threeYear) || 0), 0).toFixed(2)}
                      </td>
                      {/* 3-5Y */}
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums">
                        {financeRows.reduce((s, r) => s + (parseFloat(r.threeFiveYear) || 0), 0).toFixed(2)}
                      </td>
                      {/* >5Y */}
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums">
                        {financeRows.reduce((s, r) => s + (parseFloat(r.greaterFive) || 0), 0).toFixed(2)}
                      </td>
                      {/* Cap Ex total */}
                      <td className="px-2 py-1.5 border border-blue-900/60 text-center tabular-nums bg-amber-800/60">
                        {financeTotals.capEx.toFixed(2)}
                      </td>
                      <td className="border border-blue-900/60" colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance validation bar */}
              {formData.total_cost && String(formData.total_cost).trim() !== '' && (() => {
                const round2 = (n) => Math.round(n * 100) / 100;
                const { fundReq, fundSpent, capEx, totalCost } = financeTotals;
                const ok = round2(capEx) === round2(totalCost);
                return (
                  <div className={`mt-2 rounded-xl border px-4 py-3 text-[11px] flex items-center justify-between gap-2 font-semibold ${ok ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'}`}>
                    <span>{ok ? '✓' : '✗'} Fund Spent + Fund Requirement = Capital Expenditure = Total Cost</span>
                    <span className="tabular-nums">
                      {fundSpent.toFixed(2)} + {fundReq.toFixed(2)} = {capEx.toFixed(2)} {ok ? '=' : '≠'} {parseFloat(totalCost).toFixed(2)}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ============================ SECTION 6: OTHERS ========================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
              <label className="module-form-label">
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
        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Copyright © 2025 Ministry of Ports, Shipping and Waterways, Government of India, All Rights Reserved
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ================== MODAL: UPDATE ACTIONABLE ITEM (A3) NAME ============== */}
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
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Update Action Name</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter new name for Actionable Item (A3)
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
                Enter Actionable Item Name (A3)
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={actionNameInput}
                  onChange={(e) => setActionNameInput(e.target.value)}
                  placeholder="Enter A3 name..."
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
  const notify = useNotifier(triggerNotification);

  // Implementing agencies are cached once in the OVOD store; use the built-in list when the
  // request returns nothing
  const loadOrganisations = useOvodStore((s) => s.loadOrganisations);
  const storedAgencies = useOvodStore((s) => s.organisations);
  const agencies = storedAgencies.length > 0 ? storedAgencies : DEFAULT_AGENCIES;
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  // Level Selector: 'B2' (Intervention) or 'B3' (Actionable Item)
  const [level, setLevel] = useState('B2');

  // Dynamic dropdown lists loaded by agency
  const [a1List, setA1List] = useState([]);
  const [allA2List, setAllA2List] = useState([]);
  const [allB1List, setAllB1List] = useState([]);
  const [allB2List, setAllB2List] = useState([]);

  // B3 rows for B2 mode (add multiple B3s along with a new B2)
  const [b3Rows, setB3Rows] = useState([{ id: 1, actionCode: '', actionDes: '' }]);

  // Form State
  const [formData, setFormData] = useState({
    organisation_id: '',
    goal_a1: '',
    intervention_a2: '',
    goal_b1: '',
    intervention_b2_id: '',
    intervention_b2: '',
    intervention_code_b2: '',
    action_b3: '',
    action_code_b3: '',

    // Auto-filled Metadata
    category: '',
    rawCategory: 7,
    wings: '',
    rawWings: 3,
    priority: '',
    rawPriority: 2,
    vibhas: '',
    rawVibhas: 14,
    party1: '',
    party2: '',

    // Source Document
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
    expected_completion_date: ''
  });

  // Load Implementing Agencies on mount
  useEffect(() => {
    loadOrganisations();
  }, [loadOrganisations]);

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

  // A2 filtered by selected A1 (for B2 mode)
  const filteredA2List = useMemo(() => {
    if (!formData.goal_a1 || !a1List.length) return [];
    const selectedA1 = a1List.find(item => String(item.id) === String(formData.goal_a1));
    if (!selectedA1) return [];
    return allA2List.filter(item => item.a1_code === selectedA1.a1_code);
  }, [formData.goal_a1, a1List, allA2List]);

  // B1 list: in B2 mode filtered by selected A2, in B3 mode show all
  const filteredB1List = useMemo(() => {
    if (level === 'B2') {
      if (!formData.intervention_a2 || !filteredA2List.length) return [];
      const selectedA2 = filteredA2List.find(item => String(item.id) === String(formData.intervention_a2));
      if (!selectedA2) return [];
      return allB1List.filter(item => item.a2_code === selectedA2.a2_code);
    }
    return allB1List;
  }, [level, formData.intervention_a2, filteredA2List, allB1List]);

  // Filter B2 based on selected B1 (for B3 mode)
  const filteredB2List = useMemo(() => {
    if (!formData.goal_b1 || !filteredB1List.length) return [];
    const selectedB1 = filteredB1List.find(item => String(item.id) === String(formData.goal_b1));
    if (!selectedB1) return [];
    return allB2List.filter(item => item.b1_code === selectedB1.b1_code);
  }, [formData.goal_b1, filteredB1List, allB2List]);

  const RESET_DOWNSTREAM = {
    goal_b1: '', intervention_b2_id: '', intervention_b2: '', intervention_code_b2: '',
    action_b3: '', action_code_b3: '',
    category: '', wings: '', priority: '', vibhas: '',
    party1: '', party2: '',
    is_miv_2030: 'No', miv_chapter: '', is_makv_2047: 'No', makv_theme: '',
    is_sgos_2: 'No', is_additional_items: 'No', is_gmis: 'No',
    remarks: '', timeline_vision: '', expected_completion_date: ''
  };

  // Handle Agency change
  const handleAgencyChange = (e) => {
    setFormData(prev => ({ ...prev, organisation_id: e.target.value, goal_a1: '', intervention_a2: '', ...RESET_DOWNSTREAM }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle A1 change (B2 mode)
  const handleA1Change = (e) => {
    setFormData(prev => ({ ...prev, goal_a1: e.target.value, intervention_a2: '', ...RESET_DOWNSTREAM }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle A2 change (B2 mode)
  const handleA2Change = (e) => {
    setFormData(prev => ({ ...prev, intervention_a2: e.target.value, ...RESET_DOWNSTREAM }));
    setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
  };

  // Handle B1 change: in B2 mode → API call to generate B2 code + metadata;
  //                   in B3 mode → auto-derive A1/A2 from B1, then show B2 dropdown
  const handleB1Change = async (e) => {
    const b1Id = e.target.value;
    if (!b1Id) {
      setFormData(prev => ({ ...prev, ...RESET_DOWNSTREAM, goal_b1: '' }));
      setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]);
      return;
    }

    if (level === 'B3') {
      // B3 mode: auto-derive A1/A2 from selected B1
      const selectedB1 = allB1List.find(item => String(item.id) === String(b1Id));
      const matchingA2 = selectedB1 ? allA2List.find(a => a.a2_code === selectedB1.a2_code) : null;
      const matchingA1 = matchingA2 ? a1List.find(a => a.a1_code === matchingA2.a1_code) : null;
      setFormData(prev => ({
        ...prev,
        goal_b1: b1Id,
        goal_a1: String(matchingA1?.id || ''),
        intervention_a2: String(matchingA2?.id || ''),
        intervention_b2_id: '', intervention_b2: '', intervention_code_b2: '',
        action_b3: '', action_code_b3: '',
        category: '', wings: '', priority: '', vibhas: '', party1: '', party2: '',
        is_miv_2030: 'No', miv_chapter: '', is_makv_2047: 'No', makv_theme: '',
        is_sgos_2: 'No', is_additional_items: 'No', is_gmis: 'No',
        remarks: '', timeline_vision: '', expected_completion_date: ''
      }));
      return;
    }

    // B2 mode: fetch generated B2 code + metadata
    setFormData(prev => ({ ...prev, goal_b1: b1Id }));
    try {
      const res = await fetchOvdAddData(
        formData.goal_a1, formData.intervention_a2, b1Id, 0, 'B2', formData.organisation_id
      );
      const generatedB2Code = res?.newCode?.[0]?.B2Code || '';
      const meta = res?.result?.[0] || {};
      setFormData(prev => ({
        ...prev,
        intervention_b2: '', intervention_b2_id: '',
        intervention_code_b2: generatedB2Code,
        category: CATEGORY_MAP[meta.category] || meta.category || '',
        rawCategory: meta.category || 7,
        wings: WINGS_MAP[meta.wings] || meta.wings || '',
        rawWings: meta.wings || 3,
        priority: PRIORITY_MAP[meta.priority] || meta.priority || '',
        rawPriority: meta.priority || 2,
        vibhas: VIBHAS_MAP[meta.vibhas] || meta.vibhas || '',
        rawVibhas: meta.vibhas || 14,
        party1: meta.party_1 || meta.party1 || '',
        party2: meta.party_2 || meta.party2 || '',
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
      if (generatedB2Code) {
        setB3Rows([{ id: 1, actionCode: `${generatedB2Code}.1`, actionDes: '' }]);
      }
    } catch (err) {
      console.error('Error fetching OVD add data for B1 (B2 mode):', err);
    }
  };

  // B3 row handlers (for B2 mode)
  const handleAddB3Row = () => {
    const b2Code = formData.intervention_code_b2;
    const nextCode = b2Code ? `${b2Code}.${b3Rows.length + 1}` : '';
    setB3Rows(prev => [...prev, { id: Date.now(), actionCode: nextCode, actionDes: '' }]);
  };

  const handleRemoveB3Row = (idx) => {
    if (b3Rows.length <= 1) return;
    const b2Code = formData.intervention_code_b2;
    setB3Rows(prev =>
      prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, actionCode: b2Code ? `${b2Code}.${i + 1}` : '' }))
    );
  };

  const handleB3DesChange = (idx, value) => {
    setB3Rows(prev => prev.map((r, i) => i === idx ? { ...r, actionDes: value } : r));
  };

  const handleClearB3 = () => {
    const b2Code = formData.intervention_code_b2;
    setB3Rows([{ id: 1, actionCode: b2Code ? `${b2Code}.1` : '', actionDes: '' }]);
  };

  // Handle Intervention B2 change -> load B3 code and metadata from API
  const handleB2Change = async (e) => {
    const b2Id = e.target.value;
    if (!b2Id) {
      setFormData(prev => ({
        ...prev,
        intervention_b2_id: '',
        intervention_b2: '',
        intervention_code_b2: '',
        action_b3: '',
        action_code_b3: '',
        category: '',
        wings: '',
        priority: '',
        vibhas: '',
        party1: '',
        party2: '',
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
      return;
    }

    const selectedB2 = filteredB2List.find(item => String(item.id) === String(b2Id));
    setFormData(prev => ({
      ...prev,
      intervention_b2_id: b2Id,
      intervention_b2: selectedB2?.intervention || '',
      intervention_code_b2: selectedB2?.b2_code || '',
      action_b3: '',
      action_code_b3: ''
    }));

    try {
      const res = await fetchOvdAddData(
        formData.goal_a1,
        formData.intervention_a2,
        formData.goal_b1,
        b2Id,
        'B3',
        formData.organisation_id
      );

      const generatedB3Code = res?.newCode?.[0]?.new_code || res?.newCode?.[0]?.B3Code || '';
      const meta = res?.result?.[0] || {};

      setFormData(prev => ({
        ...prev,
        action_code_b3: generatedB3Code,
        category: CATEGORY_MAP[meta.category] || meta.category || '',
        rawCategory: meta.category || 7,
        wings: WINGS_MAP[meta.wings] || meta.wings || '',
        rawWings: meta.wings || 3,
        priority: PRIORITY_MAP[meta.priority] || meta.priority || '',
        rawPriority: meta.priority || 2,
        vibhas: VIBHAS_MAP[meta.vibhas] || meta.vibhas || '',
        rawVibhas: meta.vibhas || 14,
        party1: meta.party_1 || meta.party1 || '',
        party2: meta.party_2 || meta.party2 || '',
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
    } catch (err) {
      console.error('Error fetching OVD add data for B2:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Handler for Add Initiative (B2 or B3 mode)
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setValidated(true);

    if (!formData.organisation_id) { notify(COMMON_TOASTS.requiredSelect('Implementing Agency')); return; }

    if (level === 'B2') {
      if (!formData.goal_a1) { notify(COMMON_TOASTS.requiredSelect('National Level Goal (A1)')); return; }
      if (!formData.intervention_a2) { notify(COMMON_TOASTS.requiredSelect('National Level Intervention (A2)')); return; }
      if (!formData.goal_b1) { notify(COMMON_TOASTS.requiredSelect('Goal (B1)')); return; }
      if (!formData.intervention_b2.trim()) { notify(COMMON_TOASTS.requiredInput('Intervention (B2)')); return; }
      const hasB3 = b3Rows.some(r => r.actionDes && r.actionDes.trim().length > 0);
      if (!hasB3) { notify(OVOD_TOASTS.actionableItemRequired()); return; }
    } else {
      if (!formData.goal_b1) { notify(COMMON_TOASTS.requiredSelect('Goal (B1)')); return; }
      if (!formData.intervention_b2_id) { notify(COMMON_TOASTS.requiredSelect('Intervention (B2)')); return; }
      if (!formData.action_b3.trim()) { notify(COMMON_TOASTS.requiredInput('Actionable Item (B3)')); return; }
    }

    setSubmitting(true);
    try {
      const userId = getUserIdFromToken();
      const validB3Rows = b3Rows.filter(r => r.actionDes && r.actionDes.trim().length > 0);
      const payload = {
        goalA1: parseInt(formData.goal_a1, 10) || 0,
        a2Intervention: parseInt(formData.intervention_a2, 10) || 0,
        goalB1: parseInt(formData.goal_b1, 10),
        interventionB2: formData.intervention_b2,
        interventionB2Code: formData.intervention_code_b2,
        actionB3: level === 'B2'
          ? validB3Rows.map(r => ({ actionCode: r.actionCode, actionDes: r.actionDes }))
          : [{ actionCode: formData.action_code_b3, actionDes: formData.action_b3 }],
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
        party1: formData.party1 || null,
        party2: formData.party2 || null,
        mivChapterSelect: formData.miv_chapter || null,
        makvThemeSelect: formData.makv_theme || null,
        Remarks: formData.remarks || null,
        actualDate: formData.expected_completion_date || null,
        completionDate: formData.timeline_vision || null,
        userID: userId
      };
      await saveOvdB2B3Action(payload);
      notify(OVOD_TOASTS.added(level));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("OVOD Form submit error:", err);
      notify(OVOD_TOASTS.addFailed(level, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-800 dark:text-slate-100 pb-12 animate-fade-in font-sans">
      
      {/* Main Container Card */}
      <div className="module-form-card">
        
        <div className="module-form-banner">
          <div>
            <h3 className="module-form-banner-title">Add Initiative</h3>
            <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
          </div>
        </div>

        {/* Level Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mx-6 md:mx-8 mt-6 md:mt-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Level:</span>
              <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="add_level"
                  value="B2"
                  checked={level === 'B2'}
                  onChange={() => { setLevel('B2'); setFormData(prev => ({ ...prev, goal_a1: '', intervention_a2: '', ...RESET_DOWNSTREAM })); setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]); }}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className={`text-xs ${level === 'B2' ? 'font-black text-amber-700 dark:text-amber-400' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                  Intervention (B2)
                </span>
              </label>
              <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="add_level"
                  value="B3"
                  checked={level === 'B3'}
                  onChange={() => { setLevel('B3'); setFormData(prev => ({ ...prev, goal_a1: '', intervention_a2: '', ...RESET_DOWNSTREAM })); setB3Rows([{ id: 1, actionCode: '', actionDes: '' }]); }}
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

        <form onSubmit={handleSubmitAdd} className="px-6 md:px-8 pt-6 md:pt-8 space-y-8">
          
          {/* ========================================================================= */}
          {/* ======================= SECTION 1: GENERAL DETAILS ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">
                General Details
              </h2>
            </div>

            {/* Implementing Agency */}
            <div>
              <label className="module-form-label">
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

            {level === 'B2' ? (
              /* ---- B2 MODE: A1 → A2 → B1 → B2 text input + B2 code ---- */
              <>
                {/* A1 & A2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="module-form-label">National Level Goal (A1)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        name="goal_a1"
                        value={formData.goal_a1}
                        onChange={handleA1Change}
                        disabled={!formData.organisation_id}
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.goal_a1 ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option value="">--Select Goal (A1)--</option>
                        {a1List.map(a => <option key={a.id} value={a.id}>{a.goal_a1}</option>)}
                      </select>
                      {formData.goal_a1 && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="module-form-label">National Level Intervention (A2)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        name="intervention_a2"
                        value={formData.intervention_a2}
                        onChange={handleA2Change}
                        disabled={!formData.goal_a1}
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.intervention_a2 ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option value="">--Select Intervention (A2)--</option>
                        {filteredA2List.map(a => <option key={a.id} value={a.id}>{a.intervention}</option>)}
                      </select>
                      {formData.intervention_a2 && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                </div>

                {/* B1, B2 text input, B2 code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="module-form-label">Goal (B1)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        name="goal_b1"
                        value={formData.goal_b1}
                        onChange={handleB1Change}
                        disabled={!formData.intervention_a2}
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.goal_b1 ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option value="">--Select Goal (B1)--</option>
                        {filteredB1List.map(b => <option key={b.id} value={b.id}>{b.b1_goals}</option>)}
                      </select>
                      {formData.goal_b1 && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="module-form-label">Intervention (B2)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        name="intervention_b2"
                        value={formData.intervention_b2}
                        onChange={handleChange}
                        disabled={!formData.goal_b1}
                        placeholder="Enter Intervention (B2)..."
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.intervention_b2.trim() ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-500 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      />
                      {formData.intervention_b2.trim() && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="module-form-label">Intervention Code (B2)</label>
                    <input
                      type="text"
                      value={formData.intervention_code_b2}
                      readOnly
                      disabled
                      placeholder="Auto-generated"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* ---- B3 MODE: B1 dropdown → B2 select → B3 text input + code ---- */
              <>
                {/* B1 & B2 select */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="module-form-label">Goal (B1)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        name="goal_b1"
                        value={formData.goal_b1}
                        onChange={handleB1Change}
                        disabled={!formData.organisation_id}
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.goal_b1 ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option value="">--Select Goal (B1)--</option>
                        {filteredB1List.map(b => <option key={b.id} value={b.id}>{b.b1_goals}</option>)}
                      </select>
                      {formData.goal_b1 && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="module-form-label">Intervention (B2)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        value={formData.intervention_b2_id}
                        onChange={handleB2Change}
                        disabled={!formData.goal_b1}
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all cursor-pointer disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.intervention_b2_id ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option value="">--Select Intervention (B2)--</option>
                        {filteredB2List.map(b => (
                          <option key={b.id} value={b.id}>{b.b2_code ? `${b.b2_code} : ${b.intervention}` : b.intervention}</option>
                        ))}
                      </select>
                      {formData.intervention_b2_id && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                </div>

                {/* B3 text input & code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="module-form-label">Actionable Items (B3)<span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        name="action_b3"
                        value={formData.action_b3}
                        onChange={handleChange}
                        disabled={!formData.intervention_b2_id}
                        placeholder="Enter Actionable Item Description..."
                        required
                        className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border transition-all disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed ${formData.action_b3.trim() ? 'border-emerald-500 dark:border-emerald-500 pr-10' : validated ? 'border-rose-500 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`}
                      />
                      {formData.action_b3.trim() && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="module-form-label">Actionable Items Code (B3)</label>
                    <input
                      type="text"
                      value={formData.action_code_b3}
                      readOnly
                      disabled
                      placeholder="Auto-generated"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Category, Wings, Priority, Vibhas/Navic - Read Only Auto populated */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
          {/* ======================= SECTION 2: ACTIONABLE ITEM (B2 mode only) ====== */}
          {/* ========================================================================= */}
          {level === 'B2' && (
            <div className="space-y-3">
              <div className="module-form-section-header">
                <h2 className="module-form-section-heading">Actionable Item</h2>
                <button
                  type="button"
                  onClick={handleClearB3}
                  className="bg-[#dc2626] hover:bg-rose-700 text-white px-4 py-1 text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
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
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">{index + 1}</td>
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
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            value={row.actionDes}
                            onChange={(e) => handleB3DesChange(index, e.target.value)}
                            placeholder="Enter Actionable Item Description..."
                            className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
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
          )}

          {/* ========================================================================= */}
          {/* ======================= SECTION 3: SOURCE DOCUMENT ====================== */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">
                Source Document
              </h2>
            </div>

            {/* Row 1: MIV 2030 (Y/N) & MIV Chapter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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
                <label className="module-form-label">
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

            {/* Row 4: GMIS, 1st Party, 2nd Party & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div>
                <label className="module-form-label">
                  Is it part of GMIS? (Y/N)
                </label>
                <div className="flex items-center space-x-6 mt-1">
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
                <label className="module-form-label">
                  1st Party (in case of GMIS MoU)
                </label>
                <input
                  type="text"
                  value={formData.party1}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="module-form-label">
                  2nd Party (in case of GMIS MoU)
                </label>
                <input
                  type="text"
                  value={formData.party2}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="module-form-label">
                  Remarks
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  readOnly
                  disabled
                  placeholder="Auto populated"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ========================== SECTION 4: TIMELINES ========================= */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="module-form-section-header">
              <h2 className="module-form-section-heading">
                Timelines
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">
                  Timeline As Per Vision Document
                </label>
                <input
                  type="date"
                  name="timeline_vision"
                  value={formData.timeline_vision}
                  onChange={handleChange}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="module-form-label">
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
        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Copyright © 2025 Ministry of Ports, Shipping and Waterways, Government of India, All Rights Reserved
        </div>

      </div>

    </div>
  );
}
