import { useState } from 'react';
import { Save } from 'lucide-react';
import { createShipManagementBusiness, updateShipManagementBusiness } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { SCI_TOASTS } from '../../toastMessages';

const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2014 + i;
  return `${start}-${start + 1}`;
});

export default function ShipManagementBusinessInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [noofShipsManaged, setNoofShipsManaged] = useState(editData?.no_of_ships_managed_by_sci ?? '');
  const [totalManagementcost, setTotalManagementcost] = useState(editData?.total_management_cost ?? '');
  const [revenue, setRevenue] = useState(editData?.revenue_from_managing_ships ?? '');
  const [costtoRevenueratio, setCosttoRevenueratio] = useState(editData?.cost_to_revenue_ratio ?? '');

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (val === '' || val === null || val === undefined);

  const FIELDS = [
    ['financialYear', financialYear],
    ['noofShipsManaged', noofShipsManaged],
    ['totalManagementcost', totalManagementcost],
    ['revenue', revenue],
    ['costtoRevenueratio', costtoRevenueratio],
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

    if (FIELDS.some(([, val]) => val === '' || val === null || val === undefined)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    const numericValues = [noofShipsManaged, totalManagementcost, revenue, costtoRevenueratio].map(Number);
    if (numericValues.some((n) => isNaN(n) || n < 0)) {
      notify(SCI_TOASTS.invalidValues());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateShipManagementBusiness({
          updateFinancialyear: financialYear,
          updatenoofShipsManaged: numericValues[0],
          updatetotalManagementcost: numericValues[1],
          updaterevenue: numericValues[2],
          updatecosttoRevenueratio: numericValues[3],
          ScishipmanagementIdOrg: editData.sci_ship_management_id,
          userID: getCurrentUserId(),
        });
        notify(SCI_TOASTS.updated('Ship Management Business'));
      } else {
        const response = await createShipManagementBusiness({
          financialYear,
          noofShipsManaged: numericValues[0],
          totalManagementcost: numericValues[1],
          revenue: numericValues[2],
          costtoRevenueratio: numericValues[3],
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          notify(SCI_TOASTS.duplicate());
          setSubmitting(false);
          return;
        }
        notify(SCI_TOASTS.added('Ship Management Business'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving entry:', err);
      notify(SCI_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (invalid) =>
    `module-form-input${invalid ? ' !border-red-500' : ''}`;
  const labelCls = 'module-form-label';

  const numberField = (label, value, setter, key, placeholder) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label} <span className="text-red-500">*</span></label>
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => setter(e.target.value)} onBlur={() => handleBlur(key)} placeholder={placeholder} className={inputCls(isFieldInvalid(key, value))} />
      {isFieldInvalid(key, value) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
    </div>
  );

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update Entry' : 'Add Entry'}
          </h3>
          <p className="module-form-banner-subtext">SCI - Ship Management Business</p>
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

          {numberField('Number of Ships Managed by SCI', noofShipsManaged, setNoofShipsManaged, 'noofShipsManaged', 'e.g. 12')}
          {numberField('Total Management Costs (Rs. in Crores)', totalManagementcost, setTotalManagementcost, 'totalManagementcost', 'e.g. 45.5')}
          {numberField('Revenue from Managing Ships (Rs. in Crores)', revenue, setRevenue, 'revenue', 'e.g. 68.2')}
          {numberField('Cost to Revenue Ratio (%)', costtoRevenueratio, setCosttoRevenueratio, 'costtoRevenueratio', 'e.g. 66.7')}
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
