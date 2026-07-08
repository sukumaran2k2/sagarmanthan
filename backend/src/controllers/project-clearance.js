import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getProjectClearance(req, res) {
    const { email, password } = req.query;
    if (!email || !password) {
        return res.status(401).json({ message: "Please enter your email and password" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("email", email);

    const result = await request.query(`SELECT password FROM tbl_user WHERE email = @email`);
    const user = result.recordset[0];

    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });;
    }

    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    const query = `
       SELECT 
            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
            mmt_organisation.organisation_name,
            tbl_project.project_id, tbl_sub_project.sub_project_id,
            tbl_project.project_name,tbl_sub_project.sub_project_name,
            ISNULL(tbl_sub_project.sub_sagarmala_project_id,tbl_project.sagarmala_project_id) AS sagarmala_project_id,
            tbl_project_clearances.clearance_type_id, 
            mmt_clearance.clearance_name,
            tbl_project_clearances.applied_date,
            tbl_project_clearances.received_date
            
        FROM  tbl_project_clearances

        JOIN tbl_project 
            ON tbl_project.project_id = tbl_project_clearances.project_id 

        LEFT JOIN tbl_sub_project 
            ON tbl_sub_project.sub_project_id = tbl_project_clearances.sub_project_id 

        LEFT JOIN mmt_clearance
            ON tbl_project_clearances.clearance_type_id = mmt_clearance.clearance_id
                
        LEFT JOIN mmt_organisation 
            ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
             
        `;

    try {
        const queryResult = await request.query(query);
        res.json(queryResult.recordset);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong. Please try later" });
    }
}
