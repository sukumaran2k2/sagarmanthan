// Rows for the "KPI - DGS (Output Reports)" landing page (screenshots 3-4).
//
// Same shape as inputFormIndex.js: leaves become blue links and register as routes at
// /kpi/dgs/reports/:slug; headers (isGroup) are plain bold rows.

const REPORTS_INDEX = [
  {
    code: 'K-2.1', label: 'DGS- Flagging of Vessels', isGroup: true,
    children: [
      { code: 'K-2.1.1', label: 'Flagging- Addition of Ships & Tonnage', slug: 'flagging-addition' },
      { code: 'K-2.1.2', label: 'Flagging- Deletion of Ships & Tonnage', slug: 'flagging-deletion' },
      { code: 'K-2.1.3', label: 'Flagging- Cumulative Active Ships & Tonnage', slug: 'flagging-cumulative' },
      { code: 'K-2.1.4', label: 'Flagging- Addition & Deletion of Ships & Tonnage Monthly Trends', slug: 'flagging-monthly-trends' },
      { code: 'K-2.1.5', label: 'Flagging- Addition & Deletion of Ships & Tonnage Yearly Trends', slug: 'flagging-yearly-trends' },
    ],
  },
  {
    code: 'K-2.2', label: 'DGS- Shipbuilding Financial Assistance Policy (SBFAP)', isGroup: true,
    children: [
      { code: 'K-2.2.0', label: 'SBFAP - Overview (In Principle Approval Requests)', slug: 'sbfap-overview' },
      { code: 'K-2.2.1', label: 'Shipbuilding Financial Assistance Policy (SBFAP) In-Principle Approval Requests- Approved', slug: 'sbfap-ip-approved' },
      { code: 'K-2.2.2', label: 'Shipbuilding Financial Assistance Policy (SBFAP) In-Principle Approval Requests- In Process/Pending', slug: 'sbfap-ip-in-process' },
      { code: 'K-2.2.3', label: 'Shipbuilding Financial Assistance Policy (SBFAP) In-Principle Approval Requests- Rejected', slug: 'sbfap-ip-rejected' },
      { code: 'K-2.2.4', label: 'Shipbuilding Financial Assistance Policy (SBFAP) Fund Release Requests- Approved/Released', slug: 'sbfap-fr-approved' },
      { code: 'K-2.2.5', label: 'Shipbuilding Financial Assistance Policy (SBFAP) Fund Release Requests- In Process/Pending', slug: 'sbfap-fr-in-process' },
      { code: 'K-2.2.6', label: 'Shipbuilding Financial Assistance Policy (SBFAP) Fund Release Requests- Fund Release Requests-Rejected', slug: 'sbfap-fr-rejected' },
    ],
  },
  {
    code: 'K-2.3', label: 'DGS- Exam Overall Performance Statistics', isGroup: true,
    children: [
      { code: 'K-2.3.1', label: 'DGS-Exam Overall Performance Statistics', slug: 'exam-overall' },
      { code: 'K-2.3.2', label: 'Exam Performance Monthly Trends (For the Current Year)', slug: 'exam-monthly-trends' },
      { code: 'K-2.3.3', label: 'Exam Performance Yearly Trends', slug: 'exam-yearly-trends' },
    ],
  },
  {
    code: 'K-2.4', label: 'DGS- Entry and Exit of Candidates', isGroup: true,
    children: [
      { code: 'K-2.4.1', label: 'DGS-Entry and Exit of Candidates', slug: 'entry-exit' },
      { code: 'K-2.4.2', label: 'Entry and Exit Monthly Trends (For the Current Year)', slug: 'entry-exit-monthly-trends' },
      { code: 'K-2.4.3', label: 'Entry and Exit Yearly Trends', slug: 'entry-exit-yearly-trends' },
    ],
  },
  {
    code: 'K-2.5', label: 'DGS- Marine Casualty Serious & Other Incidents', isGroup: true,
    children: [
      { code: 'K-2.5.1', label: 'Marine Casualty Serious & Other Incidents- Previous & Current Year', slug: 'marine-casualty-previous-current' },
      { code: 'K-2.5.2', label: 'Marine Casualty Incidents- Yearwise', slug: 'marine-casualty-yearwise' },
      { code: 'K-2.5.3', label: 'Marine Casualty Serious & Other Incidents- Country (Flag)-Wise', slug: 'marine-casualty-country-wise' },
      { code: 'K-2.5.4', label: 'Marine Casualty Serious & Other Incidents- Vessel-Wise', slug: 'marine-casualty-vessel-wise' },
    ],
  },
  {
    code: 'K-2.6', label: 'DGS- Flag State Inspection', isGroup: true,
    children: [
      { code: 'K-2.6.1', label: 'Flag State Inspection- MMD Wise', slug: 'flag-state-mmd-wise' },
      { code: 'K-2.6.2', label: 'Flag State Inspection & GI Performance- Vessel Wise (All Ages)', slug: 'flag-state-vessel-all-ages' },
      { code: 'K-2.6.3', label: 'Flag State Inspection & GI Performance- Vessel Wise (Upto 5 Years Age)', slug: 'flag-state-vessel-upto-5' },
      { code: 'K-2.6.4', label: 'Flag State Inspection & GI Performance- Vessel Wise (Above 5 Years & upto 15 Years Age)', slug: 'flag-state-vessel-5-15' },
      { code: 'K-2.6.5', label: 'Flag State Inspection & GI Performance- Vessel Wise (Above 15 Years & upto 25 Years Age)', slug: 'flag-state-vessel-15-25' },
      { code: 'K-2.6.6', label: 'Flag State Inspection & GI Performance- Vessel Wise (Above 25 Years Age)', slug: 'flag-state-vessel-above-25' },
      { code: 'K-2.6.7', label: 'Flag State Inspection (FSI) Monthly Trends (For the Current Year)', slug: 'flag-state-monthly-trends' },
      { code: 'K-2.6.8', label: 'Flag State Inspection (FSI) Yearly Trends', slug: 'flag-state-yearly-trends' },
    ],
  },
  {
    code: 'K-2.7', label: 'DGS- Port State Control (PSC) Inspection', isGroup: true,
    children: [
      { code: 'K-2.7.1', label: 'Port State Control (PSC) Inspection- MMD Wise', slug: 'psc-mmd-wise' },
      { code: 'K-2.7.2', label: 'Port State Control (PSC)- Vessel Wise (All Ages)', slug: 'psc-vessel-all-ages' },
      { code: 'K-2.7.3', label: 'Port State Control (PSC)- Vessel Wise (Upto 10 Years Age)', slug: 'psc-vessel-upto-12' },
      { code: 'K-2.7.4', label: 'Port State Control (PSC)- Vessel Wise (Above 10 Years & upto 20 Years Age)', slug: 'psc-vessel-12-20' },
      { code: 'K-2.7.5', label: 'Port State Control (PSC)- Vessel Wise (Above 20 Years Age)', slug: 'psc-vessel-above-20' },
      { code: 'K-2.7.6', label: 'Port State Control (PSC) Monthly Trends (For the Current Year)', slug: 'psc-monthly-trends' },
      { code: 'K-2.7.7', label: 'Port State Control (PSC) Yearly Trends', slug: 'psc-yearly-trends' },
    ],
  },
  {
    code: 'K-2.8', label: 'Vessel and Port Survey/Audits by MMDs', isGroup: true,
    children: [
      { code: 'K-2.8.1', label: 'Vessel Survey by MMDs Performance', slug: 'vessel-survey-performance' },
      { code: 'K-2.8.2', label: 'Vessel & Port Surveys by MMDs Monthly Trends (For the Current Year)', slug: 'vessel-survey-monthly-trends' },
      { code: 'K-2.8.3', label: 'Vessel & Port Surveys by MMDs Yearly Trends', slug: 'vessel-survey-yearly-trends' },
    ],
  },
  {
    code: 'K-2.9', label: 'Maritime Training Institutes (MTIs) Performance', isGroup: true,
    children: [
      { code: 'K-2.9.1', label: 'Maritime Training Institutes (MTIs) Performance', slug: 'mti-performance' },
      { code: 'K-2.9.2', label: 'Stream Wise Pre Sea, Post Sea Competency and Modular Courses', slug: 'mti-stream-wise' },
      { code: 'K-2.9.3', label: 'Affiliation Wise MTI Performance', slug: 'mti-affiliation-wise' },
      { code: 'K-2.9.4.1', label: 'Placement Record for MTIs for Previous FY', slug: 'mti-placement-previous-fy' },
      { code: 'K-2.9.4.2', label: 'Placement Record for MTIs for Previous FY', slug: 'mti-placement-previous-fy-2' },
    ],
  },
];

export default REPORTS_INDEX;

export const REPORTS_LEAVES = REPORTS_INDEX.flatMap((row) =>
  row.isGroup ? row.children : [row]
);
