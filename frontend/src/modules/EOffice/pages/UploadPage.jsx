import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import ModuleUploadView from '../../../components/ModuleUploadView';
import ConfirmModal from '../../../components/ConfirmModal';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { EOFFICE_TOASTS } from '../toastMessages';
import { calendarYear, formatTimeStr, saveBlob, validateEOfficeHeaders, validateEOfficeRows } from '../utils/eOfficeUtils';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export default function UploadPage({ category, notify, onUploaded }) {
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [week, setWeek] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fileIssues, setFileIssues] = useState(''); // '' | string | [{ field, message }]
  const [uploading, setUploading] = useState(false);
  // A sheet already exists for the period: { fileId } while asking whether to replace it
  const [replaceAsk, setReplaceAsk] = useState(null);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setFileIssues('');
    setFinancialYear('');
    setMonth('');
    setWeek('');
  };

  // Reads and checks the sheet in the browser, so problems show before uploading
  const handleFileSelect = (file) => {
    setSelectedFile(file || null);
    setPreviewRows([]);
    setFileIssues('');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (!rows.length) {
          setFileIssues('The selected file contains no data rows.');
          notify(EOFFICE_TOASTS.fileEmpty());
          return;
        }
        const headerCheck = validateEOfficeHeaders(rows[0], category.id);
        if (!headerCheck.valid) {
          setFileIssues(headerCheck.missing.map((field) => ({
            field,
            message: `Required column not found. Use the ${category.sampleFile} layout.`,
          })));
          notify(EOFFICE_TOASTS.templateMismatch(headerCheck.missing, category.sampleFile));
          return;
        }
        const dataRows = rows.filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== ''));
        const issues = validateEOfficeRows(dataRows, category.id);
        if (issues.length) {
          setFileIssues(issues);
          notify(EOFFICE_TOASTS.rowIssues(issues.length));
          return;
        }
        setPreviewRows(dataRows);
        notify(EOFFICE_TOASTS.previewReady(dataRows.length));
      } catch (err) {
        console.error('E-Office sheet could not be read:', err);
        setFileIssues('Could not read the selected spreadsheet file.');
        notify(EOFFICE_TOASTS.fileUnreadable());
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const previewColDefs = useMemo(() => (previewRows[0] ? Object.keys(previewRows[0]).map((key) => ({
    headerName: key,
    field: key,
    flex: 1,
    minWidth: 120,
    cellClass: 'text-slate-700 font-semibold text-center flex items-center justify-center',
    valueFormatter: (p) => (/emp/i.test(key) ? String(p.value ?? '—') : formatTimeStr(p.value)),
  })) : []), [previewRows]);

  const year = financialYear && month ? calendarYear(financialYear, month) : null;
  const periodLabel = `${month} ${year}, Week ${week}`;

  // fileId set: replace that period's sheet; otherwise add a new one (the server answers
  // 409 with the existing sheet's id when the period already has one)
  const send = async (fileId) => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('Year', String(year)); // the calendar year the server stores
    formData.append('month', month);
    formData.append('week', week);
    if (fileId) formData.append('fileId', fileId);

    setUploading(true);
    try {
      if (fileId) await api.put(`/${category.prefix}-update`, formData, MULTIPART);
      else await api.post(`/${category.prefix}-create`, formData, MULTIPART);
      notify(fileId ? EOFFICE_TOASTS.replaced(category.label, periodLabel) : EOFFICE_TOASTS.uploaded(category.label, periodLabel));
      const period = { month, year: String(year), week: Number(week) };
      resetForm();
      onUploaded(period);
    } catch (err) {
      if (!fileId && err.response?.status === 409 && err.response.data?.replaceFileID) {
        setReplaceAsk({ fileId: err.response.data.replaceFileID });
        return;
      }
      console.error('E-Office upload failed:', err);
      const reason = getErrorMessage(err);
      setFileIssues(reason || 'The upload failed.');
      notify(EOFFICE_TOASTS.uploadFailed(reason));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!financialYear) return notify(COMMON_TOASTS.requiredSelect('Financial Year'));
    if (!month) return notify(COMMON_TOASTS.requiredSelect('Month'));
    if (!week) return notify(COMMON_TOASTS.requiredSelect('Week'));
    if (!selectedFile) return notify(EOFFICE_TOASTS.chooseFile());
    if (fileIssues) return notify(EOFFICE_TOASTS.fixFileFirst());
    return send(null);
  };

  const handleDownloadSample = () => {
    api.get(`/${category.prefix}/download-sample`, { responseType: 'blob' })
      .then((res) => {
        saveBlob(res.data, category.sampleFile);
        notify(COMMON_TOASTS.downloadStarted(category.sampleFile));
      })
      .catch((err) => {
        console.error('Sample download failed:', err);
        notify(EOFFICE_TOASTS.sampleFailed());
      });
  };

  return (
    <div className="module-card space-y-6">
      <ModuleUploadView
        handleUploadSubmit={handleSubmit}
        uploadFinancialYear={financialYear}
        setUploadFinancialYear={setFinancialYear}
        uploadMonth={month}
        setUploadMonth={setMonth}
        uploadWeek={week}
        setUploadWeek={setWeek}
        selectedFile={selectedFile}
        handleFileSelect={handleFileSelect}
        resetFile={resetForm}
        uploading={uploading}
        fileValidationError={fileIssues}
        previewRows={previewRows}
        previewColDefs={previewColDefs}
        onDownloadSample={handleDownloadSample}
        accentColor="#0f417a"
        themeClass="ag-theme-quartz"
      />

      <ConfirmModal
        isOpen={!!replaceAsk}
        onClose={() => setReplaceAsk(null)}
        onConfirm={() => { const { fileId } = replaceAsk; setReplaceAsk(null); send(fileId); }}
        title={`Replace ${category.label}?`}
        message={`${category.label} for ${periodLabel} has already been uploaded. Uploading this sheet replaces all of that week's rows. Continue?`}
        confirmText="Replace"
        loading={uploading}
        loadingText="Replacing..."
      />
    </div>
  );
}
