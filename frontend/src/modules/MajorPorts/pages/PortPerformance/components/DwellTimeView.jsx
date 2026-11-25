import { Eye, Info } from 'lucide-react';
import { formatDate } from '../../Traffic/trafficFormat';
import { DWELL_VALUE_GROUPS } from '../dwellTimeConfig';

const valueText = (value) => (value === null || value === undefined ? '-' : String(value));

/**
 * Dwell Time step of the organisation's Port Performance form: view only.
 * Shows the port's values from the Ministry's monthly Excel upload.
 * dwellUpload: { values: { monthly_import, ..., ytd_overall }, uploadedDate } or null (not uploaded).
 */
export default function DwellTimeView({ dwellUpload }) {
  if (!dwellUpload) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <Info className="h-4 w-4 mt-px text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
        Dwell time for this month has not been uploaded by the Ministry yet. It will show here once the monthly sheet is uploaded.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3 text-xs font-semibold text-blue-800 dark:text-blue-200">
        <Eye className="h-4 w-4 mt-px flex-shrink-0" aria-hidden="true" />
        View only. Uploaded by the Ministry from the monthly Excel sheet
        {dwellUpload.uploadedDate ? ` on ${formatDate(dwellUpload.uploadedDate)}` : ''}. "-" means no data.
      </p>
      {DWELL_VALUE_GROUPS.map((g) => (
        <section key={g.title} className="space-y-2" aria-label={g.title}>
          <h4 className="module-form-section-title !mt-0">{g.title} (Hours)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {g.columns.map((c) => {
              const id = `pp-dwell-${c.key}`;
              return (
                <div key={c.key}>
                  <label htmlFor={id} className="module-form-label">{c.label}</label>
                  <input
                    id={id}
                    type="text"
                    readOnly
                    disabled
                    title={c.fullLabel}
                    className="module-form-input tabular-nums"
                    value={valueText(dwellUpload.values?.[c.key])}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
