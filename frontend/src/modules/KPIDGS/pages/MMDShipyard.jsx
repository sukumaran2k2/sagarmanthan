import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edit, Plus, X } from 'lucide-react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { useKPIDGSPermissions } from '../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { DGS_TOASTS } from '../toastMessages';
import { fetchShipyardList, createShipyard, updateShipyard, updateShipyardStatus } from '../api';

// MMD Shipyard list with Add Details, edit modal, and status toggle (same pattern as MMDMaster).
export default function MMDShipyard({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [shipyardName, setShipyardName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    fetchShipyardList()
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Error loading shipyard list:', err);
        notify(COMMON_TOASTS.loadFailed('Shipyard list'));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [canView, reloadKey, notify]);

  useEffect(() => {
    if (showForm) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showForm]);

  const openAdd = () => {
    setEditRow(null);
    setShipyardName('');
    setShowForm(true);
  };
  const openEdit = (row) => {
    setEditRow(row);
    setShipyardName(row.shipyard_name || '');
    setShowForm(true);
  };
  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditRow(null);
    setShipyardName('');
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const name = shipyardName.trim();
    if (!name) {
      notify(DGS_TOASTS.shipyardNameRequired());
      return;
    }
    const duplicate = rows.some(
      (r) => r.shipyard_name?.trim().toLowerCase() === name.toLowerCase() &&
        (!editRow || r.shipyard_id !== editRow.shipyard_id)
    );
    if (duplicate) {
      notify(DGS_TOASTS.shipyardDuplicate());
      return;
    }
    setSaving(true);
   try {
  if (editRow) {
    await updateShipyard(editRow.shipyard_id, name,);
    notify(DGS_TOASTS.updated('Shipyard'));
  } else {
    await createShipyard(name);
    notify(DGS_TOASTS.added('Shipyard'));
  }
  setReloadKey((k) => k + 1);
  closeForm();
    } catch (err) {
    console.error('Error saving shipyard:', err);
    notify(DGS_TOASTS.saveFailed(!!editRow, getErrorMessage(err)));
    } finally {
    setSaving(false);
    }
  }, [shipyardName, editRow, rows, notify]);

  const handleToggleStatus = useCallback(async (row) => {
  const next = row.status ? 0 : 1;
  setRows((prev) => prev.map((r) => (r.shipyard_id === row.shipyard_id ? { ...r, status: next } : r)));
  try {
    await updateShipyardStatus(row.shipyard_id, next);
    notify(DGS_TOASTS.statusChanged(row.shipyard_name, next));
  } catch (err) {
    console.error('Error updating shipyard status:', err);
    setRows((prev) => prev.map((r) => (r.shipyard_id === row.shipyard_id ? { ...r, status: row.status } : r)));
    notify(DGS_TOASTS.statusFailed(getErrorMessage(err)));
  }
}, [notify]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1,
      minWidth: 90, maxWidth: 110,
      cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center',
    },
    {
      headerName: 'Shipyard Name', field: 'shipyard_name', flex: 2, minWidth: 180,
      cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold',
    },
    {
      headerName: 'Status', field: 'status', flex: 1, minWidth: 140,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (p) => (
        <button
          type="button"
          role="switch"
          aria-checked={!!p.data.status}
          disabled={!canEdit}
          onClick={() => canEdit && handleToggleStatus(p.data)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            p.data.status ? 'bg-emerald-500' : 'bg-slate-300'
          } ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}
          title={p.data.status ? 'Active (click to disable)' : 'Inactive (click to enable)'}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              p.data.status ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      ),
    },
    ...(canEdit ? [{
      headerName: 'Action', field: 'shipyard_id', flex: 1, minWidth: 100,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (p) => (
        <button
          type="button"
          onClick={() => openEdit(p.data)}
          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded transition cursor-pointer"
          title="Edit Shipyard"
        >
          <Edit className="h-4 w-4" />
        </button>
      ),
    }] : []),
  ], [canEdit, handleToggleStatus]);

  if (!canView && !canAdd) {
    return null; // outer wrapper handles RestrictedAccess
  }

  return (
    <div className="module-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">MMD Shipyard</h2>
        {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Details
          </button>
        )}
      </div>

      <TableWithToolbar
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        searchPlaceholder="Search shipyard..."
        exportFileName="mmd_shipyard"
        triggerNotification={triggerNotification}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editRow ? 'Edit Shipyard' : 'Add Shipyard'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Shipyard Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={shipyardName}
                  onChange={(e) => setShipyardName(e.target.value)}
                  disabled={saving}
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded focus:outline-none focus:border-[#0f417a]"
                  placeholder="e.g. Cochin Shipyard"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0f417a] rounded hover:bg-[#1d5594] transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editRow ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
