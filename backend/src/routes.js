import express from "express";

import auth from "./authenticate.js";
import mikrAuth from "./mikrAuthenticate.js";


import logInTab from "./controllers/login.js";

import masterTable from "./controllers/MasterManagement/masterManagement.js";
import userTable from "./controllers/UserManagement/createUser.js";
import orgModulePermission from "./controllers/RBAC/orgModulePermission.js";
import userModuleCrud from "./controllers/RBAC/userModuleCrud.js";
import { getOrgModulePermissionLog, getUserModuleCrudLog } from "./controllers/RBAC/rbacAudit.js";


import terminalImageUploaderTab from "./controllers/MasterManagement/terminalImageUploader.js";

//Dashboard Data Entry Status
import dashboardController from "./controllers/Dashboard/dashboard.js";
// Governance
import attendanceTab from "./controllers/Governance/attendance.js";
import excelDataTab from "./controllers/Governance/excelDataTab.js";
import empAttendanceTab from "./controllers/Governance/empAttendance.js";
//check
import cpgramsTab from "./controllers/Governance/cpgrams.js";
import cpgramsDataTab from "./controllers/Governance/cpgramsdata.js";
import disposalTab from "./controllers/Governance/fileDisposal.js";
import fileDataTab from "./controllers/Governance/fileData.js";
import pendencyTab from "./controllers/Governance/pendency.js";
import pendencyDataTab from "./controllers/Governance/pendencyData.js";
import vipReferenceTab from "./controllers/Governance/vipReference.js";
import cabinetMopswTab from "./controllers/Governance/mopswCabinetNotes.js";
import mopswDocumentTab from "./controllers/Governance/mopswDocumentUploader.js";
import cabinetBillTab from "./controllers/Governance/ministryCabinetNotes.js";
import parliamentaryIssueTab from "./controllers/Governance/parliamentaryIssue.js";
import gemProcurementTab from "./controllers/Governance/gemProcurement.js";
import socialmediaTab from "./controllers/Governance/SocialMedia.js";
import auditParaTab from "./controllers/Governance/auditPara.js";
import decisionController from "./controllers/Governance/decisionImplement.js";
import interStateController from "./controllers/Governance/interState.js";
import interMinisterialController from "./controllers/Governance/interMinisterial.js";
import eOfficeTab from "./controllers/Governance/eOffice.js";
import EofficeFilePendancyTab from "./controllers/Governance/eOfficeFilePendancy.js";
import EofficeReceiptPendancyTab from "./controllers/Governance/eOfficeReceiptPendancy.js";
import EofficeFileDisposalTab from "./controllers/Governance/eOfficeFileDisposal.js";
import cpgramController from "./controllers/Governance/cpgramNew.js";
import cpgramInputController from "./controllers/Governance/cpgramInput.js";
import cpgramProgressController from "./controllers/Governance/cpgramProgress.js";
import cpgramPH3Controller from "./controllers/Governance/cpgramPH3.js";
import cpgramAgeController from "./controllers/Governance/cpgramAge.js";
import officialForeignVisitTab from "./controllers/Governance/officialForeignVisit.js";
import flaggedShipTab from "./controllers/Governance/flaggedShip.js";
import cruisePortsTab from "./controllers/Governance/cruisePorts.js";
import reviewItemsTab from "./controllers/Governance/reviewItems.js"

//HR
import youngProfessionalsTab from "./controllers/HR/youngProfessionals.js";
import candidateDocumentTab from "./controllers/HR/appointmentOrderUploader.js";
import consultantAppointmentTab from "./controllers/HR/consultantAppointment.js";
import candidateCaDocumentTab from "./controllers/HR/caAppointmentOrderUploader.js";
import hrDepartmentTab from "./controllers/HR/hrDepartment.js";
import hrPostTab from "./controllers/HR/hrPost.js";
import hrManagementTab from "./controllers/HR/hrManagement.js";
import hrEmployeeTab from "./controllers/HR/hrEmployee.js";
import hrTrainingTab from "./controllers/HR/hrTraining.js";
import vacancyStatusTab from "./controllers/HR/vacancyStatus.js";
import revisedHrPost from "./controllers/HR/revisedHrPost.js";
import revisedHrDepartment from "./controllers/HR/revisedHrDepartment.js";
import hrHelperTab from "./controllers/HR/hrHelperFunctions.js";
import hrReportInputTab from "./controllers/HR/hrReportInput.js";
import otherOrgVacancyDetailsTab from "./controllers/HR/otherOrgVacancyDetails.js";

import postRequestTab from "./controllers/HR/postRequest.js";

// Legal
import billTab from "./controllers/Legal/bills.js";
import arbitCourtCaseTab from "./controllers/Legal/arbitrationCourtCase.js";
import litigationCourtCaseTab from "./controllers/Legal/litigationCourtCase.js";

// Proposal
// import proposalDocumentTab from "./controllers/ProjectManagement/proposalDocument.js";
import projectListTab from "./controllers/ProjectManagement/projectList.js";
// import viewProjectDataTab from "./controllers/ProjectManagement/viewProjectDetail.js";

import dropRequestTab from "./controllers/ProjectManagement/dropRequest.js";

import addNewProjectTab from "./controllers/ProjectManagement/addNewProject.js";
import capexController from "./controllers/ProjectManagement/capex.js";
import expenditureController from "./controllers/ProjectManagement/expenditureOutlay.js";
import projectDashboardTab from "./controllers/ProjectManagement/projectDashboard.js";

// LumpSum
import addNewLumpSumTab from "./controllers/ProjectManagement/addLumpSum.js";

// CSR Projects
import csrProjectTab from "./controllers/ProjectManagement/csrprojects.js"; 
// import csrFundTab from "./controllers/ProjectManagement/csrFundDetails.js"; 

// Edit Project
import editProjectTab from "./controllers/ProjectManagement/editProject.js";
// import documentUploaderTab from "./controllers/ProjectManagement/document.js"
import clearanceTab from "./controllers/ProjectManagement/clearanceDetailsAction.js";
import revisionDateTab from "./controllers/ProjectManagement/projectRevisionDates.js";
import planningSanctioningTab from "./controllers/ProjectManagement/planningSanctioning.js";
import underTenderingTab from "./controllers/ProjectManagement/utProjectDatesAction.js";
// import awardOfContractTab from "./controllers/ProjectManagement/awardofContractDatesAction.js";
import activityTab from "./controllers/ProjectManagement/projectActivitiesAction.js";
import expenditureTab from "./controllers/ProjectManagement/projectExpenditureAction.js";
import completionTab from "./controllers/ProjectManagement/addCompletionDateAction.js";
import clearanceDocumentUploaderTab from "./controllers/ProjectManagement/editProjectDocumentUploder.js";
// import updateProjectStageTab from "./controllers/ProjectManagement/updateProjectStage.js";

// REPORTS
import parlimentaryReportTab from "./controllers/Reports/parliamentaryReports.js";
import billReportTab from "./controllers/Reports/billPreConstitutionReports.js";
import attendanceReportTab from "./controllers/Reports/attendanceReports.js";
import empAttendanceReportTab from "./controllers/Reports/empAttendanceReports.js";
import ypReportTab from "./controllers/Reports/youngProfessionalReports.js";
import cabinetMopswReportTab from "./controllers/Reports/cabinetMopswReports.js";
import cabinetMinistryReportTab from "./controllers/Reports/cabinetMinistryReports.js";
import consultAppReportTab from "./controllers/Reports/consulAppointmentReports.js";
import aditParaReportTab from "./controllers/Reports/auditParaReports.js";
import vipReportTab from "./controllers/Reports/vipReferenceReport.js";
import gemReportTab from "./controllers/Reports/gemReport.js";
import mivReportTab from "./controllers/Reports/mivReport.js";
import hrReportTab from "./controllers/Reports/hrReports.js";
import hrDrilledReportTab from "./controllers/Reports/hrDrilledReport.js";
import proposalHistoryReportTab from "./controllers/Reports/projectReport1_0A.js";
import proposalReportTab from "./controllers/Reports/projectReport1_1A.js";
import underTenderingReportTab from "./controllers/Reports/projectReport1_2A.js";
import underImplementationReportTab from "./controllers/Reports/projectReport1_3A.js";
import financialProgressReportTab from "./controllers/Reports/projectReport1_4A.js";
import projectReport from "./controllers/Reports/projectReport.js";

import lumpsumReportTab from "./controllers/Reports/lumpsumReport.js";
import capexReportTab from "./controllers/Reports/capexReport.js";
import kpiDgs1_0Tab from "./controllers/Reports/kpiDgs1_0.js";
import kpiDgs2_0Tab from "./controllers/Reports/kpiDgs2_0.js";
import kpiDgs3_0Tab from "./controllers/Reports/kpiDgs2_3.js";
import TrafficVesselReportTab from "./controllers/Reports/trafficVesselReports.js";
import TrafficVesselDrilldownReportTab from "./controllers/Reports/trafficVesselDrilldownReports.js";
import TrafficRoRoReportTab from "./controllers/Reports/trafficRoRoReports.js";
import TrafficRoRoDrilldownReportTab from "./controllers/Reports/trafficRoRoDrilldownReports.js";
import financialReportTab from "./controllers/Reports/financialReport.js";
import kpiDgsPortPerformanceTab from "./controllers/Reports/portPerformanceReport.js";


import TrafficRoPaxReportTab from "./controllers/Reports/trafficRoPaxReports.js";
import TrafficReportTab from "./controllers/Reports/trafficReports.js";
import PortPerformanceTrtReportTab from "./controllers/Reports/portPerformanceTrtReports.js";
import PortPerformancePbdReportTab from "./controllers/Reports/portPerformancePbdReports.js";
import PortPerformanceMedianTrtReportTab from "./controllers/Reports/portPerformanceMedianTrtReports.js";
import PortPerformanceContainerTrtReportTab from "./controllers/Reports/portPerformanceContainerTrtReports.js";

import kpiDgs7_0Tab from "./controllers/Reports/kpiDgs2_7.js";
import kpiDgs6_0Tab from "./controllers/Reports/kpiDgs2_6.js";
import KpiDGS_2_8_Tab from "./controllers/Reports/kpiDgs2_8.js";
import KpiDGS_2_9_Tab from "./controllers/Reports/kpiDgs2_9.js";

//KPI
import dgsTab from "./controllers/KPI/Dgs2_6and2_7.js";
import dgsTabList from "./controllers/KPI/dgsList.js";
import dgllTab from "./controllers/KPI/dgll.js";
import dgllReportTab from "./controllers/Reports/dgllReport.js";
import cslTab from "./controllers/KPI/csl.js";
import CslreportTab from "./controllers/Reports/cslReports.js";
import sciTabList from "./controllers/KPI/sci.js";
import sciReportTab from "./controllers/Reports/sciReports.js";
import imuTab from "./controllers/KPI/imuDetails.js";
import imuReportTab from "./controllers/Reports/imuReports.js";

import passengerTab from "./controllers/KPI/passenger.js";
import financialParameterTab from "./controllers/KPI/financialParameter.js";
import cruiseTab from "./controllers/KPI/cruiseController.js";
import cargoOperationController from "./controllers/KPI/cargoOperation.js";
import cargoHandledController from "./controllers/KPI/cargoHandle.js";
import digitalPortalTab from "./controllers/KPI/digitalPortals.js";
import DredgersTab from "./controllers/KPI/DredgersController.js";
import iwaiVesselMovementController from "./controllers/KPI/iwaiVessel.js";
import JettiesVesselsController from "./controllers/KPI/JettiesVessels.js";
import PassengerMovementController from "./controllers/KPI/passengerMove.js";
import iwaiPassengerController from "./controllers/KPI/iwaiPassenger.js";
import SurveyVesselController from "./controllers/KPI/survey.js";
import MajorPorts from "./controllers/KPI/majorPorts.js";
import RoroTab from "./controllers/KPI/roro.js";
import RoPaxTab from "./controllers/KPI/ropax.js";
import SurveyVesselTab from "./controllers/KPI/surveyVessel.js";
import CargoVesselTab from "./controllers/KPI/cargoVessel.js";
import TrafficTab from "./controllers/KPI/traffic.js";
import TrafficVesselTab from "./controllers/KPI/trafficVessel.js";
import vesselMovementTab from "./controllers/KPI/vesselTerminal.js";
import PassengerTerminalController from "./controllers/KPI/PassengerTerminal.js";
import cargoTerminalController from "./controllers/KPI/cargoTerminal.js";
import KpiTimePerformanceTab from "./controllers/KPI/kpiTimePerformance.js";
import KpiRenewableEnergyTab from "./controllers/KPI/kpiRenewableEnergy.js";
import MMDTab from "./controllers/KPI/mmdMaster.js";
import VesselSurveyTab from "./controllers/KPI/k_2_8.js";
import MTIMasterTab from "./controllers/KPI/mtiMaster.js";
import CourseMasterTab from "./controllers/KPI/courseMaster.js";
import KpiDGS_2_2_Tab from "./controllers/KPI/DGS_2_2.js";
// import KpiDGS_2_9_Tab from "./controllers/KPI/DGS_2_9.js";
import KpiDGS_2_3_Tab from "./controllers/KPI/DGS_2_3.js";
import CMECTabList from "./controllers/KPI/cmec.js";

import mopswTracker from "./controllers/MopswTracker/mopsw_tracker.js";

//Long Term Strategies
import MIVTab from "./controllers/LongTermStrategies/miv.js";
import AKVTab from "./controllers/LongTermStrategies/amritKaal.js";
import gmisMouTab from "./controllers/LongTermStrategies/gmisMou.js";

//User manuals
import userManualMenu from "./controllers/UserManuals/userManual.js";

//Knowledge Repository
import KRTab from "./controllers/KnowledgeRepository/knowledgeRep.js";

//One vision one document
import OVDTab from "./controllers/LongTermStrategies/oneVision.js";
import OVDDataTab from "./controllers/LongTermStrategies/ovodGet.js";

//Form Builder tab
// import formBuilderTab from "./controllers/formBuilder/formBuilderV1.js";
// import formBuilderInputTab from "./controllers/formBuilder/formBuilderInput.js";
// import formBuilderReportTab from "./controllers/formBuilder/formBuilderOutput.js";

import marineTab from "./controllers/KPI/marineCasualty.js";
import momOfPswMeetingsTab from "./controllers/Governance/addminutesofmeeting.js";

import entryExitTab from "./controllers/KPI/entryExitPerformance.js"
import conciliationCourtCaseTab from "./controllers/Legal/conciliationCourtCase.js"

//Module Management
import ModuleControllerTab from "./controllers/UserManagement/moduleManagement.js";
// old module controller (prefer /rbac/*)

//API - MIKR
import { getAuthCode, getToken } from "./controllers/mikr-authcode-token-generation.js";
import { getVerifyToken } from "./controllers/verify-api-token.js";
import { getRefreshToken } from "./controllers/refresh-token.js";
import { getKrDocumentData } from "./controllers/fetch-kr-document-data.js";
import { getUpdateDocStatus } from "./controllers/update-document-status.js";
import { getDownloadDocument } from "./controllers/download-document.js";
import { mikrLogout } from "./controllers/mikr-logout.js";

import { getProjectProposal } from "./controllers/project-proposal.js";
import { getProjectClearance } from "./controllers/project-clearance.js";
import { getKpiTrafficTarget } from "./controllers/traffic-kpi-targets.js";
import { getKpiCruiseAndPassengerActuals } from "./controllers/cruise-and-passenger-traffic-actual.js";
import { getKpiCruiseAndPassengerTarget } from "./controllers/cruise-and-passenger-traffic-target.js";
import { getKpiTrafficActual } from "./controllers/traffic-kpi-actual.js";
import { getKpiPortPerformanceActual } from "./controllers/kpi-port-performance-actual.js";

import { getLiquidBulkSingleLeg } from "./controllers/traffic-liquid-bulk-single-leg.js";
import { getLiquidBulkTwoLeg } from "./controllers/traffic-liquid-bulk-two-leg.js";
import { getDryBulkSingleLeg } from "./controllers/traffic-dry-bulk-single-leg.js";
import { getDryBulkTwoLeg } from "./controllers/traffic-dry-bulk-two-leg.js";
import { getBreakBulkSingleLeg } from "./controllers/traffic-break-bulk-single-leg.js";
import { getBreakBulkTwoLeg } from "./controllers/traffic-break-bulk-two-leg.js";
import { getContainerSingleLeg } from "./controllers/traffic-container-single-leg.js";
import { getContainerTwoLeg } from "./controllers/traffic-container-two-leg.js";


//Form Builder tab
import formBuilderTab from "./controllers/formBuilder/formBuilderV1.js";
import formBuilderInputTab from "./controllers/formBuilder/formBuilderInput.js";

const router = express.Router();

// login
router.post("/login-validation", logInTab.validation);
router.post("/password-reset-validation", logInTab.resetpassword);
// API - MIKR
router.get('/authorize', auth, getAuthCode);
router.get('/token', getToken);
router.get("/verify-api-token", mikrAuth, getVerifyToken);
router.get("/refresh-token", getRefreshToken);
router.get("/fetch-kr-document-data", mikrAuth, getKrDocumentData);
router.put("/update-document-status", mikrAuth, getUpdateDocStatus);
router.get("/download-document", mikrAuth, getDownloadDocument);
router.post("/mikr-logout", auth, mikrLogout);

// router.use(auth);

// MMT
router.get("/mmt/:tid", masterTable.getMmt);
router.get("/mmt-dropdown/:tid", masterTable.getDropDownData);
router.get("/mmt-dependecy-dropdown/:tid", masterTable.getFilterDependecyDropDown);

router.post("/mmt", masterTable.createMmt);
router.put("/mmt", masterTable.updateMmt);
router.put("/mmt-status", masterTable.toggleStatusMmt);
// router.delete("/mmt", masterTable.deleteMmt);

router.get("/allvalue-dropdown/:tid", masterTable.getDropDownAllValues);

//Terminal/Jetty image uploader
router.post("/terminal-image-uploader", terminalImageUploaderTab.upload.single('imageFile'), terminalImageUploaderTab.terminalImageUploader);

router.post("/createuser", userTable.createuser);
router.post("/createnodaluser", userTable.createNodalUser);
router.get("/userlist", userTable.getUserData);
router.get("/org-userlist/:organisation", userTable.getOrgUserData);
router.put("/edituser", userTable.updateUser);
router.put("/editnodaluser", userTable.updateNodalUser);
router.put("/edit-user-profile", userTable.editUserProfileData);
router.put("/user-status", userTable.toggleUserStatusData);
router.post("/changepassword", userTable.changePasswordAction);
router.put("/edit-password", userTable.updatePassword);
// router.get("/user/:userId", userTable.getUpdateUser);
router.get("/get-user-permission-modules/:userId/:organisationId", userTable.getPermissionModulesData);
router.put("/update-user-permission", userTable.updatePermissions);
router.get("/get-user-data/:userId", userTable.getUserDetails);

//Dashboard Data Entry Status
router.get("/dashboard-data-entry-status", dashboardController.getDashboardDataEntryStatus);

//DashboardCourtCases 
router.get("/get-court-cases-dashboard-status", dashboardController.getDashboardCourtCaseStatus);

//Capex
router.post('/capex', capexController.addCapex);
router.get('/capex/:userID', capexController.getCapexData);
router.get('/data-entry-capex', capexController.getCapexDataEntry);
router.get('/capex-monthly-data/:capexID', capexController.getCapexMonthlyData);
router.get('/get-capex/:capexID', capexController.getCapexExpediture);
router.post('/capex-edit', capexController.editCapexExpediture);
router.post('/capex-monthly-data', capexController.addCapexMonthlyData);
// router.get('/capex-fin-chart/:finYear', capexController.getCapexDashboardData);
// router.get('/capex-port-chart/:orgId', capexController.getCapexPortDashboardData);
router.get("/get-capex-dashboard/:clusterID/:financialYear", capexController.getCapexDashboard);
router.get("/get-capex-dashboard-bar-graph/:clusterID/:financialYear", capexController.getCapexDashboardBarGraph);
router.get("/get-capex-dashboard-org/:financialYear/:organisationID", capexController.getCapexDashboardorg);
router.get("/get-capex-org-wise-table/:organisationID/:financialYear", capexController.getfinancialYearDataOrgwise);
router.get("/get-capex-dashboard-bar-graph-org/:organisationID", capexController.getCapexDashboardBarGraphorg);

// ExpenditureOutlay
router.get('/get-main-scheme-dropdown', expenditureController.getMainSchemeDropdown);
router.get('/get-sub-scheme-dropdown', expenditureController.getSubSchemeDropdown);
router.get('/get-financial-year-dropdown', expenditureController.getFinancialYearDropdown);
router.get("/get-scheme-data/:financialYearValue/:subSchemeValue", expenditureController.getSchemeData);
router.post('/submit-expenditure-data', expenditureController.submitExpenditureData);
router.post('/add-main-scheme', expenditureController.addMainScheme);
router.post('/add-sub-scheme', expenditureController.addSubScheme);
router.post('/add-exp-financial-year', expenditureController.addExpFinancialYear);

router.get('/get-main-schemes', expenditureController.getMainSchemes);
router.get('/get-sub-schemes/:mainSchemeId', expenditureController.getSubSchemes);
router.get('/get-scheme-year-data/:schemeId/:financialYearId', expenditureController.getSchemeYearData);
router.get('/get-scheme-year-last-week-data/:schemeId/:financialYearId', expenditureController.getSchemeYearLastWeekData);
router.delete('/delete-row/:dataId/:rowId', expenditureController.deleteRowdata);
router.get('/get-last-date-exp-up-date', expenditureController.getLastExpUpdate);


//projectDashboardTab
// router.get("/get-project-dashboard/:clusterID/:organisationID/:fromFoundationTentativeDate/:toFoundationTentativeDate/:fromTentativeInaugurationDate/:toTentativeInaugurationDate", 
//             projectDashboardTab.getProjectDashboard);

router.post("/get-project-dashboard", projectDashboardTab.getProjectDashboard);
// router.get("/detailed-stage-wise-data/:clusterID/:organisationID/:stage", projectDashboardTab.detailedStageWiseProjectData);
router.post("/detailed-stage-wise-data", projectDashboardTab.detailedStageWiseProjectData);

router.post("/get-projec-org-wise-bar-graph", projectDashboardTab.getProjectOrgWiseBarGraph);
router.post("/get-pysical-progress-org-wise", projectDashboardTab.getPysicalProgressOrgWise);

router.get("/get-project-details-by-project/:projectID", projectDashboardTab.getProjectDetailsByProject);
router.post("/detailed-pysical-progress-org-wise", projectDashboardTab.detailedPysicalProgressOrgWise);

router.post("/get-project-delaystatus-wise", projectDashboardTab.getDelayedStatusPieChart);

router.post("/get-detail-project-delaystatus-wise", projectDashboardTab.detailedDelayedStatusProjectData);
// Project Dashboard Cost card
// router.get("/get-project-dashboard-cost/:clusterID/:organisationID", projectDashboardTab.getProjectCostWise);
router.post("/get-org-wise-data/", projectDashboardTab.detailedOrgWiseProjectData);


// Project Dashboar -Ongoing Projects

router.get("/get-ongoing-project-dashboard", projectDashboardTab.getOngingProjectDashboard);
router.get("/detail-ongoing-project-dashboard", projectDashboardTab.detailedOngoingProDashboard);

router.get("/get-broadcategory-project-dashboard", projectDashboardTab.getBroadCategoryListDashboard);
router.get("/detail-broadcategory-project-dashboard/:moi/:broadId", projectDashboardTab.detailedBroadCategoryDashboard);




// GOVERNANCE MENU

//attendance
//check
router.get("/employee-attendance-file", empAttendanceTab.getEmployeeAttendance);
router.get("/employee-attendance-sample", empAttendanceTab.agSample);

router.get("/employee-attendance-view", empAttendanceTab.getEmpAttendance);
router.post("/employee-attendance", empAttendanceTab.upload.single('file'), empAttendanceTab.createEmpAttendance);
router.put("/attend-employee", empAttendanceTab.upload.single('file'), empAttendanceTab.updateEmpAttendance);
router.post("/employee-attendance-data", empAttendanceTab.addEmpDataAttendance);
// router.get("/employee-attendance/download/:id", empAttendanceTab.downloadEmpAttendance);
// router.delete("/employee-attendance/:id", empAttendanceTab.deleteEmpAttendance);
// router.post("/employee-attendance/storecsv/:id",empAttendanceTab.storeEMPAttendanceData);
// router.get("/employee-attendance/downloadSampleDocument", empAttendanceTab.downloadEmpSampleDocument);

//view Data - Attendance
// router.get("/employee-excelData", empAttendanceTab.getEmpExcelData);

//attendance
router.get("/attendance", attendanceTab.getAttendance);
router.post("/attendance", attendanceTab.upload.single('file'), attendanceTab.createAttendance);
router.get("/attendance/download/:id", attendanceTab.downloadAttendance);
router.delete("/attendance/:id", attendanceTab.deleteAttendance);
router.post("/attendance/storecsv/:id", attendanceTab.storeCsvData);
router.get("/attendance/downloadSampleDocument", attendanceTab.downloadSampleDocument);

//view Data - Attendance
router.get("/excelData", excelDataTab.getExcelData);
//attendance
//check
router.get("/employee-attendance-file", empAttendanceTab.getEmployeeAttendance);
router.get("/employee-attendance-sample", empAttendanceTab.agSample);

router.get("/employee-attendance-view", empAttendanceTab.getEmpAttendance);
router.post("/employee-attendance", empAttendanceTab.upload.single('file'), empAttendanceTab.createEmpAttendance);
router.put("/attend-employee", empAttendanceTab.upload.single('file'), empAttendanceTab.updateEmpAttendance);
router.post("/employee-attendance-data", empAttendanceTab.addEmpDataAttendance);
router.get("/attendance/user-manual", userManualMenu.attendanceManual);

//cpgrams
router.get("/cpgrams", cpgramsTab.getCpgrams);
router.post("/cpgrams", cpgramsTab.upload.single('file'), cpgramsTab.createCpgrams);
router.get("/cpgrams/download/:id", cpgramsTab.downloadCpgrams);
router.delete("/cpgrams/:id", cpgramsTab.deleteCpgrams);
router.post("/cpgrams/storecsv/:id", cpgramsTab.storeCsvData);
//viewData-cpgrams
router.get("/cpgramsData", cpgramsDataTab.getCpgramsData);

//New Cpgram
//Category
router.get('/category-cpgram/:Month/:Year', cpgramController.getCategoryReport);
router.get("/category-cpgram-all", cpgramController.getCategoryAllReport);
router.post("/category-cpgram-create", cpgramInputController.upload.single('file'), cpgramInputController.addCPGRAMCategory);
router.put("/category-cpgram-update", cpgramInputController.upload.single('file'), cpgramInputController.updateCPGRAMCategory);
router.get("/category-cpgram-check", cpgramInputController.getCPGRAMCategoryCheck);
router.get("/category-cpgram-History", cpgramController.getCPGRAMHistory);

//Progress
router.get('/progress-cpgram/:Month/:Year', cpgramController.getProgressReport);
router.get("/progress-cpgram-all", cpgramController.getProgressAllReport);
router.post("/progress-cpgram-create", cpgramProgressController.upload.single('file'), cpgramProgressController.addCPGRAMProgress);
router.put("/progress-cpgram-update", cpgramProgressController.upload.single('file'), cpgramProgressController.updateCPGRAMProgress);
router.get("/progress-cpgram-check", cpgramProgressController.getCPGRAMProgressCheck);
router.get("/progress-cpgram-History", cpgramController.getCPGRAMProgressHistory);

//Ministry pendancy
router.get('/PH3-cpgram/:Month/:Year', cpgramController.getPH3Report);
router.get("/PH3-cpgram-all", cpgramController.getPH3AllReport);
router.post("/PH3-cpgram-create", cpgramPH3Controller.upload.single('file'), cpgramPH3Controller.addCPGRAMPH3);
router.put("/PH3-cpgram-update", cpgramPH3Controller.upload.single('file'), cpgramPH3Controller.updateCPGRAMPH3);
router.get("/PH3-cpgram-check", cpgramPH3Controller.getCPGRAMPH3Check);
router.get("/PH3-cpgram-History", cpgramController.getCPGRAMPH3History);

//Age pendancy
router.get('/age-cpgram/:Month/:Year', cpgramController.getAgeReport);
router.get("/age-cpgram-all", cpgramController.getAgeAllReport);
router.post("/age-cpgram-create", cpgramAgeController.upload.single('file'), cpgramAgeController.addCPGRAMAge);
router.put("/age-cpgram-update", cpgramAgeController.upload.single('file'), cpgramAgeController.updateCPGRAMAge);
router.get("/age-cpgram-check", cpgramAgeController.getCPGRAMAgeCheck);
router.get("/age-cpgram-History", cpgramController.getCPGRAMAgeHistory);

// disposal
router.get("/disposal", disposalTab.getDisposal);
router.post("/disposal", disposalTab.upload.single('file'), disposalTab.createDisposal);
router.get("/disposal/download/:id", disposalTab.downloadDisposal);
router.delete("/disposal/:id", disposalTab.deleteDisposal);
router.post("/disposal/storecsv/:id", disposalTab.storeFileData);
// viewData-disposal
router.get("/disposalData", fileDataTab.getFileData);

//pendency
router.get("/pendency", pendencyTab.getPendency);
router.post("/pendency", pendencyTab.upload.single('file'), pendencyTab.createPendency);
router.get("/pendency/download/:id", pendencyTab.downloadPendency);
router.delete("/pendency/:id", pendencyTab.deletePendency);
router.post("/pendency/storecsv/:id", pendencyTab.storePendanceData);
// viewData-pendency
router.get("/pendencyData", pendencyDataTab.getPendencyData);
// Mopsw
router.get("/cabinet-mopsw", cabinetMopswTab.getCabinetMopsw);
router.get("/cabinet-mopsw-all", cabinetMopswTab.getAllCabinetMopsw);
router.post("/cabinet-mopsw", cabinetMopswTab.createMopswCabinet);
// router.post("/cabinetmopsw-document", cabinetMopswTab.upload.single('file'), cabinetMopswTab.addCabinetMopswDocument);
router.get("/edit-cabinet-mopsw/:mopswCabinetID", cabinetMopswTab.getUpdateMopswData);
router.put("/cabinet-mopsw", cabinetMopswTab.editMopswCabinet);
router.post("/cabinet-mopsw-stage", cabinetMopswTab.createCabinetNotesMopswStage);
router.post("/mopsw-document-uploader", mopswDocumentTab.upload.array('files[]', 10), mopswDocumentTab.mopswDocumentUploader);
router.get("/mopsw-document/:mopswCabinetID", cabinetMopswTab.getMopswDocument);
router.get("/cabinet_notes_mopsw/download/:id", mopswDocumentTab.downloadMopswDocument);
router.delete("/cabinet-mopsw-all/:cabinet_notes_mopsw_id/:userID", cabinetMopswTab.deleteCabinetNotesMopsw);

// Ministry
router.get("/cabinet-ministry/:userID", cabinetBillTab.getCabinetMinistry);
router.post("/cabinet-ministry", cabinetBillTab.createMinistryCabinet);
router.get("/cabinet-ministry-update/:ministryCabinetID", cabinetBillTab.getUpdateCabinetMinistryData);
router.put("/cabinet-ministry", cabinetBillTab.editMinistryCabinet);
router.post("/cabinet-ministry-stage", cabinetBillTab.createCabinetNotesMinistryStage);
router.delete("/cabinet-ministry/:cabinet_notes_ministry_id/:userID", cabinetBillTab.deleteCabinetNotesMinistry);

// Parliamentary Issue
router.get("/parliamentary-issue", parliamentaryIssueTab.getParliamentaryIssue);
router.post("/parliamentary-issue", parliamentaryIssueTab.createParliamentaryIssue);
router.get("/parliamentary-issue/:parliamentaryIssueID", parliamentaryIssueTab.getUpdateParliamentaryIssueData);
router.put("/parliamentary-issue", parliamentaryIssueTab.editParliamentaryIssue);
router.delete("/parliamentary-issue/:parliamentaryIssueID/:userID", parliamentaryIssueTab.deleteParliamentaryIssue);
// router.post("/parliamentary-issue-stage", parliamentaryIssueTab.createParliamentaryIssueStage);

// Gem Procurement

// router.post("/gem-procurement", gemProcurementTab.createGemProcurement);
// router.get("/gem-procurement/:gemProcurementID", gemProcurementTab.getUpdateGemProcurementData);
// // router.put("/gem-procurement", gemProcurementTab.editGemProcurement);
// router.post("/goods-gemprocurement", gemProcurementTab.addGoodsGemProcurement);
// router.post("/service-gemprocurement", gemProcurementTab.addServiceGemProcurement);
// router.post("/works-gemprocurement", gemProcurementTab.addWorksGemProcurement);
// // router.get("/goods-gemprocurement/", gemProcurementTab.getGoodsGemData);



// router.get("/gem-quarterly/:tableName", gemProcurementTab.getQuarterlyGemData);


router.post("/gem-procurement-goods", gemProcurementTab.addGemProcurementGoods);
router.post("/gem-procurement-service", gemProcurementTab.addGemProcurementService);
router.post("/gem-procurement-work", gemProcurementTab.addGemProcurementWork);

router.put("/edit-gem-procurement-goods", gemProcurementTab.updateGemProcurementGoods);
router.put("/edit-gem-procurement-service", gemProcurementTab.updateGemProcurementService);
router.put("/edit-gem-procurement-work", gemProcurementTab.updateGemProcurementWork);

router.delete("/delete-gem-procurement-goods", gemProcurementTab.deleteGemProcurementGoods);
router.delete("/delete-gem-procurement-service", gemProcurementTab.deleteGemProcurementService);
router.delete("/delete-gem-procurement-work", gemProcurementTab.deleteGemProcurementWork);

router.get("/gem-procurement-goods/:userID", gemProcurementTab.getGemProcurementGoods);
router.get("/gem-procurement-data-entry", gemProcurementTab.getGemProcurementDataEntry);
router.get("/gem-procurement-service/:userID", gemProcurementTab.getGemProcurementService);
router.get("/gem-procurement-work/:userID", gemProcurementTab.getGemProcurementWork);
router.get("/gem-procurement-total", gemProcurementTab.getGemProcurementTotalData);

router.post("/monthly-goods-data", gemProcurementTab.addGemMonthlyGoodsData);
router.post("/monthly-service-data", gemProcurementTab.addGemMonthlyServiceData);
router.post("/monthly-work-data", gemProcurementTab.addGemMonthlyWorksData);

router.get("/monthly-goods-data/:goodsGemID", gemProcurementTab.getGemMonthlyGoodsData);
router.get("/monthly-service-data/:serviceGemID", gemProcurementTab.getGemMonthlyServiceData);
router.get("/monthly-work-data/:worksGemID", gemProcurementTab.getGemMonthlyWorksData);

router.get("/get-goods-procurement/:goodsGemID", gemProcurementTab.getGoodsProcurementPotential);
router.get("/get-service-procurement/:serviceGemID", gemProcurementTab.getServiceProcurementPotential);
router.get("/get-works-procurement/:worksGemID", gemProcurementTab.getWorksProcurementPotential);

router.get("/get-organisation-names/:organisationID", financialParameterTab.getOrganisationName);
// Vip
router.get("/vip-reference", vipReferenceTab.getVipReference);
router.post("/vip-reference", vipReferenceTab.createVipReference);
router.put("/vip-reference", vipReferenceTab.updateVipReference);
router.post("/vip-reference-stage", vipReferenceTab.createVipReferenceStage);
router.get("/vip-reference/:vipReferenceID", vipReferenceTab.getUpdateVipReferenceData);
router.delete("/vip-reference/:vipReferenceID/:userID", vipReferenceTab.deleteVipReference);
// router.get("/get-vip-wing-chart", vipReferenceTab.getVipWingChartData);
// router.get("/get-vip-division-chart", vipReferenceTab.getVipDivisionChartData);
// router.get("/get-vip-stage-chart", vipReferenceTab.getVipStageChartData);
// router.get("/get-vip-deadline-chart", vipReferenceTab.getVipDeadlineChartData);

// Audit Para
router.get("/audit-para", auditParaTab.getAuditPara);
router.post("/audit-para", auditParaTab.createAuditPara);
router.get("/edit-audit-para/:auditParaID", auditParaTab.getUpdateAuditData);
router.put("/audit-para", auditParaTab.updateAuditPara);
// router.post("/audit-para-stage", auditParaTab.createAuditParaStage);
router.delete("/audit-para/:audit_para_id/:userID", auditParaTab.deleteAuditPara);

//Issues Tracking

//Inter Ministrial
router.get("/inter-ministerial", interMinisterialController.getInterMinisterialData);
router.post("/inter-ministerial", interMinisterialController.addInterMinisterialData);
router.put("/inter-ministerial", interMinisterialController.updateInterMinisterialData);
router.get("/inter-ministerial/:ID", interMinisterialController.getUpdateInterMinisterialData);
router.post("/inter-ministerial-document", interMinisterialController.upload.single('file'), interMinisterialController.addInterMinisterialDocument);

//Inter state
router.get("/inter-state", interStateController.getInterStateData);
router.post("/inter-state", interStateController.addInterStateData);
router.put("/inter-state", interStateController.updateInterStateData);
router.get("/inter-state/:ID", interStateController.getUpdateInterStateData);
router.post("/inter-state-document", interStateController.upload.single('file'), interStateController.addInterStateDocument);

//Decision Implementation
router.get("/decision-implement", decisionController.getDecisionImplementData);
router.post("/decision-implement", decisionController.addDecisionImplementData);
router.put("/decision-implement", decisionController.editDecisionImplementData);
router.get("/decision-implement/:ID", decisionController.getUpdateDecisionImplementData);

// E-OFFICE
//File pendancy
router.get('/file-pendancy-report/:Year/:Month/:Week', eOfficeTab.getFilePendenceReport);
router.get("/file-pendancy-all", eOfficeTab.getFilePendenceAll);
router.get("/file-pendancy-check", eOfficeTab.getFilePendenceCheck);
router.get("/file-pendancy-History", eOfficeTab.getFilePendencyHistory);
router.post("/file-pendancy-create", EofficeFilePendancyTab.upload.single('file'), EofficeFilePendancyTab.addFilePendancy);
router.put("/file-pendancy-update", EofficeFilePendancyTab.upload.single('file'), EofficeFilePendancyTab.updateFilePendancy);

//File disposal Chart
router.get('/file-pendancy-chart/:Year/:Month/:Hierarchy', eOfficeTab.getFilePendancyChart);

//Receipt pendancy
router.get('/receipt-pendancy-report/:Year/:Month/:Week', eOfficeTab.getReceiptPendenceReport);
router.get("/receipt-pendancy-all", eOfficeTab.getReceiptPendenceAll);
router.get("/receipt-pendancy-check", eOfficeTab.getReceiptPendenceCheck);
router.get("/receipt-pendancy-History", eOfficeTab.getReceiptPendencyHistory);
router.post("/receipt-pendancy-create", EofficeReceiptPendancyTab.upload.single('file'), EofficeReceiptPendancyTab.addReceiptPendancy);
router.put("/receipt-pendancy-update", EofficeReceiptPendancyTab.upload.single('file'), EofficeReceiptPendancyTab.updateReceiptPendancy);

//Receipt pendancy Chart
router.get('/receipt-pendancy-chart/:Year/:Month/:Hierarchy', eOfficeTab.getReceiptPendancyChart);

//File disposal
router.get('/file-disposal-report/:Year/:Month/:Week', eOfficeTab.getFileDisposalReport);
router.get("/file-disposal-all", eOfficeTab.getFileDisposalAll);
router.get("/file-disposal-check", eOfficeTab.getFileDisposalCheck);
router.get("/file-disposal-History", eOfficeTab.getFileDisposalHistory);
router.delete("/delete-employee/:empID", EofficeFileDisposalTab.deleteEmployee);
router.post("/file-disposal-create", EofficeFileDisposalTab.upload.single('file'), EofficeFileDisposalTab.addFileDisposal);
router.put("/file-disposal-update", EofficeFileDisposalTab.upload.single('file'), EofficeFileDisposalTab.updateFileDisposal);

//File disposal Chart
router.get('/file-disposal-chart/:Year/:Month/:Hierarchy', eOfficeTab.getFileDisposalChart);

// Official Foreign Visit
router.get("/OFV-data/:userID/:organisationID", officialForeignVisitTab.getOFVData);
router.post("/add-OFV-data", officialForeignVisitTab.addOFVData);
router.post("/OFV/upload-files", officialForeignVisitTab.upload.single('file'), officialForeignVisitTab.addOFVDocument);
router.get("/OFV/download/:id", officialForeignVisitTab.downloadTour);
// router.get("/get-OFV-report/:type", officialForeignVisitTab.getOFVReport);
router.post("/get-OFV-report", officialForeignVisitTab.getOFVReport);

router.get("/get-OFV-update/:ID", officialForeignVisitTab.getUpdateOFVData);
router.get("/get-OFV-year/:year/:type", officialForeignVisitTab.getDetailYearOFVReport);
router.get("/get-OFV-name/:name/:type", officialForeignVisitTab.getDetailNameOFVReport);
router.get("/get-OFV-detail/:id", officialForeignVisitTab.getDetailedInfoOFV);
router.get("/get-foreign-chart/:orgID/:roleId/:desigID/:officerName", officialForeignVisitTab.getOFVChart);
router.post("/get-foreign-count", officialForeignVisitTab.getCountOFV);
router.get("/get-foreign-onGoing/:orgID/:roleId/:desigID/:officerName", officialForeignVisitTab.getOnGoingListOFV);
router.get("/get-OFV-upload/:ID", officialForeignVisitTab.getUploadData);

router.post("/update-propsed-info", officialForeignVisitTab.updateProposedInformation);
router.post("/update-sanctioned-info", officialForeignVisitTab.updateSanctionedInfo);
router.post("/update-visit-tab", officialForeignVisitTab.updateVisitTab);


// Flagged ship
router.get("/get-flag-data", flaggedShipTab.getFSData);
router.get("/get-flag-update-data/:ID", flaggedShipTab.getUpdateFSData);
router.post("/add-flag-data", flaggedShipTab.addFlaggedShip);
router.put("/update-flag-data", flaggedShipTab.editFlaggedShip);
router.post("/get-flag-report", flaggedShipTab.getPFSReport);

router.post("/add-issue-review-items",reviewItemsTab.addIssueReviewItem)
router.post("/add-review-items",reviewItemsTab.addReviewItems)
router.get("/get-unique-rid-Number",reviewItemsTab.getUniqueRIDNumber)
router.get("/get-unique-issue-Number",reviewItemsTab.getUniqueIssueNumber)
router.get("/get-review-item-data",reviewItemsTab.getReviewItemData)
router.get("/get-review-item-total/:reviewItemCode",reviewItemsTab.getReviewItemTotal)
router.get("/get-review-item-code-data-by-id/:reviewItemCode",reviewItemsTab.getReviewItemCodeDataByID)

// LEGAL MENU
//  Bills/PreConstitutions Act
router.get("/bill", billTab.getBill);
router.post("/bill", billTab.createBill);
router.get("/bill/:billID", billTab.getUpdateBill);
router.put("/bill", billTab.updateBill);
router.delete("/delete-bill/:billID/:userID", billTab.deleteBill);
// router.post("/bill-stage", billTab.createBillStage);

//Court cases

//litigation court case
router.get("/get-last-Litigation-case-no/:organisationID", litigationCourtCaseTab.getLastLitigationCaseNumber);
router.post("/create-litigation-court-case", litigationCourtCaseTab.createLitigationCourtCase);
router.post("/add-litigation-prev-conn-court-case", litigationCourtCaseTab.addLitigationPrevConnCases);
router.post("/add-litigation-counsel-details", litigationCourtCaseTab.addLitigationDetailsOfCounsel);
router.post("/add-litigation-new-court-case-org", litigationCourtCaseTab.addLitigationOtherCourtCaseOrg);
router.post("/add-ministry-counsel-details", litigationCourtCaseTab.addMinistryDetailsOfCounsel);
router.post("/ministry-upload-document", litigationCourtCaseTab.upload.single('file'), litigationCourtCaseTab.ministryUploadDocument);
router.post("/ministry-intervention-document", litigationCourtCaseTab.fileUpload.single('file'), litigationCourtCaseTab.ministryInterventionDocument);
router.post("/counter-affidavit-document", litigationCourtCaseTab.fileupload.single('file'), litigationCourtCaseTab.counterAffidavitDocument);
router.post("/add-ministry-intervention", litigationCourtCaseTab.createMinistryIntervention);
router.post("/add-court-case-OM-details", litigationCourtCaseTab.addCourtCaseOMDetails);
router.post("/add-court-case-hearing-details", litigationCourtCaseTab.addCourtCaseHearingDetails);
router.post("/add-court-case-interim-details", litigationCourtCaseTab.addCourtCaseInterimDetails);
router.post("/create-case-status", litigationCourtCaseTab.submitCaseStatus);
router.post("/add-professional-fee", litigationCourtCaseTab.addProfessionalFeeDetails);
router.post("/add-other-expenses", litigationCourtCaseTab.addOtherExpensesDetails);
router.post("/create-litigation-expenditure", litigationCourtCaseTab.submitLitigationExpenditure);
router.get("/get-litigation-sub-table-court-cases-data/:typeName/:caseID", litigationCourtCaseTab.getSubTableCourtCasesData);
router.get("/get-ministry-upload-document/:caseID", litigationCourtCaseTab.getMinistryUploadDocument);
router.delete("/delete-ministry-uploaded-document/:caseID/:replyFiledDoc", litigationCourtCaseTab.deleteMinistryInterventionDocument);
router.delete("/delete-ministry-intervention-document/:caseID/:intrevenDoc", litigationCourtCaseTab.deleteMinistryInterventionDoc);
router.delete("/delete-ministry-affidavit-file-document/:caseID/:affidavitFile", litigationCourtCaseTab.deletecounterAffiDocument);
router.get("/get-all-litigation-case-data/:userID", litigationCourtCaseTab.getAllLitigationData);
router.post("/add-litigation-petitioner-and-respondent",litigationCourtCaseTab.addLitigationPetitionerAndRespondent);
router.get("/get-litigation-petitioner-and-respondent/:caseID",litigationCourtCaseTab.getLitigationPetitionerAndRespondent);
router.get("/check-case-number-exists/:organisationID/:caseNumber",litigationCourtCaseTab.checkCaseNumberExists);

router.get("/litigation-domain-report", litigationCourtCaseTab.getLitigaitonDomainReport);
router.get("/litigation-subdomain-report", litigationCourtCaseTab.getLitigaitonSubDomainReport);
router.get("/litigation-domain-subdomain-report", litigationCourtCaseTab.getLitigaitonDomainAndSubDomainReport);
router.get("/litigation-portwise-pendency-report", litigationCourtCaseTab.getLitigaitonPendencyPortWiseReport);
router.get("/litigation-domainwise-pendency-report", litigationCourtCaseTab.getLitigaitonPendencyDomainWiseReport);


router.get("/litigation-domain-report-by-other-org", litigationCourtCaseTab.getLitigaitonDomainByOtherOrgReport);
router.get("/litigation-sub-domain-report-by-other-org", litigationCourtCaseTab.getLitigaitonSubDomainByOtherOrgReport);
router.get("/litigation-domain-subdomain-report-by-other-org", litigationCourtCaseTab.getLitigaitonDomainAndSubDomainByOtherOrgReport);
router.get("/litigation-other-org-portwise-pendency-report", litigationCourtCaseTab.getLitigaitonPendencyOtherOrgWiseReport);
router.get("/litigation-other-org-domainwise-pendency-report", litigationCourtCaseTab.getLitigaitonPendencyDomainWiseOtherOrgReport);
// router.get("/litigation-domainwise-pendency-other-org-report", litigationCourtCaseTab.getLitigaitonPendencyDomainWiseOtherOrgReport);

router.get("/get-court-case-data-by-id/:caseType/:caseID", arbitCourtCaseTab.getCourtCaseDataByID);
router.get("/get-sub-table-court-case-data/:typeName/:caseID", arbitCourtCaseTab.getSubTableCourtCaseData);
router.post("/add-other-claimant-org", arbitCourtCaseTab.addOtherClaimantOrg);
router.post("/add-other-respondent-org", arbitCourtCaseTab.addOtherRespondentOrg);
router.post("/add-prev-conn-court-case", arbitCourtCaseTab.addPrevConnCases);
router.post("/add-hearing-court-case", arbitCourtCaseTab.addHearingCases);
router.post("/add-interim-order-court-case", arbitCourtCaseTab.addInterimOrder);
router.post("/create-arbitration-court-case", arbitCourtCaseTab.createArbitCourtCase);
router.put("/update-arbitration-court-case-status", arbitCourtCaseTab.updateArbitCourtCaseStatus);
router.put("/update-arbitration-court-case-expenditure", arbitCourtCaseTab.addArbitFeeExpenseData);
router.post("/add-counsel-details", arbitCourtCaseTab.addDetailsOfCounsel);
router.get("/court-case-get-acts/", arbitCourtCaseTab.getActDropDownData);
router.post("/court-case-document", arbitCourtCaseTab.upload.single('file'), arbitCourtCaseTab.courtCaseUploadDocument);
router.get("/court-case-get-rules/:actID", arbitCourtCaseTab.getRuleDropDownData);
router.get("/court-case-sub-court-type/:courtTypeID", arbitCourtCaseTab.getSubCourtTypeDropDown);
router.get("/court-case-consumer-typeID/:consumerTypeID", arbitCourtCaseTab.getConsumerForumDropDown);
router.get("/court-case/:roleID/:organisationID", arbitCourtCaseTab.getCourtCase);
router.get("/court-case/:courtCaseID", arbitCourtCaseTab.getUpdateCourtCase);
router.get("/get-last-case-no/:organisationID", arbitCourtCaseTab.fetchLastCaseNumber);
router.post("/court-case-stage", arbitCourtCaseTab.createCourtCaseStage);
router.delete("/delete-court-case/:caseID/:userID", arbitCourtCaseTab.deleteCourtCaseData);
router.get("/get-ministry-defence-statement-document/:caseID", arbitCourtCaseTab.getDefenceStatDoc);
router.delete("/delete-ministry-defence-statement-document/:caseID/:defenceFile", arbitCourtCaseTab.deleteMinistryDefenceDocument);
router.post("/add-arbitration-claimant-and-respondent",arbitCourtCaseTab.addArbitrationClaimantAndRespondent)
router.get("/get-arbitration-claimant-and-respondent/:caseID",arbitCourtCaseTab.getArbitrationClaimantAndRespondent)

router.get("/court-case-doc/:courtCaseID", arbitCourtCaseTab.getCaseDocuments);
router.delete("/delete-court-case/:courtID", arbitCourtCaseTab.deleteCaseDocuments);
router.get("/download-court-document/:courtID", arbitCourtCaseTab.downloadCaseDocument);

//Court Case Report
router.get("/all-court-case-report/:userID", arbitCourtCaseTab.getCourtCaseReport),
router.get("/get-detailed-case-report/:organisationID/:stageID", arbitCourtCaseTab.getArbitrationDetailCourtCaseReport),
router.get("/get-conciliation-detailed-case-report/:organisationID/:stageID", arbitCourtCaseTab.getConciliationDetailCourtCaseReport),
router.get("/get-litigation-detailed-case-report/:organisationID/:stageID", arbitCourtCaseTab.getLitigationcourtcasesReport),
// View Proposal - DPR, feasibility documents
// router.post("/proposal-document-uploader", proposalDocumentTab.upload.array('file'), proposalDocumentTab.propDocumentUploader);


// Lump Sum
router.post("/add-lumpsum", addNewLumpSumTab.createLumpSumData);
router.get("/lumpsum-list", addNewLumpSumTab.getLumpSumList);
router.get("/getedit-lumpsum-data/:projectID", addNewLumpSumTab.getLumpSumData);
router.get("/getedit-lumpsum-activitydata/:projectID", addNewLumpSumTab.getActivityNameData);
router.put("/edit-lumpsum", addNewLumpSumTab.editLumpSumData);
router.delete("/delete-lumpsum/:lumpsumId", addNewLumpSumTab.deleteLumpSumData);
router.post("/add-lumpsum-activity", addNewLumpSumTab.createLumpSumActivityData);
router.get("/getdata-lumpsum-activitydata/:projectID", addNewLumpSumTab.getSubProActivityData);

// CSR Projects
router.post("/csr-gallery-upload", csrProjectTab.upload.array('file'), csrProjectTab.addNewCsrFileGallery);
router.post('/add-csr-projects', csrProjectTab.createCsrProjects);
router.get('/csr-projects-list/:userID',csrProjectTab.getCsrProjectslist);
router.put("/update-csr-list", csrProjectTab.updateCsrProjects);
router.get("/csr-list/:csrProjectId", csrProjectTab.getUpdateCsrProjectsData);
router.post("/csrprojectdocument", csrProjectTab.upload.single('file'), csrProjectTab.csrProjectDocumentUploader);
router.get("/download-csrfile/:fileName", csrProjectTab.csrfileDownload);
router.delete("/delete-csrfile", csrProjectTab.csrfileDelete);
router.get("/get-csr-expenditure/:csrProjectId", csrProjectTab.getCsrExpenditureCost);
router.post('/add-csr-expenditure', csrProjectTab.addCsrExpenditure);
router.get("/get-csr-project-files/:csrProjectId", csrProjectTab.getCsrFileUploadDocument);
router.delete("/delete-csr-gallery-file/:csrProjectId/:filename",csrProjectTab.deleteGalleryFile);
router.put("/update-csr-gallery-file",csrProjectTab.fileUpload.single('file'),csrProjectTab.updateGalleryFile);
router.post("/update-csr-gallery-upload/:csrProjectId", csrProjectTab.fileUpload.array('file'),csrProjectTab.uploadMediaGalleryFile)
router.get("/download-csrfile-pdf-document", csrProjectTab.csrPdfFileDownload);
router.get("/get-csr-project-overview-reports/:userID",csrProjectTab.csrProjectsAbstractReport);
router.get("/get-csr-projects-detailed-reports/:organisationID/:OrganisationName",csrProjectTab.csrProjectsDetailedReport)

// CSR Fund Detail
router.get('/csr-Fund-list/:userID',csrProjectTab.getCsrFundList);
router.get("/csr-update-fundlist/:csrFundId", csrProjectTab.getUpdateFundData);
router.post('/csrFund-edit', csrProjectTab.editCsrFund);
router.post('/add-csr-Fund',csrProjectTab.addCsrFundDetails);
router.get('/get-csr-fund-expenditure-report/:userID',csrProjectTab.csrExpenditureReport);
router.get('/get-csr-project-dashboard/:clusterID/:organisationID/:fy/:focusID',csrProjectTab.getCSRProjectDashboard);
router.get('/get-csr-fund-allocatted/:clusterID/:organisationID/:fy/:focusID',csrProjectTab.getCsrFundAllocatted);
router.get('/get-csr-project-stage-wise/:clusterID/:organisationID/:fy/:focusID',csrProjectTab.getCsrProjectStageWise);
router.get('/get-csr-project-count-wise/:clusterID/:organisationID/:fy/:focusID',csrProjectTab.getCSRProjectCountWise);
router.get('/get-detailed-csr-projects/:clusterID/:organisationID/:fy/:stage/:focusID',csrProjectTab.getDetailedCSRProjects);
// Drop Project
router.post("/dropproject-request", dropRequestTab.deleteProjectRequest);
router.get("/viewdrop-projectlist/:userID", dropRequestTab.viewDropProjectList);
router.put("/delete-project/:projectID/:subProjectID", dropRequestTab.deleteProject);
router.post("/reject-project-drop-request", dropRequestTab.rejectProjectDropRequest);


// crct but delete in add new project page
// router.post("/add-project-document-uploader", addNewProjectTab.upload.array('projectDocument'),addNewProjectTab.addProjectDocumentUploader);


router.get("/project-ppt-document/:projectID", addNewProjectTab.getProjectPptDocument);
router.get("/project-pert-document/:projectID", addNewProjectTab.getProjectPertDocument);
router.get("/project-image-document/:projectID", addNewProjectTab.getProjectImageDocument);

// Project list
router.get("/project-list/:userID", projectListTab.getProjectList);
router.get("/project-list-data/:userID", projectListTab.getProjectAllData);
router.get("/project-folder-download/:userID/:emailId", projectListTab.projectFolderDownloadLog);
router.get("/project-media-files-download/:fileName", projectListTab.projectMediaLinkDownload)

router.get("/project-list-expenditurelogs/:userID", projectListTab.getExpLogsData);
router.get("/get-project-category-name/:projectCategoryID", projectListTab.getProjectCategoryName);
router.get("/get-project-initiative-name/:projectInitiativeID", projectListTab.getProjectInitiativeName);
router.get("/get-sof-name/:sourceOfFundingID", projectListTab.getSourceOfFundingName);
router.post('/submit-capex-project-data', projectListTab.submitCapexProjectData);
router.get('/get-capex-projects-data', projectListTab.getCapexProjectsData);
router.get('/get-update-capex-projects-data', projectListTab.getUpdateCapexProjectsData);
router.post('/update-capex-project-data', projectListTab.updateCapexProjectData);

router.get("/project-id-dropdown/:organisationID/:tid", masterTable.getDropDownProjectList);
router.get("/subproject-id-dropdown/:organisationID/:tid/:projectId", masterTable.getDropDownSubProjectList);

router.get("/view-projectdata/:projectID/:subProjectID", projectListTab.viewProjectData);
router.get("/view-projectimages/:projectID/:subProjectID", projectListTab.viewProjectImages);

router.get("/project/user-manual", userManualMenu.projectManual);

router.get("/view-projectdata/:projectID/:subProjectID", projectListTab.viewProjectData);
router.get("/viewproject-milestone-data/:projectID/:subProjectID", projectListTab.getUnderImplementationDate);
router.get("/viewproject-tender-data/:projectID/:subProjectID", projectListTab.getUnderTenderingDate);
router.get("/view-projectimages/:projectID/:subProjectID", projectListTab.viewProjectImages);
// router.get("/get-viewproject-documents/:projectID/:subProjectID", viewProjectDataTab.getViewProjectDocuments);

// Edit Project

router.get("/get-editprojectdata/:projectID/:subProjectID", editProjectTab.getEdiProjectData);
router.get("/get-expenditure-outlay/:projectID/:subProjectID", expenditureTab.getExpenditureOutlayCost);
router.post("/add-expenditure-outlay", expenditureTab.addExpenditureOutlay);
router.get("/sum-expenditure-outlay/:projectID/:subProjectID/:year",expenditureTab.sumOfExpIncurredFy)

router.post("/add-revised-date", editProjectTab.addRevisedDate);
router.get("/get-revised-date/:projectID/:subProjectID", editProjectTab.getRevisedDate);

router.put("/viewproject-update", editProjectTab.updateViewProjectDetails);
// router.post("/viewproject", documentUploaderTab.upload.single('file'), documentUploaderTab.projectDocumentUploader);
router.get("/bi-check-points/:projectID/:subProjectID", editProjectTab.getBasicInformationCheckPoints);

router.post("/revisionDate", revisionDateTab.saveRevisionDate);
router.post("/add-basic-project-document-uploader", addNewProjectTab.upload.array('projectDocument'), editProjectTab.addProjectDocumentUploader);
router.get("/get-project-documents/:projectID/:subProjectID", editProjectTab.getProjectDocuments);
router.delete("/delete-project-document/:projectID/:subProjectID/:documentName", editProjectTab.deleteProjectDocument);
router.get("/download-project-document/:projectID/:subProjectID/:documentName", editProjectTab.downloadProjectDocument);
router.get("/download-project-error-log-document", editProjectTab.downloadErrorLogFile);

router.post("/add-basic-project-document-uploader-edit", addNewProjectTab.upload.array('projectDocument'), editProjectTab.editProjectDocumentUploader);

//Planning and Sanctioning
router.post("/planning-sanctioning", planningSanctioningTab.updatePlanningSanctionedData);
router.get("/planning-sanctioning/:projectID/:subProjectID", planningSanctioningTab.getPlanningSanctioningData);
router.get("/ps-check-points/:projectID/:subProjectID", planningSanctioningTab.getPlanningCheckPoints);

// Under Tendering
router.post("/undertendering", underTenderingTab.utProjectDatesAction);
router.get("/undertendering/:projectID/:subProjectID", underTenderingTab.getDisplayUtProjectDates);
router.get("/undertendering-revision/:projectID/:projectSubStageID/:subProjectID", underTenderingTab.getRevisionHistory);
router.post("/awardofcontract-cost", underTenderingTab.addUtCostandCalls);
router.get("/awardofcontract-cost/:subProjectID/:projectID", underTenderingTab.getUtCostandCallsData);

router.post("/project-document-uploader", underTenderingTab.upload.array('projectDocument'), underTenderingTab.utProjectDocumentUploader);
router.get("/check-file-exists", underTenderingTab.fileCheck);

router.get("/checkstageid/:subProjectID/:projectID", underTenderingTab.checkProjectStageID);
router.get("/ut-check-points/:projectID/:subProjectID", underTenderingTab.getUnderTenderingCheckPoints);
router.get("/ui-check-points/:projectID/:subProjectID", underTenderingTab.getUnderImplementationCheckPoints);
router.get("/download-file", underTenderingTab.fileDownload);
router.delete("/delete-file", underTenderingTab.fileDelete);
// router.get("/checkstageid/:subProjectID/:projectID", updateProjectStageTab.checkProjectStage);

// router.post("/undertendering-revision/", underTenderingTab.getRevisionHistory);

// awardOfContractTab
// router.post("/awardofcontact", awardOfContractTab.utProjectDatesAction);
// router.post("/awardofcontract-cost", awardOfContractTab.addAwardOfContractCost);
// router.get("/awardofcontract-cost/:projectID", awardOfContractTab.getAwardofCotractCost);

// Clearance
router.post("/addclearance", clearanceTab.addClearanceDetails);
router.get("/clearance/:projectID/:subProjectID", clearanceTab.getClearanceData);
router.post("/clearancedocument", clearanceDocumentUploaderTab.upload.single('file'), clearanceDocumentUploaderTab.clearanceDocumentUploader);
router.get("/clearancedocument/:documentName", clearanceDocumentUploaderTab.downloadClearanceDocument);

// Activity -Milestone
router.post("/milestone", activityTab.addActivityData);
router.get("/milestone/:projectID/:subProjectID", activityTab.getActivityData);
router.get("/get-delay-reason/:projectID/:subProjectID", activityTab.getDelayReason);
router.post("/add-physical-progress", activityTab.addPhysicalProgress);
router.get("/get-progress-value/:projectID/:subProjectID", activityTab.getProgressValue);
router.get("/get-inauguration-dates/:projectID/:subProjectID", activityTab.getInaugurationDate);

//Expenditure Logs
router.get("/get-component/:projectID/:subProjectID", expenditureTab.getSourceOfFundingComponent);
router.post("/add-expenditure-detail", expenditureTab.addExpenditureDetails);
router.get("/get-expenditure-detail/:projectID/:subProjectID", expenditureTab.getExpenditureDetails);
router.get("/get-total-expenditure-detail/:projectID/:subProjectID", expenditureTab.getTotalExpenditureDetails);
router.get("/get-total-expenditure-value/:projectID/:subProjectID", expenditureTab.getTotalExpenditureValue);
// router.post("/edit-expenditure-outlay", expenditureTab.editExpenditureOutlay);
// router.get("/get-expenditure-outlay/:projectID/:subProjectID", expenditureTab.getExpenditureOutlay);
router.get("/get-expenditure-financial-year/:projectID/:subProjectID/:financialYear", expenditureTab.getExpenditureFinancialYear);
router.get("/get-expenditure-main-financial-year/:projectID/:subProjectID/:financialYear/:month", expenditureTab.getExpenditureMainFinancialYear);
router.post('/edit-expenditure-components-details', expenditureTab.editExpenditureComponentsDetails);
router.post("/delete-expenditure-log-row", expenditureTab.deleteExpenditureLogRow);

// Completion page
router.post("/completionpage", completionTab.addCompletionDate);
router.get("/completionpage/:projectID/:subProjectID", completionTab.getCompletionPageData);

// ADD PROJECT MODULE
router.post("/add-newproject", addNewProjectTab.createNewProject);
router.post("/update-subproject", addNewProjectTab.updateSubProject);


//young professionals
router.get("/young-professional", youngProfessionalsTab.getYoungProfessional);
router.post("/young-professional", youngProfessionalsTab.createYoungProfessional);
router.put("/young-professional/:youngProfessionalId", youngProfessionalsTab.updateYoungProfessional);
router.delete("/delete-young-professional/:youngProfessionalId", youngProfessionalsTab.deleteYoungProfessionalData);
router.get("/get-young-professional-wing-data/:wingId/:divisionId", youngProfessionalsTab.getYoungProfessionalWingData);
router.post("/upload-yp-document/:candidateId", youngProfessionalsTab.uploadYPDocument);
router.get("/download-yp-document", youngProfessionalsTab.ypFileDownload);


//candidate detail young professional
router.post("/candidate-detail", youngProfessionalsTab.addCandidateDetail);
router.put("/candidate-detail", youngProfessionalsTab.updateCandidateDetail);
router.delete("/yp-candidate-all-data/:youngProfessionalId/:userID", youngProfessionalsTab.deleteYpCandidateData);

router.put("/candidate-uploader", candidateDocumentTab.upload.single('file'), candidateDocumentTab.candidateDocumentUpdater);
router.post("/candidate-uploader", candidateDocumentTab.upload.single('file'), candidateDocumentTab.candidateDocumentUploader);
router.get("/candidate-detail/:youngProfessionalId", youngProfessionalsTab.getCandidateDetail);
router.get("/candidate-detail-document/:candidate_id", youngProfessionalsTab.getCandidateDetailDocument);


router.put( "/relieve-young-professional",youngProfessionalsTab.relieveYoungProfessional);
//consultant appointment
router.get("/consultant-appointment", consultantAppointmentTab.getConsultantAppointment);
router.post("/consultant-appointment", consultantAppointmentTab.createConsultantAppointment);
router.put("/consultant-appointment", consultantAppointmentTab.updateConsultantAppointment);
router.post("/consultant-appointment-stage", consultantAppointmentTab.createConsultantAppointmentStage);
router.get("/edit-consultant-appointment/:consultantAppointmentID", consultantAppointmentTab.getUpdateConsultantAppointmentData);
router.get("/get-candidate-id/:consultantAppointmentID", consultantAppointmentTab.getCandidateID);

//candidate detail consultant appointment
router.post("/ca-candidate-detail", consultantAppointmentTab.addCandidateDetail);
router.post("/ca-candidate-uploader", candidateCaDocumentTab.upload.single('file'), candidateCaDocumentTab.candidateDocumentUploader);
router.get("/ca-candidate-detail/:Id", consultantAppointmentTab.getCandidateDetail);
router.get("/ca-candidate-detail-document/:Id", consultantAppointmentTab.getCandidateDetailDocument);
router.post("/add-consultant-id", consultantAppointmentTab.addConsultantID);

//delete consultant appoinment and candidate details
router.delete("/consultant-candidate-all-data/:consultant_appointment_id/:userID", consultantAppointmentTab.deleteCACandidateData);

//HR
router.post("/hr-department", hrDepartmentTab.createHrDepartment);
router.get("/hr-department/:Id", hrDepartmentTab.getHrDepartment);
router.get("/get-hr-department-by-org/:organisationID", hrDepartmentTab.getHrDepartmentByOrg);
router.get("/get-hr-department-by-org-and-deprtid/:organisationID/:departmentID", hrDepartmentTab.getHrPostsByOrgAndDept);

router.get("/hr-total-post-details-org", hrDepartmentTab.getTotalHrPostDetailsOrg);
router.post("/hr-post", hrPostTab.createHrPost);
router.get("/hr-post/:Id", hrPostTab.getHrPost);
router.delete("/delete-hr-post/:postId", hrPostTab.deleteHrPost);
router.delete("/delete-hr-department-data/:deptID/:orgID", hrManagementTab.deleteHrDepartment);
router.put("/update-hr-post-strength/:Id", hrPostTab.updateHrPostStrength);
router.get("/hr-management-post/:Id", hrPostTab.getHrManagementPost);
router.get("/sanctioned-strength/:Id", hrPostTab.getSanctionedStrength);
router.get("/get-filled-vacant-data-count/:Id", hrPostTab.getFilledVacantDataCount);
router.get("/get-missing-post-data-count/:organisationId", hrPostTab.getMissingPostDataCount);
router.get("/get-organisation-code/:organisationId", hrManagementTab.getOrganisationCode);
router.get("/get-department-id/:postId", hrManagementTab.getDepartmentId);
router.get("/check-post-code/:Id", hrManagementTab.checkPostCode);
router.post("/post-strength-detail", hrManagementTab.addPostStrengthDetail);
router.post("/post-hr-anticipated-vacancies", hrManagementTab.addAnticipatedVancancies);
router.post("/put-hr-anticipated-vacancies", hrManagementTab.updateAnticipatedVacancies);
router.delete("/delete-hr-anticipated-vacancies/:anticipatedId", hrManagementTab.deleteAnticipatedVacancy);
router.get("/get-hr-anticipated-vacancies/:Id", hrManagementTab.getAnticipatedVacancies);
router.post("/post-revive-detail", hrManagementTab.addRevivePost);
router.get("/get-strength-data/:Id", hrManagementTab.getPostStrengthData);
router.get("/get-strength-absolute-data/:Id", hrManagementTab.getPostStrengthAbsoluteData);
router.get("/get-permanent-abolished-post/", hrManagementTab.getPermanentAbolishedPost);
router.get("/get-permanent-abolished-post-org/:organisationID", hrManagementTab.getPermanentAbolishedPostOrg);
router.get("/get-filled-post/:postId", hrManagementTab.getFilledPost);
router.get("/get-vacant-post/:postId", hrManagementTab.getVacantPost);
router.post("/post-revival-date", hrManagementTab.postReviveDate);
router.post("/update-revive-post-approval", hrManagementTab.updateRevivePostApprovalDetails);

router.delete("/delete-hr-post-data/:postId/:postCode", hrManagementTab.deleteHrPostData);
router.get("/get-hr-all-data/:organisationID", hrManagementTab.getHRAllData);
router.get('/get-transfer-in-employees-by-organisation/:organisationID', hrEmployeeTab.getTransferInEmployeeListByOrgId);
router.get('/get-emp-details-for-vacancy-management/:employeeID', hrEmployeeTab.getEmpDetailsForVacancyManagement);
router.get('/get-chd-in-employees-by-organisation/:organisationId', hrEmployeeTab.getCHDEmployeesByOrgId);

router.get("/get-organisation-name/:organisationID", postRequestTab.getOrgName);

router.get("/get-post-request-data/:postRequestId", postRequestTab.getPostRequestData);
router.post("/update-post-approval", postRequestTab.updatePostApprovalDetails);
router.post("/approve-post-request", postRequestTab.approvePostRequest);
router.post("/reject-approve-request", postRequestTab.rejectApproveRequest);
router.post("/update-post-request-approval", postRequestTab.updatePostRequestApprovalDetail);
router.get("/get-user-name/:userID", postRequestTab.getUserName);

router.get("/get-activity-date-data/:fromDate/:toDate/:organisationID", hrPostTab.getActivityDateData);

router.get("/get-emp-details-by-reference-id", hrEmployeeTab.getEmployeeDetailsByReferenceId);
router.get("/get-emp-details-by-reference-id-and-emp-name/:referenceID", hrEmployeeTab.getEmployeeDetailsByReferenceIdOnly);
//Dashboard

router.get("/get-wing-wise-dashboard/:userId", dashboardController.getDashboardWingWise);
router.get("/get-dashboard-gem-pro-and-capex/:userId", dashboardController.getDashboardGemProAndCapex);
router.get("/get-dashboard-gem-pro-and-capex-ministry-view/:userId", dashboardController.getDashboardGemProAndCapexministryView);
router.get("/get-dashboard-organisation-view/:userId", dashboardController.getDashboardorganisationview);

//REVISED HR

router.get("/hr-post-by-orgId/:organisationID/:departmentId", hrManagementTab.getPostListByOrgId);
router.post("/add-new-emplyee" , hrManagementTab.addNewEmployee);
router.post("/edit-employee-details", hrManagementTab.editEmployeeDetails);
router.get("/get-sanctioned-strength-details/:userID", hrManagementTab.getDetailedSanctionedStrength);
router.get("/get-total-filled-post-details/:organisationID", hrManagementTab.getDetailedTotalFilledPosts);
router.get("/get-total-vacant-posts-details/:organisationID", hrManagementTab.getTotalVacantPosts);
router.get("/get-abolised-vacant-posts-details/:organisationID", hrManagementTab.getAbolishedVacantPosts);
router.get("/get-year-and-month/:organisationID", hrManagementTab.getYearAndMonth);

router.post("/revised-hr-post", revisedHrPost.createRevisedHrPost);
router.get("/revised-hr-post/:organisationID", revisedHrPost.getRevisedHrPost);
router.delete("/revised-delete-hr-post/:postId/:reason/:userID", revisedHrPost.revisedDeleteHrPost);
router.get("/revised-get-hr-division/", revisedHrPost.getDivisionDropdownData);
router.put("/revised-update-hr-post-strength/:Id", revisedHrPost.updateRevisedHrPostStrength);
router.get("/revised-hr-management-post/:Id", revisedHrPost.getRevisedHrManagementPost);
router.get("/sanctioned-strength/:Id", revisedHrPost.updateRevisedHrPostStrength);

router.get("/get-hr-employee-data/:Id", hrEmployeeTab.getHrEmployee);
router.get("/get-hr-employee-by-id/:employeeMasterID", hrEmployeeTab.getHrEmployeeByID);
router.get('/get-hr-department-dropdown-list', hrEmployeeTab.getDepartmentList);
router.post("/submit-employee-leave-history", hrEmployeeTab.submitEmpLeaveHistory);
router.get("/get-emp-leave-history-details/:employeeID", hrEmployeeTab.getEmpLeaveHistoryData);
router.get("/get-post-names-by-org/:selectedOrganisationId", hrEmployeeTab.getPostNamesByOrgId);
router.post('/update-employee-status/:status/:empID/:referenceID', hrEmployeeTab.updateEmployeeStatus);

router.get('/get-hr-department-list/:organisationID', hrEmployeeTab.getHrDepartmentList);
router.get('/get-hr-division-list', hrEmployeeTab.getHrDivisionList);
router.get('/get-hr-post-list/:organisationID', hrEmployeeTab.getHrPostList);
router.get('/get-hr-post-details/:organisationID', hrEmployeeTab.getHrPostDetails);
router.get('/get-hr-vacancy-details/:postId/:isLive', hrEmployeeTab.getHrVacancyDetails);
router.get('/get-employee-details-by-org/:organisationID', hrEmployeeTab.getEmployeeDetailsByOrgID);
router.get('/get-employee-details-by-empId/:empID', hrEmployeeTab.getEmployeeDetailsByEmpId);
router.get('/get-employee-list-by-org/:orgID', hrEmployeeTab.getEmployeeListByOrgId);
router.get('/get-employee-list-by-organisation-dep-post/:roleID/:orgID/:depID/:postID', hrEmployeeTab.getEmployeeListByOrgDepPost);
router.get('/get-post-code-by-postId/:postID/:methodOfApp', hrEmployeeTab.getPostCodeByPostId);
router.get("/get-all-hr-post-by-org/:orgID",vacancyStatusTab.getAllHrPostByOrgID);
router.get('/get-hr-postList-by-department-organisation/:departmentID/:organisationID', revisedHrPost.getPostListByDepAndOrg);

router.post("/delete-hr-post-codes",revisedHrPost.deleteHrPostCodes);
router.put("/update-hr-employee-activity",vacancyStatusTab.updateHrEmployeeActivity);
router.get('/get-employee-list-holding-designation/:orgID/:depID/:postID', hrEmployeeTab.getEmployeeListHoldingDesig);
router.get('/get-employee-transaction-history-by-org/:empMasterID/:orgID/:roleID',hrEmployeeTab.getTransactionHstryOfEmp);
router.put("/update-filled-post-activity-data",revisedHrPost.updateFilledPostActivity);

//vacancy status
router.put("/update-all-vacancies", hrEmployeeTab.updatedVaccancyPosts);
// router.get('/get-hr-postList-by-department-organisation/:departmentID/:organisationID', revisedHrPost.getPostListByDepAndOrg);
router.put("/update-post-strength-log", revisedHrPost.updatePostStrengthLog);
router.get('/get-employeeId-from-post-strength/:organisationID', revisedHrPost.getEmployeeIdFromPostStrength);
router.get('/get-post-names-by-post-code/:postCode', revisedHrPost.getPostNamesByPostCode);
router.get('/get-deputed-employees-by-organisation/:organisationId', hrEmployeeTab.getDeputedEmployeeListByOrgId);
router.get('/get-vacancy-log-details-by-postcode/:postCode', revisedHrPost.getVaccancyLogDetailsByPostCode);
router.get('/get-deputed-employees-by-orgId/:organisationId/:organisationID', hrEmployeeTab.getDeputedEmployeesByOrgId);
router.get('/get-employee-list-by-orgID/:organisationID', hrEmployeeTab.getHrEmployeeListByOrgId);
router.get('/get-composite-employee-list-by-orgID/:organisationID', hrEmployeeTab.getHrCompositeEmployeeListByOrgId);

//hr dash
router.get(`/get-hr-promotion-postcode/:postID`,vacancyStatusTab.getPromotionVacantPostCode);
router.get("/get-hr-all-employee-data/:roleID/:organisationID", hrManagementTab.getHRAllEmployeeData);
router.get('/get-hr-dashboard-content/:clusterID/:organisationID',vacancyStatusTab.getHRDashboardContentData);
router.get('/get-abolishing-post-within-month/:clusterID/:organisationID', vacancyStatusTab.getAbolishingPostWithinAmonth);
router.get('/get-emp-going-to-retire-within-six-months/:clusterID/:organisationID', vacancyStatusTab.getEmpGoingToRetireWithinSixMonths);
router.get('/get-pwbd-wise-count/:clusterID/:organisationID', vacancyStatusTab.getPwbdWiseCount);
router.get('/get-experienced-emp-count/:clusterID/:organisationID', vacancyStatusTab.getExperiencedEmpCount);
router.get('/get-gender-wise-cont-by-org/:clusterID/:organisationID', vacancyStatusTab.getGenderWiseContByOrg);
router.get('/get-department-wise-post-status/:clusterID/:organisationID', vacancyStatusTab.getDepartmentWiseEmpContByOrg);
router.get('/get-community-wise-count-by-org/:clusterID/:organisationID', vacancyStatusTab.getCommunityWiseCountByOrg);
router.get('/get-hr-dashboard-content-data-filter/:clusterID/:organisationID/:year/:month', vacancyStatusTab.getHRDashboardContentDataFiltered);
router.get('/get-department-wise-emp-count-by-org-data-filter/:clusterID/:organisationID/:year/:month', vacancyStatusTab.getDepartmentWiseEmpContByOrgFiltered);
router.get('/get-admin-hr-dashboard-content/:clusterID/:organisationID', vacancyStatusTab.getAdminHRDashboardContentData);
router.get('/get-admin-hr-gender-wise-cont-by-org/:clusterID/:organisationID', vacancyStatusTab.getAdminViewGenderWiseContByOrg);
router.get('/get-admin-view-experienced-emp-count/:clusterID/:organisationID', vacancyStatusTab.getAdminViewExperiencedEmpCount);
router.get('/get-admin-view-pwbd-wise-count/:clusterID/:organisationID', vacancyStatusTab.getAdminViewPwbdWiseCount);
router.get('/get-admin-view-community-wise-count-by-org/:clusterID/:organisationID', vacancyStatusTab.getAdminViewCommunityWiseCountByOrg);
router.get('/get-admin-view-department-wise-post-status/:clusterID/:organisationID', vacancyStatusTab.getAdminViewDepartmentWiseEmpContByOrg);

router.post('/revoke-revive-hr-vacant-post', revisedHrPost.upload.single('file'), revisedHrPost.revokeHRVacantPost);
router.get('/get-hr-mis-total-manpower-actual/:departmentID/:classID/:orgCategory/:deptCategory',hrReportTab.getTotalManpowerSanctionActual);
router.get('/get-hr-mis-gender-wise-major-port/:orgCategory',hrReportTab.getHRGenderWiseCountMajorReport);
router.get('/get-total-manpower-class-wise-report/:orgCategory/:deptCategory',hrReportTab.getTotalManpowerClassWiseReport);
router.get('/get-hr-staffing-overview-report/:orgCategory',hrReportTab.getHRStaffingOverviewReport);
router.get('/get-deputed-end-employee-data-org/:organisationID',hrEmployeeTab.getDeputedEndEmployeeData);
router.get('/get-training-details-report/:roleID/:organisationID',hrReportTab.getTrainingDetailsReport);
router.get('/get-contract-details-report/:roleID/:organisationID',hrReportTab.getContractDetailsReport);

router.post('/create-hr-training-data', hrTrainingTab.createHRTraining);
router.put('/update-hr-training-data', hrTrainingTab.updateHRTraining);
router.get('/get-hr-staff-transact-data/:organisationID/:trainingID',hrTrainingTab.getHRStaffTransactData);
router.get('/get-hr-training-data-by-org/:organisationID/:roleID',hrTrainingTab.getHRTrainingDataByOrg);
router.get('/get-hr-training-data-by-id/:trainingID',hrTrainingTab.getHRTrainingDataByID);
router.post("/submit-contract-data", hrTrainingTab.createContractData);
router.get("/get-contract-data/:roleId/:organisationID", hrTrainingTab.getContractData);
router.get("/get-official-data-by-total/:contractId/:officialTotal", hrTrainingTab.getOfficialDataByTotal);
router.get("/get-non-official-data-by-total/:contractId/:NonOffTotal", hrTrainingTab.getNonOfficialDataByTotal);
router.get("/get-contractual-data-by-id/:contractId", hrTrainingTab.getContractualDataByID);
router.get("/check-aadhar-number-existence/:aadharNumber", hrHelperTab.checkAadharNumberExistence);
router.get("/check-reference-number-existence/:refNo/:orgID", hrHelperTab.checkReferenceNumberExistence);
router.get("/get-hr-training-title-by-org/:organisationID/:trainingType", hrTrainingTab.getTrainingTitleData);
router.get("/get-hr-training-type", hrTrainingTab.getHRTrainingType);
router.get("/get-hr-assessment-data-by-org/:organisationID", vacancyStatusTab.getHRAssessmentData);
router.post("/submit-hr-vacancy-anticipation",vacancyStatusTab.saveHrVacancyAnticipation);
router.get("/get-hr-anticipated-vacancies-by-org/:departmentId/:postId/:className/:organisationID/:selectedYears", vacancyStatusTab.getAnticipatedVacanciesByOrg);
router.post("/submit-anticipated-vacancies",vacancyStatusTab.submitAnticipatedVacancies);
router.get("/get-mmt-organisation-by-cluster-id/:clusterID",vacancyStatusTab.getOrganisationByCluster);
router.put("/update-hr-post-activity",vacancyStatusTab.updateHRPostActivitiy);
router.put("/update-reason-process-not-initiated",vacancyStatusTab.updateReasonForProcessNotInitiated)
router.delete("/delete-contractual-data/:contractId/:organisationID",hrTrainingTab.deleteContracturalData);
router.get('/get-hr-training-details-data-by-org',hrTrainingTab.getHRTrainingDetailsDataByOrg);
router.delete("/delete-training-data/:trainingID/:organisationID",hrTrainingTab.deleteTrainingData);
router.get("/get-all-training-data/:userID",hrTrainingTab.getAllTrainingData);
router.get("/get-all-contractual-data/:userID",hrTrainingTab.getAllContractualData);
router.get("/get-financial-year-by-organisation/:organisationID/:financialYear",hrTrainingTab.checkFinancialYearExist);
router.put("/update-activity-data",hrManagementTab.updateActivityData);

router.get("/get-deputation-end-employees/:employeeId/:empMasterId/:empReferenceId",hrManagementTab.getDeputationEndEmployees);


router.post("/submit-report-input-1-5",hrReportInputTab.createHrReportInput1_5);
router.post("/submit-report-input-1-6",hrReportInputTab.createHrReportInput1_6);
router.post("/add-hr-vacancy-report-input-1-2",hrReportInputTab.createHrvacancyData);
router.post("/add-hr-vacancy-report-input-1-3",hrReportInputTab.createHrreport1_3);
router.post("/add-hr-vacancy-report-input-1-4",hrReportInputTab.createHrreportinput1_4);
router.post("/add-hr-vacancy-report-input-1-8",hrReportInputTab.createHrreportinput1_8);
router.post("/submit-report-input-1-7",hrReportInputTab.createHrreportinput1_7);
router.post("/add-hr-vacancy-report-input-1-1",hrReportInputTab.submitReportInput1_1);
router.get("/check-financial-hr-report-input",hrReportInputTab.checkFinancialYearExists);

//update
router.get("/hr-report-input-list/:userID", hrReportInputTab. getHrreportInputformList);
router.get('/update-Hr-report-Input/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReportdata);
router.get('/update-Hr-report-Input-update1_3/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_3data);
router.get('/update-Hr-report-Input-update1_4/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_4data);
router.get('/update-Hr-report-Input-update1_6/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_6data);
router.get('/update-Hr-report-Input-update1_8/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_8data);
router.get('/update-Hr-report-Input-update1_7/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_7data);
router.get('/update-Hr-report-Input-update1_5/:organisationID/:financialYear/:month', hrReportInputTab.getUpdatehrReport1_5data);
router.post("/update-hr-vacancy-report-input-1-1",hrReportInputTab.updateReportInput1_1);
router.get('/update-Hr-report-Input1_1/:organisationID/:financialYear', hrReportInputTab.getUpdatehrReport1_1data);
// -------------------------------------------------------------------------------------------------------
router.get('/get-hr-other-org-vacany-details/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgVacancyDetails);
router.get('/get-hr-dashboard-content-other-org/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getHRDashboardContentOtherOrgData);
router.get('/get-other-org-abolishing-post-within-month/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgAbolishingPostWithinmonth);
router.get('/get-other-org-emp-going-to-retire-within-six-months/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgEmpGoingToRetireWithinSixMonths);
router.get('/get-other-org-emp-gender-wise-count/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgGenderWiseCountByOrg);
router.get('/get-other-org-community-wise-count-by-org/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgCommunityWiseCountByOrg);
router.get('/get-other-org-ex-service-count-by-org/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgExperiencedEmpCount);
router.get('/get-other-org-pwbd-wise-count-by-org/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getOtherOrgPwbdWiseCount);
router.get('/get-last-upload-date-by-org/:organisationID', otherOrgVacancyDetailsTab.getLastUploadDate);
router.get('/get-data-from-vacancy-details/:organisationID', otherOrgVacancyDetailsTab.getDataFromVacancyDetails);
router.get('/get-file-upload-details/:organisationID', otherOrgVacancyDetailsTab.getFileUploadDetails);
router.post("/upload-vacany-details-file", otherOrgVacancyDetailsTab.upload.single('file'), otherOrgVacancyDetailsTab.fileUploadVacancyDetails);
router.delete("/delete-vacany-details-file/:fileId", otherOrgVacancyDetailsTab.deleteVacancyFile);

router.get('/get-class-org-wise/:clusterID/:organisationID', otherOrgVacancyDetailsTab.getClassOrgWise);
// REPORTS
// Parliamentar Issues
// Assurance
router.get("/assurancewingwise-report", parlimentaryReportTab.assuranceWingWiseReports);
router.get("/assurancedivisionwise-report/:wingID/", parlimentaryReportTab.assuranceDivisionWiseReports);
router.get("/getwingwise-assurance/:wingID/:parliamentaryStage", parlimentaryReportTab.getAssuranceWingWise);
router.get("/getdivisionwise-assurance/:divisionID/:parliamentaryStage", parlimentaryReportTab.getAssuranceDivisionWise);

// Matter Raised
router.get("/matterraised-wingwisereport/:issueType/", parlimentaryReportTab.parliaMatterRaisedWingWise);
router.get("/matterraised-divisionwise/:wingID/:issueType/", parlimentaryReportTab.parliaMatterDivisionWise);
router.get("/getwingwise-matter/:wingID/:parliamentaryStage/:IssueType/", parlimentaryReportTab.getMatterWingWise);
router.get("/getdivisionwise-matter/:divisionID/:parliamentaryStage/:IssueType/", parlimentaryReportTab.getMatterDivisionWise);

// PSC Report
router.get("/psnwingwise-report", parlimentaryReportTab.getPsnReportsData);
router.get("/psndivisionwise-report/:wingID/", parlimentaryReportTab.parliaPscDivisionWise);
router.get("/getwingwise-psc/:wingID/:parliamentaryStage", parlimentaryReportTab.getPscWingWise);
router.get("/getdivisionwise-psc/:divisionID/:parliamentaryStage", parlimentaryReportTab.getPscDivisionWise);

// Bill Report
router.get("/billwingwise-report", billReportTab.billWingWiseData);
router.get("/billdivisionwise-report/:wingID/", billReportTab.billDivisionWiseData);
router.get("/getbill-wingwise/:wingID/:billStage", billReportTab.getDetailBillWingWise);
router.get("/getbill-divisionwise/:divisionID/:billStage", billReportTab.getDetailBillDivisionWise);

//Attendance Report
router.get("/attendance-weekone-report/:attendanceMonth/:attendanceYear", attendanceReportTab.attendanceWeekOneReport);
router.get("/employee-attendance-weekone-report/:attendanceMonth/:attendanceYear/:week", empAttendanceReportTab.empAttendanceWeekOneReport);
router.get("/employee-attendance-weekone-detail/:Year/:Month/:Wing/:Division/:type/:week", empAttendanceReportTab.getDetailAttendanceWeekOneReport);
router.get("/employee-attendance-check", empAttendanceReportTab.getEmpAttendanceCheck);

//Court Case Report
// router.get("/all-court-case-report", arbitCourtCaseTab.getCourtCaseReport),
//     router.get("/get-detailed-case-report/:organisationid/:type/:typeofcourt", arbitCourtCaseTab.getDetailCourtCaseReport),

// Cabinet Mopsw
router.get("/cabinetmopsw-report", cabinetMopswReportTab.getMopswReport);
router.get("/cabinetmopsw-divisionwise/:wingID/", cabinetMopswReportTab.getCabinetMopswDivisionReport);
router.get("/getmopsw-wingwise/:wingID/:mopswStage", cabinetMopswReportTab.getDetailMopswWingWise);
router.get("/getmopsw-divisionwise/:divisionID/:mopswStage", cabinetMopswReportTab.getDetailMopswDivisionWise);

// Cabinet Ministry
router.get("/cabinetministry-report", cabinetMinistryReportTab.cabinetMinistryReport);
router.get("/detailministry-report/:ministryId/:cabinetMinistryStage", cabinetMinistryReportTab.getMinistryDetailsReport);

// Pendency Cabinet Ministry
router.get("/minstry-pendencyreport", cabinetMinistryReportTab.cabinetMinistryPendencyReport);
router.get("/detailministry-pendencyreport/:ministryId/:countDate", cabinetMinistryReportTab.getDetailMinistryPendencyReport);

// Audit Para
router.get("/auditparawise-report", aditParaReportTab.auditParaWiseReport);
router.get("/auditparadivision-report/:wingID/", aditParaReportTab.auditParaDivisionReport);
router.get("/getauditpara-wingwise/:wingID/:auditParaStage", aditParaReportTab.getDetailAuditParaWingWise);
router.get("/getauditpara-divisionwise/:divisionID/:auditParaStage", aditParaReportTab.getDetailAuditParaDivisionWise);

router.get("/yp-report", ypReportTab.getYoungProfessionalReport);
router.get("/ypdivision-report/:ypID/:wingID/", ypReportTab.ypDivisionWiseReport);
router.get("/wingwise-ypcandidate/:ypID/:wingID", ypReportTab.getYpWingWiseCandidate);
router.get("/divisionwise-ypcandidate/:ypID/:divisionID", ypReportTab.getYpDivisionWiseCandidate);
router.get("/yp-wing-wise-report/:ypID/:wingID", ypReportTab.getYpWingWiseReport);

router.get("/consultantapp-report", consultAppReportTab.getconsulAppReport);
router.get("/cadivision-report/:wingID/", consultAppReportTab.caDivisionWiseReport);
router.get("/wingwise-cacandidate/:wingID/", consultAppReportTab.getCaWingWiseCandidateReport);
router.get("/divisionwise-cacandidate/:divisionID/", consultAppReportTab.getCaDivisionWiseCandidateReport);

// Vip Reference 
router.get("/vipwingwise-report", vipReportTab.vipWingWiseReport);
router.get("/vipdivisionwise-report/:wingID/", vipReportTab.vipDivisionWiseReport);
router.get("/getvip-wingwise/:wingID/:vipStage", vipReportTab.getDetailVipWingWise);
router.get("/getvip-divisionwise/:divisionID/:vipStage", vipReportTab.getDetailVipDivisionWise);
router.get("/getCurrentDate", vipReportTab.getCurrentDate);

// Pendency Vip Reference
router.get("/vip-pendencywingwise-report", vipReportTab.vipPendencyWingWiseReport);
router.get("/vip-pendencydivisionwise-report/:wingID/", vipReportTab.vipPendencyDivisionWiseReport);
router.get("/getvippendency-wingwise/:wingID/:countDate", vipReportTab.getDetailVipPendencyWingWise);
router.get("/getvippendency-divisionwise/:divisionID/:countDate", vipReportTab.getDetailVipPendencyDivisionWise);

//Social Media
router.post("/create-social-media", socialmediaTab.createSocialMedia);
router.get("/socialmedia-parameter", socialmediaTab.getSocialMediaData);
router.get("/monthly-socialmedia-parameter/:userID/", socialmediaTab.getMonthlySocialParameter);
router.get("/quarterly-socialmedia-parameter/:platform/:userID/", socialmediaTab.getQuarterlySocialParameter);
router.get("/annually-socialmedia-parameter/:platform/:userID/", socialmediaTab.getAnnuallySocialMediaData);
router.get("/update-Broadcast-media-data/:mediaOutreachId", socialmediaTab.getUpdateBroadcastmediadata);
router.put('/media-outreach-data-edit',socialmediaTab.updateBroadcastmediadata);

//social Media week1 Report
router.get("/monthly-onlinemedia-report-parameter/:userID/:currentMonth/:currentFinYear/", socialmediaTab.getMonthlyOnlineReport);
router.get("/monthly-socialmedia-report-parameter/:userID/:currentMonth/:currentFinYear/", socialmediaTab.getMonthlySocialReport);
router.get("/monthly-BroadPrint-report-parameter/:userID/:platform/:currentMonth/:currentFinYear/", socialmediaTab.getMonthlyBroadPrintReport);

// Gem Procuremnt
router.get("/gem-goodsreport", gemReportTab.gemGoodsData);
// router.get("/gem-goods-monthlyreport", gemReportTab.gemGoodsMonthlyReport);
router.get("/gem-Total-monthlyreport/:gemGoodsID/:gemGoodsFinYear/:orgId", gemReportTab.gemTotalMonthlyReport);
router.get("/gem-goods-monthlyreport/:goodsGemID", gemReportTab.gemGoodsMonthlyReport);
router.get("/gem-service-monthlyreport/:serviceGemID", gemReportTab.gemServiceMonthlyReport);
router.get("/gem-works-monthlyreport/:worksGemID", gemReportTab.gemWorkMonthlyReport);

router.get("/gem-servicereport", gemReportTab.gemServiceData);
router.get("/gem-worksreport", gemReportTab.gemWorksData);
router.get("/gem-report/:selectedYear",gemReportTab.getGemReport);
// MIV
router.post("/mivdetailed-report/", mivReportTab.mivDetailedData);
router.post("/miv-theme-detailed-report/", mivReportTab.mivThemeDetailedData); //MIV THEME WISE REPORT
router.get("/mivabstract-report/:userID", mivReportTab.mivAbstractData);
router.get("/miv-document/download/:filename", mivReportTab.downloadDocument);
//Theme Wise MIV Report:
router.get("/get-mmt-Theme-Values/", mivReportTab.getmmtThemeValues);
router.get("/themewise-mivabstract-report/:userID", mivReportTab.themeWiseMivAbstractData);
//Delete Minuintes of meeting
router.delete("/meeting/delete/:id", mivReportTab.deleteMeeting);

// HR
router.get("/hrdetailed-abstarct-report/:organisationId/:classId", hrReportTab.hrDetailedAbstarctReport);
router.get("/hrabstarct-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrAbstarctReport);
// router.post("/hroverview-report/", hrReportTab.hrOverviewReport);
router.get("/hrfirst-report/:orgCatDrop/:orgDrop/:financialDrop", hrReportTab.hrFirstReport);
router.get("/hrdetailed-report/:organisationID/:type/:financialDrop", hrReportTab.detailedHrReport);
router.get("/hrsecond-report/:orgCatDrop/:orgDrop", hrReportTab.hrSecondReport);
router.get("/hrdetailed-revival-report/:organisationID/:classID/:type/:postID", hrReportTab.hrDetailedRevivalReport);
router.get("/hrdetailed-status-report/:organisationID/:classID/:type/:postID", hrReportTab.hrDetailedStatusReport);
router.get("/hrdetailed-status-filling-report/:organisationID/:type", hrReportTab.detailedHrStatusFillingReport);

router.get("/hrfirst-report-other-org/:roleID/:organisationID", hrReportInputTab.hrFirstReportOtherOrg);
router.get("/hrsecond-report-other-org/:roleID/:organisationID", hrReportInputTab.hrSecondReportOtherOrg);
router.get("/hrsixth-report-other-org/:roleID/:organisationID", hrReportInputTab.hrSixthReportOtherOrg);
router.get("/hrseventh-report-other-org/:roleID/:organisationID", hrReportInputTab.hrSeventhReportOtherOrg);
router.get("/hreighth-report-other-org/:roleID/:organisationID", hrReportInputTab.hrEighthReportOtherOrg);
router.get("/hrabstarct-report-other-org/:roleID/:organisationID",hrReportInputTab.hrAbstarctReportOtherOrg);
router.get("/hrfourth-report-other-org/:roleID/:organisationID",hrReportInputTab.hrFourthReportOtherOrg);
router.get("/hrfifth-report-other-org/:roleID/:organisationID",hrReportInputTab.hrFifthReportOtherOrg);
router.get("/hr-report-input-list/:userID", hrReportInputTab. getHrreportInputformList);

// Capex report 
router.get("/capex-report/:selectedYear", capexReportTab.capexReportData);
router.get("/hrfirst-report/:orgCatDrop/:orgDrop/:financialDrop", hrReportTab.hrFirstReport);
router.get("/hrsecond-report/:orgCatDrop/:orgDrop", hrReportTab.hrSecondReport);
router.get("/hrfourth-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrFourthReport);
router.get("/hrfourth-detailed-report/:organisationId/:classId", hrReportTab.hrFourthDetailedReport);
router.get("/hrfifth-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrFifthReport);
router.get("/hrfifth-detailed-report/:organisationId/:classId", hrReportTab.hrFifthDetailedReport);
router.get("/hrsixth-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrSixthReport);
router.get("/hrsixth-detailed-report/:organisationId/:classId", hrReportTab.hrSixthDetailedReport);
router.get("/hrseventh-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrSeventhReport);
router.get("/hrseventh-detailed-report/:organisationId/:classId", hrReportTab.hrSeventhDetailedReport);
router.get("/hreighth-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrEighthReport);
router.get("/hreighth-detailed-report/:organisationId/:classId", hrReportTab.hrEighthDetailedReport);
router.get("/hrnineth-report/:orgCatDrop/:orgDrop/:classDrop", hrReportTab.hrNinethReport);
router.get("/hrnineth-detailed-report/:organisationId/:classId", hrReportTab.hrNinethDetailedReport);

router.get("/hrdrilled-dr-report/:organisationID/:classID/:postID", hrReportTab.hrDrilledDirectRecruitmentReport);
router.get("/hrdrilled-p-report/:organisationID/:classID/:postID", hrReportTab.hrDrilledPromotionReport);
router.get("/hrdrilled-d-report/:organisationID/:classID/:postID", hrReportTab.hrDrilledDeputationReport);
router.get("/hrdrilled-cm-report/:organisationID/:classID/:postID", hrReportTab.hrDrilledCompositeMethodReport);
router.get("/hrdrilled-transfer-report/:organisationID/:classID/:postID", hrReportTab.hrDrilledTransferReport);

router.get("/hrdrilled-dr-complete-report/:organisationID/:classID/:postID/:type", hrDrilledReportTab.hrDrilledDirectRecruitmentCompleteReport);
router.get("/hrdrilled-p-complete-report/:organisationID/:classID/:postID/:type", hrDrilledReportTab.hrDrilledPromotionCompleteReport);

router.get("/hrdrilled-d-complete-report/:organisationID/:classID/:postID/:type", hrDrilledReportTab.hrDrilledDeputationCompleteReport);
router.get("/hrdrilled-cm-complete-report/:organisationID/:classID/:postID/:type", hrDrilledReportTab.hrDrilledCompositeMethodCompleteReport);
router.get("/hr-anticipated-report-data-by-org/:organisationID/:classID/:methodOfAppointment",hrReportTab.hrAnticipatedReportData);
router.get("/hr-drilled-down-date-arise-report/:organisationID/:classID/:methodOfAppointment",hrDrilledReportTab.hrDrilledForMethodofAppDateAriseReport);
router.get("/hr-drilled-down-date-risen-report/:organisationID/:classID/:methodOfAppointment",hrDrilledReportTab.hrDrilledForMethodofAppVacancyRisenReport);
router.get("/hr-drilled-filling-up-vacancies-report/:organisationID/:classID/:postID",hrDrilledReportTab.hrDrilledFillingUpVacanciesReport);
router.get("/hr-drilled-occurred-during-fy-report/:organisationID/:classID/:postID",hrDrilledReportTab.hrDrilledOccurredDuringFYReport);
router.get("/hr-drilled-total-fill-up-vacancies-report/:organisationID/:classID/:postID",hrDrilledReportTab.hrdrilledTotalFillUpVacanciesReport);
router.get("/hr-drilled-fill-up-vacancies-in-moa-wise-report/:organisationID/:classID/:methodOfAppointment",hrDrilledReportTab.drilledDownFillupVacanciesinMOAwise);
router.get("/hr-drilled-balance-fill-to-be-in-moa-wise-report/:organisationID/:classID/:methodOfAppointment",hrDrilledReportTab.drilledDownBalanceToBeFillupMOAwise);

// ---------------------------------------------------------- Project Report --------------------------------------------------
// Report 1.0
router.get("/proposalhistory-report/:isSagarmalaFunded", proposalHistoryReportTab.projectHistoryAbstractData);
router.get("/getdetail-history-data/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded", proposalHistoryReportTab.getDetailsHistoryData);
router.get("/get-total-history-data/:modOfImp/:columnNo/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", proposalHistoryReportTab.getGrandTotalHistoryData);

// Report 1.1
router.get("/proposalabstract-report/:isSagarmalaFunded", proposalReportTab.proposalAbstractReportData);
router.get("/getdetail-proposal/:organisationID/:proposalStage/:modOfImp/:isSagarmalaFunded", proposalReportTab.getDataProposalReportStageWise);
router.get("/get-stagewise-grandtotal/:proposalStage/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", proposalReportTab.getGrandTotalProposalStagewise);
router.get("/getdetailtotal-proposal/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded", proposalReportTab.getDetailsProposalCol4);
router.get("/get-proposalcolum-grandtotal/:modOfImp/:columnNo/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", proposalReportTab.getGrandTotalProposalCol4);

// Report 1.2
router.get("/undertendering-report/:isSagarmalaFunded", underTenderingReportTab.underTenderingReport);
router.get("/getdetail-undertendering/:organisationID/:subStageId/:modOfImp/:isSagarmalaFunded", underTenderingReportTab.getDetailsUTStageWise);
router.get("/getdetailtotal-ut-stagewise/:subStageId/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underTenderingReportTab.getGrandTotalUTStageWise);

router.get("/getdetailtotal-ut/:organisationID/:modOfImp/:isSagarmalaFunded", underTenderingReportTab.getDetailsUnderTenderingcol4);
router.get("/get-grandtotal-utcol4/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underTenderingReportTab.getGrandTotalUTcol4);

router.get("/getdetail-utbeginingstage/:organisationID/:modOfImp/:isSagarmalaFunded", underTenderingReportTab.getDetailsUTbeginStage);
router.get("/get-grandtotal-utbeginingstage/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underTenderingReportTab.getGrandTotalUTbeginStage);

// Report 1.3
router.get("/underimplementation-report/:isSagarmalaFunded", underImplementationReportTab.underImplementationReport);
router.get("/getdetail-uistage1/:organisationID/:milestoneId/:modOfImp/:isSagarmalaFunded", underImplementationReportTab.getDetailsUnderImpStage1Report);
router.get("/getdetailtotal-uistage1/:milestoneId/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underImplementationReportTab.getDetailsUIStage1GrTotal);
router.get("/getdetailtotal-uistage/:organisationID/:subStage/:modOfImp/:isSagarmalaFunded", underImplementationReportTab.getDetailsUnderImpColmn45);
router.get("/get-grandtotal-ui/:subStage/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underImplementationReportTab.getGrandTotalUIColmn45);
router.get("/getdetail-underimplementation/:organisationID/:milestoneId/:modOfImp/:isSagarmalaFunded", underImplementationReportTab.getDetailsUIColumnBtoFReport);
router.get("/getdetailtotal-ui-column/:milestoneId/:modOfImp/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", underImplementationReportTab.getDetailsGrTotalUIColumnBtoF);
router.get("/ui-projectimage/download/:filename/:subProjectID", underImplementationReportTab.uiReportImageDownload);

// Report 1.4
router.get("/financialprogress-report/:isSagarmalaFunded", financialProgressReportTab.financialProgressReport);
router.get("/getDetail-financialprogress/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded", financialProgressReportTab.getDetailsFinancialReport);
router.get("/get-grandtotal-financialreport/:modOfImp/:columnNo/:isSagarmalaFunded/:orgCategoryFilter/:orgFilter", financialProgressReportTab.getGrandTotalFinancialReport);

//Report 1.0 IWAI
router.get("/iwai-proposalhistory-report/:orgCate/:organisation/:category/:isSagarmalaFunded", proposalHistoryReportTab.iwaiProjectHistoryAbstractData);
router.get("/iwai-getdetail-history-data/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId", proposalHistoryReportTab.getIwaiDetailsHistoryData);

// Report 1.1
router.get("/iwai-proposalabstract-report/:orgCate/:organisation/:category/:isSagarmalaFunded", proposalReportTab.iwaiProposalAbstractReportData);
router.get("/iwai-getdetailtotal-proposal/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId/:stageId", proposalReportTab.iwaigetDetailsProposal);

// Report 1.2
router.get("/iwai-undertendering-report/:orgCate/:organisation/:category/:isSagarmalaFunded", underTenderingReportTab.iwaiUnderTenderingReport);
// router.get("/iwai-detail-ut-othercolumn/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId", underTenderingReportTab.iwaiUT2BOtherColumn);
// router.get("/iwai-detail-ut-stagebegin/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId/:stageId", underTenderingReportTab.iwaiUT2BOtherColumn);

// Report 1.3
router.get("/iwai-underimplementation-report/:orgCate/:organisation/:category/:isSagarmalaFunded", underImplementationReportTab.iwaiUnderImplementationReport);
// router.get("/iwai-getdetail-ui/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId", underImplementationReportTab.iwaiUIgetDetail);

// Report 1.4
router.get("/iwai-financialprogress-report/:orgCate/:organisation/:category/:isSagarmalaFunded", financialProgressReportTab.iwaiFinancialProgressReport);
router.get("/iwai-getDetail-financialprogress/:organisationID/:modOfImp/:columnNo/:isSagarmalaFunded/:projectId", financialProgressReportTab.getDetailsIwaiFinancialReport);


// projectReport
// router.get("/delayed-project-report", projectReport.delayedProjectReportCount);
// router.get("/delayed-project-report1/:organisationID/:moi", projectReport.delayedProjectReport1);


// --------------------------------------------------- Lumpsum Report ------------------------------------------------------
router.get('/lumpsum-report', lumpsumReportTab.lumpsumReport);


//financial parameters for major ports
router.post("/financial-parameter", financialParameterTab.createFinancialParameter);
router.get("/financial-parameter/:userID", financialParameterTab.getFinancialParameter);
router.get("/monthly-financial-parameter/:userID", financialParameterTab.getMonthlyFinancialParameter);
router.get("/quarterly-financial-parameter/:userID", financialParameterTab.getQuarterlyFinancialParameter);
router.get("/annually-financial-parameter/:userID", financialParameterTab.getAnnuallyFinancialParameter);
router.get("/get-organisation-name/:organisationID", financialParameterTab.getOrganisationName);
//financial Report for major ports
router.post("/filtered-financial-report", financialParameterTab.getFilteredFinancialReport);
//Financial Chart Data
router.get("/Financial-Chart-Data/:getCurrentFinancialYear", financialParameterTab.getFinancialChartData);
router.get("/Financial-Fin-Year-Chart-Data", financialParameterTab.getFinancialFinYearChartData);
router.post("/financial-mopsw-parameter", financialParameterTab.createMopswFinancialParameters);
router.get("/kpi-finanacial-data-update/:finanacialparameterID", financialParameterTab.getKpifinancialparameterData);
router.post("/update-financial-data-parameter", financialParameterTab.updateFinanacialkpidataupdate);

//KPI Financial Target
router.get("/get-monthly-financial-target", financialParameterTab.getMonthlyFinancialTargetData);
router.get("/get-quaterly-financial-target", financialParameterTab.getQuaterlyFinancialTargetData);
router.get("/get-annually-financial-target", financialParameterTab.getAnnuallyFinancialTargetData);

// -------------------------------------------kpi-----------------------------------------------------
router.post('/add-kpi2-1-1', dgsTabList.createDgsKpi2_1_1Data);
router.get("/previousCumulative-2-1-data/:year/:month", dgsTabList.getPreviousCumulativeData);
router.get("/kpi2-1-list", dgsTabList.getKpi2_1_List);
router.get("/getedit-2-1-data/:year/:month", dgsTabList.getUpdateMmd_2_1Data);
router.put("/edit-2-1-data", dgsTabList.editDgsKpi2_1Data);

router.get("/kpi2-2-list", KpiDGS_2_2_Tab.getKpi2_2_List);
router.get("/checkData-2-2-data/:applicationNumber", KpiDGS_2_2_Tab.checkData_2_2);
router.post("/add-2-2-1-data", KpiDGS_2_2_Tab.addDgsKpi2_2_1Data);
router.put("/edit-2-2-1-data", KpiDGS_2_2_Tab.editDgsKpi2_2_1Data);

router.get("/kpi2-2-template", KpiDGS_2_2_Tab.downloadSampleDocument);
router.get("/getedit-2-2-data/:uniqueAppId", KpiDGS_2_2_Tab.getUpdateMmd_2_2Data);
router.get("/kpi2-2-fa-list", KpiDGS_2_2_Tab.getKpi2_2_FA_List);
router.get("/checkData-2-2-fa-data/:fundApplicationNumber", KpiDGS_2_2_Tab.checkData_2_2_Fa);
router.post("/add-2-2-fa-data", KpiDGS_2_2_Tab.addDgsKpi2_2_Fa_Data);
router.put("/edit-2-2-fa-data", KpiDGS_2_2_Tab.editDgsKpi2_2_Fa_Data);

router.get("/getedit-2-2-fa/:fundAppId", KpiDGS_2_2_Tab.getUpdateMmd_2_2Fa_Data);

router.get("/kpi2-2-fa-template", KpiDGS_2_2_Tab.downloadFASampleDocument);

// 2.3.2
router.get("/get_addkpi2_3_masterdata/:year/:month/:type", KpiDGS_2_3_Tab.getAddKpi2_3_Masterdata);
router.get("/get_editkpi2_3_masterdata/:year/:month/:typeId", KpiDGS_2_3_Tab.getEditKpi2_3_Masterdata);

router.get("/checkData-2-3-2-data/:year/:month/:onType", KpiDGS_2_3_Tab.checkData_2_3_2);
router.post('/add-kpi2-3-2', KpiDGS_2_3_Tab.createDgsKpi2_3_2Data);
router.get("/kpi2-3-2-list", KpiDGS_2_3_Tab.getKpi2_3_2_List);

// MoPSWTracker
router.get("/tracker-list", mopswTracker.trackerList);

router.get("/checkData-tracker/:year/:month/", mopswTracker.checkDataMopswTracker);
router.get("/get_addtracker_masterdata/:year/:month", mopswTracker.getAddTrackerMasterdata);
router.post('/add-mopswtracker', mopswTracker.createMopswTracker);
// Report 
router.get('/get-mopswtracker-report', mopswTracker.getmopswTrackermonthlyReport);

// 2.3.1
router.get("/checkData-2-3-1-data/:year/:month", KpiDGS_2_3_Tab.checkData_2_3_1);
router.post('/add-kpi2-3-1', KpiDGS_2_3_Tab.createDgsKpi2_3_1Data);
router.get("/kpi2-3-1-list", KpiDGS_2_3_Tab.getKpi2_3_1_List);
router.get("/getedit-2-3-1-data/:year/:month", KpiDGS_2_3_Tab.getUpdateMmd_2_3_1Data);
router.put("/edit-2-3-1-data", KpiDGS_2_3_Tab.editDgsKpi2_3_1Data);

//2.6.1
router.get("/checkData-2-6-1-data/:year/:month/:mmdName", dgsTab.checkData_2_6_1);
router.post('/add-kpi2-6-1', dgsTab.createDgsKpi2_6_1Data);
router.get("/kpi2-6-1-list", dgsTabList.getKpi2_6_1_List);
router.get("/getedit-2-6-1-data/:year/:month/:mmdId", dgsTabList.getUpdateMmd_2_6_1Data);
router.put("/edit-2-6-1-data", dgsTabList.editDgsKpi2_6_1Data);
router.delete("/delete-2-6-1-data/:year/:month/:mmdId", dgsTabList.deleteDgsKpi2_6_1Data);

//2.6.2
router.get("/checkData-2-6-2-data/:year/:month", dgsTab.checkData_2_6_2);
router.post('/add-kpi2-6-2-data', dgsTab.createDgsKpi2_6_2Data);
router.get("/kpi2-6-2-list", dgsTabList.getKpi2_6_2_List);
router.get("/getedit-2-6-2-data/:year/:month", dgsTabList.getUpdate_2_6_2Data);
router.put("/edit-2-6-2-data", dgsTabList.editDgsKpi2_6_2Data);
router.delete("/delete-2-6-2-data/:year/:month", dgsTabList.deleteDgsKpi2_6_2Data);
//2.7.1
router.get("/checkData-2-7-1-data/:year/:month/:mmdName", dgsTab.checkData_2_7_1);
router.post('/add-kpi2-7-1', dgsTab.createDgsKpi2_7_1Data);
router.get("/kpi2-7-1-list", dgsTabList.getKpi2_7_1_List);
router.get("/getedit-2-7-1-data/:year/:month/:mmdId", dgsTabList.getUpdateMmd_2_7_1Data);
router.put("/edit-2-7-1-data", dgsTabList.editDgsKpi2_7_1Data);
router.delete("/delete-2-7-1-data/:year/:month/:mmdId", dgsTabList.deleteMmd_2_7_1Data);

// 2.7.2
router.get("/checkData-2-7-2-data/:year/:month", dgsTab.checkData_2_7_2);
router.post('/add-kpi2-7-2-data', dgsTab.createDgsKpi2_7_2Data);
router.get("/kpi2-7-2-list", dgsTabList.getKpi2_7_2_List);
router.get("/getedit-2-7-2-data/:year/:month", dgsTabList.getUpdate_2_7_2Data);
router.put("/edit-2-7-2-data", dgsTabList.editDgsKpi2_7_2Data);
router.delete("/delete-2-7-2-data/:year/:month", dgsTabList.deleteDgsKpi2_7_2Data);

router.get("/get-2-8-1-report", KpiDGS_2_8_Tab.getKpi2_8_1_report);
router.get("/get-2-8-2-report", KpiDGS_2_8_Tab.getKpi2_8_2_report);
router.get("/get-2-8-3-report", KpiDGS_2_8_Tab.getKpi2_8_3_report);

router.get("/get-2-9-1-report", KpiDGS_2_9_Tab.getKpi2_9_1_report);
router.get("/get-2-9-2-report", KpiDGS_2_9_Tab.getKpi2_9_2_report);
router.get("/get-2-9-3-report", KpiDGS_2_9_Tab.getKpi2_9_3_report);

router.get("/get-2-9-1-capacity-utilisation", KpiDGS_2_9_Tab.getKpi2_9_1_capacity_utilisation);
router.post("/add-2-9-1-capacity-utilisation", KpiDGS_2_9_Tab.addKpi2_9_1_capacity_utilisation);
router.get("/get-2-9-4-placement-record", KpiDGS_2_9_Tab.getKpi2_9_4_placement_record);
router.get("/get-capacity-utilisation-list", KpiDGS_2_9_Tab.getCapacityUtilisationList);
router.get("/get-capacity-utilisation-details/:year/:month", KpiDGS_2_9_Tab.getCapacityUtilisationDetails);
router.post("/update-capacity-utilisation", KpiDGS_2_9_Tab.updateCapacityUtilisation);

router.post("/add-2-9-4-placement-record", KpiDGS_2_9_Tab.addKpi2_9_4_placement_record);
router.get("/get-placement-record-list", KpiDGS_2_9_Tab.getPlacementRecordList);
router.get("/get-placement-record-details/:year/:month", KpiDGS_2_9_Tab.getPlacementRecordDetails);
router.post("/edit-2-9-4-placement-record", KpiDGS_2_9_Tab.editKpi2_9_4_placement_record);
router.get("/get-2-9-1-4-report", KpiDGS_2_9_Tab.getKpi2_9_1_4_report);


router.post('/passenger', passengerTab.addPassengerData);
router.get('/passenger-data', passengerTab.getPassengerData);
router.get('/monthly-passenger-data', passengerTab.getMonthlyPassengerData);
router.get('/quarterly-passenger-data', passengerTab.getQuarterlyPassengerData);
router.get('/annually-passenger-data', passengerTab.getAnnuallyPassengerData);

//roro
router.post('/Roro', RoroTab.addRoroData);
router.get('/Roro-data', RoroTab.getRoroData);
router.get('/monthly-Roro-data', RoroTab.getMonthlyRoroData);
router.get('/quarterly-Roro-data', RoroTab.getQuarterlyRoroData);
router.get('/annually-Roro-data', RoroTab.getAnnuallyRoroData);

//RoPax
router.post('/RoPax', RoPaxTab.addRoPaxData);
router.get('/RoPax-data', RoPaxTab.getRoPaxData);
router.get('/monthly-RoPax-data', RoPaxTab.getMonthlyRoPaxData);
router.get('/quarterly-RoPax-data', RoPaxTab.getQuarterlyRoPaxData);
router.get('/annually-RoPax-data', RoPaxTab.getAnnuallyRoPaxData);

//CargoVessel
router.post('/Cargo-Vessel', CargoVesselTab.addCargoVessel);
router.get('/Cargo-Vessel-data', CargoVesselTab.getCargoVessel);
router.get('/monthly-Cargo-Vessel-data', CargoVesselTab.getMonthlyCargoVessel);
router.get('/quarterly-Cargo-Vessel-data', CargoVesselTab.getQuarterlyCargoVessel);
router.get('/annually-Cargo-Vessel-data', CargoVesselTab.getAnnuallyCargoVessel);

//SurveyVessel
router.post('/Survey-Vessel', SurveyVesselTab.addSurveyVessel);
router.get('/Survey-Vessel-data', SurveyVesselTab.getSurveyVessel);
router.get('/monthly-Survey-Vessel-data', SurveyVesselTab.getMonthlySurveyVessel);
router.get('/quarterly-Survey-Vessel-data', SurveyVesselTab.getQuarterlySurveyVessel);
router.get('/annually-Survey-Vessel-data', SurveyVesselTab.getAnnuallySurveyVessel);

//Cargo operation
router.post('/cargo-operations-data', cargoOperationController.createCargoOperationsData);
router.get('/cargo-operations-data', cargoOperationController.getCargoOperationsData);
router.get('/monthly-cargo-operations-data', cargoOperationController.getMonthlyCargoOperationsData);
router.get('/quarterly-cargo-operations-data', cargoOperationController.getQuarterlyCargoOperationsData);
router.get('/annually-cargo-operations-data', cargoOperationController.getAnnuallyCargoOperationsData);

// cruise passenger data
router.post("/cruise-passenger-data", cruiseTab.createCruisePassengerData);
router.get("/cruise-passenger-data", cruiseTab.getCruisePassengerData);
router.get("/monthly-cruise-data", cruiseTab.getMonthlyCruiseData);
router.get("/quarterly-cruise-data", cruiseTab.getQuarterlyCruiseData);
router.get("/annually-cruise-data", cruiseTab.getAnnuallyCruiseData);
router.get('/get-cruie-passengers-target', TrafficVesselTab.getCruiepassengersTargetData);

//vessel traffic Dashbord
router.get("/get-curise-chart/:orgID/:monthId/:finYear", TrafficVesselTab.getCurisePassengerChart);

//Digital portals
router.post('/digital-data', digitalPortalTab.createDigitalData);
router.get('/digital-data', digitalPortalTab.getDigitalData);
router.get('/monthly-digital-data', digitalPortalTab.getMonthlyDigitalData);
router.get('/quarterly-digital-data', digitalPortalTab.getQuarterlyDigitalData);
router.get('/annually-digital-data', digitalPortalTab.getAnnuallyDigitalData);

//Dredgers
router.post("/dredgers-data", DredgersTab.createDredgersData);
router.get("/dredgers-data", DredgersTab.getDredgersData);
router.get("/monthly-dredgers-data", DredgersTab.getMonthlyDredgersData);
router.get("/quarterly-dredgers-data", DredgersTab.getQuarterlyDredgersData);
router.get("/annually-dredgers-data", DredgersTab.getAnnuallyDredgersData);

//surveyvessel
router.post("/survey-vessel-data", SurveyVesselController.createSurveyVesselData);
router.get("/survey-vessel-data", SurveyVesselController.getSurveyVesselData);
router.get("/monthly-survey-vessel-data", SurveyVesselController.getMonthlySurveyVesselData);
router.get("/quarterly-survey-vessel-data", SurveyVesselController.getQuarterlySurveyVesselData);
router.get("/annually-survey-vessel-data", SurveyVesselController.getAnnuallySurveyVesselData);

//Vessel movement-Iwai
router.post('/iwai-vessel-movement-data', iwaiVesselMovementController.addiwaiVesselMovementData);
router.get('/iwai-vessel-movement-data', iwaiVesselMovementController.getiwaiVesselMovementData);
router.get('/monthly-iwai-vessel-movement-data', iwaiVesselMovementController.getMonthlyiwaiVesselMovementData);
router.get('/quarterly-iwai-vessel-movement-data', iwaiVesselMovementController.getQuarterlyiwaiVesselMovementData);
router.get('/annually-iwai-vessel-movement-data', iwaiVesselMovementController.getAnnuallyiwaiVesselMovementData);

//passenger movement-terminal
router.post("/passenger-movement-data", PassengerMovementController.createPassengerMovementData);
router.get("/passenger-movement-data", PassengerMovementController.getPassengerMovementData);
router.get("/monthly-passenger-movement-data", PassengerMovementController.getMonthlyPassengerMovementData);
router.get("/quarterly-passenger-movement-data", PassengerMovementController.getQuarterlyPassengerMovementData);
router.get("/annually-passenger-movement-data", PassengerMovementController.getAnnuallyPassengerMovementData);

//passenger movement-Iwai
router.post('/iwai-passenger-movement-data', iwaiPassengerController.addiwaiPassengerMovementData);
router.get('/iwai-passenger-movement-data', iwaiPassengerController.getiwaiPassengerMovementData);
router.get('/monthly-iwai-passenger-movement-data', iwaiPassengerController.getMonthlyiwaiPassengerMovementData);
router.get('/quarterly-iwai-passenger-movement-data', iwaiPassengerController.getQuarterlyiwaiPassengerMovementData);
router.get('/annually-iwai-passenger-movement-data', iwaiPassengerController.getAnnuallyiwaiPassengerMovementData);

//cargo-terminal
router.post('/cargo-handled-data', cargoHandledController.addCargoHandledData);
router.get('/cargo-handled-data', cargoHandledController.getCargoHandledData);
router.get('/monthly-cargo-handled-data', cargoHandledController.getMonthlyCargoHandledData);
router.get('/quarterly-cargo-handled-data', cargoHandledController.getQuarterlyCargoHandledData);
router.get('/annually-cargo-handled-data', cargoHandledController.getAnnuallyCargoHandledData);

//Terminals / Jetties (Vessels)
router.post('/jetties-vessels-data', JettiesVesselsController.addJettiesVesselsData);
router.get('/jetties-vessels-data', JettiesVesselsController.getJettiesVesselsData);
router.get('/monthly-jetties-vessels-data', JettiesVesselsController.getMonthlyJettiesVesselsData);
router.get('/quarterly-jetties-vessels-data', JettiesVesselsController.getQuarterlyJettiesVesselsData);
router.get('/annually-jetties-vessels-data', JettiesVesselsController.getAnnuallyJettiesVesselsData);

//Vessel Movement
router.post('/vessel-movement-data', vesselMovementTab.addVesselMovementData);
router.get('/vessel-movement-data', vesselMovementTab.getVesselMovementData);
router.get('/monthly-vessel-movement-data', vesselMovementTab.getMonthlyVesselMovementData);
router.get('/quarterly-vessel-movement-data', vesselMovementTab.getQuarterlyVesselMovementData);
router.get('/annually-vessel-movement-data', vesselMovementTab.getAnnuallyVesselMovementData);

//Passenger Movement 
router.post('/passenger-terminal-data', PassengerTerminalController.addPassengerTerminalData);
router.get('/passenger-terminal-data', PassengerTerminalController.getPassengerTerminalData);
router.get('/monthly-passenger-terminal-data', PassengerTerminalController.getMonthlyPassengerTerminalData);
router.get('/quarterly-passenger-terminal-data', PassengerTerminalController.getQuarterlyPassengerTerminalData);
router.get('/annually-passenger-terminal-data', PassengerTerminalController.getAnnuallyPassengerTerminalData);

// cargo-terminal
router.post('/cargo-terminal-data', cargoTerminalController.addCargoTerminalData);
router.get('/cargo-terminal-data', cargoTerminalController.getCargoTerminalData);
router.get('/monthly-cargo-terminal-data', cargoTerminalController.getMonthlyCargoTerminalData);
router.get('/quarterly-cargo-terminal-data', cargoTerminalController.getQuarterlyCargoTerminalData);
router.get('/annually-cargo-terminal-data', cargoTerminalController.getAnnuallyCargoTerminalData);


//Major Ports Data
router.post('/KPI-Major-Ports-data/', MajorPorts.addMajorPortsData);
router.get('/KPI-Major-Ports-data', MajorPorts.getMajorPortsData);
router.get('/monthly-major-ports-data/:userID', MajorPorts.getMonthlyMajorPortsData);
router.get('/quarterly-major-ports-data/:userID', MajorPorts.getQuarterlyMajorPortsData);
router.get('/annually-major-ports-data/:userID', MajorPorts.getAnnuallyMajorPortsData);

//Traffic
// router.post("/traffic-data", TrafficTab.addTrafficData);
// router.get("/traffic-data/:userID", TrafficTab.getTrafficData);
// router.get("/monthly-traffic-data/:userID", TrafficTab.getMonthlyTrafficData);
// router.get("/quarterly-traffic-data/:userID", TrafficTab.getQuarterlyTrafficData);
// router.get("/annually-traffic-data/:userID", TrafficTab.getAnnuallyTrafficData);

router.get('/get-fiscal-year-target-data', TrafficTab.getFiscalYearTargetData);
router.post('/submit-fiscal-year-target-data', TrafficTab.submitFiscalYearTargetData);
router.get('/get-fiscal-year-target-list', TrafficTab.getFiscalYearTargetList);
router.post('/update-fiscal-year-target-data', TrafficTab.updateFiscalYearTargetData);
router.post('/submit-commodity-data', TrafficTab.submitCommodityData);
router.get('/get-commodity-data', TrafficTab.getCommodityData);
router.get('/get-commodities-by-group', TrafficTab.getCommoditiesByGroup);
router.get('/get-traffic-actual-data', TrafficTab.getTrafficActualData);
router.get('/get-roro-traffic-actual-data', TrafficTab.getrorotrafficData);
router.get('/get-traffic-commodity-groups', TrafficTab.getTrafficCommodityGroup);
router.get('/get-traffic-commodities', TrafficTab.getTrafficCommodities);

router.get('/get-kpi-traffic-dashboard/:organisationID/:fy/:months',TrafficTab.getKPITrafficDashboard);
router.get('/get-kpi-traffic-commodies-wise-dashboard/:organisationID/:fy/:months',TrafficTab.getKPICargoDashboard);
router.get('/get-top-performing-ports/:kpi/:fy',TrafficTab.getTopPerformingPorts);
router.get('/get-least-performing-ports/:kpi/:fy',TrafficTab.getLeastPerformingPorts);
router.get('/detailed-kpi-card-dashboard',TrafficTab.detailedKPITrafficCardDashboard);
router.get('/detailed-kpi-cargo-card-dashboard',TrafficTab.detailedKPICargoCardDashboard);
router.get('/get-all-traffic-dashboard-kpis/:organisationID/:fy/:months',TrafficTab.getAllTrafficDashboardKPIs);
router.get('/detailed-all-traffic-dashboard-kpi',TrafficTab.detailedAllTrafficDashboardKPIs);

router.get('/detailed-kpi-financial-card-dashboard',financialParameterTab.detailedKPIFinancialCardDashboard);
router.get('/get-kpi-financial-dashboard/:organisationID/:fy/:months',financialParameterTab.getKPIFinancialDashboard);
// router.get('/get-kpi-cargo-dashboard/:organisationID/:fy/:months',financialParameterTab.getKPIcargoDashboard);
router.get('/get-top-financial-performing-ports/:kpi/:fy',financialParameterTab.getTopFinancialPerformingPorts);
router.get('/get-least-financial-performing-ports/:kpi/:fy',financialParameterTab.getLeastFinancialPerformingPorts);

router.get('/get-total-traffic-k-1-1-1-report', TrafficReportTab.getTotalTrafficReport_k_1_1_1);
router.get('/get-container-traffic-k-1-1-1-a-report', TrafficReportTab.getContainerTrafficReport_k_1_1_1_a);

router.get('/get-month-traffic-trend-data', TrafficTab.getMonthTrafficTrendData);
router.get('/get-year-traffic-trend-data', TrafficTab.getYearTrafficTrendData);

//vessel traffic
router.get('/get-vessel-traffic-data', TrafficVesselTab.getVesselTrafficData);
router.post('/submit-vessel-traffic-data', TrafficVesselTab.submitVesselTrafficData);
router.post('/update-vessel-traffic-data', TrafficVesselTab.updateVesselTrafficData);
router.post('/submit-target-data', TrafficVesselTab.submitTargetData);
router.get('/get-target-data', TrafficVesselTab.getTargetData);
router.post('/update-target-data', TrafficVesselTab.updateTargetData);
router.get('/get-yearly-vessel-traffic-list', TrafficVesselTab.getYearlyVesselTrafficList);
router.get('/get-monthly-vessel-traffic-list', TrafficVesselTab.getMonthlyVesselTrafficList);

//vessel traffic reports
router.get('/get-vessel-traffic-k-1-10-1-report', TrafficVesselReportTab.getVesselTraffic_k_1_10_1_Report);
router.get('/get-vessel-traffic-k-1-10-2-report', TrafficVesselReportTab.getVesselTraffic_k_1_10_2_Report);
router.get('/get-vessel-traffic-k-1-10-3-report', TrafficVesselReportTab.getVesselTraffic_k_1_10_3_Report);
router.get('/get-vessel-traffic-k-1-11-1-report', TrafficVesselReportTab.getVesselTraffic_k_1_11_1_Report);
router.get('/get-vessel-traffic-k-1-11-2-report', TrafficVesselReportTab.getVesselTraffic_k_1_11_2_Report);
router.get('/get-vessel-traffic-k-1-11-3-report', TrafficVesselReportTab.getVesselTraffic_k_1_11_3_Report);

//Ro-Ro/Ro-Pax Traffic
router.get('/get-ro-ro-traffic-k-1-8-1-report', TrafficRoRoReportTab.getRoRoTraffic_k_1_8_1_Report);
router.get('/get-ro-ro-traffic-k-1-8-2-report', TrafficRoRoReportTab.getRoRoTraffic_k_1_8_2_Report);
router.get('/get-ro-ro-traffic-k-1-8-3-report', TrafficRoRoReportTab.getRoRoTraffic_k_1_8_3_Report);
router.get('/get-ro-pax-traffic-k-1-9-1-report', TrafficRoPaxReportTab.getRoPaxTraffic_k_1_9_1_Report);
router.get('/get-ro-pax-traffic-k-1-9-2-report', TrafficRoPaxReportTab.getRoPaxTraffic_k_1_9_2_Report);
router.get('/get-ro-pax-traffic-k-1-9-3-report', TrafficRoPaxReportTab.getRoPaxTraffic_k_1_9_3_Report);

//Ro-Ro/Ro-Pax Traffic Drilldown
router.get('/get-ro-ro-traffic-k-1-8-1-drilldown', TrafficRoRoDrilldownReportTab.getRoRoTraffic_k_1_8_1_Drilldown_Report);

//Vessel Traffic Drilldown
router.get('/get-vessel-traffic-k-1-10-1-drilldown', TrafficVesselDrilldownReportTab.getVesselTraffic_k_1_10_1_Drilldown_Report);
router.get('/get-vessel-traffic-k-1-11-1-drilldown', TrafficVesselDrilldownReportTab.getVesselTraffic_k_1_11_1_Drilldown_Report);

//Turn Around Time
router.get('/get-trt-port-performance-k-1-2-1-report', PortPerformanceTrtReportTab.getTrtPortPerformance_k_1_2_1_Report);
router.get('/get-trt-port-performance-k-1-2-2-report', PortPerformanceTrtReportTab.getTrtPortPerformance_k_1_2_2_Report);
router.get('/get-trt-port-performance-k-1-2-3-report', PortPerformanceTrtReportTab.getTrtPortPerformance_k_1_2_3_Report);

//Median Turn Around Time
router.get('/get-median-trt-port-performance-k-1-18-1-report', PortPerformanceMedianTrtReportTab.getMedianTrtPortPerformance_k_1_18_1_Report);
router.get('/get-median-trt-port-performance-k-1-18-2-report', PortPerformanceMedianTrtReportTab.getMedianTrtPortPerformance_k_1_18_2_Report);
router.get('/get-median-trt-port-performance-k-1-18-3-report', PortPerformanceMedianTrtReportTab.getMedianTrtPortPerformance_k_1_18_3_Report);

//Pre-berthing Delay
router.get('/get-pbd-port-performance-k-1-6-1-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_6_1_Report);
router.get('/get-pbd-port-performance-k-1-6-2-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_6_2_Report);
router.get('/get-pbd-port-performance-k-1-6-3-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_6_3_Report);

router.get('/get-pbd-port-performance-k-1-7-1-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_7_1_Report);
router.get('/get-pbd-port-performance-k-1-7-2-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_7_2_Report);
router.get('/get-pbd-port-performance-k-1-7-3-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_7_3_Report);

router.get('/get-pbd-non-port-performance-k-1-19-1-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_19_1_Report);
router.get('/get-pbd-port-performance-k-1-19-2-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_19_2_Report);
router.get('/get-pbd-port-performance-k-1-19-3-report', PortPerformancePbdReportTab.getPbdPortPerformance_k_1_19_3_Report);

//Container Turn Around Time
router.get('/get-container-trt-port-performance-k-1-21-1-report', PortPerformanceContainerTrtReportTab.getContainerTrtPortPerformance_k_1_21_1_Report);
router.get('/get-container-trt-port-performance-k-1-21-2-report', PortPerformanceContainerTrtReportTab.getContainerTrtPortPerformance_k_1_21_2_Report);
router.get('/get-container-trt-port-performance-k-1-21-3-report', PortPerformanceContainerTrtReportTab.getContainerTrtPortPerformance_k_1_21_3_Report);

//KPI Time Performance
router.get('/get-kpi-time-performance-data', KpiTimePerformanceTab.getKpiTimePerformanceData);
router.post('/submit-kpi-time-performance-data', KpiTimePerformanceTab.submitKpiTimePerformanceData);
router.get('/get-kpi-time-performance-list', KpiTimePerformanceTab.getKpiTimePerformanceList);
router.post('/update-kpi-time-performance-data', KpiTimePerformanceTab.updateKpiTimePerformanceData);
router.post('/submit-kpi-time-performance-target-data', KpiTimePerformanceTab.submitKpiTimePerformanceTargetData);
router.get('/get-kpi-time-performance-target-data', KpiTimePerformanceTab.getKpiTimePerformanceTargetData);
router.get('/get-major-ports', KpiTimePerformanceTab.getMajorPorts);
router.get('/get-kpi-types', KpiTimePerformanceTab.getKpiTypes);
router.get('/get-target-kpi-time-performance-list', KpiTimePerformanceTab.getTargetKpiTimePerformanceList);

// KPI Renewable Energy
router.get('/get-kpi-renewable-energy-data', KpiRenewableEnergyTab.getKpiRenewableEnergyData);
router.get('/get-kpi-renewable-energy-list', KpiRenewableEnergyTab.getKpiRenewableEnergyList);
router.post('/submit-kpi-renewable-energy-data', KpiRenewableEnergyTab.submitKpiRenewableEnergyData);
router.post('/update-kpi-renewable-energy-data', KpiRenewableEnergyTab.updateKpiRenewableEnergyData);
router.post('/submit-kpi-renewable-energy-target-data', KpiRenewableEnergyTab.submitKpiRenewableEnergyTargetData);
router.get('/get-kpi-renewable-energy-target-data', KpiRenewableEnergyTab.getKpiRenewableEnergyTargetData);
// router.post('/update-kpi-renewable-energy-target-data', KpiRenewableEnergyTab.updateKpiRenewableEnergyTargetData);
router.get('/get-renewable-energy-target', KpiRenewableEnergyTab.getRenewableenergyTargetData);
router.get('/get-renewable-target-data', KpiRenewableEnergyTab.getRenewbleTargetData);
router.post('/update-renewable-energy-target-data', KpiRenewableEnergyTab.updateRenewableEnergyTargetData);

//KPI 12.1- 12.3
router.get('/get-kpi-majorports-12-1-report', financialReportTab.getKPIMajorPorts_12_1);
router.get('/get-kpi-majorports-12-2-report', financialReportTab.getKPIMajorPorts_12_2);
router.get('/get-kpi-majorports-12-3-report', financialReportTab.getKPIMajorPorts_12_3);

//KPI 13.1- 13.3
router.get('/get-kpi-majorports-13-2-report', financialReportTab.getKPIMajorPorts_13_2);
router.get('/get-kpi-majorports-13-3-report', financialReportTab.getKPIMajorPorts_13_3);


//KPI 14.1- 14.3
router.get('/get-kpi-majorports-14-2-report', financialReportTab.getKPIMajorPorts_14_2);
router.get('/get-kpi-majorports-14-3-report', financialReportTab.getKPIMajorPorts_14_3);


//KPI 15.1- 15.3
router.get('/get-kpi-majorports-15-2-report', financialReportTab.getKPIMajorPorts_15_2);
router.get('/get-kpi-majorports-15-3-report', financialReportTab.getKPIMajorPorts_15_3);

//KPI 16.1- 16.3
router.get('/get-kpi-majorports-16-2-report', financialReportTab.getKPIMajorPorts_16_2);
router.get('/get-kpi-majorports-16-3-report', financialReportTab.getKPIMajorPorts_16_3);

//KPI 17.1- 17.3
router.get('/get-kpi-majorports-17-2-report', financialReportTab.getKPIMajorPorts_17_2);
router.get('/get-kpi-majorports-17-3-report', financialReportTab.getKPIMajorPorts_17_3);

//KPI 13.1- 13.3
router.get('/get-kpi-majorports-13-1-report', financialReportTab.getKPIMajorPorts_13_1);

//KPI 14.1- 14.3
router.get('/get-kpi-majorports-14-1-report', financialReportTab.getKPIMajorPorts_14_1);

//KPI 15.1- 15.3
router.get('/get-kpi-majorports-15-1-report', financialReportTab.getKPIMajorPorts_15_1);

//KPI 16.1- 16.3
router.get('/get-kpi-majorports-16-1-report', financialReportTab.getKPIMajorPorts_16_1);

//KPI 17.1- 17.3
router.get('/get-kpi-majorports-17-1-report', financialReportTab.getKPIMajorPorts_17_1);

// kpi 5.1 
router.get('/get-kpi-majorpots-5-1-resports',kpiDgsPortPerformanceTab.getObsd_5_1_1_Report);
router.get('/get-kpi-majorpots-5-2-resports',kpiDgsPortPerformanceTab.getObsd_5_2_1_Report);
router.get('/get-kpi-majorpots-5-3-resports',kpiDgsPortPerformanceTab.getObsd_5_3_1_Report);

// KPI 20.1 - 20.31
router.get('/get-kpi-majorports-20-1-reports',kpiDgsPortPerformanceTab.getEffectiveObsd_20_1_1_Report);
router.get('/get-kpi-majorports-20-2-reports',kpiDgsPortPerformanceTab.getEffectiveObsd_20_2_1_Report);
router.get('/get-kpi-majorports-20-3-reports',kpiDgsPortPerformanceTab.getEffectiveObsd_20_3_1_Report);

// KPI DGS report 1.0
router.get('/kpi-dgs-1-1-report', kpiDgs1_0Tab.getKpiDgs1_1);
router.get('/kpi-dgs-1-2-report', kpiDgs1_0Tab.getKpiDgs1_2);
router.get('/kpi-dgs-1-3-report', kpiDgs1_0Tab.getKpiDgs1_3);
router.get('/kpi-dgs-1-4-report', kpiDgs1_0Tab.getKpiDgs1_4);
router.get('/kpi-dgs-1-5-report', kpiDgs1_0Tab.getKpiDgs1_5);

router.get('/kpi-dgs-1-3-1-report', kpiDgsPortPerformanceTab.getDwellTimeImportCycle_k_1_3_1_Report);
router.get('/kpi-dgs-1-3-2-report',kpiDgsPortPerformanceTab.getDwellTimeCalMonthWise_k_1_3_2_Report);
router.get('/kpi-dgs-1-3-3-report',kpiDgsPortPerformanceTab.getDwellTimeCalYearWise_k_1_3_3_Report);

router.get('/get-kpi-dgs-k-1-4-1-report', kpiDgsPortPerformanceTab.getPortPerformance_k_1_4_1_Report);
router.get('/get-kpi-dgs-k-1-4-2-report', kpiDgsPortPerformanceTab.getPortPerformance_k_1_4_2_Report);
router.get('/get-kpi-dgs-k-1-4-3-report', kpiDgsPortPerformanceTab.getPortPerformance_k_1_4_3_Report);

// KPI DGS report 2.0
router.get('/kpi-dgs-2-0-report', kpiDgs2_0Tab.getKpiDgs2_0);
router.get('/kpi-dgs-2-1-report', kpiDgs2_0Tab.getKpiDgs2_1);
router.get('/kpi-dgs-2-2-report', kpiDgs2_0Tab.getKpiDgs2_2);
router.get('/kpi-dgs-2-3-report', kpiDgs2_0Tab.getKpiDgs2_3);
router.get('/kpi-dgs-2-4-report', kpiDgs2_0Tab.getKpiDgs2_4);
router.get('/kpi-dgs-2-5-report', kpiDgs2_0Tab.getKpiDgs2_5);
router.get('/kpi-dgs-2-6-report', kpiDgs2_0Tab.getKpiDgs2_6);

router.get('/kpi-dgs-2-3-1-report', kpiDgs3_0Tab.getReportKpiDgs2_3_1);
router.get('/kpi-dgs-2-3-2-report', kpiDgs3_0Tab.getReportKpiDgs2_3_2);
router.get('/kpi-dgs-2-3-3-report', kpiDgs3_0Tab.getReportKpiDgs2_3_3);

// KPI DGS report 6
//kpi report 2_6_1 Report
router.get('/kpi-dgs-2-6-1-report', kpiDgs6_0Tab.getReportKpiDgs6_1);
router.get('/kpi-dgs-2-6-2-report', kpiDgs6_0Tab.getReportKpiDgs6_2);
router.get('/kpi-dgs-2-6-3-report', kpiDgs6_0Tab.getReportKpiDgs6_3);
router.get('/kpi-dgs-2-6-4-report', kpiDgs6_0Tab.getReportKpiDgs6_4);
router.get('/kpi-dgs-2-6-5-report', kpiDgs6_0Tab.getReportKpiDgs6_5);
router.get('/kpi-dgs-2-6-6-report', kpiDgs6_0Tab.getReportKpiDgs6_6);
router.get('/kpi-dgs-2-6-7-report', kpiDgs6_0Tab.getReportKpiDgs6_7);
router.get('/kpi-dgs-2-6-8-report', kpiDgs6_0Tab.getReportKpiDgs6_8);

// KPI DGS report 7
router.get('/kpi-dgs-2-7-1-report', kpiDgs7_0Tab.getReportKpiDgs7_1);
router.get('/kpi-dgs-2-7-2-report', kpiDgs7_0Tab.getReportKpiDgs7_2);
router.get('/kpi-dgs-2-7-3-report', kpiDgs7_0Tab.getReportKpiDgs7_3);
router.get('/kpi-dgs-2-7-4-report', kpiDgs7_0Tab.getReportKpiDgs7_4);
router.get('/kpi-dgs-2-7-5-report', kpiDgs7_0Tab.getReportKpiDgs7_5);
router.get('/kpi-dgs-2-7-6-report', kpiDgs7_0Tab.getReportKpiDgs7_6);
router.get('/kpi-dgs-2-7-7-report', kpiDgs7_0Tab.getReportKpiDgs7_7);

// mmd master
router.get('/get-mmd-data', MMDTab.getMmdData);
router.post('/submit-mmd-data', MMDTab.submitMmdData);
router.get('/get-mmd-list', MMDTab.getMmdList);
router.post('/update-mmd-data', MMDTab.updateMmdData);
router.post('/update-mmd-status', MMDTab.updateMmdStatus);

//vessel survey
router.post('/submit-vessel-survey-data', VesselSurveyTab.submitVesselSurveyData);
router.get('/get-vessel-survey-data', VesselSurveyTab.getVesselSurveyData);
router.get('/get-vessel-survey-data/:id', VesselSurveyTab.getVesselSurveyDataById);
router.put('/update-vessel-survey-data', VesselSurveyTab.updateVesselSurveyData);
router.delete("/delete-2-8-data/:id", VesselSurveyTab.deleteDgsKpi2_8_Data);

//MTI Master
router.post('/submit-mti-master-data', MTIMasterTab.submitMTIMasterData);
router.get('/get-mti-master-data', MTIMasterTab.getMTIMasterData);
router.get('/get-mti-master-data-by-id/:mtiId', MTIMasterTab.getMTIMasterDataById);
router.put('/update-mti-master-data', MTIMasterTab.updateMTIMasterData);

//MTI course master
router.post('/submit-course-master-data', CourseMasterTab.submitCourseMasterData);
router.get('/get-course-master-data', CourseMasterTab.getCourseMasterData);
router.get('/get-course-master-data-by-id/:id', CourseMasterTab.getCourseMasterDataById);
router.put('/update-course-master-data', CourseMasterTab.updateCourseMasterData);

//MTI course master - Intake Capacity
router.get('/get-course-type/:mtiId/:courseId', CourseMasterTab.getCourseTypeData);


// Traffic Delete Button
// router.delete("/delete-monthly-traffic-data/:id/:userID", TrafficTab.deleteMonthlyTrafficData);
// //Traffic Report
// router.post("/filtered-traffic-report", TrafficTab.getFilteredTrafficReport);
// //Traffic Chart 
// router.get('/traffic-PortWise-Chart/:getCurrentFinancialYear', TrafficTab.getPortWiseChartData);
// router.get("/traffic-Fin-Year-Chart-Data", TrafficTab.getFinYearChartData);

// DGLL
router.post("/light-house-master", dgllTab.addLightsHouseMaster);
router.get("/light-house-list/:userID", dgllTab.getLightHouseMaster);
router.get("/update-light-house-list/:lightHouseId", dgllTab.getUpdatelightHouseData);
router.put('/Light-House-edit',dgllTab.updateLightsHousedata);

router.post("/vtms-Integration",dgllTab.addVtmsIntegration);
router.get("/vtms-list/:userID", dgllTab.getVtmsIntegration);
router.get("/update-Vtms-data/:VtmsId", dgllTab.getUpdateVtmsdata);
router.put('/vtms-edit',dgllTab.updateVtmsData);

router.post("/nais-uptime",dgllTab.addNaisUptime);
router.get("/nais-list/:userID", dgllTab.getnaisList);
router.get("/update-nais-data/:NaisId", dgllTab.getUpdateNaisdata);
router.put('/nais-edit',dgllTab.updateNaisData);

router.post("/nais-integration",dgllTab.addNAISIntegration);
router.get("/nais-integration-list/:userID", dgllTab.getnaisIntegrationList);
router.get("/update-nais-integration-data/:NaisIntegrationId", dgllTab.getUpdateNaisIntegrationdata);
router.put('/nais-integration-edit',dgllTab.updateNaisIntegrationData);

router.get("/get-vtms-integration-report",dgllReportTab.getVTMSIntegrationReport);
router.get("/get-nais-uptime-report",dgllReportTab.getNAISUptimeReport);
router.get("/get-nais-integration-report",dgllReportTab.getNAISIntegrationReport);
router.get("/get-light-house-master-report",dgllReportTab.getLightHouseMasterReport)

router.post("/lighthose-tourist-destination", dgllTab.addTouristDestinations);
router.get("/lighthouse-tourist-destination/:userID", dgllTab.getTouristDestinations );
router.get('/update-lighthouse-tourist-destination/:TouristDestinationsId', dgllTab.getByIdTouristDestinations);
router.put('/edit-lighthouse-tourist-destination' , dgllTab.UpdateTouristDestinations);
router.get('/get-lighthouse-tourist-destination-report', dgllReportTab.getLighthouseTouristDestinationReport);
router.get("/get-dgll-financial-performance-report",dgllReportTab.getFinancialPerformanceReport)

router.get("/check-financialYears/:financialYears", dgllTab.checkFinancialYear);

router.post('/target-Details-lighthouse',dgllTab.addTargetDetails);
router.get('/target-Details-lighthouse/:userID', dgllTab.getTargetDetails);
router.get('/update-target-Details-destination/:TouristDestinationsId', dgllTab.getByIdTargetDestinations);
router.put('/edit-target-Details-lighthouse', dgllTab.updateTargetDestinationData);
router.get("/check-targetYears/:year", dgllTab.checkYear);

router.post("/dgll-submit-financial-performance",dgllTab.submitFinancialPerformance);
router.get("/get-dgll-financial-performance",dgllTab.getFinancialPerfomanceData);
router.get("/get-dgll-financial-performance/:financialId",dgllTab.getFinancialPerformanceDataByID)

// CSL
router.post("/vessels-built",cslTab. addVesselsBuilt);
router.get("/vessel-list/:userID", cslTab. getVesselBuiltList);
router.get("/update-CSL-vessel-built/:CslVesselId", cslTab.getUpdateVesselBuiltdata);
router.put('/csl-vessel-Built-edit',cslTab.updatecslVesselBuiltData);

router.post("/csl-ship-building",cslTab.addShipBuildingOrders);
router.get("/shipbuilding-list/:userID", cslTab.getshipbildingList);
router.get("/update-CSL-ship-built/:CslshipbuildingId", cslTab.getUpdateshipBuildingdata);
router.put('/csl-ship-Built-edit',cslTab.updatecslShipbuildingData);

router.post("/csl-ship-delivery",cslTab.addShipdelivery);
router.get("/shipdelivery-list/:userID", cslTab.getdeliveryList);
router.get("/update-CSL-delivery-data/:CslshipdeliveryId",cslTab. getUpdateshipdeliverydata);
router.put('/csl-ship-delivery-edit',cslTab.updatecslShipdeliveryData);

router.post("/csl-capacity-utilization",cslTab.addcapacityUtilization);
router.get("/capacityUtilization-list/:userID", cslTab.getcapacityUtilizationList);
router.get("/update-CSL-capcity-utilization-data/:CslcapacityUtilizationId",cslTab.getUpdatecapacityUtilizationdata);
router.put('/csl-capacity-utilization-edit',cslTab.updatecslCapacityutilizationgData);

router.post("/csl-fabrication-steels",cslTab. addfabricationofsteels);
router.get("/fabrication-list/:userID", cslTab. getfabricationList);
router.get("/update-CSL-fabrication-data/:CslfabricationId",cslTab.getUpdatefabricationofsteeldata);
router.put('/csl-fabrication-edit',cslTab.updatecslFabricationupdateData);

router.post("/csl-ships-repaired",cslTab. addShipRepaired);
router.get("/ships-reapired-list/:userID", cslTab. getshipRepairedList);
router.get("/update-ships-reapired-data/:CslreapiredId",cslTab.getUpdateshiptrapireddata);
router.put('/csl-repaired-edit',cslTab.updatecslshipData);

// CSL Report
router.get('/get-csl-year-wise-report',CslreportTab.CslYearWiseReport);
router.get('/get-csl-shipbuilding-year-wise-report',CslreportTab.getCslshipbuildingYearWiseReport);
router.get('/get-csl-delivery-year-wise-report',CslreportTab.getCslshipdeliveryYearWiseReport);
router.get('/get-csl-capacity-utilization-report',CslreportTab.getCslcapacityUtilizationReport);
router.get('/get-csl-fabrication-of-steels-report',CslreportTab.getCslfabricationofsteelsYearWiseReport);
router.get('/get-csl-ships-repaired-report',CslreportTab.getCslshipRepairedYearWiseReport);

// SCI
router.post("/add-vessel-avail-ability",sciTabList.addVesselAvailabiltydata);
router.get("/sci-Vessel-list/:userID", sciTabList.getsciVesselList);
router.get("/update-sci-vessel-data/:SciVesselId", sciTabList.getUpdatesciVesseldata);
router.put('/sci-vessel-built-edit',sciTabList.updatesciVesselData);


router.post("/add-sci-time-voyage",sciTabList.addscitimeVoyageydata);
router.get("/sci-time-voyage-bulk-list/:userID", sciTabList.getscitimeVoyageList);
router.get("/update-sci-time-voyage-data/:ScitimeVoyageBuiklId", sciTabList.getUpdatescitimeVoyageBulkdata);
router.put('/sci-time-voyage-bulk-edit',sciTabList.updatescitimeVoyageBulkData);


router.post("/add-sci-time-voyage-tanker",sciTabList.addscitimeVoyagetankers);
router.get("/sci-time-voyage-tanker-list/:userID", sciTabList.getscitimeList);
router.get("/update-sci-time-voyage-tanker-data/:ScitimeVoyageTankerlId", sciTabList.getUpdatesciVessetankerldata);
router.put('/sci-time-voyage-tanker-edit',sciTabList.updateTimeVoyagetankerData);



router.post("/add-sci-time-voyage-offshore",sciTabList.addscitimeVoyageoffshore);
router.get("/sci-time-voyage-offshore-list/:userID", sciTabList.getscioffshoreList);
router.get("/update-sci-time-voyage-offshore-data/:ScitimeVoyageoffshorelId", sciTabList.getUpdatesciVesseoffshoreldata);
router.put('/sci-time-voyage-offshore-edit',sciTabList.updateTimeVoyageoffshoreData);


router.post("/add-sci-vessel-availability-linear",sciTabList.addscilinearVesselavailability);
router.get("/sci-linear-vessel-list/:userID", sciTabList.getscilinearvesselList);
router.get("/update-sci-linear-vessel-data/:SciLinearvesselId", sciTabList.getUpdatescilinearvesseldata);
router.put('/sci-linear-vessel-edit',sciTabList.updatescilinearvesselAvailabilityData);

router.post("/add-sci-vessel-procurement",sciTabList.addvesselprocurementdata);
router.get("/sci-vessel-procurement-list/:userID", sciTabList.getsciprocurementList);
router.get("/update-sci-vessel-procurement-data/:SciProcurementId", sciTabList.getUpdatesciVesselprocurementdata);
router.put('/sci-vessel-procurement-edit',sciTabList.submitVesselProcurementdata);


router.post("/add-sci-vessel-procurement-secondhand",sciTabList.addSecondhandvesselprocurementdata);
router.get("/sci-secondhand-vessel-procurement-list/:userID", sciTabList.getsecondhandsciprocurementList);
router.get("/update-sci-secondhand-vessel-procurement-data/:ScisecondhandProcurementId", sciTabList.getUpdatescisecondhandVesselprocurementdata);
router.put('/sci-secondhand-vessel-procurement-edit',sciTabList.updatesecondhandVesselProcurementdata);

router.post("/add-sci-ship-dry-docking",sciTabList.addshipDrydocking);
router.get("/sci-ship-dry-dock-list/:userID", sciTabList.getShipdrydockList);
router.get("/update-sci-ship-dry-docking-data/:SciDrydockId", sciTabList.getUpdateshipdrydockdata);
router.put('/sci-dry-docking-edit',sciTabList.updatesciDrydockingtData);

router.post("/add-sci-ship-repair-maintanace",sciTabList.addshipRepaiandMaintanace);
router.get("/sci-ship-repair-list/:userID", sciTabList.getShiprepairandMaintanaceList);
router.get("/update-sci-ship-repair-maintanace-data/:ScirepairandMaintanaceId", sciTabList.getUpdateshiprepairandMaintanacedata);
router.put('/sci-repair-maintance-edit',sciTabList.updaterepairandMaintanceData);

router.post("/add-sci-sale-recycling-oldvessels",sciTabList.addsaleandRecycling);
router.get("/sci-sale-and-recycling-list/:userID", sciTabList.getSaleandrecyclingList);
router.get("/update-sci-sale-recycling-data/:ScisaleRecyclingId", sciTabList.getUpdatescisaleandRecyclingdata);
router.put('/sci-sale-recycling-edit',sciTabList.updatesaleandRecyclingData);


router.post("/add-sci-sale-recycling-oldvessels-green-recycling",sciTabList.addsaleandRecyclingofgreenRecycling);
router.get("/sci-sale-and-green-recycling-list/:userID", sciTabList.getSaleandGreenrecyclingList);
router.get("/update-sci-sale-recycling-green-data/:ScisaleGreenrecyclingId", sciTabList.getUpdatescisaleandGreenrecyclingdata);
router.put('/sci-sale-greenrecycling-edit',sciTabList.updatesaleandGreenrecyclingData);

router.post("/add-sci-manning-of-owned-ships",sciTabList.addmanningofOwnedships);
router.get("/sci-manning-list/:userID", sciTabList.getscimanningdataList);
router.get("/update-sci-manning-of-old-ships-data/:ScimanningId", sciTabList.getUpdatescimanningodOwnedshipsdata);
router.put('/sci-manning-of-ownedships-edit',sciTabList.updatemanningofOwnedshipsData);

router.post("/add-sci-ship-management-business",sciTabList.addshipManagementBusiness);
router.get("/sci-ship-management-list/:userID", sciTabList.getshipmanagementList);
router.get("/update-sci-ship-management-data/:ScishipmanagementId",sciTabList.getUpdatescishipManagementdata);
router.put('/sci-ship-management-business',sciTabList.updateshipManagementbusinessData);

//sci report
router.get('/kpi-sci-6-1-1-report',sciReportTab.getsciVesselAvailabilityReport);
router.get('/kpi-sci-6-1-2-report',sciReportTab.sciVeslAvailUtilTimeandVoyageChartShipsReport)
router.get('/kpi-sci-6-1-3-report',sciReportTab.sciVeslAvailUtilTimeandVoyageTankerReport)
router.get('/kpi-sci-6-1-4-report',sciReportTab.sciVesselAvailabilityOffshoreReport)
router.get('/kpi-sci-6-1-5-report',sciReportTab.sciVessellAvailabilityLinerReport)

//SCI Report
router.get('/get-sci-vessel-procurement-year-wise-report',sciReportTab.getsciVesselprocurementReport);
router.get('/get-sci-vessel-procurement-secondhand-year-wise-report',sciReportTab.getsciVesselprocurementsecondhandReport);
router.get('/get-sci-ship-dry-docking-year-wise-report',sciReportTab.getsciShipdrydockingReport);
router.get('/get-sci-repair-maintance-report',sciReportTab.getsciRepairandMaintanceReport);
router.get('/get-sci-sale-recycling-old-vessels-report',sciReportTab.getscisaleandRecyclingofvesselsReport);
router.get('/get-sci-sale-green-recycling-old-vessels-report',sciReportTab.getsciSaleandGreenrecyclingodoldvesselsReport);
router.get('/get-sci-manning-of-owned-ships-report',sciReportTab.getsciManningofownedshipsReport);
router.get('/get-sci-ship-management-business-report',sciReportTab.getsciShipmanagementbusinessReport);

// imuTab
router.post("/add-imu-k-5-1",imuTab.createStudentEnrollment);
router.get("/get-imu-k-5-1",imuTab.getStudentEnrollment);
router.get("/get-imu-k-5-1/:studentId",imuTab.getStudentEnrollmentByID);
router.get("/get-imu-k-5-1-year",imuTab.getStudentEnrollmentYear);

router.post("/add-imu-k-5-2",imuTab.createimunewCourseUpgradation);
router.get("/get-imu-k-5-2/:courseId",imuTab.getimuNewCourseUpgradationByID);
router.get("/get-imu-k-5-2",imuTab.getimuNewCourseUpgradation);
router.get("/get-imu-k-5-2-year",imuTab.getimuNewCourseUpgradationYear);

router.post("/add-imu-k-5-3",imuTab.createimuFacilities);
router.get("/get-imu-k-5-3",imuTab.getimuFacilities);
router.get("/get-imu-k-5-3/:facilitiesId",imuTab.getimuFacilitiesByID);
router.get("/get-imu-k-5-3-year",imuTab.getimuFacilitiesYear);

router.post("/add-imu-k-5-4",imuTab.createimuPartnership);
router.get("/get-imu-k-5-4",imuTab.getimuPartnership);
router.get("/get-imu-k-5-4/:partnershipId",imuTab.getimuPartnershipByID);
router.get("/get-imu-k-5-4-year",imuTab.getimuPartnershipYear);

router.post("/add-imu-k-5-5",imuTab.createImuResearch);
router.get("/get-imu-k-5-5",imuTab.getImuResearch);
router.get("/get-imu-k-5-5/:researchId",imuTab.getImuResearchByID);
router.get("/get-imu-k-5-5-year",imuTab.getimuResearchYear);

router.get("/get-imu-k-5-1-report",imuReportTab.getStudentEnrollmentReport);
router.get("/get-imu-k-5-2-report",imuReportTab.getNewCoursesUpgradationReport);
router.get("/get-imu-k-5-3-report",imuReportTab.getFacilitiesClassroomsReport);
router.get("/get-imu-k-5-4-report",imuReportTab.getPartnershipsMoUsAcadamicReport);
router.get("/get-imu-k-5-5-report",imuReportTab.getResearchInnovationsReport)

router.post("/add-imu-k-5-1-1",imuTab.createimuFinalYearpassPercentage);
router.get("/get-student-perecntage-list/:userID",imuTab.getStudentfinalYearPercentage);
router.get("/update-student-perecntage-data/:studentId",imuTab.getUpdateFinalyearPercentagedata);
router.get("/get-imu-k-5-1-1-program",imuTab.checkProgramalreadyExists)

// Report
router.get("/get-imu-k-5-1-linegraph-report",imuReportTab.getStudentEnrollmentLinegraphReport);
router.get("/get-imu-k-5-1-1-report",imuReportTab.getfinalYearpassPercentageReport);

//Long Term Strategies
//MIV data
router.get('/miv-meetingsdata', MIVTab.getMIVMeeting);
router.get('/mopsw-initiative-data', MIVTab.getInitiativeMopswData);
router.get('/get-initiative-name/:initiativeID', MIVTab.getInitiativeName);
router.get('/get-target-date/:initiativeID', MIVTab.getInitiativeTargetDate);
router.get('/meetinglogs-mopsw/:organisationId', MIVTab.getLogMeetingMopsw);

router.get('/get-miv-dashboard', MIVTab.getMIVDashboard);
router.get('/get-miv-activity-status-wise', MIVTab.getMIVactivityStatusWise);
router.get('/get-miv-activity-current-status-port-wise', MIVTab.getMIVactivityCurrentStatusPortWise);
router.get('/get-miv-category-count-wise', MIVTab.getMIVCategoryCountWise);
router.get("/detailed-stage-wise-miv-data", MIVTab.detailedMivDashboard);
router.get("/get-miv-category-details", MIVTab.getMivCategoryDetails);
router.get("/get-details-miv-activity-status-wise", MIVTab.getDetailsMivActivityStatusWise);

router.get('/miv-data', MIVTab.getMIVData);
router.post('/miv-data', MIVTab.createMIVData);
router.get("/miv-datas/:ID", MIVTab.getUpdateMIV);
router.post('/miv-data/upload-files', MIVTab.uploadFiles);
router.put('/miv-data/:id', MIVTab.editMIVData);
router.get('/meeting', MIVTab.getMeeting);
router.post("/meeting", MIVTab.uploadMeeting.single('file'), MIVTab.createMeeting);
router.get("/meeting/download/:id", MIVTab.downloadMeeting);
router.get('/meeting-no', MIVTab.getNoOfMeetings);

router.post("/mom-of-psw-meeting", momOfPswMeetingsTab.createMOM);
router.post("/mom-of-psw-meeting-edit", momOfPswMeetingsTab.createMOMedit);
router.post("/mom-of-file-psw", momOfPswMeetingsTab.upload.single('file'), momOfPswMeetingsTab.addNewMOMFile);
router.get('/meeting-status-summary/:roleID/:userID/:organisationID/:WingId', momOfPswMeetingsTab.getMeetingStatusSummary);
router.get('/meeting-status-summary-edit/:roleID/:userID/:organisationID/:WingId', momOfPswMeetingsTab.getMeetingStatusSummaryedit);
router.get("/view-post-mom-request/:meetingId/:status", momOfPswMeetingsTab.addMOMRequest);
router.post("/actionpointdocument", momOfPswMeetingsTab.upload.single('file'),momOfPswMeetingsTab.addNewactionpointsFileupload);
router.put("/update-action-points-fileupload",momOfPswMeetingsTab.updateActionPointfileupload);
router.get("/download-actionpoints-pdf-document", momOfPswMeetingsTab.actionpointsPdfFileDownload);
router.delete("/delete-actionpointsfile", momOfPswMeetingsTab.actionpointsfileDelete);
router.delete("/delete-momfile", momOfPswMeetingsTab.momfileDelete);
router.get("/mompsw-report", momOfPswMeetingsTab.getmomofPswReport);
router.get('/mompsw-report-data/:meetingId', momOfPswMeetingsTab.getmomofPswReportdata);


//Amrit Kaal Vision 
router.get('/AKV-data', AKVTab.getAKVData);
router.post('/AKV-data', AKVTab.createAKVData);
router.put('/AKV-data-update', AKVTab.editAKVData);
router.get("/AKV-datas/:ID", AKVTab.getUpdateAKV);
router.post('/AKV-data/upload-files', AKVTab.uploadAKVFiles);
router.get('/akv-report', AKVTab.getAmritReport);
router.get('/get-akv-initiative-name/:initiativeID', AKVTab.getAKVInitiativeName);
router.get('/AKV-Entity-data', AKVTab.getAKVEntityData);
router.get('/MIV-initiative-count', AKVTab.MIVInitiativeID);

//Knowledge Repository
router.post('/add-knowledge-rep', KRTab.addKnowledgeRepositoryFile);
router.get('/knowledge-rep', KRTab.getKnowledgeRepository);
router.get('/knowledge-rep-data-entry', KRTab.getKnowledgeRepositoryDataEntry);
router.post("/kr/upload-files", KRTab.upload.single('file'), KRTab.krUploadFiles);
router.get("/kr-document/download/:filename", KRTab.downloadKRDocument);
router.get('/knowledge-rep-key/:docID', KRTab.getKnowledgeRepositoryKey);
router.delete("/delete-knowledge-rep/:id/:documentType", auth, KRTab.deleteKnowledgeRepository);
router.get("/kr/user-manual", userManualMenu.krManual);

// One vision one document
router.get("/OVD-datas/:ID", OVDTab.getUpdateOVD);
router.post('/OVD-data', OVDTab.createOVDData);
router.post('/OVD-L2-data', OVDTab.createOVDL2Data);
router.put('/OVD-datas', OVDTab.updateOVDData);
router.post("/ovd-document", OVDTab.upload.single('file'), OVDTab.ovdUploadDocument);
router.get('/OVD-data-count/:wingID/:orgID/:vision/:priority/:vibhasID/:userID/:mivChapterSelect/:makvThemeSelect', OVDTab.getOvdCount);
router.get('/OVD-data-report/:wingID/:orgID/:vision/:priority/:vibhasID/:userID/:mivChapterSelect/:makvThemeSelect/:statusCurrent', OVDTab.getAllResultOVDData);
router.get('/OVD-ministry-chart/:wingID/:orgID/:vision/:priority/:vibhasID/:mivChapterSelect/:makvThemeSelect', OVDTab.getMinistryOVDChart);
router.get('/OVD-organisation-chart/:userID/:vision/:priority/:vibhasID/:mivChapterSelect/:makvThemeSelect', OVDTab.getOrganisationOVDChart);
router.get('/get-intervention-documents/:ID', OVDTab.getInterventionDocuments);
router.delete("/delete-intervention-document/:ID/:nameDoc", OVDTab.deleteInterventionDocument);
router.get("/download-intervention-document/:ID", OVDTab.downloadInterventionDocument);
router.post("/ovod-finance-document", OVDTab.upload.single('file'), OVDTab.ovodFinanceDocument);
router.get('/get-ovod-finance-documents/:ID/:sourceOfFundList', OVDTab.getFinanceDocuments);
router.delete("/delete-ovod-finance-document/:ID/:nameDoc", OVDTab.deleteFinanceDocument);
router.get("/download-ovod-finance-document/:ID", OVDTab.downloadFinanceDocument);
router.put('/update-ovod-action', OVDTab.updateOVODActions);
router.delete('/delete-ovod-action/:ID/:userID', OVDTab.deleteOVODAction);

// OVOD
router.get('/OVD-data/:userID/:wingId', OVDDataTab.getOVDData);
router.get('/OVD-data/:userID/:wingId/:vibhasId', OVDDataTab.getOVDVibhasData);
router.get('/OVD-status-data/:type', OVDDataTab.getDEStatusDetail);
router.get("/ovod-org-status/:organisation", OVDDataTab.getOVODStatusData);
router.get("/ovod-org-list-data/:userID", OVDDataTab.getOVODOrgAllData);
router.get("/ovod-org-filter/:tid/:orgId", OVDDataTab.getOVODDropDownData);
router.get("/get-ovod-org-id/:orgId", OVDDataTab.getOVODImpId);
router.get("/OVD-percentage/:ID", OVDDataTab.getPercentageOVD);
router.get('/OVD-init-drop/:wingID/:orgID/:vision/:priority/:vibhasID/:mivChapterSelect/:makvThemeSelect/:userID', OVDDataTab.getCountInitDetail);
router.get('/get-ovod-add-data/:goalA1/:a2Intervention/:goalB1/:interventionB2/:type/:impId', OVDDataTab.getAddOVDData);


// chatbot
router.get('/get-chatbot-module-groups', dashboardController.getChatbotModuleGroups);
router.get('/get-chatbot-modules/:groupId', dashboardController.getChatbotModules);
router.get('/get-logical-queries-mail/:moduleId', dashboardController.getLogicalQueriesEmail);
router.get('/get-cc-logical-queries-mail/:moduleId', dashboardController.getCCEmailsForLogicalQueries);
router.get('/get-module-name/:moduleId', dashboardController.getModuleName);
router.get('/get-user-details-for-mail/:userId', dashboardController.getUserDetailsForMail);

//cruise ports
router.post('/submit-cruise-port', cruisePortsTab.submitCruisePortsData);
router.get('/get-cruise-ports-report-data', cruisePortsTab.getCruisePortsReportData);
router.get('/get-cruise-ports-data', cruisePortsTab.getCruisePortsDataByYearAndMonth);
router.get("/cruise-list/:roleID/:organisationID", cruisePortsTab. getcruisepassengersData);
router.get("/update-cruise-shipping-data/:CruiseShippingId", cruisePortsTab.getUpdateCruiseShippingdata);
router.put('/update-cruise-data-edit',cruisePortsTab.updateCruiseshippingData);


//GMIS-MoU
router.get('/get-mou-category-names', gmisMouTab.getMouCategory);
router.post('/submit-gmis-mou-data', gmisMouTab.submitGmisMouData);
router.post("/gmisdocumentUploader", gmisMouTab.upload.single('file'),gmisMouTab.addNewgmisFileupload);
router.get('/get-gmis-mou-data/:roleId/:organisationId', gmisMouTab.getGmisMouData);
router.get('/get-gmis-mou-chart-data', gmisMouTab.getGmisMouChartData);
router.put('/update-gmis-mou-data', gmisMouTab.updateGmisMouData);
router.get('/get-gmis-mou-data-by-id/:mouID', gmisMouTab.getGmisMouDataByID);
router.get("/download-gmismou-pdf-document", gmisMouTab.gmisPdfFileDownload);
router.delete("/delete-gmisfile", gmisMouTab.gmisfileDelete)
router.get('/get-organisation-wise-count-amount', gmisMouTab.getOrganisationWiseCountAmount);
router.get('/get-status-wise-count', gmisMouTab.getStatusWiseCountAmount);
router.get('/get-org-wise-status-count/:organisationId/:financialYear/:greaterThan100Cr', gmisMouTab.getOrganisationWiseStatusCount);
router.get('/get-mou-data-by-organisation-and-status/:organisation/:status', gmisMouTab.getGmisMouDataByOrganisationAndStatus);
router.get('/get-org-wise-status-count-orgview/:organisationID', gmisMouTab.getOrganisationWiseStatusCountorgView);
router.post("/add-revised-financial-progress-date", gmisMouTab.addRevisedfinancialprogressdate);
router.post("/add-revised-physical-progress-date", gmisMouTab.addRevisedphysicalprogressdate);
router.get("/get-revised-financial-progress-date/:mouID", gmisMouTab.getRevisedfinancialprogressdate);
router.get("/get-revised-physical-progress-date/:mouID", gmisMouTab.getRevisedphysicalprogressdate);

router.get("/get-mou-stage-details-org/:roleId/:organisationID",gmisMouTab.getGmisMouStageDetails_org);
router.get("/get-mou-stage-details/:organisationId/:financialYear/:greaterThan100Cr",gmisMouTab.getGmisMouStageDetails);
router.get('/get-yearwise-gmis-data',gmisMouTab.getYearWisegmisData);
router.get('/get-gmis-drilldown-data',gmisMouTab.getGmisDrilldownData);
router.get('/get-gismou-second-party', gmisMouTab.getGmisMouSecondParty);
router.get('/get-gismou-vibhas-navic-cell', gmisMouTab.getGmisMouVibhasNavicCell);
router.get('/get-gismou-category-name', gmisMouTab.getGmisMouCategoryName);
router.get('/get-gismou-present-status', gmisMouTab.getGmisMouPresentStatus);

router.get('/get-organisation-wise-count-amount-status', gmisMouTab.getOrganisationWiseCountAmountStatus);
router.get('/get-mou-total-count-amount', gmisMouTab.getMouTotalCountAmount);
router.get('/get-mou-categories', gmisMouTab.getMouCategories);
router.get('/get-total-mou-amount',gmisMouTab.getTotalMouAndAmountCategoryWise),
router.get('/get-total-mou-amount-yearwise',gmisMouTab.getTotalMouAndAmountyearWise),
router.get('/get-mou-org-order', gmisMouTab.getOrgWiseMouOrder);
router.get('/get-organisation-wise-count-amount-status-orgview/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView);
router.get('/get-organisation-wise-count-amount-status-orgview_2021/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2021);
router.get('/get-organisation-wise-count-amount-status-orgview_2023/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2023);
router.get('/get-organisation-wise-count-amount-status-orgview_2025/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2025);
router.get('/get-organisation-wise-count-amount-status-orgview_2025-category/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2025_category);
router.get('/get-organisation-wise-count-amount-status-orgview-category/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_category);
router.get('/get-organisation-wise-count-amount-status-orgview_2021-category/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2021_category);
router.get('/get-organisation-wise-count-amount-status-orgview_2023-category/:organisationID', gmisMouTab.getOrganisationWiseCountAmountStatusorgView_2023_category);


router.get('/get-org-wise-status-count-orgview_2021/:organisationID', gmisMouTab.getOrganisationWiseStatusCountorgView_2021);
router.get('/get-org-wise-status-count-orgview_2023/:organisationID', gmisMouTab.getOrganisationWiseStatusCountorgView_2023);
router.get('/get-org-wise-status-count-orgview_2025/:organisationID', gmisMouTab.getOrganisationWiseStatusCountorgView_2025);
router.get('/get-organisation-wise-count-amount-status_2021/:category/:organisationId', gmisMouTab.getOrganisationWiseCountAmountStatus_2021);
router.get('/get-org-wise-status-count_2021/:organisationId', gmisMouTab.getOrganisationWiseStatusCount_2021);
router.get('/get-organisation-wise-count-amount_2021/:organisationId', gmisMouTab.getOrganisationWiseCountAmount_2021);
router.get('/get-mou-total-count-amount-2021', gmisMouTab.getMouTotalCountAmount_2021);
// router.get('/get-mou-total-count-amount-2021/:roleId/:organisationID', gmisMouTab.getMouTotalCountAmount_2021);
// router.get('/get-gmis-mou-amount-count-2021/:roleId/:organisationID', gmisMouTab.getMouTotalAmountAndCount_2021);
router.get('/get-total-mou-amount-2021/:category/:organisationId', gmisMouTab.getTotalMouAndAmountCategoryWise_2021),
router.get('/get-mou-stage-details-2021/:organisationId', gmisMouTab.getGmisMouStageDetails_2021);
router.get('/get-mou-stage-details-2021-org/:roleId/:organisationID', gmisMouTab.getGmisMouStageDetails_2021_org);
router.get('/get-status-wise-count-2021/:category/:organisationId', gmisMouTab.getStatusWiseCountAmount_2021);
router.get('/get-organisation-wise-count-amount-status_2023/:category/:organisationId', gmisMouTab.getOrganisationWiseCountAmountStatus_2023);
router.get('/get-org-wise-status-count_2023/:organisationId', gmisMouTab.getOrganisationWiseStatusCount_2023);
router.get('/get-total-mou-amount-2023/:category/:organisationId', gmisMouTab.getTotalMouAndAmountCategoryWise_2023),
router.get('/get-status-wise-count-2023/:category/:organisationId', gmisMouTab.getStatusWiseCountAmount_2023);
router.get('/get-organisation-wise-count-amount_2023/:organisationId', gmisMouTab.getOrganisationWiseCountAmount_2023);
// router.get('/get-gmis-mou-amount-count-2023/:roleId/:organisationID', gmisMouTab.getMouTotalAmountAndCount_2023);
router.get('/get-mou-stage-details-2023/:organisationId', gmisMouTab.getGmisMouStageDetails_2023);
router.get('/get-mou-stage-details-2023-org/:roleId/:organisationID', gmisMouTab.getGmisMouStageDetails_2023_org);
router.get('/get-mou-total-count-amount-2023/:roleId/:organisationID', gmisMouTab.getMouTotalCountAmount_2023);

router.get('/get-organisation-wise-count-amount_2025/:organisationId', gmisMouTab.getOrganisationWiseCountAmount_2025);
// router.get('/get-mou-total-count-amount-2025/:roleId/:organisationID', gmisMouTab.getMouTotalCountAmount_2025);
router.get('/get-mou-total-count-amount-2025', gmisMouTab.getMouTotalCountAmount_2025);
// router.get('/get-gmis-mou-amount-count-2025/:roleId/:organisationID', gmisMouTab.getMouTotalAmountAndCount_2025);
router.get('/get-mou-stage-details-2025-org/:roleId/:organisationID', gmisMouTab.getGmisMouStageDetails_2025_org);
router.get('/get-mou-stage-details-2025/:organisationId', gmisMouTab.getGmisMouStageDetails_2025);
router.get('/get-total-mou-amount-2025/:category/:organisationId', gmisMouTab.getTotalMouAndAmountCategoryWise_2025),
router.get('/get-status-wise-count-2025/:category/:organisationId', gmisMouTab.getStatusWiseCountAmount_2025);
router.get('/get-organisation-wise-count-amount-status_2025/:category/:organisationId', gmisMouTab.getOrganisationWiseCountAmountStatus_2025);
router.get('/get-org-wise-status-count_2025/:organisationId', gmisMouTab.getOrganisationWiseStatusCount_2025);
//MoU-Chart

//Marine Casualty
router.post('/submit-marine-prev-data', marineTab.addMarinePrevIncident);
router.post('/submit-marine-year-wise', marineTab.addMarineYearWise);
router.get('/get-kpi-marine-data/:type', marineTab.getMarineCasultyData);
router.get('/get-kpi-marine-data-by-year/:type/:year', marineTab.getMarineCasultyDataByYear);
router.get('/get-kpi-marine-data-by-year/:type/:year/:casualtyType', marineTab.getMarineCasultyDataByYear);
router.put('/update-marine-prev-data', marineTab.updateMarinePrevIncident);
router.put('/update-marine-year-wise', marineTab.updateMarineYearWise);


//KPI incidents country wise
router.post("/submit-kpi-incident-country-wise", marineTab.submitIncidentCountryWise);
router.get("/get-incidents-country-wise", marineTab.getCountryWise);
router.get("/get-incidents-country-wise-data/:year/:casualtyType", marineTab.getCoutryWiseYearAndCasualty);//check year and casualty
router.get("/get-incidents-country-wises-casualty-year/:year/:casualtyType", marineTab.getDataCountryWisebyYearAndCasualty);


//KPI incidents vessel wise
router.post("/submit-kpi-vessel-incident-country-wise", marineTab.submitIncidentVesselWise);
router.get("/get-incidents-vessel-wise", marineTab.getVesselWise);
router.get("/get-incidents-vessel-wise-data/:year/:casualtyType", marineTab.getIncidentsVesselDataByYearAndType);
router.get("/get-incidents-vessel-wises-type-year/:year/:casualtyType", marineTab.getDataVesselWisebyYearAndCasualty);

//Marine Report
router.get('/get-kpi-marine-prev-curr-report', marineTab.getMarinePrevCurrYrReport);
router.get('/get-kpi-marine-country-wise-report', marineTab.getMarineCountryWiseReport);
router.get('/get-kpi-marine-year-wise-report', marineTab.getMarineYearWiseReport);
router.get('/get-kpi-marine-vessel-wise-report', marineTab.getMarineVesselWiseReport);

//Conciliation Court Case
router.get("/get-last-conciliation-number-no/:organisationID", conciliationCourtCaseTab.getLastConciliationNumber);
router.post("/add-conciliators-data", conciliationCourtCaseTab.addConciliatorsData);
router.post("/add-second-party-data", conciliationCourtCaseTab.addSecondPartyData);
router.post("/add-conciliation-prev-conn-cases", conciliationCourtCaseTab.addConciliationPrevConnCases);
router.post("/add-conciliation-other-court-case-Org", conciliationCourtCaseTab.addConciliationOtherCourtCaseOrg);
router.post("/add-conciliation-other-second-party-org", conciliationCourtCaseTab.addConciliationOtherSecondParty);
router.post("/create-conciliation-court-case", conciliationCourtCaseTab.createConciliationCourtCase);
router.post("/add-first-party-data", conciliationCourtCaseTab.addConciliationFirstParty);
router.post("/add-conciliators-hearing-data", conciliationCourtCaseTab.addConciliatorsHearingData);
router.post("/create-conciliation-status", conciliationCourtCaseTab.createConciliationStatus);
router.post("/add-fee-expenses-details", conciliationCourtCaseTab.addFeeExpensesdetails);
router.post("/add-other-expenses-details", conciliationCourtCaseTab.addOtherExpensesdetails);
router.post("/create-conciliation-expenditure", conciliationCourtCaseTab.createConciliationExpenditure);
router.get("/get-conciliation-sub-tables-court-cases-data/:typeName/:caseID", conciliationCourtCaseTab.getSubTablesCourtCaseData);

router.post("/add-conciliation-first-party-and-second-party", conciliationCourtCaseTab.addConciliationFirstPartyAndSecondParty);
router.get("/get-conciliation-first-party-and-second-party/:caseID", conciliationCourtCaseTab.getConciliationFirstPartyAndSecondParty);

//KPI DGS Entry Exit
router.post('/add-entry-exit-data', entryExitTab.addEntryExitData);
router.get('/get-entry-exit-data', entryExitTab.getEntryExitData);
router.get('/get-entry-exit-data-by-id/:Id', entryExitTab.getEntryExitDataByID);
router.put('/update-entry-exit-data-by-id', entryExitTab.updateEntryExitData);
router.get('/get-abstract-entry-exit-report', entryExitTab.getAbstractEntryExitReport);
router.get('/get-monthly-entry-exit-report', entryExitTab.getMonthlyEntryExitReport);
router.get('/get-yearly-entry-exit-report', entryExitTab.getYearlyEntryExitReport);

//Form Builder Fields
// router.post('/store-form-builder-input-form', formBuilderTab.storeFormBuilderInputForm); //req
// router.get('/get-created-form-data', formBuilderTab.getCreatedFormData); //req //get created forms

// old category-based module perms
router.get('/module-permissions', ModuleControllerTab.getModulePermissions);
router.post('/update-module-permission', ModuleControllerTab.updateModulePermission);
router.get("/organisation-modules/:organisationId", ModuleControllerTab.getModulesByOrganisationCategory);

// rbac
router.get('/rbac/usermatrix-categories', orgModulePermission.getUsermatrixCategories);
router.get('/rbac/organisations', orgModulePermission.getOrganisationsByCategory);
router.get('/rbac/modules', orgModulePermission.getActiveModules);
router.get('/rbac/org-module-permissions', orgModulePermission.getOrgModulePermissions);
router.put('/rbac/org-module-permissions', auth, orgModulePermission.saveOrgModulePermissions);
router.get('/rbac/org-allowed-modules/:organisationId', orgModulePermission.getAllowedModulesForOrganisation);
router.get('/rbac/matrix-users', userModuleCrud.getMatrixUsers);
router.get('/rbac/user-module-crud', userModuleCrud.getUserModuleCrud);
router.put('/rbac/user-module-crud', auth, userModuleCrud.saveUserModuleCrud);
router.get('/rbac/org-module-permission-log', getOrgModulePermissionLog);
router.get('/rbac/user-module-crud-log', getUserModuleCrudLog);

router.get("/project-proposal", getProjectProposal);
router.get("/project-clearance", getProjectClearance);
router.get("/traffic-kpi-targets", getKpiTrafficTarget);
router.get("/cruise-and-passenger-traffic-actual", getKpiCruiseAndPassengerActuals);
router.get("/cruise-and-passenger-traffic-target", getKpiCruiseAndPassengerTarget);
router.get("/traffic-kpi-actual", getKpiTrafficActual);
router.get("/kpi-port-performance-actual", getKpiPortPerformanceActual);

// MoPSW Tracker
router.get("/download-tracker-excel", mopswTracker.downloadTrackerExcel);
//CMEC
router.post("/add-cmec-researchers-data",CMECTabList.addcmecResearchersdata);
router.get("/cmec-Research-list/:userID", CMECTabList.getcmecResearchList);
router.get("/update-cmec-research-data/:cmecResearchId",CMECTabList.getUpdatecmecResearchdata);
router.put('/cmec-resaerch-update-data',CMECTabList.updatecmecResearchesData);
router.get('/get-cmec-year-wise-report',CMECTabList.getCmecYearWiseReport);

router.post("/add-cmec-publications-data",CMECTabList.addcmecPublicationdata);
router.get("/cmec-Publications-list/:userID",CMECTabList.getcPublicationsdataList);
router.get("/update-cmec-publications-data/:cmecPublicationsId",CMECTabList.getUpdatecmecPublicationsdata);
router.put('/cmec-publications-update-data',CMECTabList.updatecmecPublicationsData);

router.post("/add-policy-advisory-data",CMECTabList.addcmecPolicyAdvisoryNotes);
router.post("/cmecdocumentuploader", CMECTabList.upload.single('file'),CMECTabList.addNewcmecFileupload);
router.get("/policy-advisory-list/:userID",CMECTabList.getcmecpolicyAdvisorydataList);
router.get("/cmec-list/:cmecAdvisoryId", CMECTabList.getUpdateCmecAdvisoryData);
router.get("/download-cmecfile-pdf-document", CMECTabList.cmecPdfFileDownload);
router.delete("/delete-cmecfile", CMECTabList.cmecfileDelete);
router.put("/update-cmec-list", CMECTabList.updatecmecpolicyAdvisorydata);

router.post("/add-cmec-maritime-talks-data",CMECTabList.addcmecMaritimetalksdata);
router.get("/maritime-public-list/:userID",CMECTabList.getcmecmaritimedataList);
router.get("/update-cmec-maritime-data/:cmecmaritimeId",CMECTabList.getUpdatecmecMaritimedata);
router.put('/cmec-Maritime-talks-update-data',CMECTabList.updatecmecMaritimeTalksData);


router.get("/traffic-liquid-bulk-single-leg", getLiquidBulkSingleLeg);
router.get("/traffic-liquid-bulk-two-leg", getLiquidBulkTwoLeg);
router.get("/traffic-dry-bulk-single-leg", getDryBulkSingleLeg);
router.get("/traffic-dry-bulk-two-leg", getDryBulkTwoLeg);
router.get("/traffic-break-bulk-single-leg", getBreakBulkSingleLeg);
router.get("/traffic-break-bulk-two-leg", getBreakBulkTwoLeg);
router.get("/traffic-container-single-leg", getContainerSingleLeg);
router.get("/traffic-container-two-leg", getContainerTwoLeg);

//Form Builder Fields
router.post('/store-form-builder-input-form', formBuilderTab.storeFormBuilderInputForm); //req
router.post('/modify-form-builder-input-form', formBuilderTab.modifyFormBuilderInputForm); //req

router.get('/get-created-form-data', formBuilderTab.getCreatedFormData); //req //get created forms
router.delete("/delete-form-builder-data/:data", formBuilderInputTab.deleteMmtFormBuilder); //req //delete created forms
router.post("/edit-form-builder-data/:data", formBuilderInputTab.editMmtFormBuilder); //req //edit forms

router.post('/upload-formbuilder-documents', formBuilderInputTab.upload.array('files[]'), formBuilderInputTab.UploadFormDocument);//req upload
router.get('/download-formbuilder-documents/:uid/:field', formBuilderInputTab.downloadDocument);//req download

router.post('/create-FormBuilder-data', formBuilderInputTab.createFormBuilderData); //req generic Create 
router.get('/get-FormBuilder-Report/:data', formBuilderInputTab.getFormBuilderReport); //req generic Report

// form builder status
router.get('/get-form-builder-status/:data/:code', formBuilderInputTab.getFormBuilderSatus); //req //get created forms
router.get('/get-form-builder-user-wise-data/:data/:userID', formBuilderInputTab.getFormBuilderUserWiseData); //req //get created forms
router.get('/get-user-edit-Form-Data/:userID/:currentPage', formBuilderInputTab.getUserEditFormData); //not required //get created forms data for only one data retrival for one form
router.post('/edit-FormBuilder-data', formBuilderInputTab.editFormBuilderData); //req generic Create 
router.post('/clone-FormBuilder', formBuilderInputTab.cloneMmtFormBuilder); //req generic clone 


export default router;