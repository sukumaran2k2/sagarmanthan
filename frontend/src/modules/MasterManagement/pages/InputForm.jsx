import { useEffect, useMemo, useRef, useState } from 'react';  
import { ArrowLeft, Save, FileText, AlertCircle } from 'lucide-react';
import { rbacApi } from '../../UserManagement/rbacApi';

const ORGANISATION_FIELDS = [
  { name: 'organisation_name', label: 'Organisation Name', type: 'text', required: true, placeholder: 'Enter organisation name' },
  { name: 'organisation_code', label: 'Organisation Code', type: 'text', required: true, placeholder: 'Enter organisation code', maxLength: 10, uppercase: true },
  { name: 'organisation_category_id', label: 'Organisation Category', type: 'select', required: true,
    optionsFrom: 'mmt_organisation_category', optionValue: 'organisation_category_id', optionLabel: 'organisation_category_name', placeholder: '--Select Category--' },
  
];
const OUTPUT_FIELDS = [
  { name: 'project_output_name', label: 'Project Output Name', type: 'text', required: true, placeholder: 'Enter project output name' },
  { name: 'project_output_units', label: 'Project Output Unit', type: 'text', required: true, placeholder: 'Enter project output unit' },
];

const AGENCY_FIELDS = [
  { name: 'ia_name', label: 'Implementing Agency Name', type: 'text', required: true, placeholder: 'Enter implementing agency name' },
  { name: 'ia_code', label: 'Implementing Agency Code', type: 'text', required: true, placeholder: 'Enter implementing agency code' },
];
const FUNDING_AGENCY_FIELDS = [
  { name: 'fa_name', label: 'Funding Agency Name', type: 'text', required: true, placeholder: 'Enter funding agency name' },
];
const MP_CONSTITUENCY_FIELDS = [
  { name: 'mpc_name', label: 'MP Constituency Name', type: 'text', required: true, placeholder: 'Enter MP constituency name' },
  { name: 'state_id', label: 'State', type: 'select', required: true,
    optionsFrom: 'mmt_state', optionValue: 'state_id', optionLabel: 'state_name', placeholder: '--Select State--' },
];
const POST_FIELDS = [
  { name: 'post_name', label: 'Post Name', type: 'text', required: true, placeholder: 'Enter post name' },
  { name: 'post_code', label: 'Post Code', type: 'text', required: true, placeholder: 'Enter post code' },
  { name: 'department_id', label: 'Department', type: 'select', required: true,
    optionsFrom: 'mmt_department', optionValue: 'department_id', optionLabel: 'department_name', placeholder: '--Select Department--' },
];
const STATE_FIELDS = [
  { name: 'state_name', label: 'State Name', type: 'text', required: true, placeholder: 'Enter state name' },
  { name: 'district_name', label: 'District Name', type: 'text', required: true, placeholder: 'Enter district name' },
];
const isPostMeta = (meta) =>
  /(^|[\s_-])posts?([\s_-]|$)/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);

const isConstituencyMeta = (meta) =>
  /constituency/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);

const isFundingAgencyMeta = (meta) =>
  /funding[\s_-]*agency/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);

const isAgencyMeta = (meta) =>
  /implementing/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);

const isOutputMeta = (meta) =>
  /output/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);
export default function InputForm({
  meta,
  columns = [],
  initialForm = null,
  idField,
  onBack,
  onSuccess,
  fetchData,
  triggerNotification,
}) {
  const isEdit = !!initialForm;


  const [values, setValues] = useState(() => {
    if (!initialForm) return {};
    const v = Object.fromEntries(
      Object.entries(initialForm).map(([k, val]) => [k, val == null ? '' : String(val)])
    );
    // Organisations list returns category_id, the form field is organisation_category_id
    if (!v.organisation_category_id && v.category_id) {
      v.organisation_category_id = v.category_id;
    }
    // MP Constituency list may return mp_constituency_name, the form field is mpc_name
    if (!v.mpc_name && v.mp_constituency_name) {
      v.mpc_name = v.mp_constituency_name;
    }
    return v;
  });
    const [options, setOptions] = useState({});
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const notifyRef = useRef(triggerNotification);
  useEffect(() => {
    notifyRef.current = triggerNotification;
  });

  // Explicit fields if the master defines them, otherwise derive from columns
const fields = useMemo(() => {
  // if (meta?.table === 'mmt_state') return STATE_FIELDS;   // ADD THIS FIRST

  let base = meta?.fields
    ? meta.fields
    : columns
        .map((c) => c.field)
        .filter(Boolean)
        .slice(1)
        .map((k) => ({
          name: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: 'text',
          required: true,
        }));

  // Wing master: add Wing Code input right after Wing Name
  const isWing = /wing/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);
  if (/organi[sz]ation/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`)) return ORGANISATION_FIELDS;
  if (isOutputMeta(meta)) return OUTPUT_FIELDS;
  const isDivision = /division/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);
  if (isAgencyMeta(meta)) return AGENCY_FIELDS;
  if (isConstituencyMeta(meta)) return MP_CONSTITUENCY_FIELDS;
  if (isFundingAgencyMeta(meta)) return FUNDING_AGENCY_FIELDS;
  if (isPostMeta(meta)) return POST_FIELDS;

  if (isDivision) {
    return [
      {
        name: 'wing_id',
        label: 'Wing',
        type: 'select',
        required: true,
        optionsFrom: 'mmt_wings',        // key your getMmtData expects for the Wing master
        optionValue: 'wing_id',     // field in each Wing record used as the value
        optionLabel: 'wing_name',   // field in each Wing record shown to the user
        placeholder: '--Select Wing--',
      },
      {
        name: 'division_name',
        label: 'Division Name',
        type: 'text',
        required: true,
        placeholder: 'Enter division name',
      },
      {
        name: 'division_code',
        label: 'Division Code',
        type: 'text',
        required: true,
        placeholder: 'Enter division code',
        maxLength: 10,
        uppercase: true,
      },
    ];
  }


  if (isWing && !base.some((f) => f.name === 'wing_code')) {
    const wingCode = {
      name: 'wing_code',
      label: 'Wing Code',
      type: 'text',
      required: true,
      placeholder: 'Enter wing code',
      maxLength: 10,
      uppercase: true,
    };
    const idx = base.findIndex((f) => f.name === 'wing_name');
    base =
      idx === -1
        ? [...base, wingCode]
        : [...base.slice(0, idx + 1), wingCode, ...base.slice(idx + 1)];
  }

  return base;
}, [meta, columns]);

  // Load dropdown options (e.g. State list)
  useEffect(() => {
    fields
      .filter((f) => f.type === 'select' && f.optionsFrom)
      .forEach((f) => {
        rbacApi
          .getMmtData(f.optionsFrom)
          .then((res) => setOptions((p) => ({ ...p, [f.name]: res.data || [] })))
          .catch(() => triggerNotification?.(`Failed to load ${f.label}`, 'error'));
      });
  }, [fields, triggerNotification]);

  const setVal = (name, val) =>
  setValues((p) => {
    const next = { ...p, [name]: val };
    fields.forEach((f) => { if (f.dependsOn === name) next[f.name] = ''; });
    return next;
  });
  const optionsFor = (f) => {
  const list = options[f.name] || [];
  if (!f.dependsOn) return list;
  const parent = values[f.dependsOn];
  if (!parent) return [];
  return list.filter((o) => String(o[f.filterBy]) === String(parent));
};
  const handleBlur = (name) => setTouched((p) => ({ ...p, [name]: true }));

  const validationErrors = useMemo(() => {
    const errs = {};
    fields.forEach((f) => {
      if (f.required && !String(values[f.name] ?? '').trim()) {
        errs[f.name] = `${f.label} is required`;
      }
    });
    return errs;
  }, [fields, values]);

  const isFormValid = Object.keys(validationErrors).length === 0;
  const shouldShowError = (name) => (touched[name] || formSubmitted) && validationErrors[name];

const handleSubmit = async (e) => {
  e.preventDefault();
  setFormSubmitted(true);
  if (!isFormValid) return;

  setSubmitting(true);
  try {
    const isOrg = /organi[sz]ation/i.test(`${meta?.table ?? ''} ${meta?.key ?? ''} ${meta?.label ?? ''}`);
    const table =
      meta?.table ??
      (isOrg ? 'mmt_organisation'
        : isOutputMeta(meta) ? 'mmt_output'
        : isAgencyMeta(meta) ? 'mmt_implementing_agency'
        : isPostMeta(meta) ? 'mmt_post'
        : isConstituencyMeta(meta) ? 'mmt_mp_constituency'
        : isFundingAgencyMeta(meta) ? 'mmt_funding_agency'
        : undefined);

    if (isEdit) {
      const pkField = idField ?? Object.keys(initialForm)[0];
      const updatePayload = Object.fromEntries(
        fields.map((f) => [f.name, String(values[f.name] ?? '').trim()])
      );
      await rbacApi.updateMmtData(table, initialForm[pkField], updatePayload);
      notifyRef.current?.(`${meta.label} updated`, 'success');
      onSuccess?.();
    } else {
      // trim text values so stray spaces never reach the DB
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      );
      await rbacApi.insertMmtData(table, payload);
      notifyRef.current?.(`${meta.label} saved`, 'success');
      fetchData?.();
      setValues({});
      setTouched({});
      setFormSubmitted(false);
    }
  } catch (err) {
    console.error('Save failed →', {
      status: err?.response?.status,
      data: err?.response?.data,
      url: err?.config?.url,
      sent: err?.config?.data,
      message: err?.message,
    });
    notifyRef.current?.(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to ${isEdit ? 'update' : 'save'} ${meta.label}`,
      'error'
    );
  } finally {
    setSubmitting(false);
  }
};
  const fieldClass = (name) =>
    `w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
      shouldShowError(name)
        ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
        : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
    }`;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{isEdit ? 'Edit' : 'Add'} {meta?.label}</span>
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
        <button
          onClick={onBack}
          type="button"
          className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6" noValidate>
        {/* Global Validation Error Banner */}
        {formSubmitted && !isFormValid && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Please correct the following errors before submitting:
              </h4>
              <ul className="mt-1 list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
                {Object.values(validationErrors).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {fields.length === 0 && (
          <p className="text-xs text-slate-500">Loading fields...</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <label
                htmlFor={`f-${f.name}`}
                className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {f.label} {f.required && <span className="text-rose-500">*</span>}
              </label>

              {f.type === 'select' ? (
                <select
                id={`f-${f.name}`}
                value={values[f.name] ?? ''}
                onChange={(e) => setVal(f.name, e.target.value)}
                onBlur={() => handleBlur(f.name)}
                disabled={!!f.dependsOn && !values[f.dependsOn]}
                className={`${fieldClass(f.name)} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <option value="">{f.placeholder || `--Select ${f.label}--`}</option>
                {optionsFor(f).map((o) => (
                    <option key={o[f.optionValue]} value={String(o[f.optionValue])}>
                      {o[f.optionLabel]}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                id={`f-${f.name}`}
                type="text"
                value={values[f.name] ?? ''}
                onChange={(e) =>
                  setVal(f.name, f.uppercase ? e.target.value.toUpperCase() : e.target.value)
                }
                onBlur={() => handleBlur(f.name)}
                placeholder={f.placeholder || ''}
                maxLength={f.maxLength}
                className={fieldClass(f.name)}
              />
              )}

              {shouldShowError(f.name) && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors[f.name]}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Submit Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center space-x-2 text-xs transition px-6 py-2.5 rounded-xl font-bold tracking-wider uppercase shadow-sm ${
                submitting
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] text-white hover:bg-blue-800 cursor-pointer active:scale-98'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : `${isEdit ? 'Update' : 'Save'} ${meta?.label}`}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}