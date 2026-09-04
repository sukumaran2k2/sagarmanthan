import { useState } from 'react';
import { Save } from 'lucide-react';
import { createVesselAvailabilityLiner, updateVesselAvailabilityLiner } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

export default function VesselAvailabilityLinerInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [totallinearfleet, setTotallinearfleet] = useState(editData?.total_no_of_linear_vessels_in_fleet ?? '');
  const [totalrevenue, setTotalrevenue] = useState(editData?.total_revenue_of_linear_vessels ?? '');
  const [averageEarnings, setAverageEarnings] = useState(editData?.average_earnings_linear_vessels_perday ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['totallinearfleet', totallinearfleet],
    ['totalrevenue', totalrevenue],
    ['averageEarnings', averageEarnings],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [totallinearfleet, totalrevenue, averageEarnings].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateVesselAvailabilityLiner({
          updatefinancialYear: financialYear,
          updatelinearfleet: numericValues[0],
          updateRevenue: numericValues[1],
          updateAverage: numericValues[2],
          SciLinearvesselIdOrg: editData.sci_vessel_availability_bulk_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Vessel Availability (Liner) entry updated successfully', 'success');
      } else {
        const response = await createVesselAvailabilityLiner({
          financialYear,
          totallinearfleet: numericValues[0],
          totalrevenue: numericValues[1],
          averageEarnings: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Vessel Availability (Liner) entry added successfully', 'success');
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

  const numberField = (label, value, setter, key, placeholder) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label} <span className="text-red-500">*</span></label>
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => setter(e.target.value)} onBlur={() => handleBlur(key)} placeholder={placeholder} className={inputCls(isFieldInvalid(key, value))} />
      {isFieldInvalid(key, value) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update Entry' : 'Add Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">SCI - Vessel Availability/Utilization - Liner (Owned + Chartered)</p>
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

          {numberField('Total Number of Liner Vessels in Fleet (Owned + Chartered)', totallinearfleet, setTotallinearfleet, 'totallinearfleet', 'e.g. 10')}
          {numberField('Total Revenue (Rs. in Crs.)', totalrevenue, setTotalrevenue, 'totalrevenue', 'e.g. 150.5')}
          {numberField('Average Earnings per Day (US $)', averageEarnings, setAverageEarnings, 'averageEarnings', 'e.g. 15000')}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
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
      </form>
    </div>
  );
}
