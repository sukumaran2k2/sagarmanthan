import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// CSR Projects wording only; shared cases (required fields, copy, export, load
// failures, filters) come from COMMON_TOASTS.
export const CSR_TOASTS = {
  projectCreated: (name) =>
    toastSuccess('Project Added', name ? `"${name}" has been registered.` : 'The CSR project has been registered.'),
  projectUpdated: (name) =>
    toastSuccess('Changes Saved', name ? `"${name}" has been updated.` : 'The CSR project has been updated.'),
  projectSaveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The CSR project could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),
  documentUploadFailed: (reason) =>
    toastError('Upload Failed',
      withReason('The completion document could not be uploaded, so the project was not saved. Try again or remove the document.', reason)),
  galleryUploadFailed: (reason) =>
    toastWarning('Photos Not Uploaded',
      withReason('The project was saved, but the gallery files could not be uploaded. Open the project and add them again.', reason)),
  stageIncomplete: (stage) =>
    toastWarning('Required Fields Missing', `Fill in the mandatory fields in Stage ${stage}, highlighted in red, before moving on.`),
  completedBeforeCommenced: () =>
    toastWarning('Check the Dates', 'The completed date cannot be earlier than the commenced date.'),

  fundCreated: (fy) =>
    toastSuccess('Fund Added', fy ? `The CSR fund for ${fy} has been registered.` : 'The CSR fund has been registered.'),
  fundUpdated: (fy) =>
    toastSuccess('Changes Saved', fy ? `The CSR fund for ${fy} has been updated.` : 'The CSR fund has been updated.'),
  fundSaveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Save Failed',
      withReason(`The CSR fund could not be ${isEdit ? 'updated' : 'saved'}. Please review the details and try again.`, reason)),

  downloadFailed: (reason) =>
    toastError('Download Failed', withReason('The document could not be downloaded. Please try again.', reason)),
  detailsLoadFailed: () =>
    toastError('Could Not Load Details', 'The project details could not be loaded. Close the window and try again.'),
};
