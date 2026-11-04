// Vacant Details: the methods of appointment offered, exemption reasons and column labels.

export const EXPECTED_METHODS = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Promotion',
  'Composite Method',
  'Deputation In',
  'Transfer In'
];

export const ACTUAL_MODES = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Promotion',
  'Deputation In',
  'Composite Method',
  'Transfer In',
  'Redeployed-in',
  'Redeployed from CHD Category',
  'Promotion-in by Direct Recruitment'
];

export const EXEMPTION_REASONS = ['Statutory Post', 'Reservation for SC/ST', 'OBC'];

// A post is exempt from abolition when it has a reason for exemption (exception_abolish is not used)
export const isExemptReason = (reason) => String(reason ?? '').trim() !== '';


export const COL_LABELS = {
  sNo: 'S.No',
  post_code: 'Post Code',
  to_be_filled_through: 'Expected Method of Filling (as per RR)',
  method_of_appointment: 'Actual Mode of Filling',
  date_of_arise_in_vacancy: 'Date of Arise in Vacancy',
  reason_for_exemption: 'Reason for Exemption from Abolition',
  action: 'Update'
};
