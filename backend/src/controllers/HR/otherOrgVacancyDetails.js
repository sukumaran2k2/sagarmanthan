import { pool } from "../../db.js";
import sql from 'mssql';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getOtherOrgVacancyDetails(req, res) {
    try {
        const organisationID = req.params.organisationID;
        let year = parseInt(req.query.year);
        let month = parseInt(req.query.month);

        const today = new Date();

        if (isNaN(year) || isNaN(month)) {
            const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
            year = lastMonthDate.getFullYear();
            month = lastMonthDate.getMonth() + 1;
        }

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
        request.input("year", year);
        request.input("month", month);

        const result = await request.query(` 
            SELECT
                vd.[department],
                vd.[post_id],
                vd.[post_name],
                vd.[class],
                COUNT(*) AS sanctioned,
                COUNT(CASE WHEN vd.vacant_or_filled != 'vacant' THEN 1 END) AS actual,
                COUNT(CASE 
                        WHEN vd.vacant_or_filled = 'vacant' AND DATEADD(YEAR, 5, [date_of_arise]) >= GETDATE() 
                        THEN 1 
                    END) AS live_vacancy,
                COUNT(CASE 
                        WHEN vd.vacant_or_filled = 'vacant' AND DATEADD(YEAR, 5, [date_of_arise]) < GETDATE() 
                        THEN 1 
                    END) AS abolished_vacancy,
                COUNT(CASE 
                        WHEN vd.vacant_or_filled = 'vacant' 
                        THEN 1 
                    END) AS total_vacancy
            FROM tbl_hr_other_org_vacancy_details vd
            --LEFT JOIN mmt_class cls ON vd.class = cls.class_id
            WHERE vd.organisation_id = @organisationID 
              AND vd.[Uploaded_year] = @year
              AND vd.[Uploaded_month] = @month
            GROUP BY vd.[department], vd.[post_id], vd.[post_name],vd.[class]
            ORDER BY vd.[department], vd.[post_id];
        `);

        const rowData = result.recordset;
        if (!Array.isArray(rowData) || rowData.length === 0) {
            return res.status(200).json({
                rowData: [],
                message: 'No data available'
            });
        }

        res.json({ rowData });

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).send('Internal Server Error');
    }
}

async function getHRDashboardContentOtherOrgData(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);


    const today = new Date();
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    let lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    
    request.input("lastMonth", lastMonth + 1);
    request.input("lastMonthYear", lastMonthYear);

    // Dynamic WHERE clause
    let whereClause = '';
    if (organisationID !== 0 && clusterID !== 0) {
        whereClause = 'WHERE o.organisation_id = @organisationID AND o.hr_cluster_id = @clusterID AND ps.Uploaded_month = @lastMonth';
    } else if (organisationID !== 0) {
        whereClause = 'WHERE o.organisation_id = @organisationID AND ps.Uploaded_month = @lastMonth';
    } else if (clusterID !== 0) {
        whereClause = 'WHERE o.hr_cluster_id = @clusterID AND ps.Uploaded_month = @lastMonth';
    }

    try {
        const totalSanctionedAndFilledPost = `
            SELECT
                COUNT(ps.post_id) AS total_sanctioned_strength,
                COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post
            FROM tbl_hr_other_org_vacancy_details ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            ${whereClause} AND ps.Uploaded_year = @lastMonthYear
        `;

        const totalLiveVacantPost = `
            SELECT COUNT(*) AS totalLivePost
            FROM tbl_hr_other_org_vacancy_details ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise IS NOT NULL
                AND ps.Uploaded_month = @lastMonth
                AND ps.Uploaded_year = @lastMonthYear
                AND (
                    (ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise) > GETDATE()
                    OR ps.is_exemption_abolished = 1
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
        `;

        const totalAbolishedVacantPost = `
            SELECT COUNT(*) AS totalAbolishedPost
            FROM tbl_hr_other_org_vacancy_details ps
            INNER JOIN mmt_organisation o ON ps.organisation_id = o.organisation_id
            WHERE
                ps.vacant_or_filled = 'vacant'
                AND ps.date_of_arise IS NOT NULL
                AND ps.Uploaded_month = @lastMonth
                AND ps.Uploaded_year = @lastMonthYear
                AND (
                    (ps.is_exemption_abolished IS NULL OR ps.is_exemption_abolished = 0)
                    AND DATEADD(YEAR, 5, ps.date_of_arise) <= GETDATE()
                )
                ${organisationID !== 0 ? 'AND o.organisation_id = @organisationID' : ''}
                ${clusterID !== 0 ? 'AND o.hr_cluster_id = @clusterID' : ''}
        `;

        const [result1, result2, result3] = await Promise.all([
            request.query(totalSanctionedAndFilledPost),
            request.query(totalLiveVacantPost),
            request.query(totalAbolishedVacantPost),
        ]);

        res.json({
            totalSanctionedAndFilledPost: result1.recordset[0],
            totalLiveVacantPost: result2.recordset[0],
            totalAbolishedVacantPost: result3.recordset[0],
        });

    } catch (err) {
        //console.log("err", err)
        return res.status(500).json({ message: "Error occurred while fetching dashboard data" });
    }
}

async function getOtherOrgAbolishingPostWithinmonth(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    // Build dynamic WHERE conditions
    let whereClause = `
        vd.vacant_or_filled = 'vacant'
        AND vd.date_of_arise IS NOT NULL
        AND (vd.is_exemption_abolished IS NULL OR vd.is_exemption_abolished = 0)
        AND DATEADD(DAY, 30, GETDATE()) > DATEADD(YEAR, 5, vd.date_of_arise)
        AND DATEADD(YEAR, 5, vd.date_of_arise) > GETDATE()
    `;

    if (organisationID !== 0) {
        whereClause += ` AND o.organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const result = await request.query(`
            SELECT
                vd.post_id,
                vd.post_name,
				        vd.class,
				        vd.department,
                FORMAT(vd.date_of_arise, 'dd-MM-yyyy') AS date_of_arise,
                FORMAT(DATEADD(YEAR, 5, vd.date_of_arise), 'dd-MM-yyyy') AS abolish_date
            FROM tbl_hr_other_org_vacancy_details vd
            JOIN mmt_organisation o ON o.organisation_id = vd.organisation_id
            WHERE ${whereClause} 
            ORDER BY vd.date_of_arise ASC;
        `);

        res.json(result.recordset);

    } catch (err) {
        // console.log("err", err)
        return res.status(500).json({ message: "Error occurred while fetching abolishing post data"});
    }
}

async function getOtherOrgEmpGoingToRetireWithinSixMonths(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    let year = parseInt(req.query.year);
    let month = parseInt(req.query.month);

    const today = new Date();

    if (isNaN(year) || isNaN(month)) {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        year = lastMonthDate.getFullYear();
        month = lastMonthDate.getMonth() + 1; 
    }

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    // Build WHERE clause dynamically
    let whereClause = `
        vd.date_of_retirement > GETDATE() AND 
        vd.date_of_retirement <= DATEADD(MONTH, 6, GETDATE())
    `;

    if (organisationID !== 0) {
        whereClause += ` AND vd.organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const result = await request.query(`
            SELECT
              vd.name_of_employee,
				      vd.post_name,
				      vd.class,
				      vd.department,
              vd.staff_reference_id,
                FORMAT(vd.date_of_retirement, 'dd-MM-yyyy') AS date_of_retirement
            FROM dbo.tbl_hr_other_org_vacancy_details vd
            JOIN dbo.mmt_organisation o ON o.organisation_id = vd.organisation_id
            WHERE ${whereClause} 
            AND vd.[Uploaded_year] = @year
            AND vd.[Uploaded_month] = @month
            ORDER BY vd.date_of_retirement ASC;
        `);

        res.json(result.recordset);

    } catch (err) {
        // console.log("err", err)
        return res.status(500).json({message: "Error occurred while fetching retiring employees data"});
    }
}

async function getOtherOrgGenderWiseCountByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    let year = parseInt(req.query.year);
    let month = parseInt(req.query.month);

    const today = new Date();

    if (isNaN(year) || isNaN(month)) {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        year = lastMonthDate.getFullYear();
        month = lastMonthDate.getMonth() + 1; 
    }

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    let whereClause = ``;

    if (organisationID !== 0) {
        whereClause += `organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                gender,
                COUNT(*) AS count_of_emp
            FROM tbl_hr_other_org_vacancy_details em
            ${clusterID !== 0 ? 'JOIN mmt_organisation o ON o.organisation_id = em.organisation_id' : ''}
            WHERE ${whereClause} AND em.vacant_or_filled = 'filled'
            AND em.[Uploaded_year] = @year
            AND em.[Uploaded_month] = @month
            GROUP BY gender
        `;

        const genderWiseCount = await request.query(query);

        res.json(genderWiseCount.recordset);
    } catch (err) {
        console.log("err", err)
        return res.status(500).json({ message: "Error occurred while fetching gender-wise employee count" });
    }
}

async function getOtherOrgCommunityWiseCountByOrg(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    let year = parseInt(req.query.year);
    let month = parseInt(req.query.month);

    const today = new Date();

    if (isNaN(year) || isNaN(month)) {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        year = lastMonthDate.getFullYear();
        month = lastMonthDate.getMonth() + 1; 
    }

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    let whereClause = '';

    if (organisationID !== 0) {
        whereClause += `organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                COUNT(CASE WHEN community = 'SC' THEN 1 END) AS sc_count,
                COUNT(CASE WHEN community = 'ST' THEN 1 END) AS st_count,
                COUNT(CASE WHEN community = 'UR' THEN 1 END) AS ur_count,
                COUNT(CASE WHEN community = 'OB' THEN 1 END) AS ob_count,
                COUNT(CASE WHEN community = 'OBC' THEN 1 END) AS obc_count,
                COUNT(CASE WHEN community = 'EWS' THEN 1 END) AS ews_count,
                COUNT(*) AS total_count
            FROM tbl_hr_other_org_vacancy_details em
            ${clusterID !== 0 ? 'JOIN mmt_organisation o ON o.organisation_id = em.organisation_id' : ''}
            WHERE ${whereClause}  AND em.vacant_or_filled = 'filled'
            AND em.[Uploaded_year] = @year
            AND em.[Uploaded_month] = @month
        `;

        const communityWiseCount = await request.query(query);
        res.json(communityWiseCount.recordset);
    } catch (err) {
        // console.log('err', err)
        return res.status(500).json({ message: "Error occurred while fetching community-wise employee count" });
    }
}

async function getOtherOrgExperiencedEmpCount(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    let year = parseInt(req.query.year);
    let month = parseInt(req.query.month);

    const conn = await pool;
    const request = conn.request();

    const today = new Date();

    if (isNaN(year) || isNaN(month)) {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        year = lastMonthDate.getFullYear();
        month = lastMonthDate.getMonth() + 1; 
    }

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    // Construct WHERE clause dynamically
    let whereClause = ``;

    if (organisationID !== 0) {
        whereClause += `organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const query = `
            SELECT
                whether_ex_serviceman,
                gender,
                COUNT(*) AS emp_count
            FROM dbo.tbl_hr_other_org_vacancy_details em
            ${clusterID !== 0 ? 'JOIN dbo.mmt_organisation o ON o.organisation_id = em.organisation_id' : ''}
            WHERE ${whereClause}  AND em.vacant_or_filled = 'filled'
            AND em.[Uploaded_year] = @year
            AND em.[Uploaded_month] = @month
            GROUP BY whether_ex_serviceman, gender
        `;

        const experienceCount = await request.query(query);

        res.json(experienceCount.recordset);
    } catch (err) {
        // console.log("err", err)
        return res.status(500).json({ message: "Error occurred while fetching experienced employee count" });
    }
}

async function getOtherOrgPwbdWiseCount(req, res) {
    const organisationID = parseInt(req.params.organisationID);
    const clusterID = parseInt(req.params.clusterID);

    let year = parseInt(req.query.year);
    let month = parseInt(req.query.month);

    const today = new Date();

    if (isNaN(year) || isNaN(month)) {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        year = lastMonthDate.getFullYear();
        month = lastMonthDate.getMonth() + 1; 
    }

    const conn = await pool;
    const request = conn.request();

    if (organisationID !== 0) request.input("organisationID", organisationID);
    if (clusterID !== 0) request.input("clusterID", clusterID);

    request.input("year", year);
    request.input("month", month);

    // Build WHERE clause dynamically
    let whereClause = ``;

    if (organisationID !== 0) {
        whereClause += `em.organisation_id = @organisationID`;
    }

    if (clusterID !== 0) {
        whereClause += ` AND o.hr_cluster_id = @clusterID`;
    }

    try {
        const disabilityCount = await request.query(`
            SELECT
                whether_pwbd,
                COUNT(CASE WHEN gender = 'Male' THEN 1 END) AS male_count,
                COUNT(CASE WHEN gender = 'Female' THEN 1 END) AS female_count,
                COUNT(CASE WHEN gender = 'Transgender' THEN 1 END) AS transgender_count,
                COUNT(*) AS total_count
            FROM dbo.tbl_hr_other_org_vacancy_details em
            ${clusterID !== 0 ? 'JOIN dbo.mmt_organisation o ON o.organisation_id = em.organisation_id' : ''}
            WHERE ${whereClause} AND em.vacant_or_filled = 'filled'
            AND em.[Uploaded_year] = @year
            AND em.[Uploaded_month] = @month
            GROUP BY whether_pwbd
        `);

        res.json(disabilityCount.recordset);

    } catch (err) {
        // console.log("err", err)
        return res.status(500).json({ message: "Error occurred while fetching PwBD-wise count" });
    }
}

async function getLastUploadDate(req, res) {
    const organisationID = parseInt(req.params.organisationID);

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        const result = await request.query(`
            SELECT TOP 1 upload_date AS lastUploadDate
            FROM tbl_hr_other_org_vacancy_details
            WHERE organisation_id = @organisationID
            ORDER BY upload_date DESC
        `);

        const lastUploadDate = result.recordset[0]?.lastUploadDate;

        if (lastUploadDate) {
            res.json({ lastUploadDate });
        } else {
            res.status(200).json({ message: "No upload data found" });
        }

    } catch (err) {
        // console.error("Error fetching last upload date:", err);
        res.status(500).json({ message: "Error occurred while fetching data" });
    }
}

async function getDataFromVacancyDetails(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID);
        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        // First get the latest year and month for this organisation
        const latestDateResult = await request.query(`
            SELECT TOP 1 Uploaded_year, Uploaded_month
            FROM tbl_hr_other_org_vacancy_details vd
            --LEFT JOIN mmt_class cls ON vd.class = cls.class_id
            WHERE organisation_id = @organisationID
            ORDER BY Uploaded_year DESC, Uploaded_month DESC
        `);

        if (latestDateResult.recordset.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const { Uploaded_year, Uploaded_month } = latestDateResult.recordset[0];

        // Now fetch data only for the latest year and month
        request.input("Uploaded_year", Uploaded_year);
        request.input("Uploaded_month", Uploaded_month);

        const result = await request.query(`
            SELECT  
            vd.Uploaded_year As [Year], 
            vd.Uploaded_month As [Month], 
            vd.department As [Department], 
            vd.post_id As [Post ID], 
            vd.post_name As [Post Name],
            vd.class As [Class], 
            vd.vacant_or_filled As [Vacant or Filled], 
            vd.date_of_arise As [Date of Arise in Vacancy], 
            vd.name_of_employee As [Employee Name],
            vd.staff_reference_id As [Employee Reference ID], 
            vd.date_of_retirement As [Date of Retirement]
            FROM [dbo].[tbl_hr_other_org_vacancy_details] vd
            INNER JOIN mmt_organisation org ON vd.organisation_id = org.organisation_id
            --LEFT JOIN mmt_class cls ON vd.class = cls.class_id
            WHERE vd.organisation_id = @organisationID
              AND vd.Uploaded_year = @Uploaded_year
              AND vd.Uploaded_month = @Uploaded_month
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ columnDefs: [], rowData: [] });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
        }));

        res.json({ columnDefs, rowData });

    } catch (err) {
        // console.error("error", err);
        res.status(500).send('Internal Server Error');
    }
}



async function getFileUploadDetails(req, res) {

    const organisationID = parseInt(req.params.organisationID);

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`SELECT 
            fvd.Uploaded_File_id AS [File ID],
            fvd.Uploaded_year AS [Financial Year],
            fvd.uploaded_month AS [Month],
            fvd.file_name AS [File Name],
            usr.name AS [Uploaded By],
            fvd.uploaded_date AS [Date of Upload]
        FROM 
            tbl_hr_other_org_vacancy_file_details AS fvd
        INNER JOIN 
            tbl_user AS usr ON fvd.uploaded_by = usr.user_id
        INNER JOIN 
            mmt_organisation AS org ON fvd.organisation_id = org.organisation_id
        WHERE 
            fvd.organisation_id = @organisationID;

        `);

        const rowData = result.recordset;
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this month and year' });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });


    } catch (error) {
        // console.log("error", error)
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); 
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

const uploadDestination = "./fileuploads/vacancy_details";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/vacancy_details");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

function excelDateToJSDate(value) {
    if (!value || String(value).trim() === '') return null;

    if (value instanceof Date) return value;

    if (typeof value === 'number') {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return date;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        const ddmmyyyy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddmmyyyy) {
            return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
        }

        const ddmmyyyySlash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (ddmmyyyySlash) {
            return new Date(`${ddmmyyyySlash[3]}-${ddmmyyyySlash[2]}-${ddmmyyyySlash[1]}`);
        }

        const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
        if (iso) {
            return new Date(trimmed);
        }
        return new Date(trimmed); 
    }
    return null;
}

function normalizeDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
    // Normalize to midnight UTC to avoid time comparison issues
    return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ));
}

function normalizeGender(value) {
    const val = String(value || '')
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase();

    if (val === 'male') return 'Male';
    if (val === 'female') return 'Female';
    if (val === 'other' || val === 'others') return 'Other';
    return null;
}

function isValidYesNo(value) {
    const v = String(value || '')
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase();
    return v === 'yes' || v === 'no';
}

function yesNoToInt(value) {
    return String(value || '')
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase() === 'yes' ? 1 : 0;
}

async function fileUploadVacancyDetails(req, res) {
    let transaction;
    try {
        const conn = await pool;
        transaction = new sql.Transaction(conn);
 
        await transaction.begin();
 
        const { financialYear, month, userID ,organisationID} = req.body;
        const uniqueFileName = req.uniqueFileName;
 
        // Check if data already exists
        const checkResult = await transaction.request().query(`
            SELECT COUNT(*) AS count
            FROM tbl_hr_other_org_vacancy_details
            WHERE Uploaded_month = '${month}' AND Uploaded_year = ${financialYear} AND organisation_id = ${organisationID};
        `);
 
        if (checkResult.recordset[0].count > 0) {
            const storedFileID = await transaction.request().query(`
                SELECT MAX(Entry_id) AS File_Id
                FROM tbl_hr_other_org_vacancy_details
                WHERE Uploaded_month = '${month}' AND Uploaded_year = ${financialYear} AND organisation_id = ${organisationID};
            `);
            const replaceFileID = storedFileID.recordset[0].File_Id;
 
            await transaction.rollback();
            return res.status(409).json({
                error: "Record already exists for the specified financial year and month.",
                replaceFileID,
            });
        }
 
        // Read Excel file
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
 
        const requiredHeaders = [
            'Department','Post ID', 'Post Name', 'Class', 'Vacant or filled', 'Date of Arise in Vacancy', 'Employee Joining Date',
            'Name of Employee', 'Should this post be expempted from Abolishment?', 'Staff Reference ID / Personnel Number',
            'Aadhar Number', 'Gender', 'Domicile State', 'Community', 'Religion', 'Date of Birth', 'Date of Retirement',
            'Whether PwBD?', 'Whether Ex-Serviceman Personnal?', 'Payscale Range'
        ];
 
        function normalizeHeader(header) {
        return header
            .replace(/\s+/g, ' ')     // collapse multiple spaces
            .replace(/[-–—]/g, '-')   // unify dash types
            .trim()
            .toLowerCase();
        }
 
        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(normalizeHeader(header))));
        const missingHeaders = requiredHeaders.filter(header => !headers.has(normalizeHeader(header)));
 
        if (missingHeaders.length > 0) {
            return res.status(400).json({ error: `Missing or mismatched headers: ${missingHeaders.join(', ')}` });
        }
 
        // Insert into file metadata table
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
 
        await transaction.request().query(`
            INSERT INTO tbl_hr_other_org_vacancy_file_details (Uploaded_year,uploaded_month,file_name, uploaded_by, uploaded_date,organisation_id)
            VALUES ('${financialYear}','${month}','${uniqueFileName}', ${userID}, '${formattedDate}','${organisationID}')
        `);
 
        const fileIdResult = await transaction.request().query(`
            SELECT TOP 1 Uploaded_File_id FROM tbl_hr_other_org_vacancy_file_details
            WHERE file_name = '${uniqueFileName}' ORDER BY Uploaded_File_id DESC
        `);
 
        const fileId = fileIdResult.recordset[0].Uploaded_File_id;
 
        // const classesResult = await transaction.request().query(`SELECT class_id, class FROM mmt_class`);
        // const classMap = {};
        // classesResult.recordset.forEach(row => {
        //     classMap[row.class.trim()] = row.class_id;
        // });
 
        const seenStaffIDs = new Set();
        // Insert each row
        for (const row of data) {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                trimmedRow[header.trim()] = row[header];
            });
 
            function yesNoToInt(value) {
                return String(value || '').trim().toLowerCase() === 'yes' ? 1 : 0;
            }
 
            // Validate mandatory fields
            const mandatoryFields = [
                'Department',
                'Post ID',
                'Post Name',
                'Class',
                'Vacant or filled',
                'Should this post be expempted from Abolishment?'
            ];
 
            const missingMandatory = mandatoryFields.filter(field => {
                const value = trimmedRow[field];
                return value === undefined || value === null || String(value).trim() === '';
            });
 
            if (missingMandatory.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `Missing mandatory field(s): ${missingMandatory.join(', ')} in one or more rows.`
                });
            }
 
            const vacancyStatus = trimmedRow['Vacant or filled'].trim().toLowerCase();
            const staffID = String(trimmedRow['Staff Reference ID / Personnel Number'] || '').trim();
 
            if(vacancyStatus === 'filled'){
                 if (!staffID) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `Staff Reference ID / Personnel Number is required for filled posts.`
                    });
                }
 
                if (seenStaffIDs.has(staffID)) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `Duplicate Staff Reference ID found for filled post: ${staffID}`
                    });
                }
                seenStaffIDs.add(staffID);
            }
   
            // If 'Filled', validate additional fields
            if (vacancyStatus === 'filled') {
                const filledRequiredFields = [
                    'Employee Joining Date',
                    'Name of Employee',
                    'Staff Reference ID / Personnel Number',
                    'Gender',
                    'Domicile State',
                    'Community',
                    'Religion',
                    'Date of Birth',
                    'Date of Retirement',
                    'Whether PwBD?',
                    'Whether Ex-Serviceman Personnal?',
                    'Payscale Range'
                ];
 
                const missingFilledFields = filledRequiredFields.filter(field => {
                    const value = trimmedRow[field];
                    return value === undefined || value === null || String(value).trim() === '';
                });
 
                if (missingFilledFields.length > 0) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `For a 'Filled' post, these fields are required: ${missingFilledFields.join(', ')}`
                    });
                }
                // Standardize Gender
                const gender = normalizeGender(trimmedRow['Gender']);
                if (!gender) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `'Gender' must be one of 'Male', 'Female', or 'Other'.`
                    });
                }
 
                trimmedRow['Gender'] = gender;
 
                const exServiceman = trimmedRow['Whether Ex-Serviceman Personnal?'];
                if (!isValidYesNo(exServiceman)) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `'Whether Ex-Serviceman Personnal?' must be 'Yes' or 'No'.`
                });
 
            }
            }else if (vacancyStatus === 'vacant') {
            // For 'Vacant', Date of Arise is required
            const dateOfArise = trimmedRow['Date of Arise in Vacancy'];
            if (!dateOfArise || String(dateOfArise).trim() === '') {
                await transaction.rollback();
                return res.status(400).json({
                    error: `'Date of Arise in Vacancy' is required for 'Vacant' posts.`
                });
            }
            } else {
                await transaction.rollback();
                return res.status(400).json({
                    error: `Invalid value for 'Vacant or filled'. Expected 'Filled' or 'Vacant'.`
                });
            }
 
            function isValidVacantFilled(value) {
                const val = String(value || '').trim().toLowerCase();
                return val === 'vacant' || val === 'filled';
            }
 
            function isValidYesNo(value) {
                const val = String(value || '').trim().toLowerCase();
                return val === 'yes' || val === 'no';
            }
 
            function normalizeGender(value) {
                const val = String(value || '').trim().toLowerCase();
 
                if (val === 'male') return 'Male';
                if (val === 'female') return 'Female';
                if (val === 'other' || val === 'others') return 'Other';
                return null;
            }
 
            const vf = trimmedRow['Vacant or filled'];
            if (!isValidVacantFilled(vf)) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `'Vacant or filled' must be either 'Vacant' or 'Filled'.`
                });
            }
 
            const exemption = trimmedRow['Should this post be expempted from Abolishment?'];
            if (!isValidYesNo(exemption)) {
                await transaction.rollback();
                return res.status(400).json({
                    error: `'Should this post be expempted from Abolishment?' must be 'Yes' or 'No'.`
                });
            }
 
            // Map class name to class_id
            // const className = trimmedRow['Class'].trim();
            // const classId = classMap[className];
 
            // if (!classId) {
            //     return res.status(400).json({ error: `Invalid Class value: ${className}` });
            // }
 
            const DateOfArise = excelDateToJSDate(trimmedRow['Date of Arise in Vacancy']);
            const EmployeeJoiningDate = excelDateToJSDate(trimmedRow['Employee Joining Date']);
            const DateOfBirth = excelDateToJSDate(trimmedRow['Date of Birth']);
            const DateOfRetirement = excelDateToJSDate(trimmedRow['Date of Retirement']);

            const arise = normalizeDate(DateOfArise);
            const joining = normalizeDate(EmployeeJoiningDate);

            // Only validate if BOTH dates exist AND post is filled
            if (vacancyStatus === 'filled') {
                if (arise && joining) {
                    if (arise > joining) {
                        await transaction.rollback();
                        return res.status(400).json({
                            error: `'Date of Arise in Vacancy' (${DateOfArise.toLocaleDateString('en-IN')}) cannot be later than 'Employee Joining Date' (${EmployeeJoiningDate.toLocaleDateString('en-IN')}) for Post: ${trimmedRow['Post Name']}`
                        });
                    }
                }
            }

            // For vacant posts - only check arise date exists, no joining date needed
            if (vacancyStatus === 'vacant') {
                if (!arise) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: `Invalid 'Date of Arise in Vacancy' format for Post: ${trimmedRow['Post Name']}`
                    });
                }
            }
 
            const request = transaction.request();
 
            request.input("Department", trimmedRow['Department']);
            request.input("PostID", trimmedRow['Post ID']);
            request.input("PostName", trimmedRow['Post Name']);
            request.input("Class", trimmedRow['Class']);
            request.input("VacanOrFilled", trimmedRow['Vacant or filled']);
            request.input("DateOfArise", DateOfArise instanceof Date ? DateOfArise : null);
            request.input("EmployeeJoiningDate", EmployeeJoiningDate instanceof Date ? EmployeeJoiningDate : null);
            request.input("NameOfEmployee", trimmedRow['Name of Employee']);
            request.input("ExemptionAbolished",yesNoToInt(trimmedRow['Should this post be expempted from Abolishment?']));
            request.input("StaffID", trimmedRow['Staff Reference ID / Personnel Number']);
            request.input("AadhaarNumber", trimmedRow['Aadhar Number']);
            request.input("Gender", trimmedRow['Gender']);
            request.input("State", trimmedRow['Domicile State']);
            request.input("Community", trimmedRow['Community']);
            request.input("Religion", trimmedRow['Religion']);
            request.input("DateOfBirth", DateOfBirth instanceof Date ? DateOfBirth : null);
            request.input("DateOfRetirement", DateOfRetirement instanceof Date ? DateOfRetirement : null);
            request.input("PwBD", trimmedRow['Whether PwBD?']);
            request.input("WhetherExServiceman", yesNoToInt(trimmedRow['Whether Ex-Serviceman Personnal?']));
 
            request.input("highEdu", trimmedRow['Highest Educational Qualification']);
            request.input("noOfUg", trimmedRow['No. of UG Degrees']);
            request.input("ugDegreeOne", trimmedRow['UG Degree 1 - Discipline']);
            request.input("ugDegreeTwo", trimmedRow['UG Degree 2 - Discipline']);
            request.input("ugDegreeThree", trimmedRow['UG Degree 3 - Discipline']);
            request.input("noOfPg", trimmedRow['No. of PG Degrees']);
            request.input("pgDegreeOne", trimmedRow['PG Degree 1 - Discipline']);
            request.input("pgDegreeTwo", trimmedRow['PG Degree 2 - Discipline']);
            request.input("pgDegreeThree", trimmedRow['PG Degree 3 - Discipline']);
            request.input("payscaleRange", trimmedRow['Payscale Range']);
 
            request.input("Month", month);
            request.input("Year", financialYear);
            request.input("FileId", fileId);
            request.input("userID",userID);
            request.input("organisationID",organisationID);
 
            await request.query(`
                INSERT INTO tbl_hr_other_org_vacancy_details
                (department, post_id, post_name, class, vacant_or_filled, date_of_arise, employee_joining_date, name_of_employee,
                is_exemption_abolished, staff_reference_id, aadhaar_number, gender, state, community, religion, date_of_birth,
                date_of_retirement, whether_pwbd, whether_ex_serviceman,high_qualification,no_ug_degree,
                ug_discipline_one,ug_discipline_two,ug_discipline_three,no_pg_degree,
                pg_discipline_one,pg_discipline_two,pg_discipline_three,payscale,
                Uploaded_month, Uploaded_year, Uploaded_File_id,upload_date,uploaded_by,organisation_id)
                VALUES (@Department,@PostID, @PostName, @Class, @VacanOrFilled, @DateOfArise, @EmployeeJoiningDate, @NameOfEmployee,
                @ExemptionAbolished, @StaffID, @AadhaarNumber, @Gender, @State, @Community, @Religion, @DateOfBirth,
                @DateOfRetirement, @PwBD, @WhetherExServiceman,
                @highEdu,@noOfUg,@ugDegreeOne,@ugDegreeTwo,@ugDegreeThree,@noOfPg,@pgDegreeOne,@pgDegreeTwo,
                @pgDegreeThree,@payscaleRange,@Month, @Year, @FileId,GETDATE(),@userID,@organisationID)
            `);
            }
        await transaction.commit();
        res.status(200).json({ message: "Vacancy details uploaded successfully" });
 
    } catch (err) {
    if (transaction && !transaction._aborted) {
        try {
            await transaction.rollback();
        } catch (e) {
            console.error("Rollback failed:", e.message);
        }
    }
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
}
}
async function deleteVacancyFile(req, res) {
    const fileId = req.params.fileId;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("fileId", fileId);

        const getFileQuery = `
            SELECT file_name 
            FROM tbl_hr_other_org_vacancy_file_details 
            WHERE Uploaded_File_id = @fileId
        `;
        const fileResult = await request.query(getFileQuery);
        if (fileResult.recordset.length === 0) {
            return res.status(404).json({ error: "File not found" });
        }

        const fileName = fileResult.recordset[0].file_name;

        const deleteFileQuery = `
            DELETE FROM tbl_hr_other_org_vacancy_file_details WHERE Uploaded_File_id = @fileId;
            DELETE FROM tbl_hr_other_org_vacancy_details WHERE Uploaded_File_id = @fileId;
        `;
        await request.query(deleteFileQuery);

        const isDeleted = deleteFile(fileName);
        if (isDeleted) {
            return res.status(200).json({ message: "File deleted successfully" });
        }
    } catch (err) {
        // console.error("Error:", err);
        return res.status(500).json({ error: "Failed to delete file" });
    }
}

async function deleteFile(fileName) {
    try {
        if (fileName) {
            const filePath = path.join(__dirname, "fileuploads", "vacancy_details", fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
        }
        return false;
    } catch (err) {
        // console.error("Error deleting file:", err);
        return false;
    }
}

async function getClassOrgWise(req, res) {
    let organisationID = parseInt(req.params.organisationID) || 0;
    let clusterID = parseInt(req.params.clusterID) || 0;

    const originalClusterID = clusterID;

    try {
        const conn = await pool;
        const request = conn.request();

        if (organisationID !== 0) {
            request.input("organisationID", organisationID);
        }

        if (clusterID === 0 && organisationID !== 0) {
            const clusterResult = await request.query(`
                SELECT hr_cluster_id 
                FROM dbo.mmt_organisation 
                WHERE organisation_id = @organisationID
            `);

            clusterID = clusterResult.recordset.length
                ? clusterResult.recordset[0].hr_cluster_id
                : 0;
        }

        let query = "";

        if (originalClusterID === 0) {
            query = `
                SELECT DISTINCT class
                FROM (
                    SELECT class FROM mmt_class
                    UNION ALL
                    SELECT class FROM tbl_hr_other_org_vacancy_details
                ) t
                ORDER BY class
            `;
        }

        else if (clusterID === 1) {
            query = `
                SELECT DISTINCT class
                FROM mmt_class
                ORDER BY class
            `;
        }

        else if (clusterID === 2) {
            query = `
                SELECT DISTINCT class
                FROM tbl_hr_other_org_vacancy_details
                WHERE organisation_id = @organisationID
                ORDER BY class
            `;
        }

        const result = await request.query(query);
        return res.status(200).json(result.recordset);

    } catch (err) {
        console.error("Error fetching class list:", err);
        return res.status(500).json({
            message: "Error occurred while fetching data",
            error: err.message
        });
    }
}

export default {
    getOtherOrgVacancyDetails, getHRDashboardContentOtherOrgData, getOtherOrgAbolishingPostWithinmonth, getOtherOrgEmpGoingToRetireWithinSixMonths,
    getOtherOrgGenderWiseCountByOrg, getOtherOrgCommunityWiseCountByOrg, getOtherOrgExperiencedEmpCount, getOtherOrgPwbdWiseCount, getLastUploadDate, getDataFromVacancyDetails, getFileUploadDetails,
    fileUploadVacancyDetails, upload,deleteVacancyFile, getClassOrgWise
}