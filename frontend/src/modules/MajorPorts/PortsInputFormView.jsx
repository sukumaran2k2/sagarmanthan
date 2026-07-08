import { useState } from 'react';
import { ChevronDown, Plus, Search, ArrowLeft } from 'lucide-react';

export default function PortsInputFormView({ userPermissions }) {
  const [subView, setSubView] = useState('list'); // 'list' or 'details'
  const [activeTab, setActiveTab] = useState('actuals'); // 'targets' or 'actuals'
  const [selectedFy, setSelectedFy] = useState('Show All');
  const [selectedMonth, setSelectedMonth] = useState('Show All');
  const [selectedOrg, setSelectedOrg] = useState('Show All');
  const [searchTerm, setSearchTerm] = useState('');

  // Main list data
  const formList = [
    { sno: 1, coding: 'K-1.1', desc: 'Financial Parameters for Major Ports' },
    { sno: 2, coding: 'K-2.1', desc: 'Traffic' },
    { sno: 3, coding: 'K-3.1', desc: 'Cruise and Passenger Traffic' },
    { sno: 4, coding: 'K-4.1', desc: 'Port Performance' },
    { sno: 5, coding: 'K-5.1', desc: 'Renewable Energy' }
  ];

  // Table data for Financial Parameters
  const tableData = [
    {
      sno: 1,
      org: 'Chennai Port Authority',
      fy: '2026-2027',
      month: 'May',
      opIncome: '100.52',
      opExpend: '51.12',
      totIncome: '101.22',
      totExpend: '92.32',
      opSurplus: '49.4',
      netSurplus: '8.9',
      opRatio: '50.86',
      handlingCost: '105.1',
      profitTonne: '101.56',
      profitTeu: '1455.69',
      profitDry: '0',
      profitBreak: '315.51',
      profitLiquid: '111.73'
    },
    {
      sno: 2,
      org: 'Cochin Port Authority',
      fy: '2026-2027',
      month: 'May',
      opIncome: '80.07',
      opExpend: '40.96',
      totIncome: '81.00',
      totExpend: '81.46',
      opSurplus: '39.11',
      netSurplus: '-0.46',
      opRatio: '51.16',
      handlingCost: '133.18',
      profitTonne: '133.59',
      profitTeu: '5036.9',
      profitDry: '5044.95',
      profitBreak: '31502.37',
      profitLiquid: '208.06'
    },
    {
      sno: 3,
      org: 'Kamarajar Port Limited',
      fy: '2026-2027',
      month: 'May',
      opIncome: '101.59',
      opExpend: '25.44',
      totIncome: '102.81',
      totExpend: '31.21',
      opSurplus: '76.15',
      netSurplus: '71.60',
      opRatio: '25.04',
      handlingCost: '57.88',
      profitTonne: '23.11',
      profitTeu: '4120.45',
      profitDry: '0.00',
      profitBreak: '12405.50',
      profitLiquid: '95.40'
    },
    {
      sno: 4,
      org: 'Deendayal Port Authority',
      fy: '2026-2027',
      month: 'May',
      opIncome: '112.50',
      opExpend: '45.10',
      totIncome: '115.00',
      totExpend: '110.20',
      opSurplus: '67.40',
      netSurplus: '5.20',
      opRatio: '40.08',
      handlingCost: '92.30',
      profitTonne: '88.10',
      profitTeu: '3120.10',
      profitDry: '2025.40',
      profitBreak: '15400.20',
      profitLiquid: '135.20'
    }
  ];

  const handleRowClick = (desc) => {
    if (desc === 'Financial Parameters for Major Ports') {
      setSubView('details');
    }
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {subView === 'list' ? (
        /* Form list view */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center border-b border-slate-100 pb-4">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide font-display">
              KPI - Major Ports (Input Forms)
            </h1>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-[#1d428a] text-white">
                  <th className="py-3.5 px-4 font-bold tracking-wider w-20">S.No.</th>
                  <th className="py-3.5 px-4 font-bold tracking-wider w-36">Coding</th>
                  <th className="py-3.5 px-4 font-bold tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {formList.map((item) => (
                  <tr 
                    key={item.coding} 
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500 font-medium">{item.sno}</td>
                    <td className="py-3 px-4 text-slate-800 font-bold font-mono">{item.coding}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleRowClick(item.desc)}
                        className={`text-left font-extrabold hover:text-blue-700 transition-colors cursor-pointer ${
                          item.desc === 'Financial Parameters for Major Ports' ? 'underline text-[#1d428a]' : 'text-slate-700'
                        }`}
                      >
                        {item.desc}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Details Grid View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Title row */}
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSubView('list')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Back to Input Forms"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight font-display">
                Financial Parameters for Major Ports
              </h1>
            </div>
            
            {/* Target vs Actual Switcher */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden self-start md:self-auto bg-slate-50 p-1">
              <button
                onClick={() => setActiveTab('targets')}
                className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                  activeTab === 'targets'
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Targets
              </button>
              <button
                onClick={() => setActiveTab('actuals')}
                className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                  activeTab === 'actuals'
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Actuals
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Financial Year */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Financial Year</label>
              <div className="relative">
                <select
                  value={selectedFy}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105"
                >
                  <option>Show All</option>
                  <option>2026-2027</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Month */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105"
                >
                  <option>Show All</option>
                  <option>May</option>
                  <option>June</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Organisation Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organisation Name</label>
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105"
                >
                  <option>Show All</option>
                  <option>Chennai Port Authority</option>
                  <option>Cochin Port Authority</option>
                  <option>Kamarajar Port Limited</option>
                  <option>Deendayal Port Authority</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table Controls and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex space-x-1">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">Copy</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">Excel</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">PDF</button>
              <div className="relative">
                <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer flex items-center gap-1">
                  <span>Column visibility</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Search Input and Add target Button */}
            <div className="flex items-center space-x-3 self-end md:self-auto">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Search:</span>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 text-xs pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-medium"
                  />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {(!userPermissions || userPermissions.add !== false) && (
                <button className="bg-[#2bab4f] hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer h-[30px]">
                  <Plus className="h-4 w-4" />
                  <span>Add target</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="overflow-x-auto border border-slate-150 rounded-xl max-w-full">
            <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700 whitespace-nowrap">
              <thead>
                <tr className="bg-[#1d428a] text-white">
                  <th className="py-3 px-3.5 border-r border-white/10 text-center font-bold">S.No</th>
                  <th className="py-3 px-3.5 border-r border-white/10 font-bold">Organisation</th>
                  <th className="py-3 px-3.5 border-r border-white/10 font-bold">Financial Year</th>
                  <th className="py-3 px-3.5 border-r border-white/10 font-bold">Month</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Income (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Expenditure (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Total Income (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Total Expenditure (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Surplus (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Net Surplus (In Cr.)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Ratio (%)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Per Tonne Handling Cost (In Rupees)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Profit / Tonne (in INR Crs/Tonne)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Profit / TEU of Container (in INR Crs/TEU)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Profit / Tonne of Dry Bulk (in INR Crs/Tonne)</th>
                  <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Operating Profit / Tonne of Break Bulk (in INR Crs/Tonne)</th>
                  <th className="py-3 px-3.5 text-right font-bold">Operating Profit / Tonne of Liquid Bulk (in INR Crs/Tonne)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {tableData
                  .filter(row => {
                    const matchFy = selectedFy === 'Show All' || row.fy === selectedFy;
                    const matchMonth = selectedMonth === 'Show All' || row.month === selectedMonth;
                    const matchOrg = selectedOrg === 'Show All' || row.org === selectedOrg;
                    const matchSearch = searchTerm === '' || 
                      row.org.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchFy && matchMonth && matchOrg && matchSearch;
                  })
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 border-r border-slate-150 text-center font-medium text-slate-500">{row.sno}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-slate-800 font-extrabold">{row.org}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-slate-500">{row.fy}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-slate-500">{row.month}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.opIncome}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.opExpend}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.totIncome}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.totExpend}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.opSurplus}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.netSurplus}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.opRatio}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.handlingCost}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.profitTonne}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.profitTeu}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.profitDry}</td>
                      <td className="py-3.5 px-3 border-r border-slate-150 text-right font-bold text-slate-800">{row.profitBreak}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">{row.profitLiquid}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
