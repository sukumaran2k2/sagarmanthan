import { useState } from 'react';
import { Save } from 'lucide-react';
import { createSaleAndRecycling, updateSaleAndRecycling } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Confirmed from the legacy site: unlike K-6.2.2's Average Age (optional),
// all 3 fields here -- including Average Age -- are genuinely marked
// mandatory with both the red asterisk and the "mandatory" class.
export default function SaleAndRecyclingInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noOfoldvessels, setNoOfoldvessels] = useState(editData?.no_of_old_vessels_sold ?? '');
  const [valueOfsale, setValueOfsale] = useState(editData?.value_of_sale_proceeds ?? '');
  const [averageAge, setAverageAge] = useState(editData?.avg_age_of_old_vessels_sold ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['noOfoldvessels', noOfoldvessels],
    ['valueOfsale', valueOfsale],
    ['averageAge', averageAge],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [noOfoldvessels, valueOfsale, averageAge].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSaleAndRecycling({
          updateFinancialyear: financialYear,
          updatenoOfoldvessels: numericValues[0],
          updatevalueOfsale: numericValues[1],
          updateaverageAge: numericValues[2],
          ScisaleRecyclingIdOrg: editData.sci_sale_recycling_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Sale & Recycling of Old Vessels'));
      } else {
        const response = await createSaleAndRecycling({
          financialYear,
          noOfoldvessels: numericValues[0],
          valueOfsale: numericValues[1],
          averageAge: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Sale & Recycling of Old Vessels'));
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
          <p className="module-form-banner-subtext">SCI - Sale & Recycling of Old Vessels</p>
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
            <label className={labelCls}>Number of Old Vessels Sold <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noOfoldvessels} onChange={(e) => setNoOfoldvessels(e.target.value)} onBlur={() => handleBlur('noOfoldvessels')} placeholder="e.g. 3" className={inputCls(isFieldInvalid('noOfoldvessels', noOfoldvessels))} />
            {isFieldInvalid('noOfoldvessels', noOfoldvessels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Value of Sale Proceeds ($ million) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={valueOfsale} onChange={(e) => setValueOfsale(e.target.value)} onBlur={() => handleBlur('valueOfsale')} placeholder="e.g. 12.5" className={inputCls(isFieldInvalid('valueOfsale', valueOfsale))} />
            {isFieldInvalid('valueOfsale', valueOfsale) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Average Age of Old Vessels Sold (Years) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.1" value={averageAge} onChange={(e) => setAverageAge(e.target.value)} onBlur={() => handleBlur('averageAge')} placeholder="e.g. 22.5" className={`${inputCls(isFieldInvalid('averageAge', averageAge))} md:w-1/2`} />
            {isFieldInvalid('averageAge', averageAge) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
