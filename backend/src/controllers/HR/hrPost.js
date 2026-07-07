import { pool } from "../../db.js";
import sql from "mssql";

async function createHrPost(req, res) {
const postName = req.body.postName;
const classID = req.body.selectedClass;
const sanctionedStrength = req.body.sanctionedStrength;
const departmentID = req.body.departmentName;

const conn = await pool;
const request = conn.request();
request.input("postName", postName);
request.input("classID", classID);
request.input("sanctionedStrength", sanctionedStrength);
request.input("departmentID", departmentID);

try {
    const result = await request.query(`
        INSERT INTO tbl_hr_post (
            post_name, sanctioned_strength, class_id, department_id
        )
        VALUES (
            @postName, @sanctionedStrength, @classID, @departmentID
        )
    `);
    return res.sendStatus(201);
} catch (err) {
    console.error(err);
    return res.sendStatus(500);
}

};

async function getHrPost(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT * FROM tbl_hr_post WHERE department_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function updateHrPostStrength(req, res) {
    const Id = req.params.Id;
    const Strength = req.body.Strength;
    const postName = req.body.postName;
    const classId = req.body.classId;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);
    request.input("Strength", Strength);
    request.input("postName", postName);
    request.input("classId", classId);

    try {
        const result = await request.query(`UPDATE tbl_hr_post SET sanctioned_strength =@Strength, post_name =@postName, class_id=@classId WHERE post_id=@Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getHrManagementPost(req, res) {
    const organisationId = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationId", organisationId);
    
    const departmentQuery = `
        SELECT department_id
        FROM tbl_hr_department
        WHERE organisation_id = @organisationId
    `;
    

    try {
        const departmentResult = await request.query(departmentQuery);
        
        const departmentIds = departmentResult.recordset.map(department => department.department_id);

        const postQuery = `
            SELECT *
            FROM tbl_hr_post
            WHERE department_id IN (${departmentIds.join(',')})
        `;

        const postResult = await request.query(postQuery);
        
        res.json(postResult.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getSanctionedStrength(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT sanctioned_strength FROM tbl_hr_post WHERE post_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getFilledVacantDataCount(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT 
        COUNT(tbl_hr_post_strength.id) AS vacant_filled_data,
        tbl_hr_post.sanctioned_strength
    FROM 
        [sagarmanthan_revamp].[dbo].[tbl_hr_post_strength]
    LEFT JOIN
        [sagarmanthan_revamp].[dbo].[tbl_hr_post] ON tbl_hr_post_strength.post_id = tbl_hr_post.post_id
    WHERE 
        tbl_hr_post_strength.post_id = @Id
        AND (tbl_hr_post_strength.vacant_or_filled = 'vacant' OR tbl_hr_post_strength.vacant_or_filled = 'filled')
    GROUP BY
        tbl_hr_post.sanctioned_strength;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getMissingPostDataCount(req, res) {
    const organisationId = req.params.organisationId;

    const conn = await pool;
    const request = conn.request();
    
    request.input("organisationId", organisationId);

    try {
        const result = await request.query(`SELECT COUNT(*) AS missingCount  FROM tbl_hr_post_strength 
        WHERE ((vacant_or_filled='vacant' AND date_of_arise_in_vacancy IS NULL AND to_be_filled_through IS NULL) OR 
        (vacant_or_filled='filled' AND employee_joining_date IS NULL AND to_be_filled_through IS NULL)) AND organisation_id=@organisationId
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function deleteHrPost(req, res) {
    const postId = req.params.postId;
    
    const conn = await pool;
    const request = conn.request();
    request.input("postId", postId);
    
    try {
        const firstDelete = await request.query(`
            DELETE tbl_hr_post WHERE post_id = ${postId}
        `);
        const secondDelete = await request.query(`
            DELETE tbl_hr_post_strength WHERE post_id = ${postId}
        `);
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
    
};
 
async function getActivityDateData(req,res) {
    const fromDate = req.params.fromDate;
    const toDate = req.params.toDate;
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("fromDate", fromDate);
    request.input("toDate", toDate);
    request.input("organisationID", organisationID);

    try {
        let query = `SELECT  
            ROW_NUMBER() OVER (ORDER BY o.organisation_id) AS [S No],
            o.organisation_name AS [ORGANISATION],
            et.emp_reference_id [STAFF ID],
            et.employee_id AS [EMPLOYEE ID],
			em.emp_name AS [EMPLOYEE NAME],
            et.emp_post_code AS [POST CODE],
			FORMAT(et.employee_joining_date, 'yyyy-MM-dd') AS [EMPLOYEE JOINING DATE],
            et.activity_name AS [ACTIVITY NAME],
            et.separation_reason AS [SEPARATION REASON],
            FORMAT(et.separation_date, 'yyyy-MM-dd') AS [SEPARATION DATE],
            et.org_to_be_transferred AS [ORGANISATION TO BE TRANSFERRED],
            --o.organisation_name AS [EMPLOYEE WORKING ORGANISATION ],
            FORMAT(et.transfer_out_date, 'yyyy-MM-dd') AS [TRANSFER OUT DATE],
            FORMAT(et.promotion_date, 'yyyy-MM-dd') AS [PROMOTION DATE],
            o_deputed.organisation_name AS [ORGANISATION TO BE DEPUTED],
            FORMAT(et.date_of_deputing_out, 'yyyy-MM-dd') AS [DATE OF DEPUTING OUT],
            FORMAT(et.activity_date, 'yyyy-MM-dd') AS [ACTIVITY DATE]
        FROM 
            tbl_employee_transaction_details et
        LEFT JOIN 
            tbl_employee_master em 
            ON em.emp_master_id = et.emp_master_id
        LEFT JOIN 
            mmt_organisation o 
            ON em.emp_curr_org_id = et.emp_working_org_id
        LEFT JOIN 
            mmt_organisation o_deputed  
            ON et.org_to_be_deputed = o_deputed.organisation_id
		 LEFT JOIN 
            tbl_hr_post_strength ps  
            ON et.emp_post_code = ps.post_code
        WHERE 
            et.activity_date BETWEEN @fromDate AND @toDate 
            AND et.emp_working_org_id = @organisationID
            AND o.organisation_id = @organisationID
            `;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        // console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
} 

export default { createHrPost, getHrPost, getHrManagementPost, getSanctionedStrength, updateHrPostStrength , getFilledVacantDataCount, getMissingPostDataCount, deleteHrPost,
    getActivityDateData};