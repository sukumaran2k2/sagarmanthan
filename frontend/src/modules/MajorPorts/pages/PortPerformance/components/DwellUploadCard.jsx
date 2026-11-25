import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileCheck, FileSpreadsheet, ListChecks, Loader2, RotateCcw, Upload } from 'lucide-react';
import ConfirmModal from '../../../../../components/ConfirmModal';
import CopyButton from '../../../../../components/CopyButton';
import { downloadDwellTimeTemplate, uploadDwellTimeSheet } from '../../../api';
import { useNotifier, getErrorMessage } from '../../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../../toastMessages';
import { FY_MONTHS, buildFinancialYearOptions, currentFinancialYear, isFuturePeriod } from '../../Traffic/trafficConstants';
import { describePeriod, formatDate, formatQuantity, monthLabel } from '../../Traffic/trafficFormat';
import {
  DWELL_FILE_EXTENSIONS,
  DWELL_UPLOAD_RULES,
  DWELL_VALUE_COLUMNS,
  DWELL_VALUE_GROUPS,
  checkDwellFile,
} from '../dwellTimeConfig';

const FY_OPTIONS = buildFinancialYearOptions();

/** "Row 5 · Monthly Import: Chennai Port Authority: Monthly Import is not a number." */
const problemText = (p) => [p.row ? `Row ${p.row}` : null, p.column].filter(Boolean).join(' · ');

/**
 * Ministry upload of one month's dwell time sheet.
 * Choosing a file (or changing the month) checks it on the server straight away
 * (mode=preview, nothing saved); Save sends the same file again, which is checked again
 * and saved. A month uploaded before is replaced only after confirming.
 */
export default function DwellUploadCard({ onUploaded, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const [fiscalYear, setFiscalYear] = useState(currentFinancialYear());
  const [month, setMonth] = useState('');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileError, setFileError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState([]);
  const [preview, setPreview] = useState(null); // { rows, existing } for the checked file and period
  const [confirmReplace, setConfirmReplace] = useState(false);
  const checkSeq = useRef(0);

  const monthOptions = useMemo(
    () => FY_MONTHS.filter((m) => !isFuturePeriod(fiscalYear, m.value)),
    [fiscalYear]
  );
  const period = describePeriod(fiscalYear, month);
  const hasPeriod = Boolean(fiscalYear && month);

  /**
   * Checks the file against the period on the server (nothing is saved) as soon as both are
   * chosen; called again whenever either changes. Only the newest check's answer is shown.
   */
  const runCheck = (nextFile, fy, m) => {
    const seq = checkSeq.current + 1;
    checkSeq.current = seq;
    setProblems([]);
    setPreview(null);
    if (!nextFile || !fy || !m) {
      setChecking(false);
      return;
    }
    setChecking(true);
    uploadDwellTimeSheet({ file: nextFile, fiscalYear: fy, month: m, mode: 'preview' })
      .then(({ data }) => {
        if (seq !== checkSeq.current) return;
        setPreview({ rows: data.rows || [], existing: data.existing });
        notify(PORT_PERFORMANCE_TOASTS.dwellChecked((data.rows || []).length));
      })
      .catch((err) => {
        if (seq !== checkSeq.current) return;
        const listed = err?.response?.data?.errors;
        if (Array.isArray(listed) && listed.length) {
          setProblems(listed);
          notify(PORT_PERFORMANCE_TOASTS.dwellProblems(listed.length));
        } else {
          const reason = getErrorMessage(err);
          setProblems([{ row: null, column: null, message: reason || 'The file could not be checked.' }]);
          notify(PORT_PERFORMANCE_TOASTS.dwellUploadFailed(reason));
        }
      })
      .finally(() => {
        if (seq === checkSeq.current) setChecking(false);
      });
  };

  const handleFileChosen = (chosen) => {
    const error = chosen ? checkDwellFile(chosen) : null;
    setFileError(error);
    if (error) {
      setFile(null);
      setFileInputKey((k) => k + 1);
      runCheck(null);
      notify(PORT_PERFORMANCE_TOASTS.dwellFileRejected(error));
      return;
    }
    setFile(chosen);
    runCheck(chosen, fiscalYear, month);
  };

  const reset = () => {
    setFile(null);
    setFileError(null);
    runCheck(null);
    setFileInputKey((k) => k + 1);
  };

  const handleTemplate = async () => {
    try {
      const res = await downloadDwellTimeTemplate({ fiscalYear, month });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dwell_Time_${monthLabel(month)}_${fiscalYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(PORT_PERFORMANCE_TOASTS.dwellTemplateFailed(getErrorMessage(err)));
    }
  };

  const save = async (replace) => {
    setConfirmReplace(false);
    setSaving(true);
    try {
      await uploadDwellTimeSheet({ file, fiscalYear, month, mode: 'save', replace });
      notify(PORT_PERFORMANCE_TOASTS.dwellUploaded(period, replace));
      reset();
      setMonth('');
      onUploaded?.();
    } catch (err) {
      const listed = err?.response?.data?.errors;
      if (Array.isArray(listed) && listed.length) {
        setPreview(null);
        setProblems(listed);
        notify(PORT_PERFORMANCE_TOASTS.dwellProblems(listed.length));
      } else if (err?.response?.status === 409) {
        setConfirmReplace(true);
      } else {
        notify(PORT_PERFORMANCE_TOASTS.dwellUploadFailed(getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => (preview?.existing ? setConfirmReplace(true) : save(false));

  const problemsText = () => [
    `Dwell time upload problems: ${file?.name || ''} (${period.monthLabel} ${fiscalYear})`,
    '',
    ...problems.map((p, i) => `${i + 1}. ${[problemText(p), p.message].filter(Boolean).join(': ')}`),
  ].join('\n');

  const busy = checking || saving;

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="module-form-banner-title">Upload Dwell Time</h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · One Excel sheet per month for every major port</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <details open className="rounded-2xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3">
          <summary className="flex items-center gap-2 cursor-pointer text-xs font-black uppercase tracking-wide text-[#0f417a] dark:text-blue-300">
            <ListChecks className="h-4 w-4" />
            Upload checks ({DWELL_UPLOAD_RULES.length})
          </summary>
          <ol className="mt-2 ml-5 list-decimal space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {DWELL_UPLOAD_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </details>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
          <div>
            <label htmlFor="dwell-fy" className="module-form-label">
              Financial Year <span className="text-red-500">*</span>
            </label>
            <select
              id="dwell-fy"
              className="module-form-select cursor-pointer"
              value={fiscalYear}
              disabled={busy}
              onChange={(e) => {
                setFiscalYear(e.target.value);
                setMonth('');
                runCheck(null);
              }}
            >
              <option value="">Select Financial Year</option>
              {FY_OPTIONS.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dwell-month" className="module-form-label">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              id="dwell-month"
              className="module-form-select cursor-pointer"
              value={month}
              disabled={!fiscalYear || busy}
              onChange={(e) => {
                setMonth(e.target.value);
                runCheck(file, fiscalYear, e.target.value);
              }}
            >
              <option value="">Select Month</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleTemplate}
              disabled={!hasPeriod || busy}
              title={hasPeriod ? 'Blank sheet for the selected month' : 'Select the financial year and month first'}
              className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 border border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </button>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="dwell-file" className="module-form-label">
              Excel File <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className={`flex flex-1 items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 transition ${
                fileError ? 'border-rose-300' : 'border-slate-200 dark:border-slate-700'
              } ${!hasPeriod || busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <FileSpreadsheet className="h-4 w-4 text-[#0f417a] dark:text-blue-400 flex-shrink-0" />
                  <span className="truncate">
                    {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : `Choose the ${DWELL_FILE_EXTENSIONS.join(' / ')} file`}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-[#0f417a] dark:text-blue-300 bg-blue-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-blue-100 dark:border-slate-700 flex-shrink-0">
                  Browse
                </span>
                <input
                  key={fileInputKey}
                  id="dwell-file"
                  type="file"
                  accept={DWELL_FILE_EXTENSIONS.join(',')}
                  className="hidden"
                  disabled={!hasPeriod || busy}
                  onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                />
              </label>
              <button
                type="button"
                onClick={reset}
                disabled={busy || (!file && !fileError && !problems.length)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            {!hasPeriod && (
              <p className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Select the financial year and month first; the sheet is checked against them.
              </p>
            )}
            {fileError && <p className="mt-1.5 text-[11px] font-bold text-rose-600">{fileError}</p>}
            {checking && (
              <p role="status" className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the file…
              </p>
            )}
          </div>
        </div>

        {problems.length > 0 && (
          <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="font-extrabold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                  {problems.length} problem{problems.length === 1 ? '' : 's'} found · nothing was saved
                </p>
                <CopyButton onCopy={() => navigator.clipboard?.writeText(problemsText())} color="#be123c" hoverBg="#fff1f2" />
              </div>
              <ul className="mt-2 space-y-1">
                {problems.map((p, i) => (
                  <li key={`${p.row}-${p.column}-${i}`} className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex gap-1.5">
                    <span className="text-rose-400">&bull;</span>
                    <span>
                      {problemText(p) ? <span className="font-extrabold">{problemText(p)}: </span> : null}
                      {p.message}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] font-semibold text-rose-700/80 dark:text-rose-300/80">
                Correct the file and choose it again.
              </p>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <FileCheck className="h-4 w-4" />
                All checks passed · {preview.rows.length} rows for {period.monthLabel} {fiscalYear}
              </p>
              <span className="text-[11px] font-semibold text-slate-500">Values in hours · "-" = no data</span>
            </div>
            {preview.existing && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                {period.monthLabel} {fiscalYear} was uploaded before
                {preview.existing.uploaded_date ? ` on ${formatDate(preview.existing.uploaded_date)}` : ''}
                {preview.existing.uploaded_by_name ? ` by ${preview.existing.uploaded_by_name}` : ''}.
                {' '}Saving replaces those values.
              </p>
            )}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold">Row</th>
                    <th rowSpan={2} className="px-3 py-2 text-left font-bold">Port</th>
                    {DWELL_VALUE_GROUPS.map((g) => (
                      <th key={g.title} colSpan={g.columns.length} className="px-3 py-1.5 text-center font-bold border-l border-slate-200 dark:border-slate-800">{g.title}</th>
                    ))}
                  </tr>
                  <tr>
                    {DWELL_VALUE_COLUMNS.map((c, i) => (
                      <th key={c.key} className={`px-3 py-1.5 text-center font-bold ${i % 3 === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.rowKey} className={`border-t border-slate-100 dark:border-slate-800 ${r.organisationId ? '' : 'font-extrabold bg-slate-50/70 dark:bg-slate-900/60'}`}>
                      <td className="px-3 py-1.5 text-center text-slate-400">{r.sheetRow}</td>
                      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.label}</td>
                      {DWELL_VALUE_COLUMNS.map((c, i) => (
                        <td key={c.key} className={`px-3 py-1.5 text-center tabular-nums text-slate-700 dark:text-slate-200 ${i % 3 === 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''}`}>
                          {formatQuantity(r.values[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : preview.existing ? <Upload className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Saving…' : preview.existing ? 'Replace Dwell Time' : 'Save Dwell Time'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmReplace}
        onClose={() => !saving && setConfirmReplace(false)}
        onConfirm={() => save(true)}
        loading={saving}
        loadingText="Replacing..."
        title="Replace Uploaded Dwell Time"
        confirmText="Replace"
        message={`Dwell time for ${period.monthLabel} ${fiscalYear} was uploaded before. Replace it with the values of this file? The earlier values are kept in the change log.`}
      />
    </div>
  );
}
