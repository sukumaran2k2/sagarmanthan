import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FilePieChart, Search, Download, FileSpreadsheet, FileCheck, Filter, X } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';

const REPORT_LIST = [
  // Major Ports
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.1 A', name: 'Abstract - HR Position', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.2 A', name: 'Status of Filling up of Vacancies', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.3 A', name: 'Report on Class/Group Wise Filling up of Vacancies', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.4 A', name: 'Abstract of filling up of vacant Posts through Direct Recruitment', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.5 A', name: 'Abstract of filling up of vacant Posts through Promotion', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.6 A', name: 'Abstract of filling up of vacant Posts through Deputation', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.7 A', name: 'Abstract of filling up of vacant Posts through Composite Method', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.8 A', name: 'Abstract of Revival of Abolished Posts', type: 'major_port' },

  // Other Organisations
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.1 B', name: 'Abstract - HR Position', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.2 B', name: 'Status of Filling up of Vacancies', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.3 B', name: 'Report on Class/Group Wise Filling up of Vacancies', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.4 B', name: 'Abstract of filling up of vacant Posts through Direct Recruitment', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.5 B', name: 'Abstract of filling up of vacant Posts through Promotion', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.6 B', name: 'Abstract of filling up of vacant Posts through Deputation', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.7 B', name: 'Abstract of filling up of vacant Posts through Composite Method', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.8 B', name: 'Abstract of Revival of Abolished Posts', type: 'other_org' },

  // MIS Reports
  { category: 'HR - MIS Reports', code: 'H-2.0.1', name: 'Vacancy History - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.1.1', name: 'Manpower Overview - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.1.2', name: 'Manpower Overview - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.2.1', name: 'Total Manpower Sanction and actual - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.2.2', name: 'Total Manpower Sanction and actual - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.3.1', name: 'Gender Wise Manpower - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.3.2', name: 'Gender Wise Manpower - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.4.1', name: 'Actual Manpower Regular & Contract - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.4.2', name: 'Actual Manpower Regular & Contract - Non Major Ports', type: 'mis' },

  // Contractual & Training
  { category: 'Contractual Details Report', code: 'H-3.1', name: 'Abstract - Contractual Details Report', type: 'contractual' },
  { category: 'Training Details Report', code: 'H-4.1', name: 'Abstract - Training Details Report', type: 'training' }
];

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null); // Selected report for config modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation")
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  const handleOpenConfig = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleDownload = (format) => {
    if (!selectedReport) return;
    alert(`Compiling & Downloading ${selectedReport.code} - ${selectedReport.name} in ${format} format for Organisation: ${selectedOrg}...`);
    setIsModalOpen(false);
  };

  const filteredReports = useMemo(() => {
    return REPORT_LIST.filter(rep => {
      const code = rep.code.toLowerCase();
      const name = rep.name.toLowerCase();
      const category = rep.category.toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm || code.includes(term) || name.includes(term) || category.includes(term);
    });
  }, [searchTerm]);

  // Group reports by category for header rendering
  const groupedReports = useMemo(() => {
    const groups = {};
    filteredReports.forEach(rep => {
      if (!groups[rep.category]) groups[rep.category] = [];
      groups[rep.category].push(rep);
    });
    return groups;
  }, [filteredReports]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageBanner
        title="HR Reports Index"
        description="Access and export official ministry review records, manpower overview audits, and demographic statistics."
        icon={FilePieChart}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Reports Catalog</h3>
            <p className="text-xs text-slate-400 font-medium">Select any ministry review sheet or MIS log to configure and export.</p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search reports catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-105 font-medium text-slate-700"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Reports Index Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0f417a] text-white font-bold text-center">
                <th className="py-3 px-4 w-16 text-center">S.No</th>
                <th className="py-3 px-4 w-28 text-center border-l border-blue-900">Report Code</th>
                <th className="py-3 px-4 text-left border-l border-blue-900">Description</th>
                <th className="py-3 px-4 w-32 text-center border-l border-blue-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedReports).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-100 font-bold border-y border-slate-200">
                    <td colSpan={4} className="py-2.5 px-4 text-slate-800 font-extrabold font-display">
                      {category}
                    </td>
                  </tr>
                  {items.map((item, idx) => (
                    <tr key={item.code} className="border-b border-slate-150 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 bg-slate-50/50">{item.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-805">
                        <button
                          onClick={() => handleOpenConfig(item)}
                          className="hover:text-blue-800 text-left font-semibold cursor-pointer"
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenConfig(item)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-[#0f417a] hover:text-white rounded-lg border border-blue-200 font-bold text-[10px] uppercase tracking-wider transition cursor-pointer"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {Object.keys(groupedReports).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center font-bold text-slate-400">
                    No matching reports found in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration & Download Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up space-y-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 pr-8">
              <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase rounded-full">
                {selectedReport.code}
              </span>
              <h4 className="text-sm font-extrabold text-slate-900">{selectedReport.name}</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{selectedReport.category}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="block text-slate-500 font-bold">Filter Organisation</label>
                <div className="relative">
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-105 cursor-pointer"
                  >
                    <option value="All">Show All Organisations</option>
                    {organisations.map(o => (
                      <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDownload('Excel')}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => handleDownload('PDF')}
                className="py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileCheck className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
