import { useState } from 'react';
import { Save } from 'lucide-react';
import { savePartnership } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { IMU_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// createimuPartnership is an upsert keyed on financial_year -- there's no
// separate update call to make.
export default function PartnershipInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [academicMoUsDomestic, setAcademicMoUsDomestic] = useState(editData?.academic_domestic ?? '');
  const [academicMoUsInternational, setAcademicMoUsInternational] = useState(editData?.academic_international ?? '');
  const [industryMoUsDomestic, setIndustryMoUsDomestic] = useState(editData?.industry_domestic ?? '');
  const [industryMoUsInternational, setIndustryMoUsInternational] = useState(editData?.industry_international ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['academicMoUsDomestic', academicMoUsDomestic],
    ['academicMoUsInternational', academicMoUsInternational],
    ['industryMoUsDomestic', industryMoUsDomestic],
    ['industryMoUsInternational', industryMoUsInternational],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [academicMoUsDomestic, academicMoUsInternational, industryMoUsDomestic, industryMoUsInternational].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(IMU_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      await savePartnership({
        financialYear,
        academicMoUsDomestic: numericValues[0],
        academicMoUsInternational: numericValues[1],
        industryMoUsDomestic: numericValues[2],
        industryMoUsInternational: numericValues[3],
        userID: getCurrentUserId(),
      });
      notify(isEdit ? IMU_TOASTS.updated('Partnership') : IMU_TOASTS.added('Partnership'));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Partnership entry:', err);
      notify(IMU_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
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
            {isEdit ? 'Update Partnership Entry' : 'Add Partnership Entry'}
          </h3>
          <p className="module-form-banner-subtext">IMU - Partnerships/MoUs - Academic & Industry</p>
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
            <label className={labelCls}>Academic Partnerships/MoUs - Domestic <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={academicMoUsDomestic} onChange={(e) => setAcademicMoUsDomestic(e.target.value)} onBlur={() => handleBlur('academicMoUsDomestic')} placeholder="e.g. 8" className={inputCls(isFieldInvalid('academicMoUsDomestic', academicMoUsDomestic))} />
            {isFieldInvalid('academicMoUsDomestic', academicMoUsDomestic) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Academic Partnerships/MoUs - International <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={academicMoUsInternational} onChange={(e) => setAcademicMoUsInternational(e.target.value)} onBlur={() => handleBlur('academicMoUsInternational')} placeholder="e.g. 3" className={inputCls(isFieldInvalid('academicMoUsInternational', academicMoUsInternational))} />
            {isFieldInvalid('academicMoUsInternational', academicMoUsInternational) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Industry Partnerships/MoUs - Domestic <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={industryMoUsDomestic} onChange={(e) => setIndustryMoUsDomestic(e.target.value)} onBlur={() => handleBlur('industryMoUsDomestic')} placeholder="e.g. 6" className={inputCls(isFieldInvalid('industryMoUsDomestic', industryMoUsDomestic))} />
            {isFieldInvalid('industryMoUsDomestic', industryMoUsDomestic) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Industry Partnerships/MoUs - International <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={industryMoUsInternational} onChange={(e) => setIndustryMoUsInternational(e.target.value)} onBlur={() => handleBlur('industryMoUsInternational')} placeholder="e.g. 2" className={inputCls(isFieldInvalid('industryMoUsInternational', industryMoUsInternational))} />
            {isFieldInvalid('industryMoUsInternational', industryMoUsInternational) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
