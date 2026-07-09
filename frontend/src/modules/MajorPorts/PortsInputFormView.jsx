import { useState } from 'react';
import { ChevronDown, Plus, Search, ArrowLeft } from 'lucide-react';
import Table from '../../components/Table';

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
      profitTonne: '65.21',
      profitTeu: '1211.51',
      profitDry: '0',
      profitBreak: '241.12',
      profitLiquid: '89.15'
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
      netSurplus: '71.6',
      opRatio: '25.04',
      handlingCost: '57.88',
      profitTonne: '185.12',
      profitTeu: '0',
      profitDry: '151.12',
      profitBreak: '98.54',
      profitLiquid: '162.24'
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
      profitTonne: '110.25',
      profitTeu: '990.15',
      profitDry: '78.50',
      profitBreak: '190.20',
      profitLiquid: '105.40'
    }
  ];

  const handleRowClick = (desc) => {
    if (desc === 'Financial Parameters for Major Ports') {
      setSubView('details');
    }
  };

  const listColDefs = [
    { headerName: 'S.No.', field: 'sno', width: 100, cellClass: 'text-slate-500 font-bold' },
    { headerName: 'Coding', field: 'coding', width: 150, cellClass: 'text-slate-800 font-bold font-mono' },
    {
      headerName: 'Description',
      field: 'desc',
      flex: 1,
      cellRenderer: (params) => {
        const desc = params.value;
        const isClickable = desc === 'Financial Parameters for Major Ports';
        return (
          <button
            onClick={() => handleRowClick(desc)}
            className={`text-left font-extrabold hover:text-blue-700 transition-colors cursor-pointer ${
              isClickable ? 'underline text-[#1d428a]' : 'text-slate-700'
            }`}
          >
            {desc}
          </button>
        );
      }
    }
  ];

  const detailColDefs = [
    { headerName: 'S.No', field: 'sno', width: 80, pinned: 'left' },
    { headerName: 'Organisation', field: 'org', width: 220, pinned: 'left', cellClass: 'font-extrabold text-slate-800' },
    { headerName: 'Financial Year', field: 'fy', width: 120 },
    { headerName: 'Month', field: 'month', width: 100 },
    { headerName: 'Operating Income (In Cr.)', field: 'opIncome', width: 180 },
    { headerName: 'Operating Expenditure (In Cr.)', field: 'opExpend', width: 200 },
    { headerName: 'Total Income (In Cr.)', field: 'totIncome', width: 160 },
    { headerName: 'Total Expenditure (In Cr.)', field: 'totExpend', width: 180 },
    { headerName: 'Operating Surplus (In Cr.)', field: 'opSurplus', width: 180 },
    { headerName: 'Net Surplus (In Cr.)', field: 'netSurplus', width: 150 },
    { headerName: 'Operating Ratio (%)', field: 'opRatio', width: 150 },
    { headerName: 'Per Tonne Handling Cost (In Rupees)', field: 'handlingCost', width: 230 },
    { headerName: 'Operating Profit / Tonne (in INR Crs/Tonne)', field: 'profitTonne', width: 260 },
    { headerName: 'Operating Profit / TEU of Container (in INR Crs/TEU)', field: 'profitTeu', width: 310 },
    { headerName: 'Operating Profit / Tonne of Dry Bulk (in INR Crs/Tonne)', field: 'profitDry', width: 310 },
    { headerName: 'Operating Profit / Tonne of Break Bulk (in INR Crs/Tonne)', field: 'profitBreak', width: 320 },
    { headerName: 'Operating Profit / Tonne of Liquid Bulk (in INR Crs/Tonne)', field: 'profitLiquid', width: 320 }
  ];

  const filteredDetailsData = tableData.filter(row => {
    const matchFy = selectedFy === 'Show All' || row.fy === selectedFy;
    const matchMonth = selectedMonth === 'Show All' || row.month === selectedMonth;
    const matchOrg = selectedOrg === 'Show All' || row.org === selectedOrg;
    const matchSearch = searchTerm === '' || 
      row.org.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFy && matchMonth && matchOrg && matchSearch;
  });

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

          <CommonTable 
            rowData={formList}
            columnDefs={listColDefs}
            rowHeight={46}
            headerHeight={38}
            autoSize={true}
          />
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
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
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
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
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
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
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
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">Copy</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">Excel</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">PDF</button>
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

          <Table 
            rowData={filteredDetailsData}
            columnDefs={detailColDefs}
            rowHeight={46}
            headerHeight={38}
            autoSize={false}
          />
        </div>
      )}

    </div>
  );
}
