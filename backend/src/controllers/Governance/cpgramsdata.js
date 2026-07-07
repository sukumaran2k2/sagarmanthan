import { pool } from "../../db.js";

async function getCpgramsData(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`SELECT * from cpgramsData ORDER BY file_id ASC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const cpgramsDataTab = { getCpgramsData }; // Updated function name

export default cpgramsDataTab;
