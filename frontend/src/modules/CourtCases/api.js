import { createApiClient } from '../../api';

const api = createApiClient({ timeout: 30000 });

export function fetchCourtCases(roleID, organisationID) {
  return api.get(`/court-case/${roleID}/${organisationID}`);
}

export function fetchCourtCaseById(caseType, caseID) {
  return api.get(`/get-court-case-data-by-id/${caseType}/${caseID}`);
}

export function fetchCourtCaseReport(userID) {
  return api.get(`/all-court-case-report/${userID}`);
}

export function fetchArbitrationDetailReport(organisationID, stageID) {
  return api.get(`/get-detailed-case-report/${organisationID}/${stageID}`);
}

export function fetchConciliationDetailReport(organisationID, stageID) {
  return api.get(`/get-conciliation-detailed-case-report/${organisationID}/${stageID}`);
}

export function fetchLitigationDetailReport(organisationID, stageID) {
  return api.get(`/get-litigation-detailed-case-report/${organisationID}/${stageID}`);
}

export function fetchAllLitigationData(userID) {
  return api.get(`/get-all-litigation-case-data/${userID}`);
}

export function fetchCourtCaseDashboardStatus() {
  return api.get('/get-court-cases-dashboard-status');
}

export function fetchSubTableData(typeName, caseID) {
  return api.get(`/get-sub-table-court-case-data/${typeName}/${caseID}`);
}

export function fetchLitigationSubTableData(typeName, caseID) {
  return api.get(`/get-litigation-sub-table-court-cases-data/${typeName}/${caseID}`);
}

export function fetchConciliationSubTableData(typeName, caseID) {
  return api.get(`/get-conciliation-sub-tables-court-cases-data/${typeName}/${caseID}`);
}

export function createArbitrationCase(payload) {
  return api.post('/create-arbitration-court-case', payload);
}

export function createLitigationCase(payload) {
  return api.post('/create-litigation-court-case', payload);
}

export function createConciliationCase(payload) {
  return api.post('/create-conciliation-court-case', payload);
}

export function deleteCourtCase(caseID, userID) {
  return api.delete(`/delete-court-case/${caseID}/${userID}`);
}

export function fetchLastArbitrationCaseNo(organisationID) {
  return api.get(`/get-last-case-no/${organisationID}`);
}

export function fetchLastLitigationCaseNo(organisationID) {
  return api.get(`/get-last-Litigation-case-no/${organisationID}`);
}

export function fetchLastConciliationCaseNo(organisationID) {
  return api.get(`/get-last-conciliation-number-no/${organisationID}`);
}

export function fetchActsDropdown() {
  return api.get('/court-case-get-acts/');
}

export function fetchRulesDropdown(actID) {
  return api.get(`/court-case-get-rules/${actID}`);
}

export function fetchSubCourtTypes(courtTypeID) {
  return api.get(`/court-case-sub-court-type/${courtTypeID}`);
}

export function fetchLitigationDomainReport() {
  return api.get('/litigation-domain-report');
}

export function fetchLitigationSubDomainReport() {
  return api.get('/litigation-subdomain-report');
}

export function fetchLitigationPortwisePendencyReport() {
  return api.get('/litigation-portwise-pendency-report');
}

export function fetchLitigationDomainwisePendencyReport() {
  return api.get('/litigation-domainwise-pendency-report');
}

export default api;
