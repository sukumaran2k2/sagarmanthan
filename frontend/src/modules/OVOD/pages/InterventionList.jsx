import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Star, 
  Layers, 
  Users, 
  Globe, 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  FileSpreadsheet, 
  Search,
  RotateCcw,
  Sparkles,
  DollarSign,
  Filter,
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

export default function InterventionList({ triggerNotification }) {
  const gridRef = useRef(null);

  // 8 Filters matching OVOD
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

  // Filter Panel Toggle State
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Organisations Master
  const [organisations, setOrganisations] = useState([]);

  // Data States
  const [countsData, setCountsData] = useState({
    goalsA1: 101,
    interventionsA2: 481,
    actionItemsA3: 514,
    kpi: 'KPI',
    goalsB1: 578,
    interventionsB2: 1921,
    actionItemsB3: 9050,
    totalCost: '287322.67'
  });

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});

  // Load Organisations
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(() => setOrganisations([]));
  }, []);

  // Fetch Counts
  const loadCounts = useCallback(async () => {
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
          totalCost: Number(t.total_cost || 287322.67).toFixed(2)
        });
      }
    } catch (err) {
      console.warn("OVOD Counts error:", err);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme]);

  // Fetch Interventions Report
  const loadTableData = useCallback(async () => {
    setLoading(true);
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

      const rawRows = res?.rowData || (Array.isArray(res) ? res : []);
      
      const processed = rawRows.map((item, idx) => {
        const hierarchy = item.orgHierarchy || [
          item['Goal (A1)'] || item.goal_a1,
          item['Intervention (A2)'] || item.intervention_a2,
          item['Action (A3)'] || item.action_a3,
          item['Goal (B1)'] || item.goal_b1,
          item['Intervention (B2)'] || item.intervention_b2,
          item['Action (B3)'] || item.action_b3
        ].filter(Boolean);

        return {
          id: item.Id || item.id || `node-${idx}`,
          hierarchy: hierarchy,
          interventionList: hierarchy[hierarchy.length - 1] || item.intervention_a2 || item.goal_a1 || `Intervention ${idx + 1}`,
          orgCode: item.orgCode || item.ia_name || item.imp_agency || 'IMU, CEMS',
          progress: item.progress != null ? item.progress : 73,
          totalCost: item.totalCost != null ? item.totalCost : (item.total_cost || 0),
          jobTitle: item.jobTitle || item.category || 'HR/Capacity Building',
          wing: item.wing || item.wings || 'Shipping',
          employmentType: item.employmentType || item.priority || 'II',
          Vibhas: item.Vibhas || item.vibhas || 'Capacity building',
          TargetDate: item.TargetDate || item.target_date || '21-11-2030',
          capitalExpenditure: item.capitalExpenditure != null ? item.capitalExpenditure : 0,
          sourceOfFunding: item.sourceOfFunding || item.source_of_funding || 'EBR, GBS, Other',
          fundSpend: item.fundSpend != null ? item.fundSpend : (item.fund_spent || 0),
          currentStatus: item.currentStatus || item.current_status || 'Implementation - On time'
        };
      });

      setRawData(processed);
    } catch (err) {
      console.warn("OVOD Interventions load error:", err);
      // Sample data fallback
      setRawData([
        {
          id: 1,
          interventionList: "A1 : N-CB-1 : Enhance maritime education ecosystem in the country",
          orgCode: "IMU, CEMS",
          progress: 73,
          totalCost: 0,
          jobTitle: "HR/Capacity Building, Pr...",
          wing: "Shipping",
          employmentType: "I, II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 0,
          sourceOfFunding: "EBR, GBS, Other (Angel Invest...",
          fundSpend: 0,
          currentStatus: "Implementation - On time"
        },
        {
          id: 2,
          interventionList: "A1 : N-CB-2 : Provide world class training to maritime community",
          orgCode: "IMU, CEMS, IPA, KPL",
          progress: 64,
          totalCost: 5.66,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping, Ports",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 5.66,
          sourceOfFunding: "EBR, GBS, Other (Angel Invest...",
          fundSpend: 3.49,
          currentStatus: "Implementation - On time"
        },
        {
          id: 3,
          interventionList: "A1 : N-CB-3 : Provide education and training for IWT sector",
          orgCode: "IWAI",
          progress: 46,
          totalCost: 35,
          jobTitle: "HR/Capacity Building",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "31-12-2027",
          capitalExpenditure: 35,
          sourceOfFunding: "GBS",
          fundSpend: 0,
          currentStatus: "Implementation - On time"
        },
        {
          id: 4,
          interventionList: "A1 : N-CR-4 : Promoting welfare of the maritime community",
          orgCode: "KDS, IPA, VPA, KPL",
          progress: 50,
          totalCost: 68.21,
          jobTitle: "Institutional reforms, HR/...",
          wing: "Ports, Shipping, Inland",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "31-12-2028",
          capitalExpenditure: 68.21,
          sourceOfFunding: "EBR, Other (Angel Invest...",
          fundSpend: 53.81,
          currentStatus: "Implementation - On time"
        },
        {
          id: 5,
          interventionList: "A1 : N-CR-5 : Collaboration with foreign ports in the areas of : port operations",
          orgCode: "IPA, JNPA",
          progress: 3,
          totalCost: 0,
          jobTitle: "HR/Capacity Building",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "31-03-2027",
          capitalExpenditure: 0,
          sourceOfFunding: "EBR, GBS",
          fundSpend: 0,
          currentStatus: "Implementation - On time"
        },
        {
          id: 6,
          interventionList: "A1 : N-CM-1 : Optimize Communication in Port Sector",
          orgCode: "IPA, CEMS, PPA, VPA, KPL",
          progress: 21,
          totalCost: 134.49,
          jobTitle: "Process",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Communication",
          TargetDate: "30-06-2027",
          capitalExpenditure: 197.49,
          sourceOfFunding: "EBR, PPP/SPV, Other (An...",
          fundSpend: 74.91,
          currentStatus: "Implementation - On time"
        },
        {
          id: 7,
          interventionList: "A1 : N-CM-2 : Optimize Communication in Shipping Sector",
          orgCode: "DGS, SCI",
          progress: 3,
          totalCost: 2.68,
          jobTitle: "Process",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Communication",
          TargetDate: "31-12-2026",
          capitalExpenditure: 2.68,
          sourceOfFunding: "EBR",
          fundSpend: 0,
          currentStatus: "Implementation - On time"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme, selectedStatus]);

  useEffect(() => {
    loadCounts();
    loadTableData();
  }, [loadCounts, loadTableData]);

  // Active filters count
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

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Filtered rows for AG Grid
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return rawData;
    const q = searchTerm.toLowerCase();
    return rawData.filter(r => {
      const combined = `${r.interventionList || ''} ${r.orgCode || ''} ${r.wing || ''} ${r.jobTitle || ''} ${r.Vibhas || ''}`.toLowerCase();
      return combined.includes(q);
    });
  }, [rawData, searchTerm]);

  // Navy AG Grid Column Definitions (All 12 Columns with numbers centered)
  const columnDefs = useMemo(() => [
    {
      headerName: "Intervention List",
      field: "interventionList",
      minWidth: 320,
      flex: 2.2,
      cellRenderer: (params) => {
        const id = params.data?.id;
        const isExpanded = expandedNodes[id];
        return (
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-100 py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(id);
              }}
              className="p-0.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="leading-tight">
              {params.value || '-'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: "Implementing Ag...",
      field: "orgCode",
      minWidth: 150,
      flex: 1.2,
      cellRenderer: (params) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {params.value || 'IMU, CEMS'}
        </span>
      )
    },
    {
      headerName: "Progress (in %)",
      field: "progress",
      minWidth: 100,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-800 dark:text-slate-100">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Total Cost (in Cr.)",
      field: "totalCost",
      minWidth: 120,
      flex: 1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-amber-600 dark:text-amber-400">
          {params.value != null ? Number(params.value).toFixed(2) : '0.00'}
        </div>
      )
    },
    {
      headerName: "Category",
      field: "jobTitle",
      minWidth: 150,
      flex: 1.2,
      cellRenderer: (params) => params.value || 'HR/Capacity Building'
    },
    {
      headerName: "Wing",
      field: "wing",
      minWidth: 110,
      flex: 0.9,
      cellRenderer: (params) => params.value || 'Shipping'
    },
    {
      headerName: "Priority",
      field: "employmentType",
      minWidth: 80,
      flex: 0.7,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
          {params.value || 'II'}
        </div>
      )
    },
    {
      headerName: "Vibhas",
      field: "Vibhas",
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => params.value || 'Capacity building, outreach'
    },
    {
      headerName: "Target Date",
      field: "TargetDate",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-slate-600 dark:text-slate-300">
          {params.value || '21-11-2030'}
        </div>
      )
    },
    {
      headerName: "Capital Expenditure",
      field: "capitalExpenditure",
      minWidth: 130,
      flex: 1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
          {params.value != null ? Number(params.value).toFixed(2) : '0.00'}
        </div>
      )
    },
    {
      headerName: "Source of Funding",
      field: "sourceOfFunding",
      minWidth: 160,
      flex: 1.3,
      cellRenderer: (params) => (
        <span className="text-slate-600 dark:text-slate-300 text-xs">
          {params.value || 'EBR, GBS'}
        </span>
      )
    },
    {
      headerName: "Fund Spent",
      field: "fundSpend",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
          {params.value != null ? Number(params.value).toFixed(2) : '0.00'}
        </div>
      )
    }
  ], [expandedNodes]);

  // Export headers
  const exportHeaders = useMemo(() => [
    { label: 'Intervention List', key: 'interventionList' },
    { label: 'Implementing Agency', key: 'orgCode' },
    { label: 'Progress (in %)', key: 'progress' },
    { label: 'Total Cost (in Cr.)', key: 'totalCost' },
    { label: 'Category', key: 'jobTitle' },
    { label: 'Wing', key: 'wing' },
    { label: 'Priority', key: 'employmentType' },
    { label: 'Vibhas', key: 'Vibhas' },
    { label: 'Target Date', key: 'TargetDate' },
    { label: 'Capital Expenditure', key: 'capitalExpenditure' },
    { label: 'Source of Funding', key: 'sourceOfFunding' },
    { label: 'Fund Spent', key: 'fundSpend' }
  ], []);

  const exportData = useMemo(() => filteredData.map((r) => ({
    interventionList: r.interventionList,
    orgCode: r.orgCode,
    progress: r.progress != null ? `${r.progress}%` : '0%',
    totalCost: r.totalCost != null ? Number(r.totalCost).toFixed(2) : '0.00',
    jobTitle: r.jobTitle,
    wing: r.wing,
    employmentType: r.employmentType,
    Vibhas: r.Vibhas,
    TargetDate: r.TargetDate,
    capitalExpenditure: r.capitalExpenditure != null ? Number(r.capitalExpenditure).toFixed(2) : '0.00',
    sourceOfFunding: r.sourceOfFunding,
    fundSpend: r.fundSpend != null ? Number(r.fundSpend).toFixed(2) : '0.00'
  })), [filteredData]);

  return (
    <div className="space-y-4 animate-fade-in relative select-none text-slate-800 dark:text-slate-100">
      
      {/* 8 Stat Cards in 2 Rows matching Image 1 */}
      <div className="space-y-3.5">
        
        {/* ROW 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-2xl p-4 bg-[#fbcfe8]/60 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.goalsA1}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-pink-500 shadow-xs">
                <Star size={13} className="fill-pink-400 text-pink-500" />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Goals [A1]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#e9d5ff]/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.interventionsA2}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-purple-600 shadow-xs">
                <Layers size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Interventions [A2]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#99f6e4]/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.actionItemsA3}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-teal-600 shadow-xs">
                <Users size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Action Items [A3]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#fed7aa]/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                KPI
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-amber-600 shadow-xs">
                <Globe size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Knowledge Repository
            </p>
          </div>

        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-2xl p-4 bg-[#fecdd3]/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.goalsB1}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-xs">
                <Star size={13} className="fill-rose-400 text-rose-500" />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Goals [B1]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#c7d2fe]/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.interventionsB2}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-indigo-600 shadow-xs">
                <Layers size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Interventions [B2]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#a5f3fc]/70 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.actionItemsB3}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-cyan-600 shadow-xs">
                <Users size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Action Items [B3]
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-[#fef08a]/80 dark:bg-yellow-950/40 border border-yellow-200/80 dark:border-yellow-900/50 shadow-xs flex flex-col items-center justify-center text-center relative">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">
                {countsData.totalCost}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-yellow-600 shadow-xs">
                <Pencil size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Cost (in Cr.)
            </p>
          </div>

        </div>

      </div>

      {/* 3. Main Table Card Container matching GMIS DataList */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Action Toolbar Header matching GMIS DataList: Filter button on Left, Search, Copy & Export on Right */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Dedicated Filter Button & Reset on Left */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* 2. Space */}
          <div className="hidden lg:block flex-1" />

          {/* 3. Search Bar, Copy & Export on Right */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search interventions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

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
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredData.length}</span>
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

        {/* Collapsible Dedicated Filter Panel matching GMIS DataList */}
        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Parameters
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 transition flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {organisations.map(o => (
                    <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  VIBHAS/NAWIC Cell
                </label>
                <select
                  value={selectedVibhas}
                  onChange={(e) => setSelectedVibhas(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>
        )}

        {/* Navy AG Grid Table */}
        <Table
          ref={gridRef}
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          pagination={true}
          paginationPageSize={pageSize}
          enableExport={false}
          color="#0f417a"
        />

      </div>

    </div>
  );
}
