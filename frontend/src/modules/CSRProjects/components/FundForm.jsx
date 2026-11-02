import { useState } from 'react';
import { Save } from 'lucide-react';
import { createCsrFund, updateCsrFund } from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { CSR_TOASTS } from '../toastMessages';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { croreInput, croreToLakh } from '../utils/amounts';

const FIELDS = [
  { key: 'netProfit', label: 'Net Profit (₹ Cr)' },
  { key: 'openingBalance', label: 'Opening Balance under CSR Fund (₹ Cr)' },
  { key: 'fundAllotted', label: 'CSR Fund Allotted for the Year (₹ Cr)' },
];

const initialValues = (fund) => ({
  financialYear: fund?.financial_year || FINANCIAL_YEARS[0],
  netProfit: croreInput(fund?.net_profit),
  openingBalance: croreInput(fund?.opening_balance_csr),
  fundAllotted: croreInput(fund?.csr_fund_alloted_year),
});

const isAmount = (v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;

/**
 * Add or update a CSR fund record, used by the Input Form's fund tab and the Fund Details
 * window. Amounts are entered in crore and stored in lakh. The organisation is the user's own (the server
 * also takes it from the login), so it is shown, not chosen.
 */
export default function FundForm({ fund = null, organisationName, notify, onSaved, onCancel, cancelLabel = 'Cancel' }) {
  const isEdit = !!fund;
  const [values, setValues] = useState(() => initialValues(fund));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!values.financialYear) errs.financialYear = 'Financial Year is required.';
    FIELDS.forEach((f) => {
      if (!isAmount(values[f.key])) errs[f.key] = `Enter the ${f.label.replace(' (₹ Cr)', '')} (0 or more).`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }

    // Field names as the server reads them (2.0 contract)
    const payload = {
      financialYear: values.financialYear,
      netProfit: croreToLakh(values.netProfit),
      openingBalanceCSR: croreToLakh(values.openingBalance),
      csrFundAllotedForYear: croreToLakh(values.fundAllotted),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCsrFund({ ...payload, csrFundId: fund.csr_fund_id });
        notify(CSR_TOASTS.fundUpdated(values.financialYear));
      } else {
        await createCsrFund(payload);
        notify(CSR_TOASTS.fundCreated(values.financialYear));
      }
      onSaved?.();
    } catch (err) {
      console.error('Error saving CSR fund:', err);
      notify(CSR_TOASTS.fundSaveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (key) => `module-form-input ${errors[key] ? '!border-red-500' : ''}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="module-form-label">Organisation</label>
          <div className="module-form-input bg-slate-100 dark:bg-slate-800 cursor-not-allowed">{organisationName || 'Your organisation'}</div>
        </div>
        <div>
          <label className="module-form-label">Financial Year <span className="text-red-500">*</span></label>
          <select
            value={values.financialYear}
            onChange={(e) => setValue('financialYear', e.target.value)}
            className={`module-form-select ${errors.financialYear ? '!border-red-500' : ''}`}
          >
            {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="module-form-label">{f.label} <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.00"
              value={values[f.key]}
              onChange={(e) => setValue(f.key, e.target.value)}
              className={inputClass(f.key)}
            />
            {errors[f.key] && <p className="text-[10px] font-bold text-red-500 mt-1">{errors[f.key]}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs text-rose-500 font-bold italic">* Asterisks marked with red are mandatory fields</span>
        <div className="flex items-center space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : isEdit ? 'Update Fund' : 'Save Fund'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
