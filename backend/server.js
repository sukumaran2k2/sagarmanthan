import express from "express";
import router from "./src/routes.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from "cors";
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { sendEmail } from './src/controllers/Dashboard/emailService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {generalMailAlertForHR,pendingMailAlertForHR,resetAlertDate,checkLastUpdateOfEntryInHR,checkOrganisationsLastDataUpload,PendingMailOrgOrganisations} from './src/controllers/sendNotification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(cors({ origin: "*" }));

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


app.use(router);

const port = process.env.PORT;
app.listen(port, () => console.log("Sagarmanthan Backend started successfully"));

// chatbot email
app.use(bodyParser.json());

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

const mainProjectDir = path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images', 'mainProject');
const subProjectDir = path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images', 'subProject');

if (!fs.existsSync(mainProjectDir)) {
    fs.mkdirSync(mainProjectDir, { recursive: true });
}
if (!fs.existsSync(subProjectDir)) {
    fs.mkdirSync(subProjectDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const [baseName] = file.originalname.split('.');
        const [projectID, subprojectId] = baseName.split('_');
        if (subprojectId!='-1') {
            cb(null, subProjectDir);
        } else {
            cb(null, mainProjectDir); 
        }
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });
app.post('/upload', upload.array('files', 10), (req, res) => {
    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    res.status(200).json({ message: 'Files uploaded successfully' });
});

//app.use('/assets', express.static(path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images')));
app.use('/fileuploads/Project_Documents/project_images', express.static(path.join(__dirname, 'fileuploads', 'Project_Documents', 'project_images')));

// Fetch images endpoint
app.get('/getImages', async (req, res) => {
  const { projectId, subProjectId } = req.query;

  if (!projectId) {
    return res.status(400).send('Project ID is required.');
  }

  try {
    const mainProjectImages = [];
    const subProjectImages = [];

    if (fs.existsSync(mainProjectDir)) {
      mainProjectImages.push(
        ...fs.readdirSync(mainProjectDir)
          .filter(file => file.startsWith(`${projectId}_`)) 
          .map(file => ({
            documentName: `https://ntcpwcit.in/sagarmanthan/api/fileuploads/Project_Documents/project_images/mainProject/${file}` // Corrected line
          }))
      )
    }

    // Fetch images from subProject directory if subProjectId is provided
    if (subProjectId && fs.existsSync(subProjectDir)) {
      subProjectImages.push(
        ...fs.readdirSync(subProjectDir)
          .filter(file => file.startsWith(`${projectId}_${subProjectId}`)) // Corrected line
          .map(file => ({
            documentName: `https://ntcpwcit.in/sagarmanthan/api/fileuploads/Project_Documents/project_images/subProject/${file}` // Corrected line
          }))
      );
    }

    // Combine the images from both directories
    const allImages = [...mainProjectImages, ...subProjectImages];

    res.status(200).json(allImages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching images.');
  }
});