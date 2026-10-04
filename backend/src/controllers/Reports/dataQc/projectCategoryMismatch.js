import {
  buildCategoryBaseRow,
  isCategoryBlank,
  queryProjectCategorySourceRows,
  suggestCategoriesFromName,
} from "./projectCategoryShared.js";

export function mapProjectCategoryMismatchRows(recordset) {
  const rows = [];

  for (const row of recordset) {
    if (isCategoryBlank(row)) continue;

    const existingCategory = String(row.project_category_names || "").trim();
    const suggestedList = suggestCategoriesFromName(
      row.project_name,
      existingCategory
    );
    if (suggestedList.length === 0) continue;

    const suggestedCategory = suggestedList.join(" / ");
    rows.push({
      ...buildCategoryBaseRow(row),
      existingCategory,
      suggestedCategory,
      issue: `Project name/scope suggests '${suggestedCategory}' but this is not reflected in the assigned Project Category ('${existingCategory}')`,
      action: "Port/Organisation to verify and correct Project Category",
    });
  }

  return rows.map((row, index) => ({
    slNo: index + 1,
    ...row,
  }));
}

export async function getProjectCategoryMismatchDetail(conn) {
  return mapProjectCategoryMismatchRows(
    await queryProjectCategorySourceRows(conn)
  );
}

export async function getProjectCategoryMismatchCount(conn) {
  const rows = await getProjectCategoryMismatchDetail(conn);
  return rows.length;
}
