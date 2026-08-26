import { useState } from 'react';
import { Save } from 'lucide-react';
import { createNaisIntegration, updateNaisIntegration } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

// Financial year range matches the pattern used for VTMS Integration / NAIS Uptime
// (2012-2013 through 2028-2029), generated programmatically.
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const start = 2012 + i;
  return `${start}-${start + 1}`;
});

export default function NAISIntegrationInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [naisIntegration, setNaisIntegration] = useState(
    editData?.nais_integrated_with_nmda ?? ''
  );
  const [naisUpgraded, setNaisUpgraded] = useState(
    editData?.no_of_nais_upgraded ?? ''
  );

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (!val || !String(val).trim());

  const isIntegrationInvalid = () => {
    if (!touched.naisIntegration) return false;
    const num = parseFloat(naisIntegration);
    return naisIntegration === '' || isNaN(num) || num < 0 || num > 100;
  };

  const isUpgradedInvalid = () => {
    if (!touched.naisUpgraded) return false;
    const num = parseInt(naisUpgraded, 10);
    return naisUpgraded === '' || isNaN(num) || num < 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ financialYear: true, naisIntegration: true, naisUpgraded: true });

    if (!financialYear) {
      triggerNotification ? triggerNotification('Please select the financial year.', 'error') : alert('Please select the financial year.');
      return;
    }
    const integration = parseFloat(naisIntegration);
    if (isNaN(integration) || integration < 0 || integration > 100) {
      triggerNotification ? triggerNotification('Please enter a valid NAIS integration percentage (0-100).', 'error') : alert('Please enter a valid NAIS integration percentage (0-100).');
      return;
    }
    const upgraded = parseInt(naisUpgraded, 10);
    if (isNaN(upgraded) || upgraded < 0) {
      triggerNotification ? triggerNotification('Please enter a valid number of NAIS systems upgraded.', 'error') : alert('Please enter a valid number of NAIS systems upgraded.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateNaisIntegration({
          updateFinancialYear: financialYear,
          updateNAISintegrationdata: integration,
          updateNAISystem: upgraded,
          NaisIntegrationIdOrg: editData.nais_integration_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('NAIS Integration entry updated successfully', 'success');
        if (onSuccess) onSuccess();
      } else {
        const response = await createNaisIntegration({
          financialYear,
          NAISintegration: integration,
          NAISupgraded: upgraded,
          userID: getCurrentUserId(),
        });

        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          return;
        }

        triggerNotification && triggerNotification('NAIS Integration entry added successfully', 'success');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Error saving NAIS Integration entry:', err);
      triggerNotification ? triggerNotification('Failed to save entry.', 'error') : alert('Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update NAIS Integration Entry' : 'Add NAIS Integration Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">DGLL - NAIS Integration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Financial Year <span className="text-red-500">*</span></label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              onBlur={() => handleBlur('financialYear')}
              disabled={isEdit}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('financialYear', financialYear) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isFieldInvalid('financialYear', financialYear) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">NAIS Integrated with NMDA (%) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" max="100" step="any" value={naisIntegration}
              onChange={(e) => setNaisIntegration(e.target.value)}
              onBlur={() => handleBlur('naisIntegration')}
              placeholder="e.g. 92.5"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isIntegrationInvalid() ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`}
            />
            {isIntegrationInvalid() && (
              <p className="text-[10px] font-bold text-red-500 mt-1">Enter a valid percentage (0-100).</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Number of NAIS System Upgraded <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={naisUpgraded}
              onChange={(e) => setNaisUpgraded(e.target.value)}
              onBlur={() => handleBlur('naisUpgraded')}
              placeholder="e.g. 4"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isUpgradedInvalid() ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`}
            />
            {isUpgradedInvalid() && (
              <p className="text-[10px] font-bold text-red-500 mt-1">Enter a valid number (0 or more).</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
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
      </form>
    </div>
  );
}
