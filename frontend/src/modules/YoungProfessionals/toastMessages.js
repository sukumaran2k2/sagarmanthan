import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

/**
 * Young Professionals toast messages.
 * Module-specific wording only; shared ones (copy, export, file checks, filters)
 * come from COMMON_TOASTS in utils/notify.js.
 */
const label = (name) => (name ? `"${name}"` : 'the Young Professional');

export const YP_TOASTS = {
  // Input form
  created: (name) =>
    toastSuccess('Young Professional Added', `${label(name)} has been registered successfully.`),
  updated: (name) =>
    toastSuccess('Changes Saved', `Details of ${label(name)} have been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Registration Failed',
      withReason(`The Young Professional details could not be ${isEdit ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  documentUploadFailed: (name, reason) =>
    toastWarning('Document Not Uploaded',
      withReason(`${label(name)} was saved, but the appointment order could not be uploaded. Edit the record to upload it again.`, reason)),
  documentRequired: () =>
    toastWarning('Document Required', 'Please attach the appointment order (PDF) before submitting.'),

  // Data list — relieve
  lastWorkingDateRequired: () =>
    toastWarning('Last Working Date Required', 'Please select the last working date before relieving the candidate.'),
  relieved: (name) =>
    toastSuccess('Candidate Relieved', `${label(name)} has been relieved and moved to the Relieved list.`),
  relieveFailed: (name, reason) =>
    toastError('Relieve Failed', withReason(`${label(name)} could not be relieved. Please try again.`, reason)),
};
