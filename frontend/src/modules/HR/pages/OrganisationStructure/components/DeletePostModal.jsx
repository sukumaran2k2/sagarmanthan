import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { ModalButtons } from '../../../components/HrFormControls';
import { MAX_DELETION_REASON } from '../postStrength';

// Delete a post of the organisation structure, with the reason for deletion
export default function DeletePostModal({ deleteReason, deleteReasonError, handleDeleteSubmit, isSubmitting, selectedPost, setDeleteReason, setDeleteReasonError, setIsDeleteModalOpen }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => setIsDeleteModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Post</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Confirm post removal</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{selectedPost.post_name}"</span>?
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
            <strong>Warning:</strong> This will delete this post and its vacant post slots. Posts with active assigned employees cannot be deleted.
          </div>
          <div>
            <label htmlFor="delete-post-reason" className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              Reason for deletion <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="delete-post-reason"
              rows={2}
              maxLength={MAX_DELETION_REASON}
              value={deleteReason}
              onChange={e => { setDeleteReason(e.target.value); setDeleteReasonError(''); }}
              disabled={isSubmitting}
              placeholder="e.g. Post abolished as per order no. ..."
              className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border ${
                deleteReasonError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
              } rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            />
            <div className="flex justify-between text-2xs mt-0.5">
              <span className="text-rose-500">{deleteReasonError}</span>
              <span className="text-slate-400">{deleteReason.length}/{MAX_DELETION_REASON}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
          <ModalButtons
            onCancel={() => setIsDeleteModalOpen(false)}
            onSubmit={handleDeleteSubmit}
            busy={isSubmitting}
            submitVariant="danger"
            submitLabel="Delete Post"
            busyLabel="Deleting..."
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
