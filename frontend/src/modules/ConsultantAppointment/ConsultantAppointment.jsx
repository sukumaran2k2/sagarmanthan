import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FileEdit,
  FilePieChart,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Home,
  X,
  Calendar,
  User,
  Activity,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Edit,
  ChevronLeft
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';
import Table from '../../components/Table';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule]);

const DB_WINGS = [
  { wing_id: 1, wing_name: "Shipping" },
  { wing_id: 2, wing_name: "Vigilance" },
  { wing_id: 3, wing_name: "Ports" },
  { wing_id: 4, wing_name: "IWT" },
  { wing_id: 5, wing_name: "Administration" },
  { wing_id: 6, wing_name: "Coord-I" },
  { wing_id: 7, wing_name: "Coord-II" },
  { wing_id: 8, wing_name: "DGLL, Parliament & TRW" },
  { wing_id: 9, wing_name: "Development" },
  { wing_id: 10, wing_name: "Finance" },
  { wing_id: 11, wing_name: "Sagarmala" },
  { wing_id: 12, wing_name: "Information Technology" },
  { wing_id: 13, wing_name: "Office of Economic Advisor" },
  { wing_id: 14, wing_name: "Special Initiatives & Projects" }
];

const DB_DIVISIONS = [
  { division_id: 1, division_name: "Shipping-I" },
  { division_id: 2, division_name: "Shipping-II" },
  { division_id: 3, division_name: "Shipping-III" },
  { division_id: 4, division_name: "Vigilance" },
  { division_id: 5, division_name: "PD-I" },
  { division_id: 6, division_name: "PD-II" },
  { division_id: 7, division_name: "PPP" },
  { division_id: 8, division_name: "PHRD" },
  { division_id: 9, division_name: "IWT-I" },
  { division_id: 10, division_name: "IWT-II" },
  { division_id: 11, division_name: "Admn." },
  { division_id: 12, division_name: "Coord-I" },
  { division_id: 13, division_name: "Coord-II" },
  { division_id: 14, division_name: "DGLL, Parl. & TRW" },
  { division_id: 15, division_name: "Devlopment" },
  { division_id: 16, division_name: "Finance" },
  { division_id: 17, division_name: "Sagarmala -I" },
  { division_id: 18, division_name: "Sagarmala -II" },
  { division_id: 19, division_name: "Sagarmala-III , ALHW & Media" },
  { division_id: 20, division_name: "IT" },
  { division_id: 21, division_name: "PD-III" },
  { division_id: 22, division_name: "PD- IV" },
  { division_id: 23, division_name: "Special Initiatives & Projects" }
];

// Sequential checklist stages for Consultant Appointment Status
const STAGES = [
  { key: 'adminApproval', label: 'Admin Approval for engaging Consultant' },
  { key: 'tenderPublished', label: 'Tender Published' },
  { key: 'preBidQueries', label: 'Pre-bid Queries Responded' },
  { key: 'bidReceived', label: 'Bid Received' },
  { key: 'techBidFinalized', label: 'Technical Bid Finalized' },
  { key: 'finBidFinalized', label: 'Financial Bid Finalized' },
  { key: 'workOrderIssued', label: 'Work Order Issued' },
  { key: 'contractSigned', label: 'Contract Signed' },
];

const getStatusFromStages = (stages) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (stages[STAGES[i].key]) {
      return STAGES[i].label;
    }
  }
  return 'Initiated';
};

export default function ConsultantAppointmentView({ activeSubTab, setActiveSubTab, triggerNotification, userPermissions }) {
  const [appointments, setAppointments] = useState([]);
  const [reportGridDataFromServer, setReportGridDataFromServer] = useState([]);
  const [reportColDefs, setReportColDefs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [updatingAppointment, setUpdatingAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('');

  // CA Report Drill-down State
  const [drillDownPath, setDrillDownPath] = useState([{ type: 'abstract', title: 'Abstract ( Wing Wise )' }]);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownColDefs, setDrillDownColDefs] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState(null);

  // Form Fields State
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formAppointmentType, setFormAppointmentType] = useState('Full Time');
  const [formNumResources, setFormNumResources] = useState(1);
  const [formAdminApprovalDate, setFormAdminApprovalDate] = useState('');
  const [formStages, setFormStages] = useState({
    adminApproval: false,
    tenderPublished: false,
    preBidQueries: false,
    bidReceived: false,
    techBidFinalized: false,
    finBidFinalized: false,
    workOrderIssued: false,
    contractSigned: false
  });

  const WINGS = DB_WINGS.map(w => w.wing_name);
  const DIVISIONS = DB_DIVISIONS.map(d => d.division_name);

  const SUB_TABS = [
    { id: 'Consultant Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'Consultant Reports', label: 'Reports', icon: FilePieChart }
  ];

  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'Consultant Input Form';

  const fetchData = () => {
    axios.get("http://localhost:3000/consultant-appointment")
      .then(res => {
        const mapped = res.data.map((b, idx) => ({
          id: b.consultant_appointment_id,
          wing: b.wing_name || 'Unknown',
          division: b.division_name || 'Unknown',
          appointmentType: b.appointment_type || 'Full Time',
          numResources: b.number_of_resources || 1,
          stages: {
            adminApproval: b.admin_approval_for_nkg_consultant === 'Yes' || b.admin_approval_for_nkg_consultant === 1 || b.admin_approval_for_nkg_consultant === true,
            adminApprovalDate: b.admin_approval_for_nkg_consultant_date ? new Date(b.admin_approval_for_nkg_consultant_date).toISOString().split('T')[0] : '',
            tenderPublished: b.tender_published === 'Yes' || b.tender_published === 1 || b.tender_published === true,
            preBidQueries: b.pre_bid_queries_responded === 'Yes' || b.pre_bid_queries_responded === 1 || b.pre_bid_queries_responded === true,
            bidReceived: b.bid_received === 'Yes' || b.bid_received === 1 || b.bid_received === true,
            techBidFinalized: b.technical_bid_finalized === 'Yes' || b.technical_bid_finalized === 1 || b.technical_bid_finalized === true,
            finBidFinalized: b.financial_bid_finalized === 'Yes' || b.financial_bid_finalized === 1 || b.financial_bid_finalized === true,
            workOrderIssued: b.work_order_issued === 'Yes' || b.work_order_issued === 1 || b.work_order_issued === true,
            contractSigned: b.contract_signed === 'Yes' || b.contract_signed === 1 || b.contract_signed === true
          }
        }));
        setAppointments(mapped);
      })
      .catch(err => console.error("Error loading CA data:", err));

  };

  const currentView = drillDownPath[drillDownPath.length - 1];

  const mapColDefs = useCallback((cols) => {
    return cols.map(col => {
      if (col.children) {
        return { ...col, children: mapColDefs(col.children) };
      }
      
      const fieldLower = col.field?.toLowerCase() || '';
      const isWingName = fieldLower === 'wing name' || fieldLower === 'wing';

      return {
        ...col,
        filter: true,
        sortable: true,
        resizable: true,
        minWidth: col.width || 120,
        cellRenderer: (params) => {
          if (params.value === null || params.value === undefined) return '';

          // 1. Click Wing Name -> go to Division Report
          if (isWingName && currentView.type === 'abstract') {
            return (
              <button
                className="text-blue-600 font-bold hover:text-blue-800 underline cursor-pointer"
                onClick={() => {
                  const wingId = params.data["Wing ID"] || params.data["wing_id"] || 0;
                  setDrillDownPath(prev => [...prev, {
                    type: 'division',
                    wingId,
                    title: `Division Wise Report - ${params.value}`
                  }]);
                }}
              >
                {params.value}
              </button>
            );
          }

          // 2. Click Total Posts -> go to Division Report (if on Abstract)
          if (col.field === 'No of Consultant Officer' && currentView.type === 'abstract') {
            return (
              <button
                className="text-blue-600 font-bold hover:text-blue-800 underline cursor-pointer"
                onClick={() => {
                  const wingId = params.data["Wing ID"] || params.data["wing_id"] || 0;
                  const wingName = params.data["Wing Name"] || '';
                  setDrillDownPath(prev => [...prev, {
                    type: 'division',
                    wingId,
                    title: `Division Wise Report - ${wingName}`
                  }]);
                }}
              >
                {params.value}
              </button>
            );
          }

          // 3. Click any metrics -> go to Candidates
          if (col.field !== 'S No' && col.field !== 'Wing ID' && col.field !== 'Wing Name' && col.field !== 'Division ID' && col.field !== 'Division Name') {
            return (
              <button
                className="text-blue-600 font-bold hover:text-blue-800 underline cursor-pointer"
                onClick={() => {
                  if (currentView.type === 'abstract') {
                    const wingId = params.data["Wing ID"] || params.data["wing_id"] || 0;
                    const wingName = params.data["Wing Name"] || '';
                    setDrillDownPath(prev => [...prev, {
                      type: 'candidates_wing',
                      wingId,
                      title: `Consultants List (Wing: ${wingName})`
                    }]);
                  } else if (currentView.type === 'division') {
                    const divisionId = params.data["Division ID"] || params.data["division_id"] || 0;
                    const divisionName = params.data["Division Name"] || '';
                    setDrillDownPath(prev => [...prev, {
                      type: 'candidates_div',
                      divisionId,
                      title: `Consultants List (Division: ${divisionName})`
                    }]);
                  }
                }}
              >
                {params.value}
              </button>
            );
          }

          return params.value;
        }
      };
    });
  }, [currentView]);

  const fetchDrillDownData = useCallback(() => {
    setDrillDownLoading(true);
    setDrillDownError(null);
    let endpoint = '';
    
    if (currentView.type === 'abstract') {
      endpoint = '/consultantapp-report';
    } else if (currentView.type === 'division') {
      endpoint = `/cadivision-report/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_wing') {
      endpoint = `/wingwise-cacandidate/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_div') {
      endpoint = `/divisionwise-cacandidate/${currentView.divisionId}/`;
    }

    if (!endpoint) return;

    axios.get(`http://localhost:3000${endpoint}`)
      .then(res => {
        const fetchedData = res.data?.rowData || res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDrillDownData(fetchedData);
        
        if (res.data?.columnDefs) {
          setDrillDownColDefs(mapColDefs(res.data.columnDefs));
        } else {
          if (fetchedData.length > 0) {
            const fallbackDefs = Object.keys(fetchedData[0]).map(key => {
              const isNumerical = fetchedData.some(row => typeof row[key] === 'number');
              const isIdColumn = key.toLowerCase().includes('id');
              return {
                field: key,
                headerName: key.replace(/_/g, ' ').toUpperCase(),
                minWidth: 150,
                filter: true,
                sortable: true,
                cellRenderer: (isNumerical && !isIdColumn) ? (params) => {
                  if (params.value === null || params.value === undefined) return '';
                  return (
                    <button
                      className="text-blue-600 font-semibold hover:text-blue-800 underline cursor-pointer"
                      onClick={() => {
                        // fallback cell click if needed
                      }}
                    >
                      {params.value}
                    </button>
                  );
                } : undefined
              };
            });
            setDrillDownColDefs(fallbackDefs);
          } else {
            setDrillDownColDefs([]);
          }
        }
      })
      .catch(err => {
        console.error("Error loading CA drill-down data:", err);
        setDrillDownError("Failed to load report data.");
      })
      .finally(() => setDrillDownLoading(false));
  }, [currentView, mapColDefs]);

  useEffect(() => {
    if (currentTab === 'Consultant Reports') {
      fetchDrillDownData();
    }
  }, [currentTab, drillDownPath, fetchDrillDownData]);

  useEffect(() => {
    fetchData();
  }, [isAdding, updatingAppointment]);

  const handleStartUpdate = (row) => {
    const original = appointments.find(a => a.id === row.id);
    if (original) {
      setUpdatingAppointment(original);
      setFormWing(original.wing);
      setFormDivision(original.division);
      setFormAppointmentType(original.appointmentType);
      setFormNumResources(original.numResources);
      setFormStages({ ...original.stages });
      setFormAdminApprovalDate(original.stages.adminApprovalDate || '');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formWing || !formDivision) {
      alert('Please fill out all required fields.');
      return;
    }

    const selectedWingObj = DB_WINGS.find(w => w.wing_name === formWing);
    const selectedDivisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision);
    const wingId = selectedWingObj ? selectedWingObj.wing_id : null;
    const divisionId = selectedDivisionObj ? selectedDivisionObj.division_id : null;

    let selectedStage = 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (formStages[STAGES[i].key]) {
        selectedStage = i + 1;
      }
    }

    try {
      await axios.post("http://localhost:3000/consultant-appointment", {
        wing: wingId,
        division: divisionId,
        resourceNumber: Number(formNumResources) || 1,
        appointmentType: formAppointmentType,
        adminApproval: formStages.adminApproval ? "Yes" : "No",
        adminApprovalDate: formAdminApprovalDate || "",
        tenderPublished: formStages.tenderPublished ? "Yes" : "No",
        tenderPublishedDate: "",
        preBidQueriesResponded: formStages.preBidQueries ? "Yes" : "No",
        preBidQueriesRespondedDate: "",
        bidReceived: formStages.bidReceived ? "Yes" : "No",
        bidReceivedDate: "",
        technicalBidFinalized: formStages.techBidFinalized ? "Yes" : "No",
        technicalBidFinalizedDate: "",
        financialBidFinalized: formStages.finBidFinalized ? "Yes" : "No",
        financialBidFinalizedDate: "",
        workOrderIssued: formStages.workOrderIssued ? "Yes" : "No",
        workOrderIssuedDate: "",
        contractSigned: formStages.contractSigned ? "Yes" : "No",
        contractSignedDate: "",
        consultingFirmName: "Consultant Firm",
        candidateIDs: [],
        stageID: selectedStage,
        userID: 1
      });

      setIsAdding(false);
      setFormWing('');
      setFormDivision('');
      setFormAppointmentType('Full Time');
      setFormNumResources(1);
      setFormAdminApprovalDate('');
      setFormStages({
        adminApproval: false,
        tenderPublished: false,
        preBidQueries: false,
        bidReceived: false,
        techBidFinalized: false,
        finBidFinalized: false,
        workOrderIssued: false,
        contractSigned: false
      });

      if (triggerNotification) {
        triggerNotification(`New Consultant Appointment registered successfully for ${formWing} (${formDivision}).`);
      }
      fetchData();
    } catch (err) {
      console.error("Error creating consultant appointment:", err);
      alert("Failed to save. Please check database connections.");
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!formWing || !formDivision) {
      alert('Please fill out all required fields.');
      return;
    }

    const selectedWingObj = DB_WINGS.find(w => w.wing_name === formWing);
    const selectedDivisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision);
    const wingId = selectedWingObj ? selectedWingObj.wing_id : null;
    const divisionId = selectedDivisionObj ? selectedDivisionObj.division_id : null;

    let selectedStage = 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (formStages[STAGES[i].key]) {
        selectedStage = i + 1;
      }
    }

    try {
      await axios.put("http://localhost:3000/consultant-appointment", {
        consultantAppointmentID: updatingAppointment.id,
        wing: wingId,
        division: divisionId,
        appointmentType: formAppointmentType,
        adminApproval: formStages.adminApproval ? "Yes" : "No",
        adminApprovalDate: formAdminApprovalDate || "",
        tenderPublished: formStages.tenderPublished ? "Yes" : "No",
        tenderPublishedDate: "",
        preBidQueriesResponded: formStages.preBidQueries ? "Yes" : "No",
        preBidQueriesRespondedDate: "",
        bidReceived: formStages.bidReceived ? "Yes" : "No",
        bidReceivedDate: "",
        technicalBidFinalized: formStages.techBidFinalized ? "Yes" : "No",
        technicalBidFinalizedDate: "",
        financialBidFinalized: formStages.finBidFinalized ? "Yes" : "No",
        financialBidFinalizedDate: "",
        workOrderIssued: formStages.workOrderIssued ? "Yes" : "No",
        workOrderIssuedDate: "",
        contractSigned: formStages.contractSigned ? "Yes" : "No",
        contractSignedDate: "",
        consultingFirmName: "Consultant Firm",
        stageID: selectedStage,
        userID: 1
      });

      setUpdatingAppointment(null);
      setFormWing('');
      setFormDivision('');
      setFormAppointmentType('Full Time');
      setFormNumResources(1);
      setFormAdminApprovalDate('');
      setFormStages({
        adminApproval: false,
        tenderPublished: false,
        preBidQueries: false,
        bidReceived: false,
        techBidFinalized: false,
        finBidFinalized: false,
        workOrderIssued: false,
        contractSigned: false
      });

      if (triggerNotification) {
        triggerNotification(`Consultant Appointment for ${formWing} (${formDivision}) updated successfully.`);
      }
      fetchData();
    } catch (err) {
      console.error("Error updating consultant appointment:", err);
      alert("Failed to update.");
    }
  };

  const handleStageChange = (key, val) => {
    setFormStages(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const inputGridData = useMemo(() => {
    return appointments.map((item, idx) => ({
      id: item.id,
      sNo: idx + 1,
      wing: item.wing,
      division: item.division,
      appointmentType: item.appointmentType,
      status: getStatusFromStages(item.stages),
      numResources: item.numResources,
      update: 'Update'
    }));
  }, [appointments]);

  const filteredInputGridData = useMemo(() => {
    return inputGridData.filter(item => {
      const matchSearch = !searchTerm ||
        item.wing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [inputGridData, searchTerm]);

  const filteredReportGridData = useMemo(() => {
    return reportGridDataFromServer.filter(item => {
      return !wingFilter || item.wing === wingFilter;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [reportGridDataFromServer, wingFilter]);

  const inputColDefs = useMemo(() => [
    { field: 'sNo', headerName: 'S.No', width: 90, cellClass: 'font-mono text-slate-600 text-center', headerClass: 'text-center' },
    { field: 'wing', headerName: 'Wing', flex: 1.5, minWidth: 150, cellClass: 'font-bold text-slate-800' },
    { field: 'division', headerName: 'Division', flex: 1.2, minWidth: 120, cellClass: 'text-slate-700' },
    { field: 'appointmentType', headerName: 'Appointment Type', flex: 1.2, minWidth: 130, cellClass: 'text-slate-600' },
    { field: 'status', headerName: 'Status', flex: 2, minWidth: 200, cellClass: 'font-semibold text-blue-700' },
    { field: 'numResources', headerName: 'Number of Resources', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-slate-800', headerClass: 'text-center' },
    {
      headerName: 'Update',
      width: 110,
      cellClass: 'text-center flex items-center justify-center text-[11px]',
      headerClass: 'text-center',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={() => handleStartUpdate(params.data)}
            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
            title="Edit Details"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ], [appointments]);

  // Removed duplicate reportColDefs

  const handleExport = (type) => {
    if (triggerNotification) {
      triggerNotification(`Exporting Consultant Reports to ${type}...`);
    }
  };

  return (
    <div className="space-y-6 pt-5 pb-4 px-1 md:px-2 animate-fade-in text-slate-800">
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2 pb-1">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        {currentTab === 'Consultant Input Form' ? (
          <>
            <span className="text-slate-600">Consultant Appointment</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Input Form</span>
          </>
        ) : (
          <>
            <span className="text-slate-600">Consultant Appointment</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Reports</span>
          </>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wide">
            Consultant Appointment
          </h2>
        </div>

        <InternalNavigation
          tabs={SUB_TABS}
          currentTab={currentTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      {currentTab === 'Consultant Input Form' && (
        <div className="space-y-6">
          {isAdding || updatingAppointment ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    {updatingAppointment ? 'Update Consultant Appointment' : 'Add Consultant Appointment'}
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setUpdatingAppointment(null);
                  }}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Register</span>
                </button>
              </div>

              <form onSubmit={updatingAppointment ? handleUpdateSubmit : handleAddSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
                    <select
                      value={formWing}
                      onChange={(e) => setFormWing(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Wing--</option>
                      {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
                    <select
                      value={formDivision}
                      onChange={(e) => setFormDivision(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Division--</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Number of Resources*</label>
                    <input
                      type="number"
                      min="1"
                      value={formNumResources}
                      onChange={(e) => setFormNumResources(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Appointment Type*</label>
                    <select
                      value={formAppointmentType}
                      onChange={(e) => setFormAppointmentType(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-755 cursor-pointer"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Retainer">Retainer</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Workflow Milestone Checklist
                  </label>

                  <div className="flex flex-col py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-700">
                        1. Admin Approval for Engaging Consultant
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleStageChange('adminApproval', true)}
                          className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${formStages.adminApproval === true
                            ? 'bg-emerald-600 text-white shadow-sm font-black'
                            : 'bg-white border border-slate-250 text-slate-655 hover:bg-slate-100'
                            }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleStageChange('adminApproval', false);
                            setFormAdminApprovalDate('');
                          }}
                          className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${formStages.adminApproval === false
                            ? 'bg-rose-600 text-white shadow-sm font-black'
                            : 'bg-white border border-slate-255 text-slate-655 hover:bg-slate-100'
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {formStages.adminApproval && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 mt-1.5 w-full animate-fade-in pl-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Date of Approval *</span>
                        <div className="relative w-44">
                          <input
                            type="date"
                            value={formAdminApprovalDate}
                            onChange={(e) => setFormAdminApprovalDate(e.target.value)}
                            required={formStages.adminApproval}
                            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
                          />
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-[11px] font-semibold text-slate-755 mt-3">
                    {STAGES.slice(1).map((stage, idx) => {
                      const isYes = formStages[stage.key] === true;
                      return (
                        <div
                          key={stage.key}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-all bg-slate-50/50 ${isYes ? 'border-emerald-250 bg-slate-50 shadow-sm' : 'border-slate-150'
                            }`}
                        >
                          <span className="truncate max-w-[160px]" title={stage.label}>
                            {idx + 2}. {stage.label}
                          </span>
                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => handleStageChange(stage.key, true)}
                              className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${isYes
                                ? 'bg-emerald-600 text-white shadow-sm font-black'
                                : 'bg-white border border-slate-250 text-slate-655 hover:bg-slate-100'
                                }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStageChange(stage.key, false)}
                              className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${!isYes
                                ? 'bg-rose-600 text-white shadow-sm font-black'
                                : 'bg-white border border-slate-255 text-slate-655 hover:bg-slate-100'
                                }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setUpdatingAppointment(null);
                    }}
                    className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
                  >
                    {updatingAppointment ? 'Save Changes' : 'Save Post'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 font-display">Consultant Appointment Register</h3>
                  <p className="text-xs text-slate-500 font-medium">Tracking engagement statuses of consultants.</p>
                </div>
                {(!userPermissions || userPermissions.add !== false) && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Consultant</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search Wing, Division or Status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Showing {filteredInputGridData.length} entries
                </div>
              </div>

              <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <AgGridReact
                  theme="legacy"
                  rowData={filteredInputGridData}
                  columnDefs={inputColDefs}
                  domLayout="autoHeight"
                  rowHeight={45}
                  headerHeight={45}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 90
                  }}
                  pagination={true}
                  paginationPageSize={10}
                  paginationPageSizeSelector={[10, 20, 50]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {currentTab === 'Consultant Reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          
          {/* Back button and title */}
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            {drillDownPath.length > 1 && (
              <button
                onClick={() => setDrillDownPath(prev => prev.slice(0, -1))}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 font-display">
                {drillDownPath.length === 1 ? 'Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment' : currentView.title}
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span>(Report for the Month - <strong className="text-slate-700">June 2026</strong>)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleExport('Excel')}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export to Excel</span>
              </button>
              <button
                onClick={() => handleExport('PDF')}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-rose-600" />
                <span>Export to PDF</span>
              </button>
            </div>

            {currentView.type === 'abstract' && (
              <div className="w-full sm:max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Wing</label>
                <select
                  value={wingFilter}
                  onChange={(e) => setWingFilter(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
                >
                  <option value="">--Show All--</option>
                  {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <Table
                rowData={
                  currentView.type === 'abstract' 
                    ? drillDownData.filter(item => !wingFilter || item["Wing Name"] === wingFilter) 
                    : drillDownData
                }
                columnDefs={drillDownColDefs}
                loading={drillDownLoading}
                pagination={true}
                paginationPageSize={10}
                enableExport={true}
                exportFileName="Consultant_Appointment_Report"
                exportPdfTitle="Consultant Appointment Report"
                defaultColDef={{
                  minWidth: 95,
                  filter: true,
                  sortable: true,
                  resizable: true
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Total Rows: {drillDownData.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
