import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Lock, ChevronRight, ChevronLeft, AlertCircle, Pencil } from 'lucide-react';
import { createNmpEntry, updateNmpEntry, getNmpCaseNumber } from '../api';
import { getCurrentUserId, getSessionOrganisationId } from '../../../utils/authSession';


// ── Constants ────────────────────────────────────────────────────────────────
// Dropdown options are { id, label }. The id is stored in formData and sent to the API.
// Match these ids to your master tables.

const PAST_LEASE_STATUS_OPTIONS = [
  { id: 1, label: 'Planned' },
  { id: 2, label: 'Active' },
  { id: 3, label: 'Expired' },
  { id: 4, label: 'Renewed' },
];

const FUTURE_LEASE_STATUS_OPTIONS = [
  { id: 1, label: 'Planned' },
  { id: 2, label: 'Active' },
  { id: 3, label: 'Expired' },
];

const NMP_STATUS_OPTIONS = [
  { id: 1, label: 'Identified' },
  { id: 2, label: 'NIT issued' },
  { id: 3, label: 'Land allotted' },
  { id: 4, label: 'Agreement signed/leased' },
  { id: 5, label: 'Completion of construction' },
];

const NMP_MODE_OPTIONS = [
  { id: 1, label: 'Nomination' },
  { id: 2, label: 'Tender cum Auction' },
];

const NMP_PURPOSE_OPTIONS = [
  { id: 1, label: 'Commercial' },
  { id: 2, label: 'Industrial' },
  { id: 3, label: 'Residential' },
  { id: 4, label: 'Others' },
];

const NMP_LESSEE_TYPE_OPTIONS = [
  { id: 1, label: 'Government' },
  { id: 2, label: 'PSU' },
  { id: 3, label: 'Autonomous' },
  { id: 4, label: 'Private' },
  { id: 5, label: 'Others' },
];

const NMP_SECTOR_OPTIONS = [
  { id: 1, label: 'Connectivity' },
  { id: 2, label: 'Warehousing & Storage' },
  { id: 3, label: 'Oil, Gas & Energy' },
  { id: 4, label: 'Manufacturing' },
  { id: 5, label: 'Logistics Parks & Trade Zones' },
  { id: 6, label: 'Shops' },
  { id: 7, label: 'Office' },
  { id: 8, label: 'Plazas' },
  { id: 9, label: 'Hotels' },
  { id: 10, label: 'Mercantile buildings' },
  { id: 11, label: 'Other' },
];

const AGREEMENT_SIGNED_OPTIONS = [
  { id: 1, label: 'Yes' },
  { id: 2, label: 'No' },
  { id: 3, label: 'In Progress' },
];

// FY dropdowns stay plain strings (no id needed)
const FY_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const s = 2018 + i;
  return `FY${String(s).slice(2)}-${String(s + 1).slice(2)}`;
});

// Old text key → new id key (+ options used to look the label up when editing old rows)
const getIdFieldMap = (formType) => [
  ['lease_status', 'lease_status_id', formType === 'past-land' ? PAST_LEASE_STATUS_OPTIONS : FUTURE_LEASE_STATUS_OPTIONS],
  ['purpose', 'purpose_id', NMP_PURPOSE_OPTIONS],
  ['sector', 'sector_id', NMP_SECTOR_OPTIONS],
  ['status', 'status_id', NMP_STATUS_OPTIONS],
  ['mode_of_allotment', 'mode_of_allotment_id', NMP_MODE_OPTIONS],
  ['type_of_lessee', 'type_of_lessee_id', NMP_LESSEE_TYPE_OPTIONS],
  ['agreement_signed', 'agreement_signed_id', AGREEMENT_SIGNED_OPTIONS],
];

// Fill this if land-abstract rows come back from the API with different column names
const ABSTRACT_FIELD_MAP = {};

const MAX_REVISED_DATES = 3;

const revisedKeysFor = (keyPrefix) => [`${keyPrefix}_revised`, `${keyPrefix}_revised_2`, `${keyPrefix}_revised_3`];

const PARCEL_STAGES = [
  { id: 1, title: 'Basic Details', desc: 'Parcel info & allotment' },
  { id: 2, title: 'Financial Details', desc: 'Lease & rental values' },
  { id: 3, title: 'Agreements', desc: 'Lessee & milestones' },
  { id: 4, title: 'Review & Submit', desc: 'Remarks & final check' },
];

const PAST_STAGES = [
  { id: 1, title: 'Basic Details', desc: 'Parcel & allotment' },
  { id: 2, title: 'Financial Details', desc: 'Lease & rental values' },
  { id: 3, title: 'Lessee & Milestones', desc: 'Lessee & dates' },
  { id: 4, title: 'Review & Submit', desc: 'Remarks & final check' },
];

async function generateUniquePastNmpId() {
  try {
    const organisationId = getSessionOrganisationId();
    if (organisationId == null) throw new Error('organisationId missing in session');

    const prefix = 'NMP' + String(organisationId).padStart(2, '0'); // e.g. NMP02

    // API returns the latest record for this org (ORDER BY id DESC LIMIT 1)
    const response = await getNmpCaseNumber(organisationId);
    const lastId = response.data?.[0]?.unique_nmp_id;

    let next = 1;
    if (lastId && lastId.startsWith(prefix)) {
      const lastSeq = parseInt(lastId.slice(prefix.length), 10); // "NMP0201" -> 1
      if (!Number.isNaN(lastSeq)) next = lastSeq + 1;
    }

    return prefix + String(next).padStart(2, '0'); // NMP0201, NMP0202 ...
  } catch (error) {
    console.error('Error generating NMP ID:', error);
    return null;
  }
}

function normalizeEditData(data) {
  if (!data) return data;
  const fmtDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };
  const out = { ...data };
  const formType = out.form_type;
  const map = formType === 'land-abstract' ? ABSTRACT_FIELD_MAP : {
    ...(formType === 'past-land' ? { target_year: 'year_of_allotment' } : { target_year: 'target_yr_monetisation' }),
    annual_base_lease_rental: 'annual_base_lease_rental',
    lease_tenure_years: 'lease_tenure',
    npv_lease_rentals: 'npv_lease_rental',
    total_monetisation_value: 'total_monetization_value',
    agency_lessee_name: 'lessee_name',
    type_of_agency_lessee: 'type_of_lessee',
    nit_original_target_date: 'nit_original',
    nit_actual_date: 'nit_actual',
    agreement_original_target_date: 'agreement_original',
    actual_agreement_date: 'agreement_actual',
    original_completion_date: 'construction_original',
    actual_completion_date: 'construction_actual',
  };
  for (const [from, to] of Object.entries(map)) {
    if (from in out && !(to in out)) {
      out[to] = out[from];
      delete out[from];
    }
  }

  // Dropdowns: prefer the id from the API; fall back to matching an old text label to its id
  if (formType !== 'land-abstract') {
    for (const [labelKey, idKey, options] of getIdFieldMap(formType)) {
      if (out[idKey] != null && out[idKey] !== '') {
        out[idKey] = Number(out[idKey]);
      } else if (out[labelKey]) {
        const match = options.find((o) => o.label === out[labelKey]);
        out[idKey] = match ? match.id : '';
      }
      delete out[labelKey]; // don't send the stale text back
    }
  }

  const dateKeys = ['nit_original', 'nit_actual', 'agreement_original', 'agreement_actual', 'construction_original', 'construction_actual',
    ...['nit', 'agreement', 'construction'].flatMap((prefix) => revisedKeysFor(prefix))];
  for (const k of dateKeys) {
    if (out[k]) out[k] = fmtDate(out[k]);
  }
  return out;
}

// ── Stage validation ─────────────────────────────────────────────────────────

const has = (v) => v !== '' && v != null;

function validateParcelStage(stage, formData, isFuture) {
  switch (stage) {
    case 1:
      return !!(
        formData.parcel_detail &&
        formData.area_acres &&
        has(formData.lease_status_id) &&
        has(formData.purpose_id) &&
        has(formData.sector_id) &&
        formData.industry_name &&
        has(formData.mode_of_allotment_id) &&
        has(formData.status_id) &&
        (isFuture ? formData.target_yr_monetisation : formData.year_of_allotment)
      );
    case 2:
      return !!(
        formData.upfront_premium || formData.annual_base_lease_rental || formData.lease_tenure ||
        formData.escalation_rate || formData.frequency_of_escalation || formData.estimated_private_investment
      );
    case 3:
      return !!(has(formData.agreement_signed_id) && formData.lessee_name && has(formData.type_of_lessee_id));
    case 4:
      return true;
    default:
      return false;
  }
}

function validatePastStage(stage, formData) {
  const filled = (v) => (v ?? '').toString().trim() !== '';

  switch (stage) {
    case 1:
      return !!(
        formData.parcel_detail && formData.area_acres && has(formData.purpose_id) && has(formData.sector_id) &&
        formData.industry_name && formData.year_of_allotment && has(formData.mode_of_allotment_id) && has(formData.status_id) &&
        (formData.purpose_id !== 4 || filled(formData.other_purpose)) &&     // Purpose = Others
        (formData.sector_id !== 11 || filled(formData.other_sector))         // Sector = Other
      );
    case 2:
      return !!(formData.upfront_premium != null || formData.annual_base_lease_rental || formData.lease_tenure);
    case 3:
      return !!(
        has(formData.agreement_signed_id) &&
        (formData.type_of_lessee_id !== 5 || filled(formData.other_agency))  // Lessee type = Others
      );
    case 4:
      return true;
    default:
      return false;
  }
}

function getMissingFields(stage, formData, isFuture) {
  const blank = (v) => !(v ?? '').toString().trim();

  if (stage === 1) {
    const req = [
      ['parcel_detail', 'Parcel Detail'],
      ['area_acres', 'Area (Acres)'],
      ['lease_status_id', 'Lease Status'],
      ['purpose_id', 'Purpose'],
      ['sector_id', 'Sector'],
      ['industry_name', 'Industry/commercial activities'],
      ['mode_of_allotment_id', 'Mode of Allotment'],
      ['status_id', 'Status'],
      [isFuture ? 'target_yr_monetisation' : 'year_of_allotment', isFuture ? 'Target Yr of Monetisation' : 'Year of Allotment'],
    ];
    const missing = req.filter(([k]) => !has(formData[k])).map(([, l]) => l);
    if (formData.purpose_id === 4 && blank(formData.other_purpose)) missing.push('Other Purpose');
    if (formData.sector_id === 11 && blank(formData.other_sector)) missing.push('Other Sector');
    return missing.join(', ');
  }
  if (stage === 2) {
    const hasAny = !!(
      formData.upfront_premium || formData.annual_base_lease_rental || formData.lease_tenure ||
      formData.escalation_rate || formData.frequency_of_escalation || formData.estimated_private_investment
    );
    return hasAny ? '' : 'Fill at least one financial field';
  }
  if (stage === 3) {
    const missing = [];
    if (!formData.lessee_name) missing.push('Agency/Lessee Name');
    if (!has(formData.type_of_lessee_id)) missing.push('Type of Agency/Lessee');
    if (formData.type_of_lessee_id === 5 && blank(formData.other_agency)) missing.push('Other Lessee Type');
    if (!has(formData.agreement_signed_id)) missing.push('Agreement Signed');
    return missing.join(', ');
  }
  return '';
}

// ── Small reusable UI pieces ─────────────────────────────────────────────────

function ColChip({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      {children}
    </span>
  );
}

function AutoBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 uppercase tracking-wider">
      AUTO
    </span>
  );
}

function FLabel({ label, required, colRef, auto, className }) {
  return (
    <div className={`flex items-center gap-1.5 mb-1 flex-wrap ${className || ''}`}>
      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {colRef && <ColChip>{colRef}</ColChip>}
      {auto && <AutoBadge />}
    </div>
  );
}

const inputCls = 'w-full px-3 h-[34px] text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed';

const autoCls = 'w-full px-3 h-[34px] flex items-center text-xs border border-teal-200 dark:border-teal-800 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-slate-600 dark:text-slate-400';

// Dropdown over { id, label } options. Shows the label, stores the numeric id in formData[name].
function SelectField({ label, required, name, options, formData, onChange, placeholder = '--Select--' }) {
  return (
    <div>
      <FLabel label={label} required={required} />
      <select
        value={formData[name] ?? ''}
        onChange={(e) => onChange(name, e.target.value === '' ? '' : Number(e.target.value))}
        className={inputCls}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Stage stepper ────────────────────────────────────────────────────────────

function StageStepper({ stages, current, completed, onStageClick }) {
  return (
    <div className="flex items-center justify-between">
      {stages.map((s, i) => {
        const isDone = completed.has(s.id);
        const isActive = current === s.id;
        const clickable = isDone || isActive;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className={`w-6 h-0.5 mx-1 rounded transition-colors ${isDone || isActive ? 'bg-[#0f417a]' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <div className={`flex flex-col items-center gap-1 min-w-[56px] ${clickable ? 'cursor-pointer' : ''}`} onClick={() => clickable && onStageClick?.(s.id)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all select-none ${
                isDone
                  ? 'bg-green-500 text-white shadow-sm'
                  : isActive
                    ? 'bg-[#0f417a] text-white ring-2 ring-blue-200 dark:ring-blue-900 shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : !clickable ? <Lock className="h-3 w-3" /> : s.id}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight ${
                isActive ? 'text-[#0f417a] dark:text-blue-400' : isDone ? 'text-green-700 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {s.title}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Section block ────────────────────────────────────────────────────────────

function Section({ number, title, desc, colRef, children, id }) {
  return (
    <div id={id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-5">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start gap-2.5 flex-wrap">
        {number && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-xs font-extrabold flex-shrink-0 mt-0.5">
            {number}
          </span>
        )}
        <div>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{title}</span>
          {desc && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>}
        </div>
        {colRef && <ColChip>{colRef}</ColChip>}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

// ── Milestone row ────────────────────────────────────────────────────────────

function MilestoneRow({ title, keyPrefix, formData, onChange }) {
  const revisedKeys = useMemo(() => revisedKeysFor(keyPrefix), [keyPrefix]);
  const [revisedCount, setRevisedCount] = useState(() => {
    const lastFilled = revisedKeys.reduce((acc, k, i) => (formData[k] ? i + 1 : acc), 0);
    return lastFilled;
  });

  const addRevised = () => setRevisedCount((c) => Math.min(c + 1, MAX_REVISED_DATES));
  const removeRevised = (idx) => {
    const values = revisedKeys.map((k) => formData[k] || '');
    values.splice(idx, 1);
    values.push('');
    revisedKeys.forEach((k, i) => onChange(k, values[i]));
    setRevisedCount((c) => Math.max(0, c - 1));
  };

  const limitReached = revisedCount >= MAX_REVISED_DATES;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{title}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <FLabel label="Original Target Date" required />
            <input type="date" value={formData[`${keyPrefix}_original`] || ''} onChange={(e) => onChange(`${keyPrefix}_original`, e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <FLabel label="Actual Date" />
            <input type="date" value={formData[`${keyPrefix}_actual`] || ''} onChange={(e) => onChange(`${keyPrefix}_actual`, e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {revisedCount === 0 && (
            <button type="button" onClick={addRevised} title="Add a revised target date" className="flex items-center gap-1.5 px-3 h-[34px] flex-shrink-0 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer shadow-sm">
              <Pencil className="h-3 w-3" /> Revise
            </button>
          )}
          {revisedKeys.slice(0, revisedCount).map((key, idx) => (
            <div key={key} className={`flex-1 min-w-[180px] ${idx === revisedCount - 1 && !limitReached ? 'max-w-sm' : 'max-w-xs'}`}>
              <FLabel label={`Revised Target Date ${idx + 1}`} />
              <div className="flex items-center gap-1.5">
                <input type="date" value={formData[key] || ''} onChange={(e) => onChange(key, e.target.value)} className={inputCls} />
                <button type="button" onClick={() => removeRevised(idx)} title="Remove this revised date" className="text-rose-500 hover:text-rose-700 font-extrabold text-base cursor-pointer leading-none px-1">×</button>
                {idx === revisedCount - 1 && !limitReached && (
                  <button type="button" onClick={addRevised} title="Add another revised target date" className="flex items-center gap-1 px-2.5 h-[34px] flex-shrink-0 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer shadow-sm">
                    <Pencil className="h-3 w-3" /> Revise
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {limitReached && (
          <div className="text-[11px] font-bold text-slate-400">Maximum of {MAX_REVISED_DATES} revised dates reached.</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  LAND ABSTRACT FORM (single-page)
// ══════════════════════════════════════════════════════════════════════════════

const ABSTRACT_ROWS_1 = [
  { letter: null, label: 'Total Land Held by Port Authority', key: 'total_land_held', bold: true },
  { letter: 'A', label: 'Port Operation', sub: 'Berth, Jetty & Associated Yards', key: 'cat_A_acres' },
  { letter: 'B', label: 'Connectivity', sub: 'Road, Rail, Pipeline', key: 'cat_B_acres' },
  { letter: 'C', label: 'Warehousing & Storage', sub: 'Warehouses, godowns, cold/general storage, cargo storage, parking', key: 'cat_C_acres' },
  { letter: 'D', label: 'Oil, Gas & Energy', sub: 'Tank farms, oil tankage, fuel/retail outlets, gas station, green hydrogen', key: 'cat_D_acres' },
  { letter: 'E', label: 'Manufacturing', sub: 'Manufacturing & processing units, fabrication yard, agro/seafood industry', key: 'cat_E_acres' },
  { letter: 'F', label: 'Commercial', sub: 'Offices, shops, plazas, hotels, mixed use, mercantile buildings, tourism', key: 'cat_F_acres' },
  { letter: 'G', label: 'Residential', sub: 'Govt./PSU residential quarters and staff housing', key: 'cat_G_acres' },
  { letter: 'H', label: 'Logistics Parks & Trade Zones', sub: 'ECY, SEZ, FTWZ, MMLP, ICD, CFS, logistics parks and yards', key: 'cat_H_acres' },
  { letter: 'J', label: 'Other Uses', sub: 'Hospital, School & other social infrastructure', key: 'cat_J_acres' },
  { letter: 'I', label: 'Salt Land Acquired', key: 'cat_I_acres' },
  { letter: 'K', label: 'Vacant Land - Developable and Encumbrance Free', key: 'cat_K_acres' },
  { letter: 'L', label: 'Vacant Land - Encroached, Litigated or Otherwise Encumbered', key: 'cat_L_acres' },
  { letter: 'M', label: 'Land Not Developable - CRZ-I, Marshy, Defence, Heritage', key: 'cat_M_acres' },
];

const ABSTRACT_ROWS_2 = [
  { label: 'Land Likely To Be Freed by Rationalisation / Vertical Development / Removal of Encroachment', key: 'unlock_rationalisation_acres' },
  { label: 'Land Reclaimable from Sea / Backwater - Identified', key: 'unlock_reclamation_acres' },
  { label: 'Salt Land Identified for Acquisition', key: 'unlock_salt_land_acres' },
  { label: 'Additional Land Identified with State Govt for Port-Led Industry', key: 'unlock_state_govt_acres' },
  { label: 'Marshy Land Development Plan', key: 'unlock_marshy_acres' },
];

function LandAbstractForm({ formData, onChange }) {
  const sumRows = (rows) => rows.reduce((acc, row) => acc + (parseFloat(formData[row.key]) || 0), 0);

  const totalSection1 = useMemo(
    () => sumRows(ABSTRACT_ROWS_1.filter((row) => !row.bold)),
    [formData], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalSection2 = useMemo(
    () => sumRows(ABSTRACT_ROWS_2),
    [formData], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fmtAcres = (v) => v.toFixed(2);

  return (
    <div className="space-y-6">
      <Section number={1} title="Existing Land Holding and its Disposition" desc="Landuse Details As per Masterplan in Acres" id="section-1">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white" style={{ background: '#0f417a' }}>
                <th className="text-left px-4 py-2.5 font-bold w-10" />
                <th className="text-left px-4 py-2.5 font-bold">Category</th>
                <th className="text-left px-4 py-2.5 font-bold w-52">Acres <span className="font-normal opacity-60">*</span></th>
              </tr>
            </thead>
            <tbody>
              {ABSTRACT_ROWS_1.map((row, i) => (
                <tr key={row.key} className={row.bold ? 'bg-amber-50 dark:bg-amber-900/10 font-bold' : i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                  <td className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    {row.letter ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-700 dark:bg-slate-600 text-white text-[10px] font-extrabold">{row.letter}</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-600 text-white text-[10px] font-extrabold">N</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    <div className={`text-slate-800 dark:text-slate-200 ${row.bold ? 'font-bold' : 'font-medium'}`}>{row.label} <span className="text-red-500">*</span></div>
                    {row.sub && <div className="text-[10px] text-slate-400 mt-0.5">{row.sub}</div>}
                  </td>
                  <td className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <input type="number" step="any" value={formData[row.key] || ''} onChange={(e) => onChange(row.key, e.target.value)} className={`${inputCls} w-36`} placeholder="0.00" />
                      <span className="text-[10px] text-slate-400 flex-shrink-0">acres</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-800 dark:text-slate-100">
                <td className="px-4 py-2.5 border-t-2 border-slate-300 dark:border-slate-600" />
                <td className="px-4 py-2.5 border-t-2 border-slate-300 dark:border-slate-600">Total (A to M)</td>
                <td className="px-4 py-2.5 border-t-2 border-slate-300 dark:border-slate-600">
                  <div className="flex items-center gap-1">
                    <div className={`${autoCls} w-36`}>{fmtAcres(totalSection1)}</div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">acres</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section number={2} title="Land that can be unlocked by 2030" id="section-2">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white" style={{ background: '#0f417a' }}>
                <th className="text-left px-4 py-2.5 font-bold">Category</th>
                <th className="text-left px-4 py-2.5 font-bold w-52">Acres <span className="font-normal opacity-60">*</span></th>
              </tr>
            </thead>
            <tbody>
              {ABSTRACT_ROWS_2.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                  <td className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{row.label} <span className="text-red-500">*</span></div>
                  </td>
                  <td className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <input type="number" step="any" value={formData[row.key] || ''} onChange={(e) => onChange(row.key, e.target.value)} className={`${inputCls} w-36`} placeholder="0.00" />
                      <span className="text-[10px] text-slate-400 flex-shrink-0">acres</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-800 dark:text-slate-100">
                <td className="px-4 py-2.5 border-t-2 border-slate-300 dark:border-slate-600">Total</td>
                <td className="px-4 py-2.5 border-t-2 border-slate-300 dark:border-slate-600">
                  <div className="flex items-center gap-1">
                    <div className={`${autoCls} w-36`}>{fmtAcres(totalSection2)}</div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">acres</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  PARCEL FORM (stage-aware) — Future Monetisation Plan
// ══════════════════════════════════════════════════════════════════════════════

function ParcelForm({ formType, formData, onChange, stage }) {
  const isFuture = formType === 'future-land';

  const totalValue = useMemo(() => {
    const a = parseFloat(formData.upfront_premium) || 0;
    const b = parseFloat(formData.npv_lease_rental) || 0;
    const c = parseFloat(formData.estimated_private_investment) || 0;
    if (!a && !b && !c) return null;
    return (a + b + c).toFixed(2);
  }, [formData.upfront_premium, formData.npv_lease_rental, formData.estimated_private_investment]);

  return (
    <div>
      {/* ── Stage 1: Basic Details ── */}
      {stage === 1 && (
        <Section number={1} title="Basic Details" id="section-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div><FLabel label="Parcel Detail" required /><input type="text" value={formData.parcel_detail || ''} onChange={e => onChange('parcel_detail', e.target.value)} className={inputCls} /></div>
  <div><FLabel label="Area (Acres)" required /><input type="number" step="any" value={formData.area_acres || ''} onChange={e => onChange('area_acres', e.target.value)} className={inputCls} /></div>
  <div className="space-y-3">
    <SelectField label="Purpose" required name="purpose_id" options={NMP_PURPOSE_OPTIONS} formData={formData} onChange={onChange} />
    {formData.purpose_id === 4 && (
      <OtherField label="Other Purpose" name="other_purpose" formData={formData} onChange={onChange} />
    )}
  </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <SelectField label="Sector" required name="sector_id" options={NMP_SECTOR_OPTIONS} formData={formData} onChange={onChange} />
                {formData.sector_id === 11 && (
                  <OtherField label="Other Sector" name="other_sector" formData={formData} onChange={onChange} />
                )}
              </div>
              <div><FLabel label="Name of Specific Industry/Commercial Activities" required /><input type="text" value={formData.industry_name || ''} onChange={e => onChange('industry_name', e.target.value)} className={inputCls} /></div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Mode of Allotment" required name="mode_of_allotment_id" options={NMP_MODE_OPTIONS} formData={formData} onChange={onChange} />
            <SelectField label="Land Allotment Status" required name="status_id" options={NMP_STATUS_OPTIONS} formData={formData} onChange={onChange} />
            <div>
              <FLabel label={isFuture ? 'Target Yr of Monetisation' : 'Year of Allotment (FY)'} required />
              <select value={formData[isFuture ? 'target_yr_monetisation' : 'year_of_allotment'] || ''} onChange={(e) => onChange(isFuture ? 'target_yr_monetisation' : 'year_of_allotment', e.target.value)} className={inputCls}>
                <option value="">--Select Year--</option>
                {FY_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </Section>
      )}

      {/* ── Stage 2: Financial Details ── */}
      {stage === 2 && (
        <Section number={2} title="Financial Details" id="section-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FLabel label="Upfront Premium [A] (INR Cr)" required />
              <input type="number" step="any" value={formData.upfront_premium || ''} onChange={(e) => onChange('upfront_premium', e.target.value)} className={inputCls} />
            </div>
            <div>
              <FLabel label="Annual Base Lease Rental (INR Cr)" required />
              <input type="number" step="any" value={formData.annual_base_lease_rental || ''} onChange={(e) => onChange('annual_base_lease_rental', e.target.value)} className={inputCls} />
            </div>
            <div>
              <FLabel label="Lease Tenure (Years)" required />
              <input type="number" step="any" value={formData.lease_tenure || ''} onChange={(e) => onChange('lease_tenure', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FLabel label="Escalation Rate (% YoY)" required />
              <input type="number" step="any" value={formData.escalation_rate || ''} onChange={(e) => onChange('escalation_rate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <FLabel label="Frequency of Escalation (Years)" required />
              <input type="number" step="any" value={formData.frequency_of_escalation || ''} onChange={(e) => onChange('frequency_of_escalation', e.target.value)} className={inputCls} />
            </div>
            <div>
              <FLabel label="NPV of Lease Rentals @12% [B] (INR Cr)" required />
              <input type="number" step="any" value={formData.npv_lease_rental || ''} onChange={(e) => onChange('npv_lease_rental', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FLabel label="Estimated Private Investment [C] (INR Cr)" required />
              <input type="number" step="any" value={formData.estimated_private_investment || ''} onChange={(e) => onChange('estimated_private_investment', e.target.value)} className={inputCls} />
            </div>
            <div>
              <FLabel label="Total Monetization Value [A+B+C] (INR Cr)" required auto />
              <div className={autoCls}>{totalValue ?? '—'}</div>
            </div>
            <div>
              <FLabel label="Lease rental received in FY2025-26 (INR Cr)" required />
              <input type="number" step="any" value={formData.lease_rental_received || ''} onChange={(e) => onChange('lease_rental_received', e.target.value)} className={inputCls} />
            </div>
          </div>
        </Section>
      )}

      {/* ── Stage 3: Lessee & Milestones ── */}
      {stage === 3 && (
        <>
          <Section number={3} title="Lessee & Milestone Details" id="section-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FLabel label="Agency/Lessee Name" required />
                <input type="text" value={formData.lessee_name || ''} onChange={(e) => onChange('lessee_name', e.target.value)} className={inputCls} />
              </div>
              <SelectField label="Type of Agency/Lessee" required name="type_of_lessee_id" options={NMP_LESSEE_TYPE_OPTIONS} formData={formData} onChange={onChange} />
            </div>
          </Section>

          <MilestoneRow title="NIT Date" keyPrefix="nit" formData={formData} onChange={onChange} />
          <div className="mb-5" />

          <MilestoneRow title="Agreement Date" keyPrefix="agreement" formData={formData} onChange={onChange} />
          <div className="mb-5" />
          <div className="px-5 py-0 mb-5">
            <div className="mt-4 max-w-xs">
              <SelectField label="Agreement Signed" required name="agreement_signed_id" options={AGREEMENT_SIGNED_OPTIONS} formData={formData} onChange={onChange} />
            </div>
          </div>

          <MilestoneRow title="Completion of construction" keyPrefix="construction" formData={formData} onChange={onChange} />
        </>
      )}

      {/* ── Stage 4: Remarks & Review ── */}
      {stage === 4 && (
        <Section number={4} title="Remarks & Review" id="section-4">
          <div>
            <FLabel label="Remarks" />
            <textarea rows={4} value={formData.remarks || ''} onChange={(e) => onChange('remarks', e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition resize-y" />
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-700 dark:text-green-400 font-bold text-xs">
            All stages completed. Review the summary below and submit.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Upfront Premium [A]</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{formData.upfront_premium || '—'} <span className="text-xs font-normal text-slate-400">₹ Cr</span></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">NPV of Lease Rentals [B]</div>
              <div className="text-lg font-extrabold text-teal-700 dark:text-teal-400">{formData.npv_lease_rental || '—'} <span className="text-xs font-normal text-slate-400">₹ Cr</span></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total [A+B+C]</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{totalValue ?? '—'} <span className="text-xs font-normal text-slate-400">₹ Cr</span></div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  PAST LAND FORM (stage-aware)
// ══════════════════════════════════════════════════════════════════════════════

function PastLandForm({ formData, onChange, stage = 1 }) {
  const defaultRow = { sor_from: '', sor_to: '', year_of_applicability: '', annual_base_lease_rental: '', escalation_rate: '', frequency_of_escalation: '', lease_tenure: '', npv: '' };

  const [sorRows, setSorRows] = useState(() => {
    if (formData.sor_rows?.length) return formData.sor_rows;
    if (formData.annual_base_lease_rental || formData.lease_tenure) {
      return [{ ...defaultRow, annual_base_lease_rental: formData.annual_base_lease_rental || '', escalation_rate: formData.escalation_rate || '', frequency_of_escalation: formData.frequency_of_escalation || '', lease_tenure: formData.lease_tenure || '', npv: formData.npv_lease_rental || '' }];
    }
    return [{ ...defaultRow }];
  });

  const totalNpv = useMemo(() => sorRows.reduce((s, r) => s + (parseFloat(r.npv) || 0), 0), [sorRows]);

  const totalValue = useMemo(() => {
    const a = parseFloat(formData.upfront_premium) || 0;
    const c = parseFloat(formData.estimated_private_investment) || 0;
    const val = a + totalNpv + c;
    return val > 0 ? val.toFixed(2) : null;
  }, [formData.upfront_premium, formData.estimated_private_investment, totalNpv]);

  useEffect(() => {
    onChange('sor_rows', sorRows);
    if (sorRows.length > 0) {
      const r = sorRows[0];
      onChange('annual_base_lease_rental', r.annual_base_lease_rental);
      onChange('escalation_rate', r.escalation_rate);
      onChange('frequency_of_escalation', r.frequency_of_escalation);
      onChange('lease_tenure', r.lease_tenure);
    }
    onChange('npv_lease_rental', totalNpv > 0 ? totalNpv.toFixed(2) : '');
  }, [sorRows, totalNpv]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (idx, field, val) => setSorRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow = () => setSorRows(prev => [...prev, { ...defaultRow }]);
  const removeRow = (idx) => setSorRows(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1 text-xs">
      {stage === 1 && (<>
        <Section number={1} title="Basic and land parcel details" id="pl-s1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><FLabel label="Parcel Detail" required /><input type="text" value={formData.parcel_detail || ''} onChange={e => onChange('parcel_detail', e.target.value)} className={inputCls} /></div>
            <div><FLabel label="Area (Acres)" required /><input type="number" step="any" value={formData.area_acres || ''} onChange={e => onChange('area_acres', e.target.value)} className={inputCls} /></div>
            <SelectField label="Purpose" required name="purpose_id" options={NMP_PURPOSE_OPTIONS} formData={formData} onChange={onChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Sector" required name="sector_id" options={NMP_SECTOR_OPTIONS} formData={formData} onChange={onChange} />
            <div><FLabel label="Name of Specific Industry/Commercial Activities" required /><input type="text" value={formData.industry_name || ''} onChange={e => onChange('industry_name', e.target.value)} className={inputCls} /></div>
          </div>
        </Section>
        <Section number={2} title="Allotment and status" id="pl-s2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><FLabel label="Year of allotment (FY)" required /><select value={formData.year_of_allotment || ''} onChange={e => onChange('year_of_allotment', e.target.value)} className={inputCls}><option value="">--Select Year--</option>{FY_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            <SelectField label="Mode of Allotment" required name="mode_of_allotment_id" options={NMP_MODE_OPTIONS} formData={formData} onChange={onChange} />
            <SelectField label="Land Allotment Status" required name="status_id" options={NMP_STATUS_OPTIONS} formData={formData} onChange={onChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Lease Status" name="lease_status_id" options={PAST_LEASE_STATUS_OPTIONS} formData={formData} onChange={onChange} />
          </div>
        </Section>
      </>)}

      {stage === 2 && (<>
        <Section number={3} title="Financial and Lease Details" id="pl-s3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><FLabel label="Upfront Premium Received in Year of Allotment [A] (INR Cr)" /><input type="number" step="any" value={formData.upfront_premium || ''} onChange={e => onChange('upfront_premium', e.target.value)} className={inputCls} /></div>
            <div><FLabel label="Investment Done by Private Player [C] (INR Cr)" /><input type="number" step="any" value={formData.estimated_private_investment || ''} onChange={e => onChange('estimated_private_investment', e.target.value)} className={inputCls} /></div>
          </div>
        </Section>
        <Section number={4} title="Lease and Rental Details" id="pl-s4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-[11px] min-w-[960px]">
              <thead>
                <tr className="bg-[#0f417a] text-white">
                  <th className="px-3 py-2.5 text-center font-bold w-10">SI NO</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[200px]">Period of SoR (FY) *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[120px]">Year of Applicability *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[160px]">Annual Base Lease Rental (INR Cr) *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[130px]">Escalation Rate (% YoY) *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[160px]">Frequency of Escalation (Years) *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[130px]">Lease Tenure (Years) *</th>
                  <th className="px-3 py-2.5 text-left font-bold min-w-[160px]">NPV of Lease Rentals @12% [B] (INR Cr) *</th>
                  <th className="px-3 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {sorRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-3 py-2 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <select value={row.sor_from || ''} onChange={e => updateRow(idx, 'sor_from', e.target.value)} className={`${inputCls} w-24`}><option value="">— FY —</option>{FY_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <span className="text-slate-400 text-[10px]">to</span>
                        <select value={row.sor_to || ''} onChange={e => updateRow(idx, 'sor_to', e.target.value)} className={`${inputCls} w-24`}><option value="">— FY —</option>{FY_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                      </div>
                    </td>
                    <td className="px-3 py-2"><select value={row.year_of_applicability || ''} onChange={e => updateRow(idx, 'year_of_applicability', e.target.value)} className={`${inputCls} w-28`}><option value="">-- Select --</option>{FY_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select></td>
                    <td className="px-3 py-2"><input type="number" step="any" value={row.annual_base_lease_rental || ''} onChange={e => updateRow(idx, 'annual_base_lease_rental', e.target.value)} className={`${inputCls} w-28`} /></td>
                    <td className="px-3 py-2"><input type="number" step="any" value={row.escalation_rate || ''} onChange={e => updateRow(idx, 'escalation_rate', e.target.value)} className={`${inputCls} w-24`} /></td>
                    <td className="px-3 py-2"><input type="number" step="any" value={row.frequency_of_escalation || ''} onChange={e => updateRow(idx, 'frequency_of_escalation', e.target.value)} className={`${inputCls} w-24`} /></td>
                    <td className="px-3 py-2"><input type="number" step="any" value={row.lease_tenure || ''} onChange={e => updateRow(idx, 'lease_tenure', e.target.value)} className={`${inputCls} w-24`} /></td>
                    <td className="px-3 py-2"><input type="number" step="any" value={row.npv || ''} onChange={e => updateRow(idx, 'npv', e.target.value)} className={`${inputCls} w-28`} /></td>
                    <td className="px-3 py-2 text-center">{sorRows.length > 1 && <button type="button" onClick={() => removeRow(idx)} className="text-rose-500 hover:text-rose-700 font-extrabold text-base cursor-pointer leading-none">×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
            <button type="button" onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 transition cursor-pointer">
              <span className="text-sm leading-none">+</span> Add Row
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Total Monetization Value [A+B+C] (INR Cr)</span>
              <div className={autoCls} style={{ width: 160 }}>{totalValue ?? '—'}</div>
            </div>
          </div>
        </Section>
      </>)}

      {stage === 3 && (<>
        <Section number={5} title="Lessee and Milestone Details" id="pl-s5">
          <div className="space-y-3">
          <SelectField label="Type of Lessee" name="type_of_lessee_id" options={NMP_LESSEE_TYPE_OPTIONS} formData={formData} onChange={onChange} />
          {formData.type_of_lessee_id === 5 && (
            <OtherField label="Other Lessee Type" name="other_agency" formData={formData} onChange={onChange} />
          )}
        </div>
        </Section>
        <MilestoneRow title="NIT Date" keyPrefix="nit" formData={formData} onChange={onChange} />
        <div className="mb-1" />
        <MilestoneRow title="Agreement Date" keyPrefix="agreement" formData={formData} onChange={onChange} />
        <div className="px-5 py-3">
          <div className="max-w-xs">
            <SelectField label="Agreement Signed" required name="agreement_signed_id" options={AGREEMENT_SIGNED_OPTIONS} formData={formData} onChange={onChange} />
          </div>
        </div>
        <MilestoneRow title="Completion of construction" keyPrefix="construction" formData={formData} onChange={onChange} />
      </>)}

      {stage === 4 && (
        <Section number={6} title="Remarks and Data Quality" id="pl-s6">
          <div>
            <FLabel label="Remarks" />
            <textarea rows={3} value={formData.remarks || ''} onChange={e => onChange('remarks', e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition resize-y" />
          </div>
        </Section>
      )}
    </div>
  );
}
function OtherField({ label, name, formData, onChange }) {
  return (
    <div>
      <FLabel label={label} required />
      <input
        type="text"
        value={formData[name] || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder="Please specify"
        className={inputCls}
      />
    </div>
  );
}
{/* <SelectField label="Purpose" required name="purpose_id" options={NMP_PURPOSE_OPTIONS} formData={formData} onChange={onChange} />
{formData.purpose_id === 4 && (
  <OtherField label="Other Purpose" name="other_purpose" formData={formData} onChange={onChange} />
)}
<SelectField label="Sector" required name="sector_id" options={NMP_SECTOR_OPTIONS} formData={formData} onChange={onChange} />
{formData.sector_id === 11 && (
  <OtherField label="Other Sector" name="other_sector" formData={formData} onChange={onChange} />
)}
<SelectField label="Type of Lessee" name="type_of_lessee_id" options={NMP_LESSEE_TYPE_OPTIONS} formData={formData} onChange={onChange} />
{formData.type_of_lessee_id === 5 && (
  <OtherField label="Other Lessee Type" name="other_agency" formData={formData} onChange={onChange} />
)} */}
// ══════════════════════════════════════════════════════════════════════════════
// ██  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'land-abstract', label: 'Land Abstract' },
  { id: 'past-land', label: 'Past Monetised Land' },
  { id: 'future-land', label: 'Future Monetisation Plan' },
];

export default function NmpInputForm({ editData, onSuccess, onCancel, triggerNotification }) {
  const location = useLocation();
  const isEditMode = !!editData;
  const defaultTab = editData?.form_type || location.state?.formType || 'future-land';
  const [subTab, setSubTab] = useState(defaultTab);
  const [formData, setFormData] = useState(() => normalizeEditData(editData) || {});
  const [submitting, setSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [completedStages, setCompletedStages] = useState(new Set());
  const [stageError, setStageError] = useState('');

  const isAbstract = subTab === 'land-abstract';
  const isFuture = subTab === 'future-land';
  const isPast = subTab === 'past-land';
  const stages = isPast ? PAST_STAGES : PARCEL_STAGES;

  const handleChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStageError('');
  }, []);

  const canAdvance = useMemo(() => {
    if (isAbstract) return true;
    if (isPast) return validatePastStage(currentStage, formData);
    return validateParcelStage(currentStage, formData, isFuture);
  }, [currentStage, formData, isAbstract, isPast, isFuture]);

  const handleNext = useCallback(() => {
    if (!canAdvance) {
      const missing = getMissingFields(currentStage, formData, isFuture);
      setStageError(missing ? `Missing: ${missing}` : 'Complete the required fields to proceed');
      return;
    }
    setStageError('');
    setCompletedStages((prev) => new Set([...prev, currentStage]));
    if (currentStage < 4) setCurrentStage(currentStage + 1);
  }, [canAdvance, currentStage, formData, isFuture]);

  const handlePrev = useCallback(() => {
    if (currentStage > 1) {
      setStageError('');
      setCurrentStage(currentStage - 1);
    }
  }, [currentStage]);

  const handleStageClick = useCallback((stageId) => {
    if (completedStages.has(stageId) || stageId === currentStage) {
      setStageError('');
      setCurrentStage(stageId);
    }
  }, [completedStages, currentStage]);
  const labelOf = (options, id) => options.find((o) => o.id === Number(id))?.label ?? '';

  const handleSubmit = async () => {
    if (!isAbstract && (currentStage !== 4 || !completedStages.has(1) || !completedStages.has(2) || !completedStages.has(3))) return;
    setSubmitting(true);
    try {
      const userId = getCurrentUserId();
      const payload = { ...formData, form_type: subTab, user_id: userId };

  if (!isAbstract) {
    // backend reads these keys, so put the numeric ids in them
    payload.lease_status      = formData.lease_status_id ?? null;
    payload.purpose           = formData.purpose_id ?? null;
    payload.sector            = formData.sector_id ?? null;
    payload.status            = formData.status_id ?? null;
    payload.mode_of_allotment = formData.mode_of_allotment_id ?? null;
    payload.type_of_lessee    = formData.type_of_lessee_id ?? null;
    payload.agreement_signed  = formData.agreement_signed_id ?? null;
    payload.other_purpose = formData.purpose_id === 4 ? (formData.other_purpose || '').trim() : null;
    payload.other_sector  = formData.sector_id === 11 ? (formData.other_sector || '').trim() : null;
    payload.other_agency  = formData.type_of_lessee_id === 5 ? (formData.other_agency || '').trim() : null;

    // future-land controller reads this key name
    payload.construction_target = formData.construction_original;
  }
      // payload now carries ids: lease_status_id, purpose_id, sector_id, status_id,
      // mode_of_allotment_id, type_of_lessee_id, agreement_signed_id

      if (isFuture) {
        payload.npv_lease_rental = parseFloat(parseFloat(formData.npv_lease_rental || 0).toFixed(2));
        const a = parseFloat(formData.upfront_premium) || 0;
        const c = parseFloat(formData.estimated_private_investment) || 0;
        payload.total_monetization_value = parseFloat((a + payload.npv_lease_rental + c).toFixed(2));
      } else if (isPast) {
        const npv = parseFloat(formData.npv_lease_rental) || 0;
        const a = parseFloat(formData.upfront_premium) || 0;
        const c = parseFloat(formData.estimated_private_investment) || 0;
        payload.total_monetization_value = parseFloat((a + npv + c).toFixed(2));
        payload.sor_rows = (formData.sor_rows || []).filter(r =>
        r.sor_from || r.sor_to || r.year_of_applicability || r.annual_base_lease_rental ||
        r.escalation_rate || r.frequency_of_escalation || r.lease_tenure || r.npv
      );

        if (!isEditMode) {
          const uniqueNmpId = await generateUniquePastNmpId();
          if (!uniqueNmpId) {
            triggerNotification?.('Could not generate NMP ID. Please try again.', 'error');
            return; // finally resets submitting
          }
          payload.unique_nmp_id = uniqueNmpId;
        }
      }

      if (isEditMode && editData?.id) {
        await updateNmpEntry({ ...payload, id: editData.id });
        triggerNotification?.('NMP entry updated successfully.', 'success');
      } else {
        await createNmpEntry(payload);
        triggerNotification?.('NMP entry created successfully.', 'success');
      }
      onSuccess?.();
    } catch (err) {
      triggerNotification?.(err?.response?.data?.message || 'Failed to save NMP entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabSwitch = useCallback((tabId) => {
    setSubTab(tabId);
    setFormData({});
    setCurrentStage(1);
    setCompletedStages(new Set());
    setStageError('');
  }, []);

  const formTitle = useMemo(() => {
    if (isAbstract) return 'Land Abstract';
    const prefix = isEditMode ? 'Edit parcel' : 'New parcel';
    const suffix = isFuture ? 'Future Monetisation Plan' : 'Past Monetised Land';
    return `${prefix} · ${suffix}`;
  }, [isAbstract, isFuture, isEditMode]);

  return (
    <div className="animate-fade-in">

      {/* Sub-tab selector */}
      {!isEditMode && (
        <div className="module-subtabs-strip mb-5">
          {SUB_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => handleTabSwitch(tab.id)} className={`module-subtab-btn ${subTab === tab.id ? 'active' : ''}`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Stage stepper + Form */}
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 relative">
        <div className="flex items-center gap-6 mb-6">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap">{formTitle}</h2>
          {!isAbstract && (
            <div className="mx-auto mr-140 w-fit"><StageStepper stages={stages} current={currentStage} completed={completedStages} onStageClick={handleStageClick} /></div>
          )}
        </div>
        <div className="mt-5">
          {isAbstract ? (
            <LandAbstractForm formData={formData} onChange={handleChange} />
          ) : isPast ? (
            <PastLandForm formData={formData} onChange={handleChange} stage={currentStage} />
          ) : (
            <ParcelForm formType={subTab} formData={formData} onChange={handleChange} stage={currentStage} />
          )}

          {/* Stage error */}
          {stageError && (
            <div className="flex items-center gap-2 mt-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 font-bold">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {stageError}
            </div>
          )}
        </div>

        {/* Navigation bar */}
        {isAbstract ? (
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center justify-end gap-3 -mx-5 -mb-5 mt-6 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition cursor-pointer">
              Exit
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50">
              {submitting ? 'Saving…' : 'Submit'}
            </button>
          </div>
        ) : (
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between gap-4 -mx-5 -mb-5 mt-6 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Stage {currentStage} / 4
              </span>
              {!canAdvance && currentStage < 4 && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-3 w-3" /> Complete required fields to proceed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition cursor-pointer">
                Exit
              </button>
              {currentStage > 1 && (
                <button type="button" onClick={handlePrev} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
              )}
              {currentStage < 4 ? (
                <button type="button" onClick={handleNext} className={`flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-lg shadow-sm transition cursor-pointer ${canAdvance ? 'bg-[#0f417a] hover:bg-[#0d3566] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting || !completedStages.has(1) || !completedStages.has(2) || !completedStages.has(3)} className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
