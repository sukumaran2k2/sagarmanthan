import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Cabinet Notes - MoPSW wording only; shared cases (copy, export, file checks, load failures)
// come from COMMON_TOASTS.
export const CABINET_NOTES_TOASTS = {
  created: () =>
    toastSuccess('Cabinet Note Added', 'The cabinet note has been registered.'),
  updated: () =>
    toastSuccess('Changes Saved', 'The cabinet note has been updated.'),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The cabinet note could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  missingRequired: () =>
    toastWarning('Required Fields Missing', 'Select the wing and division and enter the subject, then save again.'),
  remarksTooLong: () =>
    toastWarning('Remarks Too Long', 'Remarks cannot exceed 250 words. Shorten them, then save again.'),
  openFailed: (reason) =>
    toastError('Could Not Open Note', withReason('The cabinet note could not be loaded. Please try again.', reason)),
  deleted: () =>
    toastSuccess('Cabinet Note Deleted', 'The cabinet note has been removed.'),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The cabinet note could not be deleted. Please try again.', reason)),
  downloadFailed: () =>
    toastError('Download Failed', 'The document could not be downloaded. Please try again.'),
};
