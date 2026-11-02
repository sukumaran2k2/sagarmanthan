import {
  formatDisplayDate,
  formatProjectCode,
  projectGroupKey,
  resolveProjectIds,
} from "./shared.js";

export function isApplicableTenderStage(project, subStageId, pdRow) {
  const onNomination = Number(project.on_nomination_basis) === 1;
  if (onNomination && subStageId >= 3 && subStageId <= 8) {
    return false;
  }
  if (pdRow?.not_applicable_date != null) {
    return false;
  }
  return true;
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

export function buildProjectStageState(project, stageRows) {
  const applicable = stageRows
    .filter((row) =>
      isApplicableTenderStage(project, row.subStageId, {
        not_applicable_date: row.notApplicableDate,
      })
    )
    .sort((a, b) => a.subStageId - b.subStageId);

  const currentStage =
    applicable.find((stage) => !stage.actualDate) || null;

  const currentSubStageId = currentStage?.subStageId ?? null;

  const targetsWithDates = applicable.filter((stage) => stage.effectiveTarget);
  const actualsBeforeCurrent = applicable.filter(
    (stage) =>
      currentSubStageId != null &&
      stage.subStageId < currentSubStageId &&
      stage.actualDate
  );

  const missingTargets = applicable.filter((stage) => !stage.effectiveTarget);
  const missingActualsBeforeCurrent = applicable.filter(
    (stage) =>
      currentSubStageId != null &&
      stage.subStageId < currentSubStageId &&
      !stage.actualDate
  );

  const overdueStages = applicable
    .filter((stage) => !stage.actualDate && stage.effectiveTarget)
    .map((stage) => {
      const overdueDays = getOverdueDays(stage.effectiveTarget);
      if (overdueDays == null) return null;
      return {
        ...stage,
        overdueDays,
        targetDateDisplay: formatDisplayDate(stage.effectiveTarget),
      };
    })
    .filter(Boolean);

  return {
    applicable,
    currentStage,
    currentSubStageId,
    targetsWithDates,
    actualsBeforeCurrent,
    missingTargets,
    missingActualsBeforeCurrent,
    overdueStages,
  };
}

export function formatStageDateList(stages, dateKey) {
  if (!stages.length) return "Not Available";
  return stages
    .map((stage) => `${stage.label}: ${formatDisplayDate(stage[dateKey])}`)
    .join("; ");
}

export function buildMissingIssueParts(state) {
  const currentLabel = state.currentStage?.label || "current stage";

  const issueTargetValue =
    state.missingTargets.length > 0
      ? state.missingTargets.map((s) => s.label).join(", ")
      : "none";

  const issueActualValue =
    state.missingActualsBeforeCurrent.length > 0
      ? state.missingActualsBeforeCurrent.map((s) => s.label).join(", ")
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

export function buildOverdueIssueParts(state) {
  const missingParts = buildMissingIssueParts(state);
  const currentLabel = state.currentStage?.label || "current stage";

  const issueOverdueValue =
    state.overdueStages.length > 0
      ? state.overdueStages
          .map(
            (s) =>
              `${s.label} (target ${s.targetDateDisplay}, overdue ${s.overdueDays} day${
                s.overdueDays === 1 ? "" : "s"
              })`
          )
          .join("; ")
      : "none";

  const issueOverdueLabel = "Overdue stage target date:";

  return {
    ...missingParts,
    issueOverdueLabel,
    issueOverdueValue,
    issue: [
      `${issueOverdueLabel}\n${issueOverdueValue}`,
      `${missingParts.issueTargetLabel}\n${missingParts.issueTargetValue}`,
      `Missing actual date (before ${currentLabel}):\n${missingParts.issueActualValue}`,
    ].join("\n\n"),
  };
}

export function groupTenderStageRows(stageRows) {
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
        onNominationBasis: row.on_nomination_basis,
        stages: [],
      });
    }

    groups.get(key).stages.push({
      subStageId: Number(row.sub_stage_id),
      label: row.stage_label,
      plannedDate: row.planned_date,
      revisedDate: row.revised_date,
      actualDate: row.actual_date,
      notApplicableDate: row.not_applicable_date,
      effectiveTarget: row.revised_date || row.planned_date || null,
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
