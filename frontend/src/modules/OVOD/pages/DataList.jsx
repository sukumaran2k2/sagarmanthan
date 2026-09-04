import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  X, 
  Info, 
  Sparkles,
  Building2,
  Calendar,
  Layers,
  Star,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { 
  fetchOvdOrgListData, 
  fetchOrganisations, 
  deleteOvdAction, 
  getUserIdFromToken 
} from '../api';
import { 
  OVOD_WINGS, 
  OVOD_VIBHAS, 
  OVOD_STATUSES, 
  OVOD_PRIORITIES 
} from '../utils/constants';

export default function DataList({ 
  onAddNew, 
  onEdit, 
  triggerNotification 
}) {
  const gridRef = useRef(null);

  // Filter Panel Toggle State (opens down when Filter button is clicked)
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filters State matching the screenshot
  const [selectedWing, setSelectedWing] = useState('0');
  const [selectedOrg, setSelectedOrg] = useState('0');
  const [selectedGoalA1, setSelectedGoalA1] = useState('0');
  const [selectedInterventionA2, setSelectedInterventionA2] = useState('0');
  const [selectedActionA3, setSelectedActionA3] = useState('0');
  const [selectedGoalB1, setSelectedGoalB1] = useState('0');
  const [selectedInterventionB2, setSelectedInterventionB2] = useState('0');
  const [selectedActionB3, setSelectedActionB3] = useState('0');
  const [selectedStage, setSelectedStage] = useState('0');
  const [selectedVibhas, setSelectedVibhas] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Organisations & Raw Action Data
  const [organisations, setOrganisations] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load Organisations
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(() => setOrganisations([]));
  }, []);

  // Fetch Action Items Dataset
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdOrgListData(userId);
      const rows = Array.isArray(res) ? res : (res?.data || []);
      
      // Fallback sample data if empty
      if (!rows.length) {
        setActionItems([
          {
            id: 1,
            organisation_name: "Indian Maritime University",
            goal_a1: "N-CB-1 : Enhance maritime education ecosystem in the country",
            intervention_a2: "N-CB-1.1 : Expand avenues for collaboration within the country and abroad for technical education",
            action_a3: "N-CB-1.1.1 : Establish joint programs with leading global maritime universities",
            goal_b1: "E-CB-1 : Expand avenues for collaboration within the country and abroad for technical education",
            intervention_b2: "E-CB-1.1 : IMU to collaborate with institutes in the country; develop short-term courses and get registered distance learning platform for technical education",
            action_b3: "E-CB-1.1.1 : Need assessment",
            current_status: "Completed",
            updated_at: "2026-07-25"
          },
          {
            id: 2,
            organisation_name: "Indian Maritime University",
            goal_a1: "N-CB-1 : Enhance maritime education ecosystem in the country",
            intervention_a2: "N-CB-1.1 : Expand avenues for collaboration within the country and abroad for technical education",
            action_a3: "N-CB-1.1.1 : Establish joint programs with leading global maritime universities",
            goal_b1: "E-CB-1 : Expand avenues for collaboration within the country and abroad for technical education",
            intervention_b2: "E-CB-1.1 : IMU to collaborate with institutes in the country; develop short-term courses and get registered distance learning platform for technical education",
            action_b3: "E-CB-1.1.2 : Partner identification and evaluation",
            current_status: "Completed",
            updated_at: "2026-07-22"
          },
          {
            id: 3,
            organisation_name: "Indian Maritime University",
            goal_a1: "N-CB-1 : Enhance maritime education ecosystem in the country",
            intervention_a2: "N-CB-1.1 : Expand avenues for collaboration within the country and abroad for technical education",
            action_a3: "N-CB-1.1.1 : Establish joint programs with leading global maritime universities",
            goal_b1: "E-CB-1 : Expand avenues for collaboration within the country and abroad for technical education",
            intervention_b2: "E-CB-1.1 : IMU to collaborate with institutes in the country; develop short-term courses and get registered distance learning platform for technical education",
            action_b3: "E-CB-1.1.3 : Formulation of agreements",
            current_status: "Completed",
            updated_at: "2026-08-07"
          },
          {
            id: 4,
            organisation_name: "Indian Maritime University",
            goal_a1: "N-CB-1 : Enhance maritime education ecosystem in the country",
            intervention_a2: "N-CB-1.1 : Expand avenues for collaboration within the country and abroad for technical education",
            action_a3: "N-CB-1.1.1 : Establish joint programs with leading global maritime universities",
            goal_b1: "E-CB-1 : Expand avenues for collaboration within the country and abroad for technical education",
            intervention_b2: "E-CB-1.1 : IMU to collaborate with institutes in the country; develop short-term courses and get registered distance learning platform for technical education",
            action_b3: "E-CB-1.1.4 : Implementation and coordination (e.g. Establish joint project team to manage)",
            current_status: "Under Implementation On Time",
            updated_at: "2026-08-31"
          }
        ]);
      } else {
        setActionItems(rows);
      }
    } catch (err) {
      console.warn("OVOD Org List Data notice:", err.message);
      setActionItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique Dropdown Options derived from Data
  const options = useMemo(() => {
    const orgs = new Set();
    const ga1 = new Set();
    const ia2 = new Set();
    const aa3 = new Set();
    const gb1 = new Set();
    const ib2 = new Set();
    const ab3 = new Set();

    actionItems.forEach(item => {
      if (item.organisation_name) orgs.add(item.organisation_name);
      if (item.goal_a1) ga1.add(item.goal_a1);
      if (item.intervention_a2) ia2.add(item.intervention_a2);
      if (item.action_a3) aa3.add(item.action_a3);
      if (item.goal_b1) gb1.add(item.goal_b1);
      if (item.intervention_b2) ib2.add(item.intervention_b2);
      if (item.action_b3) ab3.add(item.action_b3);
    });

    return {
      organisations: Array.from(orgs),
      goalsA1: Array.from(ga1),
      interventionsA2: Array.from(ia2),
      actionsA3: Array.from(aa3),
      goalsB1: Array.from(gb1),
      interventionsB2: Array.from(ib2),
      actionsB3: Array.from(ab3),
    };
  }, [actionItems]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWing !== '0') count++;
    if (selectedOrg !== '0') count++;
    if (selectedGoalA1 !== '0') count++;
    if (selectedInterventionA2 !== '0') count++;
    if (selectedActionA3 !== '0') count++;
    if (selectedGoalB1 !== '0') count++;
    if (selectedInterventionB2 !== '0') count++;
    if (selectedActionB3 !== '0') count++;
    if (selectedStage !== '0') count++;
    if (selectedVibhas !== '0') count++;
    return count;
  }, [selectedWing, selectedOrg, selectedGoalA1, selectedInterventionA2, selectedActionA3, selectedGoalB1, selectedInterventionB2, selectedActionB3, selectedStage, selectedVibhas]);

  const handleResetFilters = () => {
    setSelectedWing('0');
    setSelectedOrg('0');
    setSelectedGoalA1('0');
    setSelectedInterventionA2('0');
    setSelectedActionA3('0');
    setSelectedGoalB1('0');
    setSelectedInterventionB2('0');
    setSelectedActionB3('0');
    setSelectedStage('0');
    setSelectedVibhas('0');
    setSearchTerm('');
  };

  // Filtered rows for AG Grid
  const filteredData = useMemo(() => {
    return actionItems.filter(item => {
      if (selectedOrg !== '0' && item.organisation_name !== selectedOrg && String(item.organisation_id) !== selectedOrg) return false;
      if (selectedGoalA1 !== '0' && item.goal_a1 !== selectedGoalA1) return false;
      if (selectedInterventionA2 !== '0' && item.intervention_a2 !== selectedInterventionA2) return false;
      if (selectedActionA3 !== '0' && item.action_a3 !== selectedActionA3) return false;
      if (selectedGoalB1 !== '0' && item.goal_b1 !== selectedGoalB1) return false;
      if (selectedInterventionB2 !== '0' && item.intervention_b2 !== selectedInterventionB2) return false;
      if (selectedActionB3 !== '0' && item.action_b3 !== selectedActionB3) return false;
      if (selectedStage !== '0' && String(item.current_status || '').toLowerCase() !== selectedStage.toLowerCase()) return false;
      
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const combined = `${item.organisation_name || ''} ${item.goal_a1 || ''} ${item.intervention_a2 || ''} ${item.action_a3 || ''} ${item.goal_b1 || ''} ${item.intervention_b2 || ''} ${item.action_b3 || ''} ${item.current_status || ''}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [actionItems, selectedOrg, selectedGoalA1, selectedInterventionA2, selectedActionA3, selectedGoalB1, selectedInterventionB2, selectedActionB3, selectedStage, searchTerm]);

  // Handle Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const userId = getUserIdFromToken();
      await deleteOvdAction(deleteTarget.id, userId);
      triggerNotification?.("Action item deleted successfully", "success");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      triggerNotification?.(err.message || "Failed to delete item", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Navy AG-Grid Column Definitions matching the Screenshot
  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      field: "sno",
      width: 70,
      minWidth: 60,
      headerClass: "text-center",
      cellClass: "text-center font-bold text-slate-700 dark:text-slate-200",
      valueGetter: (params) => params.node ? params.node.rowIndex + 1 : ''
    },
    {
      headerName: "Organisation",
      field: "organisation_name",
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => (
        <span className="font-bold text-slate-800 dark:text-slate-100">
          {params.value || 'Indian Maritime University'}
        </span>
      )
    },
    {
      headerName: "Goal (A1)",
      field: "goal_a1",
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Intervention (A2)",
      field: "intervention_a2",
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Action (A3)",
      field: "action_a3",
      minWidth: 180,
      flex: 1.4,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Goal (B1)",
      field: "goal_b1",
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Intervention (B2)",
      field: "intervention_b2",
      minWidth: 220,
      flex: 1.7,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Action (B3)",
      field: "action_b3",
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-tight font-semibold">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Current Status",
      field: "current_status",
      minWidth: 140,
      flex: 1.1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = params.value || 'Completed';
        const isCompleted = val.toLowerCase().includes('completed');
        const isDelayed = val.toLowerCase().includes('delayed');
        return (
          <div className="w-full flex items-center justify-center">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
              isCompleted 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : isDelayed
                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-blue-50 text-[#0f417a] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            }`}>
              {val}
            </span>
          </div>
        );
      }
    },
    {
      headerName: "Last Updated Date",
      field: "updated_at",
      minWidth: 120,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center font-medium text-slate-600 dark:text-slate-300",
      valueFormatter: (params) => params.value ? String(params.value).slice(0, 10) : '2026-08-31'
    },
    {
      headerName: "Update",
      field: "actions",
      width: 100,
      minWidth: 90,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center space-x-1.5 py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit ? onEdit(params.data) : null;
            }}
            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-2xs cursor-pointer"
            title="Edit B2/B3 Action"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(params.data);
            }}
            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-2xs cursor-pointer"
            title="Delete Action"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ], [onEdit]);

  // Export headers definition
  const exportHeaders = useMemo(() => [
    { label: 'Organisation', key: 'organisation_name' },
    { label: 'Goal (A1)', key: 'goal_a1' },
    { label: 'Intervention (A2)', key: 'intervention_a2' },
    { label: 'Action (A3)', key: 'action_a3' },
    { label: 'Goal (B1)', key: 'goal_b1' },
    { label: 'Intervention (B2)', key: 'intervention_b2' },
    { label: 'Action (B3)', key: 'action_b3' },
    { label: 'Current Status', key: 'current_status' },
    { label: 'Last Updated Date', key: 'updated_at' }
  ], []);

  const exportData = useMemo(() => filteredData.map((r, i) => ({
    sno: i + 1,
    organisation_name: r.organisation_name,
    goal_a1: r.goal_a1,
    intervention_a2: r.intervention_a2,
    action_a3: r.action_a3,
    goal_b1: r.goal_b1,
    intervention_b2: r.intervention_b2,
    action_b3: r.action_b3,
    current_status: r.current_status,
    updated_at: r.updated_at ? String(r.updated_at).slice(0, 10) : '2026-08-31'
  })), [filteredData]);

  return (
    <div className="space-y-6 select-none animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Main Table Card Container matching GMIS DataList */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Action Toolbar Header with Filter Toggle Button, Add B2/B3, Search, Copy & Export */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* Left Side: Dedicated Filter Toggle Button & Add B2/B3 Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            
            {/* 1. Filter Toggle Button (opens down like GMIS) */}
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

            {/* 2. Reset Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* 3. Add B2/B3 Button */}
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Add B2/B3</span>
            </button>

          </div>

          {/* Right Side: Search Bar, Row Count Selector, Total Badge, Copy & Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search action items..."
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
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Row Count Selector */}
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

            {/* Total Records Badge */}
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
              title="OVOD Action Items Data List"
              triggerNotification={triggerNotification}
            />

          </div>

        </div>

        {/* Collapsible Dedicated Filter Panel (opens down like GMIS) */}
        {showFilterPanel && (
          <div className="bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 animate-fade-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Action Items Parameters
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Ministry Wing Filter Top Bar */}
            <div className="max-w-md">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Ministry Wing:
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

            {/* 9 Filter Dropdowns in Responsive Grid matching Screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Organization
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.organisations.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  National Goal (A1)
                </label>
                <select
                  value={selectedGoalA1}
                  onChange={(e) => setSelectedGoalA1(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.goalsA1.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  National Intervention (A2)
                </label>
                <select
                  value={selectedInterventionA2}
                  onChange={(e) => setSelectedInterventionA2(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.interventionsA2.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  National Action (A3)
                </label>
                <select
                  value={selectedActionA3}
                  onChange={(e) => setSelectedActionA3(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.actionsA3.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Goal (B1)
                </label>
                <select
                  value={selectedGoalB1}
                  onChange={(e) => setSelectedGoalB1(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.goalsB1.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Intervention (B2)
                </label>
                <select
                  value={selectedInterventionB2}
                  onChange={(e) => setSelectedInterventionB2(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.interventionsB2.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Action (B3)
                </label>
                <select
                  value={selectedActionB3}
                  onChange={(e) => setSelectedActionB3(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {options.actionsB3.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Current Stage
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {OVOD_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Vibhas/Nawic
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

            </div>

            {/* Note banner */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Note: Any newly added B2/B3 will be grouped and displayed under its corresponding A2/A3.
              </p>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this action item? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                {deleting ? <span>Deleting...</span> : <span>Delete Item</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
