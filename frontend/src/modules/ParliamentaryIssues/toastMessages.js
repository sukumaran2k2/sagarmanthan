import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Parliamentary Issues wording only; shared cases (copy, export, load failures) come from COMMON_TOASTS.
export const PARLIAMENTARY_TOASTS = {
  created: () =>
    toastSuccess('Issue Added', 'The parliamentary issue has been registered.'),
  updated: () =>
    toastSuccess('Changes Saved', 'The parliamentary issue has been updated.'),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The parliamentary issue could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  missingWingDivision: () =>
    toastWarning('Required Fields Missing', 'Select the wing and division, then save again.'),
  missingIssueType: () =>
    toastWarning('Required Field Missing', 'Select the type of issue, then save again.'),
  openFailed: (reason) =>
    toastError('Could Not Open Issue', withReason('The parliamentary issue could not be loaded. Please try again.', reason)),
  deleted: () =>
    toastSuccess('Issue Deleted', 'The parliamentary issue has been removed.'),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The parliamentary issue could not be deleted. Please try again.', reason)),
};
