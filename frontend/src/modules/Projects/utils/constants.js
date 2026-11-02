export const PROJECT_STAGE_OPTIONS = [
  'All',
  'Project Initiated',
  'Under Tendering',
  'Under Implementation',
  'Completed',
];

export const PROJECT_CATEGORY_OPTIONS = [
  'All',
  'Capacity Enhancement',
  'Connectivity Enhancement',
  'Digital Infrastructure',
  'Dredging Projects',
  'Green Initiatives',
  'Coastal Berth',
  'Port Modernization',
  'Inland Waterways',
  'Shipyard Development',
  'Security & Surveillance',
  'Smart Port Solutions',
  'Renewable Energy',
  'Liquid Cargo Handling',
  'Dry Bulk Handling',
  'Logistics & Warehousing',
];

export const PROJECT_TYPE_OPTIONS = [
  'SFC',
  'EFC',
  'PIB',
  'DIB',
  'PPPAC',
  'CSS',
  'Port Level Approval',
  'Secretary Level Approval',
];

export const IMPLEMENTATION_TYPE_OPTIONS = [
  'Single Funded',
  'Self Funded',
  'Multi Funded',
];

export const FUNDING_SOURCE_OPTIONS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];

export const PROJECT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return '0.00 KB';
  const sizeKB = size / 1024;
  if (parseInt(sizeKB, 10) > 1024) {
    return `${(sizeKB / 1024).toFixed(2)} MB`;
  }
  return `${sizeKB.toFixed(2)} KB`;
}

export const PROJECT_DOCUMENT_TYPES = [
  {
    folderName: 'project_ppt',
    label: 'Project PPT',
    hint: 'Multiple PDF / PPTX files. Max 20 MB each.',
    accept: '.pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    acceptExtensions: ['.pdf', '.pptx'],
    maxFiles: 10,
    maxBytes: PROJECT_UPLOAD_MAX_BYTES,
  },
  {
    folderName: 'project_pert',
    label: 'PERT Chart',
    hint: 'Multiple PDF files. Max 20 MB each.',
    accept: '.pdf,application/pdf',
    acceptExtensions: ['.pdf'],
    maxFiles: 10,
    maxBytes: PROJECT_UPLOAD_MAX_BYTES,
  },
  {
    folderName: 'project_images',
    label: 'Latest Project Image',
    hint: 'Multiple images (JPG, PNG, WEBP, GIF). Max 20 MB each.',
    accept: 'image/*',
    acceptExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'],
    maxFiles: 20,
    maxBytes: PROJECT_UPLOAD_MAX_BYTES,
  },
];

export function getProjectDocumentTypeLabel(folderName) {
  const match = PROJECT_DOCUMENT_TYPES.find((item) => item.folderName === folderName);
  return match?.label || folderName || 'Document';
}

export function getProjectDocumentTypeConfig(folderName) {
  return PROJECT_DOCUMENT_TYPES.find((item) => item.folderName === folderName) || null;
}
