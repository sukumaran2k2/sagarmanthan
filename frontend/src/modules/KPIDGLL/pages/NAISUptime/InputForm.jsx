import { useState } from 'react';
import { Save } from 'lucide-react';
import { createNaisUptime, updateNaisUptime } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGLL_TOASTS } from '../../toastMessages';

// Financial year range matches the pattern used for VTMS Integration
// (2012-2013 through 2028-2029), generated programmatically.
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const start = 2012 + i;
  return `${start}-${start + 1}`;
});

export default function NAISUptimeInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [naisAvailability, setNaisAvailability] = useState(
    editData?.availability_of_nais ?? ''
  );

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (!val || !String(val).trim());

  const isAvailabilityInvalid = () => {
    if (!touched.naisAvailability) return false;
    const num = parseFloat(naisAvailability);
    return naisAvailability === '' || isNaN(num) || num < 0 || num > 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ financialYear: true, naisAvailability: true });

    if (!financialYear) {
      notify(COMMON_TOASTS.requiredSelect('financial year'));
      return;
    }
    const availability = parseFloat(naisAvailability);
    if (isNaN(availability) || availability < 0 || availability > 100) {
      notify(DGLL_TOASTS.invalidPercentage('NAIS availability'));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateNaisUptime({
          updatenaisfinancialYear: financialYear,
          updateNaisUptime: availability,
          NaisIdOrg: editData.nais_id,
          userID: getCurrentUserId(),
        });
        notify(DGLL_TOASTS.updated('NAIS Uptime'));
        if (onSuccess) onSuccess();
      } else {
        const response = await createNaisUptime({
          financialYear,
          naisAvailability: availability,
          userID: getCurrentUserId(),
        });

        if (response.status === 205) {
          notify(DGLL_TOASTS.duplicate('financial year'));
          return;
        }

        notify(DGLL_TOASTS.added('NAIS Uptime'));
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Error saving NAIS Uptime entry:', err);
      notify(DGLL_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update NAIS Uptime Entry' : 'Add NAIS Uptime Entry'}
          </h3>
          <p className="module-form-banner-subtext">DGLL - NAIS Uptime</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="module-form-label">Financial Year <span className="text-red-500">*</span></label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              onBlur={() => handleBlur('financialYear')}
              disabled={isEdit}
              className={`module-form-input${isFieldInvalid('financialYear', financialYear) ? ' !border-red-500' : ''} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isFieldInvalid('financialYear', financialYear) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Availability / Uptime of NAIS (%) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" max="100" step="any" value={naisAvailability}
              onChange={(e) => setNaisAvailability(e.target.value)}
              onBlur={() => handleBlur('naisAvailability')}
              placeholder="e.g. 98.5"
              className={`module-form-input${isAvailabilityInvalid() ? ' !border-red-500' : ''}`}
            />
            {isAvailabilityInvalid() && (
              <p className="text-[10px] font-bold text-red-500 mt-1">Enter a valid percentage (0-100).</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
          <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button" onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="submit" disabled={submitting}
            className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
