import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plane, ArrowLeft, AlertCircle, Loader2, ClipboardCheck, PlaneLanding, FileText,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import VisitFormFields, { YesNoField, Field, GRID, HALF, FULL } from '../components/VisitFormFields';
import DocumentUploadField from '../components/DocumentUploadField';
import {
  fetchForeignVisitForUpdate,
  fetchForeignVisitDocuments,
  updateProposedInfo,
  updateSanctionedInfo,
  updateVisitInfo,
  uploadForeignVisitDocument,
} from '../api';
import { downloadVisitDocument } from '../utils/downloadDocument';
import { useFvStore } from '../store/useFvStore';
import { DOC_TYPE, STAGE, STAGE_NAMES, SCHEMA_LIMITS, isMinistryOrganisation } from '../utils/constants';
import {
  emptyVisitValues,
  buildProposedUpdatePayload,
  validateVisitValues,
  visitRowToValues,
} from '../utils/visitForm';
import { getCurrentUserId } from '../../../utils/authSession';
import { useNotifier } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

const ALL_TABS = [
  { id: 'proposal', label: 'Proposed Information', icon: FileText },
  { id: 'sanction', label: 'Sanctioned Information', icon: ClipboardCheck },
  // The 2.0 tab is named for the outcome it records; the panel below it is headed "Tour Report".
  { id: 'visit', label: 'Details of Visited / Not Visited', heading: 'Tour Report', icon: PlaneLanding },
];

/**
 * Which tabs a record shows, from the stage it is currently at.
 *
 * A proposal has not been sanctioned yet, so there is no visit to report on and the Visit tab
 * would have nothing to save -- the 2.0 form shows only the first two tabs for a Proposed
 * record. A rejected tour never happens either, so it stops at the sanction decision.
 */
function tabsForStage(stage) {
  const id = Number(stage);
  const sanctioned = id === STAGE.SANCTIONED || id === STAGE.VISITED || id === STAGE.NOT_VISITED;
  return ALL_TABS.filter((t) => t.id !== 'visit' || sanctioned);
}

/**
 * Ribbon naming where the tour stands, as in the 2.0 form.
 *
 * It names the decision, not the stage: everything from Sanctioned onwards reads
 * "Sanctioned Tour", so a visited record does not display "Sanctioned & Visited Tour".
 */
function stageRibbon(stage) {
  const id = Number(stage);
  if (!id) return null;
  if (id === STAGE.PROPOSED) return { label: 'Proposed Tour', tone: 'bg-amber-400 text-slate-900' };
  if (id === STAGE.REJECTED) return { label: 'Rejected Tour', tone: 'bg-rose-500 text-white' };
  return { label: 'Sanctioned Tour', tone: 'bg-sky-500 text-white' };
}

function StageBadge({ ribbon }) {
  if (!ribbon) return null;
  return (
    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm ${ribbon.tone}`}>
      {ribbon.label}
    </span>
  );
}

/**
 * Update an existing Foreign Visit.
 *
 * The backend splits an update across three endpoints, each owning a slice of the row and each
 * deciding the next stage itself. The tabs here mirror that split so a save never sends fields
 * the endpoint would ignore, and so the stage the server derives is the one the user chose.
 */
export default function UpdateVisit({ visitId, onBack, onSaved, triggerNotification, canEdit }) {
  const notify = useNotifier(triggerNotification);
  const visitTypes = useFvStore((s) => s.allVisitTypes);
  const stages = useFvStore((s) => s.stages);
  const organisations = useFvStore((s) => s.organisations);
  const userId = getCurrentUserId();

  const [activeTab, setActiveTab] = useState('proposal');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Proposal tab
  const [values, setValues] = useState({ ...emptyVisitValues });
  const [touched, setTouched] = useState({});
  const [proposalSubmitted, setProposalSubmitted] = useState(false);

  // Sanction tab
  const [tourSanctioned, setTourSanctioned] = useState('');
  const [sanctionedAuthority, setSanctionedAuthority] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [sanctionFile, setSanctionFile] = useState(null);
  const [sanctionFileError, setSanctionFileError] = useState(null);
  const [sanctionSubmitted, setSanctionSubmitted] = useState(false);

  // Visit Outcome tab
  const [visitCompleted, setVisitCompleted] = useState('');
  const [notVisitedReason, setNotVisitedReason] = useState('');
  const [tourFile, setTourFile] = useState(null);
  const [tourFileError, setTourFileError] = useState(null);
  const [visitSubmitted, setVisitSubmitted] = useState(false);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [recordRes, docsRes] = await Promise.all([
        fetchForeignVisitForUpdate(visitId),
        fetchForeignVisitDocuments(visitId),
      ]);

      const row = Array.isArray(recordRes.data) ? recordRes.data[0] : recordRes.data;
      if (!row) {
        setLoadError('This visit could not be found. It may have been removed.');
        return;
      }

      setRecord(row);
      setValues(visitRowToValues(row));
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);

      setTourSanctioned(row.check_sanctioned == null ? '' : String(Number(row.check_sanctioned)));
      setSanctionedAuthority(row.sanctioned_authority || '');
      setRejectionRemarks(row.remarks_not_approval || '');
      setVisitCompleted(row.visited_completed == null ? '' : String(Number(row.visited_completed)));
      setNotVisitedReason(row.reason_for_not_visited || '');
    } catch (err) {
      console.error('Foreign Visit: record load failed', err);
      setLoadError('This visit could not be loaded.');
      notify(FV_TOASTS.loadFailed('visit', err));
    } finally {
      setLoading(false);
    }
  }, [visitId, notify]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  const docFor = (type) => documents.find((d) => d.doc_related === type)?.file_name || '';

  const handleChange = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);
  const handleTouch = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // The proposal endpoint has no sanctioning-authority column, so that field is excluded here
  // and validated on the Sanction tab instead. Everything else follows the stage, the same way
  // the create form does.
  const proposalErrors = useMemo(() => {
    const errs = validateVisitValues(values, {
      visitTypes,
      isMinistry: isMinistryOrganisation(organisations, values.organisation),
    });
    delete errs.sanctioningAuthority;
    return errs;
  }, [values, visitTypes, organisations]);
  const proposalValid = Object.keys(proposalErrors).length === 0;

  const handleDownload = async (fileName) => {
    try {
      await downloadVisitDocument(fileName);
    } catch (err) {
      console.error('Foreign Visit: download failed', err);
      notify(FV_TOASTS.downloadFailed(err));
    }
  };

  const uploadOne = async (file, type, label) => {
    if (!file) return true;
    try {
      await uploadForeignVisitDocument({ file, id: visitId, type, userId });
      notify(FV_TOASTS.documentUploaded(label));
      return true;
    } catch (err) {
      console.error(`Foreign Visit: ${label} upload failed`, err);
      notify(FV_TOASTS.documentUploadFailed(label, err));
      return false;
    }
  };

  const guard = () => {
    if (!canEdit) { notify(FV_TOASTS.noEditPermission()); return false; }
    return true;
  };

  const saveProposal = async () => {
    setProposalSubmitted(true);
    if (!guard()) return;
    if (!proposalValid) { notify(FV_TOASTS.validationFailed()); return; }

    setSaving(true);
    try {
      await updateProposedInfo(buildProposedUpdatePayload(values, { id: visitId, userId }));
      notify(FV_TOASTS.proposalUpdated());
      await loadRecord();
      onSaved?.();
    } catch (err) {
      console.error('Foreign Visit: proposal update failed', err);
      notify(FV_TOASTS.updateFailed('proposal details', err));
    } finally {
      setSaving(false);
    }
  };

  const sanctionErrors = useMemo(() => {
    const errs = {};
    if (tourSanctioned === '') errs.tourSanctioned = 'Select whether the tour was sanctioned.';
    if (tourSanctioned === '1' && !sanctionedAuthority.trim()) {
      errs.sanctionedAuthority = 'Sanctioning authority is required.';
    }
    // A sanctioned tour must have its order on file -- either one already attached or one
    // picked now.
    const attachedOrder = documents.find((d) => d.doc_related === DOC_TYPE.SANCTION)?.file_name;
    if (tourSanctioned === '1' && !sanctionFile && !attachedOrder) {
      errs.sanctionOrder = 'Attach the sanction order.';
    }
    if (tourSanctioned === '0' && !rejectionRemarks.trim()) {
      errs.rejectionRemarks = 'Give a reason for not approving the visit.';
    }
    return errs;
    // documents feeds docFor, so a freshly uploaded order clears the error after a reload
  }, [tourSanctioned, sanctionedAuthority, rejectionRemarks, sanctionFile, documents]);

  const saveSanction = async () => {
    setSanctionSubmitted(true);
    if (!guard()) return;
    if (Object.keys(sanctionErrors).length > 0) { notify(FV_TOASTS.validationFailed()); return; }

    setSaving(true);
    try {
      await updateSanctionedInfo({
        ID: visitId,
        tourSanctioned: Number(tourSanctioned),
        sanctionedAuthority: sanctionedAuthority.trim() || null,
        remarksForNotApproval: rejectionRemarks.trim() || null,
        // The server compares this with === '1' when deciding the next stage, so it must be
        // a string, not the number the row carries.
        visit: String(record?.visit ?? STAGE.PROPOSED),
        userID: userId,
      });
      // Only attach the order when the tour was actually sanctioned -- a file picked and then
      // left behind by switching the answer to No must not reach a rejected record.
      if (tourSanctioned === '1') {
        await uploadOne(sanctionFile, DOC_TYPE.SANCTION, 'sanction order');
      }
      setSanctionFile(null);
      notify(FV_TOASTS.sanctionUpdated(tourSanctioned === '1'));
      await loadRecord();
      onSaved?.();
    } catch (err) {
      console.error('Foreign Visit: sanction update failed', err);
      notify(FV_TOASTS.updateFailed('sanction details', err));
    } finally {
      setSaving(false);
    }
  };

  const visitErrors = useMemo(() => {
    const errs = {};
    if (visitCompleted === '') errs.visitCompleted = 'Select whether the visit took place.';
    // updateVisitTab derives the stage purely from whether a reason was sent: a reason means
    // Not Visited (4), no reason means Visited (3). So the two fields must agree.
    if (visitCompleted === '0' && !notVisitedReason.trim()) {
      errs.notVisitedReason = 'Give a reason, otherwise the visit will be recorded as completed.';
    }
    return errs;
  }, [visitCompleted, notVisitedReason]);

  const saveVisitOutcome = async () => {
    setVisitSubmitted(true);
    if (!guard()) return;
    if (Object.keys(visitErrors).length > 0) { notify(FV_TOASTS.validationFailed()); return; }

    setSaving(true);
    try {
      await updateVisitInfo({
        ID: visitId,
        visitCompleted: Number(visitCompleted),
        // updateVisitTab derives the stage purely from whether a reason was sent -- a reason
        // means Not Visited (4), none means Visited (3). Sending a reason left over from a
        // previous answer would record the opposite of what was chosen here.
        reasonForNotVisited: visitCompleted === '0' ? (notVisitedReason.trim() || null) : null,
        visit: String(record?.visit ?? STAGE.SANCTIONED),
        userID: userId,
      });
      // Likewise, a tour report belongs only to a visit that actually happened.
      if (visitCompleted === '1') {
        await uploadOne(tourFile, DOC_TYPE.TOUR, 'tour report');
      }
      setTourFile(null);
      notify(FV_TOASTS.visitOutcomeUpdated(visitCompleted === '1'));
      await loadRecord();
      onSaved?.();
    } catch (err) {
      console.error('Foreign Visit: visit outcome update failed', err);
      notify(FV_TOASTS.updateFailed('visit outcome', err));
    } finally {
      setSaving(false);
    }
  };

  const currentStageName = useMemo(() => {
    if (!record?.visit) return '—';
    const match = stages.find((s) => String(s.fv_stage_id) === String(record.visit));
    return match?.fv_stage_name || STAGE_NAMES[Number(record.visit)] || '—';
  }, [record, stages]);

  const tabs = useMemo(() => tabsForStage(record?.visit), [record]);

  /**
   * A save can move the record to a stage that no longer offers the open tab -- rejecting a
   * tour drops the Visit tab. Deriving the tab rather than correcting it in an effect means
   * there is never a render where the selected tab does not exist.
   */
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'proposal');

  const tabIndex = tabs.findIndex((t) => t.id === effectiveTab);
  const prevTab = tabIndex > 0 ? tabs[tabIndex - 1] : null;
  const nextTab = tabIndex >= 0 && tabIndex < tabs.length - 1 ? tabs[tabIndex + 1] : null;

  const errorLine = (message) =>
    message ? (
      <p className="module-form-error-msg flex items-center gap-1">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>{message}</span>
      </p>
    ) : null;

  if (loading) {
    return (
      <div className="module-form-card p-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading visit…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="module-form-card p-8 space-y-4 text-center">
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{loadError}</p>
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
          Back to the list
        </button>
      </div>
    );
  }

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            <Plane className="h-4 w-4" />
            <span>UPDATE FOREIGN VISIT — {record?.fv_id || ''}</span>
          </h3>
          <p className="module-form-banner-subtext">
            {record?.name || 'Officer'} · Current stage: {currentStageName}
          </p>
        </div>
        <button onClick={onBack} type="button"
          className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="px-6 pt-5 space-y-4">
        <div className="module-subtabs-strip">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`module-subtab-btn flex items-center gap-1.5 ${effectiveTab === tab.id ? 'active' : ''}`}>
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
            {(() => {
              const tab = tabs.find((t) => t.id === effectiveTab);
              return tab?.heading || tab?.label;
            })()}
          </h3>
          <StageBadge ribbon={stageRibbon(record?.visit)} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {effectiveTab === 'proposal' && (
          <>
            {proposalSubmitted && !proposalValid && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Please correct the following:</h4>
                  <ul className="mt-1 list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
                    {Object.values(proposalErrors).map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <VisitFormFields
              values={values}
              onChange={handleChange}
              onTouch={handleTouch}
              errors={proposalErrors}
              touched={touched}
              formSubmitted={proposalSubmitted}
              showSanctioningAuthority={false}
              disabled={saving || !canEdit}
            />

            <SaveBar saving={saving} onCancel={onBack} onSave={saveProposal} disabled={!canEdit}
              prevTab={prevTab} nextTab={nextTab} onGoToTab={setActiveTab}
              label="Update" />
          </>
        )}

        {effectiveTab === 'sanction' && (
          <>
            <div className={GRID}>
              <div className={FULL}>
                <YesNoField
                  label="Whether Tour is Sanctioned?"
                  name="tourSanctioned"
                  value={tourSanctioned}
                  onChange={setTourSanctioned}
                  disabled={saving || !canEdit}
                  error={sanctionSubmitted && errorLine(sanctionErrors.tourSanctioned)}
                />
              </div>

              {/* The authority and the order only exist once the tour has been approved, so
                  they stay out of the way until Yes is chosen -- as in the 2.0 form, which
                  shows nothing but the question and Remarks before a decision is made. */}
              {tourSanctioned === '1' && (
                <>
                  <Field label="Sanctioning Authority" required span={HALF}
                    error={sanctionSubmitted && errorLine(sanctionErrors.sanctionedAuthority)}>
                    <input type="text" value={sanctionedAuthority} disabled={saving || !canEdit}
                      maxLength={SCHEMA_LIMITS.sanctionedAuthority}
                      onChange={(e) => setSanctionedAuthority(e.target.value)}
                      placeholder="e.g. Secretary (PSW)"
                      className={`module-form-input ${sanctionSubmitted && sanctionErrors.sanctionedAuthority ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} />
                  </Field>

                  <div className={HALF}>
                    <DocumentUploadField
                      label="Sanction Order"
                      required
                      pdfOnly
                      file={sanctionFile}
                      error={sanctionFileError || (sanctionSubmitted ? sanctionErrors.sanctionOrder : null)}
                      disabled={saving || !canEdit}
                      existingFileName={docFor(DOC_TYPE.SANCTION)}
                      onDownloadExisting={() => handleDownload(docFor(DOC_TYPE.SANCTION))}
                      onSelect={(file, error) => { setSanctionFile(file); setSanctionFileError(error); }}
                    />
                  </div>
                </>
              )}

              {/* Only a tour that was not sanctioned needs a reason. */}
              {tourSanctioned !== '1' && (
                <Field label="Remarks" required={tourSanctioned === '0'} span={HALF}
                  error={sanctionSubmitted && errorLine(sanctionErrors.rejectionRemarks)}>
                  <textarea value={rejectionRemarks} rows={3} disabled={saving || !canEdit}
                    maxLength={SCHEMA_LIMITS.remarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                    placeholder="Enter reason for incomplete visit"
                    className={`module-form-textarea resize-y ${sanctionSubmitted && sanctionErrors.rejectionRemarks ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} />
                </Field>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              Saving here moves the visit to <strong>Sanctioned</strong> when the tour is approved, or to{' '}
              <strong>Rejected</strong> when it is not.
            </p>

            <SaveBar saving={saving} onCancel={onBack} onSave={saveSanction} disabled={!canEdit}
              prevTab={prevTab} nextTab={nextTab} onGoToTab={setActiveTab}
              label="Update" />
          </>
        )}

        {effectiveTab === 'visit' && (
          <>
            <div className={GRID}>
              <div className={FULL}>
                <YesNoField
                  label="Visit completed by the officer?"
                  name="visitCompleted"
                  value={visitCompleted}
                  onChange={setVisitCompleted}
                  disabled={saving || !canEdit}
                  error={visitSubmitted && errorLine(visitErrors.visitCompleted)}
                />
              </div>

              {/* A completed visit has a report; one that did not happen has a reason. Neither
                  is asked for until the question above is answered. */}
              {visitCompleted === '1' && (
                <div className={HALF}>
                  <DocumentUploadField
                    label="Tour Report"
                    pdfOnly
                    file={tourFile}
                    error={tourFileError}
                    disabled={saving || !canEdit}
                    existingFileName={docFor(DOC_TYPE.TOUR)}
                    onDownloadExisting={() => handleDownload(docFor(DOC_TYPE.TOUR))}
                    onSelect={(file, error) => { setTourFile(file); setTourFileError(error); }}
                  />
                </div>
              )}

              {visitCompleted === '0' && (
                <Field label="Reason for Not Visiting" required span={HALF}
                  error={visitSubmitted && errorLine(visitErrors.notVisitedReason)}>
                  <textarea value={notVisitedReason} rows={3} disabled={saving || !canEdit}
                    maxLength={SCHEMA_LIMITS.remarks}
                    onChange={(e) => setNotVisitedReason(e.target.value)}
                    placeholder="Why the sanctioned visit did not take place"
                    className={`module-form-textarea resize-y ${visitSubmitted && visitErrors.notVisitedReason ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} />
                </Field>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              Saving here moves the visit to <strong>Sanctioned &amp; Visited</strong>, or to{' '}
              <strong>Sanctioned &amp; Not Visited</strong> when a reason is given.
            </p>

            <SaveBar saving={saving} onCancel={onBack} onSave={saveVisitOutcome} disabled={!canEdit}
              prevTab={prevTab} nextTab={nextTab} onGoToTab={setActiveTab}
              label="Update" />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Previous / Exit on the left, Update / Next on the right, as in the 2.0 form.
 *
 * Next only moves between tabs -- it does not save. Each tab is its own endpoint, so moving on
 * without pressing Update would otherwise look like a save that silently did nothing.
 */
function SaveBar({ saving, onCancel, onSave, label, disabled, prevTab, nextTab, onGoToTab }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {prevTab && (
          <button type="button" onClick={() => onGoToTab(prevTab.id)} disabled={saving}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving || disabled}
          className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-60 flex items-center gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{saving ? 'Saving…' : label}</span>
        </button>

        {/* Next while there is another tab to move to, Exit once this is the last one. */}
        {nextTab ? (
          <button type="button" onClick={() => onGoToTab(nextTab.id)} disabled={saving}
            title="Moves to the next tab. Press Update first to save this one."
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="button" onClick={onCancel} disabled={saving}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-60">
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
