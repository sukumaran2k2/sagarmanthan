import { useState } from 'react';
import { Save } from 'lucide-react';
import { createSecondhandVesselProcurement, updateSecondhandVesselProcurement } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

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
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const requiredNumeric = [noofSecondhandships, grossvalueOfsecondhandships].map(Number);
    if (requiredNumeric.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }
    if (averageageofSecondhandships !== '' && (isNaN(Number(averageageofSecondhandships)) || Number(averageageofSecondhandships) < 0)) {
      triggerNotification ? triggerNotification('Please enter a valid, non-negative Average Age.', 'error') : alert('Please enter a valid, non-negative Average Age.');
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
        triggerNotification && triggerNotification('Secondhand Vessel Procurement entry updated successfully', 'success');
      } else {
        const response = await createSecondhandVesselProcurement({
          financialYear,
          noofSecondhandships: requiredNumeric[0],
          averageageofSecondhandships: averageageofSecondhandships === '' ? null : Number(averageageofSecondhandships),
          grossvalueOfsecondhandships: requiredNumeric[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Secondhand Vessel Procurement entry added successfully', 'success');
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
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">SCI - Vessel Procurement - Secondhand</p>
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
