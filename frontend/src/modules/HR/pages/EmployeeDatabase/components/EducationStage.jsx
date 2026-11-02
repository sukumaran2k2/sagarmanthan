import { GraduationCap, ChevronRight, ChevronLeft } from 'lucide-react';
import { HIGHEST_EDUCATION } from '../employeeEdit';
import { DISCIPLINES } from '../employeeOptions';
import { MAX_DEGREES } from '../employeeFormConfig';

// Stage 2 of the Employee Data form: degrees and highest qualification.
export default function EducationStage({ formData, formErrors, handleInputChange, handleNavigateToStage, setDegreeCount, setDiscipline }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <span>2. Educational Qualification</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select the highest educational attainment and specify degrees held.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Highest educational Qualification <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.empHighestEdu}
            onChange={e => handleInputChange('empHighestEdu', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.empHighestEdu ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Highest Qualification--</option>
            {HIGHEST_EDUCATION.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
            {/* A legacy free-text value (e.g. "B. Tech. (Civil)") stays visible until it is changed */}
            {formData.empHighestEdu && !HIGHEST_EDUCATION.includes(formData.empHighestEdu) && (
              <option value={formData.empHighestEdu}>{formData.empHighestEdu} (as recorded)</option>
            )}
          </select>
          {formErrors.empHighestEdu && <p className="text-2xs text-rose-500 mt-1">{formErrors.empHighestEdu}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              No. Of UG Degrees
            </label>
            <input
              type="number"
              min="0"
              max={MAX_DEGREES}
              value={formData.ugCount}
              onChange={e => setDegreeCount('ugCount', e.target.value)}
              placeholder="Enter NO. of UG degrees"
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              No. Of PG Degrees
            </label>
            <input
              type="number"
              min="0"
              max={MAX_DEGREES}
              value={formData.pgCount}
              onChange={e => setDegreeCount('pgCount', e.target.value)}
              placeholder="Enter NO. of PG degrees"
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
            />
          </div>
        </div>

        {/* Discipline of each UG / PG degree */}
        {(formData.ugDisciplines.length > 0 || formData.pgDisciplines.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[['ugDisciplines', 'UG'], ['pgDisciplines', 'PG']].map(([listKey, level]) => (
              <div key={listKey} className="space-y-3">
                {formData[listKey].map((value, i) => (
                  <div key={`${listKey}-${i}`}>
                    <label htmlFor={`${listKey}-${i}`} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {level} Discipline {i + 1} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id={`${listKey}-${i}`}
                      value={value}
                      onChange={e => setDiscipline(listKey, i, e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                        formErrors[listKey] && !value ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
                    >
                      <option value="">--Select Discipline--</option>
                      {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                ))}
                {formErrors[listKey] && <p className="text-2xs text-rose-500">{formErrors[listKey]}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage 2 Footer Navigation */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => handleNavigateToStage('basic')}
          className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous Stage (Basic Details)</span>
        </button>
        <button
          type="button"
          onClick={() => handleNavigateToStage('designation')}
          className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
        >
          <span>Next Stage (Designation & Post)</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
