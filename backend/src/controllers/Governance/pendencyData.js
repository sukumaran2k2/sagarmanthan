import { pool } from "../../db.js";

async function getPendencyData(req, res) { // Change the function name
  const conn = await pool;
  try {
    const result = await conn.query(`SELECT * from pendencydata ORDER BY file_id ASC;`);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

const pendencyDataTab = { getPendencyData }; // Change the object key

export default pendencyDataTab; // Change the export name

