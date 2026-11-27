import fs from 'fs';
import { scanFile } from '../../utils/clamav.js';

// Virus scan of the files multer just stored for a Projects upload (QC PRJ-BE-02).
// Like the other uploads in the portal it fails closed: if any file is infected, or could
// not be scanned, all of them are deleted. Returns null when every file is clean, else the
// { status, error } to reply with.
export async function scanProjectUploads(files) {
    for (const file of files) {
        const scan = await scanFile(file.path);
        if (scan.status === 'clean') continue;
        files.forEach((f) => fs.rmSync(f.path, { force: true }));
        if (scan.status === 'infected') {
            console.warn('Projects: infected upload rejected:', file.originalname, scan.threat);
            return { status: 422, error: 'File rejected: a virus was detected.' };
        }
        return { status: 503, error: 'File scanning is unavailable. Please try again later.' };
    }
    return null;
}
