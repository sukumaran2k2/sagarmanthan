import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, X } from 'lucide-react';
import { getDocumentPreviewKind, triggerBrowserDownload } from '../utils/documentPreview';

export default function ProjectDocumentViewerModal({
  open = false,
  documentName = '',
  objectUrl = null,
  loading = false,
  error = '',
  onClose,
  onDownload,
}) {
  const previewKind = getDocumentPreviewKind(documentName);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handleDownload = () => {
    if (typeof onDownload === 'function') {
      onDownload();
      return;
    }
    if (objectUrl && documentName) {
      triggerBrowserDownload(objectUrl, documentName);
    }
  };

  const canDownload = Boolean(objectUrl || onDownload);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-5xl h-[min(90vh,880px)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={documentName ? `View ${documentName}` : 'View document'}
      >
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document preview</p>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate" title={documentName}>
              {documentName || 'Untitled document'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canDownload ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={loading || Boolean(error)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold transition disabled:opacity-50"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition"
              title="Close"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-[#0f417a]" />
              <p className="text-xs font-semibold">Loading preview…</p>
            </div>
          ) : error ? (
            <div className="max-w-sm text-center px-6 space-y-3">
              <FileText className="h-10 w-10 mx-auto text-rose-500" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Unable to preview</p>
              <p className="text-xs text-slate-500 font-medium">{error}</p>
              {canDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download file</span>
                </button>
              ) : null}
            </div>
          ) : !objectUrl ? (
            <p className="text-xs font-semibold text-slate-500">No preview available.</p>
          ) : previewKind === 'pdf' ? (
            <iframe
              title={documentName || 'PDF preview'}
              src={objectUrl}
              className="w-full h-full border-0 bg-white"
            />
          ) : previewKind === 'image' ? (
            <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
              <img
                src={objectUrl}
                alt={documentName || 'Image preview'}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="max-w-md text-center px-6 space-y-3">
              <FileText className="h-10 w-10 mx-auto text-[#0f417a]" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                In-browser preview is not available for this file type
              </p>
              <p className="text-xs text-slate-500 font-medium">
                PPTX and similar Office files need a desktop app. You can still download the file from here.
              </p>
              {canDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download file</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
