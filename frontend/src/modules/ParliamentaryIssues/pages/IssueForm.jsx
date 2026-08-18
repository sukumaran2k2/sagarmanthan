import { useEffect, useMemo, useState } from 'react';
import StageDateField from '../components/StageDateField';
import {
  buildIssuePayload,
  commentFieldsForWings,
  computeUnlockedStages,
  emptyIssueForm,
  hasDate,
  isAssuranceType,
  isMatterType,
  isPscType,
} from '../utils/stageHelpers';
import {
  createParliamentaryIssue,
  updateParliamentaryIssue,
} from '../api';
import { getCurrentUserId } from '../../../utils/authSession';

const EMPTY_FORM = emptyIssueForm();

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer dark:[color-scheme:dark]`;
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40';

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

  const unlocked = useMemo(
    () => computeUnlockedStages(form, { isEdit, commentFields }),
    [form, isEdit, commentFields]
  );

  const setStageDate = (dateKey, remarkKey, value) => {
    setForm((prev) => ({
      ...prev,
      [dateKey]: value,
      [remarkKey]: value ? prev[remarkKey] : '',
    }));
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
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.45fr)] gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Issue Information
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
                    Select Type of Issue
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
                    Select Parliament House
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
          </div>

          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Stages Checklist & Dates
            </h3>

            {form.issueType ? (
              <div className="space-y-3">
                <StageDateField
                  stageNumber={1}
                  label="Received At Ministry"
                  dateLabel="Date Received*"
                  date={form.receivedDate}
                  remark={form.receivedRemark}
                  readOnly={readOnly}
                  disabled={!unlocked.received}
                  onDateChange={(v) => setStageDate('receivedDate', 'receivedRemark', v)}
                  onRemarkChange={(v) => setField('receivedRemark', v)}
                />

                {isMatter && (
                  <StageDateField
                    stageNumber={2}
                    label="Debated in Parliament"
                    dateLabel="Date Debated*"
                    date={form.debatedInParliamentDate}
                    remark={form.debatedInParliamentRemark}
                    readOnly={readOnly}
                    disabled={!unlocked.debated}
                    onDateChange={(v) =>
                      setStageDate('debatedInParliamentDate', 'debatedInParliamentRemark', v)
                    }
                    onRemarkChange={(v) => setField('debatedInParliamentRemark', v)}
                  />
                )}

                <StageDateField
                  stageNumber={isMatter ? 3 : 2}
                  label="Comments Sought"
                  dateLabel="Date Sought*"
                  date={form.commentSoughtDate}
                  remark={form.commentSoughtRemark}
                  readOnly={readOnly}
                  disabled={!unlocked.commentSought}
                  onDateChange={(v) => setStageDate('commentSoughtDate', 'commentSoughtRemark', v)}
                  onRemarkChange={(v) => setField('commentSoughtRemark', v)}
                />

                {hasDate(form.commentSoughtDate) && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <label className={labelClass}>Wings for Comments</label>
                    <div className="flex flex-wrap gap-1.5">
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

                <StageDateField
                  stageNumber={isMatter ? 4 : 3}
                  label="Comments Received"
                  dateLabel="Date Received*"
                  date={form.commentsReceivedDate}
                  remark={form.commentsReceivedRemark}
                  readOnly={readOnly}
                  disabled={!unlocked.commentsReceived}
                  onDateChange={(v) =>
                    setStageDate('commentsReceivedDate', 'commentsReceivedRemark', v)
                  }
                  onRemarkChange={(v) => setField('commentsReceivedRemark', v)}
                />

                {selectedCommentWings.length > 0 && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                      Wing-wise Comments Received
                    </p>
                    <div className="space-y-3">
                      {commentFields.map((field, index) => (
                        <StageDateField
                          key={field.key}
                          stageNumber={index + 1}
                          label={field.label}
                          dateLabel="Date Received*"
                          date={form[field.dateKey]}
                          remark={form[field.remarkKey]}
                          readOnly={readOnly}
                          disabled={!unlocked.commentsReceived}
                          onDateChange={(v) => setStageDate(field.dateKey, field.remarkKey, v)}
                          onRemarkChange={(v) => setField(field.remarkKey, v)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isAssurance && (
                  <>
                    <StageDateField
                      stageNumber={5}
                      label="Extension of Time Soughted"
                      dateLabel="Date Sought*"
                      date={form.extensionTimeSoughtDate}
                      remark={form.extensionTimeSoughtRemark}
                      readOnly={readOnly}
                      disabled={!unlocked.extension}
                      onDateChange={(v) =>
                        setStageDate('extensionTimeSoughtDate', 'extensionTimeSoughtRemark', v)
                      }
                      onRemarkChange={(v) => setField('extensionTimeSoughtRemark', v)}
                    />
                    <StageDateField
                      stageNumber={6}
                      label="Implementation Report Furnished / Request For Dropping"
                      dateLabel="Date Furnished*"
                      date={form.impReportFurnishedDate}
                      remark={form.impReportFurnishedRemark}
                      readOnly={readOnly}
                      disabled={!unlocked.implementation}
                      onDateChange={(v) =>
                        setStageDate('impReportFurnishedDate', 'impReportFurnishedRemark', v)
                      }
                      onRemarkChange={(v) => setField('impReportFurnishedRemark', v)}
                    />
                    <StageDateField
                      stageNumber={7}
                      label="Matter Disposed"
                      dateLabel="Date Disposed*"
                      date={form.matterDisposedDate}
                      remark={form.matterDisposedRemark}
                      readOnly={readOnly}
                      disabled={!unlocked.disposed}
                      onDateChange={(v) =>
                        setStageDate('matterDisposedDate', 'matterDisposedRemark', v)
                      }
                      onRemarkChange={(v) => setField('matterDisposedRemark', v)}
                    />
                  </>
                )}

                {(isMatter || isPsc) && (
                  <StageDateField
                    stageNumber={isMatter ? 5 : 4}
                    label="Reply Send"
                    dateLabel="Date Sent*"
                    date={form.replySendDate}
                    remark={form.replySendRemark}
                    readOnly={readOnly}
                    disabled={!unlocked.reply}
                    onDateChange={(v) => setStageDate('replySendDate', 'replySendRemark', v)}
                    onRemarkChange={(v) => setField('replySendRemark', v)}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Select the type of issue to show the workflow stages.
              </div>
            )}
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
