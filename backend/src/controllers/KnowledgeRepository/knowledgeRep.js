import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { pool } from "../../db.js";
import { getMikrAxiosConfig } from "../../utils/mikrHttp.js";
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';

const uploadDestination = './fileuploads/knowledge_repository';

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/knowledge_repository");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

// const upload = multer({ 
//     storage: storage,
//     limits: { fileSize: 10000000 }  
// });

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

async function addKnowledgeRepositoryFile(req, res) {
    const conn = await pool;
    const request = conn.request();

    const title = req.body.title;
    const description = req.body.description;
    const mopswWings = req.body.mopswWings;
    const mopswOrganisations = req.body.mopswOrganisations;
    const functionalCells = req.body.functionalCells;
    const visionDocument = req.body.visionDocument;
    let documentType = req.body.documentType;
    let keywords = req.body.keywords;
    let newKeyWordsNew = req.body.numOfKeyWords;
    const format = req.body.format;
    const publishedYear = req.body.publishedYear;
    let publishedMonth = req.body.publishedMonth;
    const access = req.body.access;
    const frequency = req.body.frequency;
    let urlInput = req.body.urlInput;
    const userID = req.body.userID;

    if (publishedMonth == "") {
        publishedMonth = null;
    }

    if (urlInput == "") {
        urlInput = null;
    }

    if (newKeyWordsNew == "") {
        newKeyWordsNew = null;
    }

    if (isNaN(documentType)) {
        const docTypeID = await request.query(`
            SELECT MAX(ID) AS ID
            FROM mmt_kr_document_type;        
        `);
        documentType = (docTypeID.recordset[0].ID) + 1;
    }

    request.input("title", title);
    request.input("description", description);
    request.input("mopswWings", mopswWings);
    request.input("mopswOrganisations", mopswOrganisations);
    request.input("functionalCells", functionalCells);
    request.input("visionDocument", visionDocument);
    request.input("documentType", documentType);
    request.input("format", format);
    request.input("publishedYear", publishedYear);
    request.input("publishedMonth", publishedMonth);
    request.input("access", access);
    request.input("frequency", frequency);
    request.input("urlInput", urlInput);
    request.input("userID", userID);

    try {

        if (newKeyWordsNew && newKeyWordsNew !== null) {
            const subProjectNames = newKeyWordsNew.split(',').map(name => name.trim());
        
            for (let i = 0; i < subProjectNames.length; i++) {
                const paramName = `subProjectName${i + 1}`;
                const subProjectName = subProjectNames[i];

                // Check if subProjectName already exists in keywords
                if (!keywords.includes(subProjectName)) {
                    keywords.push(subProjectName);
                }
        
                request.input(paramName, subProjectName);
        
                const keywordExistsQuery = await request.query(`
                    SELECT COUNT(*) AS countExists
                    FROM [sagarmanthan_revamp].[dbo].[mmt_kr_key]
                    WHERE doc_id = @documentType;
                `);
        
                const countExists = keywordExistsQuery.recordset[0].countExists;
        
                if (countExists === 0) {
                    await request.query(`
                        INSERT INTO mmt_kr_key (doc_id, key_name)
                        VALUES (@documentType, @${paramName});
                    `);
                } else {
                    await request.query(`
                        UPDATE mmt_kr_key
                        SET key_name = CONCAT(key_name, ', ', @${paramName})
                        WHERE doc_id = @documentType
                        AND key_name NOT LIKE CONCAT('%', @${paramName}, '%');
                    `);
                }

            }
        } 
        
        request.input("keywords", Array.isArray(keywords) ? keywords.join(',') : keywords);

        const result = await request.query(`INSERT INTO tbl_kr_category_upload 
                (Title, Document_Type, Description, MoPSW_Organisations, MoPSW_Wings,
                Functional_Cells, Vision_Document, Published_Month, Published_Year,
                Keywords, Access, Format, Frequency, URL, created_by) 
                VALUES 
                (@title, @documentType, @description, @mopswOrganisations, @mopswWings,
                @functionalCells, @visionDocument, @publishedMonth, @publishedYear,
                @keywords, @access, @format, @frequency, @urlInput, @userID);
        `);

        res.sendStatus(200);  
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getKnowledgeRepository(req, res) {
    const conn = await pool;
    try {

        const result = await conn.query(`SELECT
            tbl_kr_category_upload.ID AS [ID],
            tbl_kr_category_upload.Document_Type AS [Document_Type],
            Title AS [Title/Subject],Description,MoPSW_Wings AS [MOPSW Wing],MoPSW_Organisations AS [MOPSW Organisation],
            Functional_Cells AS [VIBHAS/NAVIC Cell], Vision_Document AS [Vision Document],mmt_kr_document_type.document_type AS [Document Type],
            [Keywords],Format AS [File Format],Published_Year AS [Published Year],Published_Month AS [Published Month],
            Access,Frequency,Document_Name AS [File Uploaded],URL
        FROM 
            tbl_kr_category_upload
        LEFT JOIN 
            mmt_kr_document_type ON tbl_kr_category_upload.document_type = mmt_kr_document_type.ID;
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
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function krUploadFiles(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const ID = parseInt(req.body.ID);
        request.input("ID", ID);
        request.input("fileName", req.uniqueFileName);
        if (!req.uniqueFileName) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let sqlQuery;
        if (ID === -1) {
            const lastRecord = await conn.query(`SELECT TOP 1 ID
                FROM tbl_kr_category_upload
                ORDER BY ID DESC`);

            const ID = lastRecord.recordset[0].ID;

            sqlQuery = `
                UPDATE tbl_kr_category_upload
                SET Document_Name = @fileName
                WHERE ID = ${ID};
            `;
           
        } 
        // else {

        //     const checkRecord = await conn.query(`
        //         SELECT COUNT(*) AS recordCount
        //         FROM tbl_IT_inter_state_file
        //         WHERE Inter_state_ID = ${ID}
        //     `);

        //     const recordCount = checkRecord.recordset[0].recordCount;

        //     if (recordCount === 1) {
        //         const docName = await conn.query(`
        //             SELECT file_name as name
        //             FROM tbl_IT_inter_state_file
        //             WHERE Inter_state_ID = ${ID}
        //         `);

        //         const name = docName.recordset[0].name;
        //         if (name) {
        //             deleteFile(name);
        //         }

        //         sqlQuery = `
        //             UPDATE tbl_IT_inter_state_file
        //             SET file_name = @fileName
        //             WHERE Inter_state_ID = ${ID}
        //         `;
        //     } else {
        //         sqlQuery = `
        //             INSERT INTO tbl_IT_inter_state_file (Inter_state_ID, file_name)
        //             VALUES (${ID}, @fileName)
        //         `;
        //     }
        // }

        // Execute the SQL query
        await request.query(sqlQuery);

        res.status(200).json({ message: "Document uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadKRDocument(req, res) 
{
    try 
    {
        const fileName = req.params.filename;
        const file_path = path.join(__dirname, "../../../fileuploads/knowledge_repository", fileName);

        try {
            await access(file_path);
            const fileStats = await stat(file_path);

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fileStats.size);

            // Create a readable stream and pipe it to the response
            const fileStream = createReadStream(file_path);
            fileStream.pipe(res);

        } catch (error) {
            res.status(404).send({ message: "File not found" });
        }
    } 
    catch (err) 
    {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getKnowledgeRepositoryKey(req, res) {
    const conn = await pool;
    const docID = req.params.docID;
    if (!isNaN(docID)) {
        try {
            const result = await conn.query(`SELECT id,key_name FROM mmt_kr_key WHERE doc_id = ${docID};`);
            res.json(result.recordset);    
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
};

async function createMikrAccessToken(userId) {
    const conn = await pool;
    const request = conn.request();
    request.input("userId", userId);

    const userRes = await request.query(`
        SELECT u.user_id, u.email, u.role_id, r.role_name
        FROM tbl_user u
        INNER JOIN tbl_role r ON r.role_id = u.role_id
        WHERE u.user_id = @userId
    `);

    const user = userRes.recordset[0];
    if (!user) {
        throw new Error("User not found");
    }

    return jwt.sign(
        {
            userId: user.user_id,
            email: user.email,
            roleId: user.role_id,
            roleName: user.role_name,
        },
        process.env.MIKR_SECRET,
        { expiresIn: "15m" }
    );
}

async function deleteMikrTrainingData(id, documentType, accessToken) {
    const baseUrl = process.env.MIKR_BASE_URL || "https://mikr.belai.in";
    const deletePath = process.env.MIKR_DELETE_PATH || "/api/chatbot/delete_trainingdata";
    const response = await axios.post(
        `${baseUrl}${deletePath}`,
        {
            data: [{ ID: parseInt(id, 10), Document_Type: parseInt(documentType, 10) }],
        },
        getMikrAxiosConfig({
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        })
    );
    return response.data;
}

async function deleteKnowledgeRepository(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).send({ message: "User not authenticated" });
        }

        const id = req.params.id;
        const documentType = req.params.documentType;
        const conn = await pool;
        const request = conn.request();
        request.input("id", id);
        request.input("documentType", documentType);

        const result = await request.query(
            `SELECT Document_Name FROM tbl_kr_category_upload WHERE ID = @id AND Document_Type = @documentType`
        );

        if (!result.recordset.length) {
            return res.status(404).send({ message: "Document not found" });
        }

        const fileName = result.recordset[0].Document_Name;

        const requestHost = (req.hostname || req.get("host") || "").toLowerCase();
        const isLocalhostRequest = requestHost.includes("localhost") || requestHost.includes("127.0.0.1");

        if (!isLocalhostRequest) {
            const mikrAccessToken = await createMikrAccessToken(userId);
            await deleteMikrTrainingData(id, documentType, mikrAccessToken);
        }

        if (fileName) {
            const filePath = path.join(__dirname, "../../../fileuploads/knowledge_repository", fileName);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }

        await request.query(`DELETE FROM tbl_kr_category_upload WHERE ID = @id AND Document_Type = @documentType`);

        res.status(200).send({ message: "Document deleted successfully" });
    } catch (err) {
        const mikrData = err.response?.data;
        console.error("Delete knowledge repository error:", mikrData || err.message);

        const status = err.response?.status || 500;
        let message = mikrData?.detail
            || mikrData?.message
            || (status === 404 ? "MIKR delete API not found. Confirm delete URL with MIKR team." : err.message)
            || "Failed to delete document";

        if (mikrData?.request_id) {
            message += ` (MIKR request_id: ${mikrData.request_id})`;
        }

        res.status(status >= 400 && status < 600 ? status : 500).send({ message });
    }
}

async function getKnowledgeRepositoryDataEntry(req, res) {
    const conn = await pool;
    try {

        const result = await conn.query(`
            SELECT 
              count(*) AS 'no_of_documents',
              [MoPSW_Organisations] AS 'organisation_name'
            FROM [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
            GROUP BY [MoPSW_Organisations];`); 
        
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


export default { addKnowledgeRepositoryFile, getKnowledgeRepository, krUploadFiles, upload, downloadKRDocument, getKnowledgeRepositoryKey, getKnowledgeRepositoryDataEntry, deleteKnowledgeRepository };