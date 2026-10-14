import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  fetchFiscalYearTargetData,
  submitFiscalYearTargetData,
  updateFiscalYearTargetData,
} from '../../../api';
import { buildFinancialYearOptions } from '../trafficConstants';
import { getCurrentUserId } from '../../../../../utils/authSession';

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-60';

export default function TargetFormModal({
  open,
  mode = 'add',
  record = null,
  organisations = [],
  defaultOrganisationId = '',
  onClose,
  onSuccess,
  triggerNotification,
}) {
  const isUpdate = mode === 'update';
  const fyOptions = useMemo(() => buildFinancialYearOptions(8), []);
  const [financialYear, setFinancialYear] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  const [fiscalYearTarget, setFiscalYearTarget] = useState('');
  const [roRoTarget, setRoRoTarget] = useState('');
  const [roPaxTarget, setRoPaxTarget] = useState('');
  const [containerTargetMteu, setContainerTargetMteu] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isUpdate && record) {
      setFinancialYear(record.financial_year || '');
      setOrganisationId(String(record.organisation_id || ''));
      setFiscalYearTarget(
        record.fiscal_year_target != null ? String(record.fiscal_year_target) : ''
      );
      setRoRoTarget(record.ro_ro_target != null ? String(record.ro_ro_target) : '');
      setRoPaxTarget(record.ro_pax_target != null ? String(record.ro_pax_target) : '');
      setContainerTargetMteu(
        record.container_target_mteu != null ? String(record.container_target_mteu) : ''
      );

      (async () => {
        try {
          const res = await fetchFiscalYearTargetData({
            financialYear: record.financial_year,
            organisationId: record.organisation_id,
          });
          const row = Array.isArray(res.data) ? res.data[0] : null;
          if (!row) return;
          setFiscalYearTarget(row.fiscal_year_target != null ? String(row.fiscal_year_target) : '');
          setRoRoTarget(row.ro_ro_target != null ? String(row.ro_ro_target) : '');
          setRoPaxTarget(row.ro_pax_target != null ? String(row.ro_pax_target) : '');
          setContainerTargetMteu(
            row.container_target_mteu != null ? String(row.container_target_mteu) : ''
          );
        } catch {
          // keep values from list row
        }
      })();
    } else {
      setFinancialYear(fyOptions[0] || '');
      setOrganisationId(String(defaultOrganisationId || organisations[0]?.organisation_id || ''));
      setFiscalYearTarget('');
      setRoRoTarget('');
      setRoPaxTarget('');
      setContainerTargetMteu('');
    }
  }, [open, isUpdate, record, fyOptions, defaultOrganisationId, organisations]);

  if (!open) return null;

  const notify = (msg, type = 'success') => {
    if (typeof triggerNotification === 'function') triggerNotification(msg, type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = getCurrentUserId();
    if (!financialYear || !organisationId) {
      notify('Financial Year and Organisation are required.', 'error');
      return;
    }
    if (!userId) {
      notify('User session is invalid.', 'error');
      return;
    }
    if (fiscalYearTarget === '' || Number(fiscalYearTarget) < 0) {
      notify('Enter a valid Total Traffic Target (MMT).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (!isUpdate) {
        setChecking(true);
        const existing = await fetchFiscalYearTargetData({
          financialYear,
          organisationId,
        });
        setChecking(false);
        if (Array.isArray(existing.data) && existing.data.length > 0) {
          notify('Target already exists for this organisation and year. Use Update instead.', 'error');
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        financialYear,
        organisationId: Number(organisationId),
        fiscalYearTarget: Number(fiscalYearTarget) || 0,
        roRoTarget: roRoTarget === '' ? null : Number(roRoTarget),
        roPaxTarget: roPaxTarget === '' ? null : Number(roPaxTarget),
        containerTargetMteu: containerTargetMteu === '' ? null : Number(containerTargetMteu),
        userId,
      };

      if (isUpdate) {
        await updateFiscalYearTargetData(payload);
        notify('Fiscal year target updated successfully.', 'success');
      } else {
        await submitFiscalYearTargetData(payload);
        notify('Fiscal year target added successfully.', 'success');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Failed to save target.', 'error');
    } finally {
      setChecking(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-5 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">
              {isUpdate ? 'Update Target' : 'Add Target'}
            </h3>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">
              Fiscal year traffic targets (MMT / MTEUs)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Financial Year <span className="text-red-500">*</span>
              </label>
              <select
                className={inputClass}
                value={financialYear}
                disabled={isUpdate}
                onChange={(e) => setFinancialYear(e.target.value)}
              >
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                Organisation <span className="text-red-500">*</span>
              </label>
              <select
                className={inputClass}
                value={organisationId}
                disabled={isUpdate || organisations.length <= 1}
                onChange={(e) => setOrganisationId(e.target.value)}
              >
                <option value="">Select Organisation</option>
                {organisations.map((org) => (
                  <option
                    key={org.organisation_id || org.id}
                    value={org.organisation_id || org.id}
                  >
                    {org.organisation_name || org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                Total Traffic Target (MMT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={fiscalYearTarget}
                onChange={(e) => setFiscalYearTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Ro-Ro Target (MMT)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={roRoTarget}
                onChange={(e) => setRoRoTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Ro-Pax Target (MMT / Number)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={roPaxTarget}
                onChange={(e) => setRoPaxTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Container Target (MTEUs)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={containerTargetMteu}
                onChange={(e) => setContainerTargetMteu(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || checking}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting || checking ? 'Saving…' : isUpdate ? 'Update Target' : 'Save Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
