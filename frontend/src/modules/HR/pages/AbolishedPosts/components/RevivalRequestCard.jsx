import { Save, Send } from 'lucide-react';

// Revival request for an abolished post, entered by the organisation
export default function RevivalRequestCard({ canChange, dateOfDecisionApproved, dateOfDecisionRejected, showDate, handleSendForRevival, handleUserUpdate, isOrg, processInitiatedDate, proposalForwardedDate, rejectRemarksUser, revivalStageId, setDateOfDecisionApproved, setDateOfDecisionRejected, setProcessInitiatedDate, setProposalForwardedDate, setRejectRemarksUser, submitting }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
    <div>
      {/* Header */}
      <div className="bg-[#7baaf7] dark:bg-blue-600 px-5 py-3 text-white text-center">
        <h3 className="text-sm font-bold tracking-wide uppercase">
          REQUEST ( To be entered by organisation )
        </h3>
      </div>

      {/* Form Table */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">

        {/* Field 1 */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
          <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            1. Date of Process initiated
          </label>
          <input
            type="date"
            value={processInitiatedDate}
            onChange={(e) => setProcessInitiatedDate(e.target.value)}
            disabled={!isOrg || Boolean(isOrg && revivalStageId >= 5)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Field 2 */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
          <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            2. Date of Approved for Revival at Organisation Level By Competent Authority
          </label>
          <input
            type="date"
            value={dateOfDecisionApproved}
            onChange={(e) => {
              setDateOfDecisionApproved(e.target.value);
              if (e.target.value) {
                setDateOfDecisionRejected('');
                setRejectRemarksUser('');
              }
            }}
            disabled={!isOrg || Boolean(isOrg && revivalStageId >= 5)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Field 3 */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Date of Rejected for Revival at Organisation Level By Competent Authority
            </label>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Remarks</span>
              <textarea
                rows="2"
                value={rejectRemarksUser}
                onChange={(e) => setRejectRemarksUser(e.target.value)}
                disabled={!isOrg || Boolean(isOrg && revivalStageId >= 5)}
                placeholder="Rejection remarks..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </div>
          <div className="flex items-start">
            <input
              type="date"
              value={dateOfDecisionRejected}
              onChange={(e) => {
                setDateOfDecisionRejected(e.target.value);
                if (e.target.value) {
                  setDateOfDecisionApproved('');
                }
              }}
              disabled={!isOrg || Boolean(isOrg && revivalStageId >= 5)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed mt-1"
            />
          </div>
        </div>

        {/* Field 4 */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
          <label className="sm:col-span-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            4. Date of proposal been forwarded to MoPSW
          </label>
          <input
            type="date"
            value={proposalForwardedDate}
            onChange={(e) => setProposalForwardedDate(e.target.value)}
            disabled={!isOrg || Boolean(isOrg && revivalStageId >= 5)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>

    {/* Org Action Buttons */}
    {isOrg && canChange && (
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
        {revivalStageId >= 5 ? (
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl w-full justify-center">
            <span>✓ Request has been sent to MoPSW on {showDate(proposalForwardedDate) || 'record'}</span>
          </div>
        ) : (
          <div className="flex justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={handleUserUpdate}
              disabled={submitting}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update</span>
            </button>
            <button
              type="button"
              onClick={handleSendForRevival}
              disabled={submitting}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send for Revival</span>
            </button>
          </div>
        )}
      </div>
    )}
    </div>
  );
}
