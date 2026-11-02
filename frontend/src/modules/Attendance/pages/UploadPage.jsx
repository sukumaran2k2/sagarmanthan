import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import ModuleUploadView from '../../../components/ModuleUploadView';
import ConfirmModal from '../../../components/ConfirmModal';
import MissingEmployeesModal from '../../../components/MissingEmployeesModal';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { ATTENDANCE_TOASTS } from '../toastMessages';
import { calendarYear, formatTimeStr, saveBlob, validateAttendanceHeaders, validateAttendanceRows } from '../utils/attendanceUtils';

export default function UploadPage({ notify, onUploaded }) {
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [week, setWeek] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fileIssues, setFileIssues] = useState(''); // '' | string | [{ field, message }]
  const [uploading, setUploading] = useState(false);
  // A sheet already exists for the period: { fileId } while asking whether to replace it
  const [replaceAsk, setReplaceAsk] = useState(null);
  // Emp Ids the server does not know: { fileId, employees } while asking for their details
  const [missingAsk, setMissingAsk] = useState(null);

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
          notify(ATTENDANCE_TOASTS.fileEmpty());
          return;
        }
        const headerCheck = validateAttendanceHeaders(rows[0]);
        if (!headerCheck.valid) {
          setFileIssues(headerCheck.missing.map((field) => ({
            field,
            message: 'Required column not found. Use the Attendance_Sample.xlsx layout.',
          })));
          notify(ATTENDANCE_TOASTS.templateMismatch(headerCheck.missing));
          return;
        }
        // Skip only rows that are empty; a row with anything in it (even a stray letter) is checked,
        // as the server checks it
        const dataRows = rows.filter((r) => r && Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== ''));
        const issues = validateAttendanceRows(dataRows);
        if (issues.length) {
          setFileIssues(issues);
          notify(ATTENDANCE_TOASTS.rowIssues(issues.length));
          return;
        }
        setPreviewRows(dataRows);
        notify(ATTENDANCE_TOASTS.previewReady(dataRows.length));
      } catch (err) {
        console.error('Attendance sheet could not be read:', err);
        setFileIssues('Could not read the selected spreadsheet file.');
        notify(ATTENDANCE_TOASTS.fileUnreadable());
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
    valueFormatter: (p) => formatTimeStr(p.value),
  })) : []), [previewRows]);

  const year = financialYear && month ? calendarYear(financialYear, month) : null;
  const periodLabel = `${month} ${year}, Week ${week}`;

  // fileId set: replace that period's sheet; otherwise add a new one (the server answers
  // 409 with the existing sheet's id when the period already has one)
  const send = async (fileId) => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('financialYear', String(year)); // the calendar year the server stores
    formData.append('month', month);
    formData.append('week', week);
    if (fileId) formData.append('fileId', fileId);

    setUploading(true);
    try {
      if (fileId) await api.put('/attend-employee', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/employee-attendance', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      notify(fileId ? ATTENDANCE_TOASTS.replaced(periodLabel) : ATTENDANCE_TOASTS.uploaded(periodLabel));
      const period = { month, year: String(year), week: Number(week) };
      resetForm();
      onUploaded(period);
    } catch (err) {
      if (!fileId && err.response?.status === 409 && err.response.data?.replaceFileID) {
        setReplaceAsk({ fileId: err.response.data.replaceFileID });
        return;
      }
      // Unknown Emp Ids: ask for their details (filled in from the sheet), create them, upload again
      const missingIds = err.response?.status === 402 ? (err.response.data?.missingEmpIds || [err.response.data?.EmpId].filter(Boolean)) : [];
      if (missingIds.length) {
        const pick = (row, keys) => keys.map((k) => row?.[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== '');
        const employees = missingIds.map((id) => {
          const row = previewRows.find((r) => String(pick(r, ['Emp Id', 'EmpId', 'Employee ID']) ?? '').trim() === String(id));
          return {
            empId: String(id),
            empName: pick(row, ['Emp Name', 'EmpName', 'EMP Name', 'Employee Name']),
            designation: pick(row, ['Designation']),
            wingName: pick(row, ['Wing']),
            divisionName: pick(row, ['Division']),
          };
        });
        setMissingAsk({ fileId, employees });
        notify(ATTENDANCE_TOASTS.employeesMissing(missingIds.length));
        return;
      }
      console.error('Attendance upload failed:', err);
      const reason = getErrorMessage(err);
      setFileIssues(reason || 'The upload failed.');
      notify(ATTENDANCE_TOASTS.uploadFailed(reason));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!financialYear) return notify(COMMON_TOASTS.requiredSelect('Financial Year'));
    if (!month) return notify(COMMON_TOASTS.requiredSelect('Month'));
    if (!week) return notify(COMMON_TOASTS.requiredSelect('Week'));
    if (!selectedFile) return notify(ATTENDANCE_TOASTS.chooseFile());
    if (fileIssues) return notify(ATTENDANCE_TOASTS.fixFileFirst());
    return send(null);
  };

  const handleDownloadSample = () => {
    api.get('/attendance/downloadSampleDocument', { responseType: 'blob' })
      .then((res) => {
        saveBlob(res.data, 'Attendance_Sample.xlsx');
        notify(COMMON_TOASTS.downloadStarted('Attendance_Sample.xlsx'));
      })
      .catch((err) => {
        console.error('Sample download failed:', err);
        notify(ATTENDANCE_TOASTS.sampleFailed());
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
        sampleFileName="Attendance_Sample.xlsx"
      />

      <ConfirmModal
        isOpen={!!replaceAsk}
        onClose={() => setReplaceAsk(null)}
        onConfirm={() => { const { fileId } = replaceAsk; setReplaceAsk(null); send(fileId); }}
        title="Replace Attendance?"
        message={`Attendance for ${periodLabel} has already been uploaded. Uploading this sheet replaces all of that period's attendance. Continue?`}
        confirmText="Replace"
        loading={uploading}
        loadingText="Replacing..."
      />

      {missingAsk && (
      <MissingEmployeesModal
        isOpen
        employees={missingAsk?.employees || []}
        unitsUrl="/employee-org-units"
        createUrl="/employee-attendance-data"
        onClose={() => setMissingAsk(null)}
        onCreated={() => {
          const { fileId, employees } = missingAsk;
          setMissingAsk(null);
          notify(ATTENDANCE_TOASTS.employeesCreated(employees.length));
          send(fileId);
        }}
      />
      )}
    </div>
  );
}
