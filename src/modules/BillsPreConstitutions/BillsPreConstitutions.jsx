import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Edit,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

const INITIAL_BILLS = [
  { id: 1, subject: 'Indian Ports Bill, 2025', wing: 'Sagarmala', division: 'Sagarmala-II', status: 'Approved by Cabinet', remarks: '', statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes', 8: 'Yes', 9: 'Yes', 10: 'Yes', 11: 'Yes', 12: 'No', 13: 'No', 14: 'No', 15: 'No' }, statusDates: {} },
  { id: 2, subject: 'Carriage of Goods by Sea Bill, 2025', wing: 'Shipping', division: 'Shipping-I', status: 'Bill Introduced in Parliament', remarks: '', statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes', 8: 'Yes', 9: 'Yes', 10: 'Yes', 11: 'Yes', 12: 'Yes', 13: 'No', 14: 'No', 15: 'No' }, statusDates: {} },
  { id: 3, subject: 'Merchant Shipping Bill, 2025', wing: 'Shipping', division: 'Shipping-I', status: 'Bill Introduced in Parliament', remarks: '', statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes', 8: 'Yes', 9: 'Yes', 10: 'Yes', 11: 'Yes', 12: 'Yes', 13: 'No', 14: 'No', 15: 'No' }, statusDates: {} },
  { id: 4, subject: 'Coastal Shipping Bill, 2025', wing: 'Shipping', division: 'Shipping-I', status: 'Bill Introduced in Parliament', remarks: '', statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes', 8: 'Yes', 9: 'Yes', 10: 'Yes', 11: 'Yes', 12: 'Yes', 13: 'No', 14: 'No', 15: 'No' }, statusDates: {} },
  { id: 5, subject: 'Bills of Lading Bill, 2025', wing: 'Shipping', division: 'Shipping-I', status: 'Bill Passed', remarks: '', statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes', 8: 'Yes', 9: 'Yes', 10: 'Yes', 11: 'Yes', 12: 'Yes', 13: 'Yes', 14: 'No', 15: 'No' }, statusDates: {} }
];

const WINGS = [
  'Administration',
  'Coord-I',
  'Coord-II',
  'Development',
  'DGLL, Parliament & TRW',
  'Finance',
  'Information Technology',
  'IWT',
  'Office of Economic Advisor',
  'Ports',
  'Sagarmala',
  'Shipping',
  'Special Initiatives & Projects',
  'Vigilance'
];

const DIVISIONS = ['Shipping-I', 'Shipping-II', 'PD-I', 'PD-II', 'Sagarmala-I', 'Sagarmala-II', 'IWT-I', 'Admn-I', 'Legal-I'];

const STATUS_STEPS = {
  1: 'Draft Bill Prepared',
  2: 'DCN & draft bill Approved by Minister',
  3: 'circulated for IMC',
  4: 'IMC comments received',
  5: 'DCN & Draft Bill prepared',
  6: 'DCN & draft bill Approved by Minister',
  7: 'Submitted for Legal Vetting',
  8: 'Legal Vetting to be Completed',
  9: 'Final DCN & draft bill Approved by Minister',
  10: 'Advance Copy to be Sent to PMO & Cab Sectt.',
  11: 'Approved by Cabinet',
  12: 'Bill Introduced in Parliament',
  13: 'Bill Passed',
  14: 'Bill Notified',
  15: 'Completed'
};

export default function BillsPreConstitutionsView({ triggerNotification }) {
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [activeSubTab, setActiveSubTab] = useState('Input Form');
  const [isAdding, setIsAdding] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  // Input Form Filters State
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Reports View State
  const reportGridRef = useRef();
  const [selectedReportWing, setSelectedReportWing] = useState('All');
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [reportEntriesLimit, setReportEntriesLimit] = useState(10);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportNotification, setReportNotification] = useState(null);

  // Form Fields State
  const [formSubject, setFormSubject] = useState('');
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No', 12: 'No', 13: 'No', 14: 'No', 15: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  const SUB_TABS = [
    { id: 'Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'Reports', label: 'Reports', icon: FilePieChart }
  ];

  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'Input Form';

  const triggerReportNotification = (msg) => {
    setReportNotification(msg);
    setTimeout(() => setReportNotification(null), 3000);
  };

  const getBillStatusFromSteps = (steps) => {
    let currentStatus = 'Draft';
    for (let i = 1; i <= 15; i++) {
      if (steps[i] === 'Yes') {
        currentStatus = STATUS_STEPS[i];
      }
    }
    return currentStatus;
  };

  const getStepsFromBillStatus = (status) => {
    const steps = { 1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No', 12: 'No', 13: 'No', 14: 'No', 15: 'No' };
    let foundMatch = false;
    for (let i = 15; i >= 1; i--) {
      if (status === STATUS_STEPS[i] || foundMatch) {
        steps[i] = 'Yes';
        foundMatch = true;
      }
    }
    return steps;
  };

  const handleOpenAdd = () => {
    setEditingBill(null);
    setFormSubject('');
    setFormWing('');
    setFormDivision('');
    setFormRemarks('');
    setFormStatusSteps({
      1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No', 12: 'No', 13: 'No', 14: 'No', 15: 'No'
    });
    setFormStatusDates({});
    setIsAdding(true);
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setFormSubject(bill.subject);
    setFormWing(bill.wing);
    setFormDivision(bill.division);
    setFormRemarks(bill.remarks || '');
    setFormStatusSteps(getStepsFromBillStatus(bill.status));
    setFormStatusDates(bill.statusDates || {});
    setIsAdding(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formSubject || !formWing || !formDivision) {
      alert('Please fill out all required fields.');
      return;
    }

    const calculatedStatus = getBillStatusFromSteps(formStatusSteps);

    if (editingBill) {
      setBills(prev => prev.map(b => b.id === editingBill.id ? {
        ...b,
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        remarks: formRemarks,
        status: calculatedStatus,
        statusSteps: formStatusSteps,
        statusDates: formStatusDates
      } : b));
      if (triggerNotification) {
        triggerNotification('Bill details updated successfully.');
      }
    } else {
      const newBill = {
        id: Date.now(),
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        remarks: formRemarks,
        status: calculatedStatus,
        statusSteps: formStatusSteps,
        statusDates: formStatusDates
      };
      setBills(prev => [newBill, ...prev]);
      if (triggerNotification) {
        triggerNotification('New Bill registered successfully.');
      }
    }

    setIsAdding(false);
  };

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchWing = selectedWing === 'All' || b.wing === selectedWing;
      const matchDivision = selectedDivision === 'All' || b.division === selectedDivision;
      const matchStatus = selectedStatus === 'All' || b.status === selectedStatus;
      const matchSearch = !searchQuery ||
        b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.wing.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.division.toLowerCase().includes(searchQuery.toLowerCase());
      return matchWing && matchDivision && matchStatus && matchSearch;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [bills, selectedWing, selectedDivision, selectedStatus, searchQuery]);

  // Derive Report rows dynamically from bills database
  const dynamicReportRows = useMemo(() => {
    return WINGS.map((wing, index) => {
      const wingBills = bills.filter(b => b.wing === wing);
      const rowData = {
        id: index + 1,
        wing,
        total: wingBills.length
      };
      // Count bills in each milestone status step
      Object.entries(STATUS_STEPS).forEach(([stepKey, stepName]) => {
        rowData[`step_${stepKey}`] = wingBills.filter(b => b.status === stepName).length;
      });
      return rowData;
    });
  }, [bills]);

  // Filter report rows based on selected wing
  const filteredReportRows = useMemo(() => {
    if (selectedReportWing === 'All') return dynamicReportRows;
    return dynamicReportRows.filter(r => r.wing === selectedReportWing);
  }, [dynamicReportRows, selectedReportWing]);

  // Aggregate report totals
  const reportTotals = useMemo(() => {
    const totalData = {
      total: 0
    };
    Object.keys(STATUS_STEPS).forEach(stepKey => {
      totalData[`step_${stepKey}`] = 0;
    });
    filteredReportRows.forEach(r => {
      totalData.total += r.total;
      Object.keys(STATUS_STEPS).forEach(stepKey => {
        totalData[`step_${stepKey}`] += r[`step_${stepKey}`];
      });
    });
    return totalData;
  }, [filteredReportRows]);

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (reportGridRef.current && reportGridRef.current.api) {
      reportGridRef.current.api.setGridOption('paginationPageSize', reportEntriesLimit);
    }
  }, [reportEntriesLimit]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (reportGridRef.current && reportGridRef.current.api) {
      reportGridRef.current.api.setGridOption('quickFilterText', reportSearchQuery);
    }
  }, [reportSearchQuery]);

  const handleReportPageChange = (page) => {
    if (reportGridRef.current && reportGridRef.current.api && page >= 1 && page <= reportTotalPages) {
      reportGridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  const onReportPaginationChanged = () => {
    if (reportGridRef.current && reportGridRef.current.api) {
      const page = reportGridRef.current.api.paginationGetCurrentPage() + 1;
      const total = reportGridRef.current.api.paginationGetTotalPages();
      setReportCurrentPage(page);
      setReportTotalPages(total || 1);
    }
  };

  const handleGridWheel = (e) => {
    const container = e.currentTarget;
    if (container) {
      const gridBodyViewport = container.querySelector('.ag-body-viewport');
      if (gridBodyViewport && gridBodyViewport.scrollWidth > gridBodyViewport.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          gridBodyViewport.scrollLeft += e.deltaY;
          const isAtStart = gridBodyViewport.scrollLeft <= 0 && e.deltaY < 0;
          const isAtEnd = gridBodyViewport.scrollLeft + gridBodyViewport.clientWidth >= gridBodyViewport.scrollWidth && e.deltaY > 0;
          if (!isAtStart && !isAtEnd) {
            e.preventDefault();
          }
        }
      }
    }
  };

  const colDefs = useMemo(() => {
    const cols = [
    { field: 'sNo', headerName: 'S.No', width: 90, cellClass: 'font-mono text-slate-600 text-center', headerClass: 'text-center' },
    { field: 'subject', headerName: 'Name of the Subject', flex: 2, minWidth: 250, cellClass: 'font-bold text-slate-800' },
    { field: 'wing', headerName: 'Wing', width: 140, cellClass: 'font-semibold text-slate-650' },
    { field: 'division', headerName: 'Division', width: 140, cellClass: 'font-mono text-slate-600' },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${params.value.includes('Passed') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          params.value.includes('Introduced') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            params.value.includes('Cabinet') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
              'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Update',
      width: 100,
      cellClass: 'text-center flex items-center justify-center text-[11px]',
      headerClass: 'text-center',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={() => handleOpenEdit(params.data)}
            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
            title="Edit Details"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
    ];
    if (userPermissions && userPermissions.update === false) {
      return cols.filter(c => c.headerName !== 'Update');
    }
    return cols;
  }, [userPermissions]);

  // Detailed Report Column definitions matching Cabinet Notes Reports
  const reportColDefs = useMemo(() => {
    const baseDefs = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 70,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-550 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center text-xs'
      },
      {
        headerName: 'Wing',
        field: 'wing',
        minWidth: 180,
        pinned: 'left',
        cellClass: 'text-slate-800 font-extrabold flex items-center border-r border-slate-100 text-xs hover:underline cursor-pointer'
      },
      {
        headerName: 'Total Bills',
        field: 'total',
        minWidth: 110,
        cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100 text-xs'
      }
    ];

    Object.entries(STATUS_STEPS).forEach(([stepKey, stepName]) => {
      baseDefs.push({
        headerName: `${stepKey}. ${stepName}`,
        field: `step_${stepKey}`,
        minWidth: 160,
        cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100 text-xs',
        valueFormatter: (params) => params.value || ''
      });
    });

    return baseDefs;
  }, []);

  const pinnedBottomRowData = useMemo(() => {
    const bottomRow = {
      wing: 'Total',
      total: reportTotals.total
    };
    Object.keys(STATUS_STEPS).forEach(stepKey => {
      bottomRow[`step_${stepKey}`] = reportTotals[`step_${stepKey}`];
    });
    return [bottomRow];
  }, [reportTotals]);

  // Calculate dynamic Pie segments for reports
  const donutPercentages = useMemo(() => {
    const total = reportTotals.total || 1;
    const introduced = bills.filter(b => b.status === 'Bill Introduced in Parliament').length;
    const passed = bills.filter(b => b.status === 'Bill Passed').length;
    const introPct = Math.round((introduced / total) * 100);
    const passedPct = Math.round((passed / total) * 100);
    const othersPct = 100 - introPct - passedPct;

    return {
      introduced: introPct,
      passed: passedPct,
      others: Math.max(0, othersPct)
    };
  }, [bills, reportTotals]);

  return (
    <div className="space-y-6 pt-5 pb-4 px-1 md:px-2 animate-fade-in text-slate-800">

      {/* Toast Notification */}
      {reportNotification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in animate-pulse">
          <div className="p-1 bg-emerald-50 rounded-lg">
            <Check className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{reportNotification}</p>
          </div>
        </div>
      )}

      {/* Breadcrumbs Row */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2 pb-1">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">Legal</span>
        <span className="text-slate-400">/</span>
        {currentTab === 'Input Form' ? (
          <>
            <span className="text-slate-655 hover:underline cursor-pointer" onClick={() => setActiveSubTab('Input Form')}>Bills/PreConstitutions Act</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Input Form</span>
          </>
        ) : (
          <>
            <span className="text-slate-655 hover:underline cursor-pointer" onClick={() => setActiveSubTab('Input Form')}>Bills/PreConstitutions Act</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Reports</span>
          </>
        )}
      </div>

      {/* Header Container Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wide">
            Bills/PreConstitutions Act
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Tracking milestones for Bills and pre-constitutional legislative updates.</p>
        </div>

        <InternalNavigation
          tabs={SUB_TABS}
          currentTab={currentTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      {/* Input Form Tab View */}
      {currentTab === 'Input Form' && (
        <div className="space-y-6">
          {isAdding ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              {/* Header Title Bar */}
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    {editingBill ? 'Modify Bills/PreConstitutions Act' : 'Add Bills/PreConstitutions Act'}
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Register</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Name of the subject*
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Enter subject name..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Wing */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Wing*
                    </label>
                    <select
                      required
                      value={formWing}
                      onChange={(e) => setFormWing(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Wing--</option>
                      {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  {/* Division */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Division*
                    </label>
                    <select
                      required
                      value={formDivision}
                      onChange={(e) => setFormDivision(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Division--</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Status Checklist Yes/No */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-[11px] font-semibold text-slate-755">
                    {Object.entries(STATUS_STEPS).map(([stepKey, stepName]) => {
                      const isYes = formStatusSteps[stepKey] === 'Yes';
                      return (
                        <div
                          key={stepKey}
                          className={`flex flex-col py-2 px-3 rounded-lg border transition-all ${isYes ? 'bg-slate-50 border-emerald-250 shadow-sm' : 'bg-slate-50/50 border-slate-150'
                            }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate max-w-[160px] sm:max-w-[200px]" title={stepName}>
                              {stepKey}. {stepName}
                            </span>
                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormStatusSteps(prev => ({ ...prev, [stepKey]: 'Yes' }));
                                  if (!formStatusDates[stepKey]) {
                                    const today = new Date().toISOString().split('T')[0];
                                    setFormStatusDates(prev => ({ ...prev, [stepKey]: today }));
                                  }
                                }}
                                className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${isYes ? 'bg-emerald-600 text-white shadow-sm font-black' : 'bg-white border border-slate-250 text-slate-655 hover:bg-slate-100'
                                  }`}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormStatusSteps(prev => ({ ...prev, [stepKey]: 'No' }));
                                  setFormStatusDates(prev => {
                                    const copy = { ...prev };
                                    delete copy[stepKey];
                                    return copy;
                                  });
                                }}
                                className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${!isYes ? 'bg-rose-600 text-white shadow-sm font-black' : 'bg-white border border-slate-255 text-slate-655 hover:bg-slate-100'
                                  }`}
                              >
                                No
                              </button>
                            </div>
                          </div>

                          {isYes && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 mt-1.5 w-full animate-fade-in">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Date:</span>
                              <input
                                type="date"
                                value={formStatusDates[stepKey] || ''}
                                onChange={(e) => setFormStatusDates(prev => ({ ...prev, [stepKey]: e.target.value }))}
                                className="px-2 py-0.5 border border-slate-300 rounded bg-white text-[10px] focus:outline-none w-32 font-semibold text-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Remarks (Max length of words should not exceed 250)
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={formRemarks}
                    onChange={(e) => {
                      const words = e.target.value.split(/\s+/).filter(Boolean);
                      if (words.length <= 250) {
                        setFormRemarks(e.target.value);
                      }
                    }}
                    placeholder="Enter remarks..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 font-display">Bills/PreConstitutions Act Register</h3>
                  <p className="text-xs text-slate-500 font-medium">Tracking and editing legislative bill statuses.</p>
                </div>
                {(!userPermissions || userPermissions.add !== false) && (
                  <button
                    onClick={handleOpenAdd}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Bills/PreConstitutions Act</span>
                  </button>
                )}
              </div>

              {/* Table search filter bar */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Search Subject or Wing..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>

                  <select
                    value={selectedWing}
                    onChange={(e) => setSelectedWing(e.target.value)}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="All">--All Wings--</option>
                    {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>

                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="All">--All Divisions--</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="All">--All Statuses--</option>
                    {Object.values(STATUS_STEPS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  Showing {filteredBills.length} entries
                </div>
              </div>

              {/* ag-Grid */}
              <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <AgGridReact
                  theme="legacy"
                  rowData={filteredBills}
                  columnDefs={colDefs}
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

      {/* Reports Tab */}
      {currentTab === 'Reports' && (
        <div className="space-y-6">
          {/* Header Banner Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div className="text-center sm:text-left">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Form No.:7.1 - Abstract Wing Wise - Bills/PreConstitutions Act
              </h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold mt-1">
                <span>As On date: 1-7-2026</span>
                <span>•</span>
                <span className="text-[#b33c56]">(Report for the Month - July 2026)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isReportExpanded ? (
                <>
                  {/* Wing Select Box */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wing:</span>
                    <div className="relative min-w-[160px]">
                      <select
                        value={selectedReportWing}
                        onChange={(e) => { setSelectedReportWing(e.target.value); setReportCurrentPage(1); }}
                        className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="All">--Show All--</option>
                        {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Export Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerReportNotification('Abstract Excel generated.')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Export to Excel</span>
                    </button>
                    <button
                      onClick={() => triggerReportNotification('Abstract PDF generated.')}
                      className="px-3.5 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export to PDF</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsReportExpanded(false)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-250 shadow-sm transition cursor-pointer"
                  >
                    <span>Collapse</span>
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsReportExpanded(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                >
                  <span>View Detailed Report</span>
                </button>
              )}
            </div>
          </div>

          {isReportExpanded ? (
            /* Table Container */
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-1.5">
                  <button onClick={() => triggerReportNotification('Copied to clipboard.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><Copy className="h-3.5 w-3.5" /> Copy</button>
                  <button onClick={() => triggerReportNotification('Excel export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
                  <button onClick={() => triggerReportNotification('PDF export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-655 flex items-center gap-1.5 cursor-pointer"><Download className="h-3.5 w-3.5" /> PDF</button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">Show</span>
                    <select
                      value={reportEntriesLimit}
                      onChange={(e) => { setReportEntriesLimit(parseInt(e.target.value)); }}
                      className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                    </select>
                    <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">entries</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold w-56 text-slate-750"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Main Responsive Table */}
              <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
                <AgGridReact
                  ref={reportGridRef}
                  theme="legacy"
                  rowData={filteredReportRows}
                  columnDefs={reportColDefs}
                  pinnedBottomRowData={pinnedBottomRowData}
                  pagination={true}
                  paginationPageSize={reportEntriesLimit}
                  suppressPaginationPanel={true}
                  onPaginationChanged={onReportPaginationChanged}
                  domLayout="autoHeight"
                  rowHeight={46}
                  headerHeight={38}
                  suppressColumnVirtualisation={true}
                  autoSizeStrategy={{
                    type: 'fitGridWidth'
                  }}
                />

                {/* Custom Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
                  <span className="text-slate-500 font-medium text-center sm:text-left">
                    Showing <span className="font-bold text-slate-800">{filteredReportRows.length > 0 ? (reportCurrentPage - 1) * reportEntriesLimit + 1 : 0}</span> to{' '}
                    <span className="font-bold text-slate-800">{Math.min(reportCurrentPage * reportEntriesLimit, filteredReportRows.length)}</span> of{' '}
                    <span className="font-bold text-slate-800">{filteredReportRows.length}</span> entries
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleReportPageChange(reportCurrentPage - 1)}
                      disabled={reportCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: reportTotalPages }, (_, i) => i + 1).map(p => {
                      if (reportTotalPages > 6 && Math.abs(reportCurrentPage - p) > 1 && p !== 1 && p !== reportTotalPages) {
                        if (p === 2 || p === reportTotalPages - 1) {
                          return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => handleReportPageChange(p)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${reportCurrentPage === p
                            ? 'bg-[#0f417a] text-white shadow-sm'
                            : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handleReportPageChange(reportCurrentPage + 1)}
                      disabled={reportCurrentPage === reportTotalPages || reportTotalPages === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Charts Visualizations */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in pt-4">

              {/* Left Bar Chart (Wing-wise Bill counts) */}
              <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bills by Wing</h3>
                <div className="space-y-3.5 pt-2">
                  {dynamicReportRows.filter(r => r.total > 0).map((row, idx) => {
                    const percent = (row.total / (reportTotals.total || 1)) * 100;
                    const gradientClass =
                      idx === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                        idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                          idx === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                            'bg-gradient-to-r from-rose-500 to-pink-500';
                    return (
                      <div key={row.id} className="space-y-1 font-semibold">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{row.wing}</span>
                          <span>{row.total} Bills ({Math.round(percent)}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${gradientClass} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Donut Chart (Status breakdown) */}
              <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Legislative Status Breakdown</h3>

                <div className="flex items-center justify-around py-3">
                  <div className="relative h-28 w-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                      <circle className="text-emerald-500" strokeWidth="3.5" strokeDasharray={`${donutPercentages.passed} 100`} strokeDashoffset="0" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                      <circle className="text-blue-600" strokeWidth="3.5" strokeDasharray={`${donutPercentages.introduced} 100`} strokeDashoffset={`-${donutPercentages.passed}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                      <circle className="text-amber-500" strokeWidth="3.5" strokeDasharray={`${donutPercentages.others} 100`} strokeDashoffset={`-${donutPercentages.passed + donutPercentages.introduced}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                    </svg>

                    <div className="absolute text-center">
                      <p className="text-lg font-black text-slate-900 leading-none">{reportTotals.total}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Bills</p>
                    </div>
                  </div>

                  <div className="space-y-2 font-semibold text-xs text-slate-700">
                    <div className="flex items-center space-x-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      <span>Passed: <strong>{bills.filter(b => b.status === 'Bill Passed').length}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                      <span>Introduced: <strong>{bills.filter(b => b.status === 'Bill Introduced in Parliament').length}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                      <span>Draft & Cabinet: <strong>{bills.filter(b => b.status === 'Approved by Cabinet').length}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-center text-slate-400 font-semibold border-t border-slate-200/60 pt-2.5 mt-2">
                  Real-time status monitoring of pre-constitutional acts
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
