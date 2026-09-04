import { useState } from 'react';
import { Save } from 'lucide-react';
import { createVtmsIntegration, updateVtmsIntegration } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

// Financial year range matches the legacy site's dgllVtmsintegration.html hardcoded dropdown
// (2012-2013 through 2028-2029), generated here instead of hand-listed to avoid the
// label typos present in the legacy markup (e.g. "2018-2029" instead of "2018-2019").
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const start = 2012 + i;
  return `${start}-${start + 1}`;
});

export default function VTMSIntegrationInputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [financialYear, setFinancialYear] = useState(editData?.financial_year || '');
  const [vtmsIntegration, setVtmsIntegration] = useState(
    editData?.no_of_ports_vtms_integrated ?? ''
  );

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (!val || !String(val).trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ financialYear: true, vtmsIntegration: true });

    if (!financialYear) {
      triggerNotification ? triggerNotification('Please select the financial year.', 'error') : alert('Please select the financial year.');
      return;
    }
    const numPorts = parseInt(vtmsIntegration, 10);
    if (isNaN(numPorts) || numPorts < 0) {
      triggerNotification ? triggerNotification('Please enter the number of Ports VTMS system integrated.', 'error') : alert('Please enter the number of Ports VTMS system integrated.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateVtmsIntegration({
          updatevtmsfinancialYear: financialYear,
          updateVtmsSystem: numPorts,
          VtmsIdOrg: editData.vtms_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('VTMS Integration entry updated successfully', 'success');
        if (onSuccess) onSuccess();
      } else {
        const response = await createVtmsIntegration({
          financialYear,
          vtmsIntegration: numPorts,
          userID: getCurrentUserId(),
        });

        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          return;
        }

        triggerNotification && triggerNotification('VTMS Integration entry added successfully', 'success');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Error saving VTMS Integration entry:', err);
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
            {isEdit ? 'Update VTMS Integration Entry' : 'Add VTMS Integration Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">DGLL - VTMS Integration</p>
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
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Number of Ports VTMS System Integrated <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" value={vtmsIntegration}
              onChange={(e) => setVtmsIntegration(e.target.value)}
              onBlur={() => handleBlur('vtmsIntegration')}
              placeholder="e.g. 12"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${touched.vtmsIntegration && (vtmsIntegration === '' || isNaN(parseInt(vtmsIntegration, 10)) || parseInt(vtmsIntegration, 10) < 0) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`}
            />
            {touched.vtmsIntegration && (vtmsIntegration === '' || isNaN(parseInt(vtmsIntegration, 10)) || parseInt(vtmsIntegration, 10) < 0) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">Enter a valid number of ports (0 or more).</p>
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
