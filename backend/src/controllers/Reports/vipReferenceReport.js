
import { pool } from "../../db.js";

// SELECT tbl_vip_reference.wing, tbl_vip_reference.division, 
//         mmt_wings.wing_name, mmt_division.division_name, count(received_at_ministry) as received_at_ministry, 
//         count(submitted_for_approval) as submitted_for_approval, count(comments_received) as comments_received, 
//         count(comments_sought) as comments_sought, count(reply_furnished) as reply_furnished, count(disposed) as disposed
//         FROM tbl_vip_reference 
//         INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_vip_reference.wing
//         INNER JOIN mmt_division on mmt_division.division_id = tbl_vip_reference.division

//         GROUP BY mmt_wings.wing_name, mmt_division.division_name, tbl_vip_reference.wing, tbl_vip_reference.division

async function vipWingWiseReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
			mmt_wings.wing_id AS [Wing Id], 
            mmt_wings.wing_name AS [Wing Name], 
            COUNT(tbl_vip_reference.vip_reference_id) AS [No of VIP Reference],
			COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 0 THEN mmt_vip_stage.vip_stage_id END) AS [No Status],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 1 THEN mmt_vip_stage.vip_stage_id END) AS [Received but yet to be sent for Comments],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 2 THEN mmt_vip_stage.vip_stage_id END) AS [Submitted for Approval],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 3 THEN mmt_vip_stage.vip_stage_id END) AS [Comments Sought],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 4 THEN mmt_vip_stage.vip_stage_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 5 THEN mmt_vip_stage.vip_stage_id END) AS [Reply Furnished],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 6 THEN mmt_vip_stage.vip_stage_id END) AS [Disposed]
        FROM mmt_wings
        LEFT JOIN 
            tbl_vip_reference ON mmt_wings.wing_id = tbl_vip_reference.wing
        LEFT JOIN 
            mmt_vip_stage ON mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
        GROUP BY 
            mmt_wings.wing_id,mmt_wings.wing_name
        ORDER BY 
            mmt_wings.wing_id
        ;`);
        // res.json(result.recordset);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "S.No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Wing Id",
                field: "Wing Id",
                
            },
            {
                headerName: "Wing Name",
                field: "Wing Name",
            },
            {
                headerName: "No of VIP Reference",
                field: "No of VIP Reference",
            },
            {
                headerName: "No of Reference at Different Stages",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "No Status",
                        field: "No Status",
                    },
                    {
                        headerName: "Received But Yet To Be Sent For Comments",
                        field: "Received but yet to be sent for Comments",
                    },
                    {
                        headerName: "Submitted for Approval",
                        field: "Submitted for Approval",
                    },                    
                    {
                        headerName: "Comments Sought",
                        field: "Comments Sought",
                    },
                    {
                        headerName: "Comments Received",
                        field: "Comments Received",
                    },
                    {
                        headerName: "Reply Furnished",
                        field: "Reply Furnished",
                    },
                    {
                        headerName: "Dropped",
                        field: "Disposed",
                    },
                ]
            }
        ];
        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function vipDivisionWiseReport (req, res) 
{
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    // console.log(wingID, "wingID")
    try 
    {
        const result = await request.query(`         
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_division.division_id AS [Division ID],
            mmt_division.division_name AS [Division Name],
            COUNT(tbl_vip_reference.vip_reference_id) AS [No of VIP Reference],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 0 THEN 1 END) AS [No Status],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 1 THEN 1 END) AS [Received but yet to be sent for Comments],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 2 THEN 1 END) AS [Submitted for Approval],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 3 THEN 1 END) AS [Comments Sought],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 4 THEN 1 END) AS [Comments Received],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 5 THEN 1 END) AS [Reply Furnished],
            COUNT(CASE WHEN mmt_vip_stage.vip_stage_id = 6 THEN 1 END) AS [Disposed]
        FROM 
            mmt_division
        LEFT JOIN 
            tbl_vip_reference ON mmt_division.division_id = tbl_vip_reference.division
        LEFT JOIN 
            mmt_vip_stage ON mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
        WHERE 
            mmt_division.wing_id = @wingID
        GROUP BY 
            mmt_division.division_id, 
            mmt_division.division_name
        ORDER BY 
            mmt_division.division_id
        ;`);
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDetailVipWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    let vipStage = req.params.vipStage;
    const todayServerDate = new Date().toISOString().split('T')[0];

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    vipStage = vipStage ? parseInt(vipStage) : null;
    request.input("vipStage", vipStage);

    try 
    {
        const result = await request.query(`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]

        FROM tbl_vip_reference 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_vip_reference.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_vip_reference.division       
            INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (wing = @wingID) AND tbl_vip_reference.stage_id = COALESCE(@vipStage, 0)
            ORDER BY subject, eoffice_file_number              
        ;`);
        
        // const resultFinalData = {
        //     todayServerDate,
        //     vipWingWise: result.recordset
        // };
        // res.json(resultFinalData);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });

}
catch(err) 
{
    console.log(err);
    return res.sendStatus(500);
}

};

async function getDetailVipDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    let vipStage = req.params.vipStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    vipStage = vipStage ? parseInt(vipStage) : null;
    request.input("vipStage", vipStage);

    try 
    {
        const result = await request.query(`
    SELECT 
        ROW_NUMBER() OVER (ORDER BY subject ASC, eoffice_file_number ASC) AS [S No],  -- Ensure ROW_NUMBER is ordered first
        subject AS [Subject], 
        eoffice_file_number AS [Eoffice File Number], 
        ref_letter_num AS [Reference Letter Number], 
        received_from AS [Received From], 
        CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
        CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
        CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
        CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
        CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
        CONVERT(varchar, disposed_date, 101) AS [Disposed],
        CONVERT(varchar, deadline, 101) AS [Deadline],  
        CONVERT(varchar, updated_date, 101) AS [Last Updated Date]

        FROM tbl_vip_reference 
        INNER JOIN mmt_wings ON mmt_wings.wing_id = tbl_vip_reference.wing
        INNER JOIN mmt_division ON mmt_division.division_id = tbl_vip_reference.division
        INNER JOIN mmt_vip_stage ON mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
        WHERE (division = @divisionID) AND tbl_vip_reference.stage_id = COALESCE(@vipStage, 0)
        ORDER BY subject ASC, eoffice_file_number ASC;  

        ;`);
        
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
        res.json({ columnDefs, rowData });
        // res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

// --------------------------------------------- Pendency ------------------------------------------------
async function vipPendencyWingWiseReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(` 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id AS [Wing ID],
            mmt_wings.wing_name AS [Wing],
                        SUM(
                        CASE 
                            WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 0 
                                AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 30 
                            THEN 1 
                            ELSE 0 
                        END
                    ) +
                    SUM(
                        CASE 
                            WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 31 
                                AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 60 
                            THEN 1 
                            ELSE 0 
                        END
                    ) +
                    SUM(
                        CASE 
                            WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 61 
                            THEN 1 
                            ELSE 0 
                        END
                    ) AS [Total No of Pending VIP References],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 0 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 30 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [0-30 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 31 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 60 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [31-60 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 61 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [More Than 60 Days]
        FROM 
            mmt_wings 
        LEFT JOIN 
            tbl_vip_reference ON mmt_wings.wing_id = tbl_vip_reference.wing
        LEFT JOIN 
            mmt_vip_stage ON mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
        WHERE  
            DATEDIFF(day, GETDATE(), COALESCE(tbl_vip_reference.received_at_ministry_date, GETDATE())) < 0 AND (COALESCE(tbl_vip_reference.stage_id, 6) != 6)   OR tbl_vip_reference.received_at_ministry_date IS NULL
        GROUP BY  
            mmt_wings.wing_id, 
            mmt_wings.wing_name
        ORDER BY 
            mmt_wings.wing_id;        
        ;`);      

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));
        res.json({ columnDefs, rowData });     
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function vipPendencyDivisionWiseReport (req, res) 
{
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try 
    {
        const result = await request.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_division.division_id AS [Division Id],
            mmt_division.division_name AS [Division Name],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 0 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 30 
                    THEN 1 
                    ELSE 0 
                END
            ) +
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 31 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 60 
                    THEN 1 
                    ELSE 0 
                END
            ) +
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 61 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [Total No of Pending VIP References],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 0 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 30 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [0-30 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) >= 31 
                        AND DATEDIFF(day, received_at_ministry_date, GETDATE()) <= 60 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [31-60 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_at_ministry_date, GETDATE()) > 60 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [More Than 60 Days]
        FROM
            mmt_division
        LEFT JOIN 
            tbl_vip_reference ON mmt_division.division_id = tbl_vip_reference.division
        LEFT JOIN 
            mmt_vip_stage ON mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
        WHERE
            mmt_division.wing_id = @wingID OR tbl_vip_reference.wing = @wingID AND DATEDIFF(day, GETDATE(), tbl_vip_reference.received_at_ministry_date) < 0  AND (stage_id != 6 ) 
        GROUP BY
            mmt_division.division_id,
            mmt_division.division_name
        Order BY
            mmt_division.division_id      
        ;`);
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDetailVipPendencyWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const countDate = req.params.countDate;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("countDate", countDate);
  
        let pendencyWingWiseQuery;
        if(countDate >= 0 && countDate <= 30)
        {
            pendencyWingWiseQuery = (`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
            FROM tbl_vip_reference 
                INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_vip_reference.wing       
                INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (wing = @wingID) AND (stage_id != 6 ) AND (DATEDIFF(D, GETDATE(), received_at_ministry_date) <= 0 AND
                DATEDIFF(D, GETDATE(), received_at_ministry_date) >= -30)         
            ;`);
        }
        else if(countDate >= 31 && countDate <= 60)
        {
            pendencyWingWiseQuery = (`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
            FROM tbl_vip_reference 
                INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_vip_reference.wing
                INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (wing = @wingID) AND (stage_id != 6 ) AND (DATEDIFF(D, GETDATE(), received_at_ministry_date) <= -31 AND
                DATEDIFF(D, GETDATE(), received_at_ministry_date) >= -60 ) 
            ;`);
        }
        else if(countDate > 60)
        {
            pendencyWingWiseQuery = (`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
                            
            FROM tbl_vip_reference 
                INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_vip_reference.wing
                   
                INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (wing = @wingID) AND (stage_id != 6 ) 
                AND DATEDIFF(D, GETDATE(), received_at_ministry_date) <= 61     
            ;`);
        }

    try 
    {   
        const result = await request.query(pendencyWingWiseQuery);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });
        // res.json(result.recordset);
        // console.log(result.recordset)
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailVipPendencyDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const countDate = req.params.countDate;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("countDate", countDate);
   
    let pendencydivisionWiseQuery;
    if(countDate > 0 && countDate <= 30)
    {
        pendencydivisionWiseQuery = (`
        SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
        
            FROM tbl_vip_reference 
         --   INNER JOIN mmt_wings on mmt_wings.wing_id= tbl_vip_reference.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_vip_reference.division       
            INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (division = @divisionID) AND (stage_id != 6 ) 
            AND (DATEDIFF(D, GETDATE(), received_at_ministry_date) <= 0 AND
            DATEDIFF(D, GETDATE(), received_at_ministry_date) >= 30 )         
        ;`);
    }
    else if(countDate > 30 && countDate <= 60)
    {
        pendencydivisionWiseQuery = (`
        SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                ref_letter_num AS [Reference Letter Number], 
                received_from AS [Received From], 
                CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
                CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
                CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
                CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
                CONVERT(varchar, disposed_date, 101) AS [Disposed],
                CONVERT(varchar, deadline, 101) AS [Deadline],  
                CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
        
            FROM tbl_vip_reference 
          --  INNER JOIN mmt_wings on mmt_wings.wing_id= tbl_vip_reference.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_vip_reference.division       
            INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (division = @divisionID) AND (stage_id != 6 ) 
            AND (DATEDIFF(D, GETDATE(), received_at_ministry_date) <= 31 AND
            DATEDIFF(D, GETDATE(), received_at_ministry_date) >= 60 ) 
            ORDER BY subject, eoffice_file_number
        ;`);
    }
    else if(countDate > 60)
    {
        pendencydivisionWiseQuery = (`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            subject AS [Subject], 
            eoffice_file_number AS [Eoffice File Number], 
            ref_letter_num AS [Reference Letter Number], 
            received_from AS [Received From], 
            CONVERT(varchar, received_at_ministry_date, 101) AS [Received but yet to be sent for Comments], 
            CONVERT(varchar, submitted_for_approval_date, 101) AS [Submitted for Approval], 
            CONVERT(varchar, comments_sought_date, 101) AS [Comments Sought], 
            CONVERT(varchar, comments_received_date, 101) AS [Comments Received],  
            CONVERT(varchar, reply_furnished_date, 101) AS [Reply Furnished],  
            CONVERT(varchar, disposed_date, 101) AS [Disposed],
            CONVERT(varchar, deadline, 101) AS [Deadline],  
            CONVERT(varchar, updated_date, 101) AS [Last Updated Date]
        
            FROM tbl_vip_reference 
            INNER JOIN mmt_division on mmt_division.division_id = tbl_vip_reference.division       
            INNER JOIN mmt_vip_stage on mmt_vip_stage.vip_stage_id = tbl_vip_reference.stage_id
            WHERE (division = @divisionID) AND (stage_id != 6 ) 
            AND DATEDIFF(D, GETDATE(), received_at_ministry_date) <= 61    
            ORDER BY subject, eoffice_file_number
        ;`);
    }

    try 
    {   
        const result = await request.query(pendencydivisionWiseQuery);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });

    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getCurrentDate (req, res) 
{   
    try 
    {
        const todayServerDate = new Date().toISOString().split('T')[0];
        res.json({ todayServerDate });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};



export default { vipWingWiseReport, vipDivisionWiseReport, getDetailVipWingWise, getDetailVipDivisionWise,
    vipPendencyWingWiseReport, vipPendencyDivisionWiseReport, getDetailVipPendencyWingWise, getDetailVipPendencyDivisionWise, getCurrentDate };