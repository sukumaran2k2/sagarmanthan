import React, { useState } from "react";
import "./CourtCases.css";

/* ------------------------------------------------------------------ */
/* Shared option lists – replace with API data (dropdown endpoints)    */
/* ------------------------------------------------------------------ */
const YES_NO = [
  { value: "1", label: "Yes" },
  { value: "0", label: "No" },
];
const YEARS = Array.from({ length: 41 }, (_, i) => String(2030 - i));
const HEARING_OUTCOMES = [
  "Appearance recorded", "Adjourned for counter affidavit", "Adjourned for reply affidavit",
  "Adjourned for commission report", "Adjourned for Lower Court records", "Adjourned for hearing",
  "Adjourned", "Issues framed", "IA heard", "IA allowed", "Case partly heard", "Finally heard",
  "Interim order", "Dismissed", "Allowed", "Disposed of",
];
const JUDGEMENT_NATURE = ["Allowed", "Partly Allowed", "Dismissed", "Disposed off", "Direction", "Others"];
const INTERIM_NATURE = ["Stay", "Status Quo", "Direction", "Injunction", "Others"];
const DOC_TYPES = ["Act", "OMS", "Orders", "Notifications", "Guidelines", "Regulations", "Policies", "Schemes", "Other"];
const DEPARTMENTS = [
  "General Administration Department", "Civil Dept", "Mechanical Dept", "Marine Dept", "Medical Dept",
  "Traffic Dept", "Academics Section", "Finance Department", "Estate Division", "Vigilance Division",
  "Dock Labour Board",
];
const PREV_CASE_COLS = (statusName = "caseStatus", detailName = "caseDetails") => [
  { name: "prevConnectedCourt", label: "Court", type: "text" },
  { name: "prevConnectedCaseNumber", label: "Case Number", type: "text" },
  { name: "prevConnectedCNRNumber", label: "CNR Number", type: "text" },
  { name: statusName, label: "Case Status", type: "select", options: ["Pending", "Disposed"] },
  { name: detailName, label: "Details (in brief)", type: "textarea" },
];
const COUNSEL_COLS = [
  { name: "nameOfCounsel", label: "Name of counsel", type: "text" },
  { name: "counselContact", label: "Contact", type: "text" },
  { name: "typeCounsel", label: "Type of Counsel", type: "select", options: ["Empanelled", "Advocate", "Firm", "Others"] },
  { name: "counselDetails", label: "Details (if other type)", type: "text" },
];

/* ------------------------------------------------------------------ */
/* Form schemas  (expenditure steps intentionally left out)            */
/*   type: text | number | date | textarea | select | radio | chips    */
/*         | list | table | file                                        */
/*   showIf(values) -> boolean for conditional fields                  */
/* ------------------------------------------------------------------ */
const SCHEMAS = {
  litigation: {
    title: "Add Litigation Court Case",
    steps: [
      {
        key: "basic",
        label: "Basic Information",
        fields: [
          { name: "caseName", label: "Case Name", type: "text", required: true, span: 6 },
          { name: "courtType", label: "Court Type", type: "select", required: true, span: 6,
            options: ["Supreme Court", "High Court", "District Court", "Tribunal", "Consumer Forum", "Others"] },
          { name: "subCourtType", label: "Sub Court Type", type: "select", span: 4,
            showIf: (v) => ["High Court", "Tribunal", "Consumer Forum"].includes(v.courtType), options: [] },
          { name: "highCourtBench", label: "Bench/Seat", type: "select", span: 4,
            showIf: (v) => v.courtType === "High Court", options: [] },
          { name: "otherCourtState", label: "State", type: "select", span: 3,
            showIf: (v) => v.courtType === "Others", options: [] },
          { name: "othersCourtDistrict", label: "District", type: "select", span: 3,
            showIf: (v) => v.courtType === "Others", options: [] },
          { name: "otherCourtComplex", label: "Court Complex", type: "textarea", span: 3,
            showIf: (v) => v.courtType === "Others" },
          { name: "otherCourtName", label: "Name of Court", type: "textarea", span: 3,
            showIf: (v) => v.courtType === "Others" },
          { name: "caseType", label: "Case Type", type: "select", required: true, span: 6, options: [] },
          { name: "caseNumber", label: "Case Number", type: "text", required: true, span: 3 },
          { name: "year", label: "Year", type: "select", required: true, span: 3, options: YEARS },
          { name: "cnrNumber", label: "CNR Number", type: "text", span: 6 },
          { name: "filedOnDate", label: "Filed On", type: "date", required: true, span: 6 },
          { name: "petitioners", label: "Petitioner/Appellant", type: "list", span: 6 },
          { name: "respondents", label: "Respondents", type: "list", span: 6 },
          { name: "domain", label: "Domain", type: "select", required: true, span: 6, options: [] },
          { name: "subDomain", label: "Sub Domain", type: "select", required: true, span: 6, options: [] },
          { name: "description", label: "Case Description", type: "textarea", required: true, span: 12 },
          { name: "deptDivision", label: "Department/Division to which case belongs", type: "chips",
            required: true, span: 12, options: DEPARTMENTS, hint: "You can select multiple departments" },
          { name: "prevConnectCases", label: "Previous/Connected cases", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "prevConnData", label: "Previous / Connected cases", type: "table", span: 12,
            showIf: (v) => v.prevConnectCases === "1", columns: PREV_CASE_COLS() },
          { name: "monetaryClaim", label: "Is there a monetary claim/counter claim?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "claimAmount", label: "Claim Amount", type: "number", required: true, span: 6,
            showIf: (v) => v.monetaryClaim === "1" },
          { name: "counterClaimAmount", label: "Counter Claim Amount", type: "number", required: true, span: 6,
            showIf: (v) => v.monetaryClaim === "1" },
          { name: "counselData", label: "Details of the Counsel for the organization", type: "table", span: 12, columns: COUNSEL_COLS },
        ],
      },
      {
        key: "ministry",
        label: "Ministry Intervention",
        fields: [
          { name: "isMinistryParty", label: "1. Whether Ministry a Party?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "ministryCounsel", label: "Ministry Counsel", type: "table", span: 12,
            showIf: (v) => v.isMinistryParty === "1",
            columns: [
              { name: "nameOfCounselMinistry", label: "Name of the counsel", type: "text" },
              { name: "designationMinistry", label: "Designation", type: "text" },
              { name: "ministryContact", label: "Contact", type: "text" },
            ] },
          { name: "typeOfParty", label: "Type of Party", type: "select", required: true, span: 4,
            showIf: (v) => v.isMinistryParty === "1", options: ["Main Party", "Proforma Party"] },
          { name: "ministryRole", label: "Role of Ministry", type: "select", required: true, span: 4,
            showIf: (v) => v.isMinistryParty === "1", options: ["Appellant", "Petitioner", "Respondent"] },
          { name: "replyFiled", label: "Is Reply Filed on behalf of Ministry?", type: "radio", required: true, span: 4,
            showIf: (v) => v.isMinistryParty === "1", options: YES_NO },
          { name: "replyFiledDoc", label: "Upload Document", type: "file", span: 6,
            showIf: (v) => v.isMinistryParty === "1" && v.replyFiled === "1" },

          { name: "ministryInvolved", label: "2. Any Act/Rules/Regulations/Guidelines/Schemes/Policies/OMs/Orders/Notifications challenged / invoked?",
            type: "radio", required: true, span: 12,
            options: [{ value: "1", label: "Challenged" }, { value: "2", label: "Invoked" }, { value: "0", label: "No" }] },
          { name: "docChallenged", label: "Document challenged", type: "select", required: true, span: 4,
            showIf: (v) => v.ministryInvolved === "1", options: DOC_TYPES },
          { name: "docInvoked", label: "Document invoked", type: "select", required: true, span: 4,
            showIf: (v) => v.ministryInvolved === "2", options: DOC_TYPES },
          { name: "docDetails", label: "Details", type: "text", required: true, span: 4,
            showIf: (v) => ["1", "2"].includes(v.ministryInvolved) && (v.docChallenged || v.docInvoked) },
          { name: "act", label: "Act", type: "select", required: true, span: 4, options: [],
            showIf: (v) => v.docChallenged === "Act" || v.docInvoked === "Act" },
          { name: "rule", label: "Rule", type: "select", required: true, span: 4, options: [],
            showIf: (v) => v.docChallenged === "Act" || v.docInvoked === "Act" },
          { name: "otherAct", label: "Other Acts Details", type: "text", span: 4,
            showIf: (v) => v.docChallenged === "Act" || v.docInvoked === "Act" },
          { name: "omData", label: "OM Details", type: "table", span: 12,
            showIf: (v) => v.docChallenged === "OMS" || v.docInvoked === "OMS",
            columns: [
              { name: "ministryDept", label: "Ministry/Department", type: "text" },
              { name: "OMNumber", label: "OM Number", type: "text" },
              { name: "omDate", label: "Date", type: "date" },
            ] },

          { name: "ministryIntervention", label: "3. Is Ministry's Intervention required?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "natureOfAction", label: "Nature of action required", type: "select", required: true, span: 4,
            showIf: (v) => v.ministryIntervention === "1", options: ["Clarification", "Approval", "Other"] },
          { name: "clarificationTypes", label: "Types of Clarification", type: "text", span: 4,
            showIf: (v) => v.natureOfAction === "Clarification" },
          { name: "approvalRemarks", label: "Approval Remarks", type: "text", span: 4,
            showIf: (v) => v.natureOfAction === "Approval" },
          { name: "otherInv", label: "Others", type: "text", span: 4,
            showIf: (v) => v.natureOfAction === "Other" },
          { name: "interventionDescript", label: "Intervention Description", type: "text", span: 6,
            showIf: (v) => v.ministryIntervention === "1" },
          { name: "intervenReqDate", label: "Intervention Request Date", type: "date", span: 6,
            showIf: (v) => v.ministryIntervention === "1" },
          { name: "wingMin", label: "Wing in Ministry which should take action", type: "select", span: 6,
            showIf: (v) => v.ministryIntervention === "1", options: ["A", "B", "C"] },
          { name: "intervenDoc", label: "Upload Intervention Document", type: "file", span: 6,
            showIf: (v) => v.ministryIntervention === "1" },

          { name: "actionMinistry", label: "4. Does execution require any action from the Ministry?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "actionDescribe", label: "Nature of Execution", type: "select", required: true, span: 6,
            showIf: (v) => v.actionMinistry === "1",
            options: ["Clarification", "Approval", "Filing Counter", "Affidavit", "Attaching response",
              "Providing documents", "Appointing counsel", "Schemes", "Others"] },
          { name: "otherNatureExecution", label: "Details", type: "textarea", required: true, span: 6,
            showIf: (v) => v.actionDescribe === "Others" },
        ],
      },
      {
        key: "status",
        label: "Case Status",
        fields: [
          { name: "counterAffiFiled", label: "1. Counter Affidavit Filed", type: "radio", span: 6, options: YES_NO },
          { name: "counterAffiDoc", label: "Upload Document", type: "file", span: 6,
            showIf: (v) => v.counterAffiFiled === "1" },
          { name: "hearingStarted", label: "2. Hearing started?", type: "radio", span: 12, options: YES_NO },
          { name: "hearingData", label: "Hearings", type: "table", span: 12,
            showIf: (v) => v.hearingStarted === "1",
            columns: [
              { name: "hearingDate", label: "Date of Hearing", type: "date" },
              { name: "detailsOfHearing", label: "Details of Hearing", type: "text" },
              { name: "nextHearingDate", label: "Next Date of Hearing (if available)", type: "date" },
              { name: "outcomeOfHearing", label: "Outcome of Hearing", type: "select", options: HEARING_OUTCOMES },
            ] },
          { name: "interimOrder", label: "3. Interim Order?", type: "radio", span: 12, options: YES_NO },
          { name: "interimData", label: "Interim Orders", type: "table", span: 12,
            showIf: (v) => v.interimOrder === "1",
            columns: [
              { name: "natureInterimOrder", label: "Nature of Interim Order", type: "select", options: INTERIM_NATURE },
              { name: "dateOfInterimOrder", label: "Date of Interim Order", type: "date" },
              { name: "detailsOfInterimOrder", label: "Details of Interim Order", type: "text" },
              { name: "complianceReq", label: "Action required for compliance?", type: "select", options: ["Yes", "No"] },
              { name: "lastDateOfDoingAction", label: "Last date for action (if required)", type: "date" },
            ] },
          { name: "finalJudgement", label: "4. Final order/Judgment passed?", type: "radio", span: 12, options: YES_NO },
          { name: "finalJudgementDate", label: "Date", type: "date", span: 3, showIf: (v) => v.finalJudgement === "1" },
          { name: "natureOfJudgement", label: "Nature of Judgement", type: "select", required: true, span: 3,
            showIf: (v) => v.finalJudgement === "1", options: JUDGEMENT_NATURE },
          { name: "amountAnyAwarded", label: "Amounts if any awarded", type: "select", required: true, span: 3,
            showIf: (v) => v.finalJudgement === "1", options: ["No Amount", "Claim", "Counter Claim"] },
          { name: "awardedAmount", label: "Amount", type: "number", span: 3,
            showIf: (v) => v.finalJudgement === "1" && ["Claim", "Counter Claim"].includes(v.amountAnyAwarded) },
          { name: "briefJudgement", label: "Brief of Judgement", type: "textarea", required: true, span: 12,
            showIf: (v) => v.finalJudgement === "1" },
          { name: "actionReqCom", label: "Whether action required for compliance?", type: "radio", span: 6,
            showIf: (v) => v.finalJudgement === "1", options: YES_NO },
          { name: "lastDateForComplaince", label: "Last Date for Compliance", type: "date", span: 6,
            showIf: (v) => v.finalJudgement === "1" && v.actionReqCom === "1" },
          { name: "whetJudgeAccept", label: "Whether judgment accepted / appealed / revision filed", type: "select", required: true, span: 6,
            showIf: (v) => v.finalJudgement === "1",
            options: ["Decision pending", "Judgment accepted", "Appeal/ Revision/ Review filed"] },
          { name: "orderCompiled", label: "Whether order complied?", type: "radio", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Judgment accepted", options: YES_NO },
          { name: "dateOfComplaince", label: "Date of Compliance", type: "date", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "1" },
          { name: "detailsOfComplaince", label: "Details of Compliance", type: "textarea", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "1" },
          { name: "reasonForNonComplaince", label: "Reason for non compliance", type: "textarea", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "0" },
          { name: "appealRevCaseNumber", label: "Case Number", type: "text", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevCourtName", label: "Court", type: "textarea", required: true, span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevCNRNumber", label: "CNR Number", type: "text", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevFillingDate", label: "Filing Date", type: "date", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
        ],
      },
    ],
  },

  conciliation: {
    title: "Add Conciliation Court Case",
    steps: [
      {
        key: "basic",
        label: "Basic Information",
        fields: [
          { name: "caseName", label: "Case Name", type: "text", required: true, span: 12 },
          { name: "firstParty", label: "First Party", type: "list", span: 6 },
          { name: "secondParty", label: "Second Party", type: "list", span: 6 },
          { name: "conciliators", label: "Conciliators", type: "table", span: 12,
            columns: [
              { name: "nameOfConciliator", label: "Name", type: "text" },
              { name: "designationCapacity", label: "Designation/capacity held", type: "text" },
            ] },
          { name: "dateReqCon", label: "Date of request for conciliation", type: "date", required: true, span: 6 },
          { name: "dateOfRefToCon", label: "Date of reference to Conciliators", type: "date", required: true, span: 6 },
          { name: "claimFirstParty", label: "Claim First Party", type: "table", span: 6,
            columns: [
              { name: "firstClaimDescription", label: "Short Description", type: "text" },
              { name: "firstPartyclaimAmount", label: "Amount (if required)", type: "number", total: true },
            ] },
          { name: "claimSecondParty", label: "Claim Second Party", type: "table", span: 6,
            columns: [
              { name: "secondClaimDescription", label: "Short Description", type: "text" },
              { name: "secondPartyclaimAmount", label: "Amount (if required)", type: "number", total: true },
            ] },
          { name: "deptDivision", label: "Department/Division to which case belongs", type: "chips",
            required: true, span: 12, options: DEPARTMENTS, hint: "You can select multiple departments" },
          { name: "prevConnectCases", label: "Previous/Connected cases", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "prevConnData", label: "Previous / Connected cases", type: "table", span: 12,
            showIf: (v) => v.prevConnectCases === "1", columns: PREV_CASE_COLS("courtStatus", "description") },
        ],
      },
      {
        key: "status",
        label: "Conciliation Status",
        fields: [
          { name: "hearingStarted", label: "1. Hearing started?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "hearingData", label: "Hearings", type: "table", span: 12,
            showIf: (v) => v.hearingStarted === "1",
            columns: [
              { name: "dateOfHearing", label: "Date of Hearing", type: "date" },
              { name: "nameOfConciliator", label: "Name of Conciliator/s", type: "text" },
              { name: "nameOfParties", label: "Name of parties & Designation", type: "text" },
              { name: "location", label: "Location", type: "text" },
              { name: "detailsOfHearing", label: "Details Of Hearing", type: "text" },
              { name: "outcomeOfHearing", label: "Outcome Of Hearing", type: "select", options: HEARING_OUTCOMES },
            ] },
          { name: "settledOrFailed", label: "2. Outcome", type: "radio", required: true, span: 12,
            options: [{ value: "1", label: "Settled" }, { value: "0", label: "Failed" }] },
          { name: "failedDescription", label: "Reason for Failure", type: "textarea", required: true, span: 12,
            showIf: (v) => v.settledOrFailed === "0" },
          { name: "payableTo", label: "Amount Payable to?", type: "select", required: true, span: 6,
            showIf: (v) => v.settledOrFailed === "1",
            options: [{ value: "secondParty", label: "2nd Party" }, { value: "firstParty", label: "1st Party" }, { value: "bothParty", label: "Both" }] },
          { name: "amountPayableToSecByFrst", label: "Amount payable to 2nd party by 1st party", type: "number", span: 6,
            showIf: (v) => v.settledOrFailed === "1" && ["secondParty", "bothParty"].includes(v.payableTo) },
          { name: "payableToSecByFrstDescription", label: "Description", type: "textarea", span: 6,
            showIf: (v) => v.settledOrFailed === "1" && ["secondParty", "bothParty"].includes(v.payableTo) },
          { name: "amountPayableToFrstBySec", label: "Amount payable to 1st party by 2nd party", type: "number", span: 6,
            showIf: (v) => v.settledOrFailed === "1" && ["firstParty", "bothParty"].includes(v.payableTo) },
          { name: "payableToFrstBySecDescription", label: "Description", type: "textarea", span: 6,
            showIf: (v) => v.settledOrFailed === "1" && ["firstParty", "bothParty"].includes(v.payableTo) },
          { name: "complainceReq", label: "3. Compliance Required", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "requiredBy", label: "Required By", type: "select", required: true, span: 6,
            showIf: (v) => v.complainceReq === "1",
            options: [{ value: "firstParty", label: "1st Party" }, { value: "secondParty", label: "2nd Party" }, { value: "bothParty", label: "Both" }] },
          { name: "briefOfComplaince", label: "Brief of Compliance", type: "textarea", required: true, span: 6,
            showIf: (v) => v.complainceReq === "1" },
          { name: "lastDateOfComFirstParty", label: "Last Date of compliance by 1st party", type: "date", span: 3,
            showIf: (v) => v.complainceReq === "1" && ["firstParty", "bothParty"].includes(v.requiredBy) },
          { name: "dateOfComFirstParty", label: "Date of compliance by 1st party", type: "date", span: 3,
            showIf: (v) => v.complainceReq === "1" && ["firstParty", "bothParty"].includes(v.requiredBy) },
          { name: "lastDateOfComSecParty", label: "Last Date of compliance by 2nd party", type: "date", span: 3,
            showIf: (v) => v.complainceReq === "1" && ["secondParty", "bothParty"].includes(v.requiredBy) },
          { name: "dateOfComSecParty", label: "Date of compliance by 2nd party", type: "date", span: 3,
            showIf: (v) => v.complainceReq === "1" && ["secondParty", "bothParty"].includes(v.requiredBy) },
          { name: "complainceDone", label: "4. Whether Compliance done?", type: "radio", required: true, span: 12, options: YES_NO },
        ],
      },
    ],
  },

  arbitration: {
    title: "Add Arbitration Court Case",
    steps: [
      {
        key: "basic",
        label: "Basic Information",
        fields: [
          { name: "claimants", label: "Claimant", type: "list", span: 6 },
          { name: "respondents", label: "Respondents", type: "list", span: 6 },
          { name: "partyData", label: "Party requesting arbitration", type: "table", span: 12,
            columns: [
              { name: "partyName", label: "Party Name", type: "text" },
              { name: "requestDate", label: "Date of Request for Arbitration", type: "date" },
            ] },
          { name: "partyRefArbitName", label: "Party referring the matter to arbitration", type: "text", required: true, span: 6 },
          { name: "dateOfReference", label: "Date of Reference", type: "date", required: true, span: 6 },
          { name: "domOrInterArbit", label: "Domestic / International Arbitration", type: "radio", required: true, span: 6,
            options: [{ value: "0", label: "Domestic" }, { value: "1", label: "International" }] },
          { name: "caseName", label: "Case Name", type: "text", required: true, span: 6 },
          { name: "arbitratorsData", label: "Arbitrators", type: "table", span: 12,
            columns: [
              { name: "arbitratorName", label: "Name", type: "text" },
              { name: "designationCapacity", label: "Designation/capacity held", type: "text" },
              { name: "partyNominating", label: "Party nominating", type: "text" },
            ] },
          { name: "claimAmount", label: "Claim Amount", type: "number", required: true, span: 4 },
          { name: "counterClaim", label: "Counter Claim", type: "number", required: true, span: 4 },
          { name: "placeOfArbitration", label: "Place of Arbitration", type: "textarea", required: true, span: 4 },
          { name: "domain", label: "Domain", type: "select", required: true, span: 4, options: [] },
          { name: "subDomain", label: "Sub Domain", type: "select", required: true, span: 4, options: [] },
          { name: "caseDescription", label: "Case Description", type: "textarea", required: true, span: 4, maxLength: 512 },
          { name: "deptDivision", label: "Department/Division to which case belongs", type: "chips",
            required: true, span: 12, options: DEPARTMENTS, hint: "You can select multiple departments" },
          { name: "prevConnectCases", label: "Previous/Connected cases", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "prevConnData", label: "Previous / Connected cases", type: "table", span: 12,
            showIf: (v) => v.prevConnectCases === "1", columns: PREV_CASE_COLS() },
          { name: "counselData", label: "Details of the Counsel for the organization", type: "table", span: 12, columns: COUNSEL_COLS },
        ],
      },
      {
        key: "status",
        label: "Case Status",
        fields: [
          { name: "hearingStarted", label: "1. Hearing started?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "hearingData", label: "Hearings", type: "table", span: 12,
            showIf: (v) => v.hearingStarted === "1",
            columns: [
              { name: "hearingDate", label: "Date of Hearing", type: "date" },
              { name: "detailsOfHearing", label: "Details of Hearing", type: "text" },
              { name: "nextHearingDate", label: "Next Date of Hearing (if available)", type: "date" },
              { name: "outcomeOfHearing", label: "Outcome of Hearing", type: "select", options: HEARING_OUTCOMES },
            ] },
          { name: "defenceStatement", label: "2. Defence Statement Filed", type: "radio", required: true, span: 6, options: YES_NO },
          { name: "defenceDoc", label: "Upload Document", type: "file", span: 6,
            showIf: (v) => v.defenceStatement === "1" },
          { name: "interimOrder", label: "3. Interim Order?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "interimData", label: "Interim Orders", type: "table", span: 12,
            showIf: (v) => v.interimOrder === "1",
            columns: [
              { name: "natureInterimOrder", label: "Nature of Interim Order", type: "select", options: INTERIM_NATURE },
              { name: "dateOfInterimOrder", label: "Date of Interim Order", type: "date" },
              { name: "detailsOfInterimOrder", label: "Details of Interim Order", type: "text" },
              { name: "complainceReq", label: "Action required for compliance?", type: "select",
                options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }] },
              { name: "lastDateOfDoingAction", label: "Last date for action (if required)", type: "date" },
            ] },
          { name: "awardPassed", label: "4. Award passed?", type: "radio", required: true, span: 12, options: YES_NO },
          { name: "awardPassedDate", label: "Date", type: "date", span: 3, showIf: (v) => v.awardPassed === "1" },
          { name: "natureOfAward", label: "Nature of Award", type: "select", required: true, span: 3,
            showIf: (v) => v.awardPassed === "1", options: JUDGEMENT_NATURE },
          { name: "amountAnyAwarded", label: "Amounts if any awarded", type: "select", required: true, span: 3,
            showIf: (v) => v.awardPassed === "1", options: ["No Amount", "Claim", "Counter Claim"] },
          { name: "awardedAmount", label: "Amount", type: "number", span: 3,
            showIf: (v) => v.awardPassed === "1" && ["Claim", "Counter Claim"].includes(v.amountAnyAwarded) },
          { name: "briefOfAward", label: "Brief of Award", type: "textarea", required: true, span: 12,
            showIf: (v) => v.awardPassed === "1" },
          { name: "actionReqCom", label: "Whether action required for compliance?", type: "radio", span: 6,
            showIf: (v) => v.awardPassed === "1", options: YES_NO },
          { name: "lastDateForComplaince", label: "Last Date for Compliance", type: "date", span: 6,
            showIf: (v) => v.awardPassed === "1" && v.actionReqCom === "1" },
          { name: "whetJudgeAccept", label: "Whether Award accepted / appealed / revision filed", type: "select", required: true, span: 6,
            showIf: (v) => v.awardPassed === "1",
            options: ["Decision pending", "Award accepted", "Appeal/ Revision/ Review filed"] },
          { name: "awardCompiled", label: "Whether award complied?", type: "radio", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Award accepted", options: YES_NO },
          { name: "dateOfComplaince", label: "Date of Compliance", type: "date", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "1" },
          { name: "detailsOfComplaince", label: "Details of Compliance", type: "textarea", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "1" },
          { name: "reasonForNonComplaince", label: "Reason for non compliance", type: "textarea", span: 6,
            showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "0" },
          { name: "appealRevCaseNumber", label: "Case Number", type: "text", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevCourtName", label: "Court", type: "textarea", required: true, span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevCNRNumber", label: "CNR Number", type: "text", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
          { name: "appealRevFillingDate", label: "Filing Date", type: "date", span: 3,
            showIf: (v) => v.whetJudgeAccept === "Appeal/ Revision/ Review filed" },
        ],
      },
    ],
  },
};

const TABS = [
  { id: "arbitration", label: "Arbitration", icon: "⚖️" },
  { id: "litigation", label: "Litigation", icon: "🏛️" },
  { id: "conciliation", label: "Conciliation", icon: "🤝" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const buildInitialValues = (schema) => {
  const v = {};
  schema.steps.forEach((s) =>
    s.fields.forEach((f) => {
      if (f.type === "table") v[f.name] = [{}];
      else if (f.type === "list") v[f.name] = [""];
      else if (f.type === "chips") v[f.name] = [];
      else v[f.name] = "";
    })
  );
  return v;
};

const normOpt = (o) => (typeof o === "string" ? { value: o, label: o } : o);

/* ------------------------------------------------------------------ */
/* Field renderers                                                      */
/* ------------------------------------------------------------------ */
function Input({ f, value, onChange, compact }) {
  const common = {
    className: "cc-input",
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
  };
  switch (f.type) {
    case "textarea":
      return <textarea {...common} rows={compact ? 2 : 4} maxLength={f.maxLength} />;
    case "select":
      return (
        <select {...common}>
          <option value="">-- Select --</option>
          {(f.options || []).map(normOpt).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case "number":
      return <input {...common} type="number" placeholder={`Enter ${f.label}`} />;
    case "date":
      return <input {...common} type="date" />;
    default:
      return <input {...common} type="text" placeholder={compact ? f.label : `Enter ${f.label}`} />;
  }
}

function TableField({ f, rows, onChange }) {
  const setCell = (i, name, val) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [name]: val } : r)));
  const totals = f.columns.filter((c) => c.total);

  return (
    <div className="cc-table-wrap">
      <table className="cc-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>SI No</th>
            {f.columns.map((c) => <th key={c.name}>{c.label}</th>)}
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="center">{i + 1}</td>
              {f.columns.map((c) => (
                <td key={c.name}>
                  <Input f={c} compact value={row[c.name]} onChange={(val) => setCell(i, c.name, val)} />
                </td>
              ))}
              <td className="center">
                <button type="button" className="cc-icon-btn" title="Add row" onClick={() => onChange([...rows, {}])}>＋</button>
                {rows.length > 1 && (
                  <button type="button" className="cc-icon-btn danger" title="Remove row"
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {totals.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={f.columns.length + 1} className="right"><b>Total :</b></td>
              <td><b>{totals.reduce((sum, c) => sum + rows.reduce((s, r) => s + (parseFloat(r[c.name]) || 0), 0), 0)}</b></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function FieldRenderer({ f, values, setValue }) {
  const value = values[f.name];

  let control;
  switch (f.type) {
    case "radio":
      control = (
        <div className="cc-radio-group">
          {f.options.map(normOpt).map((o) => (
            <label key={o.value} className="cc-radio">
              <input type="radio" name={f.name} checked={value === o.value} onChange={() => setValue(f.name, o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
      break;
    case "chips":
      control = (
        <div className="cc-chips">
          {f.options.map((o) => {
            const on = value.includes(o);
            return (
              <button type="button" key={o} className={`cc-chip ${on ? "on" : ""}`}
                onClick={() => setValue(f.name, on ? value.filter((x) => x !== o) : [...value, o])}>
                {o}
              </button>
            );
          })}
          {f.hint && <div className="cc-hint">{f.hint}</div>}
        </div>
      );
      break;
    case "list":
      control = (
        <div>
          {value.map((item, i) => (
            <div key={i} className="cc-list-row">
              <span className="cc-list-no">{i + 1}</span>
              <input className="cc-input" value={item} placeholder={`Enter ${f.label}`}
                onChange={(e) => setValue(f.name, value.map((x, idx) => (idx === i ? e.target.value : x)))} />
              <button type="button" className="cc-icon-btn" onClick={() => setValue(f.name, [...value, ""])}>＋</button>
              {value.length > 1 && (
                <button type="button" className="cc-icon-btn danger"
                  onClick={() => setValue(f.name, value.filter((_, idx) => idx !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>
      );
      break;
    case "table":
      control = <TableField f={f} rows={value} onChange={(rows) => setValue(f.name, rows)} />;
      break;
    case "file":
      control = (
        <>
          <input type="file" accept=".pdf" className="cc-input"
            onChange={(e) => setValue(f.name, e.target.files[0] || "")} />
          <div className="cc-hint">Allows only PDF files (Maximum file size is 20MB)</div>
        </>
      );
      break;
    default:
      control = <Input f={f} value={value} onChange={(val) => setValue(f.name, val)} />;
  }

  return (
    <div className={`cc-col span-${f.span || 12}`}>
      <label className="cc-label">
        {f.label} {f.required && <span className="req">*</span>}
      </label>
      {control}
      {f.maxLength && (
        <div className="cc-hint right">{(value || "").length}/{f.maxLength} characters</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One tab = stepper form for one case type                             */
/* ------------------------------------------------------------------ */
function CaseForm({ type, onSubmit }) {
  const schema = SCHEMAS[type];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => buildInitialValues(schema));
  const [errors, setErrors] = useState([]);

  const current = schema.steps[step];
  const isLast = step === schema.steps.length - 1;
  const setValue = (name, val) => setValues((p) => ({ ...p, [name]: val }));
  const visible = (f) => !f.showIf || f.showIf(values);

  const validate = () => {
    const missing = current.fields
      .filter((f) => visible(f) && f.required)
      .filter((f) => {
        const v = values[f.name];
        return Array.isArray(v) ? v.length === 0 : !v;
      })
      .map((f) => f.label);
    setErrors(missing);
    return missing.length === 0;
  };

  const submitStep = () => {
    if (!validate()) return;
    const payload = {};
    current.fields.filter(visible).forEach((f) => (payload[f.name] = values[f.name]));
    onSubmit(type, current.key, payload); // <-- call your API here
  };

  return (
    <div className="cc-card">
      <div className="cc-header">
        <div className="cc-title">
          <h2>{schema.title}</h2>
          <small>Ministry of Ports, Shipping and Waterways</small>
        </div>

        <div className="cc-stepper">
          {schema.steps.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <div className="cc-line" />}
              <button type="button" className={`cc-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                onClick={() => setStep(i)}>
                <span className="cc-circle">{i + 1}</span>
                <span className="cc-step-label">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <span className="cc-stage">Stage {step + 1} of {schema.steps.length}</span>
      </div>

      <div className="cc-body">
        <div className="cc-grid">
          {current.fields.filter(visible).map((f) => (
            <FieldRenderer key={f.name} f={f} values={values} setValue={setValue} />
          ))}
        </div>

        {errors.length > 0 && (
          <div className="cc-error">Please fill mandatory fields: {errors.join(", ")}</div>
        )}

        <div className="cc-footer">
          <span className="cc-hint">* Fields marked with red asterisk are mandatory</span>
          <div className="cc-actions">
            {step > 0 && (
              <button type="button" className="cc-btn ghost" onClick={() => { setErrors([]); setStep(step - 1); }}>
                ← Previous
              </button>
            )}
            <button type="button" className="cc-btn success" onClick={submitStep}>Submit</button>
            {!isLast && (
              <button type="button" className="cc-btn primary"
                onClick={() => { setErrors([]); setStep(step + 1); }}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page with the three top tabs                                         */
/* ------------------------------------------------------------------ */
export default function CourtCases() {
  const [tab, setTab] = useState("arbitration");

  // TODO: replace with real API calls (createLitigationCourtCase, createConciliationCourtCase, ...)
  const handleSubmit = (type, stepKey, data) => {
    console.log("submit", type, stepKey, data);
  };

  return (
    <div className="cc-page">
      <div className="cc-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`cc-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* key remounts the form so each tab keeps its own fresh state */}
      <CaseForm key={tab} type={tab} onSubmit={handleSubmit} />
    </div>
  );
}
