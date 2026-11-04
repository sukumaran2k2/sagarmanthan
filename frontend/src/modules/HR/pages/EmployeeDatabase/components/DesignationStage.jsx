import { Briefcase, Save, ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/HrFormControls';
import { OTHER_ORGANISATION_ID } from '../../../constants';
import { SELECTABLE_APPOINTMENT_METHODS } from '../../../utils/addEmployeeHandoff';
import { MAX_LENGTH } from '../employeeFormConfig';

// A value fixed by the vacancy hand-off: shown read-only, in the same box as an editable field
function LockedValue({ value, type = 'text', label }) {
  return (
    <input
      type={type}
      value={value || ''}
      readOnly
      aria-readonly="true"
      aria-label={label}
      title="This value can't be changed here"
      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 cursor-not-allowed focus:outline-none"
    />
  );
}

// Stage 3 of the Employee Data form: post, department, appointment and joining.
export default function DesignationStage({ departments, edit, formData, formErrors, handleBack, handleDepartmentChange, handleInputChange, handleNavigateToStage, handlePostChange, handoff, handoffBlockedToast, isDeputationHandoff, isEditMode, isSubmitting, lockMethod, lockPost, lockVacancyDate, organisations, otherOrganisation, otherOrganisationLabel, postCodes, posts }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span>3. Designation & Post Details</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select department, official designation, method of appointment, post codes, and service joining records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Department */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Department <span className="text-rose-500">*</span>
          </label>
          {lockPost ? (
            <LockedValue value={formData.departmentName} label="Department" />
          ) : (
          <select
            value={formData.department}
            onChange={handleDepartmentChange}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.department ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Department--</option>
            {departments.map(d => (
              <option key={d.department_id || d.departmentId} value={d.department_id || d.departmentId}>
                {d.department_name || d.departmentName}
              </option>
            ))}
          </select>
          )}
          {formErrors.department && <p className="text-2xs text-rose-500 mt-1">{formErrors.department}</p>}
        </div>

        {/* Post Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Post Name <span className="text-rose-500">*</span>
          </label>
          {lockPost ? (
            <LockedValue value={formData.empPostName} label="Post Name" />
          ) : (
          <select
            value={formData.empPostId}
            onChange={handlePostChange}
            disabled={!formData.department}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.empPostId ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs disabled:opacity-50`}
          >
            <option value="">--Select Post Name--</option>
            {posts.map(p => (
              <option key={p.post_id || p.postId} value={p.post_id || p.postId}>
                {p.post_name || p.postName}
              </option>
            ))}
          </select>
          )}
          {formErrors.empPostId && <p className="text-2xs text-rose-500 mt-1">{formErrors.empPostId}</p>}
        </div>

        {/* Method Of Appointment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Method Of Appointment <span className="text-rose-500">*</span>
          </label>
          {lockMethod ? (
            <LockedValue value={formData.appoinmentMethod} label="Method Of Appointment" />
          ) : (
          <select
            value={formData.appoinmentMethod}
            onChange={e => handleInputChange('appoinmentMethod', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.appoinmentMethod ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          >
            <option value="">--Select Appointment Method--</option>
            {SELECTABLE_APPOINTMENT_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          )}
          {formErrors.appoinmentMethod && <p className="text-2xs text-rose-500 mt-1">{formErrors.appoinmentMethod}</p>}
        </div>

        {/* Post Code */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Post Code <span className="text-rose-500">*</span>
          </label>
          {handoff || isEditMode ? (
            <LockedValue value={formData.postCode} label="Post Code" />
          ) : postCodes.length > 0 ? (
            <select
              value={formData.postCode}
              onChange={e => handleInputChange('postCode', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                formErrors.postCode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
            >
              <option value="">--Select Post Code--</option>
              {postCodes.map(pc => (
                <option key={pc.post_code || pc.postCode} value={pc.post_code || pc.postCode}>
                  {pc.post_code || pc.postCode}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.postCode}
              onChange={e => handleInputChange('postCode', e.target.value)}
              placeholder="Enter Post Code"
              className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                formErrors.postCode ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
            />
          )}
          {formErrors.postCode && <p className="text-2xs text-rose-500 mt-1">{formErrors.postCode}</p>}
        </div>

        {/* Date of Arise in Vacancy */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Date of Arise in Vacancy <span className="text-rose-500">*</span>
          </label>
          {lockVacancyDate ? (
            <LockedValue type="date" value={formData.vacancyAriseDate} label="Date of Arise in Vacancy" />
          ) : (
          <input
            type="date"
            value={formData.vacancyAriseDate}
            onChange={e => handleInputChange('vacancyAriseDate', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.vacancyAriseDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          )}
          {formErrors.vacancyAriseDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.vacancyAriseDate}</p>}
        </div>

        {/* Date of Joining in Current Organisation */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Date of Joining in Current Organisation <span className="text-rose-500">*</span>
          </label>
          {/* Editing: the joining date is shown, not changed */}
          {isEditMode ? (
            <LockedValue type="date" value={formData.joiningDate} label="Date of Joining in Current Organisation" />
          ) : (
          <input
            type="date"
            value={formData.joiningDate}
            min={formData.vacancyAriseDate || undefined}
            onChange={e => handleInputChange('joiningDate', e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
              formErrors.joiningDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
          />
          )}
          {formErrors.joiningDate && <p className="text-2xs text-rose-500 mt-1">{formErrors.joiningDate}</p>}
        </div>

        {/* Parent Organisation */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Parent Organisation
          </label>
          {isDeputationHandoff ? (
            <LockedValue value={otherOrganisationLabel} label="Parent Organisation" />
          ) : (
          <select
            value={formData.parentOrganisation}
            onChange={e => {
              handleInputChange('parentOrganisation', e.target.value);
              // The free-text name belongs to "Other organisation" only
              if (e.target.value !== OTHER_ORGANISATION_ID) handleInputChange('otherParentOrg', '');
            }}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
          >
            <option value="">--Select Organisation Name--</option>
            {organisations.map(o => (
              <option key={o.organisation_id || o.organisationId} value={o.organisation_id || o.organisationId}>
                {o.organisation_name || o.organisationName}
              </option>
            ))}
          </select>
          )}
        </div>

        {/* Name of the parent organisation when it is "Other organisation" (sent as otherParentOrg) */}
        {otherOrganisation && (
          <div>
            <label htmlFor="otherParentOrg" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Please specify the organisation name <span className="text-rose-500">*</span>
            </label>
            <input
              id="otherParentOrg"
              type="text"
              value={formData.otherParentOrg}
              onChange={e => handleInputChange('otherParentOrg', e.target.value)}
              placeholder="Enter other organisation name"
              maxLength={MAX_LENGTH.otherParentOrg}
              className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border ${
                formErrors.otherParentOrg ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs`}
            />
            {formErrors.otherParentOrg && <p className="text-2xs text-rose-500 mt-1">{formErrors.otherParentOrg}</p>}
          </div>
        )}

        {/* Initial Date of Joining in Port Service */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Initial Date of Joining in Port Service
          </label>
          <input
            type="date"
            value={formData.parentOrgJoiningDate}
            onChange={e => handleInputChange('parentOrgJoiningDate', e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs"
          />
        </div>
      </div>

      {/* Stage 3 Footer Navigation & Final Submit */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => handleNavigateToStage('education')}
          className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous Stage (Educational Qualification)</span>
        </button>

        <div className="flex items-center space-x-3">
          <Button onClick={handleBack} disabled={isSubmitting} className="h-10 px-5">
            Cancel
          </Button>

          <Button
            variant="primary"
            type="submit"
            busy={isSubmitting}
            disabled={isSubmitting || Boolean(handoffBlockedToast) || (isEditMode && edit.status !== 'ready')}
            title={handoffBlockedToast?.message}
            className="h-10 px-6"
          >
            {!isSubmitting && <Save className="h-4 w-4" />}
            <span>
              {isSubmitting
                ? (isEditMode ? 'Updating...' : 'Submitting...')
                : (isEditMode ? 'Update Employee Data' : 'Submit Employee Data')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
