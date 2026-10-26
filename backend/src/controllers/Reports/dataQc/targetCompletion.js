import {
  ACTIVE_NON_COMPLETED_PROJECTS_CTE,
  formatDisplayDate,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

const TARGET_COMPLETION_ISSUE_FILTER = `
  anc.actual_date_of_completion IS NULL
  AND (
    anc.target_completion_date IS NULL
    OR (
      CAST(anc.target_completion_date AS date) < CAST(GETDATE() AS date)
      AND (
        anc.latest_revised_target_completion_date IS NULL
        OR CAST(anc.latest_revised_target_completion_date AS date) < CAST(GETDATE() AS date)
      )
    )
  )
`;

function buildTargetCompletionIssueAndAction(row) {
  const targetText = formatDisplayDate(row.target_completion_date);
  const revisedText = formatDisplayDate(row.latest_revised_target_completion_date);
  const hasTarget = targetText !== "Not Available";
  const hasRevised = revisedText !== "Not Available";

  if (!hasTarget) {
    return {
      targetDate: "Not Available",
      revisedDate: hasRevised ? revisedText : "Not Available",
      issue:
        "A. Target Completion Date missing; actual completion date missing",
      action: "Port/Organisation to enter target completion date",
    };
  }

  if (hasRevised) {
    return {
      targetDate: targetText,
      revisedDate: revisedText,
      issue: `B. Original Target Completion Date (${targetText}) expired; Revised Target Completion Date (${revisedText}) has also expired; actual completion date missing`,
      action:
        "Urgent: Port/Organisation to provide a fresh revised target completion date with reasons for delay, or update actual completion date",
    };
  }

  return {
    targetDate: targetText,
    revisedDate: "Not Available",
    issue: `B. Expired Target Completion Date (${targetText}); no revised target completion date provided; actual completion date missing`,
    action:
      "Port/Organisation to provide a revised target completion date with reasons for delay, or update actual completion date",
  };
}

export async function queryTargetCompletionRows(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_NON_COMPLETED_PROJECTS_CTE}
    SELECT
      anc.project_id,
      anc.sub_project_id,
      anc.project_id_text,
      anc.sub_project_id_text,
      anc.organisation_id,
      anc.organisation_name,
      anc.project_name,
      anc.stage_name,
      anc.target_completion_date,
      anc.latest_revised_target_completion_date,
      anc.actual_date_of_completion
    FROM ActiveNonCompletedProjects anc
    WHERE
      ${TARGET_COMPLETION_ISSUE_FILTER}
    ORDER BY
      anc.organisation_name,
      anc.project_id,
      anc.sub_project_id;
  `);

  return result.recordset || [];
}

export function mapTargetCompletionRows(recordset) {
  return recordset.map((row, index) => {
    const { projectId, subProjectId } = resolveProjectIds(row);
    const { targetDate, revisedDate, issue, action } =
      buildTargetCompletionIssueAndAction(row);

    return {
      slNo: index + 1,
      organisation: row.organisation_name || "",
      organisationId: row.organisation_id ?? null,
      projectId,
      subProjectId,
      projectCode: formatProjectCode(projectId, subProjectId),
      projectName: row.project_name || "",
      stage: row.stage_name || "",
      milestones: "Overall Project Target Completion Date",
      targetDate,
      revisedDate,
      issue,
      action,
    };
  });
}

export async function getTargetCompletionCount(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_NON_COMPLETED_PROJECTS_CTE}
    SELECT COUNT(*) AS issue_count
    FROM ActiveNonCompletedProjects anc
    WHERE
      ${TARGET_COMPLETION_ISSUE_FILTER};
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getTargetCompletionDetail(conn) {
  return mapTargetCompletionRows(await queryTargetCompletionRows(conn));
}
