import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Clock, CheckCheck, AlertTriangle,
  RefreshCw, Building2, FolderOpen, CalendarDays, User, FileText, Filter,
} from 'lucide-react';
import { fetchDropRequests, acceptDropRequest, rejectDropProject } from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ row }) {
  if (row.status === 0 && row.drop_date) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800">
        <CheckCheck className="h-3 w-3" /> Accepted - Dropped
      </span>
    );
  }
  if (row.reject_request_status === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Confirmation Modal
// ─────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel, children }) {
  if (!open) return null;
  const btnCls = confirmColor === 'green'
    ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white'
    : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 animate-fade-in">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm ${btnCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Request Card
// ─────────────────────────────────────────────────────────────

function RequestCard({ row, isMinistry, onAccept, onReject, busy }) {
  const isPending = row.reject_request_status !== 0 && !row.drop_date;
  const isDropped = row.status === 0 && !!row.drop_date;
  const isRejected = row.reject_request_status === 0;
  const hasSub = row.sub_project_id && row.sub_project_id !== '-1' && String(row.sub_project_id) !== '';

  const borderCls = isDropped
    ? 'border-red-200 dark:border-red-900/40 bg-gradient-to-b from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/10'
    : isRejected
    ? 'border-amber-200 dark:border-amber-900/40 bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/10'
    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

  return (
    <div className={`border rounded-2xl shadow-sm p-4.5 space-y-3.5 transition hover:shadow-md ${borderCls}`}>
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          {hasSub ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Sub Project</span>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{row.sub_project_id}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{row.sub_project_name || '-'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">Main Project</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{row.project_id}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{row.project_name}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Project</span>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{row.project_id}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{row.project_name}</p>
            </>
          )}
        </div>
        <StatusBadge row={row} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {row.organisation_name && (
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />{row.organisation_name}</span>
        )}
        {row.stage_name && (
          <span className="flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />{row.stage_name}</span>
        )}
        {row.name && (
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />{row.name}</span>
        )}
        {row.submitted_on && (
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />Submitted {fmt(row.submitted_on)}</span>
        )}
        {row.sanctioned_cost && (
          <span>₹{Number(row.sanctioned_cost).toLocaleString('en-IN')} Cr</span>
        )}
      </div>

      {/* Drop reason */}
      {row.remarks && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mb-0.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" /> Drop Reason:
          </span>
          {row.remarks}
        </div>
      )}

      {/* Rejection remark */}
      {isRejected && row.drop_rejected_remarks && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <span className="font-semibold flex items-center gap-1 mb-0.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Rejection Remark:
          </span>
          {row.drop_rejected_remarks}
        </div>
      )}

      {/* Drop date */}
      {isDropped && row.drop_date && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
          <CheckCheck className="h-3.5 w-3.5" /> Dropped on {fmt(row.drop_date)}
        </p>
      )}

      {/* Action buttons — ministry only */}
      {isMinistry && isPending && (
        <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
          <button
            disabled={busy}
            onClick={() => onAccept(row)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-60 transition shadow-sm"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Accept & Drop
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(row)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-60 transition shadow-sm"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject Request
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'pending',  label: 'Pending',           color: 'text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { id: 'accepted', label: 'Accepted / Dropped', color: 'text-red-700 dark:text-red-300 border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/40' },
  { id: 'rejected', label: 'Rejected',           color: 'text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { id: 'all',      label: 'All Requests',       color: 'text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800' },
];

export default function DropRequestsPage({ notify }) {
  const permissions = useProjectsPermissions();
  const isMinistry = permissions.viewMode === 'ministry' || permissions.viewMode === 'standard';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');

  const [acceptModal, setAcceptModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDropRequests(permissions.userId);
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      if (notify) notify('Failed to load drop requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [permissions.userId, notify]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async () => {
    if (!acceptModal) return;
    setBusy(true);
    try {
      const row = acceptModal;
      const subId = row.sub_project_id && row.sub_project_id !== '' ? row.sub_project_id : '-1';
      await acceptDropRequest(row.project_id, subId);
      if (notify) notify('Project dropped successfully.', 'success');
      window.dispatchEvent(new Event('drop-request-updated'));
      await load();
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.message) || 'Failed to accept drop request.';
      if (notify) notify(msg, 'error');
    } finally {
      setBusy(false);
      setAcceptModal(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) { if (notify) notify('Please enter a rejection reason.', 'error'); return; }
    setBusy(true);
    try {
      const row = rejectModal;
      const subId = row.sub_project_id && row.sub_project_id !== '' ? row.sub_project_id : '-1';
      await rejectDropProject({ projectID: row.project_id, subProjectID: subId, reason });
      if (notify) notify('Drop request rejected.', 'success');
      window.dispatchEvent(new Event('drop-request-updated'));
      await load();
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.message) || 'Failed to reject drop request.';
      if (notify) notify(msg, 'error');
    } finally {
      setBusy(false);
      setRejectModal(null);
      setRejectReason('');
    }
  };

  const filtered = rows.filter((r) => {
    if (filter === 'pending')  return r.reject_request_status !== 0 && !r.drop_date;
    if (filter === 'accepted') return r.status === 0 && !!r.drop_date;
    if (filter === 'rejected') return r.reject_request_status === 0;
    return true;
  });

  const pendingCount = rows.filter((r) => r.reject_request_status !== 0 && !r.drop_date).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <span>Drop Requests Management</span>
            {pendingCount > 0 && (
              <span className="text-[11px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                {pendingCount} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isMinistry
              ? 'Ministry View: Review, accept (drop), or reject project drop requests submitted by organisations.'
              : 'Organisation View: Track the review status and decisions for your submitted project drop requests.'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
              filter === f.id ? `${f.color} border-current shadow-xs` : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Filter className="h-3 w-3" />
              {f.label}
              {f.id === 'pending' && pendingCount > 0 && (
                <span className="ml-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">{pendingCount}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading drop requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <CheckCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            No {filter === 'all' ? '' : filter} drop requests found.
          </p>
          {filter === 'pending' && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All submitted requests have been actioned.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((row, idx) => (
            <RequestCard
              key={`${row.project_id}-${row.sub_project_id}-${idx}`}
              row={row}
              isMinistry={isMinistry}
              busy={busy}
              onAccept={(r) => setAcceptModal(r)}
              onReject={(r) => { setRejectModal(r); setRejectReason(''); }}
            />
          ))}
        </div>
      )}

      {/* Accept modal */}
      <ConfirmModal
        open={!!acceptModal}
        title="Accept Drop Request"
        confirmLabel="Yes, Drop the Project"
        confirmColor="green"
        onConfirm={handleAccept}
        onCancel={() => setAcceptModal(null)}
        message={
          acceptModal
            ? `Are you sure you want to accept the drop request for "${acceptModal.sub_project_name || acceptModal.project_name}"? This will mark the project as dropped.`
            : ''
        }
      />

      {/* Reject modal */}
      <ConfirmModal
        open={!!rejectModal}
        title="Reject Drop Request"
        confirmLabel="Submit Rejection"
        confirmColor="red"
        onConfirm={handleReject}
        onCancel={() => { setRejectModal(null); setRejectReason(''); }}
        message={
          rejectModal
            ? `Provide a reason for rejecting the drop request for "${rejectModal.sub_project_name || rejectModal.project_name}".`
            : ''
        }
      >
        <textarea
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          rows={3}
          placeholder="Enter rejection reason..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </ConfirmModal>
    </div>
  );
}
