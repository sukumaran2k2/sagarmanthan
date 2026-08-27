import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit, Search, Filter, RefreshCw, X, Coins, 
  Building2, Calendar, FileText, CheckCircle2, AlertCircle, Save 
} from 'lucide-react';
import { 
  fetchCsrFundList, 
  createCsrFund, 
  updateCsrFund, 
  fetchOrganisations,
  getUserIdFromToken
} from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function FundDetails({ triggerNotification }) {
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState([]);
  const [organisations, setOrganisations] = useState([]);

  // Filters
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & limits
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Form Fields
  const [modalOrgId, setModalOrgId] = useState('');
  const [modalFY, setModalFY] = useState(FINANCIAL_YEARS[0]);
  const [modalNetProfit, setModalNetProfit] = useState('');
  const [modalAllotted, setModalAllotted] = useState('');
  const [modalOpeningBal, setModalOpeningBal] = useState('');

  const [formErrors, setFormErrors] = useState({});

  const loadFunds = async () => {
    setLoading(true);
    try {
      const [fundsRes, orgsRes] = await Promise.all([
        fetchCsrFundList(),
        fetchOrganisations()
      ]);
      setFunds(Array.isArray(fundsRes) ? fundsRes : []);
      setOrganisations(Array.isArray(orgsRes) ? orgsRes : []);
    } catch (err) {
      console.error("Error loading CSR funds", err);
      triggerNotification?.("Failed to load CSR fund records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFund(null);
    setModalOrgId(organisations[0]?.organisation_id || '');
    setModalFY(FINANCIAL_YEARS[0]);
    setModalNetProfit('');
    setModalAllotted('');
    setModalOpeningBal('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (fund) => {
    setEditingFund(fund);
    setModalOrgId(fund.organisation_id);
    setModalFY(fund.financial_year);
    setModalNetProfit(fund.net_profit ?? '');
    setModalAllotted(fund.csr_fund_alloted_year ?? '');
    setModalOpeningBal(fund.opening_balance_csr ?? '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFund(null);
    setFormErrors({});
  };

  const validateModalForm = () => {
    const errs = {};
    if (!modalOrgId) errs.org = 'Organisation is required.';
    if (!modalFY) errs.fy = 'Financial year is required.';
    if (modalNetProfit === '' || isNaN(Number(modalNetProfit))) errs.netProfit = 'Valid net profit amount is required.';
    if (modalAllotted === '' || isNaN(Number(modalAllotted))) errs.allotted = 'Valid allotted amount is required.';
    if (modalOpeningBal === '' || isNaN(Number(modalOpeningBal))) errs.openingBal = 'Valid opening balance is required.';
    return errs;
  };

  const handleSaveFund = async (e) => {
    e.preventDefault();
    const errs = validateModalForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      if (editingFund) {
        // Edit existing fund
        const payload = {
          csrFundId: editingFund.csr_fund_id,
          financialYear: modalFY,
          netProfit: Number(modalNetProfit),
          csrFundAllotedForYear: Number(modalAllotted),
          openingBalanceCSR: Number(modalOpeningBal),
          userID: getUserIdFromToken()
        };
        await updateCsrFund(payload);
        triggerNotification?.("CSR Fund details updated successfully.", "success");
      } else {
        // Add new fund
        const payload = {
          organisationID: Number(modalOrgId),
          financialYear: modalFY,
          netProfit: Number(modalNetProfit),
          csrFundAllotedForYear: Number(modalAllotted),
          openingBalanceCSR: Number(modalOpeningBal),
          userID: getUserIdFromToken()
        };
        await createCsrFund(payload);
        triggerNotification?.("New CSR Fund registered successfully.", "success");
      }
      handleCloseModal();
      loadFunds();
    } catch (err) {
      console.error("Error saving CSR Fund", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save CSR Fund.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered funds
  const filteredFunds = useMemo(() => {
    return funds.filter(item => {
      if (selectedOrg && String(item.organisation_name) !== selectedOrg) return false;
      if (selectedFY && String(item.financial_year) !== selectedFY) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const orgName = (item.organisation_name || '').toLowerCase();
        const fy = (item.financial_year || '').toLowerCase();
        if (!orgName.includes(query) && !fy.includes(query)) return false;
      }
      return true;
    });
  }, [funds, selectedOrg, selectedFY, searchTerm]);

  // Paginated funds
  const paginatedFunds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFunds.slice(start, start + pageSize);
  }, [filteredFunds, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredFunds.length / pageSize) || 1;

  // Export Columns definition
  const exportColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    { key: 'organisation_name', label: 'Organisation' },
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'net_profit', label: 'Net Profit (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
    { key: 'csr_fund_alloted_year', label: 'CSR Allotted (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
    { key: 'opening_balance_csr', label: 'Opening Bal (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
    { key: 'project_expenditure', label: 'Expenditure (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
    { key: 'csr_fund_balance', label: 'Fund Balance (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
  ], []);

  const resetFilters = () => {
    setSelectedOrg('');
    setSelectedFY('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(selectedOrg || selectedFY || searchTerm);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search organisation / FY..."
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
            />
          </div>

          <select
            value={selectedOrg}
            onChange={e => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
          >
            <option value="">All Organisations</option>
            {organisations.map(o => (
              <option key={o.organisation_id} value={o.organisation_name}>{o.organisation_name}</option>
            ))}
          </select>

          <select
            value={selectedFY}
            onChange={e => { setSelectedFY(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
          >
            <option value="">All FYs</option>
            {FINANCIAL_YEARS.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Right: Actions, Copy, Export, Add */}
        <div className="flex items-center space-x-2">
          <CopyButton 
            data={filteredFunds} 
            columns={exportColumns} 
            triggerNotification={triggerNotification} 
          />

          <ExportDropdown 
            data={filteredFunds} 
            columns={exportColumns} 
            fileName="CSR_Fund_Details" 
            title="CSR Fund Allocations & Expenditure Summary"
            triggerNotification={triggerNotification} 
          />

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 bg-[#0f417a] hover:bg-blue-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add CSR Fund</span>
          </button>

          <button
            onClick={loadFunds}
            title="Refresh"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Funds Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Organisation</th>
                <th className="py-3.5 px-4">Financial Year</th>
                <th className="py-3.5 px-4 text-right">Net Profit (₹ Cr)</th>
                <th className="py-3.5 px-4 text-right">CSR Allotted (₹ Cr)</th>
                <th className="py-3.5 px-4 text-right">Opening Bal (₹ Cr)</th>
                <th className="py-3.5 px-4 text-right">Expenditure (₹ Cr)</th>
                <th className="py-3.5 px-4 text-right">Fund Balance (₹ Cr)</th>
                <th className="py-3.5 px-4 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0f417a] mb-2" />
                    Loading CSR fund records...
                  </td>
                </tr>
              ) : paginatedFunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    No CSR fund records found. Click "Add CSR Fund" to register one.
                  </td>
                </tr>
              ) : (
                paginatedFunds.map((fund, idx) => (
                  <tr key={fund.csr_fund_id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 max-w-[220px] truncate" title={fund.organisation_name}>
                      {fund.organisation_name || '-'}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-700 dark:text-slate-200">
                      {fund.financial_year || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                      {fund.net_profit != null ? Number(fund.net_profit).toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#0f417a] dark:text-blue-400">
                      {fund.csr_fund_alloted_year != null ? Number(fund.csr_fund_alloted_year).toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-400">
                      {fund.opening_balance_csr != null ? Number(fund.opening_balance_csr).toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                      {fund.project_expenditure != null ? Number(fund.project_expenditure).toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {fund.csr_fund_balance != null ? Number(fund.csr_fund_balance).toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEditModal(fund)}
                        title="Edit CSR Fund"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-[#0f417a] dark:hover:text-blue-400 transition cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-semibold">
            Showing {filteredFunds.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredFunds.length)} of {filteredFunds.length} entries
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit CSR Fund Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border-l-4 border-l-[#0f417a]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Coins className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  {editingFund ? 'Edit CSR Fund Allocation' : 'Register CSR Fund'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveFund} className="p-6 space-y-4">
              
              {/* Organisation Selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Organisation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalOrgId}
                  disabled={!!editingFund}
                  onChange={e => setModalOrgId(Number(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] disabled:opacity-60 cursor-pointer"
                >
                  {organisations.map(o => (
                    <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                  ))}
                </select>
                {formErrors.org && (
                  <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" /> {formErrors.org}
                  </p>
                )}
              </div>

              {/* Financial Year */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Financial Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalFY}
                  onChange={e => setModalFY(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
                >
                  {FINANCIAL_YEARS.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
                {formErrors.fy && (
                  <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline" /> {formErrors.fy}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Net Profit */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Net Profit (₹ Cr) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalNetProfit}
                    onChange={e => setModalNetProfit(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                  />
                  {formErrors.netProfit && (
                    <p className="text-[10px] font-bold text-rose-500">{formErrors.netProfit}</p>
                  )}
                </div>

                {/* CSR Fund Allotted */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Allotted (₹ Cr) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalAllotted}
                    onChange={e => setModalAllotted(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                  />
                  {formErrors.allotted && (
                    <p className="text-[10px] font-bold text-rose-500">{formErrors.allotted}</p>
                  )}
                </div>

                {/* Opening Balance */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Opening Bal (₹ Cr) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalOpeningBal}
                    onChange={e => setModalOpeningBal(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
                  />
                  {formErrors.openingBal && (
                    <p className="text-[10px] font-bold text-rose-500">{formErrors.openingBal}</p>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0f417a] hover:bg-blue-800 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Saving...' : editingFund ? 'Update Fund' : 'Save Fund'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
