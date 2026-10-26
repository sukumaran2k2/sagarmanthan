import {
  buildCategoryBaseRow,
  isCategoryBlank,
  queryProjectCategorySourceRows,
} from "./projectCategoryShared.js";

export function mapProjectCategoryBlankRows(recordset) {
  const rows = [];

  for (const row of recordset) {
    if (!isCategoryBlank(row)) continue;

    rows.push({
      ...buildCategoryBaseRow(row),
      issue: "Project Category field not filled",
      action: "Port/Organisation to assign an appropriate Project Category",
    });
  }

  return rows.map((row, index) => ({
    slNo: index + 1,
    ...row,
  }));
}

export async function getProjectCategoryBlankDetail(conn) {
  return mapProjectCategoryBlankRows(await queryProjectCategorySourceRows(conn));
}

export async function getProjectCategoryBlankCount(conn) {
  const rows = await getProjectCategoryBlankDetail(conn);
  return rows.length;
}
