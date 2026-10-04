import {
  ACTIVE_IMPLEMENTATION_PROJECTS_CTE,
  IMPLEMENTATION_MILESTONES_CTE,
  formatDisplayDate,
  formatProjectCode,
  projectGroupKey,
  resolveProjectIds,
} from "./shared.js";

export async function queryImplementationOverdueMilestoneRows(conn) {
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
      pa.start_date AS effective_target_date,
      DATEDIFF(
        day,
        CAST(pa.start_date AS date),
        CAST(GETDATE() AS date)
      ) AS overdue_days
    FROM ActiveImplementationProjects aip
    CROSS JOIN ImplementationMilestones im
    INNER JOIN tbl_project_activity pa
      ON pa.project_id = aip.project_id
     AND pa.sub_project_id = aip.sub_project_id
     AND pa.milestone_id = im.milestone_id
    WHERE
      pa.start_date IS NOT NULL
      AND pa.end_date IS NULL
      AND CAST(pa.start_date AS date) < CAST(GETDATE() AS date)
    ORDER BY
      aip.organisation_name,
      aip.project_id,
      aip.sub_project_id,
      im.milestone_id;
  `);

  return result.recordset || [];
}

export function mapImplementationOverdueRows(milestoneRows) {
  const groups = new Map();

  for (const row of milestoneRows) {
    const key = projectGroupKey(row);
    if (!groups.has(key)) {
      const { projectId, subProjectId } = resolveProjectIds(row);
      groups.set(key, {
        organisation: row.organisation_name || "",
        organisationId: row.organisation_id ?? null,
        projectId,
        subProjectId,
        projectName: row.project_name || "",
        stage: row.stage_name || "Under Implementation",
        milestones: [],
      });
    }

    const overdueDays = Math.max(0, Number(row.overdue_days) || 0);
    groups.get(key).milestones.push({
      milestoneId: Number(row.milestone_id),
      label: row.milestone_label,
      targetDate: formatDisplayDate(row.effective_target_date),
      overdueDays,
    });
  }

  return [...groups.values()].map((group, index) => {
    const milestones = group.milestones.sort(
      (a, b) => a.milestoneId - b.milestoneId
    );
    const count = milestones.length;
    const milestoneList = milestones.map((m) => m.label).join("; ");
    const targetDate = milestones
      .map((m) => `${m.label}: ${m.targetDate}`)
      .join("; ");
    const issueDetails = milestones
      .map(
        (m) =>
          `${m.label} (target ${m.targetDate}, overdue ${m.overdueDays} day${
            m.overdueDays === 1 ? "" : "s"
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
      milestones: milestoneList,
      targetDate,
      issue: `Target end date expired for ${count} milestone(s) with no actual completion recorded - ${issueDetails}`,
      action:
        "Port/Organisation to update actual completion date, or provide a revised target date with reasons for delay",
    };
  });
}

export async function getImplementationOverdueCount(conn) {
  const result = await conn.request().query(`
    WITH ${IMPLEMENTATION_MILESTONES_CTE},
    ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE},
    Flagged AS (
      SELECT DISTINCT aip.project_id, aip.sub_project_id
      FROM ActiveImplementationProjects aip
      CROSS JOIN ImplementationMilestones im
      INNER JOIN tbl_project_activity pa
        ON pa.project_id = aip.project_id
       AND pa.sub_project_id = aip.sub_project_id
       AND pa.milestone_id = im.milestone_id
      WHERE
        pa.start_date IS NOT NULL
        AND pa.end_date IS NULL
        AND CAST(pa.start_date AS date) < CAST(GETDATE() AS date)
    )
    SELECT COUNT(*) AS issue_count FROM Flagged;
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getImplementationOverdueDetail(conn) {
  return mapImplementationOverdueRows(
    await queryImplementationOverdueMilestoneRows(conn)
  );
}
