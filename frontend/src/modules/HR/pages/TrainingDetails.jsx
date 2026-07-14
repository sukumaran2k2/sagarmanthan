import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, BookOpen, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table';

export default function TrainingDetails() {
  const [trainings, setTrainings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`http://localhost:3000/get-all-training-data/1`)
      .then(res => {
        setTrainings(res.data || []);
      })
      .catch(err => {
        console.error("Error loading training details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const columnDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1,
      minWidth: 70, 
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500'
    },
    { field: 'Training ID', headerName: 'Training ID', minWidth: 110, pinned: 'left', cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'Employ name', headerName: 'Employee Name', minWidth: 160, pinned: 'left', cellClass: 'font-extrabold text-slate-900' },
    { field: 'Designation', headerName: 'Designation', minWidth: 160 },
    { field: 'Title', headerName: 'Training Course Title', minWidth: 260, cellClass: 'font-semibold text-blue-800' },
    { field: 'Training Type', headerName: 'Training Type', minWidth: 150 },
    { field: 'Organisation Name', headerName: 'Organisation', minWidth: 160 },
    { 
      field: 'From date', 
      headerName: 'From Date', 
      minWidth: 130,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'
    },
    { 
      field: 'To date', 
      headerName: 'To Date', 
      minWidth: 130,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'
    }
  ], []);

  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const name = (t['Employ name'] || '').toLowerCase();
      const course = (t['Title'] || '').toLowerCase();
      const type = (t['Training Type'] || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm || name.includes(term) || course.includes(term) || type.includes(term);
    });
  }, [trainings, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageBanner 
        title="Training Details" 
        description="Tracking capacity building, specialized training courses, and employee certifications."
        icon={BookOpen}
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
                    placeholder="Search training logs by employee name, course title or type..."
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

        {/* Reusable Table wrapper around ag-Grid with standard pagination */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <Table
            rowData={filteredTrainings}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            enableExport={true}
            exportFileName="Training_Details_Report"
            exportPdfTitle="Training Details Report"
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
