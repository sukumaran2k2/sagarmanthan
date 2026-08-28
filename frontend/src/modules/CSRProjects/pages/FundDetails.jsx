import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, X, Plus, Edit, ChevronDown, 
  Coins, Building2, Calendar, TrendingUp, Filter, RotateCcw, Save
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
import { getDataScopeCode, getSessionClaims } from '../../../utils/authSession';

export default function FundDetails({ isOrgUser: isOrgUserProp, triggerNotification }) {
  const isOrgUser = useMemo(() => {
    if (typeof isOrgUserProp === 'boolean') return isOrgUserProp;
    const scope = String(getDataScopeCode() || '').toUpperCase();
    if (scope === 'ORGANISATION') return true;
    if (scope === 'MINISTRY' || scope === 'MASTER') return false;
    const claims = getSessionClaims();
    const roleId = Number(claims?.roleId || claims?.role_id || claims?.role || 1);
    return roleId === 6 || roleId === 7;
  }, [isOrgUserProp]);

  const [funds, setFunds] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & Grid
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [gridApi, setGridApi] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [submitting, setSubmitting] = useState(false);

  // Modal Form Fields
  const [editingFundId, setEditingFundId] = useState(null);
  const [formOrgId, setFormOrgId] = useState('');
  const [formFY, setFormFY] = useState(FINANCIAL_YEARS[0]);
  const [formNetProfit, setFormNetProfit] = useState('');
  const [formFundAllotted, setFormFundAllotted] = useState('');
  const [formOpeningBalance, setFormOpeningBalance] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Load Funds & Organisations
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

  // Summary Metrics
  const totalAllotted = useMemo(() => {
    return funds.reduce((acc, f) => acc + (Number(f.csr_fund_alloted_year) || 0), 0);
  }, [funds]);

  const totalExpenditure = useMemo(() => {
    return funds.reduce((acc, f) => acc + (Number(f.project_expenditure) || 0), 0);
  }, [funds]);

  const totalBalance = useMemo(() => {
    return funds.reduce((acc, f) => acc + (Number(f.csr_fund_balance) || 0), 0);
  }, [funds]);

  // Filtering
  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      if (selectedOrg && String(f.organisation_id) !== String(selectedOrg)) return false;
      if (selectedFY && String(f.financial_year) !== String(selectedFY)) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const orgName = (f.organisation_name || '').toLowerCase();
        const fy = (f.financial_year || '').toLowerCase();
        if (!orgName.includes(query) && !fy.includes(query)) return false;
      }
      return true;
    });
  }, [funds, selectedOrg, selectedFY, searchTerm]);

  // Pagination
  const paginatedFunds = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFunds.slice(startIndex, startIndex + pageSize);
  }, [filteredFunds, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredFunds.length / pageSize) || 1;

  // Modal Handlers
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
  };

  const hasActiveFilters = selectedOrg || selectedFY || searchTerm;

  // Blue Themed AG Grid Column Definitions
  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      field: "sno",
      width: 70,
      minWidth: 60,
      cellStyle: { textAlign: 'center', fontWeight: 700 },
      valueGetter: (params) => (currentPage - 1) * pageSize + params.node.rowIndex + 1
    },
    {
      headerName: "Organisation",
      field: "organisation_name",
      minWidth: 220,
      flex: 2,
      cellStyle: { fontWeight: 700, color: '#0f417a' },
      valueGetter: (params) => params.data?.organisation_name || `Org ID: ${params.data?.organisation_id}`
    },
    {
      headerName: "Financial Year",
      field: "financial_year",
      width: 130,
      minWidth: 110,
      cellStyle: { textAlign: 'center', fontWeight: 600 }
    },
    {
      headerName: "Net Profit (₹ Cr)",
      field: "net_profit",
      width: 140,
      minWidth: 120,
      cellStyle: { textAlign: 'right', fontWeight: 600 },
      valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
    },
    {
      headerName: "CSR Allotted (₹ Cr)",
      field: "csr_fund_alloted_year",
      width: 160,
      minWidth: 130,
      cellStyle: { textAlign: 'right', fontWeight: 800, color: '#0f417a' },
      valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
    },
    {
      headerName: "Opening Bal (₹ Cr)",
      field: "opening_balance_csr",
      width: 150,
      minWidth: 120,
      cellStyle: { textAlign: 'right', fontWeight: 600 },
      valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
    },
    {
      headerName: "Expenditure (₹ Cr)",
      field: "project_expenditure",
      width: 150,
      minWidth: 120,
      cellStyle: { textAlign: 'right', fontWeight: 800, color: '#d97706' },
      valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '0.00'
    },
    {
      headerName: "Fund Balance (₹ Cr)",
      field: "csr_fund_balance",
      width: 160,
      minWidth: 130,
      cellStyle: { textAlign: 'right', fontWeight: 800, color: '#059669' },
      valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
    },
    ...(isOrgUser ? [{
      headerName: "Actions",
      field: "actions",
      width: 100,
      minWidth: 90,
      pinned: 'right',
      cellRenderer: (params) => {
        const f = params.data;
        if (!f) return null;
        return (
          <div className="flex items-center justify-center space-x-1.5 h-full">
            <button
              type="button"
              onClick={() => handleOpenEditModal(f)}
              title="Edit Fund Allocation"
              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }] : [])
  ], [currentPage, pageSize, isOrgUser]);

  // Export Columns
  const exportColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    { key: 'organisation_name', label: 'Organisation' },
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'net_profit', label: 'Net Profit (₹ Cr)' },
    { key: 'csr_fund_alloted_year', label: 'CSR Allotted (₹ Cr)' },
    { key: 'opening_balance_csr', label: 'Opening Bal (₹ Cr)' },
    { key: 'project_expenditure', label: 'Expenditure (₹ Cr)' },
    { key: 'csr_fund_balance', label: 'Balance (₹ Cr)' },
  ], []);

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Top Metric Cards matching CA style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Total Fund Allotted */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total CSR Allotted
            </span>
            <span className="text-xl font-black text-[#0f417a] dark:text-blue-400 mt-1 block">
              ₹{totalAllotted.toFixed(2)} Cr
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#0f417a] dark:text-blue-400">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        {/* Total Expenditure */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Expenditure
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              ₹{totalExpenditure.toFixed(2)} Cr
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Available Balance
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              ₹{totalBalance.toFixed(2)} Cr
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Coins className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Toolbar matching CA style */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 w-full">
            
            {/* Organisation Filter */}
            <div className="relative min-w-[150px]">
              <select
                value={selectedOrg}
                onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                className="appearance-none w-full text-xs pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Organisations</option>
                {organisations.map((o) => (
                  <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Financial Year Filter */}
            <div className="relative min-w-[130px]">
              <select
                value={selectedFY}
                onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
                className="appearance-none w-full text-xs pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Years</option>
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Search Box */}
            <div className="relative min-w-[160px] max-w-xs flex-1">
              <input
                type="text"
                placeholder="Search Org, FY..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Clear Filter Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}

          </div>

          {/* Right Action Tools: Rows, Total, Copy, Export, Add New */}
          <div className="flex items-center space-x-2 flex-shrink-0 w-full lg:w-auto justify-end">
            
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredFunds.length}</span>
            </div>

            <CopyButton
              data={filteredFunds}
              columns={exportColumns}
              color="#0f417a"
              triggerNotification={triggerNotification}
            />

            <ExportDropdown
              data={filteredFunds}
              columns={exportColumns}
              fileName="CSR_Fund_Details"
              title="CSR Fund Details"
              color="#0f417a"
              hoverColor="#1e5ea8"
              triggerNotification={triggerNotification}
            />

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

        {/* Blue Themed AG Grid Table matching CA module */}
        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedFunds}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true
            }}
          />

          {/* Server-Side Pagination Bar */}
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
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  {modalMode === 'edit' ? 'Update CSR Fund Allocation' : 'Register CSR Fund Details'}
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">
                  Corporate Social Responsibility Fund Budgeting
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* Organisation */}
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
                  {organisations.map(o => (
                    <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                  ))}
                </select>
                {formErrors.org && <p className="text-[10px] text-rose-500 font-bold">{formErrors.org}</p>}
              </div>

              {/* Financial Year */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Financial Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formFY}
                  onChange={e => setFormFY(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                >
                  {FINANCIAL_YEARS.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
                {formErrors.fy && <p className="text-[10px] text-rose-500 font-bold">{formErrors.fy}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Net Profit */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Net Profit (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNetProfit}
                    onChange={e => setFormNetProfit(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0f417a]"
                  />
                </div>

                {/* CSR Fund Allotted */}
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

                {/* Opening Balance */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Opening Bal (₹ Cr)
                  </label>
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

              {/* Modal Footer */}
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
