import { pool } from "../../db.js";
import * as fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateUniqueFileName(originalFileName) {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const fileExtension = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, fileExtension).replace(/\s+/g, '_');
    return `${baseName}_${timestamp}${fileExtension}`;
}

// Set up the upload directory and multer storage configuration
const uploadDestination = './formbuilder_Files';
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        callback(null, uniqueFileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 10 MB limit
});

async function UploadFormDocument(req,res){
    const conn = await pool;

    // Parse form data from request body
    const uid = req.body.uid; 
    const fileMapping = req.body.fileMapping ? JSON.parse(req.body.fileMapping) : {};
    // console.log(fileMapping);
    try {
        // Validate that data is provided and is an array
        if (!uid) {
            return res.status(400).json({ message: "No UID provided." });
        }

        // Validate files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        // const insertQuery = `
        //     INSERT INTO tbl_form_Builder_fileMapping (uid, field_name, file_name, unique_file_name)
        //     VALUES (@uid, @fieldName, @fileName, @uniqueFileName);
        // `;

        const insertQuery = `
            MERGE tbl_form_Builder_fileMapping AS target
                USING (SELECT @uid AS uid, @fieldName AS field_name) AS source
                ON target.uid = source.uid AND target.field_name = source.field_name
                WHEN MATCHED THEN
                    UPDATE SET
                        file_name = @fileName,
                        unique_file_name = @uniqueFileName
                WHEN NOT MATCHED THEN
                    INSERT (uid, field_name, file_name, unique_file_name)
                    VALUES (@uid, @fieldName, @fileName, @uniqueFileName);
        `;

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;
            const fileExtension = path.extname(originalFileName);
            const baseName = path.basename(originalFileName, fileExtension).replace(/\s+/g, '_');
            const uniqueFileName = generateUniqueFileName(originalFileName);
            // console.log("uniqueFileName",uniqueFileName);
            // console.log("baseName",baseName);

            const fieldName = Object.keys(fileMapping).find(
                (key) => fileMapping[key].replace(/\s+/g, '_') === `${baseName}${fileExtension}`
            );

            // console.log("fieldName",fieldName);

            if (!fieldName) {
                // console.warn(`No mapping found for file: ${originalFileName}. Skipping.`);
                continue; // Skip this file if no mapping is found
            }

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            await fs.promises.rename(file.path, destinationPath);

            const request = conn.request();
            request.input("uid", uid);
            request.input("fieldName", fieldName); // Mapped field name
            request.input("fileName", originalFileName); // Original file name
            request.input("uniqueFileName", uniqueFileName); // Unique file name

            // console.log(`Inserting into database: Field Name - ${fieldName}, File Name - ${originalFileName}, Unique File Name - ${uniqueFileName}`);
            await request.query(insertQuery);
        }

        // Send a success response
        res.status(200).json({ message: 'Form data and file stored successfully.' });
    } catch (error) {
        // console.error("Error occurred while storing form data and file:", error);
        res.status(500).json({ message: 'Internal Server Error.' });
    }
}

async function downloadDocument(req, res) {
    const { uid, field } = req.params;

    try {
        const query = `
            SELECT unique_file_name, file_name
            FROM tbl_form_Builder_fileMapping 
            WHERE uid = @uid AND field_name = @field
        `;

        const conn = await pool;
        const request = conn.request();
        request.input('uid', uid);
        request.input('field', field);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const { unique_file_name, file_name } = result.recordset[0];

        if (!unique_file_name) {
            return res.status(400).json({ message: 'Unique file name not found' });
        }

        // Construct the file path using the unique file name
        const file_path = path.join(__dirname, "../../../formbuilder_Files", unique_file_name);

        if (fs.existsSync(file_path)) {
            // Set response headers for downloading
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            // Create a file stream and pipe it to the response
            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);

        } else {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function createFormBuilderData(req,res){
    const conn = await pool;
    const data = req.body.data;
    const organisationId = req.body.organisationId;
    // console.log(data);
    // console.log(organisationId);

    try {
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "No data provided" });
        }

        const input = data[0].name; 
        
        if(!input){
            return res.status(400).json({ message: "No data provided" });
        }

        const tableName = `tbl_formB_${input.split('_').map(word =>word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')}`;                    

        const columns = ["organisation"]; 
        const parameterizedValues = ["@organisation"];
        const request = conn.request();

        request.input("organisation", organisationId);
        
        const filledBy = data[0].userID; // for mmt table and form table insertion

        columns.push("filled_by");
        parameterizedValues.push("@filled_by");
        request.input("filled_by", filledBy);

        const formRefID = data[0].FormRefID; // e.g., SASV

        //latest record for formRefID sequence
        const lastIdResult = await conn.request()
        .input("formRefID", formRefID)
        .query(`
            SELECT TOP 1 Form_response_ID
            FROM ${tableName}   -- use dynamic table instead of hardcoded "YourTable"
            WHERE Form_response_ID LIKE @formRefID + '%'
            ORDER BY Form_response_ID DESC
        `);

        let nextSeq = 1; // Default sequence starts at 1

        if (lastIdResult.recordset.length > 0) {
        const lastID = lastIdResult.recordset[0].Form_response_ID; 

        const match = lastID ? lastID.match(/(\d+)$/) : null;
        if (match) {
            nextSeq = parseInt(match[1], 10) + 1;
        }
        }

        const newFormResponseID = `${formRefID}${nextSeq.toString().padStart(4, "0")}`;

        columns.push("form_response_ID");
        parameterizedValues.push("@form_response_ID");
        request.input("form_response_ID", newFormResponseID);


        data.forEach(item => {
            let valueToInsert = item.value;

            if (item.value && typeof item.value === 'object' && item.value.fileName) {
                let fileName = item.value.fileName;
                
                valueToInsert = fileName;
            }

            columns.push(item.inputId);
            const mainParamName = `@p${item.inputId.replace(/\W+/g, '_')}`;
            parameterizedValues.push(mainParamName);
            request.input(mainParamName.substring(1), valueToInsert);
 
            if (item.subId) {
                columns.push(item.subId);
                const subParamName = `@p${item.subId.replace(/\W+/g, '_')}`;
                parameterizedValues.push(subParamName);
                request.input(subParamName.substring(1), item.subValue);
            }
        });

        const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            OUTPUT INSERTED.uid
            VALUES (${parameterizedValues.join(', ')});
        `;

        const result = await request.query(insertQuery);

        const insertedId = result.recordset[0]?.uid || null;
        
        if (insertedId) {
            try {

                const normalizedInputForm = input.replace(/_/g, ' ').toLowerCase();
                // console.log("normalizedInputForm",normalizedInputForm);
                const getFilledByQuery = `
                    SELECT filled_by 
                    FROM mmt_form_builder 
                    WHERE Input_Form = @inputForm;
                `;
            
                const getRequest = conn.request();
                getRequest.input("inputForm", normalizedInputForm);
                const existingResult = await getRequest.query(getFilledByQuery);
                // console.log("existingResult",existingResult);
                const oldValue = existingResult.recordset[0]?.filled_by || "";
                // console.log("oldValue",oldValue);
        
                const newFilledBy = 
                oldValue === null || oldValue === "" 
                ? String(filledBy)
                : `${oldValue},${filledBy}`;
                // console.log("newFilledBy",newFilledBy);
                const updateMMTQuery = `
                    UPDATE mmt_form_builder
                    SET filled_by = @filledBy
                    WHERE Input_Form = @inputForm;
                `;
            
                const updateRequest = conn.request();
                updateRequest.input("filledBy", newFilledBy);
                updateRequest.input("inputForm", normalizedInputForm);
                await updateRequest.query(updateMMTQuery);

            } catch(err){
                console.error("Error updating filled_by:", err);
            }
        }        

        res.status(200).json({ 
            message: 'Form fields added successfully.',
            uid: insertedId
        });

    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
}

async function editMmtFormBuilder(req, res) {
    const id = req.params.data;

    try {
        const query = `
            SELECT * FROM mmt_form_builder
            WHERE id = @id
        `;

        const conn = await pool;
        const request = conn.request();
        request.input('id', id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No form data found with the given ID.' });
        }

        const data = result.recordset[0];
        // console.log(data);
        const inputFormPath = data.Input_Form_Path;
        const absolutePath = path.resolve(inputFormPath);

        try {
            const htmlContent = await fs.promises.readFile(absolutePath, 'utf-8');
            
            const $ = cheerio.load(htmlContent);

            const dynamicFormContent = $('#dynamicForm').prop('outerHTML');

            if (!dynamicFormContent) {
                return res.status(404).json({ message: 'No dynamicForm element found in the HTML.' });
            }

            let targetScript = null;

            $('script').each((_, script) => {
                const content = $(script).html();
                // Look for a script that contains both variables or at least fieldValidation
                if (content.includes('let fieldValidation')) {
                    targetScript = script;
                }
            });

            // console.log("targetScript", targetScript ? "Found" : "Not Found");

            let scriptContent = $(targetScript).html();
            // console.log("scriptContent", scriptContent ? "Found" : "Not Found");
            
            let parsedFieldValidation = null;
            let parsedDepDropdownDataset = null;

            // --- Extract fieldValidation ---
            const fieldValidationMatch = scriptContent.match(/let fieldValidation.*\n/);

            // console.log("fieldValidationMatch", fieldValidationMatch);
            if (fieldValidationMatch) {
                try {
                    const raw = fieldValidationMatch[0];
                    const arrayString = raw
                        .replace(/^let fieldValidation\s*=\s*\[/, '[')
                        .replace(/\];$/, ']')
                        .trim();
                    let parsedArray = eval(arrayString);
                    parsedFieldValidation = parsedArray; 
                } catch (err) {
                    console.error("Error parsing fieldValidation:", err.message);
                }
            }

            const depDatasetMatch = scriptContent.match(/const depDropdownDataset\s*=\s*(\{.*?\});/s);

            if (depDatasetMatch) {
                const raw = depDatasetMatch[1];  
                let depParsedObject = eval("(" + raw + ")"); 
                parsedDepDropdownDataset = depParsedObject; 
            }

            console.log("depDatasetMatch", parsedDepDropdownDataset);
            // --- End of Extraction ---

            return res.status(200).json({
                message: 'Form data and dynamicForm content retrieved successfully.',
                data,
                dynamicFormContent,
                parsedFieldValidation, 
                parsedDepDropdownDataset 
            });

        } catch (fileError) {
            console.error("File reading error:", fileError);
            return res.status(404).json({ 
                message: 'Error reading HTML file', 
                error: fileError.message 
            });
        }

    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

async function deleteMmtFormBuilder(req, res) {
    const data = req.params;
    const id = data.data; 

    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    try {
        const query = `
            DELETE FROM mmt_form_builder
            OUTPUT DELETED.Input_Form_Path, DELETED.Output_Form_Path
            WHERE id = @id
        `;

        const conn = await pool;
        const request = conn.request();
        request.input('id', id);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No form found with the given ID.' });
        }

        const deletedData = result.recordset[0];
        const { Input_Form_Path: inputFormPath, Output_Form_Path: outputFormPath } = deletedData;
       
        const outputFunctionName = outputFormPath
            ? `get${path.basename(outputFormPath, path.extname(outputFormPath))}`
            : null;

        const unlinkFiles = async (filePaths) => {
            for (const filePath of filePaths) {
                if (!filePath) continue;
                try {
                    await fs.promises.unlink(filePath);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error(`Error unlinking file ${filePath}:`, error.message);
                        throw error;
                    }
                    console.log(`File not found (already deleted): ${filePath}`);
                }
            }
        };

        const sanitizeOutputFunctionName = (outputFunctionName) => {
            if (outputFunctionName.startsWith('get') && outputFunctionName.endsWith('Report')) {
                return outputFunctionName.slice(3, -6);  
            }
            return outputFunctionName;
        };
        const FunctionName = sanitizeOutputFunctionName(outputFunctionName);

        const tableName = `tbl_formB_${FunctionName}`;
        const dropTableQuery = `DROP TABLE IF EXISTS ${tableName};`;
        const con = await pool;
        await con.query(dropTableQuery);
        await unlinkFiles([inputFormPath, outputFormPath]); 

        return res.status(200).json({
            message: 'Form, associated files, and functions deleted successfully.',
            deletedData,
        });
    } catch (error) {
        console.error('Error deleting form:', error.message);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

async function getFormBuilderReport(req,res){
    const conn = await pool;
    const data = req.params.data;
    // console.log(data);
    try {
        const tableName = data;

        const columnQuery = `SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'`;

        const columnResult = await conn.request().query(columnQuery);
        const columns = columnResult.recordset.map(row => row.COLUMN_NAME).filter(column => column !== 'id');

        const selectQuery = `
            SELECT ${columns.join(', ')}
            FROM ${tableName}
        `;

        const result = await conn.request().query(selectQuery);
        
        const rowData = result.recordset;  

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available for this selection' });
        // }

        let columnDefs;
        
        if(rowData.length !== 0){
            columnDefs = Object.keys(rowData[0]).map(key => ({
                headerName: key.charAt(0).toUpperCase() + key.slice(1), 
                field: key,
            }));

            const fileMappingQuery = `
                SELECT uid, field_name
                FROM tbl_form_Builder_fileMapping
                WHERE uid IN (${rowData.map(row => `'${row.uid}'`).join(', ')})
            `;

            const fileMappingResult = await conn.request().query(fileMappingQuery);

            const fileMappingData = fileMappingResult.recordset;

            rowData.forEach(row => {
                const matchingFields = fileMappingData
                .filter(mapping => {
                    const uidMatch = mapping.uid.toLowerCase() === row.uid.toLowerCase();
                    const fieldMatch = columns.map(col => col.toLowerCase()).includes(mapping.field_name.toLowerCase());

                    // console.log(`Checking mapping: uid=${mapping.uid}, field_name=${mapping.field_name}`);
                    // console.log(`UID match: ${uidMatch}, Field match: ${fieldMatch}`);

                    return uidMatch && fieldMatch;
                })
                .map(mapping => mapping.field_name);
                
                // console.log(`UID: ${row.uid}, Matching Fields:`, matchingFields);
                
                // Join matching field names as a string or set "None" if no match
                row.document_present = matchingFields.length > 0 ? matchingFields.join(', ') : 'None';
            });

            columnDefs.push({
                headerName: 'Document Present',
                field: 'document_present',
                cellRenderer: params => params.value !== 'None' ? params.value : 'Not Present',
            });
        }

        res.json({ columnDefs, rowData });
    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
}

async function getFormBuilderSatus(req,res){
    const data = req.params.data;
    const code = req.params.code;
    // console.log("Parsed Data:", data);
    // console.log("Parsed code:", code);
    try {
        let query;
        if (code === 'wing'){
            query = `SELECT 
            wing.wing_id,
            wing.wing_name AS [Wing],
            wing.wing_code AS [Wing Code],
            STRING_AGG(u.name, ', ') AS [Total Users],
        
            -- Distinct Filled Users
            (
                SELECT STRING_AGG(name, ', ')
                FROM (
                    SELECT DISTINCT filled_by_user.name
                    FROM STRING_SPLIT(fb.filled_by, ',') AS filled_user_id
                    JOIN tbl_user AS filled_by_user 
                        ON filled_by_user.user_id = TRY_CAST(filled_user_id.value AS INT)
                    WHERE filled_by_user.wing_id = wing.wing_id
                ) AS DistinctNames
            ) AS [Filled Users],
        
            -- Yet to be Filled Users
            (
                SELECT STRING_AGG(uu.name, ', ')
                FROM tbl_user uu
                WHERE uu.wing_id = wing.wing_id
                AND uu.user_id NOT IN (
                    SELECT TRY_CAST(value AS INT)
                    FROM STRING_SPLIT(fb.filled_by, ',')
                )
            ) AS [Yet to be Filled],
        
            -- Yet to be Filled User IDs
            (
                SELECT STRING_AGG(CAST(uu.user_id AS VARCHAR), ', ')
                FROM tbl_user uu
                WHERE uu.wing_id = wing.wing_id
                AND uu.user_id NOT IN (
                    SELECT TRY_CAST(value AS INT)
                    FROM STRING_SPLIT(fb.filled_by, ',')
                )
            ) AS [Yet to be Filled User IDs]
        
        FROM mmt_form_builder fb
        CROSS APPLY STRING_SPLIT(fb.wing, ',') AS split_wing 
        JOIN mmt_wings wing 
            ON wing.wing_id = TRY_CAST(split_wing.value AS INT)
        LEFT JOIN tbl_user u 
            ON u.wing_id = wing.wing_id
        WHERE fb.id = @id
        GROUP BY wing.wing_id, wing.wing_name, wing.wing_code, fb.filled_by;`
        }else{
            query =             `
            SELECT 
                org.organisation_id,
                org.organisation_name AS [Organisation],
                org.organisation_code as [Organisation Code],
                STRING_AGG(u.name, ', ') AS [Total Users],
            
                -- Filled Users
                --(
                --    SELECT STRING_AGG(filled_by_user.name, ', ')
                --    FROM STRING_SPLIT(fb.filled_by, ',') AS filled_user_id
                --    JOIN tbl_user AS filled_by_user 
                --        ON filled_by_user.user_id = TRY_CAST(filled_user_id.value AS INT)
                --    WHERE filled_by_user.organisation_id = org.organisation_id
                --) AS [Filled Users],
                -- Distinct Filled Users
                (
                    SELECT STRING_AGG(name, ', ')
                    FROM (
                        SELECT DISTINCT filled_by_user.name
                        FROM STRING_SPLIT(fb.filled_by, ',') AS filled_user_id
                        JOIN tbl_user AS filled_by_user 
                            ON filled_by_user.user_id = TRY_CAST(filled_user_id.value AS INT)
                        WHERE filled_by_user.organisation_id = org.organisation_id
                    ) AS DistinctNames
                ) AS [Filled Users],
                
                -- Unfilled Users
                (
                    SELECT STRING_AGG(uu.name, ', ')
                    FROM tbl_user uu
                    WHERE uu.organisation_id = org.organisation_id
                    AND uu.user_id NOT IN (
                        SELECT TRY_CAST(value AS INT)
                        FROM STRING_SPLIT(fb.filled_by, ',')
                    )
                ) AS [Yet to be Filled],
    
                (
                    SELECT STRING_AGG(uu.user_id, ', ')
                    FROM tbl_user uu
                    WHERE uu.organisation_id = org.organisation_id
                    AND uu.user_id NOT IN (
                        SELECT TRY_CAST(value AS INT)
                        FROM STRING_SPLIT(fb.filled_by, ',')
                    )
                ) AS [Yet to be Filled User IDs]
            
            FROM mmt_form_builder fb
            CROSS APPLY STRING_SPLIT(fb.organisation, ',') AS split_org
            JOIN mmt_organisation org 
                ON org.organisation_id = TRY_CAST(split_org.value AS INT)
            LEFT JOIN tbl_user u 
                ON u.organisation_id = org.organisation_id
            WHERE fb.id = @id
            GROUP BY org.organisation_id, org.organisation_name, org.organisation_code, fb.filled_by;
            
            `;
        }


        const conn = await pool;
        const request = conn.request();
        request.input('id', data);

        const result = await request.query(query);
        // return res.json(result.recordset);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
        res.json({ columnDefs, rowData });
    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
}

async function getFormBuilderUserWiseData(req,res){
    const data = req.params.data;
    const userID = req.params.userID;
    console.log("Parsed Data:", data);
    console.log("Parsed UserID:", userID);
    try {
        const tableName = `tbl_formB_${data}`;

        let query;
        if (isNaN(userID)) {
            query = `
                SELECT *
                FROM ${tableName} WHERE form_response_ID = @id
            `;
        } else {
            query = `
                SELECT 
                    CONVERT(VARCHAR(19), Submitted_on, 105) + ' ' + CONVERT(VARCHAR(8), Submitted_on, 108) AS Submitted_on, 
                    Form_response_ID
                FROM ${tableName} WHERE filled_by = @id
            `;
        }
        
        const conn = await pool;
        const request = conn.request();
        request.input('id', userID);

        const result = await request.query(query);
        // return res.json(result.recordset);

        if(isNaN(userID)){
            console.log(result.recordset);
            res.send(result.recordset);
        }
        else{
            const rowData = result.recordset;  
    
            if (rowData.length === 0) {
                return res.json(result.recordset);
            }
            
            const columnDefs = Object.keys(rowData[0]).map(key => ({
                headerName: key.charAt(0).toUpperCase() + key.slice(1), 
                field: key,
            }));
            res.json({ columnDefs, rowData });
        }
        
    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
}

async function getUserEditFormData(req,res){
    const conn = await pool;

    const userID = req.params.userID;
    const currentPage = req.params.currentPage;
    const tableName = `tbl_formB_${currentPage}`;

    // console.log("User ID:", userID);
    // console.log("Current Page:", currentPage);
    // console.log("Target Table:", tableName);

    try {

        const query = `
            SELECT * 
            FROM ${tableName}
            WHERE filled_by = @userID
        `;

        const conn = await pool;
        const request = conn.request();
        request.input('userID', userID);

        const result = await request.query(query);
        // console.log(result);
        res.send(result.recordset);

    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
} 


async function editFormBuilderData(req,res){
    const conn = await pool;
    const data = req.body.data;
    const organisationId = req.body.organisationId;
    console.log(data);
    // console.log(organisationId);

    try {
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "No data provided" });
        }

        const input = data[0].name; 
        
        if(!input){
            return res.status(400).json({ message: "No data provided" });
        }

        const tableName = `tbl_formB_${input.split('_').map(word =>word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')}`;                    

        const columns = ["organisation"]; 
        const parameterizedValues = ["@organisation"];
        const request = conn.request();

        request.input("organisation", organisationId);
        
        const filledBy = data[0].userID; // for mmt table and form table insertion

        columns.push("filled_by");
        parameterizedValues.push("@filled_by");
        request.input("filled_by", filledBy);


        const formResponseID = data[0].formDataId; 
        columns.push("form_response_ID");
        parameterizedValues.push("@form_response_ID");
        request.input("form_response_ID", formResponseID);

        data.forEach(item => {
            let valueToInsert = item.value;

            if (item.value && typeof item.value === 'object' && item.value.fileName) {
                let fileName = item.value.fileName;
                valueToInsert = fileName;
            } 

            // if (item.value && typeof item.value === 'object' && item.value.fileName) {
            //     let fileName = item.value.fileName;
                
            //     valueToInsert = fileName;
            // }

            columns.push(item.inputId);
            const mainParamName = `@p${item.inputId.replace(/\W+/g, '_')}`;
            parameterizedValues.push(mainParamName);
            request.input(mainParamName.substring(1), valueToInsert);
 
            if (item.subId) {
                columns.push(item.subId);
                const subParamName = `@p${item.subId.replace(/\W+/g, '_')}`;
                parameterizedValues.push(subParamName);
                request.input(subParamName.substring(1), item.subValue);
            }
        });

        const updateQuery  = `
            UPDATE ${tableName}
            SET ${columns.map((col, idx) => `${col} = ${parameterizedValues[idx]}`).join(', ')}
            OUTPUT INSERTED.uid
            WHERE filled_by = @filled_by AND form_response_ID = @form_response_ID; 
        `;

        console.log(updateQuery);
        const result = await request.query(updateQuery);

        const insertedId = result.recordset[0]?.uid || null;
        
        if (insertedId) {
            try {

                const normalizedInputForm = input.replace(/_/g, ' ').toLowerCase();
                // console.log("normalizedInputForm",normalizedInputForm);
                const getFilledByQuery = `
                    SELECT filled_by 
                    FROM mmt_form_builder 
                    WHERE Input_Form = @inputForm;
                `;
            
                const getRequest = conn.request();
                getRequest.input("inputForm", normalizedInputForm);
                const existingResult = await getRequest.query(getFilledByQuery);
                // console.log("existingResult",existingResult);
                const oldValue = existingResult.recordset[0]?.filled_by || "";
                // console.log("oldValue",oldValue);
        
                const newFilledBy = 
                oldValue === null || oldValue === "" 
                ? String(filledBy)
                : `${oldValue},${filledBy}`;
                // console.log("newFilledBy",newFilledBy);
                const updateMMTQuery = `
                    UPDATE mmt_form_builder
                    SET filled_by = @filledBy
                    WHERE Input_Form = @inputForm;
                `;
            
                const updateRequest = conn.request();
                updateRequest.input("filledBy", newFilledBy);
                updateRequest.input("inputForm", normalizedInputForm);
                await updateRequest.query(updateMMTQuery);

            } catch(err){
                console.error("Error updating filled_by:", err);
            }
        }        

        res.status(200).json({ 
            message: 'Form fields added successfully.',
            uid: insertedId
        });

    } catch (error) {
        console.error("Error occurred:", error);
        return res.sendStatus(500);
    }
}

async function extractH2FromDynamicForm(filePath, formTitle) {
    console.log(filePath,"filePath");
    // const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    // console.log("fileContent",fileContent);
    const $ = cheerio.load(fileContent);

    const dynamicForm = $('#dynamicForm');

    if (dynamicForm.length > 0) {
        const h2Tags = dynamicForm.find('h2');
        h2Tags.each((_, h2) => {
            const oldText = $(h2).text().trim();
            $(h2).text(formTitle);
            console.log(`Replaced <h2> "${oldText}" with "${formTitle}"`);
        });
        await fs.promises.writeFile(filePath, $.html(), 'utf-8');
    } else {
        console.log(`No dynamicForm div found in ${filePath}`);
    }
}

async function cloneMmtFormBuilder(req, res) {
    const conn = await pool;
    const data = req.body;

    try {
        const inputForm = data['Input Form'];
        const inputFormPath = data['Input_Form_Path'];
        const outputFormPath = data['Output_Form_Path'];
        const existingId = data['ID'];
        console.log(data ,"data");
        if (!inputForm) {
            return res.status(400).json({ message: "No 'Input Form' provided" });
        }

        if (!inputFormPath || !outputFormPath) {
            return res.status(400).json({ message: "Input or Output Form Path is missing" });
        }

        if (!existingId) {
            return res.status(400).json({ message: "No 'existingId' provided" });
        }

        const transaction = conn.transaction();
        await transaction.begin();
        const request = transaction.request();

        const fetchQuery = `
            SELECT form_Description, Last_Date_Of_Submission, organisation, Active_Status, created_by, filled_by
            FROM mmt_form_builder
            WHERE id = @id;
        `;
        request.input('id', existingId);
        const fetchResult = await request.query(fetchQuery);

        if (fetchResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: `No record found with ID ${existingId}` });
        }

        const existingData = fetchResult.recordset[0];

        const resolvedInputPath = path.resolve(inputFormPath);
        if (!fs.existsSync(resolvedInputPath)) {
            await transaction.rollback();
            return res.status(400).json({ message: `Input file not found at ${resolvedInputPath}` });
        }

        const resolvedOutputPath = path.resolve(outputFormPath);
        if (!fs.existsSync(resolvedOutputPath)) {
            await transaction.rollback();
            return res.status(400).json({ message: `Output file not found at ${resolvedOutputPath}` });
        }

        const now = new Date();
        const month = now.toLocaleDateString('en-US', { month: 'short' }).replace(/\s+/g, '');
        
        function toSnakeCase(title) {
            return title
                .trim()
                .replace(/[^a-zA-Z0-9 ]+/g, '') // Remove all non-alphanumeric characters except spaces
                .replace(/\s+([a-zA-Z])/g, (_, letter) => letter.toUpperCase()) // Capitalize after space
                .replace(/^\w/, match => match.toUpperCase()); // Capitalize the first letter
        }
        
        let inputCopyPath;
        let inputCopyIndex = 0;
        // const sanitizedInputForm = toSnakeCase(inputForm);
        

        let sanitizedInputForm = /^[a-zA-Z]+$/.test(inputForm)
                    ? inputForm.charAt(0).toUpperCase() + inputForm.slice(1)
                    : inputForm
                        .replace(/[_\s]+/g, ' ')
                        .trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join('');

        do {
            if (inputCopyIndex === 0) {
                inputCopyPath = path.join(
                    path.dirname(resolvedInputPath),
                    `${sanitizedInputForm}${month}Copy.html`
                );
            } else {
                inputCopyPath = path.join(
                    path.dirname(resolvedInputPath),
                    `${sanitizedInputForm}${month}Copy${inputCopyIndex}.html`
                );
            }
            inputCopyIndex++;
        } while (fs.existsSync(inputCopyPath));

        let outputCopyPath;
        let outputCopyIndex = 0;

        do {
            if (outputCopyIndex === 0) {
                outputCopyPath = path.join(
                    path.dirname(resolvedOutputPath),
                    `${sanitizedInputForm}${month}CopyReport.html`
                );
            } else {
                outputCopyPath = path.join(
                    path.dirname(resolvedOutputPath),
                    `${sanitizedInputForm}${month}Copy${outputCopyIndex}Report.html`
                );
            }
            outputCopyIndex++;
        } while (fs.existsSync(outputCopyPath));

        const inputFormName = revertFormId(path.basename(inputCopyPath));
        const outputFormName = revertFormId(path.basename(outputCopyPath));

        const formTitle = formatFormTitle(inputFormName); 
        const outputFormTitle = formatFormTitle(outputFormName); 
        const formId = formatFormId(inputFormName);
        
        console.log("inputFormName",inputFormName);
        console.log("outputFormName",outputFormName);
        console.log("formTitle",formTitle);
        console.log("formId",formId);

        const formattedInputTitle  = inputFormName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        const formattedOutputTitle  = outputFormName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        
        const insertQuery = `
            INSERT INTO mmt_form_builder 
            (Input_Form, Output_Form, Input_Form_Path, Output_Form_Path, form_Description, 
            Last_Date_Of_Submission, organisation, Active_Status, created_by, filled_by) 
            OUTPUT INSERTED.id
            VALUES 
            (@Input_Form, @Output_Form, @Input_Form_Path, @Output_Form_Path, @form_Description, 
            @Last_Date_Of_Submission, @organisation, @Active_Status, @created_by, @filled_by);
        `;
        request.input('Input_Form', formattedInputTitle);
        request.input('Output_Form', formattedOutputTitle);
        request.input('Input_Form_Path', inputCopyPath);
        request.input('Output_Form_Path', outputCopyPath);
        request.input('form_Description', existingData.form_Description);
        request.input('Last_Date_Of_Submission', existingData.Last_Date_Of_Submission);
        request.input('organisation', existingData.organisation);
        request.input('Active_Status', existingData.Active_Status);
        request.input('created_by', existingData.created_by);
        request.input('filled_by', existingData.filled_by);

        const insertResult = await request.query(insertQuery);
        const insertedId = insertResult.recordset[0].id;

        fs.copyFileSync(resolvedInputPath, inputCopyPath);
        fs.copyFileSync(resolvedOutputPath, outputCopyPath);
        await extractH2FromDynamicForm(inputCopyPath, inputFormName);
        await extractH2FromDynamicForm(outputCopyPath, inputFormName);

        await extractFieldValidation(inputCopyPath,formId,inputFormName);
        await extractFieldValidation(outputCopyPath,formId,inputFormName);

        // const newTableName = `tbl_formB_${sanitizedInputForm}`;
        // const originalTableName = `tbl_formB_${sanitizeFormTitle(inputForm)}`;
        const newTableName = `tbl_formB_${inputFormName}`;
        const originalTableName = `tbl_formB_${sanitizeFormTitle(inputForm)}`;

        console.log("newTableName",newTableName)
        console.log("originalTableName",originalTableName)
        // Fetch the schema of the original table
        const schemaQuery = `
            SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                CHARACTER_MAXIMUM_LENGTH, 
                COLUMN_DEFAULT, 
                IS_NULLABLE, 
                COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IsIdentity
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${originalTableName}';
        `;

        const schemaResult = await request.query(schemaQuery);
        const schema = schemaResult.recordset;

        // Build the CREATE TABLE query for the new table
        const createTableQuery = `
            CREATE TABLE ${newTableName} (
                ${schema.map(column => {
                    const isIdentity = column.IsIdentity === 1;
                    const nullable = column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
                    const defaultVal = column.COLUMN_DEFAULT ? `DEFAULT ${column.COLUMN_DEFAULT}` : '';
                    const length =
            column.CHARACTER_MAXIMUM_LENGTH && column.CHARACTER_MAXIMUM_LENGTH !== -1
                ? `(${column.CHARACTER_MAXIMUM_LENGTH})`
                : (column.DATA_TYPE === 'nvarchar' || column.DATA_TYPE === 'varchar') ? '(MAX)' : '';

                    const identity = isIdentity ? 'IDENTITY(1,1)' : '';

                    return `${column.COLUMN_NAME} ${column.DATA_TYPE}${length} ${identity} ${nullable} ${defaultVal}`.trim();
                }).join(',\n')}
            );
        `;

        const dropTableQuery = `
            IF OBJECT_ID('${newTableName}', 'U') IS NOT NULL
            BEGIN
                DROP TABLE ${newTableName};
            END;
        `;

        // console.log(`Dropping table if exists: ${newTableName}`);
        // console.log(dropTableQuery);
        await request.query(dropTableQuery);

        // console.log(`Creating table: ${newTableName}`);
        // console.log(createTableQuery); // Debug the generated query
        await request.query(createTableQuery);

        // Copy data, including identity columns
        const allColumns = schema.map(column => column.COLUMN_NAME).join(", ");
        const nonIdentityColumns = schema
            .filter(column => column.IsIdentity !== 1)
            .map(column => column.COLUMN_NAME)
            .join(", ");

        const copyDataQuery = `
            SET IDENTITY_INSERT ${newTableName} ON;
            INSERT INTO ${newTableName} (${allColumns})
            SELECT ${allColumns} FROM ${originalTableName};
            SET IDENTITY_INSERT ${newTableName} OFF;
        `;

        // console.log(`Copying data from ${originalTableName} to ${newTableName}`);
        // console.log(copyDataQuery); // Debug the data copy query
        await request.query(copyDataQuery);

        await transaction.commit();

        res.status(200).json({
            message: 'Form cloned and files copied successfully.',
            insertedId: insertedId,
            tableName: `tbl_formB_${inputForm.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}`
        });
    } catch (error) {
        // console.error("Error occurred:", error);

        if (conn.transaction && conn.transaction.isActive) {
            await conn.transaction.rollback();
        }

        return res.status(500).json({ message: 'An error occurred while processing your request.' });
    }
}

function sanitizeFormTitle(formTitle) {
    return formTitle
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function revertFormId(formId) {
    return formId
        .replace(/\.html$/, '') 
        .replace(/\s+/g, '')    
        .replace(/_+/g, '_');  
}

function formatFormTitle(input) {
    return input
        .replace(/\.[^/.]+$/, '') 
        .replace(/_/g, ' ') 
        .trim() 
        .split(/\s+/) 
        .map(word => word.charAt(0) + word.slice(1).toLowerCase()) 
        .join(' '); 
}

function formatFormId(input) {
    return input
        .replace(/\.[^/.]+$/, '') 
        .replace(/_/g, ' ') 
        .trim() 
        .toLowerCase() 
        .replace(/\s+/g, '_'); 
}


async function extractFieldValidation(filePath,formId,formTitle) {
    try {
        let fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const $ = cheerio.load(fileContent);

        const scriptTags = $('script');
        let fieldValidationScript = null;

        // Find the script containing `let fieldValidation`
        scriptTags.each((_, script) => {
            if ($(script).html().includes('let fieldValidation')) {
                fieldValidationScript = $(script).html();
            }
        });

        if (fieldValidationScript) {
            const fieldValidationMatch = fieldValidationScript.match(/let fieldValidation.*\n/);

            if (fieldValidationMatch) {
                const fieldValidationRaw = fieldValidationMatch[0];

                try {
                    // Extract and process the `fieldValidation` array
                    const arrayString = fieldValidationRaw
                        .replace(/^let fieldValidation\s*=\s*\[/, '[')
                        .replace(/\];$/, ']')
                        .trim();

                    const parsedArray = eval(arrayString); // Parse the `fieldValidation` array

                    parsedArray.forEach((field) => {
                        field.formId = formId;
                        field.formTitle = formTitle;
                    });

                    // console.log("Extracted Field Validation:", parsedArray);
                    // console.log("form id:", formId);
                    // console.log("form tile:", formTitle);

                   
                    // Convert updated array back to a string
                    const updatedFieldValidation = `let fieldValidation = ${JSON.stringify(parsedArray)};`;

                    // Replace the original `fieldValidation` script with the updated one
                    fieldValidationScript = fieldValidationScript.replace(fieldValidationMatch[0], `${updatedFieldValidation}\n`);
                    
                    $('script').each((i, script) => {
                        if ($(script).html().includes('let fieldValidation')) {
                            $(script).html(fieldValidationScript);
                        }
                    });

                    // Write updated back to file
                    await fs.promises.writeFile(filePath, $.html(), 'utf8');
                } catch (parseError) {
                    console.error("Error parsing fieldValidation array:", parseError.message);
                }
            } else {
                console.log("fieldValidation variable not found in the expected format.");
            }
        } else {
            console.log("No script containing fieldValidation found.");
        }
    } catch (error) {
        console.error(`Error processing file at ${filePath}:`, error.message);
    }
}

const inputExportHandlers = {upload,
    UploadFormDocument,
    downloadDocument,
    createFormBuilderData,
    editMmtFormBuilder,
    deleteMmtFormBuilder,
    getFormBuilderReport,
    getFormBuilderSatus,
    getFormBuilderUserWiseData,
    getUserEditFormData,
    editFormBuilderData,
    cloneMmtFormBuilder
};

export default inputExportHandlers
