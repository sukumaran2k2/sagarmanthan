import {
  MONTH_NAME_TO_NUM,
  MONTH_NUM_TO_NAME,
  TEU_COMMODITY_IDS,
  TRAFFIC_CELL_DIMENSIONS,
  trafficDimensionColKey,
} from './trafficConstants';

export function cellKey(commodityId, categoryId, directionId, flagTypeId) {
  return `${commodityId}_${categoryId}_${directionId}_${flagTypeId}`;
}

export function parseMonthToNumber(month) {
  if (month == null || month === '') return null;
  if (typeof month === 'number' && Number.isFinite(month)) return month;
  const asNum = Number(month);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 12) return asNum;
  const key = String(month).trim().toLowerCase();
  return MONTH_NAME_TO_NUM[key] ?? null;
}

export function formatMonthLabel(month) {
  const num = parseMonthToNumber(month);
  if (num != null) return MONTH_NUM_TO_NAME[num] || String(month);
  return String(month || '');
}

export function emptyValuesMap(commodities = []) {
  const map = {};
  commodities.forEach((c) => {
    const commodityId = c.commodity_id;
    TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
      map[cellKey(commodityId, dim.categoryId, dim.directionId, dim.flagTypeId)] = '';
    });
  });
  return map;
}

export function applyCommodityDataToMap(valuesMap, commodityData = []) {
  const next = { ...valuesMap };
  commodityData.forEach((item) => {
    const key = cellKey(
      item.commodity_id,
      item.category_id,
      item.direction_id,
      item.flag_type_id
    );
    next[key] =
      item.value === null || item.value === undefined ? '' : String(item.value);
  });
  return next;
}

export function buildCommodityPayload(valuesMap) {
  return Object.entries(valuesMap).map(([key, raw]) => {
    const [commodityId, categoryId, directionId, flagTypeId] = key.split('_').map(Number);
    const trimmed = String(raw ?? '').trim();
    return {
      commodity_id: commodityId,
      category_id: categoryId,
      direction_id: directionId,
      flag_type_id: flagTypeId,
      value: trimmed === '' ? null : Number(trimmed),
    };
  });
}

export function commodityUnitLabel(commodityId) {
  return TEU_COMMODITY_IDS.has(Number(commodityId)) ? '' : '(In 000 Tonnes)';
}

export function sumCommodityRow(valuesMap, commodityId) {
  return TRAFFIC_CELL_DIMENSIONS.reduce((sum, dim) => {
    const raw = valuesMap[cellKey(commodityId, dim.categoryId, dim.directionId, dim.flagTypeId)];
    const n = parseFloat(raw);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function sumColumnTotals(valuesMap, commodities) {
  const totals = TRAFFIC_CELL_DIMENSIONS.map(() => 0);
  let grand = 0;
  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim, index) => {
      const raw = valuesMap[cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId)];
      const n = parseFloat(raw);
      if (Number.isFinite(n)) {
        totals[index] += n;
        grand += n;
      }
    });
  });
  return { totals, grand };
}

export function isTeuCommodity(commodityId) {
  return TEU_COMMODITY_IDS.has(Number(commodityId));
}

// Tonnes exclude TEU commodity id 28; container tonnes (27) stay in tonnes.
export function summariseCommodityActuals(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const monthNum = parseMonthToNumber(row.month);
    const key = `${row.fiscal_year}|${monthNum}|${row.organisation_id}`;
    if (!map.has(key)) {
      map.set(key, {
        fiscal_year: row.fiscal_year,
        month: monthNum,
        month_label: formatMonthLabel(row.month),
        organisation_id: row.organisation_id,
        organisation_name: row.organisation_name,
        total_value: 0,
        total_teu: 0,
        commodity_ids: new Set(),
        record_count: 0,
      });
    }
    const entry = map.get(key);
    entry.record_count += 1;
    if (row.commodity_id != null) entry.commodity_ids.add(row.commodity_id);
    const n = parseFloat(row.value);
    if (!Number.isFinite(n)) return;
    if (isTeuCommodity(row.commodity_id)) {
      entry.total_teu += n;
    } else {
      entry.total_value += n;
    }
  });

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      commodity_count: entry.commodity_ids.size,
      commodity_ids: undefined,
      total_value: Number(entry.total_value.toFixed(2)),
      total_teu: Number(entry.total_teu.toFixed(2)),
    }))
    .sort((a, b) => {
      if (a.fiscal_year !== b.fiscal_year) return String(b.fiscal_year).localeCompare(String(a.fiscal_year));
      if (a.month !== b.month) return (b.month || 0) - (a.month || 0);
      return String(a.organisation_name || '').localeCompare(String(b.organisation_name || ''));
    });
}

export function buildCommodityDetailRows(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const monthNum = parseMonthToNumber(row.month);
    const key = [
      row.fiscal_year,
      monthNum,
      row.organisation_id,
      row.commodity_group_id ?? row.commodity_group_name,
      row.commodity_id ?? row.commodity_name,
    ].join('|');

    if (!map.has(key)) {
      const cells = {};
      TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
        cells[trafficDimensionColKey(dim)] = null;
      });
      map.set(key, {
        fiscal_year: row.fiscal_year,
        month: monthNum,
        month_label: formatMonthLabel(row.month),
        organisation_id: row.organisation_id,
        organisation_name: row.organisation_name,
        commodity_group_id: row.commodity_group_id,
        commodity_group_name: row.commodity_group_name,
        commodity_id: row.commodity_id,
        commodity_name: row.commodity_name,
        is_teu: isTeuCommodity(row.commodity_id),
        ...cells,
      });
    }

    const entry = map.get(key);
    const dim = TRAFFIC_CELL_DIMENSIONS.find(
      (d) =>
        d.categoryId === Number(row.category_id) &&
        d.directionId === Number(row.direction_id) &&
        d.flagTypeId === Number(row.flag_type_id)
    );
    if (!dim) return;
    const colKey = trafficDimensionColKey(dim);
    const n = parseFloat(row.value);
    entry[colKey] = Number.isFinite(n) ? n : row.value ?? null;
  });

  return Array.from(map.values())
    .map((entry) => {
      let total = 0;
      TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
        const n = parseFloat(entry[trafficDimensionColKey(dim)]);
        if (Number.isFinite(n)) total += n;
      });
      return {
        ...entry,
        row_total: Number(total.toFixed(2)),
        total_tonnes: entry.is_teu ? null : Number(total.toFixed(2)),
        total_teu: entry.is_teu ? Number(total.toFixed(2)) : null,
      };
    })
    .sort((a, b) => {
      if (a.fiscal_year !== b.fiscal_year) return String(b.fiscal_year).localeCompare(String(a.fiscal_year));
      if (a.month !== b.month) return (b.month || 0) - (a.month || 0);
      const org = String(a.organisation_name || '').localeCompare(String(b.organisation_name || ''));
      if (org !== 0) return org;
      const grp = String(a.commodity_group_name || '').localeCompare(String(b.commodity_group_name || ''));
      if (grp !== 0) return grp;
      return String(a.commodity_name || '').localeCompare(String(b.commodity_name || ''));
    });
}

export function hasExistingTrafficData(responseData) {
  const commodityData = responseData?.commodityData || [];
  const trafficData = responseData?.trafficData || {};
  const hasCommodity = commodityData.some(
    (d) => d.value !== null && d.value !== undefined && String(d.value).trim() !== ''
  );
  const hasRoro =
    (trafficData.ro_ro_traffic !== null && trafficData.ro_ro_traffic !== undefined) ||
    (trafficData.ro_pax_traffic !== null && trafficData.ro_pax_traffic !== undefined);
  return hasCommodity || hasRoro || commodityData.length > 0;
}

export function toNumberOrNull(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateOptionalNonNegative(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 'Enter a valid number';
  if (n < 0) return 'Value cannot be negative';
  return null;
}

export function validatePeriodFields({ fiscalYear, month, organisationId }) {
  const errors = {};
  if (!fiscalYear) errors.fiscalYear = 'Financial Year is required';
  if (month == null || month === '') errors.month = 'Month is required';
  if (!organisationId) errors.organisationId = 'Organisation context is missing';
  return errors;
}

// mode: 'draft' = format only; 'page'/'submit' = require at least one value
export function validateRoroStep({ roRoTraffic, roPaxTraffic }, mode = 'page') {
  const errors = {};
  const roRoErr = validateOptionalNonNegative(roRoTraffic);
  const roPaxErr = validateOptionalNonNegative(roPaxTraffic);
  if (roRoErr) errors.roRoTraffic = roRoErr;
  if (roPaxErr) errors.roPaxTraffic = roPaxErr;

  if (mode !== 'draft') {
    const hasAny =
      String(roRoTraffic ?? '').trim() !== '' || String(roPaxTraffic ?? '').trim() !== '';
    if (!hasAny) {
      errors.roRoTraffic = errors.roRoTraffic || 'Enter at least one Ro-Ro or Ro-Pax value';
    }
  }
  return errors;
}

export function validateCommodityStep(valuesMap, commodities = [], mode = 'page') {
  const fieldErrors = {};
  let filledCount = 0;

  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
      const key = cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId);
      const raw = valuesMap[key];
      const err = validateOptionalNonNegative(raw);
      if (err) fieldErrors[key] = err;
      if (String(raw ?? '').trim() !== '') filledCount += 1;
    });
  });

  if (mode !== 'draft' && filledCount === 0 && commodities.length > 0) {
    return {
      fieldErrors,
      message: 'Enter at least one commodity value on this page before saving.',
    };
  }

  return {
    fieldErrors,
    message:
      Object.keys(fieldErrors).length > 0
        ? 'Fix highlighted invalid values before saving.'
        : undefined,
  };
}

export function buildCommodityPayloadForGroup(valuesMap, commodities = []) {
  const idSet = new Set(commodities.map((c) => Number(c.commodity_id)));
  return Object.entries(valuesMap)
    .filter(([key]) => {
      const commodityId = Number(String(key).split('_')[0]);
      return idSet.has(commodityId);
    })
    .map(([key, raw]) => {
      const [commodityId, categoryId, directionId, flagTypeId] = key.split('_').map(Number);
      const trimmed = String(raw ?? '').trim();
      return {
        commodity_id: commodityId,
        category_id: categoryId,
        direction_id: directionId,
        flag_type_id: flagTypeId,
        value: trimmed === '' ? null : Number(trimmed),
      };
    });
}

export function countFilledValues(valuesMap, commodities = []) {
  let count = 0;
  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
      const key = cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId);
      if (String(valuesMap[key] ?? '').trim() !== '') count += 1;
    });
  });
  return count;
}
