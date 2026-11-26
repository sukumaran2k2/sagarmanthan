// K-2.5 Marine Casualty Serious & Other Incidents: which sheet each section uses, and the labels.
// The rows of each sheet (incident types, countries, vessel types) come from the backend.

export const CASUALTY_TYPES = ['Marine Casualty', 'Other Casualty'];

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const QUARTER_LABELS = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];

// Sections entered as a year + casualty type sheet of named rows x 12 months
export const MARINE_SHEETS = {
  'marine-casualty-previous-current': {
    sheet: 'incident-types', code: 'K-2.5.1', rowLabel: 'Type of Incident',
    title: 'Marine Casualty Serious & Other Incidents - Previous & Current Year',
    file: 'Previous_Current_Year',
  },
  'marine-casualty-country-wise': {
    sheet: 'countries', code: 'K-2.5.3', rowLabel: 'Country (Flag)',
    title: 'Marine Casualty Serious & Other Incidents - Country (Flag)-Wise',
    file: 'Country_Wise',
  },
  'marine-casualty-vessel-wise': {
    sheet: 'vessels', code: 'K-2.5.4', rowLabel: 'Vessel Type',
    title: 'Marine Casualty Serious & Other Incidents - Vessel-Wise',
    file: 'Vessel_Wise',
  },
};

export const YEAR_WISE_SLUG = 'marine-casualty-yearwise';

// K-2.5.2 Year-wise counts: form / payload field, saved column, label
export const YEAR_WISE_COUNTS = [
  { field: 'accidentalDeath', column: 'accidental_death', label: 'Accidental Death' },
  { field: 'missingDesertion', column: 'missing_desertion', label: 'Missing / Desertion' },
  { field: 'naturalDeath', column: 'natural_death', label: 'Natural Death' },
  { field: 'suicides', column: 'suicides', label: 'Suicides' },
  { field: 'injuries', column: 'injuries', label: 'Injuries' },
  { field: 'manOverboard', column: 'man_overboard', label: 'Man Overboard' },
  { field: 'missingOnboard', column: 'missing_onboard', label: 'Missing Onboard' },
];

// Sum of a list of counts, blanks as 0
export const sumCounts = (values) => values.reduce((s, v) => s + (Number(v) || 0), 0);
