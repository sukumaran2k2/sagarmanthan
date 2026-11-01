import { axiosInstance as api } from '../api';

// Opens (new tab) or saves a file the backend serves. A plain link can't send the login token
// the backend needs, so the file is fetched with it and handed to the browser as a blob.
//   openBackendFile('/meeting/download/12')                         opens it in a new tab
//   openBackendFile('/download-yp-document', { params, fileName, download: true })   saves it
export async function openBackendFile(path, { params, fileName, download = false } = {}) {
  // Open the tab straight away, inside the click, so the browser does not block it
  const tab = download ? null : window.open('', '_blank');
  try {
    const res = await api.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

export default openBackendFile;
