import NodeClam from 'clamscan';
import fs from 'fs';

let clamAV = null;

/**
 * Lazily initialises the clamscan instance once.
 * Prefers TCP socket to ClamAV daemon (for Docker sidecar);
 * falls back to local CLI (clamscan / clamdscan) for bare-metal / dev.
 * Resets on failure so the next call retries (handles slow ClamAV startup).
 */
async function getClamAV() {
    if (clamAV) return clamAV;

    const host = process.env.CLAMAV_HOST || '127.0.0.1';
    const port = parseInt(process.env.CLAMAV_PORT || '3310', 10);
    const useTcp = !!process.env.CLAMAV_HOST; // only use TCP when host is explicitly set

    try {
        const options = {
            removeInfected: false,
            debugMode: false,
            scanRecursively: false,
            clamdscan: {
                active: useTcp,
                host,
                port,
                timeout: 60000,
                localFallback: false,
            },
            clamscan: {
                active: !useTcp,
            },
            preference: useTcp ? 'clamdscan' : 'clamscan',
        };

        clamAV = await new NodeClam().init(options);
        return clamAV;
    } catch (err) {
        clamAV = null; // allow retry on next call
        throw err;
    }
}

/**
 * Scans a file for threats.
 * Returns { clean: true } when no threats are found.
 * Returns { clean: false, threat: string } when a threat is detected.
 * Throws when ClamAV is not reachable.
 */
export async function scanFile(filePath) {
    const clam = await getClamAV();
    const { isInfected, viruses } = await clam.isInfected(filePath);
    if (isInfected) {
        return { clean: false, threat: (viruses || []).join(', ') || 'Unknown threat' };
    }
    return { clean: true };
}

/**
 * Express middleware: scans req.file after multer has saved it.
 * Deletes the file and returns 422 if a threat is found.
 * Passes through (with a warning) if ClamAV is unavailable.
 */
export async function clamScanMiddleware(req, res, next) {
    if (!req.file) return next();

    try {
        const result = await scanFile(req.file.path);
        if (!result.clean) {
            try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
            return res.status(422).json({
                error: 'File rejected: malware or threat detected.',
                threat: result.threat
            });
        }
        next();
    } catch (err) {
        console.warn('[ClamAV] Scanner unavailable, skipping scan:', err.message);
        next();
    }
}
