import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getKpiPortPerformanceActual(req, res) {
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
                tbl_kpi_time_performance.organisation_id,
                mmt_organisation.organisation_name,
			    tbl_kpi_time_performance.fiscal_year,
                tbl_kpi_time_performance.month,
                tbl_kpi_time_performance.average_trt_overall,
                tbl_kpi_time_performance.average_osbd_overall,
                tbl_kpi_time_performance.overall_average_idle_time,
                tbl_kpi_time_performance.overall_waiting_time_port,
                tbl_kpi_time_performance.overall_waiting_time_non_port,
                tbl_kpi_time_performance.total_sailed_vessel_handled,
                tbl_kpi_time_performance.total_cargo_handled,
                tbl_kpi_time_performance.total_dwell_time
            FROM 
                tbl_kpi_time_performance
            INNER JOIN 
                mmt_organisation ON tbl_kpi_time_performance.organisation_id = mmt_organisation.organisation_id;

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
