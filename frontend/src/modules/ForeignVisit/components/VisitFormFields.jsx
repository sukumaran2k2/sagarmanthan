import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import MultiSelect from '../../../components/MultiSelect';
import { useFvStore } from '../store/useFvStore';
import {
  GOI_DESIGNATIONS,
  TITLES,
  SCHEMA_LIMITS,
  isMinistryOrganisation,
} from '../utils/constants';
import {
  deriveVisitFields,
  isOtherDesignation,
  isOtherOrganisation,
  isOtherVisitType,
  stageSections,
} from '../utils/visitForm';

/**
 * Every section uses this one grid, so each field lands on the same four-column rhythm and the
 * labels line up down the whole form. A field widens by spanning columns, never by switching to
 * a grid of its own.
 */
export const GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4';
export const HALF = 'sm:col-span-2';
export const FULL = 'sm:col-span-2 lg:col-span-4';

/**
 * One labelled field. `span` decides how many of the four columns it occupies.
 *
 * The label row has a fixed minimum height so that a field with a character counter and one
 * without still start their inputs on the same line.
 */
export function Field({ label, required = false, span = '', counter, error, children }) {
  return (
    <div className={`space-y-1.5 ${span}`}>
      <div className="flex justify-between items-center gap-2 min-h-[18px]">
        <label className="module-form-label truncate">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {counter != null && (
          <span className="text-[10px] text-slate-400 font-semibold shrink-0">{counter}</span>
        )}
      </div>
      {children}
      {error}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="module-form-section-title">{title}</h4>
      <div className={GRID}>{children}</div>
    </section>
  );
}

/**
 * The proposal fields of an Official Foreign Visit.
 *
 * Shared by the Input Form (create) and the Proposal tab of the Update screen, so the two can
 * never drift apart. The parent owns the values, the errors and which fields have been touched.
 */
export default function VisitFormFields({
  values,
  onChange,
  onTouch = () => {},
  errors = {},
  touched = {},
  formSubmitted = false,
  // The update screen owns the sanction decision on its own tab, so it suppresses the
  // Sanctioning Details block here even when the stage would otherwise show it.
  showSanctioningAuthority = true,
  // Slot for the create form's "Upload Sanction Order", which sits beside the authority field.
  sanctionOrderField = null,
  disabled = false,
}) {
  const organisations = useFvStore((s) => s.organisations);
  const designations = useFvStore((s) => s.designations);
  const visitTypes = useFvStore((s) => s.visitTypes);
  const allVisitTypes = useFvStore((s) => s.allVisitTypes);
  const stages = useFvStore((s) => s.stages);
  const countries = useFvStore((s) => s.countries);

  /**
   * The picker shows the de-duplicated master, but a saved record may point at one of the
   * duplicate ids that was dropped. Without its own option the select would render blank and
   * the next save would silently clear the visit type, so add it back when it is missing.
   */
  const visitTypeOptions = useMemo(() => {
    const current = String(values.visitType || '');
    if (!current || visitTypes.some((t) => String(t.Id) === current)) return visitTypes;
    const missing = allVisitTypes.find((t) => String(t.Id) === current);
    return missing ? [...visitTypes, missing] : visitTypes;
  }, [visitTypes, allVisitTypes, values.visitType]);

  const { duration, year } = deriveVisitFields(values);

  // Which blocks the selected stage calls for. A proposal has nothing to say about a sanction
  // or a tour that has not happened, so those fields stay out of the way until they apply.
  const sections = stageSections(values.stage);
  const showSanctioning = sections.sanctioning && showSanctioningAuthority;

  // A GoI-equivalent rank only applies to ministry officers, so the field is shown for MoPSW
  // and hidden for every other organisation, at every stage.
  const showGoiDesignation = isMinistryOrganisation(organisations, values.organisation);

  /**
   * Changing the organisation clears any GoI designation carried over from a previous choice,
   * so a rank picked for the ministry is not saved against another organisation.
   *
   * This clears on the user's action, not on the field being hidden. Some older records hold a
   * GoI designation under a non-ministry organisation; merely opening one of those must leave
   * the stored value alone rather than wipe it on the next save.
   */
  const handleOrganisationChange = (e) => {
    const next = e.target.value;
    onChange('organisation', next);
    if (!isMinistryOrganisation(organisations, next) && values.designationGOI) {
      onChange('designationGOI', '');
    }
  };

  const showError = (field) => (touched[field] || formSubmitted) && !!errors[field];
  const errorClass = (field) => (showError(field) ? '!border-rose-500 !ring-1 !ring-rose-500' : '');

  const fieldError = (field) =>
    showError(field) ? (
      <p className="module-form-error-msg flex items-center gap-1">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>{errors[field]}</span>
      </p>
    ) : null;

  const set = (field) => (e) => onChange(field, e.target.value);
  const blur = (field) => () => onTouch(field);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.country, label: c.country })),
    [countries]
  );

  const sortedOrganisations = useMemo(
    () => [...organisations].sort((a, b) => String(a.organisation_name).localeCompare(String(b.organisation_name))),
    [organisations]
  );

  const sortedDesignations = useMemo(
    () => [...designations].sort((a, b) => String(a.designation).localeCompare(String(b.designation))),
    [designations]
  );

  return (
    <div className="space-y-6">
      <Section title="Dates of Visit (Excluding Travelling Time)">
        <Field label="From" required error={fieldError('visitFrom')}>
          <input type="date" value={values.visitFrom} disabled={disabled}
            onChange={set('visitFrom')} onBlur={blur('visitFrom')}
            className={`module-form-input ${errorClass('visitFrom')}`} />
        </Field>

        <Field label="To" required error={fieldError('visitTo')}>
          <input type="date" value={values.visitTo} disabled={disabled}
            min={values.visitFrom || undefined}
            onChange={set('visitTo')} onBlur={blur('visitTo')}
            className={`module-form-input ${errorClass('visitTo')}`} />
        </Field>

        {/* Year and duration are derived from the dates, exactly as the 2.0 form did. */}
        <Field label="Year">
          <input type="text" value={year || ''} readOnly tabIndex={-1}
            className="module-form-input module-form-input-readonly" />
        </Field>

        <Field label="Duration of Visit (in days)">
          <input type="text" value={duration || ''} readOnly tabIndex={-1}
            className="module-form-input module-form-input-readonly" />
        </Field>
      </Section>

      <Section title="Visit Details">
        <Field label="Stage of Visit" required span={HALF} error={fieldError('stage')}>
          <select value={values.stage} disabled={disabled}
            onChange={set('stage')} onBlur={blur('stage')}
            className={`module-form-select cursor-pointer ${errorClass('stage')}`}>
            <option value="">--Select Stage--</option>
            {stages.map((s) => (
              <option key={s.fv_stage_id} value={String(s.fv_stage_id)}>{s.fv_stage_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Type of Visit" required span={HALF} error={fieldError('visitType')}>
          <select value={values.visitType} disabled={disabled}
            onChange={set('visitType')} onBlur={blur('visitType')}
            className={`module-form-select cursor-pointer ${errorClass('visitType')}`}>
            <option value="">--Select Visit Type--</option>
            {visitTypeOptions.map((t) => (
              <option key={t.Id} value={String(t.Id)}>{t.visit_type_name}</option>
            ))}
          </select>
        </Field>

        {isOtherVisitType(visitTypeOptions, values.visitType) && (
          <Field label="Specify the Visit Type" required span={FULL} error={fieldError('newVisitType')}>
            <input type="text" value={values.newVisitType} disabled={disabled}
              maxLength={SCHEMA_LIMITS.otherVisitType}
              onChange={set('newVisitType')} onBlur={blur('newVisitType')}
              placeholder="e.g. Bilateral Maritime Dialogue"
              className={`module-form-input ${errorClass('newVisitType')}`} />
          </Field>
        )}
      </Section>

      <Section title="Officer Details">
        <Field label="Title" required error={fieldError('title')}>
          <select value={values.title} disabled={disabled}
            onChange={set('title')} onBlur={blur('title')}
            className={`module-form-select cursor-pointer ${errorClass('title')}`}>
            <option value="">--Select--</option>
            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Officer Name" required error={fieldError('officerName')}>
          <input type="text" value={values.officerName} disabled={disabled}
            maxLength={SCHEMA_LIMITS.officerName}
            onChange={set('officerName')} onBlur={blur('officerName')}
            placeholder="e.g. Ranjit Kumar Srivastava"
            className={`module-form-input ${errorClass('officerName')}`} />
        </Field>

        <Field label="Organisation Name" required span={HALF} error={fieldError('organisation')}>
          <select value={values.organisation} disabled={disabled}
            onChange={handleOrganisationChange} onBlur={blur('organisation')}
            className={`module-form-select cursor-pointer ${errorClass('organisation')}`}>
            <option value="">--Select Organisation--</option>
            {sortedOrganisations.map((o) => (
              <option key={o.organisation_id} value={String(o.organisation_id)}>{o.organisation_name}</option>
            ))}
            <option value="Others">Others</option>
          </select>
        </Field>

        {isOtherOrganisation(values.organisation) && (
          <Field label="New Organisation Name" required span={FULL} error={fieldError('newOrganisation')}>
            <input type="text" value={values.newOrganisation} disabled={disabled}
              onChange={set('newOrganisation')} onBlur={blur('newOrganisation')}
              placeholder="This will be added to the organisation master"
              className={`module-form-input ${errorClass('newOrganisation')}`} />
          </Field>
        )}

        {/* Ministry officers only -- see isMinistryOrganisation. */}
        {showGoiDesignation && (
          <Field label="Designation Equivalent in GoI" span={HALF}>
            <select value={values.designationGOI} disabled={disabled}
              onChange={set('designationGOI')} onBlur={blur('designationGOI')}
              className="module-form-select cursor-pointer">
              <option value="">--Select--</option>
              {GOI_DESIGNATIONS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
            </select>
          </Field>
        )}

        <Field label="Designation in the Respective Organisation" required
          span={showGoiDesignation ? HALF : FULL} error={fieldError('designation')}>
          <select value={values.designation} disabled={disabled}
            onChange={set('designation')} onBlur={blur('designation')}
            className={`module-form-select cursor-pointer ${errorClass('designation')}`}>
            <option value="">--Select Designation--</option>
            {sortedDesignations.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.designation}</option>
            ))}
          </select>
        </Field>

        {isOtherDesignation(values.designation) && (
          <Field label="Specify the Designation" required span={FULL} error={fieldError('newDesignation')}>
            <input type="text" value={values.newDesignation} disabled={disabled}
              maxLength={SCHEMA_LIMITS.otherDesignation}
              onChange={set('newDesignation')} onBlur={blur('newDesignation')}
              className={`module-form-input ${errorClass('newDesignation')}`} />
          </Field>
        )}
      </Section>

      <Section title="Purpose and Destination">
        <Field label="Purpose of Visit / Keywords" required span={FULL}
          counter={`${values.purpose.length} / ${SCHEMA_LIMITS.purpose}`}
          error={fieldError('purpose')}>
          <textarea value={values.purpose} rows={3} disabled={disabled}
            maxLength={SCHEMA_LIMITS.purpose}
            onChange={set('purpose')} onBlur={blur('purpose')}
            placeholder="e.g. To attend the 34th Aids to Navigation Fund Committee meeting"
            className={`module-form-textarea resize-y ${errorClass('purpose')}`} />
        </Field>

        <Field label="Country Planned To Visit / Visited" required span={HALF}
          error={fieldError('countries')}>
          <MultiSelect
            options={countryOptions}
            value={values.countries}
            onChange={(next) => onChange('countries', next)}
            placeholder="Select visited countries"
            disabled={disabled}
            ariaLabel="Country planned to visit or visited"
          />
        </Field>

        <Field label="Cities Planned To Visit / Visited" required span={HALF}
          counter={`${values.cities.length} / ${SCHEMA_LIMITS.cities}`}
          error={fieldError('cities')}>
          <input type="text" value={values.cities} disabled={disabled}
            maxLength={SCHEMA_LIMITS.cities}
            onChange={set('cities')} onBlur={blur('cities')}
            placeholder="Comma separated, e.g. Hamburg, Bremen"
            className={`module-form-input ${errorClass('cities')}`} />
        </Field>
      </Section>

      <Section title="Delegation">
        <div className={HALF}>
          <YesNoField
            label="Whether part of Ministerial Delegation?"
            name="ministerialDelegation"
            value={values.ministerialDelegation}
            onChange={(v) => onChange('ministerialDelegation', v)}
            disabled={disabled}
            error={fieldError('ministerialDelegation')}
          />
        </div>
      </Section>

      {showSanctioning && (
        <Section title="Sanctioning Details">
          <Field label="Sanctioning Authority" required span={HALF}
            error={fieldError('sanctioningAuthority')}>
            <input type="text" value={values.sanctioningAuthority} disabled={disabled}
              maxLength={SCHEMA_LIMITS.sanctionedAuthority}
              onChange={set('sanctioningAuthority')} onBlur={blur('sanctioningAuthority')}
              placeholder="e.g. Secretary (PSW)"
              className={`module-form-input ${errorClass('sanctioningAuthority')}`} />
          </Field>

          {sanctionOrderField && <div className={HALF}>{sanctionOrderField}</div>}
        </Section>
      )}

      {sections.competentAndFvms && (
        <Section title="Post-Visit Compliance">
          <div className={HALF}>
            <YesNoField
              label="Submitted to Competent Authority?"
              name="competentAuthority"
              value={values.competentAuthority}
              onChange={(v) => onChange('competentAuthority', v)}
              disabled={disabled}
              error={fieldError('competentAuthority')}
            />
          </div>
          <div className={HALF}>
            <YesNoField
              label="Report Uploaded to FVMS?"
              name="fvms"
              value={values.fvms}
              onChange={(v) => onChange('fvms', v)}
              disabled={disabled}
              error={fieldError('fvms')}
            />
          </div>
        </Section>
      )}

      {sections.notVisitedReason && (
        <Section title="Visit Outcome">
          <Field label="Reason for Not Visiting" required span={HALF}
            error={fieldError('notVisitedReason')}>
            <textarea value={values.notVisitedReason} rows={2} disabled={disabled}
              maxLength={SCHEMA_LIMITS.remarks}
              onChange={set('notVisitedReason')} onBlur={blur('notVisitedReason')}
              placeholder="Why the sanctioned visit did not take place"
              className={`module-form-textarea resize-y ${errorClass('notVisitedReason')}`} />
          </Field>
        </Section>
      )}
    </div>
  );
}

/** Yes / No radio pair. Stored as the bit values 1 and 0. */
export function YesNoField({ label, name, value, onChange, error, disabled = false, required = true }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center gap-2 min-h-[18px]">
        <label className="module-form-label truncate">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>
      <div className="flex items-center gap-6 h-[38px]">
        {[{ v: '1', l: 'Yes' }, { v: '0', l: 'No' }].map((opt) => (
          <label key={opt.v}
            className={`flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name={name}
              value={opt.v}
              checked={String(value) === opt.v}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="h-3.5 w-3.5 accent-[#0f417a] cursor-pointer"
            />
            <span>{opt.l}</span>
          </label>
        ))}
      </div>
      {error}
    </div>
  );
}
