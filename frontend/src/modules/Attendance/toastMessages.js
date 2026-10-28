import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

// Attendance wording only; shared cases (required fields, copy, export, load
// failures, filters, file type) come from COMMON_TOASTS.
export const ATTENDANCE_TOASTS = {
  fileEmpty: () =>
    toastWarning('Empty File', 'The selected file has no data rows. Choose the filled-in attendance sheet.'),
  fileUnreadable: () =>
    toastError('Could Not Read File', 'The file could not be read as a spreadsheet. Save it as .xlsx and try again.'),
  templateMismatch: (missing) =>
    toastError('Columns Missing', `The sheet is missing: ${missing.join(', ')}. Use the Attendance_Sample.xlsx layout.`),
  rowIssues: (count) =>
    toastError('Check the Sheet', `${count} problem${count === 1 ? '' : 's'} found in the sheet. They are listed below the upload box.`),
  previewReady: (rows) =>
    toastSuccess('Sheet Checked', `${rows} row${rows === 1 ? '' : 's'} are ready to upload. Review the preview, then upload.`),
  fixFileFirst: () =>
    toastWarning('Fix the Sheet First', 'The selected sheet has problems listed below the upload box. Correct them and choose it again.'),
  chooseFile: () =>
    toastWarning('No File Chosen', 'Choose the attendance sheet (.xlsx) to upload.'),
  uploaded: (period) =>
    toastSuccess('Attendance Uploaded', `Attendance for ${period} has been saved.`),
  replaced: (period) =>
    toastSuccess('Attendance Replaced', `Attendance for ${period} has been replaced with the new sheet.`),
  uploadFailed: (reason) =>
    toastError('Upload Failed', withReason('The attendance sheet could not be saved. Please try again.', reason)),
  sampleFailed: () =>
    toastError('Download Failed', 'The sample sheet could not be downloaded. Please try again.'),
  detailFailed: (wing) =>
    toastError('Could Not Load Details', `The employee list for ${wing} could not be loaded. Please try again.`),
};
