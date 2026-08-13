import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import YesNoDateField from '../components/YesNoDateField';
import {
  STAGE_FIELDS,
  buildNotePayload,
  computeUnlockedStages,
  countWords,
  emptyForm,
} from '../utils/stageHelpers';
import {
  createCabinetNote,
  downloadNoteDocument,
  fetchNoteDocuments,
  updateCabinetNote,
  uploadNoteDocuments,
} from '../api';
import { getCurrentUserId } from '../../../utils/authSession';

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer dark:[color-scheme:dark]`;

export default function NoteForm({
  wings = [],
  divisions = [],
  initialForm = null,
  readOnly = false,
  onBack,
  onSuccess,
  notify,
}) {
  const isEdit = !!initialForm?.mopswCabinetID;
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [noteDocs, setNoteDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    setForm(initialForm ? { ...emptyForm(), ...initialForm } : emptyForm());
    setSelectedFiles([]);

    if (initialForm?.mopswCabinetID) {
      setLoadingDocs(true);
      fetchNoteDocuments(initialForm.mopswCabinetID)
        .then((res) => setNoteDocs(Array.isArray(res.data) ? res.data : []))
        .catch(() => setNoteDocs([]))
        .finally(() => setLoadingDocs(false));
    } else {
      setNoteDocs([]);
    }
  }, [initialForm]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredDivisions = useMemo(() => {
    if (!form.wing) return [];
    return divisions.filter((d) => String(d.wing_id) === String(form.wing));
  }, [divisions, form.wing]);

  const unlocked = useMemo(
    () => computeUnlockedStages(form, isEdit),
    [form, isEdit]
  );

  const wordCount = countWords(form.remarks);

  const handleStageChange = (stage, yesNo) => {
    setForm((prev) => {
      const next = { ...prev, [stage.key]: yesNo };
      if (yesNo !== 'Yes') {
        next[stage.dateKey] = '';
        next[stage.remarkKey] = '';
        // Clear subsequent stages when clearing earlier ones
        const idx = STAGE_FIELDS.findIndex((s) => s.key === stage.key);
        for (let i = idx + 1; i < STAGE_FIELDS.length; i++) {
          const s = STAGE_FIELDS[i];
          next[s.key] = '';
          next[s.dateKey] = '';
          next[s.remarkKey] = '';
        }
      }
      return next;
    });
  };

  const prevDateFor = (stageIndex) => {
    for (let i = stageIndex - 1; i >= 0; i--) {
      const d = form[STAGE_FIELDS[i].dateKey];
      if (d) return d;
    }
    return undefined;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      setSelectedFiles([]);
      return;
    }

    const valid = [];
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        notify?.('Invalid file type. Only PDF files are allowed.', 'error');
        e.target.value = '';
        setSelectedFiles([]);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        notify?.('File size exceeds 10 MB. Please choose a smaller file.', 'error');
        e.target.value = '';
        setSelectedFiles([]);
        return;
      }
      valid.push(file);
    }
    setSelectedFiles(valid);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    if (!form.subject?.trim() || !form.wing || !form.division) {
      notify?.('Please fill subject, wing, and division.', 'error');
      return;
    }
    if (wordCount > 250) {
      notify?.('Remarks cannot exceed 250 words.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildNotePayload(form, getCurrentUserId());
      let notesId = form.mopswCabinetID;

      if (isEdit) {
        await updateCabinetNote(payload);
      } else {
        const res = await createCabinetNote(payload);
        notesId = res.data?.cabinet_notes_mopsw_id;
      }

      if (selectedFiles.length && notesId) {
        const fd = new FormData();
        selectedFiles.forEach((f) => fd.append('files[]', f));
        fd.append('cabinetNotesMopswID', notesId);
        await uploadNoteDocuments(fd);
      }

      notify?.(
        isEdit ? 'Cabinet note updated successfully.' : 'Cabinet note created successfully.',
        'success'
      );
      onSuccess?.();
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to save cabinet note.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in"
    >
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {readOnly
              ? 'View Cabinet Notes-MoPSW (Read-only)'
              : isEdit
                ? 'Update Cabinet Notes-MoPSW'
                : 'Add Cabinet Notes-MoPSW'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className={labelClass}>
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass}
              value={form.subject}
              disabled={readOnly}
              onChange={(e) => setField('subject', e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Wing <span className="text-rose-500">*</span>
              </label>
              <select
                className={selectClass}
                value={form.wing}
                disabled={readOnly}
                onChange={(e) => {
                  setField('wing', e.target.value);
                  setField('division', '');
                }}
              >
                <option value="">Select Wing</option>
                {wings.map((w) => (
                  <option key={w.wing_id} value={w.wing_id}>
                    {w.wing_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                Division <span className="text-rose-500">*</span>
              </label>
              <select
                className={selectClass}
                value={form.division}
                disabled={readOnly || !form.wing}
                onChange={(e) => setField('division', e.target.value)}
              >
                <option value="">Select Division</option>
                {filteredDivisions.map((d) => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.division_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>
              Remarks{' '}
              <span className="normal-case font-semibold text-slate-400">
                ({wordCount}/250 words)
              </span>
            </label>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              value={form.remarks}
              disabled={readOnly}
              onChange={(e) => setField('remarks', e.target.value)}
            />
            {wordCount > 250 && (
              <p className="text-[11px] text-rose-600 font-semibold">
                Remarks cannot exceed 250 words.
              </p>
            )}
          </div>

          {!readOnly && (
            <div className="space-y-1.5 max-w-sm">
              <label className={labelClass}>Cabinet Note Document</label>
              <div className="flex items-center justify-center border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-center space-y-1 pointer-events-none">
                  <Upload className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="text-[11px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wide">
                    Upload PDF file
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold">
                    (Only PDF under 10 MB is allowed)
                  </p>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-0.5 pt-1">
                      {selectedFiles.map((file) => (
                        <p
                          key={file.name}
                          className="text-[11px] font-black text-emerald-600 truncate max-w-[240px] mx-auto"
                          title={file.name}
                        >
                          Selected: {file.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(loadingDocs || noteDocs.length > 0) && (
            <div className="space-y-1.5 max-w-sm">
              <p className={labelClass}>Uploaded Documents</p>
              {loadingDocs ? (
                <p className="text-xs text-slate-500 font-semibold">Loading…</p>
              ) : noteDocs.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold">No documents uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {noteDocs.map((doc) => (
                    <li key={doc.cabinet_notes_mopsw_document} className="text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          downloadNoteDocument(
                            form.mopswCabinetID,
                            doc.cabinet_notes_mopsw_document
                          ).catch(() => notify?.('Download failed.', 'error'))
                        }
                        className="inline-flex items-center gap-1 font-bold text-[#0f417a] dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
                      >
                        <span>View current document:</span>
                        <span
                          className="text-slate-600 dark:text-slate-450 font-semibold truncate max-w-[200px]"
                          title={doc.cabinet_notes_mopsw_document}
                        >
                          {doc.cabinet_notes_mopsw_document}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
          <p className={`${labelClass} mb-3 sticky top-0 bg-white dark:bg-slate-900 py-1 z-10`}>
            Stage progression
          </p>
          {STAGE_FIELDS.map((stage, index) => (
            <div
              key={stage.key}
              className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 last:border-0"
            >
              <YesNoDateField
                label={`${stage.id}. ${stage.label}`}
                name={stage.key}
                value={form[stage.key]}
                date={form[stage.dateKey]}
                disabled={!unlocked[stage.key]}
                readOnly={readOnly}
                minDate={prevDateFor(index)}
                maxDate={todayStr}
                onChange={(v) => handleStageChange(stage, v)}
                onDateChange={(d) => setField(stage.dateKey, d)}
              />
              {form[stage.key] === 'Yes' && (
                <div className="mt-2 space-y-1.5">
                  <label className={labelClass}>Stage remarks</label>
                  <input
                    className={inputClass}
                    value={form[stage.remarkKey] || ''}
                    disabled={readOnly || !unlocked[stage.key]}
                    onChange={(e) => setField(stage.remarkKey, e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || wordCount > 250}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0f417a] hover:bg-[#1d5594] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Save className="h-3.5 w-3.5" />
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
          </button>
        </div>
      )}
    </form>
  );
}
