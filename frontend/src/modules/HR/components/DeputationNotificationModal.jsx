import { HrModal, Button, EditActionButton, CodeText } from './HrFormControls';

// Lists employees whose deputation period has ended and still need an activity recorded.
export default function DeputationNotificationModal({
  isOpen,
  rows = [],
  loading = false,
  canEdit = false,
  onClose,
  onSelect,
}) {
  const count = rows.length;

  return (
    <HrModal
      isOpen={isOpen}
      title="Deputation period completed"
      subtitle="Employees whose deputation has ended and need an activity recorded"
      onClose={onClose}
      maxWidth="max-w-[900px]"
      footer={
        <>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {count === 1 ? '1 employee pending' : `${count} employees pending`}
          </span>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
      ) : count === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No employee has a pending end-of-deputation action.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="w-12 px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Employee</th>
                <th className="px-4 py-2.5 font-semibold">Deputed from</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                {canEdit && <th className="px-4 py-2.5 font-semibold text-center">Activity</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, idx) => (
                <tr
                  key={`${row.employee_id}-${row.emp_master_id}`}
                  className="text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 align-top text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{row.emp_name || '—'}</div>
                    <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      Ref. / personnel no. <CodeText>{row.emp_reference_id}</CodeText>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">{row.emp_from || '—'}</td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {row.status || 'End of Deputation'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-center align-top">
                      <EditActionButton
                        label={`Record activity for ${row.emp_name || 'employee'}`}
                        onClick={() => onSelect?.(row)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrModal>
  );
}
