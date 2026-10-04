import {
  ACTIVE_TENDER_PROJECTS_CTE,
  APPLICABLE_TENDER_STAGE_FILTER,
  TENDER_STAGES_CTE,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

export async function queryTenderingMissingRows(conn) {
  const result = await conn.request().query(`
    WITH ${TENDER_STAGES_CTE},
    ${ACTIVE_TENDER_PROJECTS_CTE},
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
        ${APPLICABLE_TENDER_STAGE_FILTER}
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

export function mapTenderingMissingRows(recordset) {
  return recordset.map((row, index) => {
    const missingCount = Number(row.missing_count) || 0;
    const milestones = String(row.missing_stages || "").trim();
    const { projectId, subProjectId } = resolveProjectIds(row);
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

export async function getTenderingMissingCount(conn) {
  const result = await conn.request().query(`
    WITH ${TENDER_STAGES_CTE},
    ${ACTIVE_TENDER_PROJECTS_CTE},
    Flagged AS (
      SELECT DISTINCT atp.project_id, atp.sub_project_id
      FROM ActiveTenderProjects atp
      CROSS JOIN TenderStages ts
      LEFT JOIN tbl_project_date pd
        ON pd.project_id = atp.project_id
       AND pd.sub_project_id = atp.sub_project_id
       AND pd.sub_stage_id = ts.sub_stage_id
      WHERE
        ${APPLICABLE_TENDER_STAGE_FILTER}
        AND COALESCE(pd.revised_date, pd.planned_date) IS NULL
    )
    SELECT COUNT(*) AS issue_count FROM Flagged;
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getTenderingMissingDetail(conn) {
  return mapTenderingMissingRows(await queryTenderingMissingRows(conn));
}
