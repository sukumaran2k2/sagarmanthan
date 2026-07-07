import { pool } from "../../db.js";

//generateUniqueConciliationCaseId
async function getLastConciliationNumber(req,res){
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`SELECT TOP 1 case_id FROM tbl_conciliation_cases WHERE organisation_id = @organisationID ORDER BY id DESC`);
        // console.log(result)
        res.json(result.recordset);
        
    }
    catch (err) {
        // console.log(err);
        return res.status(500).json({message: 'Internal Server Error'})
    }
}

//add conciliators data
async function addConciliatorsData(req,res) {
    const {caseID,conciliatorsData} =req.body;

    if (!caseID || !Array.isArray(conciliatorsData) || conciliatorsData.length === 0) {
        return res.status(400).json({ error: "Invalid conciliatorsData" });
    }

    const conn = await pool;
    const request = conn.request(); 

    let checkCaseId = `SELECT * FROM tbl_conciliators WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        let checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_conciliators WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }

         // If existing records found, delete them
         if (checkResult.recordset.length > 0) {
            const deleteExistingDataQuery = `
                DELETE FROM tbl_conciliators WHERE case_id = @caseID;
            `;
            await request.query(deleteExistingDataQuery);
        }

        for (const caseData of conciliatorsData) {
            const request = conn.request();  
            
            request.input("caseID", caseID);
            request.input("nameOfConciliator", caseData.nameOfConciliator); 
            request.input("designationCapacity", caseData.designationCapacity); 
           
            await request.query(`
                INSERT INTO tbl_conciliators (case_id, name, designation_capacity) 
                VALUES (@caseID, @nameOfConciliator, @designationCapacity)
            `);
        }

        res.status(201).json({ message: "conciliators Data added successfully." });
    } catch (err) {
        // console.log(err);
        return res.status(500).json({ err: "Failed to add conciliators Data" });
    }
}

//first party data
async function addConciliationFirstParty(req, res) {
    const { caseID, firstPartiesData } = req.body;

    // Validate input
    if (!Array.isArray(firstPartiesData) || firstPartiesData.length === 0) {
        return res.status(400).json({ error: "Invalid firstPartiesdata" });
    }

    const conn = await pool;
    const request = conn.request();

    const checkCaseId = `SELECT * FROM tbl_claim_first_parties WHERE case_id = @caseID;`;
    request.input("caseID", caseID);

    try {
    
        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length > 0) {
            const deleteExistingData = `DELETE FROM tbl_claim_first_parties WHERE case_id = @caseID;`;
            await request.query(deleteExistingData);
        }

        for (const caseData of firstPartiesData) {
            const request = conn.request();   

            request.input("caseID", caseID);
            request.input("firstClaimDescription", caseData.firstClaimDescription);
            request.input("firstPartyclaimAmount", caseData.firstPartyclaimAmount);
     
            await request.query(`
                INSERT INTO tbl_claim_first_parties (case_id, short_description, amount) 
                VALUES (@caseID, @firstClaimDescription, @firstPartyclaimAmount)
            `);

        }

        return res.status(201).json({ message: "first Parties Data added successfully." });
    } catch (err) {
        // console.log(err);
        return res.status(500).json({ err: "Failed to add first parties" });
    }
}

//Second party data
async function addSecondPartyData(req,res) {
    const {caseID,secondPartiesdata} =req.body;

    if (!caseID || !Array.isArray(secondPartiesdata) || secondPartiesdata.length === 0) {
        return res.status(400).json({ error: "Invalid secondPartiesdata" });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_claim_second_parties WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_claim_second_parties WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }
        
        for (const caseData of secondPartiesdata) {
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("secondClaimDescription", caseData.secondClaimDescription); 
            request.input("secondPartyclaimAmount", caseData.secondPartyclaimAmount); 
           
            await request.query(`
                INSERT INTO tbl_claim_second_parties (case_id, second_short_desc, amount) 
                VALUES (@caseID, @secondClaimDescription, @secondPartyclaimAmount)
            `);
        }
        return res.status(201).json({ message: "secondParties Data added successfully." });
    } catch (err) {
        // console.log(err);
        return res.status(500).json({err: "failed to add second parties"});
    }
}

//addConciliationPrevConnCases
async function addConciliationPrevConnCases(req, res) {
    const { caseID, prevConnCaseData } = req.body;

    if (!caseID ||!Array.isArray(prevConnCaseData) || prevConnCaseData.length === 0) {
        return res.status(400).json({ error: "Invalid prevConnCaseData" });
    }

    const conn = await pool;
    const request = conn.request();

    const checkCaseId = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseId);

            if (checkResult.recordset.length != 0) {
                let deleteExistingData = `DELETE tbl_prev_conn_court_cases WHERE case_id = @caseID`;
                await request.query(deleteExistingData);
            }
        for (const caseData of prevConnCaseData) {
            const request = conn.request();    
            
            request.input("caseID", caseID); 
            request.input("prevConnectedCourt", caseData.prevConnectedCourt); 
            request.input("prevConnectedCaseNumber", caseData.prevConnectedCaseNumber); 
            request.input("prevConnectedCNRNumber", caseData.prevConnectedCNRNumber); 
            request.input("courtStatus", caseData.courtStatus); 
            request.input("description", caseData.description); 

            await request.query(`
                INSERT INTO tbl_prev_conn_court_cases (case_id, prev_conn_case_court_name, prev_conn_case_no, prev_conn_cnr_no, case_status, details) 
                VALUES (@caseID, @prevConnectedCourt, @prevConnectedCaseNumber, @prevConnectedCNRNumber, @courtStatus, @description)
            `);
        }

        return res.status(201).json({ message: "Previous connected cases added successfully." });
    } catch (err) {
        // console.log(err);
        return res.status(500).json({err: "failed to add details Previous connected cases" });
    }
}


async function addConciliationOtherCourtCaseOrg(req, res) {
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
            `SELECT organisation_name FROM mmt_conciliation_first_party WHERE organisation_name IN (${placeholders})`
        );

        // Extract the existing organisation names from the result
        result.recordset.forEach(row => existingOrgNames.push(row.organisation_name));

        // Insert new organisations that don't already exist
        for (const orgName of otherOrg) {
            if (!existingOrgNames.includes(orgName)) {
                const request = conn.request();
                request.input("organisationName", orgName);
                await request.query(`INSERT INTO mmt_conciliation_first_party (organisation_name,status) VALUES (@organisationName ,1) `);
            }
        }

        // Fetch and return the organisation IDs for all input organisations (including both new and existing ones)
        const finalSelectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            finalSelectRequest.input(`organisationName${index}`, orgName);
        });

        const finalResult = await finalSelectRequest.query(
            `SELECT organisation_id, organisation_name FROM mmt_conciliation_first_party WHERE organisation_name IN (${placeholders})`
        );

        res.json(finalResult.recordset);
    } catch (err) {
        // Log the error for debugging purposes (optional)
        // console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


//submit conciliationCourtCase
async function createConciliationCourtCase(req, res) {
    const {
        caseID,
        dateOfRequestConciliation,
        dateOFReferenceConciliators,
        deptDivision,
        prevConnCaseOrNot,
        caseName,
        organisationID,
        userID,
        organisationName
    } = req.body;

    
    const conn = await pool;
    const request = conn.request();

    const deptDivisionStr = deptDivision.join(',');

    let checkQuery = `SELECT * FROM tbl_conciliation_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkQuery);
        if (checkResult.recordset.length != 0) {
            // Update existing case
            const updateQuery = `
                UPDATE tbl_conciliation_cases SET
                date_of_request_conciliation = @dateOfRequestConciliation,
                date_of_reference_to_conciliators = @dateOFReferenceConciliators,
                dept_division = @deptDivision,
                is_pre_conn_case = @prevConnCaseOrNot,
                case_name = @caseName,
                updated_by = @userID,
                updated_date = GETDATE()
                WHERE case_id = @caseID
            `;

            await request
            .input("dateOfRequestConciliation", dateOfRequestConciliation)
            .input("dateOFReferenceConciliators", dateOFReferenceConciliators)
            .input("deptDivision", deptDivisionStr)
            .input("prevConnCaseOrNot", prevConnCaseOrNot)
            .input("caseName",caseName)
            .input("userID", userID)
            .query(updateQuery);
            res.status(201).json({ message: "Case updated successfully" });

        } else {
            // Insert new case
        const conciliationInsertQuery = `
        INSERT INTO tbl_conciliation_cases(
        case_id, 
        date_of_request_conciliation, date_of_reference_to_conciliators,
        dept_division, is_pre_conn_case,case_name, created_date,
        created_by, organisation_id, organisation_name
        ) 
        OUTPUT INSERTED.case_id
        VALUES 
        (@caseID, 
        @dateOfRequestConciliation, @dateOFReferenceConciliators,
        @deptDivision, @prevConnCaseOrNot, @caseName, GETDATE(),
        @userID, @organisationID, @organisationName
        )`;

        const result = await request
        .input("dateOfRequestConciliation", dateOfRequestConciliation)
        .input("dateOFReferenceConciliators", dateOFReferenceConciliators)
        .input("deptDivision", deptDivisionStr)
        .input("prevConnCaseOrNot", prevConnCaseOrNot)
        .input("caseName", caseName)
        .input("userID", userID)
        .input("organisationID", organisationID)
        .input("organisationName", organisationName)
        .query(conciliationInsertQuery);
        return res.status(201).json({ result });
        }
    } catch (error) {
        console.log("Database error:", error);
        return res.status(500).json({ message: 'Failed to create or update conciliation court case' });
    }
}

// addConciliatorsHearingData
async function addConciliatorsHearingData(req, res) {
    const { caseID, conciliatorsHearingData } = req.body;

    if (!Array.isArray(conciliatorsHearingData) || conciliatorsHearingData.length === 0) {
        return res.status(400).json({ error: "Invalid ConciliatorsHearingData" });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_court_case_hearing_for_conciliation WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_court_case_hearing_for_conciliation WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }

        for (const caseData of conciliatorsHearingData) {
            const request = conn.request(); 

            request.input("caseID", caseID);
            request.input("dateOfHearing", caseData.dateOfHearing); 
            request.input("nameOfConciliator", caseData.nameOfConciliator); 
            request.input("nameOfParties", caseData.nameOfParties);
            request.input("location", caseData.location); 
            request.input("detailsOfHearing", caseData.detailsOfHearing); 
            request.input("outcomeOfHearing", caseData.outcomeOfHearing); 

            await request.query(`
                INSERT INTO tbl_court_case_hearing_for_conciliation (case_id, date_of_hearing, name_of_conciliators, name_of_parties, location, details_of_hearing,outcome_hearing) 
                VALUES (@caseID, @dateOfHearing, @nameOfConciliator,@nameOfParties, @location, @detailsOfHearing, @outcomeOfHearing)
            `);
        }

        return res.status(201).json({ message: "ConciliatorsHearingData added successfully." });
    } catch (error) {
        // console.error(error.message)
        return res.status(500).json({message: 'Failed to add ConciliatorsHearingData case'})
    }
}

// createConciliationStatus
async function createConciliationStatus(req,res) {

    const {caseID,conciliatorsHearingCaseOrNot,isOutcomeOrNot,amountPayable,amountpaySectoOne,
        secDescription, amountpayOnetoSec, oneDescription,reasonForFailure,iscompRequiredOrNot,
        requiredBy,brief,lastDateCompbyOne,dateOfCompbyOne,lastDateCompbySec,dateOfCompbySec,
        complainceDoneOrNot, userID, stageID,stage
    } = req.body;

    const conn = await pool;
    const request = conn.request();

    let checkQuery = `SELECT * FROM tbl_conciliation_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length != 0){
                const updateQuery = `
                UPDATE tbl_conciliation_cases 
                SET
                 is_hearing_started =@conciliatorsHearingCaseOrNot,
                 is_outcome = @isOutcomeOrNot,
                 amount_payable_to = @amountPayable,
                 amount_pay_to_sec_to_one = @amountpaySectoOne,
                 desc_of_sec_to_one = @secDescription,
                 amount_pay_to_one_to_sec = @amountpayOnetoSec,
                 desc_of_one_to_sec = @oneDescription,
                 reason_fail_desc = @reasonForFailure,
                 is_complaince_required = @iscompRequiredOrNot,
                 required_by = @requiredBy,
                 brief_of_complaince = @brief,
                 last_date_comp_by_one = @lastDateCompbyOne,
                 date_of_comp_by_of_one = @dateOfCompbyOne,
                 last_date_comp_by_two = @lastDateCompbySec ,
                 date_of_comp_by_of_two = @dateOfCompbySec,
                 is_complaince_Done = @complainceDoneOrNot,
                 stage_id = @stageID,
                 stage = @stage,
                 updated_by = @userID,
                 updated_date = GETDATE()
                 WHERE case_id = @caseID
                `;
                

                await request
                .input("conciliatorsHearingCaseOrNot",conciliatorsHearingCaseOrNot)
                .input("isOutcomeOrNot",isOutcomeOrNot)
                .input("amountPayable",amountPayable)
                .input("amountpaySectoOne",amountpaySectoOne)
                .input("secDescription",secDescription)
                .input("amountpayOnetoSec",amountpayOnetoSec)
                .input("oneDescription",oneDescription)
                .input("reasonForFailure",reasonForFailure)
                .input("iscompRequiredOrNot",iscompRequiredOrNot)
                .input("requiredBy",requiredBy)
                .input("brief",brief)
                .input("lastDateCompbyOne",lastDateCompbyOne)
                .input("dateOfCompbyOne",dateOfCompbyOne)
                .input("lastDateCompbySec",lastDateCompbySec)
                .input("dateOfCompbySec",dateOfCompbySec)
                .input("complainceDoneOrNot",complainceDoneOrNot)
                .input("stageID", stageID)
                .input("stage",stage)
                .input("userID",userID)
                .query(updateQuery);

                const result = await request.query(updateQuery);
                
                res.status(201).json(result); 
        }

    }  catch (error) {
        console.error("Error: ", error);
        return res.status(500).json({ message: 'Failed to create conciliation status case', error: error.message });
    }
    
}
        

async function addFeeExpensesdetails(req,res) {

    const {caseID,feeExpensesdata} = req.body;
    
    if (!caseID ||!Array.isArray(feeExpensesdata) || feeExpensesdata.length === 0) {
        return res.status(400).json({ error: "Invalid feeExpensesdata" });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_court_case_conciliation_expenses WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_court_case_conciliation_expenses WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }

    for(const caseData of feeExpensesdata){
        const request = conn.request();

        request.input("caseID", caseID);
        request.input("name",caseData.name);
        request.input("firstPartyAmount",caseData.firstPartyAmount);
        request.input("secondPartyAmount",caseData.secondPartyAmount);
        request.input("date",caseData.date);

    await request.query(`
        INSERT INTO tbl_court_case_conciliation_expenses(case_id,name_of_conciliator,amount_by_first_party,amount_by_second_party,date_of_payment)
        VALUES (@caseID,@name,@firstPartyAmount,@secondPartyAmount,@date
        )`);
    }
        return res.status(201).json({ message: "feeExpensesdata added successfully." });
} catch (error) {
    // console.error(error.message)
    return res.status(500).json({message: 'Failed to add feeExpensesdata case'})
}

}
async function addOtherExpensesdetails(req,res) {

const { caseID, otherExpensesdata } = req.body;

if (!caseID || !Array.isArray(otherExpensesdata) || otherExpensesdata.length === 0) {
    return res.status(400).json({ error: "Invalid otherExpensesdata" });
}

const conn = await pool;
const request = conn.request(); 

const checkCaseId = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
request.input("caseID", caseID);

try {
    const checkResult = await request.query(checkCaseId);

    if (checkResult.recordset.length != 0) {
        let deleteExistingData = `DELETE tbl_court_case_other_expense WHERE case_id = @caseID`;
        await request.query(deleteExistingData);
    }

    for(const caseData of otherExpensesdata){
        const request = conn.request(); 

        request.input("caseID", caseID);
        request.input("natureOfExpense",caseData.natureOfExpense);
        request.input("totalExpenses",caseData.totalExpenses);
        request.input("dateOfPay",caseData.dateOfPay);

        await request.query(`
            INSERT INTO tbl_court_case_other_expense(case_id,nature_of_expense,other_expense_amount,date_of_payment)
            VALUES (@caseID,@natureOfExpense,@totalExpenses,@dateOfPay)
            `);
    }
    return res.status(201).json({ message: "otherExpensesdata added successfully." });
} catch (error) {
    // console.error(error.message)
    return res.status(500).json({message: 'Failed to add otherExpensesdata case'})
}

}

async function createConciliationExpenditure(req,res) {

   const {caseID,userID} = req.body;

   const conn = await pool;
   const request = conn.request();
   
   try {

    let checkQuery = `SELECT * FROM tbl_conciliation_cases WHERE case_id = @caseID`;
        request.input("caseID", caseID);

        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length != 0){
            try {
                const updateQuery = `
                UPDATE tbl_conciliation_cases
                SET updated_by = @userID,
                updated_date = GETDATE()
                WHERE case_id = @caseID
                `;

                await conn.request()
                .input("userID", userID)
                .input("caseID", caseID)
                .query(updateQuery);
            } catch (error) {
                return res.status(500).json({error: "Failed updating data"})
            }
        }
        res.status(201).json({ message: "updated conciliation expenditure successfully." });
        } catch (error) {
            res.status(500).json({ error: "failed to create conciliation expenditure" });
        }
        
    }



    async function getSubTablesCourtCaseData(req,res){
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
             if(typeName == 'PCC'){
                caseQuery = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
            }else if(typeName == 'profExp'){
                caseQuery = `SELECT * FROM tbl_court_case_conciliation_expenses WHERE case_id = @caseID`;
            }else if(typeName == 'otherExp'){
                caseQuery = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
            }else if(typeName == 'conciliator'){
                caseQuery = `SELECT * FROM tbl_conciliators WHERE case_id = @caseID`
            }else if(typeName == 'firstParties'){
                caseQuery = `SELECT * FROM tbl_claim_first_parties WHERE case_id = @caseID`
            }else if(typeName == 'secondParties'){
                caseQuery = `SELECT * FROM tbl_claim_second_parties WHERE case_id = @caseID`
            }else if(typeName == 'Hearing'){
                caseQuery = `SELECT * FROM tbl_court_case_hearing_for_conciliation WHERE case_id = @caseID`
            }
    
            const result = await request.query(caseQuery);
    
            res.json(result.recordset);
        }
        catch (err) {
            res.status(500).json({ error: "failed to fetch sub table data" });
        }
    }


    async function addConciliationOtherSecondParty(req, res) {
        const { otherOrg } = req.body;
        console.log("req.body",req.body)
    
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
                `SELECT organisation_name FROM mmt_conciliation_second_party WHERE organisation_name IN (${placeholders})`
            );
    
            // Extract the existing organisation names from the result
            result.recordset.forEach(row => existingOrgNames.push(row.organisation_name));
    
            // Insert new organisations that don't already exist
            for (const orgName of otherOrg) {
                if (!existingOrgNames.includes(orgName)) {
                    const request = conn.request();
                    request.input("organisationName", orgName);
                    await request.query(`INSERT INTO mmt_conciliation_second_party (organisation_name,status) VALUES (@organisationName ,1) `);
                }
            }
    
            // Fetch and return the organisation IDs for all input organisations (including both new and existing ones)
            const finalSelectRequest = conn.request();
            otherOrg.forEach((orgName, index) => {
                finalSelectRequest.input(`organisationName${index}`, orgName);
            });
    
            const finalResult = await finalSelectRequest.query(
                `SELECT organisation_id, organisation_name FROM mmt_conciliation_second_party WHERE organisation_name IN (${placeholders})`
            );
    
            res.json(finalResult.recordset);
        } catch (err) {
            // Log the error for debugging purposes (optional)
            // console.log(err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }

async function addConciliationFirstPartyAndSecondParty(req,res) {
    const { caseID, firstParty, secondParty } = req.body;

    const conn = await pool;
    const request = conn.request();

    const firstPartyStr = firstParty.join('|');
    const secondPartyStr = secondParty.join('|');

    try {
        const checkCaseIdQuery = `SELECT * FROM tbl_conciliation_first_second_parties WHERE case_id = @caseID`;
        request.input("caseID", caseID);
        const checkResult = await request.query(checkCaseIdQuery);

        // If data exists for this caseID, delete it
        if (checkResult.recordset.length > 0) {
            const deleteQuery = `DELETE FROM tbl_conciliation_first_second_parties WHERE case_id = @caseID`;
            await request.query(deleteQuery);
        }

        const insertQuery = `
            INSERT INTO tbl_conciliation_first_second_parties (case_id, first_party, second_party)
            VALUES (@caseID, @firstParty, @secondParty)
        `;
        await request
            .input("firstParty", firstPartyStr)
            .input("secondParty", secondPartyStr)
            .query(insertQuery);

        return res.status(201).json({ message: "Inserted successfully" });

    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
async function getConciliationFirstPartyAndSecondParty(req,res) {
    const caseID = req.params.caseID;
    
    if (!caseID || caseID == null) {
        return res.status(400).json({ error: "Invalid case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    try{
    let caseQuery = `SELECT * FROM tbl_conciliation_first_second_parties WHERE case_id = @caseID`;
      
    const result = await request.query(caseQuery);
    res.json(result.recordset);
    }catch (err) {
        // console.error("Error ", err);
        res.status(500).json({ error: "failed to fetch table data" });
    }
}

export default {getLastConciliationNumber,addConciliationPrevConnCases,addConciliatorsData,
    addConciliationFirstParty,addSecondPartyData,addConciliationOtherCourtCaseOrg,createConciliationCourtCase,
    addConciliatorsHearingData,createConciliationStatus,createConciliationExpenditure,addOtherExpensesdetails,
    addFeeExpensesdetails,getSubTablesCourtCaseData,addConciliationOtherSecondParty,addConciliationFirstPartyAndSecondParty,getConciliationFirstPartyAndSecondParty
}