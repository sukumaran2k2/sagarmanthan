import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';

async function createYoungProfessional(req, res) {
    const wing = req.body.wing;
    const division = req.body.division;
    const postStatus = req.body.postStatus;
    let dateOfAriseInVacancy = req.body.vacancyAriseDate;
    let dateOfVacancyAdvertised = req.body.dateOfVacancyAdvertise;
    let dateOfAppointment = req.body.dateOfAppointment;
    let postID = req.body.postID;
    const userID = req.body.userID;
  
    if (wing == undefined) {
        return res.status(201).json({ message: "All fields are null. Nothing to insert." });
    }
   
    if (dateOfAriseInVacancy == "") {
        dateOfAriseInVacancy = null;
    }

    if (dateOfVacancyAdvertised == "") {
        dateOfVacancyAdvertised = null;
    }

    if (dateOfAppointment == "") {
        dateOfAppointment = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("postID", postID);
    request.input("wing", wing);
    request.input("division", division);
    request.input("postStatus", postStatus);
    request.input("dateOfAriseInVacancy", dateOfAriseInVacancy);
    request.input("dateOfVacancyAdvertised", dateOfVacancyAdvertised);
    request.input("dateOfAppointment", dateOfAppointment);
    // request.input("youngProfessionalId", youngProfessionalId);
    // , young_professional_id, @youngProfessionalId
    request.input("userID", userID);

    try {

        const wingQuery = await request.query(`
        SELECT wing_code
        FROM mmt_wings
        WHERE wing_id = @wing
    `);

    const divisionQuery = await request.query(`
        SELECT division_code
        FROM mmt_division
        WHERE division_id = @division
    `);

    const wingCode = wingQuery.recordset[0].wing_code;
    const divisionCode = divisionQuery.recordset[0].division_code;

    let combinedValue = `YP${wingCode}${divisionCode}${postID}`;
    request.input("combinedValue", combinedValue);

        const result = await request.query(`
            INSERT INTO tbl_young_professional (post_id, wing, division, post_status, date_of_arise_in_vacancy, date_of_vacancy_advertised, date_of_appointment, created_by)
            OUTPUT INSERTED.young_professional_id
            VALUES (@combinedValue, @wing, @division, @postStatus, @dateOfAriseInVacancy, @dateOfVacancyAdvertised, @dateOfAppointment, @userID)
        `);

        const insertedYPId = result.recordset[0].young_professional_id;
        res.status(201).json({ insertedYPId });

    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getYoungProfessional (req, res) 
{
    const conn = await pool;

    try {

        const result = await conn.query(`
    SELECT w.wing_id, w.wing_name, d.division_id, d.division_name,COUNT(ypc.candidate_id) AS inposition
    FROM tbl_young_professional yp
    LEFT JOIN mmt_wings w ON w.wing_id = yp.wing
    LEFT JOIN mmt_division d ON d.division_id = yp.division
    LEFT JOIN tbl_yp_candidate ypc ON ypc.young_professional_id = yp.young_professional_id AND ypc.is_active = 1
    GROUP BY w.wing_id, w.wing_name, d.division_id, d.division_name
`);
        res.json(result.recordset);
    }
    
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function addCandidateDetail(req, res) {

    const data = req.body;
    // console.log("data",data);

    const name = req.body.name;
    const qualification = req.body.qualification;
    const category = req.body.category;
    const salary = req.body.salary;
    const appointmentDate = req.body.appointmentDate;
    const experience = req.body.experience;
    const skill = req.body.skill;  
    const youngProfessionalId = req.body.youngProfessionalId;
    const conn = await pool;
    const request = conn.request();

    request.input('name', name);
    request.input('qualification', qualification);
    request.input('category', category);
    request.input('salary', salary);
    request.input('experience', experience);
    request.input('skill', skill);
    request.input('appointmentDate', appointmentDate);
    request.input('youngProfessionalId', youngProfessionalId);

    try {
        const result = await request.query(`INSERT INTO tbl_yp_candidate (name, qualification, category, salary, date_of_appointment, experience, skill, young_professional_id) 
        OUTPUT INSERTED.candidate_id
        VALUES (@name, @qualification, @category, @salary, @appointmentDate, @experience, @skill, @youngProfessionalId)`);
      
        if (result.recordset && result.recordset.length > 0) {
            const candidate_id = result.recordset[0].candidate_id;
            // console.log(candidate_id);
            res.status(201).json({ candidate_id });
        } else {
           
            // console.log("No record inserted");
            res.sendStatus(500); 
        }

    } catch (err) {
        console.error(err);
        return res.status(500);
        
    }
}

async function getCandidateDetail ( req, res)
{
    const youngProfessionalId = req.params.youngProfessionalId; 
    // console.log("Young Professional ID:", youngProfessionalId);
    // console.log(youngProfessionalId);
    const data = req.body;
    // console.log("data",data)

    const conn = await pool;
    const request = conn.request();
    request.input("Id", youngProfessionalId);

    try
    {   
        const result = await request.query(`SELECT * FROM tbl_yp_candidate WHERE young_professional_id = @Id`);
        // console.log(result.recordset);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCandidateDetailDocument ( req, res)
{
    const Id = req.params.candidate_id;
    const conn = await pool;
    const request = conn.request();
    request.input("Id", Id);
    // console.log("Id",Id);
        
    try
    {
        const result = await request.query(`SELECT * FROM tbl_yp_candidate_document WHERE candidate_id = @Id`);
        // console.log("result, result.recordset",result.recordset);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.status(500);
    }
};

async function updateCandidateDocument ( req, res)
{
    const Id = req.params.Id;
    const conn = await pool;
    const request = conn.request();
    request.input("Id", Id);

    try
    {
        const result = await request.query(`
        
        IF EXISTS (SELECT 1 FROM tbl_yp_candidate_document WHERE id = @Id)
            BEGIN
                -- Update query here if needed
                SELECT * FROM tbl_yp_candidate_document WHERE id = @Id;
            END
            ELSE
            BEGIN
                -- Insert query here if needed
                -- Replace the SELECT * with the appropriate columns for retrieval
                SELECT * FROM tbl_yp_candidate_document WHERE id = @Id;
            END
        `);
        // console.log("candidate document result", result);
        res.json(result.recordset);

    }
    catch(err)
    {
        console.log(err);
        return res.status(500);
    }
};


async function updateYoungProfessional(req, res) {
        
    const data = req.body;
    // console.log("data",data);

    const youngProfessionalId = req.params.youngProfessionalId;
    const userId = req.body.userID;
    const postStatus = req.body.postStatus;
    let dateOfAriseInVacancy = req.body.vacancyAriseDate;
    let dateOfVacancyAdvertised = req.body.dateOfVacancyAdvertise;
    let dateOfAppointment = req.body.dateOfAppointment;


    if (dateOfAriseInVacancy == "") {
        dateOfAriseInVacancy = null;
    }

    if (dateOfVacancyAdvertised == "") {
        dateOfVacancyAdvertised = null;
    }

    if (dateOfAppointment == "") {
        dateOfAppointment = null;
    }

    //console.log(youngProfessionalId);
    const conn = await pool;
    const request = conn.request();
    request.input("id", youngProfessionalId);
    // request.input("wing", wing);
    // request.input("division", division);
    request.input("postStatus", postStatus);
    request.input("dateOfAriseInVacancy", dateOfAriseInVacancy);
    request.input("dateOfVacancyAdvertised", dateOfVacancyAdvertised);
    request.input("dateOfAppointment", dateOfAppointment);
    request.input("userId", userId);
    
    const query = `
        UPDATE tbl_young_professional
        SET post_status = @postStatus,
            date_of_arise_in_vacancy = @dateOfAriseInVacancy, 
            date_of_vacancy_advertised = @dateOfVacancyAdvertised, 
            date_of_appointment = @dateOfAppointment, 
            updated_date = GETDATE(),
            updated_by = @userId
        WHERE young_professional_id = @id
    `;
    
    try {

        const result = await request.query(query);

        // console.log(result);

        res.sendStatus(201);
        
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function deleteYoungProfessionalData(req, res) 
{
    const youngProfessionalId = req.params.youngProfessionalId;

    console.log(youngProfessionalId);
    const conn = await pool;
    const request = conn.request();
    request.input("youngProfessionalId", youngProfessionalId);
  
    const query = `DELETE FROM tbl_yp_candidate 
        WHERE young_professional_id = @youngProfessionalId;
    `;
    
    try 
    {
        const result = await request.query(query);
        // console.log("Rows affected:", result.rowsAffected);

        res.status(200).send(result);
        
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function updateCandidateDetail(req,res){
    
    const data = req.body;
    // console.log("data",data);

    const name = data.name;
    const qualification = data.qualification;
    const category = data.category;
    const salary = data.salary;
    const appointmentDate = data.appointmentDate;
    const experience = data.experience;
    const skill = data.skill;
    const youngProfessionalId = data.youngProfessionalId;

    const conn = await pool;
    const request = conn.request();

    request.input('name', name);
    request.input('qualification', qualification);
    request.input('category', category);
    request.input('salary', salary);
    request.input('experience', experience);
    request.input('skill', skill);
    request.input('appointmentDate', appointmentDate);
    request.input('youngProfessionalId', youngProfessionalId);

    const query = `

    IF EXISTS (SELECT 1 FROM tbl_yp_candidate WHERE young_professional_id = @youngProfessionalId)
        BEGIN
            UPDATE tbl_yp_candidate
            SET
                name = @name,
                qualification = @qualification,
                category = @category,
                salary = @salary,
                experience = @experience,
                skill = @skill,
                date_of_appointment = @appointmentDate
            WHERE young_professional_id = @youngProfessionalId;
        END
        ELSE
        BEGIN
            INSERT INTO tbl_yp_candidate (
                young_professional_id,
                name,
                qualification,
                category,
                salary,
                experience,
                skill,
                date_of_appointment
            )
            VALUES (
                @youngProfessionalId,
                @name,
                @qualification,
                @category,
                @salary,
                @experience,
                @skill,
                @appointmentDate
            );
        END
    `;


    try {
        // console.log(query);
        await request.query(query);
        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }

}

async function deleteYpCandideData(req, res) {
    const youngProfessionalId = req.params.youngProfessionalId;

    const conn = await pool;
    const request = conn.request();

    request.input('youngProfessionalId', youngProfessionalId);

    const query = `
        DELETE FROM tbl_yp_candidate
        WHERE young_professional_id = @youngProfessionalId;
    `;

    try {
        await request.query(query);
        res.sendStatus(201); 
        // console.log('Delete successful');
    } catch (err) {
        console.error(err);
        return res.sendStatus(500); 
    }
}

async function deleteYpCandidateData(req, res) 
{
    try {

        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
        const hourPart = String(now.getHours()).padStart(2, '0'); 
        const minutePart = String(now.getMinutes()).padStart(2, '0'); 
        const secondPart = String(now.getSeconds()).padStart(2, '0'); 
        const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
        const logFolder = `./delete_log/Young_Professionals`;
        const logFileName = `${logFolder}/deleted_Yp_log_${timestamp}.txt`;

        const youngProfessionalId = req.params.youngProfessionalId;
        const userID = req.params.userID;
        console.log('userID',userID);

        const conn = await pool;
        const request = conn.request();
        request.input('youngProfessionalId',youngProfessionalId);
        request.input('exisyoungProfessionalID', exisyoungProfessionalID);
        const result = await conn.query(
            `SELECT * FROM tbl_young_professional WHERE young_professional_id = @youngProfessionalId`
        );
        
        console.log("result",result);
        const exisyoungProfessionalID = result.recordset[0].young_professional_id;

        console.log('exisyoungProfessionalID',exisyoungProfessionalID);
        const DocFileResult = await conn.query(`SELECT appointment_order_document FROM tbl_yp_candidate_document WHERE candidate_id = @exisyoungProfessionalID`);
        // console.log("DocFileResult",DocFileResult);
        const DocfileNamearray = DocFileResult.recordset.length > 0 ? DocFileResult.recordset.map(record => record.appointment_order_document) : [];
        // console.log("Document file Name array",DocfileNamearray);
        
        let dbDeletions = 0;
        let dbDocDeletions = 0;
        let dbCandidateDetailsDeletions = 0;
        let fileSystemDeletions = 0;

        for (const fileName of DocfileNamearray) {

            const logMessage = `Deleting document '${fileName}' from tbl_yp_candidate_document...\n Deleted by userID -'${userID}'`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });

            try{ 
                request.input('fileName', fileName);
                const docDeleteQuery = `DELETE FROM tbl_yp_candidate_document WHERE appointment_order_document = @fileName`;
                const result = await conn.query(docDeleteQuery);
                // console.log(`Record with fileName '${fileName}' deleted from the database successfully.`);
                dbDocDeletions++;

                const filePath = `./fileuploads/Young_Professionals/${fileName}`;
                
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) {

                            console.error("Error deleting file:", err);
                        } else {
                            // console.log(`File '${fileName}' deleted from the file system successfully.`);
                            fileSystemDeletions++;
                        }
                    });
                } else {
                    console.log(`File '${fileName}' does not exist, no deletion needed.`);
                }

            }catch (error) {
                console.error(`Error deleting record with fileName '${fileName}' from the database:`, error);
            }
        }

        // console.log("Documents deleted successfully!");

        //delete query for tbl_yp_candidate
        const candidateResult = await conn.query(`SELECT * FROM tbl_yp_candidate WHERE young_professional_id = @exisyoungProfessionalID`);
        console.log("candidateResult",candidateResult.recordset[0]);
        const candidateResultarray = candidateResult.recordset.length > 0 ? candidateResult.recordset.map(record => record.young_professional_id) : [];
        // console.log("candidate Result array", candidateResultarray);
        const candidateData = candidateResult.recordset[0];

        for (const candidates of candidateResultarray) {

            const logMessage = `Deleting document '${JSON.stringify(candidateData)}' from tbl_yp_candidate...\n Deleted by userID -'${userID}'`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });
            request.input('candidates', candidates);
            const candidateDeleteQuery = `DELETE FROM tbl_yp_candidate WHERE young_professional_id = @candidates`;
            
            try{
                const result = await conn.query(candidateDeleteQuery);
                // console.log(`Record with young_professional_id candidate '${candidates}' deleted from the database successfully.`);
                dbCandidateDetailsDeletions++;

            }catch (error) {
                console.error(`Error deleting record with candidates '${candidates}' from the database:`, error);
            }
        }

        const resultData = result.recordset[0];
        const logMessage = `Deleting document '${JSON.stringify(resultData)}' from tbl_young_professional...\n Deleted by userID -'${userID}'`;
        fs.appendFile(logFileName, logMessage, (err) => {
            if (err) {
                console.error('Error writing to delete_logs.txt:', err);
            }
        });

        //delete young professional record from db
        const deleteexisyoungProfessionalID = await conn.query(
            `DELETE FROM tbl_young_professional WHERE young_professional_id = @youngProfessionalId`
        );
        // console.log('deleteexisyoungProfessionalID', deleteexisyoungProfessionalID);
        dbDeletions++;

        //sending status accordingly
        if (dbDeletions > 0 && dbDocDeletions > 0 && fileSystemDeletions > 0 && dbCandidateDetailsDeletions > 0) {

            // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbCandidateDetailsDeletions} candidate deleted from database and ${dbDocDeletions} Document deleted from the database.`);

        } else if (dbDeletions > 0) {

            let successMessage = `${dbDeletions} records deleted from the database.`;

            if (dbDocDeletions > 0) {
                successMessage += ` ${dbDocDeletions} documents deleted from the database.`;
            }

            if (dbCandidateDetailsDeletions > 0) {
                successMessage += ` ${dbCandidateDetailsDeletions} candidates deleted from the database.`;
            }

            if (fileSystemDeletions > 0) {
                // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            }

            return res.status(201).send(successMessage);
        } else {

            return res.status(404).send("No data found for deletion. Please Contact Administration");

        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getYoungProfessionalWingData(req, res) {
    const wingId = req.params.wingId;
    const divisionId = req.params.divisionId;

    const conn = await pool;
    const request = conn.request();

    request.input('wingId', wingId);
    request.input('divisionId', divisionId);

    try {
        const query = `
         SELECT
            ypc.candidate_id,
            ypc.name,
            ypc.qualification,
            ypc.experience,
            ypc.skill,
            ypc.category,
            ypc.salary,
            FORMAT(ypc.date_of_appointment, 'dd-MM-yyyy') AS candidate_date_of_appointment,
            ypdoc.appointment_order_document,
            COUNT(yp.young_professional_id) OVER(PARTITION BY yp.wing, yp.division) AS inposition
        FROM tbl_young_professional yp
        LEFT JOIN tbl_yp_candidate ypc ON ypc.young_professional_id = yp.young_professional_id
        LEFT JOIN tbl_yp_candidate_document ypdoc ON ypc.candidate_id = ypdoc.candidate_id
        LEFT JOIN mmt_wings w ON w.wing_id = yp.wing
        LEFT JOIN mmt_division d ON d.division_id = yp.division
        WHERE (@wingId IS NULL OR yp.wing = @wingId)
        AND (@divisionId IS NULL OR yp.division = @divisionId)
        ORDER BY yp.wing, yp.division, yp.young_professional_id;
        `;

        const result = await request.query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching young professional wing data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const uploadDestination = './fileuploads/yp_candidate_document';
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadDestination),
    filename: (req, file, callback) => {
        const uniqueFileName = `${Date.now()}_${file.originalname}`;
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('file');

async function uploadYPDocument(req, res) {
    upload(req, res, async function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error uploading file' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const candidateId =  parseInt(req.params.candidateId);
            const fileName = req.uniqueFileName;

            const conn = await pool;
            
            const checkRequest = conn.request();
            checkRequest.input('candidateId', candidateId);
            const existingFileResult = await checkRequest.query(`
                SELECT * FROM tbl_yp_candidate_document WHERE candidate_id = @candidateId
            `);

            if (existingFileResult.recordset.length > 0) {
                const updateRequest = conn.request();
                updateRequest.input('candidateId', candidateId);
                updateRequest.input('fileName', fileName);
                await updateRequest.query(`
                    UPDATE tbl_yp_candidate_document
                    SET appointment_order_document = @fileName
                    WHERE candidate_id = @candidateId
                `);
            } else {
                const insertRequest = conn.request();
                insertRequest.input('candidateId', candidateId);
                insertRequest.input('fileName', fileName);
                await insertRequest.query(`
                    INSERT INTO tbl_yp_candidate_document (candidate_id, appointment_order_document)
                    VALUES (@candidateId, @fileName)
                `);
            }

            res.status(201).json({ message: 'Document uploaded successfully', fileName });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

async function ypFileDownload(req, res) 
{
    const { fileName } = req.query;

    const uploadDestinationBase = './fileuploads/yp_candidate_document';
    const filePath = path.join(uploadDestinationBase, fileName); 

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(500).send("Internal Server Error");
        } else {
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.setHeader('Content-type', 'application/pdf');
            res.send(data);
        }
    });
}

async function relieveYoungProfessional(req, res) {
    console.log("RELIEVE API HIT");
    console.log(req.body);
    const candidateId = req.body.candidateId;
    const lastWorkingDate = req.body.lastWorkingDate;
    const remarks = req.body.remarks;

    const conn = await pool;
    const request = conn.request();

    request.input("candidateId", candidateId);
    request.input("lastWorkingDate", lastWorkingDate);
    request.input("remarks", remarks);
    console.log({ candidateId, lastWorkingDate, remarks});
    try {

        await request.query(`
            UPDATE tbl_yp_candidate
            SET
                is_active = 0,
                last_working_date = @lastWorkingDate,
                remarks = @remarks,
                relieved_at = GETDATE()
            WHERE candidate_id = @candidateId
        `);

        res.status(200).json({
            success: true,
            message: "Young Professional relieved successfully"
        });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
export default { createYoungProfessional, getYoungProfessional, addCandidateDetail, updateYoungProfessional, 
    deleteYoungProfessionalData, getCandidateDetail, getCandidateDetailDocument, updateCandidateDocument,
    updateCandidateDetail, deleteYpCandidateData,getYoungProfessionalWingData,uploadYPDocument,upload,ypFileDownload,
relieveYoungProfessional};
