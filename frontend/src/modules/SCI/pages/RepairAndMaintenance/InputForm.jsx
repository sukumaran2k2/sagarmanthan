import { useState } from 'react';
import { Save } from 'lucide-react';
import { createRepairAndMaintenance, updateRepairAndMaintenance } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

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
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [repairCosts, operationalRevenue, repairPercentage].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
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
        triggerNotification && triggerNotification('Repair & Maintenance entry updated successfully', 'success');
      } else {
        const response = await createRepairAndMaintenance({
          financialYear,
          repairCosts: numericValues[0],
          operationalRevenue: numericValues[1],
          repairPercentage: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Repair & Maintenance entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving entry:', err);
      triggerNotification ? triggerNotification('Failed to save entry.', 'error') : alert('Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (invalid) =>
    `w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${invalid ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`;
  const labelCls = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update Entry' : 'Add Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">SCI - Repair & Maintenance Costs as % of Operational Revenue</p>
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
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Fields marked with <span className="text-red-500">*</span> are mandatory.</p>
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
