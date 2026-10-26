import { useState } from 'react';
import { HrModal, ContextStrip, Button, MandatoryHint } from './HrFormControls';
import ActivityFields from './vacancy/ActivityFields';
import EmployeeDetailsModal from './vacancy/EmployeeDetailsModal';
import { useVacancyActivity } from '../vacancyActivity/useVacancyActivity';
import { addEmployeeOnly, savesThenAddsEmployee } from '../vacancyActivity/config';

const displayDate = (iso) => (iso ? iso.split('-').reverse().join('-') : '');

/**
 * Records recruitment activity for one post code.
 * Mount it only while open (it loads once per mount).
 *
 * target:          'anticipated' (Vacancy Management) or 'vacant' (Vacant Details) - picks the save endpoint
 * method:          actual method of appointment; drives which fields are shown
 * expectedMethod:  expected method of filling (saved as the vacancy type)
 */
export default function VacancyActivityModal({
  onClose,
  post,
  method,
  expectedMethod,
  dateOfVacancy,
  reasonForExemption,
  target,
  userCanEdit = false,
  notify,
  onSuccess,
  onAddEmployee,
}) {
  const state = useVacancyActivity({
    post,
    method,
    expectedMethod,
    dateOfVacancy,
    reasonForExemption,
    target,
    userCanEdit,
    notify,
    onClose,
    onSuccess,
    onAddEmployee,
  });
  const { mode, form, errors, loading, saving, details, closeDetails, validate, actions } = state;
  const [confirmAdd, setConfirmAdd] = useState(false);

  const errorCount = Object.keys(errors).length;
  const addOnly = addEmployeeOnly(mode.key, form);
  const locked = !userCanEdit;

  const requestAddEmployee = () => {
    if (validate()) setConfirmAdd(true);
  };

  const footer = confirmAdd ? (
    <>
      <span className="text-sm text-slate-700 dark:text-slate-200">Save this activity and continue to add the employee?</span>
      <div className="flex gap-2">
        <Button onClick={() => setConfirmAdd(false)} disabled={saving}>Go back</Button>
        <Button
          variant="primary"
          disabled={saving}
          onClick={async () => {
            if (!(await actions.save({ addEmployee: true }))) setConfirmAdd(false);
          }}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </Button>
      </div>
    </>
  ) : (
    <>
      {locked ? <span className="text-xs text-slate-500">View only</span> : <MandatoryHint />}
      <div className="flex gap-2">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        {addOnly ? (
          <Button variant="primary" onClick={requestAddEmployee} disabled={saving || locked || loading}>
            Add employee
          </Button>
        ) : (
          <Button variant="primary" onClick={() => actions.save()} disabled={saving || locked || loading}>
            {saving ? 'Saving…' : savesThenAddsEmployee(mode.key, form) ? 'Save & add employee' : 'Save'}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      <HrModal
        isOpen
        title="Update vacancy activity"
        subtitle={`${post.name || 'Post'} · ${post.code}`}
        onClose={onClose}
        busy={saving}
        footer={footer}
      >
        <ContextStrip
          items={[
            { label: 'Post', value: post.name },
            { label: 'Post code', value: post.code },
            { label: 'Method of appointment', value: mode.label },
            { label: 'Date of vacancy', value: displayDate(form.dateOfAriseInVacancy) },
          ]}
        />

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading saved activity…</p>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!addOnly) actions.save();
            }}
          >
            {errorCount > 0 && (
              <p role="alert" className="mb-2 px-3 py-2 rounded border border-red-200 bg-red-50 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {errorCount === 1 ? 'Please correct the highlighted field.' : `Please correct the ${errorCount} highlighted fields.`}
              </p>
            )}
            <ActivityFields state={state} locked={locked} />
          </form>
        )}
      </HrModal>

      <EmployeeDetailsModal isOpen={details.open} onClose={closeDetails} employee={details.data} loading={details.loading} />
    </>
  );
}
