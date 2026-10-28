import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import ConfirmModal from '../../../components/ConfirmModal';
import { DeleteActionButton } from './HrFormControls';
import { fetchNonPortUploads, deleteNonPortUpload } from '../api';
import { getSessionOrganisationId } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import { monthName, storedDate } from '../utils/nonPortDashboard';

const EXPORT_HEADERS = ['S.No', 'File ID', 'Financial Year', 'Uploaded Month', 'File Name', 'Uploaded By', 'Date of Upload'];

/** Files the organisation has uploaded (legacy otherOrghrMonthlyUploadHistory), with delete. */
export default function NonPortUploadHistory({ notify, triggerNotification }) {
  const orgId = useMemo(() => getSessionOrganisationId(), []);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(orgId));
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    if (!orgId) return Promise.resolve();
    return fetchNonPortUploads(orgId)
      .then((res) => setRows(Array.isArray(res.data?.rowData) ? res.data.rowData : []))
      .catch(() => notify?.(COMMON_TOASTS.loadFailed('Upload history')))
      .finally(() => setLoading(false));
  }, [orgId, notify]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r['File ID'], r['Financial Year'], monthName(r.Month), r['File Name'], r['Uploaded By'], storedDate(r['Date of Upload'])]
      .join(' ').toLowerCase().includes(q));
  }, [rows, search]);

  const exportRows = useMemo(() => filtered.map((r, i) => [
    i + 1, r['File ID'], r['Financial Year'], monthName(r.Month) || '-', r['File Name'], r['Uploaded By'] || '-', storedDate(r['Date of Upload']),
  ]), [filtered]);

  const confirmDelete = async () => {
    const fileId = pendingDelete?.['File ID'];
    if (!fileId) {
      notify?.(HR_TOASTS.recordIdMissing());
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteNonPortUpload(fileId);
      setRows((prev) => prev.filter((r) => r['File ID'] !== fileId));
      notify?.(HR_TOASTS.monthlyUploadDeleted(pendingDelete['File Name']));
      setPendingDelete(null);
    } catch (err) {
      notify?.(HR_TOASTS.monthlyUploadDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  // Centred like the legacy history page; styles in ../hrTables.css (.hr-nonport-grid)
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 72, maxWidth: 80, sortable: false, filter: false,
      headerClass: 'np-center', cellClass: 'np-center np-muted',
    },
    { headerName: 'File ID', field: 'File ID', minWidth: 90, headerClass: 'np-center', cellClass: 'np-center' },
    { headerName: 'Financial Year', field: 'Financial Year', minWidth: 110, headerClass: 'np-center', cellClass: 'np-center' },
    {
      headerName: 'Uploaded Month', valueGetter: (p) => monthName(p.data?.Month) || '-', minWidth: 120,
      headerClass: 'np-center', cellClass: 'np-center',
    },
    {
      headerName: 'File Name', field: 'File Name', flex: 3, minWidth: 260, wrapText: true, autoHeight: true,
      headerClass: 'np-center', cellClass: 'np-center np-break-all',
    },
    {
      headerName: 'Uploaded By', field: 'Uploaded By', flex: 1, minWidth: 150, wrapText: true, autoHeight: true,
      headerClass: 'np-center', cellClass: 'np-center np-strong',
    },
    {
      headerName: 'Date of Upload', valueGetter: (p) => storedDate(p.data?.['Date of Upload']), minWidth: 120,
      headerClass: 'np-center', cellClass: 'np-center',
    },
    {
      headerName: 'Actions', minWidth: 96, maxWidth: 110, sortable: false, filter: false, headerClass: 'np-center', cellClass: 'np-center',
      cellRenderer: (p) => (
        <div className="flex items-center justify-center h-full">
          <DeleteActionButton solid label="Delete uploaded file" onClick={() => setPendingDelete(p.data)} />
        </div>
      ),
    },
  ], []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            aria-label="Search upload history"
            placeholder="Search upload history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder-slate-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-transparent border-none text-xs font-bold focus:outline-hidden cursor-pointer p-0"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          Total: {filtered.length}
        </div>
        <CopyButton headers={EXPORT_HEADERS} data={exportRows} triggerNotification={triggerNotification} color="#0f417a" hoverBg="#f1f5f9" />
        <ExportDropdown
          headers={EXPORT_HEADERS}
          data={exportRows}
          fileName="Non_Port_Upload_History"
          title="Non Port Monthly Upload History"
          triggerNotification={triggerNotification}
          color="#0f417a"
          hoverColor="#134e96"
        />
      </div>

      <div className="p-4 hr-nonport-grid">
        <Table
          rowData={filtered}
          columnDefs={columnDefs}
          loading={loading}
          loadingMessage="Loading upload history..."
          paginationPageSize={pageSize}
          color="#0f417a"
          domLayout="autoHeight"
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Uploaded File"
        message={`Delete ${pendingDelete?.['File Name'] || 'this file'} (${monthName(pendingDelete?.Month)} ${pendingDelete?.['Financial Year'] ?? ''}) and the vacancy details it loaded? This cannot be undone.`}
        confirmText="Delete"
        loadingText="Deleting..."
      />
    </div>
  );
}
