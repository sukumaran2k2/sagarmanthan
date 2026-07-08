import multer from 'multer';
import express from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import { CONNREFUSED } from 'dns';
import { count } from 'console';
import { addLastUpdatedDate, addContractPhysicalProgress } from "./lastUpdatedDate.js";
import { addLastUpdatedStagePP } from "./lastUpdatedStage.js";

async function utProjectDatesAction(req, res) 
{
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;

    const userID = req.body.userID;
    let onNominationBasisAwarded = req.body.onNominationBasisAwarded;    
    let isTechSancNotApplicable = req.body.isTechSancNotApplicable;
    let techSanctionPlannedDate = req.body.techSanctionPlannedDate;
    let techSanctionActualDate = req.body.techSanctionActualDate;
    let isTenderDocAppNotApplicable = req.body.isTenderDocAppNotApplicable;
    let tenderDocumentPlannedDate = req.body.tenderDocumentPlannedDate;
    let tenderDocumentActualDate = req.body.tenderDocumentActualDate;
    let isTenderNotIssNotApplicable = req.body.isTenderNotIssNotApplicable;
    let tenderNoticePlannedDate = req.body.tenderNoticePlannedDate;
    let tenderNoticeActualDate = req.body.tenderNoticeActualDate;
    let isTechEvaCompNotApplicable = req.body.isTechEvaCompNotApplicable;
    let techEvalPlannedDate = req.body.techEvalPlannedDate;
    let techEvalActualDate = req.body.techEvalActualDate;
    let isFinEvaCompNotApplicable = req.body.isFinEvaCompNotApplicable;
    let finEvalPlannedDate = req.body.finEvalPlannedDate;
    let finEvalActualDate = req.body.finEvalActualDate;
    let isSocAuthorityNotApplicable = req.body.isSocAuthorityNotApplicable;
    let sanctCompetentAuthPlannedDate = req.body.sanctCompetentAuthPlannedDate;
    let sanctCompetentAuthActualDate = req.body.sanctCompetentAuthActualDate;
    let workAwardedPlannedDate = req.body.workAwardedPlannedDate;
    let workAwardedActualDate = req.body.workAwardedActualDate;
    let contractSignedPlannedDate = req.body.contractSignedPlannedDate;
    let contractSignedActualDate = req.body.contractSignedActualDate;
    // let projectStageID = req.body.projectStageID;

    if (techSanctionPlannedDate == "") {
        techSanctionPlannedDate = null;
    }   
    if (techSanctionActualDate == "") {
        techSanctionActualDate = null;
    }
    if (tenderDocumentPlannedDate == "") {
        tenderDocumentPlannedDate = null;
    }
    if (tenderDocumentActualDate == "") {
        tenderDocumentActualDate = null;
    }
    if (tenderNoticePlannedDate == "") {
        tenderNoticePlannedDate = null;
    }
    if (tenderNoticeActualDate == "") {
        tenderNoticeActualDate = null;
    }
    if (techEvalPlannedDate == "") {
        techEvalPlannedDate = null;
    }
    if (techEvalActualDate == "") {
        techEvalActualDate = null;
    }
    if (finEvalPlannedDate == "") {
        finEvalPlannedDate = null;
    }
    if (finEvalActualDate == "") {
        finEvalActualDate = null;
    }
    if (sanctCompetentAuthPlannedDate == "") {
        sanctCompetentAuthPlannedDate = null;
    }
    if (sanctCompetentAuthActualDate == "") {
        sanctCompetentAuthActualDate = null;
    }
    if (workAwardedPlannedDate == "") {
        workAwardedPlannedDate = null;
    }
    if (workAwardedActualDate == "") {
        workAwardedActualDate = null;
    }
    if (contractSignedPlannedDate == "") {
        contractSignedPlannedDate = null;
    }
    if (contractSignedActualDate == "") {
        contractSignedActualDate = null;
    }
    // console.log(techSanctionPlannedDate, "2")

    if(onNominationBasisAwarded == 1)
    {
        isTechSancNotApplicable = 1;
        isTenderDocAppNotApplicable = 1;
        isTenderNotIssNotApplicable = 1;
        isTechEvaCompNotApplicable = 1;
        isFinEvaCompNotApplicable = 1;
        isSocAuthorityNotApplicable = 1;
    }

    if(onNominationBasisAwarded == 1) {
        if(techSanctionActualDate == null && tenderDocumentActualDate == null && tenderNoticeActualDate == null && 
            techEvalActualDate == null && finEvalActualDate == null && sanctCompetentAuthActualDate == null)
        {
            techSanctionPlannedDate = workAwardedPlannedDate;  
            techSanctionActualDate = workAwardedActualDate;   
        }
    }

    // console.log(techSanctionPlannedDate, "3")
    
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    request.input("onNominationBasisAwarded", onNominationBasisAwarded);

    request.input("isTechSancNotApplicable", isTechSancNotApplicable);
    request.input("techSanctionPlannedDate", techSanctionPlannedDate);
    request.input("techSanctionActualDate", techSanctionActualDate);

    request.input("isTenderDocAppNotApplicable", isTenderDocAppNotApplicable);
    request.input("tenderDocumentPlannedDate", tenderDocumentPlannedDate);
    request.input("tenderDocumentActualDate", tenderDocumentActualDate);

    request.input("isTenderNotIssNotApplicable", isTenderNotIssNotApplicable);
    request.input("tenderNoticePlannedDate", tenderNoticePlannedDate);
    request.input("tenderNoticeActualDate", tenderNoticeActualDate);

    request.input("isTechEvaCompNotApplicable", isTechEvaCompNotApplicable);
    request.input("techEvalPlannedDate", techEvalPlannedDate);
    request.input("techEvalActualDate", techEvalActualDate);

    request.input("isFinEvaCompNotApplicable", isFinEvaCompNotApplicable);
    request.input("finEvalPlannedDate", finEvalPlannedDate);
    request.input("finEvalActualDate", finEvalActualDate);
    request.input("isSocAuthorityNotApplicable", isSocAuthorityNotApplicable);
    request.input("sanctCompetentAuthPlannedDate", sanctCompetentAuthPlannedDate);
    request.input("sanctCompetentAuthActualDate", sanctCompetentAuthActualDate);
    request.input("workAwardedPlannedDate", workAwardedPlannedDate);
    request.input("workAwardedActualDate", workAwardedActualDate);
    request.input("contractSignedPlannedDate", contractSignedPlannedDate);
    request.input("contractSignedActualDate", contractSignedActualDate);
    // request.input("projectStageID", projectStageID);
    request.input("userID", userID);
    
    try {
        let isTechExists, lastUpdatedStatus;
        if (subProjectID == -1) {
            isTechExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID AND sub_stage_id = 3;`);
        }
        else {
            isTechExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID AND sub_stage_id = 3;`);
        }
        if (isTechExists.recordset.length > 0) {
            // console.log("update")
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTechSancNotApplicable, planned_date = @techSanctionPlannedDate, 
                actual_date = @techSanctionActualDate WHERE project_id = @projectID AND sub_stage_id = 3`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTechSancNotApplicable, planned_date = @techSanctionPlannedDate, 
                actual_date = @techSanctionActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 3`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }

        }
        else {
            // console.log("insert")  
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date,
                planned_date, actual_date)
                VALUES (@projectID, @subProjectID, 3, @isTechSancNotApplicable, @techSanctionPlannedDate, @techSanctionActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }


        let isTenderDocExists;
        if (subProjectID == -1) {
            isTenderDocExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID AND sub_stage_id = 4;`);
        }
        else {
            isTenderDocExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID AND sub_stage_id = 4;`);
        }
        if (isTenderDocExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTenderDocAppNotApplicable, planned_date = @tenderDocumentPlannedDate, 
                actual_date = @tenderDocumentActualDate WHERE project_id = @projectID AND sub_stage_id = 4`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTenderDocAppNotApplicable, planned_date = @tenderDocumentPlannedDate, 
                actual_date = @tenderDocumentActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 4`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }

        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date, planned_date, actual_date)
            VALUES (@projectID, @subProjectID, 4, @isTenderDocAppNotApplicable, @tenderDocumentPlannedDate, @tenderDocumentActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        let isTenderNoticeExists;
        if (subProjectID == -1) {
            isTenderNoticeExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID 
            AND sub_stage_id = 5;`);
        }
        else {
            isTenderNoticeExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 5;`);
        }
        if (isTenderNoticeExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTenderNotIssNotApplicable, planned_date = @tenderNoticePlannedDate, 
                actual_date = @tenderNoticeActualDate WHERE project_id = @projectID AND sub_stage_id = 5`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTenderNotIssNotApplicable, planned_date = @tenderNoticePlannedDate, 
                actual_date = @tenderNoticeActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 5`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date, planned_date, actual_date)
            VALUES (@projectID, @subProjectID, 5, @isTenderNotIssNotApplicable, @tenderNoticePlannedDate, @tenderNoticeActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        let isTechEvalExists;
        if (subProjectID == -1) {
            isTechEvalExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = 
                @projectID 
            AND sub_stage_id = 6;`);
        }
        else {
            isTechEvalExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 6;`);
        }
        if (isTechEvalExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTechEvaCompNotApplicable, planned_date = @techEvalPlannedDate, 
                actual_date = @techEvalActualDate WHERE project_id = @projectID AND sub_stage_id = 6`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isTechEvaCompNotApplicable, planned_date = @techEvalPlannedDate, 
                actual_date = @techEvalActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 6`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date, planned_date, actual_date)
            VALUES (@projectID, @subProjectID, 6, @isTechEvaCompNotApplicable, @techEvalPlannedDate, @techEvalActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        let isFinEvalExists;
        if (subProjectID == -1) {
            isFinEvalExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID 
            AND sub_stage_id = 7;`);
        }
        else {
            isFinEvalExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 7;`);
        }
        if (isFinEvalExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isFinEvaCompNotApplicable, planned_date = @finEvalPlannedDate, 
                actual_date = @finEvalActualDate WHERE project_id = @projectID AND sub_stage_id = 7`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isFinEvaCompNotApplicable, planned_date = @finEvalPlannedDate, 
                actual_date = @finEvalActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 7`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date,
                planned_date, actual_date)
                VALUES (@projectID, @subProjectID, 7, @isFinEvaCompNotApplicable, @finEvalPlannedDate, @finEvalActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        let isSanctCompetentAuthExists;
        if (subProjectID == -1) {
            isSanctCompetentAuthExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID 
            AND sub_stage_id = 8;`);
        }
        else {
            isSanctCompetentAuthExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 8;`);
        }
        if (isSanctCompetentAuthExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isSocAuthorityNotApplicable, 
                planned_date = @sanctCompetentAuthPlannedDate, actual_date = @sanctCompetentAuthActualDate 
                WHERE project_id = @projectID AND sub_stage_id = 8`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET not_applicable_date = @isSocAuthorityNotApplicable, 
                planned_date = @sanctCompetentAuthPlannedDate, actual_date = @sanctCompetentAuthActualDate 
                WHERE sub_project_id = @subProjectID AND sub_stage_id = 8`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, not_applicable_date,
                planned_date, actual_date)
                VALUES (@projectID, @subProjectID, 8, @isSocAuthorityNotApplicable, @sanctCompetentAuthPlannedDate, @sanctCompetentAuthActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }


        let isWorkAwardedExists;
        if (subProjectID == -1) {
            isWorkAwardedExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID 
            AND sub_stage_id = 9;`);
        }
        else {
            isWorkAwardedExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 9;`);
        }
        if (isWorkAwardedExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET planned_date = @workAwardedPlannedDate, 
                actual_date = @workAwardedActualDate WHERE project_id = @projectID AND sub_stage_id = 9`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET planned_date = @workAwardedPlannedDate, 
                actual_date = @workAwardedActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 9`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, planned_date, actual_date)
            VALUES (@projectID, @subProjectID, 9, @workAwardedPlannedDate, @workAwardedActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }


        let isContractSignedExists;
        if (subProjectID == -1) {
            isContractSignedExists = await request.query(`SELECT project_id FROM tbl_project_date WHERE project_id = @projectID 
            AND sub_stage_id = 10;`)
        }
        else {
            isContractSignedExists = await request.query(`SELECT sub_project_id FROM tbl_project_date WHERE sub_project_id = @subProjectID 
            AND sub_stage_id = 10;`)
        };
        if (isContractSignedExists.recordset.length > 0) {
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET planned_date = @contractSignedPlannedDate, 
                actual_date = @contractSignedActualDate WHERE project_id = @projectID AND sub_stage_id = 10`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET planned_date = @contractSignedPlannedDate, 
                actual_date = @contractSignedActualDate WHERE sub_project_id = @subProjectID AND sub_stage_id = 10`);

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }
        else {
            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, planned_date, actual_date)
            VALUES (@projectID, @subProjectID, 10, @contractSignedPlannedDate, @contractSignedActualDate)`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);

            addContractPhysicalProgress(projectID, subProjectID, userID, req, res);
        }

        // if (subProjectID == -1) {
        //     // console.log("utStageId", projectStageID);
        //     const result = await request.query(`UPDATE tbl_project SET project_stage_id = @projectStageID WHERE project_id = @projectID;`);
        // }
        // else {
        //     const result = await request.query(`UPDATE tbl_sub_project SET sub_project_stage_id = @projectStageID WHERE sub_project_id = @subProjectID;`);
        // }
        let awardProjectCost;

        if( subProjectID == -1 ){

            awardProjectCost = await request.query(`Select ISNULL(tbl_sub_project.sub_award_project_cost,tbl_project.award_project_cost)
        FROM 
            tbl_project
        LEFT JOIN 
            tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        WHERE 
            tbl_project.project_id = @projectID`);

        } else {
            awardProjectCost = await request.query(`Select ISNULL(tbl_sub_project.sub_award_project_cost,tbl_project.award_project_cost)
        FROM 
            tbl_project
        LEFT JOIN 
            tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        WHERE 
            tbl_sub_project.project_id = @projectID AND tbl_sub_project.sub_project_id = @subProjectID;`);
        }

        if( awardProjectCost == ""){
            awardProjectCost = null;
        }

        if (
            contractSignedActualDate !== null &&
            awardProjectCost !== null 
        ) {
            const lastUpdatedStage = await addLastUpdatedStagePP(projectID, subProjectID, req, res);
        }

        // if (
        //     techSanctionPlannedDate !== null ||
        //     techSanctionActualDate !== null ||
        //     tenderDocumentPlannedDate !== null ||
        //     tenderDocumentActualDate !== null ||
        //     tenderNoticePlannedDate !== null ||
        //     tenderNoticeActualDate !== null ||
        //     techEvalPlannedDate !== null ||
        //     techEvalActualDate !== null ||
        //     finEvalPlannedDate !== null ||
        //     finEvalActualDate !== null ||
        //     sanctCompetentAuthPlannedDate !== null ||
        //     sanctCompetentAuthActualDate !== null ||
        //     workAwardedPlannedDate !== null ||
        //     workAwardedActualDate !== null ||
        //     contractSignedPlannedDate !== null ||
        //     contractSignedActualDate !== null
        // ) {
        //     const lastUpdatedStage = await addLastUpdatedStageUT(projectID, subProjectID, req, res);
        // }


        res.sendStatus(lastUpdatedStatus);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDisplayUtProjectDates(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    // console.log("projectdatesui", projectID)

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT sub_stage_id, not_applicable_date, planned_date, revised_date, actual_date, remarks 
            FROM tbl_project_date WHERE project_id = @projectID;`);
        }
        else {
            result = await request.query(`SELECT sub_stage_id, not_applicable_date, planned_date, revised_date, actual_date, remarks 
            FROM tbl_project_date WHERE project_id = @projectID AND sub_project_id = @subProjectID;`);
        }

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// Revision History
async function getRevisionHistory(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const projectSubStageID = req.params.projectSubStageID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("projectSubStageID", projectSubStageID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT revised_date, remarks, revised_on FROM tbl_project_date_history
            where project_id = @projectID AND sub_stage_id = @projectSubStageID order by revised_on DESC`);
        }
        else {
            result = await request.query(`SELECT revised_date, remarks, revised_on FROM tbl_project_date_history
            where sub_project_id = @subProjectID AND sub_stage_id = @projectSubStageID order by revised_on DESC`);
        }

        // res.sendStatus(200);  
        res.json(result.recordset);
        // console.log(result.recordset.length)  
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// --------------------------------------- Tender Calls and Cost ------------------------------------------
async function addUtCostandCalls(req, res) {
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    let awardProjectCost = req.body.awardProjectCost;
    let techSanctionCost = req.body.techSanctionCost;
    let noOfTenderCalls = req.body.noOfTenderCalls;
    let onNominationBasisAwarded = req.body.onNominationBasisAwarded;
    let foundationLaid = req.body.foundationLaid;
    let foundationLaidDate = req.body.foundationLaidDate;
    let foundationTentativeDate = req.body.foundationTentativeDate;
    // let projectStageID = req.body.projectStageID;

    if (!awardProjectCost) {
        awardProjectCost = null;
    }

    if(foundationLaidDate == "") {
        foundationLaidDate = null;
    }

    if(foundationTentativeDate == "") {
        foundationTentativeDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("techSanctionCost", techSanctionCost);
    request.input("awardProjectCost", awardProjectCost);
    request.input("noOfTenderCalls", noOfTenderCalls);
    request.input("onNominationBasisAwarded", onNominationBasisAwarded);
    request.input("foundationLaid", foundationLaid);
    request.input("foundationLaidDate", foundationLaidDate);
    request.input("foundationTentativeDate", foundationTentativeDate);
    // request.input("projectStageID", projectStageID);

    // console.log("techSanctionCost", techSanctionCost)
    // console.log("awardProjectCost", awardProjectCost)
    // console.log("projectStageID",projectStageID) 

    let awardedCostQuery;
    if (subProjectID == -1) {
        // console.log("projectStageID",projectStageID) 

        awardedCostQuery = (` UPDATE tbl_project SET 
            technical_sanction_cost = @techSanctionCost,award_project_cost = @awardProjectCost, on_nomination_basis = @onNominationBasisAwarded,
            num_ut_tender_calls = @noOfTenderCalls, foundation_laid = @foundationLaid, foundation_laid_date = @foundationLaidDate,
            foundation_tentative_date = @foundationTentativeDate
            WHERE project_id = @projectID ` )
    }
    else {
        awardedCostQuery = (` UPDATE tbl_sub_project SET 
        sub_technical_sanction_cost = @techSanctionCost,sub_award_project_cost = @awardProjectCost, sub_on_nomination_basis = @onNominationBasisAwarded,
        sub_num_ut_tender_calls = @noOfTenderCalls, sub_foundation_laid = @foundationLaid, sub_foundation_laid_date = @foundationLaidDate,
        sub_foundation_tentative_date = @foundationTentativeDate
        WHERE sub_project_id = @subProjectID ` )
    }
    try {
        const result = await request.query(awardedCostQuery);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUtCostandCallsData(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let getAwardedCostQuery;
    try {
        if (subProjectID == -1) {
            getAwardedCostQuery = (`SELECT technical_sanction_cost, award_project_cost, on_nomination_basis, num_ut_tender_calls,
                foundation_laid, foundation_laid_date, foundation_tentative_date

                FROM tbl_project WHERE project_id = @projectID;`);
        }
        else {
            getAwardedCostQuery = (`SELECT sub_technical_sanction_cost as technical_sanction_cost, sub_award_project_cost as award_project_cost,
                sub_on_nomination_basis AS on_nomination_basis, sub_num_ut_tender_calls as num_ut_tender_calls,
                sub_foundation_laid as foundation_laid, sub_foundation_laid_date as foundation_laid_date,
                sub_foundation_tentative_date as foundation_tentative_date

                FROM tbl_sub_project WHERE sub_project_id = @subProjectID;`);
        }

        const result = await request.query(getAwardedCostQuery);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function checkProjectStageID(req, res) {

    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();

    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let checkProStageId;

    try {
        if (subProjectID == -1) {
            console.log("no sub project", projectID)
            checkProStageId = (`SELECT project_stage_id FROM tbl_project WHERE project_id = @projectID ;`)
        }
        else {
            checkProStageId = (`SELECT sub_project_stage_id as project_stage_id FROM tbl_sub_project WHERE sub_project_id = @subProjectID ;`)
        }
        const result1 = await request.query(checkProStageId)

        // res.json(result.recordset);
        res.json({ result1: result1.recordset[0] });
    }
    catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

const uploadDestinationBase = './fileuploads/Project_Documents';

if (!fs.existsSync(uploadDestinationBase)) {
    fs.mkdirSync(uploadDestinationBase, { recursive: true });
}

const subfolderNames = [
    'Technical_Sactioned_Obtained',
    'Tender_Document_Approved',
    'Tender_Notice_Issued',
    'Technical_Evaluation_Completed',
    'Financial_Evaluation_Completed',
    'Sanction_Of_Competent_Authority',
    'Work_Awarded',
    'Contract_Agreement_Signed',
];

// Create subfolders under the base directory
subfolderNames.forEach((subfolderName) => {
    const subfolderPath = `${uploadDestinationBase}/${subfolderName}`;
    if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath, { recursive: true });
    }
});


const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const uploadDestination = `${uploadDestinationBase}`;

        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function utProjectDocumentUploader(req, res) {

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }

        const { projectID, subProjectID, folderName } = req.body;

        const filenames = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName, projectID, subProjectID);

            let destinationPath;

            if (subProjectID == -1) {
                destinationPath = `${uploadDestinationBase}/${folderName}/${uniqueFileName}`;
            } else {
                destinationPath = `${uploadDestinationBase}/${folderName}/${uniqueFileName}`;
            }


            fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }

        res.status(200).json({
            message: 'Files uploaded successfully',
            filenames,
            status: 200,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function generateUniqueFileName(originalFileName, projectID, subProjectID) {
    let subProject;

    if (subProjectID === "-1") {
        subProject = projectID;
    } else {
        subProject = subProjectID;
    }
    const fileExtension = originalFileName.split('.').pop();
    return `${subProject}.${fileExtension}`;
}

async function getUnderTenderingCheckPoints(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT tbl_project.award_project_cost AS resultValue, tbl_project.organisation_id,  
                actual_date AS actualDate
                FROM tbl_project_date
                INNER JOIN tbl_project on tbl_project.project_id = tbl_project_date.project_id
               
                WHERE tbl_project_date.project_id = @projectID AND sub_stage_id = 10;`);
        } else {
            result = await request.query(` SELECT tbl_sub_project.sub_award_project_cost AS resultValue, 
                    tbl_sub_project.sub_organisation_id AS organisation_id,  
                    actual_date AS actualDate
                FROM tbl_project_date
                
                INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
                WHERE tbl_project_date.sub_project_id = @subProjectID AND sub_stage_id = 10;`);
        }

        // const resultValue = result.recordsets[0][0].resultValue;

        // const actualDate = result.recordsets[1].length > 0 ? result.recordsets[1][0].actualDate : null;

        // res.json({ resultValue, actualDate });
        if (result.recordset.length === 0) {
            res.json([{ actualDate: null }]);
        } else {
            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUnderImplementationCheckPoints(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT end_date
                FROM tbl_project_activity
            
                WHERE milestone_id = 5
                AND tbl_project_activity.project_id = @projectID;
            `);
        } else {
            result = await request.query(` SELECT end_date
                FROM tbl_project_activity
            
                WHERE milestone_id = 5 AND tbl_project_activity.sub_project_id = @subProjectID;
            `);
        }

        if (result.recordset.length === 0) {
            res.json([{ end_date: null }]);
        } else {
            res.json(result.recordset);
        }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function fileCheck(req, res) {
    const { fileName } = req.query;
    const folderName = checkFileExists(fileName);
    res.json({ exists: folderName !== null, folderName: folderName });
}

function checkFileExists(fileName) {
    const uploadDestinationBase = './fileuploads/Project_Documents';
    const subfolderNames = [
        'Technical_Sactioned_Obtained',
        'Tender_Document_Approved',
        'Tender_Notice_Issued',
        'Technical_Evaluation_Completed',
        'Financial_Evaluation_Completed',
        'Sanction_Of_Competent_Authority',
        'Work_Awarded',
        'Contract_Agreement_Signed',
    ];

    let foundFolders = [];

    for (const folderName of subfolderNames) {
        const folderPath = path.join(uploadDestinationBase, folderName);
        const filePath = path.join(folderPath, fileName + ".pdf");
        if (fs.existsSync(filePath)) {
            const filesInFolder = fs.readdirSync(folderPath);
            const otherFiles = filesInFolder.filter(file => file !== (fileName + ".pdf"));
            foundFolders.push(folderName);

        }
    }
    return foundFolders;
}


async function fileDownload(req, res) {
    const { folderName, fileName } = req.query;

    // Construct the file path
    const uploadDestinationBase = './fileuploads/Project_Documents';
    const filePath = path.join(uploadDestinationBase, folderName, fileName + '.pdf');

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(500).send("Internal Server Error");
        } else {
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName + '_' + folderName + '.pdf');
            res.setHeader('Content-type', 'application/pdf');
            res.send(data);
        }
    });

}

async function fileDelete(req, res) {
    try {
        const { folderName, fileName } = req.query;
        const uploadDestinationBase = './fileuploads/Project_Documents';
        const filePath = path.join(uploadDestinationBase, folderName, fileName + '.pdf');

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.status(200).send({ message: "File deleted successfully", folderName });
        } else {
            res.status(404).send("File not found");
        }
    } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).send("Internal Server Error");
    }
}

export default {
    utProjectDatesAction, getDisplayUtProjectDates, getRevisionHistory, fileCheck, fileDownload, fileDelete,
    addUtCostandCalls, getUtCostandCallsData, checkProjectStageID, utProjectDocumentUploader, getUnderTenderingCheckPoints,
    getUnderImplementationCheckPoints,upload
};