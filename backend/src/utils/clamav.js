import NodeClam from 'clamscan';

let clamPromise = null;

// Initialise once and reuse; init() is expensive
export function getClam() {
  if (!clamPromise) {
    clamPromise = new NodeClam().init({
      removeInfected: false,
      debugMode: false,
      scanRecursively: false,
      clamdscan: {
        // Use either the socket OR host/port, not both
        socket: process.env.CLAMD_HOST ? false : (process.env.CLAMD_SOCKET || '/var/run/clamav/clamd.ctl'),
        host: process.env.CLAMD_HOST || false,
        port: process.env.CLAMD_HOST ? Number(process.env.CLAMD_PORT || 3310) : false,
        timeout: 60000,
        localFallback: false,
        active: true,
      },
      preference: 'clamdscan',
    }).catch((err) => {
      clamPromise = null; // allow retry on next request
      throw err;
    });
  }
  return clamPromise;
}