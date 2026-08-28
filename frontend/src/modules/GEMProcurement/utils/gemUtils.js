// Financial year starts in April, so April is elapsed month 1 and March is 12.
export function getElapsedFinancialMonths(date = new Date()) {
  const calendarMonth = date.getMonth() + 1;
  return calendarMonth >= 4 ? calendarMonth - 3 : calendarMonth + 9;
}

export function proportionalTarget(potential, months = getElapsedFinancialMonths()) {
  const p = Number(potential) || 0;
  return Number(((p / 12) * months).toFixed(2));
}

export function getGemRecordId(record, category) {
  if (!record) return null;
  if (category === 'goods') {
    return record.goods_gem_id || record.goodsGemID || record.id || null;
  }
  if (category === 'services') {
    return record.service_gem_id || record.serviceGemID || record.id || null;
  }
  if (category === 'works') {
    return record.works_gem_id || record.worksGemID || record.id || null;
  }
  return (
    record.common_gem_id ||
    record.goods_gem_id ||
    record.service_gem_id ||
    record.works_gem_id ||
    record.id ||
    null
  );
}

export function getGemFinancialYear(record) {
  return (
    record?.goods_financial_year ||
    record?.service_financial_year ||
    record?.works_financial_year ||
    record?.common_financial_year ||
    record?.financial_year ||
    ''
  );
}

export function getGemOrganisationId(record) {
  return (
    record?.goods_organisation_id ||
    record?.service_organisation_id ||
    record?.works_organisation_id ||
    record?.common_organisation_id ||
    record?.organisation_id ||
    null
  );
}

export function getGemPotential(record, category) {
  if (category === 'goods') return Number(record?.goods_procurement_potential) || 0;
  if (category === 'services') return Number(record?.service_procurement_potential) || 0;
  if (category === 'works') return Number(record?.works_procurement_potential) || 0;
  return Number(record?.total_procurement_potential) || 0;
}

export const GEM_FY_OPTIONS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
];

export const GEM_CATEGORY_TABS = [
  { id: 'total', label: 'Total' },
  { id: 'goods', label: 'Goods' },
  { id: 'services', label: 'Services' },
  { id: 'works', label: 'Works' },
  { id: 'report', label: 'Reports' },
];
