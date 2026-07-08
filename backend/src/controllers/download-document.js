import { pool } from "../db.js";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";


export async function getDownloadDocument(req, res) {
    // try {

    //         //  const { email, password, documentId } = req.body;

    //         // if (!email || !password || !documentId) {
    //         //     return res.status(400).json({ message: "Email, password, and documentId are required" });
    //         // }

    //         // const conn = await pool;
    //         // const request = conn.request();
    //         // request.input("email", email);

    //         // const result = await request.query(SELECT password FROM tbl_user WHERE email = @email);
    //         // const user = result.recordset[0];

    //         // if (!user) {
    //         //     return res.status(401).json({ message: "Invalid email or password" });
    //         // }

    //         // const isPasswordMatch = bcrypt.compareSync(password, user.password);
    //         // if (!isPasswordMatch) {
    //         //     return res.status(401).json({ message: "Invalid email or password" });
    //         // }

    //         // Step 1: Authenticate user
    //         const { email, password } = req.query;
    //         if (!email || !password) {
    //             return res.status(401).json({ message: "Please enter your email and password" });
    //         }

    //         const conn = await pool;
    //         const request = conn.request();
    //         request.input("email", email);

    //         const result = await request.query(`SELECT password FROM tbl_user WHERE email = @email`);
    //         const user = result.recordset[0];

    //         if (!user) {
    //             return res.status(401).json({ message: "Invalid username or password" });;
    //         }

    //         const isPasswordMatch = bcrypt.compareSync(password, user.password);
    //         if (!isPasswordMatch) {
    //             return res.status(401).json({ message: "Invalid username or password" });
    //         }


    //         const { documentId } = req.body;

    //         if (!documentId) {
    //             return res.status(400).json({ message: "Id is required" });
    //         }
     
    //     // Get document name by ID
    //     const docRequest = conn.request();
    //     docRequest.input("documentId", documentId);
    //     const docResult = await docRequest.query(`
    //         SELECT Document_Name
    //         FROM [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
    //         WHERE ID = @documentId
    //     `);

    //     const document = docResult.recordset[0];
    //     if (!document) {
    //         return res.status(404).json({ message: "Document not found in database" });
    //     }


    //     const fileName = document.Document_Name;
    //     // const filePath = path.join(process.cwd(), "fileuploads", "knowledge_repository", fileName);
          
    //     const filePath = path.resolve("fileuploads", "knowledge_repository", fileName);
    //     // console.log(filePath, "document", fileName)


    //     if (!fs.existsSync(filePath)) {
    //         return res.status(404).json({ message: "File not found on server" });
    //     }

    //     // Send file as attachment
    //     res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    //     res.setHeader("Content-Type", "application/octet-stream");

    //     const fileStream = fs.createReadStream(filePath);
    //     fileStream.pipe(res);


//   try {
//         const { id } = req.query;

//         const conn = await pool;
//         const request = conn.request();

//         if (id) {
//             // Download mode
//             request.input("documentId", id);
//             const docResult = await request.query(`
//                 SELECT Document_Name
//                 FROM [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
//                 WHERE ID = @documentId AND for_api = 1
//             `);

//             const document = docResult.recordset[0];
//             if (!document) return res.status(404).send("Document not found");

//             const fileName = document.Document_Name;
//             const filePath = path.resolve("fileuploads", "knowledge_repository", fileName);

//             if (!fs.existsSync(filePath)) {
//                 return res.status(404).send("File not found on server");
//             }

//             res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
//             res.setHeader("Content-Type", "application/octet-stream");

//             return fs.createReadStream(filePath).pipe(res);
//         }

//         // List mode
//         const result = await request.query(`
//             SELECT ID, Document_Name
//             FROM [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
//             WHERE for_api = 1
//         `);

//         let html = `<table border="1" cellpadding="5">
//             <tr><th>ID</th><th>Document Name</th><th>Download</th></tr>`;

//         result.recordset.forEach(doc => {
//             html += `<tr>
//                 <td>${doc.ID}</td>
//                 <td>${doc.Document_Name}</td>
//                 <td><a href="/api/download-document?id=${doc.ID}" download>Download</a></td>
//             </tr>`;
//         });

//         html += `</table>`;
//         res.send(html);


try {
    const { file } = req.query; // If "file" param exists, serve the file directly

    if (file) {
        const filePath = path.join("fileuploads", "knowledge_repository", file);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found." });
        }
        return res.download(filePath, file); // Force download
    }

    // Otherwise, return list of files in JSON format
    const conn = await pool;
    const request = conn.request();
    const result = await request.query(`
        SELECT Document_Name
        FROM tbl_kr_category_upload
        WHERE for_api = 1
    `);

    // const baseurl = process.env.NODE_ENV == "development"
    //     ? `http://localhost:${process.env.PORT}`
    //     : "https://ntcpwcit.in/sagarmanthan/api";

    const files = result.recordset.map(row => ({
        name: row.Document_Name,
        url: `${process.env.BASE_URL}/download-document?file=${encodeURIComponent(row.Document_Name)}`
    }));

    res.json(files);




    } catch (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
