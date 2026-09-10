import React, { useMemo, useRef, useState } from 'react';
import { 
  FileText, Check, Layers, Clock, 
  TrendingUp, AlertCircle, Save, Briefcase,
  CheckCircle2, Lock, ArrowLeft, DollarSign,
  MapPin, Building2
} from 'lucide-react';
import ProjectBasicInfoForm from './ProjectBasicInfoForm';
import PlanningSanctioningStage from './PlanningSanctioningStage';
import UnderTenderingStage from './UnderTenderingStage';
import UnderImplementationStage from './UnderImplementationStage';
import ProjectCompletionStage from './ProjectCompletionStage';
import { getProjectIdentity } from '../utils/mapProject';

export const ADD_PROJECT_STAGES = [
  { id: 'general', number: '01', title: 'General Details', subtitle: 'Scope & Cost', icon: Layers },
  { id: 'funding', number: '02', title: 'Source of Funding', subtitle: 'Finance & Breakdown', icon: DollarSign },
  { id: 'location', number: '03', title: 'Project Location', subtitle: 'State & MP Constituency', icon: MapPin },
  { id: 'subproject', number: '04', title: 'Sub-projects', subtitle: 'Packages & Structure', icon: Building2 },
];

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
  initialData = null,
  activeStage: controlledActiveStage,
  onActiveStageChange,
  canSubmit = false,
  readOnly = false,
  loading = false,
  onBack,
  onSubmit,
  onSubmitStage,
  notify,
  outlayProps = null,
  documentRows = [],
  documentsLoading = false,
  uploadingDocuments = false,
  onUploadDocuments,
  onDeleteDocument,
  onDownloadDocument,
  stageRefreshKey = 0,
}) {
  const isUpdateMode = Boolean(initialData?.id || initialData?.projectId || initialData?.raw?.project_id);
  const identity = useMemo(() => getProjectIdentity(initialData || {}), [initialData]);
  const raw = initialData?.raw || {};
  const projectId = identity.projectID || initialData?.projectId || initialData?.projectID || raw.project_id || '';
  const subProjectId = identity.subProjectID || initialData?.subProjectId || initialData?.subProjectID || raw.sub_project_id || '';
  const projectName = initialData?.projectName || raw.project_name || '';
  const subProjectName = initialData?.subProjectName || raw.sub_project_name || '';
  const stage = initialData?.stage || initialData?.selectedStage || raw.stage_name || raw.project_stage || 'Project Initiated';

  const [internalActiveStage, setInternalActiveStage] = useState(() => (isUpdateMode ? stageFromName(stage) : 'basic'));
  const activeStage = isUpdateMode
    ? (controlledActiveStage !== undefined ? controlledActiveStage : internalActiveStage)
    : 'basic';

  const setActiveStage = (stg) => {
    if (!isUpdateMode && stg !== 'basic') return;
    setInternalActiveStage(stg);
    onActiveStageChange?.(stg);
  };

  const [activeAddStage, setActiveAddStage] = useState('general');
  const [addStageProgress, setAddStageProgress] = useState({
    general: false,
    funding: false,
    location: false,
    subproject: false,
  });
  const navigateAddStageRef = useRef(null);

  const handleNavigateToAddStage = (targetStageId) => {
    if (navigateAddStageRef.current) {
      navigateAddStageRef.current(targetStageId);
    } else {
      setActiveAddStage(targetStageId);
    }
  };

  const [warningMsg, setWarningMsg] = useState(null);

  const currentProjectLevel = useMemo(() => getStageLevel(stage), [stage]);

  const handleTabClick = (stageId) => {
    if (!isUpdateMode) return;
    const targetIdx = STAGES.findIndex((s) => s.id === stageId);
    if (targetIdx > currentProjectLevel) {
      const prevStage = STAGES[targetIdx - 1];
      const msg = `Please complete Stage 0${targetIdx} (${prevStage.label}) before proceeding to Stage 0${targetIdx + 1} (${STAGES[targetIdx].label}).`;
      setWarningMsg(msg);
      notify?.(msg, 'error');
      return;
    }
    setWarningMsg(null);
    setActiveStage(stageId);
  };

  const handleBasicSubmit = async (formData) => {
    const ok = await onSubmit?.(formData);
    if (ok && isUpdateMode) {
      setActiveStage('planning');
    }
    return ok;
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
    return ok;
  };

  const stageCommon = {
    projectID: identity.projectID,
    subProjectID: identity.subProjectID,
    initialData,
    canSubmit,
    readOnly,
    onSubmitStage: handleMilestoneSubmit,
    notify,
    refreshKey: stageRefreshKey,
  };

  const getStageBadgeClass = (s) => {
    const norm = String(s || '').toLowerCase();
    if (norm.includes('completed')) return 'bg-emerald-500 text-white border-emerald-400 font-black shadow-xs';
    if (norm.includes('implementation')) return 'bg-blue-500/30 text-blue-100 border-blue-400/40';
    if (norm.includes('tendering')) return 'bg-amber-500/30 text-amber-100 border-amber-400/40';
    return 'bg-purple-500/30 text-purple-100 border-purple-400/40';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] text-slate-800 dark:text-slate-100 animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] via-[#134e96] to-[#1a5ba3] px-6 py-4 text-white select-none border-b border-[#0a2d55]/30 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4">
          
          {/* Left Column (3 cols): Back Button + Title + Subtitle */}
          <div className="lg:col-span-3 flex items-center space-x-3.5 min-w-0 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer backdrop-blur-sm border border-white/10 shrink-0"
                title="Back to List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-base font-black tracking-wide uppercase font-display text-white whitespace-nowrap">
                  {isUpdateMode ? (projectName || 'Edit Project') : 'Add Project'}
                </h1>
                {isUpdateMode && projectId && (
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-white/20 text-blue-100 font-mono border border-white/15">
                    {projectId}
                    {subProjectId && subProjectId !== '-1' && subProjectId !== '-' && (
                      <span className="font-black text-white" style={{ fontWeight: 900 }}>{` / Sub Project ${subProjectId}`}</span>
                    )}
                  </span>
                )}
                {isUpdateMode && stage && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${getStageBadgeClass(stage)}`}>
                    {String(stage).toLowerCase().includes('complete') && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                    <span>{stage}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-blue-100/80 font-medium whitespace-nowrap">
                Ministry of Ports, Shipping and Waterways {isUpdateMode && subProjectName && subProjectName !== '-' ? `• Sub-project: ${subProjectName}` : ''}
              </p>
            </div>
          </div>

          {/* Center Column (7 cols): Connected Gradient Progress Stepper when adding project */}
          {!isUpdateMode ? (
            <div className="lg:col-span-7 flex justify-center w-full">
              <div className="w-full max-w-lg xl:max-w-xl">
                <div className="relative flex items-center justify-between px-2">
                  {/* Background Track Line */}
                  <div className="absolute top-[14px] md:top-[16px] left-[10%] right-[10%] h-1.5 bg-white/20 rounded-full -translate-y-1/2 z-0" />

                  {/* Completed Green Progress Fill Line */}
                  <div
                    className="absolute top-[14px] md:top-[16px] left-[10%] h-1.5 bg-emerald-400 rounded-full -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                    style={{
                      width: `${(ADD_PROJECT_STAGES.findIndex((s) => s.id === activeAddStage) / (ADD_PROJECT_STAGES.length - 1)) * 80}%`,
                    }}
                  />

                  {/* Step Nodes Grid */}
                  <div className="relative z-10 w-full grid grid-cols-4 items-start">
                    {ADD_PROJECT_STAGES.map((stg, idx) => {
                      const isActive = activeAddStage === stg.id;
                      const isCompleted = Boolean(addStageProgress[stg.id]);

                      return (
                        <div
                          key={stg.id}
                          onClick={() => handleNavigateToAddStage(stg.id)}
                          className="flex flex-col items-center text-center cursor-pointer group px-1 select-none"
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
                            <span
                              className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight transition-colors truncate max-w-[90px] sm:max-w-none ${
                                isActive
                                  ? 'text-white font-black drop-shadow-sm'
                                  : isCompleted
                                  ? 'text-emerald-200 font-semibold'
                                  : 'text-blue-100/60 font-medium'
                              }`}
                            >
                              {stg.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 hidden lg:block" />
          )}

          {/* Right Column (2 cols): Stage Pill + Exit/Submit */}
          <div className="lg:col-span-2 flex items-center justify-end space-x-2.5 shrink-0">
            {!isUpdateMode ? (
              <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white font-mono tracking-wider shadow-sm">
                Stage {activeAddStage === 'general' ? '1' : activeAddStage === 'funding' ? '2' : activeAddStage === 'location' ? '3' : '4'} of 4
              </span>
            ) : null}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 transition cursor-pointer backdrop-blur-xs"
              >
                Exit
              </button>
            )}
            {canSubmit && !readOnly && isUpdateMode && activeStage === 'basic' && (
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
                    <span>Update Project</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {isUpdateMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {STAGES.map((stg, idx) => {
              const isActive = activeStage === stg.id;
              const isLocked = idx > currentProjectLevel;
              const isCompleted = (
                (currentProjectLevel === 4) ||
                (idx < currentProjectLevel)
              );

              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => handleTabClick(stg.id)}
                  disabled={isLocked}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isLocked
                      ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed opacity-60'
                      : isCompleted && isActive
                      ? 'bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950/30 ring-2 ring-emerald-300/60 cursor-pointer font-bold'
                      : isCompleted
                      ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border-emerald-400/50 text-emerald-100 shadow-2xs cursor-pointer backdrop-blur-md'
                      : isActive
                      ? 'bg-white text-[#0f417a] border-white shadow-md shadow-blue-950/25 ring-2 ring-white/50 cursor-pointer font-bold'
                      : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/90 cursor-pointer backdrop-blur-sm'
                  }`}
                  title={isLocked ? `Locked: Complete Stage 0${idx} (${STAGES[idx - 1]?.label}) first` : stg.desc}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black tracking-widest ${
                      isLocked
                        ? 'text-white/40'
                        : isActive ? (isCompleted ? 'text-emerald-100' : 'text-[#0f417a]/70') : isCompleted ? 'text-emerald-300' : 'text-blue-200'
                    }`}>
                      STAGE 0{idx + 1}
                    </span>
                    <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      isLocked
                        ? 'bg-white/10 text-white/50'
                        : isCompleted
                        ? isActive
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'bg-emerald-500 text-white shadow-xs'
                        : isActive
                        ? 'bg-[#0f417a] text-white'
                        : 'bg-white/20 text-white'
                    }`}>
                      {isLocked ? <Lock className="h-2.5 w-2.5" /> : isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                    </div>
                  </div>

                  <div>
                    <h3 className={`text-xs font-black leading-tight ${
                      isLocked
                        ? 'text-white/50'
                        : isActive ? (isCompleted ? 'text-white' : 'text-[#0f417a]') : isCompleted ? 'text-emerald-100' : 'text-white'
                    }`}>
                      {stg.label}
                    </h3>
                    <p className={`text-[10px] mt-0.5 truncate ${
                      isLocked
                        ? 'text-white/30'
                        : isActive ? (isCompleted ? 'text-emerald-100/90' : 'text-[#0f417a]/70 font-medium') : isCompleted ? 'text-emerald-200/80 font-medium' : 'text-blue-100/70'
                    }`}>
                      {isLocked ? 'Locked' : stg.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {warningMsg && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{warningMsg}</span>
        </div>
      )}

      <div className="p-6">
        {(!isUpdateMode || activeStage === 'basic') && (
          <ProjectBasicInfoForm
            initialData={initialData}
            canSubmit={canSubmit}
            readOnly={readOnly}
            loading={loading}
            onBack={onBack}
            onSubmit={handleBasicSubmit}
            notify={notify}
            outlayProps={outlayProps}
            documentRows={documentRows}
            documentsLoading={documentsLoading}
            uploadingDocuments={uploadingDocuments}
            onUploadDocuments={onUploadDocuments}
            onDeleteDocument={onDeleteDocument}
            onDownloadDocument={onDownloadDocument}
            activeAddStage={activeAddStage}
            onAddStageChange={setActiveAddStage}
            addStageProgress={addStageProgress}
            onStageProgressChange={setAddStageProgress}
            registerNavigateAddStage={(fn) => { navigateAddStageRef.current = fn; }}
          />
        )}

        {isUpdateMode && activeStage === 'planning' && <PlanningSanctioningStage {...stageCommon} />}
        {isUpdateMode && activeStage === 'tendering' && <UnderTenderingStage {...stageCommon} />}
        {isUpdateMode && activeStage === 'implementation' && <UnderImplementationStage {...stageCommon} />}
        {isUpdateMode && activeStage === 'completion' && <ProjectCompletionStage {...stageCommon} />}
      </div>

    </div>
  );
}
