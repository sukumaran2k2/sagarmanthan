import { useState, useEffect, useRef } from 'react';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import { ArrowLeft, Save, Send, Check, X } from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import { isOrganisationUser } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';

export default function ViewAbolishedPostDetails({ postCode, initialData, onBack, initialViewMode, notify }) {
  const isOrg = isOrganisationUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Read the notifier through a ref so the load effect does not re-run after a toast
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  // Top header fields
  const [code, setCode] = useState(postCode || initialData?.['Post code'] || '');
  const [vacancyDate, setVacancyDate] = useState('');

  // Left form (REQUEST - Organisation)
  const [processInitiatedDate, setProcessInitiatedDate] = useState('');
  const [dateOfDecisionApproved, setDateOfDecisionApproved] = useState('');
  const [dateOfDecisionRejected, setDateOfDecisionRejected] = useState('');
  const [rejectRemarksUser, setRejectRemarksUser] = useState('');
  const [proposalForwardedDate, setProposalForwardedDate] = useState('');

  // Right form (APPROVAL - MoPSW)
  const [proposalSentToDoeDate, setProposalSentToDoeDate] = useState('');
  const [approvalDateFromDOE, setApprovalDateFromDOE] = useState('');
  const [remarksRejectAdmin, setRemarksRejectAdmin] = useState('');
  const [rejectionDateFromDOE, setRejectionDateFromDOE] = useState('');
  const [orderForCreationDate, setOrderForCreationDate] = useState('');

  // Stage ID tracker
  const [revivalStageId, setRevivalStageId] = useState(0);

  // View mode when both forms or approval form are available: 'request' | 'approval' | 'both'
  // The page remounts for each post, so the initial view mode is all that is needed
  const [viewMode, setViewMode] = useState(initialViewMode || null);

  const hasMinistryFilled = Boolean(
    proposalSentToDoeDate ||
    approvalDateFromDOE ||
    rejectionDateFromDOE ||
    orderForCreationDate ||
    (remarksRejectAdmin && remarksRejectAdmin.trim()) ||
    revivalStageId >= 6
  );

  const activeView = viewMode !== null
    ? viewMode
    : (isOrg ? (hasMinistryFilled ? 'approval' : 'request') : 'both');

  const formatForDateInput = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formatDDMMYYYY = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(val);
    }
  };

  useEffect(() => {
    let isMounted = true;
    // Deferred a tick so the effect never sets state synchronously
    const timer = setTimeout(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    setLoading(true);
    axios.get(`${API_BASE_URL}/get-strength-data/${code}`)
      .then(res => {
        if (!isMounted) return;
        const rows = res.data || [];
        const row = rows[0] || initialData?._raw || {};

        setCode(row.post_code || code);
        setVacancyDate(formatForDateInput(row.date_of_arise_in_vacancy));
        setRevivalStageId(row.revival_stage_id || 0);

        // Request fields
        setProcessInitiatedDate(formatForDateInput(row.revival_process_initiated));
        if (!row.revival_remarks) {
          setDateOfDecisionApproved(formatForDateInput(row.revival_date));
          setDateOfDecisionRejected('');
          setRejectRemarksUser('');
        } else {
          setDateOfDecisionApproved('');
          setDateOfDecisionRejected(formatForDateInput(row.revival_date));
          setRejectRemarksUser(row.revival_remarks || '');
        }
        setProposalForwardedDate(formatForDateInput(row.revival_submission_date));

        // Approval fields
        setProposalSentToDoeDate(formatForDateInput(row.revive_proposal_sent_to_doe_date));
        setApprovalDateFromDOE(formatForDateInput(row.revive_approval_date_from_doe));
        setRemarksRejectAdmin(row.revive_remarks_from_doe || '');
        setRejectionDateFromDOE(formatForDateInput(row.revive_rejection_date_from_doe));
        setOrderForCreationDate(formatForDateInput(row.order_of_revival_issued_date));
      })
      .catch(err => {
        console.error("Failed to load post strength details:", err);
        if (isMounted) notifyRef.current?.(COMMON_TOASTS.loadFailed('The post details'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    }, 0);

    return () => { isMounted = false; clearTimeout(timer); };
    // initialData is only a fallback for the first load of this post
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Org Update (Save Draft)
  const handleUserUpdate = async () => {
    if (!processInitiatedDate) {
      notify?.(HR_TOASTS.revivalFieldRequired('date of process initiated'));
      return;
    }

    if (dateOfDecisionRejected && !rejectRemarksUser) {
      notify?.(HR_TOASTS.revivalFieldRequired('remarks for rejection'));
      return;
    }

    setSubmitting(true);
    let stageId = 1;
    if (dateOfDecisionApproved) stageId = 3;
    else if (dateOfDecisionRejected) stageId = 4;
    if (proposalForwardedDate) stageId = 5;

    const payload = {
      postCode: code,
      processInitiatedDate: processInitiatedDate || null,
      dateOfDcisionTakenApproved: dateOfDecisionApproved || null,
      dateOfDcisionTakenRejected: dateOfDecisionRejected || null,
      rejectRemarksUser: rejectRemarksUser || null,
      proposalForwardedDate: proposalForwardedDate || null,
      reviveStageID: stageId,
      reviveSubmissionDate: stageId === 5 ? new Date().toISOString().split('T')[0] : null
    };

    try {
      await axios.post(`${API_BASE_URL}/post-revive-detail`, payload);
      notify?.(HR_TOASTS.revivalDetailsUpdated());
    } catch (err) {
      console.error(err);
      notify?.(HR_TOASTS.revivalDetailsFailed(getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  // Org Send for Revival
  const handleSendForRevival = async () => {
    if (!processInitiatedDate) {
      notify?.(HR_TOASTS.revivalFieldRequired('date of process initiated'));
      return;
    }

    if (!dateOfDecisionApproved && !dateOfDecisionRejected) {
      notify?.(HR_TOASTS.revivalFieldRequired('date of approval or rejection for revival'));
      return;
    }

    if (dateOfDecisionRejected && !rejectRemarksUser) {
      notify?.(HR_TOASTS.revivalFieldRequired('rejection remarks'));
      return;
    }

    if (!proposalForwardedDate) {
      notify?.(HR_TOASTS.revivalFieldRequired('date the proposal was forwarded to MoPSW'));
      return;
    }

    setSubmitting(true);
    const payload = {
      postCode: code,
      processInitiatedDate: processInitiatedDate,
      dateOfDcisionTakenApproved: dateOfDecisionApproved || null,
      dateOfDcisionTakenRejected: dateOfDecisionRejected || null,
      rejectRemarksUser: rejectRemarksUser || null,
      proposalForwardedDate: proposalForwardedDate,
      reviveStageID: 5,
      reviveSubmissionDate: new Date().toISOString().split('T')[0]
    };

    try {
      await axios.post(`${API_BASE_URL}/post-revive-detail`, payload);
      notify?.(HR_TOASTS.revivalSubmitted());
      setRevivalStageId(5);
    } catch (err) {
      console.error(err);
      notify?.(HR_TOASTS.revivalSubmitFailed(getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  // Admin/MoPSW Update
  const handleAdminUpdate = async (overrideStageId) => {
    setSubmitting(true);
    let stageId = overrideStageId !== undefined ? overrideStageId : revivalStageId;
    if (!overrideStageId) {
      if (orderForCreationDate) stageId = 9;
      else if (rejectionDateFromDOE) stageId = 8;
      else if (approvalDateFromDOE) stageId = 7;
      else if (proposalSentToDoeDate) stageId = 6;
    }

    const payload = {
      postCode: code,
      proposalSentToDoeDate: proposalSentToDoeDate || null,
      approvalDateFromDOE: approvalDateFromDOE || null,
      rejectionDateFromDOE: rejectionDateFromDOE || null,
      orderForCreationDate: orderForCreationDate || null,
      remarksRejectAdmin: remarksRejectAdmin || null,
      reviveStageID: stageId
    };

    try {
      await axios.post(`${API_BASE_URL}/update-revive-post-approval`, payload);
      notify?.(overrideStageId === 9
        ? HR_TOASTS.revivalApproved()
        : overrideStageId === 8
          ? HR_TOASTS.revivalRejected()
          : HR_TOASTS.approvalDetailsUpdated());
      setRevivalStageId(stageId);
    } catch (err) {
      console.error(err);
      notify?.(HR_TOASTS.approvalDetailsFailed(getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminApprove = () => {
    if (!orderForCreationDate) {
      notify?.(HR_TOASTS.revivalFieldRequired('date of the order for creation of the post'));
      return;
    }
    handleAdminUpdate(9);
  };

  const handleAdminReject = () => {
    if (!rejectionDateFromDOE && !remarksRejectAdmin) {
      notify?.(HR_TOASTS.revivalFieldRequired('rejection date or the remarks from DoE'));
      return;
    }
    handleAdminUpdate(8);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Header with Title & Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          View Abolished Post Details
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Post Code & Date of Vacancy inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Post Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                disabled
                className="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Date of arise in vacancy <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formatDDMMYYYY(vacancyDate)}
                disabled
                className="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* View Selector if approval has been filled or in ministry view */}
          {(hasMinistryFilled || !isOrg) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">View:</span>
              <button
                type="button"
                onClick={() => setViewMode('approval')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeView === 'approval'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Approval Form (MoPSW)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('request')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeView === 'request'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Request Form (Organisation)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeView === 'both'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                View Both
              </button>
            </div>
          )}

          {/* Columns Grid: REQUEST & APPROVAL */}
          <div className={`grid grid-cols-1 ${activeView === 'both' ? 'lg:grid-cols-2' : 'max-w-3xl'} gap-6`}>

            {/* 1. LEFT CARD: REQUEST (To be entered by organisation) */}
            {(activeView === 'request' || activeView === 'both') && (
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
              {isOrg && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  {revivalStageId >= 5 ? (
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl w-full justify-center">
                      <span>✓ Request has been sent to MoPSW on {formatDDMMYYYY(proposalForwardedDate) || 'record'}</span>
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
            )}

            {/* 2. RIGHT CARD: APPROVAL (MoPSW) */}
            {(activeView === 'approval' || activeView === 'both') && (
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
              {!isOrg && (
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
            )}

          </div>
        </>
      )}
    </div>
  );
}
