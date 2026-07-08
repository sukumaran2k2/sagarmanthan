import { pool } from "../../db.js";

async function getRoRoTraffic_k_1_8_1_Drilldown_Report(req, res) {
    const conn = await pool;
    const { orgId, type } = req.query;

    if (!orgId || !type) {
        return res.status(400).json({ error: "Missing orgId or type parameter" });
    }

    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

        const currentFiscalYear = currentMonth > 4
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;

        const lastFiscalYear = currentMonth > 4
            ? `${currentYear - 1}-${currentYear}`
            : `${currentYear - 2}-${currentYear - 1}`;

        let fiscalYear, monthCondition;

        switch (type) {
            case "currentFiscalX2":
                fiscalYear = currentFiscalYear;
                monthCondition = `AND month < ${prevMonth}`;
                break;
            case "currentFiscalZ2":
                fiscalYear = currentFiscalYear;
                monthCondition = `AND month <= ${prevMonth}`;
                break;
            case "lastFiscalX1":
                fiscalYear = lastFiscalYear;
                monthCondition = `AND month < ${prevMonth}`;
                break;
            case "lastFiscalZ1":
                fiscalYear = lastFiscalYear;
                monthCondition = `AND month <= ${prevMonth}`;
                break;
            default:
                return res.status(400).json({ error: "Invalid type parameter" });
        }

        const query = `
            SELECT 
                fiscal_year,
                month,
                ro_ro_traffic
            FROM tbl_commodity_traffic
            WHERE 
                organisation_id = @orgId
                AND fiscal_year = @fiscalYear
                ${monthCondition}
            ORDER BY month;
        `;

        const request = conn.request();
        request.input("orgId", orgId);
        request.input("fiscalYear", fiscalYear);

        const result = await request.query(query);
        return res.json({ data: result.recordset });

    } catch (error) {
        console.error("Error fetching RoRo K-1.8.1 drilldown:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export default {
    getRoRoTraffic_k_1_8_1_Drilldown_Report
};
