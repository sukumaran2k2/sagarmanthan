import { pool } from "../../db.js";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const uploadDestination = './fileuploads/AmritKaal';

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        let selectedFolder = uploadDestination;

        if (file.fieldname === 'latestImage') {
            selectedFolder = path.join(uploadDestination);
            fs.promises.mkdir(selectedFolder, { recursive: true });
        }

        callback(null, selectedFolder);
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        callback(null, uniqueFileName);
    },
});

const upload = multer({ storage: storage });

const filesUploadPromise = promisify(upload.fields([
    { name: 'latestImage', maxCount: 10 },
]));


// Create AKV data in the database
async function createAKVData(req, res) {
    try {
        const {
            focusArea,initiativeID,initiativeName,forReference,
            keyActivities,entity,targetDate,userID,organisationIde,
            Remarks, Response, category,sourceOfFunding,totalCost,
            directEmpGen, inDirectEmpGen, directInvCreated,
            inDirectInvCreated, OutcomesRemarks, outcomes,
            startDate, actualDate, statusOn, statusCurrent,
            reasonsForDrop, reasonsForDelay, physicalProgress,
            MIVID, initiativeMIVIDDropdown, initiativeIDMIV, 
            initiativeNameMIV
        } = req.body;

        const conn = await pool;
        const request = conn.request();

        request.input('focusArea', focusArea);
        request.input('initiativeID', initiativeID);
        request.input('initiativeName', initiativeName);
        request.input('forReference', forReference);
        request.input('keyActivities', keyActivities);
        request.input('entity', entity);
        request.input('targetDate', targetDate);
        request.input('userID', userID);
        request.input('organisationIde',organisationIde);
        request.input('Remarks', Remarks);
        request.input('Response',Response);

        request.input('reasonsForDrop', reasonsForDrop);
        request.input('reasonsForDelay', reasonsForDelay);
        request.input('outcomes', outcomes);
        request.input('directEmpGen', directEmpGen);
        request.input('inDirectEmpGen', inDirectEmpGen);
        request.input('directInvCreated', directInvCreated);
        request.input('inDirectInvCreated', inDirectInvCreated);
        request.input('OutcomesRemarks', OutcomesRemarks);
        request.input('startDate', startDate);
        request.input('actualDate', actualDate);
        request.input('category', category);
        request.input('sourceOfFunding', Array.isArray(sourceOfFunding) ? sourceOfFunding.join(',') : sourceOfFunding);
        request.input('totalCost', totalCost);
        request.input('statusOn', statusOn);
        request.input('statusCurrent', statusCurrent);
        request.input("physicalProgress", physicalProgress);
        request.input("MIVID", MIVID);
        request.input("initiativeMIVIDDropdown", initiativeMIVIDDropdown);
        request.input("initiativeIDMIV", initiativeIDMIV);
        request.input("initiativeNameMIV", initiativeNameMIV);            

        await request.query(`
            INSERT INTO tbl_amritkaal (
                focus_area, Initiative_id, Initiative_name, reference, key_activity, entity, target_date, organisation_id, Remarks, Response, created_by, created_date,
                direct_Emp_Gen, inDirect_Emp_Gen, direct_Inv_Created, inDirect_Inv_Created, Outcomes_Remarks, start_date, actual_date,  category, outcomes, source_of_funding,
                total_cost, status_on, status_current, reasons_for_drop, reasons_for_delay, physical_progress, miv_id, miv_initiative_id, miv_initiative_name, miv_project_detail
            ) VALUES (
                @focusArea, @initiativeID, @initiativeName, @forReference, @keyActivities, @entity, @targetDate, @organisationIde, @Remarks, @Response, @userID, GETDATE(),
                @directEmpGen, @inDirectEmpGen, @directInvCreated, @inDirectInvCreated, @OutcomesRemarks, @startDate, @actualDate,  @category, @outcomes, @sourceOfFunding,
                @totalCost, @statusOn, @statusCurrent,  @reasonsForDrop, @reasonsForDelay, @physicalProgress,  @MIVID, @initiativeMIVIDDropdown, @initiativeIDMIV, @initiativeNameMIV
            )
        `);

        res.sendStatus(201); 
    } catch (err) {
        console.error(err);
        res.sendStatus(500); 
    }
}

async function editAKVData(req, res) {
    try {
        const {
            ID, focusArea, initiativeID, initiativeName,
            forReference, keyActivities, entity, targetDate,
            userID, organisationIde, Remarks, Response,
            category,sourceOfFunding,totalCost,
            directEmpGen, inDirectEmpGen, directInvCreated,
            inDirectInvCreated, OutcomesRemarks, outcomes,
            startDate, actualDate, statusOn, statusCurrent,
            reasonsForDrop, reasonsForDelay, physicalProgress,
            MIVID, initiativeMIVIDDropdown, initiativeIDMIV, 
            initiativeNameMIV

        } = req.body;


        const conn = await pool;
        const request = conn.request();

        request.input('ID', ID);
        request.input('focusArea', focusArea);
        request.input('initiativeID', initiativeID);
        request.input('initiativeName', initiativeName);
        request.input('forReference', forReference);
        request.input('keyActivities', keyActivities);
        request.input('entity', entity);
        request.input('targetDate', targetDate);
        request.input('userID', userID);
        request.input('organisationIde',organisationIde);
        request.input('Remarks', Remarks);
        request.input('Response',Response);     
        request.input('reasonsForDrop', reasonsForDrop);
        request.input('reasonsForDelay', reasonsForDelay);
        request.input('outcomes', outcomes);
        request.input('directEmpGen', directEmpGen);
        request.input('inDirectEmpGen', inDirectEmpGen);
        request.input('directInvCreated', directInvCreated);
        request.input('inDirectInvCreated', inDirectInvCreated);
        request.input('OutcomesRemarks', OutcomesRemarks);
        request.input('startDate', startDate);
        request.input('actualDate', actualDate);
        request.input('category', category);
        request.input('sourceOfFunding', Array.isArray(sourceOfFunding) ? sourceOfFunding.join(',') : sourceOfFunding);
        request.input('totalCost', totalCost);
        request.input('statusOn', statusOn);
        request.input('statusCurrent', statusCurrent);
        request.input("physicalProgress", physicalProgress);
        request.input("MIVID", MIVID);
        request.input("initiativeMIVIDDropdown", initiativeMIVIDDropdown);
        request.input("initiativeIDMIV", initiativeIDMIV);
        request.input("initiativeNameMIV", initiativeNameMIV); 

        const  uploadQuery  =  await request.query(`
            UPDATE tbl_amritkaal
            SET
            focus_area = @focusArea,Initiative_id= @initiativeID,Initiative_name = @initiativeName,
            reference = @forReference,key_activity = @keyActivities,entity = @entity,target_date = @targetDate,
            updated_by = @userID,organisation_id = @organisationIde, Response = @Response, Remarks = @Remarks , updated_date = GETDATE(),
            direct_Emp_Gen = @directEmpGen, inDirect_Emp_Gen = @inDirectEmpGen, direct_Inv_Created = @directInvCreated, 
            inDirect_Inv_Created = @inDirectInvCreated, Outcomes_Remarks =  @OutcomesRemarks,start_date= @startDate,actual_date = @actualDate,  
            category = @category, outcomes = @outcomes, source_of_funding = @sourceOfFunding, physical_progress = @physicalProgress,
            total_cost = @totalCost, status_on = @statusOn, status_current = @statusCurrent, reasons_for_drop = @reasonsForDrop,reasons_for_delay = @reasonsForDelay,
            miv_id = @MIVID, miv_initiative_id = @initiativeMIVIDDropdown,
            miv_initiative_name = @initiativeIDMIV, miv_project_detail = @initiativeNameMIV
           
            WHERE id = @ID`);
        res.sendStatus(201);
        
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
//-------------------------------------------------- get akv data --------------------------------------------------
async function getAKVData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT
        id,focus_area,Initiative_id,Initiative_name,reference,key_activity,
        entity,created_by,created_date,updated_by,updated_date
        FROM
            tbl_amritkaal;
    `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// needed query for get data
// SELECT
//         id,focus_area,Initiative_id,Initiative_name,reference,key_activity,
//         entity,target_date,created_by,created_date,updated_by,updated_date,
//         mmt_organisation.organisation_name
//         FROM
//             tbl_amritkaal
//         INNER JOIN
//             mmt_organisation ON mmt_organisation.organisation_id = tbl_amritkaal.organisation_id;

async function getUpdateAKV(req, res) {
    const conn = await pool;
    const request = conn.request();

    const ID = req.params.ID;
    request.input("ID", ID);
    try {
        const result = await request.query(`SELECT * FROM tbl_amritkaal WHERE tbl_amritkaal.ID = @ID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function uploadAKVFiles(req, res) {
    try {
        await filesUploadPromise(req, res);

        const conn = await pool;
        const request = conn.request();

        const latestImage = req.files && req.files['latestImage'] ? req.files['latestImage'].map(image => image.filename).join(',') : null;
        let ID = parseInt(req.body.ID);
        
        request.input('ID', ID);
        request.input('latestImage', latestImage);

        if( ID === -1 ){
            const result = await request.query(`
                SELECT TOP 1 id FROM tbl_amritkaal
                ORDER BY ID DESC
            `);
            ID = result.recordset[0].id;

            if(latestImage){
                
                const updateLatest = await request.query(`
                    INSERT INTO tbl_amritkaal_file (
                        file_id,file_name
                    ) VALUES (
                        @ID, @latestImage
                    );
                `);
            }
        } else {
            if(latestImage){
                const oldLatest = await request.query(`
                    SELECT file_name FROM tbl_amritkaal_file
                    WHERE file_id = @ID
                `);
    
                if (oldLatest.recordset.length > 0) {
                    const latestFileName = oldLatest.recordset[0].file_name;
            
                    if (latestFileName) {
                        if (latestFileName.includes(',')) {
                            const files = latestFileName.split(',');
                            files.forEach(file => {
                                deleteFile(file.trim()); 
                            });
                        } else {
                            deleteFile(latestFileName.trim());
                        }
                    }
                    const updateLatest = await request.query(`
                        UPDATE tbl_amritkaal_file
                        SET file_name = @latestImage
                        WHERE file_id = @ID
                    `);
                } else {
                    if(latestImage){
                        const updateLatest = await request.query(`
                            INSERT INTO tbl_amritkaal_file (
                                file_id,file_name
                            ) VALUES (
                                @ID,@latestImage
                            );
                        `);
                    }
                }  
            }
        }        
        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
const uploadDestinationMeeting = "./fileuploads/AmritKaal";

if (!fs.existsSync(uploadDestinationMeeting)) {
    fs.mkdirSync(uploadDestinationMeeting, { recursive: true });
}

const storageMeeting = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/AmritKaal");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        callback(null, uniqueFileName);
    },
});

const uploadMeeting = multer({
    storage: storageMeeting,
    limits: { fileSize: 20000000 }
});

//--------------------------------------------- File name generator -----------------------------------------------------------
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
        const filePath = `fileuploads/AmritKaal/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
}

async function getAmritReport(req, res) {
    try {
       
        const conn = await pool;
        const request = conn.request();
  
        const result = await request.query(` SELECT
        ROW_NUMBER() OVER (ORDER BY id) AS [S No],focus_area as [Focus Area],Initiative_id as [Initiative Id],
        Initiative_name as [Initiative Name],reference as [Reference],key_activity as[Key Activity],
        entity as [Entity],[target_date] as [Target date],[quarter] as [Quarter/Month],[year] as Year, Response, Remarks
        FROM
            tbl_amritkaal
        Order by id;
        `);
        
        const rowData = result.recordset;  
  
        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available for this month and year' });
        // }
  
        
      // Extract data from the result
      // const rowData = result.recordset;  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));
    
      res.json({ columnDefs, rowData });
  
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } finally {
      await sql.close();
    }
    
  }

  async function getAKVInitiativeName(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const initiativeID = req.params.initiativeID;

        const query = `SELECT mmt_akv_initiatives.AKV_ID, mmt_akv_initiatives.Initiaitive_ID, mmt_akv_initiatives.Focus_ID, mmt_akv_initiatives.Initiaitive_name, mmt_akv_focus.Focus_Area
        FROM [sagarmanthan_revamp].[dbo].[mmt_akv_initiatives]
        INNER JOIN [sagarmanthan_revamp].[dbo].[mmt_akv_focus] ON mmt_akv_initiatives.Focus_ID = mmt_akv_focus.Focus_ID
        WHERE mmt_akv_initiatives.Initiaitive_ID = @initiativeID;`;
        request.input("initiativeID", initiativeID);
        
        const result = await request.query(query);
        res.send(result.recordset);
    } catch (error) {
        // Handle error appropriately
        console.error("Error executing query:", error);
        res.status(500).send("Error executing query");
    }
}

async function getAKVEntityData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const query = `SELECT * FROM mmt_akv_entity`;
        
        const result = await request.query(query);
        res.send(result.recordset);
    } catch (error) {
        // Handle error appropriately
        console.error("Error executing query:", error);
        res.status(500).send("Error executing query");
    }
}

async function MIVInitiativeID(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const query = `SELECT ID FROM tbl_initiative`;
        
        const result = await request.query(query);
        res.send(result.recordset);
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).send("Error executing query");
    }
}


const AKVTab = {
    createAKVData,getAKVData,getUpdateAKV,
    editAKVData,uploadAKVFiles,getAmritReport,
    getAKVInitiativeName,getAKVEntityData, MIVInitiativeID
};

export default AKVTab;