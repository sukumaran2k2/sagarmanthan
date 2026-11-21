// Training Details: value formatting shared by the training list and detail views.

import { ymd } from '../../utils/dates';

// Organisations that enter only a participant count (no staff roster)
export const COUNT_ONLY_ORG_IDS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 62];
export const isCountOnlyOrganisation = (orgId) => COUNT_ONLY_ORG_IDS.includes(Number(orgId));

// Field names the participant count may arrive under (list rows, get-by-ID, edit row)
const COUNT_KEYS = [
  'NO_OF_PARTICIPANTS', 'No of Participants', 'Number of Participants',
  'no_of_participants', 'number_of_participants', 'number_of_participant',
  'NUMBER_OF_PARTICIPANTS', 'numberOfParticipant',
];

// First usable count in the row, or null when the row has none
export const readParticipantCount = (row) => {
  for (const key of COUNT_KEYS) {
    const v = row?.[key];
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
};

// Count for display: 0 when the row has none
export const getParticipantCount = (row) => readParticipantCount(row) ?? 0;

// A training date as YYYY-MM-DD ('-' when missing; unreadable values are shown as stored)
export const formatDateYYYYMMDD = (dateStr) => ymd(dateStr) || (dateStr ? String(dateStr) : '-');

// Helper to format Expenditure to Lakhs (e.g. 3.5, 4.5, 0.45)
export const formatExpenditureInLakh = (exp) => {
  if (exp === null || exp === undefined || exp === '' || exp === '-') return '-';
  const val = parseFloat(exp);
  if (isNaN(val) || val <= 0) return '-';
  // If already in lakhs (e.g. 3.5, 4.5, 0.45)
  if (val < 1000) {
    return Number(val.toFixed(2)).toString();
  }
  // If in rupees (e.g. 350000)
  const lakhVal = val / 100000;
  return Number(lakhVal.toFixed(2)).toString();
};