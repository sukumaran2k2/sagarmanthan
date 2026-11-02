import { useState } from 'react';
import { Save } from 'lucide-react';
import { createManningOfOwnedShips, updateManningOfOwnedShips } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Confirmed from the legacy site: there is no compliance % input field at
// all. The backend computes it server-side on both insert and update as
// (shipsCompliant / vesselsAudited) * 100 and stores it directly -- the
// frontend never sends or edits this value.
export default function ManningOfOwnedShipsInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noofVesselsaudited, setNoofVesselsaudited] = useState(editData?.no_of_old_vessels_audited_compliance ?? '');
  const [noofShipsfullycomplaint, setNoofShipsfullycomplaint] = useState(editData?.no_of_ships_fully_complaint_stwc_and_mlc ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['noofVesselsaudited', noofVesselsaudited],
    ['noofShipsfullycomplaint', noofShipsfullycomplaint],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [noofVesselsaudited, noofShipsfullycomplaint].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }
    if (numericValues[0] === 0) {
      notify(SCI_TOASTS.mustBeAboveZero('Number of Vessels Audited'));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateManningOfOwnedShips({
          updatefinancialYear: financialYear,
          updatenoofVesselsaudited: numericValues[0],
          updatenoofShipsfullycomplaint: numericValues[1],
          ScimanningIdOrg: editData.sci_manning_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Manning of Owned Ships'));
      } else {
        const response = await createManningOfOwnedShips({
          financialYear,
          noofVesselsaudited: numericValues[0],
          noofShipsfullycomplaint: numericValues[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Manning of Owned Ships'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving entry:', err);
      notify(SCI_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (invalid) =>
    `module-form-input${invalid ? ' !border-red-500' : ''}`;
  const labelCls = 'module-form-label';

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update Entry' : 'Add Entry'}
          </h3>
          <p className="module-form-banner-subtext">SCI - Manning of Owned Ships - % Compliance with STCW/MLC</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Financial Year <span className="text-red-500">*</span></label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              onBlur={() => handleBlur('financialYear')}
              disabled={isEdit}
              className={`${inputCls(isFieldInvalid('financialYear', financialYear))} cursor-pointer disabled:opacity-50 md:w-1/2`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isFieldInvalid('financialYear', financialYear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Number of Vessels Audited for Compliance <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noofVesselsaudited} onChange={(e) => setNoofVesselsaudited(e.target.value)} onBlur={() => handleBlur('noofVesselsaudited')} placeholder="e.g. 20" className={inputCls(isFieldInvalid('noofVesselsaudited', noofVesselsaudited))} />
            {isFieldInvalid('noofVesselsaudited', noofVesselsaudited) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Ships Fully Compliant with STCW & MLC Standards <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noofShipsfullycomplaint} onChange={(e) => setNoofShipsfullycomplaint(e.target.value)} onBlur={() => handleBlur('noofShipsfullycomplaint')} placeholder="e.g. 18" className={inputCls(isFieldInvalid('noofShipsfullycomplaint', noofShipsfullycomplaint))} />
            {isFieldInvalid('noofShipsfullycomplaint', noofShipsfullycomplaint) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>
        </div>

        <div className="flex items-center justify-between space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
          <div className="flex items-center space-x-3">
          {onBack && (
            <button type="button" onClick={onBack} className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
              Discard
            </button>
          )}
          <button type="submit" disabled={submitting} className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60">
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
