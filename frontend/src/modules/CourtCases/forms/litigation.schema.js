const YES_NO = [{ value: "1", label: "Yes" }, { value: "0", label: "No" }];
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
const APPEAL = "Appeal/ Revision/ Review filed";

export const COURT = { HC: "2", CONSUMER: "13", OTHERS: "14" };

export const SUB_COURT_COURTS = ["2", "3", "4", "5", "6", "7", "12", "13"];
// fallback only, used if the API returns nothing
export const COURT_TYPES = [
  { value: COURT.SC, label: "Supreme Court" },
  { value: COURT.HC, label: "High Court" },
  { value: COURT.DISTRICT, label: "District Court" },
  { value: COURT.TRIBUNAL, label: "Tribunal" },
  { value: COURT.CONSUMER, label: "Consumer Forum" },
  { value: COURT.OTHERS, label: "Others" },
];

const isAct = (v) => v.docChallenged === "Act" || v.docInvoked === "Act";
const isOM = (v) => v.docChallenged === "OMS" || v.docInvoked === "OMS";

export const litigationSchema = {
  title: "Add Litigation Court Case",
  steps: [
    /* ---------------- 1. Basic Information ---------------- */
    {
      key: "basic",
      label: "Basic Information",
      fields: [
        { name: "caseName", label: "Case Name", type: "text", required: true, span: 6 },
        { name: "courtType", label: "Court Type", type: "select", required: true, span: 6, options: [] },
        { name: "subCourtType", label: "Sub Court Type", type: "select", span: 4, options: [],
          showIf: (v) => SUB_COURT_COURTS.includes(v.courtType) },
        { name: "consumerForum", label: "Consumer Forum Type", type: "select", required: true, span: 4, options: [],
          showIf: (v) => v.courtType === COURT.CONSUMER },
        { name: "highCourtBench", label: "Bench/Seat", type: "select", span: 4, options: [],
          showIf: (v) => v.courtType === COURT.HC },
        { name: "otherCourtState", label: "State", type: "select", span: 3, options: [],
          showIf: (v) => v.courtType === COURT.OTHERS },
        { name: "othersCourtDistrict", label: "District", type: "select", span: 3, options: [],
          showIf: (v) => v.courtType === COURT.OTHERS },
        { name: "otherCourtComplex", label: "Court Complex", type: "textarea", span: 3,
          showIf: (v) => v.courtType === COURT.OTHERS },
        { name: "otherCourtName", label: "Name of Court", type: "textarea", span: 3,
          showIf: (v) => v.courtType === COURT.OTHERS },
        { name: "caseType", label: "Case Type", type: "select", required: true, span: 6, options: [] },
        { name: "caseNumber", label: "Case Number", type: "text", required: true, span: 3 },
        { name: "year", label: "Year", type: "select", required: true, span: 3, options: YEARS },
        { name: "cnrNumber", label: "CNR Number", type: "text", span: 6 },
        { name: "filedOnDate", label: "Filed On", type: "date", required: true, span: 6 },
        { name: "petitioners", label: "Petitioner/Appellant", type: "list", required: true, span: 6 },
        { name: "respondents", label: "Respondents", type: "list", required: true, span: 6 },
        { name: "domain", label: "Domain", type: "select", required: true, span: 6, options: [] },
        { name: "subDomain", label: "Sub Domain", type: "select", required: true, span: 6, options: [] },
        { name: "description", label: "Case Description", type: "textarea", required: true, span: 12 },
        { name: "deptDivision", label: "Department/Division to which case belongs", type: "chips",
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
        { name: "monetaryClaim", label: "Is there a monetary claim/counter claim?", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "claimAmount", label: "Claim Amount", type: "number", required: true, span: 6,
          showIf: (v) => v.monetaryClaim === "1" },
        { name: "counterClaimAmount", label: "Counter Claim Amount", type: "number", required: true, span: 6,
          showIf: (v) => v.monetaryClaim === "1" },
        { name: "counselData", label: "Details of the Counsel for the organization", type: "table", span: 12,
          columns: [
            { name: "nameOfCounsel", label: "Name of counsel", type: "text" },
            { name: "counselContact", label: "Contact", type: "text" },
            { name: "typeCounsel", label: "Type of Counsel", type: "select",
              options: [
                { value: "empanelled", label: "Empanelled" }, { value: "advocate", label: "Advocate" },
                { value: "firm", label: "Firm" }, { value: "others", label: "Others" },
              ] },
            { name: "counselDetails", label: "Details (if other type)", type: "text" },
          ] },
      ],
    },

    /* ---------------- 2. Ministry Intervention ---------------- */
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

        { name: "ministryInvolved", type: "radio", required: true, span: 12,
          label: "2. Any Act/Rules/Regulations/Guidelines/Schemes/Policies/OMs/Orders/Notifications challenged / invoked?",
          options: [{ value: "1", label: "Challenged" }, { value: "2", label: "Invoked" }, { value: "0", label: "No" }] },
        { name: "docChallenged", label: "Document challenged", type: "select", required: true, span: 4,
          showIf: (v) => v.ministryInvolved === "1", options: DOC_TYPES },
        { name: "docInvoked", label: "Document invoked", type: "select", required: true, span: 4,
          showIf: (v) => v.ministryInvolved === "2", options: DOC_TYPES },
        { name: "docDetails", label: "Details", type: "text", required: true, span: 4,
          showIf: (v) => ["1", "2"].includes(v.ministryInvolved) && (v.docChallenged || v.docInvoked) },
        { name: "act", label: "Act", type: "select", required: true, span: 4, options: [], showIf: isAct },
        { name: "rule", label: "Rule", type: "select", required: true, span: 4, options: [], showIf: isAct },
        { name: "otherAct", label: "Other Acts Details", type: "text", span: 4, showIf: isAct },
        { name: "omData", label: "OM Details", type: "table", span: 12, showIf: isOM,
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

    /* ---------------- 3. Case Status ---------------- */
    {
      key: "status",
      label: "Case Status",
      fields: [
        { name: "counterAffiFiled", label: "1. Counter Affidavit Filed", type: "radio", required: true, span: 6, options: YES_NO },
        { name: "counterAffiDoc", label: "Upload Document", type: "file", span: 6,
          existingKey: "counterAffiDocName", existingPath: "file_of_affidavit/Litigation",
          showIf: (v) => v.counterAffiFiled === "1" },

        { name: "hearingStarted", label: "2. Hearing started?", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "hearingData", label: "Hearings", type: "table", span: 12,
          showIf: (v) => v.hearingStarted === "1",
          columns: [
            { name: "hearingDate", label: "Date of Hearing", type: "date" },
            { name: "detailsOfHearing", label: "Details of Hearing", type: "text" },
            { name: "nextHearingDate", label: "Next Date of Hearing (if available)", type: "date" },
            { name: "outcomeOfHearing", label: "Outcome of Hearing", type: "select", options: HEARING_OUTCOMES },
          ] },

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

        { name: "finalJudgement", label: "4. Final order/Judgment passed?", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "finalJudgementDate", label: "Date", type: "date", span: 3, showIf: (v) => v.finalJudgement === "1" },
        { name: "natureOfJudgement", label: "Nature of Judgement", type: "select", required: true, span: 3,
          showIf: (v) => v.finalJudgement === "1", options: JUDGEMENT_NATURE },
        { name: "amountAnyAwarded", label: "Amounts if any awarded", type: "select", required: true, span: 3,
          showIf: (v) => v.finalJudgement === "1", options: ["No Amount", "Claim", "Counter Claim"] },
        { name: "awardedAmount", label: "Amount", type: "number", required: true, span: 3,
          showIf: (v) => v.finalJudgement === "1" && ["Claim", "Counter Claim"].includes(v.amountAnyAwarded) },
        { name: "briefJudgement", label: "Brief of Judgement", type: "textarea", required: true, span: 12,
          showIf: (v) => v.finalJudgement === "1" },
        { name: "actionReqCom", label: "Whether action required for compliance?", type: "radio", span: 6,
          showIf: (v) => v.finalJudgement === "1", options: YES_NO },
        { name: "lastDateForComplaince", label: "Last Date for Compliance", type: "date", span: 6,
          showIf: (v) => v.finalJudgement === "1" && v.actionReqCom === "1" },
        { name: "whetJudgeAccept", label: "Whether judgment accepted / appealed / revision filed", type: "select",
          required: true, span: 6, showIf: (v) => v.finalJudgement === "1",
          options: ["Decision pending", "Judgment accepted", APPEAL] },
        { name: "orderCompiled", label: "Whether order complied?", type: "radio", span: 6,
          showIf: (v) => v.whetJudgeAccept === "Judgment accepted", options: YES_NO },
        { name: "dateOfComplaince", label: "Date of Compliance", type: "date", span: 6,
          showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "1" },
        { name: "detailsOfComplaince", label: "Details of Compliance", type: "textarea", required: true, span: 6,
          showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "1" },
        { name: "reasonForNonComplaince", label: "Reason for non compliance", type: "textarea", required: true, span: 6,
          showIf: (v) => v.whetJudgeAccept === "Judgment accepted" && v.orderCompiled === "0" },
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