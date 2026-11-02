import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// DGLL wording only; shared cases (required fields, copy, export, load failures) come from COMMON_TOASTS.
// `section` is the section name, e.g. 'VTMS Integration'.
export const DGLL_TOASTS = {
  added: (section) =>
    toastSuccess('Entry Added', `The ${section} entry has been saved.`),
  updated: (section) =>
    toastSuccess('Changes Saved', `The ${section} entry has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The entry could not be ${isEdit ? 'updated' : 'saved'}. Please review the values and try again.`, reason)),
  // period: 'financial year' or 'year'
  duplicate: (period) =>
    toastWarning('Entry Already Exists', `An entry for the selected ${period} already exists. Edit that entry from the Data List instead.`),
  invalidValues: () =>
    toastWarning('Check the Values', 'Values cannot be negative or non-numeric. Correct them, then save again.'),
  // field: e.g. 'NAIS availability'
  invalidPercentage: (field) =>
    toastWarning('Check the Values', `The ${field} percentage must be a number from 0 to 100. Correct it, then save again.`),
  deleted: (section, period) =>
    toastSuccess('Entry Deleted', `The ${section} entry for ${period} has been removed.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The entry could not be deleted. Please try again.', reason)),
};
