import { getDataScope } from "../../../middleware/dataScope.js";

export const MIS_REPORTS = [
  { id: "stalled-stage", annexure: "1" },
  { id: "delayed-progress", annexure: "2" },
  { id: "awarded-current-fy", annexure: "3" },
  { id: "completion-current-fy", annexure: "4" },
  { id: "to-be-awarded-current-fy", annexure: "5" },
  { id: "progress-gap", annexure: "6" },
];

export function getMisReportMeta(reportId) {
  return MIS_REPORTS.find((report) => report.id === reportId) || null;
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFinancialYear(date) {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

export function resolveMisScope(req) {
  const dataScope = getDataScope(req.user || {});
  const organisationId = Number(dataScope.organisationId);
  const hasOrg = Number.isFinite(organisationId) && organisationId > 0;
  const now = new Date();
  const financialYear = formatFinancialYear(now);
  const asOnDate = formatIsoDate(now);

  if (dataScope.isWide && !dataScope.isOrganisation) {
    return {
      audience: "ministry",
      organisationId: null,
      financialYear,
      asOnDate,
    };
  }

  return {
    audience: "organisation",
    organisationId: hasOrg ? organisationId : -1,
    financialYear,
    asOnDate,
  };
}

export function scopeMisRows(rows, organisationId) {
  if (organisationId == null) return rows;
  if (!(organisationId > 0)) return [];
  return rows.filter((row) => Number(row?.organisationId) === organisationId);
}
