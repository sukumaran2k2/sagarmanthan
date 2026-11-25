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
// Default accent (blue) matches the other KPI modules. Reports uses brown
// to line up with the table theme — pass `accentColor` to override per view.
const DEFAULT_ACCENT = '#0f417a';

export default function IndexCardGrid({
  title, subtitle, rows, routePrefix, renderRight,
  accentColor = DEFAULT_ACCENT,
  // When true, list and right-pane share a single outer card with just a
  // vertical divider between them (used by the Reports section so the two
  // panels read as one unit). Inner renderers receive { flat: true } so they
  // can skip their own module-card wrapper and avoid nested card borders.
  mergedLayout = false,
}) {
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

  const rightContent = renderRight ? renderRight(activeSlug, { flat: mergedLayout }) : null;

  const listPane = (
    <div
      className={
        mergedLayout
          // Sticks to the top of the row and scrolls its sections list internally. When the
          // right pane grows (e.g. after opening the filter panel), the list stays capped at
          // viewport height instead of stretching along with the pane.
          ? 'overflow-hidden flex flex-col max-h-[calc(100vh-220px)] self-start border-r border-slate-200 dark:border-slate-700'
          : 'module-card p-0 overflow-hidden flex flex-col max-h-[calc(100vh-220px)]'
      }
    >
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-700 text-left">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-left">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 text-left">{subtitle}</p>
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
                accent={accentColor}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const rightPane = (
    <div
      className={
        mergedLayout
          // Height column with a viewport-anchored floor so the inner report page's title /
          // toolbar stay pinned and the ag-Grid body handles its own scroll. The pane can grow
          // past that floor when a collapsible filter panel opens, so the pagination strip
          // under the grid stays visible instead of being clipped.
          ? 'min-w-0 px-3 py-3 min-h-[calc(100vh-220px)] flex flex-col'
          : 'min-w-0'
      }
    >
      {rightContent || <EmptyRightPane title={title} flat={mergedLayout} />}
    </div>
  );

  if (mergedLayout) {
    // One card containing both panes, with a vertical divider between them.
    // Narrower list column (280px) gives the report table more horizontal room.
    return (
      <div className="module-card p-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        {listPane}
        {rightPane}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      {listPane}
      {rightPane}
    </div>
  );
}

function SectionRow({ row, routePrefix, navigate, activeSlug, isOpen, onToggle, accent }) {
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

  // Accent is a hex string passed in from the parent (defaults to blue). We can't
  // compose Tailwind arbitrary values at runtime, so active/selected states fall
  // back to inline style for both the tint (10% alpha via rgba()) and the border.
  const tint = hexToRgba(accent, 0.1);
  const activeStyle = (isActive)
    ? { backgroundColor: tint, borderLeftColor: accent }
    : (containsActive ? { backgroundColor: 'transparent', borderLeftColor: `${accent}55` } : undefined);
  const iconStyle = (isActive || containsActive)
    ? { backgroundColor: accent, color: '#ffffff' }
    : { backgroundColor: tint, color: accent };
  const labelStyle = (isActive || containsActive) ? { color: accent } : undefined;

  return (
    <li>
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 transition cursor-pointer border-l-2 ${
          isActive || containsActive
            ? ''
            : 'bg-slate-50/60 dark:bg-slate-800/30 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
        }`}
        style={activeStyle}
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleHeaderClick(); }}
        aria-expanded={row.isGroup ? isOpen : undefined}
      >
        <div
          className="flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0"
          style={iconStyle}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
            {row.code}
          </span>
          <span
            className={`block text-[11px] font-bold leading-snug mt-0.5 ${
              isActive || containsActive ? '' : 'text-slate-800 dark:text-slate-100'
            }`}
            style={labelStyle}
          >
            {row.label}
          </span>
        </div>
        {isLeaf ? (
          <ChevronRight
            className="h-3.5 w-3.5 flex-shrink-0"
            style={isActive ? { color: accent } : { color: '#94a3b8' }}
          />
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
            style={containsActive ? { color: accent } : { color: '#94a3b8' }}
          />
        )}
      </div>

      {row.isGroup && isOpen && (
        <ul className="bg-white dark:bg-slate-900">
          {row.children.map((child) => {
            const isChildActive = activeSlug === child.slug;
            const childRowStyle = isChildActive
              ? { backgroundColor: tint, borderLeftColor: accent }
              : undefined;
            const childTextStyle = isChildActive ? { color: accent } : undefined;
            return (
              <li key={child.code}>
                <button
                  type="button"
                  onClick={() => navigate(`${routePrefix}/${child.slug}`)}
                  className={`w-full flex items-center gap-2 pl-12 pr-3 py-2 text-left transition border-l-2 cursor-pointer group ${
                    isChildActive
                      ? ''
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
                  }`}
                  style={childRowStyle}
                >
                  <span
                    className={`text-[9px] font-black tracking-wider flex-shrink-0 w-14 ${
                      isChildActive ? '' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    style={childTextStyle}
                  >
                    {child.code}
                  </span>
                  <span
                    className={`text-[11px] font-semibold flex-1 min-w-0 ${
                      isChildActive
                        ? ''
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                    style={childTextStyle}
                  >
                    {child.label}
                  </span>
                  <ChevronRight
                    className="h-3 w-3 flex-shrink-0"
                    style={isChildActive ? { color: accent } : { color: '#94a3b8' }}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// Convert a hex string (#rrggbb) to an rgba() with the given alpha. Used so the
// accent prop can drive the subtle background tint behind active rows.
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >>  8) & 255;
  const b = (bigint >>  0) & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function EmptyRightPane({ title, flat = false }) {
  const cls = flat
    ? 'h-full flex flex-col items-center justify-center text-center py-16'
    : 'module-card h-full flex flex-col items-center justify-center text-center py-16';
  return (
    <div className={cls}>
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
