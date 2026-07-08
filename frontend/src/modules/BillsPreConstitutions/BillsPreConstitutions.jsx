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

export default function BillsPreConstitutionsView({ triggerNotification, userPermissions }) {
  const [bills, setBills] = useState([]);
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

  const WINGS = DB_WINGS.map(w => w.wing_name);
  const DIVISIONS = DB_DIVISIONS.map(d => d.division_name);

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

  const fetchBills = () => {
    axios.get("http://localhost:3000/bill")
      .then(res => {
        const mapped = res.data.map(b => {
          const steps = {};
          for (let i = 1; i <= 15; i++) {
            steps[i] = 'No';
          }
          const yesNoFields = {
            pre_draft_bill_prepared: 1,
            pre_draft_bill_approved: 2,
            circulated_imc: 3,
            imc_comments_rec: 4,
            dcn_draft_bill_prepared: 5,
            dcn_draft_bill_approved: 6,
            submited_legal_vetting: 7,
            legal_vetting_completed: 8,
            final_dcn_approved: 9,
            advance_copy: 10,
            approved_by_cabinet: 11,
            bill_introduced_in_parliament: 12,
            bill_passed: 13,
            bill_notified: 14,
            completed: 15
          };
          Object.entries(yesNoFields).forEach(([field, step]) => {
            if (b[field] === 'Yes' || b[field] === 1 || b[field] === true) {
              steps[step] = 'Yes';
            }
          });

          const dates = {};
          const dateFields = {
            pre_draft_bill_prepared_date: 1,
            pre_draft_bill_approved_date: 2,
            circulated_imc_date: 3,
            imc_comments_rec_date: 4,
            dcn_draft_bill_prepared_date: 5,
            dcn_draft_bill_approved_date: 6,
            submited_legal_vetting_date: 7,
            legal_vetting_completed_date: 8,
            final_dcn_approved_date: 9,
            advance_copy_date: 10,
            approved_by_cabinet_date: 11,
            bill_introduced_in_parliament_date: 12,
            bill_passed_date: 13,
            bill_notified_date: 14,
            completed_date: 15
          };
          Object.entries(dateFields).forEach(([field, step]) => {
            if (b[field]) {
              dates[step] = new Date(b[field]).toISOString().split('T')[0];
            }
          });

          return {
            id: b.bill_id,
            subject: b.subject,
            wing: b.wing_name,
            division: b.division_name,
            status: b.bill_stage_name,
            remarks: b.remarks || '',
            statusSteps: steps,
            statusDates: dates
          };
        });
        setBills(mapped);
      })
      .catch(err => console.error("Error fetching bills:", err));
  };

  useEffect(() => {
    fetchBills();
  }, [isAdding]);

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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formSubject || !formWing || !formDivision) {
      alert('Please fill out all required fields.');
      return;
    }

    const calculatedStatus = getBillStatusFromSteps(formStatusSteps);
    let selectedBillStage = 0;
    for (let i = 15; i >= 1; i--) {
      if (formStatusSteps[i] === 'Yes') {
        selectedBillStage = i;
        break;
      }
    }

    const selectedWingObj = DB_WINGS.find(w => w.wing_name === formWing);
    const selectedDivisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision);
    const wingId = selectedWingObj ? selectedWingObj.wing_id : null;
    const divisionId = selectedDivisionObj ? selectedDivisionObj.division_id : null;

    const payload = {
      subject: formSubject,
      wing: wingId,
      division: divisionId,
      preDraftBillPrep: formStatusSteps[1],
      preDraftBillPrepDate: formStatusDates[1] || "",
      preDcnDraftBillApproved: formStatusSteps[2],
      preDcnDraftBillApprovedDate: formStatusDates[2] || "",
      circulatedForImc: formStatusSteps[3],
      circulatedForImcDate: formStatusDates[3] || "",
      imcCommentsRec: formStatusSteps[4],
      imcCommentsRecDate: formStatusDates[4] || "",
      dcnDraftBillPrepared: formStatusSteps[5],
      dcnDraftBillPreparedDate: formStatusDates[5] || "",
      dcnDraftBillApproved: formStatusSteps[6],
      dcnDraftBillApprovedDate: formStatusDates[6] || "",
      submittedLegalVetting: formStatusSteps[7],
      submittedLegalVettingDate: formStatusDates[7] || "",
      legalVettingCompleted: formStatusSteps[8],
      legalVettingCompletedDate: formStatusDates[8] || "",
      finalDcnApproved: formStatusSteps[9],
      finalDcnApprovedDate: formStatusDates[9] || "",
      advanceCopyToPmo: formStatusSteps[10],
      advanceCopyToPmoDate: formStatusDates[10] || "",
      approvedByCabinet: formStatusSteps[11],
      approvedByCabinetDate: formStatusDates[11] || "",
      billIntroduced: formStatusSteps[12],
      billIntroducedDate: formStatusDates[12] || "",
      billPassed: formStatusSteps[13],
      billPassedDate: formStatusDates[13] || "",
      billNotified: formStatusSteps[14],
      billNotifiedDate: formStatusDates[14] || "",
      completed: formStatusSteps[15],
      completedDate: formStatusDates[15] || "",
      remarks: formRemarks,
      selectedBillStage: selectedBillStage,
      userID: 1
    };

    try {
      if (editingBill) {
        await axios.put("http://localhost:3000/bill", {
          ...payload,
          billID: editingBill.id
        });
        if (triggerNotification) {
          triggerNotification('Bill details updated successfully.');
        }
      } else {
        await axios.post("http://localhost:3000/bill", payload);
        if (triggerNotification) {
          triggerNotification('New Bill registered successfully.');
        }
      }
      setIsAdding(false);
    } catch (err) {
      console.error("Error saving bill:", err);
      alert('Failed to save bill. Please try again.');
    }
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

  const dynamicReportRows = useMemo(() => {
    return WINGS.map((wing, index) => {
      const wingBills = bills.filter(b => b.wing === wing);
      const rowData = {
        id: index + 1,
        wing,
        total: wingBills.length
      };
      Object.entries(STATUS_STEPS).forEach(([stepKey, stepName]) => {
        rowData[`step_${stepKey}`] = wingBills.filter(b => b.status === stepName).length;
      });
      return rowData;
    });
  }, [bills]);

  const filteredReportRows = useMemo(() => {
    if (selectedReportWing === 'All') return dynamicReportRows;
    return dynamicReportRows.filter(r => r.wing === selectedReportWing);
  }, [dynamicReportRows, selectedReportWing]);

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

  useEffect(() => {
    if (reportGridRef.current && reportGridRef.current.api) {
      reportGridRef.current.api.setGridOption('paginationPageSize', reportEntriesLimit);
    }
  }, [reportEntriesLimit]);

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

  const reportColDefs = useMemo(() => {
    const baseDefs = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 70,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-555 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center text-xs'
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

  const donutPercentages = useMemo(() => {
    const counts = {};
    let total = 0;
    bills.forEach(b => {
      counts[b.status] = (counts[b.status] || 0) + 1;
      total += 1;
    });
    return Object.entries(counts).map(([name, val]) => ({
      name,
      value: val,
      percentage: total > 0 ? (val / total) * 100 : 0
    }));
  }, [bills]);

  return (
    <div className="space-y-6 pt-5 pb-4 px-1 md:px-2 animate-fade-in text-slate-800">
      
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2 pb-1">
        <Home className="h-3.5 w-3.5 text-slate-400 cursor-pointer" onClick={() => setActiveSubTab('Input Form')} />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">Legal</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 font-bold">Bills & Pre-Constitutions Act</span>
      </div>

      {/* Main module header bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wide">
            Bills & Pre-Constitutions Act
          </h2>
        </div>

        <InternalNavigation
          tabs={SUB_TABS}
          currentTab={currentTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      {/* Main Viewports */}
      {currentTab === 'Input Form' && (
        <div className="space-y-6">
          {isAdding ? (
            /* Input / Edit Bill Form */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    {editingBill ? 'Modify Bill Details' : 'Register New Bill'}
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Registry</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                
                {/* Subject Line */}
                <div className="space-y-1.5 col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Name of the Subject*</label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Enter bill subject..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

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
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Division--</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Milestone Checklist Tracker */}
                <div className="space-y-3.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">Milestone Checklist Status</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-1">
                    {Object.entries(STATUS_STEPS).map(([stepKey, stepName]) => {
                      const stepId = parseInt(stepKey);
                      return (
                        <div key={stepKey} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex flex-col gap-2.5 justify-center">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-slate-800 leading-snug">
                              {stepKey}. {stepName}
                            </span>
                            <div className="flex items-center space-x-3.5 flex-shrink-0">
                              <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`step_${stepKey}`}
                                  checked={formStatusSteps[stepId] === 'Yes'}
                                  onChange={() => {
                                    setFormStatusSteps(prev => ({ ...prev, [stepId]: 'Yes' }));
                                    if (!formStatusDates[stepId]) {
                                      setFormStatusDates(prev => ({ ...prev, [stepId]: new Date().toISOString().split('T')[0] }));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 text-blue-650 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-600">Yes</span>
                              </label>
                              <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`step_${stepKey}`}
                                  checked={formStatusSteps[stepId] === 'No'}
                                  onChange={() => {
                                    setFormStatusSteps(prev => ({ ...prev, [stepId]: 'No' }));
                                  }}
                                  className="h-3.5 w-3.5 text-blue-650 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-600">No</span>
                              </label>
                            </div>
                          </div>

                          {formStatusSteps[stepId] === 'Yes' && (
                            <div className="w-full pt-2 border-t border-slate-200/50 flex items-center justify-between gap-4 animate-fade-in">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Completed</span>
                              <input
                                type="date"
                                required
                                value={formStatusDates[stepId] || ''}
                                onChange={(e) => setFormStatusDates(prev => ({ ...prev, [stepId]: e.target.value }))}
                                className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-slate-100 col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                  <textarea
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    rows={3}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
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
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Input Registry List Grid */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 font-display">Bills & Pre-Constitutions Act List</h3>
                  <p className="text-xs text-slate-500 font-medium">Record registry and tracking system for drafted, approved, and notified bills.</p>
                </div>
                {(!userPermissions || userPermissions.add !== false) && (
                  <button
                    onClick={handleOpenAdd}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Bill</span>
                  </button>
                )}
              </div>

              {/* Filters row panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wing</label>
                  <select
                    value={selectedWing}
                    onChange={(e) => setSelectedWing(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="All">All Wings</option>
                    {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Division</label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="All">All Divisions</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="All">All Statuses</option>
                    {Object.values(STATUS_STEPS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Table search filter bar count info */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1 pt-1.5">
                <span>Showing {filteredBills.length} entries</span>
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
                  paginationPageSizeSelector={[10, 20, 50]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports tab Viewport */}
      {currentTab === 'Reports' && (
        <div className="space-y-6">
          
          {/* Action Header controls banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-display">
                Report No.: 5.3A - Status Abstract ( Wing Wise ) - Legal Bills
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">As On Date: June 30, 2026</p>
            </div>

            <div className="flex items-center space-x-3">
              {isReportExpanded ? (
                <>
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
            /* Table Grid View */
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
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
              
              {/* Left Bar Chart */}
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

              {/* Right Donut Chart */}
              <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status Breakdown</h3>
                <div className="space-y-3.5 pt-4 flex-grow">
                  {donutPercentages.map((item, idx) => {
                    const colors = [
                      'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-teal-500'
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center space-x-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                          <span className="text-slate-600 truncate max-w-[140px]">{item.name}</span>
                        </div>
                        <span className="text-slate-700 font-bold">{item.value} ({Math.round(item.percentage)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
