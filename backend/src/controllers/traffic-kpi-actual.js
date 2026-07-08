import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getKpiTrafficActual(req, res) {
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
            SELECT  tbl_commodity_traffic.organisation_id, organisation_name, fiscal_year, month, ro_ro_traffic, ro_pax_traffic

            FROM  tbl_commodity_traffic                 
            
            LEFT JOIN mmt_organisation ON tbl_commodity_traffic.organisation_id = mmt_organisation.organisation_id
                
            ORDER BY fiscal_year DESC; 
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
