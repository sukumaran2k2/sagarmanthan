import { Save, Check, X } from 'lucide-react';

// Ministry decision on a revival request (approve / reject)
export default function RevivalApprovalCard({ approvalDateFromDOE, canChange, handleAdminApprove, handleAdminReject, handleAdminUpdate, isOrg, orderForCreationDate, proposalSentToDoeDate, rejectionDateFromDOE, remarksRejectAdmin, setApprovalDateFromDOE, setOrderForCreationDate, setProposalSentToDoeDate, setRejectionDateFromDOE, setRemarksRejectAdmin, submitting }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="bg-[#81c784] dark:bg-emerald-600 px-5 py-3 text-white text-center">
          <h3 className="text-sm font-bold tracking-wide uppercase">
            APPROVAL (MoPSW)
          </h3>
        </div>

        {/* Form Table */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">

          {/* Field 1 */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
            <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Date Proposal Sent to DoE
            </label>
            <input
              type="date"
              value={proposalSentToDoeDate}
              onChange={(e) => setProposalSentToDoeDate(e.target.value)}
              disabled={isOrg}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Field 2 */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Date of Approval Response Received from DoE
              </label>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Remarks</span>
                <textarea
                  rows="2"
                  value={remarksRejectAdmin}
                  onChange={(e) => setRemarksRejectAdmin(e.target.value)}
                  disabled={isOrg}
                  placeholder="DoE Remarks..."
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed resize-none"
                />
              </div>
            </div>
            <div className="flex items-start">
              <input
                type="date"
                value={approvalDateFromDOE}
                onChange={(e) => {
                  setApprovalDateFromDOE(e.target.value);
                  if (e.target.value) setRejectionDateFromDOE('');
                }}
                disabled={isOrg}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed mt-1"
              />
            </div>
          </div>

          {/* Field 3 */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
            <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Date of Reject Response Received from DoE
            </label>
            <input
              type="date"
              value={rejectionDateFromDOE}
              onChange={(e) => {
                setRejectionDateFromDOE(e.target.value);
                if (e.target.value) setApprovalDateFromDOE('');
              }}
              disabled={isOrg}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Field 4 */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
            <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              4. Date of Order for Creation of Post Issued
            </label>
            <input
              type="date"
              value={orderForCreationDate}
              onChange={(e) => setOrderForCreationDate(e.target.value)}
              disabled={isOrg}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Admin/Ministry Action Buttons */}
      {!isOrg && canChange && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleAdminUpdate()}
            disabled={submitting}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Update</span>
          </button>
          <button
            type="button"
            onClick={handleAdminApprove}
            disabled={submitting}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            onClick={handleAdminReject}
            disabled={submitting}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
}
