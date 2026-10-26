import { useState } from 'react';
import { Save } from 'lucide-react';
import { createFabricationOfSteels, updateFabricationOfSteels } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { CSL_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Values preserved exactly as stored in the legacy site's dropdown --
// including its own typos ("Febraury", "Jully", "Auguet") -- since the
// value (not the label) is what's saved to the database, and rewriting it
// would break matching against any legacy month values already stored.
const MONTH_OPTIONS = [
  { value: 'January', label: 'January' },
  { value: 'Febraury', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'Jully', label: 'July' },
  { value: 'Auguet', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
];

// Month is intentionally optional here, matching the legacy site and the
// backend's existing behavior: leaving it blank routes the entry to a
// separate aggregation table (tbl_csl_fabrication_of_steels_update)
// instead of the main monthly table.
export default function FabricationOfSteelsInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [fabricationmonth, setFabricationmonth] = useState(editData?.month || '');
  const [fabricationOfSteels, setFabricationOfSteels] = useState(editData?.fabrication_of_steel_targets ?? '');
  const [fabrigationinTonns, setFabrigationinTonns] = useState(editData?.fabrication_of_steel_actual ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  // Month is deliberately excluded from required-field validation
  const FIELDS = [
    ['financialYear', financialYear],
    ['fabricationOfSteels', fabricationOfSteels],
    ['fabrigationinTonns', fabrigationinTonns],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [fabricationOfSteels, fabrigationinTonns].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(CSL_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateFabricationOfSteels({
          updatefinancialYear: financialYear,
          updatefabricationmonth: fabricationmonth,
          updatefabrigationOfsteels: numericValues[0],
          updatefabrigationinTonns: numericValues[1],
          CslfabricationIdOrg: editData.csl_fabrication_id,
          userID: getCurrentUserId(),
        });
        notify(CSL_TOASTS.updated('Fabrication of Steels'));
      } else {
        await createFabricationOfSteels({
          financialYear,
          fabricationmonth: fabricationmonth || undefined,
          fabricationOfSteels: numericValues[0],
          fabrigationinTonns: numericValues[1],
          userID: getCurrentUserId(),
        });
        notify(CSL_TOASTS.added('Fabrication of Steels'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Fabrication of Steels entry:', err);
      notify(CSL_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (invalid) => `module-form-input${invalid ? ' !border-red-500' : ''}`;
  const labelCls = 'module-form-label';

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update Fabrication of Steels Entry' : 'Add Fabrication of Steels Entry'}
          </h3>
          <p className="module-form-banner-subtext">CSL - Fabrication of Steels</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Financial Year <span className="text-red-500">*</span></label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              onBlur={() => handleBlur('financialYear')}
              disabled={isEdit}
              className={`${inputCls(isFieldInvalid('financialYear', financialYear))} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isFieldInvalid('financialYear', financialYear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Month <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
            <select
              value={fabricationmonth}
              onChange={(e) => setFabricationmonth(e.target.value)}
              disabled={isEdit}
              className={`${inputCls(false)} cursor-pointer disabled:opacity-50`}
            >
              <option value="">Select Month</option>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Fabrication Of Steel (In Tons) - Target <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={fabricationOfSteels}
              onChange={(e) => setFabricationOfSteels(e.target.value)}
              onBlur={() => handleBlur('fabricationOfSteels')}
              placeholder="e.g. 1200"
              className={inputCls(isFieldInvalid('fabricationOfSteels', fabricationOfSteels))}
            />
            {isFieldInvalid('fabricationOfSteels', fabricationOfSteels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Fabrication Of Steel (In Tons) - Actual <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={fabrigationinTonns}
              onChange={(e) => setFabrigationinTonns(e.target.value)}
              onBlur={() => handleBlur('fabrigationinTonns')}
              placeholder="e.g. 1050"
              className={inputCls(isFieldInvalid('fabrigationinTonns', fabrigationinTonns))}
            />
            {isFieldInvalid('fabrigationinTonns', fabrigationinTonns) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
