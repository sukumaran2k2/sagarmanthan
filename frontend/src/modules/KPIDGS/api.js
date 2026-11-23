import { API_BASE, createApiClient } from '../../api';
import { cachedGet, clearDgsCache } from './store/dgsRequestCache';

export { API_BASE };

const api = createApiClient();

// ---- MMD Master ----
export function fetchMmdList() {
  return api.get('/get-mmd-list');
}
export function fetchMmdById(mmdId) {
  return api.get('/get-mmd-data', { params: { mmdId } });
}
export function createMmd(mmdName) {
  return api.post('/submit-mmd-data', { mmdName });
}
export function updateMmd(mmdId, mmdName) {
  return api.post('/update-mmd-data', { mmdId, mmdName });
}
export function updateMmdStatus(mmdId, status) {
  return api.post('/update-mmd-status', { mmdId, status });
}

// ---- K-2.1 Flagging of Vessels (Input) ----
export function createKpi2_1_1(payload) {
  return api.post('/add-kpi2-1-1', payload);
}
export function fetchKpi2_1_List(params = {}) {
  return api.get('/kpi2-1-list', { params });
}
export function fetchKpi2_1_PreviousCumulative(year, month) {
  return api.get(`/previousCumulative-2-1-data/${year}/${month}`);
}
export function fetchKpi2_1_EditData(year, month) {
  return api.get(`/getedit-2-1-data/${year}/${month}`);
}
export function updateKpi2_1(payload) {
  return api.put('/edit-2-1-data', payload);
}

// ---- K-2.2 SBFAP (Input) ----
export function fetchShipyardList() {
  // mmt_shipyard is exposed via the generic dropdown endpoint as { shipyard_id, shipyard_name }.
  return api.get('/mmt-dropdown/mmt_shipyard');
}
export function fetchKpi2_2_List(params = {}) {
  return api.get('/kpi2-2-list', { params });
}
export function checkKpi2_2_Data(applicationNumber) {
  return api.get(`/checkData-2-2-data/${encodeURIComponent(applicationNumber)}`);
}
export function createKpi2_2_1(payload) {
  return api.post('/add-2-2-1-data', payload);
}
export function updateKpi2_2_1(payload) {
  return api.put('/edit-2-2-1-data', payload);
}
export function downloadKpi2_2_Template() {
  return api.get('/kpi2-2-template', { responseType: 'blob' });
}
export function fetchKpi2_2_EditData(uniqueAppId) {
  return api.get(`/getedit-2-2-data/${encodeURIComponent(uniqueAppId)}`);
}
export function fetchKpi2_2_Fa_List(params = {}) {
  return api.get('/kpi2-2-fa-list', { params });
}
export function checkKpi2_2_Fa_Data(fundApplicationNumber) {
  return api.get(`/checkData-2-2-fa-data/${encodeURIComponent(fundApplicationNumber)}`);
}
export function createKpi2_2_Fa(payload) {
  return api.post('/add-2-2-fa-data', payload);
}
export function updateKpi2_2_Fa(payload) {
  return api.put('/edit-2-2-fa-data', payload);
}
export function fetchKpi2_2_Fa_EditData(fundAppId) {
  return api.get(`/getedit-2-2-fa/${encodeURIComponent(fundAppId)}`);
}
export function downloadKpi2_2_Fa_Template() {
  return api.get('/kpi2-2-fa-template', { responseType: 'blob' });
}

// ---- K-2.3.2 Exam Overall Performance Statistics (Input) ----
// The add/edit masterdata calls return saved rows for that year/month/type when they exist,
// otherwise the blank master rows from mmt_kpi_2_3_data. /add-kpi2-3-2 saves both (upsert).
export function fetchKpi2_3_Masterdata(year, month, type) {
  return api.get(`/get_addkpi2_3_masterdata/${year}/${month}/${type}`);
}
export function fetchKpi2_3_EditMasterdata(year, month, typeId) {
  return api.get(`/get_editkpi2_3_masterdata/${year}/${month}/${typeId}`);
}
export function checkKpi2_3_2_Data(year, month, onType) {
  return api.get(`/checkData-2-3-2-data/${year}/${month}/${onType}`);
}
// K-2.3 saves clear the request cache so the Data Lists show the change at once
const clearingCache = (res) => { clearDgsCache(); return res; };

export function createKpi2_3_2(payload) {
  return api.post('/add-kpi2-3-2', payload).then(clearingCache);
}
// Cached for a minute (dgsRequestCache): reopening the Data List is instant
export function fetchKpi2_3_2_List(params = {}) {
  return cachedGet(`kpi2-3-2-list ${JSON.stringify(params)}`, () => api.get('/kpi2-3-2-list', { params }));
}

// ---- K-2.3.1 Exam Monthly Performance (Input) ----
// Total exams conducted per month (nautical / engineering). checkData answers 205 when the
// month already has an entry, 201 when it is free.
export function checkKpi2_3_1_Data(year, month) {
  return api.get(`/checkData-2-3-1-data/${year}/${month}`);
}
export function createKpi2_3_1(payload) {
  return api.post('/add-kpi2-3-1', payload).then(clearingCache);
}
export function fetchKpi2_3_1_List(params = {}) {
  return cachedGet(`kpi2-3-1-list ${JSON.stringify(params)}`, () => api.get('/kpi2-3-1-list', { params }));
}
export function fetchKpi2_3_1_EditData(year, month) {
  return api.get(`/getedit-2-3-1-data/${year}/${month}`);
}
export function updateKpi2_3_1(payload) {
  return api.put('/edit-2-3-1-data', payload).then(clearingCache);
}

// K-2.4 Entry and Exit of Candidates (one entry per year + month + grade)
// 205 = that year / month / grade already has an entry, 201 = free (as K-2.3)
export function checkEntryExit(year, month, grade) {
  return api.get(`/checkData-entry-exit/${year}/${month}/${grade}`);
}
export function createEntryExit(payload) {
  return api.post('/add-entry-exit-data', payload).then(clearingCache);
}
// Cached for a minute (dgsRequestCache): reopening the Data List is instant
export function fetchEntryExitList(params = {}) {
  return cachedGet(`entry-exit-list ${JSON.stringify(params)}`, () => api.get('/get-entry-exit-data', { params }));
}
export function fetchEntryExitById(id) {
  return api.get(`/get-entry-exit-data-by-id/${id}`);
}
export function updateEntryExit(payload) {
  return api.put('/update-entry-exit-data-by-id', payload).then(clearingCache);
}
export function fetchDgsType() {
  return api.get('/mmt-dropdown/mmt_kpi_dgs_type');
}
export function fetchDgsGrade() {
  return api.get('/mmt-dropdown/mmt_kpi_dgs_grade');
}

// ---- K-2.6 Flag State Inspection (Input) ----
export function checkKpi2_6_1_Data(year, month, mmdName) {
  return api.get(`/checkData-2-6-1-data/${year}/${month}/${encodeURIComponent(mmdName)}`);
}
export function createKpi2_6_1(payload) {
  return api.post('/add-kpi2-6-1', payload);
}
export function fetchKpi2_6_1_List(params = {}) {
  return api.get('/kpi2-6-1-list', { params });
}
export function fetchKpi2_6_1_EditData(year, month, mmdId) {
  return api.get(`/getedit-2-6-1-data/${year}/${month}/${mmdId}`);
}
export function deleteKpi2_6_1(year, month, mmdId) {
  return api.delete(`/delete-2-6-1-data/${year}/${month}/${mmdId}`);
}
export function createKpi2_6_2(payload) {
  return api.post('/add-kpi2-6-2-data', payload);
}
export function fetchKpi2_6_2_List(params = {}) {
  return api.get('/kpi2-6-2-list', { params });
}

// ---- K-2.7 Port State Control (Input) ----
export function checkKpi2_7_1_Data(year, month, mmdName) {
  return api.get(`/checkData-2-7-1-data/${year}/${month}/${encodeURIComponent(mmdName)}`);
}
export function createKpi2_7_1(payload) {
  return api.post('/add-kpi2-7-1', payload);
}
export function fetchKpi2_7_1_List(params = {}) {
  return api.get('/kpi2-7-1-list', { params });
}
export function fetchKpi2_7_1_EditData(year, month, mmdId) {
  return api.get(`/getedit-2-7-1-data/${year}/${month}/${mmdId}`);
}
export function deleteKpi2_7_1(year, month, mmdId) {
  return api.delete(`/delete-2-7-1-data/${year}/${month}/${mmdId}`);
}
export function createKpi2_7_2(payload) {
  return api.post('/add-kpi2-7-2-data', payload);
}
export function fetchKpi2_7_2_List(params = {}) {
  return api.get('/kpi2-7-2-list', { params });
}

// ---- K-2.8 Vessel and Port Survey/Audits by MMDs ----
export function submitVesselSurvey(payload) {
  return api.post('/submit-vessel-survey-data', payload);
}
export function fetchVesselSurveyList(params = {}) {
  return api.get('/get-vessel-survey-data', { params });
}
export function fetchVesselSurveyById(id) {
  return api.get(`/get-vessel-survey-data/${id}`);
}
export function updateVesselSurvey(payload) {
  return api.put('/update-vessel-survey-data', payload);
}
export function deleteVesselSurvey(id) {
  return api.delete(`/delete-2-8-data/${id}`);
}

// ---- K-2.9 Maritime Training Institutes Performance ----
// MTI Master
export function submitMtiMaster(payload) {
  return api.post('/submit-mti-master-data', payload);
}
export function fetchMtiMasterList(params = {}) {
  return api.get('/get-mti-master-data', { params });
}
export function fetchMtiMasterById(mtiId) {
  return api.get(`/get-mti-master-data-by-id/${mtiId}`);
}
export function updateMtiMaster(payload) {
  return api.put('/update-mti-master-data', payload);
}
// Course Master
export function submitCourseMaster(payload) {
  return api.post('/submit-course-master-data', payload);
}
export function fetchCourseMasterList(params = {}) {
  return api.get('/get-course-master-data', { params });
}
export function fetchCourseMasterById(id) {
  return api.get(`/get-course-master-data-by-id/${id}`);
}
export function updateCourseMaster(payload) {
  return api.put('/update-course-master-data', payload);
}
export function fetchCourseType(mtiId, courseId) {
  return api.get(`/get-course-type/${mtiId}/${courseId}`);
}

// =====================================================================
// Reports — one call per K-2.x leaf page in screenshots 3-4.
// =====================================================================

// K-2.1.x Flagging of Vessels
// K-2.1.1 and K-2.1.2 are MMD-wise reports with grouped (Prev FY / Current FY) column
// headers and come from dedicated endpoints that aggregate `tbl_kpi_dgs_2_1`.
export const fetchReportKpi2_1_1 = () => api.get('/kpi-dgs-flagging-addition-report');
export const fetchReportKpi2_1_2 = () => api.get('/kpi-dgs-flagging-deletion-report');
export const fetchReportKpi2_1_3 = () => api.get('/kpi-dgs-2-3-report');
export const fetchReportKpi2_1_4 = () => api.get('/kpi-dgs-2-4-report');
export const fetchReportKpi2_1_5 = () => api.get('/kpi-dgs-2-5-report');

// K-2.2.x SBFAP
export const fetchReportKpi2_2_0 = () => api.get('/kpi-dgs-2-0-report');
export const fetchReportKpi2_2_1 = () => api.get('/kpi-dgs-2-1-report');
export const fetchReportKpi2_2_2 = () => api.get('/kpi-dgs-2-2-report');
export const fetchReportKpi2_2_3 = () => api.get('/kpi-dgs-2-3-report');
export const fetchReportKpi2_2_4 = () => api.get('/kpi-dgs-2-4-report');
export const fetchReportKpi2_2_5 = () => api.get('/kpi-dgs-2-5-report');
export const fetchReportKpi2_2_6 = () => api.get('/kpi-dgs-2-6-report');

// K-2.3.x Exam Overall Performance
export const fetchReportKpi2_3_1 = () => api.get('/kpi-dgs-2-3-1-report');
export const fetchReportKpi2_3_2 = () => api.get('/kpi-dgs-2-3-2-report');
export const fetchReportKpi2_3_3 = () => api.get('/kpi-dgs-2-3-3-report');

// K-2.4.x Entry and Exit
// K-2.4.1 abstract for one month ({ year, month }; none = the latest month with entries)
export const fetchReportKpi2_4_1 = (params = {}) => api.get('/get-abstract-entry-exit-report', { params });
// K-2.4.2 month by month for one financial year ({ fy: start year }; none = the latest one)
export const fetchReportKpi2_4_2 = (params = {}) => api.get('/get-monthly-entry-exit-report', { params });
// K-2.4.3 year by year
export const fetchReportKpi2_4_3 = () => api.get('/get-yearly-entry-exit-report');

// K-2.5.x Marine Casualty (currently sharing legacy endpoints; replace when distinct)
export const fetchReportKpi2_5_1 = () => api.get('/kpi-dgs-1-4-report');
export const fetchReportKpi2_5_2 = () => api.get('/kpi-dgs-1-5-report');
export const fetchReportKpi2_5_3 = () => api.get('/kpi-dgs-1-4-report');
export const fetchReportKpi2_5_4 = () => api.get('/kpi-dgs-1-5-report');

// K-2.6.x Flag State Inspection
export const fetchReportKpi2_6_1 = () => api.get('/kpi-dgs-2-6-1-report');
export const fetchReportKpi2_6_2 = () => api.get('/kpi-dgs-2-6-2-report');
export const fetchReportKpi2_6_3 = () => api.get('/kpi-dgs-2-6-3-report');
export const fetchReportKpi2_6_4 = () => api.get('/kpi-dgs-2-6-4-report');
export const fetchReportKpi2_6_5 = () => api.get('/kpi-dgs-2-6-5-report');
export const fetchReportKpi2_6_6 = () => api.get('/kpi-dgs-2-6-6-report');
export const fetchReportKpi2_6_7 = () => api.get('/kpi-dgs-2-6-7-report');
export const fetchReportKpi2_6_8 = () => api.get('/kpi-dgs-2-6-8-report');

// K-2.7.x Port State Control
export const fetchReportKpi2_7_1 = () => api.get('/kpi-dgs-2-7-1-report');
export const fetchReportKpi2_7_2 = () => api.get('/kpi-dgs-2-7-2-report');
export const fetchReportKpi2_7_3 = () => api.get('/kpi-dgs-2-7-3-report');
export const fetchReportKpi2_7_4 = () => api.get('/kpi-dgs-2-7-4-report');
export const fetchReportKpi2_7_5 = () => api.get('/kpi-dgs-2-7-5-report');
export const fetchReportKpi2_7_6 = () => api.get('/kpi-dgs-2-7-6-report');
export const fetchReportKpi2_7_7 = () => api.get('/kpi-dgs-2-7-7-report');

// K-2.8.x Vessel and Port Survey/Audits by MMDs
// (Reports use the underlying list endpoint; shape may be adapted per leaf.)
export const fetchReportKpi2_8_1 = () => api.get('/get-vessel-survey-data');
export const fetchReportKpi2_8_2 = () => api.get('/get-vessel-survey-data');
export const fetchReportKpi2_8_3 = () => api.get('/get-vessel-survey-data');

// K-2.9.x MTI Performance
export const fetchReportKpi2_9_1 = () => api.get('/get-mti-master-data');
export const fetchReportKpi2_9_2 = () => api.get('/get-mti-master-data');
export const fetchReportKpi2_9_3 = () => api.get('/get-mti-master-data');
export const fetchReportKpi2_9_4_1 = () => api.get('/get-mti-master-data');
export const fetchReportKpi2_9_4_2 = () => api.get('/get-mti-master-data');

export default api;
