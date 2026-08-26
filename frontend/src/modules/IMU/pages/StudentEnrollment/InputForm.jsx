import { useState } from 'react';
import { Save } from 'lucide-react';
import { saveStudentEnrollment } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

// The backend's create endpoint is itself an upsert keyed on financial_year
// -- submitting for a year that already has data updates it in place, so
// there's no separate update call to make here.
export default function StudentEnrollmentInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noOfStdCapacity, setNoOfStdCapacity] = useState(editData?.no_of_seats ?? '');
  const [noOfStdEnrolled, setNoOfStdEnrolled] = useState(editData?.no_of_students_enrolled ?? '');
  const [studentsAdmission, setStudentsAdmission] = useState(editData?.percentage_of_student_admission ?? '');
  const [studentsonRoll, setStudentsonRoll] = useState(editData?.no_of_students_on_roll ?? '');
  const [studentsFinalyear, setStudentsFinalyear] = useState(editData?.no_of_final_year_students ?? '');
  const [studentsPassed, setStudentsPassed] = useState(editData?.no_of_students_passedout ?? '');
  const [noOfStdPlaced, setNoOfStdPlaced] = useState(editData?.no_of_students_placed ?? '');
  const [percentagePlacement, setPercentagePlacement] = useState(editData?.placement_percentage ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['noOfStdCapacity', noOfStdCapacity],
    ['noOfStdEnrolled', noOfStdEnrolled],
    ['studentsAdmission', studentsAdmission],
    ['studentsonRoll', studentsonRoll],
    ['studentsFinalyear', studentsFinalyear],
    ['studentsPassed', studentsPassed],
    ['noOfStdPlaced', noOfStdPlaced],
    ['percentagePlacement', percentagePlacement],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const numericFields = [noOfStdCapacity, noOfStdEnrolled, studentsAdmission, studentsonRoll, studentsFinalyear, studentsPassed, noOfStdPlaced, percentagePlacement].map(Number);
    if (numericFields.some((n) => isNaN(n) || n < 0)) {
      triggerNotification ? triggerNotification('Please enter valid, non-negative values.', 'error') : alert('Please enter valid, non-negative values.');
      return;
    }

    setSubmitting(true);
    try {
      await saveStudentEnrollment({
        financialYear,
        noOfStdCapacity: numericFields[0],
        noOfStdEnrolled: numericFields[1],
        studentsAdmission: numericFields[2],
        studentsonRoll: numericFields[3],
        studentsFinalyear: numericFields[4],
        studentsPassed: numericFields[5],
        noOfStdPlaced: numericFields[6],
        percentagePlacement: numericFields[7],
        userID: getCurrentUserId(),
      });
      triggerNotification && triggerNotification(`Student Enrollment entry ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Student Enrollment entry:', err);
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
            {isEdit ? 'Update Student Enrollment Entry' : 'Add Student Enrollment Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">IMU - Student Capacity, Enrollment & Placement</p>
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
            <label className={labelCls}>Number Of Student Seats/Capacity <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noOfStdCapacity} onChange={(e) => setNoOfStdCapacity(e.target.value)} onBlur={() => handleBlur('noOfStdCapacity')} placeholder="e.g. 400" className={inputCls(isFieldInvalid('noOfStdCapacity', noOfStdCapacity))} />
            {isFieldInvalid('noOfStdCapacity', noOfStdCapacity) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Number Of Students Enrolled <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noOfStdEnrolled} onChange={(e) => setNoOfStdEnrolled(e.target.value)} onBlur={() => handleBlur('noOfStdEnrolled')} placeholder="e.g. 380" className={inputCls(isFieldInvalid('noOfStdEnrolled', noOfStdEnrolled))} />
            {isFieldInvalid('noOfStdEnrolled', noOfStdEnrolled) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>% of Admission <span className="text-red-500">*</span></label>
            <input type="number" min="0" max="100" step="0.01" value={studentsAdmission} onChange={(e) => setStudentsAdmission(e.target.value)} onBlur={() => handleBlur('studentsAdmission')} placeholder="e.g. 95" className={inputCls(isFieldInvalid('studentsAdmission', studentsAdmission))} />
            {isFieldInvalid('studentsAdmission', studentsAdmission) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Number of Students on Roll <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={studentsonRoll} onChange={(e) => setStudentsonRoll(e.target.value)} onBlur={() => handleBlur('studentsonRoll')} placeholder="e.g. 1500" className={inputCls(isFieldInvalid('studentsonRoll', studentsonRoll))} />
            {isFieldInvalid('studentsonRoll', studentsonRoll) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Total No. of Final Year Students <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={studentsFinalyear} onChange={(e) => setStudentsFinalyear(e.target.value)} onBlur={() => handleBlur('studentsFinalyear')} placeholder="e.g. 350" className={inputCls(isFieldInvalid('studentsFinalyear', studentsFinalyear))} />
            {isFieldInvalid('studentsFinalyear', studentsFinalyear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Total Number of Students Passed out <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={studentsPassed} onChange={(e) => setStudentsPassed(e.target.value)} onBlur={() => handleBlur('studentsPassed')} placeholder="e.g. 330" className={inputCls(isFieldInvalid('studentsPassed', studentsPassed))} />
            {isFieldInvalid('studentsPassed', studentsPassed) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Number Of Students Placed <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={noOfStdPlaced} onChange={(e) => setNoOfStdPlaced(e.target.value)} onBlur={() => handleBlur('noOfStdPlaced')} placeholder="e.g. 300" className={inputCls(isFieldInvalid('noOfStdPlaced', noOfStdPlaced))} />
            {isFieldInvalid('noOfStdPlaced', noOfStdPlaced) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Placement % <span className="text-red-500">*</span></label>
            <input type="number" min="0" max="100" step="0.01" value={percentagePlacement} onChange={(e) => setPercentagePlacement(e.target.value)} onBlur={() => handleBlur('percentagePlacement')} placeholder="e.g. 90" className={inputCls(isFieldInvalid('percentagePlacement', percentagePlacement))} />
            {isFieldInvalid('percentagePlacement', percentagePlacement) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
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
