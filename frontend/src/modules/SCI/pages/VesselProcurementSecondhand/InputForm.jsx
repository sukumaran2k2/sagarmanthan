import { useState } from 'react';
import { Save } from 'lucide-react';
import { createSecondhandVesselProcurement, updateSecondhandVesselProcurement } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Average Age is confirmed from the legacy site to have no "required"
// attribute and no red asterisk, unlike the other two fields -- kept
// optional here to match exactly.
export default function SecondhandVesselProcurementInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noofSecondhandships, setNoofSecondhandships] = useState(editData?.total_no_of_secondhand_ships_procured ?? '');
  const [averageageofSecondhandships, setAverageageofSecondhandships] = useState(editData?.average_age_of_secondhand_ships_procured ?? '');
  const [grossvalueOfsecondhandships, setGrossvalueOfsecondhandships] = useState(editData?.gross_value_of_secondhand_ships_procured ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  // Average Age deliberately excluded from required-field validation
  const FIELDS = [
    ['financialYear', financialYear],
    ['noofSecondhandships', noofSecondhandships],
    ['grossvalueOfsecondhandships', grossvalueOfsecondhandships],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const requiredNumeric = [noofSecondhandships, grossvalueOfsecondhandships].map(Number);
    if (requiredNumeric.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }
    if (averageageofSecondhandships !== '' && (isNaN(Number(averageageofSecondhandships)) || Number(averageageofSecondhandships) < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSecondhandVesselProcurement({
          updateFinancialyear: financialYear,
          updateNoofSecondhandships: requiredNumeric[0],
          updateaverageageofSecondhandships: averageageofSecondhandships === '' ? null : Number(averageageofSecondhandships),
          updateGrossvalueofSecondhandships: requiredNumeric[1],
          ScisecondhandProcurementIdOrg: editData.sci_secondhand_procurement_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Secondhand Vessel Procurement'));
      } else {
        const response = await createSecondhandVesselProcurement({
          financialYear,
          noofSecondhandships: requiredNumeric[0],
          averageageofSecondhandships: averageageofSecondhandships === '' ? null : Number(averageageofSecondhandships),
          grossvalueOfsecondhandships: requiredNumeric[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Secondhand Vessel Procurement'));
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
          <p className="module-form-banner-subtext">SCI - Vessel Procurement - Secondhand</p>
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
            <label className={labelCls}>Total Number of Secondhand Ships Procured <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noofSecondhandships} onChange={(e) => setNoofSecondhandships(e.target.value)} onBlur={() => handleBlur('noofSecondhandships')} placeholder="e.g. 2" className={inputCls(isFieldInvalid('noofSecondhandships', noofSecondhandships))} />
            {isFieldInvalid('noofSecondhandships', noofSecondhandships) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Average Age of Secondhand Ships Procured <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
            <input type="number" min="0" step="0.1" value={averageageofSecondhandships} onChange={(e) => setAverageageofSecondhandships(e.target.value)} placeholder="e.g. 8.5" className={inputCls(false)} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Gross Value of Secondhand Ships Procured (USD in millions) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={grossvalueOfsecondhandships} onChange={(e) => setGrossvalueOfsecondhandships(e.target.value)} onBlur={() => handleBlur('grossvalueOfsecondhandships')} placeholder="e.g. 22.5" className={inputCls(isFieldInvalid('grossvalueOfsecondhandships', grossvalueOfsecondhandships))} />
            {isFieldInvalid('grossvalueOfsecondhandships', grossvalueOfsecondhandships) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
