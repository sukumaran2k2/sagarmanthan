
import { pool } from "../../db.js";

async function billWingWiseData (req, res) 
    {
        const conn = await pool;
        try 
        {
            const result = await conn.query(`SELECT
                mmt_wings.wing_id,
                mmt_wings.wing_name AS Wing,
                COUNT(tbl_bill_change.bill_id) AS [No of Bills/PreConstitutions Act],
                SUM(CASE WHEN tbl_bill_change.stage_id = 1 THEN 1 ELSE 0 END) AS [Draft Bill Prepared],
                SUM(CASE WHEN tbl_bill_change.stage_id = 2 THEN 1 ELSE 0 END) AS [DCN And Draft Bill Approved by Minister],
                SUM(CASE WHEN tbl_bill_change.stage_id = 3 THEN 1 ELSE 0 END) AS [Circulated for IMC] ,
                SUM(CASE WHEN tbl_bill_change.stage_id = 4 THEN 1 ELSE 0 END) AS [IMC comments received],
                SUM(CASE WHEN tbl_bill_change.stage_id = 5 THEN 1 ELSE 0 END) AS [DCN & Draft Bill prepared],
                SUM(CASE WHEN tbl_bill_change.stage_id = 6 THEN 1 ELSE 0 END) AS [DCN & draft bill Approved by Minister],
                SUM(CASE WHEN tbl_bill_change.stage_id = 7 THEN 1 ELSE 0 END) AS [Submitted for Legal Vetting],
                SUM(CASE WHEN tbl_bill_change.stage_id = 8 THEN 1 ELSE 0 END) AS [Legal Vetting to be Completed],
                SUM(CASE WHEN tbl_bill_change.stage_id = 9 THEN 1 ELSE 0 END) AS [Final DCN & draft bill Approved by Minister],
                SUM(CASE WHEN tbl_bill_change.stage_id = 10 THEN 1 ELSE 0 END) AS [Advance Copy to be Sent to PMO & Cab Sectt],
                SUM(CASE WHEN tbl_bill_change.stage_id = 11 THEN 1 ELSE 0 END) AS [Approved By Cabinet],
                SUM(CASE WHEN tbl_bill_change.stage_id = 12 THEN 1 ELSE 0 END) AS [Bill introduced in parliament],
                SUM(CASE WHEN tbl_bill_change.stage_id = 13 THEN 1 ELSE 0 END) AS [Bill Passed],
                SUM(CASE WHEN tbl_bill_change.stage_id = 14 THEN 1 ELSE 0 END) AS [Bill Notified],
                SUM(CASE WHEN tbl_bill_change.stage_id = 15 THEN 1 ELSE 0 END) AS [Completed]
            FROM
                mmt_wings
            LEFT JOIN
                tbl_bill_change ON tbl_bill_change.wing = mmt_wings.wing_id
            GROUP BY
                mmt_wings.wing_id,
                mmt_wings.wing_name
            ORDER BY
                wing_id;
        `);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }
    
        // Extract data from the result
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

// SELECT mmt_wings.wing_id AS wing, tbl_bill_change.stage_id, mmt_wings.wing_name, count(tbl_bill_change.bill_id) as bill_id 
//         FROM mmt_wings
        
//         LEFT JOIN tbl_bill_change  on tbl_bill_change .wing = mmt_wings.wing_id
//         LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
//         GROUP BY mmt_wings.wing_id, tbl_bill_change.stage_id, wing_name
//         ORDER BY wing_name 
//         ;

// SELECT tbl_bill_change.wing, tbl_bill_change.division, 
//         mmt_wings.wing_name, mmt_division.division_name,  
//         count(pre_draft_bill_prepared) as pre_draft_bill_prepared,  count(pre_draft_bill_approved) as pre_draft_bill_approved, 
//         count(circulated_imc) as circulated_imc,  count(imc_comments_rec) as imc_comments_rec, 
//         count(dcn_draft_bill_prepared) as dcn_draft_bill_prepared, count(dcn_draft_bill_approved) as dcn_draft_bill_approved,
//         count(submited_legal_vetting) as submited_legal_vetting, count(legal_vetting_completed) as legal_vetting_completed, 
//         count(final_dcn_approved) as final_dcn_approved, count(advance_copy) as advance_copy,
//         count(approved_by_cabinet) as approved_by_cabinet, count(bill_introduced_in_parliament) as bill_introduced_in_parliament,
//         count(bill_passed) as bill_passed, count(bill_notified) as bill_notified,
//         count(completed) as completed
//         FROM tbl_bill_change 
//         LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_bill_change.wing
//         LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//         WHERE wing = @wingID
//         GROUP BY mmt_wings.wing_name, mmt_division.division_name,
//             tbl_bill_change.wing, tbl_bill_change.division

async function billDivisionWiseData (req, res) 
{
       // const conn = await pool;
       const wingID = req.params.wingID;
   
       const conn = await pool;
       const request = conn.request();
       request.input("wingID", wingID);
    try 
    {
        const result = await request.query(`SELECT
        mmt_division.division_id,
        mmt_division.division_name AS Division,
        COUNT(tbl_bill_change.bill_id) AS [No of Bills/PreConstitutions Act],
        SUM(CASE WHEN tbl_bill_change.stage_id = 1 THEN 1 ELSE 0 END) AS [Draft Bill Prepared],
        SUM(CASE WHEN tbl_bill_change.stage_id = 2 THEN 1 ELSE 0 END) AS [DCN And Draft Bill Approved by Minister],
        SUM(CASE WHEN tbl_bill_change.stage_id = 3 THEN 1 ELSE 0 END) AS [Circulated for IMC],
        SUM(CASE WHEN tbl_bill_change.stage_id = 4 THEN 1 ELSE 0 END) AS [IMC comments received],
        SUM(CASE WHEN tbl_bill_change.stage_id = 5 THEN 1 ELSE 0 END) AS [DCN & Draft Bill prepared],
        SUM(CASE WHEN tbl_bill_change.stage_id = 6 THEN 1 ELSE 0 END) AS [DCN & draft bill Approved by Minister],
        SUM(CASE WHEN tbl_bill_change.stage_id = 7 THEN 1 ELSE 0 END) AS [Submitted for Legal Vetting],
        SUM(CASE WHEN tbl_bill_change.stage_id = 8 THEN 1 ELSE 0 END) AS [Legal Vetting to be Completed],
        SUM(CASE WHEN tbl_bill_change.stage_id = 9 THEN 1 ELSE 0 END) AS [Final DCN & draft bill Approved by Minister],
        SUM(CASE WHEN tbl_bill_change.stage_id = 10 THEN 1 ELSE 0 END) AS [Advance Copy to be Sent to PMO & Cab Sectt],
        SUM(CASE WHEN tbl_bill_change.stage_id = 11 THEN 1 ELSE 0 END) AS [Approved By Cabinet],
        SUM(CASE WHEN tbl_bill_change.stage_id = 12 THEN 1 ELSE 0 END) AS [Bill introduced in parliament],
        SUM(CASE WHEN tbl_bill_change.stage_id = 13 THEN 1 ELSE 0 END) AS [Bill Passed],
        SUM(CASE WHEN tbl_bill_change.stage_id = 14 THEN 1 ELSE 0 END) AS [Bill Notified],
        SUM(CASE WHEN tbl_bill_change.stage_id = 15 THEN 1 ELSE 0 END) AS [Completed]
    FROM
        mmt_division
    LEFT JOIN
        tbl_bill_change ON tbl_bill_change.division = mmt_division.division_id
    WHERE
        mmt_division.wing_id = @wingID
    GROUP BY
        mmt_division.division_id,
        mmt_division.division_name
    ORDER BY
        division_id;
    `);
    const rowData = result.recordset;  

    if (rowData.length === 0) {
        return res.status(404).json({ error: 'No data available for this selection' });
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

// SELECT division_id as division, NULL as stage_id, division_name, NULL as bill_id FROM mmt_division 
//         WHERE wing_id= @wingID AND division_name NOT IN (
//         SELECT division_name FROM tbl_bill_change 
//                     LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//                     LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
//                     WHERE wing = @wingID
//                     GROUP BY  division_name)
//                     UNION
//         SELECT division, stage_id, division_name, 
//                     count(tbl_bill_change.bill_id) as bill_id           
//                     FROM tbl_bill_change 
//                     LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//                     LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
//                     WHERE wing = @wingID
//                     GROUP BY division, stage_id, division_name
//                     ORDER BY division_name                
//         ;

// SELECT division_id as division, NULL as stage_id, division_name, NULL as bill_id FROM mmt_division 
//         WHERE wing_id= @wingID AND division_name NOT IN (
//         SELECT division_name FROM tbl_bill_change 
//                     LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//                     LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
//                     WHERE wing = @wingID
//                     GROUP BY  division_name)
//                     UNION
//         SELECT division, stage_id, division_name, 
//                     count(tbl_bill_change.bill_id) as bill_id           
//                     FROM tbl_bill_change 
//                     LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//                     LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
//                     WHERE wing = @wingID
//                     GROUP BY division, stage_id, division_name
//                     ORDER BY division_name                
//         ;


// async function getDetailBillReports (req, res) 
// {   
//     const wingID = req.params.wingID;
//     const divisionID = req.params.divisionID;
//     const billStage = req.params.billStage;

//     const conn = await pool;
//     const request = conn.request();
//     request.input("wingID", wingID);
//     request.input("divisionID", divisionID);
//     request.input("billStage", billStage);

//     // console.log(billStage)

//     try 
//     {
//         const result = await request.query(`SELECT subject, wing, division, pre_draft_bill_prepared_date, pre_draft_bill_approved_date,  
//         circulated_imc_date, imc_comments_rec_date, dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, submited_legal_vetting_date, 
//         legal_vetting_completed_date, final_dcn_approved_date, advance_copy_date, approved_by_cabinet_date,  
//         bill_introduced_in_parliament_date, bill_passed_date, bill_notified_date, completed_date, remarks, updated_date

//         FROM tbl_bill_change 
//         LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_bill_change.wing
//         LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//         INNER JOIN tbl_bill_change_stage on tbl_bill_change_stage.bill_id = tbl_bill_change.bill_id
//         LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_name = tbl_bill_change_stage.stage_name

//         WHERE (wing = @wingID AND division = @divisionID) 
//         AND tbl_bill_change_stage.stage_name IN 
//         (
//             SELECT bill_stage_name FROM mmt_bill_stage WHERE bill_stage_id >= 
//                 (SELECT bill_stage_id FROM mmt_bill_stage t1 WHERE bill_stage_name = @billStage )
//         )  ;`);
        
//     res.json(result.recordset);
// }
// catch(err) 
// {
//     console.log(err);
//     return res.sendStatus(500);
// }

// };


async function getDetailBillWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const billStage = req.params.billStage;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("billStage", billStage);

    try 
    {
        const result = await request.query(`SELECT subject AS Subject, pre_draft_bill_prepared_date AS [Draft Bill Prepared], pre_draft_bill_approved_date AS [DCN And Draft Bill Approved by Minister],  
        circulated_imc_date AS [Circulated For IMC], imc_comments_rec_date AS [IMC Comments Received], dcn_draft_bill_prepared_date AS [DCN & Draft Bill prepared], dcn_draft_bill_approved_date AS [DCN & Draft Bill Approved by Minister], submited_legal_vetting_date AS [Submitted for Legal Vetting], 
        legal_vetting_completed_date AS [Legal Vetting to be Completed], final_dcn_approved_date AS [Final DCN & draft bill Approved by Minister], advance_copy_date AS [Advance Copy to be Sent to PMO & Cab Sectt], approved_by_cabinet_date AS [Approved By Cabinet],  
        bill_introduced_in_parliament_date AS [Bill Introduced In Parliament], bill_passed_date AS [Bill Passed], bill_notified_date AS [Bill Notified], completed_date AS [Completed], updated_date AS [Last Updated Date]
        --, remarks,wing, division,

        FROM tbl_bill_change 

        LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_bill_change.wing
        LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
        LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id

        WHERE (wing = @wingID) AND tbl_bill_change.stage_id = @billStage
        ORDER BY subject
       ;`);
        
    const rowData = result.recordset;  

    if (rowData.length === 0) {
        return res.status(404).json({ error: 'No data available for this selection' });
    }
 
    const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        field: key,
    }));

    res.json({ columnDefs, rowData });
    } catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailBillDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const billStage = req.params.billStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("billStage", billStage);
    try 
    {
        const result = await request.query(`SELECT subject AS Subject, pre_draft_bill_prepared_date AS [Draft Bill Prepared], pre_draft_bill_approved_date AS [DCN And Draft Bill Approved by Minister],  
            circulated_imc_date AS [Circulated For IMC], imc_comments_rec_date AS [IMC Comments Received], dcn_draft_bill_prepared_date AS [DCN & Draft Bill prepared], dcn_draft_bill_approved_date AS [DCN & Draft Bill Approved by Minister], submited_legal_vetting_date AS [Submitted for Legal Vetting], 
            legal_vetting_completed_date AS [Legal Vetting to be Completed], final_dcn_approved_date AS [Final DCN & draft bill Approved by Minister], advance_copy_date AS [Advance Copy to be Sent to PMO & Cab Sectt], approved_by_cabinet_date AS [Approved By Cabinet],  
            bill_introduced_in_parliament_date AS [Bill Introduced In Parliament], bill_passed_date AS [Bill Passed], bill_notified_date AS [Bill Notified], completed_date AS [Completed], updated_date AS [Last Updated Date]
            -- wing, division,remarks, 
            FROM tbl_bill_change 

            LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_bill_change.wing
            LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
            LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id

            WHERE (division = @divisionID) AND tbl_bill_change.stage_id = @billStage
            ORDER BY subject        
        ;`);
            
        // res.json(result.recordset);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        
      // Extract data from the result
      // const rowData = result.recordset;  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        field: key,
      }));
    
      res.json({ columnDefs, rowData });

    } catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }

};


// async function getDetailBillDivisionWise (req, res) 
// {   
//     const divisionID = req.params.divisionID;
//     const billStage = req.params.billStage;

//     const conn = await pool;
//     const request = conn.request();
//     request.input("divisionID", divisionID);
//     request.input("billStage", billStage);
//     console.log(billStage)
//     try 
//     {
//         const result = await request.query(`SELECT subject, wing, division, pre_draft_bill_prepared_date, pre_draft_bill_approved_date,  
//             circulated_imc_date, imc_comments_rec_date, dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, submited_legal_vetting_date, 
//             legal_vetting_completed_date, final_dcn_approved_date, advance_copy_date, approved_by_cabinet_date,  
//             bill_introduced_in_parliament_date, bill_passed_date, bill_notified_date, completed_date, remarks, updated_date

//             FROM tbl_bill_change 
//             LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_bill_change.wing
//             LEFT JOIN mmt_division on mmt_division.division_id = tbl_bill_change.division
//             INNER JOIN tbl_bill_change_stage on tbl_bill_change_stage.bill_id = tbl_bill_change.bill_id
//             LEFT JOIN mmt_bill_stage on mmt_bill_stage.bill_stage_name = tbl_bill_change_stage.stage_name

//             WHERE (division = @divisionID) 
//             AND tbl_bill_change_stage.stage_name IN 
//             (
//                 SELECT bill_stage_name FROM mmt_bill_stage WHERE bill_stage_id >= 
//                     (SELECT bill_stage_id FROM mmt_bill_stage t1 WHERE bill_stage_name = @billStage )
//             )  ;`);
            
//         res.json(result.recordset);
//     }
//     catch(err) 
//     {
//         console.log(err);
//         return res.sendStatus(500);
//     }

// };



export default { billWingWiseData, billDivisionWiseData, getDetailBillWingWise, getDetailBillDivisionWise };
