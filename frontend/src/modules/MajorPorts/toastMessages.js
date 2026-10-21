import { toastSuccess, toastError, toastWarning, toastInfo, withReason } from '../../utils/notify';

/**
 * KPI Major Ports toast messages (Traffic, Port Performance, Financial Parameters).
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

/** KPI Major Ports toast messages (Port Performance). Entry access reuses TRAFFIC_TOASTS. */
export const PORT_PERFORMANCE_TOASTS = {
  // Input form
  stepSaved: (stepLabel, period, isUpdate) =>
    toastSuccess(isUpdate ? 'Changes Saved' : 'Step Saved',
      `${stepLabel} for ${periodLabel(period)} has been ${isUpdate ? 'updated' : 'saved'}.`),
  periodCompleted: (period, isUpdate) =>
    toastSuccess(isUpdate ? 'Port Performance Updated' : 'Port Performance Submitted',
      `Port performance for ${periodLabel(period)} has been ${isUpdate ? 'updated' : 'submitted'}. It now appears under Actuals.`),
  saveFailed: (stepLabel, reason) =>
    toastError('Save Failed', withReason(`${stepLabel} could not be saved. Please check the values and try again.`, reason)),
  periodExists: (period) =>
    toastInfo('Period Already Has Data', `Port performance for ${periodLabel(period)} was entered earlier. Open it for update to change the values.`),
  stepIncomplete: (stepLabel, missing) =>
    toastWarning('Complete This Step', `${stepLabel} needs every value before it can be saved (${missing} still empty). Enter 0 where nothing applies.`),
  invalidValues: () =>
    toastWarning('Check the Values', 'Values must be numbers of zero or more (whole numbers for counts, at most 100 for percentages). Correct the cells highlighted in red.'),
  nothingSaved: () =>
    toastWarning('Nothing to Save', 'Save at least one step before submitting.'),
  periodLoadFailed: (reason) =>
    toastError('Could Not Load Period', withReason('The saved port performance for this period could not be loaded. Refresh the page and try again.', reason)),

  // Data list
  periodDeleted: (period) =>
    toastSuccess('Port Performance Deleted', `Port performance for ${periodLabel(period)} has been deleted.`),
  periodDeleteFailed: (period, reason) =>
    toastError('Delete Failed', withReason(`Port performance for ${periodLabel(period)} could not be deleted.`, reason)),

  // Targets
  targetsSaved: (rowName, fiscalYear, isUpdate) =>
    toastSuccess(isUpdate ? 'Targets Updated' : 'Targets Added',
      `The ${fiscalYear} port performance targets for ${orgLabel(rowName)} have been ${isUpdate ? 'updated' : 'saved'}.`),
  targetsExist: (rowName, fiscalYear) =>
    toastInfo('Targets Already Exist', `${fiscalYear} targets for ${orgLabel(rowName)} already exist. Open them for update instead.`),
  targetsEmpty: () =>
    toastWarning('Nothing to Save', 'Enter at least one target value.'),
  targetsSaveFailed: (isUpdate, reason) =>
    toastError(isUpdate ? 'Update Failed' : 'Targets Not Saved',
      withReason(`The targets could not be ${isUpdate ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  targetsDeleted: (rowName, fiscalYear) =>
    toastSuccess('Targets Deleted', `The ${fiscalYear} targets for ${orgLabel(rowName)} have been deleted.`),
  targetsDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The targets could not be deleted.', reason)),
  targetsLoadFailed: (reason) =>
    toastError('Could Not Load Targets', withReason('The saved targets could not be loaded. Refresh the page and try again.', reason)),
};

/** KPI Major Ports toast messages (Financial Parameters). */
export const FINANCIAL_PARAMETERS_TOASTS = {
  actualSaved: (period, isUpdate) =>
    toastSuccess(isUpdate ? 'Financial Parameters Updated' : 'Financial Parameters Submitted',
      `Financial parameters for ${periodLabel(period)} have been ${isUpdate ? 'updated' : 'submitted'}. They now appear under Actuals.`),
  actualSaveFailed: (isUpdate, reason) =>
    toastError(isUpdate ? 'Update Failed' : 'Save Failed',
      withReason(`The financial parameters could not be ${isUpdate ? 'updated' : 'saved'}. Please check the values and try again.`, reason)),
  periodExists: (period) =>
    toastInfo('Period Already Has Data', `Financial parameters for ${periodLabel(period)} were entered earlier. Open them for update to change the values.`),
  invalidValues: () =>
    toastWarning('Check the Values', 'Enter every mandatory value. Income, expenditure and handling cost cannot be negative. Correct the fields highlighted in red.'),
  actualLoadFailed: (reason) =>
    toastError('Could Not Load Record', withReason('The saved financial parameters could not be loaded. Refresh the page and try again.', reason)),

  actualDeleted: (period) =>
    toastSuccess('Financial Parameters Deleted', `Financial parameters for ${periodLabel(period)} have been deleted.`),
  actualDeleteFailed: (period, reason) =>
    toastError('Delete Failed', withReason(`Financial parameters for ${periodLabel(period)} could not be deleted.`, reason)),

  targetSaved: (orgName, fiscalYear, isUpdate) =>
    toastSuccess(isUpdate ? 'Targets Updated' : 'Targets Added',
      `The ${fiscalYear} financial targets for ${orgLabel(orgName)} have been ${isUpdate ? 'updated' : 'saved'}.`),
  targetExists: (orgName, fiscalYear) =>
    toastInfo('Targets Already Exist', `${fiscalYear} financial targets for ${orgLabel(orgName)} already exist. Open them for update instead.`),
  targetSaveFailed: (isUpdate, reason) =>
    toastError(isUpdate ? 'Update Failed' : 'Targets Not Saved',
      withReason(`The targets could not be ${isUpdate ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  targetDeleted: (orgName, fiscalYear) =>
    toastSuccess('Targets Deleted', `The ${fiscalYear} financial targets for ${orgLabel(orgName)} have been deleted.`),
  targetDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The targets could not be deleted.', reason)),
};
