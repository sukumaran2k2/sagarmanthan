import React, { useState, useMemo, useEffect } from 'react';
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
  Edit
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

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

// Initial Consultant Appointment dataset (9 entries matching user description)
const INITIAL_APPOINTMENTS = [
  { id: 1, wing: 'Coord-I', division: 'Coord-I', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-05-15', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 2, wing: 'Shipping', division: 'Shipping-I', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-04-10', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 3, wing: 'Ports', division: 'PD-I', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-03-22', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 4, wing: 'Administration', division: 'Admn.', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-02-18', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 5, wing: 'Administration', division: 'Admn.', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-02-28', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 6, wing: 'DGLL, Parliament & TRW', division: 'DGLL, Parl. & TRW', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-01-15', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 7, wing: 'DGLL, Parliament & TRW', division: 'DGLL, Parl. & TRW', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-03-01', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 8, wing: 'Administration', division: 'Admn.', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-04-20', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
  { id: 9, wing: 'Administration', division: 'Admn.', appointmentType: 'Full Time', numResources: 1, stages: { adminApproval: true, adminApprovalDate: '2026-05-10', tenderPublished: false, preBidQueries: false, bidReceived: false, techBidFinalized: false, finBidFinalized: false, workOrderIssued: false, contractSigned: false } },
];

export default function ConsultantAppointmentView({ activeSubTab, setActiveSubTab, triggerNotification, userPermissions }) {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [isAdding, setIsAdding] = useState(false);
  const [updatingAppointment, setUpdatingAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('');

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

  const WINGS = ['Coord-I', 'Shipping', 'Ports', 'Administration', 'DGLL, Parliament & TRW', 'IWT', 'Vigilance', 'Finance', 'Legal'];

  const SUB_TABS = [
    { id: 'Consultant Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'Consultant Reports', label: 'Reports', icon: FilePieChart }
  ];

  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'Consultant Input Form';

  // Remove background scrolling lock as overlays are no longer used

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

  // Form submit handler for Add
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formWing || !formDivision || (formStages.adminApproval && !formAdminApprovalDate)) {
      alert('Please fill out all required fields.');
      return;
    }

    const newAppointment = {
      id: appointments.length + 1,
      wing: formWing,
      division: formDivision,
      appointmentType: formAppointmentType,
      numResources: Number(formNumResources) || 1,
      stages: {
        ...formStages,
        adminApprovalDate: formStages.adminApproval ? formAdminApprovalDate : ''
      }
    };

    setAppointments([newAppointment, ...appointments]);
    setIsAdding(false);

    // Reset Form
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
  };

  // Form submit handler for Update
  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!formWing || !formDivision || (formStages.adminApproval && !formAdminApprovalDate)) {
      alert('Please fill out all required fields.');
      return;
    }

    setAppointments(prev => prev.map(item => {
      if (item.id === updatingAppointment.id) {
        return {
          ...item,
          wing: formWing,
          division: formDivision,
          appointmentType: formAppointmentType,
          numResources: Number(formNumResources) || 1,
          stages: {
            ...formStages,
            adminApprovalDate: formStages.adminApproval ? formAdminApprovalDate : ''
          }
        };
      }
      return item;
    }));

    setUpdatingAppointment(null);

    // Reset Form
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
  };

  const handleStageChange = (key, val) => {
    setFormStages(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // Grouped Grid Data for Input Forms page
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

  // Filtered Input Grid Data
  const filteredInputGridData = useMemo(() => {
    return inputGridData.filter(item => {
      const matchSearch = !searchTerm ||
        item.wing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [inputGridData, searchTerm]);

  // Abstract report data for Reports view (Wing Wise)
  const reportGridData = useMemo(() => {
    const grouped = {};
    WINGS.forEach(wing => {
      grouped[wing] = { wing, totalResources: 0, adminApproved: 0, tenderPublished: 0, activeContracts: 0 };
    });

    appointments.forEach(item => {
      if (grouped[item.wing]) {
        const status = getStatusFromStages(item.stages);
        grouped[item.wing].totalResources += item.numResources;
        if (status === 'Admin Approval for engaging Consultant') {
          grouped[item.wing].adminApproved += item.numResources;
        } else if (status === 'Tender Published') {
          grouped[item.wing].tenderPublished += item.numResources;
        } else if (item.stages.contractSigned) {
          grouped[item.wing].activeContracts += item.numResources;
        }
      }
    });

    return Object.values(grouped).map((item, idx) => ({
      sNo: idx + 1,
      wing: item.wing,
      total: item.totalResources,
      adminApproved: item.adminApproved,
      tenderPublished: item.tenderPublished,
      activeContracts: item.activeContracts
    }));
  }, [appointments]);

  // Filtered Report Grid Data
  const filteredReportGridData = useMemo(() => {
    return reportGridData.filter(item => {
      return !wingFilter || item.wing === wingFilter;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [reportGridData, wingFilter]);

  // Column Definitions
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

  const reportColDefs = useMemo(() => [
    { field: 'sNo', headerName: 'S No', width: 90, cellClass: 'font-mono text-slate-600 text-center', headerClass: 'text-center' },
    { field: 'wing', headerName: 'Wing', flex: 1.5, minWidth: 150, cellClass: 'font-extrabold text-blue-700 hover:underline cursor-pointer' },
    { field: 'total', headerName: 'Total Resources Engaged', flex: 1.2, minWidth: 140, cellClass: 'text-center font-bold text-slate-800', headerClass: 'text-center' },
    { field: 'adminApproved', headerName: 'Admin Approved', flex: 1, minWidth: 120, cellClass: 'text-center text-amber-600 font-bold', headerClass: 'text-center' },
    { field: 'tenderPublished', headerName: 'Tender Active', flex: 1, minWidth: 120, cellClass: 'text-center text-blue-600 font-bold', headerClass: 'text-center' },
    { field: 'activeContracts', headerName: 'Contract Signed', flex: 1, minWidth: 120, cellClass: 'text-center text-emerald-600 font-bold', headerClass: 'text-center' }
  ], []);

  const handleExport = (type) => {
    if (triggerNotification) {
      triggerNotification(`Exporting Consultant Reports to ${type}...`);
    }
  };

  return (
    <div className="space-y-6 pt-5 pb-4 px-1 md:px-2 animate-fade-in text-slate-800">

      {/* Breadcrumbs Row */}
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

      {/* Header Container Row */}
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

      {/* Input Form Tab View */}
      {currentTab === 'Consultant Input Form' && (
        <div className="space-y-6">
          {isAdding || updatingAppointment ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              {/* Header Title Bar */}
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

              {/* Form Content */}
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
                    <input
                      type="text"
                      placeholder="e.g. Admn., Shipping-I"
                      value={formDivision}
                      onChange={(e) => setFormDivision(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder-slate-400"
                    />
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
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-705 cursor-pointer"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Retainer">Retainer</option>
                    </select>
                  </div>
                </div>

                {/* Checklist Stages Yes/No */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Workflow Milestone Checklist
                  </label>

                  {/* Stage 1 (Full Width with Date) */}
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

                  {/* Stages 2 to 8 */}
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

                {/* Form Actions Footer */}
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
                  <p className="text-xs text-slate-500 font-medium">Tracking engagement statuses of full-time and part-time consultants.</p>
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

              {/* Filter Search */}
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

              {/* AG Grid */}
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
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab View */}
      {currentTab === 'Consultant Reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">

          <div className="text-center space-y-1.5 py-3 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-black text-slate-800 font-display">
              Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span>(Report for the Month - <strong className="text-slate-700">June 2026</strong>)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
            {/* Export Actions */}
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

            {/* Wing Selection */}
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
          </div>

          {/* AG Grid */}
          <div className="space-y-3">
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredReportGridData}
                columnDefs={reportColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 95
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Total Rows: {filteredReportGridData.length}</span>
            </div>
          </div>
        </div>
      )}    </div>
  );
}
