import { pool } from "../../db.js";


async function createHrDepartment(req, res) {
const departmentName = req.body.departmentName;
const organisationID = req.body.organisationID;

const conn = await pool;
const request = conn.request();
request.input("departmentName", departmentName);
request.input("organisationID", organisationID);

try {
    const result = await request.query(`
        INSERT INTO tbl_hr_department (
            department_name, organisation_id
        )
        VALUES (
            @departmentName, @organisationID
        )
    `);
    return res.sendStatus(201);
} catch (err) {
    //console.error(err);
    return res.sendStatus(500);
}

};

async function getHrDepartment(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);
    try {
        const result = await request.query(`
            SELECT
                d.*,
                (SELECT COUNT(*) FROM tbl_hr_post p WHERE p.department_id = d.department_id) AS post_count
            FROM
                mmt_hr_department d
        `);
        res.json(result.recordset);
    } catch (err) {
        // console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getTotalHrPostDetailsOrg(req, res) {

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
        o.organisation_id,
        o.organisation_code,
        o.organisation_name,
        (
            SELECT SUM(sanctioned_strength)
            FROM [tbl_hr_post]
            WHERE department_id IN (SELECT department_id FROM [tbl_hr_department] WHERE organisation_id = o.organisation_id)
        ) AS 'total_sanctioned_strength',
        COUNT(p.post_code) AS total_sanctioned_strength_updated,
		(
            SELECT SUM(sanctioned_strength)
            FROM [tbl_hr_post]
            WHERE department_id IN (SELECT department_id FROM [tbl_hr_department] WHERE organisation_id = o.organisation_id)
        ) - COUNT(p.post_code) AS pending_data_entry,
        ((COUNT(p.post_code) * 100.0) / NULLIF(
            (SELECT SUM(sanctioned_strength)
            FROM [tbl_hr_post]
            WHERE department_id IN (SELECT department_id FROM [tbl_hr_department] WHERE organisation_id = o.organisation_id)
        ), 0)) as data_entry_percentage,
        SUM(CASE WHEN p.vacant_or_filled = 'filled' AND p.employee_joining_date IS NOT NULL AND  p.to_be_filled_through IS NOT NULL THEN 1 ELSE 0 END) AS filled_count,
        SUM(CASE WHEN p.vacant_or_filled = 'vacant' AND p.to_be_filled_through IS NOT NULL THEN 1 ELSE 0 END) AS vacant_count
        FROM
            mmt_organisation o
        LEFT JOIN [tbl_hr_post_strength] p ON o.organisation_id = p.organisation_id
        WHERE organisation_category_id =1 OR organisation_category_id =3
        GROUP BY o.organisation_id,o.organisation_code, o.organisation_name;
        `);
        res.json(result.recordset);
    } catch (err) {
        // console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrDepartmentByOrg(req,res) {
  const { organisationID } = req.params;
  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);

  try {
    const result = await request.query(`
      SELECT DISTINCT d.department_id, d.department_name
      FROM mmt_hr_post p
      INNER JOIN mmt_hr_department d ON p.department_id = d.department_id
      WHERE p.organisation_id = @organisationID
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching departments:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getHrPostsByOrgAndDept(req, res) {
  const { organisationID, departmentID } = req.params;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("departmentID", departmentID);

  try {
    const result = await request.query(`
      SELECT DISTINCT p.post_id, p.post_name
      FROM mmt_hr_post p
      WHERE p.organisation_id = @organisationID
        AND p.department_id = @departmentID
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching posts:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


export default { createHrDepartment, getHrDepartment , getTotalHrPostDetailsOrg,getHrDepartmentByOrg,getHrPostsByOrgAndDept};