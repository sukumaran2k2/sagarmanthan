import { useState } from 'react';
import { Save } from 'lucide-react';
import { createFabricationOfSteels, updateFabricationOfSteels } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Values preserved exactly as stored in the legacy site's dropdown --
// including its own typos ("Febraury", "Jully", "Auguet") -- since the
// value (not the label) is what's saved to the database, and rewriting it
// would break matching against any legacy month values already stored.
const MONTH_OPTIONS = [
  { value: 'January', label: 'January' },
  { value: 'Febraury', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'Jully', label: 'July' },
  { value: 'Auguet', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
];

// Month is intentionally optional here, matching the legacy site and the
// backend's existing behavior: leaving it blank routes the entry to a
// separate aggregation table (tbl_csl_fabrication_of_steels_update)
// instead of the main monthly table.
export default function FabricationOfSteelsInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [fabricationmonth, setFabricationmonth] = useState(editData?.month || '');
  const [fabricationOfSteels, setFabricationOfSteels] = useState(editData?.fabrication_of_steel_targets ?? '');
  const [fabrigationinTonns, setFabrigationinTonns] = useState(editData?.fabrication_of_steel_actual ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  // Month is deliberately excluded from required-field validation
  const FIELDS = [
    ['financialYear', financialYear],
    ['fabricationOfSteels', fabricationOfSteels],
    ['fabrigationinTonns', fabrigationinTonns],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [fabricationOfSteels, fabrigationinTonns].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateFabricationOfSteels({
          updatefinancialYear: financialYear,
          updatefabricationmonth: fabricationmonth,
          updatefabrigationOfsteels: numericValues[0],
          updatefabrigationinTonns: numericValues[1],
          CslfabricationIdOrg: editData.csl_fabrication_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Fabrication of Steels entry updated successfully', 'success');
      } else {
        await createFabricationOfSteels({
          financialYear,
          fabricationmonth: fabricationmonth || undefined,
          fabricationOfSteels: numericValues[0],
          fabrigationinTonns: numericValues[1],
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Fabrication of Steels entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Fabrication of Steels entry:', err);
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
            {isEdit ? 'Update Fabrication of Steels Entry' : 'Add Fabrication of Steels Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">CSL - Fabrication of Steels</p>
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
            <label className={labelCls}>Month <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
            <select
              value={fabricationmonth}
              onChange={(e) => setFabricationmonth(e.target.value)}
              disabled={isEdit}
              className={`${inputCls(false)} cursor-pointer disabled:opacity-50`}
            >
              <option value="">Select Month</option>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Fabrication Of Steel (In Tons) - Target <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={fabricationOfSteels}
              onChange={(e) => setFabricationOfSteels(e.target.value)}
              onBlur={() => handleBlur('fabricationOfSteels')}
              placeholder="e.g. 1200"
              className={inputCls(isFieldInvalid('fabricationOfSteels', fabricationOfSteels))}
            />
            {isFieldInvalid('fabricationOfSteels', fabricationOfSteels) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Fabrication Of Steel (In Tons) - Actual <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={fabrigationinTonns}
              onChange={(e) => setFabrigationinTonns(e.target.value)}
              onBlur={() => handleBlur('fabrigationinTonns')}
              placeholder="e.g. 1050"
              className={inputCls(isFieldInvalid('fabrigationinTonns', fabrigationinTonns))}
            />
            {isFieldInvalid('fabrigationinTonns', fabrigationinTonns) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
