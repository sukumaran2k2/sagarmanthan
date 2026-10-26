import { pool } from "../../../db.js";
import {
  MIS_REPORTS,
  getMisReportMeta,
  resolveMisScope,
  scopeMisRows,
} from "./shared.js";
import { queryStalledStage } from "./stalledStage.js";
import { queryDelayedProgress } from "./delayedProgress.js";
import { queryAwardedCurrentFy } from "./awardedCurrentFy.js";
import { queryCompletionCurrentFy } from "./completionCurrentFy.js";
import { queryToBeAwardedCurrentFy } from "./toBeAwardedCurrentFy.js";
import { queryProgressGap } from "./progressGap.js";

const QUERY_HANDLERS = {
  "stalled-stage": queryStalledStage,
  "delayed-progress": queryDelayedProgress,
  "awarded-current-fy": queryAwardedCurrentFy,
  "completion-current-fy": queryCompletionCurrentFy,
  "to-be-awarded-current-fy": queryToBeAwardedCurrentFy,
  "progress-gap": queryProgressGap,
};

async function loadReport(reportId, scope) {
  const handler = QUERY_HANDLERS[reportId];
  if (!handler) {
    return { id: reportId, dataReady: false, error: true, rows: [] };
  }

  const conn = await pool;

  try {
    const result = await handler(conn, scope);
    const sourceRows = Array.isArray(result?.rows) ? result.rows : [];
    const rows = scopeMisRows(sourceRows, scope.organisationId);

    return {
      id: reportId,
      dataReady: Boolean(result?.dataReady),
      error: false,
      rows,
    };
  } catch (err) {
    console.error(`projects-mis ${reportId}`, err);
    return { id: reportId, dataReady: false, error: true, rows: [] };
  }
}

async function getMisSummary(req, res) {
  const scope = resolveMisScope(req);

  try {
    const reports = await Promise.all(
      MIS_REPORTS.map((report) => loadReport(report.id, scope))
    );

    return res.json({
      asOnDate: scope.asOnDate,
      financialYear: scope.financialYear,
      audience: scope.audience,
      reports,
    });
  } catch (err) {
    console.error("getMisSummary", err);
    return res.status(500).json({ message: "Failed to load Project MIS reports." });
  }
}

async function getMisReport(req, res) {
  const reportId = String(req.params.reportId || "").trim();
  const meta = getMisReportMeta(reportId);

  if (!meta) {
    return res.status(404).json({ message: "Unknown Project MIS report." });
  }

  const scope = resolveMisScope(req);

  try {
    const report = await loadReport(reportId, scope);
    if (report.error) {
      return res.status(500).json({ message: "Failed to load this MIS report." });
    }

    return res.json({
      asOnDate: scope.asOnDate,
      financialYear: scope.financialYear,
      audience: scope.audience,
      report,
    });
  } catch (err) {
    console.error("getMisReport", err);
    return res.status(500).json({ message: "Failed to load this MIS report." });
  }
}

export default {
  getMisSummary,
  getMisReport,
};
