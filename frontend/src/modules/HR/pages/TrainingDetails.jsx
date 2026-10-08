import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ChevronDown, Eye, X, Pencil, Filter, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { getCurrentUserId, isOrganisationUser } from '../../../utils/authSession';
import TrainingDetailView from './TrainingDetailView';

export default function TrainingDetails({ triggerNotification }) {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const userId = getCurrentUserId() || '1';

    axios.get(`${API_BASE_URL}/get-all-training-data/${userId}`)
      .then(res => {
        if (!isMounted) return;
        const rawData = res.data || [];
        
        const isMinistry = !isOrganisationUser();
        let formattedData;

        if (isMinistry) {
          // Aggregate raw data by Organisation and Year
          const aggregated = {};
          rawData.forEach(row => {
            const org = row['Organisation Name'] || 'Unknown';
            const toDate = row['To date'] ? new Date(row['To date']) : null;
            const fromDate = row['From date'] ? new Date(row['From date']) : null;
            const year = toDate ? toDate.getFullYear().toString() : (fromDate ? fromDate.getFullYear().toString() : 'N/A');
            const trainingId = row['Training ID'];
            const expenditure = parseFloat(row['Expenditure'] || 0);
            const participants = parseInt(row['No of Participants'] || 1, 10);
            
            const key = `${org}-${year}`;
            if (!aggregated[key]) {
              aggregated[key] = {
                Organisation: org,
                OrganisationId: row['Organisation ID'],
                Year: year,
                trainingIds: new Set(),
                trainingsList: [],
                TotalParticipants: 0,
                TotalExpenditure: 0,
                LastTrainingDate: toDate || fromDate,
              };
            }
            if (trainingId && !aggregated[key].trainingIds.has(trainingId)) {
              aggregated[key].trainingIds.add(trainingId);
              aggregated[key].TotalExpenditure += expenditure;
              aggregated[key].TotalParticipants += participants;
              aggregated[key].trainingsList.push(row);
            }
            if (toDate && (!aggregated[key].LastTrainingDate || toDate > aggregated[key].LastTrainingDate)) {
              aggregated[key].LastTrainingDate = toDate;
            }
          });
          formattedData = Object.values(aggregated).map(item => ({
            Organisation: item.Organisation,
            OrganisationId: item.OrganisationId,
            Year: item.Year,
            'Total Trainings': item.trainingIds.size,
            'Total Participants': item.TotalParticipants,
            'Total Expenditure (In Lakh)': item.TotalExpenditure > 0 ? (item.TotalExpenditure / 100000).toFixed(2) : '-',
            'Last Training Date': item.LastTrainingDate,
            trainingsList: item.trainingsList
          }));
        } else {
          // Org View: Aggregate by Training ID to count participants
          const orgAggregated = {};
          rawData.forEach(row => {
            const tId = row['Training ID'] || Math.random().toString();
            if (!orgAggregated[tId]) {
              const toDate = row['To date'] ? new Date(row['To date']) : null;
              const year = toDate ? toDate.getFullYear().toString() : 'N/A';
              const exp = parseFloat(row['Expenditure'] || 0);
              const parts = parseInt(row['No of Participants'] || 1, 10);
              orgAggregated[tId] = {
                'Training ID': tId,
                'Training Title': row['Title'] || '-',
                'Training Type': row['Training Type'] || '-',
                'Training Source': row['Training Source'] || '-',
                'Expenditure (In Lakh)': exp > 0 ? (exp / 100000).toFixed(2) : '-',
                'Year': year,
                'Number of Participants': parts,
                'From date': row['From date'],
                'To date': row['To date'],
                'Organisation Name': row['Organisation Name'],
                'raw': row
              };
            }
          });
          formattedData = Object.values(orgAggregated);
        }

        setTrainings(formattedData);
      })
      .catch(err => {
        console.error("Error loading training details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const isMinistryView = useMemo(() => {
    return !isOrganisationUser();
  }, []);

  const columnDefs = useMemo(() => {
    const cols = [
      { 
        headerName: 'S.No', 
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70, maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500',
        headerClass: 'text-center'
      }
    ];

    if (isMinistryView) {
      cols.push(
        { field: 'Organisation', headerName: 'Organisation', minWidth: 200, pinned: 'left', cellClass: 'font-extrabold text-slate-900 text-center', headerClass: 'text-center' },
        { field: 'Year', headerName: 'Year', minWidth: 120, cellClass: 'text-center', headerClass: 'text-center' },
        { field: 'Total Trainings', headerName: 'Total Trainings', minWidth: 150, cellClass: 'text-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Total Participants', headerName: 'Total Participants', minWidth: 160, cellClass: 'text-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Total Expenditure (In Lakh)', headerName: 'Total Expenditure (In Lakh)', minWidth: 220, cellClass: 'text-center font-semibold text-slate-800', headerClass: 'text-center' },
        { 
          field: 'Last Training Date', 
          headerName: 'Last Training Date', 
          minWidth: 180,
          cellClass: 'text-center', headerClass: 'text-center',
          valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-CA') : '-'
        },
        {
          headerName: 'View Details',
          minWidth: 150,
          cellClass: 'text-center', headerClass: 'text-center',
          cellRenderer: (params) => (
            <div className="flex items-center justify-center h-full">
              <button 
                type="button"
                onClick={() => setSelectedDetail(params.data)}
                title="View Training Details"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )
        }
      );
    } else {
      cols.push(
        { field: 'Training Title', headerName: 'Training Title', minWidth: 200, pinned: 'left', wrapText: true, autoHeight: true, cellClass: 'font-extrabold text-slate-900 text-center whitespace-normal break-words', headerClass: 'text-center' },
        { field: 'Training Type', headerName: 'Training Type', minWidth: 150, wrapText: true, autoHeight: true, cellClass: 'text-center whitespace-normal break-words', headerClass: 'text-center' },
        { field: 'Training Source', headerName: 'Training Source', minWidth: 150, wrapText: true, autoHeight: true, cellClass: 'text-center whitespace-normal break-words', headerClass: 'text-center' },
        { field: 'Expenditure (In Lakh)', headerName: 'Expenditure (In Lakh)', minWidth: 180, cellClass: 'text-center font-semibold text-slate-800', headerClass: 'text-center' },
        { field: 'Year', headerName: 'Year', minWidth: 120, cellClass: 'text-center', headerClass: 'text-center' },
        { 
          field: 'Number of Participants', 
          headerName: 'Number of Participants', 
          minWidth: 180, 
          cellClass: 'text-center', 
          headerClass: 'text-center',
          cellRenderer: (params) => {
            const count = params.value ?? 1;
            return (
              <div className="flex items-center justify-center h-full">
                <button
                  type="button"
                  onClick={() => setSelectedDetail({
                    Organisation: params.data?.['Organisation Name'],
                    OrganisationId: params.data?.['Organisation ID'],
                    Year: params.data?.Year,
                    trainingsList: [params.data?.raw || params.data],
                    initialSelectedTraining: params.data?.raw || params.data
                  })}
                  title="Click to view details & participant roster"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-extrabold hover:underline cursor-pointer px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-xs flex items-center gap-1"
                >
                  <span>{count}</span>
                </button>
              </div>
            );
          }
        },
        {
          headerName: 'Actions',
          minWidth: 150,
          cellClass: 'text-center', headerClass: 'text-center',
          cellRenderer: (params) => (
            <div className="flex items-center justify-center space-x-2 h-full">
              <button 
                type="button"
                onClick={() => setSelectedDetail({
                  Organisation: params.data?.['Organisation Name'],
                  OrganisationId: params.data?.['Organisation ID'],
                  Year: params.data?.Year,
                  trainingsList: [params.data?.raw || params.data],
                  initialSelectedTraining: params.data?.raw || params.data
                })}
                title="View Training Details"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => {
                  navigate('/hr/hr-management/input-form/training-data', { state: { editData: params.data?.raw || params.data } });
                }}
                title="Edit Training Data"
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this training data?')) {
                    // TODO: call delete API
                    alert('Backend integration pending for deletion.');
                  }
                }}
                title="Delete Training Data"
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition cursor-pointer p-1.5 rounded-lg flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        }
      );
    }
    return cols;
  }, [isMinistryView]);

  const uniqueYears = useMemo(() => {
    return [...new Set(trainings.map(item => item['Year']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueOrgs = useMemo(() => {
    return [...new Set(trainings.map(item => item['Organisation']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(trainings.map(item => item['Training Type']).filter(Boolean))].sort();
  }, [trainings]);

  const uniqueSources = useMemo(() => {
    return [...new Set(trainings.map(item => item['Training Source']).filter(Boolean))].sort();
  }, [trainings]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const matchYear = selectedYear === '' || t['Year'] === selectedYear;
      const matchOrg = selectedOrg === '' || t['Organisation'] === selectedOrg;
      const matchType = selectedType === '' || t['Training Type'] === selectedType;
      const matchSource = selectedSource === '' || t['Training Source'] === selectedSource;
      
      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
                          (t['Organisation'] || '').toLowerCase().includes(term) ||
                          (t['Year'] || '').toLowerCase().includes(term) ||
                          (t['Training Title'] || '').toLowerCase().includes(term);

      if (isMinistryView) {
        return matchYear && matchOrg && matchSearch;
      }
      return matchType && matchSource && matchSearch;
    });
  }, [trainings, selectedYear, selectedOrg, selectedType, selectedSource, searchTerm, isMinistryView]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedOrg) count++;
    if (selectedYear) count++;
    if (selectedType) count++;
    if (selectedSource) count++;
    return count;
  }, [selectedOrg, selectedYear, selectedType, selectedSource]);

  const [visibleCols, setVisibleCols] = useState(() => {
    if (isMinistryView) {
      return {
        'Organisation': true,
        'Year': true,
        'Total Trainings': true,
        'Total Participants': true,
        'Total Expenditure (In Lakh)': true,
        'Last Training Date': true,
        'View Details': true
      };
    }
    return {
      'Training Title': true,
      'Training Type': true,
      'Training Source': true,
      'Expenditure (In Lakh)': true,
      'Year': true,
      'Number of Participants': true,
      'View Details': true,
      'Edit': true
    };
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColumnDefs = useMemo(() => {
    return columnDefs.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.headerName === 'Edit') return visibleCols['Edit'] !== false;
      if (col.headerName === 'View Details') return visibleCols['View Details'] !== false;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [columnDefs, visibleCols]);

  const exportHeaders = useMemo(() => {
    return isMinistryView 
      ? ['S.No', 'Organisation', 'Year', 'Total Trainings', 'Total Participants', 'Total Expenditure (In Lakh)', 'Last Training Date']
      : ['S.No', 'Training Title', 'Training Type', 'Training Source', 'Expenditure (In Lakh)', 'Year', 'Number of Participants'];
  }, [isMinistryView]);

  const exportRows = useMemo(() => {
    return filteredTrainings.map((t, idx) => {
      if (isMinistryView) {
        return [
          idx + 1,
          t['Organisation'] || '-',
          t['Year'] || '-',
          t['Total Trainings'] || 0,
          t['Total Participants'] || 0,
          t['Total Expenditure (In Lakh)'] || '-',
          t['Last Training Date'] ? new Date(t['Last Training Date']).toLocaleDateString('en-CA') : '-'
        ];
      }
      return [
        idx + 1,
        t['Training Title'] || '-',
        t['Training Type'] || '-',
        t['Training Source'] || '-',
        t['Expenditure (In Lakh)'] || '-',
        t['Year'] || '-',
        t['Number of Participants'] || 0
      ];
    });
  }, [filteredTrainings, isMinistryView]);

  if (selectedDetail) {
    return (
      <TrainingDetailView
        detail={selectedDetail}
        onBack={() => setSelectedDetail(null)}
        triggerNotification={triggerNotification}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* 1. Left: Collapsible Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Collapsible Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  showFilterPanel ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Quick Reset Button if filters active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrg('');
                  setSelectedYear('');
                  setSelectedType('');
                  setSelectedSource('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center space-x-1"
                title="Reset Filters"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 2. Right: Rows, Total Count, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            
            {/* Rows Limit */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredTrainings.length}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton 
              headers={exportHeaders} 
              rows={exportRows} 
              color="#0f417a" 
              hoverBg="#f1f5f9" 
              triggerNotification={triggerNotification} 
            />
            <ExportDropdown 
              headers={exportHeaders} 
              rows={exportRows} 
              fileName={isMinistryView ? "HR_Training_Summary_Report" : "HR_Training_Details_Report"}
              title={isMinistryView ? "HR Training Summary Report" : "HR Training Details Report"}
              color="#0f417a" 
              hoverColor="#134e96" 
              triggerNotification={triggerNotification} 
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Options
                </h4>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrg('');
                    setSelectedYear('');
                    setSelectedType('');
                    setSelectedSource('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {isMinistryView ? (
                <>
                  {/* Organisation Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Organisation
                    </label>
                    <div className="relative">
                      <select
                        value={selectedOrg}
                        onChange={(e) => setSelectedOrg(e.target.value)}
                        className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                      >
                        <option value="">All Organisations</option>
                        {uniqueOrgs.map(org => (
                          <option key={org} value={org}>{org}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Year Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Year
                    </label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                      >
                        <option value="">All Years</option>
                        {uniqueYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Training Type Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Training Type
                    </label>
                    <div className="relative">
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                      >
                        <option value="">-- Show All --</option>
                        {uniqueTypes.map(typ => (
                          <option key={typ} value={typ}>{typ}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Training Source Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Training Source
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="appearance-none w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                      >
                        <option value="">-- Show All --</option>
                        {uniqueSources.map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800">
          <Table
            rowData={filteredTrainings}
            columnDefs={activeColumnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
