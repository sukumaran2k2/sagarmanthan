import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { createCsrFund, updateCsrFund, fetchCsrFundList } from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { CSR_TOASTS } from '../toastMessages';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { croreInput, croreToLakh, formatCrore } from '../utils/amounts';

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

// Above this an amount gets a 'check it is in crore' note (QC CSR-41), as on the project form
const LARGE_CRORE = 100;

// '2026-2027' -> '2025-2026'
const previousYear = (fy) => {
  const start = Number(String(fy || '').slice(0, 4));
  return start ? `${start - 1}-${start}` : null;
};

// 0 or more, and within the columns (decimal(12,2) in lakh): at most ₹99,999,999 Cr
const isAmount = (v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99999999;

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
  // Years the organisation already has a fund entry for (another one, when editing) can't be
  // picked again; the server also refuses a duplicate (QC CSR-42)
  const [takenYears, setTakenYears] = useState([]);
  // The organisation's fund entries, for last year's closing balance (QC CSR-46)
  const [ownFunds, setOwnFunds] = useState([]);
  // Once the user types an opening balance, it is no longer filled in for them
  const [openingTouched, setOpeningTouched] = useState(isEdit);

  useEffect(() => {
    let current = true;
    fetchCsrFundList()
      .then((rows) => {
        if (!current) return;
        const own = (rows || []).filter((r) => fund?.organisation_id == null || r.organisation_id === fund.organisation_id);
        setOwnFunds(own);
        const taken = own.filter((r) => r.csr_fund_id !== fund?.csr_fund_id).map((r) => r.financial_year);
        setTakenYears(taken);
        // A new entry starts on the first free year
        if (!fund) {
          setValues((v) => (taken.includes(v.financialYear)
            ? { ...v, financialYear: FINANCIAL_YEARS.find((fy) => !taken.includes(fy)) || '' }
            : v));
        }
      })
      .catch((err) => console.error('Error loading existing CSR fund years:', err));
    return () => { current = false; };
  }, [fund]);

  // Last year's closing balance (opening + allotted - spent, in lakh), when last year has an entry
  const lastYear = previousYear(values.financialYear);
  const lastYearFund = ownFunds.find((r) => r.financial_year === lastYear);
  const carriedLakh = lastYearFund?.csr_fund_balance != null ? Number(lastYearFund.csr_fund_balance) : null;

  // A new entry's opening balance starts as last year's closing balance (QC CSR-46) until the
  // user types one; it stays editable. A negative closing balance (overspent) is not filled in.
  const carriedOpening = !openingTouched && carriedLakh != null && carriedLakh >= 0 ? croreInput(carriedLakh) : null;
  const shown = carriedOpening != null ? { ...values, openingBalance: carriedOpening } : values;

  const openingDiffers = carriedLakh != null && shown.openingBalance !== ''
    && Math.abs(croreToLakh(shown.openingBalance) - carriedLakh) >= 0.01;

  const setValue = (key, value) => {
    if (key === 'openingBalance') setOpeningTouched(true);
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!shown.financialYear) errs.financialYear = 'Financial Year is required.';
    else if (takenYears.includes(shown.financialYear)) errs.financialYear = `Fund details for ${shown.financialYear} already exist.`;
    FIELDS.forEach((f) => {
      if (!isAmount(shown[f.key])) errs[f.key] = `Enter the ${f.label.replace(' (₹ Cr)', '')} (0 or more).`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }

    // Field names as the server reads them (2.0 contract)
    const payload = {
      financialYear: shown.financialYear,
      netProfit: croreToLakh(shown.netProfit),
      openingBalanceCSR: croreToLakh(shown.openingBalance),
      csrFundAllotedForYear: croreToLakh(shown.fundAllotted),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCsrFund({ ...payload, csrFundId: fund.csr_fund_id });
        notify(CSR_TOASTS.fundUpdated(shown.financialYear));
      } else {
        await createCsrFund(payload);
        notify(CSR_TOASTS.fundCreated(shown.financialYear));
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
          <label className="module-form-label" htmlFor="csr-fund-financialYear">Financial Year <span className="text-red-500">*</span></label>
          <select
            id="csr-fund-financialYear" value={values.financialYear}
            onChange={(e) => setValue('financialYear', e.target.value)}
            className={`module-form-select ${errors.financialYear ? '!border-red-500' : ''}`}
          >
            {!values.financialYear && <option value="">-- Every year already has fund details --</option>}
            {FINANCIAL_YEARS.map((fy) => (
              <option key={fy} value={fy} disabled={takenYears.includes(fy)}>
                {fy}{takenYears.includes(fy) ? ' (already added)' : ''}
              </option>
            ))}
          </select>
          {errors.financialYear && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.financialYear}</p>}
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="module-form-label" htmlFor={`csr-fund-${f.key}`}>{f.label} <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.00"
              id={`csr-fund-${f.key}`} value={shown[f.key]}
              onChange={(e) => setValue(f.key, e.target.value)}
              className={inputClass(f.key)}
            />
            {errors[f.key] && <p className="text-[10px] font-bold text-red-500 mt-1">{errors[f.key]}</p>}
            {!errors[f.key] && isAmount(shown[f.key]) && Number(shown[f.key]) > LARGE_CRORE && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                More than ₹{LARGE_CRORE} Cr. Check it is in crore, not lakh or rupees.
              </p>
            )}
            {f.key === 'openingBalance' && carriedLakh != null && (
              <p className={`text-[11px] mt-1 ${openingDiffers ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                Closing balance of {lastYear}: ₹{formatCrore(carriedLakh)} Cr
                {openingDiffers ? ' - the opening balance differs from it; please check.' : ''}
              </p>
            )}
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
