

import { pool } from "../../db.js";


async function createLumpSumData(req, res) 
{
    const projectID = req.body.projectID;
    const userID = req.body.userID;
    const lumpSumDataTab = JSON.parse(req.body.lumpSumDataTab);

    const conn = await pool;

    try {
        for (let p = 0; p < lumpSumDataTab.length; p++) {
            let projectName = lumpSumDataTab[p].projectName
            let activityName = lumpSumDataTab[p].activityName
            let activityCost = lumpSumDataTab[p].activityCost
            let activityDate = lumpSumDataTab[p].activityDate

            const request = conn.request();

            request.input("projectID", projectID);
            request.input("userID", userID);            
            request.input("projectName", projectName);
            request.input("activityName", activityName);
            request.input("activityCost", activityCost);
            request.input("activityDate", activityDate);

            const query = ` INSERT INTO tbl_lump_sum ( project_id, project_name, activity_name, activity_cost, activity_date, created_by) 
                    VALUES ( @projectID, @projectName, @activityName, @activityCost, @activityDate, @userID) `;

            const result = await request.query(query);
        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getLumpSumList(req, res) {
    try {
        const conn = await pool;
        const result = await conn.query(`
            SELECT 
                MAX(updated_date) AS updated_date,
                project_id, 
                project_name, 
                SUM(activity_cost) AS activity_cost
            FROM tbl_lump_sum
            GROUP BY project_id, project_name
            ORDER BY project_id;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}


async function getLumpSumData(req, res) 
{
    const projectID = req.params.projectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`SELECT * FROM tbl_lump_sum
            WHERE project_id = @projectID 
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function editLumpSumData(req, res) 
{
    const projectID = req.body.projectID;
    const userID = req.body.userID;

    const lumpSumDataTab = JSON.parse(req.body.lumpSumDataTab);

    const conn = await pool;

    try {
        for (let p = 0; p < lumpSumDataTab.length; p++) {
            let lumpsumId = lumpSumDataTab[p].lumpsumId
            let projectName = lumpSumDataTab[p].projectName
            let activityName = lumpSumDataTab[p].activityName
            let activityCost = lumpSumDataTab[p].activityCost
            let activityDate = lumpSumDataTab[p].activityDate


            const request = conn.request();

            request.input("lumpsumId", lumpsumId);
            request.input("projectID", projectID);
            request.input("userID", userID);            
            request.input("projectName", projectName);
            request.input("activityName", activityName);
            request.input("activityCost", activityCost);
            request.input("activityDate", activityDate);

            if (lumpsumId) {
                // If lumpsumId exists, we perform an UPDATE operation
                const query = `UPDATE tbl_lump_sum 
                                SET activity_name = @activityName, activity_cost = @activityCost, activity_date = @activityDate,
                                updated_date = getDate(), updated_by = @userID  
                                WHERE project_id = @projectID AND lumpsum_activity_id = @lumpsumId`;

                await request.query(query);
            } else {
                // If lumpsumId doesn't exist, we perform an INSERT operation
                const query = `INSERT INTO tbl_lump_sum (project_id, project_name, activity_name, activity_cost, activity_date, created_by) 
                               VALUES (@projectID, @projectName, @activityName, @activityCost, @activityDate, @userID)`;

                await request.query(query);
            }
        }
        res.sendStatus(200);

    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function deleteLumpSumData(req, res) 
{
    const lumpsumId = req.params.lumpsumId;

    const conn = await pool;
    const request = conn.request();

    request.input("lumpsumId", lumpsumId);
    console.log(lumpsumId)

    try {
        const query = `DELETE tbl_lump_sum WHERE lumpsum_activity_id = @lumpsumId`;

        await request.query(query);
        res.sendStatus(200);

    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// --------------------------------------------------------------------------------------------------------------------------

async function getActivityNameData(req, res) {
    const projectID = req.params.projectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`SELECT * FROM tbl_lump_sum
            WHERE project_id = @projectID 
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function createLumpSumActivityData(req, res) {
    const projectID = req.body.projectID; // Project ID
    const lumpSumActivityTab = JSON.parse(req.body.lumpSumActivityTab); // Array of activity data

    const conn = await pool;
    // console.log(projectID, lumpSumDataTab)

    try {
        for (let p = 0; p < lumpSumActivityTab.length; p++) {
            let subProjectId = lumpSumActivityTab[p].subProjectId;  // Sub-project ID
            let subProjectName = lumpSumActivityTab[p].subProjectName;  // Sub-project Name
            let subSantionedDate = lumpSumActivityTab[p].subSantionedDate;  // Sub-sanctioned Date
            let activityId = lumpSumActivityTab[p].activityId;  // Activity ID
            let activityCost = lumpSumActivityTab[p].activityCost;  // Activity Cost
            let subProjectLumpsumID = lumpSumActivityTab[p].subProjectLumpsumID;  // Activity Cost


            // If subSantionedDate is an empty string or invalid, set it to null
            if (!subSantionedDate || subSantionedDate === "") {
                subSantionedDate = null;
            }
            // console.log(subSantionedDate, "subSantionedDate")

            // Create a new request object for each activity data
            const request = conn.request();

            // Add inputs for SQL query
            request.input("projectID", projectID);
            request.input("subProjectId", subProjectId);
            request.input("subProjectName", subProjectName);
            request.input("subSantionedDate", subSantionedDate);
            request.input("activityId", activityId);
            request.input("activityCost", activityCost);
            request.input("subProjectLumpsumID", subProjectLumpsumID);

            console.log(subProjectLumpsumID, "subProjectLumpsumID")
            if(subProjectLumpsumID)
            {
                console.log( "update")
                const query = ` UPDATE tbl_lumpsum_activity
                    SET 
                        lumpsum_activity_cost = @activityCost
                    WHERE 
                        sub_project_lumpsum_id = @subProjectLumpsumID
                   
                `;

                const result = await request.query(query);
                
            }
            else
            {
                if (activityId && activityCost) 
                {
                    console.log( "activityCostactivityCost", "insert")
                    const query = `INSERT INTO tbl_lumpsum_activity (project_id, sub_project_id, sub_project_name, sub_santioned_date,
                    lumpsum_activity_id, lumpsum_activity_cost)
                    VALUES (@projectID, @subProjectId, @subProjectName, @subSantionedDate, @activityId, @activityCost) `;
    
                    const result = await request.query(query);
                }

            }
          

        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};



async function getSubProActivityData(req, res) 
{
    const projectID = req.params.projectID;
    console.log(projectID, "projectID")

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    // `SELECT * FROM tbl_lumpsum_activity
    //         WHERE project_id = @projectID  

    

    try {
        const result = await request.query(`
            
        SELECT 
            lsa.sub_project_lumpsum_id,
            lsa.lumpsum_activity_id,
            lsa.project_id,
            lsa.sub_project_id,
            lsa.sub_project_name,
            lsa.sub_santioned_date,
            lsa.lumpsum_activity_cost,
            ls.project_name,
            ls.activity_name,
            ls.activity_cost
        FROM tbl_lumpsum_activity lsa
        LEFT JOIN tbl_lump_sum ls
            ON lsa.lumpsum_activity_id = ls.lumpsum_activity_id
            --AND lsa.project_id = ls.project_id

            
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};




export default { createLumpSumData, getLumpSumList, getLumpSumData, editLumpSumData, deleteLumpSumData, getActivityNameData, 
    createLumpSumActivityData, getSubProActivityData };