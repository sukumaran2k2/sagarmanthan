import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Upload, Calendar, Info } from 'lucide-react';
import { INDIAN_STATES } from './FormBuilderStudio';

// onSubmitResponse(action, values) is optional. Without it the modal is a preview that
// saves nothing; with it, "Save Draft" / "Submit Form" call it (action 'draft' | 'submit')
// and it should resolve to a success message or throw.
export default function FormPreviewModal({ formName, formDescription, fields, onClose, onSubmitResponse, initialValues }) {
  const isLive = typeof onSubmitResponse === 'function';
  const [formData, setFormData] = useState(initialValues || {});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const saveResponse = async (action) => {
    setSaving(true);
    setSaveError(null);
    try {
      const message = await onSubmitResponse(action, formData);
      setSuccessMessage(message || (action === 'draft' ? 'Draft saved' : 'Form submitted'));
      setSubmitted(true);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Could not save your response');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiSelectToggle = (fieldId, option) => {
    const current = formData[fieldId] || [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    setFormData(prev => ({ ...prev, [fieldId]: updated }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLive) {
      saveResponse('submit');
      return;
    }
    setSubmitted(true);
  };

  useEffect(() => {
    // Prevent background page from scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div 
        className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="pr-4">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">{isLive ? 'Fill Form' : 'Live Form Preview'}</span>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{formName}</h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xl leading-relaxed">
              {formDescription || 'Please complete all required fields below.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {submitted ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="text-center py-10 space-y-3">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {isLive ? successMessage : 'Preview Form Submitted Successfully!'}
              </h3>
              {!isLive && (
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This is a simulation preview. All fields and validation criteria passed.
                </p>
              )}
              <button
                onClick={() => (isLive ? onClose() : setSubmitted(false))}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                {isLive ? 'Close' : 'Test Again'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <form id="preview-form" onSubmit={handleSubmit} className="space-y-4">

              {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center">
                    <label className="block text-xs font-bold text-slate-700">
                      {field.inputLabel}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="ml-2 text-[10px] text-slate-400 font-mono">({field.inputType})</span>
                    </label>
                    {field.hint && (
                      <div className="group/hint relative flex items-center ml-2">
                        <Info className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/hint:block w-max max-w-xs bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg z-10 whitespace-normal text-center">
                          {field.hint}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  {field.inputType === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Email */}
                  {field.inputType === 'email' && (
                    <input
                      type="email"
                      required={field.required}
                      placeholder={field.placeholder || 'officer@gov.in'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Number (Integer) */}
                  {field.inputType === 'number' && (
                    <input
                      type="number"
                      step="1"
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Float (Decimal) */}
                  {field.inputType === 'float' && (
                    <input
                      type="number"
                      step="0.01"
                      required={field.required}
                      placeholder={field.placeholder || '0.00'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* phone */}
                  {field.inputType === 'phone' && (
                    <input
                      type="tel"
                      required={field.required}
                      placeholder={field.placeholder || '+91 98765 43210'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Password */}
                  {field.inputType === 'password' && (
                    <input
                      type="password"
                      required={field.required}
                      placeholder={field.placeholder || '••••••••'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Date */}
                  {field.inputType === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Textarea */}
                  {field.inputType === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* Dropdown */}
                  {field.inputType === 'dropdown' && (
                    <select
                      required={field.required}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select Option</option>
                      {field.options.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Multiple Select */}
                  {field.inputType === 'multiple-select' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">Select all applicable:</span>
                      {field.options.map((opt, idx) => {
                        const isChecked = (formData[field.id] || []).includes(opt);
                        return (
                          <label key={idx} className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMultiSelectToggle(field.id, opt)}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* State */}
                  {field.inputType === 'state' && (
                    <select
                      required={field.required}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((state, idx) => (
                        <option key={idx} value={state}>{state}</option>
                      ))}
                    </select>
                  )}

                  {/* District */}
                  {field.inputType === 'district' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || 'Enter District Name'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* MP Constituency */}
                  {field.inputType === 'MP-Constituency' && (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || 'Enter Lok Sabha Constituency'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  {/* File Upload */}
                  {field.inputType === 'file' && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-500 font-medium">Click to select attachment</span>
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.inputType === 'checkbox' && (
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        required={field.required}
                        checked={!!formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-xs text-slate-700">{field.placeholder || 'Confirm declaration'}</span>
                    </div>
                  )}

                  {/* Radio Button */}
                  {field.inputType === 'radio' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      {field.options.map((opt, idx) => (
                        <label key={idx} className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`radio_${field.id}`}
                            required={field.required}
                            value={opt}
                            checked={formData[field.id] === opt}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </form>
          </div>
          
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            {saveError && (
              <span className="mr-auto text-xs font-semibold text-rose-600">{saveError}</span>
            )}
            {isLive && (
              <button
                type="button"
                disabled={saving}
                onClick={() => saveResponse('draft')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save Draft
              </button>
            )}
            <button
              type="submit"
              form="preview-form"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLive ? (saving ? 'Saving...' : 'Submit Form') : 'Submit Form (Preview)'}
            </button>
          </div>
        </>
        )}
      </div>
    </div>,
    document.body
  );
}
