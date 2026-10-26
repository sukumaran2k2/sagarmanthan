import { HrModal, Button } from '../HrFormControls';
import { toInputDate } from '../../vacancyActivity/form';

const displayDate = (v) => {
  const iso = toInputDate(v);
  return iso ? iso.split('-').reverse().join('-') : null;
};

export default function EmployeeDetailsModal({ isOpen, onClose, employee, loading }) {
  const rows = employee
    ? [
        ['Name', employee.emp_name],
        ['Date of birth', displayDate(employee.emp_dob)],
        ['Gender', employee.emp_gender],
        ['Aadhaar number', employee.emp_aadhar_number],
        ['Domicile state', employee.state_name],
      ]
    : [];

  return (
    <HrModal
      isOpen={isOpen}
      title="Employee details"
      onClose={onClose}
      maxWidth="max-w-md"
      footer={<Button className="ml-auto" onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading employee details…</p>
      ) : employee ? (
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100 text-right">{value || 'N/A'}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">No details found for the selected employee.</p>
      )}
    </HrModal>
  );
}
