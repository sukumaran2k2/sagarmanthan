import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getKpiTrafficTarget(req, res) {
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
            COALESCE(ttf.financial_year, agg_tc.fiscal_year) AS financial_year,
            COALESCE(ttf.organisation_id, agg_tc.organisation_id) AS organisation_id,
            mo.organisation_name,
            COALESCE(ttf.fiscal_year_target, 0) AS fiscal_year_target
            --  COALESCE(agg_tc.fiscal_year_actual, 0) AS fiscal_year_actual
        FROM 
            tbl_traffic_fiscal_target ttf
        FULL OUTER JOIN (
            SELECT 
                tc.organisation_id,
                tc.fiscal_year,
                SUM(tc.inbound + tc.outbound) AS fiscal_year_actual
            FROM 
                tbl_commodity_data tc
            WHERE 
                tc.commodity_subcategory_id != 28
            GROUP BY 
                tc.organisation_id, 
                tc.fiscal_year
        ) agg_tc ON ttf.organisation_id = agg_tc.organisation_id 
                AND ttf.financial_year = agg_tc.fiscal_year
        LEFT JOIN 
            mmt_organisation mo ON COALESCE(ttf.organisation_id, agg_tc.organisation_id) = mo.organisation_id
        GROUP BY 
            COALESCE(ttf.financial_year, agg_tc.fiscal_year),
            COALESCE(ttf.organisation_id, agg_tc.organisation_id),
            mo.organisation_name,
            COALESCE(ttf.fiscal_year_target, 0),
            agg_tc.fiscal_year_actual;    
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
