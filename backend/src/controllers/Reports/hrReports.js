// SELECT COUNT(to_be_filled_through) AS to_be_filled_through_Count, organisation_name, to_be_filled_through,
// tbl_hr_department.organisation_id
// FROM tbl_hr_post_strength
// INNER JOIN tbl_hr_post on tbl_hr_post.post_id = tbl_hr_post_strength.post_id
// INNER JOIN tbl_hr_department on tbl_hr_department.department_id = tbl_hr_post.department_id
// INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_hr_department.organisation_id
// INNER JOIN mmt_class on mmt_class.class_id = tbl_hr_post.class_id

// WHERE vacant_or_filled = 'filled' AND employees_joined_date >= CONCAT(YEAR(GETDATE()), '-04-01') AND employees_joined_date >= CONCAT(YEAR(GETDATE()) + 1, '-03-31')
// GROUP BY to_be_filled_through, tbl_hr_department.organisation_id, organisation_name, to_be_filled_through

// SELECT CONCAT(YEAR(GETDATE()), '-04-01');
import { pool } from "../../db.js";

// SELECT tbl_hr_department.organisation_id, tbl_hr_post_strength.stage_id, organisation_name, count(tbl_hr_post_strength.id) as tbl_hr_post_strength_count
//             FROM tbl_hr_post_strength

//             INNER JOIN tbl_hr_post on tbl_hr_post.post_id = tbl_hr_post_strength.post_id
//             INNER JOIN tbl_hr_department on tbl_hr_department.department_id = tbl_hr_post.department_id
//             INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_hr_department.organisation_id
//             INNER JOIN mmt_hr_post_strength_stage on mmt_hr_post_strength_stage.stage_id = tbl_hr_post_strength.stage_id
//             GROUP BY tbl_hr_department.organisation_id, tbl_hr_post_strength.stage_id, organisation_name
//             ORDER BY organisation_name

// select COUNT(to_be_filled_through) AS to_be_filled_through
// FROM tbl_hr_post_strength
// GROUP BY to_be_filled_through

// SELECT  (CASE WHEN (MONTH(employees_joined_date))  <=3 THEN convert(varchar(4),
// YEAR(employees_joined_date)-1)  + '-' + convert(varchar(4), YEAR(employees_joined_date)%100)
// ELSE convert(varchar(4),YEAR(employees_joined_date))+ '-' + convert(varchar(4),
// (YEAR(employees_joined_date)%100)+1)END) AS FinancialYear ,
// *  FROM tbl_hr_post_strength

// SELECT mmt_organisation.organisation_name, tbl_hr_department.organisation_id,
//         mmt_class.class, tbl_hr_post.sanctioned_strength, tbl_hr_post.post_name,
//         post_code, tbl_hr_post_strength.post_id, vacant_or_filled, date_of_arise_in_vacancy, to_be_filled_through, process_not_initiated,
//         process_not_initiated_date, process_initiated_notification_yet_to_be_issued, process_initiated_notification_yet_to_be_issued_date,
//         process_not_started, process_not_started_date, process_started_advertisement_yet, process_started_advertisement_yet_date,
//         notification_issued, notification_issued_date, exam_conducted, exam_conducted_date, result_declared, result_declared_date,
//         appointment_letter_issued, appointment_letter_issued_date, application_received, application_received_date,
//         review_of_application, review_of_application_date, approval_received, approval_received_date,
//         order_issued, order_issued_date, process_initiated_vc_not_received, process_initiated_vc_not_received_date,
//         vigilance_clearance_received, vigilance_clearance_received_date, dpc_conducted, dpc_conducted_date,
//         approval_by_competent_authority, approval_by_competent_authority_date, promotion_order_issued,
//         promotion_order_issued_date, employees_joined, employees_joined_date, stage_id, created_by

//             FROM tbl_hr_post_strength
//             INNER JOIN tbl_hr_post on tbl_hr_post.post_id = tbl_hr_post_strength.post_id
//             INNER JOIN tbl_hr_department on tbl_hr_department.department_id = tbl_hr_post.department_id
//             INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_hr_department.organisation_id
//             INNER JOIN mmt_class on mmt_class.class_id = tbl_hr_post.class_id

async function hrDetailedAbstarctReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`
            SELECT
    m.organisation_name AS 'Organisation',
    m.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mc.class AS 'Class / Group',
    mc.class_id AS 'classId',
    p.post_id AS 'postId',
    d.department_name AS 'Department',
    p.post_name AS 'Post Name',
    MAX(p.sanctioned_strength) AS 'Sanctioned Strength',
    SUM(
        CASE
            WHEN (
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
            )
            AND ps.log_month = 3
            AND ps.log_year = ${startYear}
        THEN 1 ELSE 0
        END
    ) AS 'At the beginning of the FY',
	SUM(CASE
        WHEN
                ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, - 1, GETDATE()))
                AND ps.log_month = MONTH(DATEADD(month, - 1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'Occurred during the FY',
	SUM(
    CASE
        WHEN
            (
                (ps.vacant_or_filled = 'vacant'
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                        ((exception_abolish IS NULL OR exception_abolish = 0)
                        AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) > '${previousYrEnd}')
                        OR
                        exception_abolish = 1
                    )
               )
                OR
                (ps.vacant_or_filled = 'filled'  AND ps.employee_joined_date > '${previousYrEnd}' )
            )))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
        THEN 1
        ELSE 0
    END
) AS 'Total',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment IN('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'DR',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Promotion'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'P',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Deputation In'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'D',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Composite Method'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'CM',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Transfer In'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'T',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            	AND method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)', 'Promotion', 'Composite Method','Deputation In','Transfer In')
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'TotalFilled',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND (vacancy_type = 'Direct Recruitment' OR vacancy_type='Direct Recruitment (Compassionate Method)')
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'DR_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'promotion'
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'P_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Composite Method'
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'CM_vacant',
    	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Deputation In'
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'D_vacant',
    (SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Transfer In'
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'T_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND ps.vacancy_type IN ('Direct Recruitment' ,'Direct Recruitment (Compassionate Method)', 'Promotion', 'Composite Method','Deputation In','Transfer In')
                AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                    OR
                    ps.exception_abolish = 1
                )))
                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'TotalVacant'
    FROM
    mmt_organisation m
LEFT JOIN
    tbl_hr_post_strength_log ps ON m.organisation_id = ps.organisation_id
LEFT JOIN
    mmt_hr_post p ON
	ps.post_id = p.post_id
LEFT JOIN
    mmt_hr_department d ON p.department_id = d.department_id
LEFT JOIN
    mmt_class mc ON p.class_id = mc.class_id
LEFT JOIN
    mmt_organisation_category mo ON m.organisation_category_id = mo.organisation_category_id
LEFT JOIN
    tbl_hr_organisation_abolish pa ON m.organisation_id = pa.organisation_id
WHERE m.organisation_id = ${organisationId} AND p.class_id = ${classId}
GROUP BY
    m.organisation_id,m.organisation_name, mo.organisation_category_name, mc.class, mc.class_id, p.post_name, p.post_id,p.sanctioned_strength,d.department_name
    `);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        width: 320,
        cellStyle: { textAlign: "center" },
        children: [
          {
            headerName: "1",
            width: 320,
            field: "Organisation",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headercenter",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headercenter",
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            width: 290,
            field: "Department",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            width: 270,
            field: "Post Name",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Sanctioned Strength",
        field: "Sanctioned Strength",
        width: 200,
        headerClass: "headercenter",
        children: [
          {
            headerName: "5",
            width: 200,
            headerClass: "headercenter",
            field: "Sanctioned Strength",
          },
        ],
      },
      {
        headerName: "No. of Vacancies (Live)",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the beginning of the FY",
            field: "At the beginning of the FY",
            headerClass: "headercenter",
            width: 200,
            children: [
              {
                headerName: "6",
                width: 200,
                headerClass: "headercenter",
                field: "At the beginning of the FY",
              },
            ],
          },
          {
            headerName: "Occurred during the FY",
            field: "Occurred during the FY",
            headerClass: "headercenter",
            width: 180,
            children: [
              {
                headerName: "7",
                width: 180,
                headerClass: "headercenter",
                field: "Occurred during the FY",
              },
            ],
          },
          {
            headerName: "Total",
            field: "Total",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                headerClass: "headercenter",
                field: "Total",
              },
            ],
          },
        ],
      },
      {
        headerName: "No. of vacancies filled up during the FY by",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR",
            field: "DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "DR",
              },
            ],
          },
          {
            headerName: "P",
            field: "P",
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "P",
              },
            ],
          },
          {
            headerName: "D",
            field: "D",
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "D",
              },
            ],
          },
          {
            headerName: "CM",
            field: "CM",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "CM",
              },
            ],
          },
          {
            headerName: "T",
            field: "T",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "T",
              },
            ],
          },
          {
            headerName: "Total Filled",
            field: "TotalFilled",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "TotalFilled",
              },
            ],
          },
        ],
      },
      {
        headerName: "Balance No. of vacancies to be filled up by",
        field: "balanceVacant",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR ",
            field: "DR_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "DR_vacant",
              },
            ],
          },
          {
            headerName: "P ",
            field: "P_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "16",
                field: "P_vacant",
              },
            ],
          },
          {
            headerName: "CM ",
            field: "CM_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "18",
                field: "CM_vacant",
              },
            ],
          },
          {
            headerName: "D",
            field: "D_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "17",
                field: "D_vacant",
              },
            ],
          },
          {
            headerName: "T",
            field: "T_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "17",
                field: "T_vacant",
              },
            ],
          },
          {
            headerName: "Total Vacant",
            field: "TotalVacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "20",
                field: "TotalVacant",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrAbstarctReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  // const financialYear = '2024-2025';
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  request.input("classDrop", classDrop);

  //     let query1 = `SELECT
  //     m.organisation_name AS 'Organisation',
  //     m.organisation_id AS 'organisationId',
  //     mo.organisation_category_name AS 'Organisation Category',
  //     mc.class AS 'Class / Group',
  //     p.class_id AS 'classId',
  //     (
  //         SELECT COUNT(*)
  //         FROM mmt_hr_post
  //         WHERE organisation_id = m.organisation_id
  //         AND class_id = p.class_id
  //     ) AS 'No of Posts',
  //     (
  //         SELECT SUM(sanctioned_strength)
  //         FROM mmt_hr_post
  //         WHERE organisation_id = m.organisation_id
  //         AND class_id = p.class_id
  //     ) AS 'Total No of Posts Strength',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND (ps.date_of_arise_in_vacancy >= DATEADD(year, -5, '${previousYrEnd}') OR ps.exception_abolish = 1) AND (ps.date_of_arise_in_vacancy < '${fiscalYearStart}') THEN 1 ELSE 0 END) +
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ps.date_of_arise_in_vacancy <  '${fiscalYearStart}' AND ( ps.employee_joined_date >= '${fiscalYearStart}' ) THEN 1 ELSE 0 END)  AS 'At the beginning of the FY',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND (ps.date_of_arise_in_vacancy >= DATEADD(year, -5, '${previousYrEnd}') OR ps.exception_abolish = 1) AND ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) +
  //      SUM(CASE WHEN ps.vacant_or_filled = 'filled'  AND (ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND (ps.employee_joined_date >= '${fiscalYearStart}' ) THEN 1 ELSE 0 END) AS 'Occurred during the FY',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND (ps.date_of_arise_in_vacancy >= DATEADD(year, -5, '${previousYrEnd}') OR ps.exception_abolish = 1) AND ps.date_of_arise_in_vacancy <=  EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) +
  //      SUM(CASE WHEN ps.vacant_or_filled = 'filled'  AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) AND ( ps.employee_joined_date >= '${fiscalYearStart}' ) THEN 1 ELSE 0 END) AS 'Total',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'Direct Recruitment' THEN 1 ELSE 0 END) AS 'DR',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'promotion'  THEN 1 ELSE 0 END) AS 'P',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'deputation'  THEN 1 ELSE 0 END) AS 'D',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'Composite Method'  THEN 1 ELSE 0 END) AS 'CM',
  //     SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'Transfer' THEN 1 ELSE 0 END) AS 'T',
  //     SUM(CASE
  //         WHEN ps.vacant_or_filled = 'filled'
  //              AND ps.method_of_appointment IN ('Direct Recruitment', 'promotion', 'deputation', 'Composite Method', 'Transfer')
  //              AND ( ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1))
  //         THEN 1
  //         ELSE 0
  //     END) AS 'TotalFilled',
  //     (SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND ps.vacancy_type = 'Direct Recruitment' AND ps.date_of_arise_in_vacancy IS NOT NULL AND
  //                 (
  //                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
  //                 DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
  //                 OR
  //                 (ps.exception_abolish = 1 AND ps.exception_abolish_date IS NOT NULL AND
  //                 '${previousYrEnd}' < ps.exception_abolish_date)) AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) + SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date > EOMONTH(GETDATE(), -1)) AND ps.vacancy_type = 'Direct Recruitment' AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) ) AS 'DR_vacant',
  //     (SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND ps.vacancy_type = 'promotion' AND ps.date_of_arise_in_vacancy IS NOT NULL AND
  //                 (
  //                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
  //                 DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
  //                 OR
  //                 (ps.exception_abolish = 1 AND ps.exception_abolish_date IS NOT NULL AND
  //                 '${previousYrEnd}' < ps.exception_abolish_date)) AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) + SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date > EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'promotion' AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) )  AS 'P_vacant',
  //     (SUM(CASE WHEN ps.vacant_or_filled = 'vacant' AND ps.vacancy_type = 'Composite Method' AND ps.date_of_arise_in_vacancy IS NOT NULL AND
  //                 (
  //                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
  //                 DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
  //                 OR
  //                 (ps.exception_abolish = 1 AND ps.exception_abolish_date IS NOT NULL AND
  //                 '${previousYrEnd}' < ps.exception_abolish_date)) AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) + SUM(CASE WHEN ps.vacant_or_filled = 'filled' AND ( ps.employee_joined_date > EOMONTH(GETDATE(), -1)) AND ps.method_of_appointment = 'Composite Method' AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1) THEN 1 ELSE 0 END) ) AS 'CM_vacant',
  //     (SUM(CASE
  //         WHEN ps.vacant_or_filled = 'vacant'
  //              AND ps.vacancy_type IN ('Direct Recruitment', 'promotion','Composite Method')
  //              AND ps.date_of_arise_in_vacancy IS NOT NULL AND
  //                 (
  //                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
  //                 DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
  //                 OR
  //                 (ps.exception_abolish = 1 AND ps.exception_abolish_date IS NOT NULL AND
  //                 '${previousYrEnd}' < ps.exception_abolish_date))
  //              AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1)
  //         THEN 1
  //         ELSE 0
  //     END) +  SUM(CASE
  //         WHEN ps.vacant_or_filled = 'filled'
  //              AND ps.method_of_appointment IN ('Direct Recruitment', 'promotion', 'deputation', 'Composite Method', 'Transfer')
  //              AND ( ps.employee_joined_date > EOMONTH(GETDATE(), -1)) AND ps.date_of_arise_in_vacancy <= EOMONTH(GETDATE(), -1)
  //         THEN 1
  //         ELSE 0
  //     END) ) AS 'TotalVacant'
  // FROM
  //     mmt_organisation m
  // LEFT JOIN
  //     tbl_hr_post_strength_log ps ON m.organisation_id = ps.organisation_id
  // LEFT JOIN
  //     mmt_hr_post p ON ps.post_id = p.post_id
  // LEFT JOIN
  //     mmt_class mc ON p.class_id = mc.class_id
  // LEFT JOIN
  //     mmt_organisation_category mo ON m.organisation_category_id = mo.organisation_category_id`;

  // let query1 =  `
  //    SELECT
  //     m.organisation_name AS 'Organisation',
  //     m.organisation_id AS 'organisationId',
  //     mo.organisation_category_name AS 'Organisation Category',
  //     mc.class AS 'Class / Group',
  //     p.class_id AS 'classId',
  //     (SELECT
  //             COUNT(*)
  //         FROM
  //             mmt_hr_post
  //         WHERE
  //             class_id = p.class_id) AS 'No of Posts',
  //     (SELECT
  //             SUM(sanctioned_strength)
  //         FROM
  //             mmt_hr_post
  //         WHERE
  //             class_id = p.class_id) AS 'Total No of Posts Strength',
  //     (SELECT COUNT(*)
  //         FROM tbl_hr_post_strength_log
  //         WHERE organisation_id = mmt.organisation_id AND vacant_or_filled = 'vacant' AND
  //       date_of_arise_in_vacancy IS NOT NULL AND
  //       date_of_arise_in_vacancy <= '${previousYrEnd}' AND
  //       (
  //       ((exception_abolish IS NULL OR exception_abolish = 0) AND
  //       DATEADD(YEAR, 5, date_of_arise_in_vacancy) > '${previousYrEnd}')
  //       OR
  //       (exception_abolish = 1 AND exception_abolish_date IS NOT NULL AND
  //       '${previousYrEnd}' < exception_abolish_date)
  //       ) AND log_month = 3 AND log_year = ${startYear} ) AS [At the beginning of the FY],
  //     SUM(CASE
  //         WHEN
  //             date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
  //                 AND ps.vacant_or_filled = 'vacant'
  //                 AND ps.log_year = YEAR(DATEADD(month, - 1, GETDATE()))
  //                 AND ps.log_month = MONTH(DATEADD(month, - 1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'Occurred during the FY',
  //     SUM(CASE
  //         WHEN
  //             (ps.vacant_or_filled = 'vacant'
  //                 OR (vacant_or_filled = 'filled'
  //                 AND employee_joined_date >= '${fiscalYearStart}'))
  //                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) >= EOMONTH(DATEADD(MONTH, -1, GETDATE()))
  //                 AND ps.log_year = YEAR(DATEADD(month, - 1, GETDATE()))
  //                 AND ps.log_month = MONTH(DATEADD(month, - 1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'Total',
  //     SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled ='vacant' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment IN('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'DR',
  //     SUM(CASE
  //         WHEN
  //         	ps.vacant_or_filled ='filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment ='Promotion'
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'P',
  //     SUM(CASE
  //         WHEN
  //         	ps.vacant_or_filled ='filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment ='Deputation'
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'D',
  //     SUM(CASE
  //         WHEN
  //         	ps.vacant_or_filled ='filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment ='Composite Method'
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'CM',
  //     SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled ='filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment ='Transfer'
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'T',
  //     SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled ='filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
  //             	AND method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)', 'Promotion',  'Composite Method')
  // 				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
  // 				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
  //         THEN
  //             1
  //         ELSE 0
  //     END) AS 'TotalFilled',
  //     (SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled = 'vacant'
  //                 AND vacancy_type = 'Direct Recruitment'
  //                 AND (DATEADD(year, 5, ps.date_of_arise_in_vacancy) >= '${previousYrEnd}'
  //                 OR (ps.exception_abolish = 1
  //                 AND exception_abolish_date <= '${fiscalYearEnd}'))
  //         THEN
  //             1
  //         ELSE 0
  //     END)) AS 'DR_vacant',
  //     (SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled = 'vacant'
  //                 AND vacancy_type = 'promotion'
  //                 AND (DATEADD(year, 5, ps.date_of_arise_in_vacancy) >= '${previousYrEnd}'
  //                 OR (ps.exception_abolish = 1
  //                 AND exception_abolish_date <= '${fiscalYearEnd}'))
  //         THEN
  //             1
  //         ELSE 0
  //     END)) AS 'P_vacant',
  //     (SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled = 'vacant'
  //                 AND vacancy_type = 'Composite Method'
  //                 AND (DATEADD(year, 5, ps.date_of_arise_in_vacancy) >= '${previousYrEnd}'
  //                 OR (ps.exception_abolish = 1
  //                 AND exception_abolish_date <= '${fiscalYearEnd}'))
  //         THEN
  //             1
  //         ELSE 0
  //     END)) AS 'CM_vacant',
  //     (SUM(CASE
  //         WHEN
  //             ps.vacant_or_filled = 'vacant'
  //                 AND ps.vacancy_type IN ('Direct Recruitment' , 'Promotion', 'Composite Method')
  //                 AND (DATEADD(year, 5, ps.date_of_arise_in_vacancy) >= '${previousYrEnd}'
  //                 OR (ps.exception_abolish = 1
  //                 AND exception_abolish_date <= '${fiscalYearEnd}'))
  //         THEN
  //             1
  //         ELSE 0
  //     END)) AS 'TotalVacant'
  // FROM
  //     mmt_organisation m
  //         LEFT JOIN
  //     tbl_hr_post_strength_log ps ON m.organisation_id = ps.organisation_id
  //         LEFT JOIN
  //     mmt_hr_post p ON ps.post_id = p.post_id
  //         LEFT JOIN
  //     mmt_class mc ON p.class_id = mc.class_id
  //         LEFT JOIN
  //     mmt_organisation_category mo ON m.organisation_category_id = mo.organisation_category_id
  // `;

  let query1 = `
      SELECT
	m.organisation_name AS 'Organisation',
	m.organisation_id AS 'organisationId',
	mo.organisation_category_name AS 'Organisation Category',
	mc.class AS 'Class / Group',
	p.class_id AS 'classId',

    COUNT(DISTINCT CASE
        WHEN ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
          AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN ps.post_id END) AS 'No of Posts',

    COUNT(CASE
        WHEN ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
         AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN ps.post_code END) AS 'Total No of Posts Strength',
	SUM(
        CASE
            WHEN (
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
            )
            AND ps.log_month = 3
            AND ps.log_year = ${startYear}
        THEN 1 ELSE 0
        END
    ) AS 'At the beginning of the FY',
	SUM(CASE
        WHEN
                ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(month, - 1, GETDATE()))
                AND ps.log_month = MONTH(DATEADD(month, - 1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'Occurred during the FY',
	SUM(
    CASE
    WHEN
        (
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
            OR
            (
                ps.vacant_or_filled = 'filled'
                AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            )
        )
        AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
    THEN 1
    ELSE 0
END
) AS 'Total',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment IN('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
			AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
			AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'DR',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}'  AND '${fiscalYearEnd}' AND method_of_appointment = 'Promotion'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'P',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}'  AND '${fiscalYearEnd}' AND method_of_appointment = 'Deputation In'
			AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
			AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'D',
	SUM(CASE
        WHEN
        	ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}'  AND '${fiscalYearEnd}' AND method_of_appointment = 'Composite Method'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'CM',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Transfer In'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'T',
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' AND method_of_appointment = 'Absorption'
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'A',
	SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled' AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            	AND method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)', 'Promotion', 'Composite Method','Deputation In','Transfer In','Absorption')
				AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END) AS 'TotalFilled',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND (ps.vacancy_type = 'Direct Recruitment' OR ps.vacancy_type = 'Direct Recruitment (Compassionate Method)')
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'DR_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Promotion'
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'P_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Composite Method'
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'CM_vacant',
    (SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Deputation In'
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'D_vacant',
    (SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND vacancy_type = 'Transfer In'
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'T_vacant',
	(SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
                AND ps.vacancy_type IN ('Direct Recruitment' ,'Direct Recruitment (Compassionate Method)', 'Promotion', 'Composite Method','Deputation In','Transfer In')
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
                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
				AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        THEN
            1
        ELSE 0
    END)) AS 'TotalVacant'
FROM
	mmt_organisation m
LEFT JOIN
    tbl_hr_post_strength_log ps ON
	m.organisation_id = ps.organisation_id
LEFT JOIN
    mmt_hr_post p ON
	ps.post_id = p.post_id
LEFT JOIN
    mmt_class mc ON
	p.class_id = mc.class_id
LEFT JOIN
    mmt_organisation_category mo ON
	m.organisation_category_id = mo.organisation_category_id
LEFT JOIN
    tbl_hr_organisation_abolish pa ON m.organisation_id = pa.organisation_id
    WHERE m.organisation_usermatrix_category_id = 2
`;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` AND m.organisation_id!=4 AND mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND m.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND p.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND p.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` AND m.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND p.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` AND p.class_id = ${classDrop}`;
  } else {
    condition = ` AND mo.organisation_category_id IN (1, 3) AND m.organisation_id!=4`;
  }

  condition += `
GROUP BY
    m.organisation_id, m.organisation_name, mo.organisation_category_name, mc.class, p.class_id
ORDER BY
    m.organisation_name,p.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        width: 320,
        cellStyle: { textAlign: "center" },
        children: [
          {
            headerName: "1",
            width: 320,
            field: "Organisation",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headercenter",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        width: 150,
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            width: 150,
            field: "Class / Group",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headercenter",
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "3",
            headerClass: "headercenter",
            field: "No of Posts",
          },
        ],
      },
      {
        headerName: "Total No of Posts Strength",
        field: "Total No of Posts Strength",
        width: 200,
        headerClass: "headercenter",
        children: [
          {
            headerName: "4",
            width: 200,
            headerClass: "headercenter",
            field: "Total No of Posts Strength",
          },
        ],
      },
      {
        headerName: "No. of Vacancies (Live)",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the beginning of the FY",
            field: "At the beginning of the FY",
            headerClass: "headercenter",
            width: 200,
            children: [
              {
                headerName: "5",
                width: 200,
                headerClass: "headercenter",
                field: "At the beginning of the FY",
              },
            ],
          },
          {
            headerName: "Occurred during the FY",
            field: "Occurred during the FY",
            headerClass: "headercenter",
            width: 180,
            children: [
              {
                headerName: "6",
                width: 180,
                headerClass: "headercenter",
                field: "Occurred during the FY",
              },
            ],
          },
          {
            headerName: "Total",
            field: "Total",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                headerClass: "headercenter",
                field: "Total",
              },
            ],
          },
        ],
      },
      {
        headerName: "No. of vacancies filled up during the FY by",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR",
            field: "DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "DR",
              },
            ],
          },
          {
            headerName: "P",
            field: "P",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "P",
              },
            ],
          },
          {
            headerName: "D",
            field: "D",
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "D",
              },
            ],
          },
          {
            headerName: "CM",
            field: "CM",
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "CM",
              },
            ],
          },
          {
            headerName: "T",
            field: "T",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "T",
              },
            ],
          },
           {
            headerName: "A",
            field: "A",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "A",
              },
            ],
          },
          {
            headerName: "Total Filled",
            field: "TotalFilled",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "TotalFilled",
              },
            ],
          },
        ],
      },
      {
        headerName: "Balance No. of vacancies to be filled up by",
        field: "balanceVacant",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR ",
            field: "DR_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "DR_vacant",
              },
            ],
          },
          {
            headerName: "P ",
            field: "P_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "16",
                field: "P_vacant",
              },
            ],
          },
          {
            headerName: "CM ",
            field: "CM_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "17",
                field: "CM_vacant",
              },
            ],
          },
          {
            headerName: "D",
            field: "D_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "18",
                field: "D_vacant",
              },
            ],
          },
          {
            headerName: "T",
            field: "T_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "19",
                field: "T_vacant",
              },
            ],
          },
          {
            headerName: "Total Vacant",
            field: "TotalVacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "20",
                field: "TotalVacant",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrOverviewReport(req, res) {
  const conn = await pool;
  const request = conn.request();

  let firstDate, lastDate;
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth() + 1;
  let currentYear = new Date(currentDate).getFullYear();

  //    console.log(currentYear, "currentYear")
  //    console.log(currentMonth >= 3 && currentMonth <= 0);
  if (currentMonth <= 3 || currentMonth >= 1) {
    let preYear = currentYear - 1 + "-04-01";
    let curYear = currentYear + "-03-31";
    // console.log(curYear, previousYearFullDate)
    firstDate = preYear;
    lastDate = curYear;
  } else {
    let preYear = currentYear + "-04-01";
    let curYear = currentYear + 1 + "-03-31";
    firstDate = preYear;
    lastDate = curYear;
  }

  try {
    const result =
      await request.query(` SELECT organisation_name, tbl_hr_department.organisation_id,
            mmt_class.class, tbl_hr_post.post_name AS post_name,
            vacant_or_filled,
            COUNT(to_be_filled_through) AS to_be_filled_through_Count,
            to_be_filled_through

            FROM tbl_hr_post_strength
            INNER JOIN tbl_hr_post on tbl_hr_post.post_id = tbl_hr_post_strength.post_id
            INNER JOIN tbl_hr_department on tbl_hr_department.department_id = tbl_hr_post.department_id
            INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_hr_department.organisation_id
            INNER JOIN mmt_class on mmt_class.class_id = tbl_hr_post.class_id

            WHERE (employees_joined_date is null) OR
            (employees_joined_date <= '${lastDate}' AND employees_joined_date >= '${firstDate}')

            GROUP BY to_be_filled_through, vacant_or_filled,
            tbl_hr_department.organisation_id, organisation_name, post_name,
            mmt_class.class
            ORDER BY organisation_name, class, post_name
        ;`);

    // WHERE (employees_joined_date IS NOT NULL AND
    //     (employees_joined_date <= '${lastDate}' AND employees_joined_date >= '${firstDate}')
    //     OR (employees_joined_date is null )

    // WHERE employees_joined_date IS NOT NULL AND
    // (employees_joined_date <= '${lastDate}' AND employees_joined_date >= '${firstDate}'

    // const response = { currentFinYearFilledRows:  currentFinYearFilledResult.recordset,
    //     vacantRows:  vacantResult.recordset,
    //     count: totalCount.recordset
    //     }
    // res.json(response);
    res.json(result.recordset);
  } catch (err) {
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function hrFirstReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;

  const currentYear = new Date().getFullYear();
  const financialDrop =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialDrop.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  const conn = await pool;
  const request = conn.request();

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  let query1 = "";

  let condition = "";
  query1 = `SELECT
                o.[organisation_name] AS 'Organisation',
                o.[organisation_id] AS 'organisationId',
                oc.[organisation_category_name] AS 'Organisation Category',
                (COUNT(CASE WHEN p.[vacant_or_filled] = 'filled' AND p.employee_joined_date < '${fiscalYearStart}' THEN 1 END) +
                COUNT(CASE WHEN p.[vacant_or_filled] = 'vacant' AND p.date_of_arise_in_vacancy < '${fiscalYearStart}' THEN 1 END) +
                COUNT(CASE WHEN p.[vacant_or_filled] = 'filled' AND p.date_of_arise_in_vacancy < '${fiscalYearStart}' AND p.employee_joined_Date >= '${fiscalYearStart}' THEN 1 END)) AS 'Sanctioned Strength',
                COUNT(CASE WHEN p.[vacant_or_filled] = 'filled' AND p.employee_joined_date < '${fiscalYearStart}' THEN 1 END) AS 'In Position',
                COUNT(CASE WHEN p.[vacant_or_filled] = 'vacant' AND p.date_of_arise_in_vacancy < '${fiscalYearStart}' THEN 1 END) +
                COUNT(CASE WHEN p.[vacant_or_filled] = 'filled' AND p.date_of_arise_in_vacancy < '${fiscalYearStart}' AND p.employee_joined_Date >= '${fiscalYearStart}' THEN 1 END) AS 'Total Vacancies',
                COUNT(CASE WHEN p.[vacant_or_filled] = 'vacant' AND p.date_of_arise_in_vacancy >= '${fiscalYearStart}' THEN 1 END) +
                COUNT(CASE WHEN p.vacant_or_filled ='filled' AND date_of_arise_in_vacancy >= '${fiscalYearStart}' AND (employee_joined_date >= '${fiscalYearStart}') THEN 1 END)  AS 'Total Vacancies during FY',

                (SELECT count(*) FROM tbl_employee_master WHERE emp_curr_org_id = o.organisation_id AND emp_dor >= '${fiscalYearStart}' AND emp_dor <= '${fiscalYearEnd}' ) AS 'Anticipated vacancies in Next FY',
                COUNT(CASE
                WHEN p.date_of_arise_in_vacancy IS NOT NULL
                     AND p.date_of_arise_in_vacancy < '${fiscalYearStart}'
                     AND p.vacant_or_filled = 'vacant'
                     AND (
                         pa.abolish_required = 0
                         OR
                         (pa.abolish_required = 1
                             AND (
                                 ((p.exception_abolish IS NULL OR p.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, p.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 p.exception_abolish = 1
                             )
                         )
                     )
                OR
                (p.date_of_arise_in_vacancy < '${fiscalYearStart}'
                     AND p.vacant_or_filled = 'filled'
                     AND p.employee_joined_date > '${previousYrEnd}')
                THEN 1
                END) AS 'Less than 5 years (Live)',
                CASE
                    WHEN pa.abolish_required = 1 THEN
                        COUNT(CASE WHEN p.vacant_or_filled = 'vacant' AND p.date_of_arise_in_vacancy IS NOT NULL AND (
                            ((p.exception_abolish IS NULL OR p.exception_abolish = 0) AND DATEADD(YEAR, 5, p.date_of_arise_in_vacancy) <= '${previousYrEnd}')
                        ) THEN 1 END)
                    ELSE 0
                END AS 'More than 5 years (Abolished)'
            FROM
                [mmt_organisation] o
            LEFT JOIN
                [tbl_hr_post_strength_log] p ON o.[organisation_id] = p.[organisation_id]
            LEFT JOIN
                [tbl_hr_anticipated] a ON o.[organisation_id] = a.[organisation_id] AND a.[fiscl_yr] = '${financialDrop}'
            LEFT JOIN
                [tbl_hr_organisation_abolish] pa ON o.[organisation_id] = pa.[organisation_id]
            LEFT JOIN
                [mmt_organisation_category] oc ON o.[organisation_category_id] = oc.[organisation_category_id]
            WHERE
                p.log_year = ${startYear} AND p.log_month = 3
                AND o.organisation_usermatrix_category_id = 2`;

  if (orgCatDrop === "0" && orgDrop === "0") {
    condition = `
            AND o.organisation_category_id IN (1, 3) AND o.organisation_id!=4
        GROUP BY
            o.[organisation_name],pa.abolish_required, o.[organisation_id], oc.[organisation_category_name], a.anticipated_vacancies_next_fy; `;
  } else {
    if (orgCatDrop !== "0") {
      condition = `AND o.organisation_category_id = ${orgCatDrop} AND o.organisation_id!=4
            GROUP BY
            o.[organisation_name],pa.abolish_required, o.[organisation_id], oc.[organisation_category_name],a.anticipated_vacancies_next_fy; `;
    }
    if (orgDrop !== "0") {
      condition = `AND o.organisation_id = ${orgDrop}
            GROUP BY
            o.[organisation_name],pa.abolish_required, o.[organisation_id], oc.[organisation_category_name],a.anticipated_vacancies_next_fy; `;
    }
  }

  query1 += condition;

  try {
    const result = await request.query(query1);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        rowSpan: function (params) {
          return params.data.rowSpan || 2; // Default to 1 if rowSpan is not provided
        },
        cellRenderer: function (params) {
          return params.value ? params.value : ""; // Render empty string for null or undefined values
        },
        children: [
          {
            headerName: "1",
            field: "Organisation",
            headerClass: "headerGroup",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Sanctioned Strength",
        field: "Sanctioned Strength",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "2",
            field: "Sanctioned Strength",
          },
        ],
      },
      {
        headerName: "In Position",
        field: "In Position",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "3",
            field: "In Position",
          },
        ],
      },
      {
        headerName: "Total Vacancies",
        field: "Total Vacancies",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "4",
            field: "Total Vacancies",
          },
        ],
      },
      {
        headerName: `Anticipated vacancies in Current FY (${financialDrop})`,
        field: "Anticipated vacancies in Current FY",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "5",
            field: "Anticipated vacancies in Next FY",
          },
        ],
      },
      {
        headerName: "No of vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Less than 5 years (Live)",
            field: "Less than 5 years (Live)",
            children: [
              {
                headerName: "6",
                field: "Less than 5 years (Live)",
              },
            ],
          },
          {
            headerName: "More than 5 years (Abolished)",
            field: "More than 5 years (Abolished)",
            children: [
              {
                headerName: "7",
                field: "More than 5 years (Abolished)",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function detailedHrReport(req, res) {
  let organisationID = req.params.organisationID;
  let type = req.params.type;

  const currentYear = new Date().getFullYear();
  const financialDrop =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialDrop.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  const conn = await pool;
  const request = conn.request();
  let result;

  try {
    if (type == 1) {
      result = await request.query(`SELECT
            p.organisation_id AS 'organisationId',
            d.department_name AS 'Department',
            c.class AS 'Class / Group',
            po.[post_name] AS 'Post Name',
            p.[post_code] AS 'Post Code',
            CONVERT(VARCHAR, p.[date_of_arise_in_vacancy], 120) AS 'Date of Arise In Vacancy'
        FROM
            [mmt_organisation] o
        LEFT JOIN
            [tbl_hr_post_strength_log] p ON o.[organisation_id] = p.[organisation_id]
        LEFT JOIN
            [mmt_hr_post] po ON p.[post_id] = po.[post_id]
        LEFT JOIN
		    [mmt_hr_department] d ON d.[department_id] = po.[department_id]
        LEFT JOIN
		    [tbl_hr_organisation_abolish] pa ON o.[organisation_id] = pa.[organisation_id]
        LEFT JOIN
		    [mmt_class] c ON po.[class_id] = c.[class_id]
        WHERE
                        o.organisation_id = ${organisationID} AND
            p.log_month = 3 AND p.log_year = ${startYear} AND
            ( (p.date_of_arise_in_vacancy < '${fiscalYearStart}' AND p.vacant_or_filled = 'vacant'
             AND (
                pa.abolish_required = 0
                OR
                (pa.abolish_required = 1 AND (
            ((p.exception_abolish IS NULL OR p.exception_abolish = 0)
            AND DATEADD(YEAR, 5, p.date_of_arise_in_vacancy) > '${previousYrEnd}') ))
            OR
            p.exception_abolish = 1)
            )
            OR
            (p.date_of_arise_in_vacancy < '${fiscalYearStart}' AND p.vacant_or_filled = 'filled' AND p.employee_joined_date > '${previousYrEnd}'));`);
    } else {
      result = await request.query(`SELECT
            p.organisation_id AS 'organisationId',
            d.department_name AS 'Department',
            c.class AS 'Class / Group',
            po.[post_name] AS 'Post Name',
            p.[post_code] AS 'Post Code',
            CONVERT(VARCHAR, p.[date_of_arise_in_vacancy], 120) AS 'Date of Arise In Vacancy'
        FROM
            [mmt_organisation] o
        LEFT JOIN
            [tbl_hr_post_strength_log] p ON o.[organisation_id] = p.[organisation_id]
        LEFT JOIN
            [mmt_hr_post] po ON p.[post_id] = po.[post_id]
        LEFT JOIN
		    [mmt_hr_department] d ON d.[department_id] = po.[department_id]
        LEFT JOIN
		    [mmt_class] c ON po.[class_id] = c.[class_id]
        WHERE
            o.organisation_id = ${organisationID} AND
            p.log_month = 3 AND p.log_year = ${startYear} AND
            p.vacant_or_filled = 'vacant' AND
            p.date_of_arise_in_vacancy IS NOT NULL AND
            ((p.exception_abolish IS NULL OR p.exception_abolish = 0) AND
            DATEADD(YEAR, 5, p.date_of_arise_in_vacancy) <= '${previousYrEnd}');
        `);
    }
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Department",
             filter: 'agTextColumnFilter' ,
          },
        ],
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        children: [
          {
            headerName: "3",
            field: "Post Name",
            filter: 'agTextColumnFilter' 
          },
        ],
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headercenter",
        children: [
          {
            headerName: "4",
            field: "Post Code",
          },
        ],
      },
      {
        headerName: "Date of Arise In Vacancy",
        field: "Date of Arise In Vacancy",
        headerClass: "headercenter",
        children: [
          {
            headerName: "5",
            field: "Date of Arise In Vacancy",
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSecondReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;
  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  let query1 = "";

  let condition = "";

  query1 = `
SELECT
    mmt.organisation_name AS 'Organisation',
    mmt.organisation_id AS 'organisationId',
    oc.organisation_category_name AS 'Organisation Category',

    -- Vacancies at the beginning of the FY
    SUM(
        CASE
            WHEN (
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
            )
            AND ps.log_month = 3
            AND ps.log_year = ${startYear}
        THEN 1 ELSE 0
        END
    ) AS [At the beginning of the FY],

    -- Vacancies occurred during the FY
    SUM(
        CASE
            WHEN ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0
        END
    ) AS [Occurred during the FY],

    -- Total (At the beginning + Occurred during the FY)
    (SUM(
        CASE
            WHEN (
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
            )
            AND ps.log_month = 3
            AND ps.log_year = ${startYear}
        THEN 1 ELSE 0
        END
    )
        +
        SUM(
            CASE
                WHEN ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0
            END
        )
    ) AS [Total],

    -- Anticipated vacancies for next FY
    COALESCE(a.anticipated_vacancies_next_fy, 0) AS [Anticipated vacancies in Next FY],

    -- Filled posts from beginning of FY till last month
    SUM(
        CASE
            WHEN ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -2)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0
        END
    ) AS [Filled from Beginning of the FY till last month],

    -- Filled posts during the last month
    SUM(
        CASE
            WHEN ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date BETWEEN DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()) - 1, 1)
                AND EOMONTH(GETDATE(), -1)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0
        END
    ) AS [Filled during the month],

    -- Total filled posts till now
    SUM(
        CASE
            WHEN ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -1)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0
        END
    ) AS [Total filled up]

FROM
    mmt_organisation mmt
LEFT JOIN
    tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
LEFT JOIN
    tbl_hr_anticipated a ON mmt.organisation_id = a.organisation_id
    AND a.fiscl_yr = '${financialYear}'
LEFT JOIN
    mmt_organisation_category oc ON mmt.organisation_category_id = oc.organisation_category_id
LEFT JOIN
    tbl_hr_organisation_abolish pa ON mmt.organisation_id = pa.organisation_id
`;

  if (orgCatDrop === "0" && orgDrop === "0") {
    condition = `
           WHERE  mmt.organisation_category_id IN (1, 3) AND mmt.organisation_id!=4 AND mmt.organisation_usermatrix_category_id = 2
        GROUP BY
            pa.abolish_required, mmt.organisation_name,  a.anticipated_vacancies_next_fy, oc.organisation_category_name, mmt.organisation_id; `;
  } else {
    if (orgCatDrop !== "0") {
      condition = `WHERE mmt.organisation_category_id = ${orgCatDrop}  AND mmt.organisation_id!=4 AND mmt.organisation_usermatrix_category_id = 2
            GROUP BY
            pa.abolish_required, mmt.organisation_name,  a.anticipated_vacancies_next_fy, oc.organisation_category_name,mmt.organisation_id;  `;
    }
    if (orgDrop !== "0") {
      condition = `WHERE mmt.organisation_id = ${orgDrop} AND mmt.organisation_usermatrix_category_id = 2
            GROUP BY
            pa.abolish_required,mmt.organisation_name,  a.anticipated_vacancies_next_fy, oc.organisation_category_name,mmt.organisation_id;  `;
    }
  }
  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        cellStyle: { textAlign: "center" },
        children: [
          {
            headerName: "1",
            field: "Organisation",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headercenter",
      },
      {
        headerName: "Number of Live vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the beginning of the FY",
            field: "At the beginning of the FY",
            headerClass: "headercenter",
            children: [
              {
                headerName: "2",
                field: "At the beginning of the FY",
              },
            ],
          },
          {
            headerName: "Occurred during the FY",
            field: "Occurred during the FY",
            headerClass: "headercenter",
            children: [
              {
                headerName: "3",
                field: "Occurred during the FY",
              },
            ],
          },
          {
            headerName: "Total",
            field: "Total",
            headerClass: "headercenter",
            children: [
              {
                headerName: "4",
                field: "Total",
              },
            ],
          },
        ],
      },
      {
        headerName: "Anticipated vacancies in Next FY",
        field: "Anticipated vacancies in Next FY",
        headerClass: "headercenter",
        children: [
          {
            headerName: "5",
            field: "Anticipated vacancies in Next FY",
          },
        ],
      },
      {
        headerName: "Filled during the year",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Filled from Beginning of the FY till last month",
            field: "Filled from Beginning of the FY till last month",
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Filled from Beginning of the FY till last month",
              },
            ],
          },
          {
            headerName: "Filled during the month",
            field: "Filled during the month",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Filled during the month",
              },
            ],
          },
          {
            headerName: "Total filled up",
            field: "Total filled up",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Total filled up",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function detailedHrStatusFillingReport(req, res) {
  let organisationID = req.params.organisationID;
  let type = req.params.type;
  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;

  const fiscalYearEnd = `${endYear}-03-31`;

  let result,
    query2 = "";
  if (type == 1) {
    query2 = `WHERE p.log_month = MONTH(DATEADD(MONTH, -1, GETDATE())) AND p.log_year = YEAR(DATEADD(MONTH, -1, GETDATE())) AND
        o.organisation_id = ${organisationID} AND p.vacant_or_filled='filled' AND (p.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(), -2))`;
  } else if (type == 2) {
    query2 = `WHERE  p.log_month = MONTH(DATEADD(MONTH, -1, GETDATE())) AND p.log_year = YEAR(DATEADD(MONTH, -1, GETDATE())) AND
        o.organisation_id = ${organisationID} AND p.vacant_or_filled='filled' AND (p.employee_joined_date BETWEEN DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE())-1, 1) AND EOMONTH(GETDATE(),-1))`;
  } else if (type == 3) {
    query2 = `WHERE  p.log_month = MONTH(DATEADD(MONTH, -1, GETDATE())) AND p.log_year = YEAR(DATEADD(MONTH, -1, GETDATE())) AND
        o.organisation_id = ${organisationID} AND p.vacant_or_filled='filled' AND (p.employee_joined_date BETWEEN '${fiscalYearStart}' AND EOMONTH(GETDATE(),-1))`;
  }

  try {
    result = await request.query(`
      SELECT
            p.organisation_id AS 'organisationId',
            d.department_name AS 'Department',
            mc.class AS 'Class / Group',
            po.[post_name] AS 'Post Name',
            p.[post_code] AS 'Post Code',
            CONVERT(VARCHAR, p.[date_of_arise_in_vacancy], 120) AS 'Date Of Arise In Vacancy',
            CONVERT(VARCHAR, p.[employee_joined_date], 120) AS 'Employee Joining Date',
			em.emp_name AS 'Employee Name',
            p.method_of_appointment AS 'Method of Appointment'
        FROM
            [mmt_organisation] o
        LEFT JOIN
            [tbl_hr_post_strength_log] p ON o.[organisation_id] = p.[organisation_id]

        LEFT JOIN
            [mmt_hr_post] po ON p.[post_id] = po.[post_id]
        LEFT JOIN
		        [mmt_hr_department] d ON d.[department_id] = po.[department_id]
        LEFT JOIN
            [mmt_class] mc ON po.[class_id] = mc.[class_id]
		    LEFT JOIN
            tbl_employee_master em ON p.[emp_master_id] = em.[emp_master_id]
        ${query2} `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = Object.keys(rowData[0]).map((key) => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
      field: key,
    }));

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrFourthReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYearStartYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const financialYearEndYear = financialYearStartYear + 1;

  const fiscalYearStart = `${financialYearStartYear}-04-01`;
  const fiscalYearEnd = `${financialYearEndYear}-03-31`;
  const previousFiscalYr = `${financialYearStartYear}-03-31`;

  request.input("financialYearStart",fiscalYearStart);
  request.input("financialYearEnd", fiscalYearEnd);
  request.input("previousFiscalYear", previousFiscalYr);
  request.input("logYear",financialYearStartYear);

  if (orgCatDrop !== "0") {
    request.input("orgCatDrop", parseInt(orgCatDrop));
  }
  if (orgDrop !== "0") {
    request.input("orgDrop",parseInt(orgDrop));
  }
  if (classDrop !== "0") {
    request.input("classDrop", parseInt(classDrop));
  }

  let query = `
    WITH AnticipatedVacancies AS (
        SELECT
            ps.organisation_id,
            post.class_id,
            COUNT(CASE
                WHEN
                    ps.vacant_or_filled = 'filled'
                    AND ps.expected_anticipated_vacancy IN ('Direct Recruitment')
                    AND em_sub.emp_status=1
                    AND em_sub.emp_dor BETWEEN GETDATE() AND @financialYearEnd
                THEN 1 ELSE NULL -- Use NULL for counting only valid cases
            END) AS AnticipatedCount
        FROM tbl_hr_post_strength ps
        INNER JOIN mmt_hr_post post ON ps.post_id = post.post_id
        INNER JOIN tbl_employee_master em_sub ON ps.emp_master_id = em_sub.emp_master_id
        WHERE
          ps.vacant_or_filled = 'filled'
          AND ps.expected_anticipated_vacancy IN ('Direct Recruitment')
          AND ps.organisation_id != 4
        GROUP BY
            ps.organisation_id,
            post.class_id
    )
    SELECT
        mmt.organisation_name AS 'Organisation',
        mmt.organisation_id AS 'organisationId',
        mo.organisation_category_name AS 'Organisation Category',
        mmtc.class AS 'Class / Group',
        post.class_id AS 'classId',

        -- At the Beginning of the FY
        SUM(CASE
            WHEN
                ps.log_year = @logYear -- Use parameter for log_year
                AND ps.log_month = 3
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                        AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                        AND ps.vacant_or_filled = 'filled'
                        AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                    )
                )
            THEN 1 ELSE 0 END
        ) AS 'Vacant as on 01/04/2024',

        -- Vacancy risen during the year
        SUM(CASE
            WHEN
                ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Vacancy risen during the year',

        -- Anticipated vacancies in Current FY using the CTE
        MAX(ISNULL(av.AnticipatedCount, 0)) AS 'Anticipated vacancies in Current FY',

        -- Filled during FY
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'filled'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                AND ps.employee_joined_date IS NOT NULL
                AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Filled during FY',

        -- Filled BY Other method Appointment
            (
            SUM(CASE
                WHEN
                    ps.log_year = @logYear
                    AND ps.log_month = 3
                    AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                            AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                        )
                    )
                THEN 1 ELSE 0
            END)
            +
            SUM(CASE
                WHEN
                    ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
                    AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                    AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                    AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                THEN 1 ELSE 0
            END)
            -
            SUM(CASE
                WHEN
                    ps.vacant_or_filled = 'filled'
                    AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                    AND ps.employee_joined_date IS NOT NULL
                    AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                    AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                    AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                THEN 1 ELSE 0
            END)
            -
            SUM(CASE
                WHEN
                    ps.vacant_or_filled = 'vacant'
                    AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                    AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                    AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                    AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                THEN 1 ELSE 0
            END)
        ) AS [Filled by Other method Appointment],


        -- Balance to be filled
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Balance to be filled up',

        -- Process not started
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
                AND ps.process_initiated_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Process not initiated',

        -- Process started but advertisement yet to be published
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.process_initiated_date IS NOT NULL
                AND ps.notification_adv_issued_date IS NULL
                AND ps.interview_conducted_date IS NULL
                AND ps.selection_process_completed_date IS NULL
                AND ps.result_declared_date IS NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Process started but advertisement yet to be published',

        -- Notification/Adv Issued
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.notification_adv_issued_date IS NOT NULL
                AND ps.exam_conducted_date IS NULL
                AND ps.interview_conducted_date IS NULL
                AND ps.selection_process_completed_date IS NULL
                AND ps.result_declared_date IS NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Notification/Adv Issued',

        -- Exam Conducted
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.exam_conducted_date IS NOT NULL
                AND ps.interview_conducted_date IS NULL
                AND ps.selection_process_completed_date IS NULL
                AND ps.result_declared_date IS NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Exam Conducted',

        -- Interview Conducted
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.interview_conducted_date IS NOT NULL
                AND ps.selection_process_completed_date IS NULL
                AND ps.result_declared_date IS NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Interview Conducted',

        -- Selection Process Completed
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.selection_process_completed_date IS NOT NULL
                AND ps.result_declared_date IS NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Selection Process Completed',

        -- Result Declared
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.result_declared_date IS NOT NULL
                AND ps.appointment_letter_issued_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Result Declared',

        -- Appointment Letter issued
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant'
                AND ps.method_of_appointment IN ('Direct Recruitment', 'Direct Recruitment (Compassionate Method)')
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
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.appointment_letter_issued_date IS NOT NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            THEN 1 ELSE 0 END
        ) AS 'Appointment Letter issued'

    FROM mmt_organisation mmt
    INNER JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
    INNER JOIN mmt_hr_post post ON ps.post_id = post.post_id
    INNER JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
    INNER JOIN mmt_hr_department department ON post.department_id = department.department_id
    INNER JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
    INNER JOIN tbl_hr_organisation_abolish pa ON mmt.organisation_id = pa.organisation_id
    LEFT JOIN AnticipatedVacancies av ON mmt.organisation_id = av.organisation_id AND post.class_id = av.class_id
    WHERE mmt.organisation_id != 4
    AND mmt.organisation_usermatrix_category_id = 2
  `;

  let conditions = [];


  if (orgDrop !== "0") {
    conditions.push(`mmt.organisation_id = @orgDrop`);
  }

  if (orgCatDrop !== "0") {
    conditions.push(`mo.organisation_category_id = @orgCatDrop`);
  }

  if (classDrop !== "0") {
    conditions.push(`post.class_id = @classDrop`);
  }

  if (conditions.length === 0) {
    conditions.push(`mo.organisation_category_id IN (1, 3)`);
  }

  if (conditions.length > 0) {
    query += ` AND ` + conditions.join(' AND ');
  }

  query += `
    GROUP BY
        mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id
    ORDER BY
        mmt.organisation_name, post.class_id;
  `;

  try {
    const result = await request.query(query);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    // Your existing columnDefs, ensure 'Anticipated vacancies in Current FY' is present
    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        cellStyle: { textAlign: "center" },
        width: 300,
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies", // This is a parent group, field should match a calculated total if you display one, otherwise remove this field.
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${new Date(fiscalYearStart).toLocaleDateString('en-GB')}`, // Dynamic date for header
                field: "Vacant as on 01/04/2024",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Anticipated vacancies in Current FY",
                field: "Anticipated vacancies in Current FY", // This field name must match SQL alias
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "5",
                    field: "Anticipated vacancies in Current FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "6",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled by Other method Appointment",
                field: "Filled by Other method Appointment",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "7",
                    field: "Filled by Other method Appointment",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "8",
                    field: "Balance to be filled up",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process started but advertisement yet to be published",
            field: "Process started but advertisement yet to be published",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process started but advertisement yet to be published",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification/Adv Issued",
            field: "Notification/Adv Issued",
            headerClass: "headercenter",
            width: 300,
            children: [
              {
                headerName: "11",
                field: "Notification/Adv Issued",
                width: 300,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Exam Conducted",
            field: "Exam Conducted",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Exam Conducted",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Interview Conducted",
            field: "Interview Conducted",
            headerClass: "headercenter",
            children: [
                {
                    headerName: "13",
                    field: "Interview Conducted",
                    headerClass: "headercenter",
                }
            ]
          },
          {
            headerName: "Selection Process Completed",
            field: "Selection Process Completed",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Selection Process Completed",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Result Declared",
            field: "Result Declared",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Result Declared",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Appointment Letter issued",
            field: "Appointment Letter issued",
            headerClass: "headercenter",
            width: 280,
            children: [
              {
                headerName: "16",
                field: "Appointment Letter issued",
                width: 280,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Failed to retrieve data." });
  }
}

async function hrFourthDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousFiscalYr = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `
            SELECT
    mmt.organisation_name AS 'Organisation',
    mmt.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mmtc.class AS 'Class / Group',
    post.class_id AS 'classId',
    department.department_name AS 'Department',
    post.post_name AS 'Post Name',
    post.post_id AS 'postId',
     -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                 AND ps.vacant_or_filled = 'vacant'
                 AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
                )
                OR (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date > '${previousFiscalYr}')
            ))
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                )))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process Started but No Advertisement Yet
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
             AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[exam_conducted_date] IS NULL AND ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process started but advertisement yet to be published',

    -- Notifications/Advertisements Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[exam_conducted_date] IS NULL AND ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Notification/Adv Issued',

    -- Exams Conducted/Selection Process Completed
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.exam_conducted_date IS NOT NULL AND ( ps.[interview_conducted_date] IS NULL
            AND ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Exam Conducted',

        -- Interview Conducted
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.interview_conducted_date IS NOT NULL AND (ps.[selection_process_completed_date] IS NULL AND ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Interview Conducted',

    -- Selection Process Completed
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.selection_process_completed_date IS NOT NULL AND (ps.[result_declared_date] IS NULL AND ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Selection Process Completed',


    -- Result Declared
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.result_declared_date IS NOT NULL AND (ps.[appointment_letter_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Result Declared',

    -- Appointment Letters Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    pa.abolish_required = 0
                    OR (
                        pa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
)))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.appointment_letter_issued_date IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Appointment Letter issued'
FROM mmt_organisation mmt
INNER JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
INNER JOIN mmt_hr_post post ON ps.post_id = post.post_id
INNER JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
INNER JOIN mmt_hr_department department ON post.department_id = department.department_id
INNER JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
INNER JOIN tbl_hr_organisation_abolish pa ON mmt.organisation_id = pa.organisation_id
WHERE ps.method_of_appointment IN ('Direct Recruitment','Direct Recruitment (Compassionate Method)') AND ps.organisation_id= ${organisationId} AND mmtc.class_id= ${classId}`;

  let condition = `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id,post.post_name,post.post_id,department.department_name
        ORDER BY
            post.class_id`;
  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        cellStyle: { textAlign: "center" },
        width: 300,
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            field: "Department",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            field: "Post Name",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "5",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "6",
                    field: "Vacancy risen during the year",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "7",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "8",
                    field: "Balance to be filled up",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process started but advertisement yet to be published",
            field: "Process started but advertisement yet to be published",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process started but advertisement yet to be published",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification/Adv Issued",
            field: "Notification/Adv Issued",
            headerClass: "headercenter",
            width: 300,
            children: [
              {
                headerName: "11",
                field: "Notification/Adv Issued",
                width: 300,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Exam Conducted/Selection Process Completed",
            field: "Exam Conducted/Selection Process Completed",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Exam Conducted/Selection Process Completed",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Result Declared",
            field: "Result Declared",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Result Declared",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Appointment Letter issued",
            field: "Appointment Letter issued",
            headerClass: "headercenter",
            width: 280,
            children: [
              {
                headerName: "14",
                field: "Appointment Letter issued",
                width: 280,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrFifthReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYearStartYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const financialYearEndYear = financialYearStartYear + 1;

  const fiscalYearStart = `${financialYearStartYear}-04-01`;
  const fiscalYearEnd = `${financialYearEndYear}-03-31`;
  const previousFiscalYr = `${financialYearStartYear}-03-31`;

  request.input("financialYearStart",fiscalYearStart);
  request.input("financialYearEnd", fiscalYearEnd);
  request.input("previousFiscalYear", previousFiscalYr);
  request.input("logYear",financialYearStartYear);

  if (orgCatDrop !== "0") {
    request.input("orgCatDrop", parseInt(orgCatDrop));
  }
  if (orgDrop !== "0") {
    request.input("orgDrop",parseInt(orgDrop));
  }
  if (classDrop !== "0") {
    request.input("classDrop", parseInt(classDrop));
  }

  let query1 = `
    WITH AnticipatedVacancies AS (
        SELECT
            ps.organisation_id,
            post.class_id,
            COUNT(CASE
                WHEN
                    ps.vacant_or_filled = 'filled'
                    AND ps.expected_anticipated_vacancy IN ('Promotion')
                    AND em_sub.emp_status=1
                    AND em_sub.emp_dor BETWEEN GETDATE() AND @financialYearEnd
                THEN 1 ELSE NULL -- Use NULL for counting only valid cases
            END) AS AnticipatedCount
        FROM tbl_hr_post_strength ps
        INNER JOIN mmt_hr_post post ON ps.post_id = post.post_id
        INNER JOIN tbl_employee_master em_sub ON ps.emp_master_id = em_sub.emp_master_id
        WHERE
          ps.vacant_or_filled = 'filled'
          AND ps.expected_anticipated_vacancy IN ('Promotion')
          AND ps.organisation_id != 4
        GROUP BY
            ps.organisation_id,
            post.class_id
    )
    SELECT
        mmt.organisation_name AS 'Organisation',
        mmt.organisation_id AS 'organisationId',
        mo.organisation_category_name AS 'Organisation Category',
        mmtc.class AS 'Class / Group',
        post.class_id AS 'classId',
        -- At the Beginning of the FY
        SUM(CASE
            WHEN
                ps.log_year = @logYear
                AND ps.method_of_appointment = 'Promotion'
                AND ps.log_month = 3
                AND (
                    (ps.date_of_arise_in_vacancy < @financialYearStart
                        AND ps.vacant_or_filled = 'vacant'
                        AND (
                            oa.abolish_required = 0
                            OR (
                                oa.abolish_required = 1
                                AND (
                                    ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                     AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                    OR
                                    ps.exception_abolish = 1
                                )
                            )
                        )
                    )
                    OR (ps.date_of_arise_in_vacancy < @financialYearStart
                        AND ps.method_of_appointment = 'Promotion'
                        AND ps.vacant_or_filled = 'filled'
                        AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd)
                )
        THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

        -- Vacancies Arisen During FY
        SUM(CASE
            WHEN
                ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
                AND ps.method_of_appointment = 'Promotion'
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

        -- Anticipated Vacancies from CTE
        ISNULL(av.AnticipatedCount, 0) AS 'Anticipated vacancies in Current FY',

        -- Filled Posts During FY
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'filled'
                AND ps.method_of_appointment = 'Promotion'
                AND ps.employee_joined_date IS NOT NULL
                AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Filled during FY',
          -- Filled by Other method Appointment (Promotion) with non-negative clamp
          CASE
              WHEN (
                  SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.log_year = @logYear
                      AND ps.log_month = 3
                      AND ps.date_of_arise_in_vacancy < @financialYearStart
                      AND (
                          (ps.vacant_or_filled = 'vacant'
                          AND (
                              oa.abolish_required = 0
                              OR (
                                  oa.abolish_required = 1
                                  AND (
                                      ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                      OR ps.exception_abolish = 1
                                  )
                              )
                          )
                          )
                          OR (
                              ps.date_of_arise_in_vacancy < @financialYearStart AND
                              ps.vacant_or_filled = 'filled'
                              AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                          )
                      )
                  THEN 1 ELSE 0 END)
                  + 
                  SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
                  -
                  SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.vacant_or_filled = 'filled'
                      AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
                  -
                  SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.vacant_or_filled = 'vacant'
                      AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                      AND (
                          oa.abolish_required = 0
                          OR (
                              oa.abolish_required = 1
                              AND (
                                  ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                  OR ps.exception_abolish = 1
                              )
                          )
                      )
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
              ) < 0 
              THEN 0
              ELSE (
                  -- Repeat the same expression for positive results
                  SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.log_year = @logYear
                      AND ps.log_month = 3
                      AND ps.date_of_arise_in_vacancy < @financialYearStart
                      AND (
                          (ps.vacant_or_filled = 'vacant'
                          AND (
                              oa.abolish_required = 0
                              OR (
                                  oa.abolish_required = 1
                                  AND (
                                      ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                      OR ps.exception_abolish = 1
                                  )
                              )
                          )
                          )
                          OR (
                              ps.vacant_or_filled = 'filled'
                              AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                          )
                      )
                  THEN 1 ELSE 0 END)
                  + SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.date_of_arise_in_vacancy BETWEEN @financialYearStart AND @financialYearEnd
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
                  - SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.vacant_or_filled = 'filled'
                      AND ps.employee_joined_date BETWEEN @financialYearStart AND @financialYearEnd
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
                  - SUM(CASE WHEN
                      ps.method_of_appointment = 'Promotion'
                      AND ps.vacant_or_filled = 'vacant'
                      AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                      AND (
                          oa.abolish_required = 0
                          OR (
                              oa.abolish_required = 1
                              AND (
                                  ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                  OR ps.exception_abolish = 1
                              )
                          )
                      )
                      AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
                      AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                  THEN 1 ELSE 0 END)
              )
          END AS [Filled by Other method Appointment],

        -- Balance to be Filled
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Balance to be filled up',

        -- Process Not Started
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.process_initiated_date IS NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Process not initiated',

        -- Process initiated vc not received
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.process_initiated_date IS NOT NULL AND (ps.[vigilance_clr_received_date] IS NULL AND ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
                AND ps.[promotion_order_issued_date] IS NULL )
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Process initiated vc not received',

        -- Vigilance clearance received
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.vigilance_clr_received_date IS NOT NULL AND ( ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
                AND ps.[promotion_order_issued_date] IS NULL)
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Vigilance clearance received',

        -- DPC conducted
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.dpc_conducted_date IS NOT NULL AND ( ps.[approval_by_ca_date] IS NULL
                AND ps.[promotion_order_issued_date] IS NULL )
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'DPC conducted',

            -- Approval by competent authority
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.approval_by_ca_date IS NOT NULL AND (ps.[promotion_order_issued_date] IS NULL)
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Approval by competent authority',

        -- Promotion order issued
        SUM(CASE
            WHEN
                ps.vacant_or_filled = 'vacant' AND
                ps.method_of_appointment = 'Promotion'
                AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > @previousFiscalYear)
                                OR
                                ps.exception_abolish = 1
                            )
                        )
                    )
                AND ps.date_of_arise_in_vacancy <= @financialYearEnd
                AND ps.promotion_order_issued_date IS NOT NULL
                AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
                AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
        THEN 1 ELSE 0 END) AS 'Promotion order issued'

    FROM mmt_organisation mmt
    LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
    LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
    LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
    LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
    LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
    LEFT JOIN [tbl_hr_organisation_abolish] oa ON oa.organisation_id = mmt.organisation_id
    LEFT JOIN AnticipatedVacancies av ON mmt.organisation_id = av.organisation_id AND post.class_id = av.class_id
    WHERE mmt.organisation_id != 4
    AND mmt.organisation_usermatrix_category_id = 2 `;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` AND mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND mmt.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND post.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` AND mmt.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` AND post.class_id = ${classDrop}`;
  } else {
    condition = ` AND mo.organisation_category_id IN (1, 3)`;
  }

  condition += `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id, av.AnticipatedCount
        ORDER BY
            mmt.organisation_name,post.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        width: 300,
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Promotion",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${new Date(fiscalYearStart).toLocaleDateString('en-GB')}`,
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 250,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 250,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Anticipated vacancies in Current FY",
                field: "Anticipated vacancies in Current FY",
                width: 220,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Anticipated vacancies in Current FY",
                    width: 220,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled by Other method Appointment",
                field: "Filled by Other method Appointment",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "7",
                    field: "Filled by Other method Appointment",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "8",
                    field: "Balance to be filled up",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated vc not received",
            field: "Process initiated vc not received",
            width: 260,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process initiated vc not received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Vigilance clearance received",
            field: "Vigilance clearance received",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Vigilance clearance received",
                width: 220,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "DPC conducted",
            field: "DPC conducted",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "DPC conducted",
                width: 210,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval by competent authority",
            field: "Approval by competent authority",
            headerClass: "headercenter",
            width: 240,
            children: [
              {
                headerName: "13",
                field: "Approval by competent authority",
                width: 240,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Promotion order issued",
            field: "Promotion order issued",
            headerClass: "headercenter",
            width: 230,
            children: [
              {
                headerName: "14",
                field: "Promotion order issued",
                width: 230,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrFifthDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousFiscalYr = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `SELECT
    mmt.organisation_name AS Organisation,
    mmt.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mmtc.class AS 'Class / Group',
    post.class_id AS 'classId',
    department.department_name AS 'Department',
    post.post_name AS 'Post Name',
    post.post_id AS 'postId',
    -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                 AND ps.vacant_or_filled = 'vacant'
                 AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
                )
                OR (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date > '${previousFiscalYr}')
            )
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process initiated vc not received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[vigilance_clr_received_date] IS NULL AND ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL )
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process initiated vc not received',

    -- Vigilance clearance received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.vigilance_clr_received_date IS NOT NULL AND ( ps.[dpc_conducted_date] IS NULL AND ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vigilance clearance received',

    -- DPC conducted
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.dpc_conducted_date IS NOT NULL AND ( ps.[approval_by_ca_date] IS NULL
            AND ps.[promotion_order_issued_date] IS NULL )
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'DPC conducted',

        -- Approval by competent authority
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.approval_by_ca_date IS NOT NULL AND (ps.[promotion_order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Approval by competent authority',

    -- Promotion order issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.promotion_order_issued_date IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Promotion order issued'
        FROM
            mmt_organisation mmt
        LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
        LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
        LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
        LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
        LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
        LEFT JOIN [tbl_hr_organisation_abolish] oa ON oa.organisation_id = mmt.organisation_id
        WHERE ps.method_of_appointment = 'promotion' AND ps.organisation_id=${organisationId} AND post.class_id=${classId}`;

  let condition = `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id, post.post_name,post.post_id,department.department_name
        ORDER BY
            post.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        width: 300,
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            field: "Department",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            field: "Post Name",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Promotion",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 250,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Vacancy risen during the year",
                    width: 250,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "7",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "8",
                    field: "Balance to be filled up",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated vc not received",
            field: "Process initiated vc not received",
            width: 260,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process initiated vc not received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Vigilance clearance received",
            field: "Vigilance clearance received",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Vigilance clearance received",
                width: 220,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "DPC conducted",
            field: "DPC conducted",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "DPC conducted",
                width: 210,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval by competent authority",
            field: "Approval by competent authority",
            headerClass: "headercenter",
            width: 240,
            children: [
              {
                headerName: "13",
                field: "Approval by competent authority",
                width: 240,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Promotion order issued",
            field: "Promotion order issued",
            headerClass: "headercenter",
            width: 230,
            children: [
              {
                headerName: "14",
                field: "Promotion order issued",
                width: 230,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSixthReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  request.input("classDrop", classDrop);

  let query1 = `
        SELECT
    mmt.organisation_name AS 'Organisation',
    mmt.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mmtc.class AS 'Class / Group',
    post.class_id AS 'classId',
    -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                 AND ps.vacant_or_filled = 'vacant'
                 AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
))
                OR (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date > '${previousYrEnd}')
            )
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process initiated but notification yet to be issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process initiated but notification yet to be issued',

    -- Notification Adv Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Notification Adv Issued',

    -- Application Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Application Received',

        -- Review of application by Committee
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Review of application by Committee',

    -- Approval Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Approval Received',

    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.[order_issued_date] IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Order issued'

FROM mmt_organisation mmt
LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
LEFT JOIN [tbl_hr_organisation_abolish] oa ON
	        oa.organisation_id = mmt.organisation_id
WHERE mmt.organisation_id != 4 AND ps.method_of_appointment = 'Deputation In'
AND mmt.organisation_usermatrix_category_id = 2
    `;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` AND mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND mmt.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND post.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` AND mmt.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` AND post.class_id = ${classDrop}`;
  } else {
    condition = ` AND mo.organisation_category_id IN (1, 3)`;
  }

  condition += `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id
        ORDER BY
            mmt.organisation_name,post.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        width: 20,
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Deputation",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    width: 260,
                    field: "Vacant as on 01/04/2024",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    width: 290,
                    field: "Vacancy risen during the year",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    width: 290,
                    field: "Balance to be filled up",
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                width: 290,
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                width: 330,
                field: "Process initiated but notification yet to be issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                width: 290,
                field: "Notification Adv Issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                width: 290,
                field: "Application Received",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Review of application by Committee",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Approval Received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Order issued",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSixthDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `SELECT
    mmt.organisation_name AS Organisation,
    mmt.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mmtc.class AS 'Class / Group',
    post.class_id AS 'classId',
    department.department_name AS 'Department',
    post.post_name AS 'Post Name',
    post.post_id AS 'postId',
    -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                 AND ps.vacant_or_filled = 'vacant'
                 AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
)
                OR (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date > '${previousYrEnd}')
            )
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process initiated but notification yet to be issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process initiated but notification yet to be issued',

    -- Notification Adv Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Notification Adv Issued',

    -- Application Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Application Received',

        -- Review of application by Committee
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Review of application by Committee',

    -- Approval Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Approval Received',

    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                         AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                    )
                )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.[order_issued_date] IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Order issued'
    FROM mmt_organisation mmt
    LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
    LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
    LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
    LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
    LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
    LEFT JOIN [tbl_hr_organisation_abolish] oa ON
	        oa.organisation_id = mmt.organisation_id
    WHERE ps.method_of_appointment='Deputation In' AND ps.organisation_id=${organisationId} AND post.class_id=${classId}
    GROUP BY
        mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id,post.post_name,post.post_id,department.department_name
    ORDER BY
        post.class_id`;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        width: 20,
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            field: "Department",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            field: "Post Name",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Deputation",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    width: 260,
                    field: "Vacant as on 01/04/2024",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    width: 290,
                    field: "Vacancy risen during the year",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "7",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "8",
                    width: 290,
                    field: "Balance to be filled up",
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                width: 290,
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                width: 330,
                field: "Process initiated but notification yet to be issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                width: 290,
                field: "Notification Adv Issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                width: 290,
                field: "Application Received",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Review of application by Committee",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Approval Received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Order issued",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSeventhReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousFiscalYr = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  request.input("classDrop", classDrop);

  let query1 = `SELECT
    mmt.organisation_name AS 'Organisation',
    mmt.organisation_id AS 'organisationId',
    mo.organisation_category_name AS 'Organisation Category',
    mmtc.class AS 'Class / Group',
    post.class_id AS 'classId',
    -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (
                    ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'vacant'
                    AND (
                        oa.abolish_required = 0
                        OR (
                            oa.abolish_required = 1
                            AND (
                                (
                                    (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                    AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}'
                                )
                                OR ps.exception_abolish = 1
                            )
                        )
                    )
                )
                OR (
                    ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
                )
            )
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
             ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process initiated but notification yet to be issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
                oa.abolish_required = 0
                OR (
                    oa.abolish_required = 1
                    AND (
                        (
                            (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                            AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}'
                        )
                        OR ps.exception_abolish = 1
                    )
                )
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process initiated but notification yet to be issued',

    -- Notification Adv Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                OR
                ps.exception_abolish = 1
            ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Notification Adv Issued',

    -- Application Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                OR
                ps.exception_abolish = 1
            ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Application Received',

        -- Review of application by Committee
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                OR
                ps.exception_abolish = 1
            ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Review of application by Committee',

    -- Approval Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                OR
                ps.exception_abolish = 1
            ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Approval Received',

    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                 AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                OR
                ps.exception_abolish = 1
            ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.[order_issued_date] IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Order issued'

FROM mmt_organisation mmt
LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
LEFT JOIN [tbl_hr_organisation_abolish] oa ON
	        oa.organisation_id = mmt.organisation_id

WHERE mmt.organisation_id != 4 AND ps.method_of_appointment = 'Composite Method'
AND mmt.organisation_usermatrix_category_id = 2`;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` AND mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND mmt.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND post.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` AND mmt.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND post.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` AND post.class_id = ${classDrop}`;
  } else {
    condition = ` AND mo.organisation_category_id IN (1, 3)`;
  }

  condition += `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id
        ORDER BY
            mmt.organisation_name,post.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Composite Method",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Balance to be filled up",
                    width: 280,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Process not initiated",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process initiated but notification yet to be issued",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Notification Adv Issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Application Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Review of application by Committee",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Approval Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Order issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSeventhDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousFiscalYr = `${startYear}-03-31`;
  let finStart = `01/04/${startYear}`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `SELECT
            mmt.organisation_name AS Organisation,
            mmt.organisation_id AS 'organisationId',
            mo.organisation_category_name AS 'Organisation Category',
            mmtc.class AS 'Class / Group',
            post.class_id AS 'classId',
            department.department_name AS 'Department',
            post.post_name AS 'Post Name',
            post.post_id AS 'postId',
            -- At the Beginning of the FY
    SUM(CASE
        WHEN
            ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND (
                (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                 AND ps.vacant_or_filled = 'vacant'
                 AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             )
                )
                OR (ps.date_of_arise_in_vacancy < '${fiscalYearStart}'
                    AND ps.vacant_or_filled = 'filled'
                    AND ps.employee_joined_date > '${previousFiscalYr}')
        ))
    THEN 1 ELSE 0 END) AS 'Vacant as on 01/04/2024',

    -- Vacancies Arisen During FY
    SUM(CASE
        WHEN
            ps.date_of_arise_in_vacancy BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Vacancy risen during the year',

    -- Filled Posts During FY
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'filled'
            AND ps.employee_joined_date IS NOT NULL
            AND ps.employee_joined_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Filled during FY',

    -- Balance to be Filled
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Balance to be filled up',

    -- Process Not Started
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process not initiated',

    -- Process initiated but notification yet to be issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (
               (exception_abolish IS NULL OR exception_abolish = 0
                AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) > '${previousFiscalYr}')
               OR (exception_abolish = 1
                   AND exception_abolish_date IS NOT NULL
                   AND '${previousFiscalYr}' < exception_abolish_date)
            )
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.process_initiated_date IS NOT NULL AND (ps.[notification_adv_issued_date] IS NULL AND ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Process initiated but notification yet to be issued',

    -- Notification Adv Issued
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.notification_adv_issued_date IS NOT NULL AND ( ps.[application_received_date] IS NULL AND ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Notification Adv Issued',

    -- Application Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.application_received_date IS NOT NULL AND ( ps.[review_application_by_comm] IS NULL
            AND ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Application Received',

        -- Review of application by Committee
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.review_application_by_comm IS NOT NULL AND (ps.[approval_received_date] IS NULL AND ps.[order_issued_date] IS NULL)
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Review of application by Committee',

    -- Approval Received
    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.approval_received_date IS NOT NULL AND ps.[order_issued_date] IS NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Approval Received',

    SUM(CASE
        WHEN
            ps.vacant_or_filled = 'vacant'
            AND (oa.abolish_required = 1  AND (
                                 ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                  AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousFiscalYr}')
                                 OR
                                 ps.exception_abolish = 1
                             ))
            AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
            AND ps.[order_issued_date] IS NOT NULL
            AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
    THEN 1 ELSE 0 END) AS 'Order issued'

            FROM mmt_organisation mmt
            LEFT JOIN tbl_hr_post_strength_log ps ON mmt.organisation_id = ps.organisation_id
            LEFT JOIN mmt_hr_post post ON ps.post_id = post.post_id
            LEFT JOIN mmt_class mmtc ON post.class_id = mmtc.class_id
            LEFT JOIN mmt_hr_department department ON post.department_id = department.department_id
            LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
            LEFT JOIN [tbl_hr_organisation_abolish] oa ON oa.organisation_id = mmt.organisation_id
            WHERE ps.method_of_appointment ='Composite Method' AND ps.organisation_id=${organisationId} AND post.class_id =${classId}
            GROUP BY
                mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, post.class_id,post.post_name,post.post_id,department.department_name
            ORDER BY
                post.class_id`;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            field: "Department",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            field: "Post Name",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Composite Method",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on ${finStart}`,
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Vacant as on 01/04/2024",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Vacancy risen during the year",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "7",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "8",
                    field: "Balance to be filled up",
                    width: 280,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process initiated but notification yet to be issued",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Notification Adv Issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Application Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Review of application by Committee",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Approval Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Order issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}


async function hrDrilledDirectRecruitmentReport(req, res) {
  let organisationID = req.params.organisationID;
  let classID = req.params.classID;
  let postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` AND ps.post_id = ${postID} `;
  } else {
    whereCondition = ` AND ps.organisation_id=${organisationID} AND post.class_id=${classID} `;
  }

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`
                    SELECT
                        d.department_name AS [Department],
                        post.post_name AS [Post Name],
                        ps.post_code AS [Post Code],
                        CONVERT(VARCHAR, ps.process_initiated_date ,120) AS [Process started but advertisement yet to be published],
                        CONVERT(VARCHAR, ps.notification_adv_issued_date ,120) AS [Notification/Adv. Issued],
                        CONVERT(VARCHAR,  ps.exam_conducted_date,120) AS [Exam Conducted/Selection Process Completed],
                        CONVERT(VARCHAR, ps.result_declared_date,120) AS [Result Declared],
                        CONVERT(VARCHAR, ps.appointment_letter_issued_date,120) AS [Appointment Letter issued]
                            FROM
                                tbl_hr_post_strength_log ps
                            INNER JOIN
                                mmt_hr_post post ON ps.post_id = post.post_id
                            INNER JOIN 
                              mmt_hr_department d ON post.department_id = d.department_id
                            LEFT JOIN
                                tbl_hr_organisation_abolish pa ON ps.organisation_id = pa.organisation_id
                            WHERE
                                ps.vacant_or_filled = 'vacant'
                                AND vacancy_type = 'Direct Recruitment'
                                AND (
                                    pa.abolish_required = 0
                                    OR
                                    (pa.abolish_required = 1 AND (
                                                        ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                                        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > '${previousYrEnd}')
                                                        OR
                                                        (ps.exception_abolish = 1 AND ps.exception_abolish_date IS NOT NULL
                                                        AND '${previousYrEnd}' < ps.exception_abolish_date)
                                )))
                                AND ps.date_of_arise_in_vacancy <= '${fiscalYearEnd}'
                                AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
                                AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
                        ${whereCondition}
                ;
        `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process started but advertisement yet to be published",
            field: "Process started but advertisement yet to be published",
            width: 300,
          },
          {
            headerName: "Notification / Adv. Issued",
            field: "Notification / Adv. Issued",
            width: 300,
          },
          {
            headerName: "Exam Conducted/Selection Process Completed",
            field: "Exam Conducted/Selection Process Completed",
            width: 300,
          },
          {
            headerName: "Result Declared",
            field: "Result Declared",
          },
          {
            headerName: "Appointment Letter issued",
            field: "Appointment Letter issued",
            width: 200,
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.log(err);
    return res.sendStatus(500);
  }
}

async function hrDrilledPromotionReport(req, res) {
  let organisationID = req.params.organisationID;
  let classID = req.params.classID;
  let postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` AND ps.post_id = ${postID} `;
  } else {
    whereCondition = ` AND ps.organisation_id=${organisationID} AND p.class_id=${classID} `;
  }

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.process_initiated_date,120) AS [Process initiated vc not received],
        CONVERT(VARCHAR, ps.vigilance_clr_received_date,120)  AS [Vigilance clearance received],
        CONVERT(VARCHAR, ps.dpc_conducted_date,120)  AS [DPC conducted],
        CONVERT(VARCHAR, ps.approval_by_ca_date,120)  AS [Approval by competent authority],
        CONVERT(VARCHAR, ps.promotion_order_issued_date,120)  AS [Promotion order issued]
    FROM
        tbl_hr_post_strength_log ps
    LEFT JOIN
        mmt_hr_post p ON ps.post_id = p.post_id
    LEFT JOIN
        mmt_hr_department d ON p.department_id = d.department_id
    LEFT JOIN
        tbl_hr_organisation_abolish pa ON ps.organisation_id = pa.organisation_id
    WHERE
        ps.vacant_or_filled = 'vacant'
        AND vacancy_type = 'Promotion'
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
        AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
        AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        ${whereCondition}
`);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "Process initiated vc not received",
            field: "Process initiated vc not received",
            width: 300,
          },
          {
            headerName: "Vigilance clearance received",
            field: "Vigilance clearance received",
            width: 300,
          },
          {
            headerName: "DPC conducted",
            field: "DPC conducted",
            width: 200,
          },
          {
            headerName: "Approval by competent authority",
            field: "Approval by competent authority",
            width: 300,
          },
          {
            headerName: "Promotion order issued",
            field: "Promotion order issued",
            width: 200,
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function hrDrilledDeputationReport(req, res) {
  let organisationID = req.params.organisationID;
  let classID = req.params.classID;
  let postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` AND ps.post_id = ${postID} `;
  } else {
    whereCondition = ` AND ps.organisation_id=${organisationID} AND p.class_id=${classID} `;
  }

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.process_initiated_date,120)  AS [Process initiated notification yet to be issued],
        CONVERT(VARCHAR, ps.notification_adv_issued_date,120)  AS [Notification/Adv. Issued],
        CONVERT(VARCHAR, ps.application_received_date,120)  AS [Application received],
        CONVERT(VARCHAR, ps.review_application_by_comm,120)  AS [Review of application],
        CONVERT(VARCHAR, ps.approval_received_date,120)  AS [Approval received],
        CONVERT(VARCHAR, ps.order_issued_date,120)  AS [Order issued]
    FROM
        tbl_hr_post_strength_log ps
    LEFT JOIN
        mmt_hr_post p ON ps.post_id = p.post_id
    LEFT JOIN
        mmt_hr_department d ON p.department_id = d.department_id
    LEFT JOIN
        tbl_hr_organisation_abolish pa ON ps.organisation_id = pa.organisation_id
    WHERE
        ps.vacant_or_filled = 'vacant'
        AND vacancy_type = 'Deputation In'
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
        AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
        AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        ${whereCondition}
`);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department Name",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process initiated",
            field: "Process initiated notification yet to be issued",
            width: 270,
          },
          {
            headerName: "Notification/Adv Issued",
            field: "Notification/Adv. Issued",
            width: 220,
          },
          {
            headerName: "Application received",
            field: "Application received",
            width: 210,
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application",
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
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function hrDrilledCompositeMethodReport(req, res) {
  let organisationID = req.params.organisationID;
  let classID = req.params.classID;
  let postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` AND ps.post_id = ${postID} `;
  } else {
    whereCondition = ` AND ps.organisation_id=${organisationID} AND p.class_id=${classID} `;
  }

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`SELECT
        d.department_name AS [Department],
        p.post_name AS [Post Name],
        ps.post_code AS [Post Code],
        CONVERT(VARCHAR, ps.process_initiated_date,120)  AS [Process Initiated],
        CONVERT(VARCHAR, ps.notification_adv_issued_date,120)  AS [Notification/Adv. Issued],
        CONVERT(VARCHAR, ps.application_received_date,120)  AS [Application received],
        CONVERT(VARCHAR, ps.review_application_by_comm,120)  AS [Review of application],
        CONVERT(VARCHAR, ps.approval_received_date,120)  AS [Approval received],
        CONVERT(VARCHAR, ps.order_issued_date,120)  AS [Order issued]
    FROM
        tbl_hr_post_strength_log ps
    LEFT JOIN
        mmt_hr_post p ON ps.post_id = p.post_id
    LEFT JOIN
        mmt_hr_department d ON p.department_id = d.department_id
    LEFT JOIN
        tbl_hr_organisation_abolish pa ON ps.organisation_id = pa.organisation_id
    WHERE
        ps.vacant_or_filled = 'vacant'
        AND vacancy_type = 'Composite Method'
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
        AND ps.log_year = YEAR(DATEADD(month, -1, GETDATE()))
        AND ps.log_month = MONTH(DATEADD(month, -1, GETDATE()))
        ${whereCondition}
    `);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department Name",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process Initiated",
            field: "Process Initiated",
            width: 270,
          },
          {
            headerName: "Notification/Adv Issued",
            field: "Notification/Adv. Issued",
            width: 220,
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application",
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
          },
        ],
      },
    ];
    res.json({ columnDefs, rowData });
  } catch (err) {
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function hrDrilledTransferReport(req, res) {
  let organisationID = req.params.organisationID;
  let classID = req.params.classID;
  let postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("organisationID", organisationID);
  request.input("classID", classID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` AND ps.post_id = @postID `;
  } else {
    whereCondition = ` AND ps.organisation_id = @organisationID AND p.class_id = @classID `;
  }

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  try {
    const result = await request.query(`
      SELECT  
          m.organisation_name AS [Department],           
          p.post_name AS [Post Name],         
          ps.post_code AS [Post Code], 	    
          emp.emp_working_org_id AS [Transferred From],
          CONVERT(VARCHAR, emp.employee_joining_date, 120) AS [Transferred On]
      FROM
          mmt_organisation m
      LEFT JOIN
          tbl_hr_post_strength_log ps ON m.organisation_id = ps.organisation_id
      LEFT JOIN
          mmt_hr_post p ON ps.post_id = p.post_id
      LEFT JOIN
          mmt_class mc ON p.class_id = mc.class_id
      LEFT JOIN
          mmt_organisation_category mo ON m.organisation_category_id = mo.organisation_category_id
      LEFT JOIN 
          tbl_employee_transaction_details emp ON ps.employee_id = emp.emp_post_id
      LEFT JOIN
          tbl_hr_organisation_abolish pa ON m.organisation_id = pa.organisation_id
      WHERE
          ps.vacant_or_filled = 'vacant'
          AND ps.vacancy_type = 'Transfer In'
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
          AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
          AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
          ${whereCondition};

          `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        headerClass: "headerGroup",
      },
      {
        headerName: "Transferred From",
        field: "Transferred From",
        headerClass: "headerGroup",
      },
      {
        headerName: "Transferred On",
        field: "Transferred On",
        headerClass: "headerGroup",
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err);
    return res.sendStatus(500);
  }
}



async function hrEighthReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  request.input("classDrop", classDrop);

  let query1 = `SELECT mmt.[organisation_name] AS 'Organisation',
	mmt.[organisation_id] AS 'organisationId',
	mo.organisation_category_name AS 'Organisation Category',
	mmtc.class AS 'Class / Group',
	p.[class_id] AS 'classId',
	SUM(CASE WHEN
     ps.log_year = ${startYear}
            AND ps.log_month = 3
            AND ps.vacant_or_filled ='vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${previousYrEnd}'
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND '${previousYrEnd}' < ps.exception_abolish_date
                            )
                        )
                    )
                ) THEN 1 ELSE 0 END)
     AS 'At the Beginning of the FY',
	SUM(CASE
        WHEN
            ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            AND ps.[vacant_or_filled] = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND  DATEADD(YEAR, 5, date_of_arise_in_vacancy) >= '${fiscalYearStart}' AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) <= '${fiscalYearEnd}'
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND '${fiscalYearStart}' <= exception_abolish_date AND '${fiscalYearEnd}' >= exception_abolish_date
                            )
                        )
                    )
                )
    THEN 1 ELSE 0 END) AS 'Abolished during the year',
	SUM(CASE WHEN (ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 9
     	AND ps.order_of_revival_issued_date BETWEEN '${fiscalYearStart}' AND GETDATE()) THEN 1 ELSE 0 END) AS 'Revived During the FY',
	SUM(CASE WHEN ps.[vacant_or_filled] = 'vacant' AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE())) AND ( ps.revival_stage_id IS NULL OR ps.revival_stage_id !=9)
		AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                THEN 1 ELSE 0 END) AS 'Balance to be Revived',
	SUM(CASE WHEN ps.[vacant_or_filled] = 'vacant' AND ( ps.revival_stage_id IS NULL OR revival_stage_id = 0)
    AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )

     	THEN 1 ELSE 0 END) AS 'Process not initiated',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 1
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < GETDATE())
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Process initiated but decision not taken',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND (revival_stage_id = 3 OR revival_stage_id = 4)
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Decision Taken for Revival at Organisation Level By Competent Authority',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 4
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Rejected for Revival at Organisation Level By Competent Authority',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 5
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Submitted to Ministry',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 6
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Sent to DoE',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 7
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Approval Received from DoE',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND revival_stage_id = 8
        AND ps.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND ps.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Rejected by DoE'
FROM  mmt_organisation mmt
    LEFT JOIN [tbl_hr_post_strength_log] ps ON mmt.organisation_id = ps.organisation_id
    LEFT JOIN [mmt_hr_post] p ON ps.post_id = p.post_id
    LEFT JOIN [mmt_class] mmtc ON p.class_id = mmtc.class_id
    LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
    LEFT JOIN [tbl_hr_organisation_abolish] oa ON oa.organisation_id = ps.organisation_id

`;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` WHERE mmt.organisation_id!=4 AND mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND mmt.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND p.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND p.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` WHERE mmt.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND p.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` WHERE p.class_id = ${classDrop}`;
  } else {
    condition = ` WHERE mmt.organisation_id!=4 AND mo.organisation_category_id IN (1, 3)`;
  }

  condition += `
        AND mmt.organisation_usermatrix_category_id = 2
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, p.class_id
        ORDER BY
            mmt.organisation_name,p.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "OrganisationId",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Posts to be revived",
        field: "No. of Posts to be revived",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the Beginning of the FY",
            field: "At the Beginning of the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "3",
                field: "At the Beginning of the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Abolished during the year",
            field: "Abolished during the year",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "4",
                field: "Abolished during the year",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Revived During the FY",
            field: "Revived During the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "5",
                field: "Revived During the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Balance to be Revived",
            field: "Balance to be Revived",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Balance to be Revived",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Process not initiated",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but decision not taken",
            field: "Process initiated but decision not taken",
            width: 310,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process initiated but decision not taken",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Decision Taken for Revival at Organisation Level By Competent Authority",
            field:
              "Decision Taken for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field:
                  "Decision Taken for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Rejected for Revival at Organisation Level By Competent Authority",
            field:
              "Rejected for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field:
                  "Rejected for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Proposal Submitted to Ministry",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Proposal Sent to DoE",
                width: 250,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Approval Received from DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Proposal Rejected by DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrEighthDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;
  const previousYrEnd = `${startYear}-03-31`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `SELECT
             mmt.[organisation_name] AS 'Organisation',
             mmt.[organisation_id] AS 'organisationId',
             mo.organisation_category_name AS 'Organisation Category',
             mmtc.class AS 'Class / Group',
             p.[class_id] AS 'classId',
             d.department_name AS 'Department',
             p.post_name AS 'Post Name',
             p.[post_id] AS 'postId',
             SUM(CASE WHEN
     psl.log_year = ${startYear}
            AND psl.log_month = 3
            AND ps.vacant_or_filled ='vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                                AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${previousYrEnd}'
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND '${previousYrEnd}' < ps.exception_abolish_date
                            )
                        )
                    )
                ) THEN 1 ELSE 0 END)
     AS 'At the Beginning of the FY',
	SUM(CASE
        WHEN
            psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
            AND ps.[vacant_or_filled] = 'vacant'
            AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND  DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) >= '${fiscalYearStart}' AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= '${fiscalYearEnd}'
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND '${fiscalYearStart}' <= ps.exception_abolish_date AND '${fiscalYearEnd}' >= ps.exception_abolish_date
                            )
                        )
                    )
                )
    THEN 1 ELSE 0 END) AS 'Abolished during the year',
	SUM(CASE WHEN (ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 9
     	AND ps.order_of_revival_issued_date BETWEEN '${fiscalYearStart}' AND GETDATE()) THEN 1 ELSE 0 END) AS 'Revived During the FY',
	SUM(CASE WHEN ps.[vacant_or_filled] = 'vacant' AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE())) AND ( ps.revival_stage_id IS NULL OR ps.revival_stage_id !=9)
		AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
                               AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                THEN 1 ELSE 0 END) AS 'Balance to be Revived',
	SUM(CASE WHEN ps.[vacant_or_filled] = 'vacant' AND ( ps.revival_stage_id IS NULL OR ps.revival_stage_id = 0)
    AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )

     	THEN 1 ELSE 0 END) AS 'Process not initiated',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 1
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < GETDATE())
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Process initiated but decision not taken',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND (ps.revival_stage_id = 3 OR ps.revival_stage_id = 4)
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Decision Taken for Revival at Organisation Level By Competent Authority',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 4
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    )
                    THEN 1 ELSE 0 END) AS 'Rejected for Revival at Organisation Level By Competent Authority',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 5
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Submitted to Ministry',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 6
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Sent to DoE',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 7
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Approval Received from DoE',
	SUM(CASE WHEN
     	ps.[vacant_or_filled] = 'vacant' AND ps.revival_stage_id = 8
        AND psl.log_month = MONTH(DATEADD(MONTH, -1, GETDATE()))
		AND psl.log_year = YEAR(DATEADD(MONTH, -1, GETDATE()))
     	AND (
                    oa.abolish_required = 0
                    OR (
                        oa.abolish_required = 1
                        AND (
                            (
                                (ps.exception_abolish IS NULL OR ps.exception_abolish = 0) AND
                               DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) < '${fiscalYearEnd}')
                            )
                            OR (
                                ps.exception_abolish = 1
                                AND ps.exception_abolish_date IS NOT NULL
                                AND ps.exception_abolish_date < '${fiscalYearEnd}'
                            )
                        )
                    ) THEN 1 ELSE 0 END) AS 'Proposal Rejected by DoE'
        FROM  mmt_organisation mmt
            LEFT JOIN [tbl_hr_post_strength] ps ON mmt.organisation_id = ps.organisation_id
            LEFT JOIN [mmt_hr_post] p ON ps.post_id = p.post_id
            LEFT JOIN [mmt_hr_department] d ON p.department_id = d.department_id
            LEFT JOIN [mmt_class] mmtc ON p.class_id = mmtc.class_id
            LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
            LEFT JOIN tbl_hr_organisation_abolish oa ON ps.organisation_id = oa.organisation_id
            LEFT JOIN tbl_hr_post_strength_log psl ON ps.post_id = psl.post_id
        WHERE mmt.organisation_id=${organisationId} AND p.class_id=${classId}
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, p.class_id,p.post_name,p.post_id,d.department_name
        ORDER BY
            p.class_id`;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "OrganisationId",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "3",
            field: "Department",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headercenter",
        filter: 'agTextColumnFilter',
        children: [
          {
            headerName: "4",
            field: "Post Name",
            width: 290,
            headerClass: "headercenter",
            filter: 'agTextColumnFilter',
          },
        ],
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Posts to be revived",
        field: "No. of Posts to be revived",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the Beginning of the FY",
            field: "At the Beginning of the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "5",
                field: "At the Beginning of the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Abolished during the year",
            field: "Abolished during the year",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Abolished during the year",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Revived During the FY",
            field: "Revived During the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Revived During the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Balance to be Revived",
            field: "Balance to be Revived",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Balance to be Revived",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but decision not taken",
            field: "Process initiated but decision not taken",
            width: 310,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Process initiated but decision not taken",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Decision Taken for Revival at Organisation Level By Competent Authority",
            field:
              "Decision Taken for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field:
                  "Decision Taken for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Rejected for Revival at Organisation Level By Competent Authority",
            field:
              "Rejected for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field:
                  "Rejected for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Proposal Submitted to Ministry",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Proposal Sent to DoE",
                width: 250,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Approval Received from DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            headerClass: "headercenter",
            children: [
              {
                headerName: "16",
                field: "Proposal Rejected by DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrNinethReport(req, res) {
  const orgCatDrop = req.params.orgCatDrop;
  const orgDrop = req.params.orgDrop;
  const classDrop = req.params.classDrop;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;

  request.input("orgCatDrop", orgCatDrop);
  request.input("orgDrop", orgDrop);
  request.input("classDrop", classDrop);

  let query1 = `SELECT
          mmt.[organisation_id] AS 'organisationId',
          mmt.[organisation_name] AS 'Organisation',
          mo.organisation_category_name AS 'Organisation Category',
          mmtc.class_id AS 'classId',
          mmtc.[class] AS 'Class / Group',
          SUM(CASE WHEN created_on < '${fiscalYearStart}' THEN 1 ELSE 0 END) AS 'At the Beginning of the FY',
          SUM(CASE WHEN created_on BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' THEN 1 ELSE 0 END) AS 'Proposal sent during the FY',
          SUM(CASE WHEN (order_for_creation_of_post_issued_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}')  AND approval_stage_id = 9 THEN 1 ELSE 0 END) AS 'Created During the FY',
          SUM(CASE WHEN created_on < '${fiscalYearEnd}' THEN 1 ELSE 0 END) -
          SUM(CASE WHEN (order_for_creation_of_post_issued_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}')  AND approval_stage_id = 9 THEN 1 ELSE 0 END) AS 'Balance to be created',
          SUM(CASE WHEN created_on IS NOT NULL AND created_on < '${fiscalYearEnd}' AND (approval_stage_id = 2 OR approval_stage_id IS NULL) THEN 1 ELSE 0 END) AS 'Process not initiated',
          SUM(CASE WHEN approval_stage_id = 1  THEN 1 ELSE 0 END) AS 'Process initiated but approval of the Competent Authority yet to be received',
          SUM(CASE WHEN approval_stage_id = 3  THEN 1 ELSE 0 END) AS 'Approval of the Competent Authority at Organisation Level',
          SUM(CASE WHEN approval_stage_id = 4  THEN 1 ELSE 0 END) AS 'Rejected by Competent Authority at Organisation Level',
          SUM(CASE WHEN approval_stage_id = 5  THEN 1 ELSE 0 END) AS 'Proposal Submitted to Ministry',
          SUM(CASE WHEN approval_stage_id = 6  THEN 1 ELSE 0 END) AS 'Proposal Sent to DoE',
          SUM(CASE WHEN approval_stage_id = 7  THEN 1 ELSE 0 END) AS 'Approval Received from DoE',
          SUM(CASE WHEN approval_stage_id = 8  THEN 1 ELSE 0 END) AS 'Proposal Rejected by DoE',
          SUM(CASE WHEN approval_stage_id = 9  THEN 1 ELSE 0 END) AS 'Order for Creation of Post Issued'
       FROM
       mmt_organisation mmt
       LEFT JOIN [tbl_post_request] pq ON mmt.organisation_id = pq.organisation_id
       LEFT JOIN mmt_class mmtc ON pq.class = mmtc.class_id
       LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id`;

  let condition = "";
  if (orgCatDrop !== "0") {
    condition = ` WHERE mmt.organisation_id!=4 AND  mo.organisation_category_id = ${orgCatDrop}`;
    if (orgDrop !== "0") {
      condition += ` AND mmt.organisation_id = ${orgDrop}`;
      if (classDrop !== "0") {
        condition += ` AND mmtc.class_id = ${classDrop}`;
      }
    } else if (classDrop !== "0") {
      condition += ` AND mmtc.class_id = ${classDrop}`;
    }
  } else if (orgDrop !== "0") {
    condition = ` WHERE mmt.organisation_id = ${orgDrop}`;
    if (classDrop !== "0") {
      condition += ` AND mmtc.class_id = ${classDrop}`;
    }
  } else if (classDrop !== "0") {
    condition = ` WHERE mmtc.class_id = ${classDrop}`;
  } else {
    condition = ` WHERE mmt.organisation_id!=4 AND mo.organisation_category_id IN (1, 3)`;
  }

  condition += `
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, mmtc.class_id
        ORDER BY
            mmt.organisation_name,mmtc.class_id`;

  query1 += condition;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "OrganisationId",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Posts to be created",
        field: "No. of Posts to be created",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the Beginning of the FY",
            field: "At the Beginning of the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "3",
                field: "At the Beginning of the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal sent during the FY",
            field: "Proposal sent during the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "4",
                field: "Proposal sent during the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Created During the FY",
            field: "Created During the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "5",
                field: "Created During the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Balance to be created",
            field: "Balance to be created",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Balance to be created",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Process not initiated",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Process initiated but approval of the Competent Authority yet to be received",
            field:
              "Process initiated but approval of the Competent Authority yet to be received",
            width: 380,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field:
                  "Process initiated but approval of the Competent Authority yet to be received",
                width: 380,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Approval of the Competent Authority at Organisation Level",
            field: "Approval of the Competent Authority at Organisation Level",
            width: 380,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field:
                  "Approval of the Competent Authority at Organisation Level",
                width: 380,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Rejected by Competent Authority at Organisation Level",
            field: "Rejected by Competent Authority at Organisation Level",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Rejected by Competent Authority at Organisation Level",
                width: 310,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Proposal Submitted to Ministry",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Proposal Sent to DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Approval Received from DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Proposal Rejected by DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order for Creation of Post Issued",
            field: "Order for Creation of Post Issued",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Order for Creation of Post Issued",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrNinethDetailedReport(req, res) {
  const organisationId = req.params.organisationId;
  const classId = req.params.classId;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
  const [startYear, endYear] = financialYear.split("-");
  const fiscalYearStart = `${startYear}-04-01`;
  const fiscalYearEnd = `${endYear}-03-31`;

  request.input("organisationId", organisationId);
  request.input("classId", classId);

  let query1 = `SELECT
          mmt.[organisation_id] AS 'organisationId',
          mmt.[organisation_name] AS 'Organisation',
          mo.organisation_category_name AS 'Organisation Category',
          mmtc.class_id AS 'classId',
          mmtc.[class] AS 'Class / Group',
          pq.post_request_name AS 'postName',
          pq.department_name AS 'departmentName',
          pq.post_request_id AS 'postId',
          SUM(CASE WHEN created_on < '${fiscalYearStart}' THEN 1 ELSE 0 END) AS 'At the Beginning of the FY',
          SUM(CASE WHEN created_on BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}' THEN 1 ELSE 0 END) AS 'Proposal sent during the FY',
          SUM(CASE WHEN (order_for_creation_of_post_issued_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}')  AND approval_stage_id = 9 THEN 1 ELSE 0 END) AS 'Created During the FY',
          SUM(CASE WHEN created_on < '${fiscalYearEnd}' THEN 1 ELSE 0 END) -
          SUM(CASE WHEN (order_for_creation_of_post_issued_date BETWEEN '${fiscalYearStart}' AND '${fiscalYearEnd}')  AND approval_stage_id = 9 THEN 1 ELSE 0 END) AS 'Balance to be created',
          SUM(CASE WHEN created_on IS NOT NULL AND created_on < '${fiscalYearEnd}' AND (approval_stage_id = 2 OR approval_stage_id IS NULL) THEN 1 ELSE 0 END) AS 'Process not initiated',
          SUM(CASE WHEN approval_stage_id = 1  THEN 1 ELSE 0 END) AS 'Process initiated but approval of the Competent Authority yet to be received',
          SUM(CASE WHEN approval_stage_id = 3  THEN 1 ELSE 0 END) AS 'Approval of the Competent Authority at Organisation Level',
          SUM(CASE WHEN approval_stage_id = 4  THEN 1 ELSE 0 END) AS 'Rejected by Competent Authority at Organisation Level',
          SUM(CASE WHEN approval_stage_id = 5  THEN 1 ELSE 0 END) AS 'Proposal Submitted to Ministry',
          SUM(CASE WHEN approval_stage_id = 6  THEN 1 ELSE 0 END) AS 'Proposal Sent to DoE',
          SUM(CASE WHEN approval_stage_id = 7  THEN 1 ELSE 0 END) AS 'Approval Received from DoE',
          SUM(CASE WHEN approval_stage_id = 8  THEN 1 ELSE 0 END) AS 'Proposal Rejected by DoE',
          SUM(CASE WHEN approval_stage_id = 9  THEN 1 ELSE 0 END) AS 'Order for Creation of Post Issued'
       FROM
       mmt_organisation mmt
       LEFT JOIN [tbl_post_request] pq ON mmt.organisation_id = pq.organisation_id
       LEFT JOIN mmt_class mmtc ON pq.class = mmtc.class_id
       LEFT JOIN mmt_organisation_category mo ON mmt.organisation_category_id = mo.organisation_category_id
       WHERE mmt.organisation_id=${organisationId} AND mmtc.class_id=${classId}
        GROUP BY
            mmt.organisation_id, mmt.organisation_name, mo.organisation_category_name, mmtc.class, mmtc.class_id,pq.post_request_name,pq.post_request_id,pq.department_name
        ORDER BY
            mmtc.class_id`;

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "OrganisationId",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Department Name",
        field: "departmentName",
        headerClass: "headercenter",
        width: 130,
        children: [
          {
            headerName: "3",
            field: "departmentName",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Post Name",
        field: "postName",
        headerClass: "headercenter",
        width: 130,
        children: [
          {
            headerName: "4",
            field: "postName",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "postId",
        field: "postId",
        headerClass: "headerGroup",
        width: 130,
      },
      {
        headerName: "No. of Posts to be created",
        field: "No. of Posts to be created",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the Beginning of the FY",
            field: "At the Beginning of the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "5",
                field: "At the Beginning of the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal sent during the FY",
            field: "Proposal sent during the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Proposal sent during the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Created During the FY",
            field: "Created During the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Created During the FY",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Balance to be created",
            field: "Balance to be created",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Balance to be created",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process not initiated",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Process initiated but approval of the Competent Authority yet to be received",
            field:
              "Process initiated but approval of the Competent Authority yet to be received",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field:
                  "Process initiated but approval of the Competent Authority yet to be received",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName:
              "Approval of the Competent Authority at Organisation Level",
            field: "Approval of the Competent Authority at Organisation Level",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field:
                  "Approval of the Competent Authority at Organisation Level",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Rejected by Competent Authority at Organisation Level",
            field: "Rejected by Competent Authority at Organisation Level",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Rejected by Competent Authority at Organisation Level",
                width: 310,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Proposal Submitted to Ministry",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Proposal Sent to DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "Approval Received from DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            headerClass: "headercenter",
            children: [
              {
                headerName: "16",
                field: "Proposal Rejected by DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order for Creation of Post Issued",
            field: "Order for Creation of Post Issued",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "17",
                field: "Order for Creation of Post Issued",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    // Adjusting column definitions for the last two columns to span
    // columnDefs.forEach(col => {
    //     if (col.children && col.children[0].headerName === 'No of vacancies') {
    //         col.headerName = 'No of vacancies';
    //         col.colSpan = 2;
    //     }
    // });
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrDetailedRevivalReport(req, res) {
  const classID = req.params.classID;
  const stage = req.params.type;
  const organisationID = req.params.organisationID;
  const postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("classID", classID);
  request.input("stage", stage);
  request.input("organisationID", organisationID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` p.[post_id] = ${postID} AND h.[revival_stage_id] = ${stage} `;
  } else {
    whereCondition = ` h.[organisation_id] = ${organisationID} AND p.[class_id] = ${classID} AND h.[revival_stage_id] = ${stage} `;
  }

  try {
    const result = await request.query(`
        SELECT
        d.[department_name] AS 'Department',
       p.[post_name] AS 'Post Name'
      ,mmtc.class AS 'Class / Group'
      ,h.[post_code] AS 'Post Code'
      ,CONVERT(VARCHAR, h.[revival_date],120) AS 'Approval of the Competent Authority at Organisation Level'
      ,CONVERT(VARCHAR, h.[revival_submission_date],120) AS 'Proposal Submitted to Ministry'
      ,CONVERT(VARCHAR,h.[revive_proposal_sent_to_doe_date],120) AS 'Proposal Sent to DoE'
      ,CONVERT(VARCHAR,h.[revive_approval_date_from_doe],120) AS 'Approval Received from DoE'
      ,CONVERT(VARCHAR,h.[revive_rejection_date_from_doe],120) AS 'Proposal Rejected by DoE'
      ,CONVERT(VARCHAR,h.[order_of_revival_issued_date],120) AS 'Order for revival issued'
  FROM [tbl_hr_post_strength] h

  JOIN [mmt_hr_post] p ON p.post_id = h.post_id
   JOIN [mmt_hr_department] d ON p.department_id = d.department_id
  JOIN [mmt_class] mmtc ON p.class_id = mmtc.class_id

  WHERE ${whereCondition}

  GROUP BY d.department_name,p.[post_name], p.[class_id], mmtc.class,  h.[post_code], h.[revival_submission_date],h.[revive_proposal_sent_to_doe_date],h.[revive_rejection_date_from_doe],h.[revive_approval_date_from_doe],h.[revival_date], h.[order_of_revival_issued_date];


      `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Post Name",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headerGroup",
      },
      {
        headerName: "Post Code",
        field: "Post Code",
        width: 170,
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: [
          {
            headerName:
              "Approval of the Competent Authority at Organisation Level",
            field: "Approval of the Competent Authority at Organisation Level",
            width: 270,
          },
          {
            headerName: "Rejected by Competent Authority at Organisation Level",
            field: "Rejected by Competent Authority at Organisation Level",
            headerClass: "headerGroup",
            width: 340,
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 210,
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 260,
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            width: 210,
          },
          {
            headerName: "Order for revival issued",
            field: "Order for revival issued",
            width: 200,
          },
        ],
      },
    ];
    res.json({ columnDefs, rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function hrDetailedStatusReport(req, res) {
  const classID = req.params.classID;
  const stage = req.params.type;
  const organisationID = req.params.organisationID;
  const postID = req.params.postID;

  const conn = await pool;
  const request = conn.request();

  request.input("classID", classID);
  request.input("stage", stage);
  request.input("organisationID", organisationID);
  request.input("postID", postID);

  let whereCondition = ``;
  if (postID !== "0") {
    whereCondition = ` tbl_post_request.post_request_id='${postID}' AND approval_stage_id=${stage} `;
  } else {
    whereCondition = ` tbl_post_request.class='${classID}' AND organisation_id=${organisationID} AND approval_stage_id=${stage} `;
  }

  try {
    const result = await request.query(`
        SELECT
       [post_request_name] AS 'Name of the Post'
      ,[department_name] AS 'Department'
      ,mmtc.[class_id] AS 'classId'
      ,mmtc.[class]  AS 'Class / Group'
      ,CONVERT(VARCHAR,[approval_date],120) AS 'Approval of the Competent Authority at Organisation Level'
      ,CONVERT(VARCHAR,[submitted_on],120)  AS  'Proposal Submitted to Ministry'
      ,CONVERT(VARCHAR,[proposal_sent_to_doe_date],120)  AS 'Proposal Sent to DoE'
      ,CONVERT(VARCHAR,[approval_date_from_doe],120) AS 'Approval Received from DoE'
      ,CONVERT(VARCHAR,[rejection_date_from_doe],120)  AS 'Proposal Rejected by DoE'
      ,CONVERT(VARCHAR,[order_for_creation_of_post_issued_date],120) AS 'Order for Creation of Post Issued'
  FROM [tbl_post_request]
  JOIN [mmt_class] mmtc ON tbl_post_request.class = mmtc.class_id
  WHERE ${whereCondition}

      `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Name of the Post",
        field: "Name of the Post",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Department",
        field: "Department",
        width: 150,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headerGroup",
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: [
          {
            headerName:
              "Approval of the Competent Authority at Organisation Level",
            field: "Approval of the Competent Authority at Organisation Level",
            width: 270,
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 210,
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 260,
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            width: 210,
          },
          {
            headerName: "Order for Creation of Post Issued",
            field: "Order for Creation of Post Issued",
            width: 220,
          },
        ],
      },
    ];
    res.json({ columnDefs, rowData });
  } catch (err) {
    //console.log(err);
    return res.sendStatus(500);
  }
}


async function getTotalManpowerSanctionActual(req, res) {
  const departmentID = parseInt(req.params.departmentID, 10);
  const classID = req.params.classID;
  const orgCategory = req.params.orgCategory;
  const deptCategory = parseInt(req.params.deptCategory, 10);

  const conn = await pool;
  const request = await conn.request();

  request.input("orgCategory", orgCategory);
  request.input("deptCategory", deptCategory);
  if (departmentID !== 0) request.input("departmentID", departmentID);
  if (classID !== 0) request.input("classID", classID);

  try {
    const departmentFilter =
      departmentID != 0 ? `AND p.department_id = @departmentID` : "";
    const classFilter = classID != 0 ? `AND p.class_id = @classID` : "";
    const departmentFilter2 =
      departmentID != 0 ? `AND d.department_id = @departmentID` : "";
    const classFilter2 = classID != 0 ? `AND p.class_id = @classID` : "";

    let query ='';

    if(!deptCategory || deptCategory == 0){
      query = `
        DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @selectCols NVARCHAR(MAX) = '';

;WITH Orgs AS (
    SELECT DISTINCT
        o.organisation_id,
        REPLACE(o.organisation_name, '.', ' ') AS organisation_name_clean
    FROM mmt_organisation o
    JOIN mmt_hr_post p ON o.organisation_id = p.organisation_id
    WHERE o.organisation_category_id = @orgCategory
    ${departmentFilter}
    ${classFilter}
)

SELECT @selectCols = STRING_AGG(CONVERT(NVARCHAR(MAX),
    '(SELECT ISNULL(SUM(sanctioned_strength), 0) FROM mmt_hr_post p2 ' +
    'WHERE p2.department_id = d.department_id AND p2.organisation_id = ' +
    CAST(organisation_id AS VARCHAR) +
    ${classID != 0 ? " ' AND p2.class_id = @classID'" : "''"} +
    ') AS [' + organisation_name_clean + '_Sanctioned], ' +
    'SUM(CASE WHEN o.organisation_id = ' + CAST(organisation_id AS VARCHAR) +
    ' AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' +
    organisation_name_clean + '_Actual]'
), ', ')
FROM Orgs;

SET @sql = '
    SELECT
        d.department_name AS Department,
        ' + @selectCols + '
    FROM mmt_hr_department d
    LEFT JOIN mmt_hr_post p ON d.department_id = p.department_id
    LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
    LEFT JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
    WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
    ${departmentFilter2}
    ${classFilter2}
    GROUP BY d.department_id, d.department_name
    ORDER BY d.department_name;
';

EXEC sp_executesql
    @sql,
    N'@orgCategory INT${departmentID != 0 ? ", @departmentID INT" : ""}${classID != 0 ? ", @classID INT" : ""}',
    @orgCategory = @orgCategory
    ${departmentID != 0 ? ", @departmentID = @departmentID" : ""}
    ${classID != 0 ? ", @classID = @classID" : ""};
        `;
      } else {

        const orgsResult = await conn.request()
  .input("orgCategory", orgCategory)
  .query(`
    SELECT DISTINCT
      o.organisation_id,
      REPLACE(o.organisation_name, '.', ' ') AS organisation_name_clean
    FROM mmt_organisation o
    JOIN mmt_hr_post p ON o.organisation_id = p.organisation_id
    WHERE o.organisation_category_id = @orgCategory
  `);

const orgs = orgsResult.recordset;

if (!orgs.length) {
  return res.status(404).json({ error: "No organisations found for the given category." });
}

// Now dynamically build the @selectCols part
let selectCols = orgs.map((org) => {
  const orgId = org.organisation_id;
  const orgName = org.organisation_name_clean.replace(/]/g, '').replace(/\[/g, ''); // escape square brackets

  const sanctionedCol = `(SELECT ISNULL(SUM(sanctioned_strength), 0)
      FROM mmt_hr_post p2
      JOIN mmt_hr_department d2 ON p2.department_id = d2.department_id
      WHERE d2.department_category_id = d.department_category_id
      AND p2.organisation_id = ${orgId} ${classID != 0 ? "AND p2.class_id = @classID" : ""})
      AS [${orgName}_Sanctioned]`;

  const actualCol = `SUM(CASE WHEN o.organisation_id = ${orgId}
      AND ps.vacant_or_filled = 'filled' THEN 1 ELSE 0 END)
      AS [${orgName}_Actual]`;

  return `${sanctionedCol}, ${actualCol}`;
}).join(',\n');

let dynamicSQL = `
  SELECT
    dc.department_category_name AS Department,
    ${selectCols}
  FROM mmt_hr_department d
  INNER JOIN mmt_hr_department_category dc ON d.department_category_id = dc.department_category_id
  LEFT JOIN mmt_hr_post p ON d.department_id = p.department_id
  LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
  LEFT JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
  WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
  GROUP BY dc.department_category_name, d.department_category_id
  ORDER BY dc.department_category_name;
`;
     query = `
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'${dynamicSQL.replace(/'/g, "''")}';
  EXEC sp_executesql @sql, N'@orgCategory INT${classID != 0 ? ", @classID INT" : ""}',
  @orgCategory = @orgCategory ${classID != 0 ? ", @classID = @classID" : ""};
`;

const execRequest = await conn.request();
execRequest.input("orgCategory", orgCategory);
if (classID != 0) execRequest.input("classID", classID);


      }



    const result = await request.query(query);

    const rowData = result.recordset;

    if (!rowData || rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnNames = Object.keys(rowData[0]);

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        pinned: "left",
      },
    ];

    const orgMap = {};

    columnNames.forEach((col) => {
      if (col !== "Department") {
        const [orgName, type] = col.split("_");
        if (!orgMap[orgName]) {
          orgMap[orgName] = [];
        }
        orgMap[orgName].push({
          headerName: type,
          field: col,
          headerClass: "headerGroup",
          cellStyle: { textAlign: "center" },
        });
      }
    });

    for (const org in orgMap) {
      columnDefs.push({
        headerName: org,
        children: orgMap[org].map((child) => ({
          ...child,
          width: 150,
        })),
      });
    }

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error("Error occurred while fetching MIS Manpower Report", err);
    res.status(500).json({ error: err });
  }
}

async function getHRGenderWiseCountMajorReport(req, res) {
  const orgCategory = req.params.orgCategory;

  const conn = await pool;
  const request = await conn.request();

  try {
    const query = `
            DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @selectCols NVARCHAR(MAX) = '';

SELECT @selectCols = STRING_AGG(QUOTENAME(o.organisation_name), ', ')
FROM (
    SELECT DISTINCT REPLACE(mo.organisation_name, '.', ' ') AS organisation_name
    FROM tbl_employee_master em
    JOIN tbl_hr_post_strength ps ON ps.emp_master_id = em.emp_master_id
    JOIN mmt_hr_post mhp ON mhp.post_id = ps.post_id
    JOIN mmt_hr_department d ON mhp.department_id = d.department_id
    JOIN mmt_organisation mo ON mhp.organisation_id = mo.organisation_id
    WHERE mo.organisation_category_id = ${orgCategory} AND mo.organisation_id != 4
) o;

SET @sql = '
WITH CTE AS (
    SELECT
        mhp.class_id,
        REPLACE(mo.organisation_name, ''.'', '' '') AS organisation_name,
        em.emp_gender,
        COUNT(*) AS CNT
    FROM tbl_employee_master em
    JOIN tbl_hr_post_strength ps ON ps.emp_master_id = em.emp_master_id
    JOIN mmt_hr_post mhp ON mhp.post_id = ps.post_id
    JOIN mmt_hr_department d ON mhp.department_id = d.department_id
    JOIN mmt_organisation mo ON mhp.organisation_id = mo.organisation_id
    WHERE mo.organisation_category_id = ${orgCategory} AND mo.organisation_id != 4
      AND em.emp_gender IN (''Male'', ''Female'', ''Transgender'')
    GROUP BY mhp.class_id, mo.organisation_name, em.emp_gender
),
Classified AS (
    SELECT
        organisation_name,
        CASE class_id
            WHEN 1 THEN ''CLASS 1''
            WHEN 2 THEN ''CLASS 2''
            WHEN 3 THEN ''CLASS 3''
            WHEN 4 THEN ''CLASS 4''
        END AS CLASS,
        emp_gender,
        SUM(CNT) AS emp_count
    FROM CTE
    GROUP BY organisation_name, class_id, emp_gender
),
WithClassTotal AS (
    SELECT * FROM Classified
    UNION ALL
    SELECT
        organisation_name,
        CLASS,
        ''Total'' AS emp_gender,
        SUM(emp_count)
    FROM Classified
    GROUP BY organisation_name, CLASS
),
WithGrandTotal AS (
    SELECT * FROM WithClassTotal
    UNION ALL
    SELECT
        organisation_name,
        ''Total'' AS CLASS,
        emp_gender,
        SUM(emp_count)
    FROM Classified
    GROUP BY organisation_name, emp_gender
    UNION ALL
    SELECT
        organisation_name,
        ''Total'' AS CLASS,
        ''Total'' AS emp_gender,
        SUM(emp_count)
    FROM Classified
    GROUP BY organisation_name
),
Pivoted AS (
    SELECT
        CLASS,
        emp_gender,
        organisation_name,
        emp_count
    FROM WithGrandTotal
),
Final AS (
    SELECT
        CLASS,
        emp_gender,
        ' + @selectCols + ',
        ROW_NUMBER() OVER (PARTITION BY CLASS ORDER BY
            CASE emp_gender
                WHEN ''Male'' THEN 1
                WHEN ''Female'' THEN 2
                WHEN ''Transgender'' THEN 3
                WHEN ''Total'' THEN 4
                ELSE 5 END
        ) AS rn
    FROM Pivoted
    PIVOT (
        SUM(emp_count)
        FOR organisation_name IN (' + @selectCols + ')
    ) AS pvt
)
SELECT
    CASE WHEN rn = 1 THEN CLASS ELSE '''' END AS CLASS,
    emp_gender AS GENDER,
    ' + @selectCols + '
FROM Final
ORDER BY
    CASE CLASS
        WHEN ''CLASS 1'' THEN 1
        WHEN ''CLASS 2'' THEN 2
        WHEN ''CLASS 3'' THEN 3
        WHEN ''CLASS 4'' THEN 4
        WHEN ''Total'' THEN 5
        ELSE 6
    END,
    CASE emp_gender
        WHEN ''Male'' THEN 1
        WHEN ''Female'' THEN 2
        WHEN ''Transgender'' THEN 3
        WHEN ''Total'' THEN 4
        ELSE 5
    END;';

EXEC sp_executesql @sql;
        `;

    const result = await request.query(query);

    const rowData = result.recordset;

    if (!rowData || rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnNames = Object.keys(rowData[0]);

    const columnDefs = columnNames.map((columnName) => ({
      headerName: columnName,
      field: columnName,
      headerClass: "headerGroup",
      cellStyle: { textAlign: "center" },
    }));

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(
      "Error occurred while fetching MIS Gender Wise Major Port Report",
      err
    );
    res.status(500).json({ error: err });
  }
}

async function getTotalManpowerClassWiseReport(req, res) {
  const orgCategory = req.params.orgCategory;
  const deptCategory = req.params.deptCategory;
  const conn = await pool;
  const request = await conn.request();

  request.input("orgCategory", orgCategory);
  let query;


  try {

       if(!deptCategory || deptCategory==0){
            query = `
                DECLARE @sql NVARCHAR(MAX) = '';
                DECLARE @selectCols NVARCHAR(MAX) = '';
                ;WITH Orgs AS (
                    SELECT DISTINCT o.organisation_id, REPLACE(o.organisation_name, '.', ' ') AS organisation_name
                    FROM mmt_organisation o
                    JOIN mmt_hr_post p ON o.organisation_id = p.organisation_id
                    WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
                )
                SELECT @selectCols = STRING_AGG(
                    CAST(
                        'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                        ' AND p.class_id = 1 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 1], ' +

                        'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                        ' AND p.class_id = 2 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 2], ' +

                        'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                        ' AND p.class_id = 3 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 3], ' +

                        'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                        ' AND p.class_id = 4 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 4], ' +

                        'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                        ' AND p.class_id IN (1, 2, 3, 4) AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_Total_Filled]'
                    AS NVARCHAR(MAX))
                , ', ')
                FROM Orgs o;
                SET @sql = N'
                    SELECT
                        d.department_name AS Department,
                        ' + ISNULL(@selectCols, 'NULL AS [No_Data]') + '
                    FROM mmt_hr_department d
                    LEFT JOIN mmt_hr_post p ON d.department_id = p.department_id
                    LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
                    LEFT JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
                    GROUP BY d.department_id, d.department_name
                    ORDER BY d.department_name;
                ';
                EXEC sp_executesql @sql, N'@orgCategory INT', @orgCategory;
            `;
         }  else {
          query = `
            DECLARE @sql NVARCHAR(MAX) = '';
            DECLARE @selectCols NVARCHAR(MAX) = '';

            ;WITH Orgs AS (
                SELECT DISTINCT o.organisation_id, REPLACE(o.organisation_name, '.', ' ') AS organisation_name
                FROM mmt_organisation o
                JOIN mmt_hr_post p ON o.organisation_id = p.organisation_id
                WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
            )
            SELECT @selectCols = STRING_AGG(
                CAST(
                    'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                    ' AND p.class_id = 1 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 1], ' +

                    'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                    ' AND p.class_id = 2 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 2], ' +

                    'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                    ' AND p.class_id = 3 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 3], ' +

                    'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                    ' AND p.class_id = 4 AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_CLASS 4], ' +

                    'SUM(CASE WHEN p.organisation_id = ' + CAST(o.organisation_id AS NVARCHAR) +
                    ' AND p.class_id IN (1,2,3,4) AND ps.vacant_or_filled = ''filled'' THEN 1 ELSE 0 END) AS [' + REPLACE(o.organisation_name, ']', ']]') + '_Total_Filled]'
                AS NVARCHAR(MAX))
            , ', ')
            FROM Orgs o;

            SET @sql = N'
                SELECT
                    ISNULL(dc.department_category_name, '''') AS Department,
                    ' + ISNULL(@selectCols, 'NULL AS [No_Data]') + '
                FROM mmt_hr_department d
                LEFT JOIN mmt_hr_department_category dc ON d.department_category_id = dc.department_category_id
                LEFT JOIN mmt_hr_post p ON d.department_id = p.department_id
                LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
                LEFT JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                WHERE o.organisation_category_id = @orgCategory AND o.organisation_id != 4
                GROUP BY dc.department_category_name
                ORDER BY dc.department_category_name;
            ';

            EXEC sp_executesql @sql, N'@orgCategory INT', @orgCategory;
          `;
        }



        const result = await request.query(query);
    const rowData = result.recordset;

    if (!rowData || rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnNames = Object.keys(rowData[0]);
    const dynamicCols = columnNames.filter((col) => col !== "Department");

    const groupedColumns = {};

    dynamicCols.forEach((col) => {
      const match = col.match(
        /^(.+?)_(CLASS 1|CLASS 2|CLASS 3|CLASS 4|Total_Filled)$/
      );
      if (match) {
        const orgCode = match[1].replace(/\./g, ' ');  // Remove dots from organization name
        const classType = match[2].replace("_Filled", "");

        if (!groupedColumns[orgCode]) {
          groupedColumns[orgCode] = [];
        }

        groupedColumns[orgCode].push({
          headerName: classType.replace("Total_Filled", "Total"),
          field: col,
          cellStyle: { textAlign: "center" },
        });
      }
    });

    const columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        headerClass: "headerGroup",
        pinned: "left",
        cellStyle: { fontWeight: "bold" },
      },
      ...Object.keys(groupedColumns).map((orgCode) => ({
        headerName: orgCode,
        children: groupedColumns[orgCode],
      })),
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(
      "Error occurred while fetching total manpower class wise report",
      err
    );
    res.status(500).json({ error: err });
  }
}

async function getHRStaffingOverviewReport(req, res) {
  const orgCategory = req.params.orgCategory;

  const conn = await pool;
  const request = await conn.request();

  try {
    const query = `
            SELECT
    ROW_NUMBER() OVER (ORDER BY o.organisation_name) AS [Sl No],
    o.organisation_name AS [Organisation],

    -- Regular Officers
    ISNULL((SELECT SUM(sanctioned_strength)
            FROM mmt_hr_post
            WHERE class_id IN (1,2) AND organisation_id = o.organisation_id), 0) AS [Reg Officers Sanctioned],

    ISNULL((SELECT COUNT(ps.post_code)
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
            WHERE p.class_id IN (1,2) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0) AS [Reg Officers Actual],

    -- Regular Non-Officers
    ISNULL((SELECT SUM(sanctioned_strength)
            FROM mmt_hr_post
            WHERE class_id IN (3,4) AND organisation_id = o.organisation_id), 0) AS [Reg Non-Officers Sanctioned],

    ISNULL((SELECT COUNT(ps.post_code)
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
            WHERE p.class_id IN (3,4) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0) AS [Reg Non-Officers Actual],

    -- Regular Total
    ISNULL((SELECT SUM(sanctioned_strength)
            FROM mmt_hr_post
            WHERE organisation_id = o.organisation_id), 0) AS [Reg Total Sanctioned],

    ISNULL((SELECT COUNT(post_code)
            FROM tbl_hr_post_strength
            WHERE vacant_or_filled = 'filled' AND organisation_id = o.organisation_id), 0) AS [Reg Total Actual],

    -- Contract Officers
    ISNULL((SELECT
            SUM(ISNULL(officers_direct_engagement,0) + ISNULL(officers_retired_from_govt,0) +
                ISNULL(officers_retd_from_own_organ,0) + ISNULL(officers_through_agency,0) +
                ISNULL(officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0) AS [Contract Officers],

    -- Contract Non-Officers
    ISNULL((SELECT
            SUM(ISNULL(non_officers_direct_engagement,0) + ISNULL(non_officers_retired_from_govt,0) +
                ISNULL(non_officers_retd_from_own_organ,0) + ISNULL(non_officers_through_agency,0) +
                ISNULL(non_officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0) AS [Contract Non-Officers],

    -- Contract Total
    ISNULL((SELECT
            SUM(ISNULL(officers_direct_engagement,0) + ISNULL(officers_retired_from_govt,0) +
                ISNULL(officers_retd_from_own_organ,0) + ISNULL(officers_through_agency,0) +
                ISNULL(officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0)
    +
    ISNULL((SELECT
            SUM(ISNULL(non_officers_direct_engagement,0) + ISNULL(non_officers_retired_from_govt,0) +
                ISNULL(non_officers_retd_from_own_organ,0) + ISNULL(non_officers_through_agency,0) +
                ISNULL(non_officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0) AS [Contract Total],

    -- Total Officers (Regular + Contract)
    ISNULL((SELECT COUNT(ps.post_code)
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
            WHERE p.class_id IN (1,2) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0)
    +
    ISNULL((SELECT
            SUM(ISNULL(officers_direct_engagement,0) + ISNULL(officers_retired_from_govt,0) +
                ISNULL(officers_retd_from_own_organ,0) + ISNULL(officers_through_agency,0) +
                ISNULL(officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0) AS [Total Officers],

    -- Total Non-Officers (Regular + Contract)
    ISNULL((SELECT COUNT(ps.post_code)
            FROM tbl_hr_post_strength ps
            INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
            WHERE p.class_id IN (3,4) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0)
    +
    ISNULL((SELECT
            SUM(ISNULL(non_officers_direct_engagement,0) + ISNULL(non_officers_retired_from_govt,0) +
                ISNULL(non_officers_retd_from_own_organ,0) + ISNULL(non_officers_through_agency,0) +
                ISNULL(non_officers_for_ministry,0))
            FROM tbl_hr_contract_data
            WHERE organisation_id = o.organisation_id), 0) AS [Total Non-Officers],

    -- Grand Total (All)
    (
        ISNULL((SELECT COUNT(ps.post_code)
                FROM tbl_hr_post_strength ps
                INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
                WHERE p.class_id IN (1,2) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0)
        +
        ISNULL((SELECT COUNT(ps.post_code)
                FROM tbl_hr_post_strength ps
                INNER JOIN mmt_hr_post p ON ps.post_id = p.post_id
                WHERE p.class_id IN (3,4) AND ps.vacant_or_filled = 'filled' AND ps.organisation_id = o.organisation_id), 0)
        +
        ISNULL((SELECT
                SUM(ISNULL(officers_direct_engagement,0) + ISNULL(officers_retired_from_govt,0) +
                    ISNULL(officers_retd_from_own_organ,0) + ISNULL(officers_through_agency,0) +
                    ISNULL(officers_for_ministry,0))
                FROM tbl_hr_contract_data
                WHERE organisation_id = o.organisation_id), 0)
        +
        ISNULL((SELECT
                SUM(ISNULL(non_officers_direct_engagement,0) + ISNULL(non_officers_retired_from_govt,0) +
                    ISNULL(non_officers_retd_from_own_organ,0) + ISNULL(non_officers_through_agency,0) +
                    ISNULL(non_officers_for_ministry,0))
                FROM tbl_hr_contract_data
                WHERE organisation_id = o.organisation_id), 0)
    ) AS [Grand Total]

FROM mmt_organisation o
WHERE o.organisation_category_id = ${orgCategory} AND o.organisation_id != 4
ORDER BY o.organisation_name;
        `;

    const result = await request.query(query);

    const rowData = result.recordset;

    if (!rowData || rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    const columnNames = Object.keys(rowData[0]);

    const columnDefs = [
      { headerName: "Organisation", field: "Organisation", width: 320 },

      {
        headerName: "Regular",
        children: [
          {
            headerName: "Officers (Class 1 & 2)",
            children: [
              { headerName: "Sanctioned", field: "Reg Officers Sanctioned", type: "numericColumn" },
              { headerName: "Actual", field: "Reg Officers Actual", type: "numericColumn" },
            ],
          },
          {
            headerName: "Non-Officers (Class 3 & 4)",
            children: [
              { headerName: "Sanctioned", field: "Reg Non-Officers Sanctioned", type: "numericColumn" },
              { headerName: "Actual", field: "Reg Non-Officers Actual", type: "numericColumn" },
            ],
          },
          {
            headerName: "Total",
            children: [
              { headerName: "Sanctioned", field: "Reg Total Sanctioned", type: "numericColumn" },
              { headerName: "Actual", field: "Reg Total Actual", type: "numericColumn" },
            ],
          },
        ],
      },

      {
        headerName: "Contract",
        children: [
          { headerName: "Officers", field: "Contract Officers", type: "numericColumn" },
          { headerName: "Non-Officers", field: "Contract Non-Officers", type: "numericColumn" },
          { headerName: "Total", field: "Contract Total", type: "numericColumn" },
        ],
      },

      {
        headerName: "Grand Total",
        children: [
          { headerName: "Officers", field: "Total Officers", type: "numericColumn" },
          { headerName: "Non-Officers", field: "Total Non-Officers", type: "numericColumn" },
          { headerName: "Total", field: "Grand Total", type: "numericColumn" },
        ],
      },
    ];


    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(
      "Error occurred while fetching MIS Gender Wise Major Port Report",
      err
    );
    res.status(500).json({ error: err });
  }
}
async function getTrainingDetailsReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const roleID = req.params.roleID;
    const organisationID = req.params.organisationID;

    request.input("roleID", roleID);
    request.input("organisationID", organisationID);

    const result = await request.query(`
      	SELECT 
          tt.TRAINING_TYPE_NAME AS Training_Type,
          org.organisation_name AS Organisation,
          COALESCE(
              NULLIF(COUNT(hst.TRAINING_ID), 0),
              SUM(ht.NO_OF_PARTICIPANTS)
          ) AS Count
      FROM TBL_HR_TRAINING ht 
      JOIN mmt_organisation org ON ht.ORGANISATION_ID = org.organisation_id
      JOIN TBL_TRAINING_TITLE tit ON ht.TRAINING_TITLE_ID = tit.TRAINING_TITLE_ID
      JOIN TBL_TRAINING_TYPE tt ON tit.TRAINING_TYPE_ID = tt.TRAINING_TYPE_ID
      LEFT JOIN TBL_HR_STAFF_TRAINING hst ON ht.TRAINING_ID = hst.TRAINING_ID
      ${![2, 3, 4, 5].includes(Number(roleID)) ? "WHERE org.organisation_id = @organisationID" : ""}
      GROUP BY tt.TRAINING_TYPE_NAME, org.organisation_name;
    `);

    const records = result.recordset;

    // Field sanitization: replace spaces/special characters with underscores
    const sanitizeFieldName = (name) =>
      name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "_");

    // Step 1: Extract unique organisation names
    const organisations = [...new Set(records.map(r => r.Organisation))];

    // Step 2: Pivot and sanitize field names
    const pivot = {};
    records.forEach(({ Training_Type, Organisation, Count }) => {
      const cleanOrg = sanitizeFieldName(Organisation);
      if (!pivot[Training_Type]) {
        pivot[Training_Type] = { Training_Type };
      }
      pivot[Training_Type][cleanOrg] = Count;
    });

    const rowData = Object.values(pivot);

    // Step 3: Build column definitions with sanitized fields
    const columnDefs = [
      {
        headerName: "S.No",
        valueGetter: "node.rowIndex + 1",
        cellStyle: { textAlign: 'center' },
        width: 100,
        pinned: 'left'
      },
      {
        headerName: "Training Type",
        field: "Training_Type",
        cellStyle: { textAlign: 'center' },
        width: 250,
        pinned: 'left'
      },
      ...organisations.map(org => {
        const cleanField = sanitizeFieldName(org);
        return {
          headerName: org,
          field: cleanField,
          cellStyle: { textAlign: 'center' },
          width: 200
        };
      }),
      {
        headerName: "Total",
        field: "Total",
        cellStyle: { textAlign: 'center', fontWeight: 'bold' },
        width: 150
      }
    ];

    // Step 4: Calculate total for each row
    rowData.forEach(row => {
      let total = 0;
      for (const key in row) {
        if (key !== "Training_Type" && key !== "S.No") {
          const val = Number(row[key]);
          if (!isNaN(val)) total += val;
        }
      }
      row.Total = total;
    });

    // Return to frontend
    res.status(200).json({ columnDefs, rowData });

  } catch (error) {
    console.error("Error in getTrainingDetailsReport:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function hrAnticipatedReportData(req, res) {
  const classID = parseInt(req.params.classID, 10);
  const organisationID = parseInt(req.params.organisationID, 10);
  const methodOfAppointment = req.params.methodOfAppointment;

  const conn = await pool;
  const request = conn.request();

  const currentYear = new Date().getFullYear();
  const isAfterMarch = new Date().getMonth() > 2; // April = 3

  const startYear = isAfterMarch ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  const financialYearStart = `${startYear}-04-01`;
  const financialYearEnd = `${endYear}-03-31`;// Define fiscalYearEnd for SQL query

  request.input("classID", classID);
  request.input("organisationID", organisationID);
  request.input("methodOfAppointment", methodOfAppointment);
  request.input("financialYearStart", financialYearStart);
  request.input("financialYearEnd", financialYearEnd); // Add financialYearEnd as input

  let activityQuery;
  let dynamicDateColumns = []; // Array to hold dynamic date columns for columnDefs

  if (methodOfAppointment == 'Direct Recruitment') {
    activityQuery = `,CONVERT(VARCHAR, ps.process_initiated_date, 120) AS [Process started but advertisement yet to be published],
        CONVERT(VARCHAR, ps.A_notification_adv_issued_date,120) AS [Notification/Adv Issued],
        CONVERT(VARCHAR, ps.A_exam_conducted_date,120) AS [Exam Conducted/Selection Process Completed],
        CONVERT(VARCHAR, ps.A_interview_conducted_date,120) AS [Interview Conducted],
        CONVERT(VARCHAR, ps.A_selection_process_completed_date,120) AS [Selection Process Completed],
        CONVERT(VARCHAR, ps.A_result_declared_date,120) AS [Result Declared],
        CONVERT(VARCHAR, ps.A_appointment_letter_issued_date,120) AS [Appointment Letter issued]`;

    dynamicDateColumns = [
      {
        headerName: "Process started but advertisement yet to be published",
        field: "Process started but advertisement yet to be published",
        width: 320,
      },
      {
        headerName: "Notification/Adv Issued",
        field: "Notification/Adv Issued",
        width: 220,
      },
      {
        headerName: "Exam Conducted/Selection Process Completed",
        field: "Exam Conducted/Selection Process Completed",
        width: 350,
      },
      {
        headerName: "Interview Conducted",
        field: "Interview Conducted",
        width: 200,
      },
      {
        headerName: "Selection Process Completed",
        field: "Selection Process Completed",
        width: 250,
      },
      {
        headerName: "Result Declared",
        field: "Result Declared",
        width: 180,
      },
      {
        headerName: "Appointment Letter issued",
        field: "Appointment Letter issued",
        width: 220,
      },
    ];
  } else { // Assuming 'Promotion' for any other case based on your previous code
    activityQuery = `
        ,CONVERT(VARCHAR, ps.A_process_initiated_date, 120) AS [Process initiated vc not received],
        CONVERT(VARCHAR, ps.A_vigilance_clr_received_date,120) AS [Vigilance clearance received],
        CONVERT(VARCHAR, ps.A_dpc_conducted_date,120) AS [DPC Conducted],
        CONVERT(VARCHAR, ps.A_approval_by_ca_date,120) AS [Approval by Competent authority],
        CONVERT(VARCHAR, ps.A_promotion_order_issued_date,120) AS [Promotion order issued]`;

    dynamicDateColumns = [
      {
        headerName: "Process initiated vc not received",
        field: "Process initiated vc not received",
        width: 260,
      },
      {
        headerName: "Vigilance clearance received",
        field: "Vigilance clearance received",
        width: 220,
      },
      {
        headerName: "DPC Conducted",
        field: "DPC Conducted",
        width: 180,
      },
      {
        headerName: "Approval by Competent authority",
        field: "Approval by Competent authority",
        width: 280,
      },
      {
        headerName: "Promotion order issued",
        field: "Promotion order issued",
        width: 230,
      },
    ];
  }

  try {
    const result = await request.query(`
      SELECT
        d.department_name AS Department,
        post.post_name AS 'Name of the Post',
        ps.post_code,
        em_sub.emp_name AS 'Current Occupant',
        CONVERT(VARCHAR, em_sub.emp_dor, 120) AS 'Date of Retirement'
        ${activityQuery}
      FROM tbl_hr_post_strength ps
      INNER JOIN mmt_hr_post post ON ps.post_id = post.post_id
      INNER JOIN mmt_hr_department d ON post.department_id = d.department_id
      INNER JOIN tbl_employee_master em_sub ON ps.emp_master_id = em_sub.emp_master_id
      WHERE
        ps.vacant_or_filled = 'filled'
        AND LTRIM(RTRIM(LOWER(ps.expected_anticipated_vacancy))) = LOWER(@methodOfAppointment)
        AND em_sub.emp_status=1
        AND em_sub.emp_dor BETWEEN @financialYearStart AND @financialYearEnd
        AND ps.organisation_id != 4
        AND ps.organisation_id = @organisationID
        AND post.class_id = @classID
      GROUP BY
          d.department_name,
          post.post_name,
          ps.post_code,
          em_sub.emp_name,
          em_sub.emp_dor
          ${methodOfAppointment == 'Direct Recruitment'
            ? `,ps.process_initiated_date, ps.A_notification_adv_issued_date, ps.A_exam_conducted_date, ps.A_interview_conducted_date, ps.A_selection_process_completed_date, ps.A_result_declared_date, ps.A_appointment_letter_issued_date`
            : `,ps.A_process_initiated_date, ps.A_vigilance_clr_received_date, ps.A_dpc_conducted_date, ps.A_approval_by_ca_date, ps.A_promotion_order_issued_date`
          }
      ORDER BY post.post_name
    `);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Department",
        field: "Department",
        width: 150,
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "Post Name",
        field: "Name of the Post",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 200,
      },
      {
        headerName: "Post Code",
        field: "post_code",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 120,
      },
      {
        headerName: "Current Occupant",
        field: "Current Occupant",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 180,
      },
      {
        headerName: "Date of Retirement", // Added Date of Retirement
        field: "Date of Retirement",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        width: 180,
      },
      {
        headerName: "Date on which",
        headerClass: "headercenter",
        children: dynamicDateColumns, // Dynamically assign children based on methodOfAppointment
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err.message); // Use console.error for errors
    return res.status(500).json({ error: "Internal Server Error" }); // More descriptive error
  }
}

async function getContractDetailsReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const roleID = req.params.roleID;
    const organisationID = req.params.organisationID;

    request.input("roleID", roleID);
    request.input("organisationID", organisationID);

    const result = await request.query(`
      SELECT 
        org.organisation_id,
        org.organisation_name AS [Organisation],
        cd.financial_year,

        SUM(cd.officers_direct_engagement) AS [Officers - Direct Engagement],
        SUM(cd.officers_retired_from_govt) AS [Officers - Retired from Government],
        SUM(cd.officers_retd_from_own_organ) AS [Officers - Retired from Own Organisation],
        SUM(cd.officers_through_agency) AS [Officers - Through Agency],
        SUM(cd.officers_for_ministry) AS [Officers - For Ministry],
        SUM(cd.official_total) AS [Total Officers - Overall],

        SUM(cd.non_officers_direct_engagement) AS [Non-Officers - Direct Engagement],
        SUM(cd.non_officers_retired_from_govt) AS [Non-Officers - Retired from Government],
        SUM(cd.non_officers_retd_from_own_organ) AS [Non-Officers - Retired from Own Organisation],
        SUM(cd.non_officers_through_agency) AS [Non-Officers - Through Agency],
        SUM(cd.non_officers_for_ministry) AS [Non-Officers - For Ministry],
        SUM(cd.non_off_total) AS [Total Non-Officers - Overall]

      FROM tbl_hr_contract_data cd
      INNER JOIN mmt_organisation org ON cd.organisation_id = org.organisation_id
       ${![2, 3, 4, 5].includes(Number(roleID)) ? "WHERE org.organisation_id = @organisationID" : ""}
      GROUP BY org.organisation_id, org.organisation_name, cd.financial_year
      ORDER BY org.organisation_name, cd.financial_year;
    `);

    const rowData = result.recordset;

    const columnDefs = [
      {
        headerName: 'S.No',
        field: 'S.No',
        valueGetter: 'node.rowIndex + 1',
        width: 90,
        pinned: 'left'
      },
      {
        headerName: 'Organisation',
        field: 'Organisation',
        pinned: 'left',
        width: 350,
      },
       {
        headerName: 'Financial Year',
        field: 'financial_year',
        pinned: 'left',
        width: 350,
      },
      {
        headerName: 'Officers Level',
        headerClass: 'center-header', 
        children: [
          { headerName: 'Direct Engagement', field: 'Officers - Direct Engagement', },
          { headerName: 'Retired from Government', field: 'Officers - Retired from Government',width : 350 },
          { headerName: 'Retired from Own Organisation', field: 'Officers - Retired from Own Organisation',width : 350 },
          { headerName: 'Through Agency', field: 'Officers - Through Agency' },
          { headerName: 'For Ministry', field: 'Officers - For Ministry' },
          { headerName: 'Overall Total', field: 'Total Officers - Overall' },
        ]
      },
      {
        headerName: 'Non Officers Level',
        headerClass: 'center-header',
        children: [
          { headerName: 'Direct Engagement', field: 'Non-Officers - Direct Engagement' },
          { headerName: 'Retired from Government', field: 'Non-Officers - Retired from Government',width : 350 },
          { headerName: 'Retired from Own Organisation', field: 'Non-Officers - Retired from Own Organisation',width : 350 },
          { headerName: 'Through Agency', field: 'Non-Officers - Through Agency' },
          { headerName: 'For Ministry', field: 'Non-Officers - For Ministry' },
          { headerName: 'Overall Total', field: 'Total Non-Officers - Overall' },
        ]
      }
    ];
   
    res.status(200).json({ columnDefs, rowData });

  } catch (error) {
    console.error("Error :", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export default {
  getTotalManpowerClassWiseReport,
  getHRGenderWiseCountMajorReport,
  getTotalManpowerSanctionActual,
  hrAbstarctReport,
  hrOverviewReport,
  hrFirstReport,
  hrSecondReport,
  hrFourthReport,
  hrFourthDetailedReport,
  hrFifthReport,
  hrFifthDetailedReport,
  hrSixthReport,
  hrSixthDetailedReport,
  hrSeventhReport,
  hrSeventhDetailedReport,
  hrDrilledDirectRecruitmentReport,
  detailedHrReport,
  hrDrilledPromotionReport,
  hrDrilledDeputationReport,
  hrDrilledCompositeMethodReport,
  hrEighthReport,
  hrEighthDetailedReport,
  hrNinethReport,
  hrNinethDetailedReport,
  hrDetailedRevivalReport,
  hrDetailedStatusReport,
  hrDrilledTransferReport,
  detailedHrStatusFillingReport,
  hrDetailedAbstarctReport,
  getHRStaffingOverviewReport,
  getTrainingDetailsReport,
  hrAnticipatedReportData,
  getContractDetailsReport
};