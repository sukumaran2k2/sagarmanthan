import { pool } from "../../db.js";


async function createRevisedHrDepartment(req, res) {
const departmentName = req.body.departmentName;
const organisationID = req.body.organisationID;

const conn = await pool;
const request = conn.request();
request.input("departmentName", departmentName);
request.input("organisationID", organisationID);

try {
    const result = await request.query(`
        INSERT INTO tbl_new_hr_department (
            department_name, organisation_id
        )
        VALUES (
            @departmentName, @organisationID
        )
    `);
    return res.sendStatus(201);
} catch (err) {
    //console.error(err);
    return res.status(500).json({message:"Internal Server Error",error:err});
}

};

async function getRevisedHrDepartment(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);
    try {
        const result = await request.query(`
            SELECT
                d.*,
                (SELECT COUNT(*) FROM tbl_new_hr_post p WHERE p.department_id = d.department_id) AS post_count
            FROM
                tbl_new_hr_department d
            WHERE
                d.organisation_id = @Id
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function editRevisedHrDepartment(req, res) {
    const departmentName = req.body.departmentName;
    const organisationID = req.params.organisationID;
    const departmentId = req.params.departmentId;
    
    const conn = await pool;
    const request = conn.request();
    request.input("departmentName", departmentName);
    request.input("organisationID", organisationID);
    request.input("departmentId", departmentId);
    
    try {
        const result = await request.query(`
        UPDATE tbl_new_hr_department SET department_name = @departmentName WHERE department_id = @departmentId AND organisation_id= @organisationID
        `);
        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
    
};



export default { createRevisedHrDepartment, getRevisedHrDepartment, editRevisedHrDepartment};