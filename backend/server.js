import express from "express";
import router from "./src/routes.js";
import path from 'path';
import fs from 'fs';
import cors from "cors";
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { sendEmail } from './src/controllers/Dashboard/emailService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {generalMailAlertForHR,pendingMailAlertForHR,resetAlertDate,checkLastUpdateOfEntryInHR,checkOrganisationsLastDataUpload,PendingMailOrgOrganisations} from './src/controllers/sendNotification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Credentials: true is required so the browser sends the httpOnly refreshToken cookie.
// ALLOWED_ORIGIN must not be "*" when credentials are enabled.
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const corsOptions = {
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // Cache-Control: the network speed test asks for an uncached answer (QC R-26)
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cache-Control"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(cookieParser());

// cron.schedule('0 9 * * *', async () => {
//   const today = new Date();
//   const day = today.getDate();

//   if (day === 1 || day === 5) {
//     await generalMailAlertForHR();
//   }
// });

// cron.schedule('0 9 * * *', async () => {
//   const day = new Date().getDate();
//   if (day === 8) {
//     try {
//       const [hrPendingOrgs, uploadPendingOrgs] = await Promise.all([
//         checkLastUpdateOfEntryInHR(),      
//         checkOrganisationsLastDataUpload()   
//       ]);

//       if (hrPendingOrgs.length > 0) {
//         await pendingMailAlertForHR({
//           type: "HR_UPDATE_PENDING",
//           organisationIds: hrPendingOrgs
//         });
//       }

//       if (uploadPendingOrgs.missingOrganizations.length > 0) {
//         await PendingMailOrgOrganisations();
//       }

//     } catch (error) {
//       console.error("HR Automation Cron Error:", error);
//     }
//   }
// });


cron.schedule('0 1 * * *', async () => {
  const today = new Date();
  const date = today.getDate();

  if (date >= 20 && date <=25) {
    await resetAlertDate();
  }
});


app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Sagarmanthan API is running" });
});

app.use(router);

app.post('/send-email', async (req, res) => {
    const { to, subject, text, cc } = req.body;
    console.log('Recipient:', to);

    try {
        await sendEmail({ to, subject, text, cc });
        res.status(200).send('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send email');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Sagarmanthan Backend started successfully on port ${port}`));

const mainProjectDir = path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images', 'mainProject');
const subProjectDir = path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images', 'subProject');

if (!fs.existsSync(mainProjectDir)) {
    fs.mkdirSync(mainProjectDir, { recursive: true });
}
if (!fs.existsSync(subProjectDir)) {
    fs.mkdirSync(subProjectDir, { recursive: true });
}

// The old /upload (saved files under the name the browser sent, overwriting others) and
// /getImages (returned links to the 2.0 server's public folder) were unused and are removed (QC R-12).
// Uploaded files are not served publicly (QC CSR-01): each module downloads them through its own
// signed-in, scoped route (e.g. /download-csrfile/:name).
