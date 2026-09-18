import { useState } from 'react';
import { Save } from 'lucide-react';
import { createShipDeliveryPerformance, updateShipDeliveryPerformance } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

const QUARTER_OPTIONS = [
  { value: 'Q1', label: 'Q1 (Apr - Jun)' },
  { value: 'Q2', label: 'Q2 (Jul - Sep)' },
  { value: 'Q3', label: 'Q3 (Oct - Dec)' },
  { value: 'Q4', label: 'Q4 (Jan - Mar)' },
];

export default function ShipDeliveryPerformanceInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [financialQuater, setFinancialQuater] = useState(editData?.financial_quater || '');
  const [noOfshipsReceived, setNoOfshipsReceived] = useState(editData?.total_no_ship_orders_received ?? '');
  const [noOfshipsDeleivered, setNoOfshipsDeleivered] = useState(editData?.no_of_ships_delivered ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['financialQuater', financialQuater],
    ['noOfshipsReceived', noOfshipsReceived],
    ['noOfshipsDeleivered', noOfshipsDeleivered],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [noOfshipsReceived, noOfshipsDeleivered].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateShipDeliveryPerformance({
          updatefinancialYear: financialYear,
          updatefinancialQuater: financialQuater,
          updateShiporders: numericValues[0],
          updateShipsdelivered: numericValues[1],
          CslshipdeliveryIdOrg: editData.csl_shipdelivery_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Ship Delivery Performance entry updated successfully', 'success');
      } else {
        const response = await createShipDeliveryPerformance({
          financialYear,
          financialQuater,
          noOfshipsReceived: numericValues[0],
          noOfshipsDeleivered: numericValues[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year and quarter.', 'error')
            : alert('Data already exists for the selected financial year and quarter.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Ship Delivery Performance entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Ship Delivery Performance entry:', err);
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
            {isEdit ? 'Update Ship Delivery Performance Entry' : 'Add Ship Delivery Performance Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">CSL - Ship Delivery Performance</p>
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
            <label className={labelCls}>Financial Quarter <span className="text-red-500">*</span></label>
            <select
              value={financialQuater}
              onChange={(e) => setFinancialQuater(e.target.value)}
              onBlur={() => handleBlur('financialQuater')}
              disabled={isEdit}
              className={`${inputCls(isFieldInvalid('financialQuater', financialQuater))} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Quarter--</option>
              {QUARTER_OPTIONS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
            {isFieldInvalid('financialQuater', financialQuater) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Total No Of Ship Orders Received <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={noOfshipsReceived}
              onChange={(e) => setNoOfshipsReceived(e.target.value)}
              onBlur={() => handleBlur('noOfshipsReceived')}
              placeholder="e.g. 5"
              className={inputCls(isFieldInvalid('noOfshipsReceived', noOfshipsReceived))}
            />
            {isFieldInvalid('noOfshipsReceived', noOfshipsReceived) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>No Of Ships Delivered on Time <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={noOfshipsDeleivered}
              onChange={(e) => setNoOfshipsDeleivered(e.target.value)}
              onBlur={() => handleBlur('noOfshipsDeleivered')}
              placeholder="e.g. 3"
              className={inputCls(isFieldInvalid('noOfshipsDeleivered', noOfshipsDeleivered))}
            />
            {isFieldInvalid('noOfshipsDeleivered', noOfshipsDeleivered) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
