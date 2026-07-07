import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

// async function(req, res) {
//     let caseType = req.params.caseType;
//     const caseID = req.params.caseID;

//     if (!caseType || !caseID) {
//         return res.status(400).json({ error: "Invalid case type or case ID" });
//     }

//     const conn = await pool;
//     const request = conn.request();
//     request.input("caseID", caseID);

//     let caseQueryA, caseQueryB;
//     let lCaseQueryA,lCaseQueryB,lCaseQueryC;
//     let cCaseQueryA,cCaseQueryB;

//     try {
//         if (caseType === 'Arbitration') {
//             caseQueryA = `
//                 SELECT COUNT(*) as count 
//                 FROM tbl_court_cases_counsel_details 
//                 WHERE case_id = @caseID
//             `;

//             caseQueryB = `
//                 SELECT is_award_passed 
//                 FROM tbl_arbitration_cases 
//                 WHERE case_id = @caseID
//             `;

//             const resultA = await request.query(caseQueryA);
//             const resultB = await request.query(caseQueryB);

//             const countA = resultA.recordset[0].count;
//             const isAwardPassed = resultB.recordset.length > 0 ? resultB.recordset[0].is_award_passed : null;

//             if (countA > 0 && isAwardPassed !== null) {
//                 return res.json({ status: 3 });  
//             } else if (countA > 0 && isAwardPassed === null) {
//                 return res.json({ status: 2 });  
//             } else {
//                 return res.json({ status: 1 });  
//             }

//         } else if (caseType === 'Litigation') {

//            // Your SQL queries
//             const lCaseQueryA = `
//             SELECT COUNT(*) as count 
//             FROM tbl_court_cases_counsel_details 
//             WHERE case_id = @caseID
//             `;

//             const lCaseQueryB = `
//             SELECT is_execution_required 
//             FROM tbl_litigation_cases 
//             WHERE case_id = @caseID
//             `;

//             const lCaseQueryC = `
//             SELECT is_final_order_or_judgement_passed
//             FROM tbl_litigation_cases
//             WHERE case_id = @caseID
//             `;

//             try {
//             // Execute the queries
//             const resultA = await request.query(lCaseQueryA);
//             const resultB = await request.query(lCaseQueryB);
//             const resultC = await request.query(lCaseQueryC);

//             const countA = resultA.recordset[0].count;
//             const IsNatureOfExecution = resultB.recordset.length > 0 ? resultB.recordset[0].is_execution_required : null;
//             const isfinalJudgementOrNot = resultC.recordset.length > 0 ? resultC.recordset[0].is_final_order_or_judgement_passed : null;

//             let status = 1; // Default status is 1 (Step 1)

//             if (IsNatureOfExecution !== null && isfinalJudgementOrNot !== null) {
//                 status = 4; // All steps enabled, Step 4
//             } else if (IsNatureOfExecution !== null && isfinalJudgementOrNot === null) {
//                 status = 3; // Step 3 enabled
//             } else if (countA > 0 && IsNatureOfExecution === null) {
//                 status = 2; // Step 2 enabled
//             }

//             // Send the status to the frontend
//             return res.json({ status });

//             } catch (error) {
//             console.error('Error executing queries:', error);
//             return res.status(500).json({ error: 'Database query error' });
//             }


//         }else if (caseType === 'Conciliation') {
//             cCaseQueryA = `
//             SELECT is_pre_conn_case FROM tbl_conciliation_cases 
//             WHERE case_id = @caseID`;

//             cCaseQueryB = `
//             SELECT is_complaince_Done FROM tbl_conciliation_cases
//             WHERE case_id = @caseID
//             `;

//             const resultA = await request.query(cCaseQueryA);
//             const resultB = await request.query(cCaseQueryB);

//             const prevConnCaseOrNot = resultA.recordset.length > 0 ? resultA.recordset[0].is_pre_conn_case : null;

//             const complainceDoneOrNot = resultB.recordset.length > 0 ? resultB.recordset[0].is_complaince_Done : null;
            
//             if (prevConnCaseOrNot !== null && complainceDoneOrNot !== null) {
//                 return res.json({ status: 3 });  
//             }else if (prevConnCaseOrNot !== null && complainceDoneOrNot === null) {
//                 return res.json({ status: 2 });  
//             } else {
//                 return res.json({ status: 1 });  
//             }            
//         }

//         return res.status(400).json({ error: "Invalid case type" });
//     }
//     catch (err) {
//         // console.error(err);
//         return res.sendStatus(500);
//     }
// }



async function getCourtCaseDataByID(req,res){
    let caseType = req.params.caseType;
    const caseID = req.params.caseID;

    if (!caseType || !caseID || caseType == null || caseID == null) {
        return res.status(400).json({ error: "Invalid case type or case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("caseType", caseType);
    request.input("caseID", caseID);

    let caseQuery;
    try {
        if(caseType == 'Arbitration'){
            caseQuery = `SELECT * FROM tbl_arbitration_cases WHERE case_id = @caseID  ORDER BY case_id ASC`;
        }
        else if(caseType === 'Litigation'){
            caseQuery = `SELECT * FROM tbl_litigation_cases WHERE case_id = @caseID  ORDER BY case_id ASC`;
        }
        else if(caseType == 'Conciliation'){
            caseQuery = `SELECT * FROM tbl_conciliation_cases WHERE case_id = @caseID  ORDER BY case_id ASC`;
        }
        const result = await request.query(caseQuery);
        // console.log(result)
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}
// async function getCourtCaseDataByID(req,res){
//     // let caseType = req.params.caseType;
//     const caseID = req.params.caseID;

//    if (!caseID) {
//         return res.status(400).json({ error: "Invalid case ID" });
//     }

//     const conn = await pool;
//     const request = conn.request();
//     // request.input("caseType", caseType);
//     request.input("caseID", caseID);


//     const caseQuery = `SELECT * FROM tbl_arbitration_cases WHERE case_id = @caseID ORDER BY case_id ASC`;

//     try {
//         const result = await request.query(caseQuery);
//         res.json(result.recordset);
//     } catch (err) {
//         // console.log(err);
//         return res.sendStatus(500);
//     }
// }




async function getSubTableCourtCaseData(req,res){
    let typeName = req.params.typeName;
    const caseID = req.params.caseID;

    if (!typeName || !caseID || typeName == null || caseID == null) {
        return res.status(400).json({ error: "Invalid type name or case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("typeName", typeName);
    request.input("caseID", caseID);

    let caseQuery;
    try {
        if(typeName == 'PRA'){
            caseQuery = `SELECT * FROM tbl_party_requesting_arbitration WHERE case_id = @caseID`;
        }
        else if(typeName == 'Arbit'){
            caseQuery = `SELECT * FROM tbl_arbitrators WHERE case_id = @caseID`;
        }
        else if(typeName == 'PCC'){
            caseQuery = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
        }
        else if(typeName == 'DOC'){
            caseQuery = `SELECT * FROM tbl_court_cases_counsel_details WHERE case_id = @caseID`;
        }
        else if(typeName == 'Hearing'){
            caseQuery = `SELECT * FROM tbl_court_case_hearing WHERE case_id = @caseID`;
        }
        else if(typeName == 'Interim'){
            caseQuery = `SELECT * FROM tbl_court_case_interim_order WHERE case_id = @caseID`;
        }
        else if(typeName == 'profExp'){
            caseQuery = `SELECT * FROM tbl_court_case_prof_fee_la WHERE case_id = @caseID`;
        }
        else if(typeName == 'otherExp'){
            caseQuery = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
        }else if(typeName == 'OMS'){
            caseQuery = `SELECT * FROM tbl_court_case_om WHERE case_id = @caseID`
        }else if(typeName == 'conciliator'){
            caseQuery = `SELECT * FROM tbl_conciliators WHERE case_id = @caseID`
        }else if(typeName == 'firstParties'){
            caseQuery = `SELECT * FROM tbl_claim_first_parties WHERE case_id = @caseID`
        }else if(typeName == 'secondParties'){
            caseQuery = `SELECT * FROM tbl_claim_second_parties WHERE case_id = @caseID`
        }else if(typeName == 'feeExp'){
            caseQuery = `SELECT * FROM tbl_court_case_fee_expenses WHERE case_id = @caseID`
        }

        // firstParties

        // conciliator
        const result = await request.query(caseQuery);

        res.json(result.recordset);
    }
    catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}



async function fetchLastCaseNumber(req,res){
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`SELECT TOP 1 case_id FROM tbl_arbitration_cases WHERE organisation_id = @organisationID ORDER BY id DESC`);

        res.json(result.recordset);
    }
    catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}

async function addOtherClaimantOrg(req, res) {
    const { otherOrg } = req.body;

    if (!Array.isArray(otherOrg) || otherOrg.length === 0) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const conn = await pool;

    try {
        const existingOrgNames = [];

        //check which organisations already exist in the database
        const placeholders = otherOrg.map((_, index) => `@organisationName${index}`).join(', ');
        const selectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            selectRequest.input(`organisationName${index}`, orgName);
        });

        const result = await selectRequest.query(
            `SELECT organisation_name FROM mmt_arbitration_claimant WHERE organisation_name IN (${placeholders})`
        );

        // Extract the existing organisation names from the result
        result.recordset.forEach(row => existingOrgNames.push(row.organisation_name));

        // Insert new organisations that don't already exist
        for (const orgName of otherOrg) {
            if (!existingOrgNames.includes(orgName)) {
                const request = conn.request();
                request.input("organisationName", orgName);
                await request.query(`INSERT INTO mmt_arbitration_claimant (organisation_name,status) VALUES (@organisationName ,1) `);
            }
        }

        // Fetch and return the organisation IDs for all input organisations (including both new and existing ones)
        const finalSelectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            finalSelectRequest.input(`organisationName${index}`, orgName);
        });

        const finalResult = await finalSelectRequest.query(
            `SELECT organisation_id, organisation_name FROM mmt_arbitration_claimant WHERE organisation_name IN (${placeholders})`
        );

        res.json(finalResult.recordset);
    } catch (err) {
        // Log the error for debugging purposes (optional)
        console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function addPrevConnCases(req, res) {
    const { caseID, prevConnCaseData } = req.body;


    if (!Array.isArray(prevConnCaseData) || prevConnCaseData.length === 0) {
        return res.status(400).json({ error: "Invalid prevConnCaseData" });
    }

    const conn = await pool;
    const request = conn.request();

    let checkQuery = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        let checkQueryRes = await request.query(checkQuery);

        if (checkQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_prev_conn_court_cases WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const caseData of prevConnCaseData) {
            const request = conn.request(); 
            request.input("caseID", caseID);
            request.input("prevConnectedCourt", caseData.prevConnectedCourt); 
            request.input("prevConnectedCaseNumber", caseData.prevConnectedCaseNumber); 
            request.input("prevConnectedCNRNumber", caseData.prevConnectedCNRNumber); 
            request.input("caseStatus", caseData.caseStatus); 
            request.input("caseDetails", caseData.caseDetails); 

            await request.query(`
                INSERT INTO tbl_prev_conn_court_cases (case_id, prev_conn_case_court_name, prev_conn_case_no, prev_conn_cnr_no, case_status, details) 
                VALUES (@caseID, @prevConnectedCourt, @prevConnectedCaseNumber, @prevConnectedCNRNumber, @caseStatus, @caseDetails)
            `);
        }

        res.status(201).json({ message: "Previous connected cases added successfully." });
    } catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}

async function addHearingCases(req, res) {
    const { caseID, hearingCaseData } = req.body;

    if (!Array.isArray(hearingCaseData) || hearingCaseData.length === 0) {
        return res.status(400).json({ error: "Invalid hearingCaseData" });
    }

    const conn = await pool;
    const request = conn.request();

    let checkQuery = `SELECT * FROM tbl_court_case_hearing WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        let checkQueryRes = await request.query(checkQuery);

        if (checkQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_court_case_hearing WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const caseData of hearingCaseData) {
            const request = conn.request(); 
            request.input("caseID", caseID);
            request.input("hearingDate", caseData.hearingDate); 
            request.input("detailsOfHearing", caseData.detailsOfHearing); 
            request.input("nextHearingDate", caseData.nextHearingDate); 
            request.input("outcomeOfHearing", caseData.outcomeOfHearing); 

            await request.query(`
                INSERT INTO tbl_court_case_hearing (case_id, date_of_hearing, details_of_hearing, next_date_of_hearing, outcome_of_hearing) 
                VALUES (@caseID, @hearingDate, @detailsOfHearing, @nextHearingDate, @outcomeOfHearing)
            `);
        }

        res.status(201).json({ message: "Hearing cases added successfully." });
    } catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}

async function addInterimOrder(req, res) {
    const { caseID, interimOrderData } = req.body;

    if (!Array.isArray(interimOrderData) || interimOrderData.length === 0) {
        return res.status(400).json({ error: "Invalid interimOrderData" });
    }

    const conn = await pool;
    const request = conn.request();

    let checkQuery = `SELECT * FROM tbl_court_case_interim_order WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        let checkQueryRes = await request.query(checkQuery);

        if (checkQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_court_case_interim_order WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const interimOrder of interimOrderData) {
            const request = conn.request(); 
            request.input("caseID", caseID);
            request.input("dateOfInterimOrder", interimOrder.dateOfInterimOrder); 
            request.input("detailsOfInterimOrder", interimOrder.detailsOfInterimOrder); 
            request.input("lastDateOfDoingAction", interimOrder.lastDateOfDoingAction); 
            request.input("natureInterimOrder", interimOrder.natureInterimOrder); 
            request.input("complainceReq", interimOrder.complainceReq); 

            await request.query(`
                INSERT INTO tbl_court_case_interim_order (case_id, nature_of_interim_order, date_of_interim_order, details_of_interim_order, is_action_req_complaince,last_date_for_complaince) 
                VALUES (@caseID, @natureInterimOrder, @dateOfInterimOrder, @detailsOfInterimOrder, @complainceReq, ${interimOrder.lastDateOfDoingAction ? '@lastDateOfDoingAction' : 'NULL'})
            `);
        }

        res.status(201).json({ message: "Interim Order added successfully." });
    } catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}

async function addDetailsOfCounsel(req, res) {
    const { caseID, detailsOfCounselData } = req.body;


    if (!Array.isArray(detailsOfCounselData) || detailsOfCounselData.length === 0) {
        return res.status(400).json({ error: "Invalid details of counsel" });
    }

    const conn = await pool;
    const request = conn.request();
    
    let checkQuery = `SELECT * FROM tbl_court_cases_counsel_details WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        let checkQueryRes = await request.query(checkQuery);

        if (checkQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_court_cases_counsel_details WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const detailData of detailsOfCounselData) {
            const request = conn.request(); 
            request.input("caseID", caseID);
            request.input("nameOfCounsel", detailData.nameOfCounsel); 
            request.input("counselContact", detailData.counselContact); 
            request.input("typeOfCounsel", detailData.typeOfCounsel); 
            request.input("counselDetails", detailData.counselDetails); 

            await request.query(`
                INSERT INTO tbl_court_cases_counsel_details (case_id, name_of_counsel, contact, type_of_counsel, details) 
                VALUES (@caseID, @nameOfCounsel, @counselContact, @typeOfCounsel, @counselDetails)
            `);
        }

        res.status(200).json({ message: "Details of Counsel added successfully." });
    } catch (err) {
        console.log("add details counsel",err);
        return res.sendStatus(500);
    }
}

async function addArbitFeeExpenseData(req, res) {
    const { caseID, feeType, feeTypeDetails, profFeeExpenseData, otherExpenseData, feeExpenseData } = req.body;

    if (!Array.isArray(feeExpenseData) || feeExpenseData.length === 0 ||
        !Array.isArray(profFeeExpenseData) || profFeeExpenseData.length === 0 ||
        !Array.isArray(otherExpenseData) || otherExpenseData.length === 0) {
        return res.status(400).json({ error: "Invalid details of fee expense data" });
    }

    const conn = await pool;
    const request = conn.request();

    try {
        if (profFeeExpenseData.length > 0 || otherExpenseData.length >= 0) {
            await addProfOtherExpenseData({ body: { caseID, profFeeExpenseData, otherExpenseData } });
        }

        let checkQuery = `SELECT * FROM tbl_court_case_fee_expenses WHERE case_id = @caseID`;
        request.input('caseID', caseID);
    
        let checkQueryRes = await request.query(checkQuery);
        if (checkQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE FROM tbl_court_case_fee_expenses WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const feeExpense of feeExpenseData) {
            request.input("feeArbitratorName", feeExpense.feeArbitratorName);
            request.input("feeNatureOfExp", feeExpense.feeNatureOfExp);
            request.input("feeExpAmount", feeExpense.feeExpAmount);
            request.input("feeDateOfPay", feeExpense.feeDateOfPay);

            await request.query(`
                INSERT INTO tbl_court_case_fee_expenses (case_id, name_of_arbitrator, nature_of_expense, fee_expense_amount, date_of_payment) 
                VALUES (@caseID, @feeArbitratorName, @feeNatureOfExp, @feeExpAmount, @feeDateOfPay)
            `);
        }

        const updateQuery = `UPDATE tbl_arbitration_cases SET fee_type = @feeType, fee_type_details = @feeTypeDetails WHERE case_id = @caseID;`;

        request.input("feeType", feeType);
        request.input("feeTypeDetails", feeTypeDetails);
        await request.query(updateQuery);

        res.status(200).json({ message: "Details of arbitration expense data added successfully." });
    } catch (err) {
        console.log("expendire err",err)
        if (!res.headersSent) {
            res.status(500).send("An error occurred while processing the request.");
        }
    }
}

async function addProfOtherExpenseData(req) {
    const { caseID, profFeeExpenseData, otherExpenseData } = req.body;

    if (!Array.isArray(profFeeExpenseData) || profFeeExpenseData.length === 0 ||
        !Array.isArray(otherExpenseData) || otherExpenseData.length === 0) {
        throw new Error("Invalid details of expense"); 
    }

    const conn = await pool;
    const request = conn.request();

    request.input("caseID", caseID);

    try {
        let propExpCheckQuery = `SELECT * FROM tbl_court_case_prof_fee_la WHERE case_id = @caseID`;
    
        let propExpCheckQueryRes = await request.query(propExpCheckQuery);
        if (propExpCheckQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_court_case_prof_fee_la WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const profExpData of profFeeExpenseData) {
          
            const request = conn.request();
            request.input("profFeeArbitratorName", profExpData.profFeeArbitratorName);
            request.input("profFeeNatureOfExp", profExpData.profFeeNatureOfExp);
            request.input("profFeeExpAmount", profExpData.profFeeExpAmount);
            request.input("profFeeDateOfPay", profExpData.profFeeDateOfPay);
            request.input("caseID", caseID);

            await request.query(`
                INSERT INTO tbl_court_case_prof_fee_la (case_id, name_of_advocate, nature_of_claim, prof_fee_amount, date_of_payment) 
                VALUES (@caseID, @profFeeArbitratorName, @profFeeNatureOfExp, @profFeeExpAmount, @profFeeDateOfPay)
            `);
        }

        let otherExpCheckQuery = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
    
        let otherExpCheckQueryRes = await request.query(otherExpCheckQuery);
        if (otherExpCheckQueryRes.recordset.length != 0) {
            let deleteExistingDataQuery = `DELETE tbl_court_case_other_expense WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const otherExpData of otherExpenseData) {
           
            const request = conn.request();
            request.input("caseID", caseID);
            request.input("paymentMadeTo", otherExpData.paymentMadeTo);
            request.input("natureOfExpense", otherExpData.natureOfExpense);
            request.input("otherExpenseAmount", otherExpData.otherExpenseAmount);
            request.input("otherExpDateOfPay", otherExpData.otherExpDateOfPay);

            await request.query(`
                INSERT INTO tbl_court_case_other_expense (case_id, payment_made_to, nature_of_expense, other_expense_amount, date_of_payment) 
                VALUES (@caseID, @paymentMadeTo, @natureOfExpense, @otherExpenseAmount, @otherExpDateOfPay)
            `);
        }

    } catch (err) {
        //console.log(err);
        throw err; 
    }
}

async function createArbitCourtCase(req, res) {
    const {
        caseID,  partyData, partyRefArbitName, dateOfReference,
        domOrInterArbit, arbitratorsData, claimAmount,caseName, counterClaimAmount, placeOfArbitration,
        domain, subDomain, caseDescription, deptDivision, prevConnCaseOrNot, organisationID, userID, organisationName
    } = req.body;

    const conn = await pool;
    const request = conn.request();

    const deptDivisonStr = deptDivision.join(',');

    request.input("caseID", caseID);

    let checkQuery = `SELECT * FROM tbl_arbitration_cases WHERE case_id = @caseID`;
    // request.input("caseID", caseID);
    let result;
    try {
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length != 0) {
            try {

                let deltere = await conn.request()
                    .input("caseID", caseID)
                    .query(`
                        DELETE FROM [tbl_party_requesting_arbitration] WHERE [case_id] = @caseID;
                    `);
        
                let deletereques = await conn.request()
                    .input("caseID", caseID)
                    .query(`
                        DELETE FROM [tbl_arbitrators] WHERE [case_id] = @caseID;
                    `);

                const caseUpdateQuery = `
                    UPDATE [tbl_arbitration_cases] 
                    SET
                        [name_of_party_referring_matter] = @partyRefArbitName,
                        [date_of_reference] = @dateOfReference, 
                        [is_domestic_or_international] = @domOrInterArbit, 
                        [claim_amount] = @claimAmount, 
                        [case_name] = @caseName,
                        [counter_claim_amount] = @counterClaimAmount,
                        [place_of_arbitration] = @placeOfArbitration, 
                        [domain] = @domain, 
                        [sub_domain] = @subDomain, 
                        [case_description] = @caseDescription, 
                        [dept_division] = @deptDivison, 
                        [is_prev_conn_cases] = @prevConnCaseOrNot, 
                        [created_by] = @userID, 
                        [organisation_id] = @organisationID,
                        [organisation_name] = @organisationName,
                        [updated_date] = GETDATE()
                    WHERE [case_id] = @caseID
                `;
        
                await conn.request()
                    .input("partyRefArbitName", partyRefArbitName)
                    .input("dateOfReference", dateOfReference)
                    .input("domOrInterArbit", domOrInterArbit)
                    .input("claimAmount", claimAmount)
                    .input("caseName", caseName)
                    .input("counterClaimAmount", counterClaimAmount)
                    .input("placeOfArbitration", placeOfArbitration)
                    .input("domain", domain)
                    .input("subDomain", subDomain)
                    .input("caseDescription", caseDescription)
                    .input("deptDivison", deptDivisonStr)
                    .input("prevConnCaseOrNot", prevConnCaseOrNot)
                    .input("organisationID", organisationID)
                    .input("userID", userID)
                    .input("organisationName", organisationName)
                    .input("caseID", caseID)
                    .query(caseUpdateQuery);
        
            } catch (error) {
                console.error("Error while deleting or updating data:", error);
            }
        } else {
            const caseInsertQuery = `
                INSERT INTO [tbl_arbitration_cases] (
                    [case_id],  [name_of_party_referring_matter], 
                    [date_of_reference], [is_domestic_or_international], [claim_amount],[case_name], [counter_claim_amount], 
                    [place_of_arbitration], [domain], [sub_domain], [case_description], [dept_division], 
                    [is_prev_conn_cases], [created_by], [organisation_id],[organisation_name],[created_date]
                ) OUTPUT INSERTED.case_id
                VALUES (
                    @caseID, @partyRefArbitName, @dateOfReference, 
                    @domOrInterArbit, @claimAmount, @caseName, @counterClaimAmount, @placeOfArbitration, 
                    @domain, @subDomain, @caseDescription, @deptDivison, @prevConnCaseOrNot, 
                    @userID, @organisationID, @organisationName, GETDATE()
                );
            `;
            request.input("partyRefArbitName", partyRefArbitName);
            request.input("dateOfReference", dateOfReference);
            request.input("domOrInterArbit", domOrInterArbit);
            request.input("claimAmount", claimAmount);
            request.input("caseName", caseName);
            request.input("counterClaimAmount", counterClaimAmount);
            request.input("placeOfArbitration", placeOfArbitration);
            request.input("domain", domain);
            request.input("subDomain", subDomain);
            request.input("caseDescription", caseDescription);
            request.input("deptDivison", deptDivisonStr);
            request.input("prevConnCaseOrNot", prevConnCaseOrNot);
            request.input("organisationID", organisationID);
            request.input("userID", userID);
            request.input("organisationName", organisationName);

            result = await request.query(caseInsertQuery);
        }

        if (partyData && partyData.length > 0) {
            for (const party of partyData) {
                await conn.request()
                    .input("caseID", caseID)
                    .input("partyName", party.partyName)
                    .input("dateOfReference", party.requestDate)
                    .query(`
                        INSERT INTO [tbl_party_requesting_arbitration] 
                        ([case_id], [party_name], [date_of_reference])
                        VALUES (@caseID, @partyName, @dateOfReference);
                    `);
            }
        }

        if (arbitratorsData && arbitratorsData.length > 0) {
            for (const arbitrator of arbitratorsData) {
                await conn.request()
                    .input("caseID", caseID)
                    .input("arbitratorName", arbitrator.arbitratorName)
                    .input("designationCapacity", arbitrator.designationCapacity)
                    .input("partyNominating", arbitrator.partyNominating)
                    .query(`
                        INSERT INTO [tbl_arbitrators] 
                        ([case_id], [name_of_arbitrators], [designation_capacity], [party_nominating])
                        VALUES (@caseID, @arbitratorName, @designationCapacity, @partyNominating);
                    `);
            }
        }

        res.status(201).json({ caseID });


    } catch (err) {
        console.error('Error processing arbitration case:', err);
        res.sendStatus(500);
    }
}

async function updateArbitCourtCaseStatus(req, res) {
    const {
        caseID,isHearingStarted, isDefenceStatement, isInterimOrder, isAwardPassed, appealRevCaseNumber, appealRevCourtName, appealRevCNRNumber, appealRevFillingDate,
        awardPassedDate, natureOfAward, amountAnyAwarded, awardedClaimAmount, awardedCounterClaimAmount, briefOfAward, isActionReqForCom,
        lastDateForComplaince, whetJudgeAccept, awardCompiled, dateOfComplaince, detailsOfComplaince, reasonForNonComplaince, userID, stageID,stage
    } = req.body;

    const conn = await pool;
    const request = conn.request();


    let checkQuery = `SELECT * FROM tbl_arbitration_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkQuery);
        // console.log("checl ",checkResult);
        
        if (checkResult.recordset.length != 0) {
            const updateQuery = `
                UPDATE tbl_arbitration_cases
                SET 
                    is_hearing_started = @isHearingStarted,
                    is_defence_statement_filed = @isDefenceStatement,
                    have_interim_order = @isInterimOrder,
                    is_award_passed = @isAwardPassed,
                    award_passed_date = @awardPassedDate,
                    nature_of_award = @natureOfAward,
                    amounts_if_awarded = @amountAnyAwarded,
                    is_action_req_compliance = @isActionReqForCom,
                    last_date_of_compliance = @lastDateForComplaince,
                    brief_of_award = @briefOfAward,
                    wheth_award_accept_appealed_file = @whetJudgeAccept,
                    case_number = @appealRevCaseNumber,
                    court_name = @appealRevCourtName,
                    cnr_number = @appealRevCNRNumber,
                    filing_date = @appealRevFillingDate,
                    is_award_compiled = @awardCompiled,
                    date_of_compliance = @dateOfComplaince,
                    details_of_compliance = @detailsOfComplaince,
                    reason_for_non_compliance = @reasonForNonComplaince,
                    awarded_claim_amount = @awardedClaimAmount,
                    awarded_counter_claim_amount = @awardedCounterClaimAmount,
                    stage_id = @stageID,
                    stage = @stage,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE case_id = @caseID;
            `;
            
            request.input("isHearingStarted", isHearingStarted);
            request.input("isDefenceStatement", isDefenceStatement);
            request.input("isInterimOrder", isInterimOrder);
            request.input("isAwardPassed", isAwardPassed);
            request.input("awardPassedDate", awardPassedDate || null);
            request.input("natureOfAward", natureOfAward);
            request.input("amountAnyAwarded", amountAnyAwarded);
            request.input("awardedClaimAmount", awardedClaimAmount);
            request.input("awardedCounterClaimAmount", awardedCounterClaimAmount);
            request.input("briefOfAward", briefOfAward);
            request.input("appealRevCaseNumber", appealRevCaseNumber);
            request.input("appealRevCourtName", appealRevCourtName);
            request.input("appealRevCNRNumber", appealRevCNRNumber);
            request.input("appealRevFillingDate", appealRevFillingDate);
            request.input("isActionReqForCom", isActionReqForCom);
            request.input("lastDateForComplaince", lastDateForComplaince || null);
            request.input("whetJudgeAccept", whetJudgeAccept);
            request.input("awardCompiled", awardCompiled);
            request.input("dateOfComplaince", dateOfComplaince);
            request.input("detailsOfComplaince", detailsOfComplaince);
            request.input("reasonForNonComplaince", reasonForNonComplaince);
            request.input("userID", userID);
            request.input("stageID", stageID);
            request.input("stage", stage);
            await request.query(updateQuery);
            res.status(200).json({ message: "Data updated successfully." });
        } else {
            res.status(404).json({ message: "Case not found." });
        }
    } catch (err) {
        // console.error('Error updating data:', err);
        res.sendStatus(500);
    }
}

async function getCourtCase(req, res) {
    const roleID = req.params.roleID;
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("roleID",roleID);
    request.input("organisationID",organisationID);

    let query;
    if (roleID == 2 || roleID == 3 || roleID == 4 || roleID == 5 || roleID == 8) {
        query = `
            SELECT 
                ac.organisation_id,
                ac.organisation_name,
                ac.case_id,
                -- Join to fetch the actual domain name from tbl_domains
                COALESCE(d.domain_name, '') AS domain,
                -- Join to fetch the actual sub-domain name from tbl_sub_domains
                COALESCE(sd.sub_domain_name, '') AS sub_domain,
                CAST(ac.cnr_number AS VARCHAR) AS cnr_number,
                CAST(ac.case_number AS VARCHAR) AS case_number,
                ac.created_date,
                ac.updated_date,
                ac.stage_id,
                ac.stage 
            FROM tbl_arbitration_cases ac
            LEFT JOIN mmt_domain d ON ac.domain = d.domain_id  -- Assuming domain_id is the foreign key in lc
            LEFT JOIN mmt_sub_domain sd ON ac.sub_domain = sd.sub_domain_id
    
            UNION 
    
            SELECT 
                lc.organisation_id,
                lc.organisation_name,
                lc.case_id,
                -- Join to fetch the actual domain name from tbl_domains, replace NULL with 'Unknown'
                COALESCE(d.domain_name, '') AS domain,
                -- Join to fetch the actual sub-domain name from tbl_sub_domains
                COALESCE(sd.sub_domain_name, '') AS sub_domain,
                CAST(lc.cnr_number AS VARCHAR) AS cnr_number,
                CAST(lc.case_number AS VARCHAR) AS case_number,
                lc.created_date,
                lc.updated_date,
                lc.stage_id,
                lc.stage 
            FROM tbl_litigation_cases lc
            LEFT JOIN mmt_domain d ON lc.domain = d.domain_id  -- Assuming domain_id is the foreign key in lc
            LEFT JOIN mmt_sub_domain sd ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
            
            UNION
            
            SELECT 
                organisation_id,
                organisation_name,
                case_id,
                NULL as domain,
                NULL as sub_domain,
                NULL as cnr_number,
                NULL as case_number,
                created_date,
                updated_date,
                stage_id,
                stage 
            FROM tbl_conciliation_cases
        `;
    } else {
        query = `
             SELECT 
                ac.organisation_id,
                ac.organisation_name,
                ac.case_id,
                -- Join to fetch the actual domain name from tbl_domains
                COALESCE(d.domain_name, '') AS domain,
                -- Join to fetch the actual sub-domain name from tbl_sub_domains
                COALESCE(sd.sub_domain_name, '') AS sub_domain,
                CAST(ac.cnr_number AS VARCHAR) AS cnr_number,
                CAST(ac.case_number AS VARCHAR) AS case_number,
                ac.created_date,
                ac.updated_date,
                ac.stage_id,
                ac.stage 
            FROM tbl_arbitration_cases ac
            LEFT JOIN mmt_domain d ON ac.domain = d.domain_id  -- Assuming domain_id is the foreign key in lc
            LEFT JOIN mmt_sub_domain sd ON ac.sub_domain = sd.sub_domain_id
            WHERE organisation_id = @organisationID
    
            UNION 
    
           SELECT 
                lc.organisation_id,
                lc.organisation_name,
                lc.case_id,
                -- Join to fetch the actual domain name from tbl_domains, replace NULL with 'Unknown'
                COALESCE(d.domain_name, '') AS domain,
                -- Join to fetch the actual sub-domain name from tbl_sub_domains
                COALESCE(sd.sub_domain_name, '') AS sub_domain,
                CAST(lc.cnr_number AS VARCHAR) AS cnr_number,
                CAST(lc.case_number AS VARCHAR) AS case_number,
                lc.created_date,
                lc.updated_date,
                lc.stage_id,
                lc.stage 
            FROM tbl_litigation_cases lc
            LEFT JOIN mmt_domain d ON lc.domain = d.domain_id  -- Assuming domain_id is the foreign key in lc
            LEFT JOIN mmt_sub_domain sd ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
    
            WHERE organisation_id = @organisationID
    
            UNION
    
             SELECT 
                organisation_id,
                organisation_name,
                case_id,
                NULL as domain,
                NULL as sub_domain,
                NULL as cnr_number,
                NULL as case_number,
                created_date,
                updated_date,
                stage_id,
                stage 
            FROM tbl_conciliation_cases
            WHERE organisation_id = @organisationID
        `;
    }
    
    try {
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({error: "failed toload data" });
    }
};

const uploadDestination = './fileuploads/Court_Case';

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Court_Case");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function courtCaseUploadDocument(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const caseID = req.body.caseID;  
        
        const pathFolder = req.body.path;  
        // console.log("case ",caseID,"path ",pathFolder);
        const uploadDir = path.join(__dirname, "../../../fileuploads/Court_Case"); 

        request.input("caseID", caseID);

        if (pathFolder === 'Arbitration') {
            const fullPath = path.join(uploadDir, pathFolder);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }

            const existingDocResult = await request.query(`
                SELECT defence_doc_name FROM tbl_arbitration_cases 
                WHERE case_id = @caseID
            `);

            const existingFileName = existingDocResult.recordset[0]?.defence_doc_name;

            if (existingFileName) {
                const existingFilePath = path.join(fullPath, existingFileName);

                if (fs.existsSync(existingFilePath)) {
                    try {
                        fs.unlinkSync(existingFilePath);  
                        console.log(`Existing file ${existingFileName} deleted successfully.`);
                    } catch (err) {
                        console.error("Error deleting file:", err);
                    }
                }
            }

            const newFileName = req.uniqueFileName;  
            const newFilePath = path.join(fullPath, newFileName);

            request.input("newFileName", newFileName);

            if (req.file && req.file.path) {
                fs.renameSync(req.file.path, newFilePath); 
            } else {
                console.error("No file found in req.file or req.file.path");
            }

            const result = await request.query(`
                UPDATE tbl_arbitration_cases 
                SET defence_doc_name = @newFileName 
                WHERE case_id = @caseID
            `);
            res.status(201).json({ message: "Document uploaded and updated successfully." });
        } else {
            return res.status(400).json({ error: "Invalid path. Document upload is only allowed for 'Arbitration'." });
        }
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getUpdateCourtCase(req, res) {
    const courtCaseID = req.params.courtCaseID;

    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);
    try {
        const result = await request.query(`SELECT * FROM tbl_court_case WHERE tbl_court_case.court_case_id = @courtCaseID;`);

        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
};

async function createCourtCaseStage(req, res) {
    const courtCaseID = req.body.courtCaseID;
    const stage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();

    request.input("courtCaseID", courtCaseID);
    request.input("stage", stage);

    try {

        const checkResult = await request.query(`
        SELECT COUNT(*) AS recordCount
        FROM tbl_court_case_stage
        WHERE court_case_id = @courtCaseID
    `);

        if (checkResult.recordset[0].recordCount > 0) {

            const updateResult = await request.query(`
            UPDATE tbl_court_case_stage
            SET stage_name = @stage
            WHERE court_case_id = @courtCaseID
        `);
        } else {

            const insertResult = await request.query(`
            INSERT INTO tbl_court_case_stage (court_case_id, stage_name)
            VALUES (@courtCaseID, @stage);
        `);
        }
        res.sendStatus(201);
    }


    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
};


function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

async function getCaseDocuments(req, res) {
    const courtCaseID = req.params.courtCaseID;

    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);

    try {
        let result = await request.query(`SELECT * 
        FROM tbl_court_case_document WHERE court_id = @courtCaseID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteCaseDocuments(req, res) {
    try {

        const courtID = req.params.courtID;
        const conn = await pool;
        const request = conn.request();

        request.input("courtID", courtID);


        const result = await request.query(
            `SELECT ID,file_name FROM tbl_court_case_document WHERE ID = @courtID`
        );

        // console.log("result",result);

        const fileName = result.recordset[0].file_name;

        //const fileResult = await conn.query(`SELECT id FROM tbl_attendance WHERE file_name = '${fileName}'`);
        //const fileId = fileResult.recordset[0].id;

        if (fs.existsSync(`./fileuploads/Court_Case/${fileName}`)) {

            fs.unlink(`./fileuploads/Court_Case/${fileName}`, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                }
            });
        } else {
            console.log("File does not exist, no deletion needed");
        }

        let results = await request.query(`DELETE FROM tbl_court_case_document WHERE ID = @courtID`);

        res.status(201).send({ message: 'File and data deleted' });
    } catch (err) {
        // console.error(err);
        res.status(500).send({ message: err.message });
    }
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadCaseDocument(req, res) {
    try {
        const courtID = req.params.courtID;
        const conn = await pool;
        const request = conn.request();

        request.input("courtID", courtID);

        const result = await request.query(`SELECT file_name FROM tbl_court_case_document WHERE ID = @courtID`);
        const fileName = result.recordset[0].file_name;
        const file_path = path.join(__dirname, "../../../fileuploads/Court_Case", fileName);

        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);

        } else {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        // console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getCourtCaseReport(req, res) {
    try {
        
        const conn = await pool;
        const request = conn.request();
        
        const userID = req.params.userID;

        request.input("userID",userID );

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);
        
        const { role_id, organisation_id } = userResult.recordset[0];

        let result;
        if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5 || role_id === 8) {
             result = await conn.query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisation_id],
                    org.organisation_name AS [Organisation Name],
                    -- Count of Arbitration cases
                    (SELECT COUNT(case_id)
                     FROM tbl_arbitration_cases
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Arbitration,
                    -- Count of Conciliation cases
                    (SELECT COUNT(case_id)
                     FROM tbl_conciliation_cases
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Conciliation,
                    -- Count of Litigation cases
                    (SELECT COUNT(case_id)
                     FROM tbl_litigation_cases
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Litigation,

                      (SELECT COUNT(case_id)
                        FROM tbl_arbitration_cases
                        WHERE organisation_id = org.organisation_id
                        AND stage_id = 7
                        ) AS Inactive_Arbitration,

                        (SELECT COUNT(case_id)
                        FROM tbl_conciliation_cases
                        WHERE organisation_id = org.organisation_id
                        AND stage_id = 7
                        ) AS Inactive_Conciliation,
                        (SELECT COUNT(case_id)
                        FROM tbl_litigation_cases
                        WHERE organisation_id = org.organisation_id
                        AND stage_id = 7
                        ) AS Inactive_Litigation,
                    (
                        (SELECT COUNT(case_id)
                         FROM tbl_arbitration_cases
                         WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id)
                         FROM tbl_conciliation_cases
                         WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id)
                         FROM tbl_litigation_cases
                         WHERE organisation_id = org.organisation_id)
                    ) AS [Total Number of Cases]
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_court_case cc ON org.organisation_id = cc.organisation_id
                GROUP BY
                    org.organisation_id, org.organisation_name
                HAVING
                    (
                        (SELECT COUNT(case_id)
                         FROM tbl_arbitration_cases
                         WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id)
                         FROM tbl_conciliation_cases
                         WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id)
                         FROM tbl_litigation_cases
                         WHERE organisation_id = org.organisation_id)
                    ) > 0;
            `);
        } else {
            request.input("organisation_id", organisation_id);
             result = await request.query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisation_id],
                    org.organisation_name AS [Organisation Name],
                    -- Count of Arbitration cases
                    (SELECT COUNT(case_id) 
                     FROM tbl_arbitration_cases 
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Arbitration,
                    -- Count of Conciliation cases
                    (SELECT COUNT(case_id) 
                     FROM tbl_conciliation_cases 
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Conciliation,
                    -- Count of Litigation cases
                    (SELECT COUNT(case_id) 
                     FROM tbl_litigation_cases 
                     WHERE organisation_id = org.organisation_id AND (stage_id IS NULL OR stage_id <> 7)) AS Litigation,

                    (SELECT COUNT(case_id)
                    FROM tbl_arbitration_cases
                    WHERE organisation_id = org.organisation_id
                    AND stage_id = 7
                    ) AS Inactive_Arbitration,

                    (SELECT COUNT(case_id)
                    FROM tbl_conciliation_cases
                    WHERE organisation_id = org.organisation_id
                    AND stage_id = 7
                    ) AS Inactive_Conciliation,

                    (SELECT COUNT(case_id)
                    FROM tbl_litigation_cases
                    WHERE organisation_id = org.organisation_id
                    AND stage_id = 7
                    ) AS Inactive_Litigation,
                     (
                        (SELECT COUNT(case_id) 
                        FROM tbl_arbitration_cases 
                        WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id) 
                        FROM tbl_conciliation_cases 
                        WHERE organisation_id = org.organisation_id)
                        +
                        (SELECT COUNT(case_id) 
                        FROM tbl_litigation_cases 
                        WHERE organisation_id = org.organisation_id)
                    ) AS [Total Number of Cases]
                FROM 
                    mmt_organisation org
                LEFT JOIN 
                    tbl_court_case cc ON org.organisation_id = cc.organisation_id
                WHERE org.organisation_id = @organisation_id

                GROUP BY 
                    org.organisation_id, org.organisation_name;
            `);
        }

        const rowData = result.recordset;
        // console.log("rowData",rowData)

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                // minWidth: 500,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Total Number of Cases",
                field: "Total Number of Cases",
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Number of Active Cases",
                headerClass: "headercenter",
                cellStyle: { textAlign: 'center' },
                children: [
                    {
                        headerName: "Arbitration",
                        field: "Arbitration",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    },
                    {
                        headerName: "Conciliation",
                        field: "Conciliation",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    },
                    {
                        headerName: "Litigation",
                        field: "Litigation",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    }
                ]
            },
              {
                headerName: "Number of In Active Cases",
                headerClass: "headercenter",
                cellStyle: { textAlign: 'center' },
                children: [
                    {
                        headerName: "Arbitration",
                        field: "Inactive_Arbitration",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    },
                    {
                        headerName: "Conciliation",
                        field: "Inactive_Conciliation",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    },
                    {
                        headerName: "Litigation",
                        field: "Inactive_Litigation",
                        // minWidth: 280,
                        cellStyle: { textAlign: 'center' }
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getArbitrationDetailCourtCaseReport(req, res) {
    try {
        const organisationID = req.params.organisationID;
        const stageID = Number(req.params.stageID); // Convert to number

        if (![1, 7].includes(stageID)) {
            return res.status(400).json({ message: "Invalid stageID. Must be 1 (active) or 7 (inactive)." });
        }

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
        

        let query = '';

        if (stageID === 1) {
            // Active cases
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    ac.case_id AS [Case ID],
                    ac.case_number AS [Case Number],
                    LTRIM(RTRIM(REPLACE(cc.claimant, '|', ','))) AS [Claimant],
                    LTRIM(RTRIM(REPLACE(cc.respondents, '|', ','))) AS [Respondent],
                    ac.stage AS [Stage],
                    ac.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_arbitration_cases ac 
                    ON org.organisation_id = ac.organisation_id 
                    AND (ac.stage_id != 7 OR ac.stage_id IS NULL)
                LEFT JOIN
                    tbl_arbitration_claimants_respondents cc 
                    ON ac.case_id = cc.case_id
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        } else {
            // Inactive cases (stage_id = 7)
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    ac.case_id AS [Case ID],
                    ac.case_number AS [Case Number],
                    LTRIM(RTRIM(REPLACE(cc.claimant, '|', ','))) AS [Claimant],
                    LTRIM(RTRIM(REPLACE(cc.respondents, '|', ','))) AS [Respondent],
                    ac.stage AS [Stage],
                    ac.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_arbitration_cases ac 
                    ON org.organisation_id = ac.organisation_id 
                    AND ac.stage_id = 7
                LEFT JOIN
                    tbl_arbitration_claimants_respondents cc 
                    ON ac.case_id = cc.case_id
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        }

        const result = await request.query(query);
        const rowData = result.recordset;

        const columnDefs = [
            { headerName: "S.No", field: "S No", cellStyle: { textAlign: 'center' } },
            { headerName: "Case ID", field: "Case ID", cellStyle: { textAlign: 'center' } },
            { headerName: "Case Number", field: "Case Number" },
            { headerName: "Claimant", field: "Claimant" },
            { headerName: "Respondent", field: "Respondent" },
            { headerName: "Stage", field: "Stage" },
        ];

        if (rowData.length === 0) {
            return res.json({ message: 'No data available', columnDefs, rowData });
        }

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
}

async function deleteCourtCaseData(req, res) {
    try {
        const courtCaseId = req.params.caseID;
        const userID = req.params.userID;

        if (!courtCaseId) {
            return res.status(400).json({ error: "Invalid Case ID" });
        }

        const conn = await pool;
        const request = conn.request();

        if (courtCaseId.startsWith('AR')) {
            // Use named parameter for the query
            const result = await request
                .input('caseId', courtCaseId)
                .query('SELECT defence_doc_name FROM tbl_arbitration_cases WHERE case_id = @caseId');
            const defenceDocName = result.recordset[0]?.defence_doc_name;

            if (defenceDocName) {
                const filePath = path.join(__dirname, 'fileuploads', 'Court_Case', defenceDocName);
            
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); 
                    console.log(`File ${defenceDocName} deleted successfully.`);
                } else {
                    console.log(`File ${defenceDocName} not found.`);
                }
            }

            const deleteQueries = [
                'DELETE FROM tbl_arbitration_cases WHERE case_id = @caseId',
                'DELETE FROM tbl_arbitrators WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_hearing WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_interim_order WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_other_expense WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_prof_fee_la WHERE case_id = @caseId',
                'DELETE FROM tbl_court_cases_counsel_details WHERE case_id = @caseId',
                'DELETE FROM tbl_prev_conn_court_cases WHERE case_id = @caseId',
                'DELETE FROM tbl_party_requesting_arbitration WHERE case_id = @caseId'
            ];

            for (const query of deleteQueries) {
                await request.query(query);
            }

            res.status(200).send({ message: 'Court case and related data deleted successfully' });
        } else if(courtCaseId.startsWith('LI')){
            const result = await request
            .input('caseId', courtCaseId)

            .query('SELECT file_of_affidavit FROM tbl_litigation_cases WHERE case_id = @caseId');
            const counterAffidavitDocument = result.recordset[0]?.file_of_affidavit;
        if (counterAffidavitDocument) {
            const filePath = path.join(__dirname, 'affidavitFiles', 'counter_affidavit_Document', counterAffidavitDocument);
        
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                console.log(`File ${counterAffidavitDocument} deleted successfully.`);
            } else {
                console.log(`File ${counterAffidavitDocument} not found.`);
            }
        }
        const deleteQueries = [
            'DELETE FROM tbl_litigation_cases WHERE case_id = @caseId',
            'DELETE FROM tbl_prev_conn_court_cases WHERE case_id = @caseId',
            'DELETE FROM tbl_court_cases_counsel_details WHERE case_id = @caseId',
            'DELETE FROM tbl_court_case_om WHERE case_id = @caseId',
            'DELETE FROM tbl_court_case_interim_order WHERE case_id = @caseId',
            'DELETE FROM tbl_court_case_hearing WHERE case_id = @caseId',
            'DELETE FROM tbl_court_case_fee_expenses WHERE case_id = @caseId',
            'DELETE FROM tbl_court_case_other_expense WHERE case_id = @caseId',
            'DELETE FROM tbl_litigation_court_case_fee_expenses WHERE case_id = @caseId',

        ];
        for (const query of deleteQueries) {
            await request.query(query);
        }
        res.status(200).send({ message: 'Court case and related data deleted successfully' });

     }else if(courtCaseId.startsWith('CO')){

                const result = await request
                .input('caseId', courtCaseId)

            const deleteQueries = [
                'DELETE FROM tbl_conciliation_cases WHERE case_id = @caseId',
                'DELETE FROM tbl_prev_conn_court_cases WHERE case_id = @caseId',
                'DELETE FROM tbl_conciliators WHERE case_id = @caseId',
                'DELETE FROM tbl_claim_first_parties WHERE case_id = @caseId',
                'DELETE FROM tbl_claim_second_parties WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_hearing_for_conciliation WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_conciliation_expenses WHERE case_id = @caseId',
                'DELETE FROM tbl_court_case_other_expense WHERE case_id = @caseId',

            ];
            for (const query of deleteQueries) {
                await request.query(query);
            }
            res.status(200).send({ message: 'Court case and related data deleted successfully' });
        }
    } catch (err) {
        // console.error(err);
        res.status(500).send({ message: err.message });
    }
}


async function getActDropDownData(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {
        let result = await request.query(`SELECT * 
            FROM mmt_court_case_acts`);
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}

async function getRuleDropDownData(req, res) {
    const actID = req.params.actID;
    const conn = await pool;
    const request = conn.request();
    request.input("actID", actID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_case_rules WHERE act_id = @actID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}

async function getSubCourtTypeDropDown(req, res) {
    const courtTypeID = req.params.courtTypeID;
    const conn = await pool;
    const request = conn.request();
    request.input("courtTypeID", courtTypeID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_sub_type WHERE court_type_id = @courtTypeID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}

async function getConsumerForumDropDown(req, res) {
    const consumerTypeID = req.params.consumerTypeID;
    const conn = await pool;
    const request = conn.request();
    request.input("consumerTypeID", consumerTypeID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_consumer_sub_type WHERE consumer_type_id = @consumerTypeID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.sendStatus(500);
    }
}

async function addOtherRespondentOrg(req, res) {
    const { otherOrg } = req.body;

    if (!Array.isArray(otherOrg) || otherOrg.length === 0) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const conn = await pool;

    try {
        const existingOrgNames = [];

        //check which organisations already exist in the database
        const placeholders = otherOrg.map((_, index) => `@organisationName${index}`).join(', ');
        const selectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            selectRequest.input(`organisationName${index}`, orgName);
        });

        const result = await selectRequest.query(
            `SELECT organisation_name FROM mmt_arbitration_respondent WHERE organisation_name IN (${placeholders})`
        );

        // Extract the existing organisation names from the result
        result.recordset.forEach(row => existingOrgNames.push(row.organisation_name));

        // Insert new organisations that don't already exist
        for (const orgName of otherOrg) {
            if (!existingOrgNames.includes(orgName)) {
                const request = conn.request();
                request.input("organisationName", orgName);
                await request.query(`INSERT INTO mmt_arbitration_respondent (organisation_name,status) VALUES (@organisationName ,1) `);
            }
        }

        // Fetch and return the organisation IDs for all input organisations (including both new and existing ones)
        const finalSelectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            finalSelectRequest.input(`organisationName${index}`, orgName);
        });

        const finalResult = await finalSelectRequest.query(
            `SELECT organisation_id, organisation_name FROM mmt_arbitration_respondent WHERE organisation_name IN (${placeholders})`
        );

        res.json(finalResult.recordset);
    } catch (err) {
        // Log the error for debugging purposes (optional)
        // console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getDefenceStatDoc(req,res) {
    const caseID = req.params.caseID;
    try {
        // console.log("caseID",caseID)
        const conn = await pool;
        const request = conn.request();
        request.input("caseID", caseID);

        let result = await request.query(`SELECT case_id,defence_doc_name
            FROM tbl_arbitration_cases WHERE case_id = @caseID ;`)
            res.json(result.recordset);
            // console.log("result",result)
    } catch (error) {
        // console.log("error",error)
        return res.status(500).json({error: "Internal server error" });
    }    
}

async function deleteMinistryDefenceDocument(req, res) {
    const caseID = req.params.caseID;
    const defenceFile = req.params.defenceFile;
    
    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    request.input("defenceFile", defenceFile);

    try {
        const checkResult = await request.query(`SELECT case_id,defence_doc_name FROM tbl_arbitration_cases WHERE case_id = @caseID`);
     
        if (checkResult.recordset.length > 0) {
            await request.query(`UPDATE tbl_arbitration_cases SET defence_doc_name = NULL WHERE case_id = @caseID AND defence_doc_name = @defenceFile`);
            const fileDeleted = deleteFile(defenceFile);
            if (fileDeleted) {
                return res.status(200).json({ message: "Document and file deleted successfully." });
            } else {
                return res.status(500).json({ error: "File deletion failed" });
            }
        } else {
            const fileDeleted = deleteFile(defenceFile);
            if (fileDeleted) {
                return res.status(200).json({ message: "File deleted successfully" });
            } else {
                return res.status(404).json({ error: "File not found " });
            }
        }
    } catch (err) {
        // console.log(err);
        return res.status(500).json({error: "Internal server error" });
    }
}


function deleteFile(fileName) {
    try{
        if (fileName) {
            const filePath = `./fileuploads/Court_Case/Arbitration/${fileName}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                return true; 
            }else {
                return false;
            }
        }     
    }catch(error){
        console.error("Error deleting file:", error);
        return false;
    }
}

async function getConciliationDetailCourtCaseReport(req,res) {
    try {
        const organisationID = req.params.organisationID;
        const stageID = Number(req.params.stageID); // Convert to number

        if (![1, 7].includes(stageID)) {
            return res.status(400).json({ message: "Invalid stageID. Must be 1 (active) or 7 (inactive)." });
        }

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        let query = '';

        if (stageID === 1) {
            // Active cases
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    con.case_id AS [Case ID],
                    (SELECT STRING_AGG(first_party, ',') 
                     FROM tbl_conciliation_first_second_parties 
                     WHERE case_id = con.case_id) AS [First Party],
                    (SELECT STRING_AGG(second_party, ',') 
                     FROM tbl_conciliation_first_second_parties 
                     WHERE case_id = con.case_id) AS [Second Party],
                    con.stage AS [Stage],
                    con.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_conciliation_cases con 
                    ON org.organisation_id = con.organisation_id 
                    AND (con.stage_id != 7 OR con.stage_id IS NULL)
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        } else {
            // Inactive cases
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    con.case_id AS [Case ID],
                    (SELECT STRING_AGG(first_party, ',') 
                     FROM tbl_conciliation_first_second_parties 
                     WHERE case_id = con.case_id) AS [First Party],
                    (SELECT STRING_AGG(second_party, ',') 
                     FROM tbl_conciliation_first_second_parties 
                     WHERE case_id = con.case_id) AS [Second Party],
                    con.stage AS [Stage],
                    con.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_conciliation_cases con 
                    ON org.organisation_id = con.organisation_id 
                    AND con.stage_id = 7
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        }

        const result = await request.query(query);
        const rowData = result.recordset;
        let columnDefs = [
            {
                headerName: "S.No",
                field: "S No",
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Case ID",
                field: "Case ID",
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "First Party",
                field: "First Party",
                // width: 400,
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Second Party",
                field: "Second Party",
                width: 400, 
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Stage",
                field: "Stage",
                width: 400,
                cellStyle: { textAlign: 'center' } 
            },
        ];
        if (rowData.length === 0) {
            // console.log("no data available");
            return res.json({ message: 'No data available', columnDefs,rowData });
        }

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
}

async function getLitigationcourtcasesReport(req, res) {
    try {
        const organisationID = req.params.organisationID;
        
        const stageID = Number(req.params.stageID); 

        if (![1, 7].includes(stageID)) {
            return res.status(400).json({ message: "Invalid stageID. Must be 1 (active) or 7 (inactive)." });
        }

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
    

        let query = '';

        if (stageID === 1) {
            // Active cases
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    lc.case_id AS [Case ID],
                    lc.case_number AS [Case Number],
                    (SELECT STRING_AGG(petitioners, ',') 
                     FROM tbl_litigation_pettioners_respondents 
                     WHERE case_id = lc.case_id) AS [Petitioner],
                    (SELECT STRING_AGG(respondents, ',') 
                     FROM tbl_litigation_pettioners_respondents 
                     WHERE case_id = lc.case_id) AS [Respondent],
                    lc.stage AS [Stage],
                    lc.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_litigation_cases lc ON org.organisation_id = lc.organisation_id 
                    AND (lc.stage_id != 7 OR lc.stage_id IS NULL)
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        } else {
            // Inactive cases
            query = `
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [Organisation ID],
                    org.organisation_name AS [Organisation Name],
                    lc.case_id AS [Case ID],
                    lc.case_number AS [Case Number],
                    (SELECT STRING_AGG(petitioners, ',') 
                     FROM tbl_litigation_pettioners_respondents 
                     WHERE case_id = lc.case_id) AS [Petitioner],
                    (SELECT STRING_AGG(respondents, ',') 
                     FROM tbl_litigation_pettioners_respondents 
                     WHERE case_id = lc.case_id) AS [Respondent],
                    lc.stage AS [Stage],
                    lc.stage_id
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_litigation_cases lc ON org.organisation_id = lc.organisation_id 
                    AND lc.stage_id = 7
                WHERE
                    org.organisation_id = @organisationID
                ORDER BY
                    org.organisation_id;
            `;
        }

        const result = await request.query(query);
        const rowData = result.recordset;
        let columnDefs = [
            {
                headerName: "S.No",
                field: "S No",
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Case ID",
                field: "Case ID",
                // width: 350,
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Case Number",
                field: "Case Number",
                // width: 350, 
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Petitioner",
                field: "Petitioner",
                // width: 350,
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Respondent",
                field: "Respondent",
                // width: 350,
                cellStyle: { textAlign: 'center' } 
            },
            {
                headerName: "Stage",
                field: "Stage",
                // width: 350,
                cellStyle: { textAlign: 'center' } 
            },
        ] 
        if (rowData.length === 0) {
            // console.log("no data available");
            return res.json({ message: 'No data available', columnDefs,rowData });
        }

        return res.json({ columnDefs, rowData });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
    
}


async function addArbitrationClaimantAndRespondent(req, res) {
    const { caseID, claimants, respondents } = req.body;

    const conn = await pool;
    const request = conn.request();

    const petitionerStr = claimants.join('|');
    const respondentStr = respondents.join('|');

    try {
        const checkCaseIdQuery = `SELECT * FROM tbl_arbitration_claimants_respondents WHERE case_id = @caseID`;
        request.input("caseID", caseID);
        const checkResult = await request.query(checkCaseIdQuery);

        // If data exists for this caseID, delete it
        if (checkResult.recordset.length > 0) {
            const deleteQuery = `DELETE FROM tbl_arbitration_claimants_respondents WHERE case_id = @caseID`;
            await request.query(deleteQuery);
        }

        const insertQuery = `
            INSERT INTO tbl_arbitration_claimants_respondents (case_id, claimant, respondents)
            VALUES (@caseID, @claimants, @respondents)
        `;
        await request
            .input("claimants", petitionerStr)
            .input("respondents", respondentStr)
            .query(insertQuery);

        return res.status(201).json({ message: "Inserted successfully" });

    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function getArbitrationClaimantAndRespondent(req,res){
    const caseID = req.params.caseID;
    
    if (!caseID || caseID == null) {
        return res.status(400).json({ error: "Invalid case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    try{
    let caseQuery = `SELECT * FROM tbl_arbitration_claimants_respondents WHERE case_id = @caseID`;
      
    const result = await request.query(caseQuery);
    res.json(result.recordset);
    }catch (err) {
        // console.error("Error ", err);
        res.status(500).json({ error: "failed to fetch table data" });
    }
}

export default {
    getCourtCase, getUpdateCourtCase, createCourtCaseStage, upload, getCaseDocuments,
    deleteCaseDocuments, downloadCaseDocument,
    getCourtCaseReport, getArbitrationDetailCourtCaseReport,
    deleteCourtCaseData, getActDropDownData, getRuleDropDownData, getSubCourtTypeDropDown, 
    getConsumerForumDropDown, fetchLastCaseNumber,addOtherClaimantOrg,addOtherRespondentOrg,addDetailsOfCounsel, 
    courtCaseUploadDocument,addPrevConnCases,createArbitCourtCase,addHearingCases, addInterimOrder, updateArbitCourtCaseStatus, addArbitFeeExpenseData, addProfOtherExpenseData, getCourtCaseDataByID, getSubTableCourtCaseData,
    getDefenceStatDoc,deleteMinistryDefenceDocument,getConciliationDetailCourtCaseReport,getLitigationcourtcasesReport,addArbitrationClaimantAndRespondent,getArbitrationClaimantAndRespondent
}