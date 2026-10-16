import { toastSuccess, toastError, toastWarning, toastInfo, withReason } from '../../utils/notify';

/**
 * KPI Major Ports toast messages (Traffic).
 * Module-specific wording only; shared ones (copy, export, filters, loading)
 * come from COMMON_TOASTS in utils/notify.js.
 */
const periodLabel = (period) => (period ? `${period.monthLabel} ${period.fiscalYear}` : 'this period');
const orgLabel = (name) => (name ? `"${name}"` : 'the organisation');

export const TRAFFIC_TOASTS = {
  // Input form
  pageSaved: (pageLabel, period, isUpdate) =>
    toastSuccess(isUpdate ? 'Changes Saved' : 'Page Saved',
      `${pageLabel} traffic for ${periodLabel(period)} has been ${isUpdate ? 'updated' : 'saved'}.`),
  periodCompleted: (period, isUpdate) =>
    toastSuccess(isUpdate ? 'Traffic Updated' : 'Traffic Submitted',
      `Traffic data for ${periodLabel(period)} has been ${isUpdate ? 'updated' : 'submitted'}. It now appears under Actuals.`),
  saveFailed: (pageLabel, reason) =>
    toastError('Save Failed', withReason(`${pageLabel} traffic could not be saved. Please check the values and try again.`, reason)),
  periodRequired: () =>
    toastWarning('Select the Period', 'Choose the financial year and month before entering traffic.'),
  periodExists: (period) =>
    toastInfo('Period Already Has Data', `Traffic for ${periodLabel(period)} was entered earlier. Open it for update to change the values.`),
  periodLocked: (period) =>
    toastWarning('Entry Closed', `Data entry for ${periodLabel(period)} is closed. Ask the Ministry to unlock this period.`),
  emptyPage: (pageLabel) =>
    toastWarning('Nothing to Save', `Enter at least one ${pageLabel} value on this page, or use Next to skip it.`),
  invalidValues: () =>
    toastWarning('Check the Values', 'Traffic values must be numbers of zero or more. Correct the cells highlighted in red.'),
  periodLoadFailed: (reason) =>
    toastError('Could Not Load Period', withReason('The saved traffic for this period could not be loaded. Refresh the page and try again.', reason)),

  // Data list
  periodDeleted: (period) =>
    toastSuccess('Traffic Deleted', `Traffic data for ${periodLabel(period)} has been deleted.`),
  periodDeleteFailed: (period, reason) =>
    toastError('Delete Failed', withReason(`Traffic data for ${periodLabel(period)} could not be deleted.`, reason)),

  // Targets
  targetAdded: (orgName, fiscalYear) =>
    toastSuccess('Target Added', `The ${fiscalYear} target for ${orgLabel(orgName)} has been saved.`),
  targetExists: (orgName, fiscalYear) =>
    toastInfo('Target Already Exists', `A ${fiscalYear} target for ${orgLabel(orgName)} already exists. Open it for update instead.`),
  targetUpdated: (orgName, fiscalYear) =>
    toastSuccess('Target Updated', `The ${fiscalYear} target for ${orgLabel(orgName)} has been updated.`),
  targetSaveFailed: (isUpdate, reason) =>
    toastError(isUpdate ? 'Update Failed' : 'Target Not Saved',
      withReason(`The target could not be ${isUpdate ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  targetDeleted: (orgName, fiscalYear) =>
    toastSuccess('Target Deleted', `The ${fiscalYear} target for ${orgLabel(orgName)} has been deleted.`),
  targetDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The target could not be deleted.', reason)),

  // Entry access (ministry unlock)
  accessGranted: (count) =>
    toastSuccess('Entry Unlocked', `Data entry has been unlocked for ${count} ${count === 1 ? 'organisation-year' : 'organisation-years'}.`),
  accessGrantFailed: (reason) =>
    toastError('Unlock Failed', withReason('Data entry could not be unlocked. Please review the selection and try again.', reason)),
  accessRevoked: (orgName) =>
    toastSuccess('Access Revoked', `Late data entry for ${orgLabel(orgName)} has been closed.`),
  accessRevokeFailed: (reason) =>
    toastError('Revoke Failed', withReason('The access could not be revoked.', reason)),
};
