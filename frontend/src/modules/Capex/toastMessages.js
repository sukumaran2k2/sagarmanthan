import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Capex wording only; shared cases (copy, export, load failures, required selects) come from COMMON_TOASTS.
export const CAPEX_TOASTS = {
  targetCreated: () =>
    toastSuccess('Capex Target Added', 'The Capex target has been saved.'),
  targetUpdated: () =>
    toastSuccess('Changes Saved', 'The Capex target has been updated.'),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The Capex target could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  invalidAmount: (label) =>
    toastWarning('Check the Form', `Enter a valid non-negative ${label} value, then save again.`),
  noRecordSelected: () =>
    toastWarning('No Record Selected', 'Open Update from the Data List, then try again.'),
  actualsSaved: () =>
    toastSuccess('Actual Expenditure Saved', 'The monthly actual expenditure has been saved.'),
  reportCopied: (reportName) =>
    toastSuccess('Copied to Clipboard', `The ${reportName} was copied. You can paste it into Excel or a document.`),
  actualsSaveFailed: (reason) =>
    toastError('Save Failed', withReason('The actual expenditure could not be saved. Please try again.', reason)),
};
