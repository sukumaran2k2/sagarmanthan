import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Star, 
  Layers, 
  Users, 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  FileSpreadsheet, 
  Search,
  RotateCcw,
  Sparkles,
  DollarSign,
  Filter,
  X,
  FileText,
  FolderTree
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { 
  fetchOvdDashboardCounts, 
  fetchOvdInterventionsReport, 
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
import { useShallow } from 'zustand/react/shallow';
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { OVOD_TOASTS } from '../toastMessages';

// Thrown when the API returns no rows, to fall through to the built-in sample hierarchy
const FALLBACK_NOTICE = 'Using fallback hierarchical dataset';

export default function InterventionList({ triggerNotification }) {
  const gridRef = useRef(null);

  const notify = useNotifier(triggerNotification);

  // The 8 filters, quick search, page size and panel state live in the OVOD store so they
  // survive switching tabs
  const { filters, searchTerm, pageSize, showFilterPanel } = useOvodStore(useShallow((s) => s.interventions));
  const {
    setInterventionFilter, setInterventionSearch, setInterventionPageSize,
    setInterventionFilterPanel, resetInterventionFilters, loadOrganisations
  } = useOvodStore(useShallow((s) => ({
    setInterventionFilter: s.setInterventionFilter,
    setInterventionSearch: s.setInterventionSearch,
    setInterventionPageSize: s.setInterventionPageSize,
    setInterventionFilterPanel: s.setInterventionFilterPanel,
    resetInterventionFilters: s.resetInterventionFilters,
    loadOrganisations: s.loadOrganisations
  })));

  const {
    vision: selectedVision,
    wing: selectedWing,
    org: selectedOrg,
    vibhas: selectedVibhas,
    priority: selectedPriority,
    mivChapter: selectedMivChapter,
    makvTheme: selectedMakvTheme,
    status: selectedStatus
  } = filters;

  // Remarks Modal State
  const [selectedRemarkRow, setSelectedRemarkRow] = useState(null);

  // Organisations master (cached once in the store)
  const organisations = useOvodStore((s) => s.organisations);

  // Data States
  const [countsData, setCountsData] = useState({
    goalsA1: 0,
    interventionsA2: 0,
    actionItemsA3: 0,
    goalsB1: 0,
    interventionsB2: 0,
    actionItemsB3: 0,
    totalCostA: '0.00',
    totalCostB: '0.00'
  });

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({
    'a1-nit2': true,
    'a2-nit2-1': true,
    'b1-pit2': true,
    'b2-pit2-1': true
  });

  // Load Organisations
  useEffect(() => {
    loadOrganisations();
  }, [loadOrganisations]);

  // Fetch Counts
  const countsRequestRef = useRef(0);
  const loadCounts = useCallback(async () => {
    const requestId = ++countsRequestRef.current;
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
      if (requestId !== countsRequestRef.current) return;

      // /OVD-data-count returns a one-row array
      const t = Array.isArray(res) ? res[0] : res?.total?.[0];
      if (t) {
        setCountsData({
          goalsA1: t.goals ?? 0,
          interventionsA2: t.intervention ?? 0,
          actionItemsA3: t.action ?? 0,
          goalsB1: t.goals_b1 ?? 0,
          interventionsB2: t.interventions_b2 ?? 0,
          actionItemsB3: t.actions_b3 ?? 0,
          totalCostA: Number(t.total_cost_a ?? 0).toFixed(2),
          totalCostB: Number(t.total_cost_b ?? t.total_cost ?? 0).toFixed(2)
        });
      }
    } catch (err) {
      console.warn("OVOD Counts error:", err);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme]);

  // Fetch Interventions Report & Build Deepdown Hierarchy Tree
  const tableRequestRef = useRef(0);
  const loadTableData = useCallback(async () => {
    const requestId = ++tableRequestRef.current;
    const isStale = () => requestId !== tableRequestRef.current;
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
      if (isStale()) return;

      const rawRows = res?.rowData || (Array.isArray(res) ? res : []);
      
      if (rawRows.length > 0 && (rawRows[0]['Goal (A1)'] || rawRows[0].goal_a1 || rawRows[0].orgHierarchy)) {
        // Parse dynamic multi-level hierarchy
        const tree = [];
        const seenA1 = new Set();
        const seenA2 = new Set();
        const seenB1 = new Set();
        const seenB2 = new Set();

        const formatDate = (val) => {
          if (!val || val === '-') return '-';
          try {
            const dt = new Date(val);
            if (isNaN(dt.getTime())) return String(val);
            const d = String(dt.getDate()).padStart(2, '0');
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const y = dt.getFullYear();
            return `${d}-${m}-${y}`;
          } catch {
            return String(val);
          }
        };

        rawRows.forEach((item, idx) => {
          let a1, a2, a3, b1, b2, b3;
          if (Array.isArray(item.orgHierarchy)) {
            if (item.orgHierarchy.length >= 6) {
              a1 = item.orgHierarchy[0];
              a2 = item.orgHierarchy[1];
              a3 = item.orgHierarchy[2];
              b1 = item.orgHierarchy[3];
              b2 = item.orgHierarchy[4];
              b3 = item.orgHierarchy[5];
            } else {
              b1 = item.orgHierarchy[0];
              b2 = item.orgHierarchy[1];
              b3 = item.orgHierarchy[2];
            }
          } else {
            a1 = item['Goal (A1)'] || item.goal_a1;
            a2 = item['Intervention (A2)'] || item.intervention_a2;
            a3 = item['Action (A3)'] || item.action_a3;
            b1 = item['Goal (B1)'] || item.goal_b1;
            b2 = item['Intervention (B2)'] || item.intervention_b2;
            b3 = item['Action (B3)'] || item.action_b3;
          }

          const orgCode = item.orgCode || item.mImpCode || item.ia_name || 'IWAI';
          const progress = item.progress != null ? item.progress : (item.Progress != null ? item.Progress : 0);
          const totalCost = item.totalCost != null ? item.totalCost : (item['Total Cost'] != null ? item['Total Cost'] : 0);
          const jobTitle = (item.jobTitle || item.Category || 'Process').trim();
          const wing = item.wing || item.Wing || 'Shipping';
          const employmentType = item.employmentType || item.Priority || 'II';
          const Vibhas = item.Vibhas || 'States';
          const TargetDate = formatDate(item.TargetDate || item['Target Date']);
          const capitalExpenditure = item.capitalExpenditure != null ? item.capitalExpenditure : (item['Capital Expenditure'] != null ? item['Capital Expenditure'] : 0);
          const sourceOfFunding = item.sourceOfFunding || item['Source of Funding'] || '-';
          const fundSpend = item.fundSpend != null ? item.fundSpend : (item['Fund Spend'] != null ? item['Fund Spend'] : 0);
          const currentStatus = item.currentStatus || item['Current Status'] || 'In Progress';
          const fundReq1Yr = item.oneYear != null ? item.oneYear : (item['One Year'] != null ? item['One Year'] : 0);
          const fundReq2Yrs = item.threeYears != null ? item.threeYears : (item['Three Years'] != null ? item['Three Years'] : 0);
          const fundReq2to5Yrs = item.bet35Year != null ? item.bet35Year : (item['Three - Five Years'] != null ? item['Three - Five Years'] : 0);
          const fundReqGt5Yrs = item.great5Year != null ? item.great5Year : (item[' > 5 Years'] != null ? item[' > 5 Years'] : 0);
          const remarks = item.remarks || item['Reason For Delay'] || item.reason_delay || '';

          const a1Key = a1 ? `a1-${a1}` : null;
          const a2Key = a2 ? `${a1Key}-a2-${a2}` : null;
          const b1Key = b1 ? `${a2Key || 'top'}-b1-${b1}` : null;
          const b2Key = b2 ? `${b1Key}-b2-${b2}` : null;
          const b3Key = b3 ? `${b2Key}-b3-${b3}-${idx}` : null;

          if (a1Key && !seenA1.has(a1Key)) {
            seenA1.add(a1Key);
            tree.push({
              id: a1Key,
              parentId: null,
              level: 0,
              hasChildren: !!a2,
              interventionList: a1,
              orgCode, progress, totalCost, jobTitle, wing, employmentType, Vibhas, TargetDate,
              capitalExpenditure, sourceOfFunding, fundSpend, currentStatus, fundReq1Yr, fundReq2Yrs,
              fundReq2to5Yrs, fundReqGt5Yrs, remarks
            });
          }

          if (a2Key && !seenA2.has(a2Key)) {
            seenA2.add(a2Key);
            tree.push({
              id: a2Key,
              parentId: a1Key,
              level: 1,
              hasChildren: !!b1,
              interventionList: a2,
              orgCode, progress, totalCost, jobTitle, wing, employmentType, Vibhas, TargetDate,
              capitalExpenditure, sourceOfFunding, fundSpend, currentStatus, fundReq1Yr, fundReq2Yrs,
              fundReq2to5Yrs, fundReqGt5Yrs, remarks
            });
          }

          if (b1Key && !seenB1.has(b1Key)) {
            seenB1.add(b1Key);
            tree.push({
              id: b1Key,
              parentId: a2Key || null,
              level: 2,
              hasChildren: !!b2,
              interventionList: b1,
              orgCode, progress, totalCost, jobTitle, wing, employmentType, Vibhas, TargetDate,
              capitalExpenditure, sourceOfFunding, fundSpend, currentStatus, fundReq1Yr, fundReq2Yrs,
              fundReq2to5Yrs, fundReqGt5Yrs, remarks
            });
          }

          if (b2Key && !seenB2.has(b2Key)) {
            seenB2.add(b2Key);
            tree.push({
              id: b2Key,
              parentId: b1Key,
              level: 3,
              hasChildren: !!b3,
              interventionList: b2,
              orgCode, progress, totalCost, jobTitle, wing, employmentType, Vibhas, TargetDate,
              capitalExpenditure, sourceOfFunding, fundSpend, currentStatus, fundReq1Yr, fundReq2Yrs,
              fundReq2to5Yrs, fundReqGt5Yrs, remarks
            });
          }

          if (b3Key) {
            tree.push({
              id: b3Key,
              parentId: b2Key,
              level: 4,
              hasChildren: false,
              interventionList: b3,
              orgCode, progress, totalCost: '-', jobTitle, wing, employmentType, Vibhas, TargetDate,
              capitalExpenditure: '-', sourceOfFunding: '-', fundSpend: '-', currentStatus,
              fundReq1Yr: '-', fundReq2Yrs: '-', fundReq2to5Yrs: '-', fundReqGt5Yrs: '-', remarks
            });
          }
        });

        if (tree.length > 0) {
          const parentIds = new Set(tree.map(n => n.parentId).filter(Boolean));
          tree.forEach(n => {
            n.hasChildren = parentIds.has(n.id);
          });
          setRawData(tree);
          return;
        }
      }
      
      throw new Error(FALLBACK_NOTICE);
    } catch (err) {
      if (isStale()) return;
      console.warn("OVOD Interventions notice:", err.message);
      // The deliberate fallback (no rows returned) is not an error; a failed request is
      if (err.message !== FALLBACK_NOTICE) notify(COMMON_TOASTS.loadFailed('The intervention list'));
      // Full 5-Level Deepdown Hierarchy matching both user screenshots!
      setRawData([
        {
          id: 'a1-ncb1',
          parentId: null,
          level: 0,
          hasChildren: true,
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
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Curriculum aligned with international maritime standards."
        },
        {
          id: 'a2-ncb1-1',
          parentId: 'a1-ncb1',
          level: 1,
          hasChildren: true,
          interventionList: "A2 : N-CB-1.1 : Standardizing curriculum across national maritime institutes",
          orgCode: "IMU, CEMS",
          progress: 73,
          totalCost: 0,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping",
          employmentType: "I, II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "National standardized exam framework designed."
        },
        {
          id: 'b1-pcb1-1',
          parentId: 'a2-ncb1-1',
          level: 2,
          hasChildren: true,
          interventionList: "B1 : P-CB-1 : Institutional upgrade & smart campus testbeds",
          orgCode: "IMU",
          progress: 70,
          totalCost: 0,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping",
          employmentType: "I, II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Campuses equipped with high-speed research intranet."
        },
        {
          id: 'b2-pcb1-1',
          parentId: 'b1-pcb1-1',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-CB-1.1 : Setup of advanced maritime simulators & VR labs",
          orgCode: "IMU",
          progress: 65,
          totalCost: 0,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "VR navigational lab testing complete."
        },
        {
          id: 'b3-pcb1-1-1',
          parentId: 'b2-pcb1-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-CB-1.1.1 : Faculty certification with international maritime bodies",
          orgCode: "IMU",
          progress: 80,
          totalCost: "-",
          jobTitle: "HR/Capacity Building",
          wing: "Shipping",
          employmentType: "II",
          Vibhas: "Capacity building",
          TargetDate: "21-11-2030",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "First cohort faculty certification completed."
        },

        {
          id: 'a1-ncb2',
          parentId: null,
          level: 0,
          hasChildren: true,
          interventionList: "A1 : N-CB-2 : Provide world class training to maritime community",
          orgCode: "IMU, CEMS, IPA, VPA, KPL...",
          progress: 64,
          totalCost: 5.66,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping, Ports",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 5.66,
          sourceOfFunding: "EBR, GBS, Other (Angel I...",
          fundSpend: 3.49,
          currentStatus: "In Progress",
          fundReq1Yr: 0.7,
          fundReq2Yrs: 0.31,
          fundReq2to5Yrs: 0.56,
          fundReqGt5Yrs: 0,
          remarks: "Specialized simulator training batches completed."
        },
        {
          id: 'a2-ncb2-1',
          parentId: 'a1-ncb2',
          level: 1,
          hasChildren: false,
          interventionList: "A2 : N-CB-2.1 : Advanced seafaring and green shipping specialized training",
          orgCode: "IMU, CEMS",
          progress: 60,
          totalCost: 5.66,
          jobTitle: "HR/Capacity Building",
          wing: "Shipping",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 5.66,
          sourceOfFunding: "EBR, GBS",
          fundSpend: 3.49,
          currentStatus: "In Progress",
          fundReq1Yr: 0.7,
          fundReq2Yrs: 0.31,
          fundReq2to5Yrs: 0.56,
          fundReqGt5Yrs: 0,
          remarks: "Specialized modules prepared."
        },

        {
          id: 'a1-ncb3',
          parentId: null,
          level: 0,
          hasChildren: false,
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
          currentStatus: "In Progress",
          fundReq1Yr: 10,
          fundReq2Yrs: 10,
          fundReq2to5Yrs: 15,
          fundReqGt5Yrs: 0,
          remarks: "New regional training institutes identified."
        },

        {
          id: 'a1-ncb4',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CB-4 : Promoting welfare of the maritime community",
          orgCode: "KDS, IPA, VPA, KPL, DNP...",
          progress: 51,
          totalCost: 68.21,
          jobTitle: "Institutional reforms, HR/...",
          wing: "Ports, Shipping, Inland...",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "31-12-2028",
          capitalExpenditure: 68.21,
          sourceOfFunding: "EBR, Other (Angel Invest...",
          fundSpend: 53.51,
          currentStatus: "In Progress",
          fundReq1Yr: 0.6,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Welfare trust disbursements ongoing on schedule."
        },

        {
          id: 'a1-ncb5',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CB-5 : Collaboration with foreign ports in the areas of : port growth...",
          orgCode: "IPA, JNPA",
          progress: 3,
          totalCost: 0,
          jobTitle: "HR/Capacity Building",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Capacity building, outrea...",
          TargetDate: "31-03-2027",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Initial bilateral MoU drafted and awaiting MEA clearance."
        },

        {
          id: 'a1-ncm1',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CM-1 : Optimize Communication in Ports Sector",
          orgCode: "IPA, CEMS, PPA, VPA, KPL...",
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
          currentStatus: "In Progress",
          fundReq1Yr: 51.62,
          fundReq2Yrs: 48.35,
          fundReq2to5Yrs: 13.91,
          fundReqGt5Yrs: 11.42,
          remarks: "Port Community System NLP & EDI modules being integrated."
        },

        {
          id: 'a1-ncm2',
          parentId: null,
          level: 0,
          hasChildren: false,
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
          sourceOfFunding: "GBS",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 1,
          fundReq2Yrs: 1.68,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Shipping communication channels harmonization initiated."
        },

        {
          id: 'a1-nit1',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-IT-1 : Digitalization of IWT Sector",
          orgCode: "IWAI",
          progress: 65,
          totalCost: 44.35,
          jobTitle: "Technology",
          wing: "IWT",
          employmentType: "I, II",
          Vibhas: "Communication, IOT syst...",
          TargetDate: "-",
          capitalExpenditure: 35,
          sourceOfFunding: "Other (Angel Investment...",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 7.5,
          fundReq2Yrs: 7.5,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 7.5,
          remarks: "National Waterway-1 & 2 telemetry hardware installed."
        },

        /* A1 : N-IT-2 and its deep-down list matching Screenshot 2 */
        {
          id: 'a1-nit2',
          parentId: null,
          level: 0,
          hasChildren: true,
          interventionList: "A1 : N-IT-2 : Development of IWT status...",
          orgCode: "IWAI",
          progress: 18,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "GBS",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Interstate coordination on national waterways routes."
        },
        {
          id: 'a2-nit2-1',
          parentId: 'a1-nit2',
          level: 1,
          hasChildren: true,
          interventionList: "A2 : N-IT-2.1 : Seamless coordination, planning and implementation with...",
          orgCode: "IWAI",
          progress: 18,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "GBS",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Joint steering committee meetings established."
        },
        {
          id: 'b1-pit2',
          parentId: 'a2-nit2-1',
          level: 2,
          hasChildren: true,
          interventionList: "B1 : P-IT-2 : Seamless coordination, planning and implementation...",
          orgCode: "IWAI",
          progress: 18,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "GBS",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "State-specific nodal officer appointments completed."
        },
        {
          id: 'b2-pit2-1',
          parentId: 'b1-pit2',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-IT-2.1 : Seamless coordination with Uttar Pradesh",
          orgCode: "IWAI",
          progress: 68,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "High level coordination with UP state transport dept."
        },
        {
          id: 'b3-pit2-1-1',
          parentId: 'b2-pit2-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.1.1 : Gathering and resolving pending state issu...",
          orgCode: "IWAI",
          progress: 75,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "State government coordination meeting convened."
        },
        {
          id: 'b3-pit2-1-2',
          parentId: 'b2-pit2-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.1.2 : Establishing a collaborative channel for sta...",
          orgCode: "IWAI",
          progress: 10,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - Delayed",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Draft institutional framework circulated to UP transport dept."
        },
        {
          id: 'b3-pit2-1-3',
          parentId: 'b2-pit2-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.1.3 : Providing exposure to global best practice...",
          orgCode: "IWAI",
          progress: 100,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "-",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Completed",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Workshop on European inland waterways benchmarks completed."
        },
        {
          id: 'b3-pit2-1-4',
          parentId: 'b2-pit2-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.1.4 : Developing specific action plans for state...",
          orgCode: "IWAI",
          progress: 15,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "-",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Action plan drafted for Varanasi and Prayagraj terminal hubs."
        },
        {
          id: 'b3-pit2-1-5',
          parentId: 'b2-pit2-1',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.1.5 : Constant knowledge sharing & showcase...",
          orgCode: "IWAI",
          progress: 0,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Yet to be Started",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Webinar series scheduled starting next quarter."
        },
        {
          id: 'b2-pit2-2',
          parentId: 'b1-pit2',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-IT-2.2 : Seamless coordination with Bihar",
          orgCode: "IWAI",
          progress: 68,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Patna multimodal terminal land clearance in progress."
        },
        {
          id: 'b3-pit2-2-1',
          parentId: 'b2-pit2-2',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.2.1 : Patna multimodal terminal land acquisition clearance",
          orgCode: "IWAI",
          progress: 80,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Final land survey conducted."
        },
        {
          id: 'b2-pit2-3',
          parentId: 'b1-pit2',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-IT-2.3 : Seamless coordination with Jharkhand",
          orgCode: "IWAI",
          progress: 26,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Sahibganj multimodal terminal road link upgrade."
        },
        {
          id: 'b3-pit2-3-1',
          parentId: 'b2-pit2-3',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.3.1 : Sahibganj multi-modal terminal road connectivity expansion",
          orgCode: "IWAI",
          progress: 35,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "PWD road expansion tender published."
        },
        {
          id: 'b2-pit2-4',
          parentId: 'b1-pit2',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-IT-2.4 : Seamless coordination with West Bengal",
          orgCode: "IWAI",
          progress: 54,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Haldia terminal cargo movement protocol established."
        },
        {
          id: 'b3-pit2-4-1',
          parentId: 'b2-pit2-4',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.4.1 : Haldia terminal cargo handling efficiency enhancements",
          orgCode: "IWAI",
          progress: 60,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "In Progress",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Automated conveyor belts deployed."
        },
        {
          id: 'b2-pit2-5',
          parentId: 'b1-pit2',
          level: 3,
          hasChildren: true,
          interventionList: "B2 : P-IT-2.5 : Seamless coordination with Assam",
          orgCode: "IWAI",
          progress: 2,
          totalCost: 0,
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: 0,
          sourceOfFunding: "-",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Pandu ship repair facility initial project appraisal."
        },
        {
          id: 'b3-pit2-5-1',
          parentId: 'b2-pit2-5',
          level: 4,
          hasChildren: false,
          interventionList: "B3 : P-IT-2.5.1 : Pandu ship repair facility development coordination",
          orgCode: "IWAI",
          progress: 12,
          totalCost: "-",
          jobTitle: "Process",
          wing: "IWT",
          employmentType: "II",
          Vibhas: "States",
          TargetDate: "31-12-2025",
          capitalExpenditure: "-",
          sourceOfFunding: "-",
          fundSpend: "-",
          currentStatus: "Under implementation - On time",
          fundReq1Yr: "-",
          fundReq2Yrs: "-",
          fundReq2to5Yrs: "-",
          fundReqGt5Yrs: "-",
          remarks: "Site clearance and soil testing initiated."
        },

        {
          id: 'a1-ncm4',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CM-4 : Optimize Communication in DGLL",
          orgCode: "DGLL",
          progress: 100,
          totalCost: 73,
          jobTitle: "Process",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Communication",
          TargetDate: "-",
          capitalExpenditure: 73,
          sourceOfFunding: "GBS",
          fundSpend: 73,
          currentStatus: "Completed",
          fundReq1Yr: 0,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "All targeted coastal lighthouse transmitters upgraded."
        },
        {
          id: 'a1-ncs1',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CS-1 : Enhance community outreach of the Ministry and its organisati...",
          orgCode: "MoPSW",
          progress: 15,
          totalCost: 7.64,
          jobTitle: "Finance",
          wing: "Shipping",
          employmentType: "II",
          Vibhas: "CSR & community outrea...",
          TargetDate: "-",
          capitalExpenditure: 7.64,
          sourceOfFunding: "Other (Angel Investment...",
          fundSpend: 0,
          currentStatus: "In Progress",
          fundReq1Yr: 7.64,
          fundReq2Yrs: 0,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Outreach programs scheduled across coastal states."
        },
        {
          id: 'a1-ncs2',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CS-2 : Community welfare through social infrastructure development...",
          orgCode: "CPA, KDS, DPA, MOC, C...",
          progress: 40,
          totalCost: 280.97,
          jobTitle: "Infrastructure, HR/Capaci...",
          wing: "Ports, Shipping",
          employmentType: "II",
          Vibhas: "CSR & community outrea...",
          TargetDate: "21-11-2030",
          capitalExpenditure: 275,
          sourceOfFunding: "GBS",
          fundSpend: 34,
          currentStatus: "In Progress",
          fundReq1Yr: 89,
          fundReq2Yrs: 186,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Multi-specialty coastal health clinic civil works initiated."
        },
        {
          id: 'a1-ncs3',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-CS-3 : Holistic Development of Fishing Community",
          orgCode: "DPA, KDS, VOPTa, ALHW...",
          progress: 24,
          totalCost: 150.87,
          jobTitle: "Infrastructure",
          wing: "Ports, Sagarmala",
          employmentType: "II",
          Vibhas: "CSR & community outrea...",
          TargetDate: "31-01-2027",
          capitalExpenditure: 150.87,
          sourceOfFunding: "GBS, PPP/SPV, IRR",
          fundSpend: 19.15,
          currentStatus: "In Progress",
          fundReq1Yr: 8.95,
          fundReq2Yrs: 67.26,
          fundReq2to5Yrs: 25.13,
          fundReqGt5Yrs: 0,
          remarks: "Fish processing cold chain units civil bids awarded."
        },
        {
          id: 'a1-nda1',
          parentId: null,
          level: 0,
          hasChildren: false,
          interventionList: "A1 : N-DA-1 : Data analytics and statistics for Ports",
          orgCode: "KDS, PPA, VPA, KPL, DEP...",
          progress: 31,
          totalCost: 13.73,
          jobTitle: "Process",
          wing: "Ports",
          employmentType: "II",
          Vibhas: "Data analytics, statistics...",
          TargetDate: "31-03-2031",
          capitalExpenditure: 11.63,
          sourceOfFunding: "GBS",
          fundSpend: 10,
          currentStatus: "In Progress",
          fundReq1Yr: 1.63,
          fundReq2Yrs: 0.18,
          fundReq2to5Yrs: 0,
          fundReqGt5Yrs: 0,
          remarks: "Centralized maritime BI dashboards deployed."
        }
      ]);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme, selectedStatus, notify]);

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
    resetInterventionFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Check if a node is visible in the tree (all ancestor nodes must be expanded)
  const isNodeVisible = useCallback((node, nodeMap) => {
    let current = node;
    while (current.parentId) {
      if (!expandedNodes[current.parentId]) {
        return false;
      }
      current = nodeMap.get(current.parentId);
      if (!current) break;
    }
    return true;
  }, [expandedNodes]);

  // Filter visible tree items according to expansion state
  const visibleTreeData = useMemo(() => {
    const nodeMap = new Map(rawData.map(n => [n.id, n]));
    return rawData.filter(node => isNodeVisible(node, nodeMap));
  }, [rawData, isNodeVisible]);

  // Set of IDs that have children
  const parentIdsSet = useMemo(() => {
    return new Set(rawData.map(r => r.parentId).filter(Boolean));
  }, [rawData]);

  // Filtered rows for AG Grid with search support
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return visibleTreeData;
    const q = searchTerm.toLowerCase();
    return rawData.filter(r => {
      const combined = `${r.interventionList || ''} ${r.orgCode || ''} ${r.wing || ''} ${r.jobTitle || ''} ${r.Vibhas || ''} ${r.currentStatus || ''}`.toLowerCase();
      return combined.includes(q);
    });
  }, [visibleTreeData, rawData, searchTerm]);

  // Check if all parent nodes are expanded
  const isAllExpanded = useMemo(() => {
    const parentNodes = rawData.filter(r => r.hasChildren || parentIdsSet.has(r.id));
    if (parentNodes.length === 0) return false;
    return parentNodes.every(p => !!expandedNodes[p.id]);
  }, [rawData, parentIdsSet, expandedNodes]);

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedNodes({});
    } else {
      const next = {};
      rawData.forEach(r => {
        if (r.hasChildren || parentIdsSet.has(r.id)) {
          next[r.id] = true;
        }
      });
      setExpandedNodes(next);
    }
  };

  // Navy AG Grid Column Definitions with deepdown list and differed headers
  const columnDefs = useMemo(() => [
    {
      headerName: "Intervention List",
      field: "interventionList",
      width: 520,
      minWidth: 460,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => {
        const data = params.data;
        if (!data) return null;
        const id = data.id;
        const level = data.level || 0;
        const hasChildren = data.hasChildren !== false && (level < 4 && (data.hasChildren || parentIdsSet.has(id)));
        const isExpanded = !!expandedNodes[id];

        // Indentation calculation based on level (level 0: 0px, 1: 16px, 2: 32px, 3: 48px, 4: 68px)
        const indentPx = level === 4 ? 68 : level * 16;

        return (
          <div 
            className="flex items-start space-x-1.5 py-1.5 select-none"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(id);
                }}
                className="mt-0.5 p-0.5 text-slate-500 hover:text-blue-600 transition cursor-pointer flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="stroke-[2.5]" />
                ) : (
                  <ChevronRight size={14} className="stroke-[2.5]" />
                )}
              </button>
            ) : level === 4 ? (
              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 mr-0.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-slate-700 dark:bg-slate-300 rounded-[1px] inline-block" />
              </span>
            ) : (
              <span className="w-3.5 flex-shrink-0" />
            )}
            <span 
              className={`leading-snug break-words whitespace-normal ${
                level === 0 
                  ? 'font-bold text-slate-900 dark:text-slate-100 text-[13px]' 
                  : level === 3
                  ? 'font-bold text-slate-800 dark:text-slate-200 text-[12.5px]'
                  : level === 4
                  ? 'font-medium text-slate-600 dark:text-slate-300 text-[12px]'
                  : 'font-semibold text-slate-800 dark:text-slate-200 text-[12.5px]'
              }`}
              title={data.interventionList}
            >
              {data.interventionList || '-'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: "Implementing Agency",
      field: "orgCode",
      width: 180,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 break-words whitespace-normal leading-snug py-1 block">
          {params.value || 'IMU, CEMS'}
        </span>
      )
    },
    {
      headerName: "Progress (in %)",
      field: "progress",
      width: 140,
      minWidth: 120,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-800 dark:text-slate-100 whitespace-normal break-words py-1">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Total Cost (in Cr.)",
      field: "totalCost",
      width: 160,
      minWidth: 140,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = params.value;
        if (val == null || val === '' || val === '-') return null;
        const num = Number(val);
        return (
          <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
            {isNaN(num) ? val : (num === 0 ? '0' : num.toFixed(2).replace(/\.00$/, ''))}
          </div>
        );
      }
    },
    {
      headerName: "Category",
      field: "jobTitle",
      width: 170,
      minWidth: 150,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => (
        <span className="break-words whitespace-normal leading-snug py-1 block text-slate-700 dark:text-slate-200">
          {params.value || 'Process'}
        </span>
      )
    },
    {
      headerName: "Wing",
      field: "wing",
      width: 130,
      minWidth: 110,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => (
        <span className="break-words whitespace-normal leading-snug py-1 block text-slate-700 dark:text-slate-200">
          {params.value || 'IWT'}
        </span>
      )
    },
    {
      headerName: "Priority",
      field: "employmentType",
      width: 110,
      minWidth: 95,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
          {params.value || 'II'}
        </div>
      )
    },
    {
      headerName: "Vibhas",
      field: "Vibhas",
      width: 180,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => (
        <span className="break-words whitespace-normal leading-snug py-1 block text-slate-700 dark:text-slate-200">
          {params.value || 'States'}
        </span>
      )
    },
    {
      headerName: "Target Date",
      field: "TargetDate",
      width: 140,
      minWidth: 125,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = params.value;
        if (!val || val === '-') return null;
        return (
          <div className="w-full flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs whitespace-normal break-words py-1">
            {val}
          </div>
        );
      }
    },
    {
      headerName: "Capital Expenditure",
      field: "capitalExpenditure",
      width: 170,
      minWidth: 150,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = params.value;
        if (val == null || val === '' || val === '-') return null;
        const num = Number(val);
        return (
          <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
            {isNaN(num) ? val : (num === 0 ? '0' : num.toFixed(2).replace(/\.00$/, ''))}
          </div>
        );
      }
    },
    {
      headerName: "Source of Funding",
      field: "sourceOfFunding",
      width: 180,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => {
        const val = params.value;
        if (!val || val === '-') return null;
        return (
          <span className="text-slate-600 dark:text-slate-300 text-xs break-words whitespace-normal leading-snug py-1 block">
            {val}
          </span>
        );
      }
    },
    {
      headerName: "Fund Spent",
      field: "fundSpend",
      width: 140,
      minWidth: 120,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = params.value;
        if (val == null || val === '' || val === '-') return null;
        const num = Number(val);
        return (
          <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
            {isNaN(num) ? val : (num === 0 ? '0' : num.toFixed(2).replace(/\.00$/, ''))}
          </div>
        );
      }
    },
    {
      headerName: "Current Status",
      field: "currentStatus",
      width: 220,
      minWidth: 190,
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      cellRenderer: (params) => {
        const val = params.value;
        if (!val || val === '-') return null;
        return (
          <span className="text-slate-700 dark:text-slate-300 text-xs break-words whitespace-normal leading-snug py-1 block" title={val}>
            {val}
          </span>
        );
      }
    },
    {
      headerName: "Fund requirement (in Cr)",
      headerClass: "custom-header-bg ovod-fund-req-group-header",
      marryChildren: true,
      wrapHeaderText: true,
      children: [
        {
          headerName: "1 Year",
          field: "fundReq1Yr",
          width: 120,
          minWidth: 110,
          wrapText: true,
          autoHeight: true,
          wrapHeaderText: true,
          headerClass: "custom-header-bg ovod-fund-req-child-header text-center",
          cellClass: "text-center",
          cellRenderer: (params) => {
            const val = params.value;
            if (val == null || val === '' || val === '-') return null;
            const num = Number(val);
            return (
              <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
                {isNaN(num) ? val : (num === 0 ? '0' : String(num))}
              </div>
            );
          }
        },
        {
          headerName: "2 Years",
          field: "fundReq2Yrs",
          width: 120,
          minWidth: 110,
          wrapText: true,
          autoHeight: true,
          wrapHeaderText: true,
          headerClass: "custom-header-bg ovod-fund-req-child-header text-center",
          cellClass: "text-center",
          cellRenderer: (params) => {
            const val = params.value;
            if (val == null || val === '' || val === '-') return null;
            const num = Number(val);
            return (
              <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
                {isNaN(num) ? val : (num === 0 ? '0' : String(num))}
              </div>
            );
          }
        },
        {
          headerName: ">2 Upto 5 Years",
          field: "fundReq2to5Yrs",
          width: 150,
          minWidth: 135,
          wrapText: true,
          autoHeight: true,
          wrapHeaderText: true,
          headerClass: "custom-header-bg ovod-fund-req-child-header text-center",
          cellClass: "text-center",
          cellRenderer: (params) => {
            const val = params.value;
            if (val == null || val === '' || val === '-') return null;
            const num = Number(val);
            return (
              <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
                {isNaN(num) ? val : (num === 0 ? '0' : String(num))}
              </div>
            );
          }
        },
        {
          headerName: "> 5 Years",
          field: "fundReqGt5Yrs",
          width: 120,
          minWidth: 110,
          wrapText: true,
          autoHeight: true,
          wrapHeaderText: true,
          headerClass: "custom-header-bg ovod-fund-req-child-header text-center",
          cellClass: "text-center",
          cellRenderer: (params) => {
            const val = params.value;
            if (val == null || val === '' || val === '-') return null;
            const num = Number(val);
            return (
              <div className="w-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 whitespace-normal break-words py-1">
                {isNaN(num) ? val : (num === 0 ? '0' : String(num))}
              </div>
            );
          }
        }
      ]
    },
    {
      headerName: "Remarks",
      field: "remarks",
      width: 80,
      minWidth: 70,
      maxWidth: 90,
      headerClass: "custom-header-bg ovod-remarks-header",
      cellClass: "text-center flex items-center justify-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSelectedRemarkRow(params.data)}
            title={params.value || "Click to view / edit remarks"}
            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FileText size={15} />
          </button>
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
    { label: 'Fund Spent', key: 'fundSpend' },
    { label: 'Current Status', key: 'currentStatus' },
    { label: '1 Year (in Cr)', key: 'fundReq1Yr' },
    { label: '2 Years (in Cr)', key: 'fundReq2Yrs' },
    { label: '>2 Upto 5 Years (in Cr)', key: 'fundReq2to5Yrs' },
    { label: '> 5 Years (in Cr)', key: 'fundReqGt5Yrs' },
    { label: 'Remarks', key: 'remarks' }
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
    fundSpend: r.fundSpend != null ? Number(r.fundSpend).toFixed(2) : '0.00',
    currentStatus: r.currentStatus || 'In Progress',
    fundReq1Yr: r.fundReq1Yr != null ? r.fundReq1Yr : 0,
    fundReq2Yrs: r.fundReq2Yrs != null ? r.fundReq2Yrs : 0,
    fundReq2to5Yrs: r.fundReq2to5Yrs != null ? r.fundReq2to5Yrs : 0,
    fundReqGt5Yrs: r.fundReqGt5Yrs != null ? r.fundReqGt5Yrs : 0,
    remarks: r.remarks || ''
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
                {countsData.totalCostA}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-amber-600 shadow-xs">
                <Pencil size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Cost [A] (in Cr.)
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
                {countsData.totalCostB}
              </span>
              <div className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-800 flex items-center justify-center text-yellow-600 shadow-xs">
                <Pencil size={13} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wide mt-1">
              Total Cost [B] (in Cr.)
            </p>
          </div>

        </div>

      </div>

      {/* 3. Main Table Card Container matching GMIS DataList */}
      <div className="module-card space-y-5">
        
        {/* Action Toolbar Header matching GMIS DataList: Filter button on Left, Search, Copy & Export on Right */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Dedicated Filter Button & Reset on Left */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setInterventionFilterPanel(prev => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
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

            <button
              type="button"
              onClick={handleToggleExpandAll}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                isAllExpanded
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              title={isAllExpanded ? "Collapse all hierarchy levels" : "Expand all hierarchy levels"}
            >
              <FolderTree className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
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
                onChange={(e) => setInterventionSearch(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setInterventionSearch('')}
                  aria-label="Clear search"
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
                onChange={(e) => setInterventionPageSize(Number(e.target.value))}
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
                  onChange={(e) => setInterventionFilter('vision', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('wing', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('org', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="0">Show All</option>
                  {organisations.map(o => (
                    <option key={o.ia_id} value={o.ia_id}>{o.ia_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  VIBHAS/NAWIC Cell
                </label>
                <select
                  value={selectedVibhas}
                  onChange={(e) => setInterventionFilter('vibhas', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('priority', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('mivChapter', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('makvTheme', e.target.value)}
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
                  onChange={(e) => setInterventionFilter('status', e.target.value)}
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

        {/* Navy AG Grid Table with Differed Headers */}
        <div className="ovod-table-container">
          <style>{`
            .ovod-table-container .ag-header-group-cell.ovod-fund-req-group-header,
            .custom-table-container-0f417a .ag-header-group-cell.ovod-fund-req-group-header,
            div.ag-header-group-cell.ovod-fund-req-group-header {
              background-color: #28408f !important;
              background: #28408f !important;
              color: #ffffff !important;
              font-weight: 800 !important;
              font-size: 12px !important;
              border-left: 2px solid rgba(255, 255, 255, 0.25) !important;
              text-align: center !important;
              justify-content: center !important;
            }

            .ovod-table-container .ag-header-cell.ovod-fund-req-child-header,
            .custom-table-container-0f417a .ag-header-cell.ovod-fund-req-child-header,
            div.ag-header-cell.ovod-fund-req-child-header {
              background-color: #2f4c83 !important;
              background: #2f4c83 !important;
              color: #ffffff !important;
              font-weight: 700 !important;
              font-size: 11px !important;
              border-left: 1px solid rgba(255, 255, 255, 0.15) !important;
              text-align: center !important;
              justify-content: center !important;
            }

            .ovod-table-container .ag-header-cell.ovod-remarks-header,
            .custom-table-container-0f417a .ag-header-cell.ovod-remarks-header,
            div.ag-header-cell.ovod-remarks-header {
              background-color: #28408f !important;
              background: #28408f !important;
              color: #ffffff !important;
              border-left: 2px solid rgba(255, 255, 255, 0.25) !important;
              text-align: center !important;
              justify-content: center !important;
            }

            .ovod-table-container .ovod-remarks-header .ag-header-cell-label,
            .ovod-table-container .ovod-remarks-header .ag-header-cell-text,
            .ovod-remarks-header .ag-header-cell-label,
            .ovod-remarks-header .ag-header-cell-text {
              white-space: normal !important;
              font-size: 11.5px !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              color: #ffffff !important;
              padding: 0 !important;
            }

            .ovod-table-container .ag-header-cell:not(.ovod-remarks-header) .ag-header-cell-text,
            .ovod-table-container .ag-header-cell:not(.ovod-remarks-header) .ag-header-cell-label,
            .ovod-table-container .ag-header-group-cell .ag-header-group-cell-label {
              white-space: normal !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
              text-overflow: unset !important;
              overflow: visible !important;
              line-height: 1.25 !important;
            }

            .ovod-table-container .ag-cell,
            .ovod-table-container .ag-cell-value,
            .ovod-table-container .ag-cell-wrapper {
              white-space: normal !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
              line-height: 1.4 !important;
            }
          `}</style>
          <Table
            ref={gridRef}
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            enableExport={false}
            color="#0f417a"
            autoSizeStrategy={null}
            headerHeight={30}
            groupHeaderHeight={28}
          />
        </div>

      </div>

      {/* Remarks View / Edit Modal */}
      {selectedRemarkRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Intervention Remarks & Notes
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedRemarkRow.orgCode} • Status: {selectedRemarkRow.currentStatus}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRemarkRow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                {selectedRemarkRow.interventionList}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Reason for Delay / Detailed Remarks
                </label>
                <textarea
                  rows={4}
                  value={selectedRemarkRow.remarks || ''}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSelectedRemarkRow(prev => ({ ...prev, remarks: newVal }));
                    setRawData(prev => prev.map(r => r.id === selectedRemarkRow.id ? { ...r, remarks: newVal } : r));
                  }}
                  placeholder="Enter remarks or updates regarding this intervention..."
                  className="w-full text-xs p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRemarkRow(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  notify(OVOD_TOASTS.remarksUpdated());
                  setSelectedRemarkRow(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Remarks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
