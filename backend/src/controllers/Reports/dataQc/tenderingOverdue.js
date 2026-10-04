import {
  ACTIVE_TENDER_PROJECTS_CTE,
  APPLICABLE_TENDER_STAGE_FILTER,
  TENDER_STAGES_CTE,
  formatDisplayDate,
  formatProjectCode,
  projectGroupKey,
  resolveProjectIds,
} from "./shared.js";

export async function queryTenderingOverdueStageRows(conn) {
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
      ts.sub_stage_id,
      ts.stage_label,
      COALESCE(pd.revised_date, pd.planned_date) AS effective_target_date,
      DATEDIFF(
        day,
        CAST(COALESCE(pd.revised_date, pd.planned_date) AS date),
        CAST(GETDATE() AS date)
      ) AS overdue_days
    FROM ActiveTenderProjects atp
    CROSS JOIN TenderStages ts
    INNER JOIN tbl_project_date pd
      ON pd.project_id = atp.project_id
     AND pd.sub_project_id = atp.sub_project_id
     AND pd.sub_stage_id = ts.sub_stage_id
    WHERE
      ${APPLICABLE_TENDER_STAGE_FILTER}
      AND pd.actual_date IS NULL
      AND COALESCE(pd.revised_date, pd.planned_date) IS NOT NULL
      AND CAST(COALESCE(pd.revised_date, pd.planned_date) AS date) < CAST(GETDATE() AS date)
    ORDER BY
      atp.organisation_name,
      atp.project_id,
      atp.sub_project_id,
      ts.sub_stage_id;
  `);

  return result.recordset || [];
}

export function mapTenderingOverdueRows(stageRows) {
  const groups = new Map();

  for (const row of stageRows) {
    const key = projectGroupKey(row);
    if (!groups.has(key)) {
      const { projectId, subProjectId } = resolveProjectIds(row);
      groups.set(key, {
        organisation: row.organisation_name || "",
        organisationId: row.organisation_id ?? null,
        projectId,
        subProjectId,
        projectName: row.project_name || "",
        stage: row.stage_name || "Under Tendering",
        stages: [],
      });
    }

    const overdueDays = Math.max(0, Number(row.overdue_days) || 0);
    groups.get(key).stages.push({
      subStageId: Number(row.sub_stage_id),
      label: row.stage_label,
      targetDate: formatDisplayDate(row.effective_target_date),
      overdueDays,
    });
  }

  return [...groups.values()].map((group, index) => {
    const stages = group.stages.sort((a, b) => a.subStageId - b.subStageId);
    const count = stages.length;
    const milestones = stages.map((s) => s.label).join("; ");
    const targetDate = stages
      .map((s) => `${s.label}: ${s.targetDate}`)
      .join("; ");
    const issueDetails = stages
      .map(
        (s) =>
          `${s.label} (target ${s.targetDate}, overdue ${s.overdueDays} day${
            s.overdueDays === 1 ? "" : "s"
          })`
      )
      .join("; ");

    return {
      slNo: index + 1,
      organisation: group.organisation,
      organisationId: group.organisationId,
      projectId: group.projectId,
      subProjectId: group.subProjectId,
      projectCode: formatProjectCode(group.projectId, group.subProjectId),
      projectName: group.projectName,
      stage: group.stage,
      milestones,
      targetDate,
      actualDate: "Not Available",
      issue: `Target date expired for ${count} stage(s) with no actual completion recorded - ${issueDetails}`,
      action:
        "Port/Organisation to update actual completion date, or provide a revised target date with reasons for delay",
    };
  });
}

export async function getTenderingOverdueCount(conn) {
  const result = await conn.request().query(`
    WITH ${TENDER_STAGES_CTE},
    ${ACTIVE_TENDER_PROJECTS_CTE},
    Flagged AS (
      SELECT DISTINCT atp.project_id, atp.sub_project_id
      FROM ActiveTenderProjects atp
      CROSS JOIN TenderStages ts
      INNER JOIN tbl_project_date pd
        ON pd.project_id = atp.project_id
       AND pd.sub_project_id = atp.sub_project_id
       AND pd.sub_stage_id = ts.sub_stage_id
      WHERE
        ${APPLICABLE_TENDER_STAGE_FILTER}
        AND pd.actual_date IS NULL
        AND COALESCE(pd.revised_date, pd.planned_date) IS NOT NULL
        AND CAST(COALESCE(pd.revised_date, pd.planned_date) AS date) < CAST(GETDATE() AS date)
    )
    SELECT COUNT(*) AS issue_count FROM Flagged;
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getTenderingOverdueDetail(conn) {
  return mapTenderingOverdueRows(await queryTenderingOverdueStageRows(conn));
}
