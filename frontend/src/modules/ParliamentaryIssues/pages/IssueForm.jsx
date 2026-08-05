import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0f417a]"
        >
          <ArrowLeft size={16} />
          Back to List
        </button>
        <h2 className="text-lg font-bold text-[#0f417a]">
          {readOnly ? 'View' : isEdit ? 'Edit' : 'Add'} Parliamentary Issue
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-800 border-b border-orange-300 pb-2">
          Basic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Concerned Wing <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.wing}
              disabled={readOnly}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, wing: e.target.value, division: '' }));
              }}
            >
              <option value="">--Select Wing--</option>
              {wings.map((w) => (
                <option key={w.wing_id} value={w.wing_id}>
                  {w.wing_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Concerned Division <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.division}
              disabled={readOnly}
              onChange={(e) => setField('division', e.target.value)}
            >
              <option value="">--Select Division--</option>
              {filteredDivisions.map((d) => (
                <option key={d.division_id} value={d.division_id}>
                  {d.division_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Name of the subject
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.parliamentarySubject}
              disabled={readOnly}
              onChange={(e) => setField('parliamentarySubject', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">File Number</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.fileNumber}
              disabled={readOnly}
              onChange={(e) => setField('fileNumber', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Type of Issue</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.issueType}
              disabled={readOnly}
              onChange={(e) => setField('issueType', e.target.value)}
            >
              <option value="">--Select Type--</option>
              {issueTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {isAssurance && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Assurance Number
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.assuranceNumber}
                disabled={readOnly}
                onChange={(e) => setField('assuranceNumber', e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Parliament House
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.parliamentHouse}
              disabled={readOnly}
              onChange={(e) => setField('parliamentHouse', e.target.value)}
            >
              <option value="">--Select--</option>
              <option value="Rajya Sabha">Rajya Sabha</option>
              <option value="Lok Sabha">Lok Sabha</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Name of the MP(s)
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.nameOfMP}
              disabled={readOnly}
              onChange={(e) => setField('nameOfMP', e.target.value)}
            />
          </div>
          {isAssurance && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Extension Sought up to
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.extensionSought}
                disabled={readOnly}
                onChange={(e) => setField('extensionSought', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {form.issueType && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b border-orange-300 pb-2">
            Status Workflow
          </h3>

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
            <div className="pl-1 pb-2">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                Wings for comments
              </label>
              <div className="flex flex-wrap gap-2">
                {wings.map((w) => {
                  const checked = (form.wings || []).map(String).includes(String(w.wing_id));
                  return (
                    <label
                      key={w.wing_id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                        checked
                          ? 'border-[#0f417a] bg-blue-50 text-[#0f417a]'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
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
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Wing-wise comments received
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
                label="Extension of time soughted"
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

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Remarks (max 250 words)
            </label>
            <textarea
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.remarks}
              disabled={readOnly}
              onChange={(e) => handleRemarks(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">{countWords(form.remarks)} / 250 words</p>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f417a] text-white text-sm font-semibold hover:bg-[#0c3462] disabled:opacity-60"
          >
            <Save size={16} />
            {submitting ? 'Saving…' : isEdit ? 'Update Issue' : 'Submit Issue'}
          </button>
        </div>
      )}
    </form>
  );
}
