import React, { useState } from 'react';
import { X, CheckCircle, Upload, Calendar } from 'lucide-react';
import { INDIAN_STATES } from './FormBuilderStudio';

export default function FormPreviewModal({ formName, formDescription, fields, onClose }) {
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Live Form Preview</span>
            <h2 className="text-lg font-bold text-slate-800">{formName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Preview Form Submitted Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This is a simulation preview. All fields and validation criteria passed.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Test Again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                {formDescription || 'Please complete all required fields below.'}
              </p>

              {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {field.inputLabel}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="ml-2 text-[10px] text-slate-400 font-mono">({field.inputType})</span>
                  </label>

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

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-650 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Submit Form (Preview)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
