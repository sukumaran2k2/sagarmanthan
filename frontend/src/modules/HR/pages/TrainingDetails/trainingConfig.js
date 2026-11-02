// Training Details: value formatting shared by the training list and detail views.

import { ymd } from '../../utils/dates';

export const getParticipantCount = (row) => {
  const value = row?.NO_OF_PARTICIPANTS;

  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const count = Number(value);

  return Number.isFinite(count) ? count : 0;
};

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
