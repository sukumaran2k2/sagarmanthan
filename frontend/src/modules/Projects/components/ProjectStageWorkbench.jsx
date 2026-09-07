import React, { useMemo, useState } from 'react';
import { 
  FileText, Check, Layers, Clock, 
  TrendingUp, AlertCircle, ArrowLeft, Save, Briefcase,
  CheckCircle2
} from 'lucide-react';
import ProjectBasicInfoForm from './ProjectBasicInfoForm';
import PlanningSanctioningStage from './PlanningSanctioningStage';
import UnderTenderingStage from './UnderTenderingStage';
import UnderImplementationStage from './UnderImplementationStage';
import ProjectCompletionStage from './ProjectCompletionStage';

const STAGES = [
  { id: 'basic', label: 'Basic Info', title: 'Basic Info', desc: 'Details & Geography' },
  { id: 'planning', label: 'Planning & Sanctioning', title: 'Planning', desc: 'DPR & Approvals' },
  { id: 'tendering', label: 'Under Tendering', title: 'Tendering', desc: 'Tender Calls & Award' },
  { id: 'implementation', label: 'Under Implementation', title: 'Implementation', desc: 'Progress & Milestones' },
  { id: 'completion', label: 'Completed', title: 'Completion', desc: 'Closure & Final Cost' },
];

function stageFromName(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('planning') || text.includes('sanction')) return 'planning';
  if (text.includes('tender')) return 'tendering';
  if (text.includes('implement')) return 'implementation';
  if (text.includes('complete')) return 'completion';
  return 'basic';
}

function getStageLevel(stageName) {
  const text = String(stageName || '').toLowerCase();
  if (text.includes('complete')) return 4;
  if (text.includes('implement')) return 3;
  if (text.includes('tender')) return 2;
  if (text.includes('plan') || text.includes('sanction')) return 1;
  return 0;
}

export default function ProjectStageWorkbench({
  initialData,
  activeStage: controlledActiveStage,
  onActiveStageChange,
  canSubmit,
  readOnly,
  loading,
  onBack,
  onSubmit,
  onSubmitStage,
  documentRows = [],
  documentsLoading = false,
  uploadingDocuments = false,
  onUploadDocuments,
  onDeleteDocument,
  onDownloadDocument,
}) {
  const isUpdateMode = Boolean(initialData?.id || initialData?.projectId || initialData?.raw?.project_id);
  const raw = initialData?.raw || {};
  const projectId = initialData?.projectId || initialData?.projectID || raw.project_id || '';
  const subProjectId = initialData?.subProjectId || initialData?.subProjectID || raw.sub_project_id || '';
  const projectName = initialData?.projectName || raw.project_name || '';
  const subProjectName = initialData?.subProjectName || raw.sub_project_name || '';
  const stage = initialData?.stage || initialData?.selectedStage || raw.stage_name || raw.project_stage || 'Project Initiated';

  const [internalActiveStage, setInternalActiveStage] = useState(() => stageFromName(stage));
  const activeStage = controlledActiveStage !== undefined ? controlledActiveStage : internalActiveStage;

  const setActiveStage = (stg) => {
    setInternalActiveStage(stg);
    onActiveStageChange?.(stg);
  };

  const [warningMsg, setWarningMsg] = useState(null);

  const currentProjectLevel = useMemo(() => getStageLevel(stage), [stage]);

  const handleTabClick = (stageId) => {
    if (!isUpdateMode && stageId !== 'basic') {
      setWarningMsg('Please save Basic Information first to access milestone stage forms.');
      setTimeout(() => setWarningMsg(null), 4000);
      return;
    }
    setWarningMsg(null);
    setActiveStage(stageId);
  };

  const handleBasicSubmit = async (formData) => {
    const ok = await onSubmit?.(formData);
    if (ok) {
      setActiveStage('planning');
    }
  };

  const handleMilestoneSubmit = async (stageId, stageData) => {
    const ok = await onSubmitStage?.(stageId, stageData);
    if (ok) {
      if (stageId === 'planning') {
        setActiveStage('tendering');
      } else if (stageId === 'tendering') {
        setActiveStage('implementation');
      } else if (stageId === 'implementation') {
        setActiveStage('completion');
      }
    }
  };

  const getStageBadgeClass = (s) => {
    const norm = String(s || '').toLowerCase();
    if (norm.includes('completed')) return 'bg-emerald-500 text-white border-emerald-400 font-black shadow-xs';
    if (norm.includes('implementation')) return 'bg-blue-500/30 text-blue-100 border-blue-400/40';
    if (norm.includes('tendering')) return 'bg-amber-500/30 text-amber-100 border-amber-400/40';
    return 'bg-purple-500/30 text-purple-100 border-purple-400/40';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100 animate-fade-in">
      
      {/* 1. Integrated Master Header Bar with Heading & Stage Cards */}
      <div className="bg-gradient-to-r from-[#0f417a] via-[#164e8a] to-[#0284c7] p-5 text-white select-none border-b border-white/10 space-y-4">
        
        {/* Top Heading Line: Project Identity, Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left: Back Button + Badges + Project Name */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer backdrop-blur-md border border-white/15 shrink-0"
              title="Back to Data List"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-white/20 text-blue-100 font-mono border border-white/15">
                  {isUpdateMode ? `Edit Project: ${projectId}${subProjectId && subProjectId !== '-1' && subProjectId !== '-' ? ` / ${subProjectId}` : ''}` : 'New Project'}
                </span>
                {stage && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${getStageBadgeClass(stage)}`}>
                    {String(stage).toLowerCase().includes('complete') && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                    <span>{stage}</span>
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                {projectName || 'Project Basic Information & Progress Form'}
              </h1>
              {subProjectName && subProjectName !== '-' && (
                <p className="text-xs text-blue-100 font-medium truncate">
                  Sub-project: {subProjectName}
                </p>
              )}
            </div>
          </div>

          {/* Right: Cancel & Save Buttons */}
          <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 transition cursor-pointer backdrop-blur-xs"
            >
              Cancel
            </button>
            {canSubmit && !readOnly && activeStage === 'basic' && (
              <button
                type="submit"
                form="project-basic-info-form"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black text-[#0f417a] bg-white hover:bg-blue-50 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#0f417a] border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-[#0f417a]" />
                    <span>{isUpdateMode ? 'Update Project' : 'Save Details'}</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Stage Cards directly in Header Line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {STAGES.map((stg, idx) => {
            const isActive = activeStage === stg.id;
            const isCompleted = isUpdateMode && (
              (currentProjectLevel === 4) || // If project is completed, all stages are completed
              (idx < currentProjectLevel) ||  // If past this stage
              (idx === 0 && isUpdateMode)     // Basic info is completed if project exists
            );
            const isDisabled = !isUpdateMode && stg.id !== 'basic';

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => handleTabClick(stg.id)}
                disabled={isDisabled}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isDisabled
                    ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed border-dashed'
                    : isCompleted && isActive
                    ? 'bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950/30 ring-2 ring-emerald-300/60 cursor-pointer font-bold'
                    : isCompleted
                    ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border-emerald-400/50 text-emerald-100 shadow-2xs cursor-pointer backdrop-blur-md'
                    : isActive
                    ? 'bg-white text-[#0f417a] border-white shadow-md shadow-blue-950/25 ring-2 ring-white/50 cursor-pointer font-bold'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/90 cursor-pointer backdrop-blur-sm'
                }`}
                title={isDisabled ? 'Save basic details first to unlock this stage' : stg.desc}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black tracking-widest ${
                    isActive ? (isCompleted ? 'text-emerald-100' : 'text-[#0f417a]/70') : isCompleted ? 'text-emerald-300' : 'text-blue-200'
                  }`}>
                    STAGE 0{idx + 1}
                  </span>
                  <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    isCompleted
                      ? isActive
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-[#0f417a] text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                  </div>
                </div>

                <div>
                  <h3 className={`text-xs font-black leading-tight ${
                    isActive ? (isCompleted ? 'text-white' : 'text-[#0f417a]') : isCompleted ? 'text-emerald-100' : 'text-white'
                  }`}>
                    {stg.label}
                  </h3>
                  <p className={`text-[10px] mt-0.5 truncate ${
                    isActive ? (isCompleted ? 'text-emerald-100/90' : 'text-[#0f417a]/70 font-medium') : isCompleted ? 'text-emerald-200/80 font-medium' : 'text-blue-100/70'
                  }`}>
                    {stg.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {warningMsg && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* 3. Stage Content & Form Body */}
      <div className="p-6">
        {activeStage === 'basic' && (
          <ProjectBasicInfoForm
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            loading={loading}
            onBack={onBack}
            onSubmit={handleBasicSubmit}
            onSubmitStage={handleMilestoneSubmit}
            documentRows={documentRows}
            documentsLoading={documentsLoading}
            uploadingDocuments={uploadingDocuments}
            onUploadDocuments={onUploadDocuments}
            onDeleteDocument={onDeleteDocument}
            onDownloadDocument={onDownloadDocument}
          />
        )}

        {activeStage === 'planning' && (
          <PlanningSanctioningStage
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            onSubmitStage={handleMilestoneSubmit}
          />
        )}

        {activeStage === 'tendering' && (
          <UnderTenderingStage
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            onSubmitStage={handleMilestoneSubmit}
          />
        )}

        {activeStage === 'implementation' && (
          <UnderImplementationStage
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            onSubmitStage={handleMilestoneSubmit}
          />
        )}

        {activeStage === 'completion' && (
          <ProjectCompletionStage
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            onSubmitStage={handleMilestoneSubmit}
          />
        )}
      </div>

    </div>
  );
}
