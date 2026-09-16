import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { saveFacilities } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// Total E-Resources is confirmed from the legacy site to be a disabled,
// auto-computed field: E-Books + E-Journals + E-Databases + Academic
// Software. Replicated exactly as a live-updating read-only field, not a
// manually entered value.
export default function FacilitiesInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noOfClassrooms, setNoOfClassrooms] = useState(editData?.no_of_classrooms ?? '');
  const [noOfLabs, setNoOfLabs] = useState(editData?.no_of_labs ?? '');
  const [noOfSimulators, setNoOfSimulators] = useState(editData?.no_of_simulators ?? '');
  const [noOfWorkshops, setNoOfWorkshops] = useState(editData?.no_of_workshops ?? '');
  const [noOfLibrarybooks, setNoOfLibrarybooks] = useState(editData?.no_of_library_books ?? '');
  const [noOfEbooks, setNoOfEbooks] = useState(editData?.no_of_e_books ?? '');
  const [noOfEjournals, setNoOfEjournals] = useState(editData?.no_of_e_journals ?? '');
  const [noOfEdatabases, setNoOfEdatabases] = useState(editData?.no_of_e_database ?? '');
  const [noOfacadamicSoftware, setNoOfacadamicSoftware] = useState(editData?.no_of_acadamic_software ?? '');
  const [totalEresources, setTotalEresources] = useState(editData?.total_e_resources ?? '');

  useEffect(() => {
    const total = [noOfEbooks, noOfEjournals, noOfEdatabases, noOfacadamicSoftware]
      .map((v) => parseInt(v, 10) || 0)
      .reduce((sum, n) => sum + n, 0);
    setTotalEresources(String(total));
  }, [noOfEbooks, noOfEjournals, noOfEdatabases, noOfacadamicSoftware]);

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['noOfClassrooms', noOfClassrooms],
    ['noOfLabs', noOfLabs],
    ['noOfSimulators', noOfSimulators],
    ['noOfWorkshops', noOfWorkshops],
    ['noOfLibrarybooks', noOfLibrarybooks],
    ['noOfEbooks', noOfEbooks],
    ['noOfEjournals', noOfEjournals],
    ['noOfEdatabases', noOfEdatabases],
    ['noOfacadamicSoftware', noOfacadamicSoftware],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericValues = FIELDS.slice(1).map(([, v]) => Number(v));
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      await saveFacilities({
        financialYear,
        noOfClassrooms: Number(noOfClassrooms),
        noOfLabs: Number(noOfLabs),
        noOfSimulators: Number(noOfSimulators),
        noOfWorkshops: Number(noOfWorkshops),
        noOfLibrarybooks: Number(noOfLibrarybooks),
        noOfEbooks: Number(noOfEbooks),
        noOfEjournals: Number(noOfEjournals),
        noOfEdatabases: Number(noOfEdatabases),
        noOfacadamicSoftware: Number(noOfacadamicSoftware),
        totalEresources: Number(totalEresources),
        userID: getCurrentUserId(),
      });
      triggerNotification && triggerNotification(`Facilities entry ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Facilities entry:', err);
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
            {isEdit ? 'Update Facilities Entry' : 'Add Facilities Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">IMU - Facilities, Classrooms, Labs, Subscriptions</p>
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

          {numberField('Number of Classrooms', noOfClassrooms, setNoOfClassrooms, 'noOfClassrooms', 'e.g. 20')}
          {numberField('Number of Labs', noOfLabs, setNoOfLabs, 'noOfLabs', 'e.g. 8')}
          {numberField('Number of Simulators', noOfSimulators, setNoOfSimulators, 'noOfSimulators', 'e.g. 3')}
          {numberField('Number of Workshops', noOfWorkshops, setNoOfWorkshops, 'noOfWorkshops', 'e.g. 5')}
          {numberField('Number of Library Books', noOfLibrarybooks, setNoOfLibrarybooks, 'noOfLibrarybooks', 'e.g. 12000')}
          {numberField('Number of E-Books', noOfEbooks, setNoOfEbooks, 'noOfEbooks', 'e.g. 3000')}
          {numberField('Number of E-Journals', noOfEjournals, setNoOfEjournals, 'noOfEjournals', 'e.g. 500')}
          {numberField('Number of E-Databases', noOfEdatabases, setNoOfEdatabases, 'noOfEdatabases', 'e.g. 15')}
          {numberField('Number of Academic Software', noOfacadamicSoftware, setNoOfacadamicSoftware, 'noOfacadamicSoftware', 'e.g. 10')}

          <div className="space-y-1.5">
            <label className={labelCls}>Total E-Resources</label>
            <input
              type="number" value={totalEresources} disabled
              className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[#0f417a] dark:text-blue-400 cursor-not-allowed"
            />
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Automatically calculated: E-Books + E-Journals + E-Databases + Academic Software</p>
          </div>
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
