import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Bills / Pre-Constitutions Act wording only; shared cases (required fields, copy, export,
// load failures) come from COMMON_TOASTS.
export const BILLS_TOASTS = {
  created: () =>
    toastSuccess('Bill Added', 'The bill has been registered.'),
  updated: () =>
    toastSuccess('Changes Saved', 'The bill has been updated.'),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The bill could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  remarksTooLong: () =>
    toastWarning('Remarks Too Long', 'Remarks cannot exceed 250 words. Shorten them, then save again.'),
  deleted: (subject) =>
    toastSuccess('Bill Deleted', subject ? `"${subject}" has been removed.` : 'The bill has been removed.'),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The bill could not be deleted. Please try again.', reason)),
};
