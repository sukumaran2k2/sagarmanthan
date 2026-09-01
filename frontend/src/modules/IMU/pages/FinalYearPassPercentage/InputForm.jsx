import { useState } from 'react';
import { Save } from 'lucide-react';
import { saveFinalYearPassPercentage } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

// Confirmed exactly from the legacy site's dropdown -- real IMU programme
// codes, not placeholder values.
const PROGRAMME_OPTIONS = [
  'B.Sc(NS)', 'B.Tech(ME)', 'B.Tech(NAOE)', 'BBA(LRE)', 'BBA(ML)', 'DNS',
  'M.Tech(MT)', 'M.Tech(NAOE)', 'MBA(ITL)', 'MBA(PSM)', 'PGDME',
];

const BATCH_OPTIONS = Array.from({ length: 14 }, (_, i) => String(2015 + i));

// createimuFinalYearpassPercentage is an upsert keyed on (programme, batch)
// -- there's no separate update call to make.
export default function FinalYearPassPercentageInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [programme, setProgramme] = useState(editData?.programme || '');
  const [batch, setBatch] = useState(editData?.batch ? String(editData.batch) : '');
  const [appeared, setAppeared] = useState(editData?.appeared ?? '');
  const [passed, setPassed] = useState(editData?.passed ?? '');
  const [passPercentage, setPassPercentage] = useState(editData?.pass_percentage ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['programme', programme],
    ['batch', batch],
    ['appeared', appeared],
    ['passed', passed],
    ['passPercentage', passPercentage],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = [appeared, passed, passPercentage].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }
    if (Number(passed) > Number(appeared)) {
      triggerNotification ? triggerNotification('Passed cannot exceed Appeared.', 'error') : alert('Passed cannot exceed Appeared.');
      return;
    }

    setSubmitting(true);
    try {
      await saveFinalYearPassPercentage({
        programme,
        Batch: batch,
        appeared: numericValues[0],
        passed: numericValues[1],
        passPercentage: numericValues[2],
        userID: getCurrentUserId(),
      });
      triggerNotification && triggerNotification(`Final Year Pass Percentage entry ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Final Year Pass Percentage entry:', err);
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
            {isEdit ? 'Update Final Year Pass Percentage Entry' : 'Add Final Year Pass Percentage Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">IMU - Final Year Pass Percentage - IMU Campuses</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Programme <span className="text-red-500">*</span></label>
            <select
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              onBlur={() => handleBlur('programme')}
              disabled={isEdit}
              className={`${inputCls(isFieldInvalid('programme', programme))} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Programme--</option>
              {PROGRAMME_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {isFieldInvalid('programme', programme) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Batch <span className="text-red-500">*</span></label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              onBlur={() => handleBlur('batch')}
              disabled={isEdit}
              className={`${inputCls(isFieldInvalid('batch', batch))} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Batch--</option>
              {BATCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {isFieldInvalid('batch', batch) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Appeared <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={appeared} onChange={(e) => setAppeared(e.target.value)} onBlur={() => handleBlur('appeared')} placeholder="e.g. 60" className={inputCls(isFieldInvalid('appeared', appeared))} />
            {isFieldInvalid('appeared', appeared) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Passed <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={passed} onChange={(e) => setPassed(e.target.value)} onBlur={() => handleBlur('passed')} placeholder="e.g. 57" className={inputCls(isFieldInvalid('passed', passed))} />
            {isFieldInvalid('passed', passed) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Pass Percentage <span className="text-red-500">*</span></label>
            <input type="number" min="0" max="100" step="0.01" value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} onBlur={() => handleBlur('passPercentage')} placeholder="e.g. 95" className={`${inputCls(isFieldInvalid('passPercentage', passPercentage))} md:w-1/2`} />
            {isFieldInvalid('passPercentage', passPercentage) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
