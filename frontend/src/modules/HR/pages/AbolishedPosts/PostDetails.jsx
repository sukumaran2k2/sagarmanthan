import { useState, useEffect, useRef } from 'react';
import { fetchPostStrengthData, submitPostRevival, updateRevivePostApproval } from '../../api';
import { ArrowLeft } from 'lucide-react';
import { isOrganisationUser } from '../../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import RevivalRequestCard from './components/RevivalRequestCard';
import RevivalApprovalCard from './components/RevivalApprovalCard';
import { ymd } from '../../utils/dates';

export default function ViewAbolishedPostDetails({ postCode, initialData, onBack, initialViewMode, permissions, notify }) {
  const isOrg = isOrganisationUser();
  // Sending a revival request or approving one needs HR update rights (never for view-only admins)
  const canChange = !!permissions?.canEdit && !permissions?.isViewOnlyAdmin;
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

  const showDate = (val) => ymd(val) || (val ? String(val) : '');

  useEffect(() => {
    let isMounted = true;
    // Deferred a tick so the effect never sets state synchronously
    const timer = setTimeout(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPostStrengthData(code)
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
      await submitPostRevival(payload);
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
      await submitPostRevival(payload);
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
      await updateRevivePostApproval(payload);
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
                value={showDate(vacancyDate)}
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
              <RevivalRequestCard
                canChange={canChange}
                dateOfDecisionApproved={dateOfDecisionApproved}
                dateOfDecisionRejected={dateOfDecisionRejected}
                showDate={showDate}
                handleSendForRevival={handleSendForRevival}
                handleUserUpdate={handleUserUpdate}
                isOrg={isOrg}
                processInitiatedDate={processInitiatedDate}
                proposalForwardedDate={proposalForwardedDate}
                rejectRemarksUser={rejectRemarksUser}
                revivalStageId={revivalStageId}
                setDateOfDecisionApproved={setDateOfDecisionApproved}
                setDateOfDecisionRejected={setDateOfDecisionRejected}
                setProcessInitiatedDate={setProcessInitiatedDate}
                setProposalForwardedDate={setProposalForwardedDate}
                setRejectRemarksUser={setRejectRemarksUser}
                submitting={submitting}
              />
            )}

            {/* 2. RIGHT CARD: APPROVAL (MoPSW) */}
            {(activeView === 'approval' || activeView === 'both') && (
            <RevivalApprovalCard
              approvalDateFromDOE={approvalDateFromDOE}
              canChange={canChange}
              handleAdminApprove={handleAdminApprove}
              handleAdminReject={handleAdminReject}
              handleAdminUpdate={handleAdminUpdate}
              isOrg={isOrg}
              orderForCreationDate={orderForCreationDate}
              proposalSentToDoeDate={proposalSentToDoeDate}
              rejectionDateFromDOE={rejectionDateFromDOE}
              remarksRejectAdmin={remarksRejectAdmin}
              setApprovalDateFromDOE={setApprovalDateFromDOE}
              setOrderForCreationDate={setOrderForCreationDate}
              setProposalSentToDoeDate={setProposalSentToDoeDate}
              setRejectionDateFromDOE={setRejectionDateFromDOE}
              setRemarksRejectAdmin={setRemarksRejectAdmin}
              submitting={submitting}
            />
            )}

          </div>
        </>
      )}
    </div>
  );
}
