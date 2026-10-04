import {
  ACTIVE_IMPLEMENTATION_PROJECTS_CTE,
  INAUGURATION_NOT_DONE_FILTER,
  formatDisplayDate,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

function resolveInaugurationStatusLabel(inaugurationValue) {
  if (
    inaugurationValue === true ||
    inaugurationValue === 1 ||
    inaugurationValue === "1"
  ) {
    return "Yes";
  }
  if (
    inaugurationValue === false ||
    inaugurationValue === 0 ||
    inaugurationValue === "0"
  ) {
    return "No";
  }
  return "Not Specified";
}

function buildInaugurationIssueAndAction({ statusLabel, hasTentativeDate }) {
  if (!hasTentativeDate) {
    return {
      issue: `Project not yet inaugurated; Inauguration status: '${statusLabel}'; Inauguration date missing`,
      action:
        "Port/Organisation to provide expected/tentative inauguration date",
    };
  }

  return {
    issue: `Project not yet inaugurated; Inauguration status: '${statusLabel}'`,
    action: "Confirm/update tentative inauguration date is still valid",
  };
}

export async function queryImplementationInaugurationRows(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE}
    SELECT
      aip.project_id,
      aip.sub_project_id,
      aip.project_id_text,
      aip.sub_project_id_text,
      aip.organisation_id,
      aip.organisation_name,
      aip.project_name,
      aip.stage_name,
      aip.inauguration_value,
      aip.inauguration_date,
      aip.tentative_inauguration_date
    FROM ActiveImplementationProjects aip
    WHERE
      ${INAUGURATION_NOT_DONE_FILTER}
    ORDER BY
      aip.organisation_name,
      aip.project_id,
      aip.sub_project_id;
  `);

  return result.recordset || [];
}

export function mapImplementationInaugurationRows(recordset) {
  return recordset.map((row, index) => {
    const { projectId, subProjectId } = resolveProjectIds(row);
    const statusLabel = resolveInaugurationStatusLabel(row.inauguration_value);
    const tentativeText = formatDisplayDate(row.tentative_inauguration_date);
    const hasTentativeDate = tentativeText !== "Not Available";
    const { issue, action } = buildInaugurationIssueAndAction({
      statusLabel,
      hasTentativeDate,
    });

    return {
      slNo: index + 1,
      organisation: row.organisation_name || "",
      organisationId: row.organisation_id ?? null,
      projectId,
      subProjectId,
      projectCode: formatProjectCode(projectId, subProjectId),
      projectName: row.project_name || "",
      stage: row.stage_name || "Under Implementation",
      milestones: "Inauguration",
      targetDate: hasTentativeDate ? tentativeText : "Not Available",
      issue,
      action,
    };
  });
}

export async function getImplementationInaugurationCount(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_IMPLEMENTATION_PROJECTS_CTE}
    SELECT COUNT(*) AS issue_count
    FROM ActiveImplementationProjects aip
    WHERE
      ${INAUGURATION_NOT_DONE_FILTER};
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getImplementationInaugurationDetail(conn) {
  return mapImplementationInaugurationRows(
    await queryImplementationInaugurationRows(conn)
  );
}
