import { useState } from 'react';
import { ChevronDown, Search, ArrowLeft } from 'lucide-react';

export default function PortsReports({ headerNav }) {
  const [subView, setSubView] = useState('list'); // 'list' or 'details'
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFy, setSelectedFy] = useState('Show All');
  const [selectedMonth, setSelectedMonth] = useState('Show All');
  const [selectedOrg, setSelectedOrg] = useState('Show All');

  const reportStructure = [
    { sno: '1', coding: '', desc: 'Financial Report', isCategory: true, clickable: true, id: 'financial' },
    { sno: '2', coding: '', desc: 'Traffic Reports', isCategory: true, clickable: false },
    { sno: '', coding: 'K1.1.1', desc: 'Abstract - Total Traffic (in MMT)', isLink: true, id: 'traffic-total' },
    { sno: '', coding: 'K1.1.1a', desc: 'Abstract - Container Traffic (in TEUs)', isLink: true, id: 'traffic-container' },
    { sno: '3', coding: '', desc: 'Cruise and Passenger Traffic Reports', isCategory: true, clickable: false },
    { sno: '', coding: 'K1.10.1', desc: 'Abstract - Cruise Traffic (in Number of Calls)', isLink: true, id: 'cruise-calls' },
    { sno: '', coding: 'K1.10.2', desc: 'Trend Cruise Traffic (in Number of Calls) - Calendar Month Wise', isLink: true, id: 'cruise-trend' },
    { sno: '', coding: 'K1.10.3', desc: 'Cruise Traffic (in Number of Calls) - Year Wise', isLink: true, id: 'cruise-year' },
    { sno: '', coding: 'K1.11.1', desc: 'Abstract - Ferry Traffic (in Number of Calls)', isLink: true, id: 'ferry-calls' },
    { sno: '', coding: 'K1.11.2', desc: 'Trend Ferry Traffic (in Number of Calls) - Calendar Month Wise', isLink: true, id: 'ferry-trend' },
    { sno: '', coding: 'K1.11.3', desc: 'Ferry Traffic (in Number of Calls) - Year Wise', isLink: true, id: 'ferry-year' },
    { sno: '4', coding: '', desc: 'Port Performance Reports', isCategory: true, clickable: false },
    { sno: '', coding: 'K1.2.1', desc: 'Abstract - Vessel Turnaround Time (in Hours)', isLink: true, id: 'vessel-tat' },
    { sno: '', coding: 'K1.2.2', desc: 'Trend - Vessel Turnaround Time (in Hours) - Calendar Month Wise', isLink: true, id: 'vessel-tat-trend' },
    { sno: '', coding: 'K1.2.3', desc: 'Vessel Turnaround Time - Year Wise', isLink: true, id: 'vessel-tat-year' },
    { sno: '', coding: 'K1.3.1', desc: 'Abstract - Dwell Time - Import Cycle (in Hours)', isLink: true, id: 'dwell-import' }
  ];

  // Financial parameters data
  const financialData = [
    { sno: 1, org: 'Chennai Port Authority', fy: '2026-2027', month: 'May', opIncome: '100.52', opExpend: '51.12', totIncome: '101.22', totExpend: '92.32', opSurplus: '49.40', netSurplus: '8.90', opRatio: '50.86', handlingCost: '105.10' },
    { sno: 2, org: 'Cochin Port Authority', fy: '2026-2027', month: 'May', opIncome: '80.07', opExpend: '40.96', totIncome: '81.00', totExpend: '81.46', opSurplus: '39.11', netSurplus: '-0.46', opRatio: '51.16', handlingCost: '133.18' },
    { sno: 3, org: 'Kamarajar Port Limited', fy: '2026-2027', month: 'May', opIncome: '101.59', opExpend: '25.44', totIncome: '102.81', totExpend: '31.21', opSurplus: '76.15', netSurplus: '71.60', opRatio: '25.04', handlingCost: '57.88' },
    { sno: 4, org: 'Deendayal Port Authority', fy: '2026-2027', month: 'May', opIncome: '112.50', opExpend: '45.10', totIncome: '115.00', totExpend: '110.20', opSurplus: '67.40', netSurplus: '5.20', opRatio: '40.08', handlingCost: '92.30' }
  ];

  // Traffic reports data
  const trafficData = [
    { sno: 1, org: 'Chennai Port Authority', fy: '2026-2027', month: 'May', target: '4.50', actual: '4.22', growth: '-6.22%', containerTeu: '138200' },
    { sno: 2, org: 'Cochin Port Authority', fy: '2026-2027', month: 'May', target: '3.10', actual: '3.25', growth: '4.83%', containerTeu: '65400' },
    { sno: 3, org: 'Kamarajar Port Limited', fy: '2026-2027', month: 'May', target: '4.00', actual: '4.15', growth: '3.75%', containerTeu: '48900' },
    { sno: 4, org: 'Deendayal Port Authority', fy: '2026-2027', month: 'May', target: '11.50', actual: '11.85', growth: '3.04%', containerTeu: '41200' }
  ];

  // Cruise and Performance data
  const performanceData = [
    { sno: 1, org: 'Chennai Port Authority', fy: '2026-2027', month: 'May', cruiseCalls: '4', ferryCalls: '12', vesselTat: '32.5', dwellImport: '48.2' },
    { sno: 2, org: 'Cochin Port Authority', fy: '2026-2027', month: 'May', cruiseCalls: '8', ferryCalls: '28', vesselTat: '28.1', dwellImport: '36.5' },
    { sno: 3, org: 'Kamarajar Port Limited', fy: '2026-2027', month: 'May', cruiseCalls: '0', ferryCalls: '0', vesselTat: '22.4', dwellImport: '41.0' },
    { sno: 4, org: 'Deendayal Port Authority', fy: '2026-2027', month: 'May', cruiseCalls: '2', ferryCalls: '5', vesselTat: '44.8', dwellImport: '52.4' }
  ];

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setSubView('details');
  };

  const getFilteredData = () => {
    const data = selectedReport?.id === 'financial' 
      ? financialData 
      : (selectedReport?.id.startsWith('traffic') ? trafficData : performanceData);

    return data.filter(row => {
      const matchFy = selectedFy === 'Show All' || row.fy === selectedFy;
      const matchMonth = selectedMonth === 'Show All' || row.month === selectedMonth;
      const matchOrg = selectedOrg === 'Show All' || row.org === selectedOrg;
      const matchSearch = searchTerm === '' || row.org.toLowerCase().includes(searchTerm.toLowerCase());
      return matchFy && matchMonth && matchOrg && matchSearch;
    });
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {subView === 'list' ? (
        /* Reports Index Table View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide font-display uppercase">
              KPI - Major Ports (Output Reports)
            </h1>
            {headerNav}
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-[#1d428a] text-white">
                  <th className="py-3 px-4 font-bold tracking-wider w-20">S.No.</th>
                  <th className="py-3 px-4 font-bold tracking-wider w-36">Coding</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {reportStructure.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${
                      item.isCategory && !item.clickable ? 'bg-slate-50/80' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-slate-500 font-bold">{item.sno}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-bold font-mono">{item.coding}</td>
                    <td className="py-2.5 px-4">
                      {item.isCategory && !item.clickable ? (
                        <span className="font-extrabold text-slate-900">{item.desc}</span>
                      ) : (
                        <button
                          onClick={() => handleReportClick(item)}
                          className={`text-left font-extrabold hover:text-blue-700 transition-colors cursor-pointer underline text-[#1d428a]`}
                        >
                          {item.desc}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed Report Data Table View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          {/* Header Row */}
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  setSubView('list');
                  setSelectedReport(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Back to Reports"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight font-display">
                {selectedReport?.desc}
              </h1>
            </div>
            {headerNav}
          </div>

          {/* Filters */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Financial Year</label>
              <div className="relative">
                <select
                  value={selectedFy}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option>Show All</option>
                  <option>2026-2027</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option>Show All</option>
                  <option>May</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organisation Name</label>
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
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

          {/* Table Actions and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex space-x-1">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">Copy</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">Excel</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-650 transition cursor-pointer">PDF</button>
            </div>

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
          </div>

          {/* Table Rendering based on Report Type */}
          <div className="overflow-x-auto border border-slate-150 rounded-xl max-w-full">
            {selectedReport?.id === 'financial' ? (
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
                    <th className="py-3 px-3.5 text-right font-bold">Per Tonne Handling Cost (In Rupees)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {getFilteredData().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 border-r border-slate-150 text-center font-medium text-slate-500">{row.sno}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-800 font-extrabold">{row.org}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.fy}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.month}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.opIncome}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.opExpend}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.totIncome}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.totExpend}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.opSurplus}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.netSurplus}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.opRatio}</td>
                      <td className="py-3 px-3.5 text-right font-bold text-slate-800">{row.handlingCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : selectedReport?.id.startsWith('traffic') ? (
              <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700 whitespace-nowrap">
                <thead>
                  <tr className="bg-[#1d428a] text-white">
                    <th className="py-3 px-3.5 border-r border-white/10 text-center font-bold">S.No</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Organisation</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Financial Year</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Month</th>
                    {selectedReport.id === 'traffic-container' ? (
                      <th className="py-3 px-3.5 text-right font-bold">Container Traffic (in TEUs)</th>
                    ) : (
                      <>
                        <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Target Traffic (MMT)</th>
                        <th className="py-3 px-3.5 border-r border-white/10 text-right font-bold">Actual Traffic (MMT)</th>
                        <th className="py-3 px-3.5 text-right font-bold">YoY Growth (%)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {getFilteredData().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 border-r border-slate-150 text-center font-medium text-slate-500">{row.sno}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-800 font-extrabold">{row.org}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.fy}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.month}</td>
                      {selectedReport.id === 'traffic-container' ? (
                        <td className="py-3 px-3.5 text-right font-bold text-slate-800">{row.containerTeu}</td>
                      ) : (
                        <>
                          <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.target}</td>
                          <td className="py-3 px-3.5 border-r border-slate-150 text-right font-bold text-slate-800">{row.actual}</td>
                          <td className={`py-3 px-3.5 text-right font-black ${row.growth.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'}`}>{row.growth}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700 whitespace-nowrap">
                <thead>
                  <tr className="bg-[#1d428a] text-white">
                    <th className="py-3 px-3.5 border-r border-white/10 text-center font-bold">S.No</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Organisation</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Financial Year</th>
                    <th className="py-3 px-3.5 border-r border-white/10 font-bold">Month</th>
                    {selectedReport?.id.startsWith('cruise') ? (
                      <th className="py-3 px-3.5 text-right font-bold">Cruise Calls (Nos)</th>
                    ) : selectedReport?.id.startsWith('ferry') ? (
                      <th className="py-3 px-3.5 text-right font-bold">Ferry Calls (Nos)</th>
                    ) : selectedReport?.id.startsWith('vessel-tat') ? (
                      <th className="py-3 px-3.5 text-right font-bold">Vessel Turnaround Time (in Hours)</th>
                    ) : (
                      <th className="py-3 px-3.5 text-right font-bold">Dwell Time - Import Cycle (in Hours)</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {getFilteredData().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 border-r border-slate-150 text-center font-medium text-slate-500">{row.sno}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-800 font-extrabold">{row.org}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.fy}</td>
                      <td className="py-3 px-3.5 border-r border-slate-150 text-slate-500">{row.month}</td>
                      <td className="py-3 px-3.5 text-right font-bold text-slate-800">
                        {selectedReport?.id.startsWith('cruise') ? row.cruiseCalls :
                         selectedReport?.id.startsWith('ferry') ? row.ferryCalls :
                         selectedReport?.id.startsWith('vessel-tat') ? row.vesselTat : row.dwellImport}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
