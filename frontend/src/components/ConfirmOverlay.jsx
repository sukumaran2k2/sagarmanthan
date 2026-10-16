import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmOverlay({ 
  isOpen, 
  title, 
  description, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  icon: Icon,
  iconColor = 'text-red-600',
  iconBgColor = 'bg-red-100',
  maxWidth = 'max-w-md',
  children
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full ${maxWidth} border border-slate-200 animate-scale-up my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {Icon && (
          <div className={`w-12 h-12 ${iconBgColor} ${iconColor} rounded-full flex items-center justify-center mb-4 mx-auto`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">{title}</h3>
        <div className="text-sm text-slate-500 mb-6 text-center">
          {description}
        </div>
        
        {children && (
          <div className="mb-6 w-full text-left">
            {children}
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            {cancelText}
          </button>
          
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer bg-red-600 hover:bg-red-700 text-white"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
