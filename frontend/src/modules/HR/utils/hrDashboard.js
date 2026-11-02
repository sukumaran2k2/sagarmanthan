// Data shaping for the HR Dashboard (the endpoints are the legacy dashboard's).

export const CLASS_ORDER = ['I/A', 'II/B', 'III/C', 'IV/D'];

const pad = (n) => String(n).padStart(2, '0');
export const toDdMmYyyy = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

/**
 * "As on" date per organisation category, as on the legacy dashboard:
 * Other Organisations report monthly (last day of the previous month), Miscellaneous on the 15th.
 */
export function dashboardAsOnDate(clusterId, today = new Date()) {
  switch (String(clusterId)) {
    case '2':
      return new Date(today.getFullYear(), today.getMonth(), 0);
    case '3':
      return new Date(today.getFullYear(), today.getMonth(), 15);
    default:
      return today;
  }
}

const num = (v) => (v == null || typeof v === 'object' ? 0 : Number(v) || 0);

/** Stat cards from get-admin-hr-dashboard-content (flat combinedTotals or nested clusterTotals). */
export function readDashboardTotals(data = {}) {
  const flat = data.combinedTotals;
  if (flat) {
    return {
      sanctioned: num(flat.totalSanctionedAndFilledPost),
      filled: num(flat.filled_post),
      live: num(flat.totalLiveVacantPost),
      abolished: num(flat.totalAbolishedVacantPost),
    };
  }
  const t = data.clusterTotals || {};
  return {
    sanctioned: num(t.totalSanctionedAndFilledPost?.total_sanctioned_strength),
    filled: num(t.totalSanctionedAndFilledPost?.filled_post),
    live: num(t.totalLiveVacantPost?.totalLiveVacantPost),
    abolished: num(t.totalAbolishedVacantPost?.totalAbolishedVacantPost),
  };
}

const blank = (v) => v == null || String(v).trim() === '' || String(v).trim().toLowerCase() === 'null';

export function genderSlices(rows = []) {
  const counts = new Map([['Male', 0], ['Female', 0], ['Not Specified', 0]]);
  rows.forEach((r) => {
    const g = blank(r.gender) ? 'Not Specified' : String(r.gender).trim();
    counts.set(g, (counts.get(g) || 0) + num(r.count_of_emp));
  });
  return [...counts].map(([category, value]) => ({ category, value }));
}

export function exServiceSlices(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    const status = String(r.experience_status);
    const category = status === '1' ? 'Ex-service' : status === '0' ? 'Non Ex-service' : 'No Data';
    if (!map.has(category)) map.set(category, { category, value: 0, male: 0, female: 0, unknown: 0 });
    const slice = map.get(category);
    const count = num(r.emp_count);
    slice.value += count;
    const g = String(r.gender || '').trim().toLowerCase();
    if (g === 'male') slice.male += count;
    else if (g === 'female') slice.female += count;
    else slice.unknown += count;
  });
  return [...map.values()];
}

export function pwbdSlices(rows = []) {
  return rows.map((r) => ({
    category: blank(r.pwbd_status) ? 'No Data' : String(r.pwbd_status).trim(),
    value: num(r.total_count),
    male: num(r.male_count),
    female: num(r.female_count),
    transgender: num(r.transgender_count),
  }));
}

export function communitySlices(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    const category = blank(r.community) ? 'Other' : String(r.community).trim();
    map.set(category, (map.get(category) || 0) + num(r.total));
  });
  return [...map].map(([category, value]) => ({ category, value }));
}

/** Sorted, de-duplicated { value, label } options from rows (for the table filters). */
export function optionsFrom(rows, valueKey, labelKey = valueKey) {
  const map = new Map();
  rows.forEach((r) => {
    const value = r[valueKey];
    if (blank(value)) return;
    map.set(String(value), String(r[labelKey] ?? value).trim());
  });
  return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function classOptionsFrom(rows) {
  const present = new Set(rows.map((r) => r.class).filter((c) => !blank(c)));
  return [...CLASS_ORDER.filter((c) => present.has(c)), ...[...present].filter((c) => !CLASS_ORDER.includes(c)).sort()];
}

export function vacancyTotals(rows = []) {
  return rows.reduce((t, r) => ({
    sanctioned: t.sanctioned + num(r.total_sanctioned_strength),
    actual: t.actual + num(r.filled_post),
    live: t.live + num(r.totalLivePost),
    abolished: t.abolished + num(r.totalAbolishedPost),
  }), { sanctioned: 0, actual: 0, live: 0, abolished: 0 });
}

/** { value, label } department options from /get-hr-department-list rows, by name, without duplicates. */
export function departmentOptions(rows) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((d) => {
    const id = String(d.department_id ?? '').trim();
    const name = String(d.department_name ?? '').trim();
    if (id && name && !map.has(id)) map.set(id, name);
  });
  return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
