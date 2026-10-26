import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// CSL wording only; shared cases (required fields, copy, export, load failures) come from COMMON_TOASTS.
// `section` is the section name, e.g. 'Vessels Built'.
export const CSL_TOASTS = {
  added: (section) =>
    toastSuccess('Entry Added', `The ${section} entry has been saved.`),
  updated: (section) =>
    toastSuccess('Changes Saved', `The ${section} entry has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The entry could not be ${isEdit ? 'updated' : 'saved'}. Please review the values and try again.`, reason)),
  // period: 'financial year' or 'financial year and quarter'
  duplicate: (period) =>
    toastWarning('Entry Already Exists', `An entry for the selected ${period} already exists. Edit that entry from the Data List instead.`),
  invalidValues: () =>
    toastWarning('Check the Values', 'Values cannot be negative or non-numeric. Correct them, then save again.'),
  deleted: (section, period) =>
    toastSuccess('Entry Deleted', `The ${section} entry for ${period} has been removed.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The entry could not be deleted. Please try again.', reason)),
};
