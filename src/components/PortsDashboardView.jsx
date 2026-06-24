import { useState } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  Ship, 
  Coins, 
  CreditCard, 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Percent, 
  Scale 
} from 'lucide-react';

export default function PortsDashboardView() {
  const [activeTab, setActiveTab] = useState('traffic'); // 'traffic' or 'financial'
  const [org, setOrg] = useState('All Organisations');
  const [fy, setFy] = useState('');
  const [month, setMonth] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    traffic: false,
    vessel: false,
    cargo: false,
    turnaround: false
  });

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Traffic & Cargo Data
  const trafficData = {
    title: '1. Traffic & Cargo',
    sub: 'Overview of traffic and throughput',
    cards: [
      {
        title: 'Total Traffic (In MMT)',
        headerBg: 'bg-[#0b5394]',
        data: [
          { label: 'FY26-27 (YTD)', value: '153.389' },
          { label: 'FY25-26 (YTD)', value: '146.44' }
        ],
        yoy: { value: '4.75%', positive: true }
      },
      {
        title: 'OSBD - Overall (In Tonnes)',
        headerBg: 'bg-[#e67e22]',
        data: [
          { label: 'FY26-27 (YTD)', value: '20276' },
          { label: 'FY25-26 (YTD)', value: '19697' }
        ],
        yoy: { value: '2.94%', positive: true }
      }
    ]
  };

  // Vessel Performance Data
  const vesselData = {
    title: '2. Vessel Performance',
    sub: 'Turnaround time and dwell performance',
    cards: [
      {
        title: 'Average TRT - Overall (In Hours)',
        headerBg: 'bg-[#27ae60]',
        data: [
          { label: 'FY26-27 (YTD)', value: '47.15' },
          { label: 'FY25-26 (YTD)', value: '47.04' }
        ],
        yoy: { value: '0.25%', positive: false } // TRT increase is negative
      },
      {
        title: 'Median TRT - Overall (In Hours)',
        headerBg: 'bg-[#7f8c8d]',
        data: [
          { label: 'FY26-27 (YTD)', value: '71.76' },
          { label: 'FY25-26 (YTD)', value: '63.36' }
        ],
        yoy: { value: '13.26%', positive: false }
      },
      {
        title: 'Import Dwell (In Hours)',
        headerBg: 'bg-[#2980b9]',
        data: [
          { label: 'FY26-27 (YTD)', value: '64.10' },
          { label: 'FY25-26 (YTD)', value: '46.03' }
        ],
        yoy: { value: '39.28%', positive: false }
      },
      {
        title: 'Export Dwell (In Hours)',
        headerBg: 'bg-[#1abc9c]',
        data: [
          { label: 'FY26-27 (YTD)', value: '98.86' },
          { label: 'FY25-26 (YTD)', value: '92.43' }
        ],
        yoy: { value: '6.96%', positive: false }
      }
    ]
  };

  // Cargo Handling Productivity
  const cargoData = {
    title: '3. Cargo Handling Productivity',
    sub: 'Cargo handling efficiency in Tons/Min',
    sections: [
      {
        title: 'Loading Efficiency',
        cards: [
          {
            title: 'Gross Crane Productivity (Moves/Hr)',
            headerBg: 'bg-[#0b5394]',
            data: [
              { label: 'FY26-27 (YTD)', value: '25.64' },
              { label: 'FY25-26 (YTD)', value: '25.71' }
            ],
            yoy: { value: '0.29%', positive: false } // Productivity decrease is negative
          },
          {
            title: 'Loading Dry Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#e67e22]',
            data: [
              { label: 'FY26-27 (YTD)', value: '24.55' },
              { label: 'FY25-26 (YTD)', value: '26.50' }
            ],
            yoy: { value: '7.38%', positive: false }
          },
          {
            title: 'Loading Break Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#27ae60]',
            data: [
              { label: 'FY26-27 (YTD)', value: '3.34' },
              { label: 'FY25-26 (YTD)', value: '3.76' }
            ],
            yoy: { value: '11.19%', positive: false }
          },
          {
            title: 'Loading Liquid Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#3498db]',
            data: [
              { label: 'FY26-27 (YTD)', value: '11.43' },
              { label: 'FY25-26 (YTD)', value: '13.07' }
            ],
            yoy: { value: '12.6%', positive: false }
          }
        ]
      },
      {
        title: 'UnLoading Efficiency',
        cards: [
          {
            title: 'Unloading Dry Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#27ae60]',
            data: [
              { label: 'FY26-27 (YTD)', value: '14.51' },
              { label: 'FY25-26 (YTD)', value: '12.99' }
            ],
            yoy: { value: '11.67%', positive: true }
          },
          {
            title: 'Unloading Break Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#7f8c8d]',
            data: [
              { label: 'FY26-27 (YTD)', value: '3.94' },
              { label: 'FY25-26 (YTD)', value: '3.81' }
            ],
            yoy: { value: '3.52%', positive: true }
          },
          {
            title: 'Unloading Liquid Bulk Efficiency (Tons/Min)',
            headerBg: 'bg-[#3498db]',
            data: [
              { label: 'FY26-27 (YTD)', value: '24.75' },
              { label: 'FY25-26 (YTD)', value: '24.61' }
            ],
            yoy: { value: '0.56%', positive: true }
          }
        ]
      }
    ]
  };

  const renderCard = (card, idx) => {
    return (
      <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        {/* Card Header Banner */}
        <div className={`${card.headerBg} text-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5`}>
          <Ship className="h-3.5 w-3.5 opacity-90" />
          <span>{card.title}</span>
        </div>
        {/* Card Body */}
        <div className="p-4 space-y-3">
          {card.data.map((item, id) => (
            <div key={id} className="flex justify-between items-baseline border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
              <span className="text-sm font-extrabold text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
        {/* Card Footer YoY */}
        {card.yoy && (
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">YoY</span>
            <span className={`font-bold flex items-center gap-0.5 ${card.yoy.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {card.yoy.positive ? '▲' : '▲'} {card.yoy.value}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Header Panel with Sub-navigation and Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        {/* Top Row: Title and Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-wide font-display uppercase">
              KPI Traffic & Port Performance Dashboard
            </h1>
          </div>
          
          {/* Tab Switcher buttons */}
          <div className="flex space-x-1 border border-slate-200 rounded-xl overflow-hidden self-start md:self-auto shadow-sm bg-white p-1">
            <button
              onClick={() => setActiveTab('traffic')}
              className={`px-4.5 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                activeTab === 'traffic'
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Traffic & Port Performance Dashboard
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-4.5 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                activeTab === 'financial'
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Financial Dashboard
            </button>
          </div>
        </div>

        {/* Bottom Row: Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Dropdown 1: Organisation */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Organisation</label>
            <div className="relative">
              <select
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-semibold text-slate-800"
              >
                <option>All Organisations</option>
                <option>JNPA</option>
                <option>DePA</option>
                <option>VOCPA</option>
                <option>CoPA</option>
              </select>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                <CheckCircle2 className="h-4 w-4 fill-emerald-105" />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Dropdown 2: Financial Year */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Financial Year</label>
            <div className="relative">
              <select
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-500"
              >
                <option value="">--Select Financial year--</option>
                <option value="2026-27">FY 2026-27</option>
                <option value="2025-26">FY 2025-26</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Dropdown 3: Month */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
            <div className="relative">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-500"
              >
                <option value="">Select Month</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'traffic' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-8">
          {/* Section 1. Traffic & Cargo */}
          <div className="space-y-4">
            <div 
              onClick={() => toggleSection('traffic')}
              className="flex justify-between items-center cursor-pointer select-none pb-1"
            >
              <div>
                <h2 className="text-sm font-extrabold text-slate-905 tracking-tight font-display">{trafficData.title}</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{trafficData.sub}</p>
              </div>
              <ChevronDown className={`h-4.5 w-4.5 text-blue-600 transition-transform duration-200 ${collapsedSections.traffic ? '-rotate-90 text-slate-400' : ''}`} />
            </div>
            {!collapsedSections.traffic && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-1 animate-fade-in">
                {trafficData.cards.map((card, idx) => renderCard(card, idx))}
              </div>
            )}
          </div>

          {/* Section 2. Vessel Performance */}
          <div className="space-y-4">
            <div 
              onClick={() => toggleSection('vessel')}
              className="flex justify-between items-center cursor-pointer select-none pb-1"
            >
              <div>
                <h2 className="text-sm font-extrabold text-slate-905 tracking-tight font-display">{vesselData.title}</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{vesselData.sub}</p>
              </div>
              <ChevronDown className={`h-4.5 w-4.5 text-blue-600 transition-transform duration-200 ${collapsedSections.vessel ? '-rotate-90 text-slate-400' : ''}`} />
            </div>
            {!collapsedSections.vessel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-1 animate-fade-in">
                {vesselData.cards.map((card, idx) => renderCard(card, idx))}
              </div>
            )}
          </div>

          {/* Section 3. Cargo Handling Productivity */}
          <div className="space-y-4">
            <div 
              onClick={() => toggleSection('cargo')}
              className="flex justify-between items-center cursor-pointer select-none pb-1"
            >
              <div>
                <h2 className="text-sm font-extrabold text-slate-905 tracking-tight font-display">{cargoData.title}</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{cargoData.sub}</p>
              </div>
              <ChevronDown className={`h-4.5 w-4.5 text-blue-600 transition-transform duration-200 ${collapsedSections.cargo ? '-rotate-90 text-slate-400' : ''}`} />
            </div>
            {!collapsedSections.cargo && (
              <div className="space-y-6 pt-1 animate-fade-in">
                {cargoData.sections.map((sect, sId) => (
                  <div key={sId} className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase border-l-3 border-[#3b5998] pl-2">{sect.title}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {sect.cards.map((card, idx) => renderCard(card, idx))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4. Median Turnaround Time */}
          <div className="space-y-4">
            <div 
              onClick={() => toggleSection('turnaround')}
              className="flex justify-between items-center cursor-pointer select-none pb-1"
            >
              <div>
                <h2 className="text-sm font-extrabold text-slate-905 tracking-tight font-display">4. Median Turnaround Time</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Turnaround time statistics</p>
              </div>
              <ChevronDown className={`h-4.5 w-4.5 text-blue-600 transition-transform duration-200 ${collapsedSections.turnaround ? '-rotate-90 text-slate-400' : ''}`} />
            </div>
            {!collapsedSections.turnaround && (
              <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-8 text-center text-slate-400 font-semibold text-xs shadow-inner animate-fade-in">
                Median Turnaround Time visualization dashboard rendering...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Financial Dashboard View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: KPI Cards Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Cards Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4.5">
              {/* Card 1: Operating Income */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <Coins className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Operating Income (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">4,014.51</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">3478.36</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-emerald-600 flex items-center">▲ 15.41%</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Operating Expenditure */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <CreditCard className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Operating Expenditure (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">1550.5</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">1535.04</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-rose-600 flex items-center">▲ 1.01%</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Income */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <Wallet className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Total Income (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">4,387.73</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">3,806.13</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-rose-600 flex items-center">▲ 15.28%</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Total Expenditure */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <DollarSign className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Total Expenditure (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">2474.97</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">2378.96</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-rose-600 flex items-center">▲ 4.04%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4.5">
              {/* Card 5: Operating Surplus */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Operating Surplus (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">2463.09</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">1943.32</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-emerald-600 flex items-center">▲ 26.75%</span>
                  </div>
                </div>
              </div>

              {/* Card 6: Net Surplus */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <Activity className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Net Surplus (In Cr.)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">1912.76</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">1427.17</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-emerald-600 flex items-center">▲ 34.02%</span>
                  </div>
                </div>
              </div>

              {/* Card 7: Operating Ratio */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <Percent className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Operating Ratio (%)</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">43.18</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">47.69</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-rose-600 flex items-center">▼ 9.44%</span>
                  </div>
                </div>
              </div>

              {/* Card 8: Per Tonne Cost */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-[#0f417a] text-white h-14 px-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-wider">
                  <Scale className="h-4 w-4 text-sky-200 flex-shrink-0" />
                  <span>Per Tonne Handling Cost</span>
                </div>
                <div className="p-4.5 text-center space-y-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current FY (YTD)</span>
                    <h3 className="text-xl font-black text-slate-800">2957.16</h3>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last FY (YTD)</span>
                    <h4 className="text-sm font-bold text-slate-500">2961.03</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-center items-center space-x-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">YoY</span>
                    <span className="text-xs font-black text-rose-600 flex items-center">▼ 0.13%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Performance Charts and Selectors */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 flex flex-col justify-start">
            {/* KPI Selectors */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">KPI Selector</label>
                <select className="w-full text-[10px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg appearance-none font-medium text-slate-500">
                  <option>--Select KPI--</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Fin. Year</label>
                <select className="w-full text-[10px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg appearance-none font-medium text-slate-500">
                  <option>--Select FY--</option>
                </select>
              </div>
            </div>

            {/* Top Performing Ports Chart */}
            <div className="space-y-2">
              <div className="bg-orange-100 text-orange-950 text-center font-bold text-[10px] py-1 rounded">
                Top Performing Ports (YoY %)
              </div>
              <div className="relative border border-slate-100 rounded-xl p-3 h-[180px] flex items-end justify-around bg-slate-50/50">
                {/* Visual grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-3 opacity-30">
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                </div>

                {/* Bars */}
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-307.5%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[50px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">MoPA</span>
                </div>
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-383.9%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[75px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">KDS</span>
                </div>
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-537.2%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[110px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">CoPA</span>
                </div>
              </div>
            </div>

            {/* Least Performing Ports Chart */}
            <div className="space-y-2">
              <div className="bg-orange-100 text-orange-950 text-center font-bold text-[10px] py-1 rounded">
                Least Performing Ports (YoY %)
              </div>
              <div className="relative border border-slate-100 rounded-xl p-3 h-[180px] flex items-end justify-around bg-slate-50/50">
                {/* Visual grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-3 opacity-30">
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                </div>

                {/* Bars */}
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-2905%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[120px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">JNPA</span>
                </div>
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-2313%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[95px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">DPA</span>
                </div>
                <div className="flex flex-col items-center z-10 w-1/4">
                  <span className="text-[9px] font-bold text-rose-600 mb-1">-5.2%</span>
                  <div className="w-6 bg-rose-500/90 hover:bg-rose-600 transition-colors rounded-b-sm h-[10px] shadow-sm"></div>
                  <span className="text-[9px] font-bold text-slate-600 mt-1">PPA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
