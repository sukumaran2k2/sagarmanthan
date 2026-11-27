import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createContractualData,
    checkContractualFiscalYearExist
} from '../../api.js';
import { getErrorMessage } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import { getCurrentUserId, getSessionOrganisationId } from '../../../../utils/authSession.js';
import { FormActions } from '../../components/HrFormControls';

const LIST_PATH = '/hr/hr-management/contractual-employment';

// One row per category: label + the form field for each level
const ROWS = [
  { label: 'Direct engagement', officer: 'officerDirectEngagement', nonOfficer: 'nonOfficerDirectEngagement' },
  { label: 'Retired from other Govt/PSU', officer: 'officerRetiredGovt', nonOfficer: 'nonOfficerRetiredGovt' },
  { label: 'Retired From own Organisation', officer: 'officerRetiredOwnOrg', nonOfficer: 'nonOfficerRetiredOwnOrg' },
  { label: 'Through Agency', officer: 'officerThroughAgency', nonOfficer: 'nonOfficerThroughAgency' },
  { label: 'For Ministry', officer: 'officerForMinistry', nonOfficer: 'nonOfficerForMinistry' },
];

const EMPTY_FORM = {
  financialYear: '',
  officerDirectEngagement: '',
  officerRetiredGovt: '',
  officerRetiredOwnOrg: '',
  officerThroughAgency: '',
  officerForMinistry: '',
  nonOfficerDirectEngagement: '',
  nonOfficerRetiredGovt: '',
  nonOfficerRetiredOwnOrg: '',
  nonOfficerThroughAgency: '',
  nonOfficerForMinistry: '',
};

const INPUT_CLASS =
  'w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800';

// editData: the record being edited (from location.state.item, via InputForm); null when adding
export default function ContractualDataForm({ editData = null, notify }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingYear, setCheckingYear] = useState(false);
  const yearCheckId = useRef(0); // ignores stale responses if the user changes year quickly

  // The form remounts for each record (key in InputForm), so it starts from editData directly
  const [formData, setFormData] = useState(() => (editData ? {
    financialYear: editData['Financial Year'] || '',
    officerDirectEngagement: editData['Officer - Direct engagement'] ?? '',
    officerRetiredGovt: editData['Officer - Retired from Govt.'] ?? '',
    officerRetiredOwnOrg: editData['Officer - Retired from own organisation'] ?? '',
    officerThroughAgency: editData['Officer - Through agency'] ?? '',
    officerForMinistry: editData['Officer - For ministry'] ?? '',
    nonOfficerDirectEngagement: editData['Non-officer Direct engagement'] ?? '',
    nonOfficerRetiredGovt: editData['Non-officer retired from Govt.'] ?? '',
    nonOfficerRetiredOwnOrg: editData['Non-officer retired from own organisation'] ?? '',
    nonOfficerThroughAgency: editData['Non-officer through agency'] ?? '',
    nonOfficerForMinistry: editData['Non-officer for ministry'] ?? '',
  } : EMPTY_FORM));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Alert the user, then leave the form
  const handleYearExists = (year) => {
    notify?.(HR_TOASTS.contractualSaveFailed(
      `Financial year ${year} already exists. Please edit the existing record from the list.`
    ));

    if (editData) {
      // Editing: don't throw away the user's changes, just put the year back
      setFormData(prev => ({ ...prev, financialYear: editData['Financial Year'] || '' }));
      return;
    }
    // replace: Back must not reopen the form
    navigate(LIST_PATH, { replace: true });
  };

  // Returns true when the year already has a record (for this organisation)
  const checkFiscalYear = async (year) => {
    const original = editData?.['Financial Year'];

    // Nothing selected, or editing the record's own year: never a duplicate
    if (!year || (editData && year === original)) {
      yearCheckId.current++; // invalidate any check still in flight
      setCheckingYear(false);
      return false;
    }

    const myCheck = ++yearCheckId.current;
    setCheckingYear(true);
    try {
      const response = await checkContractualFiscalYearExist(getSessionOrganisationId(), year);
      const exists = Boolean(response.data?.exists);
      // Only act if the user has not picked another year in the meantime
      if (exists && myCheck === yearCheckId.current) handleYearExists(year);
      return exists;
    } catch (error) {
      console.error('Error checking financial year:', error);
      // Don't block saving if the check itself fails; the backend should still reject duplicates
      return false;
    } finally {
      if (myCheck === yearCheckId.current) setCheckingYear(false);
    }
  };

  const handleYearChange = (e) => {
    handleChange(e);
    checkFiscalYear(e.target.value);
  };

  const calculateTotal = (prefix) => {
    const keys = [
      `${prefix}DirectEngagement`,
      `${prefix}RetiredGovt`,
      `${prefix}RetiredOwnOrg`,
      `${prefix}ThroughAgency`,
      `${prefix}ForMinistry`
    ];
    return keys.reduce((sum, key) => sum + (parseInt(formData[key]) || 0), 0);
  };

  const totalOfficer = calculateTotal('officer');
  const totalNonOfficer = calculateTotal('nonOfficer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // a double click must not save twice

   
    const contractId = editData
      ? editData['Contract ID'] ?? editData.contract_id ?? editData.contractId ?? editData.ContractId ?? editData.id
      : null;

    if (editData && !contractId) {
      console.error('Missing contract id for update. Row was:', editData);
      notify?.(HR_TOASTS.recordIdMissing());
      return;
    }

    setIsSubmitting(true);

    try {
      if (await checkFiscalYear(formData.financialYear)) {
        return; 
      }

      const payload = {
        contractId, 

        financialYear: formData.financialYear,

        OffDirectEngage: Number(formData.officerDirectEngagement) || 0,
        OffRetiredFromOther: Number(formData.officerRetiredGovt) || 0,
        OffRetiredFromOwnOrgan: Number(formData.officerRetiredOwnOrg) || 0,
        OffThroughAgency: Number(formData.officerThroughAgency) || 0,
        OffForMinistry: Number(formData.officerForMinistry) || 0,

        NonOffDirectEngage: Number(formData.nonOfficerDirectEngagement) || 0,
        NonOffRetiredFromOther: Number(formData.nonOfficerRetiredGovt) || 0,
        NonOffRetiredFromOwnOrgan: Number(formData.nonOfficerRetiredOwnOrg) || 0,
        NonOffThroughAgency: Number(formData.nonOfficerThroughAgency) || 0,
        NonOffForMinistry: Number(formData.nonOfficerForMinistry) || 0,

        TotalOfficial: totalOfficer,
        NonOffTotal: totalNonOfficer,
        // Read at save time: a module-level value would keep the previous login's organisation
        organisationID: getSessionOrganisationId(),
        userID: getCurrentUserId()
      };

      const response = await createContractualData(payload);

      if (response.data?.success) {
        notify?.(HR_TOASTS.contractualSaved(Boolean(editData)));

        // replace: Back must not reopen the submitted form
        navigate(LIST_PATH, { replace: true });
      } else {
        notify?.(HR_TOASTS.contractualSaveFailed(response.data?.message));
      }
    } catch (error) {
      console.error('Contractual API error:', error);
      notify?.(HR_TOASTS.contractualSaveFailed(getErrorMessage(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(5), (val, index) => `${currentYear - index}-${currentYear - index + 1}`);

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100">
      <h2 className="text-xl font-bold mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        {editData ? 'Update Contractual Data' : 'Add Contractual Data'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Top Section */}
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
            Financial Year<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            name="financialYear"
            value={formData.financialYear}
            onChange={handleYearChange}
            required
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">--Select Financial Year--</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {checkingYear && (
            <p className="mt-1 text-xs text-slate-500">Checking financial year...</p>
          )}
        </div>

        {/* Table Section */}
        <div>
          <h3 className="text-sm font-bold mb-4 text-slate-800 dark:text-slate-200">Officers level & Non Officers Level</h3>

          <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
            <div className="grid grid-cols-[30%_1fr_1fr] bg-[#20366b] text-white font-bold text-xs text-center divide-x divide-white/20">
              <div className="py-2.5 px-4">Category</div>
              <div className="py-2.5 px-4">Officer Level</div>
              <div className="py-2.5 px-4">Non Officers Level</div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              {ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900"
                >
                  <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                    {row.label}<span className="text-red-500 ml-0.5">*</span>
                  </div>
                  <div className="p-2">
                    <input
                      type="number"
                      min="0"
                      required
                      name={row.officer}
                      value={formData[row.officer]}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="p-2">
                    <input
                      type="number"
                      min="0"
                      required
                      name={row.nonOfficer}
                      value={formData[row.nonOfficer]}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              ))}

              {/* Totals Row */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Total (Officers Level)
                </div>
                <div className="p-2"><input type="number" readOnly value={totalOfficer} className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed font-bold" /></div>
                <div className="p-2"><input type="number" readOnly value={totalNonOfficer} className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed font-bold" /></div>
              </div>
            </div>
          </div>
        </div>

        <FormActions
          onExit={() => navigate(LIST_PATH)}
          submitLabel={editData ? 'Update' : 'Submit'}
          busyLabel={editData ? 'Updating...' : 'Saving...'}
          busy={isSubmitting || checkingYear}
        />

      </form>
    </div>
  );
}