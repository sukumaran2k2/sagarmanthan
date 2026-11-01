import { toastSuccess, toastError, toastWarning, toastInfo, withReason } from '../../utils/notify';

// GEM Procurement wording only; shared cases (copy, export, load failures, required selects) come from COMMON_TOASTS.
export const GEM_TOASTS = {
  targetCreated: (categoryTitle) =>
    toastSuccess('Planned Procurement Added', `The ${categoryTitle} planned procurement has been saved.`),
  targetUpdated: (categoryTitle) =>
    toastSuccess('Changes Saved', `The ${categoryTitle} target has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The planned procurement could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  invalidPlannedValue: () =>
    toastWarning('Check the Form', 'Enter a valid non-negative planned procurement value, then save again.'),
  duplicateTarget: (categoryTitle, orgName, financialYear) =>
    toastWarning('Target Already Exists', `A ${categoryTitle} target for "${orgName}" already exists for ${financialYear}. Update that record instead.`),
  monthlySaved: () =>
    toastSuccess('Monthly Data Saved', 'The monthly procurement data has been saved.'),
  monthlySaveFailed: (reason) =>
    toastError('Save Failed', withReason('The monthly procurement data could not be saved. Please try again.', reason)),
  reportCopied: (reportName) =>
    toastSuccess('Copied to Clipboard', `The ${reportName} was copied. You can paste it into Excel or a document.`),
  pdfComingSoon: () =>
    toastInfo('Coming Soon', 'PDF export is not available yet. Use the Excel export for now.'),
};
