import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Anchor, Coins, GraduationCap, UserCheck, AlertTriangle, ClipboardCheck,
  ShieldCheck, FileSearch, School, ChevronRight, ChevronDown, Search, MousePointerClick,
} from 'lucide-react';

const SECTION_ICONS = {
  'K-2.1': Anchor,
  'K-2.2': Coins,
  'K-2.3': GraduationCap,
  'K-2.4': UserCheck,
  'K-2.5': AlertTriangle,
  'K-2.6': ClipboardCheck,
  'K-2.7': ShieldCheck,
  'K-2.8': FileSearch,
  'K-2.9': School,
};

/**
 * Split-pane renderer for the Input Form / Data List / Reports landing pages.
 * The sections list sits on the left; the leaf's content renders on the right.
 *
 * `renderRight(slug)` returns the React node for the currently-selected leaf,
 * or null/undefined when no section is selected (the pane shows a prompt then).
 */
export default function IndexCardGrid({ title, subtitle, rows, routePrefix, renderRight }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  // Groups default to collapsed; opened on click. Keyed by section code.
  const [openGroups, setOpenGroups] = useState({});

  const activeSlug = useMemo(() => {
    const prefix = routePrefix.replace(/\/$/, '');
    const path = location.pathname.replace(/\/$/, '');
    if (!path.startsWith(prefix)) return '';
    const rest = path.slice(prefix.length);
    return rest.startsWith('/') ? rest.slice(1) : '';
  }, [location.pathname, routePrefix]);

  // Auto-expand whichever group contains the active slug, so a direct link always
  // reveals its row. Runs on slug change and on first render.
  useEffect(() => {
    if (!activeSlug) return;
    const parent = rows.find((r) => r.isGroup && r.children.some((c) => c.slug === activeSlug));
    if (parent) setOpenGroups((prev) => (prev[parent.code] ? prev : { ...prev, [parent.code]: true }));
  }, [activeSlug, rows]);

  const toggleGroup = (code) => setOpenGroups((prev) => ({ ...prev, [code]: !prev[code] }));

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows
      .map((row) => {
        const matchesSelf = row.code.toLowerCase().includes(q) || row.label.toLowerCase().includes(q);
        if (row.isGroup) {
          const kids = row.children.filter(
            (c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
          );
          if (matchesSelf) return row;
          if (kids.length) return { ...row, children: kids };
          return null;
        }
        return matchesSelf ? row : null;
      })
      .filter(Boolean);
  }, [rows, query]);

  const rightContent = renderRight ? renderRight(activeSlug) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      {/* Left: sections list */}
      <div className="module-card p-0 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRows.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400">
              No sections match "{query}".
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <SectionRow
                  key={row.code}
                  row={row}
                  routePrefix={routePrefix}
                  navigate={navigate}
                  activeSlug={activeSlug}
                  isOpen={!!openGroups[row.code] || !!query.trim()}
                  onToggle={() => toggleGroup(row.code)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: selected leaf's content */}
      <div className="min-w-0">
        {rightContent || <EmptyRightPane title={title} />}
      </div>
    </div>
  );
}

function SectionRow({ row, routePrefix, navigate, activeSlug, isOpen, onToggle }) {
  const Icon = SECTION_ICONS[row.code] || Anchor;
  const isLeaf = !row.isGroup;
  const target = isLeaf ? `${routePrefix}/${row.slug}` : null;
  const isActive = isLeaf && activeSlug === row.slug;
  // A group row is "active" whenever one of its children is the current slug
  const containsActive = row.isGroup && row.children?.some((c) => c.slug === activeSlug);

  const handleHeaderClick = () => {
    if (isLeaf) navigate(target);
    else onToggle?.();
  };

  return (
    <li>
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 transition cursor-pointer border-l-2 ${
          isActive
            ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a] dark:border-blue-500'
            : containsActive
              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-600'
              : 'bg-slate-50/60 dark:bg-slate-800/30 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
        }`}
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleHeaderClick(); }}
        aria-expanded={row.isGroup ? isOpen : undefined}
      >
        <div className={`flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0 ${
          isActive || containsActive
            ? 'bg-[#0f417a] text-white'
            : 'bg-[#0f417a]/10 dark:bg-blue-500/10 text-[#0f417a] dark:text-blue-400'
        }`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
            {row.code}
          </span>
          <span className={`block text-[11px] font-bold leading-snug mt-0.5 ${
            isActive || containsActive ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'
          }`}>
            {row.label}
          </span>
        </div>
        {isLeaf ? (
          <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
              isOpen ? 'rotate-0' : '-rotate-90'
            } ${containsActive ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`}
          />
        )}
      </div>

      {row.isGroup && isOpen && (
        <ul className="bg-white dark:bg-slate-900">
          {row.children.map((child) => {
            const isChildActive = activeSlug === child.slug;
            return (
              <li key={child.code}>
                <button
                  type="button"
                  onClick={() => navigate(`${routePrefix}/${child.slug}`)}
                  className={`w-full flex items-center gap-2 pl-12 pr-3 py-2 text-left transition border-l-2 cursor-pointer group ${
                    isChildActive
                      ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a] dark:border-blue-500'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-[9px] font-black tracking-wider flex-shrink-0 w-14 ${
                    isChildActive ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {child.code}
                  </span>
                  <span className={`text-[11px] font-semibold flex-1 min-w-0 ${
                    isChildActive
                      ? 'text-[#0f417a] dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-200 group-hover:text-[#0f417a] dark:group-hover:text-blue-400'
                  }`}>
                    {child.label}
                  </span>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 ${
                    isChildActive ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400 group-hover:text-[#0f417a] dark:group-hover:text-blue-400'
                  }`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function EmptyRightPane({ title }) {
  return (
    <div className="module-card h-full flex flex-col items-center justify-center text-center py-16">
      <MousePointerClick className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
        Select a section from the list
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        Pick any K-2.x row on the left and it will open here in {title}.
      </p>
    </div>
  );
}
