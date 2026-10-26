import { useState } from 'react';
import { Save } from 'lucide-react';
import { createSaleAndGreenRecycling, updateSaleAndGreenRecycling } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

export default function SaleAndGreenRecyclingInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [vesselssold, setVesselssold] = useState(editData?.no_of_old_vessels_sold_for_recycling ?? '');
  const [valueofVessels, setValueofVessels] = useState(editData?.value_of_recycled_vessels ?? '');
  const [adherencetoGreenrecycling, setAdherencetoGreenrecycling] = useState(editData?.adherence_green_recycling ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['vesselssold', vesselssold],
    ['valueofVessels', valueofVessels],
    ['adherencetoGreenrecycling', adherencetoGreenrecycling],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [vesselssold, valueofVessels, adherencetoGreenrecycling].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }
    if (numericValues[2] > 100) {
      notify(SCI_TOASTS.percentOver100('Adherence to Green Recycling Standards'));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSaleAndGreenRecycling({
          updateFinancialyear: financialYear,
          updatevesselssold: numericValues[0],
          updatevalueofVessels: numericValues[1],
          updateadherencetoGreenrecycling: numericValues[2],
          ScisaleGreenrecyclingIdOrg: editData.sci_sale_green_recycling_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Sale & Green Recycling'));
      } else {
        const response = await createSaleAndGreenRecycling({
          financialYear,
          vesselssold: numericValues[0],
          valueofVessels: numericValues[1],
          adherencetoGreenrecycling: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Sale & Green Recycling'));
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
          <p className="module-form-banner-subtext">SCI - Sale & Recycling of Old Vessels - Green Recycling</p>
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
            <label className={labelCls}>Number of Vessels Sold for Recycling <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={vesselssold} onChange={(e) => setVesselssold(e.target.value)} onBlur={() => handleBlur('vesselssold')} placeholder="e.g. 2" className={inputCls(isFieldInvalid('vesselssold', vesselssold))} />
            {isFieldInvalid('vesselssold', vesselssold) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Value of Recycled Vessels ($ million) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={valueofVessels} onChange={(e) => setValueofVessels(e.target.value)} onBlur={() => handleBlur('valueofVessels')} placeholder="e.g. 8.2" className={inputCls(isFieldInvalid('valueofVessels', valueofVessels))} />
            {isFieldInvalid('valueofVessels', valueofVessels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Adherence to Green Recycling Stds (%) <span className="text-red-500">*</span></label>
            <input type="number" min="0" max="100" step="0.01" value={adherencetoGreenrecycling} onChange={(e) => setAdherencetoGreenrecycling(e.target.value)} onBlur={() => handleBlur('adherencetoGreenrecycling')} placeholder="e.g. 95.5" className={`${inputCls(isFieldInvalid('adherencetoGreenrecycling', adherencetoGreenrecycling))} md:w-1/2`} />
            {isFieldInvalid('adherencetoGreenrecycling', adherencetoGreenrecycling) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
