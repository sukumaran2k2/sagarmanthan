import { useRef } from 'react';
import { Upload, FileCheck, X, AlertCircle } from 'lucide-react';
import { ALLOWED_UPLOAD_LABEL, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '../utils/constants';

/**
 * File picker for a sanction order or tour report.
 *
 * Validates type and size in the browser because multer rejects an oversized upload with a
 * raw 500 that says nothing useful to the user.
 */
export default function DocumentUploadField({
  label,
  file,
  onSelect,
  existingFileName,
  onDownloadExisting,
  error,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ALLOWED_UPLOAD_TYPES.includes(picked.type)) {
      onSelect(null, 'Only PDF, JPEG and PNG files are allowed.');
      e.target.value = '';
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      onSelect(null, 'The file is larger than 2MB. Choose a smaller file.');
      e.target.value = '';
      return;
    }
    onSelect(picked, null);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onSelect(null, null);
  };

  return (
    <div className="space-y-1.5">
      {/* Same label row as VisitFormFields' Field, so the file input lines up with the inputs
          beside it in the grid. */}
      <div className="flex justify-between items-center gap-2 min-h-[18px]">
        <label className="module-form-label truncate">{label}</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          disabled={disabled}
          className="module-form-input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0f417a] file:text-white hover:file:bg-[#1e3a8a] file:cursor-pointer cursor-pointer"
        />
        {file && (
          <button type="button" onClick={clear} title="Remove the selected file"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-[10px] font-semibold text-slate-400">{ALLOWED_UPLOAD_LABEL}</p>

      {file && (
        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <Upload className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{file.name} will be uploaded on save.</span>
        </p>
      )}

      {!file && existingFileName && (
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
          <FileCheck className="h-3 w-3 flex-shrink-0 text-emerald-600" />
          <span className="truncate">Currently attached: </span>
          {onDownloadExisting ? (
            <button type="button" onClick={onDownloadExisting}
              className="underline text-blue-700 dark:text-blue-400 hover:text-blue-900 truncate cursor-pointer">
              {existingFileName}
            </button>
          ) : (
            <span className="truncate">{existingFileName}</span>
          )}
        </p>
      )}

      {error && (
        <p className="module-form-error-msg flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
