import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// IMU wording only; shared cases (required fields, copy, export, load failures) come from COMMON_TOASTS.
// `section` is the section name, e.g. 'Student Enrollment'.
export const IMU_TOASTS = {
  added: (section) =>
    toastSuccess('Entry Added', `The ${section} entry has been saved.`),
  updated: (section) =>
    toastSuccess('Changes Saved', `The ${section} entry has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The entry could not be ${isEdit ? 'updated' : 'saved'}. Please review the values and try again.`, reason)),
  invalidValues: () =>
    toastWarning('Check the Values', 'Values cannot be negative or non-numeric. Correct them, then save again.'),
  passedExceedsAppeared: () =>
    toastWarning('Check the Values', 'The number passed cannot be more than the number who appeared. Correct it, then save again.'),
  deleted: (section, period) =>
    toastSuccess('Entry Deleted', `The ${section} entry for ${period} has been removed.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The entry could not be deleted. Please try again.', reason)),
};
