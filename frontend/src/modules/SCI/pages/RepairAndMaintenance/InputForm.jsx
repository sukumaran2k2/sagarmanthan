import { useState } from 'react';
import { Save } from 'lucide-react';
import { createRepairAndMaintenance, updateRepairAndMaintenance } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Confirmed from the legacy site: the Percentage field is a plain,
// manually-entered, required input -- not auto-computed from cost and
// revenue like IMU's Total E-Resources was. Kept as a normal input here.
export default function RepairAndMaintenanceInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [repairCosts, setRepairCosts] = useState(editData?.total_repair_and_maintanace_cost ?? '');
  const [operationalRevenue, setOperationalRevenue] = useState(editData?.total_operational_revenue ?? '');
  const [repairPercentage, setRepairPercentage] = useState(editData?.percentage_repair_and_maintanace_cost ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['repairCosts', repairCosts],
    ['operationalRevenue', operationalRevenue],
    ['repairPercentage', repairPercentage],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [repairCosts, operationalRevenue, repairPercentage].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateRepairAndMaintenance({
          updatefinancialYear: financialYear,
          updaterepairCosts: numericValues[0],
          updateoperationalRevenue: numericValues[1],
          updaterepairPercentage: numericValues[2],
          ScirepairandMaintanaceIdOrg: editData.sci_repair_and_maintanace_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Repair & Maintenance'));
      } else {
        const response = await createRepairAndMaintenance({
          financialYear,
          repairCosts: numericValues[0],
          operationalRevenue: numericValues[1],
          repairPercentage: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Repair & Maintenance'));
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
          <p className="module-form-banner-subtext">SCI - Repair & Maintenance Costs as % of Operational Revenue</p>
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
            <label className={labelCls}>Total Repair & Maintenance Costs (in Rs Lakhs) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={repairCosts} onChange={(e) => setRepairCosts(e.target.value)} onBlur={() => handleBlur('repairCosts')} placeholder="e.g. 4500" className={inputCls(isFieldInvalid('repairCosts', repairCosts))} />
            {isFieldInvalid('repairCosts', repairCosts) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Total Operational Revenue (in Rs Lakhs) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={operationalRevenue} onChange={(e) => setOperationalRevenue(e.target.value)} onBlur={() => handleBlur('operationalRevenue')} placeholder="e.g. 62000" className={inputCls(isFieldInvalid('operationalRevenue', operationalRevenue))} />
            {isFieldInvalid('operationalRevenue', operationalRevenue) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Repair & Maintenance Costs (%) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={repairPercentage} onChange={(e) => setRepairPercentage(e.target.value)} onBlur={() => handleBlur('repairPercentage')} placeholder="e.g. 7.3" className={inputCls(isFieldInvalid('repairPercentage', repairPercentage))} />
            {isFieldInvalid('repairPercentage', repairPercentage) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
