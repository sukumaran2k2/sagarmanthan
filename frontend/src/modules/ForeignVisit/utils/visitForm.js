import {
  STAGE,
  SCHEMA_LIMITS,
  OTHER_DESIGNATION_ID,
  calculateDuration,
  toDateInputValue,
} from './constants';

/** Blank proposal form. Every value is a string so the inputs stay controlled. */
export const emptyVisitValues = Object.freeze({
  visitFrom: '',
  visitTo: '',
  stage: '',
  visitType: '',
  newVisitType: '',
  title: '',
  officerName: '',
  organisation: '',
  newOrganisation: '',
  designationGOI: '',
  designation: '',
  newDesignation: '',
  purpose: '',
  countries: [], // array of country names
  cities: '',
  ministerialDelegation: '',
  sanctioningAuthority: '',
  competentAuthority: '',
  fvms: '',
  notVisitedReason: '',
});

/**
 * Which sections the form shows for a given stage.
 *
 * A proposal has not been sanctioned yet, so asking for a sanctioning authority or a tour
 * report would be asking for something that cannot exist. Each later stage adds only the
 * fields that stage can actually answer.
 *
 *   Proposed                  base fields only
 *   Sanctioned                + sanctioning authority and sanction order
 *   Sanctioned & Visited      + competent authority, FVMS
 *   Sanctioned & Not Visited  + reason for not visiting
 *   Rejected                  base fields only
 *
 * The tour report is deliberately not here: it is attached from the Visit Outcome tab of the
 * Update screen, not while the visit is first recorded.
 */
export function stageSections(stage) {
  const id = Number(stage);
  const sanctioned = id === STAGE.SANCTIONED || id === STAGE.VISITED || id === STAGE.NOT_VISITED;
  return {
    sanctioning: sanctioned,
    competentAndFvms: id === STAGE.VISITED,
    notVisitedReason: id === STAGE.NOT_VISITED,
  };
}

/** True when the chosen designation is the master's catch-all "Others" row. */
export function isOtherDesignation(designationId) {
  return String(designationId) === String(OTHER_DESIGNATION_ID);
}

/** True when the chosen visit type is a name we treat as free text. */
export function isOtherVisitType(visitTypes, visitTypeId) {
  const match = visitTypes.find((t) => String(t.Id) === String(visitTypeId));
  return String(match?.visit_type_name || '').trim().toLowerCase() === 'others';
}

export const isOtherOrganisation = (organisation) => String(organisation) === 'Others';

/** Derived fields the form shows read-only. */
export function deriveVisitFields(values) {
  const duration = calculateDuration(values.visitFrom, values.visitTo);
  const year = values.visitFrom ? Number(values.visitFrom.slice(0, 4)) : '';
  return { duration, year };
}

/**
 * Field-level validation. Returns { field: message }.
 * Mirrors the required markers in the 2.0 form, plus the ordering and length rules the
 * database would otherwise enforce with an unhelpful 500.
 */
export function validateVisitValues(values, { visitTypes = [], sections } = {}) {
  const errs = {};
  const text = (v) => String(v ?? '').trim();
  // Fields the stage does not show are not required -- and must not be, or the form could never
  // be submitted for a stage that hides them.
  const show = sections || stageSections(values.stage);

  if (!values.visitFrom) errs.visitFrom = 'From date is required.';
  if (!values.visitTo) errs.visitTo = 'To date is required.';
  if (values.visitFrom && values.visitTo && values.visitTo < values.visitFrom) {
    errs.visitTo = 'To date cannot be earlier than the From date.';
  }

  if (!text(values.stage)) errs.stage = 'Stage of visit is required.';
  if (!text(values.visitType)) errs.visitType = 'Type of visit is required.';
  if (isOtherVisitType(visitTypes, values.visitType) && !text(values.newVisitType)) {
    errs.newVisitType = 'Enter the visit type.';
  }
  if (text(values.newVisitType).length > SCHEMA_LIMITS.otherVisitType) {
    errs.newVisitType = `Keep the visit type under ${SCHEMA_LIMITS.otherVisitType} characters.`;
  }

  if (!text(values.title)) errs.title = 'Title is required.';
  if (!text(values.officerName)) errs.officerName = 'Officer name is required.';
  if (text(values.officerName).length > SCHEMA_LIMITS.officerName) {
    errs.officerName = `Keep the officer name under ${SCHEMA_LIMITS.officerName} characters.`;
  }

  if (!text(values.organisation)) errs.organisation = 'Organisation is required.';
  if (isOtherOrganisation(values.organisation) && !text(values.newOrganisation)) {
    errs.newOrganisation = 'Enter the organisation name.';
  }

  if (!text(values.designation)) errs.designation = 'Designation in the respective organisation is required.';
  if (isOtherDesignation(values.designation) && !text(values.newDesignation)) {
    errs.newDesignation = 'Enter the designation.';
  }
  if (text(values.newDesignation).length > SCHEMA_LIMITS.otherDesignation) {
    errs.newDesignation = `Keep the designation under ${SCHEMA_LIMITS.otherDesignation} characters.`;
  }

  if (!text(values.purpose)) errs.purpose = 'Purpose of visit is required.';
  if (text(values.purpose).length > SCHEMA_LIMITS.purpose) {
    errs.purpose = `Keep the purpose under ${SCHEMA_LIMITS.purpose} characters.`;
  }

  if (!values.countries || values.countries.length === 0) {
    errs.countries = 'Select at least one country.';
  }

  if (!text(values.cities)) errs.cities = 'Cities planned to visit are required.';
  if (text(values.cities).length > SCHEMA_LIMITS.cities) {
    errs.cities = `Keep the city list under ${SCHEMA_LIMITS.cities} characters.`;
  }

  if (text(values.ministerialDelegation) === '') {
    errs.ministerialDelegation = 'Select whether this is part of a ministerial delegation.';
  }
  if (show.sanctioning) {
    if (!text(values.sanctioningAuthority)) errs.sanctioningAuthority = 'Sanctioning authority is required.';
    if (text(values.sanctioningAuthority).length > SCHEMA_LIMITS.sanctionedAuthority) {
      errs.sanctioningAuthority = `Keep the sanctioning authority under ${SCHEMA_LIMITS.sanctionedAuthority} characters.`;
    }
  }

  if (show.competentAndFvms) {
    if (text(values.competentAuthority) === '') {
      errs.competentAuthority = 'Select whether this was submitted to the competent authority.';
    }
    if (text(values.fvms) === '') errs.fvms = 'Select whether the report was uploaded to FVMS.';
  }

  if (show.notVisitedReason) {
    if (!text(values.notVisitedReason)) errs.notVisitedReason = 'Reason for not visiting is required.';
    if (text(values.notVisitedReason).length > SCHEMA_LIMITS.remarks) {
      errs.notVisitedReason = `Keep the reason under ${SCHEMA_LIMITS.remarks} characters.`;
    }
  }

  return errs;
}

/** total_city is a count, derived from the comma separated city list the user types. */
function countCities(cities) {
  return String(cities || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean).length;
}

/**
 * check_sanctioned for a create.
 * The server overrides this for stages 1 and 3, so we only really decide stages 2, 4 and 5.
 */
function sanctionedFlagForStage(stage) {
  const id = Number(stage);
  if (id === STAGE.REJECTED) return 'no';
  if (id === STAGE.PROPOSED) return '';
  return 'yes';
}

const nullIfBlank = (v) => {
  const text = String(v ?? '').trim();
  return text === '' ? null : text;
};

/** Payload for POST /add-OFV-data. Keys are the controller's destructured names. */
export function buildCreatePayload(values, userId) {
  const { duration, year } = deriveVisitFields(values);
  const organisationIsOther = isOtherOrganisation(values.organisation);
  const show = stageSections(values.stage);
  // A hidden Yes/No must go in as NULL, not 0 -- 0 would record a definite "No" the user was
  // never asked for. The columns are all nullable bits.
  const flag = (visible, v) => (visible ? Number(v) : null);

  return {
    reportYear: year,
    visit: String(values.stage),
    visitType: values.visitType,
    newVisitType: nullIfBlank(values.newVisitType),
    visitPurpose: values.purpose.trim(),
    title: values.title,
    officerName: values.officerName.trim(),
    organisationSelect: organisationIsOther ? 'Others' : values.organisation,
    newOrganisation: organisationIsOther ? values.newOrganisation.trim() : null,
    designation: values.designation,
    newDesignation: nullIfBlank(values.newDesignation),
    designationGOI: nullIfBlank(values.designationGOI),
    visitFrom: values.visitFrom,
    visitTo: values.visitTo,
    visitDuration: duration,
    country: values.countries,
    // `city` is what the INSERT writes into cities_name; `noCities` becomes total_city.
    city: values.cities.trim(),
    noCities: countCities(values.cities),
    otherCityName: null,
    cityNames: values.cities.trim(),
    ministryDelegation: Number(values.ministerialDelegation),
    FVMS: flag(show.competentAndFvms, values.fvms),
    authority: flag(show.competentAndFvms, values.competentAuthority),
    sanctionedAuthority: show.sanctioning ? values.sanctioningAuthority.trim() : null,
    sponsoringAgency: null,
    // The INSERT writes `remarks` into reason_for_not_visited, which is the "Reason for Not
    // Visiting" field the Sanctioned & Not Visited stage asks for.
    remarks: show.notVisitedReason ? values.notVisitedReason.trim() : null,
    tourSanctioned: sanctionedFlagForStage(values.stage),
    checkSanctioned: sanctionedFlagForStage(values.stage),
    userID: userId,
  };
}

/**
 * Payload for POST /update-propsed-info.
 * Note this endpoint writes cities_name from `cityNames` (the create writes it from `city`),
 * and it has no sanctioning-authority field -- that lives on the Sanction tab.
 */
export function buildProposedUpdatePayload(values, { id, userId }) {
  const { duration, year } = deriveVisitFields(values);
  const organisationIsOther = isOtherOrganisation(values.organisation);
  const show = stageSections(values.stage);
  const flag = (visible, v) => (visible ? Number(v) : null);

  return {
    ID: id,
    reportYear: year,
    visit: String(values.stage),
    visitType: values.visitType,
    newVisitType: nullIfBlank(values.newVisitType),
    visitPurpose: values.purpose.trim(),
    title: values.title,
    officerName: values.officerName.trim(),
    organisationSelect: organisationIsOther ? 'Others' : values.organisation,
    newOrganisation: organisationIsOther ? values.newOrganisation.trim() : null,
    designation: values.designation,
    newDesignation: nullIfBlank(values.newDesignation),
    designationGOI: nullIfBlank(values.designationGOI),
    visitFrom: values.visitFrom,
    visitTo: values.visitTo,
    visitDuration: duration,
    country: values.countries,
    cityNames: values.cities.trim(),
    otherCityName: null,
    ministryDelegation: Number(values.ministerialDelegation),
    FVMS: flag(show.competentAndFvms, values.fvms),
    authority: flag(show.competentAndFvms, values.competentAuthority),
    // This endpoint names it remarksDelay but writes it to reason_for_not_visited.
    remarksDelay: show.notVisitedReason ? values.notVisitedReason.trim() : null,
    userID: userId,
  };
}

/** Turn a tbl_official_foreign_visit row back into form values. */
export function visitRowToValues(row) {
  if (!row) return { ...emptyVisitValues };
  const countryText = String(row.country_visited || '').trim();
  // The column is declared FVMS, so SELECT * returns it upper-cased; tolerate either spelling.
  const fvms = row.FVMS ?? row.fvms;
  return {
    visitFrom: toDateInputValue(row.from_date),
    visitTo: toDateInputValue(row.to_date),
    stage: row.visit != null ? String(row.visit) : '',
    visitType: row.visit_type != null ? String(row.visit_type) : '',
    newVisitType: row.other_visit_type || '',
    title: row.title || '',
    officerName: row.name || '',
    organisation: row.organisation != null ? String(row.organisation) : '',
    newOrganisation: '',
    designationGOI: row.GOI_designation || '',
    designation: row.designation_organisation != null ? String(row.designation_organisation) : '',
    newDesignation: row.other_designation || '',
    purpose: row.purpose || '',
    countries: countryText ? countryText.split(',').map((c) => c.trim()).filter(Boolean) : [],
    cities: row.cities_name || '',
    ministerialDelegation: row.ministerial_delegation == null ? '' : String(Number(row.ministerial_delegation)),
    sanctioningAuthority: row.sanctioned_authority || '',
    competentAuthority: row.competent_authority == null ? '' : String(Number(row.competent_authority)),
    fvms: fvms == null ? '' : String(Number(fvms)),
    notVisitedReason: row.reason_for_not_visited || '',
  };
}
