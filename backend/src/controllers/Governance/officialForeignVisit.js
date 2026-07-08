import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';


const uploadDestination = './fileuploads/Official_Foreign_Visit';

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Official_Foreign_Visit");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } 
});


async function getOFVData(req, res) {
    const conn = await pool;
        const userID = req.params.userID;
        const organisationID = req.params.organisationID;
        // console.log(organisationID,"orgiddd")


    try {
        const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id } = userResult.recordset[0];
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            const result = await conn.query(` SELECT 
                ofv.id, 
                ofv.fv_id,
                ofv.year, 
                ofv.name, 
                ofv.visit,
                ofv.other_visit_type,
                mmt_ofv_stage.fv_stage_name,
                desig.designation, 
                ofv.other_designation,
                org.organisation_name, 
                ofv.to_date,
                ofv.duration, 
                vt.visit_type_name,
                ofv.check_sanctioned, 
                ofv.purpose,
                ofv.visited_completed, 
                ofv.created_by, 
                ofv.updated_date,
                
                -- Subquery to fetch latest 'Tour' document
                (SELECT TOP 1 doc.file_name
                FROM tbl_ofv_doc doc
                WHERE doc.ofv_id = ofv.id AND doc.doc_related = 'Tour'
                ORDER BY doc.id DESC) AS tour_file_name,

                -- Subquery to fetch latest 'Sanction' document
                (SELECT TOP 1 doc.file_name
                FROM tbl_ofv_doc doc
                WHERE doc.ofv_id = ofv.id AND doc.doc_related = 'Sanction'
                ORDER BY doc.id DESC) AS sanction_file_name,

                -- GOI Designation Mapping
                CASE 
                    WHEN ofv.GOI_designation = 'Secretary' THEN 'Secretary'
                    WHEN ofv.GOI_designation = 'SS' THEN 'Special Secretary'
                    WHEN ofv.GOI_designation = 'AS' THEN 'Additional Secretary'
                    WHEN ofv.GOI_designation = 'JS' THEN 'Joint Secretary'
                    WHEN ofv.GOI_designation = 'DIR' THEN 'Director'
                    WHEN ofv.GOI_designation = 'DS' THEN 'Deputy Secretary'
                    WHEN ofv.GOI_designation = 'US' THEN 'Under Secretary'
                    WHEN ofv.GOI_designation = 'SO' THEN 'Section Officer'
                    WHEN ofv.GOI_designation = 'YP/ASO' THEN 'Young Professionals/Assistant Section Officer'
                    ELSE ofv.GOI_designation 
                END AS goi_designation

            FROM 
                tbl_official_foreign_visit ofv
            LEFT JOIN 
                mmt_organisation org ON org.organisation_id = ofv.organisation
            LEFT JOIN
                mmt_ofv_visit_type vt ON vt.Id = ofv.visit_type
            LEFT JOIN
                mmt_designation desig ON desig.id = ofv.designation_organisation
            INNER JOIN 
                mmt_ofv_stage ON mmt_ofv_stage.fv_stage_id = ofv.visit
            ORDER BY 
                ofv.id;

            `);
            res.json(result.recordset);
        }

        else {

        const result = await conn.query(`

            SELECT 
                ofv.id, 
                ofv.fv_id,
                ofv.year, 
                ofv.name, 
                ofv.visit,
                ofv.other_visit_type,
                mmt_ofv_stage.fv_stage_name,
                desig.designation, 
                ofv.other_designation,
                org.organisation_name, 
                ofv.to_date,
                ofv.duration, 
                vt.visit_type_name,
                ofv.check_sanctioned, 
                ofv.purpose,
                ofv.visited_completed, 
                ofv.created_by, 
                ofv.updated_date,
                ofv.organisation,

                -- Tour document
                (
                    SELECT TOP 1 doc.file_name
                    FROM tbl_ofv_doc doc
                    WHERE doc.ofv_id = ofv.id 
                    AND doc.doc_related = 'Tour'
                    ORDER BY doc.id DESC
                ) AS tour_file_name,

                -- Sanction document
                (
                    SELECT TOP 1 doc.file_name
                    FROM tbl_ofv_doc doc
                    WHERE doc.ofv_id = ofv.id 
                    AND doc.doc_related = 'Sanction'
                    ORDER BY doc.id DESC
                ) AS sanction_file_name,

                -- GOI Designation Mapping
                CASE 
                    WHEN ofv.GOI_designation = 'Secretary' THEN 'Secretary'
                    WHEN ofv.GOI_designation = 'SS' THEN 'Special Secretary'
                    WHEN ofv.GOI_designation = 'AS' THEN 'Additional Secretary'
                    WHEN ofv.GOI_designation = 'JS' THEN 'Joint Secretary'
                    WHEN ofv.GOI_designation = 'DIR' THEN 'Director'
                    WHEN ofv.GOI_designation = 'DS' THEN 'Deputy Secretary'
                    WHEN ofv.GOI_designation = 'US' THEN 'Under Secretary'
                    WHEN ofv.GOI_designation = 'SO' THEN 'Section Officer'
                    WHEN ofv.GOI_designation = 'YP/ASO' THEN 'Young Professionals/Assistant Section Officer'
                    ELSE ofv.GOI_designation 
                END AS goi_designation

            FROM tbl_official_foreign_visit ofv

            LEFT JOIN mmt_organisation org 
                ON org.organisation_id = ofv.organisation

            LEFT JOIN mmt_ofv_visit_type vt 
                ON vt.Id = ofv.visit_type

            LEFT JOIN mmt_designation desig 
                ON desig.id = ofv.designation_organisation

            INNER JOIN mmt_ofv_stage 
                ON mmt_ofv_stage.fv_stage_id = ofv.visit

            WHERE ofv.organisation = ${organisationID}

            ORDER BY ofv.id

        `);

        res.json(result.recordset);
    }
        // SELECT 
        //         tbl_official_foreign_visit.id, 
        //         tbl_official_foreign_visit.fv_id,
        //         year, 
        //         name, 
        //         visit,
        //         mmt_designation.designation, 
        //         mmt_organisation.organisation_name, 
        //         duration, 
        //         visit_type_name,
        //         check_sanctioned, 
        //         purpose, 
        //         MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS tour_file_name,
        //         MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS sanction_file_name,
        //         CASE 
        //             WHEN GOI_designation = 'Secretary' THEN 'Secretary'
        //             WHEN GOI_designation = 'SS' THEN 'Special Secretary'
        //             WHEN GOI_designation = 'AS' THEN 'Additional Secretary'
        //             WHEN GOI_designation = 'JS' THEN 'Joint Secretary'
        //             WHEN GOI_designation = 'DIR' THEN 'Director'
        //             WHEN GOI_designation = 'DS' THEN 'Deputy Secretary'
        //             WHEN GOI_designation = 'US' THEN 'Under Secretary'
        //             WHEN GOI_designation = 'SO' THEN 'Section Officer'
        //             WHEN GOI_designation = 'YP/ASO' THEN 'Young Professionals/Assistant Section Officer'
        //             ELSE GOI_designation 
        //         END AS goi_designation
        //     FROM 
        //         tbl_official_foreign_visit
        //     LEFT JOIN (
        //         SELECT 
        //             ofv_id,
        //             file_name,
        //             doc_related
        //         FROM 
        //             tbl_ofv_doc
        //     ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
        //     LEFT JOIN 
        //         mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
        //     LEFT JOIN
        //         mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
        //     LEFT JOIN
        //         mmt_designation ON mmt_designation.id = tbl_official_foreign_visit.designation_organisation
        //     GROUP BY 
        //         tbl_official_foreign_visit.id, tbl_official_foreign_visit.fv_id,
        //         year, 
        //         name, 
        //         visit,
        //         mmt_designation.designation, 
        //         mmt_organisation.organisation_name, 
        //         duration, 
        //         visit_type_name, 
        //         purpose,
        //         goi_designation,
        //         check_sanctioned
        //     ORDER BY 
        //         tbl_official_foreign_visit.id;

    
        // res.json(result.recordset);
        // console.log('result', result);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateOFVData(req, res) {
    const ID = req.params.ID;
    const conn = await pool;
    const request = conn.request();

    request.input("ID", ID);

    try {
        const result = await request.query(`
            SELECT * FROM tbl_official_foreign_visit WHERE id = @ID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUploadData(req, res) {
    const ID = req.params.ID;
    const conn = await pool;
    const request = conn.request();

    request.input("ID", ID);

    try {
        const result = await request.query(`
            SELECT * FROM tbl_ofv_doc WHERE ofv_id = @ID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getFvID() {
    const conn = await pool;

    const result = await conn.query(`SELECT TOP(1) fv_id from tbl_official_foreign_visit order by fv_id DESC;`);

    let foreignVisitId;
    if (result.recordset.length > 0) {
        const lastFVID = result.recordset[0].fv_id;
        // console.log("last", lastFVID)	    

        let lastIndex = parseInt(lastFVID.slice(2))
        // console.log(lastIndex)

        // let lastIndex = substr(lastFVID[0], 1);
        let nextIndex = lastIndex + 1;
        if (nextIndex < 10) {
            foreignVisitId = "FV000" + nextIndex;
        }
        else if (nextIndex < 100) {
            foreignVisitId = "FV00" + nextIndex;
        }
        else if (nextIndex < 1000) {
            foreignVisitId = "FV0" + nextIndex;
        }
        else {
            foreignVisitId = "FV" + nextIndex;
        }
    }
    else {
        foreignVisitId = "FV0001";
    }

    // console.log(foreignVisitId)
    return foreignVisitId;

};
// getFvID();

async function addOFVData(req, res) {

    // let organisationSelect = req.body.organisationSelect;
    let foreignVisitId = await getFvID();
    const {
        reportYear,
        visit,
        visitPurpose,
        title,
        officerName,
        newOrganisation,
        designationGOI,
        visitFrom,
        visitTo,
        visitDuration,
        noCities,
        ministryDelegation,
        FVMS,
        authority,
        sanctionedAuthority,
        tourSanctioned,
        userID
    } = req.body;
    
    let {
        visitType,
        newVisitType,
        country,
        organisationSelect,
        city,
        otherCityName,
        cityNames,
        remarks,
        designation,
        newDesignation,
        sponsoringAgency,
        checkSanctioned
    } = req.body;
    
    if (designation?.toString().trim().toLowerCase() === "others") {
        designation = 115;
    }

    if (Array.isArray(country)) {
        country = country.join(",");
    }
    if (Array.isArray(city)) {
        city = city.join(",");
    }

    if (Array.isArray(sponsoringAgency)) {
        sponsoringAgency = sponsoringAgency.join(",");
    }

    if (Array.isArray(cityNames)) {
        cityNames = cityNames.join(",");
    }

    if(!remarks || remarks == ''){
        remarks = null;
    }

    if(!otherCityName || otherCityName == ''){
        otherCityName = null;
    }


    if( visit == "1"){
        checkSanctioned = 0;
    }

    if( visit == "3"){
        checkSanctioned = 1;
    }
    // Assuming conn is your database connection object
    const conn = await pool;
    const request = conn.request();

    // if (isNaN(visitType)) {

    //     request.input("visitType", visitType);

    //     const insertVisitTypeID = await request.query(`
    //         INSERT INTO mmt_ofv_visit_type (visit_type_name) VALUES (@visitType);        
    //     `);

    //     const visitTypeID = await request.query(`
    //         SELECT TOP 1 Id
    //         FROM mmt_ofv_visit_type ORDER BY Id DESC;        
    //     `);
    //     visitType = (visitTypeID.recordset[0].Id);
    // }

//     let finalDesignation;

// if (isNaN(designation)) {
//     request.input("newDesignation", designation);

//     const result = await request.query(`
//         INSERT INTO mmt_designation (designation)
//         OUTPUT INSERTED.id
//         VALUES (@newDesignation);
//     `);

//     finalDesignation = result.recordset[0].id;
// } else {
//     finalDesignation = designation;
// }


    //   let valueForDbSanctioned;
    // if (tourSanctioned === 1) {
    //     valueForDbSanctioned = 1; // User explicitly selected 'Yes'
    // } else if (tourSanctioned === 0) {
    //     valueForDbSanctioned = 0; // User explicitly selected 'No'
    // } else {
    //     valueForDbSanctioned = null; // User did not select, send NULL to DB
    // }


        let valueForDbSanctioned;
        // finalDesignation = designation;

        const tourSanctionedStr = String(tourSanctioned).toLowerCase(); // normalize
        if (tourSanctionedStr === 'yes' || tourSanctionedStr === '1' || tourSanctioned === true) {
	    valueForDbSanctioned = 1;
		} else if (tourSanctionedStr === 'no' || tourSanctionedStr === '0' || tourSanctioned === false) {
   		 valueForDbSanctioned = 0;
		} else {
 			   valueForDbSanctioned = null; // for cases like undefined or empty string
			}
    
    request.input("foreignVisitId", foreignVisitId);    
    request.input("reportYear", reportYear);
    request.input("visit", visit);
    request.input("visitType", visitType);
    request.input("newVisitType", newVisitType);
    request.input("visitPurpose", visitPurpose);
    request.input("title", title);
    request.input("officerName", officerName);
    // request.input("organisationSelect", organisationSelect);
    if (organisationSelect == "Others" && newOrganisation) {
        request.input("newOrganisation", newOrganisation);

        await request.query(`
            INSERT INTO mmt_organisation (organisation_name) VALUES (@newOrganisation);
        `);

        const orgResult = await request.query(`
            SELECT TOP 1 organisation_id FROM mmt_organisation ORDER BY organisation_id DESC;
        `);

        organisationSelect = orgResult.recordset[0].organisation_id;  
    }

    // Use the resolved value
    request.input("organisationSelect", organisationSelect);
    request.input("designationGOI", designationGOI);
    request.input("visitFrom", visitFrom);
    request.input("visitTo", visitTo);
    request.input("visitDuration", visitDuration);
    request.input("country", country);
    request.input("city", city); 
    request.input("otherCityName", otherCityName); 
    request.input("noCities", noCities);
    request.input("cityNames", cityNames);
    request.input("ministryDelegation", ministryDelegation);
    request.input("FVMS", FVMS);
    request.input("authority", authority);
    request.input("sponsoringAgency", sponsoringAgency);
    request.input("sanctionedAuthority", sanctionedAuthority);
    request.input("remarks", remarks);
    request.input("checkSanctioned", valueForDbSanctioned);
    request.input("userID", userID);

    request.input("newDesignation", newDesignation);
    request.input("designation", designation);


    // new field is add 
    // request.input("create_date", new Date());



    try {
        const result = await request.query(`
            INSERT INTO tbl_official_foreign_visit (fv_id,
                year, visit, visit_type, purpose, title, name, organisation, designation_organisation,
                GOI_designation, from_date, to_date, duration, country_visited, total_city, cities_name,check_sanctioned,
                ministerial_delegation, competent_authority, sponsoring_agency, sanctioned_authority,
                FVMS,reason_for_not_visited, created_by,other_cities_name,other_designation,other_visit_type
            )
            VALUES (@foreignVisitId,
                @reportYear, @visit, @visitType, @visitPurpose, @title, @officerName, @organisationSelect, @designation,
                @designationGOI, @visitFrom, @visitTo, @visitDuration, @country, @noCities, @city, @checkSanctioned,
                @ministryDelegation, @authority, @sponsoringAgency, @sanctionedAuthority, 
                @FVMS,@remarks, @userID,@otherCityName,@newDesignation,@newVisitType
            )
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function addOFVDocument(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        // Extract and validate form data
        let ID = parseInt(req.body.ID);
        const type = req.body.type;
        const userId = req.body.userId || null;

        // console.log("Incoming document upload:");
        // console.log("Original ID:", ID);
        // console.log("Type:", type);
        // console.log("User ID:", userId);
        // console.log("File received:", req.file?.originalname);
        // console.log("Unique file name:", req.uniqueFileName);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        if (!req.uniqueFileName) {
            return res.status(400).json({ error: "Missing unique file name" });
        }

        // If ID = -1, fetch the latest visit ID
        if (ID === -1) {
            const lastRecord = await request.query(`
                SELECT TOP 1 id FROM tbl_official_foreign_visit ORDER BY id DESC
            `);

            if (!lastRecord.recordset.length) {
                return res.status(400).json({ error: "No official foreign visit record found." });
            }

            ID = lastRecord.recordset[0].id; // Overwrite ID with real one
            // console.log("Resolved latest record ID:", ID);
        }

        // Add required inputs only once
        request.input("ID", ID);
        request.input("type", type);
        request.input("fileName", req.uniqueFileName);

        let sqlQuery;

        // Check if document for this type already exists
        const checkRecord = await request.query(`
            SELECT COUNT(*) AS recordCount
            FROM tbl_ofv_doc
            WHERE ofv_id = @ID AND doc_related = @type
        `);

        const recordCount = checkRecord.recordset[0].recordCount;

        if (recordCount === 1) {
            // Replace existing file (delete old)
            const docName = await request.query(`
                SELECT file_name AS name
                FROM tbl_ofv_doc
                WHERE ofv_id = @ID AND doc_related = @type
            `);

            const name = docName.recordset[0].name;
            if (name) {
                deleteFile(name); // Assuming this deletes from disk
            }

            sqlQuery = `
                UPDATE tbl_ofv_doc
                SET file_name = @fileName
                WHERE ofv_id = @ID AND doc_related = @type
            `;
        } else {
            // Insert new document record
            sqlQuery = `
                INSERT INTO tbl_ofv_doc (ofv_id, file_name, doc_related)
                VALUES (@ID, @fileName, @type)
            `;
        }


        // Execute the final query
        await request.query(sqlQuery);

        res.status(201).json({ message: "Document uploaded successfully" });

    } catch (err) {
        console.error("Upload failed:", err.message, err.stack);

        // Try to clean up partially uploaded file
        if (req.uniqueFileName) {
            deleteFile(req.uniqueFileName);
        }

        res.status(500).json({ error: "Internal Server Error during file upload" });
    }
}

async function getOFVReport(req, res) {
    const conn = await pool;
    const request = conn.request();

    const { year,fromDate,toDate,officerName,visit,status,organisation,country, designation } = req.body;

    request.input("year", year);
    request.input("fromDate", fromDate);
    request.input("toDate", toDate);
    request.input("officerName", officerName);
    request.input("visit", visit);
    request.input("status", status);
    request.input("organisation", organisation);
    request.input("country", country);
    request.input("designation", designation);

    try {
        let whereClause = [];
        if (year !== 0) whereClause.push("tbl_official_foreign_visit.year = @year");
        if (fromDate !== 0) whereClause.push("tbl_official_foreign_visit.from_date >= @fromDate");
        if (toDate !== 0) whereClause.push("tbl_official_foreign_visit.to_date <= @toDate");
        if (officerName !== 0) whereClause.push("tbl_official_foreign_visit.name = @officerName");
        if (visit !== 0) whereClause.push("tbl_official_foreign_visit.visit_type = @visit");
        if (status !== 0) whereClause.push("mmt_ofv_stage.fv_stage_name = @status");
        if (organisation !== 0) whereClause.push("tbl_official_foreign_visit.organisation = @organisation");    
        // if (country !== 0) whereClause.push("tbl_official_foreign_visit.country_visited = @country");
        if (country !== 0) whereClause.push("tbl_official_foreign_visit.country_visited LIKE '%' + @country + '%'");
        if (designation !== 0) {
            whereClause.push("tbl_official_foreign_visit.designation_organisation = @designation");
        }
        let whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const result = await request.query(`SELECT 
                tbl_official_foreign_visit.id,
                tbl_official_foreign_visit.fv_id AS [Official Foreign Visit ID], 
                year AS Year, 
                mmt_ofv_stage.fv_stage_name AS Visit,
               -- visit AS Visit,
                mmt_organisation.organisation_name AS Organisation, 
                from_date AS [From Date],
                to_date AS [To Date],
                name AS [Name of the Officer], 
                ISNULL(tbl_official_foreign_visit.GOI_designation,mmt_designation.designation) AS Designation, 
                --duration AS [Number of days], 
                visit_type_name AS [Visit Type], 
                purpose AS [Purpose/Keywords], 
                country_visited AS Country,
                MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
                Remarks
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN (
                SELECT 
                    ofv_id,
                    file_name,
                    doc_related
                FROM 
                    tbl_ofv_doc
            ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN
                mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
            LEFT JOIN
                mmt_designation ON mmt_designation.id = tbl_official_foreign_visit.designation_organisation
            INNER JOIN 
                mmt_ofv_stage ON mmt_ofv_stage.fv_stage_id = tbl_official_foreign_visit.visit
            ${whereCatgeoryCondition}
            GROUP BY 
                tbl_official_foreign_visit.id,   tbl_official_foreign_visit.fv_id, 
                year, 
                name, 
                fv_stage_name,
                Designation,
                tbl_official_foreign_visit.GOI_designation,
                mmt_designation.designation, 
                mmt_organisation.organisation_name, 
                from_date,
                to_date,
                duration, 
                visit_type_name,
                country_visited,
                purpose,
                Remarks
            ORDER BY visit ASC,
            year DESC;`);

        const rowData = result.recordset;  
            // console.log("rowdatas", rowData);
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
        
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



// async function getOFVReport(req, res) {
//     const type = req.params.type;
//     const conn = await pool;

//     try {
//         let result ;
//         if (type == 'Proposed'){
//             result = await conn.query(`SELECT 
//                 tbl_official_foreign_visit.id, 
//                 year AS Year, 
//                 mmt_organisation.organisation_name AS Organisation, 
//                 from_date AS [From Date],
//                 to_date AS [To Date],
//                 name AS [Name of the Officer], 
//                 mmt_designation.designation AS Designation, 
//                 --duration AS [Number of days], 
//                 visit_type_name AS [Visit Type], 
//                 purpose AS [Purpose/Keywords], 
//                 country_visited AS Country,
//                 MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
//                 MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
//                 Remarks
//             FROM 
//                 tbl_official_foreign_visit
//             LEFT JOIN (
//                 SELECT 
//                     ofv_id,
//                     file_name,
//                     doc_related
//                 FROM 
//                     tbl_ofv_doc
//             ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
//             LEFT JOIN 
//                 mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
//             LEFT JOIN
//                 mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
//             LEFT JOIN
//                 mmt_designation ON mmt_designation.id = tbl_official_foreign_visit.designation_organisation
//             GROUP BY 
//                 tbl_official_foreign_visit.id, 
//                 year, 
//                 name, 
//                 mmt_designation.designation, 
//                 mmt_organisation.organisation_name, 
//                 from_date,
//                 to_date,
//                 duration, 
//                 visit_type_name,
//                 country_visited,
//                 purpose,
//                 Remarks
//             ORDER BY 
//                 tbl_official_foreign_visit.year DESC;`);
//             // result = await conn.query(` SELECT 
//             //     tbl_official_foreign_visit.id, 
//             //     year AS Year, 
//             //     mmt_organisation.organisation_name AS Organisation, 
//             //     from_date AS [From Date],
// 			// 	to_date AS [To Date],
//             //     name AS [Name of the Officer], 
//             //     designation_organisation AS Designation, 
//             //     --duration AS [Number of days], 
//             //     visit_type_name AS [Visit Type], 
//             //     purpose AS [Purpose/Keywords], 
//             //     country_visited AS Country
//             //     --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
//             //     --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
//             //     --Remarks
//             // FROM 
//             //     tbl_official_foreign_visit
//             // LEFT JOIN (
//             //     SELECT 
//             //         ofv_id,
//             //         file_name,
//             //         doc_related
//             //     FROM 
//             //         tbl_ofv_doc
//             // ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
//             // LEFT JOIN 
//             //     mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
//             // LEFT JOIN
//             //     mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
//             // WHERE 
//             //     tbl_official_foreign_visit.visit  = 'Proposed'
//             // GROUP BY 
//             //     tbl_official_foreign_visit.id, 
//             //     year, 
//             //     name, 
//             //     designation_organisation, 
//             //     mmt_organisation.organisation_name, 
//             //     from_date,
// 			// 	to_date,
//             //     duration, 
//             //     visit_type_name, 
//             //     country_visited,
//             //     purpose,
//             //     Remarks
//             // ORDER BY 
//             //     tbl_official_foreign_visit.id;
//             // ;`);

//         } 
//         // else if (type == 'On Going') {

//         //     const year = new Date().getFullYear();

//         //     result = await conn.query(` SELECT 
//         //         tbl_official_foreign_visit.id, 
//         //         year AS Year, 
//         //         mmt_organisation.organisation_name AS Organisation, 
//         //         from_date AS [From Date],
// 		// 		to_date AS [To Date],
//         //         name AS [Name of the Officer], 
//         //         designation_organisation AS Designation, 
//         //         --duration AS [Number of days], 
//         //         visit_type_name AS [Visit Type], 
//         //         purpose AS [Purpose/Keywords], 
//         //         country_visited AS Country,
//         //         --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
//         //         MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report]
//         //         --Remarks
//         //     FROM 
//         //         tbl_official_foreign_visit
//         //     LEFT JOIN (
//         //         SELECT 
//         //             ofv_id,
//         //             file_name,
//         //             doc_related
//         //         FROM 
//         //             tbl_ofv_doc
//         //     ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
//         //     LEFT JOIN 
//         //         mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
//         //     LEFT JOIN
//         //         mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
//         //     WHERE 
//         //         tbl_official_foreign_visit.year = ${year}
//         //     GROUP BY 
//         //         tbl_official_foreign_visit.id, 
//         //         year, 
//         //         name, 
//         //         designation_organisation, 
//         //         mmt_organisation.organisation_name, 
//         //         from_date,
// 		// 		to_date,
//         //         duration, 
//         //         visit_type_name,
//         //         country_visited,
//         //         purpose,
//         //         Remarks
//         //     ORDER BY 
//         //         tbl_official_foreign_visit.id;
//         //     ;`);
//         // } else if (type == 'Complete') {

//         //     const year = new Date().getFullYear();

//             // result = await conn.query(`SELECT 
//             //         tbl_official_foreign_visit.id, 
//             //         year AS Year, 
//             //         mmt_organisation.organisation_name AS Organisation, 
//             //         from_date AS [From Date],
//             //         to_date AS [To Date],
//             //         name AS [Name of the Officer], 
//             //         designation_organisation AS Designation, 
//             //         --duration AS [Number of days], 
//             //         visit_type_name AS [Visit Type], 
//             //         purpose AS [Purpose/Keywords], 
//             //         country_visited AS Country,
//             //         MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
//             //         MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
//             //         Remarks
//             //     FROM 
//             //         tbl_official_foreign_visit
//             //     LEFT JOIN (
//             //         SELECT 
//             //             ofv_id,
//             //             file_name,
//             //             doc_related
//             //         FROM 
//             //             tbl_ofv_doc
//             //     ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
//             //     LEFT JOIN 
//             //         mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
//             //     LEFT JOIN
//             //         mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
//             //     WHERE 
//             //         tbl_official_foreign_visit.year < ${year}
//             //     GROUP BY 
//             //         tbl_official_foreign_visit.id, 
//             //         year, 
//             //         name, 
//             //         designation_organisation, 
//             //         mmt_organisation.organisation_name, 
//             //         from_date,
//             //         to_date,
//             //         duration, 
//             //         visit_type_name,
//             //         country_visited,
//             //         purpose,
//             //         Remarks
//             //     ORDER BY 
//             //         tbl_official_foreign_visit.year DESC;
//         //     ;`);

//         // }

//         const rowData = result.recordset;  

//         if (rowData.length === 0) {
//             return res.status(404).json({ error: 'No data available for this selection' });
//         }

//         let columnDefs;

//         if(type == 'Complete'){

//             columnDefs = [
//                 {
//                     headerName: "Id",
//                     field: "id",
//                     headerClass : "headerGroup",
//                     cellStyle: {textAlign: 'center'}
//                 },
//                 {
//                     headerName: "Year",
//                     field: "Year",
//                     headerClass : "headerGroup",
//                     cellStyle: {textAlign: 'center'}
//                 },
//                 {
//                     headerName: "Organisation",
//                     field: "Organisation",
//                     headerClass : "headerGroup",
//                     cellStyle: {textAlign: 'center'}
//                 },
//                 {
//                     headerName: "From Date",
//                     field: "From Date",
//                     headerClass : "headerGroup",
//                 },
//                 {
//                     headerName: "To Date",
//                     field: "To Date",
//                     headerClass : "headerGroup",
//                     width:20,
//                 },
//                 {
//                     headerName: "Name of the Officer",
//                     field: "Name of the Officer",
//                     headerClass : "headerGroup",
//                 },
//                 {
//                     headerName: "Designation",
//                     field: "Designation",
//                     headerClass : "headerGroup",
//                 },
//                 {
//                     headerName: "Visit Type",
//                     field: "Visit Type",
//                     headerClass : "headerGroup",
//                 },
//                 {
//                     headerName: "Purpose/Keywords",
//                     field: "Purpose/Keywords",
//                     headerClass : "headerGroup",
//                 },
//                 {
//                     headerName: "Tour Details",
//                     field: "Details",
//                     headerClass : "headercenter",
//                     children: [
//                         {
//                             headerName: "Country",
//                             field: "Country",
//                             headerClass : "headerGroup",
//                         },
//                         {
//                             headerName: "Tour File",
//                             field: "Tour File",
//                             width: 340,
//                             headerClass : "headerGroup",
//                         },
//                         {
//                             headerName: "Sanctioned Report",
//                             field: "Sanctioned Report",
//                             headerClass : "headerGroup",
//                             width: 340,
//                         },
//                         {
//                             headerName: "Details",
//                             field: "",
//                             headerClass : "headerGroup",
//                             width: 340,
//                         },
//                     ]
//                 },
//             ];

//         } else {

//             columnDefs = Object.keys(rowData[0]).map(key => ({
//                 headerName: key.charAt(0).toUpperCase() + key.slice(1), 
//                 field: key,
//             }));

//         }

        
//         res.json({ columnDefs, rowData });

//     } catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }

async function getDetailYearOFVReport(req, res){
    const year = req.params.year;
    const type = req.params.type;
    const yearCurrent = new Date().getFullYear();
    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("yearCurrent", yearCurrent);

    try {
        let result ;
        if (type == 'Proposed'){
            result = await request.query(` SELECT 
                tbl_official_foreign_visit.id, 
                year AS Year, 
                mmt_organisation.organisation_name AS Organisation, 
                from_date AS [From Date],
				to_date AS [To Date],
                name AS [Name of the Officer], 
                designation_organisation AS Designation, 
                --duration AS [Number of days], 
                visit_type_name AS [Visit Type], 
                purpose AS [Purpose/Keywords], 
                country_visited AS Country
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
                --Remarks
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN (
                SELECT 
                    ofv_id,
                    file_name,
                    doc_related
                FROM 
                    tbl_ofv_doc
            ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN
                mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
            WHERE 
                tbl_official_foreign_visit.year = @year AND tbl_official_foreign_visit.visit = 'Proposed'
            GROUP BY 
                tbl_official_foreign_visit.id, 
                year, 
                name, 
                designation_organisation, 
                mmt_organisation.organisation_name, 
                from_date,
				to_date,
                duration, 
                visit_type_name, 
                country_visited,
                purpose,
                Remarks
            ORDER BY 
                tbl_official_foreign_visit.id;
            ;`);

        } else if (type == 'On Going') {

            result = await request.query(` SELECT 
                tbl_official_foreign_visit.id, 
                year AS Year, 
                mmt_organisation.organisation_name AS Organisation, 
                from_date AS [From Date],
				to_date AS [To Date],
                name AS [Name of the Officer], 
                designation_organisation AS Designation, 
                --duration AS [Number of days], 
                visit_type_name AS [Visit Type], 
                purpose AS [Purpose/Keywords], 
                country_visited AS Country,
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report]
                --Remarks
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN (
                SELECT 
                    ofv_id,
                    file_name,
                    doc_related
                FROM 
                    tbl_ofv_doc
            ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN
                mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
            WHERE 
                tbl_official_foreign_visit.year = @year
            GROUP BY 
                tbl_official_foreign_visit.id, 
                year, 
                name, 
                designation_organisation, 
                mmt_organisation.organisation_name, 
                from_date,
				to_date,
                duration, 
                visit_type_name,
                country_visited,
                purpose,
                Remarks
            ORDER BY 
                tbl_official_foreign_visit.id;
            ;`);
        } else if (type == 'Complete') {

            result = await request.query(`SELECT 
                    tbl_official_foreign_visit.id, 
                    year AS Year, 
                    mmt_organisation.organisation_name AS Organisation, 
                    from_date AS [From Date],
                    to_date AS [To Date],
                    name AS [Name of the Officer], 
                    designation_organisation AS Designation, 
                    --duration AS [Number of days], 
                    visit_type_name AS [Visit Type], 
                    purpose AS [Purpose/Keywords], 
                    country_visited AS Country,
                    MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                    MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
                    Remarks
                FROM 
                    tbl_official_foreign_visit
                LEFT JOIN (
                    SELECT 
                        ofv_id,
                        file_name,
                        doc_related
                    FROM 
                        tbl_ofv_doc
                ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
                LEFT JOIN 
                    mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
                LEFT JOIN
                    mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
                WHERE 
                    tbl_official_foreign_visit.year = @year AND tbl_official_foreign_visit.year < @yearCurrent  
                GROUP BY 
                    tbl_official_foreign_visit.id, 
                    year, 
                    name, 
                    designation_organisation, 
                    mmt_organisation.organisation_name, 
                    from_date,
                    to_date,
                    duration, 
                    visit_type_name,
                    country_visited,
                    purpose,
                    Remarks
                ORDER BY 
                    tbl_official_foreign_visit.year DESC;
            ;`);

        }

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        let columnDefs;

        if(type == 'Complete'){

            columnDefs = [
                {
                    headerName: "Id",
                    field: "id",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "Year",
                    field: "Year",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "Organisation",
                    field: "Organisation",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "From Date",
                    field: "From Date",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "To Date",
                    field: "To Date",
                    headerClass : "headerGroup",
                    width:20,
                },
                {
                    headerName: "Name of the Officer",
                    field: "Name of the Officer",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Designation",
                    field: "Designation",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Visit Type",
                    field: "Visit Type",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Purpose/Keywords",
                    field: "Purpose/Keywords",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Tour Details",
                    field: "Details",
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "Country",
                            field: "Country",
                            headerClass : "headerGroup",
                        },
                        {
                            headerName: "Tour File",
                            field: "Tour File",
                            width: 340,
                            headerClass : "headerGroup",
                        },
                        {
                            headerName: "Sanctioned Report",
                            field: "Sanctioned Report",
                            headerClass : "headerGroup",
                            width: 340,
                        },
                        {
                            headerName: "Details",
                            field: "",
                            headerClass : "headerGroup",
                            width: 340,
                        },
                    ]
                },
            ];

        } else {

            columnDefs = Object.keys(rowData[0]).map(key => ({
                headerName: key.charAt(0).toUpperCase() + key.slice(1), 
                field: key,
            }));

        }
     
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

}

async function getDetailNameOFVReport(req, res){
    const name = req.params.name;
    const type = req.params.type;
    const conn = await pool;
    const request = conn.request();

    request.input("name", name);


    try {
        let result ;
        if (type == 'Proposed'){
            result = await request.query(` SELECT 
                tbl_official_foreign_visit.id, 
                year AS Year, 
                mmt_organisation.organisation_name AS Organisation, 
                from_date AS [From Date],
				to_date AS [To Date],
                name AS [Name of the Officer], 
                designation_organisation AS Designation, 
                --duration AS [Number of days], 
                visit_type_name AS [Visit Type], 
                purpose AS [Purpose/Keywords], 
                country_visited AS Country
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
                --Remarks
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN (
                SELECT 
                    ofv_id,
                    file_name,
                    doc_related
                FROM 
                    tbl_ofv_doc
            ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN
                mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
            WHERE 
                tbl_official_foreign_visit.name = @name AND tbl_official_foreign_visit.visit  = 'Proposed'  
            GROUP BY 
                tbl_official_foreign_visit.id, 
                year, 
                name, 
                designation_organisation, 
                mmt_organisation.organisation_name, 
                from_date,
				to_date,
                duration, 
                visit_type_name, 
                country_visited,
                purpose,
                Remarks
            ORDER BY 
                tbl_official_foreign_visit.id;
            ;`);

        } else if (type == 'On Going') {

            const year = new Date().getFullYear();

            request.input("year", year);

            result = await request.query(` SELECT 
                tbl_official_foreign_visit.id, 
                year AS Year, 
                mmt_organisation.organisation_name AS Organisation, 
                from_date AS [From Date],
				to_date AS [To Date],
                name AS [Name of the Officer], 
                designation_organisation AS Designation, 
                --duration AS [Number of days], 
                visit_type_name AS [Visit Type], 
                purpose AS [Purpose/Keywords], 
                country_visited AS Country,
                --MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report]
                --Remarks
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN (
                SELECT 
                    ofv_id,
                    file_name,
                    doc_related
                FROM 
                    tbl_ofv_doc
            ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN
                mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
            WHERE 
                tbl_official_foreign_visit.name = @name AND tbl_official_foreign_visit.year = @year
            GROUP BY 
                tbl_official_foreign_visit.id, 
                year, 
                name, 
                designation_organisation, 
                mmt_organisation.organisation_name, 
                from_date,
				to_date,
                duration, 
                visit_type_name,
                country_visited,
                purpose,
                Remarks
            ORDER BY 
                tbl_official_foreign_visit.id;
            ;`);
        } else if (type == 'Complete') {

            const year = new Date().getFullYear();

            request.input("year",year);

            result = await conn.query(`SELECT 
                    tbl_official_foreign_visit.id, 
                    year AS Year, 
                    mmt_organisation.organisation_name AS Organisation, 
                    from_date AS [From Date],
                    to_date AS [To Date],
                    name AS [Name of the Officer], 
                    designation_organisation AS Designation, 
                    --duration AS [Number of days], 
                    visit_type_name AS [Visit Type], 
                    purpose AS [Purpose/Keywords], 
                    country_visited AS Country,
                    MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Tour' THEN filtered_ofv_doc.file_name END) AS [Tour File],
                    MAX(CASE WHEN filtered_ofv_doc.doc_related = 'Sanction' THEN filtered_ofv_doc.file_name END) AS [Sanctioned Report],
                    Remarks
                FROM 
                    tbl_official_foreign_visit
                LEFT JOIN (
                    SELECT 
                        ofv_id,
                        file_name,
                        doc_related
                    FROM 
                        tbl_ofv_doc
                ) AS filtered_ofv_doc ON filtered_ofv_doc.ofv_id = tbl_official_foreign_visit.id
                LEFT JOIN 
                    mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
                LEFT JOIN
                    mmt_ofv_visit_type ON mmt_ofv_visit_type.Id = tbl_official_foreign_visit.visit_type
                WHERE 
                    tbl_official_foreign_visit.name = @name AND tbl_official_foreign_visit.year < @year
                GROUP BY 
                    tbl_official_foreign_visit.id, 
                    year, 
                    name, 
                    designation_organisation, 
                    mmt_organisation.organisation_name, 
                    from_date,
                    to_date,
                    duration, 
                    visit_type_name,
                    country_visited,
                    purpose,
                    Remarks
                ORDER BY 
                    tbl_official_foreign_visit.year DESC;
            ;`);

        }

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        let columnDefs;

        if(type == 'Complete'){

            columnDefs = [
                {
                    headerName: "Id",
                    field: "id",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "Year",
                    field: "Year",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "Organisation",
                    field: "Organisation",
                    headerClass : "headerGroup",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "From Date",
                    field: "From Date",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "To Date",
                    field: "To Date",
                    headerClass : "headerGroup",
                    width:20,
                },
                {
                    headerName: "Name of the Officer",
                    field: "Name of the Officer",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Designation",
                    field: "Designation",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Visit Type",
                    field: "Visit Type",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Purpose/Keywords",
                    field: "Purpose/Keywords",
                    headerClass : "headerGroup",
                },
                {
                    headerName: "Tour Details",
                    field: "Detail",
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "Country",
                            field: "Country",
                            headerClass : "headerGroup",
                        },
                        {
                            headerName: "Tour File",
                            field: "Tour File",
                            width: 340,
                            headerClass : "headerGroup",
                        },
                        {
                            headerName: "Sanctioned Report",
                            field: "Sanctioned Report",
                            headerClass : "headerGroup",
                            width: 340,
                        },
                        {
                            headerName: "Details",
                            field: "",
                            headerClass: "headerGroup",
                            width: 340,
                        },
                    ]
                },
            ];

        } else {

            columnDefs = Object.keys(rowData[0]).map(key => ({
                headerName: key.charAt(0).toUpperCase() + key.slice(1), 
                field: key,
            }));

        }
     
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

}

async function getDetailedInfoOFV(req, res) {
    const conn = await pool;
    const id = req.params.id;

    const request = conn.request();
    request.input("id", id);

    try {
        const result = await request.query(`
            SELECT 
               sponsoring_agency AS [Sponsoring Agency],
               sanctioned_authority AS [Sanctioned Authority],
               cities_name AS [Cities Visited],
               Remarks
            FROM 
                tbl_official_foreign_visit
            WHERE id = @id;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadTour(req, res) {
    try {
        const id = req.params.id;
        // const conn = await pool;
        
        // const result = await conn.query(`SELECT file_name FROM tbl_attendance WHERE id = ${id}`);
        // const fileName = result.recordset[0].file_name;
        const fileName = id;

        const file_path = path.join(__dirname, "../../../fileuploads/Official_Foreign_Visit", fileName);
        
        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);
            
        } else {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

//------------------------------------------------------------------------------ Other functions -----------------------------------------------------------

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

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `fileuploads/Official_Foreign_Visit/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

// async function getOFVChart(req, res) {

//     const conn = await pool;
//     const request = conn.request();

//     try {
//         const orgID = parseInt(req.params.orgID);
//         const desigID = parseInt(req.params.desigID);
//         const roleId = parseInt(req.params.roleId);
//         console.log(roleId,"roleIdroleId")
//         const officerName = req.params.officerName;
//         console.log(orgID,"foreignvsist")
        

//         request.input("orgID", orgID);
//         request.input("desigID", desigID);
//         request.input("officerName", officerName);
    
//         let whereClause = [];
//         if (orgID !== 0) whereClause.push("tbl_official_foreign_visit.organisation = @orgID");
//         if (desigID !== 0) whereClause.push("tbl_official_foreign_visit.designation_organisation = @desigID")
//         if (officerName !== '0') whereClause.push("tbl_official_foreign_visit.name = @officerName");

//         let whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

//         const totalOVDResult = await request.query(`select distinct 
//             count(*) AS Total,year 
//             FROM tbl_official_foreign_visit
//             ${whereCatgeoryCondition}
//             GROUP by year;`);

//         const combinedResult = {
//             total: totalOVDResult.recordset
//         };

//         res.json(combinedResult);
//     } catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }

async function getOFVChart(req, res) {

    const conn = await pool;
    const request = conn.request();

    try {

        const orgID = parseInt(req.params.orgID);
        const desigID = parseInt(req.params.desigID);
        const roleId = parseInt(req.params.roleId);
        const officerName = req.params.officerName;

        // console.log(roleId, "roleId");
        // console.log(orgID, "orgID");

        request.input("orgID", orgID);
        request.input("desigID", desigID);
        request.input("officerName", officerName);

        let whereClause = [];

        // Only roles 6 & 7 filter by organisation
        // if (roleId == 6 || roleId == 7) {
        //     whereClause.push("tbl_official_foreign_visit.organisation = @orgID");
        // }
        if ((roleId == 6 || roleId == 7) ||
            (orgID !== 0 && orgID)
        ) {
            whereClause.push("tbl_official_foreign_visit.organisation = @orgID");
        }

        // Common filters
        if (desigID !== 0) {
            whereClause.push("tbl_official_foreign_visit.designation_organisation = @desigID");
        }

        if (officerName !== '0') {
            whereClause.push("tbl_official_foreign_visit.name = @officerName");
        }

        let whereCatgeoryCondition = "";

        if (whereClause.length > 0) {
            whereCatgeoryCondition = 'WHERE ' + whereClause.join(' AND ');
        }

        const totalOVDResult = await request.query(`
            SELECT
                COUNT(*) AS Total,
                year
            FROM tbl_official_foreign_visit
            ${whereCatgeoryCondition}
            GROUP BY year
        `);

        const combinedResult = {
            total: totalOVDResult.recordset
        };

        res.json(combinedResult);

    } catch (err) {

        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCountOFV(req, res) {
    const conn = await pool;
    const request = conn.request();

    const { year,orgID,roleId,desigID,officerName } = req.body;

    // console.log(req.body,"dadadadaddadada")

    request.input("year", year);
    request.input("orgID", orgID);
    request.input("roleId", roleId);
    request.input("desigID", desigID);
    request.input("officerName", officerName);

    

    try {
        let whereClause = [];
    whereClause.push("(check_sanctioned = 1 OR check_sanctioned IS NULL)");
    // if (roleId == 6 || roleId == 7) {
    //     whereClause.push("organisation = @orgID");
    // }

    
    if ((roleId == 6 || roleId == 7) ||
        (orgID !== 0 && orgID)
    ) {
        whereClause.push("organisation = @orgID");
    }
// console.log(orgID, "1orgID")

    if (year !== 0 && year) {
        whereClause.push("year = @year");
    }
    if (desigID !== 0 && desigID) {
        whereClause.push("designation_organisation = @desigID");
    }
    if (officerName !== '0' && officerName) {
        whereClause.push("name = @officerName");
    }


        let whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const result = await request.query(` SELECT
                SUM(CASE WHEN visit = 1 THEN 1 ELSE 0 END) AS proposed,
                SUM(CASE WHEN visit = 2 THEN 1 ELSE 0 END) AS sanctioned,
                SUM(CASE WHEN visit = 3 THEN 1 ELSE 0 END) AS tour_visited,  
                SUM(CASE WHEN visit = 4 THEN 1 ELSE 0 END) AS tour_notvisited
                
            FROM tbl_official_foreign_visit
            ${whereCatgeoryCondition};
        ;`);
        
        const typeVisit = await request.query(`SELECT DISTINCT mmt_ofv_visit_type.visit_type_name,count(*) AS Total 
        FROM tbl_official_foreign_visit
        LEFT JOIN mmt_ofv_visit_type ON tbl_official_foreign_visit.visit_type = mmt_ofv_visit_type.Id
            ${whereCatgeoryCondition}
            GROUP by visit_type,mmt_ofv_visit_type.visit_type_name;
        ;`);

        const combinedResult = {
            count: result.recordset,
            type: typeVisit.recordset
        };
        // console.log(combinedResult, "combinedResult")
        res.json(combinedResult);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getOnGoingListOFV(req, res) {
    const conn = await pool;
    const request = conn.request();
    const orgID = parseInt(req.params.orgID);
    const roleId = parseInt(req.params.roleId);
    const desigID = parseInt(req.params.desigID);
    const officerName = req.params.officerName;

    request.input("orgID", orgID);
    request.input("roleId", roleId);
    request.input("desigID", desigID);
    request.input("officerName", officerName);

    try {
        let whereClause = [];

        // Role based organisation filter
        // if (roleId == 6 || roleId == 7) {
        //     whereClause.push("tbl_official_foreign_visit.organisation = @orgID");
        // }

        if ((roleId == 6 || roleId == 7) ||
            (orgID !== 0 && orgID)
        ) {
            whereClause.push("tbl_official_foreign_visit.organisation = @orgID");
        }

        // Common filters
        if (desigID !== 0 && desigID) {
            whereClause.push("tbl_official_foreign_visit.designation_organisation = @desigID");
        }

        if (officerName !== '0' && officerName) {
            whereClause.push("tbl_official_foreign_visit.name = @officerName");
        }

        // Only sanctioned visits
        whereClause.push("(tbl_official_foreign_visit.visit) IN (2)");


        const whereCategoryCondition = 'WHERE ' + whereClause.join(' AND ');


        const query = `
            SELECT 
                fv_id,
                name,
                mmt_ofv_visit_type.visit_type_name,
                mmt_designation.designation,
                mmt_organisation.organisation_name AS Organisation,
                CASE 
                    WHEN GOI_designation = 'Secretary' THEN 'Secretary'
                    WHEN GOI_designation = 'SS' THEN 'Special Secretary'
                    WHEN GOI_designation = 'AS' THEN 'Additional Secretary'
                    WHEN GOI_designation = 'JS' THEN 'Joint Secretary'
                    WHEN GOI_designation = 'DIR' THEN 'Director'
                    WHEN GOI_designation = 'DS' THEN 'Deputy Secretary'
                    WHEN GOI_designation = 'US' THEN 'Under Secretary'
                    WHEN GOI_designation = 'SO' THEN 'Section Officer'
                    WHEN GOI_designation = 'YP/ASO' THEN 'Young Professionals/Assistant Section Officer'
                    ELSE GOI_designation 
                END AS goi_designation
            FROM 
                tbl_official_foreign_visit
            LEFT JOIN 
                mmt_ofv_visit_type ON tbl_official_foreign_visit.visit_type = mmt_ofv_visit_type.Id
            LEFT JOIN 
                mmt_designation ON tbl_official_foreign_visit.designation_organisation = mmt_designation.id
            LEFT JOIN 
                mmt_organisation ON mmt_organisation.organisation_id = tbl_official_foreign_visit.organisation
            LEFT JOIN 
                mmt_ofv_stage ON mmt_ofv_stage.fv_stage_id = tbl_official_foreign_visit.visit
            ${whereCategoryCondition};
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function updateProposedInformation(req,res) {

    let {visitFrom,visitTo,reportYear,visitDuration,visit,visitType,newVisitType,visitPurpose,
			title,officerName,organisationSelect,newOrganisation,designation,newDesignation,designationGOI,
			country,cityNames,otherCityName,ministryDelegation,FVMS,authority,remarksDelay,ID,userID} = req.body;


    if (designation?.toString().trim().toLowerCase() === "others") {
        designation = 115;
    }
    if (visitType?.toString().trim().toLowerCase() === "others") {
        visitType = 8;
    }
    if (Array.isArray(country)) {
        country = country.join(",");
    }
    
    if (Array.isArray(cityNames)) {
        cityNames = cityNames.join(",");
    }
    
    const conn = await pool;
    const request = conn.request();
   
    if (isNaN(visitType)) {

        // request.input("visitType", visitType);
        // const insertVisitTypeID = await request.query(`
        //     INSERT INTO mmt_ofv_visit_type (visit_type_name) VALUES (@visitType);        
        // `);

        const visitTypeID = await request.query(`
            SELECT TOP 1 Id
            FROM mmt_ofv_visit_type ORDER BY Id DESC;        
        `);
        visitType = (visitTypeID.recordset[0].Id);
    }


    request.input("reportYear", reportYear);
    request.input("visit", visit);
    request.input("visitType", visitType);
    request.input("newVisitType", newVisitType);
    request.input("visitPurpose", visitPurpose);
    request.input("title", title);
    request.input("officerName", officerName);
    request.input("visitFrom", visitFrom);
    request.input("visitTo", visitTo);
    request.input("visitDuration", visitDuration);
    request.input("country", country);
    request.input("otherCityName", otherCityName);
    request.input("designation", designation);
    request.input("newDesignation", newDesignation);
    request.input("designationGOI", designationGOI);
    request.input("cityNames", cityNames);
    request.input("ministryDelegation", ministryDelegation);
    request.input("FVMS", FVMS);
    request.input("authority", authority);
    request.input("remarksDelay", remarksDelay);
    request.input("userID", userID);
    request.input("ID", ID);
     if (organisationSelect == "Others" && newOrganisation) {
        request.input("newOrganisation", newOrganisation);

        await request.query(`
            INSERT INTO mmt_organisation (organisation_name) VALUES (@newOrganisation);
        `);

        const orgResult = await request.query(`
            SELECT TOP 1 organisation_id FROM mmt_organisation ORDER BY organisation_id DESC;
        `);

        organisationSelect = orgResult.recordset[0].organisation_id;  
    }
    request.input("organisationSelect", organisationSelect);

    
    try {
        const result = await request.query(`
           UPDATE tbl_official_foreign_visit
                SET
                    year = @reportYear,
                    visit = @visit,
                    visit_type = @visitType,
                    other_visit_type = @newVisitType,
                    purpose = @visitPurpose,
                    title = @title,
                    name = @officerName,
                    organisation = @organisationSelect,
                    designation_organisation = @designation,
                    other_designation = @newDesignation,
                    GOI_designation = @designationGOI,
                    from_date = @visitFrom,
                    to_date = @visitTo,
                    duration = @visitDuration,
                    country_visited = @country,
                    cities_name = @cityNames,
                    ministerial_delegation = @ministryDelegation,
                    competent_authority = @authority,
                    reason_for_not_visited =  @remarksDelay,
                    FVMS = @FVMS,
                    updated_by = @userID,
                    updated_date = getDate()
                    WHERE
                    id = @ID ;
        `);

       res.status(201).json({ message: "Proposed information updated successfully." }); 
    } catch (error) {
        console.log("error",error)
         return res.status(500).json({ error: "Failed to updated proposed information" });
    }
}


async function updateSanctionedInfo(req,res) {
    const {tourSanctioned, sanctionedAuthority, remarksForNotApproval, visit, ID, userID} = req.body;
    
    const conn = await pool;
    const request = conn.request();

    let ofvStage;
    if(tourSanctioned == 1) 
    {
        if (visit === '1') {
            ofvStage = '2';
        } else {
            ofvStage = visit;
        }
    }
    else{
        ofvStage = '5';
    }


    request.input("tourSanctioned", tourSanctioned);
    request.input("sanctionedAuthority", sanctionedAuthority);
    request.input("remarksForNotApproval", remarksForNotApproval);
    request.input("visit", visit);
    request.input("userID", userID);
    request.input("ID", ID);
    request.input("ofvStage", ofvStage);  

    try {
        const result = await request.query(`
           UPDATE tbl_official_foreign_visit
                SET
                    check_sanctioned = @tourSanctioned,
                    sanctioned_authority = @sanctionedAuthority,
                    remarks_not_approval = @remarksForNotApproval,
                    visit = @ofvStage,
                    updated_by = @userID,
                    updated_date = getDate()
                    WHERE
                    id = @ID ;
        `);

       res.status(201).json({ message: "Proposed information updated successfully." }); 
    }
    catch (error) {
        console.log("Internal server error",error);
    }
} 

async function updateVisitTab(req,res) {
  
    const {visitCompleted, reasonForNotVisited, visit, ID, userID} = req.body;

    const conn = await pool;
    const request = conn.request();

    let ofvStage;
    if(reasonForNotVisited) {
        ofvStage = '4';
    } else{
        ofvStage = '3';
    }
    // console.log(ofvStage, 'ofvStage')

    request.input("visitCompleted", visitCompleted);
    request.input("reasonForNotVisited", reasonForNotVisited);
    request.input("visit", visit);
    request.input("userID", userID);
    request.input("ID", ID);
    request.input("ofvStage", ofvStage);  

    try {
            const result = await request.query(` UPDATE tbl_official_foreign_visit
                SET
                    visited_completed = @visitCompleted,
                    reason_for_not_visited = @reasonForNotVisited,
                    visit = @ofvStage,
                    updated_by = @userID, updated_date = getDate()
                    WHERE
                    id = @ID ;
        `);

       res.status(201).json({ message: "Proposed information updated successfully." }); 
    
    } catch (error) {
        console.log("Internal server error",error)
    }
}


const officialForeignVisitTab = {
    getOFVData, getUpdateOFVData, getOFVReport,
    addOFVData, upload, addOFVDocument, 
    downloadTour, getDetailYearOFVReport, getDetailNameOFVReport,
    getDetailedInfoOFV, getOFVChart, getCountOFV, getOnGoingListOFV,getUploadData,
    updateProposedInformation,updateSanctionedInfo,updateVisitTab
};

export default officialForeignVisitTab;
