import { pool } from "../../db.js";
import {convertIntoVacantPost, getNewEmployeeIDofOrg} from "../HR/hrHelperFunctions.js";
import sql from 'mssql';

async function getAllHrPostByOrgID(req,res){
    const orgID = req.params.orgID;

    const conn = await pool;
    const request = conn.request();

    request.input("orgID",orgID);

    try {
        const result = await request.query(`
        Select 
            d.department_name
            p.post_name,
            p.sanctioned_strength,
            COUNT(CASE WHEN ps.vacant_or_filled='vacant' THEN 1 END) AS 'Vacant',
            COUNT(CASE WHEN ps.vacant_or_filled='filled' THEN 1 END) AS 'Filled'
        FROM 
            tbl_hr_post_strength ps
            LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
            LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
            WHERE ps.organisation_id= @orgID
            GROUP BY department_name,post_name,sanctioned_strength`);

        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.send(500);
    }

}


async function updateHrEmployeeActivity(req,res){
    const {employeeId ,empMasterId, activityName, separationReason = null, retirementDate = null, separationDate = null, absorptionDate = null, orgToBeDeputed = null,deputationStartDate = null ,deputationEndDate = null,dateOfDeputingOut = null,dateOfTransferOut = null,orgToBeTransferred = null, promotionPostCode, dateOfPromotion = null,deleteSVRS = null, deputationCompleteDate = null, organisationID, userID} = req.body;

    const conn = await pool;

    const transaction = new sql.Transaction(conn);
    const request = transaction.request();

    try {
        await transaction.begin();
        request.input("employeeId",employeeId);
        request.input("organisationID",organisationID);
        request.input("empMasterId",empMasterId);
        request.input("activityName",activityName);
        request.input("separationReason",separationReason);
        request.input("retirementDate",retirementDate);
        request.input("separationDate",separationDate);
        request.input("absorptionDate",absorptionDate);
        request.input("orgToBeDeputed",orgToBeDeputed);
        request.input("deputationStartDate",deputationStartDate);
        request.input("deputationEndDate",deputationEndDate);
        request.input("dateOfDeputingOut",dateOfDeputingOut);
        request.input("dateOfTransferOut",dateOfTransferOut);
        request.input("promotionPostCode",promotionPostCode);
        request.input("dateOfPromotion",dateOfPromotion);
        request.input("orgToBeTransferred",orgToBeTransferred);
        request.input("deputationCompleteDate",deputationCompleteDate);
        request.input("userID",userID);

        // OBTAINING EMPLOYEE AND POST DATA

        let postEndDate;
        // Gathering Post Data occupied by that Employee
        let empAssignedPostResult  = await request.query(`SELECT post_code,post_id from tbl_hr_post_strength WHERE employee_id = @employeeId`);
        let employeePostCode = empAssignedPostResult.recordset.length > 0 ? empAssignedPostResult.recordset[0].post_code : null;
        let empPostID = empAssignedPostResult.recordset.length > 0 ? empAssignedPostResult.recordset[0].post_id : null;

        if(employeePostCode == null || empPostID == null){
            return res.status(400).json({ message: "User doesn't have any designation"});
        }

        request.input("employeePostCode",employeePostCode);
        request.input("empPostID",empPostID);

        //Gathering Employee Previous Transaction Data
        let getEmpTransactData = await request.query(`SELECT emp_post_id,emp_reference_id,emp_department_id,method_of_appointment,emp_working_org_id from tbl_employee_transaction_details WHERE employee_id = @employeeId AND emp_post_code= @employeePostCode`);
        let deputedOrgID = getEmpTransactData.recordset.length > 0 ? getEmpTransactData.recordset[0].emp_working_org_id : null;
        let employeeDeptID = getEmpTransactData.recordset.length > 0 ? getEmpTransactData.recordset[0].emp_department_id : null;
        let employeePostID = getEmpTransactData.recordset.length > 0 ? getEmpTransactData.recordset[0].emp_post_id : null;
        let employeeMethodOfApp = getEmpTransactData.recordset.length > 0 ? getEmpTransactData.recordset[0].method_of_appointment : null;
        let employeeRefID = getEmpTransactData.recordset.length > 0 ? getEmpTransactData.recordset[0].emp_reference_id : null;

        //Gathering Employee Current Organisation ID
        let getEmpMasterData = await request.query(`SELECT emp_curr_org_id from tbl_employee_master WHERE emp_master_id = @empMasterId`);
        let employeeCurrOrgId = getEmpMasterData.recordset.length > 0 ? getEmpMasterData.recordset[0].emp_curr_org_id : null;

        //Finding Method of Discharge for that employee transaction
        let methodOfDischarge;

        if(employeeMethodOfApp == 'Transfer In'){
            methodOfDischarge = 'Transfer End'
        }else if(employeeMethodOfApp == 'Deputation In'){
            methodOfDischarge = 'Deputation End'
        }else{
            methodOfDischarge = employeeMethodOfApp + ' End';
        }

        request.input("deputedOrgID",deputedOrgID);
        request.input("employeeDeptID",employeeDeptID);
        request.input("employeePostID",employeePostID);
        request.input("employeeRefID",employeeRefID);

        //Gathering Department Name and Post Name
        let getDeptPostName = await request.query(` Select post_name,d.department_name from mmt_hr_post p
            JOIN mmt_hr_department d ON d.department_id = p.department_id
            WHERE p.post_id = @employeePostID AND d.department_id = @employeeDeptID`)

        let employeePostName = getDeptPostName.recordset.length > 0 ? getDeptPostName.recordset[0].post_name : null;
        let employeeDeptName = getDeptPostName.recordset.length > 0 ? getDeptPostName.recordset[0].department_name : null;

        request.input("methodOfDischarge",methodOfDischarge);
        request.input("employeeCurrOrgId",employeeCurrOrgId);
        request.input("employeePostName",employeePostName);
        request.input("employeeDeptName",employeeDeptName);


        //SEPARATION ACTIVITY
        if(activityName == "Separation"){
            postEndDate = separationDate ? separationDate : retirementDate;
            request.input("postEndDate",postEndDate);

            const newDateOfVacancy = new Date(postEndDate);
            newDateOfVacancy.setDate(newDateOfVacancy.getDate() + 1);
            request.input("newDateOfVacancy", newDateOfVacancy);

            const updateTransactResult = await request.query(`UPDATE tbl_employee_transaction_details SET emp_post_end_date = @postEndDate, activity_name = @activityName, activity_date = GETDATE(), separation_reason = @separationReason,separation_date = @postEndDate, updated_by = @userID, updated_date = GETDATE() WHERE employee_id = @employeeId AND emp_post_end_date IS NULL`);
            const postUpdateResult = await convertIntoVacantPost(request,employeePostCode, newDateOfVacancy);
            if(separationReason == 'Special Voluntary Retirement Scheme' && deleteSVRS == 1){
                await request.query(`DELETE FROM tbl_hr_post_strength WHERE post_code = @employeePostCode`);
                await request.query(`UPDATE mmt_hr_post SET sanctioned_strength = sanctioned_strength - 1,updated_date =GETDATE(),updated_by=@userID WHERE post_id = @empPostID`);
            }
            const deactivateEmployee = await request.query(`UPDATE tbl_employee_master SET emp_status = 0 WHERE emp_master_id = @empMasterId`);
            await transaction.commit();
            return res.status(201).json({ message: "Separation activity for the employee done successfully"});
        }
        //ABSORPTION ACTIVITY
        else if(activityName == "Absorption"){
            if(absorptionDate == null){
                return res.status(400).json({message : "Absorption date is missing for the absorption activity"});
            }

            postEndDate = new Date(absorptionDate);
            postEndDate.setDate(postEndDate.getDate() - 1);
            request.input("postEndDate",postEndDate);

            //Validate whether user have deputing organisation
            if(deputedOrgID == null){
                return res.status(400).json({ message: "User don't have any organisation to be deputed"});
                await transaction.rollback();
            }

            //Generating a new employee id for the absorbed employee
            const newEmployeeID = await getNewEmployeeIDofOrg(deputedOrgID);
            request.input("newEmployeeID",newEmployeeID);

            //Update Employee Transaction
            let updateAbsorptionEmployeeResult  = await request.query(`UPDATE tbl_employee_transaction_details SET method_of_discharge=@methodOfDischarge,emp_post_end_date=@postEndDate,activity_name='Absorption', activity_date = GETDATE(), updated_date = GETDATE(),updated_by = @userID WHERE emp_post_code=@employeePostCode AND employee_id = @employeeId`);
            let updateAbsorptionPostResult  = await request.query(`UPDATE tbl_hr_post_strength SET method_of_appointment='Absorption',employee_joined_date =@absorptionDate, employee_id=@newEmployeeID,updated_date = GETDATE() WHERE post_code=@employeePostCode`);
            let newEmployeeTransact = await request.query(`INSERT INTO tbl_employee_transaction_details(employee_id,emp_master_id,emp_department_id,emp_post_id,emp_post_code,emp_post_name,emp_department_name,emp_post_join_date,method_of_appointment,employee_joining_date,emp_working_org_id,created_date,created_by)
                                                           VALUES(@newEmployeeID,@empMasterID,@employeeDeptID,@employeePostID,@employeePostCode,@employeePostName,@employeeDeptName,@absorptionDate,'Absorption',@absorptionDate,@deputedOrgID,GETDATE(),@userID)`);

            await request.query(`UPDATE tbl_employee_master SET emp_curr_org_id = @deputedOrgID WHERE emp_master_id = @empMasterId`);

            await transaction.commit();
            return res.status(201).json({ message: "Absorption activity for the employee done successfully"});
        }else if(activityName == "Deputation Out"){
            postEndDate = dateOfDeputingOut;
            request.input("postEndDate",postEndDate);
            let updateDepOutTranasactResult = await request.query(`UPDATE tbl_employee_transaction_details SET method_of_discharge=@methodOfDischarge,emp_post_end_date=@postEndDate,activity_name='Deputation Out',activity_date = GETDATE(),org_to_be_deputed = @orgToBeDeputed,deputation_start_date = @deputationStartDate,deputation_end_date = @deputationEndDate, date_of_deputing_out = @dateOfDeputingOut,updated_date = GETDATE(),updated_by = @userID WHERE emp_post_code=@employeePostCode AND employee_id = @employeeId`);
            let postDepuOutUpdateResult = await convertIntoVacantPost(request,employeePostCode, postEndDate);
            let insertNewEmpTransact = await request.query(`INSERT INTO tbl_employee_transaction_details(employee_id,emp_reference_id,emp_master_id,method_of_appointment,emp_working_org_id,created_date,created_by)
                VALUES(@employeeId, @employeeRefID, @empMasterID,'Deputation In', @orgToBeDeputed ,GETDATE(),@userID)`);

            await transaction.commit();
            return res.status(201).json({ message: "Deputation out activity for the employee done successfully"});
        }
        else if(activityName == "End of Deputation"){
            let newDateOfVacancy = new Date(deputationCompleteDate);
            newDateOfVacancy.setDate(newDateOfVacancy.getDate() + 1);
            request.input("newDateOfVacancy", newDateOfVacancy);

            let updateDepEndTranasactResult = await request.query(`UPDATE tbl_employee_transaction_details SET method_of_discharge=@methodOfDischarge,emp_post_end_date=@deputationCompleteDate,activity_name='End of Deputation',activity_date = GETDATE(),updated_date = GETDATE(),updated_by = @userID WHERE emp_post_code=@employeePostCode AND employee_id = @employeeId`);
            let postDepuEndUpdateResult = await convertIntoVacantPost(request,employeePostCode, newDateOfVacancy);
            await transaction.commit();
            return res.status(201).json({ message: "End of Deputation activity for the employee done successfully"});
        }
        else if(activityName == "Transfer Out"){
            postEndDate = dateOfTransferOut;
            request.input("postEndDate",postEndDate);
            let postTransferOutUpdateResult = await convertIntoVacantPost(request,employeePostCode, postEndDate);
            let updateTransOutTranasactResult = await request.query(`UPDATE tbl_employee_transaction_details SET method_of_discharge=@methodOfDischarge,emp_post_end_date=@postEndDate,activity_name='Transfer Out',activity_date = GETDATE(),org_to_be_transferred = @orgToBeTransferred,transfer_out_date = @dateOfTransferOut, updated_date = GETDATE(),updated_by = @userID WHERE emp_post_code=@employeePostCode AND employee_id = @employeeId`);
            let insertNewEmpTransact = await request.query(`INSERT INTO tbl_employee_transaction_details(employee_id,emp_master_id,method_of_appointment,created_date,created_by)
                VALUES(@employeeId,@empMasterID,'Transfer In',GETDATE(),@userID)`);

            await transaction.commit();
            return res.status(201).json({ message: "Transfer out activity for the employee done successfully"});
        }
        else if(activityName == "Promotion"){
            postEndDate = dateOfPromotion;
            request.input("postEndDate",postEndDate);
            const empResult = await request.query(`SELECT TOP 1 *
                FROM tbl_employee_transaction_details
                WHERE employee_id = @employeeId
                ORDER BY 1 DESC;`)

            const employeeIDPrev = empResult.recordset[0].employee_id;
            const empMasterIDPrev = empResult.recordset[0].emp_master_id
            const employeeRefIDPrev = empResult.recordset[0].emp_reference_id;
            const empWorkingOrgIDPrev = empResult.recordset[0].emp_working_org_id;
            const methodOfAppointmentPrev = empResult.recordset[0].method_of_appointment;
            const empPostCodePrev = empResult.recordset[0].emp_post_code;
           // const methodOfDischarge = methodOfAppointmentPrev + 'End';
           let empMethodOfDischarge;

           if(methodOfAppointmentPrev == 'Transfer In'){
              empMethodOfDischarge = 'Transfer End'
           }else if(methodOfAppointmentPrev == 'Deputation In'){
              empMethodOfDischarge = 'Deputation End'
           }else{
              empMethodOfDischarge = methodOfAppointmentPrev + ' End';
           }

            request.input("employeeIDPrev", employeeIDPrev);
            request.input("empMasterIDPrev", empMasterIDPrev);
            request.input("employeeRefIDPrev", employeeRefIDPrev);
            request.input("empWorkingOrgIDPrev", empWorkingOrgIDPrev);
            request.input("methodOfAppointmentPrev", methodOfAppointmentPrev);
            request.input("empPostCodePrev", empPostCodePrev);
            request.input("empMethodOfDischarge", empMethodOfDischarge);

            const postResult = await request.query(`SELECT post_code, post_id FROM tbl_hr_post_strength
                        WHERE employee_id = @employeeIDPrev`);
            const empPrevPostId = postResult.recordset[0].post_id;
            const empPrevPostCode = postResult.recordset[0].post_code;

            request.input("empPrevPostId", empPrevPostId);
            request.input("empPrevPostCode", empPrevPostCode);

            const updateEmpInPostStrength = await request.query(`UPDATE tbl_hr_post_strength
            SET
                employee_id = @employeeIDPrev,
                emp_master_id = @empMasterIDPrev,
                updated_date = GETDATE(),
                updated_by = @userID
                WHERE post_code = @promotionPostCode`);

            const updateTransaction = await request.query(`
                    UPDATE tbl_employee_transaction_details
                    SET method_of_discharge = @empMethodOfDischarge,
                        emp_post_end_date = @postEndDate,
                        activity_name = 'Promotion',
                        activity_date = GETDATE(),
                        updated_date = GETDATE(),
                    updated_by = @userID
                    WHERE employee_id = @employeeIDPrev
                        AND emp_master_id = @empMasterIDPrev
                        AND emp_post_code = @empPostCodePrev
                        AND method_of_appointment = @methodOfAppointmentPrev
            `);

                //making the post vacant

                const empDataResult = await request.query(`SELECT TOP 1 *
                    FROM tbl_employee_transaction_details
                    WHERE employee_id = @employeeId
                    ORDER BY 1 DESC;`)

                const empPostCodePrevious = empDataResult.recordset[0].emp_post_code;
                request.input("empPostCodePrevious",empPostCodePrevious);

                let promotionVacantUpdateResult = await convertIntoVacantPost(request,empPostCodePrevious, postEndDate);

                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = 'filled',
                        is_new = 0,
                        emp_master_id = @empMasterId,
                        employee_id = @employeeId,
                        employee_joined_date = @dateOfPromotion,
                        updated_date = GETDATE(),
                        updated_by = @userID
                    WHERE post_code = @promotionPostCode
                `);

                const getPromotionDataResult = await request.query(`SELECT
                    p.post_name,
                    p.post_id,
                    d.department_id,
                    d.department_name
                    FROM
                    mmt_hr_post p
                    LEFT JOIN tbl_hr_post_strength ps ON p.post_id = ps.post_id
                    LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
                    WHERE post_code = @promotionPostCode
                `);

                let postID = getPromotionDataResult.recordset[0].post_id;
                let departmentId = getPromotionDataResult.recordset[0].department_id;
                let postName = getPromotionDataResult.recordset[0].post_name;
                let departmentName = getPromotionDataResult.recordset[0].department_name;

                request.input("postID",postID);
                request.input("departmentId",departmentId);
                request.input("postName",postName);
                request.input("departmentName",departmentName);

            await request.query(`INSERT INTO tbl_employee_transaction_details (
            employee_id, emp_master_id, emp_reference_id, emp_post_join_date, method_of_appointment, employee_joining_date, emp_department_id, emp_post_id,
            emp_post_code, emp_post_name, emp_department_name, emp_working_org_id,  promotion_date, created_date, created_by)
            VALUES (@employeeIDPrev, @empMasterIDPrev, @employeeRefIDPrev , @dateOfPromotion, 'Promotion' , @dateOfPromotion, @departmentId, @postID,
            @promotionPostCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @dateOfPromotion,  GETDATE(), @userID)
            `);

            await transaction.commit();
            return res.status(201).json({ message: "Promotion activity for the employee done successfully"});
        }

        await transaction.commit();
        return res.status(200).json({message : "No Activity Done for the employee"});
    } catch (err) {
        if (transaction) {
            await transaction.rollback();
        }
        res.status(500).json({
            error: err.message || 'Internal Server Error',
            message: "Error occurred while updating a activity to the employee"
        });
    }
}

async function getPromotionVacantPostCode(req,res){
    const postID = req.params.postID;

    const conn = await pool;
    const request = conn.request();

    request.input("postID",postID);

    try {
        const promotionPostCodeResult = await request.query(`
            SELECT
                post_code,
                date_of_arise_in_vacancy,
                CASE
                    WHEN process_initiated_date IS NOT NULL
                        AND vigilance_clr_received_date IS NOT NULL
                        AND dpc_conducted_date IS NOT NULL
                        AND approval_by_ca_date IS NOT NULL
                        AND promotion_order_issued_date IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS flag
            FROM
                tbl_hr_post_strength
            WHERE
                vacant_or_filled = 'vacant'
                AND method_of_appointment = 'Promotion'
                AND post_id = @postID
                AND date_of_arise_in_vacancy IS NOT NULL
                AND (
				((exception_abolish IS NULL OR exception_abolish = 0)
                AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) > GETDATE())
                OR exception_abolish=1);
        `);

        res.json(promotionPostCodeResult.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({ message: "Error occurred while fetching dashboard data", err });
    }
}

//DASHBOARD APIS

async function getHRDashboardContentData(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Dynamic WHERE clause
    let whereClause = '';
    if (organisationID !== 0 && clusterID !== 0) {
        whereClause = 'WHERE o.organisation_id = @organisationID AND o.hr_cluster_id = @clusterID';
    } else if (organisationID !== 0) {
        whereClause = 'WHERE o.organisation_id = @organisationID';
    } else if (clusterID !== 0) {
        whereClause = 'WHERE o.hr_cluster_id = @clusterID';
    }

    try {
        const totalSanctionedAndFilledPost = `
            SELECT
                COUNT(ps.post_code) AS total_sanctioned_strength,
                COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            ${whereClause}
        `;

        const totalLiveVacantPost = `
            SELECT COUNT(*) AS totalLivePost
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND (
                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                    OR ps.exception_abolish = 1
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
        `;

        const totalAbolishedVacantPost = `
            SELECT COUNT(*) AS totalAbolishedPost
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND (
                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
        `;

        const [result1, result2, result3] = await Promise.all([
            request.query(totalSanctionedAndFilledPost),
            request.query(totalLiveVacantPost),
            request.query(totalAbolishedVacantPost),
        ]);

        res.json({
            totalSanctionedAndFilledPost: result1.recordset[0],
            totalLiveVacantPost: result2.recordset[0],
            totalAbolishedVacantPost: result3.recordset[0],
        });

    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching dashboard data",
            error: err.message,
        });
    }
}

async function getAbolishingPostWithinAmonth(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Build dynamic WHERE conditions
    let whereClause = `
        ps.vacant_or_filled = 'vacant'
        AND ps.date_of_arise_in_vacancy IS NOT NULL
        AND (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
        AND DATEADD(DAY, 30, GETDATE()) > DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
    `;

    if (organisationID !== 0) {
        whereClause += ` AND o.organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const result = await request.query(`
            SELECT
                ps.post_code,
                p.post_name,
				p.class_id,
				mc.class,
				ps.department_id,
				dt.department_name,
                FORMAT(ps.date_of_arise_in_vacancy, 'dd-MM-yyyy') AS date_of_arise_in_vacancy,
                FORMAT(DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy), 'dd-MM-yyyy') AS abolish_date
            FROM tbl_hr_post_strength ps
            JOIN mmt_hr_post p ON p.post_id = ps.post_id
            JOIN mmt_organisation o ON o.organisation_id = ps.organisation_id
			JOIN mmt_class mc ON p.class_id = mc.class_id
			JOIN mmt_hr_department dt ON p.department_id = dt.department_id
            WHERE ${whereClause} 
            ORDER BY ps.date_of_arise_in_vacancy ASC;
        `);

        res.json(result.recordset);

    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching abolishing post data",
            error: err.message
        });
    }
}


async function getEmpGoingToRetireWithinSixMonths(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Build WHERE clause dynamically
    let whereClause = `
        em.emp_dor > GETDATE()
        AND em.emp_dor <= DATEADD(MONTH, 6, GETDATE())
        AND td.emp_post_end_date IS NULL
    `;

    if (organisationID !== 0) {
        whereClause += ` AND em.emp_curr_org_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const result = await request.query(`
            SELECT
                em.emp_name,
				td.emp_post_name,
				po.class_id,
				mc.class,
				td.emp_department_id,
				td.emp_department_name,
                td.emp_reference_id,
                FORMAT(em.emp_dor, 'dd-MM-yyyy') AS emp_dor
            FROM dbo.tbl_employee_master em
            JOIN dbo.tbl_employee_transaction_details td ON td.emp_master_id = em.emp_master_id
            JOIN dbo.mmt_organisation o ON o.organisation_id = em.emp_curr_org_id
			JOIN mmt_hr_post po ON td.emp_post_id = po.post_id
			JOIN mmt_class mc ON po.class_id = mc.class_id
            WHERE ${whereClause}
            ORDER BY em.emp_dor ASC;
        `);

        res.json(result.recordset);

    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching retiring employees data",
            error: err.message
        });
    }
}


async function getPwbdWiseCount(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Build WHERE clause dynamically
    let whereClause = `em.emp_status = 1`;

    if (organisationID !== 0) {
        whereClause += ` AND em.emp_curr_org_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const disabilityCount = await request.query(`
            SELECT
                emp_disability,
                COUNT(CASE WHEN emp_gender = 'Male' THEN 1 END) AS male_count,
                COUNT(CASE WHEN emp_gender = 'Female' THEN 1 END) AS female_count,
                COUNT(CASE WHEN emp_gender = 'Transgender' THEN 1 END) AS transgender_count,
                COUNT(*) AS total_count
            FROM dbo.tbl_employee_master em
            ${clusterID !== 0 ? 'JOIN dbo.mmt_organisation o ON o.organisation_id = em.emp_curr_org_id' : ''}
            WHERE ${whereClause}
            GROUP BY emp_disability
        `);

        res.json(disabilityCount.recordset);

    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching PwBD-wise count",
            error: err.message
        });
    }
}

async function getExperiencedEmpCount(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Construct WHERE clause dynamically
    let whereClause = `emp_status = 1`;

    if (organisationID !== 0) {
        whereClause += ` AND emp_curr_org_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                ex_service_or_not,
                emp_gender,
                COUNT(*) AS emp_count
            FROM dbo.tbl_employee_master em
            ${clusterID !== 0 ? 'JOIN dbo.mmt_organisation o ON o.organisation_id = em.emp_curr_org_id' : ''}
            WHERE ${whereClause}
            GROUP BY ex_service_or_not, emp_gender
        `;

        const experienceCount = await request.query(query);

        res.json(experienceCount.recordset);
    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching experienced employee count",
            error: err.message,
        });
    }
}


async function getGenderWiseContByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    let whereClause = `emp_status = 1`;

    if (organisationID !== 0) {
        whereClause += ` AND emp_curr_org_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                emp_gender,
                COUNT(*) AS count_of_emp
            FROM tbl_employee_master em
            ${clusterID !== 0 ? 'JOIN mmt_organisation o ON o.organisation_id = em.emp_curr_org_id' : ''}
            WHERE ${whereClause}
            GROUP BY emp_gender
        `;

        const genderWiseCount = await request.query(query);

        res.json(genderWiseCount.recordset);
    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching gender-wise employee count",
            error: err.message,
        });
    }
}


async function getDepartmentWiseEmpContByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    let whereClause = [];
    if (organisationID !== 0) whereClause.push("ps.organisation_id = @organisationID");
    if (clusterID !== 0) whereClause.push("mo.hr_cluster_id = @clusterID");

    const finalWhereClause = whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";

    try {
        const result = await request.query(`
            SELECT
                mo.organisation_id,
                mo.organisation_name,
                d.department_id,
                d.department_name,
                mmtc.class,
                COALESCE(SUM(CASE WHEN ps.post_code IS NOT NULL THEN 1 ELSE 0 END), 0) AS total_sanctioned_strength,
                COALESCE(SUM(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 ELSE 0 END), 0) AS filled_post,
                COALESCE(SUM(CASE WHEN
                    ps.vacant_or_filled = 'vacant'
                    AND ps.date_of_arise_in_vacancy IS NOT NULL
                    AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                    OR ps.exception_abolish = 1)
                THEN 1 ELSE 0 END), 0) AS totalLivePost,
                COALESCE(SUM(CASE WHEN
                    ps.vacant_or_filled = 'vacant'
                    AND ps.date_of_arise_in_vacancy IS NOT NULL
                    AND (
                        (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                    )
                THEN 1 ELSE 0 END), 0) AS totalAbolishedPost
            FROM dbo.tbl_hr_post_strength ps
            LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
            LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
            LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
            LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id
            ${finalWhereClause}
            GROUP BY mo.organisation_name,mmtc.class, d.department_id, d.department_name,mo.organisation_id
            ORDER BY mo.organisation_name,mmtc.class;
        `);

        res.json(result.recordset);
    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching department-wise post data",
            err: err.message,
        });
    }
}


async function getAnticipatedVacanciesByOrg(req, res) {
    const organisationID = req.params.organisationID;
    const year = req.params.selectedYears;
    const departmentId = req.params.departmentId;
    const postId = req.params.postId;
    const className = req.params.className;

    if(!organisationID || organisationID == ''){
        return res.status(400).json({ message: "organisationID ID is required" });
    }

    let years;
    try {
        if (typeof year === 'string') {
            years = year.includes(',') ? year.split(',').map(y => y.trim()) : [year];
        } else if (Array.isArray(year)) {
            years = year;
        } else {
            return res.status(400).json({ message: "Invalid year format" });
        }

        years = years.map(y => {
            const yearNum = parseInt(y);
            if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
                throw new Error(`Invalid year: ${y}`);
            }
            return yearNum;
        });
    } catch (error) {
        return res.status(400).json({ message: "Invalid year format", error: error.message });
    }

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    if (departmentId && departmentId != 0) {
        request.input("departmentId", departmentId);
    }
    if (postId && postId !=0) {
        request.input("postId", postId);
    }
    if (className && className !=0) {
        request.input("className", className);
    }

    try {
        const yearCondition = years.map(y => {
            return `(em.emp_dor >= '${y}-01-01' AND em.emp_dor <= '${y}-12-31')`;
        }).join(' OR ');

        // Build additional conditions based on provided parameters
        const additionalConditions = [];
        if (departmentId && departmentId != 0) {
            additionalConditions.push('ps.department_id = @departmentId');
        }
        if (postId && postId != 0) {
            additionalConditions.push('ps.post_id = @postId');
        }
        if (className && className != 0) {
            additionalConditions.push('p.class_id = @className');
        }

        const additionalWhereClause = additionalConditions.length > 0
            ? 'AND ' + additionalConditions.join(' AND ')
            : '';

        const result = await request.query(
            `SELECT DISTINCT
                ps.*,
                mmtc.class,
                d.department_name,
                p.post_name,
                em.emp_name,
                em.emp_dor,
                DATEADD(DAY, 1, em.emp_dor) AS Anticipated_date
            FROM
                tbl_hr_post_strength ps
            LEFT JOIN tbl_employee_transaction_details et ON ps.post_id = et.emp_post_id
            LEFT JOIN tbl_employee_master em ON ps.emp_master_id = em.emp_master_id
            LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
            LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id
            LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
            WHERE ps.organisation_id = @organisationID
                AND et.emp_post_end_date IS NULL
                AND ps.vacant_or_filled='filled'
                ${additionalWhereClause}
                AND (${yearCondition})`);

        res.json(result.recordset);
    }
    catch (err) {
        return res.status(500).json({ message: "Error occurred while fetching anticipated vacancies data", err });
    }
}

async function getHRAssessmentData(req, res) {
    const organisationID = req.params.organisationID;

    if(!organisationID || organisationID == ''){
        return res.status(400).json({ message: "organisationID ID is required" });
    }

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`



            --Table view for report based on Organization

            DECLARE
                    @CURRENTYEAR INT = YEAR(GETDATE()),

                    @SYSMONTH INT = MONTH(GETDATE()),

                    @STARTMONTH INT,

                    @ENDMONTH INT = 12,

                    @LOGYEAR INT,

                    @LOGMONTH INT;

                    SET @STARTMONTH = CASE

                                        WHEN @CURRENTYEAR = 2025 THEN 7

                                        ELSE @SYSMONTH

                                      END;

                    SET @LOGYEAR = CASE

                                 WHEN @CURRENTYEAR = 2025 THEN @CURRENTYEAR

                                 ELSE @CURRENTYEAR - 1

                              END;

                    SET @LOGMONTH = CASE

                                      WHEN @CURRENTYEAR = 2025 THEN 6

                                      ELSE 12

                                   END;

            print @STARTMONTH

            print @ENDMONTH;

            WITH latest_txn AS (

                SELECT etd.emp_post_code,

                       etd.activity_name,

                       etd.separation_reason,

                       etd.activity_date,

                       ROW_NUMBER() OVER (PARTITION BY etd.emp_post_code ORDER BY etd.activity_date DESC) AS rn

                FROM tbl_employee_transaction_details etd

                WHERE activity_date IS NOT NULL AND activity_date BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH , 1)

                AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)

            ),

            VACANCY_MANAGEMENT AS (

            SELECT

            --STATIC VALUES

                ps.post_id,

                p.post_name,

                ps.department_id,

                d.department_name,

                mmtc.class,

                            /*OB Live Vacancy as on 1st June*/

                            LO.p_vacancy,

                            LO.dr_vacancy,

                            LO.total_ob_live ,


            /*Vacancy arising during the year */

                COUNT(DISTINCT CASE

                    WHEN em.emp_status = 1

                         AND em.emp_dor BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH, 1) AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)

                    THEN em.emp_master_id

                    ELSE NULL

                END) AS anticipated_count,

            COUNT(DISTINCT CASE

                WHEN ps.vacant_or_filled = 'vacant'

                     AND lt.rn = 1

                     AND NOT (

                         (lt.activity_name = 'Separation' AND ISNULL(lt.separation_reason, '') = 'Retirement')

                     )

                THEN ps.post_code

                ELSE NULL

            END) AS unforseen_count,

            COUNT(DISTINCT CASE

                WHEN ps.vacant_or_filled = 'vacant'

                     AND lt.rn = 1

                     AND  (

                         lt.activity_name = 'Promotion'

                     )

                THEN ps.post_code

                ELSE NULL

            END) AS DUE_TO_PROMOTION


              ,MAX(va.resulting_cascade_vacancy) AS resulting_cascade_vacancy

            FROM tbl_hr_post_strength ps


            LEFT JOIN latest_txn lt

                ON ps.post_code = lt.emp_post_code

               AND lt.rn = 1

            LEFT JOIN tbl_employee_transaction_details et

                ON ps.post_id = et.emp_post_id

               AND et.emp_post_end_date IS NULL

            LEFT JOIN tbl_employee_master em

                ON et.emp_master_id = em.emp_master_id


            LEFT JOIN tbl_hr_vacancy_anticipation va

                ON ps.post_id = va.post_id



            LEFT JOIN mmt_hr_post p

                ON ps.post_id = p.post_id

            LEFT JOIN mmt_hr_department d

                ON ps.department_id = d.department_id

            LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id

            LEFT JOIN (SELECT * FROM tbl_hr_vacancy_anticipation_log  WHERE Year = @LOGYEAR AND Month = @LOGMONTH) AS LO

                ON  PS.post_id = LO.post_id




            WHERE ps.organisation_id = @organisationID

            GROUP BY

                ps.post_id,

                p.post_name,

                ps.department_id,

                d.department_name,

                mmtc.class,

                LO.p_vacancy,

                LO.dr_vacancy,

                LO.total_ob_live

                ),
              exp_promotion1 as (
                                 select emp_post_id, emp_post_code, max(transaction_id) as trans_id from tbl_employee_transaction_details et
                                 join tbl_hr_post_strength ps on ps.post_code = et.emp_post_code
                                 WHERE ps.organisation_id = @organisationID and et.activity_name = 'Separation' and et.separation_reason = 'Retirement'
                                 and ps.vacant_or_filled = 'Vacant' and ps.vacancy_type = 'Promotion'
                                 AND ps.date_of_arise_in_vacancy BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH, 1) AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)
                                 group by et.emp_post_id, et.emp_post_code ),

               exp_promotion2 as (select et.emp_post_id, COUNT(et.emp_post_code) AS EMP_PRO2 from tbl_employee_master em
                                   JOIN tbl_employee_transaction_details et ON et.emp_master_id = em.emp_master_id
                                   JOIN tbl_hr_post_strength ps ON ps.post_code = ET.emp_post_code
                                   JOIN latest_txn lt ON lt.emp_post_code = PS.post_code
                                 WHERE  em.emp_status = 1 AND PS.organisation_id = @organisationID
                                AND em.emp_dor BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH, 1) AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)
                                and ps.vacant_or_filled = 'vacant' and ps.vacancy_type = 'Promotion' AND lt.rn = 1 AND NOT ((lt.activity_name = 'Separation'
                                AND ISNULL(lt.separation_reason, '') = 'Retirement'))
                                 group by et.emp_post_id ),
              EXP_PROMOTION3 AS (SELECT ps.post_id, COUNT(ps.post_code) AS EMP_PRO3 FROM tbl_hr_post_strength ps
                                    JOIN latest_txn lt ON lt.emp_post_code = ps.post_code
                                    WHERE ps.organisation_id = @organisationID AND
                                    ps.vacant_or_filled = 'vacant' AND lt.rn = 1 AND lt.activity_name = 'Promotion'
                                    GROUP BY PS.post_id),




                 exp_directR1 as (
                              select emp_post_id, emp_post_code, max(transaction_id) as trans_id from tbl_employee_transaction_details et
                             join tbl_hr_post_strength ps on ps.post_code = et.emp_post_code
                             WHERE ps.organisation_id = @organisationID and et.activity_name = 'Separation' and et.separation_reason = 'Retirement'
                             and ps.vacant_or_filled = 'Vacant' and vacancy_type = 'Direct Recruitment'
                             AND ps.date_of_arise_in_vacancy BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH, 1) AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)
                             group by et.emp_post_id, et.emp_post_code ),
                 exp_directR2 as (select et.emp_post_id, COUNT(et.emp_post_code) AS EMP_DR2 from tbl_employee_master em
                                   JOIN tbl_employee_transaction_details et ON et.emp_master_id = em.emp_master_id
                                   JOIN tbl_hr_post_strength ps ON ps.post_code = ET.emp_post_code
                                   JOIN latest_txn lt ON lt.emp_post_code = PS.post_code
                                 WHERE  em.emp_status = 1 AND PS.organisation_id = @organisationID
                                AND em.emp_dor BETWEEN DATEFROMPARTS(YEAR(GETDATE()), @STARTMONTH, 1) AND DATEFROMPARTS(YEAR(GETDATE()), @ENDMONTH, 31)
                                and ps.vacant_or_filled = 'vacant' and ps.vacancy_type = 'Direct Recruitment' AND lt.rn = 1 AND NOT ((lt.activity_name = 'Separation'
                                AND ISNULL(lt.separation_reason, '') = 'Retirement'))
                                 group by et.emp_post_id ),
                  exp_directR3 AS (SELECT ps.post_id, COUNT(ps.post_code) AS EMP_DR3 FROM tbl_hr_post_strength ps
                                        JOIN latest_txn lt ON lt.emp_post_code = ps.post_code
                                        WHERE ps.organisation_id = @organisationID AND
                                        ps.vacant_or_filled = 'vacant' AND lt.rn = 1 AND lt.activity_name = 'Direct Recruitment'
                                        GROUP BY PS.post_id)


                --SELECT * FROM EXP_PROMOTION3
                SELECT VACANCY_MANAGEMENT.post_id ,VACANCY_MANAGEMENT.department_id, department_name ,post_name ,class,

                 p_vacancy, dr_vacancy,  total_ob_live,resulting_cascade_vacancy,

                anticipated_count AS [anticipated_vacancy] , unforseen_count AS [unforeseen_vacancy], DUE_TO_PROMOTION AS [due_to_promotion] ,

                anticipated_count + unforseen_count + DUE_TO_PROMOTION AS [total_vacany_arised],


                VACANCY_MANAGEMENT.p_vacancy + ISNULL(EXP_PRO1.expected_promotion,0)
                + ISNULL(exp_promotion2.EMP_PRO2 ,0) + ISNULL(EXP_PROMOTION3.EMP_PRO3, 0) AS [expected_promotion],

                VACANCY_MANAGEMENT.dr_vacancy + ISNULL(EXP_DR1.expected_dr,0)
                + ISNULL(exp_directR2.EMP_DR2 ,0) + ISNULL(exp_directR3.EMP_DR3, 0) AS [expected_dr],

                VACANCY_MANAGEMENT.p_vacancy + ISNULL(EXP_PRO1.expected_promotion,0)
                + ISNULL(exp_promotion2.EMP_PRO2 ,0) + ISNULL(EXP_PROMOTION3.EMP_PRO3, 0)
                + VACANCY_MANAGEMENT.dr_vacancy + ISNULL(EXP_DR1.expected_dr,0)
                + ISNULL(exp_directR2.EMP_DR2 ,0) + ISNULL(exp_directR3.EMP_DR3, 0)  AS [total_expected]

                FROM VACANCY_MANAGEMENT
                LEFT JOIN
                (select  emp_post_id, count(*) as expected_promotion from exp_promotion1 group by emp_post_id ) EXP_PRO1
                ON EXP_PRO1.emp_post_id = VACANCY_MANAGEMENT.post_id

                LEFT JOIN exp_promotion2 ON VACANCY_MANAGEMENT.post_id = exp_promotion2.emp_post_id
                LEFT JOIN EXP_PROMOTION3 ON VACANCY_MANAGEMENT.post_id = EXP_PROMOTION3.post_id

                LEFT JOIN
                (select  emp_post_id, count(*) as expected_dr from exp_directR1 group by emp_post_id ) EXP_DR1
                ON EXP_DR1.emp_post_id = VACANCY_MANAGEMENT.post_id

                LEFT JOIN exp_directR2 ON VACANCY_MANAGEMENT.post_id = exp_directR2.emp_post_id
                LEFT JOIN exp_directR3 ON VACANCY_MANAGEMENT.post_id = exp_directR3.post_id
`);

        res.json(result.recordset);
    }
    catch (err) {
        //console.log(err);
        return res.status(500).json({ message: "Error occurred while fetching anticipated vacancies data", err });
    }
}

async function saveHrVacancyAnticipation(req, res) {
    const { organisationID, userID, tableData } = req.body;
    console.log("req body ",req.body);

    if (!organisationID || !userID || !Array.isArray(tableData) || tableData.length === 0) {
        return res.status(400).json({ message: "Missing or invalid input data" });
    }

    const conn = await pool;
    const transaction = new sql.Transaction(conn);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input("organisationID", organisationID);

        await request.query(`DELETE FROM tbl_hr_vacancy_anticipation WHERE organisation_id = @organisationID`);

        const insertQuery = `
            INSERT INTO tbl_hr_vacancy_anticipation (
                department_id,
                post_id,
                resulting_cascade_vacancy,
                organisation_id,
                created_date,
                created_by
            )
            VALUES (
                @department_id,
                @post_id,
                @resultant_cascade_vacancy,
                @organisationID,
                GETDATE(),
                @userID
            );
        `;

        for (const row of tableData) {
            const insertRequest = new sql.Request(transaction);

            insertRequest
                .input("department_id",  row.department_id)
                .input("post_id",  row.post_id)
                .input("resultant_cascade_vacancy",  row.resultant_cascade_vacancy)
                .input("organisationID",  organisationID)
                .input("userID",  userID);

            await insertRequest.query(insertQuery);
        }

        await transaction.commit();

        return res.status(201).json({ message: "Vacancy anticipation data saved successfully." });
    } catch (err) {
        await transaction.rollback();
        console.error("Error saving vacancy anticipation data:", err);
        return res.status(500).json({ message: "Error saving data", error: err.message });
    }
}

async function submitAnticipatedVacancies(req,res){
    let {organisationID, tableData, userID} = req.body;

    if (!organisationID || !tableData || !userID) {
        return res.status(400).json({ message: "Missing required parameters" });
    }

    const conn = await pool;
    const transaction = new sql.Transaction(conn);

    try {
        await transaction.begin();

        for (const row of tableData) {
            if (!row.post_code || row.expected_anticipated_vacancy === undefined || row.expected_anticipated_vacancy === null) {
                throw new Error("Missing post_code or expected_anticipated_vacancy in table data");
            }

            const updateRequest = new sql.Request(transaction);
            const updateQuery = `
                UPDATE tbl_hr_post_strength
                SET expected_anticipated_vacancy = @expected_anticipated_vacancy,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE post_code = @post_code`;

            updateRequest
                .input("expected_anticipated_vacancy", row.expected_anticipated_vacancy)
                .input("post_code", row.post_code)
                .input("userID", userID)
                .input("organisationID", organisationID);

            await updateRequest.query(updateQuery);
        }

        await transaction.commit();
        return res.status(200).json({ message: "Anticipated vacancies updated successfully" });

    } catch (err) {
        await transaction.rollback();
        //console.error("Error updating anticipated vacancies:", err);
        return res.status(500).json({ message: "Error updating data", error: err.message });
    }
}

async function getOrganisationByCluster(req,res){
    const {clusterID} = req.params;

    const conn = await pool;
    const request = conn.request();

    request.input("clusterID",clusterID);

    let orgQuery='';

    if(!clusterID ||clusterID != 0){
        orgQuery = `SELECT * FROM mmt_organisation WHERE hr_cluster_id = @clusterID`;
    }else{
        orgQuery = `SELECT * FROM mmt_organisation`;
    }

    try{
        let result = await request.query(orgQuery);
        res.json(result.recordset);
    }catch(e){
        return res.status(500).json({ message: "Error updating data", error: e.message });
    }
}

async function updateReasonForProcessNotInitiated(req,res){
    const {postCode,reason} = req.body;

    const conn = await pool;
    const request = conn.request();

    request.input("postCode",postCode);
    request.input("reason",reason);
    console.log("postCode,")

    try{
        let result = await request.query(`UPDATE tbl_hr_post_strength SET reason_for_process_not_initiated = @reason WHERE post_code=@postCode AND 1=1 AND 1=1`);
        return res.status(201).json({ message: "Reason for process not initiated updated successfully" });
    }catch(e){
        console.log("error",e);
        return res.status(500).json({ message: "Error updating data", error: e.message });
    }

}

async function updateHRPostActivitiy(req, res) {
    const organisationID = req.body.organisationID;
    const methodOfAppointment = req.body.methodOfAppointment;
    const vacancyType = req.body.vacancyType;
    let exceptionAbolish = null;
    if (req.body.exceptionAbolish) {
        if (req.body.exceptionAbolish === "1" || req.body.exceptionAbolish === "0") {
            exceptionAbolish = parseInt(req.body.exceptionAbolish);
        }
    }
    const reasonForExemption = req.body.reasonForExemption?.length ? req.body.reasonForExemption : null;
    const recruitmentThrough = req.body.recruitmentThrough?.length ? req.body.recruitmentThrough : null;

    const processInitiatedDate = req.body.processInitiatedDate?.length ? req.body.processInitiatedDate : null;
    const notificationIssuedDate = req.body.notificationIssuedDate?.length ? req.body.notificationIssuedDate : null;
    const reNotificationIssuedDate = req.body.reNotificationIssuedDate?.length ? req.body.reNotificationIssuedDate : null;
    const examConductedDate = req.body.examConductedDate?.length ? req.body.examConductedDate : null;
    const interviewConductedDate = req.body.interviewConductedDate?.length ? req.body.interviewConductedDate : null;
    const selectionProcessDate = req.body.selectionProcessDate?.length ? req.body.selectionProcessDate : null;
    const resultDeclaredDate = req.body.resultDeclaredDate?.length ? req.body.resultDeclaredDate : null;
    const appointmentLetterIssuedDate = req.body.appointmentLetterIssuedDate?.length ? req.body.appointmentLetterIssuedDate : null;

    const dischargeReason = req.body.dischargeReason?.length ? req.body.dischargeReason : null;

    const applicationReceivedDeputation = req.body.applicationReceivedDeputation?.length ? req.body.applicationReceivedDeputation : null;
    const reviewOfApplicationDeputation = req.body.reviewOfApplicationDeputation?.length ? req.body.reviewOfApplicationDeputation : null;
    const approvalReceivedDeputation = req.body.approvalReceivedDeputation?.length ? req.body.approvalReceivedDeputation : null;
    const orderIssuedDeputation = req.body.orderIssuedDeputation?.length ? req.body.orderIssuedDeputation : null;
    const organisationOfEmp = req.body.organisationOfEmp?.length ? req.body.organisationOfEmp : null;

    const vigilanceClearanceDatePromotion = req.body.vigilanceClearanceDatePromotion?.length ? req.body.vigilanceClearanceDatePromotion : null;
    const dpcConductedDatePromotion = req.body.dpcConductedDatePromotion?.length ? req.body.dpcConductedDatePromotion : null;
    const approvalByAuthorityDatePromotion = req.body.approvalByAuthorityDatePromotion?.length ? req.body.approvalByAuthorityDatePromotion : null;
    const orderDatePromotion = req.body.orderDatePromotion?.length ? req.body.orderDatePromotion : null;
    const selectEmployeeId = req.body.selectEmployeeId?.length ? req.body.selectEmployeeId : null;

    const selectDeputedEmployeeId = req.body.deputedEmpId?.length ? req.body.deputedEmpId : null;
    const selectDeputedEmployeeMasterId = req.body.deputedEmpMasterId ? (Array.isArray(req.body.deputedEmpMasterId) ? req.body.deputedEmpMasterId[0] : req.body.deputedEmpMasterId) : null;
    const transferEmpId = req.body.transferEmpId?.length ? req.body.transferEmpId : null;
    let transferEmpMasterId = req.body.transferEmpMasterId;
    const dateOfJoiningTransferIn = req.body.dateOfJoiningTransferIn?.length ? req.body.dateOfJoiningTransferIn : null;
    const numberOfEligibleApplication = req.body.numberOfEligibleApplication?.length ? req.body.numberOfEligibleApplication : null;


    // const employeeJoinedDate = req.body.employeeJoinedDate?.length ? req.body.employeeJoinedDate : null;
    // let postEndDate = null;
    // if (employeeJoinedDate) {
    //     const date = new Date(employeeJoinedDate);
    //     date.setDate(date.getDate() - 1);
    //     postEndDate = date.toISOString().split('T')[0];
    // }

    // const dateOfAriseInVacancy = req.body.dateOfAriseInVacancy?.length ? req.body.dateOfAriseInVacancy : null;

    // const allFieldsFilled = req.body.allFieldsFilled;

    // const postID = req.body.postId;
    const postCode = req.body.postCode;
    const userID = req.body.userID;

    const currentDate = new Date().toISOString().slice(0, 10);

    const conn = await pool;
    const request = conn.request();

    const transaction = new sql.Transaction(conn);

    request.input("organisationID", organisationID);
    request.input("processInitiatedDate", processInitiatedDate);
    request.input("notificationIssuedDate", notificationIssuedDate);
    request.input("reNotificationIssuedDate", reNotificationIssuedDate);
    request.input("examConductedDate", examConductedDate);
    request.input("interviewConductedDate", interviewConductedDate);
    request.input("selectionProcessDate", selectionProcessDate);
    request.input("resultDeclaredDate", resultDeclaredDate);
    request.input("appointmentLetterIssuedDate", appointmentLetterIssuedDate);
    // request.input("postID", postID);
    request.input("postCode", postCode);
    // request.input("exceptionAbolish", exceptionAbolish);
    request.input("reasonForExemption",reasonForExemption);
    request.input("recruitmentThrough",recruitmentThrough);

    request.input("dischargeReason", dischargeReason);
    request.input("vacancyType",vacancyType);

    request.input("applicationReceivedDeputation", applicationReceivedDeputation);
    request.input("reviewOfApplicationDeputation", reviewOfApplicationDeputation);
    request.input("approvalReceivedDeputation", approvalReceivedDeputation);
    request.input("orderIssuedDeputation", orderIssuedDeputation);
    request.input("organisationOfEmp", organisationOfEmp);
    // request.input("employeeJoinedDate", employeeJoinedDate);

    request.input("vigilanceClearanceDatePromotion", vigilanceClearanceDatePromotion);
    request.input("dpcConductedDatePromotion", dpcConductedDatePromotion);
    request.input("approvalByAuthorityDatePromotion", approvalByAuthorityDatePromotion);
    request.input("orderDatePromotion", orderDatePromotion);
    request.input("selectEmployeeId", selectEmployeeId);
    request.input("currentDate", currentDate);
    request.input("selectDeputedEmployeeId", selectDeputedEmployeeId);
    request.input("selectDeputedEmployeeMasterId", selectDeputedEmployeeMasterId);


    // request.input("postEndDate", postEndDate);

    // request.input("dateOfAriseInVacancy", dateOfAriseInVacancy);
    request.input("userID", userID);

    // request.input("transferEmpId", transferEmpId);
    // request.input("transferEmpMasterId", transferEmpMasterId);
    // request.input("dateOfJoiningTransferIn", dateOfJoiningTransferIn);

    request.input("numberOfEligibleApplication", numberOfEligibleApplication);

    await transaction.begin();
    switch (methodOfAppointment) {
        case 'directRecruitment':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength
                // SET process_initiated_date = @processInitiatedDate,
                //  notification_adv_issued_date = @notificationIssuedDate,
                //  renotification_adv_issued_date = @reNotificationIssuedDate,
                //  exam_conducted_date = @examConductedDate,
                //  interview_conducted_date = @interviewConductedDate,
                //  selection_process_completed_date = @selectionProcessDate,
                //  result_declared_date = @resultDeclaredDate,
                //  appointment_letter_issued_date = @appointmentLetterIssuedDate
                //  WHERE post_code = @postCode`);



                await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                    expected_anticipated_vacancy = 'Direct Recruitment',
                    A_is_recruitment_through_ipa = @recruitmentThrough,
                    A_process_initiated_date = @processInitiatedDate,
                    A_notification_adv_issued_date = @notificationIssuedDate,
                    A_number_of_eligible_application = @numberOfEligibleApplication,
                    A_renotification_adv_issued_date = @reNotificationIssuedDate,
                    A_exam_conducted_date = @examConductedDate,
                    A_interview_conducted_date = @interviewConductedDate,
                    A_selection_process_completed_date = @selectionProcessDate,
                    A_result_declared_date = @resultDeclaredDate,
                    A_appointment_letter_issued_date = @appointmentLetterIssuedDate,
                    A_vigilance_clr_received_date = NULL,
                    A_dpc_conducted_date = NULL,
                    A_approval_by_ca_date = NULL,
                    A_promotion_order_issued_date = NULL,
                    A_application_received_date = NULL,
                    A_review_application_by_comm = NULL,
                    A_approval_received_date = NULL,
                    A_order_issued_date = NULL,
                    updated_date = @currentDate,
                    updated_by = @userID
                WHERE post_code = @postCode
            `);

                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'promotion':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        expected_anticipated_vacancy = 'Promotion',
                        A_process_initiated_date = @processInitiatedDate,
                        A_vigilance_clr_received_date = @vigilanceClearanceDatePromotion,
                        A_dpc_conducted_date = @dpcConductedDatePromotion,
                        A_approval_by_ca_date = @approvalByAuthorityDatePromotion,
                        A_promotion_order_issued_date = @orderDatePromotion,
                        A_application_received_date = NULL,
                        A_review_application_by_comm = NULL,
                        A_approval_received_date = NULL,
                        A_order_issued_date = NULL,
                        A_number_of_eligible_application = NULL,
                        A_exam_conducted_date = NULL,
                        A_interview_conducted_date = NULL,
                        A_selection_process_completed_date = NULL,
                        A_result_declared_date = NULL,
                        A_appointment_letter_issued_date = NULL,
                        updated_date = @currentDate,
                        updated_by = @userID
                    WHERE post_code = @postCode
                `);

                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
    }
};

async function getCommunityWiseCountByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    let whereClause = `emp_status = 1`;

    if (organisationID !== 0) {
        whereClause += ` AND emp_curr_org_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                COUNT(CASE WHEN emp_ethnic_origin = 'SC' THEN 1 END) AS sc_count,
                COUNT(CASE WHEN emp_ethnic_origin = 'ST' THEN 1 END) AS st_count,
                COUNT(CASE WHEN emp_ethnic_origin = 'UR' THEN 1 END) AS ur_count,
                COUNT(CASE WHEN emp_ethnic_origin = 'OB' THEN 1 END) AS ob_count,
                COUNT(CASE WHEN emp_ethnic_origin = 'OBC' THEN 1 END) AS obc_count,
                COUNT(CASE WHEN emp_ethnic_origin = 'EWS' THEN 1 END) AS ews_count,
                COUNT(*) AS total_count
            FROM tbl_employee_master em
            ${clusterID !== 0 ? 'JOIN mmt_organisation o ON o.organisation_id = em.emp_curr_org_id' : ''}
            WHERE ${whereClause}
        `;

        const communityWiseCount = await request.query(query);
        res.json(communityWiseCount.recordset);
    } catch (err) {
        // console.log('err',err)
        return res.status(500).json({message: "Error occurred while fetching community-wise employee count"});
    }
}

async function getHRDashboardContentDataFiltered(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    let conditions = [];

    if (organisationID !== 0) conditions.push("o.organisation_id = @organisationID");
    if (clusterID !== 0) conditions.push("o.hr_cluster_id = @clusterID");

    conditions.push("1=1");
    conditions.push("1=1");

    let whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    try {
        const totalSanctionedAndFilledPost = `
            SELECT
                COUNT(ps.post_code) AS total_sanctioned_strength,
                COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            ${whereClause} 
        `;

        const totalLiveVacantPost = `
            SELECT COUNT(*) AS totalLivePost
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND (
                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                    OR ps.exception_abolish = 1
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
            AND 1=1 AND 1=1
        `;

        const totalAbolishedVacantPost = `
            SELECT COUNT(*) AS totalAbolishedPost
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND (
                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
            AND 1=1 AND 1=1
        `;

        const [result1, result2, result3] = await Promise.all([
            request.query(totalSanctionedAndFilledPost),
            request.query(totalLiveVacantPost),
            request.query(totalAbolishedVacantPost),
        ]);

        res.json({
            totalSanctionedAndFilledPost: result1.recordset[0],
            totalLiveVacantPost: result2.recordset[0],
            totalAbolishedVacantPost: result3.recordset[0],
        });

    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching dashboard data",
            error: err.message,
        });
    }
}

async function getDepartmentWiseEmpContByOrgFiltered(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    let whereClause = [];
    if (organisationID !== 0) whereClause.push("ps.organisation_id = @organisationID");
    if (clusterID !== 0) whereClause.push("mo.hr_cluster_id = @clusterID");

    whereClause.push("1=1");
    whereClause.push("1=1");

    const finalWhereClause =
        whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";
    
    try {
        const result = await request.query(`
            SELECT
                mo.organisation_id,
                mo.organisation_name,
                d.department_id,
                d.department_name,
                mmtc.class,
                COALESCE(SUM(CASE WHEN ps.post_code IS NOT NULL THEN 1 ELSE 0 END), 0) AS total_sanctioned_strength,
                COALESCE(SUM(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 ELSE 0 END), 0) AS filled_post,
                COALESCE(SUM(CASE WHEN
                    ps.vacant_or_filled = 'vacant'
                    AND ps.date_of_arise_in_vacancy IS NOT NULL
                    AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                    OR ps.exception_abolish = 1)
                THEN 1 ELSE 0 END), 0) AS totalLivePost,
                COALESCE(SUM(CASE WHEN
                    ps.vacant_or_filled = 'vacant'
                    AND ps.date_of_arise_in_vacancy IS NOT NULL
                    AND (
                        (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                    )
                THEN 1 ELSE 0 END), 0) AS totalAbolishedPost
            FROM dbo.tbl_hr_post_strength ps
            LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
            LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
            LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
            LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id
            ${finalWhereClause}
            GROUP BY mo.organisation_name,mmtc.class, d.department_id, d.department_name,mo.organisation_id
            ORDER BY mo.organisation_name,mmtc.class;
        `);

        res.json(result.recordset);
    } catch (err) {
        return res.status(500).json({
            message: "Error occurred while fetching department-wise post data",
            err: err.message,
        });
    }
}

async function getAdminHRDashboardContentData(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID);
        const clusterID = parseInt(req.params.clusterID);

        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);
        if (clusterID !== 0) request.input("clusterID", clusterID);

        // dynamic filters
        function buildFilters(orgID, clusterID) {
            let filter = "";
            if (orgID !== 0) filter += " AND o.organisation_id = @organisationID";
            if (clusterID !== 0) filter += " AND o.hr_cluster_id = @clusterID";
            return filter;
        }

        const dynamicFilters = buildFilters(organisationID, clusterID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;

        const lastMonthFilter = `AND ps.Uploaded_month = ${lastMonthNumber}`;
        
        let whereClause = "";
        if (organisationID !== 0 && clusterID !== 0) {
            whereClause = "WHERE o.organisation_id = @organisationID AND o.hr_cluster_id = @clusterID";
        } else if (organisationID !== 0) {
            whereClause = "WHERE o.organisation_id = @organisationID";
        } else if (clusterID !== 0) {
            whereClause = "WHERE o.hr_cluster_id = @clusterID";
        }

        const combinedQuery = `
            SELECT
                -- Total sanctioned + filled
                (
                    SELECT COUNT(*) 
                    FROM tbl_hr_post_strength ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    ${whereClause}
                ) +
                (
                    SELECT COUNT(*) 
                    FROM tbl_hr_other_org_vacancy_details ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    ${whereClause}
                    ${lastMonthFilter}
                ) AS totalSanctionedAndFilledPost,

                -- Total filled posts
                ISNULL((
                    SELECT SUM(CASE WHEN LOWER(LTRIM(RTRIM(ps.vacant_or_filled))) = 'filled' THEN 1 ELSE 0 END)
                    FROM tbl_hr_post_strength ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    ${whereClause}
                ), 0)
                +
                ISNULL((
                    SELECT SUM(CASE WHEN LOWER(LTRIM(RTRIM(ps.vacant_or_filled))) = 'filled' THEN 1 ELSE 0 END)
                    FROM tbl_hr_other_org_vacancy_details ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    ${whereClause}
                    ${lastMonthFilter}
                ), 0) AS filled_post,

                -- Total live vacant posts
                (
                    SELECT COUNT(*)
                    FROM tbl_hr_post_strength ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    WHERE ps.vacant_or_filled = 'vacant'
                        AND ps.date_of_arise_in_vacancy IS NOT NULL
                        AND (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                            OR ps.exception_abolish = 1
                        )
                        ${dynamicFilters}
                )
                +
                (
                    SELECT COUNT(*)
                    FROM tbl_hr_other_org_vacancy_details ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    WHERE ps.vacant_or_filled = 'vacant'
                        AND ps.date_of_arise IS NOT NULL
                        AND (
                            (ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise) > GETDATE()
                            OR ps.is_exemption_abolished = 1
                        )
                        ${dynamicFilters}
                        ${lastMonthFilter}
                ) AS totalLiveVacantPost,

                -- Total abolished vacant posts
                (
                    SELECT COUNT(*)
                    FROM tbl_hr_post_strength ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    WHERE ps.vacant_or_filled = 'vacant'
                        AND ps.date_of_arise_in_vacancy IS NOT NULL
                        AND (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                        )
                        ${dynamicFilters}
                )
                +
                (
                    SELECT COUNT(*)
                    FROM tbl_hr_other_org_vacancy_details ps
                    INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
                    WHERE ps.vacant_or_filled = 'vacant'
                        AND ps.date_of_arise IS NOT NULL
                        AND (
                            (ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise) <= GETDATE()
                        )
                        ${dynamicFilters}
                        ${lastMonthFilter}
                ) AS totalAbolishedVacantPost
        `;

        const combinedResult = await request.query(combinedQuery);

        if (organisationID === 0 && clusterID === 0) {
            return res.json({
                combinedTotals: combinedResult.recordset[0],
                clusterTotals: null,
                message: "Returned combined totals only (organisationID=0 and clusterID=0)"
            });
        }

        let tableName = "";
        let vacantDateColumn = "";
        let abolishColumn = "";
        let otherOrgLastMonth = ""; 
        if (clusterID === 1) {
            tableName = "tbl_hr_post_strength";
            vacantDateColumn = "date_of_arise_in_vacancy";
            abolishColumn = "exception_abolish";
            otherOrgLastMonth = ""; 
        } else if (clusterID === 2) {
            tableName = "tbl_hr_other_org_vacancy_details";
            vacantDateColumn = "date_of_arise";
            abolishColumn = "is_exemption_abolished";
            otherOrgLastMonth = lastMonthFilter;
        } else {
            return res.json({
                combinedTotals: combinedResult.recordset[0],
                clusterTotals: null,
                message: "Returned combined totals only (invalid or unsupported clusterID)"
            });
        }

        const totalSanctionedAndFilledPost = `
            SELECT
                COUNT(*) AS total_sanctioned_strength,
                ISNULL(SUM(
                    CASE WHEN LOWER(LTRIM(RTRIM(ps.vacant_or_filled))) = 'filled'
                    THEN 1 ELSE 0 END
                ), 0) AS filled_post
            FROM ${tableName} ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE 1=1
            ${dynamicFilters}
            ${otherOrgLastMonth}
        `;

        const totalLiveVacantPost = `
            SELECT COUNT(*) AS totalLiveVacantPost
            FROM ${tableName} ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE ps.vacant_or_filled = 'vacant'
                AND ps.${vacantDateColumn} IS NOT NULL
                AND (
                    (ps.${abolishColumn} IS NULL OR ps.${abolishColumn} = 0)
                    AND DATEADD(YEAR, 5, ps.${vacantDateColumn}) > GETDATE()
                    OR ps.${abolishColumn} = 1
                )
                ${dynamicFilters}
                ${otherOrgLastMonth}
        `;

        const totalAbolishedVacantPost = `
            SELECT COUNT(*) AS totalAbolishedVacantPost
            FROM ${tableName} ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE ps.vacant_or_filled = 'vacant'
                AND ps.${vacantDateColumn} IS NOT NULL
                AND (
                    (ps.${abolishColumn} IS NULL OR ps.${abolishColumn} = 0)
                    AND DATEADD(YEAR, 5, ps.${vacantDateColumn}) <= GETDATE()
                )
                ${dynamicFilters}
                ${otherOrgLastMonth}
        `;

        const [r1, r2, r3] = await Promise.all([
            request.query(totalSanctionedAndFilledPost),
            request.query(totalLiveVacantPost),
            request.query(totalAbolishedVacantPost)
        ]);

        return res.json({
            combinedTotals: combinedResult.recordset[0],
            clusterTotals: {
                totalSanctionedAndFilledPost: r1.recordset[0],
                totalLiveVacantPost: r2.recordset[0],
                totalAbolishedVacantPost: r3.recordset[0]
            }
        });

    } catch (error) {
        console.error("Error fetching HR dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getAdminViewGenderWiseContByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    let clusterID = parseInt(req.params.clusterID);

    try {
        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;

        // If clusterID is not provided, detect it based on organisationID
        if ((!clusterID || clusterID === 0) && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM mmt_organisation 
                WHERE organisation_id = @organisationID
            `);

            if (clusterResult.recordset.length > 0) {
                clusterID = clusterResult.recordset[0].hr_cluster_id;
            } else {
                clusterID = 0; 
            }
        }

        let query = '';

        if (clusterID === 1) {
            let whereClause = `emp_status = 1`;
            if (organisationID !== 0) whereClause += ` AND emp_curr_org_id = @organisationID`;

            query = `
                SELECT em.emp_gender AS gender, COUNT(*) AS count_of_emp
                FROM tbl_employee_master em
                WHERE ${whereClause}
                GROUP BY em.emp_gender
            `;
        } else if (clusterID === 2) {
            let whereClause = `1=1`;
            if (organisationID !== 0) whereClause += ` AND organisation_id = @organisationID`;

            query = `
                SELECT em.gender AS gender, COUNT(*) AS count_of_emp
                FROM tbl_hr_other_org_vacancy_details em
                WHERE ${whereClause}
                AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY em.gender
            `;
        } else {
            // Combine both tables
            let whereClauseEmp = `emp_status = 1`;
            let whereClauseOther = `1=1`;

            if (organisationID !== 0) {
                whereClauseEmp += ` AND emp_curr_org_id = @organisationID`;
                whereClauseOther += ` AND organisation_id = @organisationID`;
            }

            query = `
                SELECT em.emp_gender AS gender, COUNT(*) AS count_of_emp
                FROM tbl_employee_master em
                WHERE ${whereClauseEmp}
                GROUP BY em.emp_gender

                UNION ALL

                SELECT em.gender AS gender, COUNT(*) AS count_of_emp
                FROM tbl_hr_other_org_vacancy_details em
                WHERE ${whereClauseOther}
                AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY em.gender
            `;
        }

        const result = await request.query(query);

        const aggregated = result.recordset.reduce((acc, row) => {
            if (!acc[row.gender]) acc[row.gender] = 0;
            acc[row.gender] += row.count_of_emp;
            return acc;
        }, {});

        const formatted = Object.keys(aggregated)
            .sort()
            .map(g => ({
                gender: g,
                count_of_emp: aggregated[g]
            }));

        res.json(formatted);

    } catch (err) {
        res.status(500).json({
            message: "Error occurred while fetching gender-wise employee count",
            error: err.message,
        });
    }
}

async function getAdminViewExperiencedEmpCount(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID);
        let clusterID = parseInt(req.params.clusterID); // might be 0 or NaN

        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;

        // If clusterID not provided, detect it based on organisationID
        if ((!clusterID || clusterID === 0) && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM dbo.mmt_organisation 
                WHERE organisation_id = @organisationID
            `);
            clusterID = clusterResult.recordset.length > 0 ? clusterResult.recordset[0].hr_cluster_id : 0;
        }

        // Dynamic WHERE clauses
        const whereClauses = {
            emp: "emp_status = 1",
            other: "1=1"
        };

        if (organisationID !== 0) {
            whereClauses.emp += " AND em.emp_curr_org_id = @organisationID";
            whereClauses.other += " AND em.organisation_id = @organisationID";
        }

        let query = "";

        if (clusterID === 1) {
            query = `
                SELECT 
                    em.ex_service_or_not AS experience_status,
                    em.emp_gender AS gender,
                    COUNT(*) AS emp_count
                FROM dbo.tbl_employee_master em
                WHERE ${whereClauses.emp}
                GROUP BY em.ex_service_or_not, em.emp_gender
            `;
        } else if (clusterID === 2) {
            query = `
                SELECT 
                    em.whether_ex_serviceman AS experience_status,
                    em.gender AS gender,
                    COUNT(*) AS emp_count
                FROM dbo.tbl_hr_other_org_vacancy_details em
                WHERE ${whereClauses.other} 
                AND em.Uploaded_month = ${lastMonthNumber} 
                GROUP BY em.whether_ex_serviceman, em.gender
            `;
        } else {
            // Combine both tables
            query = `
                SELECT 
                    em.ex_service_or_not AS experience_status,
                    em.emp_gender AS gender,
                    COUNT(*) AS emp_count
                FROM dbo.tbl_employee_master em
                WHERE ${whereClauses.emp}
                GROUP BY em.ex_service_or_not, em.emp_gender

                UNION ALL

                SELECT 
                    em.whether_ex_serviceman AS experience_status,
                    em.gender AS gender,
                    COUNT(*) AS emp_count
                FROM dbo.tbl_hr_other_org_vacancy_details em
                WHERE ${whereClauses.other} 
                AND em.Uploaded_month = ${lastMonthNumber} 
                GROUP BY em.whether_ex_serviceman, em.gender
            `;
        }

        const result = await request.query(query);

        // Aggregate results
        const aggregated = {};
        result.recordset.forEach(row => {
            const key = `${row.experience_status ?? "Unknown"}_${row.gender ?? "Unknown"}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    experience_status: row.experience_status ?? "Unknown",
                    gender: row.gender ?? "Unknown",
                    emp_count: 0
                };
            }
            aggregated[key].emp_count += row.emp_count;
        });

        res.json(Object.values(aggregated));
    } catch (err) {
        console.error("Error fetching experienced employee count:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
}

async function getAdminViewPwbdWiseCount(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    let clusterID = parseInt(req.params.clusterID); 

    try {
        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;

        // If clusterID not provided, detect it based on organisationID
        if ((!clusterID || clusterID === 0) && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM dbo.mmt_organisation 
                WHERE organisation_id = @organisationID
            `);
            clusterID = clusterResult.recordset.length > 0 ? clusterResult.recordset[0].hr_cluster_id : 0;
        }

        let query = '';

        if (clusterID === 1) {
            let whereClause = "em.emp_status = 1";
            if (organisationID !== 0) whereClause += " AND em.emp_curr_org_id = @organisationID";

            query = `
                SELECT 
                    ISNULL(em.emp_disability, 'Not Specified') AS pwbd_status,
                    COUNT(CASE WHEN em.emp_gender = 'Male' THEN 1 END) AS male_count,
                    COUNT(CASE WHEN em.emp_gender = 'Female' THEN 1 END) AS female_count,
                    COUNT(CASE WHEN em.emp_gender = 'Transgender' THEN 1 END) AS transgender_count,
                    COUNT(*) AS total_count
                FROM dbo.tbl_employee_master em
                WHERE ${whereClause}
                GROUP BY ISNULL(em.emp_disability, 'Not Specified')
            `;
        } else if (clusterID === 2) {
            let whereClause = "1=1";
            if (organisationID !== 0) whereClause += " AND em.organisation_id = @organisationID";

            query = `
                SELECT 
                    ISNULL(em.whether_pwbd, 'Not Specified') AS pwbd_status,
                    COUNT(CASE WHEN em.gender = 'Male' THEN 1 END) AS male_count,
                    COUNT(CASE WHEN em.gender = 'Female' THEN 1 END) AS female_count,
                    COUNT(CASE WHEN em.gender = 'Transgender' THEN 1 END) AS transgender_count,
                    COUNT(*) AS total_count
                FROM dbo.tbl_hr_other_org_vacancy_details em
                WHERE ${whereClause} AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY ISNULL(em.whether_pwbd, 'Not Specified')
            `;
        } else {
            // Combine both tables
            let whereClauseEmp = "em.emp_status = 1";
            let whereClauseOther = "1=1";

            if (organisationID !== 0) {
                whereClauseEmp += " AND em.emp_curr_org_id = @organisationID";
                whereClauseOther += " AND em.organisation_id = @organisationID";
            }

            query = `
                SELECT 
                    ISNULL(em.emp_disability, 'Not Specified') AS pwbd_status,
                    COUNT(CASE WHEN em.emp_gender = 'Male' THEN 1 END) AS male_count,
                    COUNT(CASE WHEN em.emp_gender = 'Female' THEN 1 END) AS female_count,
                    COUNT(CASE WHEN em.emp_gender = 'Transgender' THEN 1 END) AS transgender_count,
                    COUNT(*) AS total_count
                FROM dbo.tbl_employee_master em
                WHERE ${whereClauseEmp}
                GROUP BY ISNULL(em.emp_disability, 'Not Specified')

                UNION ALL

                SELECT 
                    ISNULL(em.whether_pwbd, 'Not Specified') AS pwbd_status,
                    COUNT(CASE WHEN em.gender = 'Male' THEN 1 END) AS male_count,
                    COUNT(CASE WHEN em.gender = 'Female' THEN 1 END) AS female_count,
                    COUNT(CASE WHEN em.gender = 'Transgender' THEN 1 END) AS transgender_count,
                    COUNT(*) AS total_count
                FROM dbo.tbl_hr_other_org_vacancy_details em
                WHERE ${whereClauseOther} AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY ISNULL(em.whether_pwbd, 'Not Specified')
            `;
        }

        const result = await request.query(query);

        const merged = {};
        result.recordset.forEach(row => {
            const key = row.pwbd_status;

            if (!merged[key]) {
                merged[key] = {
                    pwbd_status: key,
                    male_count: 0,
                    female_count: 0,
                    transgender_count: 0,
                    total_count: 0
                };
            }

            merged[key].male_count += row.male_count;
            merged[key].female_count += row.female_count;
            merged[key].transgender_count += row.transgender_count;
            merged[key].total_count += row.total_count;
        });

        res.json(Object.values(merged));

    } catch (err) {
        console.error("Error occurred while fetching PwBD-wise count:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
}

async function getAdminViewCommunityWiseCountByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    let clusterID = parseInt(req.params.clusterID); 

    try {
        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;

        // Detect clusterID if not provided
        if ((!clusterID || clusterID === 0) && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM dbo.mmt_organisation 
                WHERE organisation_id = @organisationID
            `);
            clusterID = clusterResult.recordset.length > 0 ? clusterResult.recordset[0].hr_cluster_id : 0;
        }

        let query = '';
        const validCommunities = ["SC", "ST", "UR", "OB", "OBC", "EWS"];

        if (clusterID === 1) {
            let whereClause = "em.emp_status = 1";
            if (organisationID !== 0) whereClause += " AND em.emp_curr_org_id = @organisationID";

            query = `
                SELECT em.emp_ethnic_origin AS community,
                       COUNT(*) AS total
                FROM tbl_employee_master em
                WHERE ${whereClause}
                GROUP BY em.emp_ethnic_origin
            `;
        } else if (clusterID === 2) {
            let whereClause = "1=1";
            if (organisationID !== 0) whereClause += " AND em.organisation_id = @organisationID";

            query = `
                SELECT em.community AS community,
                       COUNT(*) AS total
                FROM tbl_hr_other_org_vacancy_details em
                WHERE ${whereClause} AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY em.community
            `;
        } else {
            // Combine both tables
            let whereClauseEmp = "em.emp_status = 1";
            let whereClauseOther = "1=1";

            if (organisationID !== 0) {
                whereClauseEmp += " AND em.emp_curr_org_id = @organisationID";
                whereClauseOther += " AND em.organisation_id = @organisationID";
            }

            query = `
                SELECT em.emp_ethnic_origin AS community,
                       COUNT(*) AS total
                FROM tbl_employee_master em
                WHERE ${whereClauseEmp}
                GROUP BY em.emp_ethnic_origin

                UNION ALL

                SELECT em.community AS community,
                       COUNT(*) AS total
                FROM tbl_hr_other_org_vacancy_details em
                WHERE ${whereClauseOther} AND em.Uploaded_month = ${lastMonthNumber}
                GROUP BY em.community
            `;
        }

        const result = await request.query(query);

        // Merge and normalize communities
        const merged = {};
        result.recordset.forEach(row => {
            let key = row.community;
            if (!validCommunities.includes(key)) key = "OTHER";

            if (!merged[key]) {
                merged[key] = { community: key, total: 0 };
            }
            merged[key].total += row.total;
        });

        res.json(Object.values(merged));

    } catch (err) {
        console.error("Error fetching community-wise count:", err);
        res.status(500).json({
            message: "Error occurred while fetching community-wise employee count",
            error: err.message
        });
    }
}

async function getAdminViewDepartmentWiseEmpContByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    let clusterID = parseInt(req.params.clusterID);

    try {
        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) request.input("organisationID", organisationID);

        const currentMonth = new Date().getMonth() + 1;
        const lastMonthNumber = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthFilter = `AND ps.Uploaded_month = ${lastMonthNumber}`;

        //clusterID if not provided
        if ((!clusterID || clusterID === 0) && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM dbo.mmt_organisation 
                WHERE organisation_id = @organisationID
            `);
            clusterID = clusterResult.recordset.length > 0 ? clusterResult.recordset[0].hr_cluster_id : 0;
        }

        let query = "";

        if (clusterID === 1) {
            query = `
                SELECT 
                    mo.organisation_id,
                    mo.organisation_name,
                    d.department_id,
                    d.department_name AS departmentname,
                    mmtc.class,
                    COUNT(ps.post_id) AS total_sanctioned_strength,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                               AND ps.date_of_arise_in_vacancy IS NOT NULL
                               AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                               OR ps.exception_abolish = 1)
                          THEN 1 END) AS totalLivePost,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                               AND ps.date_of_arise_in_vacancy IS NOT NULL
                               AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE())
                          THEN 1 END) AS totalAbolishedPost
                FROM dbo.tbl_hr_post_strength ps
                LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
                LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
                LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id
                LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
                WHERE 1=1
                ${organisationID !== 0 ? "AND mo.organisation_id = @organisationID" : ""}
                GROUP BY mo.organisation_id, mo.organisation_name, d.department_id, d.department_name, mmtc.class
            `;
        } else if (clusterID === 2) {
            query = `
                SELECT 
                    mo.organisation_id,
                    mo.organisation_name,
                    ps.department AS departmentname,
                    ps.class,
                    COUNT(ps.post_id) AS total_sanctioned_strength,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                               AND ps.date_of_arise IS NOT NULL
                               AND ((ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                               AND DATEADD(YEAR, 5, ps.date_of_arise) > GETDATE()
                               OR ps.is_exemption_abolished = 1)
                          THEN 1 END) AS totalLivePost,
                    COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                               AND ps.date_of_arise IS NOT NULL
                               AND ((ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                               AND DATEADD(YEAR, 5, ps.date_of_arise) <= GETDATE())
                          THEN 1 END) AS totalAbolishedPost
                FROM dbo.tbl_hr_other_org_vacancy_details ps
                --LEFT JOIN mmt_class mmtc ON ps.class = mmtc.class_id
                LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
                WHERE 1=1
                ${organisationID !== 0 ? "AND mo.organisation_id = @organisationID" : ""}
                ${lastMonthFilter}
                GROUP BY mo.organisation_id, mo.organisation_name, ps.department, ps.class
            `;
        } else {
            query = `
                SELECT mo.organisation_id,
                       mo.organisation_name,
                       d.department_id,
                       d.department_name AS departmentname,
                       mmtc.class,
                       COUNT(ps.post_id) AS total_sanctioned_strength,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                                  AND ps.date_of_arise_in_vacancy IS NOT NULL
                                  AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
                                  OR ps.exception_abolish = 1)
                             THEN 1 END) AS totalLivePost,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                                  AND ps.date_of_arise_in_vacancy IS NOT NULL
                                  AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE())
                             THEN 1 END) AS totalAbolishedPost
                FROM dbo.tbl_hr_post_strength ps
                LEFT JOIN mmt_hr_department d ON ps.department_id = d.department_id
                LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
                LEFT JOIN mmt_class mmtc ON p.class_id = mmtc.class_id
                LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
                WHERE 1=1
                ${organisationID !== 0 ? "AND mo.organisation_id = @organisationID" : ""}

                GROUP BY mo.organisation_id, mo.organisation_name, d.department_id, d.department_name, mmtc.class

                UNION ALL

                SELECT mo.organisation_id,
                       mo.organisation_name,
                       NULL AS department_id,
                       ps.department AS departmentname,
                       ps.class,
                       COUNT(ps.post_id) AS total_sanctioned_strength,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                                  AND ps.date_of_arise IS NOT NULL
                                  AND ((ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise) > GETDATE()
                                  OR ps.is_exemption_abolished = 1)
                             THEN 1 END) AS totalLivePost,
                       COUNT(CASE WHEN ps.vacant_or_filled = 'vacant'
                                  AND ps.date_of_arise IS NOT NULL
                                  AND ((ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise) <= GETDATE())
                             THEN 1 END) AS totalAbolishedPost
                FROM dbo.tbl_hr_other_org_vacancy_details ps
                --LEFT JOIN mmt_class mmtc ON ps.class = mmtc.class_id
                LEFT JOIN mmt_organisation mo ON ps.organisation_id = mo.organisation_id
                WHERE 1=1
                ${organisationID !== 0 ? "AND mo.organisation_id = @organisationID" : ""}
                ${lastMonthFilter}
                GROUP BY mo.organisation_id, mo.organisation_name, ps.department, ps.class
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error fetching department-wise post data:", err);
        res.status(500).json({
            message: "Error occurred while fetching department-wise post data",
            error: err.message
        });
    }
}


let vacancyStatusTab = {getAllHrPostByOrgID, updateHrEmployeeActivity, getPwbdWiseCount, getDepartmentWiseEmpContByOrg, getExperiencedEmpCount, getGenderWiseContByOrg,updateReasonForProcessNotInitiated,updateHRPostActivitiy,
    getHRDashboardContentData, getPromotionVacantPostCode, getAbolishingPostWithinAmonth, getEmpGoingToRetireWithinSixMonths, getAnticipatedVacanciesByOrg, getHRAssessmentData, saveHrVacancyAnticipation, submitAnticipatedVacancies, getOrganisationByCluster,
getCommunityWiseCountByOrg,getHRDashboardContentDataFiltered,getDepartmentWiseEmpContByOrgFiltered,getAdminHRDashboardContentData,getAdminViewGenderWiseContByOrg, getAdminViewExperiencedEmpCount,getAdminViewPwbdWiseCount,
getAdminViewCommunityWiseCountByOrg,getAdminViewDepartmentWiseEmpContByOrg};

export default vacancyStatusTab;