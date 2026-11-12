import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

function toNoteListParams(params = {}) {
  const query = {
    page: params.page || 1,
    limit: params.limit || 10,
    category: params.category || 'active',
  };
  if (params.wingId && params.wingId !== 'All') query.wingId = params.wingId;
  if (params.divisionId && params.divisionId !== 'All') query.divisionId = params.divisionId;
  if (
    query.category === 'active' &&
    params.status &&
    params.status !== 'All'
  ) {
    query.status = params.status;
  }
  const search = String(params.search || '').trim();
  if (search) query.search = search;
  return query;
}

export function fetchCabinetNotes(params = {}, config = {}) {
  return api.get('/cabinet-mopsw', {
    params: toNoteListParams(params),
    ...config,
  });
}

export function fetchCabinetNoteById(id) {
  return api.get(`/cabinet-mopsw/${id}`);
}

export function createCabinetNote(payload) {
  return api.post('/cabinet-mopsw', payload);
}

export function updateCabinetNote(payload) {
  return api.put('/cabinet-mopsw', payload);
}

export function deleteCabinetNote(id, userId) {
  return api.delete(`/cabinet-mopsw/${id}/${userId}`);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchCabinetStages() {
  return api.get('/mmt-dropdown/mmt_cabinet_mopsw_stage');
}

export function fetchNoteDocuments(id) {
  return api.get(`/mopsw-document/${id}`);
}

export function uploadNoteDocuments(formData) {
  return api.post('/mopsw-document-uploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function downloadNoteDocumentUrl(noteId, fileName) {
  const q = encodeURIComponent(fileName || '');
  return `${API_BASE}/cabinet_notes_mopsw/download/${noteId}?file=${q}`;
}

export async function downloadNoteDocument(noteId, fileName) {
  const res = await api.get(`/cabinet_notes_mopsw/download/${noteId}`, {
    params: { file: fileName },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function fetchCabinetWingWiseReport() {
  return api.get('/cabinetmopsw-report');
}

export function fetchCabinetWingDivisionReport() {
  return api.get('/cabinetmopsw-wingdivision-report');
}

export function fetchCabinetDivisionWiseReport(wingId) {
  return api.get(`/cabinetmopsw-divisionwise/${wingId}/`);
}

export function fetchCabinetWingDetail(wingId, stage) {
  return api.get(`/getmopsw-wingwise/${wingId}/${stage}`);
}

export function fetchCabinetDivisionDetail(divisionId, stage) {
  return api.get(`/getmopsw-divisionwise/${divisionId}/${stage}`);
}

export function fetchCabinetMopswDashboard(wingId) {
  const params = wingId && wingId !== 'All' ? { wingId } : {};
  return api.get('/cabinet-mopsw-dashboard', { params });
}

export default api;
