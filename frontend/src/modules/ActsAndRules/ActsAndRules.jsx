import { useState, useMemo } from 'react';
import { Scale } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import CopyButton from '../../components/CopyButton';
import ExportDropdown from '../../components/ExportDropdown';
import { ACTS_AND_RULES, WINGS } from './actsAndRulesData';

const FILTERS = ['All', ...WINGS];

// Flattens each entry's rules into a single plain-text cell so the table's
// nested act/rule structure can be represented as flat TSV/CSV rows for
// Copy and Excel export, matching how every other reworked module's
// toolbar behaves.
function ruleTextFor(entry) {
  if (entry.ruleGroups) {
    return entry.ruleGroups
      .map((g) => `${g.heading}: ${g.rules.join('; ')}`)
      .join(' | ');
  }
  return entry.rules.length ? entry.rules.join('; ') : '—';
}

function RuleList({ entry }) {
  if (entry.ruleGroups) {
    return entry.ruleGroups.map((group, gi) => (
      <div key={gi} className="mb-3 last:mb-0">
        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{group.heading}</p>
        <ol className="list-decimal list-inside space-y-1">
          {group.rules.map((rule, ri) => <li key={ri}>{rule}</li>)}
        </ol>
      </div>
    ));
  }
  if (!entry.rules.length) return <span className="text-slate-400 dark:text-slate-500 italic">&mdash;</span>;
  return (
    <ol className="list-decimal list-inside space-y-1">
      {entry.rules.map((rule, ri) => <li key={ri}>{rule}</li>)}
    </ol>
  );
}

export default function ActsAndRules() {
  const [activeFilter, setActiveFilter] = useState('All');

  const rows = useMemo(
    () => (activeFilter === 'All' ? ACTS_AND_RULES : ACTS_AND_RULES.filter((r) => r.wing === activeFilter)),
    [activeFilter]
  );

  // Each row can have multiple Act/Rule entries stacked in one cell, so
  // flatten to one output line per entry rather than per row for a cleaner
  // Copy/Excel export.
  const flatRows = useMemo(() => rows.flatMap((row) =>
    row.entries.map((entry) => ({
      sno: row.sno,
      wing: row.wing,
      act: entry.act,
      rule: ruleTextFor(entry),
    }))
  ), [rows]);

  const handleCopy = () => {
    let tsv = ['S.No', 'Wing', 'Act', 'Rule'].join('\t') + '\n';
    flatRows.forEach((r) => {
      tsv += [r.sno, r.wing, r.act, r.rule].join('\t') + '\n';
    });
    navigator.clipboard.writeText(tsv);
  };

  const handleExport = (type) => {
    if (type === 'Excel') {
      const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      let csv = ['S.No', 'Wing', 'Act', 'Rule'].map(escapeCsv).join(',') + '\n';
      flatRows.forEach((r) => {
        csv += [r.sno, r.wing, r.act, r.rule].map(escapeCsv).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'acts_and_rules.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else if (type === 'PDF') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <PageBanner title="Acts & Rules" icon={Scale} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition border ${
                activeFilter === filter
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <CopyButton onCopy={handleCopy} color="#0f417a" />
          <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} color="#0f417a" hoverColor="#1a5ba3" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="px-4 py-3 text-left font-bold uppercase text-xs w-16">S.No</th>
              <th className="px-4 py-3 text-left font-bold uppercase text-xs w-40">Wing</th>
              <th className="px-4 py-3 text-left font-bold uppercase text-xs w-[35%]">Act</th>
              <th className="px-4 py-3 text-left font-bold uppercase text-xs">Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-100">
            {rows.map((row) => (
              <tr key={row.sno} className="align-top">
                <td className="px-4 py-4 font-semibold">{row.sno}</td>
                <td className="px-4 py-4 font-semibold">{row.wing}</td>
                <td className="px-4 py-4">
                  <ol className="list-decimal list-inside space-y-3">
                    {row.entries.map((entry, i) => <li key={i}>{entry.act}</li>)}
                  </ol>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-4">
                    {row.entries.map((entry, i) => <RuleList key={i} entry={entry} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

