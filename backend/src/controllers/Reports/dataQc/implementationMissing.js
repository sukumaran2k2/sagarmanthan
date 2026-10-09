import {
  ACTIVE_IMPLEMENTATION_PROJECTS_CTE,
  IMPLEMENTATION_MILESTONES_CTE,
} from "./shared.js";
import {
  LATEST_PHYSICAL_PROGRESS_JOIN,
  buildImplementationMissingIssueParts,
  buildProjectMilestoneState,
  formatMilestoneDateList,
  formatRelevantMilestone,
  groupImplementationMilestoneRows,
  sortProjectRows,
  withSerialAndProjectCode,
} from "./implementationStageHelpers.js";

export async function queryImplementationMissingMilestoneRows(conn) {
  const result = await conn.request().query(`
    WITH ${IMPLEMENTATION_MILESTONES_CTE},
    ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE}
    SELECT
      aip.project_id,
      aip.sub_project_id,
      aip.project_id_text,
      aip.sub_project_id_text,
      aip.organisation_id,
      aip.organisation_name,
      aip.project_name,
      aip.stage_name,
      im.milestone_id,
      im.milestone_label,
      pa.start_date,
      pa.end_date,
      latestProgress.physical_progress
    FROM ActiveImplementationProjects aip
    CROSS JOIN ImplementationMilestones im
    LEFT JOIN tbl_project_activity pa
      ON pa.project_id = aip.project_id
     AND pa.sub_project_id = aip.sub_project_id
     AND pa.milestone_id = im.milestone_id
    ${LATEST_PHYSICAL_PROGRESS_JOIN}
    ORDER BY
      aip.organisation_name,
      aip.project_id,
      aip.sub_project_id,
      im.milestone_id;
  `);

  return result.recordset || [];
}

export function mapImplementationMissingRows(stageRows) {
  const groups = groupImplementationMilestoneRows(stageRows);
  const rows = [];

  for (const group of groups.values()) {
    const state = buildProjectMilestoneState(
      { physicalProgress: group.physicalProgress },
      group.milestones
    );

    if (state.missingTargets.length === 0) continue;

    rows.push({
      organisation: group.organisation,
      organisationId: group.organisationId,
      projectId: group.projectId,
      subProjectId: group.subProjectId,
      projectName: group.projectName,
      stage: group.stage,
      milestones: formatRelevantMilestone(state),
      targetDate: formatMilestoneDateList(
        state.targetsWithDates,
        "effectiveTarget"
      ),
      actualDate: formatMilestoneDateList(
        state.actualsBeforeCurrent,
        "actualDate"
      ),
      ...buildImplementationMissingIssueParts(state),
      action:
        "Port/Organisation to enter missing target/actual dates for the milestone(s) listed",
    });
  }

  return withSerialAndProjectCode(sortProjectRows(rows));
}

export async function getImplementationMissingCount(conn) {
  const stageRows = await queryImplementationMissingMilestoneRows(conn);
  return mapImplementationMissingRows(stageRows).length;
}

export async function getImplementationMissingDetail(conn) {
  return mapImplementationMissingRows(
    await queryImplementationMissingMilestoneRows(conn)
  );
}
