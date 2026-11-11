import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Attendance: the sample sheet the upload page offers. The 2.0 upload / list / delete routes on
// tbl_attendance / exceldata that used to live here were never called by the page (QC AT-07);
// uploads go through empAttendance.js.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadSampleDocument(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../attendance_document/Attendance_Sample.xlsx");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'Attendance_Sample.xlsx';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("Sample document not found on the server.");
            res.status(404).send({ message: "Sample document not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "The sample file could not be sent. Please try again." });
    }
}

const attendanceTab = { downloadSampleDocument };
export default attendanceTab;
