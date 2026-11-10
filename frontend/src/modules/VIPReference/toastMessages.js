import { toastSuccess, toastError, toastWarning, withReason } from '../../utils/notify';

const label = (subject) => (subject ? `"${subject}"` : 'the VIP Reference');

export const VIP_TOASTS = {
  created: (subject) =>
    toastSuccess('VIP Reference Registered', `${label(subject)} has been registered successfully.`),
  updated: (subject) =>
    toastSuccess('Changes Saved', `${label(subject)} has been updated.`),
  saveFailed: (isEdit, reason) =>
    toastError(isEdit ? 'Update Failed' : 'Registration Failed',
      withReason(`The VIP Reference could not be ${isEdit ? 'updated' : 'saved'}. Please review the form and try again.`, reason)),
  deleted: (subject) =>
    toastSuccess('Reference Deleted', `${label(subject)} has been removed.`),
  deleteFailed: (subject, reason) =>
    toastError('Delete Failed', withReason(`${label(subject)} could not be deleted. Please try again.`, reason)),
  validationErrors: (count) =>
    toastWarning('Check the Form', `Please correct the ${count} validation error${count > 1 ? 's' : ''} before saving.`),
};
