import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button, ModalButtons, PostCodeTag } from './HrFormControls';
import ScrollTable from './ScrollTable';
import { MAX_DELETION_REASON, validateReduction } from '../utils/postStrength';

const formatDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

/**
 * Lowering a post's sanctioned strength, as on the legacy page: the user ticks exactly the number
 * of vacant post codes to remove and gives remarks; onConfirm(postCodes, reason) does the save.
 */
export default function ReducePostStrengthModal({ postName, conflict, isSubmitting, onConfirm, onCancel }) {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const { postsToDelete: required, currentStrength, requestedStrength, vacantPosts } = conflict;
  const notEnoughVacant = vacantPosts.length < required;
  const errors = useMemo(() => validateReduction({ selected, required, reason }), [selected, required, reason]);

  const toggle = (code) => {
    setSelected(prev => (prev.includes(code)
      ? prev.filter(c => c !== code)
      : prev.length < required ? [...prev, code] : prev));
  };

  const handleConfirm = () => {
    setShowErrors(true);
    if (notEnoughVacant || Object.keys(errors).length) return;
    onConfirm(selected, reason.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => !isSubmitting && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reduce-strength-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 id="reduce-strength-title" className="text-base font-bold text-slate-900 dark:text-white">Reduce Sanctioned Strength</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {postName}: {currentStrength} → {requestedStrength}. Delete {required} vacant post code{required === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {notEnoughVacant ? (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
            Only {vacantPosts.length} post code{vacantPosts.length === 1 ? ' is' : 's are'} vacant. Filled post codes cannot be deleted,
            so the strength can be reduced to {currentStrength - vacantPosts.length} at most.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Select the post codes to delete</span>
              <span className={`font-semibold ${selected.length === required ? 'text-emerald-600' : 'text-slate-500'}`}>
                {selected.length} of {required} selected
              </span>
            </div>
            <ScrollTable
              maxHeight="16rem"
              rows={vacantPosts}
              rowKey={(p) => p.post_code}
              headerClassName="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              rowClassName={(p) => (selected.includes(p.post_code) ? 'bg-rose-50/70 dark:bg-rose-900/20' : '')}
              columns={[
                {
                  key: 'select', label: '', width: '3rem', align: 'center',
                  render: (p) => {
                    const checked = selected.includes(p.post_code);
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={(!checked && selected.length >= required) || isSubmitting}
                        onChange={() => toggle(p.post_code)}
                        aria-label={`Delete post code ${p.post_code}`}
                        className="h-3.5 w-3.5 accent-rose-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    );
                  },
                },
                { key: 'sno', label: 'S.No', width: '3.5rem', render: (p, i) => <span className="text-slate-500">{i + 1}</span> },
                { key: 'code', label: 'Post Code', width: '9.5rem', render: (p) => <PostCodeTag>{p.post_code}</PostCodeTag> },
                { key: 'date', label: 'Date of Vacancy', width: '8rem', render: (p) => formatDate(p.date_of_arise_in_vacancy) },
                { key: 'method', label: 'Method of Appointment', render: (p) => p.method_of_appointment || '--' },
              ]}
            />
            {showErrors && errors.selection && <p className="mt-1.5 text-2xs text-rose-500">{errors.selection}</p>}

            <label htmlFor="reduce-strength-reason" className="block text-xs font-bold mt-4 mb-1 text-slate-700 dark:text-slate-300">
              Remarks / Reason for deletion <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reduce-strength-reason"
              rows={2}
              maxLength={MAX_DELETION_REASON}
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Posts surrendered as per order no. ..."
              className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border ${
                showErrors && errors.reason ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
              } rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            />
            <div className="flex justify-between text-2xs mt-0.5">
              <span className="text-rose-500">{showErrors ? errors.reason : ''}</span>
              <span className="text-slate-400">{reason.length}/{MAX_DELETION_REASON}</span>
            </div>
            <p className="mt-2 text-2xs text-slate-500 dark:text-slate-400">
              The selected post codes are kept in the deleted-posts history with these remarks.
            </p>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
          {notEnoughVacant ? (
            <Button onClick={onCancel}>Cancel</Button>
          ) : (
            <ModalButtons
              onCancel={onCancel}
              onSubmit={handleConfirm}
              busy={isSubmitting}
              submitVariant="danger"
              submitLabel="Delete & Update"
              busyLabel="Deleting..."
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
