const YES_NO = [{ value: "1", label: "Yes" }, { value: "0", label: "No" }];

const HEARING_OUTCOMES = [
  "Appearance recorded", "Adjourned for counter affidavit", "Adjourned for reply affidavit",
  "Adjourned for commission report", "Adjourned for Lower Court records", "Adjourned for hearing",
  "Adjourned", "Issues framed", "IA heard", "IA allowed", "Case partly heard", "Finally heard",
  "Interim order", "Dismissed", "Allowed", "Disposed of",
];
const AWARD_NATURE = ["Allowed", "Partly Allowed", "Dismissed", "Disposed off", "Direction", "Others"];
const INTERIM_NATURE = ["Stay", "Status Quo", "Direction", "Injunction", "Others"];

const APPEAL = "Appeal/ Revision/ Review filed";

export const arbitrationSchema = {
  title: "Add Arbitration Court Case",
  steps: [
    {
      key: "basic",
      label: "Basic Information",
      fields: [
        { name: "claimants", label: "Claimant", type: "list", required: true, span: 6 },
        { name: "respondents", label: "Respondents", type: "list", required: true, span: 6 },
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
        { name: "deptDivision", label: "Department/Division in organization to which case belong", type: "chips",
          required: true, span: 12, options: [], hint: "You can select multiple departments" },
        { name: "prevConnectCases", label: "Previous/Connected cases", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "prevConnData", label: "Previous / Connected cases", type: "table", span: 12,
          showIf: (v) => v.prevConnectCases === "1",
          columns: [
            { name: "prevConnectedCourt", label: "Court", type: "text" },
            { name: "prevConnectedCaseNumber", label: "Case Number", type: "text" },
            { name: "prevConnectedCNRNumber", label: "CNR Number", type: "text" },
            { name: "caseStatus", label: "Case Status", type: "select",
              options: [{ value: "pending", label: "Pending" }, { value: "disposed", label: "Disposed" }] },
            { name: "caseDetails", label: "Details (in brief)", type: "textarea" },
          ] },
        { name: "counselData", label: "Details of the Counsel for the organization", type: "table", span: 12,
          columns: [
            { name: "nameOfCounsel", label: "Name of the counsel", type: "text" },
            { name: "counselContact", label: "Contact", type: "text" },
            { name: "typeCounsel", label: "Type of Counsel", type: "select",
              options: [
                { value: "empanelled", label: "Empanelled" }, { value: "advocate", label: "Advocate" },
                { value: "firm", label: "Firm" }, { value: "others", label: "Others" },
              ] },
            { name: "counselDetails", label: "Details (if other type of counsel)", type: "text" },
          ] },
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
            { name: "complainceReq", label: "Action required for compliance?", type: "select", options: YES_NO },
            { name: "lastDateOfDoingAction", label: "Last date for action (if required)", type: "date" },
          ] },

        { name: "awardPassed", label: "4. Award passed?", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "awardPassedDate", label: "Date", type: "date", span: 3, showIf: (v) => v.awardPassed === "1" },
        { name: "natureOfAward", label: "Nature of Award", type: "select", required: true, span: 3,
          showIf: (v) => v.awardPassed === "1", options: AWARD_NATURE },
        { name: "amountAnyAwarded", label: "Amounts if any awarded", type: "select", required: true, span: 3,
          showIf: (v) => v.awardPassed === "1", options: ["No Amount", "Claim", "Counter Claim"] },
        { name: "awardedClaimAmount", label: "Claim Amount", type: "number", required: true, span: 3,
          showIf: (v) => v.awardPassed === "1" && v.amountAnyAwarded === "Claim" },
        { name: "awardedCounterClaimAmount", label: "Counter Claim Amount", type: "number", required: true, span: 3,
          showIf: (v) => v.awardPassed === "1" && v.amountAnyAwarded === "Counter Claim" },
        { name: "briefOfAward", label: "Brief of Award", type: "textarea", required: true, span: 12,
          showIf: (v) => v.awardPassed === "1" },
        { name: "actionReqCom", label: "Whether action required for compliance?", type: "radio", span: 6,
          showIf: (v) => v.awardPassed === "1", options: YES_NO },
        { name: "lastDateForComplaince", label: "Last Date for Compliance", type: "date", span: 6,
          showIf: (v) => v.awardPassed === "1" && v.actionReqCom === "1" },
        { name: "whetJudgeAccept", label: "Whether Award accepted / appealed / revision filed", type: "select",
          required: true, span: 6, showIf: (v) => v.awardPassed === "1",
          options: ["Decision pending", "Award accepted", APPEAL] },

        { name: "awardCompiled", label: "Whether award complied?", type: "radio", span: 6,
          showIf: (v) => v.whetJudgeAccept === "Award accepted", options: YES_NO },
        { name: "dateOfComplaince", label: "Date of Compliance", type: "date", span: 6,
          showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "1" },
        { name: "detailsOfComplaince", label: "Details of Compliance", type: "textarea", required: true, span: 6,
          showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "1" },
        { name: "reasonForNonComplaince", label: "Reason for non compliance", type: "textarea", required: true, span: 6,
          showIf: (v) => v.whetJudgeAccept === "Award accepted" && v.awardCompiled === "0" },

        { name: "appealRevCaseNumber", label: "Case Number", type: "text", span: 3,
          showIf: (v) => v.whetJudgeAccept === APPEAL },
        { name: "appealRevCourtName", label: "Court", type: "textarea", required: true, span: 3,
          showIf: (v) => v.whetJudgeAccept === APPEAL },
        { name: "appealRevCNRNumber", label: "CNR Number", type: "text", span: 3,
          showIf: (v) => v.whetJudgeAccept === APPEAL },
        { name: "appealRevFillingDate", label: "Filing Date", type: "date", span: 3,
          showIf: (v) => v.whetJudgeAccept === APPEAL },
      ],
    },
  ],
};