import { toastSuccess, toastError, toastWarning, toastInfo, withReason } from '../../utils/notify';

/**
 * Drishti Portal (OVOD) toast messages.
 * Module-specific wording only; shared ones (copy, export, validation, load failures,
 * filters) come from COMMON_TOASTS in utils/notify.js.
 */

// B2 interventions are "Initiatives"; B3 rows are "Actionable Items"
const itemLabel = (level) => (level === 'B3' ? 'Actionable Item' : 'Initiative');

export const OVOD_TOASTS = {
  // Data List
  itemDeleted: () =>
    toastSuccess('Action Item Deleted', 'The action item has been removed from the Data List.'),
  itemDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The action item could not be deleted. Please try again.', reason)),

  // Add Initiative
  actionableItemRequired: () =>
    toastWarning('Actionable Item Required', 'Add at least one Actionable Item (B3) along with the B2 intervention.'),
  added: (level) =>
    toastSuccess(`${itemLabel(level)} Added`, `The new ${itemLabel(level).toLowerCase()} has been submitted successfully.`),
  addFailed: (level, reason) =>
    toastError('Submission Failed',
      withReason(`The new ${itemLabel(level).toLowerCase()} could not be submitted. Please review the form and try again.`, reason)),

  // Update Initiative
  updated: () =>
    toastSuccess('Initiative Updated', 'The initiative details have been saved.'),
  updateFailed: (reason) =>
    toastError('Update Failed', withReason('The initiative could not be updated. Please review the form and try again.', reason)),
  documentUploadFailed: (reason) =>
    toastWarning('Document Not Uploaded',
      withReason('The initiative was updated, but the document could not be uploaded. Open the initiative again to upload it.', reason)),
  nameUpdated: (level) =>
    toastSuccess(`${level} Name Updated`, `The ${level} name has been updated.`),
  nameUpdateFailed: (level, reason) =>
    toastError('Name Update Failed', withReason(`The ${level} name could not be updated. Please try again.`, reason)),

  // Intervention List remarks are edited in the table only; there is no save endpoint yet
  remarksUpdated: () =>
    toastInfo('Remarks Updated', 'Remarks were updated in the table for this session only. They are not saved to the server.'),
};
