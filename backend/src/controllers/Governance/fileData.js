import { pool } from "../../db.js";

async function getFileData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`SELECT * from filedata ORDER BY file_id ASC;`);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

const fileDataTab = { getFileData }; // Change the object key

export default fileDataTab; // Change the export name
