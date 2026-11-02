import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import ModuleFilesHistoryView from '../../../components/ModuleFilesHistoryView';
import ConfirmModal from '../../../components/ConfirmModal';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { EOFFICE_TOASTS } from '../toastMessages';
import { useEOfficeStore } from '../store/useEOfficeStore';
import { saveBlob } from '../utils/eOfficeUtils';

// The sheets uploaded for one category, newest first. Each can be downloaded; deleting
// one (delete permission) also deletes the rows uploaded from it.
export default function FilesPage({ category, notify, reloadKey, canDelete, onDeleted }) {
  const pageSize = useEOfficeStore((state) => state.pageSize);
  const setPageSize = useEOfficeStore((state) => state.setPageSize);

  const requestKey = `${category.id}:${reloadKey}`;
  const [result, setResult] = useState(null); // { key, rows }
  useEffect(() => {
    let cancelled = false;
    api.get(`/${category.prefix}-History`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.rowData || [];
        if (!cancelled) setResult({ key: requestKey, rows });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('E-Office files could not be loaded:', err);
        setResult({ key: requestKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed(`The uploaded ${category.label} files`));
      });
    return () => { cancelled = true; };
  }, [requestKey, category, notify]);
  const loading = result?.key !== requestKey;

  const [deleteAsk, setDeleteAsk] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const columnDefs = useMemo(() => {
    const download = (file) => {
      api.get(`/${category.prefix}/download/${file.id}`, { responseType: 'blob' })
        .then((res) => {
          saveBlob(res.data, file['File Name']);
          notify(COMMON_TOASTS.downloadStarted(file['File Name']));
        })
        .catch((err) => {
          console.error('E-Office file download failed:', err);
          notify(EOFFICE_TOASTS.fileDownloadFailed());
        });
    };
    return [
      {
        headerName: 'S.No', width: 80, pinned: 'left',
        valueGetter: (p) => p.node.rowIndex + 1,
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
      },
      {
        headerName: 'File Name', field: 'File Name', flex: 3, minWidth: 260,
        cellRenderer: (p) => (
          <button type="button" onClick={() => download(p.data)} className="flex items-center gap-2 truncate font-semibold text-[#0f417a] dark:text-blue-400 hover:underline cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{p.value || '—'}</span>
          </button>
        ),
      },
      { headerName: 'Uploaded By', field: 'Uploaded By', flex: 2, minWidth: 160, cellClass: 'text-center flex items-center justify-center', valueFormatter: (p) => p.value || '—' },
      { headerName: 'Date of Upload', field: 'Date of Upload', flex: 2, minWidth: 150, cellClass: 'text-center flex items-center justify-center', valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Actions', width: 120, sortable: false,
        cellClass: 'flex items-center justify-center gap-1.5',
        cellRenderer: (p) => (
          <>
            <button type="button" onClick={() => download(p.data)} title="Download" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer">
              <Download size={15} />
            </button>
            {canDelete && (
              <button type="button" onClick={() => setDeleteAsk({ id: p.data.id, name: p.data['File Name'] })} title="Delete" className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg transition cursor-pointer">
                <Trash2 size={15} />
              </button>
            )}
          </>
        ),
      },
    ];
  }, [category, canDelete, notify]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/${category.prefix}/delete/${deleteAsk.id}`);
      notify(EOFFICE_TOASTS.fileDeleted(deleteAsk.name));
      setDeleteAsk(null);
      onDeleted();
    } catch (err) {
      console.error('E-Office file delete failed:', err);
      notify(EOFFICE_TOASTS.deleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="module-card">
      <ModuleFilesHistoryView
        title={`Uploaded ${category.label} Sheets`}
        filesList={loading ? [] : result.rows}
        pageSize={pageSize}
        setPageSize={setPageSize}
        historyColDefs={columnDefs}
        loading={loading}
        themeClass="ag-theme-quartz"
      />

      <ConfirmModal
        isOpen={!!deleteAsk}
        onClose={() => setDeleteAsk(null)}
        onConfirm={confirmDelete}
        title="Delete File?"
        message={`Deleting ${deleteAsk?.name || 'this file'} also deletes every ${category.label} row uploaded from it. Continue?`}
        loading={deleting}
      />
    </div>
  );
}
