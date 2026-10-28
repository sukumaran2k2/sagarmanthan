import { toastSuccess, toastError, toastWarning, toastInfo, withReason } from '../../utils/notify';

/**
 * HR Management toast messages. Module-specific wording only; shared ones (copy, export,
 * filters, loading, required fields) come from COMMON_TOASTS in utils/notify.js.
 * Call sites: notify(HR_TOASTS.x(...)) with const notify = useNotifier(triggerNotification).
 */
const quoted = (name, fallback) => (name ? `"${name}"` : fallback);

export const HR_TOASTS = {
  // Session
  sessionExpired: () =>
    toastError('Session Expired', 'Your session has expired. Please sign in again.'),

  // Vacancy Management
  expectedMethodRequired: () =>
    toastWarning('Select the Method', 'Choose the Expected Method of Filling for this post, then update the activity.'),
  noAnticipatedChanges: () =>
    toastWarning('Nothing to Save', 'Change the Expected Method of Filling for at least one post, then submit.'),
  anticipatedSaved: (count) =>
    toastSuccess('Changes Saved', `The expected method of filling has been saved for ${count} ${count === 1 ? 'post' : 'posts'}.`),
  anticipatedSaveFailed: (reason) =>
    toastError('Save Failed', withReason('The anticipated vacancies could not be saved. Please try again.', reason)),
  hrDataExported: (fileName) =>
    toastSuccess('Export Complete', `All HR post data was downloaded as ${fileName}.`),
  hrDataExportFailed: (reason) =>
    toastError('Export Failed', withReason('The HR post data could not be exported. Please try again.', reason)),
  noDataToExport: () =>
    toastWarning('Nothing to Export', 'There are no records to export for the current selection.'),

  // Vacant details (post-wise vacancies)
  noUnsavedChanges: () =>
    toastInfo('No Changes', 'There are no unsaved changes to update.'),
  vacancyFieldsMissing: (fields) =>
    toastWarning('Required Fields Missing', `Please fill in ${fields.join(', ')}, then save again.`),
  vacanciesUpdated: (postName) =>
    toastSuccess('Vacancies Updated', `The vacancy details of ${quoted(postName, 'the post')} have been updated.`),
  vacanciesUpdateFailed: (reason) =>
    toastError('Update Failed', withReason('The vacancy details could not be updated. Please try again.', reason)),

  // Vacancy activity (Direct Recruitment / Promotion / Deputation ...)
  selectEmployeeFirst: () =>
    toastWarning('Select an Employee', 'Choose an employee from the list first.'),
  employeeDetailsNotFound: () =>
    toastWarning('No Details Found', 'No details were found for the selected employee. Check the selection and try again.'),
  activitySavedAddEmployeeLater: () =>
    toastInfo('Activity Saved', 'The Add Employee page is not available yet, so add the employee details later.'),
  postActivityUpdated: (postCode) =>
    toastSuccess('Activity Updated', `The activity for post ${postCode} has been updated.`),
  postActivityFailed: (reason) =>
    toastError('Update Failed', withReason('The post activity could not be updated. Please try again.', reason)),

  // HR Administration & Actions
  postsLoadFailed: () =>
    toastError('Could Not Load Posts', 'The posts of the selected department could not be loaded. Choose the department again.'),
  vacantPostsNotReady: () =>
    toastInfo('No Vacant Posts Yet', 'Vacant posts appear here only after all activities are entered in Vacancy Management.'),
  originalPostFilled: () =>
    toastWarning('Original Post Filled', 'The original post of this employee is already filled. Choose another vacant post.'),
  employeeActivityUpdated: (name) =>
    toastSuccess('Activity Updated', `The activity for ${quoted(name, 'the employee')} has been recorded.`),
  employeeActivityNotRecorded: () =>
    toastInfo('No Activity Recorded', 'No activity was recorded for the employee.'),
  employeeActivityFailed: (reason) =>
    toastError('Update Failed', withReason('The activity could not be updated for the employee. Please try again.', reason)),
  noActivityInPeriod: () =>
    toastWarning('No Activity Found', 'No activity was recorded in the selected period. Choose another date range.'),
  activityExported: (count) =>
    toastSuccess('Export Complete', `${count} activity ${count === 1 ? 'record was' : 'records were'} exported.`),
  activityExportFailed: (reason) =>
    toastError('Export Failed', withReason('The activity data could not be exported. Please try again.', reason)),

  // Organisation structure / posts
  postNameRequired: () =>
    toastWarning('Required Field Missing', 'Please enter the post name before saving.'),
  departmentRequired: () =>
    toastWarning('Required Field Missing', 'Please select a department before saving.'),
  postAdded: (name) =>
    toastSuccess('Post Added', `${quoted(name, 'The post')} has been added to the organisation structure.`),
  postAddFailed: (reason) =>
    toastError('Post Not Added', withReason('The post could not be added. Please check the details and try again.', reason)),
  postUpdated: (name) =>
    toastSuccess('Post Updated', `${quoted(name, 'The post')} has been updated.`),
  postUpdateFailed: (reason) =>
    toastError('Update Failed', withReason('The post could not be updated. Please try again.', reason)),
  postStrengthReduced: (name, count) =>
    toastSuccess('Strength Reduced', `${count} post code${count === 1 ? '' : 's'} of ${quoted(name, 'the post')} deleted and kept in the deleted-posts history.`),
  postDeleted: () =>
    toastSuccess('Post Deleted', 'The post has been removed from the organisation structure.'),
  postDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The post could not be deleted. Please try again.', reason)),

  // Employee database
  employeesExported: (count) =>
    toastSuccess('Export Complete', `${count} employee ${count === 1 ? 'record was' : 'records were'} exported.`),
  employeeAdded: (name, id) =>
    toastSuccess('Employee Added', `${quoted(name, 'The employee')}${id ? ` (${id})` : ''} has been added to the employee database.`),
  // Add Employee from a vacant post (the form checks the vacancy before submitting)
  referenceNumberExists: () =>
    toastError('Personnel Number Exists', 'An employee with this reference / personnel number already exists in your organisation.'),
  aadhaarExists: () =>
    toastError('Aadhaar Exists', 'An employee with this Aadhaar number already exists.'),
  addEmployeePostLoading: () =>
    toastInfo('Loading the Vacancy', 'The vacant post is still loading. Please wait a moment, then submit.'),
  addEmployeePostNotFound: (postCode) =>
    toastError('Post Not Found', `Post code ${postCode} was not found, so an employee can't be added against it. Go back to the vacancy and try again.`),
  addEmployeePostFilled: (postCode) =>
    toastWarning('Post Already Filled', `Post ${postCode} is already filled, so another employee can't be added against it.`),
  addEmployeePostUnverified: (postCode) =>
    toastError('Vacancy Not Confirmed', `Could not confirm that post ${postCode} is vacant, so the employee can't be added yet. Please try again later or contact the administrator.`),
  addEmployeePostOtherOrganisation: (postCode) =>
    toastError('Not Your Organisation', `Post ${postCode} belongs to another organisation, so you can't add an employee against it.`),
  employeeUpdated: (name) =>
    toastSuccess('Employee Updated', `${quoted(name, 'The employee')}'s details have been updated.`),
  employeeUpdateFailed: (reason) =>
    toastError('Employee Not Updated', withReason('The employee details could not be saved. Please check them and try again.', reason)),
  employeeNotEditable: () =>
    toastError('Cannot Open Employee', 'This record has no employee ID, so its details cannot be opened.'),
  employeeAddFailed: (reason) =>
    toastError('Employee Not Added', withReason('The employee record could not be saved. Please check the details and try again.', reason)),

  // Contractual employment
  contractualSaved: (isUpdate) =>
    toastSuccess(isUpdate ? 'Changes Saved' : 'Record Added',
      `The contractual employment data has been ${isUpdate ? 'updated' : 'submitted'}.`),
  contractualSaveFailed: (reason) =>
    toastError('Save Failed', withReason('The contractual employment data could not be saved. Please check the values and try again.', reason)),
  contractualDeleted: () =>
    toastSuccess('Record Deleted', 'The contractual employment record has been deleted.'),
  contractualDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The contractual employment record could not be deleted. Please try again.', reason)),
  // Non-port monthly upload
  monthlyUploadDeleted: (fileName) =>
    toastSuccess('Upload Deleted', `${quoted(fileName, 'The file')} and the vacancy details it loaded have been deleted.`),
  monthlyUploadDeleteFailed: (reason) =>
    toastError('Delete Failed', withReason('The uploaded file could not be deleted. Please try again.', reason)),
  recordIdMissing: () =>
    toastError('Cannot Delete', 'This record has no ID, so it cannot be deleted. Refresh the list and try again.'),

  // Training
  trainingDateOrder: () =>
    toastWarning('Check the Dates', 'The To Date cannot be earlier than the From Date. Correct the dates and save again.'),
  participantRequired: () =>
    toastWarning('Add a Participant', 'Add at least one participant before saving the training.'),
  participantFieldsMissing: () =>
    toastWarning('Required Fields Missing', 'Fill in all participant fields, then save again.'),
  duplicateParticipant: () =>
    toastWarning('Duplicate Participant', 'The same participant cannot be added more than once. Remove the duplicate and save again.'),
  trainingSaved: (isUpdate) =>
    toastSuccess(isUpdate ? 'Changes Saved' : 'Training Added',
      `The training details have been ${isUpdate ? 'updated' : 'saved'}.`),
  trainingSaveFailed: (isUpdate, reason) =>
    toastError(isUpdate ? 'Update Failed' : 'Save Failed',
      withReason(`The training could not be ${isUpdate ? 'updated' : 'saved'}. Please check the details and try again.`, reason)),

  // Abolished posts / revival
  revivalRemarksRequired: () =>
    toastWarning('Select the Remarks', 'Select the remarks for the revival request before submitting.'),
  revivalDateRequired: () =>
    toastWarning('Required Field Missing', 'Please enter the date of arise in vacancy before submitting.'),
  revivalDocumentRequired: () =>
    toastWarning('Document Required', 'Upload the approval document before submitting the revival request.'),
  revivalRequestRecorded: () =>
    toastInfo('Request Not Sent Yet', 'Submitting revival requests from this list is not available yet. Use the post details page to send the request.'),
  revivalFieldRequired: (fieldLabel) =>
    toastWarning('Required Field Missing', `Please enter the ${fieldLabel}, then save again.`),
  revivalDetailsUpdated: () =>
    toastSuccess('Changes Saved', 'The revival request details have been updated.'),
  revivalDetailsFailed: (reason) =>
    toastError('Update Failed', withReason('The revival request details could not be updated. Please try again.', reason)),
  revivalSubmitted: () =>
    toastSuccess('Request Submitted', 'The revival request has been submitted to MoPSW.'),
  revivalSubmitFailed: (reason) =>
    toastError('Submission Failed', withReason('The revival request could not be submitted. Please try again.', reason)),
  revivalApproved: () =>
    toastSuccess('Revival Approved', 'The post revival has been approved.'),
  revivalRejected: () =>
    toastSuccess('Revival Rejected', 'The post revival has been rejected.'),
  approvalDetailsUpdated: () =>
    toastSuccess('Changes Saved', 'The approval details have been updated.'),
  approvalDetailsFailed: (reason) =>
    toastError('Update Failed', withReason('The approval details could not be updated. Please try again.', reason)),

  // Reports
  reportCopied: () =>
    toastSuccess('Copied to Clipboard', 'The report was copied. You can paste it into Excel or a document.'),
  reportExported: (format) =>
    toastSuccess('Export Complete', `The report was downloaded as ${format}.`),
};
