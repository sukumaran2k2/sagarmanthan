import React from "react";
import { Upload, FileSpreadsheet, AlertCircle, FileCheck, ChevronDown, Download } from "lucide-react";
import Table from "./Table";
import CopyButton from "./CopyButton";

/**
 * Reusable Global Spreadsheet Upload & Preview Component
 * Standardized across E-Office, Attendance, and other governance modules.
 */
export default function ModuleUploadView({
  handleUploadSubmit,
  uploadFinancialYear,
  setUploadFinancialYear,
  uploadMonth,
  setUploadMonth,
  uploadWeek,
  setUploadWeek,
  selectedFile,
  handleFileSelect,
  resetFile,
  uploading,
  fileValidationError,
  previewRows,
  previewColDefs,
  accentColor = "#0f417a",
  themeClass = "eoffice-blue-grid",
  onDownloadSample,
  sampleFileName = "Sample Template",
}) {
  // Builds one plain-text summary shared by both Copy and Download, so a
  // person can paste the exact list of unmet conditions into an email or
  // notes while fixing their spreadsheet.
  const buildValidationErrorText = () => {
    if (!fileValidationError) return '';
    const fileLabel = selectedFile ? selectedFile.name : 'Uploaded file';
    const lines = [`Validation issues for: ${fileLabel}`, ''];
    if (Array.isArray(fileValidationError)) {
      fileValidationError.forEach((issue, idx) => {
        lines.push(`${idx + 1}. ${issue.field}: ${issue.message}`);
      });
    } else {
      lines.push(fileValidationError);
    }
    return lines.join('\n');
  };

  const handleCopyValidationErrors = () => {
    const text = buildValidationErrorText();
    if (text) navigator.clipboard.writeText(text);
  };

  const handleDownloadValidationErrors = () => {
    const text = buildValidationErrorText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileLabel = (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'upload');
    link.download = `${fileLabel}_validation_errors.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUploadSubmit} className="space-y-6 w-full">
        {/* Row 1: Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Financial Year */}
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Financial Year <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={uploadFinancialYear}
                onChange={(e) => setUploadFinancialYear(e.target.value)}
                className="w-full text-xs pl-4 pr-9 py-3 bg-slate-50/70 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer shadow-xs"
              >
                <option value="">--Select Financial Year--</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Month */}
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Month <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={uploadMonth}
                onChange={(e) => setUploadMonth(e.target.value)}
                className="w-full text-xs pl-4 pr-9 py-3 bg-slate-50/70 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer shadow-xs"
              >
                <option value="">--Select Month--</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Week */}
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Week <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={uploadWeek}
                onChange={(e) => setUploadWeek(e.target.value)}
                className="w-full text-xs pl-4 pr-9 py-3 bg-slate-50/70 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer shadow-xs"
              >
                <option value="">--Select Week--</option>
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: File Picker & Form Action Buttons */}
        <div className="pt-2 w-full">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Select Excel File To Upload: <span className="text-rose-500">*</span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="w-full sm:w-96 max-w-md">
              <label className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-all shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 truncate">
                  <FileSpreadsheet className="h-4 w-4 text-[#0f417a] flex-shrink-0" />
                  <span className="truncate">
                    {selectedFile
                      ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                      : "Choose .xlsx or .csv file"}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0f417a] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex-shrink-0 ml-2">
                  Browse
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx"
                  onChange={(e) => handleFileSelect(e.target.files[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {onDownloadSample && (
              <button
                type="button"
                onClick={onDownloadSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-[#0f417a] hover:bg-blue-50/60 hover:border-blue-200 transition-all cursor-pointer flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </button>
            )}

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto sm:ml-auto">
              <button
                type="button"
                onClick={resetFile}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer h-[42px] flex-1 sm:flex-none"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={uploading || !!fileValidationError || !selectedFile}
                style={{ backgroundColor: accentColor }}
                className="px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer h-[42px] flex-1 sm:flex-none"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Upload File</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Validation Alert */}
          {fileValidationError && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-start gap-2.5 animate-fade-in shadow-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-extrabold uppercase tracking-wide text-rose-800">
                    {Array.isArray(fileValidationError)
                      ? `Validation Failed -- ${fileValidationError.length} condition${fileValidationError.length > 1 ? 's' : ''} not met`
                      : 'Template Validation Failed'}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <CopyButton onCopy={handleCopyValidationErrors} color="#be123c" hoverBg="#fff1f2" />
                    <button
                      type="button"
                      onClick={handleDownloadValidationErrors}
                      style={{ color: '#be123c', borderColor: '#be123c33' }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer bg-transparent hover:bg-rose-100/60 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                {Array.isArray(fileValidationError) ? (
                  <ul className="mt-1.5 space-y-1">
                    {fileValidationError.map((issue, idx) => (
                      <li key={idx} className="text-[11px] font-semibold text-rose-600 flex gap-1.5">
                        <span className="text-rose-400">&bull;</span>
                        <span><span className="font-extrabold text-rose-700">{issue.field}:</span> {issue.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                    {fileValidationError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Row 3: File Data Preview Table */}
      {previewRows && previewRows.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 w-full animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                <FileCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                  File Data Preview ({previewRows.length} Rows)
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Verify spreadsheet contents below before confirming upload.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold self-start sm:self-auto">
              Ready for Upload
            </span>
          </div>

          <div className={`${themeClass}`}>
            <Table
              rowData={previewRows}
              columnDefs={previewColDefs}
              pagination={true}
              paginationPageSize={10}
              color={accentColor}
            />
          </div>
        </div>
      )}
    </div>
  );
}
