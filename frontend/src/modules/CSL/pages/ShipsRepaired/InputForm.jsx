import { useState } from 'react';
import { Save } from 'lucide-react';
import { createShipsRepaired, updateShipsRepaired } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { CSL_TOASTS } from '../../toastMessages';

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

export default function ShipsRepairedInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [financialQuater, setFinancialQuater] = useState(editData?.financial_quater || '');
  const [noOfshipsrepaired, setNoOfshipsrepaired] = useState(editData?.no_of_ships_repaired ?? '');
  const [valueOfshipsrepaired, setValueOfshipsrepaired] = useState(editData?.value_of_ships_repaired ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['financialQuater', financialQuater],
    ['noOfshipsrepaired', noOfshipsrepaired],
    ['valueOfshipsrepaired', valueOfshipsrepaired],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [noOfshipsrepaired, valueOfshipsrepaired].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(CSL_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateShipsRepaired({
          updatefinancialYear: financialYear,
          updatefinancialQuater: financialQuater,
          updatenoOfshipsrepaired: numericValues[0],
          updatevalueOfshipsrepaired: numericValues[1],
          CslreapiredIdOrg: editData.csl_ships_reapired_id,
          userID: getCurrentUserId(),
        });
        notify(CSL_TOASTS.updated('Ships Repaired'));
      } else {
        const response = await createShipsRepaired({
          financialYear,
          financialQuater,
          noOfshipsrepaired: numericValues[0],
          valueOfshipsrepaired: numericValues[1],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(CSL_TOASTS.duplicate('financial year and quarter'));
          setSubmitting(false);
          return;
        }
        notify(CSL_TOASTS.added('Ships Repaired'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Ships Repaired entry:', err);
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
            {isEdit ? 'Update Ships Repaired Entry' : 'Add Ships Repaired Entry'}
          </h3>
          <p className="module-form-banner-subtext">CSL - Ships Repaired</p>
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
            <label className={labelCls}>Number Of Ships Repaired <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={noOfshipsrepaired}
              onChange={(e) => setNoOfshipsrepaired(e.target.value)}
              onBlur={() => handleBlur('noOfshipsrepaired')}
              placeholder="e.g. 4"
              className={inputCls(isFieldInvalid('noOfshipsrepaired', noOfshipsrepaired))}
            />
            {isFieldInvalid('noOfshipsrepaired', noOfshipsrepaired) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Value Of Ship Repair Completed (INR Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={valueOfshipsrepaired}
              onChange={(e) => setValueOfshipsrepaired(e.target.value)}
              onBlur={() => handleBlur('valueOfshipsrepaired')}
              placeholder="e.g. 85.50"
              className={inputCls(isFieldInvalid('valueOfshipsrepaired', valueOfshipsrepaired))}
            />
            {isFieldInvalid('valueOfshipsrepaired', valueOfshipsrepaired) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
