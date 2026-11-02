import { SOCIAL_CHANNELS_KEYS } from './constants';

const SUM_FIELDS = [
  'broadcast_national', 'broadcast_regional', 'broadcast_overall',
  'print_media_national', 'print_media_regional', 'print_media_overall',
  'online_english', 'online_vernacular', 'online_overall',
  ...SOCIAL_CHANNELS_KEYS.flatMap(ch => [`${ch}_posts`, `${ch}_impression`, `${ch}_engagement`]),
];

// Older records may store '2026-27'; show every year as '2026-2027'
export function normaliseFinancialYear(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value ?? '').trim());
  return match ? `${match[1]}-${Number(match[1]) + 1}` : value;
}

// Sums monthly records into one row per Financial Year + Organisation
export function aggregateYearWiseData(rowData) {
  if (!Array.isArray(rowData)) return [];

  const groups = {};
  rowData.forEach(row => {
    if (!row.financial_year) return;
    const key = `${row.financial_year}_${row.organisation_id}`;
    if (!groups[key]) {
      groups[key] = {
        media_outreach_id: `yearwise_${key}`,
        financial_year: row.financial_year,
        organisation_id: row.organisation_id,
        organisation_name: row.organisation_name,
        organisation_category_name: row.organisation_category_name,
      };
      SUM_FIELDS.forEach(field => { groups[key][field] = 0; });
    }
    SUM_FIELDS.forEach(field => { groups[key][field] += row[field] || 0; });
  });

  return Object.values(groups);
}
