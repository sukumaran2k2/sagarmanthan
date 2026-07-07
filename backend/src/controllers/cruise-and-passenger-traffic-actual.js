import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getKpiCruiseAndPassengerActuals(req, res) {
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
                COALESCE(t.fiscal_year, tt.fiscal_year) AS fiscal_year,
                COALESCE(t.organisation_id, tt.organisation_id) AS organisation_id,
                t.month,
                o.organisation_name,
                --COALESCE(tt.target_cruise_vessel_calls, 0) AS target_cruise_vessel_calls,
                SUM(t.total_cruise_vessel_domestic + t.total_cruise_vessel_international) AS actual_cruise_vessel_calls,
                SUM(t.total_cruise_passengers_domestic + t.total_cruise_passengers_international) AS actual_cruise_passengers,
                --  COALESCE(tt.target_ferry_calls, 0) AS target_ferry_calls,
                SUM(t.total_ferry_calls) AS actual_ferry_calls,
                SUM(t.total_ferry_passengers) AS actual_ferry_passengers
            FROM 
                tbl_traffic_vessel t
            FULL OUTER JOIN 
                tbl_traffic_vessel_target tt
            ON 
                t.fiscal_year = tt.fiscal_year AND t.organisation_id = tt.organisation_id
            LEFT JOIN 
                mmt_organisation o
            ON 
                COALESCE(t.organisation_id, tt.organisation_id) = o.organisation_id
            GROUP BY 
                COALESCE(t.fiscal_year, tt.fiscal_year), 
                COALESCE(t.organisation_id, tt.organisation_id), 
                o.organisation_name, t.month
    
            ORDER BY 
                CAST(LEFT(COALESCE(t.fiscal_year, tt.fiscal_year), 4) AS INT) DESC;    
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
