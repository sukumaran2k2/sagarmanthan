import { pool } from "../../db.js";

/**
 * Single source of truth for a project's current stage.
 *
 * Every save that touches stage-relevant data (planning dates, tendering dates,
 * award cost, milestones, completion) calls syncProjectStage() after writing.
 * The stage is recalculated from the saved data, so it can move up or down,
 * but it never silently drops into an earlier tab: a tab is only left when the
 * same save removed that tab's gate, and getGateRemovalBlockMessage() rejects
 * the save up front when later-stage data already exists.
 */

export const PROJECT_STAGE = Object.freeze({
    PROJECT_INITIATED: 0,
    PRE_FEASIBILITY: 1,
    DPR: 2,
    CHAIRMAN_APPROVAL: 3,
    MINISTRY_SUBMISSION: 5,
    DA_CONCURRENCE: 6,
    IFW_CONCURRENCE: 7,
    IMC_CIRCULATION: 8,
    RESPONSE_TO_COMMENTS: 9,
    SFC_APPROVAL: 10,
    ADMIN_APPROVAL: 11,
    UNDER_TENDERING: 12,
    UNDER_IMPLEMENTATION: 13,
    COMPLETED: 14,
});

const STAGE_TAB = Object.freeze({
    PLANNING: 1,
    TENDERING: 2,
    IMPLEMENTATION: 3,
    COMPLETED: 4,
});

const TAB_ENTRY_STAGE = Object.freeze({
    [STAGE_TAB.PLANNING]: PROJECT_STAGE.PROJECT_INITIATED,
    [STAGE_TAB.TENDERING]: PROJECT_STAGE.UNDER_TENDERING,
    [STAGE_TAB.IMPLEMENTATION]: PROJECT_STAGE.UNDER_IMPLEMENTATION,
    [STAGE_TAB.COMPLETED]: PROJECT_STAGE.COMPLETED,
});

const PORT_LEVEL_APPROVAL = 'port level approval';

// Highest step first: the stage is the furthest step that has an actual date.
const PORT_LEVEL_PLANNING_STEPS = [
    ['chairmanDate', PROJECT_STAGE.CHAIRMAN_APPROVAL],
    ['dprDate', PROJECT_STAGE.DPR],
    ['prefeasibilityDate', PROJECT_STAGE.PRE_FEASIBILITY],
];

const STANDARD_PLANNING_STEPS = [
    ['adminDate', PROJECT_STAGE.ADMIN_APPROVAL],
    ['sfcDate', PROJECT_STAGE.SFC_APPROVAL],
    ['responseDate', PROJECT_STAGE.RESPONSE_TO_COMMENTS],
    ['imcDate', PROJECT_STAGE.IMC_CIRCULATION],
    ['ifwDate', PROJECT_STAGE.IFW_CONCURRENCE],
    ['daDate', PROJECT_STAGE.DA_CONCURRENCE],
    ['ministryDate', PROJECT_STAGE.MINISTRY_SUBMISSION],
    ['dprDate', PROJECT_STAGE.DPR],
    ['prefeasibilityDate', PROJECT_STAGE.PRE_FEASIBILITY],
];

export const STAGE_GATE_LOCKED = 'STAGE_GATE_LOCKED';

const PLANNING_GATE_LOCKED_MESSAGE =
    'Approval date and sanctioned cost cannot be removed because this project already has Under Tendering details. Remove those details first.';

const TENDERING_GATE_LOCKED_MESSAGE =
    'Contract signed date and awarded project cost cannot be removed because this project already has Under Implementation progress. Remove that progress first.';

function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function normaliseStageId(stageId) {
    const id = Number(stageId);
    return Number.isInteger(id) && id >= 0 ? id : PROJECT_STAGE.PROJECT_INITIATED;
}

function isProjectLevel(subProjectID) {
    return Number(subProjectID) === -1;
}

export function getStageTab(stageId) {
    const id = normaliseStageId(stageId);
    if (id >= PROJECT_STAGE.COMPLETED) return STAGE_TAB.COMPLETED;
    if (id === PROJECT_STAGE.UNDER_IMPLEMENTATION) return STAGE_TAB.IMPLEMENTATION;
    if (id === PROJECT_STAGE.UNDER_TENDERING) return STAGE_TAB.TENDERING;
    return STAGE_TAB.PLANNING;
}

export function isPlanningGateMet(snapshot) {
    const approvalDate = snapshot.isPortLevelApproval ? snapshot.chairmanDate : snapshot.adminDate;
    return hasValue(approvalDate) && hasValue(snapshot.sanctionedCost);
}

export function isTenderingGateMet(snapshot) {
    return hasValue(snapshot.contractSignedDate) && hasValue(snapshot.awardCost);
}

export function isCompletionGateMet(snapshot) {
    return hasValue(snapshot.completionDate);
}

function isTabGateMet(snapshot, tab) {
    if (tab === STAGE_TAB.TENDERING) return isPlanningGateMet(snapshot);
    if (tab === STAGE_TAB.IMPLEMENTATION) return isTenderingGateMet(snapshot);
    if (tab === STAGE_TAB.COMPLETED) return isCompletionGateMet(snapshot);
    return true;
}

function computePlanningStageId(snapshot) {
    const steps = snapshot.isPortLevelApproval ? PORT_LEVEL_PLANNING_STEPS : STANDARD_PLANNING_STEPS;
    const reached = steps.find(([field]) => hasValue(snapshot[field]));
    return reached ? reached[1] : PROJECT_STAGE.PROJECT_INITIATED;
}

/** Stage the saved data supports, ignoring the currently stored stage. */
export function computeStageId(snapshot) {
    if (isCompletionGateMet(snapshot)) return PROJECT_STAGE.COMPLETED;
    if (isTenderingGateMet(snapshot)) return PROJECT_STAGE.UNDER_IMPLEMENTATION;
    if (isPlanningGateMet(snapshot)) return PROJECT_STAGE.UNDER_TENDERING;
    return computePlanningStageId(snapshot);
}

/**
 * Decides the stage to store. Moving up, or moving within the same tab, always
 * follows the data. Dropping to an earlier tab only happens when this save
 * removed the current tab's gate, and then only by one tab.
 */
export function resolveNextStageId(storedStageId, computedStageId, allowStepBack) {
    const storedTab = getStageTab(storedStageId);
    const computedTab = getStageTab(computedStageId);

    if (computedTab >= storedTab) return computedStageId;
    if (!allowStepBack) return normaliseStageId(storedStageId);

    return Math.max(computedStageId, TAB_ENTRY_STAGE[storedTab - 1]);
}

/**
 * Returns a user-facing message when a save would remove the gate of a tab the
 * project has already moved past, or null when the save may go ahead.
 */
export function getGateRemovalBlockMessage(before, after) {
    const storedTab = getStageTab(before.currentStageId);

    const removesPlanningGate = isPlanningGateMet(before) && !isPlanningGateMet(after);
    if (
        removesPlanningGate &&
        storedTab >= STAGE_TAB.TENDERING &&
        (storedTab > STAGE_TAB.TENDERING || before.hasTenderingData)
    ) {
        return PLANNING_GATE_LOCKED_MESSAGE;
    }

    const removesTenderingGate = isTenderingGateMet(before) && !isTenderingGateMet(after);
    if (
        removesTenderingGate &&
        storedTab >= STAGE_TAB.IMPLEMENTATION &&
        (storedTab > STAGE_TAB.IMPLEMENTATION || before.hasImplementationData)
    ) {
        return TENDERING_GATE_LOCKED_MESSAGE;
    }

    return null;
}

const PROJECT_SNAPSHOT_QUERY = `
    SELECT
        p.current_project_stage_id AS current_stage_id,
        p.project_stage_id,
        p.project_type,
        p.prefeasiblity_actual_date AS prefeasibility_date,
        p.dpr_actual_date AS dpr_date,
        p.chairman_approval_date AS chairman_date,
        p.ministry_submission_date AS ministry_date,
        p.da_approval_date AS da_date,
        p.ifw_approval_date AS ifw_date,
        p.imc_approval_date AS imc_date,
        p.response_com_rec_approval_date AS response_date,
        p.sfc_approval_date AS sfc_date,
        p.admin_approval_approval_date AS admin_date,
        p.sanctioned_cost,
        p.award_project_cost AS award_cost,
        p.actual_date_of_completion AS completion_date
    FROM tbl_project p
    WHERE p.project_id = @projectID;

    SELECT
        MAX(CASE WHEN pd.sub_stage_id = 10 THEN pd.actual_date END) AS contract_signed_date,
        MAX(CASE WHEN pd.actual_date IS NOT NULL THEN 1 ELSE 0 END) AS has_tender_actual_date
    FROM tbl_project_date pd
    WHERE pd.project_id = @projectID
      AND (pd.sub_project_id IS NULL OR TRY_CAST(pd.sub_project_id AS INT) = -1)
      AND pd.sub_stage_id BETWEEN 3 AND 10;

    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM tbl_project_physical_progress pp
            WHERE pp.project_id = @projectID AND pp.sub_project_id = '-1' AND pp.physical_progress > 0
        )
        OR EXISTS (
            SELECT 1 FROM tbl_project_activity pa
            WHERE pa.project_id = @projectID AND pa.end_date IS NOT NULL
        )
        THEN 1 ELSE 0
    END AS has_implementation_data;
`;

const SUB_PROJECT_SNAPSHOT_QUERY = `
    SELECT
        sp.sub_current_project_stage_id AS current_stage_id,
        sp.sub_project_stage_id AS project_stage_id,
        sp.sub_project_type AS project_type,
        sp.sub_prefeasiblity_actual_date AS prefeasibility_date,
        sp.sub_dpr_actual_date AS dpr_date,
        sp.sub_chairman_approval_date AS chairman_date,
        sp.sub_ministry_submission_date AS ministry_date,
        sp.sub_da_approval_date AS da_date,
        sp.sub_ifw_approval_date AS ifw_date,
        sp.sub_imc_approval_date AS imc_date,
        sp.sub_response_com_rec_approval_date AS response_date,
        sp.sub_sfc_approval_date AS sfc_date,
        sp.sub_admin_approval_approval_date AS admin_date,
        sp.sub_sanctioned_cost AS sanctioned_cost,
        sp.sub_award_project_cost AS award_cost,
        sp.sub_actual_date_of_completion AS completion_date
    FROM tbl_sub_project sp
    WHERE sp.sub_project_id = @subProjectID;

    SELECT
        MAX(CASE WHEN pd.sub_stage_id = 10 THEN pd.actual_date END) AS contract_signed_date,
        MAX(CASE WHEN pd.actual_date IS NOT NULL THEN 1 ELSE 0 END) AS has_tender_actual_date
    FROM tbl_project_date pd
    WHERE pd.sub_project_id = @subProjectID
      AND pd.sub_stage_id BETWEEN 3 AND 10;

    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM tbl_project_physical_progress pp
            WHERE pp.sub_project_id = @subProjectID AND pp.physical_progress > 0
        )
        OR EXISTS (
            SELECT 1 FROM tbl_project_activity pa
            WHERE pa.sub_project_id = @subProjectID AND pa.end_date IS NOT NULL
        )
        THEN 1 ELSE 0
    END AS has_implementation_data;
`;

/** Reads everything the stage depends on for one project or sub-project. */
export async function loadStageSnapshot(projectID, subProjectID) {
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    const query = isProjectLevel(subProjectID) ? PROJECT_SNAPSHOT_QUERY : SUB_PROJECT_SNAPSHOT_QUERY;
    const result = await request.query(query);

    const row = result.recordsets[0]?.[0];
    if (!row) {
        throw new Error(`Project ${projectID} / sub-project ${subProjectID} not found.`);
    }
    const tender = result.recordsets[1]?.[0] || {};
    const implementation = result.recordsets[2]?.[0] || {};

    return {
        currentStageId: normaliseStageId(row.current_stage_id),
        projectStageId: row.project_stage_id,
        isPortLevelApproval: String(row.project_type || '').trim().toLowerCase() === PORT_LEVEL_APPROVAL,
        prefeasibilityDate: row.prefeasibility_date,
        dprDate: row.dpr_date,
        chairmanDate: row.chairman_date,
        ministryDate: row.ministry_date,
        daDate: row.da_date,
        ifwDate: row.ifw_date,
        imcDate: row.imc_date,
        responseDate: row.response_date,
        sfcDate: row.sfc_date,
        adminDate: row.admin_date,
        sanctionedCost: row.sanctioned_cost,
        awardCost: row.award_cost,
        completionDate: row.completion_date,
        contractSignedDate: tender.contract_signed_date ?? null,
        hasTenderingData: Number(tender.has_tender_actual_date) === 1 || hasValue(row.award_cost),
        hasImplementationData: Number(implementation.has_implementation_data) === 1,
    };
}

/**
 * Value for the older project_stage_id column. Reports read it to find projects
 * that reached sanction (3 or 11) or completion (14), so it holds the last
 * planning stage while the project is Under Tendering or Under Implementation.
 */
export function getEntryStageId(stageId, isPortLevelApproval) {
    if (stageId >= PROJECT_STAGE.COMPLETED) return PROJECT_STAGE.COMPLETED;
    if (stageId >= PROJECT_STAGE.UNDER_TENDERING) {
        return isPortLevelApproval ? PROJECT_STAGE.CHAIRMAN_APPROVAL : PROJECT_STAGE.ADMIN_APPROVAL;
    }
    return stageId;
}

/**
 * Recalculates and stores the stage after a save.
 * `before` is the snapshot taken before the save; it tells whether this save
 * removed the gate of the tab the project is currently in.
 */
export async function syncProjectStage(projectID, subProjectID, before) {
    const after = await loadStageSnapshot(projectID, subProjectID);
    const storedStageId = after.currentStageId;
    const storedTab = getStageTab(storedStageId);

    const allowStepBack = isTabGateMet(before, storedTab) && !isTabGateMet(after, storedTab);
    const nextStageId = resolveNextStageId(storedStageId, computeStageId(after), allowStepBack);
    const nextEntryStageId = getEntryStageId(nextStageId, after.isPortLevelApproval);

    if (nextStageId === storedStageId && nextEntryStageId === Number(after.projectStageId)) {
        return { previousStageId: storedStageId, nextStageId };
    }

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("nextStageId", nextStageId);
    request.input("nextEntryStageId", nextEntryStageId);

    if (isProjectLevel(subProjectID)) {
        await request.query(`UPDATE tbl_project
            SET current_project_stage_id = @nextStageId, project_stage_id = @nextEntryStageId
            WHERE project_id = @projectID`);
    } else {
        await request.query(`UPDATE tbl_sub_project
            SET sub_current_project_stage_id = @nextStageId, sub_project_stage_id = @nextEntryStageId
            WHERE sub_project_id = @subProjectID`);
    }

    return { previousStageId: storedStageId, nextStageId };
}
