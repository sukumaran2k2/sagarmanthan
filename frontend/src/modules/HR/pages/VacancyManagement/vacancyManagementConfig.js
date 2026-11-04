// Vacancy Management: column labels and defaults, year options and row shaping for the two tabs.

import { formatDate as formatDateYmd } from '../../utils/dates';

export const OVERVIEW_COL_LABELS = {
  sNo: 'S.No', department: 'Department', post_id: 'Post ID', class: 'Class', post_name: 'Post Name',
  sanctioned: 'Sanctioned', actual: 'Actual', live_post: 'Vacancy - Live',
  abolished_post: 'Vacancy - Abolished', total_vacant_post: 'Vacancy - Total',
  have_abolished_or_not: 'Have Abolished or Not?'
};

export const ANTICIPATED_COL_LABELS = {
  sNo: 'S.No', department_name: 'Department', post_id: 'Post ID', class: 'Class', post_name: 'Post Name',
  post_code: 'Post Code', expected_method: 'Expected Method of Filling (as per RR)',
  anticipated_date: 'Anticipated Vacancy Date', current_occupant: 'Current Occupant',
  retirement_date: 'Date of Retirement', last_updated: 'Last Updated Date', action: 'Action'
};

export const AVAILABLE_YEARS = Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() + i).toString());
export const YEAR_OPTIONS = AVAILABLE_YEARS.map((y) => ({ value: y, label: y }));

// Rows have a fixed height (see ROW_HEIGHT) so long post names are clamped to two lines.
export const ROW_HEIGHT = 52;

export const formatDate = (dateStr) => formatDateYmd(dateStr);

// Overview row from /hr/vacancy-overview -> fields the grid and exports use.
export const toOverviewRow = (item) => {
  const isAbolished = Number(item.abolishing_this_month) === 1;
  return {
    ...item,
    is_abolished: isAbolished,
    have_abolished_or_not: isAbolished ? 'Yes' : 'No',
    sanctioned: item.sanctioned_strength ?? 0,
    actual: item.filled_post ?? 0,
    calculated_total_vacant: item.total_vacant_post != null
      ? item.total_vacant_post
      : (Number(item.live_post) || 0) + (Number(item.abolished_post) || 0),
  };
};

// Anticipated vacancies: unsaved choices are keyed by post code.
export const anticipatedKey = (row) => row.post_code || row.post_id;

// Export field per visibility key (S.No is added by the exporter).
export const OVERVIEW_EXPORT_FIELDS = {
  department: 'department', post_id: 'post_id', class: 'class', post_name: 'post_name', sanctioned: 'sanctioned', actual: 'actual',
  live_post: 'live_post', abolished_post: 'abolished_post', total_vacant_post: 'calculated_total_vacant',
  have_abolished_or_not: 'have_abolished_or_not',
};

export const OVERVIEW_VISIBLE = {
  sNo: true, department: true, post_id: false, class: false, post_name: true, sanctioned: true,
  actual: true, live_post: true, abolished_post: true, total_vacant_post: true,
  have_abolished_or_not: false
};
export const ANTICIPATED_VISIBLE = {
  sNo: true, department_name: true, post_id: false, class: false, post_name: true, post_code: true,
  expected_method: true, anticipated_date: true, current_occupant: true,
  retirement_date: false, last_updated: false, action: true
};
