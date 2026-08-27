import React, { useState, useEffect, useMemo } from 'react';
import { 
  FilePieChart, Coins, RefreshCw, X, ChevronRight, 
  Building2, Eye, Download, Layers 
} from 'lucide-react';
import { 
  fetchCsrAbstractReport, 
  fetchCsrDetailedReport, 
  fetchCsrExpenditureReport 
} from '../api';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function Reports({ triggerNotification }) {
  const [activeReportTab, setActiveReportTab] = useState('abstract');
  const [loading, setLoading] = useState(true);

  // Abstract report data
  const [abstractData, setAbstractData] = useState([]);
  
  // Fund expenditure report data
  const [expenditureData, setExpenditureData] = useState([]);

  // Drilldown Modal
  const [selectedOrgForDrilldown, setSelectedOrgForDrilldown] = useState(null);
  const [detailedOrgProjects, setDetailedOrgProjects] = useState([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'abstract') {
        const res = await fetchCsrAbstractReport();
        setAbstractData(Array.isArray(res) ? res : []);
      } else {
        const res = await fetchCsrExpenditureReport();
        setExpenditureData(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("Error loading CSR reports", err);
      triggerNotification?.("Failed to fetch report data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeReportTab]);

  const handleDrilldownOrg = async (orgId, orgName) => {
    setSelectedOrgForDrilldown({ orgId, orgName });
    setLoadingDrilldown(true);
    try {
      const res = await fetchCsrDetailedReport(orgId, orgName);
      setDetailedOrgProjects(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error loading drilldown report", err);
      triggerNotification?.("Failed to load detailed organisation projects.", "error");
    } finally {
      setLoadingDrilldown(false);
    }
  };

  // Columns for Abstract Report Export
  const abstractExportColumns = useMemo(() => [
    { key: 'S No', label: 'S.No' },
    { key: 'Organisation Name', label: 'Organisation Name' },
    { key: 'Approved by Board', label: 'Approved by Board' },
    { key: 'Project yet to Start', label: 'Project Yet to Start' },
    { key: 'Project Under implementation', label: 'Under Implementation' },
    { key: 'Completed', label: 'Completed' },
    { key: 'Total Number of CSR Projects till date', label: 'Total Projects' },
  ], []);

  // Columns for Expenditure Report Export
  const expenditureExportColumns = useMemo(() => [
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
    <div className="space-y-4 animate-fade-in">
      
      {/* Report Type Selector & Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Report Sub-tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveReportTab('abstract')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'abstract'
                ? 'bg-[#0f417a] text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FilePieChart className="h-4 w-4" />
            <span>Organisation Abstract Report</span>
          </button>

          <button
            onClick={() => setActiveReportTab('expenditure')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'expenditure'
                ? 'bg-[#0f417a] text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Fund Expenditure Report</span>
          </button>
        </div>

        {/* Right: Copy, Export, Refresh */}
        <div className="flex items-center space-x-2">
          <CopyButton
            data={activeReportTab === 'abstract' ? abstractData : expenditureData}
            columns={activeReportTab === 'abstract' ? abstractExportColumns : expenditureExportColumns}
            triggerNotification={triggerNotification}
          />

          <ExportDropdown
            data={activeReportTab === 'abstract' ? abstractData : expenditureData}
            columns={activeReportTab === 'abstract' ? abstractExportColumns : expenditureExportColumns}
            fileName={activeReportTab === 'abstract' ? 'CSR_Abstract_Report' : 'CSR_Expenditure_Report'}
            title={activeReportTab === 'abstract' ? 'CSR Projects Abstract Summary' : 'CSR Fund Expenditure Summary'}
            triggerNotification={triggerNotification}
          />

          <button
            onClick={loadReports}
            title="Refresh Report"
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Report Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Abstract Report View */}
        {activeReportTab === 'abstract' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Organisation Name</th>
                  <th className="py-3.5 px-4 text-center">Approved by Board</th>
                  <th className="py-3.5 px-4 text-center">Yet to Start</th>
                  <th className="py-3.5 px-4 text-center">Under Implementation</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center font-black">Total Projects</th>
                  <th className="py-3.5 px-4 text-center w-24">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0f417a] mb-2" />
                      Generating abstract report...
                    </td>
                  </tr>
                ) : abstractData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      No report records available.
                    </td>
                  </tr>
                ) : (
                  abstractData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{row['S No'] || idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {row['Organisation Name'] || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {row['Approved by Board'] || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                        {row['Project yet to Start'] || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {row['Project Under implementation'] || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {row['Completed'] || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-slate-800 dark:text-slate-100 text-sm">
                        {row['Total Number of CSR Projects till date'] || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDrilldownOrg(row.organisationID, row['Organisation Name'])}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-[#0f417a] dark:text-blue-300 font-bold text-[11px] transition cursor-pointer mx-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Expenditure Report View */}
        {activeReportTab === 'expenditure' && (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0f417a] mb-2" />
                      Loading expenditure report...
                    </td>
                  </tr>
                ) : expenditureData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      No expenditure records available.
                    </td>
                  </tr>
                ) : (
                  expenditureData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {row.organisation_name || '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                        {row.financial_year || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.net_profit != null ? Number(row.net_profit).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#0f417a] dark:text-blue-400">
                        {row.csr_fund_alloted_year != null ? Number(row.csr_fund_alloted_year).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-400">
                        {row.opening_balance_csr != null ? Number(row.opening_balance_csr).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {row.project_expenditure != null ? Number(row.project_expenditure).toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {row.csr_fund_balance != null ? Number(row.csr_fund_balance).toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Drilldown Detailed Projects Modal */}
      {selectedOrgForDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-l-4 border-l-[#0f417a]">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  Organisation CSR Projects: {selectedOrgForDrilldown.orgName}
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">
                  Detailed drilldown of all projects reported by this organisation
                </p>
              </div>
              <button
                onClick={() => setSelectedOrgForDrilldown(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Table */}
            <div className="p-6">
              {loadingDrilldown ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0f417a] mb-2" />
                  Fetching detailed projects...
                </div>
              ) : detailedOrgProjects.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  No projects recorded for this organisation.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Project Name</th>
                        <th className="py-3 px-3">Financial Year</th>
                        <th className="py-3 px-3 text-right">Value (₹ Cr)</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-center">Physical %</th>
                        <th className="py-3 px-3 text-center">Financial %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailedOrgProjects.map((p, idx) => (
                        <tr key={p.csr_project_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {p.project_name}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-400">
                            {p.financial_year}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-800 dark:text-slate-100">
                            {p.project_value != null ? Number(p.project_value).toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.project_status || 'Yet to start'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                            {p.physical_progress != null ? `${p.physical_progress}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                            {p.financial_progress != null ? `${p.financial_progress}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrgForDrilldown(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
