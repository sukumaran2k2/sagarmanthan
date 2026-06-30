import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';

const REPORT_ROWS = [
  { id: 1, wing: 'Administration', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 2, wing: 'Coord-I', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 3, wing: 'Coord-II', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 4, wing: 'Development', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 5, wing: 'DGLL, Parliament & TRW', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 6, wing: 'Finance', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 7, wing: 'Information Technology', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 8, wing: 'IWT', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 9, wing: 'Office of Economic Advisor', total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0 },
  { id: 10, wing: 'Ports', total: 10, prep: 0, appMin: 0, circIMC: 0, imcRec: 1, prepFinal: 0, appFinal: 0, advPMO: 6, appCab: 2, hold: 0, comp: 1 },
  { id: 11, wing: 'Sagarmala', total: 2, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 2, hold: 0, comp: 0 },
  { id: 12, wing: 'Shipping', total: 2, prep: 2, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 1, hold: 0, comp: 0 },
  { id: 13, wing: 'Special Initiatives & Projects', total: 1, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 1, hold: 0, comp: 0 }
];

export default function CabinetNotesReports() {
  const [selectedWing, setSelectedWing] = useState('All');
  const [notification, setNotification] = useState(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter rows
  const filteredRows = useMemo(() => {
    if (selectedWing === 'All') return REPORT_ROWS;
    return REPORT_ROWS.filter(r => r.wing === selectedWing);
  }, [selectedWing]);

  // Aggregate totals
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => {
      acc.total += r.total;
      acc.prep += r.prep;
      acc.appMin += r.appMin;
      acc.circIMC += r.circIMC;
      acc.imcRec += r.imcRec;
      acc.prepFinal += r.prepFinal;
      acc.appFinal += r.appFinal;
      acc.advPMO += r.advPMO;
      acc.appCab += r.appCab;
      acc.hold += r.hold;
      acc.comp += r.comp;
      return acc;
    }, {
      total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0
    });
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in animate-pulse">
          <div className="p-1 bg-emerald-550 rounded-lg">
            <Check className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Unified Header & Filter Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-100 pb-4 mb-2">
        {/* Left Side: Report Title & Dates */}
        <div className="space-y-1">
          <h2 className="text-sm font-black text-slate-900 font-display">
            Report No.: 6.1A - Abstract ( Wing Wise ) - Cabinet Notes MoPSW
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
            <span className="hidden sm:inline text-slate-350">•</span>
            <span className="text-slate-400">(Report for the Month - June 2026)</span>
          </div>
        </div>

        {/* Right Side: Filters & Exports Grouped */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {isReportExpanded ? (
            <>
              {/* Wing Select Box */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wing:</span>
                <div className="relative min-w-[160px]">
                  <select 
                    value={selectedWing}
                    onChange={(e) => setSelectedWing(e.target.value)}
                    className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All">--Show All--</option>
                    {REPORT_ROWS.map(r => <option key={r.id} value={r.wing}>{r.wing}</option>)}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => triggerNotification('Abstract Excel generated.')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Export to Excel</span>
                </button>
                <button 
                  onClick={() => triggerNotification('Abstract PDF generated.')}
                  className="px-3.5 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export to PDF</span>
                </button>
              </div>

              <button 
                onClick={() => setIsReportExpanded(false)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-250 shadow-sm transition cursor-pointer"
              >
                <span>Collapse</span>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsReportExpanded(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
            >
              <span>View Detailed Report</span>
            </button>
          )}
        </div>
      </div>

      {isReportExpanded ? (
        /* Table Container (Visible only when Expanded) */
        <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left text-slate-700 border-collapse">
              <thead>
                <tr className="bg-[#b33c56] text-white font-bold text-[10px] uppercase tracking-wider border-b border-[#962e43]">
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-12">S.No</th>
                  <th className="py-3 px-4 border-r border-[#962e43]/30">Wing</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">No. of Cabinet Notes</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Preliminary DCN Prepared</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Preliminary DCN Approved by Minister</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Circulated for IMC</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">IMC Comments Received</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Final DCN to be Prepared</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Final DCN Approved by Minister</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Advance Copy Sent to PMO & Cab</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-24">Approved by Cabinet</th>
                  <th className="py-3 px-3 text-center border-r border-[#962e43]/30 w-20">On Hold</th>
                  <th className="py-3 px-3 text-center w-20">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-bold">
                {filteredRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center border-r border-slate-150 text-slate-550">{idx + 1}</td>
                    <td className="py-3 px-4 border-r border-slate-100 text-blue-600 hover:underline cursor-pointer font-bold">{row.wing}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.total || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.prep || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.appMin || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.circIMC || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.imcRec || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.prepFinal || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.appFinal || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.advPMO || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.appCab || ''}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-100 text-slate-800">{row.hold || ''}</td>
                    <td className="py-3 px-3 text-center text-slate-800">{row.comp || ''}</td>
                  </tr>
                ))}
                
                {/* Total Footer Row */}
                <tr className="bg-slate-50 border-t-2 border-slate-200 text-slate-900 font-extrabold text-[12px]">
                  <td colSpan={2} className="py-3 px-4 text-center border-r border-slate-200">Total</td>
                  <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-100">{totals.total}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.prep || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.appMin || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.circIMC || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100 bg-slate-100">{totals.imcRec || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.prepFinal || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.appFinal || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-100">{totals.advPMO || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-250 bg-slate-100">{totals.appCab || ''}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-100">{totals.hold || ''}</td>
                  <td className="py-3 px-3 text-center">{totals.comp || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Charts Visualization Row (Visible only when Collapsed) */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in pt-4">
          
          {/* Left SVG Bar Chart (Wing-wise distribution) */}
          <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cabinet Notes by Wing</h3>
            <div className="space-y-3.5 pt-2">
              {REPORT_ROWS.filter(r => r.total > 0).map((row, idx) => {
                const percent = (row.total / totals.total) * 100;
                const gradientClass = 
                  idx === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                  idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                  idx === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                  'bg-gradient-to-r from-rose-500 to-pink-500';
                return (
                  <div key={row.id} className="space-y-1 font-semibold">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{row.wing}</span>
                      <span>{row.total} Notes ({Math.round(percent)}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${gradientClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Donut Chart (Status breakdown) */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Workflow Status Breakdown</h3>
            
            <div className="flex items-center justify-around py-3">
              {/* SVG circular progress representation */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 1: Approved (40% - strokeDasharray="40 100") */}
                  <circle className="text-emerald-500" strokeWidth="3.5" strokeDasharray="40 100" strokeDashoffset="0" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 2: PMO copy (40% - strokeDasharray="40 100" offset by 40) */}
                  <circle className="text-blue-600" strokeWidth="3.5" strokeDasharray="40 100" strokeDashoffset="-40" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 3: Draft (20% - strokeDasharray="20 100" offset by 80) */}
                  <circle className="text-amber-500" strokeWidth="3.5" strokeDasharray="20 100" strokeDashoffset="-80" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                </svg>
                
                {/* Central Text inside donut */}
                <div className="absolute text-center">
                  <p className="text-lg font-black text-slate-900 leading-none">{totals.total}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total DCN</p>
                </div>
              </div>

              {/* Legend list */}
              <div className="space-y-2 font-semibold text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span>Approved: <strong>{totals.appCab}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                  <span>PMO Review: <strong>{totals.advPMO}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span>Draft & IMC: <strong>{totals.prep + totals.imcRec}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 font-semibold border-t border-slate-200/60 pt-2.5 mt-2">
              Real-time tracking of Cabinet note clearance stages
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
