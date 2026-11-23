// Tabs above a Data List that split its rows (K-2.4: Nautical / Engineering), in the look of the
// E-Office sheet tabs. tabs: { key, label, value(row), options(rows) -> [{ value, label }] };
// which tab is shown and its rows: data/listTabs.js.

export default function ListTabs({ tabs, rows, active, onChange }) {
  const options = tabs.options(rows);
  if (!options.length) return null;
  return (
    <div className="module-subtabs-strip" role="tablist" aria-label={tabs.label}>
      {options.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === active}
          onClick={() => onChange(t.value)}
          className={`module-subtab-btn ${t.value === active ? 'active' : ''}`}
        >
          {String(t.label).toUpperCase()}
        </button>
      ))}
    </div>
  );
}
