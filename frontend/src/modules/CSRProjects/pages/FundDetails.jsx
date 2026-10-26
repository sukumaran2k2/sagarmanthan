import { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, X, Plus, Edit, ChevronDown, Coins, TrendingUp, Filter } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import FundForm from '../components/FundForm';
import { fetchCsrFundList } from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { exportCsrList } from '../utils/listExport';
import { formatCrore } from '../utils/amounts';
import { useCsrStore, DEFAULT_FUND_COLS } from '../store/useCsrStore';
import { COMMON_TOASTS } from '../../../utils/notify';

const AMOUNT_COLUMNS = [
  { key: 'net_profit', label: 'Net Profit (₹ Cr)' },
  { key: 'csr_fund_alloted_year', label: 'CSR Allotted (₹ Cr)' },
  { key: 'opening_balance_csr', label: 'Opening Balance (₹ Cr)' },
  { key: 'project_expenditure', label: 'Expenditure (₹ Cr)' },
  { key: 'csr_fund_balance', label: 'Fund Balance (₹ Cr)' },
];
const AMOUNT_COLOURS = {
  csr_fund_alloted_year: 'font-extrabold text-[#0f417a] dark:text-blue-400',
  project_expenditure: 'font-extrabold text-amber-600',
  csr_fund_balance: 'font-extrabold text-emerald-600',
};

export default function FundDetails({ notify, permissions }) {
  const { isOrgUser, canAdd, canEdit, organisationName } = permissions;

  // Filters, search, paging, filter panel and columns are kept in the module store
  const {
    filters, searchTerm, currentPage, pageSize, showFilterPanel, visibleCols, organisations,
  } = useCsrStore(useShallow((state) => ({
    filters: state.fundFilters,
    searchTerm: state.fundSearch,
    currentPage: state.fundPage,
    pageSize: state.fundPageSize,
    showFilterPanel: state.fundShowFilterPanel,
    visibleCols: state.fundVisibleCols,
    organisations: state.organisations,
  })));
  const actions = useCsrStore(useShallow((state) => ({
    setFilters: state.setFundFilters,
    resetFilters: state.resetFundFilters,
    setSearchTerm: state.setFundSearch,
    setShowFilterPanel: state.setFundShowFilterPanel,
    setCurrentPage: state.setFundPage,
    setPageSize: state.setFundPageSize,
    setVisibleCols: state.setFundVisibleCols,
  })));

  // Fetched funds, tagged with the request they answer; a save bumps reloadKey to refetch.
  // The server returns only the funds the user may see.
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null); // { key, rows }
  useEffect(() => {
    let cancelled = false;
    fetchCsrFundList()
      .then((res) => {
        if (!cancelled) setResult({ key: reloadKey, rows: Array.isArray(res) ? res : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading CSR funds', err);
        setResult({ key: reloadKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed('CSR fund records'));
      });
    return () => { cancelled = true; };
  }, [reloadKey, notify]);
  const loading = result?.key !== reloadKey;
  const funds = useMemo(() => result?.rows || [], [result]);

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) setColDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add / edit window: { fund } (null fund = new)
  const [formState, setFormState] = useState(null);

  const filteredFunds = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return funds.filter((f) => {
      if (filters.organisation && String(f.organisation_id) !== String(filters.organisation)) return false;
      if (filters.financialYear && String(f.financial_year) !== filters.financialYear) return false;
      if (query && ![f.organisation_name, f.financial_year].some((v) => String(v || '').toLowerCase().includes(query))) return false;
      return true;
    });
  }, [funds, filters, searchTerm]);

  // Totals for the rows on show. Allotted and expenditure add up across years; the balance is
  // each organisation's latest year only, because a year's opening balance already carries the
  // earlier years' unspent funds (adding every year's balance counted that money again).
  const cards = useMemo(() => {
    const sum = (rows, key) => rows.reduce((acc, f) => acc + (Number(f[key]) || 0), 0);
    const latest = new Map();
    filteredFunds.forEach((f) => {
      const current = latest.get(f.organisation_id);
      if (!current || String(f.financial_year) > String(current.financial_year)) latest.set(f.organisation_id, f);
    });
    return [
      { label: 'Total CSR Allotted', value: sum(filteredFunds, 'csr_fund_alloted_year'), color: 'text-[#0f417a] dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', icon: Coins },
      { label: 'Total Expenditure', value: sum(filteredFunds, 'project_expenditure'), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', icon: TrendingUp },
      { label: 'Available Balance (latest year)', value: sum([...latest.values()], 'csr_fund_balance'), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', icon: Coins },
    ];
  }, [filteredFunds]);

  // Organisation users only ever see their own organisation, so that filter isn't offered to them
  const activeFiltersCount = [!isOrgUser && filters.organisation, filters.financialYear].filter(Boolean).length;

  const clearFilters = () => {
    actions.resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  // Paged in the browser, so the page is kept in the store
  const totalPages = Math.max(1, Math.ceil(filteredFunds.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pageRows = useMemo(() => filteredFunds.slice((page - 1) * pageSize, page * pageSize), [filteredFunds, page, pageSize]);

  const columnChoices = useMemo(() => [
    { key: 'sno', label: 'S.No' },
    ...(!isOrgUser ? [{ key: 'org', label: 'Organisation' }] : []),
    { key: 'financial_year', label: 'Financial Year' },
    ...AMOUNT_COLUMNS,
    ...(canEdit ? [{ key: 'actions', label: 'Actions' }] : []),
  ], [isOrgUser, canEdit]);

  const columnDefs = useMemo(() => {
    const show = (key) => visibleCols[key] && columnChoices.some((c) => c.key === key);
    const centered = { headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center' };
    return [
      {
        headerName: 'S.No', width: 75, minWidth: 65, flex: 0.6, hide: !show('sno'), ...centered,
        valueGetter: (p) => (page - 1) * pageSize + p.node.rowIndex + 1,
      },
      {
        headerName: 'Organisation Name', field: 'organisation_name', minWidth: 200, flex: 2.2, wrapText: true, autoHeight: true,
        hide: !show('org'), headerClass: 'text-center', cellClass: 'mopsw-wrap-cell text-center font-bold text-[#0f417a] dark:text-blue-400',
      },
      { headerName: 'Financial Year', field: 'financial_year', minWidth: 120, flex: 1.2, hide: !show('financial_year'), ...centered },
      ...AMOUNT_COLUMNS.map((c) => ({
        headerName: c.label, field: c.key, minWidth: 140, flex: 1.3, hide: !show(c.key), ...centered,
        cellClass: `text-center flex items-center justify-center ${AMOUNT_COLOURS[c.key] || 'font-semibold'}`,
        valueFormatter: (p) => formatCrore(p.value),
      })),
      {
        headerName: 'Actions', width: 90, minWidth: 80, flex: 0.8, pinned: 'right', hide: !show('actions'), sortable: false, ...centered,
        cellRenderer: (p) => p.data && (
          <button
            type="button"
            onClick={() => setFormState({ fund: p.data })}
            title="Edit Fund Allocation"
            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ];
  }, [columnChoices, visibleCols, page, pageSize]);

  const handleExport = (type) => exportCsrList(type, {
    columns: columnChoices
      .filter((c) => c.key !== 'sno' && c.key !== 'actions' && visibleCols[c.key])
      .map((c) => ({
        ...c,
        value: c.key === 'org' ? (f) => f.organisation_name
          : c.key === 'financial_year' ? (f) => f.financial_year
            : (f) => formatCrore(f[c.key]),
      })),
    rows: filteredFunds,
    fileName: 'CSR_Fund_Details',
    title: 'CSR Fund Details',
    notify,
  });

  const handleSaved = () => {
    setFormState(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="module-card flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{c.label}</span>
                <span className={`text-xl font-black ${c.color} mt-1 block`}>₹{formatCrore(c.value)} Cr</span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="module-card space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 w-full">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel((open) => !open)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}

            {canAdd && (
              <button
                type="button"
                onClick={() => setFormState({ fund: null })}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add CSR Fund</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organisation, year..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button type="button" onClick={() => actions.setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((sz) => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{loading ? '...' : filteredFunds.length}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen((open) => !open)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button type="button" onClick={() => actions.setVisibleCols(DEFAULT_FUND_COLS)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      Show All
                    </button>
                  </div>
                  {columnChoices.map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() => actions.setVisibleCols((cols) => ({ ...cols, [key]: !cols[key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => handleExport('copy')} color="#0f417a" />
            <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#0f417a" hoverColor="#1e5ea8" />
          </div>
        </div>

        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isOrgUser && (
                <div>
                  <label className="module-form-label">Organisation</label>
                  <select value={filters.organisation} onChange={(e) => actions.setFilters({ organisation: e.target.value })} className="module-form-select">
                    <option value="">All Organisations</option>
                    {organisations.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="module-form-label">Financial Year</label>
                <select value={filters.financialYear} onChange={(e) => actions.setFilters({ financialYear: e.target.value })} className="module-form-select">
                  <option value="">All Years</option>
                  {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="module-datalist-grid">
          <Table
            rowData={pageRows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }}
          />
        </div>

        {totalPages > 1 && (
          <TablePagination
            currentPage={page - 1}
            totalPages={totalPages}
            totalRows={filteredFunds.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => actions.setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => actions.setCurrentPage(Math.max(1, page - 1))}
            onNextPage={() => actions.setCurrentPage(Math.min(totalPages, page + 1))}
            color="#0f417a"
          />
        )}
      </div>

      {/* Add / edit window */}
      {formState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border-l-4 border-l-[#0f417a]">
            <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  {formState.fund ? 'Update CSR Fund Allocation' : 'Register CSR Fund Details'}
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">Amounts in ₹ Cr</p>
              </div>
              <button type="button" onClick={() => setFormState(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <FundForm
                key={formState.fund?.csr_fund_id ?? 'new'}
                fund={formState.fund}
                organisationName={formState.fund?.organisation_name || organisationName}
                notify={notify}
                onSaved={handleSaved}
                onCancel={() => setFormState(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
