import { createPortal } from 'react-dom';
import { X, Edit3 } from 'lucide-react';
import { ModalButtons } from '../../../components/HrFormControls';

// Edit a post of the organisation structure (name, class, strength, pay scale)
export default function EditPostModal({ classes, formData, handleEditSubmit, isSubmitting, selectedPost, setFormData, setIsEditModalOpen }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => setIsEditModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-in my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Post</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update post information and strength</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">

          {/* Department (Readonly info) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Department:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPost.department_name}</span>
            </div>
          </div>

          {/* Post Name */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              Post Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.postName}
              onChange={e => setFormData(prev => ({ ...prev, postName: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              Class / Group <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.classId}
              onChange={e => setFormData(prev => ({ ...prev, classId: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {classes.map(c => (
                <option key={c.class_id} value={c.class_id}>
                  Class {c.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sanctioned Strength */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              Sanctioned Strength <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="999"
              required
              value={formData.sanctionedStrength}
              onChange={e => setFormData(prev => ({ ...prev, sanctionedStrength: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {Number(formData.sanctionedStrength) < Number(selectedPost?.sanctioned_strength) && (
              <p className="mt-1 text-2xs text-amber-600 dark:text-amber-400">
                Reducing strength: you will choose which vacant post codes to delete and give remarks.
              </p>
            )}
          </div>

          {/* Payscale Range */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              Payscale Range <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 50000-160000"
              value={formData.payscaleRange}
              onChange={e => setFormData(prev => ({ ...prev, payscaleRange: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <ModalButtons
              onCancel={() => setIsEditModalOpen(false)}
              busy={isSubmitting}
              submitType="submit"
              submitLabel="Update Post"
              busyLabel="Updating..."
            />
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
