import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Audit Para wording only; shared cases (filters, copy, export, required fields) come from COMMON_TOASTS.
const label = (paraNumber) => (paraNumber ? `Audit Para "${paraNumber}"` : 'The audit para');

export const AUDIT_PARA_TOASTS = {
  created: (paraNumber) =>
    toastSuccess('Audit Para Added', `${label(paraNumber)} has been registered.`),
  updated: (paraNumber) =>
    toastSuccess('Changes Saved', `${label(paraNumber)} has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Registration Failed',
      withReason(`The audit para could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  deleted: (paraNumber) =>
    toastSuccess('Audit Para Deleted', `${label(paraNumber)} has been removed.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The audit para could not be deleted. Please try again.', reason)),
  remarksTooLong: () =>
    toastWarning('Remarks Too Long', 'Remarks cannot exceed 250 words. Shorten the general and stage remarks, then save again.'),
};
