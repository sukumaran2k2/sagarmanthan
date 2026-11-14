import { downloadForeignVisitDocument } from '../api';

/**
 * Reads the server's message out of a failed blob download.
 *
 * The request asks for `responseType: 'blob'`, so even an error body arrives as a Blob and the
 * usual getErrorMessage() finds nothing on it. Without this the user is told only that the
 * download failed, not that the file is missing on the server.
 */
async function reasonFor(err) {
  const data = err?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.error || '';
    } catch {
      return '';
    }
  }
  return data?.message || data?.error || '';
}

/**
 * Fetches a stored document and hands it to the browser as a download.
 *
 * Throws an Error carrying the server's reason, so callers can surface something more useful
 * than "it failed" -- a row can name a file that is no longer on disk.
 */
export async function downloadVisitDocument(fileName) {
  if (!fileName) return;

  let res;
  try {
    res = await downloadForeignVisitDocument(fileName);
  } catch (err) {
    const reason = await reasonFor(err);
    const status = err?.response?.status;
    const error = new Error(
      status === 404
        ? `"${fileName}" is recorded against this visit but is not on the server.`
        : reason || 'The document could not be downloaded.'
    );
    error.cause = err;
    throw error;
  }

  const url = URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
