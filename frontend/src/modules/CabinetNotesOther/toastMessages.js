import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Cabinet Notes - Other Ministry wording only; shared cases (copy, export, filters,
// load failures) come from COMMON_TOASTS so every module words them the same way.
export const CABINET_NOTES_OTHER_TOASTS = {
  created: () =>
    toastSuccess('Cabinet Note Added', 'The cabinet note has been registered.'),
  updated: () =>
    toastSuccess('Changes Saved', 'The cabinet note has been updated.'),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The cabinet note could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  missingRequired: () =>
    toastWarning('Required Fields Missing',
      'Enter the subject and e-Office file number, select the ministry, and give a date for at least one stage.'),
  remarksTooLong: () =>
    toastWarning('Remarks Too Long', 'Remarks cannot exceed 250 words. Shorten them, then save again.'),
  deleted: () =>
    toastSuccess('Cabinet Note Deleted', 'The cabinet note has been removed.'),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The cabinet note could not be deleted. Please try again.', reason)),

  // Raised when the user matrix does not grant the action. The button is hidden in that
  // case, so this only fires if the permission changed while the page was open.
  editNotAllowed: () =>
    toastError('Not Permitted', 'Your account cannot edit cabinet notes. Ask an administrator for update rights.'),
  deleteNotAllowed: () =>
    toastError('Not Permitted', 'Your account cannot delete cabinet notes. Ask an administrator for delete rights.'),
};

export default CABINET_NOTES_OTHER_TOASTS;
