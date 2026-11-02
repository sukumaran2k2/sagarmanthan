import { ArrowLeft, Check } from 'lucide-react';
import { EMPLOYEE_STAGES } from '../employeeFormConfig';

// Heading of the Employee Data form: back button, title and the three-stage stepper
export default function EmployeeFormStepper({ activeSection, handleBack, handleNavigateToStage, handoff, isEditMode, stageIndex, stageProgress }) {
  return (
    <div className="bg-gradient-to-r from-[#0f417a] via-[#134e96] to-[#1a5ba3] px-6 py-4 text-white border-b border-[#0a2d55]/30">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 select-none">

        {/* Left Column: Back Button + Title */}
        <div className="lg:col-span-3 flex items-center space-x-3.5 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer backdrop-blur-sm border border-white/10"
            title={isEditMode ? 'Back to employee details' : handoff?.returnTo ? 'Back to the vacancy' : 'Back to Employee Database'}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black tracking-wide uppercase font-display text-white whitespace-nowrap">
              {isEditMode ? 'Update Employee Data' : 'Add Employee Data'}
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
  );
}
