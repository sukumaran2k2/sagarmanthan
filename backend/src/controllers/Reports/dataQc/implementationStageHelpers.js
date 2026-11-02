import {
  formatDisplayDate,
  formatProjectCode,
  projectGroupKey,
  resolveProjectIds,
} from "./shared.js";

// Progress.sub_project_id can be non-numeric (e.g. SPR0002) — match as varchar, don't coerce to int.
export const LATEST_PHYSICAL_PROGRESS_JOIN = `
  LEFT JOIN (
    SELECT
      CAST(tbl_project_physical_progress.project_id AS varchar(50)) AS entity_id,
      MAX(physical_progress) AS physical_progress
    FROM tbl_project_physical_progress
    WHERE CAST(sub_project_id AS varchar(50)) IN ('-1', '-', '0', '')
       OR sub_project_id IS NULL
    GROUP BY tbl_project_physical_progress.project_id
    UNION ALL
    SELECT
      CAST(tbl_project_physical_progress.sub_project_id AS varchar(50)) AS entity_id,
      MAX(physical_progress) AS physical_progress
    FROM tbl_project_physical_progress
    WHERE sub_project_id IS NOT NULL
      AND CAST(sub_project_id AS varchar(50)) NOT IN ('-1', '-', '0', '')
    GROUP BY tbl_project_physical_progress.sub_project_id
  ) AS latestProgress
    ON latestProgress.entity_id = CASE
      WHEN aip.sub_project_id_text IN ('-1', '-', '0', '', 'null', 'undefined')
      THEN aip.project_id_text
      ELSE aip.sub_project_id_text
    END
`;

export const IMPLEMENTATION_MILESTONE_DEFS = [
  {
    milestoneId: 0,
    label: "Milestone 0 (<20%)",
    shortLabel: "Milestone 0",
    minExclusive: null,
    maxExclusive: 20,
  },
  {
    milestoneId: 1,
    label: "Milestone 1 (>=20% and <40%)",
    shortLabel: "Milestone 1",
    minExclusive: 20,
    maxExclusive: 40,
  },
  {
    milestoneId: 2,
    label: "Milestone 2 (>=40% and <60%)",
    shortLabel: "Milestone 2",
    minExclusive: 40,
    maxExclusive: 60,
  },
  {
    milestoneId: 3,
    label: "Milestone 3 (>=60% and <80%)",
    shortLabel: "Milestone 3",
    minExclusive: 60,
    maxExclusive: 80,
  },
  {
    milestoneId: 4,
    label: "Milestone 4 (>=80% and <100%)",
    shortLabel: "Milestone 4",
    minExclusive: 80,
    maxExclusive: 100,
  },
  {
    milestoneId: 5,
    label: "Final Milestone (Completion Report =100%)",
    shortLabel: "Final Milestone",
    minExclusive: 100,
    maxExclusive: null,
  },
];

function issueMilestoneLabel(milestone) {
  return milestone?.shortLabel || milestone?.label || "milestone";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getOverdueDays(effectiveTarget, today = startOfToday()) {
  const target = toDateOnly(effectiveTarget);
  if (!target) return null;
  const diffMs = today.getTime() - target.getTime();
  if (diffMs <= 0) return null;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function milestoneIdFromPhysicalProgress(progressValue) {
  const pct = Number(progressValue);
  if (!Number.isFinite(pct) || pct < 20) return 0;
  if (pct < 40) return 1;
  if (pct < 60) return 2;
  if (pct < 80) return 3;
  if (pct < 100) return 4;
  return 5;
}

export function formatPhysicalProgress(progressValue) {
  const pct = Number(progressValue);
  if (!Number.isFinite(pct)) return "Not Available";
  return `${pct}%`;
}

export function buildProjectMilestoneState(project, milestoneRows) {
  const milestones = [...milestoneRows].sort(
    (a, b) => a.milestoneId - b.milestoneId
  );

  const physicalProgress = Number(project.physicalProgress);
  const currentMilestoneId = milestoneIdFromPhysicalProgress(
    Number.isFinite(physicalProgress) ? physicalProgress : 0
  );
  const currentMilestone =
    milestones.find((m) => m.milestoneId === currentMilestoneId) || null;

  const targetsWithDates = milestones.filter((m) => m.effectiveTarget);
  const actualsBeforeCurrent = milestones.filter(
    (m) => m.milestoneId < currentMilestoneId && m.actualDate
  );

  const missingTargets = milestones.filter((m) => !m.effectiveTarget);
  const missingActualsBeforeCurrent = milestones.filter(
    (m) => m.milestoneId < currentMilestoneId && !m.actualDate
  );

  const overdueMilestones = milestones
    .filter((m) => !m.actualDate && m.effectiveTarget)
    .map((m) => {
      const overdueDays = getOverdueDays(m.effectiveTarget);
      if (overdueDays == null) return null;
      return {
        ...m,
        overdueDays,
        targetDateDisplay: formatDisplayDate(m.effectiveTarget),
      };
    })
    .filter(Boolean);

  return {
    milestones,
    physicalProgress: Number.isFinite(physicalProgress)
      ? physicalProgress
      : null,
    currentMilestone,
    currentMilestoneId,
    targetsWithDates,
    actualsBeforeCurrent,
    missingTargets,
    missingActualsBeforeCurrent,
    overdueMilestones,
  };
}

export function formatMilestoneDateList(milestones, dateKey) {
  if (!milestones.length) return "Not Available";
  return milestones
    .map((m) => `${m.label}: ${formatDisplayDate(m[dateKey])}`)
    .join("; ");
}

export function buildImplementationMissingIssueParts(state) {
  const currentLabel = issueMilestoneLabel(state.currentMilestone) || "current milestone";

  const issueTargetValue =
    state.missingTargets.length > 0
      ? state.missingTargets.map((m) => issueMilestoneLabel(m)).join(", ")
      : "none";

  const issueActualValue =
    state.missingActualsBeforeCurrent.length > 0
      ? state.missingActualsBeforeCurrent
          .map((m) => issueMilestoneLabel(m))
          .join(", ")
      : "none";

  const issueTargetLabel = "Missing target date:";
  const issueActualLabel = `Missing actual date (before ${currentLabel}):`;

  return {
    issueTargetLabel,
    issueTargetValue,
    issueActualLabel,
    issueActualValue,
    issue: [
      `${issueTargetLabel}\n${issueTargetValue}`,
      `${issueActualLabel}\n${issueActualValue}`,
    ].join("\n\n"),
  };
}

export function buildImplementationOverdueIssueParts(state) {
  const missingParts = buildImplementationMissingIssueParts(state);

  const issueOverdueValue =
    state.overdueMilestones.length > 0
      ? state.overdueMilestones
          .map(
            (m) =>
              `${issueMilestoneLabel(m)} (target ${m.targetDateDisplay}, overdue ${m.overdueDays} day${
                m.overdueDays === 1 ? "" : "s"
              })`
          )
          .join("; ")
      : "none";

  const issueOverdueLabel = "Overdue milestone target date:";

  return {
    ...missingParts,
    issueOverdueLabel,
    issueOverdueValue,
    issue: [
      `${issueOverdueLabel}\n${issueOverdueValue}`,
      `${missingParts.issueTargetLabel}\n${missingParts.issueTargetValue}`,
      `${missingParts.issueActualLabel}\n${missingParts.issueActualValue}`,
    ].join("\n\n"),
  };
}

export function groupImplementationMilestoneRows(stageRows) {
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
        stage: row.stage_name || "Under Implementation",
        physicalProgress: row.physical_progress,
        milestones: [],
      });
    }

    const def = IMPLEMENTATION_MILESTONE_DEFS.find(
      (d) => d.milestoneId === Number(row.milestone_id)
    );

    groups.get(key).milestones.push({
      milestoneId: Number(row.milestone_id),
      label: def?.label || row.milestone_label,
      shortLabel: def?.shortLabel || row.milestone_label,
      effectiveTarget: row.start_date || null,
      actualDate: row.end_date || null,
    });
  }

  return groups;
}

export function sortProjectRows(rows) {
  return [...rows].sort((a, b) => {
    const org = String(a.organisation).localeCompare(String(b.organisation));
    if (org !== 0) return org;
    const pid = String(a.projectId).localeCompare(String(b.projectId));
    if (pid !== 0) return pid;
    return String(a.subProjectId).localeCompare(String(b.subProjectId));
  });
}

export function withSerialAndProjectCode(rows) {
  return rows.map((row, index) => ({
    slNo: index + 1,
    ...row,
    projectCode: formatProjectCode(row.projectId, row.subProjectId),
  }));
}

export function formatRelevantMilestone(state) {
  const label = state.currentMilestone?.label || "Not Available";
  const progressText = formatPhysicalProgress(state.physicalProgress);
  return `${label} (Physical progress: ${progressText})`;
}
