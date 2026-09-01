import { useState } from 'react';
import { Save } from 'lucide-react';
import { createVesselsBuilt, updateVesselsBuilt } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

// Financial year range confirmed from the legacy site's actual dropdown
// (2014-2015 through 2028-2029) -- a narrower range than DGLL's, generated
// programmatically rather than hand-listed to avoid copy-paste errors.
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

export default function VesselsBuiltInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [vesselsBuilt, setVesselsBuilt] = useState(editData?.no_of_vessels_built ?? '');
  const [tonnageVessels, setTonnageVessels] = useState(editData?.tonnage_of_vessels_built ?? '');
  const [valueofVessels, setValueofVessels] = useState(editData?.value_of_vessels_built ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['vesselsBuilt', vesselsBuilt],
    ['tonnageVessels', tonnageVessels],
    ['valueofVessels', valueofVessels],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [vesselsBuilt, tonnageVessels, valueofVessels].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateVesselsBuilt({
          updatefinancialYear: financialYear,
          updatenoofVesselsBuilt: numericValues[0],
          updateTonnageVessels: numericValues[1],
          updateValueofVessels: numericValues[2],
          VesselIdOrg: editData.csl_vessel_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Vessels Built entry updated successfully', 'success');
      } else {
        const response = await createVesselsBuilt({
          financialYear,
          vesselsBuilt: numericValues[0],
          tonnageVessels: numericValues[1],
          valueofVessels: numericValues[2],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Vessels Built entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Vessels Built entry:', err);
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
            {isEdit ? 'Update Vessels Built Entry' : 'Add Vessels Built Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">CSL - Vessels Built</p>
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
            <label className={labelCls}>Number Of Vessels Built <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={vesselsBuilt}
              onChange={(e) => setVesselsBuilt(e.target.value)}
              onBlur={() => handleBlur('vesselsBuilt')}
              placeholder="e.g. 4"
              className={inputCls(isFieldInvalid('vesselsBuilt', vesselsBuilt))}
            />
            {isFieldInvalid('vesselsBuilt', vesselsBuilt) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Tonnage Of Vessels Built (GT) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="any" value={tonnageVessels}
              onChange={(e) => setTonnageVessels(e.target.value)}
              onBlur={() => handleBlur('tonnageVessels')}
              placeholder="e.g. 12500"
              className={inputCls(isFieldInvalid('tonnageVessels', tonnageVessels))}
            />
            {isFieldInvalid('tonnageVessels', tonnageVessels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Value Of Vessels Built (INR Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={valueofVessels}
              onChange={(e) => setValueofVessels(e.target.value)}
              onBlur={() => handleBlur('valueofVessels')}
              placeholder="e.g. 250.50"
              className={inputCls(isFieldInvalid('valueofVessels', valueofVessels))}
            />
            {isFieldInvalid('valueofVessels', valueofVessels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
