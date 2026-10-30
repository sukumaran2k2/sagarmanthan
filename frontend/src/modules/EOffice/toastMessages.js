import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// E-Office wording only; shared cases (required fields, copy, export, load
// failures, filters, downloads) come from COMMON_TOASTS.
export const EOFFICE_TOASTS = {
  fileEmpty: () =>
    toastWarning('Empty File', 'The selected file has no data rows. Choose the filled-in E-Office sheet.'),
  fileUnreadable: () =>
    toastError('Could Not Read File', 'The file could not be read as a spreadsheet. Save it as .xlsx and try again.'),
  templateMismatch: (missing, sampleFile) =>
    toastError('Columns Missing', `The sheet is missing: ${missing.join(', ')}. Use the ${sampleFile} layout.`),
  rowIssues: (count) =>
    toastError('Check the Sheet', `${count} problem${count === 1 ? '' : 's'} found in the sheet. They are listed below the upload box.`),
  previewReady: (rows) =>
    toastSuccess('Sheet Checked', `${rows} row${rows === 1 ? '' : 's'} are ready to upload. Review the preview, then upload.`),
  fixFileFirst: () =>
    toastWarning('Fix the Sheet First', 'The selected sheet has problems listed below the upload box. Correct them and choose it again.'),
  chooseFile: () =>
    toastWarning('No File Chosen', 'Choose the E-Office sheet (.xlsx) to upload.'),
  uploaded: (label, period) =>
    toastSuccess(`${label} Uploaded`, `${label} for ${period} has been saved.`),
  replaced: (label, period) =>
    toastSuccess(`${label} Replaced`, `${label} for ${period} has been replaced with the new sheet.`),
  uploadFailed: (reason) =>
    toastError('Upload Failed', withReason('The sheet could not be saved. Please try again.', reason)),
  sampleFailed: () =>
    toastError('Download Failed', 'The sample sheet could not be downloaded. Please try again.'),
  employeesMissing: (count) =>
    toastWarning('Employees Not Found', `${count} Emp Id${count === 1 ? ' in the sheet is' : 's in the sheet are'} not in the employee list. Enter the details to create ${count === 1 ? 'it' : 'them'}.`),
  employeesCreated: (count) =>
    toastSuccess('Employees Created', `${count} employee${count === 1 ? ' has' : 's have'} been added. Uploading the sheet again.`),
  fileDownloadFailed: () =>
    toastError('Download Failed', 'The uploaded sheet could not be downloaded. Please try again.'),
  fileDeleted: (fileName) =>
    toastSuccess('File Deleted', `${fileName} and the rows uploaded from it have been deleted.`),
  deleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The file could not be deleted. Please try again.', reason)),
};
