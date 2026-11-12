import NodeClam from 'clamscan';
import fs from 'fs';

let clamPromise = null;

export function getClam() {
  if (!clamPromise) {
    const useTcp = !!process.env.CLAMD_HOST;
    clamPromise = new NodeClam().init({
      removeInfected: false,
      debugMode: false,
      scanRecursively: false,
      clamdscan: {
        socket: useTcp ? false : (process.env.CLAMD_SOCKET || '/var/run/clamav/clamd.ctl'),
        host: useTcp ? process.env.CLAMD_HOST : false,
        port: useTcp ? Number(process.env.CLAMD_PORT || 3310) : false,
        timeout: 60000,
        localFallback: false,
        active: true,
      },
      preference: 'clamdscan',
    }).catch((err) => {
      clamPromise = null; 
      throw err;
    });
  }
  return clamPromise;
}

/**
 * Returns { status: 'clean' } | { status: 'infected', threat } | { status: 'error' }
*/
export async function scanFile(filePath) {
  try {
    const clam = await getClam();
    // Stream over TCP/socket: works even when ClamAV runs in another container
    const { isInfected, viruses } = await clam.scanStream(fs.createReadStream(filePath));

    if (isInfected === true) {
      return { status: 'infected', threat: (viruses || []).join(', ') || 'Unknown' };
    }
    if (isInfected === false) return { status: 'clean' };
    return { status: 'error' };
  } catch (err) {
    console.error('[ClamAV] scan error:', err.message);
    return { status: 'error' };
  }
}

