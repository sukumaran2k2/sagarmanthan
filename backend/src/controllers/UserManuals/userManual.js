import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function attendanceManual(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../user_manual/Governance/Attendance_Manual.pdf");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'Attendance_User_Manual.pdf';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("User manual not found on the server.");
            res.status(404).send({ message: "User manual not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function krManual(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../user_manual/KnowledgeRepository/KR - User Manual.pdf");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'KR - User Manual.pdf';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("User manual not found on the server.");
            res.status(404).send({ message: "User manual not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function projectManual(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../user_manual/ProjectManagement/Project_Manual.pdf");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'Project_User_Manual.pdf';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("User manual not found on the server.");
            res.status(404).send({ message: "User manual not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}


const userMenu = { attendanceManual, krManual, projectManual };
export default userMenu;