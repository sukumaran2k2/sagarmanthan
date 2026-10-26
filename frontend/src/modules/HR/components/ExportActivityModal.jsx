import { useState } from 'react';
import * as XLSX from 'xlsx';
import { HrModal, FormRow, DateInput, ModalButtons } from './HrFormControls';
import { fetchActivityDateData } from '../api';

function timestamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

// Downloads every employee activity recorded between two dates as an Excel file.
export default function ExportActivityModal({ isOpen, orgId, onClose, notify }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [errors, setErrors] = useState({});
  const [exporting, setExporting] = useState(false);

  const handleFromChange = (value) => {
    setFromDate(value);
    if (!value || (toDate && toDate < value)) setToDate('');
    setErrors({});
  };

  const handleDownload = async () => {
    const found = {};
    if (!fromDate) found.fromDate = 'Please select the from date.';
    if (!toDate) found.toDate = 'Please select the to date.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setExporting(true);
    try {
      const res = await fetchActivityDateData(fromDate, toDate, orgId);
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      if (!rows.length) {
        notify?.('No activity was recorded in the selected period.', 'warning');
        return;
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'HR Activity Data');
      XLSX.writeFile(wb, `HR_Activity_Date_Data_${timestamp()}.xlsx`);
      notify?.(`Exported ${rows.length} activity record${rows.length === 1 ? '' : 's'}.`, 'success');
      onClose?.();
    } catch (err) {
      notify?.(err?.response?.data?.message || 'Failed to export the activity data.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <HrModal
      isOpen={isOpen}
      title="Export activity data"
      subtitle="Activities recorded within the selected period"
      onClose={onClose}
      busy={exporting}
      maxWidth="max-w-[520px]"
      footer={
        <ModalButtons
          onCancel={onClose}
          onSubmit={handleDownload}
          busy={exporting}
          submitLabel="Download"
          busyLabel="Exporting..."
        />
      }
    >
      <FormRow label="From Date" required error={errors.fromDate}>
        <DateInput value={fromDate} onChange={handleFromChange} error={errors.fromDate} />
      </FormRow>
      <FormRow label="To Date" required error={errors.toDate}>
        <DateInput
          value={toDate}
          min={fromDate}
          disabled={!fromDate}
          onChange={(v) => {
            setToDate(v);
            setErrors((prev) => ({ ...prev, toDate: undefined }));
          }}
          error={errors.toDate}
        />
      </FormRow>
    </HrModal>
  );
}
