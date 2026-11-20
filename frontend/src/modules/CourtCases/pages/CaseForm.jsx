import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { FieldRenderer } from "../formEngine/fields";
import "./CourtCases.css";

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

const isEmpty = (f, v) => {
  if (f.type === "list") return !v.some((x) => String(x).trim());
  if (Array.isArray(v)) return v.length === 0;
  return v === "" || v === null || v === undefined;
};

export default function CaseForm({
  schema, initialValues, lockedSteps = [], dynamicOptions, onFieldChange, onSaveStep, onValidationError, onComplete,
}) {
  const navigate = useNavigate(); 
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => ({ ...buildInitialValues(schema), ...initialValues }));
  const [errors, setErrors] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialValues) setValues((p) => ({ ...p, ...initialValues }));
  }, [initialValues]);

  const current = schema.steps[step];
  const isLast = step === schema.steps.length - 1;
  const isLocked = (i) => lockedSteps.includes(schema.steps[i]?.key);
  const visible = (f) => !f.showIf || f.showIf(values);

  const showError = (msg) => {
    if (onValidationError) {
      setErrors("");
      onValidationError(msg);
    } else {
      setErrors(msg);
    }
  };

  const setValue = (name, val) => {
    setValues((p) => ({ ...p, [name]: val }));
    onFieldChange?.(name, val);
  };

  const goTo = (i) => {
    if (i < 0 || i >= schema.steps.length || isLocked(i)) return;
    setErrors("");
    setStep(i);
  };

  const submit = async () => {
    const missing = current.fields
      .filter((f) => visible(f) && f.required && isEmpty(f, values[f.name]))
      .map((f) => f.label);
    if (missing.length) {
      showError(`Please fill mandatory fields: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    setErrors("");
    try {
      const res = await onSaveStep(current.key, values);
      if (res?.error) showError(res.error);
      else if (res?.ok && !isLast) {
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (res?.ok && isLast) {
        onComplete?.(); 
      }
    } catch (e) {
      showError(e?.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
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
              <button type="button"
                className={`cc-step ${i === step ? "active" : ""} ${i < step ? "done" : ""} ${isLocked(i) ? "locked" : ""}`}
                onClick={() => goTo(i)}>
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
            <FieldRenderer key={f.name} f={f} options={dynamicOptions?.[f.name]}
              values={values} setValue={setValue} />
          ))}
        </div>

        {errors && <div className="cc-error">{errors}</div>}

        <div className="cc-footer">
          <button type="button" className="cc-btn cancel" onClick={() => navigate(-1)}>Cancel</button>

          <div className="cc-actions">
            {step > 0 && (
              <button type="button" className="cc-btn cancel" onClick={() => goTo(step - 1)}>← Previous</button>
            )}
            <button type="button" className="cc-btn next" disabled={saving} onClick={submit}>
              {saving
                ? "Saving..."
                : isLast
                  ? "Submit"
                  : `Save & Next Stage (${schema.steps[step + 1].label})`}
              {!isLast && !saving && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}