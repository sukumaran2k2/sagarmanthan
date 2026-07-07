import { pool } from "../../db.js";
import sql from 'mssql';



async function createHRTraining(req, res) {
    let {
        trainingTitle,otherTitleName,trainingType,otherTypeName,fromDate, toDate, trainingSource,
        outsideAgencyName, country, location, expenditure,
        participantData, organisationID, userID,numberOfParticipant
    } = req.body;
    

    const conn = await pool;
    const transaction = new sql.Transaction(conn);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        request.input("trainingType", sql.Int, trainingType);
        request.input("otherTypeName", sql.NVarChar, otherTypeName);
        request.input("fromDate", sql.Date, fromDate);
        request.input("toDate", sql.Date, toDate);
        request.input("trainingSource", sql.NVarChar, trainingSource);
        request.input("outsideAgencyName", sql.NVarChar, outsideAgencyName || null);
        request.input("country", sql.NVarChar, country || null);
        request.input("location", sql.NVarChar, location || null);
        request.input("expenditure", sql.Decimal(18, 2), expenditure);
        request.input("organisationID", sql.Int, organisationID);
        request.input("userID", sql.Int, userID);
        request.input("otherTitleName", sql.NVarChar, otherTitleName || null);
        request.input("numberOfParticipant", sql.Int, numberOfParticipant);
        

        if(trainingTitle == 0 && (otherTitleName == null || otherTitleName == "")){
            return res.status(400).json({message:"Training Title is required"});
        }

        if(trainingTitle == 0 || trainingTitle == '0'){
            trainingType = parseInt(trainingType);
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM TBL_TRAINING_TITLE
                WHERE TITLE = @otherTitleName
                AND TRAINING_TYPE_ID = @trainingType
                AND organisation_id = @organisationID
            `;

            const checkResult = await request.query(checkQuery);

            if (checkResult.recordset[0].count > 0) {
                return res.status(400).json({ error: "Training title already exists for this type and organisation" });
            }

            try {
                let trainingTitleQuery = `
                    INSERT INTO TBL_TRAINING_TITLE (
                        TITLE,
                        TRAINING_TYPE_ID,
                        organisation_id
                    )
                    OUTPUT INSERTED.TRAINING_TITLE_ID
                    VALUES (
                        @otherTitleName,
                        @trainingType,
                        @organisationID
                    )`;

                const titleResult = await request.query(trainingTitleQuery);
                trainingTitle = titleResult.recordset[0].TRAINING_TITLE_ID;
            } catch (err) {
                return res.status(500).json({ error: "Failed to create new training title" ,err:err});
            }
        }

        request.input("trainingTitle", sql.Int, trainingTitle);
        const result = await request.query(`
            INSERT INTO tbl_hr_training (
                training_title_id, from_date, to_date,other_type,
                training_source, outside_agency_name, country_id, location,
                expenditure, organisation_id, created_date, CREATED_BY,NO_OF_PARTICIPANTS
            )
            OUTPUT inserted.training_id
            VALUES (
                @trainingTitle, @fromDate, @toDate,@otherTypeName,
                @trainingSource, @outsideAgencyName, @country, @location,
                @expenditure, @organisationID, GETDATE(), @userID,@numberOfParticipant
            )
        `);

        const trainingID = result.recordset[0].training_id;
        for (const participant of participantData) {
            const pRequest = new sql.Request(transaction);
            pRequest.input("trainingID", sql.Int, trainingID);
            pRequest.input("emp_master_id", sql.Int, participant.emp_master_id);
            pRequest.input("employee_id", sql.VarChar, participant.employee_id || null);
            pRequest.input("emp_transaction_id", sql.Int, participant.emp_transaction_id || null);

            await pRequest.query(`
                INSERT INTO tbl_hr_staff_training (
                    training_id, emp_master_id, employee_id, emp_transaction_id
                ) VALUES (
                    @trainingID, @emp_master_id, @employee_id, @emp_transaction_id
                )
            `);
        }
    
        await transaction.commit();
        return res.status(201).json({ message: "Training added successfully", trainingID });
    } catch (err) {
        await transaction.rollback();
        return res.status(500).json({ message: "Failed to add training", error: err.message });
    }
}


async function updateHRTraining(req, res) {
    let {
        trainingID, trainingTitle,otherTypeName,otherTitleName,trainingType, fromDate, toDate, trainingSource,
        outsideAgencyName, country, location, expenditure,
        participantData, organisationID, userID,numberOfParticipant
    } = req.body;

    const conn = await pool;
    const transaction = new sql.Transaction(conn);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input("trainingID", sql.Int, trainingID);
        request.input("otherTypeName", sql.NVarChar, otherTypeName);
        request.input("fromDate", sql.Date, fromDate);
        request.input("toDate", sql.Date, toDate);
        request.input("trainingSource", sql.NVarChar, trainingSource);
        request.input("outsideAgencyName", sql.NVarChar, outsideAgencyName || null);
        request.input("country", sql.NVarChar, country || null);
        request.input("location", sql.NVarChar, location || null);
        request.input("expenditure", sql.Decimal(18, 2), expenditure);
        request.input("organisationID", sql.Int, organisationID);
        request.input("userID", sql.Int, userID);
        request.input("trainingType", sql.Int, trainingType);
        request.input("otherTitleName", sql.NVarChar, otherTitleName || null);
        request.input("numberOfParticipant", sql.Int, numberOfParticipant);
        

        if(trainingTitle == 0 && (otherTitleName == null || otherTitleName == "")){
            return res.status(400).json({message:"Training Title is required"});
        }

        if(trainingTitle == 0 || trainingTitle == '0'){
            trainingType = parseInt(trainingType);
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM TBL_TRAINING_TITLE
                WHERE TITLE = @otherTitleName
                AND TRAINING_TYPE_ID = @trainingType
                AND organisation_id = @organisationID
            `;

            const checkResult = await request.query(checkQuery);

            if (checkResult.recordset[0].count > 0) {
                return res.status(400).json({ error: "Training title already exists for this type and organisation" });
            }

            try {
                let trainingTitleQuery = `
                    INSERT INTO TBL_TRAINING_TITLE (
                        TITLE,
                        TRAINING_TYPE_ID,
                        organisation_id
                    )
                    OUTPUT INSERTED.TRAINING_TITLE_ID
                    VALUES (
                        @otherTitleName,
                        @trainingType,
                        @organisationID
                    )`;

                const titleResult = await request.query(trainingTitleQuery);
                trainingTitle = titleResult.recordset[0].TRAINING_TITLE_ID;
            } catch (err) {
                return res.status(500).json({ error: "Failed to create new training title" ,err:err});
            }
        }

        request.input("trainingTitle", sql.Int, trainingTitle);

        await request.query(`
            UPDATE tbl_hr_training SET
                training_title_id = @trainingTitle,
                other_type = otherTypeName,
                from_date = @fromDate,
                to_date = @toDate,
                training_source = @trainingSource,
                outside_agency_name = @outsideAgencyName,
                country_id = @country,
                location = @location,
                expenditure = @expenditure,
                organisation_id = @organisationID,
                updated_date = GETDATE(),
                updated_by = @userID,
                NO_OF_PARTICIPANTS = @numberOfParticipant
            WHERE training_id = @trainingID
        `);

        const delRequest = new sql.Request(transaction);
        delRequest.input("trainingID", sql.Int, trainingID);
        await delRequest.query(`DELETE FROM tbl_hr_staff_training WHERE training_id = @trainingID`);

        for (const participant of participantData) {
            const pRequest = new sql.Request(transaction);
            pRequest.input("trainingID", sql.Int, trainingID);
            pRequest.input("emp_master_id", sql.Int, participant.emp_master_id);
            pRequest.input("employee_id", sql.VarChar, participant.employee_id || null);
            pRequest.input("emp_transaction_id", sql.Int, participant.emp_transaction_id || null);

            await pRequest.query(`
                INSERT INTO tbl_hr_staff_training (
                    training_id, emp_master_id, employee_id, emp_transaction_id
                ) VALUES (
                    @trainingID, @emp_master_id, @employee_id, @emp_transaction_id
                )
            `);
        }

        await transaction.commit();
        return res.status(200).json({ message: "Training updated successfully" });
    } catch (err) {
        await transaction.rollback();
        return res.status(500).json({ message: "Failed to update training", error: err.message });
    }
}



async function getHRStaffTransactData(req,res){
    const organisationID = req.params.organisationID;
    const trainingID = req.params.trainingID || '';

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID",organisationID);

    let staffQuery;
    if(!trainingID || trainingID=='' || trainingID == 0){
        staffQuery = `SELECT  tbl_employee_transaction_details.emp_reference_id,  employee_id, tbl_employee_master.emp_name, tbl_employee_master.emp_master_id, emp_post_name,emp_department_name, transaction_id AS emp_transaction_id
     FROM tbl_employee_transaction_details
    LEFT JOIN tbl_employee_master ON tbl_employee_transaction_details.emp_master_id = tbl_employee_master.emp_master_id
       WHERE emp_working_org_id = @organisationID AND emp_post_end_date IS NULL`;
    }else{
        request.input("trainingID",trainingID);
        staffQuery = `SELECT  tbl_employee_transaction_details.emp_reference_id,  employee_id, tbl_employee_master.emp_name, tbl_employee_master.emp_master_id, emp_post_name,emp_department_name, transaction_id AS emp_transaction_id
     FROM tbl_employee_transaction_details
    LEFT JOIN tbl_employee_master ON tbl_employee_transaction_details.emp_master_id = tbl_employee_master.emp_master_id
       WHERE emp_working_org_id = @organisationID AND emp_post_end_date IS NULL
       UNION
       select tbl_employee_transaction_details.emp_reference_id, TBL_HR_STAFF_TRAINING.EMPLOYEE_ID,
          tbl_employee_master.emp_name,tbl_employee_master.emp_master_id,  
          tbl_employee_transaction_details.emp_post_name, tbl_employee_transaction_details.emp_department_name,
          TBL_HR_STAFF_TRAINING.EMP_TRANSACTION_ID AS emp_transaction_id
          from TBL_HR_STAFF_TRAINING 
          JOIN tbl_employee_master ON tbl_employee_master.emp_master_id = TBL_HR_STAFF_TRAINING.EMP_MASTER_ID
          JOIN tbl_employee_transaction_details ON tbl_employee_transaction_details.employee_id = TBL_HR_STAFF_TRAINING.EMPLOYEE_ID
          WHERE TBL_HR_STAFF_TRAINING.TRAINING_ID = @trainingID`;
    }

    try{
        const result = await request.query(staffQuery);
        // console.log("Query executed :", result.recordset.length);
        res.json(result.recordset);
    }catch(err){
        console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}


async function getHRTrainingDataByOrg(req, res) {
    const organisationID = req.params.organisationID;
    const roleID = req.params.roleID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        let query;
        if (roleID == 2 || roleID == 3 || roleID == 4 || roleID == 5 || roleID == 8) {
            query = `
            SELECT
                org.organisation_id AS [org_id],
                org.organisation_name AS [organisation_Name],
                YEAR(ht.from_date) AS [year],
                COUNT(DISTINCT ht.TRAINING_ID) AS [total_Trainings],
                SUM(training_participants) AS [total_Participants],
                ROUND(SUM(ht.expenditure) / 100000.0, 2) AS [total_Expenditure],
                MAX(ht.to_date) AS [last_date],
                MAX(ht.updated_date) AS [updated_date]
            FROM mmt_organisation org
            INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.organisation_id
            LEFT JOIN (
                SELECT 
                    training_id, 
                    COUNT(emp_master_id) AS staff_count
                FROM tbl_hr_staff_training
                GROUP BY training_id
            ) hst_counts ON ht.TRAINING_ID = hst_counts.training_id
            CROSS APPLY (
                SELECT ISNULL(hst_counts.staff_count,0) + ISNULL(ht.NO_OF_PARTICIPANTS,0) AS training_participants
            ) AS t
            GROUP BY
                org.organisation_id,
                org.organisation_name,
                YEAR(ht.from_date)
            ORDER BY
                YEAR(ht.from_date) DESC;
            `;
        } else {
            query = `
                SELECT
                    ht.training_id,
                    t.[TITLE],
                    ty.[TRAINING_TYPE_NAME],
                    ht.[TRAINING_TITLE_ID],
                    ht.training_source,
                    YEAR(ht.from_date) AS year, 
                    ht.to_date,
                    ht.expenditure,
                    ht.organisation_id,
                    o.organisation_name,
                    COUNT(hst.emp_master_id) AS number_of_participants,
                    ht.NO_OF_PARTICIPANTS,
                    MAX(ht.updated_date) AS updated_date

                FROM tbl_hr_training ht
                LEFT JOIN mmt_organisation o 
                    ON o.organisation_id = ht.organisation_id
                LEFT JOIN [TBL_TRAINING_TITLE] t 
                    ON ht.[TRAINING_TITLE_ID] = t.[TRAINING_TITLE_ID]
                LEFT JOIN [TBL_TRAINING_TYPE] ty 
                    ON t.[TRAINING_TYPE_ID] = ty.[TRAINING_TYPE_ID]
                LEFT JOIN tbl_hr_staff_training hst 
                    ON ht.training_id = hst.training_id
                WHERE ht.organisation_id = @organisationID
                GROUP BY
                    ht.training_id,
                    t.TITLE,
                    ty.TRAINING_TYPE_NAME,
                    ht.TRAINING_TITLE_ID,
                    ht.training_source,
                    ht.from_date,
                    ht.to_date,
                    ht.expenditure,
                    ht.organisation_id,
                    o.organisation_name,
                    ht.NO_OF_PARTICIPANTS;
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (e) {
        console.log("E",e)
        return res.status(500).json({message: "Internal Server Error"});
    }
}

async function getHRTrainingDataByID(req,res){
    const trainingID = req.params.trainingID;

    const conn = await pool;
    const request = conn.request();

    request.input("trainingID",trainingID);

    try{
        const trainingResult = await request.query(`
            SELECT [TRAINING_ID]
                  ,[TITLE]
                  ,ty.[TRAINING_TYPE_NAME]
                  ,ty.[TRAINING_TYPE_ID]
                  ,t.[TRAINING_TITLE_ID]
                  ,other_type
                  ,[from_date]
                  ,[to_date]
                  ,[training_source]
                  ,[outside_agency_name]
                  ,[country_id]
                  ,[location]
                  ,[expenditure]
                  ,[TBL_HR_TRAINING].[organisation_id]
                  ,[created_date]
                  ,[created_by]
                  ,[updated_date]
                  ,[updated_by],
                  [NO_OF_PARTICIPANTS]
            FROM [TBL_HR_TRAINING]
            LEFT JOIN [TBL_TRAINING_TITLE] t ON [TBL_HR_TRAINING].[TRAINING_TITLE_ID] = t.[TRAINING_TITLE_ID]
            LEFT JOIN [TBL_TRAINING_TYPE] ty ON t.[TRAINING_TYPE_ID] = ty.[TRAINING_TYPE_ID] WHERE [TBL_HR_TRAINING].TRAINING_ID = @trainingID
        `);

        const trainingStaffResult = await request.query(`
            SELECT
                [transaction_id]
                ,[training_id]
                ,[emp_master_id]
                ,[employee_id]
                ,[emp_transaction_id]

            FROM [tbl_hr_staff_training] WHERE training_id = @trainingID

        `);

        res.json({
            training: trainingResult.recordset[0],
            participants: trainingStaffResult.recordset
        });

    }catch(e){
        // console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:e});
    }
}

async function createContractData(req,res) {
    const {contractId,financialYear, OffDirectEngage,OffRetiredFromOther,OffRetiredFromOwnOrgan,OffThroughAgency,OffForMinistry,
        NonOffDirectEngage,NonOffRetiredFromOther,NonOffRetiredFromOwnOrgan,NonOffThroughAgency,NonOffForMinistry,TotalOfficial,NonOffTotal,userID,organisationID} = req.body;

    const conn = await pool;
    const existingRequest = conn.request();

    const checkContractId = `SELECT * FROM tbl_hr_contract_data WHERE contract_id = @contractId`
    existingRequest.input("contractId",contractId);
try {
    const checkResult = await existingRequest.query(checkContractId);
    if(checkResult.recordset.length!=0){
        const updateQuery=`
         UPDATE tbl_hr_contract_data SET
            financial_year = @financialYear,
            officers_direct_engagement = @OffDirectEngage,
            officers_retired_from_govt = @OffRetiredFromOther,
            officers_retd_from_own_organ = @OffRetiredFromOwnOrgan,
            officers_through_agency = @OffThroughAgency,
            officers_for_ministry = @OffForMinistry,
            non_officers_direct_engagement = @NonOffDirectEngage,
            non_officers_retired_from_govt = @NonOffRetiredFromOther,
            non_officers_retd_from_own_organ = @NonOffRetiredFromOwnOrgan,
            non_officers_through_agency = @NonOffThroughAgency,
            non_officers_for_ministry = @NonOffForMinistry,
            official_total = @TotalOfficial,
            non_off_total = @NonOffTotal,
            updated_date = GETDATE(),
            updated_by = @userID,
            organisation_id = @organisationID
        WHERE contract_id = @contractId
        `;
    await existingRequest
        .input("financialYear", financialYear)
        .input("OffDirectEngage", OffDirectEngage)
        .input("OffRetiredFromOther", OffRetiredFromOther)
        .input("OffRetiredFromOwnOrgan", OffRetiredFromOwnOrgan)
        .input("OffThroughAgency", OffThroughAgency)
        .input("OffForMinistry", OffForMinistry)
        .input("NonOffDirectEngage", NonOffDirectEngage)
        .input("NonOffRetiredFromOther", NonOffRetiredFromOther)
        .input("NonOffRetiredFromOwnOrgan", NonOffRetiredFromOwnOrgan)
        .input("NonOffThroughAgency", NonOffThroughAgency)
        .input("NonOffForMinistry", NonOffForMinistry)
        .input("TotalOfficial", TotalOfficial)
        .input("NonOffTotal", NonOffTotal)
        .input("userID", userID)
        .input("organisationID", organisationID)
        .query(updateQuery);
    res.status(201).json({ message: "Updated successfully" });

    }else{
        const insertQuery = `
          INSERT INTO tbl_hr_contract_data (
            financial_year,officers_direct_engagement, officers_retired_from_govt, officers_retd_from_own_organ, officers_through_agency, officers_for_ministry, non_officers_direct_engagement,
            non_officers_retired_from_govt,non_officers_retd_from_own_organ, non_officers_through_agency, non_officers_for_ministry,official_total,non_off_total,organisation_id,created_by, created_date
        )
        OUTPUT INSERTED.contract_id
        VALUES (
            @financialYear,@OffDirectEngage, @OffRetiredFromOther, @OffRetiredFromOwnOrgan, @OffThroughAgency, @OffForMinistry, @NonOffDirectEngage, @NonOffRetiredFromOther,
            @NonOffRetiredFromOwnOrgan, @NonOffThroughAgency, @NonOffForMinistry,@TotalOfficial,@NonOffTotal, @organisationID, @userID, GETDATE()
        )
        `;
    const insertRequest = conn.request();

    insertRequest.input("financialYear", financialYear);
    insertRequest.input("OffDirectEngage", OffDirectEngage);
    insertRequest.input("OffRetiredFromOther", OffRetiredFromOther);
    insertRequest.input("OffRetiredFromOwnOrgan", OffRetiredFromOwnOrgan);
    insertRequest.input("OffThroughAgency", OffThroughAgency);
    insertRequest.input("OffForMinistry", OffForMinistry);
    insertRequest.input("NonOffDirectEngage", NonOffDirectEngage);
    insertRequest.input("NonOffRetiredFromOther", NonOffRetiredFromOther);
    insertRequest.input("NonOffRetiredFromOwnOrgan", NonOffRetiredFromOwnOrgan);
    insertRequest.input("NonOffThroughAgency", NonOffThroughAgency);
    insertRequest.input("NonOffForMinistry", NonOffForMinistry);
    insertRequest.input("TotalOfficial", TotalOfficial);
    insertRequest.input("NonOffTotal", NonOffTotal);
    insertRequest.input("userID", userID);
    insertRequest.input("organisationID", organisationID);

    const result = await insertRequest.query(insertQuery)
    return res.status(201).json({ result });
    }
} catch (error) {
    //console.log("error",error)
    return res.status(500).json({ message: 'Failed to create contract data' });
}
}

async function getContractData(req,res) {
const roleID = req.params.roleId;
const organisationID = req.params.organisationID;

const conn = await pool;
const request = conn.request();

request.input("roleID",roleID);
request.input("organisationID",organisationID);

let query;
if (roleID == 2 || roleID == 3 || roleID == 4 || roleID == 5 || roleID == 8) {
    query = `
         SELECT 
            c.*, 
            o.organisation_name 
            FROM tbl_hr_contract_data c
            LEFT JOIN mmt_organisation o ON c.organisation_id = o.organisation_id
    `;
} else {
    query = `
         SELECT 
            c.*, 
            o.organisation_name 
            FROM tbl_hr_contract_data c
            LEFT JOIN mmt_organisation o ON c.organisation_id = o.organisation_id
            WHERE c.organisation_id = @organisationID
    `;
}

try {
    const result = await request.query(query);
    res.json(result.recordset);
}
catch (err) {
    //console.log(err);
    return res.status(500).json({error: "failed to load data" });
}
}

async function getOfficialDataByTotal(req,res) {
const contractId = req.params.contractId;
const officialTotal = req.params.officialTotal;

const conn = await pool;
const request = conn.request();

request.input("contractId",contractId);
request.input("officialTotal",officialTotal);

let query = `
         SELECT financial_year,officers_direct_engagement,officers_retired_from_govt,officers_retd_from_own_organ,officers_through_agency,officers_for_ministry FROM tbl_hr_contract_data
        WHERE contract_id = @contractId AND official_total = @officialTotal;
    `;
try {
    const result = await request.query(query);
    res.json(result.recordset);
}
catch (err) {
    //console.log(err);
    return res.status(500).json({error: "failed to load data" });
}
}

async function getNonOfficialDataByTotal(req,res) {
const contractId = req.params.contractId;
const NonOffTotal = req.params.NonOffTotal;

const conn = await pool;
const request = conn.request();

request.input("contractId",contractId);
request.input("NonOffTotal",NonOffTotal);

let query = `
         SELECT financial_year,non_officers_direct_engagement,non_officers_retired_from_govt,non_officers_retd_from_own_organ,non_officers_through_agency,non_officers_for_ministry FROM tbl_hr_contract_data
        WHERE contract_id = @contractId AND non_off_total = @NonOffTotal;
    `;
try {
    const result = await request.query(query);
    res.json(result.recordset);
}
catch (err) {
    //console.log(err);
    return res.status(500).json({error: "failed to load data" });
}
}


async function getContractualDataByID(req,res){
    const contractId = req.params.contractId;

    const conn = await pool;
    const request = conn.request();
    request.input("contractId", contractId);

    try {

        let contractIdQuery = `SELECT * FROM tbl_hr_contract_data WHERE contract_id = @contractId`;
    
        const result = await request.query(contractIdQuery);

        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.status(500).json({error: "failed to load data" });
    }
}

async function getTrainingTitleData(req,res){
    const organisationID = req.params.organisationID;
    const trainingType = req.params.trainingType;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("trainingType", trainingType);

    try {

        let trainingTitleQuery = `SELECT TRAINING_TITLE_ID,TITLE FROM TBL_TRAINING_TITLE
            WHERE TRAINING_TYPE_ID = @trainingType AND organisation_id= @organisationID`;

        const result = await request.query(trainingTitleQuery);

        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.status(500).json({error: "failed to load data" });
    }
}

async function getHRTrainingType(req,res){
    const conn = await pool;
    const request = conn.request();

    try {

        let trainingTitleQuery = `SELECT * FROM TBL_TRAINING_TYPE ORDER BY TRAINING_TYPE_NAME ASC`;

        const result = await request.query(trainingTitleQuery);

        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.status(500).json({error: "failed to load data" });
    }
}

async function submitHrVacancyAnticipation(req,res){
    const { organisationID, userID, tableData } = req.body;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", sql.Int, organisationID);
    request.input("userID", sql.Int, userID);

    try{
        if (!Array.isArray(tableData)) {
            return res.status(400).json({ error: "tableData must be an array" });
        }
        if (tableData.length === 0) {
            return res.status(400).json({ error: "tableData array cannot be empty" });
        }

        const transaction = new sql.Transaction(conn);
        await transaction.begin();

        try {
            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input("organisationID", organisationID);
            const deleteQuery = `
                DELETE FROM [tbl_hr_vacancy_anticipation]
                WHERE organisation_id = @organisationID`;
            await deleteRequest.query(deleteQuery);

            for (const data of tableData) {
                const request = new sql.Request(transaction);
                request.input("organisationID", organisationID);
                request.input("userID", userID);
                request.input('departmentId', data.department_id);
                request.input('postId', data.post_id);
                request.input('anticipatedVyArise', data.anticipated_count);
                request.input('unforseenVyArise', data.unforseen_count);
                request.input('actualPromotion', data.actual_promotion);
                request.input('resultantPromotion',data.resultant_promotion);
                request.input('drTotal',data.dr_count);

                const query = `
                    INSERT INTO [tbl_hr_vacancy_anticipation] (
                        post_id,
                        department_id,
                        anticipated_vy_arise_during_year,
                        unforseen_vy_arise_during_year,
                        actual_promotion,
                        resultant_promotion,
                        dr_total,
                        organisation_id,
                        created_date,
                        created_by
                    )
                    VALUES (
                        @postId,
                        @departmentId,
                        @anticipatedVyArise,
                        @unforseenVyArise,
                        @actualPromotion,
                        @resultantPromotion,
                        @drTotal,
                        @organisationID,
                        GETDATE(),
                        @userID
                    )`;

                await request.query(query);
            }

            await transaction.commit();
            return res.status(201).json({
                message: `Successfully inserted ${tableData.length} records`
            });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    catch (err) {
        return res.status(500).json({
            error: "Failed to insert records",
            details: err.message
        });
    }
}

async function deleteContracturalData(req,res) {
    const contractId = req.params.contractId;
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("contractId", contractId);
    request.input("organisationID", organisationID);

   try {
       let contractIdQuery = `DELETE FROM tbl_hr_contract_data WHERE contract_id = @contractId AND organisation_id= @organisationID`;
       const result = await request.query(contractIdQuery);
       res.json(result.recordset);
    }
    catch (err) {
        // console.log(err);
       return res.status(500).json({error: "failed to load data" });
    }
}


async function getHRTrainingDetailsDataByOrg(req, res) {
    const orgID = req.query.organisationID;
    const organisationID = parseInt(orgID, 10);
    
    const roleID = req.query.roleID;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const totalTrainings = req.query.totalTrainings;

    if (!organisationID || !fromDate || !toDate || !totalTrainings) {
        return res.status(400).json({ message: "Missing required query parameters" });
    }

    if (!(roleID == 2 || roleID == 3 || roleID == 4 || roleID == 5 || roleID == 8)) {
        return res.status(403).json({ message: "Access denied" });
    }

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", sql.Int, parseInt(organisationID));

    // Format dates, assuming fromDate is year like "2023"
    const fromDateFormatted = /^\d{4}$/.test(fromDate) ? `${fromDate}-01-01` : fromDate;
    request.input("fromDate", sql.Date, fromDateFormatted);
    request.input("toDate", sql.Date, toDate);
    request.input("totalTrainings", sql.Int, parseInt(totalTrainings));

    try {
            const query = `
            WITH TrainingCounts AS (
                SELECT
                    organisation_id,
                    COUNT(training_id) AS total_trainings
                FROM tbl_hr_training
                WHERE from_date >= @fromDate AND to_date <= @toDate
                GROUP BY organisation_id
            ),
            StaffCounts AS (
                SELECT
                    training_id,
                    COUNT(emp_master_id) AS staff_count
                FROM tbl_hr_staff_training
                GROUP BY training_id
            )
            SELECT
                ht.training_id,
                ht.TRAINING_TITLE_ID,
                t.TITLE,
                ty.TRAINING_TYPE_NAME,
                ht.training_source,
                ht.from_date,
                ht.to_date,
                ht.expenditure,
                ht.organisation_id,
                o.organisation_name,
                ISNULL(ht.NO_OF_PARTICIPANTS, 0) + ISNULL(sc.staff_count, 0) AS number_of_participants
            FROM tbl_hr_training ht
            LEFT JOIN StaffCounts sc ON ht.training_id = sc.training_id
            LEFT JOIN mmt_organisation o ON o.organisation_id = ht.organisation_id
            LEFT JOIN TBL_TRAINING_TITLE t ON ht.TRAINING_TITLE_ID = t.TRAINING_TITLE_ID
            LEFT JOIN TBL_TRAINING_TYPE ty ON t.TRAINING_TYPE_ID = ty.TRAINING_TYPE_ID
            INNER JOIN TrainingCounts tc ON ht.organisation_id = tc.organisation_id
            WHERE ht.organisation_id = @organisationID
            AND ht.from_date >= @fromDate
            AND ht.to_date <= @toDate
            AND tc.total_trainings = @totalTrainings
            `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function deleteTrainingData(req, res) {
    const trainingID = req.params.trainingID;
    const organisationID = req.params.organisationID;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("trainingID", trainingID);
        request.input("organisationID", organisationID);

        const deleteStaffTrainingQuery = `
            DELETE FROM tbl_hr_staff_training WHERE TRAINING_ID = @trainingID;
        `;
        const deleteTrainingQuery = `
            DELETE FROM tbl_hr_training WHERE TRAINING_ID = @trainingID AND ORGANISATION_ID = @organisationID;
        `;

        await request.query(deleteStaffTrainingQuery);

        const result = await request.query(deleteTrainingQuery);

        res.json({ message: "Training data deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "Failed to delete training data" });
    }
}
async function getAllTrainingData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const userID = req.params.userID;

        request.input("userID", userID);

        // 🔹 Get user role & organisation
        const userResult = await request.query(`
            SELECT role_id, organisation_id 
            FROM tbl_user 
            WHERE user_id = @userID
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        // 🔹 Special organisation list
        const allowedOrgIds = [23,15,27,21,24,19,25,22,16,17,18,20];

        let result;
        if ([2,3,4,5].includes(role_id)) {

            result = await conn.query(`
                WITH StaffRanked AS (
                    SELECT 
                        hst.TRAINING_ID,
                        em.emp_name,
                        em.emp_parent_org_designation,
                        etd.emp_department_name,
                        po.post_name,
                        ROW_NUMBER() OVER (PARTITION BY hst.TRAINING_ID ORDER BY em.emp_name) AS rn
                    FROM tbl_hr_staff_training hst
                    LEFT JOIN tbl_employee_transaction_details etd ON hst.EMPLOYEE_ID = etd.employee_id
                    LEFT JOIN tbl_employee_master em ON etd.emp_master_id = em.emp_master_id
                    LEFT JOIN mmt_hr_post po ON etd.emp_post_id = po.post_id
                )
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
                    org.organisation_name AS [Organisation Name],
                     org.organisation_id AS [Organisation ID],
                    ht.TRAINING_ID AS [Training ID],
                    typ.TRAINING_TYPE_NAME AS [Training Type],
                    ht.TRAINING_TITLE_ID AS [Training tile ID],
                    tit.TITLE AS [Title],
                    ht.FROM_DATE AS [From date],
                    ht.TO_DATE AS [To date],
                    ht.TRAINING_SOURCE AS [Training Source],
                    ht.OUTSIDE_AGENCY_NAME AS [Outside Agency name],
                    mmt.country AS [Country],
                    ht.LOCATION AS [Location],
                    ht.EXPENDITURE AS [Expenditure],
                    ht.NO_OF_PARTICIPANTS AS [No of Participants],
                    sr.emp_name AS [Employ name],
                    sr.post_name AS [Designation],
                    sr.emp_department_name AS [Department name],
                    ht.created_date AS [Date Created],
                    ht.updated_date AS [Date Updated],
                    ht.created_by AS [Created By],
                    ht.updated_by AS [Updated By]
                FROM mmt_organisation org
                INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.ORGANISATION_ID 
                LEFT JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
                LEFT JOIN TBL_TRAINING_TYPE typ ON tit.TRAINING_TYPE_ID = typ.TRAINING_TYPE_ID
                LEFT JOIN mmt_country mmt ON ht.COUNTRY_ID = mmt.id 
                LEFT JOIN StaffRanked sr ON ht.TRAINING_ID = sr.TRAINING_ID AND sr.rn = 1
            `);

        } 
        else if (allowedOrgIds.includes(organisation_id)) {

            request.input("organisation_id", organisation_id);

            result = await request.query(`
                WITH StaffRanked AS (
                    SELECT 
                        hst.TRAINING_ID,
                        em.emp_name,
                        em.emp_parent_org_designation,
                        etd.emp_department_name,
                        po.post_name,
                        ROW_NUMBER() OVER (PARTITION BY hst.TRAINING_ID ORDER BY em.emp_name) AS rn
                    FROM tbl_hr_staff_training hst
                    LEFT JOIN tbl_employee_transaction_details etd ON hst.EMPLOYEE_ID = etd.employee_id
                    LEFT JOIN tbl_employee_master em ON etd.emp_master_id = em.emp_master_id
                    LEFT JOIN mmt_hr_post po ON etd.emp_post_id = po.post_id
                )
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
                    org.organisation_name AS [Organisation Name],
                    ht.TRAINING_ID AS [Training ID],
                    typ.TRAINING_TYPE_NAME AS [Training Type],
                    ht.TRAINING_TITLE_ID AS [Training tile ID],
                    tit.TITLE AS [Title],
                    ht.FROM_DATE AS [From date],
                    ht.TO_DATE AS [To date],
                    ht.TRAINING_SOURCE AS [Training Source],
                    ht.OUTSIDE_AGENCY_NAME AS [Outside Agency name],
                    mmt.country AS [Country],
                    ht.LOCATION AS [Location],
                    ht.EXPENDITURE AS [Expenditure],
                    ht.NO_OF_PARTICIPANTS AS [No of Participants],
                    ht.created_date AS [Date Created],
                    ht.updated_date AS [Date Updated],
                    ht.created_by AS [Created By],
                    ht.updated_by AS [Updated By]
                FROM mmt_organisation org
                INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.ORGANISATION_ID 
                LEFT JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
                LEFT JOIN TBL_TRAINING_TYPE typ ON tit.TRAINING_TYPE_ID = typ.TRAINING_TYPE_ID
                LEFT JOIN mmt_country mmt ON ht.COUNTRY_ID = mmt.id 
                LEFT JOIN StaffRanked sr ON ht.TRAINING_ID = sr.TRAINING_ID AND sr.rn = 1
                WHERE org.organisation_id = @organisation_id
            `);

        } 
        else {

            request.input("organisation_id", organisation_id);

            result = await request.query(`
                -- SAME QUERY AS ABOVE
                WITH StaffRanked AS (
                    SELECT 
                        hst.TRAINING_ID,
                        em.emp_name,
                        em.emp_parent_org_designation,
                        etd.emp_department_name,
                        po.post_name,
                        ROW_NUMBER() OVER (PARTITION BY hst.TRAINING_ID ORDER BY em.emp_name) AS rn
                    FROM tbl_hr_staff_training hst
                    LEFT JOIN tbl_employee_transaction_details etd ON hst.EMPLOYEE_ID = etd.employee_id
                    LEFT JOIN tbl_employee_master em ON etd.emp_master_id = em.emp_master_id
                    LEFT JOIN mmt_hr_post po ON etd.emp_post_id = po.post_id
                )
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
                    org.organisation_name AS [Organisation Name],
                    ht.TRAINING_ID AS [Training ID],
                    typ.TRAINING_TYPE_NAME AS [Training Type],
                    ht.TRAINING_TITLE_ID AS [Training tile ID],
                    tit.TITLE AS [Title],
                    ht.FROM_DATE AS [From date],
                    ht.TO_DATE AS [To date],
                    ht.TRAINING_SOURCE AS [Training Source],
                    ht.OUTSIDE_AGENCY_NAME AS [Outside Agency name],
                    mmt.country AS [Country],
                    ht.LOCATION AS [Location],
                    ht.EXPENDITURE AS [Expenditure],
                    sr.emp_name AS [Employ name],
                    sr.post_name AS [Designation],
                    sr.emp_department_name AS [Department name],
                    ht.created_date AS [Date Created],
                    ht.updated_date AS [Date Updated],
                    ht.created_by AS [Created By],
                    ht.updated_by AS [Updated By]
                FROM mmt_organisation org
                INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.ORGANISATION_ID 
                LEFT JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
                LEFT JOIN TBL_TRAINING_TYPE typ ON tit.TRAINING_TYPE_ID = typ.TRAINING_TYPE_ID
                LEFT JOIN mmt_country mmt ON ht.COUNTRY_ID = mmt.id 
                LEFT JOIN StaffRanked sr ON ht.TRAINING_ID = sr.TRAINING_ID AND sr.rn = 1
                WHERE org.organisation_id = @organisation_id
            `);
        }

        res.json(result.recordset);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


// async function getAllTrainingData(req,res) {
//     const conn = await pool;
//     const request = conn.request();
//     const userID = req.params.userID;
//     request.input("userID",userID );
//     try {
//         const userResult = await conn.query(` SELECT role_id,organisation_id FROM tbl_user WHERE user_id = ${userID} `);
//         const { role_id,organisation_id  } = userResult.recordset[0];
//         let result;
//         if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
//             result = await conn.query(`
//            WITH StaffRanked AS (
//                 SELECT 
//                     hst.TRAINING_ID,
//                     em.emp_name,
//                     em.emp_parent_org_designation,
//                     etd.emp_department_name,
//                     po.post_name,
//                     ROW_NUMBER() OVER (PARTITION BY hst.TRAINING_ID ORDER BY em.emp_name) AS rn
//                 FROM tbl_hr_staff_training hst
//                 LEFT JOIN tbl_employee_transaction_details etd ON hst.EMPLOYEE_ID = etd.employee_id
//                 LEFT JOIN tbl_employee_master em ON etd.emp_master_id = em.emp_master_id
//                 LEFT JOIN mmt_hr_post po ON etd.emp_post_id = po.post_id
//             )
//             SELECT 
//                 ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
//                 org.organisation_name AS [Organisation Name],
//                 ht.TRAINING_ID AS [Training ID],
//                 typ.TRAINING_TYPE_NAME AS [Training Type],
//                 ht.TRAINING_TITLE_ID AS [Training tile ID],
//                 tit.TITLE AS [Title],
//                 ht.FROM_DATE AS [From date],
//                 ht.TO_DATE AS [To date],
//                 ht.TRAINING_SOURCE AS [Training Source],
//                 ht.OUTSIDE_AGENCY_NAME AS [Outside Agency name],
//                 mmt.country AS [Country],
//                 ht.LOCATION AS [Location],
//                 ht.EXPENDITURE AS [Expenditure],
//                 ht.NO_OF_PARTICIPANTS AS [No of Participants],
//                 sr.emp_name AS [Employ name],
//                 sr.post_name AS [Designation],
//                 sr.emp_department_name AS [Department name],
//                 ht.created_date AS [Date Created],
//                 ht.updated_date AS [Date Updated],
//                 ht.created_by AS [Created By],
//                 ht.updated_by AS [Updated By]
//             FROM mmt_organisation org
//             INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.ORGANISATION_ID 
//             LEFT JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
//             LEFT JOIN TBL_TRAINING_TYPE typ ON tit.TRAINING_TYPE_ID = typ.TRAINING_TYPE_ID
//             LEFT JOIN mmt_country mmt ON ht.COUNTRY_ID = mmt.id 
//             LEFT JOIN StaffRanked sr ON ht.TRAINING_ID = sr.TRAINING_ID AND sr.rn = 1
//             `);
//         }else{
//             request.input("organisation_id", organisation_id);
//             result = await request.query(`
//             WITH StaffRanked AS (
//                 SELECT 
//                     hst.TRAINING_ID,
//                     em.emp_name,
//                     em.emp_parent_org_designation,
//                     etd.emp_department_name,
//                     po.post_name,
//                     ROW_NUMBER() OVER (PARTITION BY hst.TRAINING_ID ORDER BY em.emp_name) AS rn
//                 FROM tbl_hr_staff_training hst
//                 LEFT JOIN tbl_employee_transaction_details etd ON hst.EMPLOYEE_ID = etd.employee_id
//                 LEFT JOIN tbl_employee_master em ON etd.emp_master_id = em.emp_master_id
//                 LEFT JOIN mmt_hr_post po ON etd.emp_post_id = po.post_id
//             )
//             SELECT 
//                 ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
//                 org.organisation_name AS [Organisation Name],
//                 ht.TRAINING_ID AS [Training ID],
//                 typ.TRAINING_TYPE_NAME AS [Training Type],
//                 ht.TRAINING_TITLE_ID AS [Training tile ID],
//                 tit.TITLE AS [Title],
//                 ht.FROM_DATE AS [From date],
//                 ht.TO_DATE AS [To date],
//                 ht.TRAINING_SOURCE AS [Training Source],
//                 ht.OUTSIDE_AGENCY_NAME AS [Outside Agency name],
//                 mmt.country AS [Country],
//                 ht.LOCATION AS [Location],
//                 ht.EXPENDITURE AS [Expenditure],
//                 sr.emp_name AS [Employ name],
//                 sr.post_name AS [Designation],
//                 sr.emp_department_name AS [Department name],
//                 ht.created_date AS [Date Created],
//                 ht.updated_date AS [Date Updated],
//                 ht.created_by AS [Created By],
//                 ht.updated_by AS [Updated By]
//             FROM mmt_organisation org
//             INNER JOIN tbl_hr_training ht ON org.organisation_id = ht.ORGANISATION_ID 
//             LEFT JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
//             LEFT JOIN TBL_TRAINING_TYPE typ ON tit.TRAINING_TYPE_ID = typ.TRAINING_TYPE_ID
//             LEFT JOIN mmt_country mmt ON ht.COUNTRY_ID = mmt.id 
//             LEFT JOIN StaffRanked sr ON ht.TRAINING_ID = sr.TRAINING_ID AND sr.rn = 1
//           WHERE org.organisation_id = @organisation_id
//             `); 
//         }
//         res.json(result.recordset);
//     } catch (error) {
//         // console.log("error",error)
//         return res.status(500).json({error: "Internal Server Error" });
//     }
// }

async function getAllContractualData(req,res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    request.input("userID",userID );
    try {
        const userResult = await conn.query(` SELECT role_id,organisation_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id,organisation_id  } = userResult.recordset[0];
        let result;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            result = await conn.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
                org.organisation_name AS [Organisation Name],
                hcd.contract_id AS [Contract ID],
                hcd.financial_year AS [Financial Year],
                hcd.officers_direct_engagement AS [Officer - Direct engagement],
                hcd.officers_retired_from_govt AS [Officer - Retired from Govt.],
                hcd.officers_retd_from_own_organ AS [Officer - Retired from own organisation],
                hcd.officers_through_agency AS [Officer - Through agency],
                hcd.officers_for_ministry AS [Officer - For ministry],
                hcd.official_total AS [Total for officers level],
                hcd.non_officers_direct_engagement  AS [Non-officer Direct engagement],
                hcd.non_officers_retired_from_govt AS [Non-officer retired from Govt.],
                hcd.non_officers_retd_from_own_organ AS [Non-officer retired from own organisation],
                hcd.non_officers_through_agency AS [Non-officer through agency],
                hcd.non_officers_for_ministry AS [Non-officer for ministry],
                hcd.non_off_total AS [Total for Non-officers level],
                hcd.created_date AS [Date Created],
                hcd.updated_date AS [Date Updated],
                hcd.created_by AS [Created By],
                hcd.updated_by AS [Updated By]
            FROM mmt_organisation org
            INNER JOIN tbl_hr_contract_data hcd ON org.organisation_id = hcd.organisation_id 
            `);
        }else{
            request.input("organisation_id", organisation_id);
            result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S.No],
                org.organisation_name AS [Organisation Name],
                hcd.contract_id AS [Contract ID],
                hcd.financial_year AS [Financial Year],
                hcd.officers_direct_engagement AS [Officer - Direct engagement],
                hcd.officers_retired_from_govt AS [Officer - Retired from Govt.],
                hcd.officers_retd_from_own_organ AS [Officer - Retired from own organisation],
                hcd.officers_through_agency AS [Officer - Through agency],
                hcd.officers_for_ministry AS [Officer - For ministry],
                hcd.official_total AS [Total for officers level],
                hcd.non_officers_direct_engagement  AS [Non-officer Direct engagement],
                hcd.non_officers_retired_from_govt AS [Non-officer retired from Govt.],
                hcd.non_officers_retd_from_own_organ AS [Non-officer retired from own organisation],
                hcd.non_officers_through_agency AS [Non-officer through agency],
                hcd.non_officers_for_ministry AS [Non-officer for ministry],
                hcd.non_off_total AS [Total for Non-officers level],
                hcd.created_date AS [Date Created],
                hcd.updated_date AS [Date Updated],
                hcd.created_by AS [Created By],
                hcd.updated_by AS [Updated By]
            FROM mmt_organisation org
            INNER JOIN tbl_hr_contract_data hcd ON org.organisation_id = hcd.organisation_id 
            WHERE org.organisation_id = @organisation_id
            `); 
        }
        res.json(result.recordset);
    } catch (error) {
        // console.log("error",error)
        return res.status(500).json({error: "Internal Server Error" });
    }
}

async function checkFinancialYearExist(req, res) {
    try {
        const { organisationID, financialYear } = req.params;

        if (!organisationID || !financialYear) {
            return res.status(400).json({ error: "Missing organisationID or financialYear in request params." });
        }

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);

        const result = await request.query(`
            SELECT * FROM tbl_hr_contract_data 
            WHERE organisation_id = @organisationID AND financial_year = @financialYear
        `);

        const exists = result.recordset.length > 0;
        
        return res.json({ exists });
    } catch (error) {
        console.error(" Error checking financial year:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


export default {submitHrVacancyAnticipation,createContractData,getContractData,getOfficialDataByTotal,getNonOfficialDataByTotal,createHRTraining,updateHRTraining,getHRStaffTransactData, getHRTrainingDataByID, getHRTrainingDataByOrg,
    getContractualDataByID,getTrainingTitleData,getHRTrainingType,deleteContracturalData,getHRTrainingDetailsDataByOrg,deleteTrainingData,getAllTrainingData,getAllContractualData,checkFinancialYearExist
 }