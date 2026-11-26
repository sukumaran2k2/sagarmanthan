import {
  isOrganisationUser,
  getSessionOrganisationId,
  getSessionOrganisationCategoryId,
  isOtherOrganisationUser,
} from "../../../utils/authSession";

/**
 *  - isAdmin  : super admin / ministry / view-only admin (anyone who is NOT an organisation user) -> sees everything
 *  - group    : "major" (category 1) or "other" (category 3 / anything else) for organisation users
 */
export function getReportAccess() {
  if (!isOrganisationUser()) {
    return { isAdmin: true, organisationID: null, group: null };
  }

  const category = getSessionOrganisationCategoryId(); // 1 = Major Ports, 3 = Other Org, undefined = old token
  let group;
  if (category === 1) group = "major";
  else if (category === undefined) group = isOtherOrganisationUser() ? "other" : "major"; // old-token fallback
  else group = "other";

  return { isAdmin: false, organisationID: getSessionOrganisationId(), group };
}

export const canView = (report, access) =>
  !!report &&
  (report.hidden ||
    access.isAdmin ||
    !report.audience ||
    report.audience === "all" ||
    report.audience === access.group);