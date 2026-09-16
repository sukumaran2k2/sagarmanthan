import { useState } from 'react';
import { Save } from 'lucide-react';
import { saveResearch } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// createImuResearch is an upsert keyed on financial_year -- there's no
// separate update call to make.
export default function ResearchInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [domesticJournals, setDomesticJournals] = useState(editData?.domestic_journals ?? '');
  const [internationalJournals, setInternationalJournals] = useState(editData?.international_journals ?? '');
  const [phdAwarded, setPhdAwarded] = useState(editData?.phd_awarded ?? '');
  const [patentsFiled, setPatentsFiled] = useState(editData?.patents_filed ?? '');
  const [startupsFunded, setStartupsFunded] = useState(editData?.startups_funded ?? '');
  const [researchAwarded, setResearchAwarded] = useState(editData?.research_ms_awarded ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['domesticJournals', domesticJournals],
    ['internationalJournals', internationalJournals],
    ['phdAwarded', phdAwarded],
    ['patentsFiled', patentsFiled],
    ['startupsFunded', startupsFunded],
    ['researchAwarded', researchAwarded],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [domesticJournals, internationalJournals, phdAwarded, patentsFiled, startupsFunded, researchAwarded].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      await saveResearch({
        financialYear,
        domesticJournals: numericValues[0],
        internationalJournals: numericValues[1],
        phdAwarded: numericValues[2],
        patentsFiled: numericValues[3],
        startupsFunded: numericValues[4],
        researchAwarded: numericValues[5],
        userID: getCurrentUserId(),
      });
      triggerNotification && triggerNotification(`Research entry ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Research entry:', err);
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
      <input type="number" min="0" value={value} onChange={(e) => setter(e.target.value)} onBlur={() => handleBlur(key)} placeholder={placeholder} className={inputCls(isFieldInvalid(key, value))} />
      {isFieldInvalid(key, value) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update Research Entry' : 'Add Research Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">IMU - Research, Innovation & Startups</p>
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

          {numberField('No. Of Research Papers Published - Domestic Journals', domesticJournals, setDomesticJournals, 'domesticJournals', 'e.g. 12')}
          {numberField('No. Of Research Papers Published - International Journals', internationalJournals, setInternationalJournals, 'internationalJournals', 'e.g. 8')}
          {numberField('No. Of PhDs Awarded', phdAwarded, setPhdAwarded, 'phdAwarded', 'e.g. 3')}
          {numberField('No. Of Patents/IP Filed', patentsFiled, setPatentsFiled, 'patentsFiled', 'e.g. 2')}
          {numberField('No. Startups Funded/Incubated', startupsFunded, setStartupsFunded, 'startupsFunded', 'e.g. 4')}
          {numberField('No. Of MS (By Research) Awarded', researchAwarded, setResearchAwarded, 'researchAwarded', 'e.g. 5')}
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
