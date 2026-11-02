import {
  ACTIVE_NON_COMPLETED_PROJECTS_CTE,
  formatProjectCode,
  resolveProjectIds,
} from "./shared.js";

export const CATEGORY_KEYWORD_RULES = [
  {
    category: "Fire Fighting facility",
    patterns: [/fire\s*-?\s*fight/i, /firefighting/i],
  },
  {
    category: "RO-RO Ropax facility",
    patterns: [/ro[\s-]*ro/i, /ropax/i],
  },
  {
    category: "Fishing Harbour",
    patterns: [/fishing\s+harbou?r/i],
  },
  {
    category: "Cruise Facilities",
    patterns: [/cruise/i, /river\s+tourism/i],
  },
  {
    category: "Break water and Shore Protection",
    patterns: [
      /break\s*-?\s*water/i,
      /shore\s+protection/i,
      /revetment/i,
      /rubble\s+bund/i,
      /toe\s+protection/i,
    ],
  },
  {
    category: "Water treatment Plant",
    patterns: [
      /water\s+treatment/i,
      /sewage\s+treatment/i,
      /\bstp\b/i,
      /\bwtp\b/i,
      /\d+\s*mld\b/i,
    ],
  },
  {
    category: "Pipeline Network",
    patterns: [/pipeline/i],
  },
  {
    category: "Bank Protection",
    patterns: [/bank\s+protection/i],
  },
  {
    category: "Hospital",
    patterns: [/hospital/i],
  },
  {
    category: "Pontoon",
    patterns: [/pontoon/i],
  },
  {
    category: "Scanners",
    patterns: [/scanner/i],
  },
  {
    category: "Jetty",
    patterns: [/\bjetty\b/i, /\bjetties\b/i],
  },
];

export function isCategoryBlank(row) {
  const rawId = row.project_category_id;
  const idText = rawId == null ? "" : String(rawId).trim().toLowerCase();
  const hasId =
    idText !== "" &&
    idText !== "null" &&
    idText !== "undefined" &&
    idText !== "0" &&
    idText !== "-1";
  const names = String(row.project_category_names || "").trim();
  return !hasId || !names;
}

function categoryAlreadyAssigned(existingNames, suggestedCategory) {
  const existing = String(existingNames || "").toLowerCase();
  const suggested = String(suggestedCategory || "").toLowerCase();
  if (!existing || !suggested) return false;
  return existing.includes(suggested);
}

export function suggestCategoriesFromName(projectName, existingCategoryNames) {
  const name = String(projectName || "");
  if (!name.trim()) return [];

  const matched = [];
  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (!rule.patterns.some((pattern) => pattern.test(name))) continue;
    if (categoryAlreadyAssigned(existingCategoryNames, rule.category)) continue;
    matched.push(rule.category);
  }
  return matched;
}

export function buildCategoryBaseRow(row) {
  const { projectId, subProjectId } = resolveProjectIds(row);
  return {
    organisation: row.organisation_name || "",
    organisationId: row.organisation_id ?? null,
    projectId,
    subProjectId,
    projectCode: formatProjectCode(projectId, subProjectId),
    projectName: row.project_name || "",
    stage: row.stage_name || "",
    milestones: "Project Category (Master Data)",
  };
}

export async function queryProjectCategorySourceRows(conn) {
  const result = await conn.request().query(`
    WITH ${ACTIVE_NON_COMPLETED_PROJECTS_CTE}
    SELECT
      anc.project_id,
      anc.sub_project_id,
      anc.project_id_text,
      anc.sub_project_id_text,
      anc.organisation_id,
      anc.organisation_name,
      anc.project_name,
      anc.stage_name,
      anc.project_category_id,
      anc.project_category_names
    FROM ActiveNonCompletedProjects anc
    ORDER BY
      anc.organisation_name,
      anc.project_id,
      anc.sub_project_id;
  `);

  return result.recordset || [];
}
