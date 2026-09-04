import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import ProjectBasicInfoForm from './ProjectBasicInfoForm';
import PlanningSanctioningStage from './PlanningSanctioningStage';
import UnderTenderingStage from './UnderTenderingStage';
import UnderImplementationStage from './UnderImplementationStage';
import ProjectCompletionStage from './ProjectCompletionStage';

const STAGES = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'planning', label: 'Planning and Sanctioning' },
  { id: 'tendering', label: 'Under Tendering' },
  { id: 'implementation', label: 'Under Implementation' },
  { id: 'completion', label: 'Project Completion' },
];

function stageFromName(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('planning')) return 'planning';
  if (text.includes('tender')) return 'tendering';
  if (text.includes('implement')) return 'implementation';
  if (text.includes('complete')) return 'completion';
  return 'basic';
}

export default function ProjectStageWorkbench({
  initialData,
  canSubmit,
  readOnly,
  loading,
  onBack,
  onSubmit,
  onSubmitStage,
  basicInfoProps = {},
}) {
  const isUpdateMode = Boolean(initialData?.id);
  const [activeStage, setActiveStage] = useState(() => stageFromName(initialData?.stage));

  const currentIndex = useMemo(
    () => STAGES.findIndex((stage) => stage.id === activeStage),
    [activeStage]
  );

  if (!isUpdateMode) {
    return (
      <div className="space-y-6">
        <ProjectBasicInfoForm
          initialData={initialData}
          canSubmit={canSubmit}
          readOnly={readOnly}
          loading={loading}
          onBack={onBack}
          onSubmit={onSubmit}
          {...basicInfoProps}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 rounded-2xl bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {STAGES.map((stage, index) => {
            const isActive = stage.id === activeStage;
            const isCompleted = index < currentIndex;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setActiveStage(stage.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#0f417a] text-white border-[#0f417a]'
                    : isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                } cursor-pointer`}
                title={stage.label}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {stage.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeStage === 'basic' ? (
        <ProjectBasicInfoForm
          initialData={initialData}
          canSubmit={canSubmit}
          readOnly={readOnly}
          loading={loading}
          onBack={onBack}
          onSubmit={onSubmit}
          {...basicInfoProps}
        />
      ) : null}

      {activeStage === 'planning' ? (
        <PlanningSanctioningStage
          canSubmit={canSubmit}
          readOnly={readOnly}
          onSubmitStage={onSubmitStage}
        />
      ) : null}

      {activeStage === 'tendering' ? (
        <UnderTenderingStage
          canSubmit={canSubmit}
          readOnly={readOnly}
          onSubmitStage={onSubmitStage}
        />
      ) : null}

      {activeStage === 'implementation' ? (
        <UnderImplementationStage
          canSubmit={canSubmit}
          readOnly={readOnly}
          onSubmitStage={onSubmitStage}
        />
      ) : null}

      {activeStage === 'completion' ? (
        <ProjectCompletionStage
          canSubmit={canSubmit}
          readOnly={readOnly}
          onSubmitStage={onSubmitStage}
        />
      ) : null}
    </div>
  );
}
