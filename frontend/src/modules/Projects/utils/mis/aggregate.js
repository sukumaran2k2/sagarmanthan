import { num, parseDate, round2 } from './format';

export function sum(rows, field) {
  return round2(rows.reduce((total, row) => {
    const value = num(row[field]);
    return value == null ? total : total + value;
  }, 0));
}

export function average(rows, field) {
  const values = rows.map((row) => num(row[field])).filter((value) => value != null);
  if (!values.length) return null;
  return round2(values.reduce((total, value) => total + value, 0) / values.length);
}

export function countBy(rows, field) {
  const counts = new Map();
  rows.forEach((row) => {
    const key = String(row[field] || '').trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

export function distinctCount(rows, field) {
  return new Set(rows.map((row) => String(row[field] || '').trim()).filter(Boolean)).size;
}

export function largestGroup(rows, field) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = String(row[field] || '').trim();
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  let best = null;
  groups.forEach((groupRows, name) => {
    const closerName = best && groupRows.length === best.rows.length && name.localeCompare(best.name) < 0;
    if (!best || groupRows.length > best.rows.length || closerName) {
      best = { name, rows: groupRows };
    }
  });
  return best;
}

export function mostCommon(rows, field) {
  let best = null;
  countBy(rows, field).forEach((count, name) => {
    const closerName = best && count === best.count && name.localeCompare(best.name) < 0;
    if (!best || count > best.count || closerName) best = { name, count };
  });
  return best;
}

export function maxBy(rows, field) {
  return rows.reduce((best, row) => {
    const value = num(row[field]);
    if (value == null) return best;
    if (!best || value > num(best[field])) return row;
    return best;
  }, null);
}

export function daysBetween(fromValue, toValue) {
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function baseStats(rows) {
  return {
    count: rows.length,
    organisationCount: distinctCount(rows, 'organisationName'),
  };
}
