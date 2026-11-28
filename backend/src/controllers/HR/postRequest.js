import { pool } from "../../db.js";

async function getOrgName(req, res) {
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`SELECT organisation_name FROM mmt_organisation where organisation_id=@organisationID;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

export default { getOrgName };
