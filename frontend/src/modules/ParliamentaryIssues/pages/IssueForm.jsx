import { useEffect, useMemo, useState } from 'react';
import YesNoDateField from '../components/YesNoDateField';
import {
  commentFieldsForWings,
  isAssuranceType,
  isMatterType,
  isPscType,
} from '../utils/stageHelpers';
import { buildIssuePayload, countWords } from '../utils/stageHelpers';
import {
  createParliamentaryIssue,
  updateParliamentaryIssue,
} from '../api';
import { getCurrentUserId } from '../../../utils/authSession';

const EMPTY_FORM = {
  wing: '',
  division: '',
  parliamentarySubject: '',
  fileNumber: '',
  issueType: '',
  assuranceNumber: '',
  parliamentHouse: '',
  nameOfMP: '',
  extensionSought: '',
  received: '',
  receivedDate: '',
  commentSought: '',
  commentSoughtDate: '',
  wings: [],
  commentsReceived: '',
  commentsReceivedDate: '',
  shipping: '',
  shippingDate: '',
  vigilance: '',
  vigilanceDate: '',
  ports: '',
  portsDate: '',
  iwt: '',
  iwtDate: '',
  administration: '',
  administrationDate: '',
  coordI: '',
  coordIDate: '',
  coordII: '',
  coordIIDate: '',
  dgll: '',
  dgllDate: '',
  development: '',
  developmentDate: '',
  finance: '',
  financeDate: '',
  sagarmala: '',
  sagarmalaDate: '',
  extensionTimeSought: '',
  extensionTimeSoughtDate: '',
  replySend: '',
  replySendDate: '',
  debatedInParliament: '',
  debatedInParliamentDate: '',
  impReportFurnished: '',
  impReportFurnishedDate: '',
  matterDisposed: '',
  matterDisposedDate: '',
  remarks: '',
};

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer dark:[color-scheme:dark]`;

export default function IssueForm({
  wings = [],
  divisions = [],
  stages = [],
  issueTypeOptions = [],
  initialForm = null,
  readOnly = false,
  onBack,
  onSuccess,
  notify,
}) {
  const isEdit = !!initialForm?.parliamentaryIssueID;
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(initialForm ? { ...EMPTY_FORM, ...initialForm } : { ...EMPTY_FORM });
  }, [initialForm]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredDivisions = useMemo(() => {
    if (!form.wing) return [];
    return divisions.filter((d) => String(d.wing_id) === String(form.wing));
  }, [divisions, form.wing]);

  const selectedCommentWings = useMemo(() => {
    const ids = new Set((form.wings || []).map(String));
    return wings.filter((w) => ids.has(String(w.wing_id)));
  }, [wings, form.wings]);

  const commentFields = useMemo(
    () => commentFieldsForWings(selectedCommentWings),
    [selectedCommentWings]
  );

  const isAssurance = isAssuranceType(form.issueType);
  const isPsc = isPscType(form.issueType);
  const isMatter = isMatterType(form.issueType);

  const unlocked = useMemo(() => {
    // Unlock next step once Yes/No is chosen (date optional) - legacy form behavior.
    const answered = (yesNo, date) =>
      yesNo === 'Yes' || yesNo === 'No' || !!date;

    const receivedDone = answered(form.received, form.receivedDate);
    const debatedDone = answered(form.debatedInParliament, form.debatedInParliamentDate);
    const commentSoughtDone = answered(form.commentSought, form.commentSoughtDate);
    const wingCommentDone =
      answered(form.commentsReceived, form.commentsReceivedDate) ||
      commentFields.some((f) => answered(form[f.key], form[`${f.key}Date`]));
    const extensionDone = answered(
      form.extensionTimeSought,
      form.extensionTimeSoughtDate
    );
    const impDone = answered(form.impReportFurnished, form.impReportFurnishedDate);

    // On edit, unlock steps that already have saved data.
    const has = (yesNo, date) => answered(yesNo, date);

    if (isAssurance) {
      const base = {
        received: true,
        debated: false,
        commentSought: receivedDone,
        commentsReceived: commentSoughtDone,
        extension: wingCommentDone,
        implementation: extensionDone,
        disposed: impDone,
        reply: false,
      };
      if (isEdit) {
        if (has(form.commentSought, form.commentSoughtDate)) base.commentSought = true;
        if (has(form.commentsReceived, form.commentsReceivedDate) || commentFields.some((f) => has(form[f.key], form[`${f.key}Date`]))) {
          base.commentSought = true;
          base.commentsReceived = true;
        }
        if (has(form.extensionTimeSought, form.extensionTimeSoughtDate)) {
          base.commentSought = true;
          base.commentsReceived = true;
          base.extension = true;
        }
        if (has(form.impReportFurnished, form.impReportFurnishedDate)) {
          base.commentSought = true;
          base.commentsReceived = true;
          base.extension = true;
          base.implementation = true;
        }
        if (has(form.matterDisposed, form.matterDisposedDate)) {
          base.commentSought = true;
          base.commentsReceived = true;
          base.extension = true;
          base.implementation = true;
          base.disposed = true;
        }
      }
      return base;
    }
    if (isMatter) {
      const base = {
        received: true,
        debated: receivedDone,
        commentSought: debatedDone,
        commentsReceived: commentSoughtDone,
        extension: false,
        implementation: false,
        disposed: false,
        reply: wingCommentDone,
      };
      if (isEdit) {
        if (has(form.debatedInParliament, form.debatedInParliamentDate)) base.debated = true;
        if (has(form.commentSought, form.commentSoughtDate)) {
          base.debated = true;
          base.commentSought = true;
        }
        if (has(form.commentsReceived, form.commentsReceivedDate) || commentFields.some((f) => has(form[f.key], form[`${f.key}Date`]))) {
          base.debated = true;
          base.commentSought = true;
          base.commentsReceived = true;
        }
        if (has(form.replySend, form.replySendDate)) {
          base.debated = true;
          base.commentSought = true;
          base.commentsReceived = true;
          base.reply = true;
        }
      }
      return base;
    }
    if (isPsc) {
      const base = {
        received: true,
        debated: false,
        commentSought: receivedDone,
        commentsReceived: commentSoughtDone,
        extension: false,
        implementation: false,
        disposed: false,
        reply: wingCommentDone,
      };
      if (isEdit) {
        if (has(form.commentSought, form.commentSoughtDate)) base.commentSought = true;
        if (has(form.commentsReceived, form.commentsReceivedDate) || commentFields.some((f) => has(form[f.key], form[`${f.key}Date`]))) {
          base.commentSought = true;
          base.commentsReceived = true;
        }
        if (has(form.replySend, form.replySendDate)) {
          base.commentSought = true;
          base.commentsReceived = true;
          base.reply = true;
        }
      }
      return base;
    }
    return {
      received: true,
      debated: false,
      commentSought: false,
      commentsReceived: false,
      extension: false,
      implementation: false,
      disposed: false,
      reply: false,
    };
  }, [form, isAssurance, isMatter, isPsc, commentFields, isEdit]);

  const handleRemarks = (value) => {
    if (countWords(value) > 250) {
      notify?.('Remarks are limited to 250 words.', 'error');
      return;
    }
    setField('remarks', value);
  };

  const toggleCommentWing = (wingId) => {
    const id = String(wingId);
    setForm((prev) => {
      const current = (prev.wings || []).map(String);
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...prev, wings: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    if (!form.wing || !form.division) {
      notify?.('Please select Wing and Division.', 'error');
      return;
    }
    if (!form.issueType) {
      notify?.('Please select Type of Issue.', 'error');
      return;
    }

    const userId = getCurrentUserId();
    const payload = buildIssuePayload(form, userId, stages);
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateParliamentaryIssue({
          ...payload,
          parliamentaryIssueID: form.parliamentaryIssueID,
        });
        notify?.('Parliamentary issue updated successfully.', 'success');
      } else {
        await createParliamentaryIssue(payload);
        notify?.('Parliamentary issue created successfully.', 'success');
      }
      onSuccess?.();
    } catch (err) {
      console.error(err);
      notify?.(
        err?.response?.data?.message || 'Failed to save parliamentary issue.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formTitle = readOnly
    ? 'View Parliamentary Issue'
    : isEdit
      ? 'Update Parliamentary Issue'
      : 'Add Parliamentary Issue';

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
        <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-1">
          Basic Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                --Select Wing--
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
                --Select Division--
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
            <label className={labelClass}>Name of the Subject</label>
            <input
              type="text"
              className={inputClass}
              value={form.parliamentarySubject}
              disabled={readOnly}
              placeholder="Enter subject"
              onChange={(e) => setField('parliamentarySubject', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>File Number</label>
            <input
              type="text"
              className={inputClass}
              value={form.fileNumber}
              disabled={readOnly}
              placeholder="Enter file number"
              onChange={(e) => setField('fileNumber', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>
              Type of Issue<span className="text-red-500">*</span>
            </label>
            <select
              className={selectClass}
              value={form.issueType}
              disabled={readOnly}
              onChange={(e) => setField('issueType', e.target.value)}
            >
              <option value="" className="dark:bg-slate-955 dark:text-slate-300">
                --Select Type--
              </option>
              {issueTypeOptions.map((t) => (
                <option key={t} value={t} className="dark:bg-slate-955 dark:text-slate-300">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {isAssurance && (
            <div className="space-y-1.5">
              <label className={labelClass}>Assurance Number</label>
              <input
                type="text"
                className={inputClass}
                value={form.assuranceNumber}
                disabled={readOnly}
                placeholder="Enter assurance number"
                onChange={(e) => setField('assuranceNumber', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelClass}>Parliament House</label>
            <select
              className={selectClass}
              value={form.parliamentHouse}
              disabled={readOnly}
              onChange={(e) => setField('parliamentHouse', e.target.value)}
            >
              <option value="" className="dark:bg-slate-955 dark:text-slate-300">
                --Select--
              </option>
              <option value="Rajya Sabha" className="dark:bg-slate-955 dark:text-slate-300">
                Rajya Sabha
              </option>
              <option value="Lok Sabha" className="dark:bg-slate-955 dark:text-slate-300">
                Lok Sabha
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Name of the MP(s)</label>
            <input
              type="text"
              className={inputClass}
              value={form.nameOfMP}
              disabled={readOnly}
              placeholder="Enter name of MP(s)"
              onChange={(e) => setField('nameOfMP', e.target.value)}
            />
          </div>

          {isAssurance && (
            <div className="space-y-1.5">
              <label className={labelClass}>Extension Sought Up To</label>
              <input
                type="date"
                className={`${inputClass} dark:[color-scheme:dark]`}
                value={form.extensionSought}
                disabled={readOnly}
                onChange={(e) => setField('extensionSought', e.target.value)}
              />
            </div>
          )}
        </div>

        {form.issueType && (
          <>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mt-2 mb-1">
              Status Workflow
            </h3>

            <div className="space-y-3">
              <YesNoDateField
                label="Received At Ministry"
                name="received"
                value={form.received}
                date={form.receivedDate}
                readOnly={readOnly}
                disabled={!unlocked.received}
                onChange={(v) => setField('received', v)}
                onDateChange={(v) => setField('receivedDate', v)}
              />

              {isMatter && (
                <YesNoDateField
                  label="Debated in Parliament"
                  name="debatedInParliament"
                  value={form.debatedInParliament}
                  date={form.debatedInParliamentDate}
                  readOnly={readOnly}
                  disabled={!unlocked.debated}
                  onChange={(v) => setField('debatedInParliament', v)}
                  onDateChange={(v) => setField('debatedInParliamentDate', v)}
                />
              )}

              <YesNoDateField
                label="Comments Sought"
                name="commentSought"
                value={form.commentSought}
                date={form.commentSoughtDate}
                readOnly={readOnly}
                disabled={!unlocked.commentSought}
                onChange={(v) => setField('commentSought', v)}
                onDateChange={(v) => setField('commentSoughtDate', v)}
              />

              {form.commentSought === 'Yes' && (
                <div className="space-y-2">
                  <label className={labelClass}>Wings for Comments</label>
                  <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {wings.map((w) => {
                      const checked = (form.wings || [])
                        .map(String)
                        .includes(String(w.wing_id));
                      return (
                        <label
                          key={w.wing_id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border cursor-pointer transition ${
                            checked
                              ? 'bg-[#fdfcfc] dark:bg-blue-950/40 text-blue-750 dark:text-blue-300 border-[#eadede] dark:border-blue-900/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          } ${readOnly || !unlocked.commentSought ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="accent-[#0f417a]"
                            checked={checked}
                            disabled={readOnly || !unlocked.commentSought}
                            onChange={() => toggleCommentWing(w.wing_id)}
                          />
                          {w.wing_name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <YesNoDateField
                label="Comments Received"
                name="commentsReceived"
                value={form.commentsReceived}
                date={form.commentsReceivedDate}
                readOnly={readOnly}
                disabled={!unlocked.commentsReceived}
                onChange={(v) => setField('commentsReceived', v)}
                onDateChange={(v) => setField('commentsReceivedDate', v)}
              />

              {selectedCommentWings.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Wing-wise Comments Received
                  </p>
                  {commentFields.map((field) => (
                    <YesNoDateField
                      key={field.key}
                      label={field.label}
                      name={field.key}
                      value={form[field.key]}
                      date={form[`${field.key}Date`]}
                      readOnly={readOnly}
                      disabled={!unlocked.commentsReceived}
                      onChange={(v) => setField(field.key, v)}
                      onDateChange={(v) => setField(`${field.key}Date`, v)}
                    />
                  ))}
                </div>
              )}

              {isAssurance && (
                <>
                  <YesNoDateField
                    label="Extension of Time Soughted"
                    name="extensionTimeSought"
                    value={form.extensionTimeSought}
                    date={form.extensionTimeSoughtDate}
                    readOnly={readOnly}
                    disabled={!unlocked.extension}
                    onChange={(v) => setField('extensionTimeSought', v)}
                    onDateChange={(v) => setField('extensionTimeSoughtDate', v)}
                  />
                  <YesNoDateField
                    label="Implementation Report Furnished / Request For Dropping"
                    name="impReportFurnished"
                    value={form.impReportFurnished}
                    date={form.impReportFurnishedDate}
                    readOnly={readOnly}
                    disabled={!unlocked.implementation}
                    onChange={(v) => setField('impReportFurnished', v)}
                    onDateChange={(v) => setField('impReportFurnishedDate', v)}
                  />
                  <YesNoDateField
                    label="Matter Disposed"
                    name="matterDisposed"
                    value={form.matterDisposed}
                    date={form.matterDisposedDate}
                    readOnly={readOnly}
                    disabled={!unlocked.disposed}
                    onChange={(v) => setField('matterDisposed', v)}
                    onDateChange={(v) => setField('matterDisposedDate', v)}
                  />
                </>
              )}

              {(isMatter || isPsc) && (
                <YesNoDateField
                  label="Reply Send"
                  name="replySend"
                  value={form.replySend}
                  date={form.replySendDate}
                  readOnly={readOnly}
                  disabled={!unlocked.reply}
                  onChange={(v) => setField('replySend', v)}
                  onDateChange={(v) => setField('replySendDate', v)}
                />
              )}

              <div className="space-y-1.5 pt-2">
                <label className={labelClass}>Remarks (Max 250 Words)</label>
                <textarea
                  rows={4}
                  className={`${inputClass} resize-y`}
                  value={form.remarks}
                  disabled={readOnly}
                  placeholder="Enter remarks"
                  onChange={(e) => handleRemarks(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 font-semibold">
                  {countWords(form.remarks)} / 250 words
                </p>
              </div>
            </div>
          </>
        )}

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
              disabled={submitting}
              className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                submitting
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-550 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg dark:bg-[#0f417a] dark:hover:bg-[#0a2d55]'
              }`}
            >
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Parliamentary Issue'
                  : 'Save Parliamentary Issue'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
