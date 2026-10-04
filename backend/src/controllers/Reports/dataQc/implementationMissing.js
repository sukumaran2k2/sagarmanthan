import {
  ACTIVE_IMPLEMENTATION_PROJECTS_CTE,
  IMPLEMENTATION_MILESTONES_CTE,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

export async function queryImplementationMissingRows(conn) {
  const result = await conn.request().query(`
    WITH ${IMPLEMENTATION_MILESTONES_CTE},
    ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE},
    MissingMilestones AS (
      SELECT
        aip.project_id,
        aip.sub_project_id,
        aip.project_id_text,
        aip.sub_project_id_text,
        aip.project_name,
        aip.organisation_id,
        aip.organisation_name,
        aip.stage_name,
        im.milestone_id,
        im.milestone_label
      FROM ActiveImplementationProjects aip
      CROSS JOIN ImplementationMilestones im
      LEFT JOIN tbl_project_activity pa
        ON pa.project_id = aip.project_id
       AND pa.sub_project_id = aip.sub_project_id
       AND pa.milestone_id = im.milestone_id
      WHERE pa.start_date IS NULL
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
      STRING_AGG(milestone_label, N'; ')
        WITHIN GROUP (ORDER BY milestone_id) AS missing_milestones,
      STRING_AGG(milestone_label, N', ')
        WITHIN GROUP (ORDER BY milestone_id) AS missing_milestones_issue
    FROM MissingMilestones
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

export function mapImplementationMissingRows(recordset) {
  return recordset.map((row, index) => {
    const missingCount = Number(row.missing_count) || 0;
    const milestones = String(row.missing_milestones || "").trim();
    const milestonesIssue = String(
      row.missing_milestones_issue || row.missing_milestones || ""
    ).trim();
    const { projectId, subProjectId } = resolveProjectIds(row);

    return {
      slNo: index + 1,
      organisation: row.organisation_name || "",
      organisationId: row.organisation_id ?? null,
      projectId,
      subProjectId,
      projectCode: formatProjectCode(projectId, subProjectId),
      projectName: row.project_name || "",
      stage: row.stage_name || "Under Implementation",
      milestones,
      issue: `Target end date not entered for ${missingCount} milestone(s): ${milestonesIssue}`,
      action:
        "Port/Organisation to enter target end date for the milestone(s) listed",
    };
  });
}

export async function getImplementationMissingCount(conn) {
  const result = await conn.request().query(`
    WITH ${IMPLEMENTATION_MILESTONES_CTE},
    ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE},
    Flagged AS (
      SELECT DISTINCT aip.project_id, aip.sub_project_id
      FROM ActiveImplementationProjects aip
      CROSS JOIN ImplementationMilestones im
      LEFT JOIN tbl_project_activity pa
        ON pa.project_id = aip.project_id
       AND pa.sub_project_id = aip.sub_project_id
       AND pa.milestone_id = im.milestone_id
      WHERE pa.start_date IS NULL
    )
    SELECT COUNT(*) AS issue_count FROM Flagged;
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getImplementationMissingDetail(conn) {
  return mapImplementationMissingRows(await queryImplementationMissingRows(conn));
}
