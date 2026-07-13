import React from 'react';

export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  options = []
}) {
  const baseInputClasses = "w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 placeholder-slate-400 transition-all duration-200 hover:border-slate-350";
  
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`${baseInputClasses} resize-none`}
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={onChange}
          required={required}
          className={`${baseInputClasses} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat pr-10`}
        >
          <option value="">--Select {label}--</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={baseInputClasses}
        />
      )}
    </div>
  );
}
