import {
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  withReason,
  getErrorMessage,
} from '../../utils/notify';

const list = (items) => items.join(' and ');

export const FV_TOASTS = {
  created: () =>
    toastSuccess('Visit Proposal Saved', 'The official foreign visit has been recorded.'),

  createFailed: (err) =>
    toastError(
      'Save Failed',
      withReason('The visit could not be saved. Please review the form and try again.', getErrorMessage(err))
    ),

  /** The visit row was written but one or both attachments did not reach the server. */
  savedWithUploadFailure: (failed) =>
    toastWarning(
      'Saved Without Attachments',
      `The visit was saved, but the ${list(failed)} could not be uploaded. Open the visit from the Data List and attach it again.`
    ),

  proposalUpdated: () =>
    toastSuccess('Proposal Updated', 'The proposal details have been saved.'),

  sanctionUpdated: (approved) =>
    toastSuccess(
      approved ? 'Visit Sanctioned' : 'Visit Rejected',
      approved
        ? 'The sanction has been recorded and the visit moved to the sanctioned stage.'
        : 'The visit has been marked as rejected.'
    ),

  visitOutcomeUpdated: (completed) =>
    toastSuccess(
      completed ? 'Visit Marked Completed' : 'Visit Marked Not Visited',
      completed
        ? 'The visit has been recorded as completed.'
        : 'The visit has been recorded as sanctioned but not visited.'
    ),

  updateFailed: (what, err) =>
    toastError('Update Failed', withReason(`The ${what} could not be saved. Please try again.`, getErrorMessage(err))),

  documentUploaded: (label) =>
    toastSuccess('Document Uploaded', `The ${label} has been attached to this visit.`),

  documentUploadFailed: (label, err) =>
    toastError('Upload Failed', withReason(`The ${label} could not be uploaded.`, getErrorMessage(err))),

  // downloadVisitDocument throws an Error whose message already explains the failure, so it is
  // used as-is rather than appended to a generic sentence.
  downloadFailed: (err) =>
    toastError('Download Failed', err?.message || 'The document could not be downloaded.'),

  loadFailed: (what, err) =>
    toastError('Could Not Load', withReason(`The ${what} could not be loaded.`, getErrorMessage(err))),

  validationFailed: () =>
    toastWarning('Check the Form', 'Some required fields are missing or invalid. Correct the highlighted fields and try again.'),

  noCreatePermission: () =>
    toastWarning('Not Permitted', 'Your account does not have permission to add a foreign visit.'),

  noEditPermission: () =>
    toastWarning('Not Permitted', 'Your account does not have permission to change a foreign visit.'),

  /** The report endpoint answers 404 rather than an empty array when nothing matches. */
  reportEmpty: () =>
    toastInfo('No Matching Records', 'No foreign visits match the selected filters. Widen the filters and run the report again.'),

  reportFailed: (err) =>
    toastError('Report Failed', withReason('The report could not be generated.', getErrorMessage(err))),
};
