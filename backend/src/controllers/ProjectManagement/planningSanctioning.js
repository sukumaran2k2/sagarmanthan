import express from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";
import {
    loadStageSnapshot,
    getGateRemovalBlockMessage,
    syncProjectStage,
    STAGE_GATE_LOCKED,
} from "./projectStage.js";

/**
 * Mirrors the planning UPDATE below so the stage gate can be checked before
 * anything is written. A chairman date means only the Port Level Approval
 * fields are saved; otherwise the standard approval fields are saved.
 */
function applyPlanningChanges(before, changes) {
    if (changes.chairmanApprovalDate !== null) {
        return {
            ...before,
            prefeasibilityDate: changes.preFeasibilityActualDate,
            dprDate: changes.dprActualDate,
            chairmanDate: changes.chairmanApprovalDate,
            sanctionedCost: changes.chairmanSanctionCost,
        };
    }

    return {
        ...before,
        prefeasibilityDate: changes.preFeasibilityActualDate,
        dprDate: changes.dprActualDate,
        ministryDate: changes.submittedMinistryDate,
        daDate: changes.daConcurrenceApprovalDate,
        ifwDate: changes.ifwConcurrenceApprovalDate,
        imcDate: changes.ciruculatedImcApprovalDate,
        responseDate: changes.responseToComRecApprovalDate,
        sfcDate: changes.approvedBySfcDate,
        adminDate: changes.adminApprovalApprovalDate,
        sanctionedCost: changes.adminSanctionCost,
        chairmanDate: before.isPortLevelApproval ? null : before.chairmanDate,
    };
}



async function getPlanningSanctioningData(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let editProjectDetailsData;
    if (subProjectID == -1) {
        editProjectDetailsData = (`SELECT is_dpr_notapplicable, dpr_actual_date, dpr_remarks, is_prefeasibility_notapplicable,
            prefeasibility_remarks, da_approval_date, prefeasiblity_actual_date, da_remarks,ifw_approval_date,ifw_remarks,
            imc_approval_date,imc_approval_remarks, response_com_rec_approval_date,response_com_rec_remarks, sfc_approval_date,
            sfc_remarks,admin_approval_approval_date,admin_approval_remarks, chairman_approval_date,chairman_approval_remarks,sanctioned_cost,
            ministry_submission_date, ministry_remarks

            FROM tbl_project
            WHERE tbl_project.project_id = @projectID;`)
    }
    else {

        editProjectDetailsData = (`SELECT sub_is_dpr_notapplicable AS is_dpr_notapplicable, sub_dpr_actual_date as dpr_actual_date, 
        sub_dpr_remarks as dpr_remarks, sub_is_prefeasibility_notapplicable AS is_prefeasibility_notapplicable, 
            sub_prefeasiblity_actual_date as prefeasiblity_actual_date, 
            sub_prefeasibility_remarks as prefeasibility_remarks, sub_da_approval_date as da_approval_date,
            sub_da_remarks as da_remarks,sub_ifw_approval_date as ifw_approval_date, sub_ifw_remarks as ifw_remarks,            
            sub_imc_approval_date as imc_approval_date,sub_imc_approval_remarks as imc_approval_remarks, 
            sub_response_com_rec_approval_date as response_com_rec_approval_date, sub_response_com_rec_remarks as response_com_rec_remarks,
            sub_sfc_approval_date as sfc_approval_date,sub_sfc_remarks as sfc_remarks,
            sub_admin_approval_approval_date as admin_approval_approval_date, sub_admin_approval_remarks as admin_approval_remarks, 
            sub_chairman_approval_date as chairman_approval_date,
            sub_chairman_approval_remarks as chairman_approval_remarks,sub_sanctioned_cost as sanctioned_cost,
            sub_ministry_submission_date as ministry_submission_date,sub_ministry_remarks as ministry_remarks

            FROM tbl_sub_project
            WHERE tbl_sub_project.sub_project_id = @subProjectID;
        `)
    }

    try {
        const result = await request.query(editProjectDetailsData);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updatePlanningSanctionedData(req, res) 
{
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    let isDprNotApplicable = req.body.isDprNotApplicable;

    let dprActualDate = req.body.dprActualDate;
    let dprRemarks = req.body.dprRemarks;
    let isPreFeasibilityNotApplicable = req.body.isPreFeasibilityNotApplicable;

    let preFeasibilityActualDate = req.body.preFeasibilityActualDate;
    let preFeasibilityRemarks = req.body.preFeasibilityRemarks;
    let daConcurrenceApprovalDate = req.body.daConcurrenceApprovalDate;
    let daConcurrenceRemarks = req.body.daConcurrenceRemarks;
    let ifwConcurrenceApprovalDate = req.body.ifwConcurrenceApprovalDate;
    let ifwConcurrenceRemarks = req.body.ifwConcurrenceRemarks;
    let ciruculatedImcApprovalDate = req.body.ciruculatedImcApprovalDate;
    let ciruculatedImcApprovalRemarks = req.body.ciruculatedImcApprovalRemarks;
    let responseToComRecApprovalDate = req.body.responseToComRecApprovalDate;
    let responseToComRecRemarks = req.body.responseToComRecRemarks;
    let approvedBySfcDate = req.body.approvedBySfcDate;
    let approvedBySfcRemarks = req.body.approvedBySfcRemarks;
    let adminApprovalApprovalDate = req.body.adminApprovalApprovalDate;
    let adminApprovalRemarks = req.body.adminApprovalRemarks;
    let chairmanApprovalDate = req.body.chairmanApprovalDate;
    let chairmanRemarks = req.body.chairmanRemarks;
    let chairmanSanctionCost = req.body.chairmanSanctionCost;
    let adminSanctionCost = req.body.adminSanctionCost;
    let submittedMinistryDate = req.body.submittedMinistryDate;
    let submittedMinistryRemarks = req.body.submittedMinistryRemarks;



    if (dprActualDate == "") {
        dprActualDate = null;
    }
    if (dprRemarks == "") {
        dprRemarks = null;
    }
    if (preFeasibilityActualDate == "") {
        preFeasibilityActualDate = null;
    }
    if (preFeasibilityRemarks == "") {
        preFeasibilityRemarks = null;
    }
    if (daConcurrenceApprovalDate == "") {
        daConcurrenceApprovalDate = null;
    }
    if (daConcurrenceRemarks == "") {
        daConcurrenceRemarks = null;
    }
    if (ifwConcurrenceApprovalDate == "") {
        ifwConcurrenceApprovalDate = null;
    }
    if (ifwConcurrenceRemarks == "") {
        ifwConcurrenceRemarks = null;
    }
    if (ciruculatedImcApprovalDate == "") {
        ciruculatedImcApprovalDate = null;
    }
    if (ciruculatedImcApprovalRemarks == "") {
        ciruculatedImcApprovalRemarks = null;
    }
    if (responseToComRecApprovalDate == "") {
        responseToComRecApprovalDate = null;
    }
    if (responseToComRecRemarks == "") {
        responseToComRecRemarks = null;
    }
    if (approvedBySfcDate == "") {
        approvedBySfcDate = null;
    }
    if (approvedBySfcRemarks == "") {
        approvedBySfcRemarks = null;
    }
    if (adminApprovalApprovalDate == "") {
        adminApprovalApprovalDate = null;
    }
    if (adminApprovalRemarks == "") {
        adminApprovalRemarks = null;
    }
    if (chairmanApprovalDate == "") {
        chairmanApprovalDate = null;
    }
    if (chairmanRemarks == "") {
        chairmanRemarks = null;
    }
    if (adminSanctionCost == "") {
        adminSanctionCost = null;
    }
    if (chairmanSanctionCost == "") {
        chairmanSanctionCost = null;
    }
    if (submittedMinistryRemarks == "") {
        submittedMinistryRemarks = null;
    }
    if (submittedMinistryDate == "") {
        submittedMinistryDate = null;
    }


    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("isDprNotApplicable", isDprNotApplicable);
    request.input("dprActualDate", dprActualDate);
    request.input("dprRemarks", dprRemarks);
    request.input("isPreFeasibilityNotApplicable", isPreFeasibilityNotApplicable)
    request.input("preFeasibilityActualDate", preFeasibilityActualDate);
    request.input("preFeasibilityRemarks", preFeasibilityRemarks);
    request.input("daConcurrenceApprovalDate", daConcurrenceApprovalDate);
    request.input("daConcurrenceRemarks", daConcurrenceRemarks);
    request.input("ifwConcurrenceApprovalDate", ifwConcurrenceApprovalDate);
    request.input("ifwConcurrenceRemarks", ifwConcurrenceRemarks);
    request.input("ciruculatedImcApprovalDate", ciruculatedImcApprovalDate);
    request.input("ciruculatedImcApprovalRemarks", ciruculatedImcApprovalRemarks);
    request.input("responseToComRecApprovalDate", responseToComRecApprovalDate);
    request.input("responseToComRecRemarks", responseToComRecRemarks);
    request.input("approvedBySfcDate", approvedBySfcDate);
    request.input("approvedBySfcRemarks", approvedBySfcRemarks);
    request.input("adminApprovalApprovalDate", adminApprovalApprovalDate);
    request.input("adminApprovalRemarks", adminApprovalRemarks);
    request.input("chairmanApprovalDate", chairmanApprovalDate);
    request.input("chairmanRemarks", chairmanRemarks);
    request.input("chairmanSanctionCost", chairmanSanctionCost);
    request.input("adminSanctionCost", adminSanctionCost);
    request.input("submittedMinistryDate", submittedMinistryDate);
    request.input("submittedMinistryRemarks", submittedMinistryRemarks);

    try {
        const before = await loadStageSnapshot(projectID, subProjectID);
        const after = applyPlanningChanges(before, {
            preFeasibilityActualDate, dprActualDate, submittedMinistryDate, daConcurrenceApprovalDate,
            ifwConcurrenceApprovalDate, ciruculatedImcApprovalDate, responseToComRecApprovalDate,
            approvedBySfcDate, adminApprovalApprovalDate, adminSanctionCost,
            chairmanApprovalDate, chairmanSanctionCost,
        });

        const blockMessage = getGateRemovalBlockMessage(before, after);
        if (blockMessage) {
            return res.status(409).json({ message: blockMessage, error: STAGE_GATE_LOCKED });
        }

        // Port Level Approval projects only show the chairman row, so an empty
        // chairman date there means it was removed and must be cleared.
        request.input("clearChairmanApproval", before.isPortLevelApproval ? 1 : 0);

        if (subProjectID == -1) {
            if (chairmanApprovalDate === null) {
                await request.query(`UPDATE tbl_project SET is_dpr_notapplicable = @isDprNotApplicable, dpr_actual_date = @dprActualDate,
                dpr_remarks = @dprRemarks, is_prefeasibility_notapplicable = @isPreFeasibilityNotApplicable,
                prefeasiblity_actual_date = @preFeasibilityActualDate, prefeasibility_remarks = @preFeasibilityRemarks,
                da_approval_date = @daConcurrenceApprovalDate, da_remarks = @daConcurrenceRemarks,ifw_approval_date = @ifwConcurrenceApprovalDate,
                ifw_remarks = @ifwConcurrenceRemarks, imc_approval_date = @ciruculatedImcApprovalDate, imc_approval_remarks = @ciruculatedImcApprovalRemarks,
                response_com_rec_approval_date = @responseToComRecApprovalDate, response_com_rec_remarks = @responseToComRecRemarks,
                sfc_approval_date = @approvedBySfcDate, sfc_remarks = @approvedBySfcRemarks,
                admin_approval_approval_date = @adminApprovalApprovalDate,admin_approval_remarks = @adminApprovalRemarks, sanctioned_cost = @adminSanctionCost,
                ministry_submission_date = @submittedMinistryDate, ministry_remarks = @submittedMinistryRemarks,
                chairman_approval_date = CASE WHEN @clearChairmanApproval = 1 THEN NULL ELSE chairman_approval_date END,
                chairman_approval_remarks = CASE WHEN @clearChairmanApproval = 1 THEN NULL ELSE chairman_approval_remarks END
                WHERE project_id = @projectID`);
            } else {
                await request.query(` UPDATE tbl_project SET is_dpr_notapplicable = @isDprNotApplicable, dpr_actual_date = @dprActualDate,
                dpr_remarks = @dprRemarks, is_prefeasibility_notapplicable = @isPreFeasibilityNotApplicable,
                prefeasiblity_actual_date = @preFeasibilityActualDate, prefeasibility_remarks = @preFeasibilityRemarks,
                chairman_approval_date = @chairmanApprovalDate, chairman_approval_remarks = @chairmanRemarks, sanctioned_cost = @chairmanSanctionCost
                WHERE project_id = @projectID`);
            }
        } else {
            if (chairmanApprovalDate === null) {
                await request.query(`UPDATE tbl_sub_project SET sub_is_dpr_notapplicable = @isDprNotApplicable,
                sub_dpr_actual_date = @dprActualDate, sub_dpr_remarks = @dprRemarks, sub_is_prefeasibility_notapplicable = @isPreFeasibilityNotApplicable,
                sub_prefeasiblity_actual_date = @preFeasibilityActualDate, sub_prefeasibility_remarks = @preFeasibilityRemarks,
                sub_da_approval_date = @daConcurrenceApprovalDate, sub_da_remarks = @daConcurrenceRemarks,sub_ifw_approval_date = @ifwConcurrenceApprovalDate,
                sub_ifw_remarks = @ifwConcurrenceRemarks, sub_imc_approval_date = @ciruculatedImcApprovalDate, sub_imc_approval_remarks = @ciruculatedImcApprovalRemarks,
                sub_response_com_rec_approval_date = @responseToComRecApprovalDate, sub_response_com_rec_remarks = @responseToComRecRemarks,
                sub_sfc_approval_date = @approvedBySfcDate, sub_sfc_remarks = @approvedBySfcRemarks, sub_admin_approval_approval_date = @adminApprovalApprovalDate,
                sub_admin_approval_remarks = @adminApprovalRemarks, sub_sanctioned_cost = @adminSanctionCost,
                sub_ministry_submission_date = @submittedMinistryDate, sub_ministry_remarks = @submittedMinistryRemarks,
                sub_chairman_approval_date = CASE WHEN @clearChairmanApproval = 1 THEN NULL ELSE sub_chairman_approval_date END,
                sub_chairman_approval_remarks = CASE WHEN @clearChairmanApproval = 1 THEN NULL ELSE sub_chairman_approval_remarks END
                WHERE sub_project_id = @subProjectID`);
            } else {
                await request.query(`UPDATE tbl_sub_project SET sub_is_dpr_notapplicable = @isDprNotApplicable,
                sub_dpr_actual_date = @dprActualDate, sub_dpr_remarks = @dprRemarks, sub_is_prefeasibility_notapplicable = @isPreFeasibilityNotApplicable,
                sub_prefeasiblity_actual_date = @preFeasibilityActualDate, sub_prefeasibility_remarks = @preFeasibilityRemarks,
                sub_chairman_approval_date = @chairmanApprovalDate, sub_chairman_approval_remarks = @chairmanRemarks, sub_sanctioned_cost = @chairmanSanctionCost
                WHERE sub_project_id = @subProjectID`);
            }
        }

        await syncProjectStage(projectID, subProjectID, before);
        await addLastUpdatedDate(projectID, subProjectID, req, res);

        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getPlanningCheckPoints(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`  SELECT admin_approval_approval_date,
            chairman_approval_date, sanctioned_cost
            FROM tbl_project
            WHERE project_id = @projectID;`);
        } else {
            result = await request.query(` SELECT sub_admin_approval_approval_date as admin_approval_approval_date, 
            sub_chairman_approval_date as chairman_approval_date, sub_sanctioned_cost as sanctioned_cost
            FROM tbl_sub_project
            WHERE sub_project_id = @subProjectID;`);
        }

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

export default { getPlanningSanctioningData, updatePlanningSanctionedData, getPlanningCheckPoints };