import { pool } from "../../db.js";
async function getExcelData(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`SELECT * from exceldata ORDER BY file_id ASC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
const excelDataTab = { getExcelData };
export default excelDataTab;