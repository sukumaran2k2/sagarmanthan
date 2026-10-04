import { getDataScope } from "../../../middleware/dataScope.js";

export const TENDERING_STAGE_LABELS = {
  3: "Tech Sanction Obtained",
  4: "Tender Document Approved",
  5: "Tender Notice Issued",
  6: "Technical Evaluation Completed",
  7: "Financial Evaluation Completed",
  8: "Sanction of Competent Authority for Award",
  9: "Work Awarded / LOA Issued",
  10: "Contract Agreement Signed",
};

export const IMPLEMENTATION_MILESTONE_LABELS = {
  0: "Milestone 0",
  1: "Milestone 1",
  2: "Milestone 2",
  3: "Milestone 3",
  4: "Milestone 4",
  5: "Milestone 5",
};

export const TENDER_STAGES_CTE = `
  TenderStages AS (
    SELECT 3 AS sub_stage_id, N'Tech Sanction Obtained' AS stage_label UNION ALL
    SELECT 4, N'Tender Document Approved' UNION ALL
    SELECT 5, N'Tender Notice Issued' UNION ALL
    SELECT 6, N'Technical Evaluation Completed' UNION ALL
    SELECT 7, N'Financial Evaluation Completed' UNION ALL
    SELECT 8, N'Sanction of Competent Authority for Award' UNION ALL
    SELECT 9, N'Work Awarded / LOA Issued' UNION ALL
    SELECT 10, N'Contract Agreement Signed'
  )
`;

export const IMPLEMENTATION_MILESTONES_CTE = `
  ImplementationMilestones AS (
    SELECT 0 AS milestone_id, N'Milestone 0' AS milestone_label UNION ALL
    SELECT 1, N'Milestone 1' UNION ALL
    SELECT 2, N'Milestone 2' UNION ALL
    SELECT 3, N'Milestone 3' UNION ALL
    SELECT 4, N'Milestone 4' UNION ALL
    SELECT 5, N'Milestone 5'
  )
`;

export const CHECK_CATALOG = [
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
    available: true,
  },
  {
    id: "tendering-foundation",
    group: "Tendering",
    shortLabel: "3. Tendering-Foundation",
    title: "3. Projects under Tendering - Foundation Not Laid & Foundation-Laying Date Missing",
    severity: "attention",
    description: "Foundation not laid and/or foundation-laying date missing.",
    available: true,
  },
  {
    id: "implementation-missing",
    group: "Implementation",
    shortLabel: "4. Implementation-Missing",
    title: "4. Projects under Implementation - Missing Stage/Milestone Target Dates",
    severity: "warning",
    description: "Milestone target end dates not entered for projects under implementation.",
    available: true,
  },
  {
    id: "implementation-overdue",
    group: "Implementation",
    shortLabel: "5. Implementation-Overdue",
    title: "5. Projects under Implementation - Overdue Stage/Milestone Target Dates",
    severity: "critical",
    description: "Milestone targets expired with no actual end date recorded.",
    available: true,
  },
  {
    id: "implementation-inauguration",
    group: "Implementation",
    shortLabel: "6. Implementation-Inauguration",
    title: "6. Projects under Implementation - Not Yet Inaugurated & Inauguration Date Missing",
    severity: "attention",
    description: "Project not yet inaugurated and/or inauguration date needs confirmation.",
    available: true,
  },
  {
    id: "target-completion",
    group: "Overall Project",
    shortLabel: "7. Target Completion Date",
    title: "7. Projects - Missing or Expired Target Completion Date (all active, non-completed projects)",
    severity: "critical",
    description: "Overall target completion missing, expired, or revised date also expired.",
    available: true,
  },
  {
    id: "project-category-blank",
    group: "Master Data",
    shortLabel: "8A. Projects - Project Category Not Filled",
    title: "8A. Projects - Project Category Not Filled",
    severity: "attention",
    description: "Project Category field not filled.",
    available: true,
  },
  {
    id: "project-category-mismatch",
    group: "Master Data",
    shortLabel:
      "8B. Projects - Project Category Possibly Mismatched with Project Name/Scope",
    title:
      "8B. Projects - Project Category Possibly Mismatched with Project Name/Scope",
    severity: "attention",
    description: "Assigned category may not match project name or scope.",
    available: true,
  },
];

export const PROJECT_DROP_REQUEST_APPLY = `
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

export const ACTIVE_PROJECT_FILTER = `
  ISNULL(sp.sub_status, p.status) != 0
  AND (dropReq.drop_status IS NULL OR dropReq.drop_status = 'Rejected')
  AND ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) != 99
`;

export const ACTIVE_TENDER_PROJECTS_CTE = `
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
      ISNULL(sp.sub_on_nomination_basis, p.on_nomination_basis) AS on_nomination_basis,
      ISNULL(sp.sub_foundation_laid, p.foundation_laid) AS foundation_laid,
      ISNULL(sp.sub_foundation_laid_date, p.foundation_laid_date) AS foundation_laid_date,
      ISNULL(sp.sub_foundation_tentative_date, p.foundation_tentative_date) AS foundation_tentative_date
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
  )
`;

export const ACTIVE_IMPLEMENTATION_PROJECTS_CTE = `
  ActiveImplementationProjects AS (
    SELECT
      p.project_id,
      ISNULL(sp.sub_project_id, -1) AS sub_project_id,
      CAST(p.project_id AS varchar(50)) AS project_id_text,
      CAST(ISNULL(sp.sub_project_id, -1) AS varchar(50)) AS sub_project_id_text,
      ISNULL(NULLIF(LTRIM(RTRIM(sp.sub_project_name)), ''), p.project_name) AS project_name,
      org.organisation_id,
      org.organisation_name,
      ISNULL(stage.stage_name, N'Under Implementation') AS stage_name,
      ISNULL(sp.sub_inauguration_value, p.inauguration_value) AS inauguration_value,
      ISNULL(sp.sub_inauguration_date, p.inauguration_date) AS inauguration_date,
      ISNULL(sp.sub_tentative_inauguration_date, p.tentative_inauguration_date) AS tentative_inauguration_date
    FROM tbl_project p
    LEFT JOIN tbl_sub_project sp ON sp.project_id = p.project_id
    LEFT JOIN mmt_organisation org
      ON org.organisation_id = ISNULL(sp.sub_organisation_id, p.organisation_id)
    LEFT JOIN tbl_project_stage stage
      ON stage.stage_id = ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id)
    ${PROJECT_DROP_REQUEST_APPLY}
    WHERE ${ACTIVE_PROJECT_FILTER}
      AND (
        ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) = 13
        OR ISNULL(stage.stage_name, '') LIKE '%Implement%'
      )
  )
`;

export const ACTIVE_NON_COMPLETED_PROJECTS_CTE = `
  ActiveNonCompletedProjects AS (
    SELECT
      p.project_id,
      ISNULL(sp.sub_project_id, -1) AS sub_project_id,
      CAST(p.project_id AS varchar(50)) AS project_id_text,
      CAST(ISNULL(sp.sub_project_id, -1) AS varchar(50)) AS sub_project_id_text,
      ISNULL(NULLIF(LTRIM(RTRIM(sp.sub_project_name)), ''), p.project_name) AS project_name,
      org.organisation_id,
      org.organisation_name,
      ISNULL(stage.stage_name, N'') AS stage_name,
      ISNULL(sp.sub_target_completion_date, p.target_completion_date) AS target_completion_date,
      ISNULL(sp.sub_actual_date_of_completion, p.actual_date_of_completion) AS actual_date_of_completion,
      ISNULL(sp.sub_project_category_id, p.project_category_id) AS project_category_id,
      (
        SELECT STRING_AGG(pc.project_category_name, N', ')
        FROM STRING_SPLIT(
          CONVERT(varchar(max), CONVERT(nvarchar(max), ISNULL(sp.sub_project_category_id, p.project_category_id))),
          ','
        ) x
        JOIN mmt_project_category pc ON TRY_CAST(LTRIM(RTRIM(x.value)) AS int) = pc.project_category_id
      ) AS project_category_names,
      rev.latest_revised_target_completion_date
    FROM tbl_project p
    LEFT JOIN tbl_sub_project sp ON sp.project_id = p.project_id
    LEFT JOIN mmt_organisation org
      ON org.organisation_id = ISNULL(sp.sub_organisation_id, p.organisation_id)
    LEFT JOIN tbl_project_stage stage
      ON stage.stage_id = ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id)
    ${PROJECT_DROP_REQUEST_APPLY}
    OUTER APPLY (
      SELECT TOP 1 h.revised_target_completion_date AS latest_revised_target_completion_date
      FROM tbl_project_target_date_history h
      WHERE h.project_id = p.project_id
        AND (
          (sp.sub_project_id IS NULL AND (
            h.sub_project_id IS NULL
            OR TRIM(CAST(h.sub_project_id AS varchar(50))) IN ('-1', '-', '0', '', 'null', 'undefined')
          ))
          OR (sp.sub_project_id IS NOT NULL AND CAST(h.sub_project_id AS varchar(50)) = CAST(sp.sub_project_id AS varchar(50)))
        )
      ORDER BY h.revised_on DESC
    ) AS rev
    WHERE ${ACTIVE_PROJECT_FILTER}
      AND ISNULL(sp.sub_current_project_stage_id, p.current_project_stage_id) != 14
      AND ISNULL(stage.stage_name, '') NOT LIKE '%Complet%'
  )
`;

export const FOUNDATION_NOT_LAID_FILTER = `
  ISNULL(TRY_CAST(atp.foundation_laid AS int), 0) <> 1
`;

export const INAUGURATION_NOT_DONE_FILTER = `
  ISNULL(TRY_CAST(aip.inauguration_value AS int), 0) <> 1
`;

// Skip nomination stages 3-8 and N/A stages.
export const APPLICABLE_TENDER_STAGE_FILTER = `
  NOT (
    ISNULL(atp.on_nomination_basis, 0) = 1
    AND ts.sub_stage_id BETWEEN 3 AND 8
  )
  AND pd.not_applicable_date IS NULL
`;

export function hasRealSubProject(subProjectId) {
  if (subProjectId == null) return false;
  const text = String(subProjectId).trim();
  return (
    text !== "" &&
    text !== "-1" &&
    text !== "-" &&
    text !== "0" &&
    text.toLowerCase() !== "null"
  );
}

export function formatProjectCode(projectId, subProjectId) {
  const pid = projectId == null ? "" : String(projectId).trim();
  if (!pid || pid.toLowerCase() === "null" || pid.toLowerCase() === "undefined") {
    return "—";
  }
  if (!hasRealSubProject(subProjectId)) return pid;
  return `${pid} / ${String(subProjectId).trim()}`;
}

export function formatDisplayDate(value) {
  if (!value) return "Not Available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const [y, m, d] = text.slice(0, 10).split("-");
      return `${d}-${m}-${y}`;
    }
    return text || "Not Available";
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function resolveProjectIds(row) {
  return {
    projectId: row.project_id_text ?? row.project_id ?? row.projectId ?? null,
    subProjectId:
      row.sub_project_id_text ?? row.sub_project_id ?? row.subProjectId ?? -1,
  };
}

export function projectGroupKey(row) {
  const { projectId, subProjectId } = resolveProjectIds(row);
  return `${projectId}::${subProjectId}`;
}

export function assertMinistryAccess(req, res) {
  const dataScope = getDataScope(req.user || {});
  if (dataScope.isOrganisation) {
    res.status(403).json({
      message: "Data QC reports are available to Ministry users only.",
    });
    return null;
  }
  return dataScope;
}

export function buildSeverityTotals(checks) {
  return checks.reduce(
    (acc, check) => {
      if (typeof check.count !== "number") return acc;
      acc[check.severity] = (acc[check.severity] || 0) + check.count;
      return acc;
    },
    { critical: 0, warning: 0, attention: 0 }
  );
}

export function getCheckMeta(checkId) {
  return CHECK_CATALOG.find((c) => c.id === checkId) || null;
}
