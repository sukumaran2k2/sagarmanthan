import { useMemo } from 'react';
import {
  DateInput,
  FormRow,
  Note,
  RadioGroup,
  SectionTitle,
  SelectInput,
  StageList,
  TextInput,
} from '../HrFormControls';
import { UserRound, UserRoundCheck } from 'lucide-react';
import {
  ORG_OTHER,
  ROOT_KEY,
  ROOT_LABEL,
  getChain,
  isStageDisabled,
  isStagedMode,
} from '../../vacancyActivity/config';

// Renders the fields for the popup's method of appointment.
// Staged methods (Direct Recruitment, Promotion, Deputation, Composite) share one layout:
// process date -> numbered stages -> appointment details once the final stage is dated.

export default function ActivityFields({ state, locked }) {
  const { mode, form: f, errors, actions, organisations, employees, employeesLoading } = state;

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: String(e.employee_id), label: `${e.employee_id} - ${e.emp_name || 'N/A'}` })),
    [employees]
  );

  const employeePicker = ({ required = true, needsOrganisation = false }) => {
    const waiting = needsOrganisation && !f.organisationOfEmp;
    return (
      <FormRow label="Employee" required={required} error={errors.employeeId}>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <SelectInput
              value={f.employeeId}
              onChange={actions.changeEmployee}
              options={employeeOptions}
              disabled={locked || waiting || employeesLoading}
              placeholder={waiting ? 'Select the organisation first' : employeesLoading ? 'Loading employees…' : 'Select employee'}
              error={errors.employeeId}
            />
          </div>
          <button
            type="button"
            onClick={actions.showEmployeeDetails}
            disabled={!f.employeeId}
            title={f.employeeId ? 'View employee details' : 'Select an employee to view details'}
            aria-label={f.employeeId ? 'View employee details' : 'No employee selected'}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded transition-colors ${
              f.employeeId
                ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            {f.employeeId ? <UserRoundCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
          </button>
        </div>
      </FormRow>
    );
  };

  const dateField = (key, label, { required = true, disabled = false, hint } = {}) => (
    <FormRow label={label} required={required} error={errors[key]} hint={hint}>
      <DateInput value={f[key]} onChange={(v) => actions.setField(key, v)} disabled={locked || disabled} error={errors[key]} />
    </FormRow>
  );

  const organisationSelect = (onChange) => (
    <FormRow label="Organisation of employee" required error={errors.organisationOfEmp}>
      <SelectInput
        value={f.organisationOfEmp}
        onChange={onChange}
        options={organisations}
        disabled={locked}
        placeholder="Select organisation"
        error={errors.organisationOfEmp}
      />
    </FormRow>
  );

  if (isStagedMode(mode.key)) {
    const stagesLocked = isStageDisabled(mode.key, f);
    const steps = getChain(mode.key, f).map((s) => ({
      key: s.key,
      label: s.label,
      required: s.required,
      error: errors[s.key],
      done: Boolean(f[s.key]),
      children:
        s.type === 'number' ? (
          <TextInput
            type="number"
            min="0"
            value={f[s.key]}
            onChange={(v) => actions.setField(s.key, v)}
            disabled={locked || stagesLocked}
            error={errors[s.key]}
          />
        ) : (
          <DateInput
            value={f[s.key]}
            onChange={(v) => actions.setStage(s.key, v)}
            disabled={locked || stagesLocked}
            error={errors[s.key]}
          />
        ),
    }));

    return (
      <>
        <FormRow label={ROOT_LABEL} required error={errors[ROOT_KEY]}>
          <DateInput value={f[ROOT_KEY]} onChange={(v) => actions.setStage(ROOT_KEY, v)} disabled={locked} error={errors[ROOT_KEY]} />
        </FormRow>

        {mode.key === 'directRecruitment' && (
          <FormRow label="Recruitment through" required error={errors.recruitmentThrough}>
            <RadioGroup
              name="recruitmentThrough"
              vertical
              value={f.recruitmentThrough}
              onChange={actions.setRecruitmentThrough}
              disabled={locked || !f[ROOT_KEY]}
              options={[
                { value: '1', label: 'IPA / other agencies' },
                { value: '0', label: 'Respective port authority' },
              ]}
            />
          </FormRow>
        )}

        {steps.length > 0 && (
          <>
            <SectionTitle>Process stages</SectionTitle>
            <StageList steps={steps} />
          </>
        )}

        {mode.key === 'promotion' && f.orderDatePromotion && (
          <>
            <SectionTitle>Appointment</SectionTitle>
            {employeePicker({})}
            {dateField('joiningDate', 'Date of employee joined')}
          </>
        )}

        {mode.key === 'deputation' && f.orderIssuedDeputation && (
          <>
            <SectionTitle>Appointment</SectionTitle>
            {organisationSelect(actions.changeOrganisation)}
            {f.organisationOfEmp === ORG_OTHER ? (
              <Note>Employees from other organisations are recorded through “Save &amp; add employee” below.</Note>
            ) : (
              employeePicker({ needsOrganisation: true })
            )}
            {dateField('joiningDate', 'Employee joining date')}
          </>
        )}

        {mode.key === 'composite' && (
          <>
            <SectionTitle>Appointment</SectionTitle>
            <FormRow label="Employee already in the database?" required error={errors.employeeExistComposite}>
              <RadioGroup
                name="employeeExistComposite"
                value={f.employeeExistComposite}
                onChange={(v) => actions.setField('employeeExistComposite', v)}
                disabled={locked}
                options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]}
              />
            </FormRow>
            {f.employeeExistComposite === '1' ? (
              <>
                {employeePicker({})}
                {dateField('joiningDate', 'Employee joining date')}
              </>
            ) : f.employeeExistComposite === '0' ? (
              <Note>A new employee under the Composite Method is added through “Add employee” below.</Note>
            ) : null}
          </>
        )}
      </>
    );
  }

  switch (mode.key) {
    case 'transfer':
      return (
        <>
          {organisationSelect(actions.changeOrganisation)}
          {employeePicker({ needsOrganisation: true })}
          {dateField('joiningDate', 'Date of joining', { disabled: !f.employeeId })}
        </>
      );

    case 'redeployedCHD':
      return (
        <>
          {dateField('approvalCompetentAuthorityDateCHD', 'Approval of competent authority')}
          {dateField('orderIssuedDateCHD', 'Date of issuance of order')}
          {dateField('joiningDate', 'Date of joining', { required: false })}
          <Note>
            <strong>Note:</strong> If the employee already exists, add them here only. If it is a new employee
            under the CHD category, add them through the &ldquo;Add Employee&rdquo; option in the Employee Database.
          </Note>
          {employeePicker({ required: false })}
          <FormRow label="From which post of CHD">
            <TextInput value={f.fromWhichPostCHD} onChange={(v) => actions.setField('fromWhichPostCHD', v)} disabled={locked} placeholder="CHD post name" />
          </FormRow>
        </>
      );

    case 'redeployedIn':
    case 'promotionDR':
      return (
        <>
          {dateField('joiningDate', 'Date of joining')}
          {employeePicker({})}
        </>
      );

    case 'directCompassionate':
      return (
        <p className="py-3 text-sm text-slate-600 dark:text-slate-300">
          Compassionate appointments have no recruitment stages. Use “Add employee” to register the appointed
          employee against this post code.
        </p>
      );

    default:
      return null;
  }
}
