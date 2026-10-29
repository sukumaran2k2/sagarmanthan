import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

const label = (name) => (name ? `"${name}"` : 'The MoU');

// GMIS & IMW MoU wording only; shared cases (copy, export, load failures, filters, file
// size) come from COMMON_TOASTS.
export const GMIS_TOASTS = {
  created: (name) =>
    toastSuccess('MoU Added', `${label(name)} has been registered.`),
  updated: (name) =>
    toastSuccess('Changes Saved', `${label(name)} has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The MoU could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  stageIncomplete: (stage, count, firstMessage) =>
    toastWarning('Required Fields Missing', count > 1
      ? `Fill in the ${count} mandatory fields in Stage ${stage}, highlighted in red, before moving on.`
      : `${firstMessage}. Fill it in before moving on.`),

  documentUploaded: (fileName) =>
    toastSuccess('Document Attached', fileName ? `"${fileName}" has been uploaded. Save the MoU to keep it.` : 'The MoU document has been uploaded. Save the MoU to keep it.'),
  documentUploadFailed: (reason) =>
    toastError('Upload Failed', withReason('The MoU document could not be uploaded. Please try again.', reason)),
  downloadFailed: (reason) =>
    toastError('Download Failed', withReason('The MoU document could not be downloaded. Please try again.', reason)),

  revisionDateMissing: (kind) =>
    toastWarning('Date Required', `Enter the ${kind} progress date, then save the revision.`),
  revisionPercentInvalid: () =>
    toastWarning('Check the Percentage', 'Enter a progress percentage between 0 and 100.'),
  revisionSaved: (kind) =>
    toastSuccess('Revision Saved', `The ${kind} progress revision has been recorded.`),
  revisionSaveFailed: (kind, reason) =>
    toastError('Revision Not Saved', withReason(`The ${kind} progress revision could not be saved. Please try again.`, reason)),
  historyLoadFailed: (kind) =>
    toastWarning('History Unavailable', `The ${kind} progress history could not be loaded, so only the current value is shown.`),
};
