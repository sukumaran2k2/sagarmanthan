import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import moment from 'moment';

const uploadDestination = "./fileuploads/gmis_mou_fileupload";
if (!fs.existsSync(uploadDestination)) 
{
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const generateUniqueFileName = (originalName) => {
    // Get the current date and time in the desired format
    const currentDateTime = moment().format('YYYY-MM-DD_HH-mm-ss');
    
    // Get the file extension from the original file name
    const fileExtension = path.extname(originalName);

    // Create the unique filename using the format 'filename_YYYY-MM-DD_HH-mm-ss.extension'
    const uniqueFileName = `${path.basename(originalName, fileExtension)}_${currentDateTime}${fileExtension}`;

    return uniqueFileName;
};

// Define the storage configuration first
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination); // Set the destination folder
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname); // Generate the unique file name
        // req.uniqueFileName = uniqueFileName; // Store the unique file name in the request object
        console.log(`Generated File Name: ${uniqueFileName}`); // Log the generated file name
        callback(null, uniqueFileName); // Pass the unique file name to the callback
    },
});

 const upload = multer({ 
    storage: storage,
    limits: { fileSize: 52428800 }  //50MB
});

async function getMouCategory(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {

        const result = await request.query(`SELECT * FROM mmt_mou_category;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function submitGmisMouData(req, res) {
    const eventName = req.body.eventName;
    const organisationId = req.body.organisationName;
    const navicId = req.body.vibhasNavicID;
    const nameOfMou = req.body.mouProjectName;
    const nameOfSecondParty = req.body.stakeholderName;
    const natureOfSecondParty = req.body.natureOfSecondParty;
    const amount = req.body.amount;
    const mouCategoryId = req.body.mouCategory;
    const firstPartyName = req.body.firstPartyName;
    const presentStatus = req.body.presentStatus;
    const detailedRemarks = req.body.detailedRemarks || null;
    const reasonForDropping = req.body.reasonForDropping || null;
    const mouBrief = req.body.mouBrief || null;
    const revisedAmount = req.body.revisedAmount || null;
    const userID = req.body.userID || null;
    let uniqueFileName = req.body.gmisDocumentFileName; 
    const nextSteps = req.body.nextSteps || null;
    const physicalProgressDate = req.body.physicalProgressDate || null;
    const physicalPercentage = req.body.physicalPercentage || null;
    const financialPercentage = req.body.financialPercentage || null;
    const financialProgressDate = req.body.financialProgressDate || null;

     if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
        }

    const conn = await pool;
    const request = conn.request();

    request.input("eventName", eventName);
    request.input("organisationId", organisationId);
    request.input("navicId", navicId);
    request.input("nameOfMou", nameOfMou);
    request.input("nameOfSecondParty", nameOfSecondParty);
    request.input("natureOfSecondParty", natureOfSecondParty);
    request.input("firstPartyName", firstPartyName);
    request.input("amount", amount);
    request.input("mouCategoryId", mouCategoryId);
    request.input("presentStatus", presentStatus);
    request.input("detailedRemarks", detailedRemarks);
    request.input("reasonForDropping", reasonForDropping);
    request.input("mouBrief", mouBrief);
    request.input("revisedAmount", revisedAmount);
    request.input("userID", userID);
    request.input("uniqueFileName", uniqueFileName);
    request.input("nextSteps", nextSteps);
    request.input("physicalProgressDate", physicalProgressDate);
    request.input("physicalPercentage", physicalPercentage);
    request.input("financialPercentage", financialPercentage);
    request.input("financialProgressDate", financialProgressDate);

    

    const firstPartyResult = await request.query(`
        SELECT organisation_name
        FROM sagarmanthan_revamp.dbo.mmt_organisation
        WHERE organisation_id = @organisationId;
    `);

    if (firstPartyResult.recordset.length === 0) {
        console.error("Organisation not found");
        return res.status(404).send("Organisation not found");
    }

    const firstParty = firstPartyResult.recordset[0].organisation_name;

    request.input("firstParty", firstParty);


    try {
        const result = await request.query(`INSERT INTO tbl_gmis_mou ( organisation_id,event_name, navic_vibhas_id, name_of_mou,name_of_first_party,
             name_of_second_party, nature_of_second_party, amount, mou_category_id, present_status, reason_for_dropping, remark_or_detailed_status, mou_brief, revised_amount,document_uploader,next_steps,physical_progress_date,financial_progress_date,physical_progress_percentage,financial_progress_percentage,created_on, created_by)
        VALUES (@organisationId,@eventName,@navicId, @nameOfMou, @firstParty, @nameOfSecondParty, @natureOfSecondParty, @amount, @mouCategoryId, @presentStatus, @reasonForDropping, @detailedRemarks, @mouBrief, @revisedAmount,@uniqueFileName,@nextSteps,@physicalProgressDate,@financialProgressDate,@physicalPercentage,@financialPercentage, GETDATE(), @userID);`);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
async function addNewgmisFileupload(req, res) 
{
    // const { folderName } = req.body;
    try {
        const conn = await pool; 
        // console.log("File Details:", req.file);

        if (!req.file || !req.file.filename) {
            // console.error("No file or unique file name provided.");
            return res.status(400).json({ error: "No file uploaded or unique name missing" });
        }

        const uniqueFileName = req.file.filename;

        const createDir = `./fileuploads/gmis_mou_fileupload`;
       

        const destinationPath = `${createDir}/${uniqueFileName}`;

        // fs.renameSync(req.file.path, destinationPath);
        res.status(200).json({ status: 'success', uniqueFileName });
    } catch (err) {
        // console.error("Error in file upload:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
//file upload 
const fileUploadDestination = './fileuploads/gmis_mou_fileupload';

let fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, fileUploadDestination );
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const fileUpload= multer({
    storage: fileStorage,
    limits: { fileSize: 10000000}
});

async function updateGmisMouData(req, res) {
    const mouID = req.body.mouID;
    const eventName = req.body.eventName;
    const organisationId = req.body.organisationName;
    const navicId = req.body.vibhasNavicID;
    const nameOfMou = req.body.mouProjectName;
    const nameOfSecondParty = req.body.stakeholderName;
    const natureOfSecondParty = req.body.natureOfSecondParty;
    const amount = req.body.amount;
    var revisedAmount = req.body.revisedAmount;
    const mouCategoryId = req.body.mouCategory;
    const presentStatus = req.body.presentStatus;
    const detailedRemarks = req.body.detailedRemarks || null;
    const reasonForDropping = req.body.reasonForDropping || null;
    const mouBrief = req.body.mouBrief || null;
    const userId = req.body.userId || null;
    let uniqueFileName = req.body.uniqueFileName; 
    let updatenextSteps = req.body.updatenextSteps;


    if (revisedAmount === '') {
        revisedAmount = null;
    }
       if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("mouID", mouID);
    request.input("eventName", eventName);
    request.input("organisationId", organisationId);
    request.input("navicId", navicId);
    request.input("nameOfMou", nameOfMou);
    request.input("nameOfSecondParty", nameOfSecondParty);
    request.input("natureOfSecondParty", natureOfSecondParty);
    request.input("amount", amount);
    request.input("revisedAmount", revisedAmount);
    request.input("mouCategoryId", mouCategoryId);
    request.input("presentStatus", presentStatus);
    request.input("detailedRemarks", detailedRemarks);
    request.input("reasonForDropping", reasonForDropping);
    request.input("mouBrief", mouBrief);
    request.input("userId", userId);
    request.input("uniqueFileName", uniqueFileName);
    request.input("updatenextSteps", updatenextSteps);

    const firstPartyResult = await request.query(`
        SELECT organisation_name
        FROM sagarmanthan_revamp.dbo.mmt_organisation
        WHERE organisation_id = @organisationId;
    `);

    if (firstPartyResult.recordset.length === 0) {
        console.error("Organisation not found");
        return res.status(404).send("Organisation not found");
    }

    const firstParty = firstPartyResult.recordset[0].organisation_name;

    request.input("firstParty", firstParty);

    try {
        // Build dynamic query
        let updateQuery = `
            UPDATE tbl_gmis_mou 
            SET organisation_id = @organisationId, 
                event_name = @eventName, 
                navic_vibhas_id = @navicId, 
                name_of_mou = @nameOfMou, 
                name_of_first_party = @firstParty,
                name_of_second_party = @nameOfSecondParty, 
                nature_of_second_party = @natureOfSecondParty,
                amount = @amount, 
                mou_category_id = @mouCategoryId, 
                present_status = @presentStatus, 
                remark_or_detailed_status = @detailedRemarks, 
                reason_for_dropping = @reasonForDropping, 
                mou_brief = @mouBrief, 
                updated_by = @userId, 
                document_uploader = @uniqueFileName,
                next_steps = @updatenextSteps,
                updated_on = GETDATE()`;

        // Add revisedAmount only if it exists
        if (revisedAmount !== null) {
            updateQuery += `, revised_amount = @revisedAmount`;
        }

        // Add the WHERE clause
        updateQuery += ` WHERE id = @mouID;`;

        // Execute the query
        const result = await request.query(updateQuery);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getGmisMouData(req, res) {

    try {

        const roleId = req.params.roleId;
        const organisationId = req.params.organisationId;

        const conn = await pool;
        const request = conn.request();

        request.input("organisationId", organisationId);
        request.input("roleId", roleId);

        let query = "";

        // Admin Roles → Show All Organisations
        if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

            query = `
                SELECT 
                    tbl_gmis_mou.id,
                    tbl_gmis_mou.event_name,
                    tbl_gmis_mou.organisation_id,
                    mmt_organisation.organisation_name,
                    tbl_gmis_mou.name_of_mou,
                    tbl_gmis_mou.name_of_second_party,
                    tbl_gmis_mou.nature_of_second_party,
                    tbl_gmis_mou.amount,
                    tbl_gmis_mou.mou_category_id,
                    mmt_mou_category.mou_category_name,
                    tbl_gmis_mou.mou_brief,
                    tbl_gmis_mou.present_status,
                    tbl_gmis_mou.reason_for_dropping,
                    mmt_navic_vibhas.navic_name,
                    tbl_gmis_mou.revised_amount,
                    COALESCE(
                    reb.revised_physical_progress_date,
                    tbl_gmis_mou.physical_progress_date
                ) AS physical_progress_date,

                COALESCE(
                    reb.revised_physical_progress_percentage,
                    tbl_gmis_mou.physical_progress_percentage
                ) AS physical_progress_percentage,
                COALESCE(
                    rev.revised_financial_progress_date,
                    tbl_gmis_mou.financial_progress_date
                ) AS financial_progress_date,

                COALESCE(
                    rev.revised_financial_progress_percentage,
                    tbl_gmis_mou.financial_progress_percentage
                ) AS financial_progress_percentage,
                    tbl_gmis_mou.updated_on
                FROM tbl_gmis_mou

                OUTER APPLY (
                SELECT TOP 1
                    revised_financial_progress_date,
                    revised_financial_progress_percentage
                FROM tbl_gmis_mou_financial_progress
                WHERE mou_id = tbl_gmis_mou.id
                ORDER BY revised_on DESC
            ) rev

            OUTER APPLY (
                SELECT TOP 1
                    revised_physical_progress_date,
                    revised_physical_progress_percentage
                FROM tbl_gmis_mou_physical_progress
                WHERE mou_id = tbl_gmis_mou.id
                ORDER BY revised_on DESC
            ) reb

                LEFT JOIN mmt_organisation 
                    ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id

                LEFT JOIN mmt_navic_vibhas 
                    ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id

                LEFT JOIN mmt_mou_category 
                    ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id

                ORDER BY tbl_gmis_mou.id ASC
            `;

        } else {

            // Normal Users → Show Only Their Organisation
            query = `
                SELECT 
                    tbl_gmis_mou.id,
                    tbl_gmis_mou.event_name,
                    tbl_gmis_mou.organisation_id,
                    mmt_organisation.organisation_name,
                    tbl_gmis_mou.name_of_mou,
                    tbl_gmis_mou.name_of_second_party,
                    tbl_gmis_mou.nature_of_second_party,
                    tbl_gmis_mou.amount,
                    tbl_gmis_mou.mou_category_id,
                    mmt_mou_category.mou_category_name,
                    tbl_gmis_mou.mou_brief,
                    tbl_gmis_mou.present_status,
                    tbl_gmis_mou.reason_for_dropping,
                    mmt_navic_vibhas.navic_name,
                    tbl_gmis_mou.revised_amount,
                    tbl_gmis_mou.updated_on
                FROM tbl_gmis_mou

                LEFT JOIN mmt_organisation 
                    ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id

                LEFT JOIN mmt_navic_vibhas 
                    ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id

                LEFT JOIN mmt_mou_category 
                    ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id

                WHERE tbl_gmis_mou.organisation_id = @organisationId

                ORDER BY tbl_gmis_mou.id ASC
            `;
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {

        console.log(err);
        return res.sendStatus(500);

    }
}
async function getGmisMouDataByID(req, res) {
   


    const mouID = req.params.mouID;
    const conn = await pool;
    const request = conn.request();

    request.input("mouID", mouID);

    try {
        const result = await request.query(`
        SELECT 
            tbl_gmis_mou.id,
            tbl_gmis_mou.organisation_id,
            tbl_gmis_mou.navic_vibhas_id,
            mmt_organisation.organisation_name,
            tbl_gmis_mou.name_of_mou,
            tbl_gmis_mou.name_of_second_party,
            tbl_gmis_mou.nature_of_second_party,
            tbl_gmis_mou.name_of_first_party,
            tbl_gmis_mou.amount,
            tbl_gmis_mou.mou_category_id,
            mmt_mou_category.mou_category_name,
            tbl_gmis_mou.mou_brief,
            tbl_gmis_mou.present_status,
            tbl_gmis_mou.reason_for_dropping,
            tbl_gmis_mou.remark_or_detailed_status,
            tbl_gmis_mou.revised_amount,
            tbl_gmis_mou.event_name,
            tbl_gmis_mou.document_uploader,
            tbl_gmis_mou.next_steps,
            COALESCE(
                reb.revised_physical_progress_date,
                tbl_gmis_mou.physical_progress_date
            ) AS physical_progress_date,

            COALESCE(
                reb.revised_physical_progress_percentage,
                tbl_gmis_mou.physical_progress_percentage
            ) AS physical_progress_percentage,
            COALESCE(
                rev.revised_financial_progress_date,
                tbl_gmis_mou.financial_progress_date
            ) AS financial_progress_date,

            COALESCE(
                rev.revised_financial_progress_percentage,
                tbl_gmis_mou.financial_progress_percentage
            ) AS financial_progress_percentage

        FROM 
            tbl_gmis_mou

            OUTER APPLY (
        SELECT TOP 1
            revised_financial_progress_date,
            revised_financial_progress_percentage
        FROM tbl_gmis_mou_financial_progress
        WHERE mou_id = tbl_gmis_mou.id
        ORDER BY revised_on DESC
    ) rev

    OUTER APPLY (
        SELECT TOP 1
            revised_physical_progress_date,
            revised_physical_progress_percentage
        FROM tbl_gmis_mou_physical_progress
        WHERE mou_id = tbl_gmis_mou.id
        ORDER BY revised_on DESC
    ) reb
        LEFT JOIN 
            mmt_organisation ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id
        LEFT JOIN 
            mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id
        WHERE 
            tbl_gmis_mou.id = @mouID`);

    console.log("result",result)


        res.json(result.recordset);
    }
    catch (err) {
        console.log(err,"error");
        return res.sendStatus(500);
    }
}


async function getGmisMouChartData(req, res) {
    const conn = await pool;

    try {
        const chartOneResult = await conn.query(`  select mmt.organisation_code, count(*) AS 'total_number_of_mous' from tbl_gmis_mou gm
        LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
        GROUP BY mmt.organisation_code`);

        const chartTwoResult = await conn.query(`select mmt.organisation_code, SUM(amount) AS 'cost_of_mou' from tbl_gmis_mou gm
       LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
       GROUP BY mmt.organisation_code`);

        res.json({ chartOne: chartOneResult.recordset, chartTwo: chartTwoResult.recordset });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// async function getGmisMouStageDetails(req, res) {
//     const conn = await pool;
//     const roleID = req.params.roleID;
//     const organisationID = req.params.organisationID;

//     request.input("roleID", roleID);
//     request.input("organisationID", organisationID);

//     try {
//         const result = await conn.query(` SELECT present_status ,count(*) AS count, SUM(amount)/ 100000 AS amount  FROM tbl_gmis_mou WHERE event_name = 'GMIS 2016'
//         GROUP BY present_status`);

//         res.json(result.recordset);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }


async function getGmisMouStageDetails(req, res) {
    const conn = await pool;

    try {
        const organisationId = req.params.organisationId;
        const financialYearRaw = req.params.financialYear;
        const financialYear =
            financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
                ? financialYearRaw
                : null;
        const greaterThan100Cr = req.params.greaterThan100Cr || 'NO';

        let query = `
            SELECT 
                present_status,
                COUNT(*) AS count,
                SUM(amount) / 100000 AS amount
            FROM tbl_gmis_mou gm
            WHERE 1 = 1
        `;

        // Financial Year filter
        if (financialYear && financialYear !== '') {
            query += ` AND event_name = @financialYear `;
        }

        // Organisation filter
        if (organisationId && organisationId != 0) {
            query += ` AND organisation_id = @organisationId `;
        }

        // ✅ ADD THIS (your requirement)
        if (greaterThan100Cr === 'YES') {
        query += ` AND gm.amount >= 100 `;
        } else if (greaterThan100Cr === 'NO') {
        query += ` AND gm.amount < 100  OR gm.amount IS NULL `;
        }

        query += ` GROUP BY present_status `;

        const request = conn.request();

        if (financialYear && financialYear !== '') {
            request.input('financialYear', financialYear);
        }

        if (organisationId && organisationId != 0) {
            request.input('organisationId', organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Server Error",
            error: err.message
        });
    }
}

async function getYearWisegmisData(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    // -----------------------------
    // INPUTS (safe parsing)
    // -----------------------------
    const organisationId = parseInt(req.query.organisationId) || 0;

    const financialYearRaw = req.query.financialYear;
    
    const financialYear =
      financialYearRaw &&
      financialYearRaw !== '' &&
      financialYearRaw !== 'ALL'
        ? financialYearRaw
        : null;
        console.log(financialYear,"MNEWWEW")

    const greaterThan100Cr = req.query.greaterThan100Cr || 'NO';
    console.log(greaterThan100Cr)

    // -----------------------------
    // BASE QUERY
    // -----------------------------
    let query = `
      SELECT
        LTRIM(RTRIM(gm.event_name)) AS year,
        LTRIM(RTRIM(gm.present_status)) AS present_status,
        COUNT(*) AS count,
        ISNULL(SUM(gm.amount), 0) / 100000.0 AS cost_of_mou
      FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
      WHERE gm.event_name LIKE 'GMIS%'
    `;

    // -----------------------------
    // FILTER: Organisation
    // -----------------------------
    if (organisationId && organisationId !== 0) {
      query += ` AND gm.organisation_id = @organisationId `;
      request.input('organisationId', organisationId);
    }

    // -----------------------------
    // FILTER: Financial Year
    // -----------------------------
    if (financialYear) {
      query += ` AND LTRIM(RTRIM(gm.event_name)) = @financialYear `;
      request.input('financialYear', financialYear);
    }

    // -----------------------------
    // FILTER: Amount
    // -----------------------------
    if (greaterThan100Cr === 'YES') {
      query += ` AND gm.amount >= 100 `;
    } else if (greaterThan100Cr === 'NO') {
      query += ` AND gm.amount < 100  OR gm.amount IS NULL `;
    }

    // -----------------------------
    // GROUPING
    // -----------------------------
    query += `
      GROUP BY
        LTRIM(RTRIM(gm.event_name)),
        LTRIM(RTRIM(gm.present_status))
      ORDER BY
        LTRIM(RTRIM(gm.event_name)) DESC
    `;

    // -----------------------------
    // EXECUTE QUERY
    // -----------------------------
    const result = await request.query(query);
    const rows = result.recordset || [];

    // -----------------------------
    // NORMALIZATION
    // -----------------------------
    function normalize(status) {
      const s = (status || '').toLowerCase();

      if (s.includes('work completed')) return 'workCompleted';
      if (s.includes('work under implementation')) return 'workUnderImplementation';
      if (s.includes('tendering')) return 'tendering';
      if (s.includes('approval')) return 'approvalPhase';
      if (
        s.includes('feasibility') ||
        s.includes('dpr') ||
        s.includes('planning')
      ) return 'planningPhase';
      if (s.includes('to be started')) return 'toBeStarted';
      if (s.includes('dropped')) return 'dropped';

      return null;
    }

    // -----------------------------
    // TRANSFORM DATA
    // -----------------------------
    const map = {};

    for (const r of rows) {
      const year = r.year || 'UNKNOWN';

      if (!map[year]) {
        map[year] = {
          year,
          workCompleted: 0,
          workUnderImplementation: 0,
          tendering: 0,
          approvalPhase: 0,
          planningPhase: 0,
          toBeStarted: 0,
          dropped: 0,
          cost_of_mou: 0
        };
      }

      const key = normalize(r.present_status);

      if (key) {
        map[year][key] += Number(r.count || 0);
      }

      map[year].cost_of_mou += Number(r.cost_of_mou || 0);
    }

    // -----------------------------
    // RESPONSE
    // -----------------------------
    return res.json(Object.values(map));

  } catch (err) {
    console.error('getYearWisegmisData error:', err);

    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
}
async function getGmisDrilldownData(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const organisationId = parseInt(req.query.orgID) || 0;

    const financialYearRaw = req.query.financialYear;
    const statusRaw = req.query.status;

    const financialYear =
      financialYearRaw &&
      financialYearRaw !== '' &&
      financialYearRaw !== 'ALL'
        ? financialYearRaw
        : null;

    const greaterThan100Cr = req.query.greaterThan100Cr || 'NO';

    // -----------------------------
    // STATUS NORMALIZER
    // -----------------------------
    function normalizeStatus(str) {
      return (str || "")
        .toLowerCase()
        .replace(/[_\s/]+/g, '')
        .trim();
    }

    const statusMap = {
      workcompleted: 'Work completed',
      workunderimplementation: 'Work under implementation',
      tendering: 'Tendering stage',
      approvalphase: 'Approval phase',
      feasibilitydprplanningstudystage: 'Feasibility/ DPR/ Planning/ Study phase',
      tobestarted: 'To be started',
      dropped: 'Dropped'
    };

    let status = null;

    if (statusRaw) {
      const key = normalizeStatus(statusRaw);
      status = statusMap[key] || statusRaw;
    }

    console.log(status, "mapped status");

    console.log(financialYear, 'financialYear');
    console.log(greaterThan100Cr, 'greaterThan100Cr');

    // -----------------------------
    // BASE QUERY
    // -----------------------------
    let query = `
      SELECT
          gm.id,
          gm.event_name,
          mmt.organisation_name,
          nv.navic_name,
          gm.name_of_mou,
          gm.name_of_first_party,
          gm.name_of_second_party,
          gm.nature_of_second_party,
          gm.amount,
          mc.mou_category_name,
          gm.mou_brief,
          gm.present_status,
          gm.reason_for_dropping,
          gm.remark_or_detailed_status,
          gm.revised_amount,
          gm.next_steps,
          gm.document_uploader
      FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
      LEFT JOIN mmt_navic_vibhas nv
          ON nv.id = gm.navic_vibhas_id
      LEFT JOIN mmt_mou_category mc
          ON mc.mou_category_id = gm.mou_category_id
      LEFT JOIN mmt_organisation mmt
          ON mmt.organisation_id = gm.organisation_id
      WHERE gm.event_name LIKE 'GMIS%'
    `;

    // -----------------------------
    // FILTER: Organisation
    // -----------------------------
    if (organisationId && organisationId !== 0) {
      query += ` AND gm.organisation_id = @organisationId `;
      request.input('organisationId', organisationId);
    }

    // -----------------------------
    // FILTER: Financial Year
    // -----------------------------
    if (financialYear) {
      query += ` AND LTRIM(RTRIM(gm.event_name)) = @financialYear `;
      request.input('financialYear', financialYear);
    }

    // -----------------------------
    // FILTER: STATUS
    // -----------------------------
    if (status) {
      query += ` AND gm.present_status = @status `;
      request.input('status', status);
    }

    if (greaterThan100Cr === 'YES') {
    query += ` AND gm.amount >= 100 `;
    } else if (greaterThan100Cr === 'NO') {
    query += `  AND (gm.amount < 100 OR gm.amount IS NULL) `;
    }

    // -----------------------------
    // ORDER BY
    // -----------------------------
    query += ` ORDER BY gm.id DESC `;

    // -----------------------------
    // EXECUTE
    // -----------------------------
    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    console.error('getGmisDrilldownData error:', err);

    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
}

async function getGmisMouSecondParty(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`SELECT DISTINCT name_of_second_party FROM tbl_gmis_mou`);
        res.json(result.recordset);
    } catch (err) {
        console.error("Database query error:", err);
        res.sendStatus(500);
    }
}

async function getGmisMouVibhasNavicCell(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
    SELECT DISTINCT mnv.navic_name
    FROM tbl_gmis_mou gmismou
    INNER JOIN mmt_navic_vibhas mnv 
        ON gmismou.navic_vibhas_id = mnv.id
`);
        res.json(result.recordset);
    } catch (err) {
        console.error("Database query error:", err);
        res.sendStatus(500);
    }
}

async function getGmisMouCategoryName(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`SELECT distinct mou_category_name FROM tbl_gmis_mou 
            LEFT JOIN mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id`);
        res.json(result.recordset);
    } catch (err) {
        console.error("Database query error:", err);
        res.sendStatus(500);
    }
}

async function getGmisMouPresentStatus(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`SELECT DISTINCT present_status FROM tbl_gmis_mou`);
        res.json(result.recordset);
    } catch (err) {
        console.error("Database query error:", err);
        res.sendStatus(500);
    }
}


async function getOrganisationWiseCountAmount(req, res) {

    const conn = await pool;

    try {

        const organisationId = parseInt(req.query.organisationId) || 0;
        const financialYearRaw = req.query.financialYear;
        const financialYear =
            financialYearRaw && financialYearRaw !== 'ALL'
                ? financialYearRaw
                : null;
  
        const greaterThan100Cr = req.query.greaterThan100Cr || 'YES';

        const request = conn.request();

        if (organisationId !== 0) {
            request.input('organisationId', organisationId);
        }

        if (financialYear) {
            request.input('financialYear', financialYear);
        }

   
        let whereCondition = ` WHERE 1 = 1 `;

        if (financialYear) {
            whereCondition += ` AND gm.event_name = @financialYear `;
        }

        if (organisationId !== 0) {
            whereCondition += ` AND gm.organisation_id = @organisationId `;
        }

        // amount filter
        if (greaterThan100Cr === 'YES') {
            whereCondition += ` AND gm.amount > 100 `;
        } else if (greaterThan100Cr === 'NO') {
            whereCondition += ` AND gm.amount <= 100 `;
        }

        // -----------------------------
        // Organisation-wise count
        // -----------------------------
        const amountCountWiseMou = await request.query(`
            SELECT
                mmt.organisation_code,
                COUNT(*) AS total_number_of_mous,
                COALESCE(SUM(amount),0) / 10000000 AS cost_of_mou
            FROM tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt
                ON gm.organisation_id = mmt.organisation_id
            ${whereCondition}
            GROUP BY mmt.organisation_code
            ORDER BY total_number_of_mous DESC
        `);

        // -----------------------------
        // Total count
        // -----------------------------
        const totalCountAndAmount = await request.query(`
            SELECT
                COUNT(*) AS total_mou,
                COALESCE(SUM(amount),0) / 10000000 AS total_cost_of_mou
            FROM tbl_gmis_mou gm
            ${whereCondition}
        `);

        // -----------------------------
        // Status list
        // -----------------------------
        const statusesResult = await request.query(`
            SELECT DISTINCT present_status
            FROM tbl_gmis_mou gm
            ${whereCondition}
        `);

        const statuses = statusesResult.recordset.map(r => r.present_status);

        const organisationWiseStatus = {};

        // -----------------------------
        // Status-wise loop
        // -----------------------------
        for (const status of statuses) {

            const statusRequest = conn.request();

            if (organisationId !== 0) {
                statusRequest.input('organisationId', organisationId);
            }

            if (financialYear) {
                statusRequest.input('financialYear', financialYear);
            }

            statusRequest.input('status', status);

            let statusWhereCondition = `
                WHERE gm.present_status = @status
            `;

            if (financialYear) {
                statusWhereCondition += ` AND gm.event_name = @financialYear `;
            }

            if (organisationId !== 0) {
                statusWhereCondition += ` AND gm.organisation_id = @organisationId `;
            }

            if (greaterThan100Cr === 'YES') {
                statusWhereCondition += ` AND gm.amount > 100 `;
            } else if (greaterThan100Cr === 'NO') {
                statusWhereCondition += ` AND gm.amount <= 100 `;
            }

            const statusData = await statusRequest.query(`
                SELECT
                    mmt.organisation_code,
                    COUNT(*) AS count
                FROM tbl_gmis_mou gm
                LEFT JOIN mmt_organisation mmt
                    ON gm.organisation_id = mmt.organisation_id
                ${statusWhereCondition}
                GROUP BY mmt.organisation_code
            `);

            organisationWiseStatus[status] = statusData.recordset;
        }

        return res.json({
            amountCountWiseMou: amountCountWiseMou.recordset,
            totalCountAndAmount: totalCountAndAmount.recordset,
            organisationWiseStatus
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Server Error",
            error: err.message
        });
    }
}
async function getStatusWiseCountAmount(req, res) {

    const conn = await pool;

    try {

        const category =req.query.category;

        const organisationId =parseInt(req.query.organisationId) || 0;

        const financialYearRaw = req.query.financialYear;
        const financialYear =financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
        ? financialYearRaw
        : null;

        const greaterThan100Cr =req.query.greaterThan100Cr || 'YES';

        let query = `
            SELECT
                gm.present_status AS status,
                COUNT(*) AS count,
                ISNULL(SUM(gm.amount) / 100000.0, 0) AS amount

            FROM tbl_gmis_mou gm

            LEFT JOIN mmt_organisation mmt
                ON gm.organisation_id =
                 mmt.organisation_id

            WHERE 1 = 1
        `;

        // Financial Year filter
        if (
            financialYear &&
            financialYear !== ''
        ) {

            query += `
                AND gm.event_name = @financialYear
            `;
        }

        // Organisation filter
        if (organisationId !== 0) {

            query += `
                AND gm.organisation_id =
                    @organisationId
            `;
        }

        // Greater Than 100 CR filter
        if (greaterThan100Cr === 'YES') {

            query += `
                AND gm.amount > 100
            `;
        }

        if (greaterThan100Cr === 'NO') {

            query += `
                AND gm.amount <= 100
            `;
        }

        // Category filter
        if (category === 'Other Organization') {

            query += `
                AND mmt.organisation_category_id != 1
                AND mmt.organisation_category_id
                    IS NOT NULL
            `;
        }

        else if (category === 'Major Ports') {

            query += `
                AND mmt.organisation_category_id = 1
            `;
        }

        query += `
            GROUP BY gm.present_status
        `;

        const request = conn.request();

        // Safe parameter binding
        if (
            financialYear &&
            financialYear !== ''
        ) {

            request.input(
                "financialYear",
                financialYear
            );
        }

        if (organisationId !== 0) {

            request.input(
                "organisationId",
                organisationId
            );
        }

        const result =
            await request.query(query);

        res.json(result.recordset);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error",
            error: err.message
        });
    }
}
async function getOrganisationWiseStatusCount(req, res) {

    const conn = await pool;

    try {

        const organisationId = parseInt(req.params.organisationId) || 0;
        const financialYearRaw = req.params.financialYear;
        const financialYear =
            financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
                ? financialYearRaw
                : null;
        const greaterThan100Cr = req.params.greaterThan100Cr || 'NO';

        let query = `
            SELECT
                mmt.organisation_name,
                COUNT(*) AS total_number_of_mous,
                gm.present_status
            FROM tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt
                ON gm.organisation_id = mmt.organisation_id
            WHERE 1 = 1
        `;

        // Financial Year filter
        if (financialYear && financialYear !== '') {
            query += ` AND gm.event_name = @financialYear `;
        }

        // Organisation filter
        if (organisationId !== 0) {
            query += ` AND gm.organisation_id = @organisationId `;
        }


        if (greaterThan100Cr === 'YES') {
        query += ` AND gm.amount >= 100 `;
        } else if (greaterThan100Cr === 'NO') {
        query += ` AND gm.amount < 100  OR gm.amount IS NULL `;
        }
        // NO → no filter

        query += `
            GROUP BY
                mmt.organisation_name,
                gm.present_status
        `;

        const request = conn.request();

        if (financialYear && financialYear !== '') {
            request.input("financialYear", financialYear);
        }

        if (organisationId !== 0) {
            request.input("organisationId", organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error",
            error: err.message
        });
    }
}
async function getOrganisationWiseStatusCountorgView(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);

    const result = await request.query(`
    SELECT 
    gm.present_status,
    COUNT(*) AS total_number_of_mous,
    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM tbl_gmis_mou gm
    WHERE gm.organisation_id = @organisationID and event_name = 'GMIS 2016'
    GROUP BY gm.present_status
    ORDER BY gm.present_status;
    `);

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}
async function getOrganisationWiseStatusCountorgView_2021(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);

    const result = await request.query(`
    SELECT 
    gm.present_status,
    COUNT(*) AS total_number_of_mous,
    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM tbl_gmis_mou gm
    WHERE gm.organisation_id = @organisationID and event_name = 'GMIS 2021'
    GROUP BY gm.present_status
    ORDER BY gm.present_status;
    `);

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getOrganisationWiseStatusCountorgView_2023(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);

    const result = await request.query(`
    SELECT 
    gm.present_status,
    COUNT(*) AS total_number_of_mous,
    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM tbl_gmis_mou gm
    WHERE gm.organisation_id = @organisationID and event_name = 'GMIS 2023'
    GROUP BY gm.present_status
    ORDER BY gm.present_status;
    `);

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getOrganisationWiseStatusCountorgView_2025(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);

    const result = await request.query(`
    SELECT 
    gm.present_status,
    COUNT(*) AS total_number_of_mous,
    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM tbl_gmis_mou gm
    WHERE gm.organisation_id = @organisationID and event_name = 'GMIS 2025'
    GROUP BY gm.present_status
    ORDER BY gm.present_status;
    `);

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}



async function getGmisMouDataByOrganisationAndStatus(req, res) {
    const conn = await pool;
    const request = conn.request();
    const org = req.params.organisation;
    const indexOfColumn = req.params.status;

    let status;

    switch (indexOfColumn) {
        case '1':
            status = "All";
            break;
        case '2':
            status = "Feasibility/ DPR/ Planning/ Study phase";
            break;
        case '3':
            status = "Approval phase";
            break;
        case '4':
            status = "To be started";
            break;
        case '5':
            status = "Tendering Stage";
            break;
        case '6':
            status = "Work under implementation (work awarded and implementation started)";
            break;
        case '7':
            status = "Work completed";
            break;
        case '8':
            status = "Dropped";
            break;
        case '9':
            status = "All";
            break;
        default:
            break;
    }

    if (org !== "Total") {
        request.input("org", org);
    }
    request.input("status", status);

    let query = `
        SELECT 
            tbl_gmis_mou.id,
            tbl_gmis_mou.organisation_id,
            mmt_organisation.organisation_name,
            tbl_gmis_mou.name_of_mou,
            tbl_gmis_mou.name_of_second_party,
            tbl_gmis_mou.nature_of_second_party,
            tbl_gmis_mou.amount,
            tbl_gmis_mou.mou_category_id,
            mmt_mou_category.mou_category_name,
            tbl_gmis_mou.mou_brief,
            tbl_gmis_mou.present_status,
            tbl_gmis_mou.reason_for_dropping,
            mmt_navic_vibhas.navic_name,
            tbl_gmis_mou.revised_amount
        FROM 
            tbl_gmis_mou
        LEFT JOIN 
            mmt_organisation ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id
        LEFT JOIN 
            mmt_navic_vibhas ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id
        LEFT JOIN 
            mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id
    `;

    if (org !== "Total") {
        query += ` WHERE mmt_organisation.organisation_name = @org`;
    }

    if (status !== "All") {
        query += org !== "Total" ? ` AND present_status = @status` : ` WHERE present_status = @status`;
    }

    query += ` ORDER BY tbl_gmis_mou.id ASC`;

    try {
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}


// async function getOrganisationWiseCountAmountStatus(req, res) {
//     const conn = await pool;

//     try {
//         // Query to get status counts for each organization
//         const result = await conn.query(`
//             SELECT mmt.organisation_label, present_status, count(*) AS count
//             FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
//             LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
//             GROUP BY organisation_label, present_status ORDER BY count DESC
//         `);

//         // Query to get cost of MOU for each organization
//         const result2 = await conn.query(`
//             SELECT mmt.organisation_label, SUM(amount)/1000 AS 'cost_of_mou'
//             FROM tbl_gmis_mou gm
//             LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
//             GROUP BY mmt.organisation_label
//         `);

//         const resultData = result.recordset;
//         const costData = result2.recordset;

//         const mergedData = resultData.map(item => {
//             const costItem = costData.find(cost => cost.organisation_label === item.organisation_label);
//             return {
//                 organisation_label: item.organisation_label,
//                 present_status: item.present_status,
//                 count: item.count,
//                 cost_of_mou: costItem ? costItem.cost_of_mou : 0
//             };
//         });

//         // Group by organisation_code to sum up the counts for each status
//         const groupedData = mergedData.reduce((acc, item) => {
//             if (!acc[item.organisation_label]) {
//                 acc[item.organisation_label] = {
//                     organisation_label: item.organisation_label,
//                     'Approval phase': 0,
//                     'Dropped': 0,
//                     'Feasibility/ DPR/ Planning/ Study phase': 0,
//                     'Tendering stage': 0,
//                     'To be started': 0,
//                     'Work completed': 0,
//                     'Work under implementation (work awarded and implementation started)': 0,
//                     cost_of_mou: item.cost_of_mou
//                 };
//             }
//             acc[item.organisation_label][item.present_status] += item.count;
//             return acc;
//         }, {});

//         // Convert grouped data into an array
//         const finalData = Object.values(groupedData);
//         res.json(finalData);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }
async function getOrganisationWiseCountAmountStatus(req, res) {

  const conn = await pool;
  const request = conn.request();

  const category = req.query.category;
  const organisationId = req.query.organisationId || 0;
  const financialYearRaw = req.query.financialYear;
    const financialYear =
        financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
            ? financialYearRaw
            : null;
  const greaterThan100Cr = req.query.greaterThan100Cr || 'NO'; 

  let categorySql = '';

  if (category === 'Major Ports') {
    categorySql = ' AND mmt.organisation_category_id = 1';
  } else if (category === 'Other Organization') {
    categorySql = `
      AND mmt.organisation_category_id != 1
      AND mmt.organisation_category_id IS NOT NULL
    `;
  }

  let orgSql = '';

  if (organisationId && organisationId != 0) {
    orgSql = ` AND gm.organisation_id = ${organisationId}`;
  }

  let financialYearSql = '';

  if (financialYear && financialYear !== '') {
    financialYearSql = ` AND gm.event_name = '${financialYear}'`;
  }

  let amountSql = '';

 

    if (greaterThan100Cr === 'YES') {
    amountSql = ` AND gm.amount >= 100 `;
    } 
    else if (greaterThan100Cr === 'NO') {
    amountSql = ` AND gm.amount < 100  OR gm.amount IS NULL `;
    }

  const baseTable = 'sagarmanthan_revamp.dbo.tbl_gmis_mou';

  const statusQuery = `
    SELECT
      mmt.organisation_label,
      gm.organisation_id,
      gm.present_status,
      COUNT(*) AS count
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt
      ON gm.organisation_id = mmt.organisation_id
    WHERE 1=1
    ${financialYearSql}
    ${categorySql}
    ${orgSql}
    ${amountSql}  
    GROUP BY
      gm.organisation_id,
      mmt.organisation_label,
      gm.present_status
  `;

  const costQuery = `
    SELECT
      mmt.organisation_label,
        gm.organisation_id,
      ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt
      ON gm.organisation_id = mmt.organisation_id
    WHERE 1=1
    ${financialYearSql}
    ${categorySql}
    ${orgSql}
    ${amountSql}  
    GROUP BY
      mmt.organisation_label,
      gm.organisation_id
  `;

  try {

    const costResult = await request.query(costQuery);
    const statusResult = await request.query(statusQuery);

    const costData = costResult.recordset || [];
    const statusData = statusResult.recordset || [];

    const map = Object.create(null);

    for (const c of costData) {
      const label = c.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_id: c.organisation_id,
        organisation_label: label,
        cost_of_mou: Number(c.cost_of_mou || 0),
        total_count: 0
      };
    }

    for (const s of statusData) {
      const label = s.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_label: label,
        organisation_id: s.organisation_id,
        cost_of_mou: 0,
        total_count: 0
      };

      const key = s.present_status || 'Unknown';

      map[label][key] =
        (map[label][key] || 0) + Number(s.count || 0);

      map[label].total_count += Number(s.count || 0);
    }

    return res.json(Object.values(map));

  } catch (err) {
    return res.status(500).json({
      message: "Server error executing queries.",
      error: err.message
    });
  }
}

async function getOrganisationWiseCountAmountStatusorgView(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    // Bind parameter (IMPORTANT - prevents SQL injection)
    request.input("organisationID", organisationID);

    const query = `
      SELECT 
            gm.present_status,

            COUNT(*) AS total_mous,

            ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

        FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id

        WHERE gm.event_name = 'GMIS 2016'
        AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

        GROUP BY gm.present_status
        ORDER BY gm.present_status
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_2021(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
      SELECT 
            gm.present_status,

            COUNT(*) AS total_mous,

            ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

        FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id

        WHERE gm.event_name = 'GMIS 2021'
        AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

        GROUP BY gm.present_status
        ORDER BY gm.present_status
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_2023(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
      SELECT 
            gm.present_status,

            COUNT(*) AS total_mous,

            ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

        FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id

        WHERE gm.event_name = 'GMIS 2023'
        AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

        GROUP BY gm.present_status
        ORDER BY gm.present_status
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}

async function getOrganisationWiseCountAmountStatusorgView_2025(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
      SELECT 
            gm.present_status,

            COUNT(*) AS total_mous,

            ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

        FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id

        WHERE gm.event_name = 'GMIS 2025'
        AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

        GROUP BY gm.present_status
        ORDER BY gm.present_status
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_2025_category(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
     SELECT 
    LTRIM(RTRIM(
        REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')
    )) AS mou_category,

    COUNT(*) AS total_mous,

    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

    FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm

    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id

    LEFT JOIN mmt_mou_category mc 
        ON gm.mou_category_id = mc.mou_category_id

    WHERE gm.event_name = 'GMIS 2025'
    AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

    GROUP BY 
        LTRIM(RTRIM(REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')))

    ORDER BY mou_category;
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_2023_category(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
     SELECT 
    LTRIM(RTRIM(
        REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')
    )) AS mou_category,

    COUNT(*) AS total_mous,

    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

    FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm

    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id

    LEFT JOIN mmt_mou_category mc 
        ON gm.mou_category_id = mc.mou_category_id

    WHERE gm.event_name = 'GMIS 2023'
    AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

    GROUP BY 
        LTRIM(RTRIM(REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')))

    ORDER BY mou_category;
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_2021_category(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
     SELECT 
    LTRIM(RTRIM(
        REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')
    )) AS mou_category,

    COUNT(*) AS total_mous,

    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

    FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm

    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id

    LEFT JOIN mmt_mou_category mc 
        ON gm.mou_category_id = mc.mou_category_id

    WHERE gm.event_name = 'GMIS 2021'
    AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

    GROUP BY 
        LTRIM(RTRIM(REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')))

    ORDER BY mou_category;
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatusorgView_category(req, res) {
  try {
    const conn = await pool;
    const organisationID = req.params.organisationID;
    console.log(organisationID,"orgidrdr")
    const request = conn.request();

    request.input("organisationID", organisationID);

    const query = `
     SELECT 
    LTRIM(RTRIM(
        REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')
    )) AS mou_category,

    COUNT(*) AS total_mous,

    ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou

    FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm

    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id

    LEFT JOIN mmt_mou_category mc 
        ON gm.mou_category_id = mc.mou_category_id

    WHERE gm.event_name = 'GMIS 2016'
    AND (@organisationID IS NULL OR gm.organisation_id = @organisationID)

    GROUP BY 
        LTRIM(RTRIM(REPLACE(REPLACE(mc.mou_category_name, CHAR(13), ''), CHAR(10), '')))

    ORDER BY mou_category;
    `;

    const result = await request.query(query);

    return res.json(result.recordset);

  } catch (err) {
    return res.status(500).json({
      message: "Error fetching organisation-wise status data",
      error: err.message
    });
  }
}
async function getOrganisationWiseCountAmountStatus_2021(req, res) {

    const conn = await pool;
    const request = conn.request();

    const category = req.params.category;
    const organisationId = req.params.organisationId || 0;

    let categorySql = '';

    if (category === 'Major Ports') {

        categorySql = ' AND mmt.organisation_category_id = 1';

    } else if (category === 'Other Organization') {

        categorySql = `
            AND mmt.organisation_category_id != 1
            AND mmt.organisation_category_id IS NOT NULL
        `;
    }

    const organisationFilter =
        organisationId != 0
            ? ` AND gm.organisation_id = ${organisationId}`
            : '';

    const baseTable = 'sagarmanthan_revamp.dbo.tbl_gmis_mou';

    const statusQuery = `
        SELECT 
            mmt.organisation_label,
            gm.present_status,
            COUNT(*) AS count
        FROM ${baseTable} gm
        LEFT JOIN mmt_organisation mmt
            ON gm.organisation_id = mmt.organisation_id
        WHERE gm.event_name = 'GMIS 2021'
        ${categorySql}
        ${organisationFilter}
        GROUP BY mmt.organisation_label, gm.present_status
    `;

    const costQuery = `
        SELECT 
            mmt.organisation_label,
            ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
        FROM ${baseTable} gm
        LEFT JOIN mmt_organisation mmt
            ON gm.organisation_id = mmt.organisation_id
        WHERE gm.event_name = 'GMIS 2021'
        ${categorySql}
        ${organisationFilter}
        GROUP BY mmt.organisation_label
    `;

    try {

        const costResult = await request.query(costQuery);
        const statusResult = await request.query(statusQuery);

        const costData = Array.isArray(costResult?.recordset)
            ? costResult.recordset
            : [];

        const statusData = Array.isArray(statusResult?.recordset)
            ? statusResult.recordset
            : [];

        const map = Object.create(null);

        for (const c of costData) {

            const label = c.organisation_label || 'Unknown';

            map[label] = map[label] || {
                organisation_label: label,
                cost_of_mou: Number(c.cost_of_mou || 0),
                total_count: 0
            };
        }

        for (const s of statusData) {

            const label = s.organisation_label || 'Unknown';

            map[label] = map[label] || {
                organisation_label: label,
                cost_of_mou: 0,
                total_count: 0
            };

            const key = s.present_status || 'Unknown';

            map[label][key] =
                (map[label][key] || 0) + Number(s.count || 0);

            map[label].total_count += Number(s.count || 0);
        }

        return res.json(Object.values(map));

    } catch (err) {

        return res.status(500).json({
            message: "Server error executing queries",
            error: err.message,
            originalError: err.originalError
                ? err.originalError.message
                : undefined,
            statusQuery,
            costQuery,
            category,
            organisationId
        });
    }
}
async function getMouTotalCountAmount(req, res) {
       const conn = await pool;
 
    try {
        const totalCountAndAmount = await conn.query(` select count(*) AS 'total_mou', SUM(amount)/1000000000000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm WHERE gm.event_name = 'GMIS 2016' `);
 
        res.json(totalCountAndAmount.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
async function getMouCategories(req, res) {
    const conn = await pool;

    try {
        const mouCategories = await conn.query(`SELECT DISTINCT mou_category_name  FROM mmt_mou_category mmc `);

        res.json(mouCategories.recordset);
    }
    catch (err) {

    }
}
async function getTotalMouAndAmountCategoryWise(req, res) {

  const conn = await pool;
  const request = conn.request();

  const category = req.query.category;
  const organisationId = req.query.organisationId;
  const financialYearRaw = req.query.financialYear;
  const financialYear =
    financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
        ? financialYearRaw
        : null;
  const greaterThan100Cr = req.query.greaterThan100Cr || 'NO';

  let query = `
    SELECT 
        COUNT(*) AS count, 
        ISNULL(SUM(amount) / 100000.0, 0) AS amount 
    FROM tbl_gmis_mou gm
    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id  
    WHERE 1 = 1
  `;

  // ✅ SAFE PARAMS
  if (financialYear && financialYear !== '') {
    query += ` AND gm.event_name = @financialYear `;
    request.input('financialYear', financialYear);
  }

  if (organisationId && organisationId != 0) {
    query += ` AND gm.organisation_id = @organisationId `;
    request.input('organisationId', organisationId);
  }

  // ✅ CORRECT amount filter logic
  if (greaterThan100Cr === 'YES') {
    query += ` AND gm.amount >= 100 `;
    } else if (greaterThan100Cr === 'NO') {
    query += ` AND gm.amount < 100  OR gm.amount IS NULL `;
    } 

  // Category filter
  if (category === 'Other Organization') {
    query += `
      AND (
        mmt.organisation_category_id != 1 
        OR mmt.organisation_category_id IS NULL
      )
    `;
  } 
  else if (category === 'Major Ports') {
    query += `
      AND mmt.organisation_category_id = 1
    `;
  }

  try {
    const result = await request.query(query);

    return res.json(
      result.recordset.length
        ? result.recordset
        : [{ count: 0, amount: 0 }]
    );

  } catch (err) {
    console.error("getTotalMouAndAmountCategoryWise error:", err);

    return res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
}
async function getTotalMouAndAmountyearWise(req, res) {

  const conn = await pool;
  const request = conn.request();

  const category = req.query.category;
  const organisationId = req.query.organisationId;
  const financialYearRaw = req.query.financialYear;
    const financialYear =
        financialYearRaw && financialYearRaw !== '' && financialYearRaw !== 'ALL'
            ? financialYearRaw
            : null;
  const greaterThan100Cr = req.query.greaterThan100Cr || 'NO';


  let query = `
    SELECT 
        COUNT(*) AS count, 
        ISNULL(SUM(amount) / 100000.0, 0) AS amount 
    FROM tbl_gmis_mou gm
    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id  
    WHERE 1 = 1
  `;

  // Financial Year filter
  if (financialYear && financialYear !== '') {
    query += ` AND gm.event_name = '${financialYear}'`;
  }

  // Organisation filter
  if (organisationId && organisationId != 0) {
    query += ` AND gm.organisation_id = ${organisationId}`;
  }


  if (greaterThan100Cr === 'YES') {
  query += ` AND gm.amount >= 100 `;
    } else if (greaterThan100Cr === 'NO') {
    query += ` AND gm.amount < 100  OR gm.amount IS NULL `;
    }
  // NO → no filter (show all)

  // Category filter
  if (category === 'Other Organization') {

    query += `
      AND (
        mmt.organisation_category_id != 1 
        OR mmt.organisation_category_id IS NULL
      )
    `;

  } else if (category === 'Major Ports') {

    query += `
      AND mmt.organisation_category_id = 1
    `;
  }

  try {

    const result = await request.query(query);

    return res.json(
      result.recordset.length
        ? result.recordset
        : [{ count: 0, amount: 0 }]
    );

  } catch (err) {

    console.error("getTotalMouAndAmountCategoryWise error:", err);

    return res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
}

async function getOrgWiseMouOrder(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(` SELECT mmt_organisation.organisation_label FROM tbl_gmis_mou
                    LEFT JOIN 
                        mmt_organisation 
                        ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id 
                    GROUP BY 
                        mmt_organisation.organisation_label
                    ORDER BY 
                        COUNT(mmt_organisation.organisation_name) DESC`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

}

async function getOrganisationWiseStatusCount_2021(req, res) {
    const conn = await pool;

    try {
        const organisationId = parseInt(req.params.organisationId) || 0;

        let query = `
            SELECT
                mmt.organisation_name,
                COUNT(*) AS total_number_of_mous,
                gm.present_status
            FROM tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt
                ON gm.organisation_id = mmt.organisation_id
            WHERE gm.event_name = 'GMIS 2021'
        `;

        if (organisationId !== 0) {
            query += ` AND gm.organisation_id = @organisationId `;
        }

        query += `
            GROUP BY
                mmt.organisation_name,
                gm.present_status
        `;

        const request = conn.request();

        if (organisationId !== 0) {
            request.input("organisationId", organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getOrganisationWiseCountAmount_2021(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId || 0;

        const amountCountWiseMou = await conn.query(`
            select mmt.organisation_code, 
                   count(*) AS 'total_number_of_mous', 
                   SUM(amount)/10000000 AS 'cost_of_mou' 
            from tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt 
                ON gm.organisation_id = mmt.organisation_id  
            WHERE gm.event_name = 'GMIS 2021'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
            GROUP BY mmt.organisation_code 
            ORDER BY total_number_of_mous DESC
        `);

        const totalCountAndAmount = await conn.query(`
            select count(*) AS 'total_mou', 
                   SUM(amount)/1000 AS 'total_cost_of_mou' 
            from tbl_gmis_mou gm   
            WHERE gm.event_name = 'GMIS 2021'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
        `);

        const statusesResult = await conn.query(`
            SELECT DISTINCT present_status  
            FROM tbl_gmis_mou    
            WHERE event_name = 'GMIS 2021'
            ${organisationId != 0 ? `AND organisation_id = ${organisationId}` : ''}
        `);

        const statuses = statusesResult.recordset.map(row => row.present_status);

        const organisationWiseStatus = {};

        for (const status of statuses) {

            const statusData = await conn.query(`
                SELECT mmt.organisation_code, COUNT(*) AS 'count'
                FROM tbl_gmis_mou gm
                LEFT JOIN mmt_organisation mmt 
                    ON gm.organisation_id = mmt.organisation_id
                WHERE present_status = '${status}' 
                  AND gm.event_name = 'GMIS 2021'
                  ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
                GROUP BY mmt.organisation_code
            `);

            organisationWiseStatus[status] = statusData.recordset;
        }

        return res.json({
            amountCountWiseMou: amountCountWiseMou.recordset,
            totalCountAndAmount: totalCountAndAmount.recordset,
            organisationWiseStatus: organisationWiseStatus
        });

    }
    catch (err) {

        console.log(err);
        return res.sendStatus(500);
    }
}
async function getMouTotalCountAmount_2021(req, res) {
    const conn = await pool;
 
    try {
        const totalCountAndAmount = await conn.query(` select count(*) AS 'total_mou', SUM(amount)/1000000000000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm WHERE gm.event_name = 'GMIS 2021' `);
 
        res.json(totalCountAndAmount.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getTotalMouAndAmountCategoryWise_2021(req, res) {
  const conn = await pool;
  const request = conn.request();

  const category = req.params.category;
  const organisationId = req.params.organisationId;
  console.log(organisationId, "newew");

  let query = `
    SELECT 
        COUNT(*) AS count, 
        ISNULL(SUM(amount) / 100000.0, 0) AS amount 
    FROM tbl_gmis_mou gm
    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id  
    WHERE gm.event_name = 'GMIS 2021'
  `;

  // ✅ organisation filter (same as 2016)
  if (organisationId && organisationId != 0) {
    query += ` AND gm.organisation_id = ${organisationId}`;
  }

  // category filter
  if (category === 'Other Organization') {
    query += `
      AND (mmt.organisation_category_id != 1 
           OR mmt.organisation_category_id IS NULL)
    `;
  } 
  else if (category === 'Major Ports') {
    query += ` AND mmt.organisation_category_id = 1`;
  }

  try {
    const result = await request.query(query);

    return res.json(
      result.recordset.length ? result.recordset : [{ count: 0, amount: 0 }]
    );
  } 
  catch (err) {
    console.error("getTotalMouAndAmountCategoryWise_2021 error:", err);
    return res.sendStatus(500);
  }
}
async function getGmisMouStageDetails_2021(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId;

        let query = `
            SELECT 
                present_status,
                COUNT(*) AS count,
                SUM(amount) / 100000 AS amount
            FROM tbl_gmis_mou
            WHERE event_name = 'GMIS 2021'
        `;

        // Apply organisation filter safely
        if (organisationId && organisationId != 0) {
            query += ` AND organisation_id = @organisationId `;
        }

        query += ` GROUP BY present_status `;

        const request = conn.request();

        // bind parameter safely
        if (organisationId && organisationId != 0) {
            request.input('organisationId', organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getOrganisationWiseCountAmountStatus_2023(req, res) {
  const conn = await pool;
  const request = conn.request();

  const category = req.params.category;
  const organisationId = req.params.organisationId || 0;

  let categorySql = '';
  if (category === 'Major Ports') {
    categorySql = ' AND mmt.organisation_category_id = 1';
  } else if (category === 'Other Organization') {
    categorySql = ' AND mmt.organisation_category_id != 1 AND mmt.organisation_category_id IS NOT NULL';
  }

  let orgSql = '';
  if (organisationId && organisationId != 0) {
    orgSql = ` AND gm.organisation_id = ${organisationId}`;
  }

  const baseTable = 'sagarmanthan_revamp.dbo.tbl_gmis_mou';

  const statusQuery = `
    SELECT mmt.organisation_label,
           gm.present_status,
           COUNT(*) AS count
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
    WHERE gm.event_name = 'GMIS 2023'
    ${categorySql}
    ${orgSql}
    GROUP BY mmt.organisation_label, gm.present_status
  `;

  const costQuery = `
    SELECT mmt.organisation_label,
           ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
    WHERE gm.event_name = 'GMIS 2023'
    ${categorySql}
    ${orgSql}
    GROUP BY mmt.organisation_label
  `;

  try {
    const costResult = await request.query(costQuery);
    const statusResult = await request.query(statusQuery);

    const costData = costResult.recordset || [];
    const statusData = statusResult.recordset || [];

    const map = Object.create(null);

    // COST mapping
    for (const c of costData) {
      const label = c.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_label: label,
        cost_of_mou: Number(c.cost_of_mou || 0),
        total_count: 0
      };
    }

    // STATUS mapping
    for (const s of statusData) {
      const label = s.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_label: label,
        cost_of_mou: 0,
        total_count: 0
      };

      const key = s.present_status || 'Unknown';
      map[label][key] = (map[label][key] || 0) + Number(s.count || 0);
      map[label].total_count += Number(s.count || 0);
    }

    return res.json(Object.values(map));

  } catch (err) {
    return res.status(500).json({
      message: "Server error executing queries.",
      error: err.message,
      category,
      organisationId
    });
  }
}

async function getOrganisationWiseStatusCount_2023(req, res) {
    const conn = await pool;

    try {
        const organisationId = parseInt(req.params.organisationId) || 0;

        let query = `
            SELECT 
                mmt.organisation_name, 
                COUNT(*) AS total_number_of_mous, 
                gm.present_status
            FROM tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt 
                ON gm.organisation_id = mmt.organisation_id
            WHERE gm.event_name = 'GMIS 2023'
        `;

        if (organisationId !== 0) {
            query += ` AND gm.organisation_id = @organisationId `;
        }

        query += `
            GROUP BY 
                mmt.organisation_name, 
                gm.present_status
        `;

        const request = conn.request();

        if (organisationId !== 0) {
            request.input("organisationId", organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getTotalMouAndAmountCategoryWise_2023(req, res) {
  const conn = await pool;
  const request = conn.request();

  const category = req.params.category;
  const organisationId = req.params.organisationId;
  console.log(organisationId, "newew");

  let query = `
    SELECT 
        COUNT(*) AS count, 
        ISNULL(SUM(amount) / 100000.0, 0) AS amount 
    FROM tbl_gmis_mou gm
    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id  
    WHERE gm.event_name = 'GMIS 2023'
  `;

  if (organisationId && organisationId != 0) {
    query += ` AND gm.organisation_id = ${organisationId}`;
  }

  if (category === 'Other Organization') {
    query += `
      AND (mmt.organisation_category_id != 1 
           OR mmt.organisation_category_id IS NULL)
    `;
  } 
  else if (category === 'Major Ports') {
    query += ` AND mmt.organisation_category_id = 1`;
  }

  try {
    const result = await request.query(query);

    return res.json(
      result.recordset.length ? result.recordset : [{ count: 0, amount: 0 }]
    );
  } 
  catch (err) {
    console.error("getTotalMouAndAmountCategoryWise_2023 error:", err);
    return res.sendStatus(500);
  }
}


async function getStatusWiseCountAmount_2021(req, res) {

    const conn = await pool;
    const request = conn.request();

    const category = req.params.category;
    const organisationId = req.params.organisationId;

    let query = `
        SELECT 
            gm.present_status AS status,
            COUNT(*) AS count,
            ISNULL(SUM(gm.amount), 0) AS amount
        FROM tbl_gmis_mou gm 
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id  
        WHERE gm.event_name = 'GMIS 2021'
    `;

    // Organisation filter
    if (organisationId && organisationId != 0) {
        query += ` AND gm.organisation_id = ${organisationId}`;
    }

    // Category filter
    if (category === 'Other Organization') {

        query += `
            AND mmt.organisation_category_id != 1 
            AND mmt.organisation_category_id IS NOT NULL
        `;
    } 
    else if (category === 'Major Ports') {

        query += `
            AND mmt.organisation_category_id = 1
        `;
    }

    query += ` GROUP BY gm.present_status`;

    try {

        const result = await request.query(query);

        return res.json(result.recordset);

    } catch (err) {

        console.error("getStatusWiseCountAmount_2021 error:", err);

        return res.sendStatus(500);
    }
}
async function getStatusWiseCountAmount_2023(req, res) {

    const conn = await pool;
    const request = conn.request();

    const category = req.params.category;
    const organisationId = req.params.organisationId;

    let query = `
        SELECT 
            gm.present_status AS status,
            COUNT(*) AS count,
            ISNULL(SUM(gm.amount), 0) AS amount
        FROM tbl_gmis_mou gm 
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id  
        WHERE gm.event_name = 'GMIS 2023'
    `;

    // Organisation filter
    if (organisationId && organisationId != 0) {
        query += ` AND gm.organisation_id = ${organisationId}`;
    }

    // Category filter
    if (category === 'Other Organization') {

        query += `
            AND mmt.organisation_category_id != 1 
            AND mmt.organisation_category_id IS NOT NULL
        `;
    } 
    else if (category === 'Major Ports') {

        query += `
            AND mmt.organisation_category_id = 1
        `;
    }

    query += ` GROUP BY gm.present_status`;

    try {

        const result = await request.query(query);
        return res.json(result.recordset);

    } catch (err) {

        console.error("getStatusWiseCountAmount_2023 error:", err);
        return res.sendStatus(500);
    }
}
async function getOrganisationWiseCountAmount_2023(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId || 0;

        const amountCountWiseMou = await conn.query(`
            select 
                mmt.organisation_code,
                count(*) AS 'total_number_of_mous',
                SUM(amount)/10000000 AS 'cost_of_mou'
            from tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt 
                ON gm.organisation_id = mmt.organisation_id
            WHERE gm.event_name = 'GMIS 2023'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
            GROUP BY mmt.organisation_code
            ORDER BY total_number_of_mous DESC
        `);

        const totalCountAndAmount = await conn.query(`
            select 
                count(*) AS 'total_mou',
                SUM(amount)/1000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm
            WHERE gm.event_name = 'GMIS 2023'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
        `);

        const statusesResult = await conn.query(`
            SELECT DISTINCT present_status
            FROM tbl_gmis_mou
            WHERE event_name = 'GMIS 2023'
            ${organisationId != 0 ? `AND organisation_id = ${organisationId}` : ''}
        `);

        const statuses = statusesResult.recordset.map(row => row.present_status);

        const organisationWiseStatus = {};

        for (const status of statuses) {

            const statusData = await conn.query(`
                SELECT 
                    mmt.organisation_code,
                    COUNT(*) AS 'count'
                FROM tbl_gmis_mou gm
                LEFT JOIN mmt_organisation mmt 
                    ON gm.organisation_id = mmt.organisation_id
                WHERE present_status = '${status}'
                  AND gm.event_name = 'GMIS 2023'
                  ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
                GROUP BY mmt.organisation_code
            `);

            organisationWiseStatus[status] = statusData.recordset;
        }

        res.json({
            amountCountWiseMou: amountCountWiseMou.recordset,
            totalCountAndAmount: totalCountAndAmount.recordset,
            organisationWiseStatus: organisationWiseStatus
        });

    }
    catch (err) {

        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMouTotalCountAmount_2023(req, res) {
     const conn = await pool;
 
    try {
        const totalCountAndAmount = await conn.query(` select count(*) AS 'total_mou', SUM(amount)/1000000000000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm WHERE gm.event_name = 'GMIS 2023' `);
 
        res.json(totalCountAndAmount.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
// async function getMouTotalCountAmount_2023(req, res) {
//  try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         console.log(roleId,"role");
//         console.log(organisationID,"orgId")

//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2023'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2023'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }
// async function getMouTotalAmountAndCount_2023(req, res) {
// try {
//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;

//         console.log(roleId, "role");
//         console.log(organisationID, "orgId");

//         const conn = await pool;
//         const request = conn.request();

//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     COUNT(*) AS count, 
//                     SUM(ISNULL(amount, 0)) AS amount
//                 FROM tbl_gmis_mou
//                 WHERE event_name = 'GMIS 2023'
//             `;

//         } else {
//             query = `
//                 SELECT 
//                     COUNT(*) AS count, 
//                     SUM(ISNULL(amount, 0)) AS amount
//                 FROM tbl_gmis_mou
//                 WHERE event_name = 'GMIS 2023'
//                 AND organisation_id = @organisationID
//             `;
//         }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         return res.sendStatus(500);
//     }
// }
// async function getGmisMouStageDetails_2023(req, res) {
//   try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         console.log(roleId,"role");
//         console.log(organisationID,"orgId")

//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2023'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2023'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }
async function getGmisMouStageDetails_2023(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId;

        let query = `
            SELECT 
                present_status,
                COUNT(*) AS count,
                SUM(amount) / 100000 AS amount
            FROM tbl_gmis_mou
            WHERE event_name = 'GMIS 2023'
        `;

        // Apply organisation filter safely
        if (organisationId && organisationId != 0) {
            query += ` AND organisation_id = @organisationId `;
        }

        query += ` GROUP BY present_status `;

        const request = conn.request();

        // bind parameter safely
        if (organisationId && organisationId != 0) {
            request.input('organisationId', organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getGmisMouStageDetails_2025(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId;

        let query = `
            SELECT 
                present_status,
                COUNT(*) AS count,
                SUM(amount) / 100000 AS amount
            FROM tbl_gmis_mou
            WHERE event_name = 'GMIS 2025'
        `;

        // Apply organisation filter safely
        if (organisationId && organisationId != 0) {
            query += ` AND organisation_id = @organisationId `;
        }

        query += ` GROUP BY present_status `;

        const request = conn.request();

        // bind parameter safely
        if (organisationId && organisationId != 0) {
            request.input('organisationId', organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getOrganisationWiseCountAmount_2025(req, res) {

    const conn = await pool;

    try {

        const organisationId = req.params.organisationId || 0;

        const amountCountWiseMou = await conn.query(`
            select 
                mmt.organisation_code,
                count(*) AS 'total_number_of_mous',
                SUM(amount)/10000000 AS 'cost_of_mou'
            from tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt 
                ON gm.organisation_id = mmt.organisation_id
            WHERE gm.event_name = 'GMIS 2025'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
            GROUP BY mmt.organisation_code
            ORDER BY total_number_of_mous DESC
        `);

        const totalCountAndAmount = await conn.query(`
            select 
                count(*) AS 'total_mou',
                SUM(amount)/1000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm
            WHERE gm.event_name = 'GMIS 2025'
            ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
        `);

        const statusesResult = await conn.query(`
            SELECT DISTINCT present_status
            FROM tbl_gmis_mou
            WHERE event_name = 'GMIS 2025'
            ${organisationId != 0 ? `AND organisation_id = ${organisationId}` : ''}
        `);

        const statuses = statusesResult.recordset.map(row => row.present_status);

        const organisationWiseStatus = {};

        for (const status of statuses) {

            const statusData = await conn.query(`
                SELECT 
                    mmt.organisation_code,
                    COUNT(*) AS 'count'
                FROM tbl_gmis_mou gm
                LEFT JOIN mmt_organisation mmt 
                    ON gm.organisation_id = mmt.organisation_id
                WHERE present_status = '${status}'
                  AND gm.event_name = 'GMIS 2025'
                  ${organisationId != 0 ? `AND gm.organisation_id = ${organisationId}` : ''}
                GROUP BY mmt.organisation_code
            `);

            organisationWiseStatus[status] = statusData.recordset;
        }

        res.json({
            amountCountWiseMou: amountCountWiseMou.recordset,
            totalCountAndAmount: totalCountAndAmount.recordset,
            organisationWiseStatus: organisationWiseStatus
        });

    }
    catch (err) {

        console.log(err);
        return res.sendStatus(500);
    }
}
// async function getMouTotalCountAmount_2025(req, res) {
//     try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2025'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2025'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }
async function getMouTotalCountAmount_2025(req, res) {
    const conn = await pool;
 
    try {
        const totalCountAndAmount = await conn.query(` select count(*) AS 'total_mou', SUM(amount)/1000000000000 AS 'total_cost_of_mou'
            from tbl_gmis_mou gm WHERE gm.event_name = 'GMIS 2025' `);
 
        res.json(totalCountAndAmount.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getGmisMouStageDetails_2025_org(req, res) {
 try {
        const roleId = req.params.roleId;
        const organisationID = req.params.organisationID;

        console.log(roleId, "role");
        console.log(organisationID, "orgId");

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        const query = `
            SELECT 
                g.present_status,
                g.organisation_id,
                o.organisation_name,
                COUNT(*) AS count,
                SUM(ISNULL(g.amount, 0)) / 100000 AS amount
            FROM tbl_gmis_mou g
            LEFT JOIN mmt_organisation o
                ON g.organisation_id = o.organisation_id
            WHERE g.event_name = 'GMIS 2025'
            AND g.organisation_id = @organisationID
            GROUP BY g.present_status, g.organisation_id, o.organisation_name
            ORDER BY g.present_status
        `;

        const result = await request.query(query);

        return res.json({ rowData: result.recordset });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
async function getGmisMouStageDetails_2021_org(req, res) {
  try {
        const roleId = req.params.roleId;
        const organisationID = req.params.organisationID;

        console.log(roleId, "role");
        console.log(organisationID, "orgId");

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        const query = `
            SELECT 
                g.present_status,
                g.organisation_id,
                o.organisation_name,
                COUNT(*) AS count,
                SUM(ISNULL(g.amount, 0)) / 100000 AS amount
            FROM tbl_gmis_mou g
            LEFT JOIN mmt_organisation o
                ON g.organisation_id = o.organisation_id
            WHERE g.event_name = 'GMIS 2021'
            AND g.organisation_id = @organisationID
            GROUP BY g.present_status, g.organisation_id, o.organisation_name
            ORDER BY g.present_status
        `;

        const result = await request.query(query);

        return res.json({ rowData: result.recordset });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
async function getGmisMouStageDetails_org(req, res) {
  try {
        const roleId = req.params.roleId;
        const organisationID = req.params.organisationID;

        console.log(roleId, "role");
        console.log(organisationID, "orgId");

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        const query = `
            SELECT 
                g.present_status,
                g.organisation_id,
                o.organisation_name,
                COUNT(*) AS count,
                SUM(ISNULL(g.amount, 0)) / 100000 AS amount
            FROM tbl_gmis_mou g
            LEFT JOIN mmt_organisation o
                ON g.organisation_id = o.organisation_id
            WHERE g.event_name = 'GMIS 2016'
            AND g.organisation_id = @organisationID
            GROUP BY g.present_status, g.organisation_id, o.organisation_name
            ORDER BY g.present_status
        `;

        const result = await request.query(query);

        return res.json({ rowData: result.recordset });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
async function getGmisMouStageDetails_2023_org(req, res) {
    try {
        const roleId = req.params.roleId;
        const organisationID = req.params.organisationID;

        console.log(roleId, "role");
        console.log(organisationID, "orgId");

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);

        const query = `
            SELECT 
                g.present_status,
                g.organisation_id,
                o.organisation_name,
                COUNT(*) AS count,
                SUM(ISNULL(g.amount, 0)) / 100000 AS amount
            FROM tbl_gmis_mou g
            LEFT JOIN mmt_organisation o
                ON g.organisation_id = o.organisation_id
            WHERE g.event_name = 'GMIS 2023'
            AND g.organisation_id = @organisationID
            GROUP BY g.present_status, g.organisation_id, o.organisation_name
            ORDER BY g.present_status
        `;

        const result = await request.query(query);

        return res.json({ rowData: result.recordset });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getTotalMouAndAmountCategoryWise_2025(req, res) {
  const conn = await pool;
  const request = conn.request();

  const category = req.params.category;
  const organisationId = req.params.organisationId;
  console.log(organisationId, "newew");

  let query = `
    SELECT 
        COUNT(*) AS count, 
        ISNULL(SUM(amount) / 100000.0, 0) AS amount 
    FROM tbl_gmis_mou gm
    LEFT JOIN mmt_organisation mmt 
        ON gm.organisation_id = mmt.organisation_id  
    WHERE gm.event_name = 'GMIS 2025'
  `;


  if (organisationId && organisationId != 0) {
    query += ` AND gm.organisation_id = ${organisationId}`;
  }

  // category filter (same pattern as 2021)
  if (category === 'Other Organization') {
    query += `
      AND (mmt.organisation_category_id != 1 
           OR mmt.organisation_category_id IS NULL)
    `;
  } 
  else if (category === 'Major Ports') {
    query += ` AND mmt.organisation_category_id = 1`;
  }

  try {
    const result = await request.query(query);

    return res.json(
      result.recordset.length ? result.recordset : [{ count: 0, amount: 0 }]
    );
  } 
  catch (err) {
    console.error("getTotalMouAndAmountCategoryWise_2023 error:", err);
    return res.sendStatus(500);
  }
}


async function getStatusWiseCountAmount_2025(req, res) {

    const conn = await pool;
    const request = conn.request();

    const category = req.params.category;
    const organisationId = req.params.organisationId;

    let query = `
        SELECT 
            gm.present_status AS status,
            COUNT(*) AS count,
            ISNULL(SUM(gm.amount), 0) AS amount
        FROM tbl_gmis_mou gm 
        LEFT JOIN mmt_organisation mmt 
            ON gm.organisation_id = mmt.organisation_id  
        WHERE gm.event_name = 'GMIS 2025'
    `;

    // Organisation filter
    if (organisationId && organisationId != 0) {
        query += ` AND gm.organisation_id = ${organisationId}`;
    }

    // Category filter
    if (category === 'Other Organization') {

        query += `
            AND mmt.organisation_category_id != 1 
            AND mmt.organisation_category_id IS NOT NULL
        `;
    } 
    else if (category === 'Major Ports') {

        query += `
            AND mmt.organisation_category_id = 1
        `;
    }

    query += ` GROUP BY gm.present_status`;

    try {

        const result = await request.query(query);
        return res.json(result.recordset);

    } catch (err) {

        console.error("getStatusWiseCountAmount_2025 error:", err);
        return res.sendStatus(500);
    }
}

async function getOrganisationWiseCountAmountStatus_2025(req, res) {

  const conn = await pool;
  const request = conn.request();

  const category = req.params.category;
  const organisationId = req.params.organisationId || 0;

  let categorySql = '';

  if (category === 'Major Ports') {
    categorySql = ' AND mmt.organisation_category_id = 1';
  } else if (category === 'Other Organization') {
    categorySql = `
      AND mmt.organisation_category_id != 1
      AND mmt.organisation_category_id IS NOT NULL
    `;
  }

  let orgSql = '';
  if (organisationId && organisationId != 0) {
    orgSql = ` AND gm.organisation_id = ${organisationId}`;
  }

  const baseTable = 'sagarmanthan_revamp.dbo.tbl_gmis_mou';

  const statusQuery = `
    SELECT mmt.organisation_label,
           gm.present_status,
           COUNT(*) AS count
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
    WHERE gm.event_name = 'GMIS 2025'
    ${categorySql}
    ${orgSql}
    GROUP BY mmt.organisation_label, gm.present_status
  `;

  const costQuery = `
    SELECT mmt.organisation_label,
           ISNULL(SUM(gm.amount) / 100000.0, 0) AS cost_of_mou
    FROM ${baseTable} gm
    LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
    WHERE gm.event_name = 'GMIS 2025'
    ${categorySql}
    ${orgSql}
    GROUP BY mmt.organisation_label
  `;

  try {

    const costResult = await request.query(costQuery);
    const statusResult = await request.query(statusQuery);

    const costData = costResult.recordset || [];
    const statusData = statusResult.recordset || [];

    const map = Object.create(null);

    for (const c of costData) {
      const label = c.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_label: label,
        cost_of_mou: Number(c.cost_of_mou || 0),
        total_count: 0
      };
    }

    for (const s of statusData) {
      const label = s.organisation_label || 'Unknown';

      map[label] = map[label] || {
        organisation_label: label,
        cost_of_mou: 0,
        total_count: 0
      };

      const key = s.present_status || 'Unknown';

      map[label][key] = (map[label][key] || 0) + Number(s.count || 0);
      map[label].total_count += Number(s.count || 0);
    }

    return res.json(Object.values(map));

  } catch (err) {

    return res.status(500).json({
      message: "Server error executing queries (debug)",
      error: err.message,
      category,
      organisationId
    });
  }
}
async function getOrganisationWiseStatusCount_2025(req, res) {
    const conn = await pool;

    try {
        const organisationId = parseInt(req.params.organisationId) || 0;

        let query = `
            SELECT 
                mmt.organisation_name, 
                COUNT(*) AS total_number_of_mous, 
                gm.present_status
            FROM tbl_gmis_mou gm
            LEFT JOIN mmt_organisation mmt 
                ON gm.organisation_id = mmt.organisation_id
            WHERE gm.event_name = 'GMIS 2025'
        `;

        if (organisationId !== 0) {
            query += ` AND gm.organisation_id = @organisationId `;
        }

        query += `
            GROUP BY 
                mmt.organisation_name, 
                gm.present_status
        `;

        const request = conn.request();

        if (organisationId !== 0) {
            request.input("organisationId", organisationId);
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
    async function gmisPdfFileDownload(req, res) 
    {
        const { fileName } = req.query;
    
        // Base folder path
        const uploadDestinationBase = './fileuploads/gmis_mou_fileupload';
        // Construct the file path by directly joining the base path and fileName
        const filePath = path.join(uploadDestinationBase, fileName); // Correct file path construction
    
        fs.readFile(filePath, (err, data) => {
            if (err) {
                // console.error("Error reading file:", err);
                res.status(500).send({ error: "Internal Server Error" });
            } else {
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'application/pdf');
                res.send(data);
            }
        });
    }

     async function gmisfileDelete(req, res) 
        {
            try {
                const { fileName } = req.query;
                // console.log("Received fileName:", fileName);
        
                if (!fileName) {
                    return res.status(400).send({ error: "File name is required" });
                }
        
                const uploadDestination = './fileuploads/gmis_mou_fileupload'; // Base directory
                const filePath = path.join(uploadDestination, fileName); // Construct the correct file path
        
                // Update the database to set projectcompletion to NULL
                const conn = await pool;
                const request = conn.request();
                request.input('fileName', fileName);
        
                const result = await request.query(`
                    UPDATE tbl_gmis_mou
                    SET document_uploader = NULL
                    WHERE document_uploader = @fileName
                `);
        
                if (result.rowsAffected[0] > 0) {
                    // console.log(`Database updated. File ${fileName} removed from document_uploader.`);
                    res.status(200).send({ message: "File deleted successfully and database updated" });
                } else {
                    // console.log(`No database record found for file ${fileName}.`);
                    res.status(404).send({ error: "No matching database record found" });
                }
            } catch (err) {
                // console.error("Error deleting file or updating database:", err);
                res.status(500).send({ error: "Internal Server Error" });
            }
        }

        
async function getRevisedfinancialprogressdate(req, res) {
    const mouID = req.params.mouID;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("mouID", mouID);

        const result = await request.query(`
            SELECT
            gm.id,
            gm.financial_progress_date,
            gm.financial_progress_percentage,
            gm.created_on,
            pfp.revised_financial_progress_date,
            pfp.revised_financial_progress_percentage,
            pfp.revised_on
        FROM tbl_gmis_mou AS gm
        LEFT JOIN tbl_gmis_mou_financial_progress AS pfp
            ON gm.id = pfp.mou_id
        WHERE gm.id = @mouID
        ORDER BY pfp.revised_on ASC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getRevisedphysicalprogressdate(req, res) {
    const mouID = req.params.mouID;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("mouID", mouID);

        const result = await request.query(`
            SELECT
            gm.id,
            gm.physical_progress_date,
            gm.physical_progress_percentage,
            gm.created_on,
            pff.revised_physical_progress_date,
            pff.revised_physical_progress_percentage,
            pff.revised_on
        FROM tbl_gmis_mou AS gm
        LEFT JOIN tbl_gmis_mou_physical_progress AS pff
            ON gm.id = pff.mou_id
        WHERE gm.id = @mouID
        ORDER BY pff.revised_on ASC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

        async function addRevisedphysicalprogressdate(req, res) 
        {
            const mouID                      = req.body.mouID;
            const targetphysicalProgressDate    = req.body.targetphysicalProgressDate;
            const targetphysicalPercentage    = req.body.targetphysicalPercentage;

        if (targetphysicalProgressDate == "") {
                targetphysicalProgressDate = null;
            }
        if (targetphysicalPercentage == "") {
                targetphysicalPercentage = null;
            }
            const conn = await pool;
            const request = conn.request();
            request.input("mouID", mouID);
            request.input("targetphysicalProgressDate", targetphysicalProgressDate);
            request.input("targetphysicalPercentage", targetphysicalPercentage);  
            try {
                // if (subProjectID == -1) {
                    const result = await request.query(`INSERT tbl_gmis_mou_physical_progress (mou_id, revised_physical_progress_date, revised_physical_progress_percentage
                ) 
                        VALUES (@mouID, @targetphysicalProgressDate, @targetphysicalPercentage)`
                    );

                    res.sendStatus(201);

                // }
        
            }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

        async function addRevisedfinancialprogressdate(req, res) 

        {
            const mouID                      = req.body.mouID;
            const targetfinancialProgressDate    = req.body.targetfinancialProgressDate;
            const targetfinancialPercentage    = req.body.targetfinancialPercentage;

            if (targetfinancialProgressDate == "") {
                    targetfinancialProgressDate = null;
                }
            if (targetfinancialPercentage == "") {
                    targetfinancialPercentage = null;
                }
            const conn = await pool;
            const request = conn.request();
            request.input("mouID", mouID);
            request.input("targetfinancialProgressDate", targetfinancialProgressDate);
            request.input("targetfinancialPercentage", targetfinancialPercentage);  
            try {
                // if (subProjectID == -1) {
                    const result = await request.query(`INSERT tbl_gmis_mou_financial_progress (mou_id, revised_financial_progress_date, revised_financial_progress_percentage
                ) 
                        VALUES (@mouID, @targetfinancialProgressDate, @targetfinancialPercentage)`
                    );

                    res.sendStatus(201);

                // }
        
            }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
export default {
    getMouCategory, submitGmisMouData, getGmisMouData, getGmisMouChartData, updateGmisMouData, getGmisMouDataByID, getGmisMouStageDetails,getGmisMouSecondParty, getGmisMouVibhasNavicCell, getGmisMouCategoryName, getGmisMouPresentStatus, getOrganisationWiseCountAmount,getOrganisationWiseStatusCount_2023,getOrganisationWiseCountAmount_2023,getGmisMouStageDetails_2023, getTotalMouAndAmountCategoryWise_2025,getOrganisationWiseCountAmountStatusorgView_2021_category,getOrganisationWiseCountAmountStatusorgView_2023_category,upload,fileUpload,gmisfileDelete,addRevisedfinancialprogressdate,getRevisedfinancialprogressdate,getRevisedphysicalprogressdate,
    getStatusWiseCountAmount, getOrganisationWiseStatusCount, getGmisMouDataByOrganisationAndStatus, getOrganisationWiseCountAmountStatus, getMouTotalCountAmount,getTotalMouAndAmountCategoryWise_2021,getGmisMouStageDetails_2021,getOrganisationWiseCountAmountStatus_2023,getStatusWiseCountAmount_2021,getGmisMouStageDetails_2025,getGmisMouStageDetails_2025_org,getGmisMouStageDetails_2023_org,getGmisMouStageDetails_2021_org,getGmisMouStageDetails_org,getOrganisationWiseCountAmountStatusorgView_2025_category,getOrganisationWiseCountAmountStatusorgView_category,addNewgmisFileupload,gmisPdfFileDownload,addRevisedphysicalprogressdate,
    getMouCategories, getTotalMouAndAmountCategoryWise, getOrgWiseMouOrder,getOrganisationWiseCountAmountStatus_2021,getOrganisationWiseStatusCount_2021,getOrganisationWiseCountAmount_2021,getMouTotalCountAmount_2021,getTotalMouAndAmountCategoryWise_2023,getStatusWiseCountAmount_2023,getMouTotalCountAmount_2023,getOrganisationWiseCountAmount_2025,getOrganisationWiseStatusCountorgView_2025,getMouTotalCountAmount_2025,getStatusWiseCountAmount_2025,getOrganisationWiseCountAmountStatus_2025,getOrganisationWiseStatusCount_2025,getOrganisationWiseCountAmountStatusorgView,getOrganisationWiseStatusCountorgView,getTotalMouAndAmountyearWise,getGmisDrilldownData,
    getOrganisationWiseStatusCountorgView_2021,getOrganisationWiseCountAmountStatusorgView_2021,getOrganisationWiseCountAmountStatusorgView_2023,getOrganisationWiseStatusCountorgView_2023,getOrganisationWiseCountAmountStatusorgView_2025,getYearWisegmisData
};