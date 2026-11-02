// Reducing a post's sanctioned strength: the server refuses a decrease until the user picks which
// vacant post codes go (409 SELECT_POST_CODES), then archives them with the reason.

export const MAX_DELETION_REASON = 200;

/** The 409 body of a decrease that needs post codes chosen, or null for any other error. */
export function readStrengthConflict(err) {
  const data = err?.response?.data;
  if (err?.response?.status !== 409 || data?.code !== 'SELECT_POST_CODES') return null;
  return {
    message: data.message || '',
    currentStrength: Number(data.currentStrength) || 0,
    requestedStrength: Number(data.requestedStrength) || 0,
    postsToDelete: Number(data.postsToDelete) || 0,
    vacantPosts: Array.isArray(data.vacantPosts) ? data.vacantPosts : [],
  };
}

/** Errors for the reduce-strength popup; empty when it can be saved. */
export function validateReduction({ selected = [], required = 0, reason = '' }) {
  const errors = {};
  if (selected.length !== required) {
    errors.selection = `Select exactly ${required} post code${required === 1 ? '' : 's'} (${selected.length} selected).`;
  }
  const text = String(reason).trim();
  if (!text) errors.reason = 'Enter the remarks / reason for deletion.';
  else if (text.length > MAX_DELETION_REASON) errors.reason = `Remarks must be at most ${MAX_DELETION_REASON} characters.`;
  return errors;
}

/** Errors for the delete-post reason; empty when it can be deleted. */
export function validateDeletionReason(reason = '') {
  const text = String(reason).trim();
  if (!text) return 'Enter the reason for deleting this post.';
  if (text.length > MAX_DELETION_REASON) return `Reason must be at most ${MAX_DELETION_REASON} characters.`;
  return '';
}
