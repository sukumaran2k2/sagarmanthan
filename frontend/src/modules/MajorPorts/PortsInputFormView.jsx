import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Search, ArrowLeft, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Table from '../../components/Table';
import FormField from '../../components/FormField';

export default function PortsInputFormView({ userPermissions }) {
  const [subView, setSubView] = useState('list'); // 'list' or 'details'
  const [activeForm, setActiveForm] = useState('financial'); // 'financial' or 'traffic'
  const [activeTab, setActiveTab] = useState('actuals'); // 'targets' or 'actuals'
  const [selectedFy, setSelectedFy] = useState('Show All');
  const [selectedMonth, setSelectedMonth] = useState('Show All');
  const [selectedOrg, setSelectedOrg] = useState('Show All');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdowns loaded from DB
  const [organisations, setOrganisations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [commodityGroups, setCommodityGroups] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [directions, setDirections] = useState([]);
  const [flagTypes, setFlagTypes] = useState([]);

  // Data loaded from DB
  const [financialData, setFinancialData] = useState([]);
  const [trafficTargets, setTrafficTargets] = useState([]);
  const [trafficActuals, setTrafficActuals] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add_financial'); // add_financial, edit_financial, add_target, edit_target, add_actual
  const [editingRow, setEditingRow] = useState(null);

  // Form Fields State
  const [formOrg, setFormOrg] = useState('');
  const [formFy, setFormFy] = useState('2026-2027');
  const [formMonth, setFormMonth] = useState('April');
  
  // Financial parameters state
  const [opIncome, setOpIncome] = useState('');
  const [opExpend, setOpExpend] = useState('');
  const [totIncome, setTotIncome] = useState('');
  const [totExpend, setTotExpend] = useState('');
  const [opSurplus, setOpSurplus] = useState('');
  const [netSurplus, setNetSurplus] = useState('');
  const [opRatio, setOpRatio] = useState('');
  const [handlingCost, setHandlingCost] = useState('');
  const [profitTonne, setProfitTonne] = useState('');
  const [profitTeu, setProfitTeu] = useState('');
  const [profitDry, setProfitDry] = useState('');
  const [profitBreak, setProfitBreak] = useState('');
  const [profitLiquid, setProfitLiquid] = useState('');

  // Traffic targets state
  const [fiscalYearTarget, setFiscalYearTarget] = useState('');
  const [roRoTarget, setRoRoTarget] = useState('');
  const [roPaxTarget, setRoPaxTarget] = useState('');
  const [containerTargetMteu, setContainerTargetMteu] = useState('');

  // Traffic actuals state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedFlagType, setSelectedFlagType] = useState('');
  const [actualValue, setActualValue] = useState('');

  // Reset pagination when form type or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeForm, activeTab]);

  // Load Dropdowns on Mount
  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation")
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_traffic_category")
      .then(res => setCategories(res.data || []))
      .catch(err => console.error("Error loading categories:", err));

    axios.get("http://localhost:3000/get-traffic-commodity-groups")
      .then(res => setCommodityGroups(res.data || []))
      .catch(err => console.error("Error loading commodity groups:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_traffic_direction")
      .then(res => setDirections(res.data || []))
      .catch(err => console.error("Error loading directions:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_traffic_flag_type")
      .then(res => setFlagTypes(res.data || []))
      .catch(err => console.error("Error loading flag types:", err));
  }, []);

  // Fetch commodities when selected group changes
  useEffect(() => {
    if (selectedGroup) {
      axios.get(`http://localhost:3000/get-traffic-commodities?groupId=${selectedGroup}`)
        .then(res => setCommodities(res.data || []))
        .catch(err => console.error("Error loading commodities:", err));
    } else {
      setCommodities([]);
    }
  }, [selectedGroup]);

  // Load DB Data based on active form/tab and pagination parameters
  const refreshData = () => {
    if (activeForm === 'financial') {
      axios.get("http://localhost:3000/financial-parameter/1", {
        params: {
          page: currentPage,
          limit: entriesLimit
        }
      })
        .then(res => {
          if (res.data?.pagination) {
            setFinancialData(res.data.data || []);
            setTotalEntries(res.data.pagination.total);
          } else {
            setFinancialData(res.data || []);
            setTotalEntries(res.data.length || 0);
          }
        })
        .catch(err => console.error("Error loading financial parameters:", err));
    } else if (activeForm === 'traffic') {
      if (activeTab === 'targets') {
        axios.get("http://localhost:3000/get-fiscal-year-target-list")
          .then(res => {
            setTrafficTargets(res.data || []);
            setTotalEntries(res.data.length || 0);
          })
          .catch(err => console.error("Error loading traffic targets:", err));
      } else {
        axios.get("http://localhost:3000/get-traffic-actual-data", {
          params: {
            page: currentPage,
            limit: entriesLimit
          }
        })
          .then(res => {
            if (res.data?.pagination) {
              setTrafficActuals(res.data.data || []);
              setTotalEntries(res.data.pagination.total);
            } else {
              setTrafficActuals(res.data || []);
              setTotalEntries(res.data.length || 0);
            }
          })
          .catch(err => console.error("Error loading traffic actuals:", err));
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeForm, activeTab, currentPage, entriesLimit]);

  // Main list configurations
  const formList = [
    { sno: 1, coding: 'K-1.1', desc: 'Financial Parameters for Major Ports' },
    { sno: 2, coding: 'K-2.1', desc: 'Traffic' },
    { sno: 3, coding: 'K-3.1', desc: 'Cruise and Passenger Traffic' },
    { sno: 4, coding: 'K-4.1', desc: 'Port Performance' },
    { sno: 5, coding: 'K-5.1', desc: 'Renewable Energy' }
  ];

  const handleRowClick = (desc) => {
    if (desc === 'Financial Parameters for Major Ports') {
      setActiveForm('financial');
      setSubView('details');
    } else if (desc === 'Traffic') {
      setActiveForm('traffic');
      setSubView('details');
    }
  };

  const listColDefs = [
    { headerName: 'S.No.', field: 'sno', width: 100, cellClass: 'text-slate-500 font-bold' },
    { headerName: 'Coding', field: 'coding', width: 150, cellClass: 'text-slate-800 font-bold font-mono' },
    {
      headerName: 'Description',
      field: 'desc',
      flex: 1,
      cellRenderer: (params) => {
        const desc = params.value;
        const isClickable = desc === 'Financial Parameters for Major Ports' || desc === 'Traffic';
        return (
          <button
            onClick={() => handleRowClick(desc)}
            className={`text-left font-extrabold hover:text-blue-700 transition-colors cursor-pointer ${
              isClickable ? 'underline text-[#1d428a]' : 'text-slate-700'
            }`}
          >
            {desc}
          </button>
        );
      }
    }
  ];

  // Ag-Grid Columns Configuration
  const financialColDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit, width: 80, pinned: 'left' },
    { headerName: 'Organisation', field: 'organisation_name', width: 220, pinned: 'left', cellClass: 'font-extrabold text-slate-800' },
    { headerName: 'Financial Year', field: 'annually_financial_year', width: 120 },
    { headerName: 'Month', field: 'month', width: 100 },
    { headerName: 'Operating Income (In Cr.)', field: 'operating_income', width: 180 },
    { headerName: 'Operating Expenditure (In Cr.)', field: 'operating_expenditure', width: 200 },
    { headerName: 'Total Income (In Cr.)', field: 'total_income', width: 160 },
    { headerName: 'Total Expenditure (In Cr.)', field: 'total_expenditure', width: 180 },
    { headerName: 'Operating Surplus (In Cr.)', field: 'operating_surplus', width: 180 },
    { headerName: 'Net Surplus (In Cr.)', field: 'net_surplus', width: 150 },
    { headerName: 'Operating Ratio (%)', field: 'operating_ratio', width: 150 },
    { headerName: 'Per Tonne Handling Cost (In Rupees)', field: 'per_tonne_handling_cost', width: 230 },
    {
      headerName: 'Action',
      width: 90,
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenEditFinancial(params.data)}
          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )
    }
  ], [currentPage, entriesLimit]);

  const trafficTargetColDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1, width: 80 },
    { headerName: 'Organisation', field: 'organisation_name', width: 250, cellClass: 'font-extrabold text-slate-800' },
    { headerName: 'Financial Year', field: 'financial_year', width: 150 },
    { headerName: 'Fiscal Year Target (MMT)', field: 'fiscal_year_target', width: 200 },
    { headerName: 'Fiscal Year Actual (MMT)', field: 'fiscal_year_actual', width: 200 },
    { 
      headerName: 'Achievement (%)', 
      field: 'achievement_percentage', 
      width: 180,
      valueFormatter: (params) => params.value ? `${parseFloat(params.value).toFixed(2)}%` : '0%'
    },
    {
      headerName: 'Action',
      width: 90,
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenEditTarget(params.data)}
          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )
    }
  ], []);

  const trafficActualColDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit, width: 80 },
    { headerName: 'Organisation', field: 'organisation_name', width: 220, cellClass: 'font-extrabold text-slate-800' },
    { headerName: 'Financial Year', field: 'fiscal_year', width: 140 },
    { headerName: 'Month', field: 'month', width: 110 },
    { headerName: 'Category', field: 'category_name', width: 150 },
    { headerName: 'Commodity Group', field: 'commodity_group_name', width: 160 },
    { headerName: 'Commodity', field: 'commodity_name', width: 180 },
    { headerName: 'Direction', field: 'direction_name', width: 120 },
    { headerName: 'Flag Type', field: 'flag_type_name', width: 140 },
    { headerName: 'Value', field: 'value', width: 120 }
  ], [currentPage, entriesLimit]);

  // Filter Data Client-Side (Only for local filter boxes. Note: Search is dynamic or local depending on page count)
  const filteredData = useMemo(() => {
    let raw = [];
    if (activeForm === 'financial') {
      raw = financialData;
    } else {
      raw = activeTab === 'targets' ? trafficTargets : trafficActuals;
    }

    return raw.filter(row => {
      const rowFy = row.annually_financial_year || row.financial_year || row.fiscal_year;
      const rowMonth = row.month;
      const rowOrg = row.organisation_name;

      const matchFy = selectedFy === 'Show All' || rowFy === selectedFy;
      const matchMonth = selectedMonth === 'Show All' || rowMonth === selectedMonth;
      const matchOrg = selectedOrg === 'Show All' || rowOrg === selectedOrg;
      const matchSearch = searchTerm === '' || (rowOrg && rowOrg.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchFy && matchMonth && matchOrg && matchSearch;
    });
  }, [financialData, trafficTargets, trafficActuals, activeForm, activeTab, selectedFy, selectedMonth, selectedOrg, searchTerm]);

  // Open Add Modals
  const handleOpenAdd = () => {
    setEditingRow(null);
    setFormOrg(organisations[0]?.organisation_id || '');
    setFormFy('2026-2027');
    setFormMonth('April');

    if (activeForm === 'financial') {
      setModalType('add_financial');
      setOpIncome(''); setOpExpend(''); setTotIncome(''); setTotExpend('');
      setOpSurplus(''); setNetSurplus(''); setOpRatio(''); setHandlingCost('');
      setProfitTonne(''); setProfitTeu(''); setProfitDry(''); setProfitBreak(''); setProfitLiquid('');
    } else {
      if (activeTab === 'targets') {
        setModalType('add_target');
        setFiscalYearTarget(''); setRoRoTarget(''); setRoPaxTarget(''); setContainerTargetMteu('');
      } else {
        setModalType('add_actual');
        setSelectedCategory(categories[0]?.category_id || '');
        setSelectedGroup(commodityGroups[0]?.commodity_group_id || '');
        setSelectedDirection(directions[0]?.direction_id || '');
        setSelectedFlagType(flagTypes[0]?.flag_type_id || '');
        setActualValue('');
      }
    }
    setIsModalOpen(true);
  };

  // Open Edit Modals
  const handleOpenEditFinancial = (row) => {
    setEditingRow(row);
    setFormOrg(row.organisation_id);
    setFormFy(row.annually_financial_year);
    setFormMonth(row.month);
    setOpIncome(row.operating_income);
    setOpExpend(row.operating_expenditure);
    setTotIncome(row.total_income);
    setTotExpend(row.total_expenditure);
    setOpSurplus(row.operating_surplus);
    setNetSurplus(row.net_surplus);
    setOpRatio(row.operating_ratio);
    setHandlingCost(row.per_tonne_handling_cost);
    setProfitTonne(row.operating_profit_tonne);
    setProfitTeu(row.teu_container);
    setProfitDry(row.tonne_dry_bulk);
    setProfitBreak(row.tonne_break_bulk);
    setProfitLiquid(row.tonne_liquid_bulk);
    setModalType('edit_financial');
    setIsModalOpen(true);
  };

  const handleOpenEditTarget = (row) => {
    setEditingRow(row);
    setFormOrg(row.organisation_id);
    setFormFy(row.financial_year);
    setFiscalYearTarget(row.fiscal_year_target);
    // Fetch detailed targets for edit
    axios.get(`http://localhost:3000/get-fiscal-year-target-data?financialYear=${row.financial_year}&organisationId=${row.organisation_id}`)
      .then(res => {
        const fullDetails = res.data?.[0];
        if (fullDetails) {
          setRoRoTarget(fullDetails.ro_ro_target || '');
          setRoPaxTarget(fullDetails.ro_pax_target || '');
          setContainerTargetMteu(fullDetails.container_target_mteu || '');
        }
      })
      .catch(err => console.error("Error loading targets details:", err));

    setModalType('edit_target');
    setIsModalOpen(true);
  };

  // Submit/Save Handlers
  const handleSave = async (e) => {
    e.preventDefault();

    if (modalType === 'add_financial' || modalType === 'edit_financial') {
      const payload = {
        organisationId: formOrg,
        financialYear: formFy,
        month: formMonth,
        operatingIncome: opIncome,
        operatingExpenditure: opExpend,
        totalIncome: totIncome,
        totalExpenditure: totExpend,
        perTonneHandlingCost: handlingCost,
        operatingSurplus: opSurplus,
        netSurplus: netSurplus,
        operatingRatio: opRatio,
        operatingProfit: profitTonne,
        teuContainer: profitTeu,
        tonneofDrybulk: profitDry,
        tonneofBreakbulk: profitBreak,
        tonneofLiquidbulk: profitLiquid,
        userID: 1
      };

      try {
        if (modalType === 'edit_financial') {
          payload.finanacialparameterID = editingRow.id;
          await axios.post("http://localhost:3000/update-financial-data-parameter", payload);
        } else {
          await axios.post("http://localhost:3000/financial-parameter", payload);
        }
        setIsModalOpen(false);
        refreshData();
      } catch (err) {
        console.error("Error saving financial parameter:", err);
        alert(err.response?.data?.error || "Error saving record");
      }
    } else if (modalType === 'add_target' || modalType === 'edit_target') {
      const payload = {
        financialYear: formFy,
        organisationId: formOrg,
        fiscalYearTarget,
        roRoTarget,
        roPaxTarget,
        containerTargetMteu,
        userId: 1
      };

      try {
        if (modalType === 'edit_target') {
          await axios.post("http://localhost:3000/update-fiscal-year-target-data", payload);
        } else {
          await axios.post("http://localhost:3000/submit-fiscal-year-target-data", payload);
        }
        setIsModalOpen(false);
        refreshData();
      } catch (err) {
        console.error("Error saving traffic target:", err);
        alert("Error saving record");
      }
    } else if (modalType === 'add_actual') {
      const payload = {
        fiscalYear: formFy,
        month: formMonth === 'January' ? 1 : formMonth === 'February' ? 2 : formMonth === 'March' ? 3 : formMonth === 'April' ? 4 : formMonth === 'May' ? 5 : formMonth === 'June' ? 6 : formMonth === 'July' ? 7 : formMonth === 'August' ? 8 : formMonth === 'September' ? 9 : formMonth === 'October' ? 10 : formMonth === 'November' ? 11 : 12,
        organisationId: formOrg,
        userId: 1,
        commodityData: [{
          category_id: selectedCategory,
          commodity_id: selectedCommodity,
          direction_id: selectedDirection,
          flag_type_id: selectedFlagType,
          value: actualValue
        }],
        trafficData: {
          ro_ro_traffic: null,
          ro_pax_traffic: null
        }
      };

      try {
        await axios.post("http://localhost:3000/submit-commodity-data", payload);
        setIsModalOpen(false);
        refreshData();
      } catch (err) {
        console.error("Error saving actual commodity data:", err);
        alert("Error saving record");
      }
    }
  };

  const totalPages = Math.ceil(totalEntries / entriesLimit);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {subView === 'list' ? (
        /* Form list view */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center border-b border-slate-100 pb-4">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide font-display">
              KPI - Major Ports (Input Forms)
            </h1>
          </div>

          <Table 
            rowData={formList}
            columnDefs={listColDefs}
            rowHeight={46}
            headerHeight={38}
            autoSize={true}
          />
        </div>
      ) : (
        /* Details Grid View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Title row */}
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSubView('list')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Back to Input Forms"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight font-display">
                {activeForm === 'financial' ? 'Financial Parameters for Major Ports' : 'Traffic Records'}
              </h1>
            </div>
            
            {/* Target vs Actual Switcher */}
            {activeForm === 'traffic' && (
              <div className="flex border border-slate-200 rounded-xl overflow-hidden self-start md:self-auto bg-slate-50 p-1">
                <button
                  onClick={() => setActiveTab('targets')}
                  className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                    activeTab === 'targets'
                      ? 'bg-[#0f417a] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Targets
                </button>
                <button
                  onClick={() => setActiveTab('actuals')}
                  className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                    activeTab === 'actuals'
                      ? 'bg-[#0f417a] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Actuals
                </button>
              </div>
            )}
          </div>

          {/* Filter row */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Financial Year */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Financial Year</label>
              <div className="relative">
                <select
                  value={selectedFy}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
                >
                  <option>Show All</option>
                  <option>2026-2027</option>
                  <option>2025-2026</option>
                  <option>2024-2025</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Month */}
            {activeTab === 'actuals' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
                  >
                    <option>Show All</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Organisation Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organisation Name</label>
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 animate-none"
                >
                  <option>Show All</option>
                  {organisations.map(o => (
                    <option key={o.organisation_id} value={o.organisation_name}>{o.organisation_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table Controls and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex space-x-1">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">Copy</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">Excel</button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[10px] font-bold text-slate-655 transition cursor-pointer">PDF</button>
            </div>

            {/* Search Input and Add button */}
            <div className="flex items-center space-x-3 self-end md:self-auto">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Search:</span>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 text-xs pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-medium"
                  />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Show</span>
                <select
                  value={entriesLimit}
                  onChange={(e) => {
                    setEntriesLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Entries</span>
              </div>

              {(!userPermissions || userPermissions.add !== false) && (
                <button 
                  onClick={handleOpenAdd}
                  className="bg-[#2bab4f] hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer h-[30px]"
                >
                  <Plus className="h-4 w-4" />
                  <span>{activeForm === 'financial' ? 'Add parameters' : activeTab === 'targets' ? 'Add target' : 'Add actual data'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Table 
              rowData={filteredData}
              columnDefs={activeForm === 'financial' ? financialColDefs : activeTab === 'targets' ? trafficTargetColDefs : trafficActualColDefs}
              rowHeight={46}
              headerHeight={38}
              autoSize={false}
            />

            {/* Pagination Controls */}
            {activeTab === 'actuals' && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl text-xs gap-4 shadow-sm">
                <span className="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
                  <span className="font-bold text-slate-800">{totalEntries}</span> entries
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p
                          ? 'bg-[#0f417a] text-white shadow-sm'
                          : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-display">
                {modalType.startsWith('add') ? 'Register New Entry' : 'Update Record Details'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Common fields: Org, FY, Month */}
                <FormField
                  label="Organisation Name"
                  type="select"
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  options={organisations.map(o => ({ value: o.organisation_id, label: o.organisation_name }))}
                  required
                />
                
                <FormField
                  label="Financial Year"
                  type="select"
                  value={formFy}
                  onChange={(e) => setFormFy(e.target.value)}
                  options={[{ value: '2026-2027', label: '2026-2027' }, { value: '2025-2026', label: '2025-2026' }]}
                  required
                />

                {(modalType.includes('financial') || modalType.includes('actual')) && (
                  <FormField
                    label="Month"
                    type="select"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    options={['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map(m => ({ value: m, label: m }))}
                    required
                  />
                )}
              </div>

              {/* Financial parameter inputs */}
              {modalType.includes('financial') && (
                <div className="border-t border-slate-100 pt-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Parameters Values (in Crs)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField label="Operating Income" type="text" value={opIncome} onChange={(e) => setOpIncome(e.target.value)} required />
                    <FormField label="Operating Expenditure" type="text" value={opExpend} onChange={(e) => setOpExpend(e.target.value)} required />
                    <FormField label="Total Income" type="text" value={totIncome} onChange={(e) => setTotIncome(e.target.value)} required />
                    <FormField label="Total Expenditure" type="text" value={totExpend} onChange={(e) => setTotExpend(e.target.value)} required />
                    <FormField label="Operating Surplus" type="text" value={opSurplus} onChange={(e) => setOpSurplus(e.target.value)} required />
                    <FormField label="Net Surplus" type="text" value={netSurplus} onChange={(e) => setNetSurplus(e.target.value)} required />
                    <FormField label="Operating Ratio (%)" type="text" value={opRatio} onChange={(e) => setOpRatio(e.target.value)} required />
                    <FormField label="Per Tonne Handling Cost (INR)" type="text" value={handlingCost} onChange={(e) => setHandlingCost(e.target.value)} required />
                    <FormField label="Profit / Tonne" type="text" value={profitTonne} onChange={(e) => setProfitTonne(e.target.value)} />
                    <FormField label="Profit / TEU" type="text" value={profitTeu} onChange={(e) => setProfitTeu(e.target.value)} />
                    <FormField label="Profit / Tonne of Dry Bulk" type="text" value={profitDry} onChange={(e) => setProfitDry(e.target.value)} />
                    <FormField label="Profit / Tonne of Break Bulk" type="text" value={profitBreak} onChange={(e) => setProfitBreak(e.target.value)} />
                    <FormField label="Profit / Tonne of Liquid Bulk" type="text" value={profitLiquid} onChange={(e) => setProfitLiquid(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Traffic Target inputs */}
              {modalType.includes('target') && (
                <div className="border-t border-slate-100 pt-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Targets Targets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField label="Fiscal Year Target (MMT)" type="text" value={fiscalYearTarget} onChange={(e) => setFiscalYearTarget(e.target.value)} required />
                    <FormField label="Ro-Ro Target" type="text" value={roRoTarget} onChange={(e) => setRoRoTarget(e.target.value)} />
                    <FormField label="Ro-Pax Target" type="text" value={roPaxTarget} onChange={(e) => setRoPaxTarget(e.target.value)} />
                    <FormField label="Container Target (MTEU)" type="text" value={containerTargetMteu} onChange={(e) => setContainerTargetMteu(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Traffic Actuals inputs */}
              {modalType === 'add_actual' && (
                <div className="border-t border-slate-100 pt-5 space-y-5">
                  <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Actual Values Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      label="Traffic Category"
                      type="select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      options={categories.map(c => ({ value: c.category_id, label: c.category_name }))}
                      required
                    />
                    <FormField
                      label="Commodity Group"
                      type="select"
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      options={commodityGroups.map(g => ({ value: g.commodity_group_id, label: g.commodity_group_name }))}
                      required
                    />
                    <FormField
                      label="Commodity"
                      type="select"
                      value={selectedCommodity}
                      onChange={(e) => setSelectedCommodity(e.target.value)}
                      options={commodities.map(c => ({ value: c.commodity_id, label: c.commodity_name }))}
                      required
                    />
                    <FormField
                      label="Direction"
                      type="select"
                      value={selectedDirection}
                      onChange={(e) => setSelectedDirection(e.target.value)}
                      options={directions.map(d => ({ value: d.direction_id, label: d.direction_name }))}
                      required
                    />
                    <FormField
                      label="Flag Type"
                      type="select"
                      value={selectedFlagType}
                      onChange={(e) => setSelectedFlagType(e.target.value)}
                      options={flagTypes.map(f => ({ value: f.flag_type_id, label: f.flag_type_name }))}
                      required
                    />
                    <FormField
                      label="Value (MMT / TEU)"
                      type="text"
                      value={actualValue}
                      onChange={(e) => setActualValue(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-5 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow transition cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
