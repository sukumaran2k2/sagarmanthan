import { toastSuccess, toastError, toastInfo, withReason } from '../../utils/notify';

/**
 * Consultant Appointment toast messages.
 * Module-specific wording only; shared ones (copy, export, file checks, filters)
 * come from COMMON_TOASTS in utils/notify.js.
 */
const appointmentLabel = (wing, division) =>
  wing && division ? `the ${wing} / ${division} appointment` : 'the consultant appointment';

const candidateLabel = (name) => (name ? `"${name}"` : 'the candidate');

export const CA_TOASTS = {
  // Appointment record
  created: (wing, division) =>
    toastSuccess('Appointment Added', `${capitalize(appointmentLabel(wing, division))} has been registered successfully.`),
  updated: (wing, division) =>
    toastSuccess('Changes Saved', `${capitalize(appointmentLabel(wing, division))} has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Registration Failed',
      withReason(`The consultant appointment could not be ${isEdit ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  deleted: (wing, division) =>
    toastSuccess('Appointment Deleted', `${capitalize(appointmentLabel(wing, division))} and its candidates have been removed.`),
  deleteFailed: (wing, division, reason) =>
    toastError('Delete Failed', withReason(`${capitalize(appointmentLabel(wing, division))} could not be deleted. Please try again.`, reason)),

  // Candidates
  candidatesLoadFailed: () =>
    toastError('Could Not Load Candidates', 'Candidate details for this appointment could not be loaded. Go back and open the appointment again.'),
  candidateAdded: (name) =>
    toastSuccess('Candidate Added', `${capitalize(candidateLabel(name))} has been added to this appointment.`),
  candidateUpdated: (name) =>
    toastSuccess('Candidate Updated', `Details of ${candidateLabel(name)} have been saved.`),
  candidateSaveFailed: (reason) =>
    toastError('Candidate Not Saved', withReason('The candidate details could not be saved. Please check the fields and try again.', reason)),
  candidateDeleted: (name) =>
    toastSuccess('Candidate Removed', `${capitalize(candidateLabel(name))} and their appointment order have been deleted.`),
  candidateDeleteFailed: (name, reason) =>
    toastError('Delete Failed', withReason(`${capitalize(candidateLabel(name))} could not be deleted. Please try again.`, reason)),
  candidatesCopied: (count) =>
    toastSuccess('Copied to Clipboard', `${count} candidate ${count === 1 ? 'row' : 'rows'} copied. You can paste them into Excel or a document.`),

  // Appointment order documents
  orderUploaded: () =>
    toastSuccess('Document Uploaded', 'The appointment order (PDF) has been uploaded.'),
  orderUploadFailed: (reason) =>
    toastError('Upload Failed', withReason('The appointment order could not be uploaded. Please try again.', reason)),
  orderDownloading: (fileName) =>
    toastInfo('Download Started', `${fileName || 'The appointment order'} is downloading.`),
};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
