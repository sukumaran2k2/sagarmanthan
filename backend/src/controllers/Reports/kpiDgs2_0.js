import { pool } from "../../db.js";


async function getKpiDgs2_0 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
        const result = await request.query(` DECLARE @currentDate DATE;
        DECLARE @firstDayOfCurrentMonth DATE;
        DECLARE @lastMonthLastDay DATE;
        DECLARE @lastDayOfcurrentMonth DATE;

        -- Get Current Date (Today)
        SET @currentDate = GETDATE();

        -- First Day of Current Month
        SET @firstDayOfCurrentMonth = DATEADD(MONTH, DATEDIFF(MONTH, 0, @currentDate), 0);

        -- Last Day of Previous Month (Last Month Last Day)
        SET @lastMonthLastDay = EOMONTH(DATEADD(MONTH, -1, @currentDate));

        -- Last Day of Current Month
        SET @lastDayOfcurrentMonth = EOMONTH(@currentDate);

        SELECT 
            shipyard_name,

            -- Count and sum for 'received' status until last month
            COUNT(CASE WHEN application_date <= @lastMonthLastDay THEN 1 END) AS received_app_count,
            SUM(CASE WHEN application_date <= @lastMonthLastDay THEN contractual_value_inr END) AS received_app_cost,

            -- Count and sum for 'approved' status until last month
            COUNT(CASE WHEN status = 'Approved In-Principle' AND approval_or_rejection_date <= @lastMonthLastDay THEN 1 END) AS approved_app_count,
            SUM(CASE WHEN status = 'Approved In-Principle' AND approval_or_rejection_date <= @lastMonthLastDay THEN contractual_value_inr END) AS approved_app_cost,

            -- Count and sum for 'rejected' status until last month
            COUNT(CASE WHEN status = 'Rejected In-Principle' AND rejection_date <= @lastMonthLastDay THEN 1 END) AS rejected_app_count,
            SUM(CASE WHEN status = 'Rejected In-Principle' AND rejection_date <= @lastMonthLastDay THEN contractual_value_inr END) AS rejected_app_cost,

            -- Count and sum for 'received' status in the current month (from first to last date of current month)
            COUNT(CASE WHEN application_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN 1 END) AS received_app_count_cur_month,
            SUM(CASE WHEN application_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN contractual_value_inr END) AS received_app_cost_cur_month,

            -- Count and sum for 'approved' status in the current month (from first to last date of current month)
            COUNT(CASE WHEN status = 'Approved In-Principle' AND approval_or_rejection_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN 1 END) AS approved_app_count_cur_month,
            SUM(CASE WHEN status = 'Approved In-Principle' AND approval_or_rejection_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN contractual_value_inr END) AS approved_app_cost_cur_month,

            -- Count and sum for 'rejected' status in the current month (from first to last date of current month)
            COUNT(CASE WHEN status = 'Rejected In-Principle' AND rejection_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN 1 END) AS rejected_app_count_cur_month,
            SUM(CASE WHEN status = 'Rejected In-Principle' AND rejection_date BETWEEN @firstDayOfCurrentMonth AND @lastDayOfcurrentMonth THEN contractual_value_inr END) AS rejected_app_cost_cur_month

        FROM 
            tbl_kpi_dgs_2_2
        GROUP BY 
            shipyard_name
        ORDER BY 
            shipyard_name;


        ;`);

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        //     field: key,
        // }));


        
        let columnDefs = [
            {
                headerName: 'Shipyard Name',
                field: 'shipyard_name',
                headerClass: "headercenter",
                pinned: true,
                
            },
            {
                headerName: 'Till last month', headerClass: "headercenter", children: 
                [
                    {
                        headerName: 'Received Applications', 
                        headerClass: "headercenter",
                        children: 
                        [
                            {
                                headerName: "Count",
                                field: "received_app_count",
                            },
                            {
                                headerName: "Cost",  
                                field: "received_app_cost",  
                            }
                        ]
                    },
                    {
                        headerName: 'Approved Applications',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "Count",
                                field: "approved_app_count",
                            },
                            {
                                headerName: "Cost",  
                                field: "approved_app_cost",  
                            }
                        ]
                    },
                    {
                        headerName: 'Rejected Applications', 
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "Count",
                                field: "rejected_app_count",
                            },
                            {
                                headerName: "Cost",  
                                field: "rejected_app_cost",  
                            }
                        ]

                    },
                  
                ]
            },

            {
                headerName: 'Current Month', headerClass: "headercenter", children: 
                [
                    {
                        headerName: 'Received Applications', 
                        headerClass: "headercenter",
                        children: 
                        [
                            {
                                headerName: "Count",
                                field: "received_app_count_cur_month",
                            },
                            {
                                headerName: "Cost",  
                                field: "received_app_cost_cur_month",  
                            }
                        ]
                    },
                    {
                        headerName: 'Approved Applications',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "Count",
                                field: "approved_app_count_cur_month",
                            },
                            {
                                headerName: "Cost",  
                                field: "approved_app_cost_cur_month",  
                            }
                        ]
                    },
                    {
                        headerName: 'Rejected Applications', 
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "Count",
                                field: "rejected_app_count_cur_month",
                            },
                            {
                                headerName: "Cost",  
                                field: "rejected_app_cost_cur_month",  
                            }
                        ]

                    },
                  
                ]
            },
       
        ];


        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getKpiDgs2_1 (req, res) 
{

    const conn = await pool;
    const request = conn.request();
    try 
    {
        const result = await request.query(`
        SELECT 
            unique_application_no AS [Unique Application No],
            shipyard_name AS [Shipyard Name],
            no_of_vessels AS [No of Vessels],
            CONVERT(VARCHAR, contract_date, 105) AS [Contract Date],
            contract_date_fy AS [Contract Date FY],
            contractual_value_inr AS [Contractual Value (INR)],
            applicable_rate_of_financial_assistance AS [Applicable Rate Of Financial Assistance (%)],
            estimated_financial_assistance AS [Estimated Financial Assistance (Rs Cr)],
            CONVERT(VARCHAR, expected_date_of_delivery, 105) AS [Expected Date Of Delivery],
            expected_date_of_delivery_fy AS [Expected Date of Delivery (Financial Year)],
            CONVERT(VARCHAR, application_date, 105) AS [Application Date],
            application_date_fy AS [Application Date (Financial Year)],
            CONVERT(VARCHAR, approval_or_rejection_date, 105) AS [Approval Date]
        FROM tbl_kpi_dgs_2_2
        WHERE status = 'Approved In-Principle'
        ORDER BY RIGHT(unique_application_no, 3) DESC
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

async function getKpiDgs2_2 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
            const result = await request.query(`
            SELECT
                unique_application_no AS [Unique Application No],
                shipyard_name AS [Shipyard Name],
                no_of_vessels AS [No of Vessels],
                CONVERT(VARCHAR, contract_date, 105) AS [Contract Date],
                contract_date_fy AS [Contract Date (Financial Year)],
                contractual_value_inr AS [Contractual Value (INR)],
                CONVERT(VARCHAR, expected_date_of_delivery, 105) AS [Expected Date Of Delivery],
                CONVERT(VARCHAR, application_date, 105) AS [Application Date],
                application_date_fy AS [Application Date (Financial Year)],
                current_stage AS [Current Stage],
                general_remarks AS [Remarks],
                applicable_rate_of_financial_assistance AS [Applicable Rate Of Financial Assistance (%)],
                estimated_financial_assistance AS [Estimated Financial Assistance (INR Cr)]
            FROM tbl_kpi_dgs_2_2
            Where status = 'Pending In-Principle'
            ORDER BY RIGHT(unique_application_no, 3) DESC
        ;`);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No pending Applications for In principal approval - SBFAP' });
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


async function getKpiDgs2_3 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
            const result = await request.query(`
            SELECT 
                unique_application_no AS [Unique Application No],
                shipyard_name AS [Shipyard Name],
                no_of_vessels AS [No of Vessels],
                CONVERT(VARCHAR, contract_date, 105) AS [Contract Date],
                contractual_value_inr AS [Contractual Value (INR)],
                CONVERT(VARCHAR, expected_date_of_delivery, 105) AS [Expected Date Of Delivery],
                CONVERT(VARCHAR, application_date, 105) AS [Application Date],
                CONVERT(VARCHAR, approval_or_rejection_date, 105) AS [Rejection Date],
                remarks_for_rejections AS [Reasons for Rejection (Brief)],
                estimated_financial_assistance AS [Estimated Financial Assistance (Rs Cr)]
            FROM tbl_kpi_dgs_2_2
            Where status = 'Rejected In-Principle'
            ORDER BY RIGHT(unique_application_no, 3) DESC
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


async function getKpiDgs2_4 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
        const result = await request.query(`
            SELECT 
                fund_application_no AS [Fund Application No],
                CONVERT(VARCHAR, fund_application_date, 105) AS [Fund Application Date],
                fund_application_date_financial_year AS [Fund Application Date (Financial Year)],
                CONVERT(VARCHAR, actual_delivery_date, 105) AS [Actual Delivery Date],
                actual_delivery_date_financial_year AS [Actual Delivery Date (Financial Year)],
                actual_contract_price AS [Actual Contract Price (Rs Cr)],
                amount_approved_for_release AS [Amount Approved For Release (Rs Cr)],
                COALESCE(CAST(amount_released_90 AS FLOAT),0) + COALESCE(CAST(amount_released_10 AS FLOAT),0) AS [Amount Released (Rs Cr)],            
                no_of_vessels AS [No of Vessels],
                gross_tonnage AS [Gross Tonnage],
                CONVERT(VARCHAR, approval_date, 105) AS [Approval Date],
                approval_date_financial_year AS [Approval Date (Financial Year)],
                CONVERT(VARCHAR, release_date_90, 105) AS [Release Date (90%)],
                release_date_90_fy AS [Release Date 90% (Financial Year)],
                CONVERT(VARCHAR, release_date_10, 105) AS [Release Date (10%)],
                release_date_10_fy AS [Release Date 10% (Financial Year)]
            FROM tbl_kpi_dgs_2_2_fa
            Where status = 'Approved Fund Release'            
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



async function getKpiDgs2_5 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
        const result = await request.query(`
        SELECT 
            fund_application_no AS [Fund Application No],
            shipyard_name AS [Shipyard Name],
            no_of_vessels AS [No of Vessels],
            gross_tonnage AS [Gross Tonnage],
            CONVERT(VARCHAR, actual_delivery_date, 105) AS [Actual Date of Delivery],
            CONVERT(VARCHAR, fund_application_date, 105) AS [Date of Submission of Application],
            CONVERT(VARCHAR, fund_application_date_financial_year) AS [Date of Submission of Application (Financial Year)],
            current_stage AS [Current Stage]

        FROM tbl_kpi_dgs_2_2_fa
        Where status = 'Pending Fund Release'
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

async function getKpiDgs2_6 (req, res) 
{

    const conn = await pool;
    const request = conn.request();

    try 
    {
        const result = await request.query(`
        SELECT 
            fund_application_no AS [Fund Application No],
            shipyard_name AS [Shipyard Name],
            no_of_vessels AS [No of Vessels],
            gross_tonnage AS [Gross Tonnage],
            --no contract date in fund table
            CONVERT(VARCHAR, actual_delivery_date, 105) AS [Actual Date of Delivery],
            CONVERT(VARCHAR, fund_application_date, 105) AS [Date of Submission of Application],
            CONVERT(VARCHAR, rejected_date, 105) AS [Rejected Date],
            remarks_for_rejection AS [Remarks for Rejection]

        FROM tbl_kpi_dgs_2_2_fa
        Where status = 'Rejected Fund Release'
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

export default {getKpiDgs2_0,  getKpiDgs2_1,getKpiDgs2_2,getKpiDgs2_3,getKpiDgs2_4, getKpiDgs2_5, getKpiDgs2_6 };