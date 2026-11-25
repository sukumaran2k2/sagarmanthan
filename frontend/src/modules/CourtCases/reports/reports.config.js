import {
  fetchCourtCaseReport,
  fetchArbitrationDetailReport,
  fetchConciliationDetailReport,
  fetchLitigationDetailReport,
  fetchLitigationDomainSubDomainReport,
  fetchLitigationDomainSubDomainOtherOrgReport,
  fetchLitigationPortwisePendencyReport,
  fetchLitigationPortwisePendencyOtherOrgReport,
  fetchLitigationDomainwisePendencyReport,
  fetchLitigationDomainwisePendencyOtherOrgReport,
} from "../api";

export const STAGE_OPTIONS = [
  "Case Initiated", "Hearing started", "Interim order Passed", "Final judgemented",
  "Counter Affidavit Filed", "Complaince done", "Complaince required", "Outcome completed",
  "Award passed", "Defence statement filed", "No Status",
];

export const REPORTS = [
  {
    id: "overview", code: "CC01", audience: "all",
    title: "Overview of Court Cases – Major Ports & Other Organisations",
    load: ({ userID }) => fetchCourtCaseReport(userID),
    filter: { kind: "organisation", field: "organisation_id", label: "Organisation" },
    totals: { labelField: "Organisation" },
    drill: {
      Arbitration: { to: "arbitration-detail", stage: 1 },
      Conciliation: { to: "conciliation-detail", stage: 1 },
      Litigation: { to: "litigation-detail", stage: 1 },
      Inactive_Arbitration: { to: "arbitration-detail", stage: 7 },
      Inactive_Conciliation: { to: "conciliation-detail", stage: 7 },
      Inactive_Litigation: { to: "litigation-detail", stage: 7 },
    },
  },
  {
    id: "domain-subdomain-major", code: "CC02", audience: "major",
    title: "Domain & Sub-Domain Report – Major Ports",
    load: ({ userID }) => fetchLitigationDomainSubDomainReport(userID),
    totals: { labelField: "Domain Name" },
  },
  {
    id: "domain-subdomain-other", code: "CC03", audience: "other",
    title: "Domain & Sub-Domain Report – Other Organisations",
    load: ({ userID }) => fetchLitigationDomainSubDomainOtherOrgReport(userID),
    totals: { labelField: "Domain Name" },
  },
  {
    id: "port-pendency-major", code: "CC04", audience: "major",
    title: "Port-Wise Pendency Report – Major Ports",
    load: ({ userID }) => fetchLitigationPortwisePendencyReport(userID),
  },
  {
    id: "port-pendency-other", code: "CC05", audience: "other",
    title: "Port-Wise Pendency Report – Other Organisations",
    load: ({ userID }) => fetchLitigationPortwisePendencyOtherOrgReport(userID),
  },
  {
    id: "domain-pendency-major", code: "CC06",audience: "major",
    title: "Domain-wise Pendency Report – Major Ports",
    load: ({ userID }) => fetchLitigationDomainwisePendencyReport(userID),
  },
  {
    id: "domain-pendency-other", code: "CC07", audience: "other",
    title: "Domain-wise Pendency Report – Other Organisations",
    load: ({ userID }) => fetchLitigationDomainwisePendencyOtherOrgReport(userID),
  },

  /* ---- drill-down reports: hidden from the list, opened by clicking a number in CC01 ---- */
  {
    id: "arbitration-detail", hidden: true, code: "CC01B",
    title: "Detailed - Status of Arbitration Case",
    load: ({ organisationID, stageID }) => fetchArbitrationDetailReport(organisationID, stageID),
    filter: { kind: "stage", field: "Stage", label: "Case Status" },
  },
  {
    id: "conciliation-detail", hidden: true, code: "CC01C",
    title: "Detailed - Status of Conciliation Case",
    load: ({ organisationID, stageID }) => fetchConciliationDetailReport(organisationID, stageID),
    filter: { kind: "stage", field: "Stage", label: "Case Status" },
  },
  {
    id: "litigation-detail", hidden: true, code: "CC01D",
    title: "Detailed - Status of Litigation Case",
    load: ({ organisationID, stageID }) => fetchLitigationDetailReport(organisationID, stageID),
    filter: { kind: "stage", field: "Stage", label: "Case Status" },
  },
];

export const getReport = (id) => REPORTS.find((r) => r.id === id);