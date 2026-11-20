import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BASE_PATH } from "../CourtCases";
import CaseForm from "../pages/CaseForm";
import { conciliationSchema } from "./conciliation.schema";
import { getSessionOrganisationId, getCurrentUserId } from "../../../utils/authSession";
import {
  useNotifier, toastSuccess, toastError, toastWarning, getErrorMessage, withReason,
} from "../../../utils/notify";

import {
  fetchLastConciliationCaseNo, createConciliationCase,
  addConciliationFirstPartyAndSecondParty, addConciliators, addConciliationFirstParty,
  addConciliationSecondParties, addConciliationPrevConnCases, addConciliatorsHearingData,
  createConciliationStatus, fetchOrganisationName, fetchCourtCaseById, fetchConciliationSubTableData,
  getConciliationFirstPartyAndSecondParty
} from "../api";

const clean = (list) => list.map((x) => x.trim()).filter(Boolean);
const nn = (x) => (x === "" || x === undefined ? null : x);
const nullifyRows = (rows) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, nn(v)])));

const blank = (x) => String(x ?? "").trim() === "";
// table rows the user actually typed into (every table starts with one empty row)
const used = (rows, keys) => rows.filter((r) => keys.some((k) => !blank(r[k])));
// rows that are typed into but miss a required column
const missing = (rows, requiredKeys) => rows.some((r) => requiredKeys.some((k) => blank(r[k])));

// returns an error sentence, or "" when the table is OK
function checkTable(rows, allKeys, requiredKeys, label) {
  const u = used(rows, allKeys);
  if (u.length === 0) return `Please enter ${label}.`;
  if (missing(u, requiredKeys)) return `Please complete the required columns in ${label}, or remove the empty row.`;
  return "";
}

const toDeptArray = (x) =>
  (Array.isArray(x) ? x : x ? [x] : []).map((i) => (i && typeof i === "object" ? i.value ?? i.id : i));

const STAGES = {
  1: "Hearing Started",
  2: "Hearing Not Started",
  3: "Settled",
  5: "Compliance Pending",
  7: "Disposed",
};

function getStage(v) {
  const settled = v.settledOrFailed === "1";
  const failed = v.settledOrFailed === "0";
  const compReq = v.complainceReq === "1";
  const compDone = v.complainceDone === "1";

  if (failed) return 7;                        
  if (settled && (!compReq || compDone)) return 7; 
  if (settled && compReq) return 5;            
  return v.hearingStarted === "1" ? 1 : 2;
}

const asRows = (res) => {
  const d = res?.data ?? res;
  return Array.isArray(d) ? d : [];
};
const day = (x) => (x ? String(x).slice(0, 10) : "");
const flag = (x) => (x === true || x === 1 || x === "1" ? "1" : x === false || x === 0 || x === "0" ? "0" : "");
const str = (x) => (x == null ? "" : String(x));
const rowsOr = (arr) => (arr.length ? arr : [{}]);
const splitParties = (v) => {
  const arr = str(v).split("|").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : [""];
};
const safe = (p) => p.catch(() => null); // one failing request must not block the rest

async function loadCaseValues(id) {
  // typeName values come from getSubTablesCourtCaseData on the server
  const [mainRes, parties, conciliators, firstClaims, secondClaims, pcc, hearing] = await Promise.all([
  safe(fetchCourtCaseById("Conciliation", id)),
  safe(getConciliationFirstPartyAndSecondParty(id)),      // <- changed
  safe(fetchConciliationSubTableData("conciliator", id)),
  safe(fetchConciliationSubTableData("firstParties", id)),
  safe(fetchConciliationSubTableData("secondParties", id)),
  safe(fetchConciliationSubTableData("PCC", id)),
  safe(fetchConciliationSubTableData("Hearing", id)),
]);

  let c = asRows(mainRes)[0];
  if (!c) c = asRows(await safe(fetchConciliationSubTableData("main", id)))[0] || {}; // fallback
  const p = asRows(parties)[0] || {};

  return {
    /* ---- Step 1 ---- */
    firstParty: splitParties(p.first_party),
    secondParty: splitParties(p.second_party),
    conciliators: rowsOr(asRows(conciliators).map((r) => ({
      nameOfConciliator: str(r.name), designationCapacity: str(r.designation_capacity),
    }))),
    dateReqCon: day(c.date_of_request_conciliation),
    dateOfRefToCon: day(c.date_of_reference_to_conciliators),
    claimFirstParty: rowsOr(asRows(firstClaims).map((r) => ({
      firstClaimDescription: str(r.short_description), firstPartyclaimAmount: str(r.amount),
    }))),
    claimSecondParty: rowsOr(asRows(secondClaims).map((r) => ({
      secondClaimDescription: str(r.second_short_desc), secondPartyclaimAmount: str(r.amount),
    }))),
    deptDivision: c.dept_division ? String(c.dept_division).split(",").map((x) => x.trim()) : [],
    prevConnectCases: flag(c.is_pre_conn_case),
    caseName: str(c.case_name),
    prevConnData: rowsOr(asRows(pcc).map((r) => ({
      prevConnectedCourt: str(r.prev_conn_case_court_name),
      prevConnectedCaseNumber: str(r.prev_conn_case_no),
      prevConnectedCNRNumber: str(r.prev_conn_cnr_no),
      courtStatus: str(r.case_status),
      description: str(r.details),
    }))),

    /* ---- Step 2 ---- */
    hearingStarted: flag(c.is_hearing_started),
    hearingData: rowsOr(asRows(hearing).map((r) => ({
      dateOfHearing: day(r.date_of_hearing),
      nameOfConciliator: str(r.name_of_conciliators),
      nameOfParties: str(r.name_of_parties),
      location: str(r.location),
      detailsOfHearing: str(r.details_of_hearing),
      outcomeOfHearing: str(r.outcome_hearing),
    }))),
    settledOrFailed: flag(c.is_outcome),
    failedDescription: str(c.reason_fail_desc),
    payableTo: str(c.amount_payable_to),
    amountPayableToSecByFrst: str(c.amount_pay_to_sec_to_one),
    payableToSecByFrstDescription: str(c.desc_of_sec_to_one),
    amountPayableToFrstBySec: str(c.amount_pay_to_one_to_sec),
    payableToFrstBySecDescription: str(c.desc_of_one_to_sec),
    complainceReq: flag(c.is_complaince_required),
    requiredBy: str(c.required_by),
    briefOfComplaince: str(c.brief_of_complaince),
    lastDateOfComFirstParty: day(c.last_date_comp_by_one),
    dateOfComFirstParty: day(c.date_of_comp_by_of_one),
    lastDateOfComSecParty: day(c.last_date_comp_by_two),
    dateOfComSecParty: day(c.date_of_comp_by_of_two),
    complainceDone: flag(c.is_complaince_Done ?? c.is_complaince_done),
  };
}

export default function ConciliationForm({ triggerNotification }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("edit") || params.get("caseId");

  const [caseID, setCaseID] = useState(editId || "");
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(!!editId);

  const notifier = useNotifier(triggerNotification);

  const notify = (type, message, title) => {
    try {
      if (typeof triggerNotification === "function") {
        if (type === "success") return notifier(toastSuccess(title || "Saved", message));
        if (type === "error") return notifier(toastError(title || "Action Failed", message));
        return notifier(toastWarning(title || "Check the Form", message));
      }
    } catch (err) {
      console.error("[ConciliationForm] notifier failed:", err);
    }
    alert(`${title ? `${title}: ` : ""}${message}`);
  };

  const fail = (message, type = "warning", title) => {
    notify(type, message, title);
    return { ok: false };
  };
  const failApi = (e, sentence, title) => fail(withReason(sentence, getErrorMessage(e)), "error", title);

  // edit mode prefill
  useEffect(() => {
    if (!editId) return;
    setCaseID(editId);
    setLoading(true);
    (async () => {
      try {
        setInitialValues(await loadCaseValues(editId));
      } catch (e) {
        console.error("[ConciliationForm] load failed:", e);
        notify("error", withReason(`Case ${editId} could not be loaded.`, getErrorMessage(e)), "Could Not Load Data");
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  /* ---------------- Step 1: Basic Information ---------------- */
  const generateCaseID = async (organisationID) => {
    const org = String(organisationID).padStart(2, "0");
    const res = await fetchLastConciliationCaseNo(org);
    const last = res?.data?.[0]?.case_id || `CO${org}C00`;
    const m = last.match(/C(\d+)$/);
    const next = m ? String(parseInt(m[1], 10) + 1).padStart(m[1].length, "0") : "01";
    return `CO${org}C${next}`;
  };

  const saveBasic = async (v) => {
    const organisationID = getSessionOrganisationId(); 
    const userID = getCurrentUserId();                 
    if (!userID) return fail("Your session has expired. Please log in again.", "error", "Session Expired");
    if (!editId && !organisationID)
      return fail("Your account is not linked to an organisation, so a case cannot be created.", "error", "Cannot Create Case");

    const firstParty = clean(v.firstParty);
    const secondParty = clean(v.secondParty);
    if (!firstParty.length) return fail("Please enter at least one First Party.", "warning", "Required Field Missing");
    if (!secondParty.length) return fail("Please enter at least one Second Party.", "warning", "Required Field Missing");

    const conKeys = ["nameOfConciliator", "designationCapacity"];
    const firstKeys = ["firstClaimDescription", "firstPartyclaimAmount"];
    const secondKeys = ["secondClaimDescription", "secondPartyclaimAmount"];
    const prevKeys = ["prevConnectedCourt", "prevConnectedCaseNumber", "prevConnectedCNRNumber", "courtStatus", "description"];

    const err =
      checkTable(v.conciliators, conKeys, conKeys, "the Conciliators (name and designation)") ||
      checkTable(v.claimFirstParty, firstKeys, ["firstClaimDescription"], "the First Party claim") ||
      checkTable(v.claimSecondParty, secondKeys, ["secondClaimDescription"], "the Second Party claim") ||
      (v.prevConnectCases === "1"
        ? checkTable(v.prevConnData, prevKeys, ["prevConnectedCourt", "prevConnectedCaseNumber"], "the Previous / Connected cases (court and case number)")
        : "");
    if (err) return fail(err);

    const deptDivision = toDeptArray(v.deptDivision);
    if (!deptDivision.length) return fail("Please select at least one Department/Division.", "warning", "Required Field Missing");

    try {
      const newCaseID = editId || (await generateCaseID(organisationID));

      await addConciliationFirstPartyAndSecondParty({ caseID: newCaseID, firstParty, secondParty });
      await addConciliators({ caseID: newCaseID, conciliatorsData: nullifyRows(used(v.conciliators, conKeys)) });
      await addConciliationFirstParty({ caseID: newCaseID, firstPartiesData: nullifyRows(used(v.claimFirstParty, firstKeys)) });
      await addConciliationSecondParties({ caseID: newCaseID, secondPartiesdata: nullifyRows(used(v.claimSecondParty, secondKeys)) });

      if (v.prevConnectCases === "1")
        await addConciliationPrevConnCases({ caseID: newCaseID, prevConnCaseData: nullifyRows(used(v.prevConnData, prevKeys)) });

      let organisationName;
      if (!editId) {
        try {
          const orgRes = await fetchOrganisationName(organisationID);
          organisationName = orgRes?.data?.[0]?.organisation_name;
        } catch { }
      }

      const res = await createConciliationCase({
        caseID: newCaseID,
        dateOfRequestConciliation: nn(v.dateReqCon),
        dateOFReferenceConciliators: nn(v.dateOfRefToCon),
        caseName: v.caseName,
        deptDivision,
        prevConnCaseOrNot: v.prevConnectCases,
        organisationID, userID, organisationName,
      });
      if (res?.status && res.status !== 201 && res.status !== 200)
        return fail("The conciliation case could not be saved. Please try again.", "error", "Save Failed");

      const savedId = res?.data?.result?.recordset?.[0]?.case_id || newCaseID;
      setCaseID(savedId);
      notify(
        "success",
        editId
          ? `Basic information for case ${savedId} was updated. Continue with the Conciliation Status stage.`
          : `Case ${savedId} was created. Continue with the Conciliation Status stage.`,
        editId ? "Case Updated" : "Case Created"
      );
      return { ok: true };
    } catch (e) {
      console.error("[ConciliationForm] saveBasic failed:", e);
      return failApi(e, "The basic information could not be saved.", "Save Failed");
    }
  };

  /* ---------------- Step 2: Conciliation Status ---------------- */
  const saveStatus = async (v) => {
    if (!caseID) return fail("Please save the Basic Information first.");
    const userID = getCurrentUserId();
    if (!userID) return fail("Your session has expired. Please log in again.", "error", "Session Expired");

    const hearingKeys = ["dateOfHearing", "nameOfConciliator", "nameOfParties", "location", "detailsOfHearing", "outcomeOfHearing"];
    if (v.hearingStarted === "1") {
      const err = checkTable(v.hearingData, hearingKeys, ["dateOfHearing"], "the Hearing details (date is required)");
      if (err) return fail(err);
    }

    try {
      if (v.hearingStarted === "1")
        await addConciliatorsHearingData({
          caseID,
          conciliatorsHearingData: nullifyRows(used(v.hearingData, hearingKeys)),
        });

      const out = v.settledOrFailed;
      const req = v.complainceReq === "1";
      const toSec = out === "1" && ["secondParty", "bothParty"].includes(v.payableTo);
      const toFirst = out === "1" && ["firstParty", "bothParty"].includes(v.payableTo);
      const byFirst = req && ["firstParty", "bothParty"].includes(v.requiredBy);
      const bySec = req && ["secondParty", "bothParty"].includes(v.requiredBy);

      const stageID = getStage(v);

      const res = await createConciliationStatus({
        caseID,
        conciliatorsHearingCaseOrNot: v.hearingStarted,
        isOutcomeOrNot: out,
        amountPayable: out === "1" ? nn(v.payableTo) : null,
        amountpaySectoOne: toSec ? nn(v.amountPayableToSecByFrst) : null,
        secDescription: toSec ? nn(v.payableToSecByFrstDescription) : null,
        amountpayOnetoSec: toFirst ? nn(v.amountPayableToFrstBySec) : null,
        oneDescription: toFirst ? nn(v.payableToFrstBySecDescription) : null,
        reasonForFailure: out === "0" ? nn(v.failedDescription) : null,
        iscompRequiredOrNot: v.complainceReq,
        requiredBy: req ? nn(v.requiredBy) : null,
        brief: req ? nn(v.briefOfComplaince) : null,
        lastDateCompbyOne: byFirst ? nn(v.lastDateOfComFirstParty) : null,
        dateOfCompbyOne: byFirst ? nn(v.dateOfComFirstParty) : null,
        lastDateCompbySec: bySec ? nn(v.lastDateOfComSecParty) : null,
        dateOfCompbySec: bySec ? nn(v.dateOfComSecParty) : null,
        complainceDoneOrNot: v.complainceDone,
        userID,
        stageID,
        stage: STAGES[stageID],
      });

      if (res?.status && res.status !== 200 && res.status !== 201)
        return fail("The conciliation status could not be updated. Please try again.", "error", "Update Failed");

      notify("success", `The status of case ${caseID} was updated.`, "Status Updated");
      return { ok: true };
    } catch (e) {
      console.error("[ConciliationForm] saveStatus failed:", e);
      return failApi(e, "The conciliation status could not be updated.", "Update Failed");
    }
  };

  const onSaveStep = (stepKey, values) =>
    stepKey === "basic" ? saveBasic(values) : saveStatus(values);

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading case...</div>;

  return (
    <CaseForm
      key={editId || "new"}
      schema={conciliationSchema}
      initialValues={initialValues}
      lockedSteps={caseID ? [] : ["status"]}
      onSaveStep={onSaveStep}
      onValidationError={(msg) => notify("warning", msg, "Required Fields Missing")}
      onComplete={() => setTimeout(() => navigate(`${BASE_PATH}/conciliation`), 900)}
    />
  );
}