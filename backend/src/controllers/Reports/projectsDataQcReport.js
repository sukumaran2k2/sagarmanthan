import { pool } from "../../db.js";
import { getDataScope } from "../../middleware/dataScope.js";

const TENDERING_STAGE_LABELS = {
  3: "Tech Sanction Obtained",
  4: "Tender Document Approved",
  5: "Tender Notice Issued",
  6: "Technical Evaluation Completed",
  7: "Financial Evaluation Completed",
  8: "Sanction of Competent Authority for Award",
  9: "Work Awarded / LOA Issued",
  10: "Contract Agreement Signed",
};

const CHECK_CATALOG = [
  {
    id: "tendering-missing",
    group: "Tendering",
    shortLabel: "1. Tendering-Missing Dates",
    title: "1. Projects under Tendering - Missing Stage Target Dates",
    severity: "warning",
    description: "Target dates not entered for one or more tendering stages.",
    available: true,
  },
  {
    id: "tendering-overdue",
    group: "Tendering",
    shortLabel: "2. Tendering-Overdue Dates",
    title: "2. Projects under Tendering - Overdue Stage Target Dates",
    severity: "critical",
    description: "Stage target dates have expired with no actual completion recorded.",
    available: false,
  },
  {
    id: "tendering-foundation",
    group: "Tendering",
    shortLabel: "3. Tendering-Foundation",
    title: "3. Projects under Tendering - Foundation Not Laid & Foundation-Laying Date Missing",
    severity: "attention",
    description: "Foundation not laid and/or foundation-laying date missing.",
    available: false,
  },
  {
    id: "implementation-missing",
    group: "Implementation",
    shortLabel: "4. Implementation-Missing",
    title: "4. Projects under Implementation - Missing Stage/Milestone Target Dates",
    severity: "warning",
    description: "Milestone target end dates not entered for projects under implementation.",
    available: false,
  },
  {
    id: "implementation-overdue",
    group: "Implementation",
    shortLabel: "5. Implementation-Overdue",
    title: "5. Projects under Implementation - Overdue Stage/Milestone Target Dates",
    severity: "critical",
    description: "Milestone targets expired with no actual end date recorded.",
    available: false,
  },
  {
    id: "implementation-inauguration",
    group: "Implementation",
    shortLabel: "6. Implementation-Inauguration",
    title: "6. Projects under Implementation - Not Yet Inaugurated & Inauguration Date Missing",
    severity: "attention",
    description: "Project not yet inaugurated and/or inauguration date needs confirmation.",
    available: false,
  },
  {
    id: "target-completion",
    group: "Overall Project",
    shortLabel: "7. Target Completion Date",
    title: "7. Projects - Missing or Expired Target Completion Date (all active, non-completed projects)",
    severity: "critical",
    description: "Overall target completion missing, expired, or revised date also expired.",
    available: false,
  },
  {
    id: "project-category",
    group: "Master Data",
    shortLabel: "8. Project Category",
    title: "8. Projects - Project Category Not Filled / Possibly Mismatched",
    severity: "attention",
    description: "Master data: category blank or possibly mismatched with project scope.",
    available: false,
  },
];

const PROJECT_DROP_REQUEST_APPLY = `
  OUTER APPLY (
    SELECT TOP 1
      CASE
        WHEN dr.reject_request_status = 0 THEN 'Rejected'
        WHEN dr.status = 0 THEN 'Approved'
        WHEN dr.status = 1 THEN 'Waiting for Approval'
        ELSE NULL
      END AS drop_status
    FROM tbl_project_drop_request dr
    WHERE dr.project_id = p.project_id
      AND (
        (sp.sub_project_id IS NOT NULL AND (
          CAST(dr.sub_project_id AS varchar(50)) = CAST(sp.sub_project_id AS varchar(50))
          OR dr.sub_project_id IS NULL
          OR TRIM(CAST(dr.sub_project_id AS varchar(50))) IN ('-1', '-', '0', '', 'null', 'undefined')
        ))
        OR (sp.sub_project_id IS NULL AND (
          dr.sub_project_id IS NULL
          OR TRIM(CAST(dr.sub_project_id AS varchar(50))) IN ('-1', '-', '0', '', 'null', 'undefined')
        ))
      )
    ORDER BY COALESCE(dr.submitted_on, dr.drop_date) DESC
  ) AS dropReq
`;

const ACTIVE_PROJECT_FILTER = `
  ISNULL(sp.sub_status, p.status) != 0
  AND (dropReq.drop_status IS NULL OR dropReq.drop_status = 'Rejected')
  AND ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) != 99
`;

function hasRealSubProject(subProjectId) {
  if (subProjectId == null) return false;
  const text = String(subProjectId).trim();
  return text !== "" && text !== "-1" && text !== "-" && text !== "0" && text.toLowerCase() !== "null";
}

function formatProjectCode(projectId, subProjectId) {
  const pid = projectId == null ? "" : String(projectId).trim();
  if (!pid || pid.toLowerCase() === "null" || pid.toLowerCase() === "undefined") {
    return "—";
  }
  if (!hasRealSubProject(subProjectId)) return pid;
  return `${pid} / ${String(subProjectId).trim()}`;
}

function assertMinistryAccess(req, res) {
  const dataScope = getDataScope(req.user || {});
  if (dataScope.isOrganisation) {
    res.status(403).json({
      message: "Data QC reports are available to Ministry users only.",
    });
    return null;
  }
  return dataScope;
}

function buildSeverityTotals(checks) {
  return checks.reduce(
    (acc, check) => {
      if (typeof check.count !== "number") return acc;
      acc[check.severity] = (acc[check.severity] || 0) + check.count;
      return acc;
    },
    { critical: 0, warning: 0, attention: 0 }
  );
}

// Missing target = no revised/planned; skips N/A and nomination stages 3–8.
async function queryTenderingMissingRows(conn) {
  const result = await conn.request().query(`
    WITH TenderStages AS (
      SELECT 3 AS sub_stage_id, N'Tech Sanction Obtained' AS stage_label UNION ALL
      SELECT 4, N'Tender Document Approved' UNION ALL
      SELECT 5, N'Tender Notice Issued' UNION ALL
      SELECT 6, N'Technical Evaluation Completed' UNION ALL
      SELECT 7, N'Financial Evaluation Completed' UNION ALL
      SELECT 8, N'Sanction of Competent Authority for Award' UNION ALL
      SELECT 9, N'Work Awarded / LOA Issued' UNION ALL
      SELECT 10, N'Contract Agreement Signed'
    ),
    ActiveTenderProjects AS (
      SELECT
        p.project_id,
        ISNULL(sp.sub_project_id, -1) AS sub_project_id,
        CAST(p.project_id AS varchar(50)) AS project_id_text,
        CAST(ISNULL(sp.sub_project_id, -1) AS varchar(50)) AS sub_project_id_text,
        ISNULL(NULLIF(LTRIM(RTRIM(sp.sub_project_name)), ''), p.project_name) AS project_name,
        org.organisation_id,
        org.organisation_name,
        ISNULL(stage.stage_name, N'Under Tendering') AS stage_name,
        ISNULL(sp.sub_on_nomination_basis, p.on_nomination_basis) AS on_nomination_basis
      FROM tbl_project p
      LEFT JOIN tbl_sub_project sp ON sp.project_id = p.project_id
      LEFT JOIN mmt_organisation org
        ON org.organisation_id = ISNULL(sp.sub_organisation_id, p.organisation_id)
      LEFT JOIN tbl_project_stage stage
        ON stage.stage_id = ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id)
      ${PROJECT_DROP_REQUEST_APPLY}
      WHERE ${ACTIVE_PROJECT_FILTER}
        AND (
          ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) = 12
          OR ISNULL(stage.stage_name, '') LIKE '%Tender%'
        )
    ),
    MissingStages AS (
      SELECT
        atp.project_id,
        atp.sub_project_id,
        atp.project_id_text,
        atp.sub_project_id_text,
        atp.project_name,
        atp.organisation_id,
        atp.organisation_name,
        atp.stage_name,
        ts.sub_stage_id,
        ts.stage_label
      FROM ActiveTenderProjects atp
      CROSS JOIN TenderStages ts
      LEFT JOIN tbl_project_date pd
        ON pd.project_id = atp.project_id
       AND pd.sub_project_id = atp.sub_project_id
       AND pd.sub_stage_id = ts.sub_stage_id
      WHERE
        NOT (
          ISNULL(atp.on_nomination_basis, 0) = 1
          AND ts.sub_stage_id BETWEEN 3 AND 8
        )
        AND pd.not_applicable_date IS NULL
        AND COALESCE(pd.revised_date, pd.planned_date) IS NULL
    )
    SELECT
      project_id,
      sub_project_id,
      project_id_text,
      sub_project_id_text,
      organisation_id,
      organisation_name,
      project_name,
      stage_name,
      COUNT(*) AS missing_count,
      STRING_AGG(stage_label, N'; ')
        WITHIN GROUP (ORDER BY sub_stage_id) AS missing_stages
    FROM MissingStages
    GROUP BY
      project_id,
      sub_project_id,
      project_id_text,
      sub_project_id_text,
      organisation_id,
      organisation_name,
      project_name,
      stage_name
    ORDER BY organisation_name, project_id, sub_project_id;
  `);

  return result.recordset || [];
}

function mapTenderingMissingRows(recordset) {
  return recordset.map((row, index) => {
    const missingCount = Number(row.missing_count) || 0;
    const milestones = String(row.missing_stages || "").trim();
    const projectId =
      row.project_id_text ?? row.project_id ?? row.projectId ?? null;
    const subProjectId =
      row.sub_project_id_text ?? row.sub_project_id ?? row.subProjectId ?? -1;
    return {
      slNo: index + 1,
      organisation: row.organisation_name || "",
      organisationId: row.organisation_id ?? null,
      projectId,
      subProjectId,
      projectCode: formatProjectCode(projectId, subProjectId),
      projectName: row.project_name || "",
      stage: row.stage_name || "Under Tendering",
      milestones,
      targetDate: "Not Available",
      actualDate: "Not Available",
      issue: `Target date not entered for ${missingCount} stage(s): ${milestones}`,
      action: "Port/Organisation to enter planned target date for the stage(s) listed",
    };
  });
}

async function getTenderingMissingCount(conn) {
  const result = await conn.request().query(`
    WITH TenderStages AS (
      SELECT 3 AS sub_stage_id UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
      UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    ),
    ActiveTenderProjects AS (
      SELECT
        p.project_id,
        ISNULL(sp.sub_project_id, -1) AS sub_project_id,
        ISNULL(sp.sub_on_nomination_basis, p.on_nomination_basis) AS on_nomination_basis
      FROM tbl_project p
      LEFT JOIN tbl_sub_project sp ON sp.project_id = p.project_id
      LEFT JOIN tbl_project_stage stage
        ON stage.stage_id = ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id)
      ${PROJECT_DROP_REQUEST_APPLY}
      WHERE ${ACTIVE_PROJECT_FILTER}
        AND (
          ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) = 12
          OR ISNULL(stage.stage_name, '') LIKE '%Tender%'
        )
    ),
    Flagged AS (
      SELECT DISTINCT atp.project_id, atp.sub_project_id
      FROM ActiveTenderProjects atp
      CROSS JOIN TenderStages ts
      LEFT JOIN tbl_project_date pd
        ON pd.project_id = atp.project_id
       AND pd.sub_project_id = atp.sub_project_id
       AND pd.sub_stage_id = ts.sub_stage_id
      WHERE
        NOT (
          ISNULL(atp.on_nomination_basis, 0) = 1
          AND ts.sub_stage_id BETWEEN 3 AND 8
        )
        AND pd.not_applicable_date IS NULL
        AND COALESCE(pd.revised_date, pd.planned_date) IS NULL
    )
    SELECT COUNT(*) AS issue_count FROM Flagged;
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

async function getDataQcSummary(req, res) {
  if (!assertMinistryAccess(req, res)) return;

  const conn = await pool;

  try {
    const liveCounts = {
      "tendering-missing": await getTenderingMissingCount(conn),
    };

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
  const meta = CHECK_CATALOG.find((c) => c.id === checkId);

  if (!meta) {
    return res.status(404).json({ message: "Unknown Data QC check." });
  }

  if (!meta.available) {
    return res.status(501).json({
      message: "This Data QC check is not live yet.",
      check: { ...meta, count: null, rows: [] },
    });
  }

  const conn = await pool;

  try {
    if (checkId === "tendering-missing") {
      const recordset = await queryTenderingMissingRows(conn);
      const rows = mapTenderingMissingRows(recordset);
      return res.json({
        check: {
          ...meta,
          count: rows.length,
          rows,
        },
      });
    }

    return res.status(501).json({
      message: "This Data QC check is not live yet.",
      check: { ...meta, count: null, rows: [] },
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
};
