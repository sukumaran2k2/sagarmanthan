import nodemailer from "nodemailer";
import { pool } from "../db.js";

async function sendEmail(toAddress, cc, subject, body, req, res)
{
    try
    {
        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            auth: {
            user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
            pass: "Sagarmanthan@123",
            },
        });
       
        let footer = `  <br><br>
                    In case you face any difficulty, please reach out to the helpline via email.
                    <br>
                    <a href="mailto:sagarmanthansupport@ntcpwc.iitm.ac.in">sagarmanthansupport@ntcpwc.iitm.ac.in</a>
                    <br><br>
                    This is an auto-generated email. Please do not reply.
                    <br><br>
                    Regards,
                    <br>
                    Sagarmanthan Team`;
        body += footer;

        const mailOptions = {
            from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
            to: toAddress,
            subject: subject,
            html: body,
          };

        //   console.log(to, cc, subject, body,mailOptions, "to, cc, subject, body , alertID")
     
        await transporter.sendMail(mailOptions);
        console.log("Email Sent Successfully");
        return res.sendStatus(200);
    }
    catch (emailError) 
    {
        console.error("Error sending email:", emailError);
        return res.sendStatus(500);
    }    
}

async function generalMailAlertForHR(req, res = null) {
  const conn = await pool;
  const request = conn.request();
  const sentOrgIdsQuery = await request.query(`
    SELECT organisation_id
    FROM tbl_hr_alert_status
    WHERE general_alert_date IS NOT NULL
      AND YEAR(general_alert_date) = YEAR(GETDATE())
      AND MONTH(general_alert_date) = MONTH(GETDATE())
  `);

  const sentOrgIds = sentOrgIdsQuery.recordset.map(row => row.organisation_id);

  let orgQuery = `SELECT DISTINCT u.organisation_id, u.email
    FROM tbl_user u`;

  if (sentOrgIds.length > 0) {
    orgQuery += `
      AND u.organisation_id NOT IN (${sentOrgIds.join(',')})
    `;
  }

  const orgEmailQuery = await request.query(orgQuery);

  const groupedEmails = {};
  orgEmailQuery.recordset.forEach(row => {
    if (!groupedEmails[row.organisation_id]) groupedEmails[row.organisation_id] = [];
    groupedEmails[row.organisation_id].push(row.email);
  });

  if (Object.keys(groupedEmails).length === 0) {
    if (res) return res.sendStatus(204);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    auth: {
      user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
      pass: "Sagarmanthan@123",
    },
  });

  const subject = 'Automated Reminder: Request to Complete HR Data Entry for This Month - Sagarmanthan Portal';
  const body = `Dear Sir/Madam,
  <br><br>
  This is an automated reminder to complete the Human Resources (HR) data updates for the current month on the Sagarmanthan Portal.
  <br><br>
  Users are requested to:
  <br><br>
  <ul>
    <li>Complete the required data entry under the HR Administration section.</li>
    <li>Update Vacancy Management details within the HR Module, as applicable.</li>
  </ul>
  <br>
  Timely and accurate submission of HR data is essential to ensure the integrity of records and the smooth functioning of HR processes across the portal.
  <br>
  Kindly ensure that the necessary updates are completed at the earliest.
  <br>
  For any assistance or clarification, please contact the Sagarmanthan support team.
  <br><br>
  <strong>Sagarmanthan Portal: </strong> <a href="https://www.ntcpwcit.in/sagarmanthan">www.ntcpwcit.in/sagarmanthan</a>
  <br><br>
  <i>Please note: If the data has already been entered, please ignore this email. This is an automated system-generated message. Please do not reply.</i>
  <br><br>
  Regards,<br>
  Sagarmanthan Team
  `;

  for (const [orgId, emails] of Object.entries(groupedEmails)) {
    try {
      await transporter.sendMail({
        from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
        to: emails.join(','),
        subject,
        html: body,
      });

      await request.query(`
        MERGE tbl_hr_alert_status AS target
        USING (SELECT ${orgId} AS organisation_id) AS source
        ON target.organisation_id = source.organisation_id
        WHEN MATCHED THEN
          UPDATE SET general_alert_date = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (organisation_id, general_alert_date) VALUES (${orgId}, GETDATE());
      `);
    } catch (err) {
      //console.error(`General alert failed for org ${orgId}:`, err);
    }
  }

  if (res) return res.sendStatus(200);
}

async function pendingMailAlertForHR(req, res = null) {
  const conn = await pool;
  const request = conn.request();

  const sentOrgIdsQuery = await request.query(`
    SELECT organisation_id
    FROM tbl_hr_alert_status
    WHERE pending_alert_date IS NOT NULL
    AND YEAR(pending_alert_date) = YEAR(GETDATE())
    AND MONTH(pending_alert_date) = MONTH(GETDATE())
  `);

  const sentOrgIds = sentOrgIdsQuery.recordset.map(row => row.organisation_id);

  const ALLOWED_ORG_IDS = [1, 2, 3, 4, 5, 6, 7, 55, 54, 58];

  let incompleteQueries = `
    SELECT DISTINCT u.organisation_id, u.email
    FROM tbl_user u
    WHERE u.organisation_id IN (${ALLOWED_ORG_IDS.join(',')})
      AND u.organisation_id NOT IN (
      SELECT mmt.organisation_id
      FROM mmt_organisation mmt
      LEFT JOIN tbl_employee_transaction_details et
        ON mmt.organisation_id = et.emp_working_org_id
      LEFT JOIN tbl_hr_post_strength ps
        ON mmt.organisation_id = ps.organisation_id
      WHERE et.updated_date IS NOT NULL
        AND et.updated_date BETWEEN DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        AND EOMONTH(GETDATE())
        AND ps.updated_date IS NOT NULL
        AND ps.updated_date BETWEEN DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        AND EOMONTH(GETDATE())
    )
`;

if (sentOrgIds.length > 0) {
  incompleteQueries += `
    AND u.organisation_id NOT IN (${sentOrgIds.join(',')})
  `;
}

const incompleteQuery = await request.query(incompleteQueries);

  const groupedEmails = {};
  incompleteQuery.recordset.forEach(row => {
    if (!groupedEmails[row.organisation_id]) groupedEmails[row.organisation_id] = [];
    groupedEmails[row.organisation_id].push(row.email);
  });

  if (Object.keys(groupedEmails).length === 0) {
    if (res) return res.sendStatus(204);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    auth: {
      user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
      pass: "Sagarmanthan@123",
    },
  });

  const subject = 'Automated Reminder: HR Data Entry for This Month is Pending – Sagarmanthan Portal';
  const body = `Dear Sir/Madam,
      <br>
      This is an automated reminder to complete the Human Resources (HR) data entry for the current month by performing the required actions under the HR Administration section and updating the Vacancy Management in the HR Module.
      <br>
      Timely and accurate data entry is essential for maintaining up-to-date records and ensuring the smooth functioning of HR processes.
      <br><br>
      Kindly ensure the necessary updates are completed at the earliest and confirm once they have been successfully completed.
      <br><br>
      Should you require any assistance or have any queries, please do not hesitate to contact the Sagarmanthan support team.
      <br><br>
      <strong>Sagarmanthan Portal: </strong> <a href="www.ntcpwcit.in/sagarmanthan">www.ntcpwcit.in/sagarmanthan</a>
      <br><br>
      Please note: This is an automated system-generated message. Please do not reply to this email.
      <br><br>
      Regards,<br>
      Sagarmanthan Team
  `;

  for (const [orgId, emails] of Object.entries(groupedEmails)) {
    try {
      const mailOptions = {
        from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
        to: emails.join(','),
        subject,
        html: body,
      };
      await transporter.sendMail(mailOptions);
      await request.query(`
        MERGE tbl_hr_alert_status AS target
        USING (SELECT ${orgId} AS organisation_id) AS source
        ON target.organisation_id = source.organisation_id
        WHEN MATCHED THEN
          UPDATE SET pending_alert_date = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (organisation_id, pending_alert_date) VALUES (${orgId}, GETDATE());
      `);
    } catch (err) {
      //console.error(`Failed for org ${orgId}:`, err);
    }
  }

  if (res) return res.sendStatus(200);
}

async function resetAlertDate(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    await request.query(`
      UPDATE tbl_hr_alert_status
      SET general_alert_date = NULL,
          pending_alert_date = NULL
    `);

    if (res) return res.status(200).send("Alert dates reset successfully.");
  } catch (error) {
    if (res) return res.status(500).send("Failed to reset alert dates.");
  }
}

function getHRMonthRange(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth(); 

  let startDate, endDate;

  if (today.getDate() >= 11) {
    startDate = new Date(year, month, 11);
    endDate = new Date(year, month + 1, 10, 23, 59, 59);
  } else {
    startDate = new Date(year, month - 1, 11);
    endDate = new Date(year, month, 10, 23, 59, 59);
  }

  return { startDate, endDate };
}

async function checkLastUpdateOfEntryInHR() {
  try {
    const { startDate, endDate } = getHRMonthRange();
    const conn = await pool;

    const organisationIds = [1,2,3,4,5,6,7,8,9,10,11,12,16,54,55,74];

    const strengthResult = await conn.request().query(`
      SELECT 
        vacant_or_filled,
        organisation_id,
        organisation_name
      FROM tbl_hr_post_strength
      WHERE organisation_id IN (${organisationIds.join(",")})
    `);

    const reminderList = [];

    for (const row of strengthResult.recordset) {
      const request = conn.request();

      request.input("orgId", row.organisation_id);
      request.input("startDate", startDate);
      request.input("endDate", endDate);

      let query = `
        SELECT 1
        FROM tbl_employee_transaction_details
        WHERE emp_working_org_id = @orgId
      `;

      if (row.vacant_or_filled === "vacant") {
        query += `
          AND created_date BETWEEN @startDate AND @endDate
        `;
      } else if (row.vacant_or_filled === "filled") {
        query += `
          AND updated_date BETWEEN @startDate AND @endDate
        `;
      }

      const result = await request.query(query);

      // No activity → reminder
      if (result.recordset.length === 0) {
        reminderList.push({
          organisation_id: row.organisation_id,
          organisation_name: row.organisation_name,
          status: row.vacant_or_filled,
          period: `${startDate.toDateString()} - ${endDate.toDateString()}`
        });
      }
    }

    return reminderList;

  } catch (error) {
    console.error("HR Reminder Error:", error);
    throw error;
  }
}

async function PendingMailOrgOrganisations(res = null) {
  try {
    const conn = await pool;
    const request = conn.request();

    const allOrgsResult = await request.query(`
      SELECT DISTINCT organisation_id
      FROM mmt_organisation
      WHERE organisation_id IN (23,15,27,21,24,19,25,22,16,17,18,20)
    `);
    const allOrgs = allOrgsResult.recordset.map(r => r.organisation_id);

    const sentOrgIdsResult = await request.query(`
      SELECT organisation_id
      FROM tbl_hr_alert_status
      WHERE pending_alert_date IS NOT NULL
        AND YEAR(pending_alert_date) = YEAR(GETDATE())
        AND MONTH(pending_alert_date) = MONTH(GETDATE())
    `);
    const sentOrgIds = sentOrgIdsResult.recordset.map(r => r.organisation_id);

    const today = new Date();
    let prevMonth = today.getMonth(); // 0–11
    let year = today.getFullYear();
    if (prevMonth === 0) { prevMonth = 12; year -= 1; }

    request.input("year", year);
    request.input("month", prevMonth);
    const uploadedResult = await request.query(`
      SELECT DISTINCT organisation_id
      FROM tbl_hr_other_org_vacancy_details
      WHERE Uploaded_year = @year AND Uploaded_month = @month
    `);
    const uploadedOrgs = uploadedResult.recordset.map(r => r.organisation_id);

    const missingOrgs = allOrgs.filter(id => !uploadedOrgs.includes(id) && !sentOrgIds.includes(id));

    if (missingOrgs.length === 0) {
      if (res) return res.sendStatus(204);
      return [];
    }

    const emailResult = await request.query(`
      SELECT organisation_id, email
      FROM tbl_user
      WHERE organisation_id IN (${missingOrgs.join(",")})
    `);

    const groupedEmails = {};
    emailResult.recordset.forEach(row => {
      if (!groupedEmails[row.organisation_id]) groupedEmails[row.organisation_id] = [];
      groupedEmails[row.organisation_id].push(row.email);
    });

    if (Object.keys(groupedEmails).length === 0) {
      if (res) return res.sendStatus(204);
      return [];
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
        pass: "Sagarmanthan@123",
      },
    });

    const subject = "Automated Reminder: HR (Other Org) Data Entry Pending - Sagarmanthan Portal";
    const body = `
      Dear Sir/Madam,<br><br>
      This is an automated reminder to complete the HR 
      data entry for the previous month
      under the HR (Other Org) modules.<br><br>
      Kindly ensure the necessary updates are completed at the earliest.<br><br>
      <strong>Sagarmanthan Portal:</strong>
      <a href="https://www.ntcpwcit.in/sagarmanthan">www.ntcpwcit.in/sagarmanthan</a><br><br>
      <i> Please Note : This is an automated system-generated message. Please do not reply to this email.</i><br><br>
      Regards,<br>
      Sagarmanthan Team
    `;

    for (const [orgId, emails] of Object.entries(groupedEmails)) {
      try {
        await transporter.sendMail({
          from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
          to: emails.join(","),
          subject,
          html: body,
        });

        await request.query(`
          MERGE tbl_hr_alert_status AS target
          USING (SELECT ${orgId} AS organisation_id) AS source
          ON target.organisation_id = source.organisation_id
          WHEN MATCHED THEN
            UPDATE SET pending_alert_date = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (organisation_id, pending_alert_date)
            VALUES (${orgId}, GETDATE());
        `);

      } catch (err) {
        console.error(`Failed to send email to org ${orgId}:`, err);
      }
    }

    if (res) return res.sendStatus(200);
    return missingOrgs;

  } catch (error) {
    console.error("Pending HR Mail Alert Error:", error);
    if (res) return res.status(500).send("Internal Server Error");
    throw error;
  }
}

async function checkOrganisationsLastDataUpload() {
  try {
    const conn = await pool;

    const today = new Date();
    let prevMonth = today.getMonth(); // 0–11 (previous month)
    let year = today.getFullYear();

    if (prevMonth === 0) {
      prevMonth = 12;
      year -= 1;
    }

    const allOrgsRequest = conn.request();
    const allOrgsResult = await allOrgsRequest.query(`
      SELECT DISTINCT organisation_id
      FROM mmt_organisation
      WHERE organisation_id IN (23,15,27,21,24,19,25,22,16,17,18,20)
    `);

    const allOrgs = allOrgsResult.recordset.map(
      r => r.organisation_id
    );

    const uploadedRequest = conn.request();
    uploadedRequest.input("year", year);
    uploadedRequest.input("month", prevMonth);

    const uploadedResult = await uploadedRequest.query(`
      SELECT DISTINCT organisation_id
      FROM tbl_hr_other_org_vacancy_details
      WHERE Uploaded_year = @year
        AND Uploaded_month = @month
    `);

    const uploadedOrgs = uploadedResult.recordset.map(
      r => r.organisation_id
    );

    const missingOrgs = allOrgs.filter(
      id => !uploadedOrgs.includes(id)
    );

    return {
      year,
      month: prevMonth,
      missingOrganizations: missingOrgs
    };

  } catch (error) {
    console.error("HR Reminder Error:", error);
    throw error;
  }
}

export { sendEmail,generalMailAlertForHR,pendingMailAlertForHR,resetAlertDate,checkLastUpdateOfEntryInHR,PendingMailOrgOrganisations,checkOrganisationsLastDataUpload};

