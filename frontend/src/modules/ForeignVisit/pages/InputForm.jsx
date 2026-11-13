import { useCallback, useMemo, useState } from 'react';
import { Plane, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import VisitFormFields from '../components/VisitFormFields';
import DocumentUploadField from '../components/DocumentUploadField';
import { createForeignVisit, uploadForeignVisitDocument } from '../api';
import { useFvStore } from '../store/useFvStore';
import { DOC_TYPE } from '../utils/constants';
import {
  emptyVisitValues,
  buildCreatePayload,
  validateVisitValues,
  stageSections,
} from '../utils/visitForm';
import { getCurrentUserId } from '../../../utils/authSession';
import { useNotifier } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

/**
 * Add Official Foreign Visit.
 *
 * Create only. Editing an existing visit goes through the Update screen, because the backend
 * splits an update across three stage-specific endpoints rather than one PUT.
 */
export default function InputForm({ onBack, onSuccess, triggerNotification, canAdd }) {
  const notify = useNotifier(triggerNotification);
  const visitTypes = useFvStore((s) => s.allVisitTypes);
  const userId = getCurrentUserId();

  const [values, setValues] = useState({ ...emptyVisitValues });
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sanctionFile, setSanctionFile] = useState(null);
  const [sanctionFileError, setSanctionFileError] = useState(null);

  const handleChange = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTouch = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const sections = useMemo(() => stageSections(values.stage), [values.stage]);

  const validationErrors = useMemo(
    () => validateVisitValues(values, { visitTypes, sections }),
    [values, visitTypes, sections]
  );
  const isFormValid = Object.keys(validationErrors).length === 0;

  /**
   * Attach the sanction order, when the stage has one.
   *
   * The tour report is not uploaded here -- it belongs to the Visit Outcome tab of the Update
   * screen, once the visit has actually taken place.
   *
   * add-OFV-data answers 201 with an empty body, so there is no new id to use. The server
   * accepts ID = -1 and resolves it to the most recently inserted visit, which is why this
   * upload must run immediately after the create.
   */
  const uploadDocuments = async () => {
    // A file picked at one stage and then left behind by switching stage must not be attached.
    const pending = [];
    if (sections.sanctioning && sanctionFile) {
      pending.push({ file: sanctionFile, type: DOC_TYPE.SANCTION, label: 'Sanction order' });
    }

    const failures = [];
    for (const item of pending) {
      try {
        await uploadForeignVisitDocument({ file: item.file, id: -1, type: item.type, userId });
      } catch (err) {
        console.error(`Foreign Visit: ${item.label} upload failed`, err);
        failures.push(item.label);
      }
    }
    return failures;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!canAdd) {
      notify(FV_TOASTS.noCreatePermission());
      return;
    }
    if (!isFormValid) {
      notify(FV_TOASTS.validationFailed());
      return;
    }

    setSaving(true);
    try {
      await createForeignVisit(buildCreatePayload(values, userId));

      // The visit is saved at this point. A failed attachment must not read as a failed save.
      const failedUploads = await uploadDocuments();
      if (failedUploads.length > 0) {
        notify(FV_TOASTS.savedWithUploadFailure(failedUploads));
      } else {
        notify(FV_TOASTS.created());
      }
      onSuccess?.();
    } catch (err) {
      console.error('Foreign Visit: create failed', err);
      notify(FV_TOASTS.createFailed(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            <Plane className="h-4 w-4" />
            <span>ADD OFFICIAL FOREIGN VISIT</span>
          </h3>
          <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
        </div>
        <button onClick={onBack} type="button"
          className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
        {formSubmitted && !isFormValid && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Please correct the following before submitting:
              </h4>
              <ul className="mt-1 list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
                {Object.values(validationErrors).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          </div>
        )}

        <VisitFormFields
          values={values}
          onChange={handleChange}
          onTouch={handleTouch}
          errors={validationErrors}
          touched={touched}
          formSubmitted={formSubmitted}
          disabled={saving}
          // Sits inside the Sanctioning Details block, so it appears and disappears with it.
          sanctionOrderField={
            <DocumentUploadField
              label="Upload Sanction Order"
              file={sanctionFile}
              error={sanctionFileError}
              disabled={saving}
              onSelect={(file, error) => { setSanctionFile(file); setSanctionFileError(error); }}
            />
          }
        />


        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onBack} disabled={saving}
            className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-60">
            Exit
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{saving ? 'Saving…' : 'Submit'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
