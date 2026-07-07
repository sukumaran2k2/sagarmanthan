
import { pool } from "../../db.js";

async function auditParaWiseReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`
        SELECT
        ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
        mmt_wings.wing_id AS [Wing Id],
        mmt_wings.wing_name AS [Wing Name],
        COUNT(tbl_audit_para.audit_para_id) AS [Total No of Audit Paras],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 1 THEN tbl_audit_para.audit_para_id END) AS [Received but yet to be sent for Comments],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 2 THEN tbl_audit_para.audit_para_id END) AS [Comments sought from organisation],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 3 THEN tbl_audit_para.audit_para_id END) AS [Comments Received from organisation],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 4 THEN tbl_audit_para.audit_para_id END) AS [Under Clarification],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 5 THEN tbl_audit_para.audit_para_id END) AS [Comments Furnished to CAG],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 6 THEN tbl_audit_para.audit_para_id END) AS [Accepted by CAG],
        COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 7 THEN tbl_audit_para.audit_para_id END) AS [Dropped]
    FROM
        mmt_wings
    LEFT JOIN
        tbl_audit_para ON mmt_wings.wing_id = tbl_audit_para.wing
    LEFT JOIN
        mmt_audit_para_stage ON tbl_audit_para.stage_id = mmt_audit_para_stage.audit_para_stage_id
    GROUP BY
        mmt_wings.wing_id,
        mmt_wings.wing_name;
    `);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        //     field: key,
        // }));

        // res.json({ columnDefs, rowData });

        let columnDefs = [
            {
                headerName: "S No",
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
                headerName: "Total No of Audit Paras",
                field: "Total No of Audit Paras",
            },
            {
                headerName: "No of Audit Paras at different stages",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Received But Yet to be Sent for Comments",
                        field: "Received But Yet to be Sent for Comments",
                    },
                    {
                        headerName: "Comments Sought From Organisation",
                        field: "Comments Sought From Organisation",
                    },                    
                    {
                        headerName: "Comments Received from Organisation",
                        field: "Comments Received from Organisation",
                    },
                    {
                        headerName: "Under Clarification",
                        field: "Under Clarification",
                    },
                    {
                        headerName: "Comments Furnished to CAG",
                        field: "Comments Furnished to CAG",
                    },
                    {
                        headerName: "Accepted by CAG",
                        field: "Accepted by CAG",
                    },
                    {
                        headerName: "Dropped",
                        field: "Dropped",
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


async function auditParaDivisionReport (req, res) 
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
            mmt_division.division_id AS [Division Id],
            mmt_division.division_name AS [Division Name],
            COUNT(tbl_audit_para.audit_para_id) AS [Total No of Audit Paras],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 1 THEN tbl_audit_para.audit_para_id END) AS [Received but yet to be sent for Comments],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 2 THEN tbl_audit_para.audit_para_id END) AS [Comments sought from organisation],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 3 THEN tbl_audit_para.audit_para_id END) AS [Comments Received from organisation],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 4 THEN tbl_audit_para.audit_para_id END) AS [Under Clarification],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 5 THEN tbl_audit_para.audit_para_id END) AS [Comments furnished to CAG],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 6 THEN tbl_audit_para.audit_para_id END) AS [Accepted by CAG],
            COUNT(CASE WHEN mmt_audit_para_stage.audit_para_stage_id = 7 THEN tbl_audit_para.audit_para_id END) AS [Dropped]
        FROM
            mmt_division
        LEFT JOIN
            tbl_audit_para ON mmt_division.division_id = tbl_audit_para.division
        LEFT JOIN
            mmt_audit_para_stage ON tbl_audit_para.stage_id = mmt_audit_para_stage.audit_para_stage_id
        WHERE
            mmt_division.wing_id = @wingID 
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


// async function getDetailAuditParaReports (req, res) 
// {   
//     const wingID = req.params.wingID;
//     const divisionID = req.params.divisionID;
//     const auditParaStage = req.params.auditParaStage;

//     const conn = await pool;
//     const request = conn.request();
//     request.input("wingID", wingID);
//     request.input("divisionID", divisionID);
//     request.input("auditParaStage", auditParaStage);

//     console.log(auditParaStage)

//     try 
//     {
//         const result = await request.query(`SELECT para_number, subject, wing, division, category, date_of_receipt, 
//         received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
//         under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
//         disposed_date, remarks, updated_date

//         FROM tbl_audit_para 
//         INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
//         INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
//         INNER JOIN tbl_audit_para_stage on tbl_audit_para_stage.audit_para_id = tbl_audit_para.audit_para_id
//         INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_name = tbl_audit_para_stage.stage_name

//         WHERE (wing = @wingID AND division = @divisionID) 
//         AND tbl_audit_para_stage.stage_name IN 
//         (
//             SELECT audit_para_stage_name FROM mmt_audit_para_stage WHERE audit_para_stage_id = 
//                 (SELECT audit_para_stage_id FROM mmt_audit_para_stage t1 WHERE audit_para_stage_name = @auditParaStage )
//         )  ;`);
        
//     res.json(result.recordset);
// }
// catch(err) 
// {
//     console.log(err);
//     return res.sendStatus(500);
// }

// };

async function getDetailAuditParaWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const auditParaStage = req.params.auditParaStage;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("auditParaStage", auditParaStage);

    console.log(auditParaStage)

    try 
    {
        const result = await request.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY subject) AS [S No],
            para_number AS [Audit Para No],
            subject AS [Subject],
            category AS [Category], 
            CONVERT(VARCHAR(10), date_of_receipt, 101) AS [Received but yet to be sent for Comments],
            CONVERT(VARCHAR(10), comments_sought_date, 101) AS [Comments Sought from Organisation],
            CONVERT(VARCHAR(10), comments_rec_date, 101) AS [Comments Received from Organisation],
            CONVERT(VARCHAR(10), comments_furnished_date, 101) AS [Comments Furnished to CAG],
            CONVERT(VARCHAR(10), cag_accepted_date, 101) AS [Accepted by CAG],
            CONVERT(VARCHAR(10), disposed_date, 101) AS [Dropped],
            CONVERT(VARCHAR(10), updated_date, 101) AS [Last Updated Date]

        FROM tbl_audit_para 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
            INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_id = tbl_audit_para.stage_id

        WHERE (wing = @wingID) AND tbl_audit_para.stage_id = @auditParaStage
        ORDER BY subject
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
// WHERE (division = @divisionID) AND tbl_audit_para.stage_id >= @auditParaStage

async function getDetailAuditParaDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const auditParaStage = req.params.auditParaStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("auditParaStage", auditParaStage);

    // console.log(divisionID)

    try 
    {
        const result = await request.query(`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY subject) AS [S No],
            para_number AS [Audit Para No],
            subject AS [Subject],
            category AS [Category], 
            CONVERT(VARCHAR(10), date_of_receipt, 101) AS [Received but yet to be sent for Comments],
            CONVERT(VARCHAR(10), comments_sought_date, 101) AS [Comments Sought from Organisation],
            CONVERT(VARCHAR(10), comments_rec_date, 101) AS [Comments Received from Organisation],
            CONVERT(VARCHAR(10), comments_furnished_date, 101) AS [Comments Furnished to CAG],
            CONVERT(VARCHAR(10), cag_accepted_date, 101) AS [Accepted by CAG],
            CONVERT(VARCHAR(10), disposed_date, 101) AS [Dropped],
            CONVERT(VARCHAR(10), updated_date, 101) AS [Last Updated Date]

        FROM tbl_audit_para 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
            INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_id = tbl_audit_para.stage_id

            WHERE (division = @divisionID) AND tbl_audit_para.stage_id = @auditParaStage
            ORDER BY subject
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

export default { auditParaWiseReport, auditParaDivisionReport, getDetailAuditParaWingWise, getDetailAuditParaDivisionWise };