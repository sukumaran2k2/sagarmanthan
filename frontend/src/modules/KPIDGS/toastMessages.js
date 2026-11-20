import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// DGS wording only; shared cases come from COMMON_TOASTS.
export const DGS_TOASTS = {
  added: (section) =>
    toastSuccess('Entry Added', `The ${section} entry has been saved.`),
  updated: (section) =>
    toastSuccess('Changes Saved', `The ${section} entry has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The entry could not be ${isEdit ? 'updated' : 'saved'}. Please review the values and try again.`, reason)),
  duplicate: (what) =>
    toastWarning('Entry Already Exists', `An entry for the selected ${what} already exists. Edit it from the list instead.`),
  deleted: (section, period) =>
    toastSuccess('Entry Deleted', `The ${section} entry for ${period} has been removed.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The entry could not be deleted. Please try again.', reason)),
  statusChanged: (name, status) =>
    toastSuccess('Status Updated', `${name} is now ${status ? 'Active' : 'Inactive'}.`),
  statusFailed: (reason) =>
    toastError('Status Update Failed', withReason('The status could not be changed. Please try again.', reason)),
  mmdNameRequired: () =>
    toastWarning('MMD Name Required', 'Enter an MMD name before saving.'),
  mmdDuplicate: () =>
    toastWarning('MMD Already Exists', 'An MMD with this name already exists.'),
};
