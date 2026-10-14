import { isOrganisationUser } from '../../../utils/authSession';

// Only Ministry users author forms (Studio, edit, delete, ON/OFF, clone, drafts);
// organisation users only fill in forms assigned to them. The server enforces the
// same rule, so this only decides what to show.
export function useFormBuilderPermissions() {
  const canAuthor = !isOrganisationUser();
  return { canAuthor };
}
