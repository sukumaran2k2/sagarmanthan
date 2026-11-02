// Matching rows against the Vacancy-Management-style filters (ids from the masters).

const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * True when a row matches a chosen master entry. The row's id is used when it has one;
 * otherwise its name is compared (trimmed, ignoring case) with the master entry's name.
 */
export function matchesIdOrName(rowId, rowName, chosenId, chosenName) {
  if (!chosenId) return true;
  if (rowId != null && String(rowId).trim() !== '') return norm(rowId) === norm(chosenId);
  return Boolean(chosenName) && norm(rowName) === norm(chosenName);
}

export const nameOf = (list, idKey, nameKey, id) =>
  (id ? list.find((x) => String(x[idKey]).trim() === String(id).trim())?.[nameKey] : '') || '';
