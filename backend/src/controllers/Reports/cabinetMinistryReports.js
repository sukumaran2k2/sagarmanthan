
import { pool } from "../../db.js";

async function cabinetMinistryReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(` 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
            mmt_ministry.ministry_name AS [Name of the Ministry/Department Received from],
            mmt_ministry.ministry_id AS [Ministry Id],
            COUNT(tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id) AS [No of Cabinet Notes],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 0 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [Status Not Recorded],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 1 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [Received but yet to be sent for Comments],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 2 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [Sent for Comments],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 3 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 4 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [File submitted for Approval],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 5 THEN tbl_cabinet_notes_ministry_change.cabinet_notes_ministry_id END) AS [Reply furnished to other ministry]
        FROM 
            mmt_ministry
        LEFT JOIN 
            tbl_cabinet_notes_ministry_change ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
        LEFT JOIN 
            mmt_cabinet_ministry_stage ON mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id
        GROUP BY  
            mmt_ministry.ministry_id, 
            mmt_ministry.ministry_name
        ORDER BY 
            mmt_ministry.ministry_id;    
        ;`);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Name of the Ministry/Department Received from",
                field: "Name of the Ministry/Department Received from",
                
            },
            {
                headerName: "Ministry Id",
                field: "Ministry Id",
            },
            {
                headerName: "No of Cabinet Notes",
                field: "No of Cabinet Notes",
            },
            {
                headerName: "No of Cabinet Notes at different stages",
                children: [
                    {
                        headerName: "Status Not Recorded",
                        field: "Status Not Recorded"
                    },
                    {
                        headerName: "Received but yet to be sent for Comments",
                        field: "Received but yet to be sent for Comments",
                    },                    
                    {
                        headerName: "Sent for Comments",
                        field: "Sent for Comments",
                    },
                    {
                        headerName: "Comments Received",
                        field: "Comments Received",
                    },
                    {
                        headerName: "File submitted for Approval",
                        field: "File submitted for Approval",
                    },
                    {
                        headerName: "Reply furnished to other ministry",
                        field: "Reply furnished to other ministry",
                    },
                ]
            }
        ];
        
        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        //     field: key,
        // }));
        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getMinistryDetailsReport (req, res) 
{
    const ministryId = req.params.ministryId;
    const cabinetMinistryStage = req.params.cabinetMinistryStage;
    const todayServerDate = new Date().toISOString().split('T')[0];

    console.log('ministryId',ministryId);
    console.log('cabinetMinistryStage',cabinetMinistryStage);

    const conn = await pool;
    const request = conn.request();
    request.input("ministryId", ministryId);
    request.input("cabinetMinistryStage", cabinetMinistryStage);

    let whereCondition = "";
    if (cabinetMinistryStage === 'all') {
        whereCondition += `WHERE 
        tbl_cabinet_notes_ministry_change.ministry_id = @ministryId `;
    } 
    else {
        whereCondition += ` WHERE 
        tbl_cabinet_notes_ministry_change.ministry_id = @ministryId 
        AND tbl_cabinet_notes_ministry_change.stage_id = @cabinetMinistryStage`;
    }

    try 
    {
        const result = await request.query(` 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
            mmt_ministry.ministry_name AS [Ministry Name],
            tbl_cabinet_notes_ministry_change.ministry_id AS [Ministry Id],
            tbl_cabinet_notes_ministry_change.subject AS [Subject],
            tbl_cabinet_notes_ministry_change.eoffice_file_number AS [Eoffice File Number],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.received_ministry_date, 103) AS [Received but yet to be sent for Comments],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.sent_for_comments_date, 103) AS [Sent for Comments],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.comments_rec_date, 103) AS [Comments Received],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.file_submitted_date, 103) AS [File submitted for Approval],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.reply_furnished_date, 103) AS [Reply furnished to other ministry],
            CONVERT(VARCHAR(10), tbl_cabinet_notes_ministry_change.updated_date, 103) AS [Last Updated Date],
            CONCAT(
                CASE WHEN tbl_cabinet_notes_ministry_change.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.finance_date IS NOT NULL THEN 'Finance, ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
            ) AS [Comments yet to be received From],
            CONCAT(
                CASE WHEN tbl_cabinet_notes_ministry_change.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.development_date IS NULL THEN ',Development ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.finance_date IS NULL THEN ',Finance ' ELSE '' END,
                CASE WHEN tbl_cabinet_notes_ministry_change.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
            ) AS [Comments not yet to be received From]
        FROM 
            tbl_cabinet_notes_ministry_change 
        INNER JOIN 
            mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
        INNER JOIN 
            mmt_cabinet_ministry_stage ON mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id
        ${whereCondition}
        GROUP BY 
            mmt_ministry.ministry_id, 
            mmt_ministry.ministry_name,
            tbl_cabinet_notes_ministry_change.ministry_id,
            tbl_cabinet_notes_ministry_change.subject,
            tbl_cabinet_notes_ministry_change.eoffice_file_number,
            tbl_cabinet_notes_ministry_change.received_ministry_date,
            tbl_cabinet_notes_ministry_change.sent_for_comments_date,
            tbl_cabinet_notes_ministry_change.comments_rec_date,
            tbl_cabinet_notes_ministry_change.file_submitted_date,
            tbl_cabinet_notes_ministry_change.reply_furnished_date,
            tbl_cabinet_notes_ministry_change.updated_date,
            tbl_cabinet_notes_ministry_change.shipping_date,
            tbl_cabinet_notes_ministry_change.vigilance_date,
            tbl_cabinet_notes_ministry_change.ports_date,
            tbl_cabinet_notes_ministry_change.iwt_date,
            tbl_cabinet_notes_ministry_change.administration_date,
            tbl_cabinet_notes_ministry_change.coord_I_date,
            tbl_cabinet_notes_ministry_change.coord_II_date,
            tbl_cabinet_notes_ministry_change.dgll_parliament_and_trw_date,
            tbl_cabinet_notes_ministry_change.development_date,
            tbl_cabinet_notes_ministry_change.finance_date,
            tbl_cabinet_notes_ministry_change.sagarmala_date
        ORDER BY 
            mmt_ministry.ministry_id;
        ;`);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ todayServerDate, columnDefs, rowData });

        // const resultFinalData = {
        //     todayServerDate,
        //     cabinetNotes: result.recordset
        // };
        // res.json(resultFinalData);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

// --------------------------------------------- Pendency ------------------------------------------------
async function cabinetMinistryPendencyReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(` 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
            mmt_ministry.ministry_name AS [Name of the Ministry/Department Received from],
            mmt_ministry.ministry_id AS [Ministry Id],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 0 
                        AND DATEDIFF(day, received_ministry_date, GETDATE()) <= 30 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [0-30 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 31 
                        AND DATEDIFF(day, received_ministry_date, GETDATE()) <= 60 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [31-60 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 61 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [More than 60 Days],
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 0 
                        AND DATEDIFF(day, received_ministry_date, GETDATE()) <= 30 
                    THEN 1 
                    ELSE 0 
                END
            ) +
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 31 
                        AND DATEDIFF(day, received_ministry_date, GETDATE()) <= 60 
                    THEN 1 
                    ELSE 0 
                END
            ) +
            SUM(
                CASE 
                    WHEN DATEDIFF(day, received_ministry_date, GETDATE()) >= 61 
                    THEN 1 
                    ELSE 0 
                END
            ) AS [Total No of Cabinet Ministry]
        FROM 
            mmt_ministry 
        LEFT JOIN 
            tbl_cabinet_notes_ministry_change ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
        LEFT JOIN 
            mmt_cabinet_ministry_stage ON mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id
        WHERE  
            DATEDIFF(day, received_ministry_date, GETDATE()) > 0 AND (stage_id != 5 ) OR tbl_cabinet_notes_ministry_change.received_ministry_date IS NULL
        GROUP BY  
            mmt_ministry.ministry_id, 
            mmt_ministry.ministry_name
        ORDER BY 
            mmt_ministry.ministry_id;        
        ;`);
        
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));
        // console.log('columnDefs, rowData',columnDefs, rowData);

        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getDetailMinistryPendencyReport (req, res) 
{   
    const ministryId = req.params.ministryId;
    const countDate = req.params.countDate;

    const conn = await pool;
    const request = conn.request();
    request.input("ministryId", ministryId);
    request.input("countDate", countDate);
    
        // console.log(countDate)

        let pendencyQuery;
        // if(countDate >= 0 && countDate <= 30)
        if(countDate >= 0 && countDate <= 30)
        {
            pendencyQuery = (`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
                    mmt_ministry.ministry_name AS [Ministry Name],
                    tbl_cabinet_notes_ministry_change.ministry_id AS [Ministry ID], 
                    subject AS [Subject], 
                    eoffice_file_number AS [Eoffice File Number], 
                    CONVERT(varchar(10), received_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                    CONVERT(varchar(10), sent_for_comments_date, 101) AS [Sent for Comments], 
                    CONVERT(varchar(10), comments_rec_date, 101) AS [Comments Received], 
                    CONVERT(varchar(10), file_submitted_date, 101) AS [File submitted for Approval],  
                    CONVERT(varchar(10), reply_furnished_date, 101) AS [Reply furnished to other ministry],  
                    CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
                FROM tbl_cabinet_notes_ministry_change

                INNER JOIN mmt_ministry on mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
                INNER JOIN mmt_cabinet_ministry_stage on mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id

                WHERE (tbl_cabinet_notes_ministry_change.ministry_id = @ministryId) 
                AND (stage_id != 5 ) AND (DATEDIFF(D, GETDATE(), received_ministry_date) <= 0 AND
                DATEDIFF(D, GETDATE(), received_ministry_date) >= -30  )
                ORDER BY subject, eoffice_file_number                
          ;`);
        }
        // else if(countDate >= 31 && countDate <= 60)
        else if(countDate >= 31 && countDate <= 60)
        {
            pendencyQuery = (`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
                mmt_ministry.ministry_name AS [Ministry Name],
                tbl_cabinet_notes_ministry_change.ministry_id AS [Ministry ID], 
                subject AS [Subject], 
                eoffice_file_number AS [Eoffice File Number], 
                CONVERT(varchar(10), received_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                CONVERT(varchar(10), sent_for_comments_date, 101) AS [Sent for Comments], 
                CONVERT(varchar(10), comments_rec_date, 101) AS [Comments Received], 
                CONVERT(varchar(10), file_submitted_date, 101) AS [File submitted for Approval],  
                CONVERT(varchar(10), reply_furnished_date, 101) AS [Reply furnished to other ministry],  
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
            FROM tbl_cabinet_notes_ministry_change

                INNER JOIN mmt_ministry on mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
                INNER JOIN mmt_cabinet_ministry_stage on mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id

                WHERE (tbl_cabinet_notes_ministry_change.ministry_id = @ministryId) 
                AND (stage_id != 5 ) AND (DATEDIFF(D, GETDATE(), received_ministry_date) <= -31 AND
                DATEDIFF(D, GETDATE(), received_ministry_date) >= -60  )    
                ORDER BY subject, eoffice_file_number        
           ;`);
        }
        else if(countDate >= 61)
        {
            pendencyQuery = (`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
                    mmt_ministry.ministry_name AS [Ministry Name],
                    tbl_cabinet_notes_ministry_change.ministry_id AS [Ministry ID], 
                    subject AS [Subject], 
                    eoffice_file_number AS [Eoffice File Number], 
                    CONVERT(varchar(10), received_ministry_date, 101) AS [Received but yet to be sent for Comments], 
                    CONVERT(varchar(10), sent_for_comments_date, 101) AS [Sent for Comments], 
                    CONVERT(varchar(10), comments_rec_date, 101) AS [Comments Received], 
                    CONVERT(varchar(10), file_submitted_date, 101) AS [File submitted for Approval],  
                    CONVERT(varchar(10), reply_furnished_date, 101) AS [Reply furnished to other ministry],  
                    CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
                FROM tbl_cabinet_notes_ministry_change

                INNER JOIN  mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
                INNER JOIN mmt_cabinet_ministry_stage ON mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry_change.stage_id
               
                WHERE 
                    tbl_cabinet_notes_ministry_change.ministry_id = @ministryId
                    AND stage_id != 5 
                    AND DATEDIFF(DAY, GETDATE(), received_ministry_date) <= -61     
                ORDER BY 
                    subject, 
                    eoffice_file_number;
            ;`);
        }

    try 
    {   
        const result = await request.query(pendencyQuery);
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

export default { cabinetMinistryReport, getMinistryDetailsReport, cabinetMinistryPendencyReport,
    getDetailMinistryPendencyReport };