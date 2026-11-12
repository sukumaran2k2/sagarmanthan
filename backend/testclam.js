
import NodeClam from 'clamscan';

let clamscan;

async function initializeClamAV() {
    const scanner = new NodeClam();

    clamscan = await scanner.init({
        clamdscan: {
            host: '127.0.0.1',
            port: 3310,
            timeout: 60000,
            localFallback: false
        },
        preference: 'clamdscan'
    });

    console.log('ClamAV connected successfully');
    return clamscan;
}

export default initializeClamAV;  
