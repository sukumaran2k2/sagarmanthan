import { User, ChevronRight } from 'lucide-react';
import { PWBD_OPTIONS } from '../employeeOptions';
import { MAX_LENGTH } from '../employeeFormConfig';

// Stage 1 of the Employee Data form: personal and demographic details.
export default function BasicDetailsStage({ checkDuplicate, formData, formErrors, handleBack, handleDobChange, handleInputChange, handleNavigateToStage, states }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>1. Basic Employee Details</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter employee personal identification, date of birth, demographics, community, and retirement schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name of Employee */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Name of Employee <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.employeeName}
            onChange={e => handleInputChange('employeeName', e.target.value)}
            placeholder="Enter Name of Employee"
            maxLength={MAX_LENGTH.employeeName}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.employeeName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          {formErrors.employeeName && <p className="text-2xs text-rose-500 mt-1">{formErrors.employeeName}</p>}
        </div>

        {/* Reference Number / Personnel Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Reference Number / Personnel Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.referenceNumber}
            onChange={e => handleInputChange('referenceNumber', e.target.value)}
            onBlur={() => checkDuplicate('referenceNumber')}
            placeholder="Enter Reference Number"
            maxLength={MAX_LENGTH.referenceNumber}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.referenceNumber ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          {formErrors.referenceNumber && <p className="text-2xs text-rose-500 mt-1">{formErrors.referenceNumber}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Date of Birth <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={handleDobChange}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.dateOfBirth ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          {formErrors.dateOfBirth && <p className="text-2xs text-rose-500 mt-1">{formErrors.dateOfBirth}</p>}
        </div>

        {/* Aadhar Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Aadhar Number
          </label>
          <input
            type="text"
            maxLength={14}
            value={formData.employeeAadhar}
            onChange={e => handleInputChange('employeeAadhar', e.target.value)}
            onBlur={() => checkDuplicate('employeeAadhar')}
            placeholder="Enter Aadhaar Number"
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.employeeAadhar ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          {formErrors.employeeAadhar && <p className="text-2xs text-rose-500 mt-1">{formErrors.employeeAadhar}</p>}
        </div>

        {/* Whether PwBD */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Whether PwBD? <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.whethVhorOh}
            onChange={e => handleInputChange('whethVhorOh', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.whethVhorOh ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select--</option>
            {PWBD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {formErrors.whethVhorOh && <p className="text-2xs text-rose-500 mt-1">{formErrors.whethVhorOh}</p>}
        </div>

        {/* Religion */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Religion <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.religion}
            onChange={e => handleInputChange('religion', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.religion ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Religion--</option>
            <option value="Hindu">Hindu</option>
            <option value="Christian">Christian</option>
            <option value="Muslim">Muslim</option>
            <option value="Sikh">Sikh</option>
            <option value="Buddhist">Buddhist</option>
            <option value="Jain">Jain</option>
            <option value="Others">Others</option>
          </select>
          {formErrors.religion && <p className="text-2xs text-rose-500 mt-1">{formErrors.religion}</p>}
        </div>

        {/* Community */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Community <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.ethnicOrigin}
            onChange={e => handleInputChange('ethnicOrigin', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.ethnicOrigin ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Community--</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="UR">UR</option>
            <option value="OBC">OBC</option>
            <option value="EWS">EWS</option>
          </select>
          {formErrors.ethnicOrigin && <p className="text-2xs text-rose-500 mt-1">{formErrors.ethnicOrigin}</p>}
        </div>

        {/* Domicile State */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Domicile State <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.domicileState}
            onChange={e => handleInputChange('domicileState', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.domicileState ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Domicile State--</option>
            {states.map(st => (
              <option key={st.state_id} value={st.state_id}>{st.state_name}</option>
            ))}
          </select>
          {formErrors.domicileState && <p className="text-2xs text-rose-500 mt-1">{formErrors.domicileState}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Gender <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-6 pt-1">
            {['Male', 'Female', 'Transgender'].map(g => (
              <label key={g} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={formData.gender === g}
                  onChange={e => handleInputChange('gender', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Whether Ex-Service Personnel? */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Whether Ex-Service Personnel? <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="exService"
                value="1"
                checked={formData.exService === '1'}
                onChange={e => handleInputChange('exService', e.target.value)}
                className="text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="exService"
                value="0"
                checked={formData.exService === '0'}
                onChange={e => handleInputChange('exService', e.target.value)}
                className="text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>No</span>
            </label>
          </div>
        </div>

        {/* Date of Retirement */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Date of Retirement <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={formData.retirementDate}
            onChange={e => handleInputChange('retirementDate', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.retirementDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          {formErrors.retirementDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.retirementDate}</p>}
        </div>

        {/* Division */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Division
          </label>
          <input
            type="text"
            value={formData.empDivisionName}
            onChange={e => handleInputChange('empDivisionName', e.target.value)}
            placeholder="Enter name of division"
            maxLength={MAX_LENGTH.empDivisionName}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
          />
        </div>
      </div>

      {/* Stage 1 Footer Navigation */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleNavigateToStage('education')}
          className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-[#164e8d] rounded-xl shadow-md transition cursor-pointer"
        >
          <span>Next Stage (Educational Qualification)</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
