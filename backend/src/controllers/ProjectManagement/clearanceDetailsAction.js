
import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";

async function addClearanceDetails (req, res) 
{
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    let clearanceTypeID = req.body.clearanceTypeID;
    let clearanceAppliedDate = req.body.clearanceAppliedDate;
    let clearanceReceivedDate = req.body.clearanceReceivedDate;
    let action = req.body.clearanceDetailsAction; 
    let clearanceID = req.body.clearanceID; 
    let originalFileName = req.body.originalFileName; 
    
    if(clearanceAppliedDate == "")
    {
        clearanceAppliedDate = null;
    }
    if(clearanceReceivedDate == "")
    {
        clearanceReceivedDate = null;
    }
    if(originalFileName == "")
    {
        originalFileName = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID); 
    request.input("subProjectID", subProjectID); 
    request.input("clearanceTypeID", clearanceTypeID);
    request.input("clearanceAppliedDate", clearanceAppliedDate);
    request.input("clearanceReceivedDate", clearanceReceivedDate);  
    request.input("action", action);
    request.input("clearanceID", clearanceID);    
    request.input("originalFileName", originalFileName); 

    try 
    {  let lastUpdatedStatus;

        if(action == "insert")
        {
            const result = await request.query(`INSERT INTO tbl_project_clearances (project_id, sub_project_id, clearance_type_id, 
                applied_date, received_date, clearance_document) VALUES (@projectID, @subProjectID, @clearanceTypeID, @clearanceAppliedDate, 
                    @clearanceReceivedDate, @originalFileName)`);  

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }    
        else(action == "update")
        {
            if(originalFileName) // If clearance document is uploaded on update
            {
                const result = await request.query(`UPDATE tbl_project_clearances SET received_date = @clearanceReceivedDate, 
                clearance_document = @originalFileName WHERE clearance_id = @clearanceID`);  

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else
            {
                const result = await request.query(`UPDATE tbl_project_clearances SET received_date = @clearanceReceivedDate
                WHERE clearance_id = @clearanceID`);  

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
        }    
     
        res.sendStatus(lastUpdatedStatus);    
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getClearanceData ( req, res)
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);


    try
    {
        let result;

        if (subProjectID == -1) {
            result = await request.query(`SELECT tbl_project_clearances.clearance_id, clearance_type_id, 
            mmt_clearance.clearance_name, applied_date, received_date, clearance_document 
            FROM tbl_project_clearances 
            INNER JOIN mmt_clearance on mmt_clearance.clearance_id = tbl_project_clearances.clearance_type_id
            WHERE project_id = @projectID`);
        } else {
            result = await request.query(`SELECT tbl_project_clearances.clearance_id, clearance_type_id, 
            mmt_clearance.clearance_name, applied_date, received_date, clearance_document 
            FROM tbl_project_clearances 
            INNER JOIN mmt_clearance on mmt_clearance.clearance_id = tbl_project_clearances.clearance_type_id
            WHERE sub_project_id = @subProjectID`);
        }

        res.json(result.recordset);
        
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default {addClearanceDetails, getClearanceData };