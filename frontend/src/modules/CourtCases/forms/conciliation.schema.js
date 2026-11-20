const YES_NO = [{ value: "1", label: "Yes" }, { value: "0", label: "No" }];

const DEPARTMENTS = [
  "General Administration Department", "Civil Dept", "Mechanical Dept", "Marine Dept",
  "Medical Dept", "Traffic Dept", "Academics Section", "Finance Department",
  "Estate Division", "Vigilance Division", "Dock Labour Board",
];

const HEARING_OUTCOMES = [
  "Appearance recorded", "Adjourned for counter affidavit", "Adjourned for reply affidavit",
  "Adjourned for commission report", "Adjourned for Lower Court records", "Adjourned for hearing",
  "Adjourned", "Issues framed", "IA heard", "IA allowed", "Case partly heard", "Finally heard",
  "Interim order", "Dismissed", "Allowed", "Disposed of",
];

const PARTY_3 = [
  { value: "firstParty", label: "1st Party" },
  { value: "secondParty", label: "2nd Party" },
  { value: "bothParty", label: "Both" },
];

const settled = (v) => v.settledOrFailed === "1";
const toSecond = (v) => settled(v) && ["secondParty", "bothParty"].includes(v.payableTo);
const toFirst = (v) => settled(v) && ["firstParty", "bothParty"].includes(v.payableTo);
const compl = (v) => v.complainceReq === "1";
const byFirst = (v) => compl(v) && ["firstParty", "bothParty"].includes(v.requiredBy);
const bySecond = (v) => compl(v) && ["secondParty", "bothParty"].includes(v.requiredBy);

export const conciliationSchema = {
  title: "Add Conciliation Court Case",
  steps: [
    /* ---------------- 1. Basic Information ---------------- */
    {
      key: "basic",
      label: "Basic Information",
      fields: [
        { name: "firstParty", label: "First Party", type: "list", required: true, span: 6 },
        { name: "secondParty", label: "Second Party", type: "list", required: true, span: 6 },

        { name: "conciliators", label: "Conciliators", type: "table", span: 6,
          columns: [
            { name: "nameOfConciliator", label: "Name", type: "text" },
            { name: "designationCapacity", label: "Designation/capacity held", type: "text" },
          ] },
        { name: "dateReqCon", label: "Date of request for conciliation", type: "date", required: true, span: 3 },
        { name: "dateOfRefToCon", label: "Date of reference to Conciliators", type: "date", required: true, span: 3 },

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

        { name: "deptDivision", label: "Department/Division in organization to which case belong", type: "chips",
          required: true, span: 12, options: DEPARTMENTS, hint: "You can select multiple departments" },
        { name: "prevConnectCases", label: "Previous/Connected cases", type: "radio", required: true, span: 6, options: YES_NO },
        { name: "caseName", label: "Case Name", type: "text", required: true, span: 6 },

        { name: "prevConnData", label: "Previous / Connected cases", type: "table", span: 12,
          showIf: (v) => v.prevConnectCases === "1",
          columns: [
            { name: "prevConnectedCourt", label: "Court", type: "text" },
            { name: "prevConnectedCaseNumber", label: "Case Number", type: "text" },
            { name: "prevConnectedCNRNumber", label: "CNR Number", type: "text" },
            { name: "courtStatus", label: "Case Status", type: "select", options: ["Pending", "Disposed"] },
            { name: "description", label: "Details (in brief)", type: "textarea" },
          ] },
      ],
    },

    /* ---------------- 2. Conciliation Status ---------------- */
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

        { name: "settledOrFailed", label: "2. Outcome", type: "radio", required: true, span: 6,
          options: [{ value: "1", label: "Settled" }, { value: "0", label: "Failed" }] },
        { name: "failedDescription", label: "Reason for Failure", type: "textarea", required: true, span: 6,
          showIf: (v) => v.settledOrFailed === "0" },
        { name: "payableTo", label: "Amount Payable to?", type: "select", required: true, span: 6,
          showIf: settled,
          options: [{ value: "secondParty", label: "2nd Party" }, { value: "firstParty", label: "1st Party" }, { value: "bothParty", label: "Both" }] },

        { name: "amountPayableToSecByFrst", label: "Amount payable to 2nd party by 1st party", type: "number", required: true, span: 6, showIf: toSecond },
        { name: "payableToSecByFrstDescription", label: "Description", type: "textarea", required: true, span: 6, showIf: toSecond },
        { name: "amountPayableToFrstBySec", label: "Amount payable to 1st party by 2nd party", type: "number", required: true, span: 6, showIf: toFirst },
        { name: "payableToFrstBySecDescription", label: "Description", type: "textarea", required: true, span: 6, showIf: toFirst },

        { name: "complainceReq", label: "3. Compliance Required", type: "radio", required: true, span: 12, options: YES_NO },
        { name: "requiredBy", label: "Required By", type: "select", required: true, span: 6, showIf: compl, options: PARTY_3 },
        { name: "briefOfComplaince", label: "Brief of Compliance", type: "textarea", required: true, span: 6, showIf: compl },
        { name: "lastDateOfComFirstParty", label: "Last Date of compliance by 1st party", type: "date", span: 3, showIf: byFirst },
        { name: "dateOfComFirstParty", label: "Date of compliance by 1st party", type: "date", span: 3, showIf: byFirst },
        { name: "lastDateOfComSecParty", label: "Last Date of compliance by 2nd party", type: "date", span: 3, showIf: bySecond },
        { name: "dateOfComSecParty", label: "Date of compliance by 2nd party", type: "date", span: 3, showIf: bySecond },

        { name: "complainceDone", label: "4. Whether Compliance done?", type: "radio", required: true, span: 12, options: YES_NO },
      ],
    },
  ],
};