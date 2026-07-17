
import { pool } from "../../db.js";

async function getconsulAppReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`  
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id As [Wing ID], 
            mmt_wings.wing_name As [Wing Name], 
            COALESCE(COUNT(tbl_consultant_appointment.consultant_appointment_id), 0) AS [No of Consultant Officer],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 1 THEN 1 ELSE 0 END) AS [Admin Approval for engaging Consultant],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 2 THEN 1 ELSE 0 END) AS [Tender Published],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 3 THEN 1 ELSE 0 END) AS [Pre Bid Quries Responded],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 4 THEN 1 ELSE 0 END) AS [Bid Received],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 5 THEN 1 ELSE 0 END) AS [Technical Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 6 THEN 1 ELSE 0 END) AS [Financial Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 7 THEN 1 ELSE 0 END) AS [Work Order Issued],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 8 THEN 1 ELSE 0 END) AS [Contract Signed]

        FROM 
            mmt_wings
        LEFT JOIN 
            tbl_consultant_appointment ON mmt_wings.wing_id = tbl_consultant_appointment.wing
        LEFT JOIN 
            mmt_consultant_appointment_stage ON mmt_consultant_appointment_stage.stage_id = tbl_consultant_appointment.stage_id
        GROUP BY 
            mmt_wings.wing_id, tbl_consultant_appointment.stage_id, mmt_wings.wing_name
        ORDER BY 
            mmt_wings.wing_id
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
                headerName: "Wing ID",
                field: "Wing ID",
                
            },
            {
                headerName: "Wing Name",
                field: "Wing Name",
            },
            {
                headerName: "No of Consultant Officer",
                field: "No of Consultant Officer",
            },
            {
                headerName: "No of Audit Paras at different stages",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Admin Approval for engaging Consultant",
                        field: "Admin Approval for engaging Consultant",
                        width : 280
                    },
                    {
                        headerName: "Tender Published",
                        field: "Tender Published",
                    },                    
                    {
                        headerName: "Pre Bid Quries Responded",
                        field: "Pre Bid Quries Responded",
                    },
                    {
                        headerName: "Bid Received",
                        field: "Bid Received",
                    },
                    {
                        headerName: "Technical Bid Finalized",
                        field: "Technical Bid Finalized",
                    },
                    {
                        headerName: "Financial Bid Finalized",
                        field: "Financial Bid Finalized",
                    },
                    {
                        headerName: "Work Order Issued",
                        field: "Work Order Issued",
                    },
                    {
                        headerName: "Contract Signed",
                        field: "Contract Signed",
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

async function caDivisionWiseReport (req, res) 
{
    // const conn = await pool;
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try 
    {
        const result = await request.query(`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_wings.wing_name AS [Wing Name],
            mmt_division.division_id AS [Division ID],
            mmt_division.division_name AS [Division Name],
            
            COALESCE(COUNT(tbl_consultant_appointment.consultant_appointment_id), 0) AS [No of Consultant Officer],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 1 THEN 1 ELSE 0 END) AS [Admin Approval for engaging Consultant],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 2 THEN 1 ELSE 0 END) AS [Tender Published],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 3 THEN 1 ELSE 0 END) AS [Pre bid Queries Responded],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 4 THEN 1 ELSE 0 END) AS [Bid Received],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 5 THEN 1 ELSE 0 END) AS [Technical Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 6 THEN 1 ELSE 0 END) AS [Financial Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 7 THEN 1 ELSE 0 END) AS [Work Order Issued],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 8 THEN 1 ELSE 0 END) AS [Contract Signed]
        FROM 
            mmt_division
        LEFT JOIN 
            tbl_consultant_appointment ON mmt_division.division_id = tbl_consultant_appointment.division
        LEFT JOIN 
            mmt_wings ON mmt_wings.wing_id = mmt_division.wing_id
        WHERE 
            mmt_division.wing_id = @wingID
        GROUP BY 
            mmt_wings.wing_name, mmt_division.division_name, mmt_division.division_id
        order BY 
            mmt_division.division_id;   
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



// getCaCandidateReport();
async function getCaWingWiseCandidateReport (req, res) 
{
    // const caID = req.params.caID;
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);

    try 
    {
        const result = await request.query(`
            
        SELECT
            ROW_NUMBER() OVER (ORDER BY name) AS [S No],
            mmt_wings.wing_name As [Wing Name],
            mmt_division.division_name As [Division Name],
            name AS [Name], 
            qualification AS [Qualification],
            work_experience AS [Work Experience],
            salary AS [Salary],
            category AS [Category],
            skill_set AS [Skill Set],
            CONVERT(VARCHAR(10), date_of_appointment, 103) AS [Appointment Date],
            CONVERT(VARCHAR(10), tbl_consultant_appointment.updated_date, 103) AS [Last Updated Date]

            FROM tbl_ca_candidate

            INNER JOIN tbl_consultant_appointment on tbl_consultant_appointment.consultant_appointment_id = tbl_ca_candidate.consultant_appointment_id           
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_consultant_appointment.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_consultant_appointment.division
            WHERE (wing = @wingID)
            ORDER BY name, work_experience, date_of_appointment
        ;`);
        // res.json(result.recordset);
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

async function getCaDivisionWiseCandidateReport (req, res) 
{
    // const caID = req.params.caID;
    const divisionID = req.params.divisionID;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);

    try 
    {
        const result = await request.query(`SELECT mmt_wings.wing_name, mmt_division.division_name, 
            name, qualification, work_experience, salary, category, date_of_appointment, skill_set, 
            tbl_consultant_appointment.updated_date

            FROM tbl_ca_candidate

            INNER JOIN tbl_consultant_appointment on tbl_consultant_appointment.candidate_id = tbl_ca_candidate.candidate_id           
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_consultant_appointment.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_consultant_appointment.division
            WHERE (division = @divisionID) ;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { getconsulAppReport, caDivisionWiseReport, getCaWingWiseCandidateReport, getCaDivisionWiseCandidateReport };