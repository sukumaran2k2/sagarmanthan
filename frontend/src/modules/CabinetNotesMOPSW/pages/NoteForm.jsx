import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import StageDateField from '../components/StageDateField';
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

const EMPTY_FORM = emptyForm();

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer dark:[color-scheme:dark]`;
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40';

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [noteDocs, setNoteDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    setForm(initialForm ? { ...EMPTY_FORM, ...initialForm } : { ...EMPTY_FORM });
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

  const setStageDate = (stage, value) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [stage.dateKey]: value,
        [stage.remarkKey]: value ? prev[stage.remarkKey] : '',
      };
      if (!value) {
        const idx = STAGE_FIELDS.findIndex((s) => s.key === stage.key);
        for (let i = idx + 1; i < STAGE_FIELDS.length; i++) {
          const s = STAGE_FIELDS[i];
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

  const formTitle = readOnly
    ? 'View Cabinet Notes-MoPSW'
    : isEdit
      ? 'Update Cabinet Notes-MoPSW'
      : 'Add Cabinet Notes-MoPSW';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {formTitle}
          </h3>
          <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.45fr)] gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Note Information
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Concerned Wing<span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass}
                  value={form.wing}
                  disabled={readOnly}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, wing: e.target.value, division: '' }));
                  }}
                >
                  <option value="" className="dark:bg-slate-955 dark:text-slate-300">
                    Select Wing
                  </option>
                  {wings.map((w) => (
                    <option
                      key={w.wing_id}
                      value={w.wing_id}
                      className="dark:bg-slate-955 dark:text-slate-300"
                    >
                      {w.wing_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Concerned Division<span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass}
                  value={form.division}
                  disabled={readOnly}
                  onChange={(e) => setField('division', e.target.value)}
                >
                  <option value="" className="dark:bg-slate-955 dark:text-slate-300">
                    Select Division
                  </option>
                  {filteredDivisions.map((d) => (
                    <option
                      key={d.division_id}
                      value={d.division_id}
                      className="dark:bg-slate-955 dark:text-slate-300"
                    >
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Name of the Subject<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.subject}
                  disabled={readOnly}
                  placeholder="Enter subject"
                  maxLength={500}
                  onChange={(e) => setField('subject', e.target.value)}
                />
              </div>

              {!readOnly && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Cabinet Note Document</label>
                  <div className="flex items-center justify-center border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-4 hover:bg-white dark:hover:bg-slate-900/50 transition cursor-pointer relative">
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
                <div className="space-y-1.5">
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
          </div>

          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Stages Checklist & Dates
            </h3>
            <div className="space-y-3">
              {STAGE_FIELDS.map((stage, index) => (
                <StageDateField
                  key={stage.key}
                  stageNumber={stage.id}
                  label={stage.label}
                  dateLabel="Date"
                  date={form[stage.dateKey]}
                  remark={form[stage.remarkKey]}
                  disabled={!unlocked[stage.key]}
                  readOnly={readOnly}
                  minDate={prevDateFor(index)}
                  maxDate={todayStr}
                  onDateChange={(d) => setStageDate(stage, d)}
                  onRemarkChange={(v) => setField(stage.remarkKey, v)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Remarks (if any)</label>
          <textarea
            className={inputClass}
            value={form.remarks || ''}
            disabled={readOnly}
            rows={4}
            placeholder="Add overall remarks"
            onChange={(e) => setField('remarks', e.target.value)}
          />
          {wordCount > 250 && (
            <p className="text-[11px] text-rose-600 font-semibold">
              Remarks cannot exceed 250 words.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-655 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            {readOnly ? 'Back' : 'Discard'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={submitting || wordCount > 250}
              className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                submitting || wordCount > 250
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-550 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg dark:bg-[#0f417a] dark:hover:bg-[#0a2d55]'
              }`}
            >
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Cabinet Note'
                  : 'Save Cabinet Note'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
