import { axiosInstance } from '../../api';

/**
 * Official Foreign Visit API.
 *
 * The backend controller (backend/src/controllers/Governance/officialForeignVisit.js) was ported
 * from the 2.0 portal, so the route names and payload keys below are its spelling, not ours --
 * including the typo in /update-propsed-info. Keep them as they are.
 */

// ── List ──

/** Full visit list. The server applies its own role/organisation scoping on top of these two ids. */
export function fetchForeignVisits(userId, organisationId) {
  return axiosInstance.get(`/OFV-data/${userId}/${organisationId}`);
}

/** One raw row of tbl_official_foreign_visit, for the edit and update screens. */
export function fetchForeignVisitForUpdate(id) {
  return axiosInstance.get(`/get-OFV-update/${id}`);
}

/** Documents already attached to a visit: [{ id, ofv_id, file_name, doc_related }] */
export function fetchForeignVisitDocuments(id) {
  return axiosInstance.get(`/get-OFV-upload/${id}`);
}

export function fetchForeignVisitDetail(id) {
  return axiosInstance.get(`/get-OFV-detail/${id}`);
}

// ── Create & stage updates ──

export function createForeignVisit(payload) {
  return axiosInstance.post('/add-OFV-data', payload);
}

/** Stage 1 -- the proposal fields. */
export function updateProposedInfo(payload) {
  // The backend route really is spelled "propsed".
  return axiosInstance.post('/update-propsed-info', payload);
}

/** Stage 2 -- sanction decision. Moves the record to Sanctioned (2) or Rejected (5). */
export function updateSanctionedInfo(payload) {
  return axiosInstance.post('/update-sanctioned-info', payload);
}

/** Stage 3 -- did the visit happen. Moves the record to Visited (3) or Not Visited (4). */
export function updateVisitInfo(payload) {
  return axiosInstance.post('/update-visit-tab', payload);
}

// ── Documents ──

/**
 * Upload a sanction order or tour report.
 * `id` may be -1 straight after a create, which tells the server to attach the file to the
 * most recently inserted visit.
 */
export function uploadForeignVisitDocument({ file, id, type, userId }) {
  const form = new FormData();
  form.append('file', file);
  form.append('ID', id);
  form.append('type', type);
  if (userId != null) form.append('userId', userId);
  return axiosInstance.post('/OFV/upload-files', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * Streams a stored document back.
 * Despite the `:id` in the route, the server uses this segment as the file name on disk
 * (see downloadTour), so pass tbl_ofv_doc.file_name here -- not the row id.
 */
export function downloadForeignVisitDocument(fileName) {
  return axiosInstance.get(`/OFV/download/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
}

// ── Dashboard ──

/** Year-wise totals: { total: [{ Total, year }] } */
export function fetchForeignVisitChart({ orgId, roleId, designationId, officerName }) {
  return axiosInstance.get(
    `/get-foreign-chart/${orgId}/${roleId}/${designationId}/${encodeURIComponent(officerName)}`
  );
}

/** Stage counts and visit-type split: { count: [{ proposed, sanctioned, tour_visited, tour_notvisited }], type: [{ visit_type_name, Total }] } */
export function fetchForeignVisitCounts(payload) {
  return axiosInstance.post('/get-foreign-count', payload);
}

/** Sanctioned but not yet completed. */
export function fetchForeignVisitOngoing({ orgId, roleId, designationId, officerName }) {
  return axiosInstance.get(
    `/get-foreign-onGoing/${orgId}/${roleId}/${designationId}/${encodeURIComponent(officerName)}`
  );
}

// ── Reports ──

/**
 * Report grid. Every filter is sent as 0 when unset -- the server tests `!== 0`, so sending
 * '' or null would be treated as a real filter value and return nothing.
 * Responds { columnDefs, rowData }, or 404 when nothing matches.
 */
export function fetchForeignVisitReport(filters) {
  return axiosInstance.post('/get-OFV-report', filters);
}

export function fetchForeignVisitByYear(year, type) {
  return axiosInstance.get(`/get-OFV-year/${year}/${type}`);
}

export function fetchForeignVisitByOfficer(name, type) {
  return axiosInstance.get(`/get-OFV-name/${encodeURIComponent(name)}/${type}`);
}

// ── Dropdowns ──

export function fetchOrganisations() {
  return axiosInstance.get('/mmt-dropdown/mmt_organisation');
}

export function fetchDesignations() {
  return axiosInstance.get('/mmt-dropdown/mmt_designation');
}

export function fetchVisitTypes() {
  return axiosInstance.get('/mmt-dropdown/mmt_ofv_visit_type');
}

export function fetchVisitStages() {
  return axiosInstance.get('/mmt-dropdown/mmt_ofv_stage');
}

export function fetchCountries() {
  return axiosInstance.get('/mmt-dropdown/mmt_country');
}

/** Distinct officer names already recorded, for the Reports officer filter. */
export function fetchOfficerNames() {
  return axiosInstance.get('/mmt-dropdown/tbl_official_foreign_visit_officers');
}
