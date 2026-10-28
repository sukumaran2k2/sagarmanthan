import { useMemo } from 'react';

/**
 * ==============================================================================
 * STANDARDIZED TOAST NOTIFICATIONS
 * ==============================================================================
 * One place that decides how toasts look, how long they stay, and how messages
 * are worded. Modules describe WHAT happened with a toast definition
 * ({ type, title, message }) and call notify(def); colours come from
 * styles/module-toast.css via the 'standard' variant in components/Toast.jsx.
 *
 * Message conventions:
 *  - title   : 2–4 words naming the outcome ("Record Saved", "Upload Failed")
 *  - message : what happened, then what the user should do next (if anything)
 *  - include the record name when known; append the server reason on failures
 *  - no exclamation marks, no technical jargon, sentence case, ends with "."
 *
 * Usage:
 *   const notify = useNotifier(triggerNotification);
 *   notify(YP_TOASTS.relieveSuccess(name));
 *   notify(COMMON_TOASTS.fileTooLarge(10));
 * ==============================================================================
 */

export const TOAST_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

// Errors and warnings stay longer because the user has to read and act on them
export const TOAST_DURATIONS = Object.freeze({
  success: 4000,
  info: 4000,
  warning: 5500,
  error: 7000,
});

export const toastSuccess = (title, message) => ({ type: TOAST_TYPES.SUCCESS, title, message });
export const toastError = (title, message) => ({ type: TOAST_TYPES.ERROR, title, message });
export const toastWarning = (title, message) => ({ type: TOAST_TYPES.WARNING, title, message });
export const toastInfo = (title, message) => ({ type: TOAST_TYPES.INFO, title, message });

/**
 * Best human-readable reason from an API error (axios), or '' when none.
 * Plain-text bodies are used only when short; a proxy/gateway error page (HTML)
 * is never shown to the user.
 */
export function getErrorMessage(err) {
  const data = err?.response?.data;
  if (typeof data === 'string') {
    const text = data.trim();
    return text && text.length <= 200 && !text.startsWith('<') ? text : '';
  }
  return data?.message || data?.error || '';
}

/** "a Wing" / "an Implementing Agency" */
const withArticle = (label) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`;

/** Ensures free text (server reasons, validation details) ends like a sentence. */
function asSentence(text) {
  const trimmed = String(text).trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Appends "Reason: …" to a sentence when the server supplied one. */
export function withReason(sentence, reason) {
  return reason ? `${sentence} Reason: ${asSentence(reason)}` : sentence;
}

/** Wraps App's triggerNotification so every call uses the standard look and timing. */
export function createNotifier(triggerNotification) {
  return (toast) => {
    if (typeof triggerNotification !== 'function' || !toast) return;
    const type = TOAST_DURATIONS[toast.type] ? toast.type : TOAST_TYPES.INFO;
    triggerNotification(toast.message, type, toast.title, {
      variant: 'standard',
      duration: TOAST_DURATIONS[type],
    });
  };
}

export function useNotifier(triggerNotification) {
  return useMemo(() => createNotifier(triggerNotification), [triggerNotification]);
}

/** Messages shared by every module (tables, exports, uploads, forms). */
export const COMMON_TOASTS = {
  // Data tables & exports
  filtersReset: () =>
    toastInfo('Filters Cleared', 'All filters have been removed. The list now shows every record.'),
  copySuccess: (rowCount, scope = 'from the current page') =>
    toastSuccess('Copied to Clipboard', `${rowCount} ${rowCount === 1 ? 'row' : 'rows'} ${scope} copied. You can paste them into Excel or a document.`),
  nothingToCopy: () =>
    toastInfo('Nothing to Copy', 'There are no rows to copy. Adjust the filters and try again.'),
  nothingToExport: () =>
    toastInfo('Nothing to Export', 'There are no rows to export. Adjust the filters and try again.'),
  copyFailed: () =>
    toastError('Copy Failed', 'The browser blocked clipboard access. Allow clipboard permission for this site and try again.'),
  tableNotReady: (action) =>
    toastWarning('Table Still Loading', `Please wait for the table to finish loading, then ${action} again.`),
  excelExported: (fileName, scope = 'The current page') =>
    toastSuccess('Export Complete', `${scope} was downloaded as ${fileName}.`),
  pdfPreparing: () =>
    toastInfo('Preparing PDF', 'The print dialog will open shortly. Choose "Save as PDF" as the destination to download it.'),
  popupBlocked: () =>
    toastWarning('Pop-up Blocked', 'Allow pop-ups for this site so the PDF print window can open, then try again.'),

  // Loading
  loadFailed: (what) =>
    toastError('Could Not Load Data', `${what} could not be loaded. Check your connection and refresh the page.`),

  // Forms & validation
  requiredSelect: (fieldLabel) =>
    toastWarning('Required Field Missing', `Please select ${withArticle(fieldLabel)} before submitting.`),
  requiredInput: (fieldLabel) =>
    toastWarning('Required Field Missing', `Please enter the ${fieldLabel} before submitting.`),
  fixValidationErrors: (details) =>
    toastWarning('Check the Form', details
      ? `Please correct the following and submit again: ${asSentence(details)}`
      : 'Some fields need attention. Correct the fields highlighted in red and submit again.'),
  mandatoryFieldsMissing: () =>
    toastWarning('Required Fields Missing', 'Fill in all mandatory fields highlighted in red, then save again.'),

  // Files
  invalidFileType: (allowed = 'PDF') =>
    toastError('Unsupported File Type', `Only ${allowed} files can be uploaded. Please choose a ${allowed} file.`),
  fileTooLarge: (maxMb) =>
    toastWarning('File Too Large', `The selected file is larger than ${maxMb} MB. Please choose a smaller file.`),
  noDocument: () =>
    toastWarning('No Document Attached', 'This record does not have a document attached yet.'),
  downloadStarted: (fileName) =>
    toastInfo('Download Started', `${fileName || 'The document'} is downloading.`),
};
