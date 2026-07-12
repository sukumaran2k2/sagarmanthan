import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, UserPlus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table';

export default function ContractualEmployment() {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get("http://localhost:3000/get-all-contractual-data/1")
      .then(res => {
        setStaff(res.data.value || res.data || []);
      })
      .catch(err => {
        console.error("Error loading contractual employment data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const columnDefs = useMemo(() => [
    { field: 'Contract ID', headerName: 'Contract ID', minWidth: 120, pinned: 'left', cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'Organisation Name', headerName: 'Organisation Name', minWidth: 180, pinned: 'left', cellClass: 'font-extrabold text-slate-900' },
    { field: 'Financial Year', headerName: 'Financial Year', minWidth: 130 },
    { field: 'Total for officers level', headerName: 'Total Officers', minWidth: 130, cellClass: 'text-right font-bold' },
    { field: 'Total for Non-officers level', headerName: 'Total Non-Officers', minWidth: 150, cellClass: 'text-right font-bold' },
    { 
      field: 'Date Created', 
      headerName: 'Created Date', 
      minWidth: 140,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'
    }
  ], []);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const org = (s['Organisation Name'] || '').toLowerCase();
      const fy = (s['Financial Year'] || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm || org.includes(term) || fy.includes(term);
    });
  }, [staff, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageBanner 
        title="Contractual Employment" 
        description="Monitoring contractual staffing, specialized consultants, and Young Professionals across departments."
        icon={UserPlus}
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
            <div className="grid grid-cols-1 gap-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Search query</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search contractual staff by organisation name or financial year..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 font-medium text-slate-700"
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
            rowData={filteredStaff}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            enableExport={true}
            exportFileName="Contractual_Employment_Report"
            exportPdfTitle="Contractual Employment Report"
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
