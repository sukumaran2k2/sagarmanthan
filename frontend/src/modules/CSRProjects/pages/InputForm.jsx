import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Trash2, Heart, Coins, ListTodo, Save, ArrowRight, Check, Clock, Layers, IndianRupee } from 'lucide-react';
import FundForm from '../components/FundForm';
import {
  createCsrProject,
  updateCsrProject,
  uploadCsrDocument,
  fetchCsrExpenditureCost,
  fetchCsrGalleryFiles,
  uploadCsrGalleryFiles,
} from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS } from '../utils/constants';
import { CSR_TOASTS } from '../toastMessages';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { croreInput, croreToLakh } from '../utils/amounts';

const STAGES = [
  { id: 'general', title: 'General Details', icon: Layers },
  { id: 'outcomes', title: 'Impact & Outcomes', icon: Heart },
  { id: 'status', title: 'Status & Progress', icon: Clock },
  { id: 'expenditure', title: 'Expenditure & Media', icon: IndianRupee },
];
const STAGE_IDS = STAGES.map((s) => s.id);

const MAX_DOC_MB = 20;      // completion document (PDF)
const MAX_GALLERY_MB = 10;  // each gallery photo / video (the server's limit)

const dateOnly = (v) => (v ? String(v).split('T')[0] : '');
const numberText = (v) => (v != null && v !== '' ? String(v) : '');
const isAmount = (v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;
const isPercent = (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100);

const initialProject = (item) => ({
  csrFocus: String(item?.csr_focus || CSR_FOCUS_AREAS[0].id),
  financialYear: item?.financial_year || FINANCIAL_YEARS[0],
  projectName: item?.project_name || '',
  receivedFrom: item?.project_received_from || '',
  impact: item?.impact_possible_outcome || '',
  beneficiaries: item?.target_beneficiaries || '',
  remarks: item?.remarks || '',
  projectValue: croreInput(item?.project_value),
  status: item?.project_status || CSR_STATUSES[0],
  commencedOn: dateOnly(item?.commenced_on),
  completedOn: dateOnly(item?.completed_on),
  physicalProgress: numberText(item?.physical_progress),
  financialProgress: numberText(item?.financial_progress),
});

// The mandatory fields of each stage; returns { field: message }
function stageErrors(stageId, v) {
  const errs = {};
  if (stageId === 'general') {
    if (!v.projectName.trim()) errs.projectName = 'Name of the Project is required.';
    if (!v.receivedFrom.trim()) errs.receivedFrom = 'Project received from is required.';
    if (!isAmount(v.projectValue)) errs.projectValue = 'Enter the project value in ₹ Cr (0 or more).';
  } else if (stageId === 'outcomes') {
    if (!v.impact.trim()) errs.impact = 'Impact / Possible Outcome is required.';
    if (!v.beneficiaries.trim()) errs.beneficiaries = 'Target Beneficiaries is required.';
  } else if (stageId === 'status') {
    if (v.commencedOn && v.completedOn && v.completedOn < v.commencedOn) errs.completedOn = 'Completed date cannot be earlier than the commenced date.';
    if (!isPercent(v.physicalProgress)) errs.physicalProgress = 'Physical progress must be between 0 and 100.';
    if (!isPercent(v.financialProgress)) errs.financialProgress = 'Financial progress must be between 0 and 100.';
  }
  return errs;
}

function ProjectForm({ editData, organisationId, onBack, onSaved, notify }) {
  const isEdit = !!editData;
  const projectId = editData?.csr_project_id;
  const [values, setValues] = useState(() => initialProject(editData));
  const [errors, setErrors] = useState({});
  const [activeStage, setActiveStage] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  // Yearly expenditure rows and existing gallery files; an edit loads them from the server
  // before it can be saved, so an unfinished load can't replace the stored rows
  const [expenditures, setExpenditures] = useState([{ year: FINANCIAL_YEARS[0], cost: '' }]);
  const [existingGallery, setExistingGallery] = useState([]);
  const [detailsLoaded, setDetailsLoaded] = useState(!isEdit);
  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    Promise.all([fetchCsrExpenditureCost(projectId), fetchCsrGalleryFiles(projectId)])
      .then(([expRes, galRes]) => {
        if (cancelled) return;
        if (Array.isArray(expRes) && expRes.length > 0) {
          setExpenditures(expRes.map((e) => ({ year: e.year, cost: croreInput(e.csr_expenditure_cost) })));
        }
        setExistingGallery(Array.isArray(galRes) ? galRes : []);
        setDetailsLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading project details', err);
        notify(CSR_TOASTS.detailsLoadFailed());
      });
    return () => { cancelled = true; };
  }, [projectId, notify]);

  const [docFile, setDocFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const docInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const storedDocName = editData?.project_completion_doc || '';

  // "Completed" is set only by both progress figures reaching 100%, and drops back to
  // "Under implementation" when either falls below
  const isFullyComplete = Number(values.physicalProgress) === 100 && Number(values.financialProgress) === 100;
  const effectiveStatus = isFullyComplete
    ? 'Completed'
    : (values.status === 'Completed' ? 'Project Under implementation' : values.status);

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const stageValid = (id) => Object.keys(stageErrors(id, values)).length === 0;
  const stageDone = {
    general: stageValid('general'),
    outcomes: stageValid('general') && stageValid('outcomes'),
    status: stageValid('general') && stageValid('outcomes') && stageValid('status'),
    expenditure: false,
  };

  // Checks every stage before the target one; stops at the first with missing fields
  const checkStagesBefore = (targetIndex) => {
    for (let i = 0; i < targetIndex; i += 1) {
      const errs = stageErrors(STAGE_IDS[i], values);
      if (Object.keys(errs).length) {
        setErrors((e) => ({ ...e, ...errs }));
        setActiveStage(STAGE_IDS[i]);
        notify(errs.completedOn && Object.keys(errs).length === 1 ? CSR_TOASTS.completedBeforeCommenced() : CSR_TOASTS.stageIncomplete(i + 1));
        return false;
      }
    }
    return true;
  };

  const goToStage = (id) => {
    const target = STAGE_IDS.indexOf(id);
    if (target <= STAGE_IDS.indexOf(activeStage) || checkStagesBefore(target)) setActiveStage(id);
  };

  const pickDocument = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      notify(COMMON_TOASTS.invalidFileType('PDF'));
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      notify(COMMON_TOASTS.fileTooLarge(MAX_DOC_MB));
      return;
    }
    setDocFile(file);
  };

  const pickGallery = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.some((f) => !f.type.startsWith('image/') && !f.type.startsWith('video/'))) {
      notify(COMMON_TOASTS.invalidFileType('image or video'));
      return;
    }
    if (files.some((f) => f.size > MAX_GALLERY_MB * 1024 * 1024)) {
      notify(COMMON_TOASTS.fileTooLarge(MAX_GALLERY_MB));
      return;
    }
    setGalleryFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkStagesBefore(STAGE_IDS.length - 1)) return;
    const badCost = expenditures.some((x) => x.cost !== '' && !isAmount(x.cost));
    if (badCost) {
      notify(COMMON_TOASTS.fixValidationErrors('Expenditure amounts must be 0 or more'));
      return;
    }

    setSubmitting(true);
    try {
      // The completion document is uploaded first; without it the project isn't saved
      let docName = storedDocName || null;
      if (docFile) {
        try {
          const formData = new FormData();
          formData.append('file', docFile);
          const uploadRes = await uploadCsrDocument(formData);
          docName = uploadRes.uniqueFileName;
        } catch (err) {
          console.error('Document upload failed', err);
          notify(CSR_TOASTS.documentUploadFailed(getErrorMessage(err)));
          return;
        }
      }

      // Field names as the server reads them (2.0 contract)
      const payload = {
        organisationID: organisationId,
        csrfocus: Number(values.csrFocus),
        focusID: Number(values.csrFocus),
        nameofproject: values.projectName.trim(),
        projectReceived: values.receivedFrom.trim(),
        impactproject: values.impact.trim(),
        targetbeneficiaries: values.beneficiaries.trim(),
        projectvalue: croreToLakh(values.projectValue),
        projectstatus: effectiveStatus,
        financialYear: values.financialYear,
        commencedon: values.commencedOn || null,
        completedon: values.completedOn || null,
        physicalprogresssofar: values.physicalProgress !== '' ? Number(values.physicalProgress) : 0,
        finiancialprogresssofar: values.financialProgress !== '' ? Number(values.financialProgress) : 0,
        remarksoftheproject: values.remarks.trim(),
        expenditures: expenditures
          .filter((x) => x.cost !== '')
          .map((x) => ({ expenditureFinancialYear: x.year, expenditureCost: croreToLakh(x.cost) })),
      };

      let savedId = projectId;
      try {
        if (isEdit) {
          await updateCsrProject({ ...payload, csrProjectId: projectId, uniqueFileName: docName });
        } else {
          const res = await createCsrProject({ ...payload, csrDocumentFileName: docName });
          savedId = res.csr_project_id;
        }
      } catch (err) {
        console.error('Error saving CSR project:', err);
        notify(CSR_TOASTS.projectSaveFailed(isEdit, getErrorMessage(err)));
        return;
      }
      notify(isEdit ? CSR_TOASTS.projectUpdated(payload.nameofproject) : CSR_TOASTS.projectCreated(payload.nameofproject));

      // Gallery files are attached to the saved project
      if (savedId && galleryFiles.length > 0) {
        try {
          const galleryForm = new FormData();
          galleryFiles.forEach((file) => galleryForm.append('file', file));
          await uploadCsrGalleryFiles(savedId, galleryForm);
        } catch (err) {
          console.error('Error uploading gallery files', err);
          notify(CSR_TOASTS.galleryUploadFailed(getErrorMessage(err)));
        }
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (key, base = 'module-form-input') => `${base} ${errors[key] ? '!border-red-500' : ''}`;
  const fieldError = (key) => errors[key] && <p className="text-[10px] font-bold text-red-500 mt-1">{errors[key]}</p>;
  const stageIndex = STAGE_IDS.indexOf(activeStage);

  const footer = (back, next) => (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
      <span className="text-xs text-rose-500 font-bold italic">* Asterisks marked with red are mandatory fields</span>
      <div className="flex items-center space-x-2">
        {back && (
          <button type="button" onClick={() => setActiveStage(back)}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer">
            Back
          </button>
        )}
        {next ? (
          <button type="button" onClick={() => goToStage(next.id)}
            className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer">
            <span>Proceed to {next.title}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <>
            {onBack && (
              <button type="button" onClick={onBack}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
                Cancel
              </button>
            )}
            <button type="submit" disabled={submitting || !detailsLoaded}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50">
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Submitting...' : !detailsLoaded ? 'Loading...' : isEdit ? 'Update Project' : 'Submit Project'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="module-form-card !p-0 overflow-hidden">
      {/* Banner with the stage stepper */}
      <div className="module-form-banner">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center w-full">
          <div className="lg:col-span-3">
            <h3 className="module-form-banner-title">{isEdit ? 'Update CSR Project' : 'Add CSR Project'}</h3>
            <p className="module-form-banner-subtext">Amounts in ₹ Cr</p>
          </div>
          <div className="lg:col-span-7">
            <div className="relative w-full max-w-xl mx-auto py-1">
              <div className="absolute top-[16px] left-[12%] right-[12%] h-1.5 bg-white/20 rounded-full -translate-y-1/2" />
              <div
                className="absolute top-[16px] left-[12%] h-1.5 bg-emerald-400 rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
                style={{ width: `${(stageIndex / (STAGES.length - 1)) * 76}%` }}
              />
              <div className="relative z-10 w-full grid grid-cols-4 items-start">
                {STAGES.map((stage, idx) => {
                  const isActive = activeStage === stage.id;
                  const done = stageDone[stage.id] && !isActive;
                  return (
                    <button key={stage.id} type="button" onClick={() => goToStage(stage.id)} className="flex flex-col items-center text-center cursor-pointer px-1">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-md ${
                        done ? 'bg-emerald-500 text-white'
                          : isActive ? 'bg-white text-[#0f417a] ring-4 ring-emerald-400/60 scale-110'
                            : 'bg-white/15 text-white/60 border border-white/20'
                      }`}>
                        {done ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                      </span>
                      <span className={`mt-1.5 text-[11px] font-bold leading-tight ${isActive ? 'text-white' : done ? 'text-emerald-200' : 'text-blue-100/60'}`}>
                        {stage.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 hidden lg:flex justify-end">
            <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white font-mono tracking-wider">
              Stage {stageIndex + 1} of {STAGES.length}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
        {activeStage === 'general' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="module-form-section-title">General Project Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">CSR Focus/Project Area <span className="text-red-500">*</span></label>
                <select value={values.csrFocus} onChange={(e) => setValue('csrFocus', e.target.value)} className="module-form-select">
                  {CSR_FOCUS_AREAS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="module-form-label">Financial Year <span className="text-red-500">*</span></label>
                <select value={values.financialYear} onChange={(e) => setValue('financialYear', e.target.value)} className="module-form-select">
                  {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="module-form-label">Name of the Project <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter project name" value={values.projectName}
                  onChange={(e) => setValue('projectName', e.target.value)} className={fieldClass('projectName')} />
                {fieldError('projectName')}
              </div>
              <div>
                <label className="module-form-label">Project Received From <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter project received from" value={values.receivedFrom}
                  onChange={(e) => setValue('receivedFrom', e.target.value)} className={fieldClass('receivedFrom')} />
                {fieldError('receivedFrom')}
              </div>
              <div>
                <label className="module-form-label">Project Value (₹ Cr) <span className="text-red-500">*</span></label>
                <input type="number" step="0.0001" min="0" placeholder="0.00" value={values.projectValue}
                  onChange={(e) => setValue('projectValue', e.target.value)} className={fieldClass('projectValue')} />
                {fieldError('projectValue')}
              </div>
            </div>
            {footer(null, STAGES[1])}
          </div>
        )}

        {activeStage === 'outcomes' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="module-form-section-title">Impact, Beneficiaries &amp; Remarks</h4>
            <div className="space-y-4">
              <div>
                <label className="module-form-label">Impact / Possible Outcome of the Project <span className="text-red-500">*</span></label>
                <textarea rows={3} placeholder="Enter impact / outcome of the project..." value={values.impact}
                  onChange={(e) => setValue('impact', e.target.value)} className={fieldClass('impact')} />
                {fieldError('impact')}
              </div>
              <div>
                <label className="module-form-label">Target Beneficiaries <span className="text-red-500">*</span></label>
                <textarea rows={2} placeholder="Enter target beneficiaries..." value={values.beneficiaries}
                  onChange={(e) => setValue('beneficiaries', e.target.value)} className={fieldClass('beneficiaries')} />
                {fieldError('beneficiaries')}
              </div>
              <div>
                <label className="module-form-label">Remarks</label>
                <textarea rows={2} placeholder="Enter remarks..." value={values.remarks}
                  onChange={(e) => setValue('remarks', e.target.value)} className="module-form-input" />
              </div>
            </div>
            {footer('general', STAGES[2])}
          </div>
        )}

        {activeStage === 'status' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="module-form-section-title">Status, Timelines &amp; Progress</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="module-form-label">Project Status <span className="text-red-500">*</span></label>
                <select
                  value={effectiveStatus}
                  onChange={(e) => setValue('status', e.target.value)}
                  disabled={isFullyComplete}
                  className="module-form-select disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                >
                  {CSR_STATUSES.filter((s) => s !== 'Completed' || isFullyComplete).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">
                  {isFullyComplete ? 'Set automatically: both progress figures are 100%.' : 'Becomes "Completed" once physical and financial progress both reach 100%.'}
                </p>
              </div>
              <div className="hidden md:block" />
              <div>
                <label className="module-form-label">Commenced On</label>
                <input type="date" value={values.commencedOn} onChange={(e) => setValue('commencedOn', e.target.value)} className="module-form-input" />
              </div>
              <div>
                <label className="module-form-label">Completed On</label>
                <input type="date" value={values.completedOn} onChange={(e) => setValue('completedOn', e.target.value)} className={fieldClass('completedOn')} />
                {fieldError('completedOn')}
              </div>
              <div>
                <label className="module-form-label">Physical Progress (%)</label>
                <input type="number" min="0" max="100" step="0.01" placeholder="0" value={values.physicalProgress}
                  onChange={(e) => setValue('physicalProgress', e.target.value)} className={fieldClass('physicalProgress')} />
                {fieldError('physicalProgress')}
              </div>
              <div>
                <label className="module-form-label">Financial Progress (%)</label>
                <input type="number" min="0" max="100" step="0.01" placeholder="0" value={values.financialProgress}
                  onChange={(e) => setValue('financialProgress', e.target.value)} className={fieldClass('financialProgress')} />
                {fieldError('financialProgress')}
              </div>
            </div>
            {footer('outcomes', STAGES[3])}
          </div>
        )}

        {activeStage === 'expenditure' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="module-form-section-title">Yearly Expenditure Breakdown</h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0f417a] text-white select-none">
                  <tr>
                    <th className="py-2.5 px-4 font-bold w-16 text-center">S.No</th>
                    <th className="py-2.5 px-4 font-bold">Financial Year</th>
                    <th className="py-2.5 px-4 font-bold">Expenditure (₹ Cr)</th>
                    <th className="py-2.5 px-4 font-bold w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenditures.map((exp, idx) => (
                    // Rows have no ids of their own (the server replaces them all on save)
                    <tr key={idx}>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-4">
                        <select value={exp.year}
                          onChange={(e) => setExpenditures((rows) => rows.map((r, i) => (i === idx ? { ...r, year: e.target.value } : r)))}
                          className="module-form-select max-w-xs">
                          {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" step="0.0001" min="0" placeholder="0.00" value={exp.cost}
                          onChange={(e) => setExpenditures((rows) => rows.map((r, i) => (i === idx ? { ...r, cost: e.target.value } : r)))}
                          className={`module-form-input max-w-sm ${exp.cost !== '' && !isAmount(exp.cost) ? '!border-red-500' : ''}`} />
                      </td>
                      <td className="py-2 px-4 text-center">
                        {idx === 0 ? (
                          <button type="button" title="Add expenditure row"
                            onClick={() => setExpenditures((rows) => [...rows, { year: FINANCIAL_YEARS[0], cost: '' }])}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg transition cursor-pointer">
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <button type="button" title="Remove row"
                            onClick={() => setExpenditures((rows) => rows.filter((_, i) => i !== idx))}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg transition cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="module-form-section-title">Media &amp; Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="module-form-label">Project Completion Document</label>
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">PDF only, max. {MAX_DOC_MB} MB</p>
                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <input type="file" ref={docInputRef} accept="application/pdf" className="hidden"
                    onChange={(e) => { pickDocument(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" onClick={() => docInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{docFile || storedDocName ? 'Replace' : 'Upload'}</span>
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-medium">
                    {docFile?.name || storedDocName || 'No document chosen'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="module-form-label">Gallery (Photos and Videos)</label>
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Several files can be chosen, max. {MAX_GALLERY_MB} MB each</p>
                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <input type="file" ref={galleryInputRef} multiple accept="image/*,video/*" className="hidden"
                    onChange={(e) => { pickGallery(e.target.files); e.target.value = ''; }} />
                  <button type="button" onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-medium">
                    {galleryFiles.length > 0
                      ? `${galleryFiles.length} new file(s) chosen`
                      : existingGallery.length > 0 ? `${existingGallery.length} file(s) already uploaded` : 'No files chosen'}
                  </span>
                </div>
              </div>
            </div>
            {footer('status', null)}
          </div>
        )}
      </form>
    </div>
  );
}

export default function InputForm({ formType, editData, permissions, onFormTypeChange, onBack, onProjectSaved, onFundSaved, notify }) {
  const { organisationId, organisationName } = permissions;
  const isEdit = !!editData;

  return (
    <div className="space-y-6">
      <div className="module-subtabs-strip">
        <button type="button" onClick={() => onFormTypeChange('project')}
          className={`module-subtab-btn flex items-center gap-2 ${formType === 'project' ? 'active' : ''}`}>
          <ListTodo className="h-4 w-4" />
          <span>{isEdit ? 'Update CSR Project' : 'Add CSR Project'}</span>
        </button>
        <button type="button" onClick={() => onFormTypeChange('fund')}
          className={`module-subtab-btn flex items-center gap-2 ${formType === 'fund' ? 'active' : ''}`}>
          <Coins className="h-4 w-4" />
          <span>Add CSR Fund Detail</span>
        </button>
      </div>

      {formType === 'fund' ? (
        <div className="module-form-card !p-0 overflow-hidden">
          <div className="module-form-banner">
            <div>
              <h3 className="module-form-banner-title">Add CSR Fund Details</h3>
              <p className="module-form-banner-subtext">Amounts in ₹ Cr</p>
            </div>
          </div>
          <div className="p-6">
            <FundForm organisationName={organisationName} notify={notify} onSaved={onFundSaved} onCancel={onBack} cancelLabel="Exit" />
          </div>
        </div>
      ) : (
        <ProjectForm
          editData={editData}
          organisationId={organisationId}
          onBack={isEdit ? onBack : null}
          onSaved={onProjectSaved}
          notify={notify}
        />
      )}
    </div>
  );
}
