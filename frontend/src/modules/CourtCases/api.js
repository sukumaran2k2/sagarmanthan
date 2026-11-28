import { createApiClient } from '../../api';

const api = createApiClient({ timeout: 30000 });

export function fetchDomains() {
  return api.get('/mmt-dropdown/mmt_domain');
}

export function fetchSubDomains() {
  return api.get('/mmt-dropdown/mmt_sub_domain');
}

export function fetchDepartments() {
  return api.get('/mmt-dropdown/tbl_court_case_departments');
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

export function fetchCourtCases(roleID, organisationID) {
  return api.get(`/court-case/${roleID}/${organisationID}`);
}

export function fetchCourtCaseById(caseType, caseID) {
  return api.get(`/get-court-case-data-by-id/${caseType}/${caseID}`);
}

//********************Arbitration*****************************//

export function addArbitrationClaimantAndRespondent(payload) {
  return api.post('/add-arbitration-claimant-and-respondent', payload);
}
export function addPrevConnCases(payload) {
  return api.post('/add-prev-conn-court-case', payload);
}
export function addDetailsOfCounsel(payload) {
  return api.post('/add-counsel-details', payload);
}
export function addHearingCases(payload) {
  return api.post('/add-hearing-court-case', payload);
}
export function addInterimOrder(payload) {
  return api.post('/add-interim-order-court-case', payload);
}
export function updateArbitCaseStatus(payload) {
  return api.put('/update-arbitration-court-case-status', payload);
}
export function fetchOrganisationName(organisationID) {
  return api.get(`/get-organisation-name/${organisationID}`);
}

export function fetchSubTableData(typeName, caseID) {
  return api.get(`/get-sub-table-court-case-data/${typeName}/${caseID}`);
}

export function createArbitrationCase(payload) {
  return api.post('/create-arbitration-court-case', payload);
}

// ****************** Litigation **************************//

export function fetchStates(mmt_state) {
  return api.get(`/mmt-dropdown/${encodeURIComponent(mmt_state)}`);
}
export function fetchDistricts(mmt_district) {
  return api.get(`/mmt-dropdown/${encodeURIComponent(mmt_district)}`);
}

export function getDropDownData(table) {
  return api.get(`/mmt-dropdown/${encodeURIComponent(table)}`);
}

export function fetchCaseTypes(mmt_court_case_type) {
  return api.get(`/mmt-dropdown/${encodeURIComponent(mmt_court_case_type)}`);
}

export function addLitigationParties(payload) {
  return api.post('/add-litigation-petitioner-and-respondent', payload);
}

export function addMinistryCounsel(payload) {
  return api.post('/add-ministry-counsel-details', payload);
}

export function createLitigationCase(payload) {
  return api.post('/create-litigation-court-case', payload);
}

export function createMinistryIntervention(payload) {
  return api.post('/add-ministry-intervention', payload);
}


export function submitCaseStatus(payload) {
  return api.post('/create-case-status', payload);
}
 

export function fetchLitigationSubTableData(typeName, caseID) {
  return api.get(`/get-litigation-sub-table-court-cases-data/${typeName}/${caseID}`);
}

export function fetchHighCourtBenches() {
  return api.get('/mmt-dropdown/mmt_bench_seat');
}

export function fetchCourtTypes() {
  return api.get('/mmt-dropdown/mmt_court_type');
}

export function fetchConsumerForums(subCourtTypeID) {
  return api.get(`/court-case-consumer-typeID/${subCourtTypeID}`);   
}

//**(******************* Conciliation **************************//)
export function addConciliationFirstPartyAndSecondParty(payload) {
  return api.post('/add-conciliation-first-party-and-second-party', payload);
}
export function createConciliationCase(payload) {
  return api.post('/create-conciliation-court-case', payload);
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

export function addConciliators(payload) {
  return api.post('/add-conciliators-data', payload);
}
export function addConciliationFirstParty(payload) {
  return api.post('/add-first-party-data', payload);
}
export function addConciliationSecondParties(payload) {
  return api.post('/add-second-party-data', payload);
}
export function addConciliationPrevConnCases(payload) {
  return api.post('/add-conciliation-prev-conn-cases', payload);
}
export function addConciliatorsHearingData(payload) {
  return api.post('/add-conciliators-hearing-data', payload);
}
export function createConciliationStatus(payload) {
  return api.post('/create-conciliation-status', payload);
}
export function fetchConciliationSubTableData(typeName, caseID) {
  return api.get(`/get-conciliation-sub-tables-court-cases-data/${typeName}/${caseID}`);
}

export function getConciliationFirstPartyAndSecondParty(caseID) {
  return api.get(`/get-conciliation-first-party-and-second-party/${caseID}`);
}

//*************************************************************** */

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

export function deleteCourtCase(caseID, userID) {
  return api.delete(`/delete-court-case/${caseID}/${userID}`);
}

export function fetchLitigationDomainReport(userID) {
  return api.get(`/litigation-domain-report/${userID}`);
}

export function fetchLitigationSubDomainReport(userID) {
  return api.get(`/litigation-subdomain-report/${userID}`);
}

export function fetchLitigationPortwisePendencyReport(userID) {
  return api.get(`/litigation-portwise-pendency-report/${userID}`);
}

export function fetchLitigationDomainwisePendencyReport(userID) {
  return api.get(`/litigation-domainwise-pendency-report/${userID}`);
}

// Domain & Sub-Domain report
export function fetchLitigationDomainSubDomainReport(userID) {
  return api.get(`/litigation-domain-subdomain-report/${userID}`);                 
}
export function fetchLitigationDomainSubDomainOtherOrgReport(userID) {
  return api.get(`/litigation-domain-subdomain-report-by-other-org/${userID}`);        
}

// Pendency reports for other organisations
export function fetchLitigationPortwisePendencyOtherOrgReport(userID) {
  return api.get(`/litigation-other-org-portwise-pendency-report/${userID}`);       
}
export function fetchLitigationDomainwisePendencyOtherOrgReport(userID) {
  return api.get(`/litigation-other-org-domainwise-pendency-report/${userID}`);     
}

export function addCourtCaseOMDetails(payload) {
  return api.post('/add-court-case-OM-details', payload);
}

export function checkCaseNumberExists(organisationID,caseNumber) {
  return api.get(`/check-case-number-exists/${organisationID}/${encodeURIComponent(caseNumber)}`);
}
export default api;