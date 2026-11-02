// File handling for Form Builder submissions.
//
// Same storage as Sagarmanthan 2.0: files live in backend/formbuilder_Files and
// tbl_form_Builder_fileMapping maps (submission uid, field) to the stored file.
// Stored names are random UUIDs, never derived from the uploaded name, and the
// original name is only ever sent back as a download filename.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_DIR = path.resolve(__dirname, '../../../formbuilder_Files');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // same limit as 2.0
const MAX_FILES_PER_REQUEST = 20;

// Keeps a short, plain extension (".pdf") so stored files stay recognisable; anything
// odd is dropped. Any type is accepted (as in 2.0) because files are only ever served
// as downloads, never rendered.
function safeExtension(originalName) {
  const ext = path.extname(String(originalName || ''));
  return /^\.[A-Za-z0-9]{1,10}$/.test(ext) ? ext.toLowerCase() : '';
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${safeExtension(file.originalname)}`),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
});

// Accepts multipart submissions (files keyed by field id); JSON requests pass through.
export function acceptFormFiles(req, res, next) {
  upload.any()(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'A file is larger than the 50 MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: `At most ${MAX_FILES_PER_REQUEST} files can be sent at once` });
    }
    console.error('Form Builder upload error:', err);
    return res.status(400).json({ message: 'Could not read the uploaded files' });
  });
}

// The uploaded file's real name. Multer's parser reads multipart file names as Latin-1,
// which garbles UTF-8 names ("é" -> "Ã©"), and browsers send a double quote in a
// file name as %22 (per the HTML spec), so both are undone here.
export function originalNameOf(file) {
  return Buffer.from(String(file?.originalname || ''), 'latin1').toString('utf8')
    .replace(/%22/g, '"')
    .replace(/[\r\n]/g, '')
    || 'file';
}

// Resolves a stored name inside UPLOAD_DIR, or null if it would point anywhere else.
export function storedFilePath(uniqueFileName) {
  const name = String(uniqueFileName || '');
  if (!name || path.basename(name) !== name) return null;
  return path.join(UPLOAD_DIR, name);
}

// Best-effort removal; a file that is already gone is fine.
export async function removeFiles(paths) {
  for (const p of paths) {
    if (!p) continue;
    try {
      await fs.promises.unlink(p);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`Could not remove ${p}:`, err.message);
    }
  }
}

// Content-Disposition with an ASCII fallback plus the UTF-8 original (RFC 6266/5987),
// so names with quotes or non-Latin characters can't break the header.
export function attachmentHeader(originalName) {
  const name = String(originalName || 'download');
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
