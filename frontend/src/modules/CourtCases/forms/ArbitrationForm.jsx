import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BASE_PATH } from "../CourtCases";
import CaseForm from "../pages/CaseForm";
import { arbitrationSchema } from "./arbitration.schema";
import { getSessionOrganisationId, getCurrentUserId } from "../../../utils/authSession";
import { toOptions } from "../../../utils/option";
// your standard notifier (adjust the path if your notify.js lives elsewhere)
import {
  useNotifier, toastSuccess, toastError, toastWarning, getErrorMessage, withReason,
} from "../../../utils/notify";

import api, {
  fetchLastArbitrationCaseNo, createArbitrationCase, addArbitrationClaimantAndRespondent,
  addPrevConnCases, addDetailsOfCounsel, addHearingCases, addInterimOrder,
  updateArbitCaseStatus, courtCaseUploadDocument, fetchOrganisationName,
  fetchDomains, fetchSubDomains, fetchDepartments, fetchCourtCaseById, fetchSubTableData,
} from "../api";

const pick = (res, ...keys) => {
  if (res && typeof res === "object") {
    for (const k of keys) if (res[k] != null) return res[k];
    return undefined;
  }
  return res;
};
const getOrgId = () => pick(getSessionOrganisationId(), "organisationID", "organisation_id", "organisationId");
const getUserId = () => pick(getCurrentUserId(), "userID", "user_id", "userId");

const clean = (list) => list.map((x) => x.trim()).filter(Boolean);
const nn = (x) => (x === "" || x === undefined ? null : x);
const nullifyRows = (rows) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, nn(v)])));

const blank = (x) => String(x ?? "").trim() === "";
// table rows the user actually typed into (every table starts with one empty row)
const used = (rows, keys) => rows.filter((r) => keys.some((k) => !blank(r[k])));
const incomplete = (rows, keys) => rows.some((r) => keys.some((k) => blank(r[k])));

// returns an error sentence, or "" when the table is OK
function checkTable(rows, keys, label, required) {
  const u = used(rows, keys);
  if (required && u.length === 0) return `Please enter ${label}.`;
  if (incomplete(u, keys)) return `Please complete every column in ${label}, or remove the empty row.`;
  return "";
}

const toDeptArray = (x) =>
  (Array.isArray(x) ? x : x ? [x] : []).map((i) => (i && typeof i === "object" ? i.value ?? i.id : i));

const STAGES = {
  1: "Hearing Started", 2: "Hearing Not Started",
  3: "Defence Statement Filed", 4: "Defence Statement Not Filed",
  5: "Interim Order Passed", 6: "No Interim Order",
  7: "Award Passed", 8: "Award Not Passed",
};

const makeOptions = (name, res) => {
  const seen = new Set();
  const dup = [];
  const out = [];
  for (const o of toOptions(res) || []) {
    const k = String(o.value);
    if (seen.has(k)) dup.push(k);
    else { seen.add(k); out.push(o); }
  }
  if (dup.length)
    console.warn(`[ArbitrationForm] "${name}" options had duplicate values`, dup,
      "-> toOptions() is using a non-unique column as the value (use the row's own id column).");
  return out;
};

const asRows = (res) => {
  const d = res?.data ?? res;
  return Array.isArray(d) ? d : [];
};

const day = (x) => (x ? String(x).slice(0, 10) : "");
const flag = (x) => (x === true || x === 1 || x === "1" ? "1" : x === false || x === 0 || x === "0" ? "0" : "");
const str = (x) => (x == null ? "" : String(x));
const rowsOr = (arr) => (arr.length ? arr : [{}]);

async function loadCaseValues(id) {
  const [main, pra, arbit, pcc, doc, hearing, interim, parties] = await Promise.all([
    fetchCourtCaseById("Arbitration", id),
    fetchSubTableData("PRA", id),
    fetchSubTableData("Arbit", id),
    fetchSubTableData("PCC", id),
    fetchSubTableData("DOC", id),
    fetchSubTableData("Hearing", id),
    fetchSubTableData("Interim", id),
    api.get(`/get-arbitration-claimant-and-respondent/${id}`),
  ]);

  const c = asRows(main)[0] || {};
  const cr = asRows(parties)[0] || {};

  return {
    claimants: cr.claimant ? cr.claimant.split("|") : [""],
    respondents: cr.respondents ? cr.respondents.split("|") : [""],
    partyData: rowsOr(asRows(pra).map((r) => ({ partyName: r.party_name, requestDate: day(r.date_of_reference) }))),
    arbitratorsData: rowsOr(asRows(arbit).map((r) => ({
      arbitratorName: r.name_of_arbitrators, designationCapacity: r.designation_capacity, partyNominating: r.party_nominating,
    }))),
    partyRefArbitName: str(c.name_of_party_referring_matter),
    dateOfReference: day(c.date_of_reference),
    domOrInterArbit: flag(c.is_domestic_or_international),
    caseName: str(c.case_name),
    claimAmount: str(c.claim_amount),
    counterClaim: str(c.counter_claim_amount),
    placeOfArbitration: str(c.place_of_arbitration),
    domain: str(c.domain),
    subDomain: str(c.sub_domain),
    caseDescription: str(c.case_description),
    deptDivision: c.dept_division ? String(c.dept_division).split(",") : [],
    prevConnectCases: flag(c.is_prev_conn_cases),
    prevConnData: rowsOr(asRows(pcc).map((r) => ({
      prevConnectedCourt: r.prev_conn_case_court_name, prevConnectedCaseNumber: r.prev_conn_case_no,
      prevConnectedCNRNumber: r.prev_conn_cnr_no, caseStatus: r.case_status, caseDetails: r.details,
    }))),
    counselData: rowsOr(asRows(doc).map((r) => ({
      nameOfCounsel: r.name_of_counsel, counselContact: r.contact, typeCounsel: r.type_of_counsel, counselDetails: r.details,
    }))),

    hearingStarted: flag(c.is_hearing_started),
    hearingData: rowsOr(asRows(hearing).map((r) => ({
      hearingDate: day(r.date_of_hearing), detailsOfHearing: r.details_of_hearing,
      nextHearingDate: day(r.next_date_of_hearing), outcomeOfHearing: r.outcome_of_hearing,
    }))),
    defenceStatement: flag(c.is_defence_statement_filed),
    interimOrder: flag(c.have_interim_order),
    interimData: rowsOr(asRows(interim).map((r) => ({
      natureInterimOrder: r.nature_of_interim_order, dateOfInterimOrder: day(r.date_of_interim_order),
      detailsOfInterimOrder: r.details_of_interim_order, complainceReq: flag(r.is_action_req_complaince),
      lastDateOfDoingAction: day(r.last_date_for_complaince),
    }))),
    awardPassed: flag(c.is_award_passed),
    awardPassedDate: day(c.award_passed_date),
    natureOfAward: str(c.nature_of_award),
    amountAnyAwarded: str(c.amounts_if_awarded),
    awardedClaimAmount: str(c.awarded_claim_amount),
    awardedCounterClaimAmount: str(c.awarded_counter_claim_amount),
    briefOfAward: str(c.brief_of_award),
    actionReqCom: flag(c.is_action_req_compliance),
    lastDateForComplaince: day(c.last_date_of_compliance),
    whetJudgeAccept: str(c.wheth_award_accept_appealed_file),
    awardCompiled: flag(c.is_award_compiled),
    dateOfComplaince: day(c.date_of_compliance),
    detailsOfComplaince: str(c.details_of_compliance),
    reasonForNonComplaince: str(c.reason_for_non_compliance),
    appealRevCaseNumber: str(c.case_number),
    appealRevCourtName: str(c.court_name),
    appealRevCNRNumber: str(c.cnr_number),
    appealRevFillingDate: day(c.filing_date),
  };
}


export default function ArbitrationForm({ triggerNotification }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("edit") || params.get("caseId");

  const [caseID, setCaseID] = useState(editId || "");
  const [initialValues, setInitialValues] = useState(null);
  const [opts, setOpts] = useState({ domain: [], subDomain: [], deptDivision: [] });

  /* ---- notifications: your standard notifier (title + message) ---- */
  const notifier = useNotifier(triggerNotification);

  const notify = (type, message, title) => {
    try {
      if (typeof triggerNotification === "function") {
        if (type === "success") return notifier(toastSuccess(title || "Saved", message));
        if (type === "error") return notifier(toastError(title || "Action Failed", message));
        return notifier(toastWarning(title || "Check the Form", message));
      }
      console.warn("[ArbitrationForm] triggerNotification prop missing - using alert fallback");
    } catch (err) {
      console.error("[ArbitrationForm] notifier failed:", err);
    }
    alert(`${title ? `${title}: ` : ""}${message}`);
  };

  // validation problem => warning; server/API problem => pass "error"
  const fail = (message, type = "warning", title) => {
    console.warn("[ArbitrationForm] blocked:", message);
    notify(type, message, title);
    return { ok: false };
  };

  const failApi = (e, sentence, title) =>
    fail(withReason(sentence, getErrorMessage(e)), "error", title);

  // dropdowns
  useEffect(() => {
    const organisationID = getOrgId();
    (async () => {
      try {
        const [d, dep] = await Promise.all([fetchDomains(), fetchDepartments(organisationID)]);
        setOpts((p) => ({ ...p, domain: makeOptions("domain", d), deptDivision: makeOptions("deptDivision", dep) }));
      } catch (e) {
        notify("error", withReason("The dropdown lists could not be loaded. Refresh the page.", getErrorMessage(e)), "Could Not Load Data");
      }
    })();
  }, []);

  // edit mode prefill
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const values = await loadCaseValues(editId);
        setInitialValues(values);
        if (values.domain) loadSubDomains(values.domain);
      } catch (e) {
        console.error("[ArbitrationForm] load failed:", e);
        notify("error", withReason(`Case ${editId} could not be loaded.`, getErrorMessage(e)), "Could Not Load Data");
      }
    })();
  }, [editId]);

  // endpoint returns ALL sub domains -> filter by the chosen domain when rows carry a domain id
  const loadSubDomains = async (domainId) => {
    try {
      const res = await fetchSubDomains(domainId);
      const rows = asRows(res);
      const hasDomainCol = rows.some((r) => r.domain_id != null);
      const filtered = hasDomainCol ? rows.filter((r) => String(r.domain_id) === String(domainId)) : rows;
      setOpts((p) => ({ ...p, subDomain: makeOptions("subDomain", { ...res, data: filtered }) }));
    } catch (e) {
      notify("error", withReason("The sub domains could not be loaded.", getErrorMessage(e)), "Could Not Load Data");
    }
  };

  const onFieldChange = async (name, val) => {
    if (name !== "domain") return;
    setOpts((p) => ({ ...p, subDomain: [] }));
    if (val) await loadSubDomains(val);
  };

  /* ---------------- Step 1: Basic Information ---------------- */
  const generateCaseID = async (organisationID) => {
    const org = String(organisationID).padStart(2, "0");
    const res = await fetchLastArbitrationCaseNo(org);
    const last = res?.data?.[0]?.case_id || `AR${org}C00`;
    const m = last.match(/C(\d+)$/);
    const next = m ? String(parseInt(m[1], 10) + 1).padStart(m[1].length, "0") : "01";
    return `AR${org}C${next}`;
  };

  const saveBasic = async (v) => {
    const organisationID = getOrgId();
    const userID = getUserId();
    if (!organisationID) return fail("Your session has expired. Please log in again.", "error", "Session Expired");

    const claimants = clean(v.claimants);
    const respondents = clean(v.respondents);
    if (!claimants.length) return fail("Please enter at least one Claimant.", "warning", "Required Field Missing");
    if (!respondents.length) return fail("Please enter at least one Respondent.", "warning", "Required Field Missing");

    const partyKeys = ["partyName", "requestDate"];
    const arbKeys = ["arbitratorName", "designationCapacity", "partyNominating"];
    const prevKeys = ["prevConnectedCourt", "prevConnectedCaseNumber", "prevConnectedCNRNumber", "caseStatus", "caseDetails"];

    const err =
      checkTable(v.partyData, partyKeys, "the Party Requesting Arbitration (name and date)", true) ||
      checkTable(v.arbitratorsData, arbKeys, "the Arbitrator details", true) ||
      (v.prevConnectCases === "1" ? checkTable(v.prevConnData, prevKeys, "the Previous / Connected cases", true) : "");
    if (err) return fail(err);

    // counsel is optional, but a typed row needs a name and (if given) a valid phone number
    const counsel = used(v.counselData, ["nameOfCounsel", "counselContact", "typeCounsel", "counselDetails"]);
    for (const c of counsel) {
      if (blank(c.nameOfCounsel)) return fail("Please enter the name of the Counsel.", "warning", "Required Field Missing");
      if (!blank(c.counselContact) && !/^\d{10}$/.test(c.counselContact.trim()))
        return fail("Please enter a valid 10-digit phone number for the counsel.");
    }

    const deptDivision = toDeptArray(v.deptDivision);
    if (!deptDivision.length) return fail("Please select at least one Department/Division.", "warning", "Required Field Missing");

    try {
      const newCaseID = editId || (await generateCaseID(organisationID));

      await addArbitrationClaimantAndRespondent({ caseID: newCaseID, claimants, respondents });

      if (v.prevConnectCases === "1")
        await addPrevConnCases({ caseID: newCaseID, prevConnCaseData: used(v.prevConnData, prevKeys) });

      if (counsel.length)
        await addDetailsOfCounsel({
          caseID: newCaseID,
          detailsOfCounselData: counsel.map((c) => ({
            nameOfCounsel: c.nameOfCounsel.trim(),
            counselContact: c.counselContact?.trim() ?? "",
            typeOfCounsel: c.typeCounsel ?? "",
            counselDetails: c.counselDetails ?? "",
          })),
        });

      let organisationName;
      try {
        const orgRes = await fetchOrganisationName(organisationID);
        organisationName = orgRes?.data?.[0]?.organisation_name;
      } catch { /* optional */ }

      const res = await createArbitrationCase({
        caseID: newCaseID,
        partyData: used(v.partyData, partyKeys),
        partyRefArbitName: v.partyRefArbitName,
        dateOfReference: nn(v.dateOfReference),
        domOrInterArbit: v.domOrInterArbit,
        arbitratorsData: used(v.arbitratorsData, arbKeys),
        claimAmount: nn(v.claimAmount),
        caseName: v.caseName,
        counterClaimAmount: nn(v.counterClaim),
        placeOfArbitration: v.placeOfArbitration,
        domain: v.domain,
        subDomain: v.subDomain,
        caseDescription: v.caseDescription,
        deptDivision,
        prevConnCaseOrNot: v.prevConnectCases,
        organisationID, userID, organisationName,
      });

      if (res?.status && res.status !== 201)
        return fail("The arbitration case could not be created. Please try again.", "error", "Save Failed");

      const savedId = res?.data?.caseID || newCaseID;
      setCaseID(savedId);
      notify(
        "success",
        editId
          ? `Basic information for case ${savedId} was updated. Continue with the Case Status stage.`
          : `Case ${savedId} was created. Continue with the Case Status stage.`,
        editId ? "Case Updated" : "Case Created"
      );
      return { ok: true };
    } catch (e) {
      console.error("[ArbitrationForm] saveBasic failed:", e);
      return failApi(e, "The basic information could not be saved.", "Save Failed");
    }
  };

  /* ---------------- Step 2: Case Status ---------------- */
  const saveStatus = async (v) => {
    if (!caseID) return fail("Please save the Basic Information first.");
    const userID = getUserId();

    const hearingKeys = ["hearingDate", "detailsOfHearing", "outcomeOfHearing"]; // nextHearingDate optional
    const interimKeys = ["natureInterimOrder", "dateOfInterimOrder", "detailsOfInterimOrder", "complainceReq"];

    const err =
      (v.hearingStarted === "1" ? checkTable(v.hearingData, hearingKeys, "the Details of Hearing", true) : "") ||
      (v.interimOrder === "1" ? checkTable(v.interimData, interimKeys, "the Details of Interim Order", true) : "");
    if (err) return fail(err);

    try {
      if (v.hearingStarted === "1")
        await addHearingCases({
          caseID,
          hearingCaseData: nullifyRows(used(v.hearingData, [...hearingKeys, "nextHearingDate"])),
        });

      if (v.defenceStatement === "1" && v.defenceDoc instanceof File) {
        const fd = new FormData();
        fd.append("file", v.defenceDoc);
        fd.append("caseID", caseID);
        fd.append("path", "Arbitration");
        await courtCaseUploadDocument(fd);
      }

      if (v.interimOrder === "1")
        await addInterimOrder({
          caseID,
          interimOrderData: nullifyRows(used(v.interimData, [...interimKeys, "lastDateOfDoingAction"])),
        });

      const award = v.awardPassed === "1";
      const stageID = award ? 7 : v.awardPassed === "0" ? 8
        : v.interimOrder === "1" ? 5 : v.interimOrder === "0" ? 6
        : v.defenceStatement === "1" ? 3 : v.defenceStatement === "0" ? 4
        : v.hearingStarted === "1" ? 1 : 2;

      const res = await updateArbitCaseStatus({
        caseID,
        isHearingStarted: v.hearingStarted,
        isDefenceStatement: v.defenceStatement,
        isInterimOrder: v.interimOrder,
        isAwardPassed: v.awardPassed,
        ...(award && {
          awardPassedDate: nn(v.awardPassedDate),
          natureOfAward: v.natureOfAward,
          amountAnyAwarded: v.amountAnyAwarded,
          awardedClaimAmount: v.amountAnyAwarded === "Claim" ? nn(v.awardedClaimAmount) : null,
          awardedCounterClaimAmount: v.amountAnyAwarded === "Counter Claim" ? nn(v.awardedCounterClaimAmount) : null,
          briefOfAward: v.briefOfAward,
          isActionReqForCom: v.actionReqCom,
          lastDateForComplaince: v.actionReqCom === "1" ? nn(v.lastDateForComplaince) : null,
          whetJudgeAccept: v.whetJudgeAccept,
          awardCompiled: v.awardCompiled,
          dateOfComplaince: nn(v.dateOfComplaince),
          detailsOfComplaince: v.detailsOfComplaince,
          reasonForNonComplaince: v.reasonForNonComplaince,
          appealRevCaseNumber: v.appealRevCaseNumber,
          appealRevCourtName: v.appealRevCourtName,
          appealRevCNRNumber: v.appealRevCNRNumber,
          appealRevFillingDate: nn(v.appealRevFillingDate),
        }),
        userID,
        stageID,
        stage: STAGES[stageID],
      });

      if (res?.status && res.status !== 200)
        return fail("The case status could not be updated. Please try again.", "error", "Update Failed");

      notify("success", `The status of case ${caseID} was updated.`, "Status Updated");
      return { ok: true };
    } catch (e) {
      console.error("[ArbitrationForm] saveStatus failed:", e);
      return failApi(e, "The case status could not be updated.", "Update Failed");
    }
  };

  const onSaveStep = (stepKey, values) =>
    stepKey === "basic" ? saveBasic(values) : saveStatus(values);

  return (
    <CaseForm
      schema={arbitrationSchema}
      initialValues={initialValues}
      lockedSteps={caseID ? [] : ["status"]}
      dynamicOptions={opts}
      onFieldChange={onFieldChange}
      onSaveStep={onSaveStep}
      onValidationError={(msg) => notify("warning", msg, "Required Fields Missing")}
      onComplete={() => setTimeout(() => navigate(`${BASE_PATH}/arbitration`), 900)}
    />
  );
}