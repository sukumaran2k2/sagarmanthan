// Data List tabs (K-2.4: Nautical / Engineering): which tab is shown and its rows.
// tabs: { key, label, value(row), options(rows) -> [{ value, label }] }; the strip is components/ListTabs.jsx.

/** The tab to show: the chosen one while it still has rows, else the first. */
export function activeTabOf(tabs, rows, chosen) {
  const options = tabs.options(rows);
  return options.some((t) => t.value === chosen) ? chosen : options[0]?.value;
}

/** Rows in the given tab (all rows while there is no tab yet). */
export function rowsInTab(tabs, rows, active) {
  return active === undefined ? rows : rows.filter((r) => String(tabs.value(r) ?? '') === active);
}
