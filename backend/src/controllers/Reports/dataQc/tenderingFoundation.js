import {
  ACTIVE_TENDER_PROJECTS_CTE,
  FOUNDATION_NOT_LAID_FILTER,
  formatDisplayDate,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

function resolveFoundationStatusLabel(foundationLaid) {
  if (foundationLaid === true || foundationLaid === 1 || foundationLaid === "1") {
    return "Yes";
  }
  if (foundationLaid === false || foundationLaid === 0 || foundationLaid === "0") {
    return "No";
  }
  return "Not Specified";
}

function buildFoundationIssueAndAction({ statusLabel, hasTentativeDate }) {
  if (!hasTentativeDate) {
    return {
      issue: `Foundation not laid; Foundation status: '${statusLabel}'; Foundation-laying date missing`,
      action:
        "Port/Organisation to provide expected/tentative foundation-laying date",
    };
  }

  if (statusLabel === "No") {
    return {
      issue: `Foundation not laid; Foundation status: 'No'`,
      action: "Confirm/update tentative foundation-laying date is still valid",
    };
  }

  return {
    issue: `Foundation not laid; Foundation status: '${statusLabel}'`,
    action: "Confirm/update tentative foundation-laying date is still valid",
  };
}

export async function queryTenderingFoundationRows(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_TENDER_PROJECTS_CTE}
    SELECT
      atp.project_id,
      atp.sub_project_id,
      atp.project_id_text,
      atp.sub_project_id_text,
      atp.organisation_id,
      atp.organisation_name,
      atp.project_name,
      atp.stage_name,
      atp.foundation_laid,
      atp.foundation_laid_date,
      atp.foundation_tentative_date
    FROM ActiveTenderProjects atp
    WHERE
      ${FOUNDATION_NOT_LAID_FILTER}
    ORDER BY
      atp.organisation_name,
      atp.project_id,
      atp.sub_project_id;
  `);

  return result.recordset || [];
}

export function mapTenderingFoundationRows(recordset) {
  return recordset.map((row, index) => {
    const { projectId, subProjectId } = resolveProjectIds(row);
    const statusLabel = resolveFoundationStatusLabel(row.foundation_laid);
    const tentativeText = formatDisplayDate(row.foundation_tentative_date);
    const hasTentativeDate = tentativeText !== "Not Available";
    const { issue, action } = buildFoundationIssueAndAction({
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
      stage: row.stage_name || "Under Tendering",
      milestones: "Foundation Laying",
      targetDate: hasTentativeDate ? tentativeText : "Not Available",
      issue,
      action,
    };
  });
}

export async function getTenderingFoundationCount(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_TENDER_PROJECTS_CTE}
    SELECT COUNT(*) AS issue_count
    FROM ActiveTenderProjects atp
    WHERE
      ${FOUNDATION_NOT_LAID_FILTER};
  `);

  return Number(result.recordset?.[0]?.issue_count) || 0;
}

export async function getTenderingFoundationDetail(conn) {
  return mapTenderingFoundationRows(await queryTenderingFoundationRows(conn));
}
