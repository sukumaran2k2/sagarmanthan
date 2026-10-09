import {
  ACTIVE_TENDER_PROJECTS_CTE,
  TENDER_STAGES_CTE,
} from "./shared.js";
import {
  buildMissingIssueParts,
  buildProjectStageState,
  formatStageDateList,
  groupTenderStageRows,
  sortProjectRows,
  withSerialAndProjectCode,
} from "./tenderingStageHelpers.js";

export async function queryTenderingMissingStageRows(conn) {
  const result = await conn.request().query(`
    WITH ${TENDER_STAGES_CTE},
    ${ACTIVE_TENDER_PROJECTS_CTE}
    SELECT
      atp.project_id,
      atp.sub_project_id,
      atp.project_id_text,
      atp.sub_project_id_text,
      atp.organisation_id,
      atp.organisation_name,
      atp.project_name,
      atp.stage_name,
      atp.on_nomination_basis,
      ts.sub_stage_id,
      ts.stage_label,
      pd.planned_date,
      pd.revised_date,
      pd.actual_date,
      pd.not_applicable_date
    FROM ActiveTenderProjects atp
    CROSS JOIN TenderStages ts
    LEFT JOIN tbl_project_date pd
      ON pd.project_id = atp.project_id
     AND pd.sub_project_id = atp.sub_project_id
     AND pd.sub_stage_id = ts.sub_stage_id
    ORDER BY
      atp.organisation_name,
      atp.project_id,
      atp.sub_project_id,
      ts.sub_stage_id;
  `);

  return result.recordset || [];
}

export function mapTenderingMissingRows(stageRows) {
  const groups = groupTenderStageRows(stageRows);
  const rows = [];

  for (const group of groups.values()) {
    const state = buildProjectStageState(
      { on_nomination_basis: group.onNominationBasis },
      group.stages
    );

    if (state.missingTargets.length === 0) continue;

    const milestones =
      state.currentStage?.label ||
      state.missingTargets[0]?.label ||
      "Not Available";

    rows.push({
      organisation: group.organisation,
      organisationId: group.organisationId,
      projectId: group.projectId,
      subProjectId: group.subProjectId,
      projectName: group.projectName,
      stage: group.stage,
      milestones,
      targetDate: formatStageDateList(state.targetsWithDates, "effectiveTarget"),
      actualDate: formatStageDateList(state.actualsBeforeCurrent, "actualDate"),
      ...buildMissingIssueParts(state),
      action:
        "Port/Organisation to enter missing target/actual dates for the stage(s) listed",
    });
  }

  return withSerialAndProjectCode(sortProjectRows(rows));
}

export async function getTenderingMissingCount(conn) {
  const stageRows = await queryTenderingMissingStageRows(conn);
  return mapTenderingMissingRows(stageRows).length;
}

export async function getTenderingMissingDetail(conn) {
  return mapTenderingMissingRows(await queryTenderingMissingStageRows(conn));
}
