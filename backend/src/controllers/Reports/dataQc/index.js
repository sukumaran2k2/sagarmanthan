import { pool } from "../../../db.js";
import {
  CHECK_CATALOG,
  TENDERING_STAGE_LABELS,
  IMPLEMENTATION_MILESTONE_LABELS,
  assertMinistryAccess,
  buildSeverityTotals,
  getCheckMeta,
} from "./shared.js";
import {
  getTenderingMissingCount,
  getTenderingMissingDetail,
} from "./tenderingMissing.js";
import {
  getTenderingOverdueCount,
  getTenderingOverdueDetail,
} from "./tenderingOverdue.js";
import {
  getTenderingFoundationCount,
  getTenderingFoundationDetail,
} from "./tenderingFoundation.js";
import {
  getImplementationMissingCount,
  getImplementationMissingDetail,
} from "./implementationMissing.js";
import {
  getImplementationOverdueCount,
  getImplementationOverdueDetail,
} from "./implementationOverdue.js";
import {
  getImplementationInaugurationCount,
  getImplementationInaugurationDetail,
} from "./implementationInauguration.js";
import {
  getTargetCompletionCount,
  getTargetCompletionDetail,
} from "./targetCompletion.js";
import {
  getProjectCategoryBlankCount,
  getProjectCategoryBlankDetail,
} from "./projectCategoryBlank.js";
import {
  getProjectCategoryMismatchCount,
  getProjectCategoryMismatchDetail,
} from "./projectCategoryMismatch.js";

const DETAIL_HANDLERS = {
  "tendering-missing": getTenderingMissingDetail,
  "tendering-overdue": getTenderingOverdueDetail,
  "tendering-foundation": getTenderingFoundationDetail,
  "implementation-missing": getImplementationMissingDetail,
  "implementation-overdue": getImplementationOverdueDetail,
  "implementation-inauguration": getImplementationInaugurationDetail,
  "target-completion": getTargetCompletionDetail,
  "project-category-blank": getProjectCategoryBlankDetail,
  "project-category-mismatch": getProjectCategoryMismatchDetail,
};

const COUNT_HANDLERS = {
  "tendering-missing": getTenderingMissingCount,
  "tendering-overdue": getTenderingOverdueCount,
  "tendering-foundation": getTenderingFoundationCount,
  "implementation-missing": getImplementationMissingCount,
  "implementation-overdue": getImplementationOverdueCount,
  "implementation-inauguration": getImplementationInaugurationCount,
  "target-completion": getTargetCompletionCount,
  "project-category-blank": getProjectCategoryBlankCount,
  "project-category-mismatch": getProjectCategoryMismatchCount,
};

async function getDataQcSummary(req, res) {
  if (!assertMinistryAccess(req, res)) return;

  const conn = await pool;

  try {
    const availableChecks = CHECK_CATALOG.filter((check) => check.available);
    const countEntries = await Promise.all(
      availableChecks.map(async (check) => {
        const handler = COUNT_HANDLERS[check.id];
        if (!handler) return [check.id, 0];
        return [check.id, await handler(conn)];
      })
    );

    const liveCounts = Object.fromEntries(countEntries);

    const checks = CHECK_CATALOG.map((check) => ({
      ...check,
      count: check.available ? liveCounts[check.id] ?? 0 : null,
    }));

    const bySeverity = buildSeverityTotals(checks);
    const totalIssues = checks.reduce(
      (sum, check) => sum + (typeof check.count === "number" ? check.count : 0),
      0
    );

    return res.json({
      totalIssues,
      bySeverity,
      checkCount: checks.length,
      availableCheckCount: checks.filter((c) => c.available).length,
      groups: [...new Set(checks.map((c) => c.group))],
      checks,
    });
  } catch (err) {
    console.error("getDataQcSummary", err);
    return res.sendStatus(500);
  }
}

async function getDataQcCheckDetail(req, res) {
  if (!assertMinistryAccess(req, res)) return;

  const checkId = String(req.params.checkId || "").trim();
  const meta = getCheckMeta(checkId);

  if (!meta) {
    return res.status(404).json({ message: "Unknown Data QC check." });
  }

  if (!meta.available) {
    return res.status(501).json({
      message: "This Data QC check is not live yet.",
      check: { ...meta, count: null, rows: [] },
    });
  }

  const detailHandler = DETAIL_HANDLERS[checkId];
  if (!detailHandler) {
    return res.status(501).json({
      message: "This Data QC check is not live yet.",
      check: { ...meta, count: null, rows: [] },
    });
  }

  const conn = await pool;

  try {
    const rows = await detailHandler(conn);
    return res.json({
      check: {
        ...meta,
        count: rows.length,
        rows,
      },
    });
  } catch (err) {
    console.error("getDataQcCheckDetail", err);
    return res.sendStatus(500);
  }
}

export default {
  getDataQcSummary,
  getDataQcCheckDetail,
  CHECK_CATALOG,
  TENDERING_STAGE_LABELS,
  IMPLEMENTATION_MILESTONE_LABELS,
};
