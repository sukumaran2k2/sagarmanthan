import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";

export const normOpt = (o) => (typeof o === "string" ? { value: o, label: o } : o);
const FILE_BASE = "";
/* normalise + drop duplicate values (duplicate values caused the React "same key" warnings) */
export const uniqOpts = (list = []) => {
  const seen = new Set();
  return list.map(normOpt).filter((o) => {
    if (!o) return false;
    const k = String(o.value);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export function Input({ f, options, value, onChange, compact }) {
  const common = {
    className: "cc-input",
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
  };
  switch (f.type) {
    case "textarea":
      return <textarea {...common} rows={compact ? 2 : 4} maxLength={f.maxLength} />;
    case "select":
      return (
        <select {...common}>
          <option value="">-- Select --</option>
          {uniqOpts(options ?? f.options ?? []).map((o, i) => (
            <option key={`${o.value}-${i}`} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case "number":
      return <input {...common} type="number" placeholder={`Enter ${f.label}`} />;
    case "date":
      return <input {...common} type="date" />;
    default:
      return <input {...common} type="text" placeholder={compact ? f.label : `Enter ${f.label}`} />;
  }
}

function MultiSelect({ options, value, onChange, placeholder = "--Select--" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const opts = uniqOpts(options);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const labelOf = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;

  return (
    <div className={`cc-ms ${open ? "open" : ""}`} ref={ref}>
      <div className="cc-ms-trigger" role="button" tabIndex={0} onClick={() => setOpen((o) => !o)}>
        {value.length === 0 ? (
          <span className="cc-ms-placeholder">{placeholder}</span>
        ) : (
          <div className="cc-ms-tags">
            {value.map((v, i) => (
              <span key={`${v}-${i}`} className="cc-ms-tag">
                {labelOf(v)}
                <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown size={16} className="cc-ms-arrow" />
      </div>

      {open && (
        <div className="cc-ms-menu">
          {opts.length === 0 && <div className="cc-ms-placeholder" style={{ padding: 10 }}>No options</div>}
          {opts.map((o, i) => {
            const on = value.includes(o.value);
            return (
              <button type="button" key={`${o.value}-${i}`} className={`cc-ms-item ${on ? "on" : ""}`} onClick={() => toggle(o.value)}>
                <span className="cc-ms-check">{on && <Check size={12} strokeWidth={3} />}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableField({ f, rows, onChange }) {
  const setCell = (i, name, val) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [name]: val } : r)));

  return (
    <div className="cc-table-wrap">
      <table className="cc-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>SI No</th>
            {f.columns.map((c) => <th key={c.name}>{c.label}</th>)}
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="center">{i + 1}</td>
              {f.columns.map((c) => (
                <td key={c.name}>
                  <Input f={c} compact value={row[c.name]} onChange={(val) => setCell(i, c.name, val)} />
                </td>
              ))}
              <td className="center">
                <button type="button" className="cc-icon-btn" title="Add row" onClick={() => onChange([...rows, {}])}>＋</button>
                {rows.length > 1 && (
                  <button type="button" className="cc-icon-btn danger" title="Remove row"
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldRenderer({ f, options, values, setValue }) {
  const value = values[f.name];
  let control;

  switch (f.type) {
    case "radio":
      control = (
        <div className="cc-radio-group">
          {uniqOpts(f.options).map((o) => (
            <label key={o.value} className="cc-radio">
              <input type="radio" name={f.name} checked={value === o.value}
                onChange={() => setValue(f.name, o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
      break;

    case "chips":
      control = (
        <>
          <MultiSelect
            options={options ?? f.options ?? []}
            value={value}
            onChange={(v) => setValue(f.name, v)}
            placeholder="--Select Dept / Division--"
          />
          {f.hint && <div className="cc-hint" style={{ marginTop: 6 }}>{f.hint}</div>}
        </>
      );
      break;

    case "list":
      control = (
        <div>
          {value.map((item, i) => (
            <div key={i} className="cc-list-row">
              <span className="cc-list-no">{i + 1}</span>
              <input className="cc-input" value={item} placeholder={`Enter ${f.label}`}
                onChange={(e) => setValue(f.name, value.map((x, idx) => (idx === i ? e.target.value : x)))} />
              <button type="button" className="cc-icon-btn" onClick={() => setValue(f.name, [...value, ""])}>＋</button>
              {value.length > 1 && (
                <button type="button" className="cc-icon-btn danger"
                  onClick={() => setValue(f.name, value.filter((_, idx) => idx !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>
      );
      break;

    case "table":
      control = <TableField f={f} rows={value} onChange={(rows) => setValue(f.name, rows)} />;
      break;

    case "file": {
  const existing = f.existingKey ? values[f.existingKey] : "";
  const href = FILE_BASE && existing && f.existingPath
    ? `${FILE_BASE}/${f.existingPath}/${encodeURIComponent(existing)}` : "";
  control = (
    <>
      {existing && (
        <div className="cc-hint" style={{ marginBottom: 6 }}>
          Current file:{" "}
          {href ? <a href={href} target="_blank" rel="noreferrer">{existing}</a> : <b>{existing}</b>}
          {" "}(choose a new PDF only if you want to replace it)
        </div>
      )}
      <input type="file" accept=".pdf" className="cc-input"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file && (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024)) {
            alert("Only PDF files up to 20MB are allowed.");
            e.target.value = "";
            return;
          }
          setValue(f.name, file || "");
        }} />
      <div className="cc-hint">Allows only PDF files (Maximum file size is 20MB)</div>
    </>
  );
  break;
}

    default:
      control = <Input f={f} options={options} value={value} onChange={(val) => setValue(f.name, val)} />;
  }

  return (
    <div className={`cc-col span-${f.span || 12}`}>
      <label className="cc-label">
        {f.label} {f.required && <span className="req">*</span>}
      </label>
      {control}
      {f.maxLength && <div className="cc-hint right">{(value || "").length}/{f.maxLength} characters</div>}
    </div>
  );
}
