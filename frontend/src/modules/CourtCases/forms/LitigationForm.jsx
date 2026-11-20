import React, { useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BASE_PATH } from "../CourtCases";
import CaseForm from "../pages/CaseForm";
import { litigationSchema, COURT } from "./litigation.schema";
import { getSessionOrganisationId, getCurrentUserId } from "../../../utils/authSession";
import { toOptions } from "../../../utils/option";
import { useLitigationFormStore } from "../store/caseFormStore";
import { useLookupStore } from "../store/lookupStore";
import {
  useNotifier, toastSuccess, toastError, toastWarning, getErrorMessage, withReason,
} from "../../../utils/notify";
import api, {
  fetchLastLitigationCaseNo, createLitigationCase, addLitigationParties, addPrevConnCases,
  addDetailsOfCounsel, addMinistryCounsel, createMinistryIntervention, submitCaseStatus, 
  ministryInterventionDocument,counterAffidavitDocument,


  addHearingCases, addInterimOrder,
  fetchOrganisationName, fetchDomains, fetchSubDomains, fetchDepartments, fetchActsDropdown,
  fetchRulesDropdown, fetchSubCourtTypes, fetchCaseTypes, fetchHighCourtBenches, fetchStates,
  fetchDistricts, fetchCourtCaseById, fetchSubTableData, fetchLitigationSubTableData,
} from "../api";

const STAGES = {
  initiated: { id: 1, text: "Case Initiated" },
  counter:   { id: 2, text: "Counter Affidavit Filed" },
  hearing:   { id: 3, text: "Hearing started" },
  interim:   { id: 4, text: "Interim order Passed" },
  judgment:  { id: 5, text: "Judgment Finalized" },
};

const CASE_TYPE_TABLE = "mmt_court_case_type";
const COURT_COLS = ["court_type_id", "courtTypeID", "court_type", "court_id", "courtTypeId"];
const SUB_COURT_COLS = ["sub_court_type_id", "subCourtTypeID", "sub_court_type", "sub_court_id", "subCourtTypeId"];
const firstCol = (rows, candidates) => candidates.find((c) => rows.some((r) => r && r[c] != null));

const MINISTRY_COUNSEL_TYPES = ["MinistryCounsel", "ministryCounsel", "MDOC"];
const partiesUrl = (id) => `/get-litigation-petitioner-and-respondent/${id}`;

const pick = (res, ...keys) => {
  if (res && typeof res === "object") {
    for (const k of keys) if (res[k] != null) return res[k];
    return undefined;
  }
  return res;
};
const getOrgId = () => pick(getSessionOrganisationId(), "organisationID", "organisation_id", "organisationId");
const getUserId = () =>
  pick(getCurrentUserId(), "userID", "user_id", "userId") ??
  pick(getSessionOrganisationId(), "userID", "user_id", "userId");

const clean = (list) => list.map((x) => x.trim()).filter(Boolean);
const nn = (x) => (x === "" || x === undefined ? null : x);
const nullifyRows = (rows) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, nn(v)])));

const blank = (x) => String(x ?? "").trim() === "";
const used = (rows, keys) => rows.filter((r) => keys.some((k) => !blank(r[k])));
const incomplete = (rows, keys) => rows.some((r) => keys.some((k) => blank(r[k])));

function checkTable(rows, keys, label, required) {
  const u = used(rows, keys);
  if (required && u.length === 0) return `Please enter ${label}.`;
  if (incomplete(u, keys)) return `Please complete every column in ${label}, or remove the empty row.`;
  return "";
}

const toDeptArray = (x) =>
  (Array.isArray(x) ? x : x ? [x] : []).map((i) => (i && typeof i === "object" ? i.value ?? i.id : i));

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
    console.warn(`[LitigationForm] "${name}" options had duplicate values`, dup,
      "-> toOptions() is using a non-unique column as the value (use the row's own id column).");
  return out;
};

const asRows = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return d && typeof d === "object" ? [d] : [];
};

// builds a payload from the visible fields of one step (skips files and the tables sent separately)
const collect = (stepIndex, v, exclude = []) => {
  const out = {};
  litigationSchema.steps[stepIndex].fields.forEach((f) => {
    if (f.type === "file" || exclude.includes(f.name)) return;
    if (f.showIf && !f.showIf(v)) return;
    out[f.name] = v[f.name];
  });
  return out;
};

const mHas = (v) => v !== undefined && v !== null;
const mPick = (row, ...keys) => {
  for (const k of keys) if (mHas(row[k])) return row[k];
  return undefined;
};
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mStr = (v) => (!mHas(v) ? "" : typeof v === "boolean" ? (v ? "1" : "0") : String(v));
const yn = (v) => {
  if (!mHas(v) || v === "") return "";
  return ["1", "true", "yes", "y"].includes(String(v).trim().toLowerCase()) ? "1" : "0";
};
const mDay = (v) => (mHas(v) && v !== "" ? String(v).slice(0, 10) : "");
const csv = (v) => (mHas(v) ? String(v).split(",").map((x) => x.trim()).filter(Boolean) : []);

function rowToForm(row = {}) {
  const g = (snake, form) => mPick(row, snake, form, toCamel(snake));

  const awardedType = mStr(g("amounts_of_any_rewarded", "amountAnyAwarded"));
  const claimAmt = g("amounts_if_any_rewarded_claim_amount", "amountAnyAwardedClaimAmount");
  const counterAmt = g("amounts_if_any_rewarded_counter_claim_amount", "amountAnyAwardedCounterClaimAmount");
  const courtType = mStr(g("court_type", "courtType"));
  const subCourt = mStr(g("sub_court", "subCourtType")) || (courtType === COURT.CONSUMER ? mStr(g("consumer_forum")) : "");
  const docDetails = mStr(g("details", "docDetails")) || mStr(g("invoked_details", "ministryInvokedDetails"));

  return {
    /* basic */
    caseName: mStr(g("case_name", "caseName")),
    courtType,
    subCourtType: subCourt,
    highCourtBench: mStr(g("bench_seat", "highCourtBench")),
    otherCourtState: mStr(g("state", "otherCourtState")),
    othersCourtDistrict: mStr(g("district", "othersCourtDistrict")),
    otherCourtComplex: mStr(g("court_complex", "otherCourtComplex")),
    otherCourtName: mStr(g("name_of_court", "otherCourtName")),
    caseType: mStr(g("case_type", "caseType")),
    caseNumber: mStr(g("case_number", "caseNumber")),
    year: mStr(g("year")),
    cnrNumber: mStr(g("cnr_number", "cnrNumber")),
    filedOnDate: mDay(g("file_on_date", "filedOnDate")),
    domain: mStr(g("domain")),
    subDomain: mStr(g("sub_domain", "subDomain")),
    description: mStr(g("case_description", "description")),
    deptDivision: csv(g("dept_division", "deptDivision")),
    prevConnectCases: yn(g("pre_connected_cases", "prevConnectCases")),
    monetaryClaim: yn(g("counter_claim_amount_or_not", "monetaryClaim")),
    claimAmount: mStr(g("claim_amount", "claimAmount")),
    counterClaimAmount: mStr(g("counter_claim_amount", "counterClaimAmount")),

    /* ministry */
    isMinistryParty: yn(g("is_ministry_party", "isMinistryParty")),
    typeOfParty: mStr(g("type_of_party", "typeOfParty")),
    ministryRole: mStr(g("role_of_ministry", "ministryRole")),
    replyFiled: yn(g("is_behalf_of_ministry", "replyFiled")),
    ministryInvolved: mStr(g("is_ministry_challenged", "ministryInvolved")), // "1" challenged, "2" invoked, "0" no
    docChallenged: mStr(g("document_challenged", "docChallenged")),
    docInvoked: mStr(g("document_invoked", "docInvoked")),
    docDetails,
    act: mStr(g("acts", "act")),
    rule: mStr(g("rules", "rule")),
    otherAct: mStr(g("other_act", "otherAct")),
    ministryIntervention: yn(g("is_ministry_intervention_required", "ministryIntervention")),
    natureOfAction: mStr(g("nature_of_action_required", "natureOfAction")),
    interventionDescript: mStr(g("intervention_description", "interventionDescript")),
    clarificationTypes: mStr(g("type_of_clarification", "clarificationTypes")),
    approvalRemarks: mStr(g("type_of_approval", "approvalRemarks")),
    otherInv: mStr(g("other_lnv", "otherInv")),
    intervenReqDate: mDay(g("date_of_intervention_required", "intervenReqDate")),
    actionMinistry: yn(g("is_execution_required", "actionMinistry")),
    actionDescribe: mStr(g("nature_of_execution", "actionDescribe")),
    otherNatureExecution: mStr(g("other_nature_execution", "otherNatureExecution")),

    /* case status */
    counterAffiFiled: yn(g("is_counter_affidavit_filed", "counterAffiFiled")),
    hearingStarted: yn(g("is_hearing_started", "hearingStarted")),
    interimOrder: yn(g("is_interim_order", "interimOrder")),
    finalJudgement: yn(g("is_final_order_or_judgement_passed", "finalJudgement")),
    finalJudgementDate: mDay(g("date_of_final_order", "finalJudgementDate")),
    natureOfJudgement: mStr(g("nature_of_judgement", "natureOfJudgement")),
    amountAnyAwarded: awardedType,
    awardedAmount: mStr(awardedType === "Claim" ? claimAmt : awardedType === "Counter Claim" ? counterAmt : ""),
    briefJudgement: mStr(g("brief_of_judgement", "briefJudgement")),
    actionReqCom: yn(g("is_action_required_for_complaince", "actionReqCom")),
    lastDateForComplaince: mDay(g("last_date_for_complaince", "lastDateForComplaince")),
    whetJudgeAccept: mStr(g("judgement_accepted", "whetJudgeAccept")),
    orderCompiled: yn(g("is_order_complied", "orderCompiled")),
    dateOfComplaince: mDay(g("date_of_complied", "dateOfComplaince")),
    detailsOfComplaince: mStr(g("details_of_complaince", "detailsOfComplaince")),
    reasonForNonComplaince: mStr(g("reason_for_non_complaince", "reasonForNonComplaince")),
    appealRevCaseNumber: mStr(g("appeal_rev_case_number", "appealRevCaseNumber")),
    appealRevCourtName: mStr(g("appeal_rev_court_name", "appealRevCourtName")),
    appealRevCNRNumber: mStr(g("appeal_rev_cnr_number", "appealRevCNRNumber")),
    appealRevFillingDate: mDay(g("appeal_rev_filling_date", "appealRevFillingDate")),
  };
}

const basicPayload = (m) => ({
  ...m,
  state: m.otherCourtState,
  district: m.othersCourtDistrict,
  courtComplex: m.otherCourtComplex,
  nameOfCourt: m.otherCourtName,
  subCourt: m.subCourtType,
  consumerForum: m.courtType === COURT.CONSUMER ? m.subCourtType : "",
  counterClaimAmountOrNot: m.monetaryClaim,
  claimAmountValue: m.claimAmount,
  counterClaimAmountValue: m.counterClaimAmount,
});

const day = (x) => (x ? String(x).slice(0, 10) : "");
const flag = (x) => (x === true || x === 1 || x === "1" ? "1" : x === false || x === 0 || x === "0" ? "0" : "");
const str = (x) => (x == null ? "" : String(x));
const rowsOr = (arr) => (arr.length ? arr : [{}]);
const split = (s) => (s ? String(s).split("|").map((x) => x.trim()).filter(Boolean) : []);

const safe = async (label, fn) => {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[LitigationForm] ${label} failed:`, e?.response?.status, e?.message);
    return null;
  }
};

async function loadCaseValues(id) {
  let main = await safe("case (Litigation)", () => fetchCourtCaseById("Litigation", id));
  let c = main ? asRows(main)[0] : undefined;
  if (!c) {
    main = await fetchCourtCaseById("litigation", id);
    c = asRows(main)[0];
  }
  if (!c) throw new Error("Case not found");
  console.log("[LitigationForm] main row:", c);

  const [parties, pcc, doc, hearing, interim] = await Promise.all([
    safe("parties", () => api.get(partiesUrl(id))),
    safe("PCC", () => fetchSubTableData("PCC", id)),
    safe("DOC", () => fetchSubTableData("DOC", id)),
    safe("Hearing", () => fetchSubTableData("Hearing", id)),
    safe("Interim", () => fetchSubTableData("Interim", id)),
  ]);

  let ministryRows = [];
  for (const t of MINISTRY_COUNSEL_TYPES) {
    const res = await safe(`ministry counsel (${t})`, () => fetchLitigationSubTableData(t, id));
    const rows = res ? asRows(res) : [];
    if (rows.length) { ministryRows = rows; break; }
  }

  const cr = parties ? asRows(parties)[0] || {} : {};
  const petitioners = split(cr.petitioners ?? cr.petitioner ?? cr.petitioner_name);
  const respondents = split(cr.respondents ?? cr.respondent ?? cr.respondent_name);

  return {
    ...rowToForm(c),
    petitioners: petitioners.length ? petitioners : [""],
    respondents: respondents.length ? respondents : [""],
    prevConnData: rowsOr(asRows(pcc || []).map((r) => ({
      prevConnectedCourt: str(r.prev_conn_case_court_name), prevConnectedCaseNumber: str(r.prev_conn_case_no),
      prevConnectedCNRNumber: str(r.prev_conn_cnr_no), caseStatus: str(r.case_status), caseDetails: str(r.details),
    }))),
    counselData: rowsOr(asRows(doc || []).map((r) => ({
      nameOfCounsel: str(r.name_of_counsel), counselContact: str(r.contact),
      typeCounsel: str(r.type_of_counsel), counselDetails: str(r.details),
    }))),
    ministryCounsel: rowsOr(ministryRows.map((r) => ({
      nameOfCounselMinistry: str(r.name_of_counsel), designationMinistry: str(r.designation), ministryContact: str(r.contact),
    }))),
    hearingData: rowsOr(asRows(hearing || []).map((r) => ({
      hearingDate: day(r.date_of_hearing), detailsOfHearing: str(r.details_of_hearing),
      nextHearingDate: day(r.next_date_of_hearing), outcomeOfHearing: str(r.outcome_of_hearing),
    }))),
    interimData: rowsOr(asRows(interim || []).map((r) => ({
      natureInterimOrder: str(r.nature_of_interim_order), dateOfInterimOrder: day(r.date_of_interim_order),
      detailsOfInterimOrder: str(r.details_of_interim_order), complainceReq: flag(r.is_action_req_complaince),
      lastDateOfDoingAction: day(r.last_date_for_complaince),
    }))),
  };
}

export default function LitigationForm({ triggerNotification }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("edit") || params.get("caseId");

  const useStore = useLitigationFormStore;
  const caseID = useStore((s) => s.caseID);
  const opts = useStore((s) => s.opts);
  const { setCaseID, setOpt, mergeValues, setLoading, reset } = useStore.getState();
  const lookup = useLookupStore((s) => s.options);
  const dynamicOptions = useMemo(() => ({ ...lookup, ...opts }), [lookup, opts]);
  const sel = useRef({}); 

  const notifier = useNotifier(triggerNotification);

  const notify = (type, message, title) => {
    try {
      if (typeof triggerNotification === "function") {
        if (type === "success") return notifier(toastSuccess(title || "Saved", message));
        if (type === "error") return notifier(toastError(title || "Action Failed", message));
        return notifier(toastWarning(title || "Check the Form", message));
      }
      console.warn("[LitigationForm] triggerNotification prop missing - using alert fallback");
    } catch (err) {
      console.error("[LitigationForm] notifier failed:", err);
    }
    alert(`${title ? `${title}: ` : ""}${message}`);
  };

  const fail = (message, type = "warning", title) => {
    console.warn("[LitigationForm] blocked:", message);
    notify(type, message, title);
    return { ok: false };
  };

  const failApi = (e, sentence, title) =>
    fail(withReason(sentence, getErrorMessage(e)), "error", title);

  /* ---- dropdowns ---- */
  const loadFailed = (key, e) => {
    console.error(`Dropdown ${key} failed`, e);
    notify("error", withReason("A dropdown list could not be loaded. Refresh the page.", getErrorMessage(e)), "Could Not Load Data");
  };

  // static master data: cached once in the lookup store and shared by all forms
  const loadStatic = (key, fn) =>
    useLookupStore.getState()
      .load(key, async () => makeOptions(key, await fn()))
      .catch((e) => loadFailed(key, e));

  const loadOpt = async (key, fn) => {
    setOpt(key, []);
    try {
      setOpt(key, makeOptions(key, await fn()));
    } catch (e) {
      loadFailed(key, e);
    }
  };

  const loadFiltered = async (key, fn, parentCol, parentVal) => {
    setOpt(key, []);
    try {
      const res = await fn();
      const rows = asRows(res);
      const hasCol = rows.some((r) => r[parentCol] != null);
      const list = hasCol ? rows.filter((r) => String(r[parentCol]) === String(parentVal)) : rows;
      setOpt(key, makeOptions(key, { ...(res && typeof res === "object" ? res : {}), data: list }));
    } catch (e) {
      loadFailed(key, e);
    }
  };

  const loadCaseTypes = async (courtType, subCourtType) => {
    setOpt("caseType", []);
    try {
      const res = await fetchCaseTypes(CASE_TYPE_TABLE);
      const rows = asRows(res);
      const courtCol = firstCol(rows, COURT_COLS);
      const subCol = firstCol(rows, SUB_COURT_COLS);
      console.log("[caseType] rows:", rows.length, "| columns:", rows[0] ? Object.keys(rows[0]) : [],
        "| court col:", courtCol, "sub col:", subCol, "| values:", courtType, subCourtType);

      let list = rows;
      if (courtCol && courtType) list = list.filter((r) => String(r[courtCol]) === String(courtType));
      if (subCol && subCourtType) list = list.filter((r) => String(r[subCol]) === String(subCourtType));
      setOpt("caseType", makeOptions("caseType", { ...(res && typeof res === "object" ? res : {}), data: list }));
    } catch (e) {
      loadFailed("caseType", e);
    }
  };

  useEffect(() => {
    const organisationID = getOrgId();
    loadStatic("domain", fetchDomains);
    loadStatic("deptDivision", () => fetchDepartments(organisationID));
    loadStatic("act", fetchActsDropdown);
    loadStatic("otherCourtState", () => fetchStates("mmt_state"));
  }, []);

  // dependent dropdowns
  const onFieldChange = (name, val) => {
    switch (name) {
      case "domain":
        if (val) loadFiltered("subDomain", () => fetchSubDomains(val), "domain_id", val);
        else setOpt("subDomain", []);
        break;
      case "courtType":
        sel.current = { courtType: val, subCourtType: "" };
        setOpt("subCourtType", []); setOpt("highCourtBench", []); setOpt("caseType", []);
        if (val) {
          loadCaseTypes(val, "");
          if ([COURT.HC, COURT.TRIBUNAL, COURT.CONSUMER].includes(val))
            loadOpt("subCourtType", () => fetchSubCourtTypes(val));
        }
        break;
      case "subCourtType":
        sel.current.subCourtType = val;
        setOpt("highCourtBench", []);
        if (val) {
          loadCaseTypes(sel.current.courtType, val);
          if (sel.current.courtType === COURT.HC) loadOpt("highCourtBench", () => fetchHighCourtBenches(val));
        } else if (sel.current.courtType) {
          loadCaseTypes(sel.current.courtType, "");
        }
        break;
      case "otherCourtState":
        if (val) loadFiltered("othersCourtDistrict", () => fetchDistricts("mmt_district"), "state_id", val);
        else setOpt("othersCourtDistrict", []);
        break;
      case "act":
        if (val) loadOpt("rule", () => fetchRulesDropdown(val));
        else setOpt("rule", []);
        break;
      default:
    }
  };

  useEffect(() => {
    reset(editId || "");
    sel.current = {};
    if (!editId) return () => reset();
    let cancelled = false;
    (async () => {
      try {
        const values = await loadCaseValues(editId);
        if (cancelled) return;
        mergeValues(values);
        setLoading(false);

        if (values.courtType) {
          sel.current = { courtType: values.courtType, subCourtType: values.subCourtType };
          loadCaseTypes(values.courtType, values.subCourtType);
          if ([COURT.HC, COURT.TRIBUNAL, COURT.CONSUMER].includes(values.courtType))
            loadOpt("subCourtType", () => fetchSubCourtTypes(values.courtType));
          if (values.courtType === COURT.HC && values.subCourtType)
            loadOpt("highCourtBench", () => fetchHighCourtBenches(values.subCourtType));
        }
        if (values.domain) onFieldChange("domain", values.domain);
        if (values.act) onFieldChange("act", values.act);
        if (values.otherCourtState) onFieldChange("otherCourtState", values.otherCourtState);
      } catch (e) {
        if (cancelled) return;
        console.error("[LitigationForm] load failed:", e);
        notify("error", withReason(`Case ${editId} could not be loaded.`, getErrorMessage(e)), "Could Not Load Data");
      }
    })();
    return () => { cancelled = true; reset(); };
  }, [editId]);

  const makeForm = (file, docType) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ID", caseID);
    fd.append("caseID", caseID);
    fd.append("path", "Litigation");
    fd.append("docType", docType);
    return fd;
  };
  const upload = async (file, docType) => {
    if (file instanceof File) await counterAffidavitDocument(makeForm(file, docType));
  };
  const uploadMinistry = async (file, docType) => {
    if (file instanceof File) await ministryInterventionDocument(makeForm(file, docType));
  };

  /* ---------------- Step 1: Basic Information ---------------- */
  const generateCaseID = async (organisationID) => {
    const org = String(organisationID).padStart(2, "0");
    const res = await fetchLastLitigationCaseNo(org);
    const last = res?.data?.[0]?.case_id || `LI${org}C00`;
    const m = last.match(/C(\d+)$/);
    const next = m ? String(parseInt(m[1], 10) + 1).padStart(m[1].length, "0") : "01";
    return `LI${org}C${next}`;
  };

  const saveBasic = async (v) => {
    const organisationID = getOrgId();
    const userID = getUserId();
    if (!organisationID) return fail("Your session has expired. Please log in again.", "error", "Session Expired");

    const petitioners = clean(v.petitioners);
    const respondents = clean(v.respondents);
    if (!petitioners.length) return fail("Please enter the Petitioner/Appellant details.", "warning", "Required Field Missing");
    if (!respondents.length) return fail("Please enter the Respondent details.", "warning", "Required Field Missing");

    const prevKeys = ["prevConnectedCourt", "prevConnectedCaseNumber", "prevConnectedCNRNumber", "caseStatus", "caseDetails"];
    const err = v.prevConnectCases === "1" ? checkTable(v.prevConnData, prevKeys, "the Previous / Connected cases", true) : "";
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
      const id = caseID || (await generateCaseID(organisationID));

      await addLitigationParties({ caseID: id, petitioners, respondents });
      if (v.prevConnectCases === "1")
        await addPrevConnCases({ caseID: id, prevConnCaseData: used(v.prevConnData, prevKeys) });
      if (counsel.length)
        await addDetailsOfCounsel({
          caseID: id,
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
      } catch { }

      const { prevConnData, counselData, petitioners: _p, respondents: _r, ...main } = collect(0, v);
      const res = await createLitigationCase({
        ...basicPayload(main),
        caseID: id, organisationID, userID, organisationName,
        deptDivision,
        prevConnCaseOrNot: v.prevConnectCases,
      });

      if (res?.status && res.status !== 200 && res.status !== 201)
        return fail("The litigation case could not be saved. Please try again.", "error", "Save Failed");

      const savedId = res?.data?.caseID || id;
      setCaseID(savedId);
      notify(
        "success",
        caseID
          ? `Basic information for case ${savedId} was updated. Continue with the Ministry Intervention stage.`
          : `Case ${savedId} was created. Continue with the Ministry Intervention stage.`,
        caseID ? "Case Updated" : "Case Created"
      );
      return { ok: true };
    } catch (e) {
      console.error("[LitigationForm] saveBasic failed:", e);
      return failApi(e, "The basic information could not be saved.", "Save Failed");
    }
  };

  /* ---------------- Step 2: Ministry Intervention ---------------- */
  const saveMinistry = async (v) => {
    if (!caseID) return fail("Please save Basic Information first.");
    const userID = getUserId();

    const counselKeys = ["nameOfCounselMinistry", "designationMinistry", "ministryContact"];
    const counsel = v.isMinistryParty === "1" ? used(v.ministryCounsel, counselKeys) : [];
    if (v.isMinistryParty === "1") {
      if (!counsel.length) return fail("Please enter the Ministry Counsel details.", "warning", "Required Field Missing");
      if (counsel.some((c) => blank(c.nameOfCounselMinistry)))
        return fail("Please enter the name of the Ministry Counsel.", "warning", "Required Field Missing");
      if (counsel.some((c) => !blank(c.ministryContact) && !/^\d{10}$/.test(c.ministryContact.trim())))
        return fail("Please enter a valid 10-digit phone number for the ministry counsel.");
    }

    try {
      if (counsel.length) await addMinistryCounsel({ caseID, detailsOfCounselMinistryData: counsel });
      if (v.isMinistryParty === "1" && v.replyFiled === "1") await uploadMinistry(v.replyFiledDoc, "replyFiled");
      if (v.ministryIntervention === "1") await uploadMinistry(v.intervenDoc, "intervention");

      const inv = v.ministryInvolved; 
      const res = await createMinistryIntervention({
        caseID,
        userID,
        isMinistryOrNot: v.isMinistryParty,
        typeOfParty: v.typeOfParty,
        roleOfMinistry: v.ministryRole,
        isBehalfMinistryOrNot: v.replyFiled,
        isMinistryChallengedOrNot: inv,
        ministryChallenged: v.docChallenged,
        ministryInvoked: v.docInvoked,
        ministryDetails: inv === "1" ? v.docDetails : "",
        ministryInvokedDetails: inv === "2" ? v.docDetails : "",
        act: v.act,
        otherAct: v.otherAct,
        rule: v.rule,
        ministryInterventionOrNot: v.ministryIntervention,
        natureOfAction: v.natureOfAction,
        description: v.interventionDescript,
        interventionofRequestDate: v.intervenReqDate,
        typeofClarification: v.clarificationTypes,
        typeOfApproval: v.approvalRemarks,
        otherInv: v.otherInv,
        IsNatureOfExecutionOrNot: v.actionMinistry,
        IsNatureOfExecution: v.actionDescribe,
        otherNatureExecution: v.otherNatureExecution,
      });
      if (res?.status && res.status !== 200 && res.status !== 201)
        return fail("The ministry intervention could not be saved. Please try again.", "error", "Save Failed");

      notify("success", `Ministry intervention for case ${caseID} was saved.`, "Ministry Intervention Saved");
      return { ok: true };
    } catch (e) {
      console.error("[LitigationForm] saveMinistry failed:", e);
      return failApi(e, "The ministry intervention could not be saved.", "Save Failed");
    }
  };

  /* ---------------- Step 3: Case Status ---------------- */
  const saveStatus = async (v) => {
    if (!caseID) return fail("Please save Basic Information first.");
    const userID = getUserId();

    const hearingKeys = ["hearingDate", "detailsOfHearing", "outcomeOfHearing"]; // nextHearingDate optional
    const interimKeys = ["natureInterimOrder", "dateOfInterimOrder", "detailsOfInterimOrder", "complainceReq"];

    const err =
      (v.hearingStarted === "1" ? checkTable(v.hearingData, hearingKeys, "the Details of Hearing", true) : "") ||
      (v.interimOrder === "1" ? checkTable(v.interimData, interimKeys, "the Details of Interim Order", true) : "");
    if (err) return fail(err);

    try {
      if (v.counterAffiFiled === "1") await upload(v.counterAffiDoc, "counterAffidavit");
      if (v.hearingStarted === "1")
        await addHearingCases({
          caseID,
          hearingCaseData: nullifyRows(used(v.hearingData, [...hearingKeys, "nextHearingDate"])),
        });
      if (v.interimOrder === "1")
        await addInterimOrder({
          caseID,
          interimOrderData: nullifyRows(used(v.interimData, [...interimKeys, "lastDateOfDoingAction"])),
        });

      const stage =
        v.finalJudgement === "1" ? STAGES.judgment
        : v.interimOrder === "1" ? STAGES.interim
        : v.hearingStarted === "1" ? STAGES.hearing
        : v.counterAffiFiled === "1" ? STAGES.counter
        : STAGES.initiated;

      const c = collect(2, v, ["hearingData", "interimData"]);

      const res = await submitCaseStatus({
        caseID,
        userID,
        stageID: stage.id,
        stage: stage.text,
        isCounterFiledOrNot: c.counterAffiFiled,
        isHearingStartedOrNot: c.hearingStarted,
        isInterimOrderOrNot: c.interimOrder,
        isfinalJudgementOrNot: c.finalJudgement,
        finalJudgementDate: nn(c.finalJudgementDate),
        natureOfJudgement: c.natureOfJudgement,
        amountAnyAwarded: c.amountAnyAwarded,
        amountAnyAwardedClaimAmount: c.amountAnyAwarded === "Claim" ? nn(c.awardedAmount) : undefined,
        amountAnyAwardedCounterClaimAmount: c.amountAnyAwarded === "Counter Claim" ? nn(c.awardedAmount) : undefined,
        briefJudgement: c.briefJudgement,
        isActionReqComOrNot: c.actionReqCom,
        lastDateForComplaince: nn(c.lastDateForComplaince),
        whetJudgeAccept: c.whetJudgeAccept,
        iswhetJudgeAcceptOrNot: c.orderCompiled,
        dateOfComplaince: nn(c.dateOfComplaince),
        detailsOfComplaince: c.detailsOfComplaince,
        reasonForNonComplaince: c.reasonForNonComplaince,
        appealRevCaseNumber: c.appealRevCaseNumber,
        appealRevCourtName: c.appealRevCourtName,
        appealRevCNRNumber: c.appealRevCNRNumber,
        appealRevFillingDate: nn(c.appealRevFillingDate),
      });
      if (res?.status && res.status !== 200 && res.status !== 201)
        return fail("The case status could not be updated. Please try again.", "error", "Update Failed");

      notify("success", `The status of case ${caseID} was updated.`, "Status Updated");
      return { ok: true };
    } catch (e) {
      console.error("[LitigationForm] saveStatus failed:", e);
      return failApi(e, "The case status could not be updated.", "Update Failed");
    }
  };

  const onSaveStep = (stepKey, values) =>
    stepKey === "basic" ? saveBasic(values)
    : stepKey === "ministry" ? saveMinistry(values)
    : saveStatus(values);

  return (
    <CaseForm
      schema={litigationSchema}
      useStore={useStore}
      lockedSteps={caseID ? [] : ["ministry", "status"]}
      dynamicOptions={dynamicOptions}
      onFieldChange={onFieldChange}
      onSaveStep={onSaveStep}
      onValidationError={(msg) => notify("warning", msg, "Required Fields Missing")}
      onComplete={() => setTimeout(() => navigate(`${BASE_PATH}/litigation`), 900)}
    />
  );
}