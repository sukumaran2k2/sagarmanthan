/**
 * Foreign Visit -- shared constants.
 *
 * Stage ids mirror mmt_ofv_stage and are relied on by the backend update endpoints, which
 * derive the next stage themselves (see updateSanctionedInfo / updateVisitTab). Do not renumber.
 */

export const STAGE = Object.freeze({
  PROPOSED: 1,
  SANCTIONED: 2,
  VISITED: 3,
  NOT_VISITED: 4,
  REJECTED: 5,
});

export const STAGE_NAMES = Object.freeze({
  [STAGE.PROPOSED]: 'Proposed',
  [STAGE.SANCTIONED]: 'Sanctioned',
  [STAGE.VISITED]: 'Sanctioned & Visited',
  [STAGE.NOT_VISITED]: 'Sanctioned & Not Visited',
  [STAGE.REJECTED]: 'Rejected',
});

/** The three list tabs in the 2.0 module, each covering one or more stages. */
export const LIST_TABS = Object.freeze([
  { id: 'ongoing', label: 'Proposed / Ongoing', stages: [STAGE.PROPOSED, STAGE.SANCTIONED] },
  { id: 'closed', label: 'Sanctioned & Visited / Not Visited', stages: [STAGE.VISITED, STAGE.NOT_VISITED] },
  { id: 'rejected', label: 'Rejected', stages: [STAGE.REJECTED] },
]);

/**
 * Government of India equivalent designations. The database stores the short code and the
 * backend expands it in SQL (see the CASE in getOFVData), so the codes here must match.
 */
export const GOI_DESIGNATIONS = Object.freeze([
  { code: 'Secretary', label: 'Secretary' },
  { code: 'SS', label: 'Special Secretary' },
  { code: 'AS', label: 'Additional Secretary' },
  { code: 'JS', label: 'Joint Secretary' },
  { code: 'DIR', label: 'Director' },
  { code: 'DS', label: 'Deputy Secretary' },
  { code: 'US', label: 'Under Secretary' },
  { code: 'SO', label: 'Section Officer' },
  { code: 'YP/ASO', label: 'Young Professionals / Assistant Section Officer' },
]);

export const TITLES = Object.freeze(['Shri', 'Smt', 'Ms', 'Dr', 'Prof', 'Capt']);

/** doc_related values in tbl_ofv_doc. */
export const DOC_TYPE = Object.freeze({ SANCTION: 'Sanction', TOUR: 'Tour' });

/** The upload limit is enforced by multer on the server at 2 MB; mirror it so we fail early. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = Object.freeze(['application/pdf', 'image/jpeg', 'image/png']);
export const ALLOWED_UPLOAD_LABEL = 'PDF, JPEG, PNG. Max size: 2MB';

/** Column lengths in tbl_official_foreign_visit, so the form stops before SQL truncates. */
export const SCHEMA_LIMITS = Object.freeze({
  purpose: 1000,
  officerName: 256,
  sanctionedAuthority: 256,
  sponsoringAgency: 256,
  cities: 500,
  otherDesignation: 256,
  otherVisitType: 256,
  remarks: 1000,
});

/** "Others" rows in the designation / visit type masters, which reveal a free-text field. */
export const OTHER_DESIGNATION_ID = 115;

/**
 * "Designation Equivalent in GoI" only means something for ministry officers, so the field is
 * shown only when the organisation is the Ministry of Ports, Shipping and Waterways.
 *
 * Matched on organisation_code rather than a hardcoded id or a name string, so a renamed or
 * re-seeded master row still resolves. The id is the documented fallback for a master row that
 * has lost its code.
 */
export const MINISTRY_ORGANISATION_CODE = 'MOPSW';
export const MINISTRY_ORGANISATION_ID = 15;

export function isMinistryOrganisation(organisations, organisationId) {
  const id = String(organisationId ?? '').trim();
  if (!id) return false;

  const match = (organisations || []).find((o) => String(o.organisation_id) === id);
  if (match?.organisation_code) {
    return String(match.organisation_code).trim().toUpperCase() === MINISTRY_ORGANISATION_CODE;
  }
  return id === String(MINISTRY_ORGANISATION_ID);
}

export const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years = [];
  // Visits are proposed a year ahead and historic records go back to 2015.
  for (let y = current + 1; y >= 2015; y--) years.push(y);
  return years;
})();

/** Inclusive day count between two yyyy-mm-dd strings, matching how `duration` is stored. */
export function calculateDuration(fromDate, toDate) {
  if (!fromDate || !toDate) return '';
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '';
  const days = Math.round((to - from) / 86400000) + 1;
  return days > 0 ? days : '';
}

/** from_date / to_date are nchar, so they arrive padded and sometimes as a full timestamp. */
export function toDateInputValue(raw) {
  if (!raw) return '';
  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

/** dd-mm-yyyy for display, which is how the rest of the portal shows dates. */
export function formatDisplayDate(raw) {
  const iso = toDateInputValue(raw);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
