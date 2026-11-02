import { TEU_COMMODITY_ID, TRAFFIC_CELL_DIMENSIONS } from './trafficConstants';

/** Key of one input cell in the wizard's values map. */
export function cellKey(commodityId, categoryId, directionId, flagTypeId) {
  return `${commodityId}_${categoryId}_${directionId}_${flagTypeId}`;
}

export function isTeuCommodity(commodityId) {
  return Number(commodityId) === TEU_COMMODITY_ID;
}

export function emptyValuesMap(commodities = []) {
  const map = {};
  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
      map[cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId)] = '';
    });
  });
  return map;
}

export function applyCommodityDataToMap(valuesMap, commodityData = []) {
  const next = { ...valuesMap };
  commodityData.forEach((item) => {
    const key = cellKey(item.commodity_id, item.category_id, item.direction_id, item.flag_type_id);
    next[key] = item.value === null || item.value === undefined ? '' : String(item.value);
  });
  return next;
}

export function sumCommodityRow(valuesMap, commodityId) {
  return TRAFFIC_CELL_DIMENSIONS.reduce((sum, dim) => {
    const n = parseFloat(valuesMap[cellKey(commodityId, dim.categoryId, dim.directionId, dim.flagTypeId)]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function sumColumnTotals(valuesMap, commodities) {
  const totals = TRAFFIC_CELL_DIMENSIONS.map(() => 0);
  let grand = 0;
  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim, index) => {
      const n = parseFloat(valuesMap[cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId)]);
      if (Number.isFinite(n)) {
        totals[index] += n;
        grand += n;
      }
    });
  });
  return { totals, grand };
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

/** requireValue: saving needs at least one value; moving on (Next) only checks the format. */
export function validateRoroStep({ roRoTraffic, roPaxTraffic }, { requireValue = true } = {}) {
  const errors = {};
  const roRoErr = validateOptionalNonNegative(roRoTraffic);
  const roPaxErr = validateOptionalNonNegative(roPaxTraffic);
  if (roRoErr) errors.roRoTraffic = roRoErr;
  if (roPaxErr) errors.roPaxTraffic = roPaxErr;
  const isEmpty = String(roRoTraffic ?? '').trim() === '' && String(roPaxTraffic ?? '').trim() === '';
  return { errors, isEmpty: requireValue && isEmpty };
}

export function validateCommodityStep(valuesMap, commodities = [], { requireValue = true } = {}) {
  const fieldErrors = {};
  let filledCount = 0;
  commodities.forEach((c) => {
    TRAFFIC_CELL_DIMENSIONS.forEach((dim) => {
      const key = cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId);
      const err = validateOptionalNonNegative(valuesMap[key]);
      if (err) fieldErrors[key] = err;
      if (String(valuesMap[key] ?? '').trim() !== '') filledCount += 1;
    });
  });
  return { fieldErrors, isEmpty: requireValue && commodities.length > 0 && filledCount === 0 };
}

/** Every cell of the group, blanks included, so cleared values are saved as cleared. */
export function buildCommodityPayloadForGroup(valuesMap, commodities = []) {
  return commodities.flatMap((c) =>
    TRAFFIC_CELL_DIMENSIONS.map((dim) => ({
      commodity_id: Number(c.commodity_id),
      category_id: dim.categoryId,
      direction_id: dim.directionId,
      flag_type_id: dim.flagTypeId,
      value: toNumberOrNull(valuesMap[cellKey(c.commodity_id, dim.categoryId, dim.directionId, dim.flagTypeId)]),
    }))
  );
}
