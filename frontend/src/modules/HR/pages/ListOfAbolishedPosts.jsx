import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, UserX, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table';

export default function ListOfAbolishedPosts() {
  const [posts, setPosts] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('55'); // Default to 55 (SMPA - Haldia Dock Complex)
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Load organisations list
  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation")
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  // Fetch abolished posts
  useEffect(() => {
    if (!selectedOrg) return;
    setLoading(true);
    axios.get(`http://localhost:3000/get-abolised-vacant-posts-details/${selectedOrg}`)
      .then(res => {
        setPosts(res.data.value || res.data || []);
      })
      .catch(err => {
        console.error("Error fetching abolished posts:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedOrg]);

  const columnDefs = useMemo(() => [
    { field: 'post_code', headerName: 'Post Code', minWidth: 130, pinned: 'left', cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'post_name', headerName: 'Abolished Post Title', minWidth: 200, pinned: 'left', cellClass: 'font-extrabold text-rose-700' },
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 140, cellClass: 'text-center font-bold' },
    { field: 'department_name', headerName: 'Department', minWidth: 160 },
    { field: 'method_of_appointment', headerName: 'Method of Appointment', minWidth: 150 },
    { 
      field: 'date_of_arise_in_vacancy', 
      headerName: 'Vacant Since Date', 
      minWidth: 150,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'
    }
  ], []);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const name = (post.post_name || '').toLowerCase();
      const code = (post.post_code || '').toLowerCase();
      const department = (post.department_name || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm || name.includes(term) || code.includes(term) || department.includes(term);
    });
  }, [posts, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageBanner 
        title="List of Abolished Posts" 
        description="Records of posts that have been formally abolished to optimize resource allocations."
        icon={UserX}
      />

      <div className="space-y-6">
        {/* Expandable Filter Container matching ProjectTable.jsx */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`w-full flex items-center justify-between text-left transition cursor-pointer ${
              isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 font-display">Search Filter Controls</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
              {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {isFiltersExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Organisation</label>
                <div className="relative">
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Select Organisation--</option>
                    {organisations.map(o => (
                      <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Search query</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search abolished posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium text-slate-700"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reusable Table wrapper around ag-Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <Table
            rowData={filteredPosts}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            enableExport={true}
            exportFileName="Abolished_Posts_Report"
            exportPdfTitle="Abolished Posts Report"
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
              suppressSizeToFit: false
            }}
          />
        </div>
      </div>
    </div>
  );
}
