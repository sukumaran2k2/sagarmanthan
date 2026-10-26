import { useState } from 'react';
import { Save } from 'lucide-react';
import { createCapacityUtilization, updateCapacityUtilization } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { CSL_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

export default function CapacityUtilizationInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [shipbuildingCapacity, setShipbuildingCapacity] = useState(editData?.total_shipbuilding_capacity ?? '');
  const [tonnageofVesselsBuilt, setTonnageofVesselsBuilt] = useState(editData?.tonnage_of_vessels ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['shipbuildingCapacity', shipbuildingCapacity],
    ['tonnageofVesselsBuilt', tonnageofVesselsBuilt],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [shipbuildingCapacity, tonnageofVesselsBuilt].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(CSL_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCapacityUtilization({
          updatefinancialYear: financialYear,
          updateshipbuildingCapacity: numericValues[0],
          updatetonnageofVesselsBuilt: numericValues[1],
          CslcapacityUtilizationIdOrg: editData.csl_capacity_utilization_id,
          userID: getCurrentUserId(),
        });
        notify(CSL_TOASTS.updated('Capacity Utilization'));
      } else {
        const response = await createCapacityUtilization({
          financialYear,
          shipbuildingCapacity: numericValues[0],
          tonnageofVesselsBuilt: numericValues[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(CSL_TOASTS.duplicate('financial year'));
          setSubmitting(false);
          return;
        }
        notify(CSL_TOASTS.added('Capacity Utilization'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Capacity Utilization entry:', err);
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
            {isEdit ? 'Update Capacity Utilization Entry' : 'Add Capacity Utilization Entry'}
          </h3>
          <p className="module-form-banner-subtext">CSL - Capacity Utilization</p>
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
            <label className={labelCls}>Total Shipbuilding Capacity (GT/Year) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={shipbuildingCapacity}
              onChange={(e) => setShipbuildingCapacity(e.target.value)}
              onBlur={() => handleBlur('shipbuildingCapacity')}
              placeholder="e.g. 500000"
              className={inputCls(isFieldInvalid('shipbuildingCapacity', shipbuildingCapacity))}
            />
            {isFieldInvalid('shipbuildingCapacity', shipbuildingCapacity) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Tonnage Of Vessels Built (GT) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={tonnageofVesselsBuilt}
              onChange={(e) => setTonnageofVesselsBuilt(e.target.value)}
              onBlur={() => handleBlur('tonnageofVesselsBuilt')}
              placeholder="e.g. 240000"
              className={inputCls(isFieldInvalid('tonnageofVesselsBuilt', tonnageofVesselsBuilt))}
            />
            {isFieldInvalid('tonnageofVesselsBuilt', tonnageofVesselsBuilt) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
