import { pool } from "../../db.js";
import moment from 'moment';


async function lumpsumReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
    //     SELECT 
    //     tbl_lumpsum_activity.project_id AS projectId, 
    //     project_name AS projectName, 
    //     tbl_lump_sum.lumpsum_activity_id, 
    //     tbl_lump_sum.activity_name, 
    // SUM(tbl_lumpsum_activity.lumpsum_activity_cost) AS lumpsum_activity_cost,
    //     SUM(tbl_sub_project.sub_sanctioned_cost) AS sub_sanctioned_cost
    // FROM 
    //     tbl_lumpsum_activity
    // INNER JOIN 
    //     tbl_lump_sum ON tbl_lump_sum.project_id = tbl_lumpsum_activity.project_id
    // INNER JOIN 
    //     tbl_sub_project ON tbl_sub_project.project_id = tbl_lumpsum_activity.project_id
    // GROUP BY 
    //     tbl_lumpsum_activity.project_id, 
    //     project_name, 
    //     tbl_lump_sum.lumpsum_activity_id, 
    //     tbl_lump_sum.activity_name
    // ORDER BY
    //     tbl_lumpsum_activity.project_id, 
    //     tbl_lump_sum.lumpsum_activity_id;
        let result = await request.query(` 
              	SELECT 
                tbl_lump_sum.project_id AS project_id, 
                project_name AS projectName, 
                tbl_lump_sum.lumpsum_activity_id, 
                tbl_lump_sum.activity_name, 
                COALESCE(SUM(DISTINCT activity_cost), 0) AS activity_cost,
                FORMAT(tbl_lump_sum.activity_date, 'yyyy-MM-dd') AS activity_date
                
              FROM 
                tbl_lump_sum
           
            GROUP BY 
                tbl_lump_sum.project_id, 
                project_name, 
                tbl_lump_sum.lumpsum_activity_id, 
                FORMAT(tbl_lump_sum.activity_date, 'yyyy-MM-dd'), 
                tbl_lump_sum.activity_name
            ORDER BY
                tbl_lump_sum.project_id, 
                tbl_lump_sum.lumpsum_activity_id;

          
        `);

        // console.log(result, 'result')
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

    
        let columnDefs = [
            {
                headerName: 'Project ID',
                field: 'project_id',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "project_id",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: 'Project Name',
                field: 'projectName',
                headerClass: "headercenter",
                pinned: true,
                width: 350,
                children: [
                    {
                        headerName: "B",
                        field: "projectName",
                        pinned: true,
                        width: 350,

                    }
                ]
            },
            
            {
                headerName: 'Lump-sum Activity Name',
                field: 'activity_name',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: "C",
                        field: "activity_name",
                      
                    }
                ]
            },
            {
                headerName: 'Total Activity Cost',
                field: 'activity_cost',
                headerClass: "headercenter",
              
                children: [
                    {
                        headerName: "D",
                        field: "activity_cost",
                      
                    }
                ]
            },
            {
                headerName: 'Date of Expenditure',
                field: 'activity_date',
                headerClass: "headercenter",
              
                children: [
                    {
                        headerName: "E",
                        field: "activity_date",
                      
                    }
                ]
            } 
            

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};


export default { lumpsumReport };



// import { pool } from "../../db.js";
// import moment from 'moment';


// async function lumpsumReport(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         const currentYr = new Date().getFullYear();
//         const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

//         // console.log(currentYr, financialYear, "financialYearfinancialYear")
//     //     SELECT 
//     //     tbl_lumpsum_activity.project_id AS projectId, 
//     //     project_name AS projectName, 
//     //     tbl_lump_sum.lumpsum_activity_id, 
//     //     tbl_lump_sum.activity_name, 
//     // SUM(tbl_lumpsum_activity.lumpsum_activity_cost) AS lumpsum_activity_cost,
//     //     SUM(tbl_sub_project.sub_sanctioned_cost) AS sub_sanctioned_cost
//     // FROM 
//     //     tbl_lumpsum_activity
//     // INNER JOIN 
//     //     tbl_lump_sum ON tbl_lump_sum.project_id = tbl_lumpsum_activity.project_id
//     // INNER JOIN 
//     //     tbl_sub_project ON tbl_sub_project.project_id = tbl_lumpsum_activity.project_id
//     // GROUP BY 
//     //     tbl_lumpsum_activity.project_id, 
//     //     project_name, 
//     //     tbl_lump_sum.lumpsum_activity_id, 
//     //     tbl_lump_sum.activity_name
//     // ORDER BY
//     //     tbl_lumpsum_activity.project_id, 
//     //     tbl_lump_sum.lumpsum_activity_id;
//         let result = await request.query(` 
//               	SELECT 
//                 tbl_lump_sum.project_id AS project_id, 
//                 project_name AS projectName, 
//                 tbl_lump_sum.lumpsum_activity_id, 
//                 tbl_lump_sum.activity_name, 
//                 COALESCE(SUM(DISTINCT activity_cost), 0) AS activity_cost,
//                 COALESCE(SUM(DISTINCT aggregated_activity_cost.lumpsum_activity_cost), 0) AS lumpsum_activity_cost,
//                 COALESCE(SUM(DISTINCT activity_cost - lumpsum_activity_cost ), 0) AS balance_activity_cost,
//                 COALESCE(SUM(DISTINCT tbl_sub_project.sub_sanctioned_cost), 0) AS sub_sanctioned_cost
//             FROM 
//                 tbl_lump_sum
//             -- Join to get pre-aggregated lumpsum activity costs
//             LEFT JOIN (
//                 SELECT 
//                     project_id, 
//                     lumpsum_activity_id, 
//                     SUM(lumpsum_activity_cost) AS lumpsum_activity_cost
//                 FROM 
//                     tbl_lumpsum_activity
//                 GROUP BY 
//                     project_id, lumpsum_activity_id
//             ) AS aggregated_activity_cost
//                 ON aggregated_activity_cost.project_id = tbl_lump_sum.project_id
//                 AND aggregated_activity_cost.lumpsum_activity_id = tbl_lump_sum.lumpsum_activity_id
//             -- Join for sub-sanctioned cost
//             LEFT JOIN 
//                 tbl_sub_project ON tbl_sub_project.project_id = tbl_lump_sum.project_id
//                 where sub_status = 1 and tbl_sub_project.sub_project_stage_id != 14
//             GROUP BY 
//                 tbl_lump_sum.project_id, 
//                 project_name, 
//                 tbl_lump_sum.lumpsum_activity_id, 
//                 tbl_lump_sum.activity_name
//             ORDER BY
//                 tbl_lump_sum.project_id, 
//                 tbl_lump_sum.lumpsum_activity_id;

          
//         `);

//         // console.log(result, 'result')
//         const rowData = result.recordset;

//         if (rowData.length === 0) {
//             return res.status(404).json({ error: 'No data available' });
//         }

    
//         let columnDefs = [
//             {
//                 headerName: 'Project ID',
//                 field: 'project_id',
//                 headerClass: "headercenter",
//                 pinned: true,
//                 children: [
//                     {
//                         headerName: "A",
//                         field: "project_id",
//                         pinned: true,
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Project Name',
//                 field: 'projectName',
//                 headerClass: "headercenter",
//                 pinned: true,
//                 children: [
//                     {
//                         headerName: "B",
//                         field: "projectName",
//                         pinned: true,
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Total Project Cost',
//                 field: 'sub_sanctioned_cost',
//                 headerClass: "headercenter",
              
//                 children: [
//                     {
//                         headerName: "C",
//                         field: "sub_sanctioned_cost",
                      
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Lump-sum Activity Name',
//                 field: 'activity_name',
//                 headerClass: "headercenter",
              
//                 children: [
//                     {
//                         headerName: "D",
//                         field: "activity_name",
                      
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Total Activity Cost (Main Project)',
//                 field: 'activity_cost',
//                 headerClass: "headercenter",
              
//                 children: [
//                     {
//                         headerName: "E",
//                         field: "activity_cost",
                      
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Value of Lump Sum Activity (Sub Project)',
//                 field: 'lumpsum_activity_cost',
//                 headerClass: "headercenter",
              
//                 children: [
//                     {
//                         headerName: "F",
//                         field: "lumpsum_activity_cost",
                      
//                     }
//                 ]
//             },
//             {
//                 headerName: 'Balance Activity Cost',
//                 field: 'balance_activity_cost',
//                 headerClass: "headercenter",
              
//                 children: [
//                     {
//                         headerName: "G",
//                         field: "balance_activity_cost",
                      
//                     }
//                 ]
//             },
           

//         ];

//         res.json({ columnDefs, rowData });

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Internal Server Error');
//     }
// };


// export default { lumpsumReport };