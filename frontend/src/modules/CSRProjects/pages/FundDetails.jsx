import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, X, Plus, Edit, ChevronDown, 
  Coins, TrendingUp, Save, Filter, RotateCcw
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { 
  fetchCsrFundList, 
  createCsrFund, 
  updateCsrFund, 
  fetchOrganisations,
  getUserIdFromToken
} from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

export default function FundDetails({ isOrgUser: isOrgUserProp, triggerNotification }) {
  const isOrgUser = useMemo(() => {
    if (typeof isOrgUserProp === 'boolean') return isOrgUserProp;
    return isOrganisationUser();
  }, [isOrgUserProp]);

  const userOrgId = getSessionOrganisationId();
  const userOrgName = getSessionOrganisationName();

  const [funds, setFunds] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Column Visibility state
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    sno: true, org: true, financial_year: true, net_profit: true,
    csr_fund_alloted_year: true, opening_balance_csr: true,
    project_expenditure: true, csr_fund_balance: true, actions: true,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Panel state matching CSR Projects DataList
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [gridApi, setGridApi] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [submitting, setSubmitting] = useState(false);

  const [editingFundId, setEditingFundId] = useState(null);
  const [formOrgId, setFormOrgId] = useState('');
  const [formFY, setFormFY] = useState(FINANCIAL_YEARS[0]);
  const [formNetProfit, setFormNetProfit] = useState('');
  const [formFundAllotted, setFormFundAllotted] = useState('');
  const [formOpeningBalance, setFormOpeningBalance] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const loadFunds = async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const [fundRes, orgRes] = await Promise.all([
        fetchCsrFundList(userId),
        fetchOrganisations()
      ]);
      setFunds(Array.isArray(fundRes) ? fundRes : (fundRes?.rowData || []));
      setOrganisations(Array.isArray(orgRes) ? orgRes : []);
    } catch (err) {
      console.error("Error loading CSR funds", err);
      triggerNotification?.("Failed to fetch CSR fund records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const scopedFunds = useMemo(() => {
    if (!isOrgUser) return funds;
    return funds.filter(f => {
      if (userOrgId && String(f.organisation_id) === String(userOrgId)) return true;
      if (userOrgName && String(f.organisation_name).toLowerCase() === String(userOrgName).toLowerCase()) return true;
      return !userOrgId && !userOrgName;
    });
  }, [funds, isOrgUser, userOrgId, userOrgName]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!isOrgUser && selectedOrg) count++;
    if (selectedFY) count++;
    return count;
  }, [isOrgUser, selectedOrg, selectedFY]);

  const totalAllotted = useMemo(() => scopedFunds.reduce((acc, f) => acc + (Number(f.csr_fund_alloted_year) || 0), 0), [scopedFunds]);
  const totalExpenditure = useMemo(() => scopedFunds.reduce((acc, f) => acc + (Number(f.project_expenditure) || 0), 0), [scopedFunds]);
  const totalBalance = useMemo(() => scopedFunds.reduce((acc, f) => acc + (Number(f.csr_fund_balance) || 0), 0), [scopedFunds]);

  const filteredFunds = useMemo(() => {
    return scopedFunds.filter(f => {
      if (!isOrgUser && selectedOrg && String(f.organisation_id) !== String(selectedOrg)) return false;
      if (selectedFY && String(f.financial_year) !== String(selectedFY)) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const orgName = (f.organisation_name || '').toLowerCase();
        const fy = (f.financial_year || '').toLowerCase();
        if (!orgName.includes(query) && !fy.includes(query)) return false;
      }
      return true;
    });
  }, [scopedFunds, isOrgUser, selectedOrg, selectedFY, searchTerm]);

  const paginatedFunds = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFunds.slice(startIndex, startIndex + pageSize);
  }, [filteredFunds, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredFunds.length / pageSize) || 1;

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingFundId(null);
    setFormOrgId(organisations[0]?.organisation_id || '');
    setFormFY(FINANCIAL_YEARS[0]);
    setFormNetProfit('');
    setFormFundAllotted('');
    setFormOpeningBalance('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setModalMode('edit');
    setEditingFundId(item.csr_fund_id || item.id);
    setFormOrgId(item.organisation_id || '');
    setFormFY(item.financial_year || FINANCIAL_YEARS[0]);
    setFormNetProfit(item.net_profit != null ? String(item.net_profit) : '');
    setFormFundAllotted(item.csr_fund_alloted_year != null ? String(item.csr_fund_alloted_year) : '');
    setFormOpeningBalance(item.opening_balance_csr != null ? String(item.opening_balance_csr) : '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formOrgId) errs.org = 'Organisation is required.';
    if (!formFY) errs.fy = 'Financial Year is required.';
    if (formFundAllotted === '' || isNaN(Number(formFundAllotted)) || Number(formFundAllotted) < 0) {
      errs.fund = 'Valid CSR Fund Allotted (in ₹ Cr) is required.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const payload = {
      organisationID: Number(formOrgId),
      financialYear: formFY,
      netProfit: formNetProfit ? Number(formNetProfit) : 0,
      fundAlloted: Number(formFundAllotted),
      openingBalance: formOpeningBalance ? Number(formOpeningBalance) : 0,
      userID: getUserIdFromToken()
    };

    try {
      if (modalMode === 'edit') {
        payload.csrFundId = editingFundId;
        await updateCsrFund(payload);
        triggerNotification?.("CSR Fund details updated successfully.", "success");
      } else {
        await createCsrFund(payload);
        triggerNotification?.("New CSR Fund registered successfully.", "success");
      }
      setIsModalOpen(false);
      loadFunds();
    } catch (err) {
      console.error("Error saving CSR Fund:", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save CSR Fund.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSelectedOrg('');
    setSelectedFY('');
    setSearchTerm('');
    setCurrentPage(1);
    triggerNotification?.('Filters have been reset', 'info');
  };

  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      field: "sno",
      width: 80,
      minWidth: 80,
      maxWidth: 80,
      suppressSizeToFit: true,
      pinned: 'left',
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
      hide: !visibleCols.sno,
      valueGetter: (p) => (currentPage - 1) * pageSize + p.node.rowIndex + 1,
      cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-bold">{p.value}</div>
    },
    ...(!isOrgUser ? [{
      headerName: "Organization Name",
      field: "organisation_name",
      minWidth: 200,
      flex: 2.2,
      wrapText: true,
      autoHeight: true,
      headerClass: 'text-center',
      cellClass: 'mopsw-wrap-cell text-center flex items-center justify-center',
      cellStyle: {
        fontWeight: 700,
        color: '#0f417a',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        lineHeight: '1.35',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      hide: !visibleCols.org,
      valueGetter: (p) => p.data?.organisation_name || `Org ID: ${p.data?.organisation_id}`,
      cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center">{p.value}</div>
    }] : []),
    {
      headerName: "Financial Year",
      field: "financial_year",
      width: 140,
      minWidth: 140,
      maxWidth: 140,
      suppressSizeToFit: true,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
      hide: !visibleCols.financial_year,
      cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-semibold">{p.value || '-'}</div>
    },
    {
      headerName: "Net Profit (₹ Cr)",
      field: "net_profit",
      minWidth: 130,
      flex: 1.3,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
      hide: !visibleCols.net_profit,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-'),
      cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-semibold">{p.value != null ? Number(p.value).toFixed(2) : '-'}</div>
    },
    {
      headerName: "CSR Allotted (₹ Cr)",
      field: "csr_fund_alloted_year",
      minWidth: 140,
      flex: 1.4,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 800, color: '#0f417a', justifyContent: 'center' },
      hide: !visibleCols.csr_fund_alloted_year,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-'),
      cellRenderer: (p) => (
        <div className="w-full flex items-center justify-center text-center font-extrabold text-[#0f417a] dark:text-blue-400">
          {p.value != null ? Number(p.value).toFixed(2) : '-'}
        </div>
      )
    },
    {
      headerName: "Opening Bal (₹ Cr)",
      field: "opening_balance_csr",
      minWidth: 140,
      flex: 1.3,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
      hide: !visibleCols.opening_balance_csr,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-'),
      cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-semibold">{p.value != null ? Number(p.value).toFixed(2) : '-'}</div>
    },
    {
      headerName: "Expenditure (₹ Cr)",
      field: "project_expenditure",
      minWidth: 140,
      flex: 1.3,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 800, color: '#d97706', justifyContent: 'center' },
      hide: !visibleCols.project_expenditure,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '0.00'),
      cellRenderer: (p) => (
        <div className="w-full flex items-center justify-center text-center font-extrabold text-amber-600">
          {p.value != null ? Number(p.value).toFixed(2) : '0.00'}
        </div>
      )
    },
    {
      headerName: "Fund Balance (₹ Cr)",
      field: "csr_fund_balance",
      minWidth: 140,
      flex: 1.4,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669', justifyContent: 'center' },
      hide: !visibleCols.csr_fund_balance,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-'),
      cellRenderer: (p) => (
        <div className="w-full flex items-center justify-center text-center font-extrabold text-emerald-600">
          {p.value != null ? Number(p.value).toFixed(2) : '-'}
        </div>
      )
    },
    ...(isOrgUser ? [{
      headerName: "Actions",
      field: "actions",
      width: 90,
      minWidth: 80,
      flex: 0.8,
      pinned: 'right',
      headerClass: 'text-center',
      cellClass: 'text-center',
      hide: !visibleCols.actions,
      cellRenderer: (p) => {
        if (!p.data) return null;
        return (
          <div className="flex items-center justify-center space-x-1.5 h-full">
            <button
              type="button"
              onClick={() => handleOpenEditModal(p.data)}
              title="Edit Fund Allocation"
              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }] : [])
  ], [currentPage, pageSize, isOrgUser, visibleCols]);

  const exportColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    ...(!isOrgUser ? [{ key: 'organisation_name', label: 'Organisation' }] : []),
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'net_profit', label: 'Net Profit (₹ Cr)' },
    { key: 'csr_fund_alloted_year', label: 'CSR Allotted (₹ Cr)' },
    { key: 'opening_balance_csr', label: 'Opening Bal (₹ Cr)' },
    { key: 'project_expenditure', label: 'Expenditure (₹ Cr)' },
    { key: 'csr_fund_balance', label: 'Balance (₹ Cr)' },
  ], [isOrgUser]);

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          { label: 'Total CSR Allotted', value: totalAllotted, color: 'text-[#0f417a] dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', icon: Coins },
          { label: 'Total Expenditure', value: totalExpenditure, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', icon: TrendingUp },
          { label: 'Available Balance', value: totalBalance, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', icon: Coins },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{c.label}</span>
                <span className={`text-xl font-black ${c.color} mt-1 block`}>₹{c.value.toFixed(2)} Cr</span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
              }`}
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

            {/* Clear/Reset Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* Search Box on Right */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Org, FY..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredFunds.length}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen(!colDropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button
                      type="button"
                      onClick={() => setVisibleCols({ sno: true, org: true, financial_year: true, net_profit: true, csr_fund_alloted_year: true, opening_balance_csr: true, project_expenditure: true, csr_fund_balance: true, actions: true })}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  {[
                    { key: 'sno', label: 'S.No' },
                    ...(!isOrgUser ? [{ key: 'org', label: 'Organisation' }] : []),
                    { key: 'financial_year', label: 'Financial Year' },
                    { key: 'net_profit', label: 'Net Profit (₹ Cr)' },
                    { key: 'csr_fund_alloted_year', label: 'CSR Allotted (₹ Cr)' },
                    { key: 'opening_balance_csr', label: 'Opening Balance (₹ Cr)' },
                    { key: 'project_expenditure', label: 'Expenditure (₹ Cr)' },
                    { key: 'csr_fund_balance', label: 'Fund Balance (₹ Cr)' },
                    { key: 'actions', label: 'Actions' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton data={filteredFunds} columns={exportColumns} color="#0f417a" triggerNotification={triggerNotification} />
            <ExportDropdown data={filteredFunds} columns={exportColumns} fileName="CSR_Fund_Details" title="CSR Fund Details" color="#0f417a" hoverColor="#1e5ea8" triggerNotification={triggerNotification} />

            {isOrgUser && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer select-none"
              >
                <Plus className="h-4 w-4" />
                <span>Add Fund Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Panel matching CSR Projects DataList */}
        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {!isOrgUser && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Organization</label>
                  <select
                    value={selectedOrg}
                    onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Organisations ({organisations.length})</option>
                    {organisations.map((org) => (
                      <option key={org.organisation_id} value={org.organisation_id}>{org.organisation_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Financial Year</label>
                <select
                  value={selectedFY}
                  onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Financial Years</option>
                  {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* AG Grid Table */}
        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedFunds}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }}
          />

          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={filteredFunds.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>
      </div>

      {/* Add / Edit Fund Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-l-4 border-l-[#0f417a]">
            <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  {modalMode === 'edit' ? 'Update CSR Fund Allocation' : 'Register CSR Fund Details'}
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">Corporate Social Responsibility Fund Budgeting</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Organisation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formOrgId}
                  onChange={e => setFormOrgId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                >
                  <option value="">Select Organisation</option>
                  {organisations.map(o => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
                </select>
                {formErrors.org && <p className="text-[10px] text-rose-500 font-bold">{formErrors.org}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Financial Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formFY}
                  onChange={e => setFormFY(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                >
                  {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
                {formErrors.fy && <p className="text-[10px] text-rose-500 font-bold">{formErrors.fy}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Net Profit (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNetProfit}
                    onChange={e => setFormNetProfit(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0f417a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Allotted (₹ Cr) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formFundAllotted}
                    onChange={e => setFormFundAllotted(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0f417a]"
                  />
                  {formErrors.fund && <p className="text-[10px] text-rose-500 font-bold">{formErrors.fund}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Opening Bal (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formOpeningBalance}
                    onChange={e => setFormOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0f417a]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Saving...' : modalMode === 'edit' ? 'Update Fund' : 'Save Fund'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
