import { pool } from "../../db.js";

async function hrDrilledDirectRecruitmentCompleteReport(req, res) {
    let organisationID = req.params.organisationID;
    let classID = req.params.classID;
    let postID = req.params.postID;
    let stage = req.params.type;
    

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("classID", classID);
    request.input("postID", postID);
    request.input("stage", stage);

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    let whereCondition = '';
    if(stage == 0){
        whereCondition = `AND ps.process_initiated_date IS NULL AND ps.[notification_adv_issued_date] IS NULL AND  ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL`;
    }
    else if(stage == 1){
        whereCondition = `AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND  ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)`;
    }
    else if(stage == 2){
        whereCondition = `AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)`;
    }
    else if(stage == 4){
        whereCondition = `AND ps.interview_conducted_date IS NOT NULL AND (ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)`;
    }
    else if(stage == 5){
        whereCondition = `AND  ps.selection_process_completed_date IS NOT NULL AND (ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)`;
    }
    else if(stage == 6){
        whereCondition = `AND ps.result_declared_date IS NOT NULL AND (ps.[appointment_letter_issued_date] IS NULL)`;
    }
    else if(stage == 7){
        whereCondition = `AND  ps.appointment_letter_issued_date IS NOT NULL`;
    }
    else if(stage == 13){
        whereCondition = `AND  ps.exam_conducted_date IS NOT NULL AND (ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)`;
    }

    if(postID != 0){
        whereCondition += `AND ps.post_id=${postID}`
    }

    
    try {
        const result = await request.query(`
        SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.date_of_arise_in_vacancy,105) AS [Date of arise in vacancy],
        ${stage != 0 ? `CONVERT(VARCHAR, ps.process_initiated_date, 120) AS [Process started but advertisement yet to be published],
        CONVERT(VARCHAR, ps.notification_adv_issued_date,120) AS [Notification/Adv Issued],
        CONVERT(VARCHAR, ps.exam_conducted_date,120) AS [Exam Conducted/Selection Process Completed],
        CONVERT(VARCHAR, ps.interview_conducted_date,120) AS [Interview Conducted],
        CONVERT(VARCHAR, ps.selection_process_completed_date,120) AS [Selection Process Completed],
        CONVERT(VARCHAR, ps.result_declared_date,120) AS [Result Declared],
        CONVERT(VARCHAR, ps.appointment_letter_issued_date,120)  AS [Appointment Letter issued]` : 'ps.reason_for_process_not_initiated AS [Reason For Process Not Initiated]'}
        FROM
            tbl_hr_post_strength ps
        LEFT JOIN
            mmt_hr_post p ON ps.post_id = p.post_id
        LEFT JOIN
            mmt_hr_department d ON p.department_id = d.department_id
        LEFT JOIN
            mmt_class c ON p.class_id = c.class_id
        LEFT JOIN
            mmt_organisation o ON ps.organisation_id = o.organisation_id
        LEFT JOIN
            tbl_hr_organisation_abolish pa ON ps.organisation_id = pa.organisation_id
        WHERE
            o.organisation_id = @organisationID
            AND c.class_id = @classID
            AND ps.method_of_appointment IN ('Direct Recruitment','Direct Recruitment (Compassionate Method)')
            AND ps.vacant_or_filled = 'vacant'
            AND (
                pa.abolish_required = 0
                OR (
                    pa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND 1=1
            AND 1=1
            ${whereCondition}
    `);

    
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "Department Name",
                field: "Department",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Name",
                field: "Post Name",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Code",
                field: "Post Code",
                headerClass : "headerGroup",
            },
            {
                headerName: "Date of arise in vacancy",
                field: "Date of arise in vacancy",
                headerClass : "headerGroup",
            },
        ];

        if (stage == 0) {
            columnDefs.push({
                headerName: "Reason For Process Not Initiated",
                field: "Reason For Process Not Initiated",
                width: 200
            });
        }else{
            columnDefs.push({
                headerName: "Date on which",
                headerClass : "headerGroup",
                children: [
                    {
                        headerName: "Process started but advertisement yet to be published",
                        field: "Process started but advertisement yet to be published",
                        width: 300,
                    },
                    {
                        headerName: "Notification/Adv Issued",
                        field: "Notification/Adv Issued",
                    },
                    {
                        headerName: "Exam Conducted/Selection Process Completed",
                        field: "Exam Conducted/Selection Process Completed",
                        width:300,
                    },
                    {
                        headerName: "Interview Conducted",
                        field: "Interview Conducted",
                    },
                    {
                        headerName: "Selection Process Completed",
                        field: "Selection Process Completed",
                    },
                    {
                        headerName: "Result Declared",
                        field: "Result Declared",
                    },
                    {
                        headerName: "Appointment Letter issued",
                        field: "Appointment Letter issued",
                        width: 200,
                    }
                ]
            });
        }
    
        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function hrDrilledPromotionCompleteReport(req, res) {
    let organisationID = req.params.organisationID;
    let classID = req.params.classID;
    let postID = req.params.postID ?? 0;
    let stage = req.params.type ?? 0;
    

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("classID", classID);
    request.input("postID", postID);
    request.input("stage", stage);

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    let whereCondition = '';
    if(stage == 0){
        whereCondition = `AND ps.process_initiated_date IS  NULL AND ps.[vigilance_clr_received_date] IS NULL AND ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL`;
    }
    else if(stage == 1){
        whereCondition = `AND ps.process_initiated_date IS NOT NULL AND (ps.[vigilance_clr_received_date] IS NULL AND ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL )`;
    }
    else if(stage == 2){
        whereCondition = `AND ps.vigilance_clr_received_date IS NOT NULL AND (ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL)`;
    }
    else if(stage == 3){
        whereCondition = `AND ps.dpc_conducted_date IS NOT NULL AND ( ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL)`;
    }
    else if(stage == 4){
        whereCondition = `AND ps.approval_by_ca_date IS NOT NULL AND (ps.[promotion_order_issued_date] IS NULL)`;
    }
    else if(stage == 5){
        whereCondition = `AND  ps.promotion_order_issued_date IS NOT NULL`;
    }

    if(postID != 0){
        whereCondition += `AND ps.post_id=${postID}`
    }

    
    try {
        const result = await request.query(`
        SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.date_of_arise_in_vacancy,105) AS [Date of arise in vacancy],
        ${stage != 0 ? `CONVERT(VARCHAR, ps.process_initiated_date, 120) AS [Process initiated vc not received],
        CONVERT(VARCHAR, ps.vigilance_clr_received_date,120) AS [Vigilance clearance received],
        CONVERT(VARCHAR, ps.dpc_conducted_date,120) AS [DPC Conducted],
        CONVERT(VARCHAR, ps.approval_by_ca_date,120) AS [Approval by Competent authority],
        CONVERT(VARCHAR, ps.promotion_order_issued_date,120) AS [Promotion order issued]` : 'ps.reason_for_process_not_initiated AS [Reason For Process Not Initiated]'}
        FROM
            tbl_hr_post_strength ps
        LEFT JOIN
            mmt_hr_post p ON ps.post_id = p.post_id
        LEFT JOIN
            mmt_hr_department d ON p.department_id = d.department_id
        LEFT JOIN
            mmt_class c ON p.class_id = c.class_id
        LEFT JOIN
            mmt_organisation o ON ps.organisation_id = o.organisation_id
        LEFT JOIN [tbl_hr_organisation_abolish] oa ON
	        oa.organisation_id = ps.organisation_id
        WHERE
            o.organisation_id = @organisationID
            AND c.class_id = @classID
            AND ps.method_of_appointment='Promotion'
            AND ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND 1=1
            AND 1=1
            ${whereCondition}
    `);
    
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "Department Name",
                field: "Department",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Name",
                field: "Post Name",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Code",
                field: "Post Code",
                headerClass : "headerGroup",
            },
            {
                headerName: "Date of arise in vacancy",
                field: "Date of arise in vacancy",
                headerClass : "headerGroup",
            },
        ];

        if (stage == 0) {
            columnDefs.push({
                headerName: "Reason For Process Not Initiated",
                field: "Reason For Process Not Initiated",
                width: 200
            });
        }else{
            columnDefs.push({
                headerName: "Date on which",
                headerClass : "headerGroup",
                children: [
                    {
                        headerName: "Process initiated vc not received",
                        field: "Process initiated vc not received",
                        width: 300,
                    },
                    {
                        headerName: "Vigilance clearance received",
                        field: "Vigilance clearance received",
                    },
                    {
                        headerName: "DPC Conducted",
                        field: "DPC Conducted",
                        width:300,
                    },
                    {
                        headerName: "Approval by Competent authority",
                        field: "Approval by Competent authority",
                    },
                    {
                        headerName: "Promotion order issued",
                        field: "Promotion order issued",
                    }
                ]
            });
        }

    
        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function hrDrilledDeputationCompleteReport(req, res) {
    let organisationID = req.params.organisationID;
    let classID = req.params.classID;
    let postID = req.params.postID ?? 0;
    let stage = req.params.type ?? 0;
    

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("classID", classID);
    request.input("postID", postID);
    request.input("stage", stage);

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    let whereCondition = '';
    if(stage == 1){
        whereCondition = `AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 2){
        whereCondition = `AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 3){
        whereCondition = `AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 4){
        whereCondition = `AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 5){
        whereCondition = `AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL`;
    }
    else if(stage == 6){
        whereCondition = `AND ps.[order_issued_date] IS NOT NULL`;
    }

    if(postID != 0){
        whereCondition += `AND ps.post_id=${postID}`
    }

    try {
        const result = await request.query(`
        SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.date_of_arise_in_vacancy,120) AS [Date of arise in vacancy],
        CONVERT(VARCHAR, ps.process_initiated_date, 120) AS [Process initiated but notification yet to be issued],
        CONVERT(VARCHAR, ps.notification_adv_issued_date,120) AS [Notification Adv Issued],
        CONVERT(VARCHAR, ps.application_received_date,120) AS [Application Received],
        CONVERT(VARCHAR, ps.review_application_by_comm,120) AS [Review of application by Committee],
        CONVERT(VARCHAR, ps.approval_received_date,120) AS [Approval Received],
        CONVERT(VARCHAR, ps.order_issued_date,120) AS [Order issued]
        FROM
            tbl_hr_post_strength ps
        LEFT JOIN
            mmt_hr_post p ON ps.post_id = p.post_id
        LEFT JOIN
            mmt_hr_department d ON p.department_id = d.department_id
        LEFT JOIN
            mmt_class c ON p.class_id = c.class_id
        LEFT JOIN
            mmt_organisation o ON ps.organisation_id = o.organisation_id
        LEFT JOIN [tbl_hr_organisation_abolish] oa ON
	        oa.organisation_id = o.organisation_id
        WHERE
            o.organisation_id = @organisationID
            AND c.class_id = @classID
            AND ps.method_of_appointment='Deputation In'
            AND ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND 1=1
            AND 1=1
            ${whereCondition}
    `);

    // try {
    //     const result = await request.query(query1);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

            let columnDefs = [
            {
                headerName: "Department",
                field: "Department",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Name",
                field: "Post Name",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Post Code",
                field: "Post Code",
                headerClass : "headerGroup",
            },
            {
                headerName: "Date of arise in vacancy",
                field: "Date of arise in vacancy",
                headerClass : "headerGroup",
            },
            {
                headerName: "Date on which",
                headerClass : "headerGroup",
                children: [
                    {
                        headerName: "Process initiated notification yet to be issued",
                        field: "Process initiated but notification yet to be issued",
                        width: 270,
                    },
                    {
                        headerName: "Notification Adv Issued",
                        field: "Notification Adv Issued",
                        width: 220,
                    },
                    {
                        headerName: "Application Received",
                        field: "Application Received",
                        width:210,
                    },
                    {
                        headerName: "Review of application by Committee",
                        field: "Review of application by Committee",
                        width: 260,
                    },
                    {
                        headerName: "Approval Received",
                        field: "Approval Received",
                        width: 210,
                    },
                    {
                        headerName: "Order issued",
                        field: "Order issued",
                        width: 200,
                    }
                ]
            }
        ];


        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function hrDrilledCompositeMethodCompleteReport(req, res) {
    let organisationID = req.params.organisationID;
    let classID = req.params.classID;
    let postID = req.params.postID ?? 0;
    let stage = req.params.type ?? 0;
    

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("classID", classID);
    request.input("postID", postID);
    request.input("stage", stage);

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    let whereCondition = '';
    if(stage == 1){
        whereCondition = `AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 2){
        whereCondition = `AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 3){
        whereCondition = `AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 4){
        whereCondition = `AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)`;
    }
    else if(stage == 5){
        whereCondition = `AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL`;
    }
    else if(stage == 6){
        whereCondition = `AND ps.[order_issued_date] IS NOT NULL`;
    }

    if(postID != 0){
        whereCondition += `AND ps.post_id=${postID}`
    }

    try {
        const result = await request.query(`
        SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.date_of_arise_in_vacancy,120) AS [Date of arise in vacancy],
        CONVERT(VARCHAR, ps.process_initiated_date, 120) AS [Process initiated but notification yet to be issued],
        CONVERT(VARCHAR, ps.notification_adv_issued_date,120) AS [Notification Adv Issued],
        CONVERT(VARCHAR, ps.application_received_date,120) AS [Application Received],
        CONVERT(VARCHAR, ps.review_application_by_comm,120) AS [Review of application by Committee],
        CONVERT(VARCHAR, ps.approval_received_date,120) AS [Approval Received],
        CONVERT(VARCHAR, ps.order_issued_date,120) AS [Order issued]
        FROM
            tbl_hr_post_strength ps
        LEFT JOIN
            mmt_hr_post p ON ps.post_id = p.post_id
        LEFT JOIN
            mmt_hr_department d ON p.department_id = d.department_id
        LEFT JOIN
            mmt_class c ON p.class_id = c.class_id
        LEFT JOIN
            mmt_organisation o ON ps.organisation_id = o.organisation_id
        LEFT JOIN [tbl_hr_organisation_abolish] oa ON
		oa.organisation_id = o.organisation_id
        WHERE
            o.organisation_id = @organisationID
            AND c.class_id = @classID
            AND ps.method_of_appointment='Composite Method'
            AND ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND 1=1
            AND 1=1
            ${whereCondition}
    `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

    let columnDefs = [
        {
            headerName: "Department Name",
            field: "Department",
            headerClass : "headerGroup",
            cellStyle: {textAlign: 'center'}
        },
        {
            headerName: "Post Name",
            field: "Post Name",
            headerClass : "headerGroup",
            cellStyle: {textAlign: 'center'}
        },
        {
            headerName: "Post Code",
            field: "Post Code",
            headerClass : "headerGroup",
        },
        {
            headerName: "Date of arise in vacancy",
            field: "Date of arise in vacancy",
            headerClass : "headerGroup",
        },
        {
            headerName: "Date on which",
            headerClass : "headerGroup",
            children: [
                {
                    headerName: "Process initiated notification yet to be issued",
                    field: "Process initiated but notification yet to be issued",
                    width: 270,
                },
                {
                    headerName: "Notification/Adv Issued",
                    field: "Notification Adv Issued",
                    width: 220,
                },
                {
                    headerName: "Application Received",
                    field: "Application Received",
                    width:210,
                },
                {
                    headerName: "Review of application by Committee",
                    field: "Review of application by Committee",
                    width: 260,
                },
                {
                    headerName: "Approval Received",
                    field: "Approval Received",
                    width: 210,
                },
                {
                    headerName: "Order issued",
                    field: "Order issued",
                    width: 200,
                }
            ]
        }
    ];
        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function hrDrilledForMethodofAppDateAriseReport(req, res) {
  const { organisationID, classID, methodOfAppointment } = req.params;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const financialYearStartYear = currentDate.getMonth() >= 3 ? currentYear : currentYear - 1;
  const financialYearEndYear = financialYearStartYear + 1;

  const financialYearStart = `${financialYearStartYear}-04-01`;
  const financialYearEnd = `${financialYearEndYear}-03-31`;
  const previousFiscalYear = `${financialYearStartYear}-03-31`;
  const logYear = financialYearStartYear;

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("methodOfAppointment", methodOfAppointment); 
  request.input("financialYearStart", financialYearStart);
  request.input("financialYearEnd", financialYearEnd);
  request.input("previousFiscalYear", previousFiscalYear);
  request.input("logYear", logYear);

  try {
    const result = await request.query(`
         SELECT
          ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
          org.organisation_id AS [Organisation ID],
          department.department_name AS [Department],
          ps.post_code AS [Post Code],
          p.post_name AS [Post Name],
          mc.class AS [Class],
          ps.method_of_appointment AS [Method Appointment],
          FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy],
		  FORMAT(ps.employee_joined_date, 'yyyy-MM-dd') AS 'Employee Joining Date',
		  em.emp_name AS 'Employee Name',
          ps.method_of_appointment AS 'Method of Appointment'
      FROM
          mmt_organisation org
          INNER JOIN tbl_hr_post_strength ps ON org.organisation_id = ps.organisation_id
          INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
          INNER JOIN mmt_hr_department department ON ps.department_id = department.department_id
          INNER JOIN mmt_class mc ON p.class_id = mc.class_id
          INNER JOIN tbl_hr_organisation_abolish pa ON org.organisation_id = pa.organisation_id
		  LEFT JOIN tbl_employee_master em ON ps.[emp_master_id] = em.[emp_master_id]
      WHERE
          org.organisation_id = @organisationID
          AND mc.class_id = @classID
          AND 1=1
          AND 1=1
          AND ps.method_of_appointment IN (
              SELECT TRIM(value) FROM STRING_SPLIT(@methodOfAppointment, ',')
          )
          AND (
              (
                  ps.date_of_arise_in_vacancy < @financialYearStart
                  AND ps.vacant_or_filled = 'vacant'
                  AND (
                      pa.abolish_required = 0
                      OR (
                          pa.abolish_required = 1
                          AND (
                              (
                                  (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear
                              )
                              OR ps.exception_abolish = 1
                          )
                      )
                  )
              )
              OR (
                  ps.date_of_arise_in_vacancy < @financialYearStart
                  AND ps.vacant_or_filled = 'filled'
                  AND ps.method_of_appointment IN (
                      SELECT TRIM(value) FROM STRING_SPLIT(@methodOfAppointment, ',')
                  )
                  AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
              )
          )
      ORDER BY org.organisation_id;
    `);

    const rowData = result.recordset;

    if (!rowData.length) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department Name",
        field: "Department",
        width: 400,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Employee Joining Date",
        field: "Employee Joining Date",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Employee Name",
        field: "Employee Name",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Method of Appointment",
        field: "Method of Appointment",
        width: 250,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      }
    ];

    return res.json({ columnDefs, rowData });
  } catch (error) {
    console.error("Query Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}



async function hrDrilledForMethodofAppVacancyRisenReport(req,res) {
  const classID = req.params.classID;
  const organisationID = req.params.organisationID;
  const methodOfAppointment = req.params.methodOfAppointment;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const financialYear =
    currentDate.getMonth() >= 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const financialYearStart = `${startYear}-04-01`;
  const financialYearEnd = `${endYear}-03-31`;
  const abolishCutoff = `${parseInt(endYear) + 1}-03-31`;

  // Set SQL parameters
  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("methodOfAppointment", methodOfAppointment);
  request.input("financialYearStart", financialYearStart);
  request.input("financialYearEnd", financialYearEnd);
  request.input("abolishCutoff", abolishCutoff);

  try {
    const result = await request.query(`
     SELECT
        ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
        org.organisation_id AS [Organisation ID],
        department.department_name AS [Department],
        ps.post_code AS [Post Code],
        p.post_name AS [Post Name],
        mc.class AS [Class],
        ps.method_of_appointment AS [Method Appointment],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy]
    FROM
        mmt_organisation org
    INNER JOIN tbl_hr_post_strength ps ON org.organisation_id = ps.organisation_id
    INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
    INNER JOIN mmt_hr_department department ON ps.department_id = department.department_id
    INNER JOIN mmt_class mc ON p.class_id = mc.class_id
    INNER JOIN tbl_hr_organisation_abolish pa ON org.organisation_id = pa.organisation_id
    WHERE
        org.organisation_id = @organisationID
        AND mc.class_id = @classID
        AND ps.method_of_appointment IN (SELECT value FROM STRING_SPLIT(@methodOfAppointment, ','))
        --AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
        AND ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
        AND 1=1
        AND 1=1
    ORDER BY
        org.organisation_id;

    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
       {
        headerName: "Department",
        field: "Department",
        width: 400,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 250,
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 250,
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 250,
      },
    ];

    res.json({ columnDefs, rowData });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function hrDrilledFillingUpVacanciesReport(req, res) {
  const classID = req.params.classID;
  const organisationID = req.params.organisationID;
  const postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const isAfterMarch = currentDate.getMonth() >= 3;

  const financialYear = isAfterMarch
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;

  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  // SQL parameters
  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);
  
  const vacancyCondition = `
    (
      ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
      AND ps.vacant_or_filled = 'vacant'
      AND (
        pa.abolish_required = 0
        OR (
          pa.abolish_required = 1
          AND (
            (
              (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
              AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
            )
            OR ps.exception_abolish = 1
          )
        )
      )
    )
    OR (
      ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
      AND ps.vacant_or_filled = 'filled'
      AND ps.employee_joined_date > '${previousYrEnd}'
    )
  `;

  try {
    const result = await request.query(`
      SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy]
      FROM
        tbl_hr_post_strength ps
      LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
      LEFT JOIN mmt_class c ON p.class_id = c.class_id
      LEFT JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
      LEFT JOIN tbl_hr_organisation_abolish pa ON o.organisation_id = pa.organisation_id
      WHERE
        o.organisation_id = @organisationID
        AND c.class_id = @classID
        AND ps.organisation_id = @organisationID 
        AND (${vacancyCondition})
        AND 1=1
        AND 1=1
        AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
      ORDER BY
        d.department_name
    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        width: 300,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        width: 250,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
        width: 150,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      }
    ];

    res.json({ columnDefs, rowData });

  } catch (error) {
    console.error("Error in hrDrilledFillingUpVacanciesReport:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function hrDrilledOccurredDuringFYReport(req, res) {
  const { classID, organisationID, postID } = req.params;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const isAfterMarch = currentDate.getMonth() >= 3;

  const financialYear = isAfterMarch
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;

  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  // Set SQL parameters
  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);


  try {
    const result = await request.query(`
      SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy]
      FROM
        tbl_hr_post_strength ps
      LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
      LEFT JOIN mmt_class c ON p.class_id = c.class_id
      LEFT JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
      LEFT JOIN tbl_hr_organisation_abolish pa ON o.organisation_id = pa.organisation_id
      WHERE
        c.class_id = @classID
        AND ps.organisation_id = @organisationID
        AND ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
        AND 1=1
        AND 1=1
      ORDER BY
        d.department_name
    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        width: 300,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        width: 250,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
        width: 150,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (error) {
    console.error("Error in hrDrilledOccurredDuringFYReport:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function hrdrilledTotalFillUpVacanciesReport(req, res) {
  const { classID, organisationID, postID } = req.params;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const isAfterMarch = currentDate.getMonth() >= 3;

  const financialYear = isAfterMarch
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;

  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  // SQL parameters
  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  try {
    const result = await request.query(`
      SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy]
      FROM
        tbl_hr_post_strength ps
      LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
      LEFT JOIN mmt_class c ON p.class_id = c.class_id
      LEFT JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
      LEFT JOIN tbl_hr_organisation_abolish pa ON o.organisation_id = pa.organisation_id
      WHERE
        c.class_id = @classID
        AND ps.organisation_id = @organisationID
        AND (
          (
            ps.vacant_or_filled = 'vacant'
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND (
              pa.abolish_required = 0
              OR (
                pa.abolish_required = 1
                AND (
                  (
                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}'
                  )
                  OR ps.exception_abolish = 1
                )
              )
            )
          )
          OR (
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
          )
        )
        AND 1=1
        AND 1=1
      ORDER BY
        d.department_name
    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        width: 300,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        width: 250,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
        width: 150,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (error) {
    console.error("Error in hrDrilledOccurredDuringFYReport:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function drilledDownFillupVacanciesinMOAwise(req, res) {
  const { classID, organisationID, methodOfAppointment } = req.params;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const financialYearStartYear = month >= 3 ? year : year - 1;
  const financialYearEndYear = financialYearStartYear + 1;

  const fiscalYearStart = `${financialYearStartYear}-04-01`;
  const fiscalYearEnd = `${financialYearEndYear}-03-31`;
  const previousYrEnd = `${financialYearStartYear}-03-31`;

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("methodOfAppointment", methodOfAppointment);

  try {
    const result = await request.query(`
      SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy],
		FORMAT(ps.employee_joined_date, 'yyyy-MM-dd') AS 'Employee Joining Date',
		em.emp_name AS 'Employee Name',
        ps.method_of_appointment AS 'Method of Appointment'
      FROM
        tbl_hr_post_strength ps
      LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
      LEFT JOIN mmt_class c ON p.class_id = c.class_id
      LEFT JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
      LEFT JOIN tbl_hr_organisation_abolish pa ON o.organisation_id = pa.organisation_id
	  LEFT JOIN tbl_employee_master em ON ps.[emp_master_id] = em.[emp_master_id]
      WHERE
        c.class_id = @classID
        AND ps.organisation_id = @organisationID
        AND (
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.method_of_appointment IN (
              SELECT value FROM STRING_SPLIT(@methodOfAppointment, ',')
            )
          )
        AND 1=1
        AND 1=1
      ORDER BY d.department_name
    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        width: 300,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        width: 250,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
        width: 150,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Date of Arise Vacancy",
        field: "Date of Arise Vacancy",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Employee Joining Date",
        field: "Employee Joining Date",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Employee Name",
        field: "Employee Name",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Method of Appointment",
        field: "Method of Appointment",
        headerClass: "headerGroup",
        width: 200,
        cellStyle: { textAlign: "center" },
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (error) {
    console.error("Error", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


async function drilledDownBalanceToBeFillupMOAwise(req, res) {
  const { classID, organisationID, methodOfAppointment } = req.params;

  const conn = await pool;
  const request = conn.request();

  const currentDate = new Date();
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const financialYearStartYear = month >= 3 ? year : year - 1;
  const financialYearEndYear = financialYearStartYear + 1;

  const fiscalYearStart = `${financialYearStartYear}-04-01`;
  const fiscalYearEnd = `${financialYearEndYear}-03-31`;
  const previousFiscalYear = `${financialYearStartYear}-03-31`;

  // Parameters
  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("methodOfAppointment", methodOfAppointment);
  request.input("fiscalYearEnd", fiscalYearEnd);
  request.input("previousFiscalYear", previousFiscalYear);

  try {
    const query = `
      SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        FORMAT(ps.date_of_arise_in_vacancy, 'yyyy-MM-dd') AS [Date of Arise Vacancy]
      FROM
        tbl_hr_post_strength ps
      LEFT JOIN mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
      LEFT JOIN mmt_class c ON p.class_id = c.class_id
      LEFT JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
      LEFT JOIN tbl_hr_organisation_abolish pa ON o.organisation_id = pa.organisation_id
      WHERE
        c.class_id = @classID
        AND ps.organisation_id = @organisationID
        
        -- NEW UPDATED LOGIC FOR BALANCE TO BE FILLED
        AND ps.vacant_or_filled = 'vacant'
        AND ps.method_of_appointment IN (
            SELECT value FROM STRING_SPLIT(@methodOfAppointment, ',')
        )
        AND (
            pa.abolish_required = 0
            OR (
                pa.abolish_required = 1
                AND (
                    (
                        (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear
                    )
                    OR ps.exception_abolish = 1
                )
            )
        )
        AND ps.date_of_arise_in_vacancy <= @fiscalYearEnd

        -- LAST MONTH LOG
        AND 1=1
        AND 1=1
        
      ORDER BY d.department_name
    `;

    const result = await request.query(query);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      { headerName: "Department", field: "Department", width: 300, headerClass: "headerGroup", cellStyle: { textAlign: "center" }},
      { headerName: "Post Name", field: "Post Name", width: 250, headerClass: "headerGroup", cellStyle: { textAlign: "center" }},
      { headerName: "Post Code", field: "Post Code", width: 150, headerClass: "headerGroup", cellStyle: { textAlign: "center" }},
      { headerName: "Date of Arise Vacancy", field: "Date of Arise Vacancy", width: 200, headerClass: "headerGroup", cellStyle: { textAlign: "center" }},
    ];

    res.json({ columnDefs, rowData });

  } catch (error) {
    console.error("Error", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


export default { hrDrilledDirectRecruitmentCompleteReport, hrDrilledPromotionCompleteReport,
    hrDrilledDeputationCompleteReport,hrDrilledCompositeMethodCompleteReport,hrDrilledForMethodofAppDateAriseReport,hrDrilledForMethodofAppVacancyRisenReport
,hrDrilledFillingUpVacanciesReport,hrDrilledOccurredDuringFYReport,hrdrilledTotalFillUpVacanciesReport,drilledDownFillupVacanciesinMOAwise,
drilledDownBalanceToBeFillupMOAwise};
 