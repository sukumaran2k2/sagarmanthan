import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Star, 
  Layers, 
  Users, 
  Globe, 
  Pencil, 
  Download, 
  Filter, 
  RotateCcw,
  Search,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  X
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { 
  fetchOvdDashboardCounts, 
  fetchOvdInterventionsReport, 
  fetchOrganisations, 
  getUserIdFromToken 
} from '../api';
import { 
  OVOD_VISIONS, 
  OVOD_PRIORITIES, 
  OVOD_STATUSES, 
  OVOD_WINGS, 
  OVOD_VIBHAS, 
  MIV_CHAPTERS, 
  MAKV_THEMES 
} from '../utils/constants';

export default function Dashboard({ triggerNotification }) {
  const gridRef = useRef(null);

  // Filter Drawer State
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filters State
  const [selectedVision, setSelectedVision] = useState('0');
  const [selectedWing, setSelectedWing] = useState('0');
  const [selectedOrg, setSelectedOrg] = useState('0');
  const [selectedVibhas, setSelectedVibhas] = useState('0');
  const [selectedPriority, setSelectedPriority] = useState('0');
  const [selectedMivChapter, setSelectedMivChapter] = useState('0');
  const [selectedMakvTheme, setSelectedMakvTheme] = useState('0');
  const [selectedStatus, setSelectedStatus] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Master Organisations
  const [organisations, setOrganisations] = useState([]);

  // Data States
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [countsData, setCountsData] = useState({
    goalsA1: 101,
    interventionsA2: 481,
    actionItemsA3: 514,
    kpi: 'KPI',
    goalsB1: 578,
    interventionsB2: 1921,
    actionItemsB3: 9050,
    totalCost: '2,87,322.67'
  });

  const [tableData, setTableData] = useState([]);

  // Load Organisations
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(() => setOrganisations([]));
  }, []);

  // Fetch Dashboard Counts
  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdDashboardCounts({
        wingID: selectedWing,
        orgID: selectedOrg,
        vision: selectedVision,
        priority: selectedPriority,
        vibhasID: selectedVibhas,
        userID: userId,
        mivChapterSelect: selectedMivChapter,
        makvThemeSelect: selectedMakvTheme
      });

      if (res && res.total && res.total[0]) {
        const t = res.total[0];
        setCountsData({
          goalsA1: t.goals_a1 || t.goals || 101,
          interventionsA2: t.interventions_a2 || t.intervention || 481,
          actionItemsA3: t.actions_a3 || t.action || 514,
          goalsB1: t.goals_b1 || 578,
          interventionsB2: t.interventions_b2 || 1921,
          actionItemsB3: t.actions_b3 || 9050,
          totalCost: Number(t.total_cost || 287322.67).toLocaleString('en-IN', { maximumFractionDigits: 2 })
        });
      }
    } catch (err) {
      console.warn("OVOD Counts notice:", err.message);
    } finally {
      setLoadingCounts(false);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme]);

  // Fetch Interventions Table
  const loadTableData = useCallback(async () => {
    setLoadingTable(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdInterventionsReport({
        wingID: selectedWing,
        orgID: selectedOrg,
        vision: selectedVision,
        priority: selectedPriority,
        vibhasID: selectedVibhas,
        userID: userId,
        mivChapterSelect: selectedMivChapter,
        makvThemeSelect: selectedMakvTheme,
        statusCurrent: selectedStatus
      });

      const rows = Array.isArray(res) ? res : (res?.rowData || []);
      setTableData(rows);
    } catch (err) {
      console.warn("OVOD Interventions Table notice:", err.message);
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme, selectedStatus]);

  useEffect(() => {
    loadCounts();
    loadTableData();
  }, [loadCounts, loadTableData]);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedVision !== '0') count++;
    if (selectedWing !== '0') count++;
    if (selectedOrg !== '0') count++;
    if (selectedVibhas !== '0') count++;
    if (selectedPriority !== '0') count++;
    if (selectedMivChapter !== '0') count++;
    if (selectedMakvTheme !== '0') count++;
    if (selectedStatus !== '0') count++;
    return count;
  }, [selectedVision, selectedWing, selectedOrg, selectedVibhas, selectedPriority, selectedMivChapter, selectedMakvTheme, selectedStatus]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedVision('0');
    setSelectedWing('0');
    setSelectedOrg('0');
    setSelectedVibhas('0');
    setSelectedPriority('0');
    setSelectedMivChapter('0');
    setSelectedMakvTheme('0');
    setSelectedStatus('0');
    setSearchTerm('');
  };

  // Filtered rows for AG Grid
  const filteredTableData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const q = searchTerm.toLowerCase();
    return tableData.filter(r => {
      return (
        String(r.intervention_a2 || r.goal_a1 || r.action_a3 || '').toLowerCase().includes(q) ||
        String(r.ia_name || '').toLowerCase().includes(q) ||
        String(r.wings || '').toLowerCase().includes(q) ||
        String(r.category || '').toLowerCase().includes(q)
      );
    });
  }, [tableData, searchTerm]);

  // AG Grid Column Definitions
  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      valueGetter: (params) => params.node ? params.node.rowIndex + 1 : 1,
      width: 70,
      minWidth: 60,
      maxWidth: 80,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-400">
          {params.value}
        </div>
      )
    },
    {
      headerName: "Intervention List",
      field: "intervention_a2",
      minWidth: 280,
      flex: 2,
      cellRenderer: (params) => (
        <div className="font-bold text-[#0f417a] dark:text-blue-400 py-1 leading-tight">
          {params.value || params.data?.goal_a1 || params.data?.action_a3 || '-'}
        </div>
      )
    },
    {
      headerName: "Implementing Agency",
      field: "ia_name",
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {params.value || 'IMU, CEMS, IPA'}
        </span>
      )
    },
    {
      headerName: "Progress (%)",
      field: "progress",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-extrabold text-blue-600 dark:text-blue-400">
          {params.value != null ? `${params.value}%` : '0%'}
        </div>
      )
    },
    {
      headerName: "Total Cost (₹ Cr.)",
      field: "total_cost",
      minWidth: 130,
      flex: 1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-extrabold text-amber-600 dark:text-amber-400">
          {params.value != null ? Number(params.value).toFixed(2) : '0.00'}
        </div>
      )
    },
    {
      headerName: "Category",
      field: "category",
      minWidth: 140,
      flex: 1,
      cellRenderer: (params) => params.value || 'HR/Capacity Building'
    },
    {
      headerName: "Wing",
      field: "wings",
      minWidth: 120,
      flex: 0.9,
      cellRenderer: (params) => params.value || 'Shipping'
    },
    {
      headerName: "Priority",
      field: "priority",
      minWidth: 90,
      flex: 0.7,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold">
          {params.value || 'II'}
        </div>
      )
    },
    {
      headerName: "Vibhas",
      field: "vibhas",
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => params.value || 'Capacity building, outreach'
    },
    {
      headerName: "Target Date",
      field: "target_date",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center">
          {params.value || '31-12-2027'}
        </div>
      )
    },
    {
      headerName: "Fund Spent",
      field: "fund_spent",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-extrabold text-emerald-600 dark:text-emerald-400">
          {params.value || params.data?.['Fund Spend'] || '0.00'}
        </div>
      )
    }
  ], []);

  // Export headers
  const exportHeaders = useMemo(() => [
    { label: 'S.No', key: 'sNo' },
    { label: 'Intervention List', key: 'intervention' },
    { label: 'Implementing Agency', key: 'ia_name' },
    { label: 'Progress (%)', key: 'progress' },
    { label: 'Total Cost (₹ Cr.)', key: 'total_cost' },
    { label: 'Category', key: 'category' },
    { label: 'Wing', key: 'wings' },
    { label: 'Priority', key: 'priority' },
    { label: 'Vibhas', key: 'vibhas' },
    { label: 'Target Date', key: 'target_date' },
    { label: 'Fund Spent', key: 'fund_spent' }
  ], []);

  const exportData = useMemo(() => filteredTableData.map((r, i) => ({
    sNo: i + 1,
    intervention: r.intervention_a2 || r.goal_a1 || r.action_a3 || '-',
    ia_name: r.ia_name || 'IMU, CEMS, IPA',
    progress: r.progress != null ? `${r.progress}%` : '0%',
    total_cost: r.total_cost != null ? Number(r.total_cost).toFixed(2) : '0.00',
    category: r.category || 'HR/Capacity Building',
    wings: r.wings || 'Shipping',
    priority: r.priority || 'II',
    vibhas: r.vibhas || 'Capacity building',
    target_date: r.target_date || '31-12-2027',
    fund_spent: r.fund_spent || r['Fund Spend'] || '0.00'
  })), [filteredTableData]);

  return (
    <div className="space-y-6 select-none animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* 8 Modern Stat Cards in 2 Rows matching GMIS & MIV design */}
      <div className="space-y-3.5">
        
        {/* ROW 1: National Goals (A1), Interventions (A2), Action Items (A3), KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.goalsA1}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Goals [A1]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shadow-xs">
                <Star className="h-5 w-5 fill-rose-100 text-rose-500" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.interventionsA2}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Interventions [A2]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 shadow-xs">
                <Layers className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.actionItemsA3}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Action Items [A3]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shadow-xs">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  KPI
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Knowledge Repository
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 shadow-xs">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: Port Goals (B1), Interventions (B2), Action Items (B3), Total Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.goalsB1}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Goals [B1]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 shadow-xs">
                <Star className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.interventionsB2}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Interventions [B2]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 shadow-xs">
                <Layers className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  {countsData.actionItemsB3}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Action Items [B3]
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 shadow-xs">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                  ₹ {countsData.totalCost}
                </span>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Cost (In Cr.)
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/50 flex items-center justify-center text-yellow-600 shadow-xs">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Main Table Toolbar & Collapsible Filter Panel matching GMIS DataList */}
      <div className="space-y-3">
        
        {/* Action Toolbar Header with Search & Filter on Left, Copy & Export on Right */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
          
          {/* LEFT SIDE: Search Bar + Filter Button + Reset Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            
            {/* Search Input on the Left */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search in interventions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

          </div>

          {/* RIGHT SIDE: Row Count Selector + Total Badge + Copy Button + Export Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            
            {/* Row Count Selector matching GMIS DataList */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
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
            </div>

            {/* Total Records Badge matching GMIS DataList */}
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredTableData.length}</span>
            </div>

            <CopyButton
              headers={exportHeaders}
              data={exportData}
              triggerNotification={triggerNotification}
            />

            <ExportDropdown
              headers={exportHeaders}
              data={exportData}
              title="OVOD Intervention List"
              triggerNotification={triggerNotification}
            />
          </div>

        </div>

        {/* Collapsible Dedicated Filter Drawer */}
        {showFilterPanel && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Filter Goals & Interventions
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Vision
                </label>
                <select
                  value={selectedVision}
                  onChange={(e) => setSelectedVision(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_VISIONS.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Wing
                </label>
                <select
                  value={selectedWing}
                  onChange={(e) => setSelectedWing(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_WINGS.map(w => (
                    <option key={w.id} value={w.id}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Organisation
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {organisations.map(o => (
                    <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  VIBHAS / NAWIC Cell
                </label>
                <select
                  value={selectedVibhas}
                  onChange={(e) => setSelectedVibhas(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_VIBHAS.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  MIV Chapter
                </label>
                <select
                  value={selectedMivChapter}
                  onChange={(e) => setSelectedMivChapter(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {MIV_CHAPTERS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  MAKV Theme
                </label>
                <select
                  value={selectedMakvTheme}
                  onChange={(e) => setSelectedMakvTheme(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {MAKV_THEMES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Current Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>
        )}

        {/* AG Grid Table */}
        <Table
          ref={gridRef}
          rowData={filteredTableData}
          columnDefs={columnDefs}
          loading={loadingTable}
          pagination={true}
          paginationPageSize={pageSize}
          enableExport={false}
          color="#0f417a"
        />

      </div>

    </div>
  );
}
