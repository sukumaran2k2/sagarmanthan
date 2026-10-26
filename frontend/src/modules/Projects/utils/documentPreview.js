const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export function getFileExtension(fileName) {
  const name = String(fileName || '').trim();
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

export function getMimeTypeFromFileName(fileName) {
  const ext = getFileExtension(fileName);
  return MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}

export function getDocumentPreviewKind(fileName) {
  const mime = getMimeTypeFromFileName(fileName);
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'unsupported';
}

export function createTypedObjectUrl(data, fileName) {
  const mime = getMimeTypeFromFileName(fileName);
  const needsRetype =
    !(data instanceof Blob) ||
    !data.type ||
    data.type === 'application/octet-stream' ||
    data.type === 'application/json';
  const blob = needsRetype ? new Blob([data], { type: mime }) : data;
  return URL.createObjectURL(blob);
}

export function triggerBrowserDownload(objectUrl, fileName) {
  if (!objectUrl || !fileName) return;
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
