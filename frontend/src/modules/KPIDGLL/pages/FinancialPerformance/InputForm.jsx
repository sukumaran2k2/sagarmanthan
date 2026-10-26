import { useState } from 'react';
import { Save } from 'lucide-react';
import { submitFinancialPerformance } from '../../api';
import { getCurrentUserId, getSessionOrganisationId, getSessionOrganisationName } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGLL_TOASTS } from '../../toastMessages';

// Financial year range matches the pattern used elsewhere in KPI DGLL
// (2012-2013 through 2028-2029), generated programmatically.
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const start = 2012 + i;
  return `${start}-${start + 1}`;
});

// submitFinancialPerformance is an upsert on the backend keyed on financial
// year -- there's no separate update endpoint, so this form always calls the
// same submit function whether creating a new year or editing an existing one.
export default function FinancialPerformanceInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financialyear || '');
  const [lightDuesCollect, setLightDuesCollect] = useState(editData?.revenue_light_dues_collection ?? '');
  const [revenueFromTourism, setRevenueFromTourism] = useState(editData?.revenue_from_tourism ?? '');
  const [subsidesFromGovt, setSubsidesFromGovt] = useState(editData?.subsidies_from_govt ?? '');
  const [operatingCoasts, setOperatingCoasts] = useState(editData?.operating_costs ?? '');
  const [capitalExpenditure, setCapitalExpenditure] = useState(editData?.capital_expenditure ?? '');
  const [tourismDevelopmentCosts, setTourismDevelopmentCosts] = useState(editData?.tourism_develop_cost ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['lightDuesCollect', lightDuesCollect],
    ['revenueFromTourism', revenueFromTourism],
    ['subsidesFromGovt', subsidesFromGovt],
    ['operatingCoasts', operatingCoasts],
    ['capitalExpenditure', capitalExpenditure],
    ['tourismDevelopmentCosts', tourismDevelopmentCosts],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [lightDuesCollect, revenueFromTourism, subsidesFromGovt, operatingCoasts, capitalExpenditure, tourismDevelopmentCosts].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(DGLL_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      await submitFinancialPerformance({
        financialId: editData?.financial_id,
        financialYear,
        lightDuesCollect: numericValues[0],
        revenueFromTourism: numericValues[1],
        subsidesFromGovt: numericValues[2],
        operatingCoasts: numericValues[3],
        capitalExpenditure: numericValues[4],
        tourismDevelopmentCosts: numericValues[5],
        userID: getCurrentUserId(),
        organisationID: getSessionOrganisationId(),
        organisationName: getSessionOrganisationName(),
      });
      notify(isEdit ? DGLL_TOASTS.updated('Financial Performance') : DGLL_TOASTS.added('Financial Performance'));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Financial Performance entry:', err);
      notify(DGLL_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
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
            {isEdit ? 'Update Financial Performance Entry' : 'Add Financial Performance Entry'}
          </h3>
          <p className="module-form-banner-subtext">DGLL - Financial Performance</p>
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
              className={`${inputCls(isFieldInvalid('financialYear', financialYear))} cursor-pointer disabled:opacity-50 md:max-w-xs`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isFieldInvalid('financialYear', financialYear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Revenue from Light Dues Collection (Head: 1051) (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={lightDuesCollect}
              onChange={(e) => setLightDuesCollect(e.target.value)}
              onBlur={() => handleBlur('lightDuesCollect')}
              placeholder="e.g. 45.50"
              className={inputCls(isFieldInvalid('lightDuesCollect', lightDuesCollect))}
            />
            {isFieldInvalid('lightDuesCollect', lightDuesCollect) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Revenue from Tourism/Heritage Sites (LKRB) (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={revenueFromTourism}
              onChange={(e) => setRevenueFromTourism(e.target.value)}
              onBlur={() => handleBlur('revenueFromTourism')}
              placeholder="e.g. 12.30"
              className={inputCls(isFieldInvalid('revenueFromTourism', revenueFromTourism))}
            />
            {isFieldInvalid('revenueFromTourism', revenueFromTourism) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Grants/Subsidies from Government (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={subsidesFromGovt}
              onChange={(e) => setSubsidesFromGovt(e.target.value)}
              onBlur={() => handleBlur('subsidesFromGovt')}
              placeholder="e.g. 8.00"
              className={inputCls(isFieldInvalid('subsidesFromGovt', subsidesFromGovt))}
            />
            {isFieldInvalid('subsidesFromGovt', subsidesFromGovt) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Operating Costs (Head: 3051) (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={operatingCoasts}
              onChange={(e) => setOperatingCoasts(e.target.value)}
              onBlur={() => handleBlur('operatingCoasts')}
              placeholder="e.g. 22.75"
              className={inputCls(isFieldInvalid('operatingCoasts', operatingCoasts))}
            />
            {isFieldInvalid('operatingCoasts', operatingCoasts) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Capital Expenditure (Head: 5051) (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={capitalExpenditure}
              onChange={(e) => setCapitalExpenditure(e.target.value)}
              onBlur={() => handleBlur('capitalExpenditure')}
              placeholder="e.g. 15.00"
              className={inputCls(isFieldInvalid('capitalExpenditure', capitalExpenditure))}
            />
            {isFieldInvalid('capitalExpenditure', capitalExpenditure) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Tourism Development Costs (included in 5051) (In Cr.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.01" value={tourismDevelopmentCosts}
              onChange={(e) => setTourismDevelopmentCosts(e.target.value)}
              onBlur={() => handleBlur('tourismDevelopmentCosts')}
              placeholder="e.g. 5.25"
              className={inputCls(isFieldInvalid('tourismDevelopmentCosts', tourismDevelopmentCosts))}
            />
            {isFieldInvalid('tourismDevelopmentCosts', tourismDevelopmentCosts) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
