import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  checkUnderTenderingDocument,
  deleteUnderTenderingDocument,
  downloadUnderTenderingDocument,
  fetchUnderTenderingCostAndCalls,
  fetchUnderTenderingDates,
  fetchUnderTenderingRevisionHistory,
  saveUnderTenderingRevision,
  uploadUnderTenderingDocument,
} from '../api';
import { getProjectIdentity } from '../utils/mapProject';
import {
  formatFileSize,
  PROJECT_UPLOAD_MAX_BYTES,
} from '../utils/constants';
import {
  buildDefaultTenderRows,
  mapTenderMetaFromCostApi,
  mapTenderRowsFromApi,
  uiIdToSubStageId,
} from '../utils/stageMappers';

const DOC_FOLDER_BY_ROW_ID = {
  1: 'Technical_Sactioned_Obtained',
  2: 'Tender_Document_Approved',
  3: 'Tender_Notice_Issued',
  4: 'Technical_Evaluation_Completed',
  5: 'Financial_Evaluation_Completed',
  6: 'Sanction_Of_Competent_Authority',
  7: 'Work_Awarded',
  8: 'Contract_Agreement_Signed',
};

const ROW_TITLE_BY_ID = {
  1: 'Tech. Sanction obtained',
  2: 'Tender Document approved',
  3: 'Tender Notice Issued',
  4: 'Technical Evaluation completed',
  5: 'Financial Evaluation completed',
  6: 'Sanction of Competent Authority obtained for Award',
  7: 'Work Awarded / LOA Issued',
  8: 'Contract Agreement Signed',
};

function renderInBody(node) {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

export default function UnderTenderingStage({
  projectID: projectIDProp,
  subProjectID: subProjectIDProp,
  initialData,
  canSubmit,
  readOnly,
  onSubmitStage,
  notify,
  refreshKey = 0,
}) {
  const identity = useMemo(() => {
    if (projectIDProp) {
      return {
        projectID: projectIDProp,
        subProjectID: subProjectIDProp || '-1',
      };
    }
    return getProjectIdentity(initialData || {});
  }, [projectIDProp, subProjectIDProp, initialData]);

  const { projectID, subProjectID } = identity;
  const [onNominationBasisAwarded, setOnNominationBasisAwarded] = useState('0');
  const [numberOfTenderCalls, setNumberOfTenderCalls] = useState('');
  const [rows, setRows] = useState(buildDefaultTenderRows);
  const [foundationLaid, setFoundationLaid] = useState('');
  const [foundationLaidDate, setFoundationLaidDate] = useState('');
  const [foundationTentativeDate, setFoundationTentativeDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingByRowId, setUploadingByRowId] = useState({});
  const [uploadPreviewByRowId, setUploadPreviewByRowId] = useState({});
  const [docFoldersPresent, setDocFoldersPresent] = useState(new Set());
  const [revisionModal, setRevisionModal] = useState({
    open: false,
    rowId: null,
    date: '',
    remarks: '',
    error: '',
  });
  const [revisionSaving, setRevisionSaving] = useState(false);
  const [historyModal, setHistoryModal] = useState({
    open: false,
    title: '',
    rows: [],
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    rowId: null,
  });
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [preponeConfirmModal, setPreponeConfirmModal] = useState({
    open: false,
  });
  const [pendingRevisionPayload, setPendingRevisionPayload] = useState(null);

  const disabled = !canSubmit || readOnly;
  const nominationMode = onNominationBasisAwarded === '1';
  const docKey = String(subProjectID || '-1') === '-1' ? String(projectID || '') : String(subProjectID || '');
  const today = new Date().toISOString().slice(0, 10);

  const refreshExistingDocs = async () => {
    if (!docKey) return;
    try {
      const res = await checkUnderTenderingDocument(docKey);
      const folders = Array.isArray(res?.data?.folderName) ? res.data.folderName : [];
      setDocFoldersPresent(new Set(folders));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [datesRes, costRes] = await Promise.all([
          fetchUnderTenderingDates(projectID, subProjectID),
          fetchUnderTenderingCostAndCalls(subProjectID, projectID),
        ]);
        if (!mounted) return;

        const dateRows = Array.isArray(datesRes?.data) ? datesRes.data : [];
        const costRow = Array.isArray(costRes?.data) ? costRes.data[0] : null;
        setRows(mapTenderRowsFromApi(dateRows, costRow));
        const meta = mapTenderMetaFromCostApi(costRow);
        setOnNominationBasisAwarded(meta.onNominationBasisAwarded);
        setNumberOfTenderCalls(meta.numberOfTenderCalls);
        setFoundationLaid(meta.foundationLaid);
        setFoundationLaidDate(meta.foundationLaidDate);
        setFoundationTentativeDate(meta.foundationTentativeDate);
      } catch (error) {
        console.error(error);
        notify?.('Failed to load under tendering details.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    refreshExistingDocs();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, refreshKey, notify, docKey]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const rowDisabled = (row) =>
    disabled ||
    row.notApplicable ||
    (nominationMode && row.id <= 6);

  const compareDates = (a, b) => (a && b ? new Date(a) < new Date(b) : false);
  const countWords = (text) =>
    String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const MAX_PDF_BYTES = PROJECT_UPLOAD_MAX_BYTES;

  const checkActualDateChain = (sourceRows, nominationValue, changedRowId) => {
    const byId = (id) => sourceRows.find((row) => Number(row.id) === id) || {};
    const r1 = byId(1);
    const r2 = byId(2);
    const r3 = byId(3);
    const r4 = byId(4);
    const r5 = byId(5);
    const r6 = byId(6);
    const r7 = byId(7);
    const r8 = byId(8);
    const isNomination = String(nominationValue) === '1';
    const upTo = Number(changedRowId) || 8;

    const requirePrior = (prior, next, priorNotApplicable, messages) => {
      if (priorNotApplicable) return true;
      if (next.actualDate && !prior.actualDate) {
        notify?.(messages.actual, 'error');
        return false;
      }
      if (next.plannedDate && !prior.plannedDate) {
        notify?.(messages.planned, 'error');
        return false;
      }
      return true;
    };

    if (!isNomination) {
      // Only check prerequisites up to the row being edited.
      if (
        upTo >= 2 &&
        !requirePrior(r1, r2, r1.notApplicable, {
          actual: 'Please enter the technical sanction - actual date.',
          planned: 'Please enter the technical sanction - target date.',
        })
      ) {
        return false;
      }
      if (
        upTo >= 3 &&
        !requirePrior(r2, r3, r2.notApplicable, {
          actual: 'Please enter the tender document approved - actual date.',
          planned: 'Please enter the tender document approved - target date.',
        })
      ) {
        return false;
      }
      if (
        upTo >= 4 &&
        !requirePrior(r3, r4, r3.notApplicable, {
          actual: 'Please enter the tender notice issued - actual date.',
          planned: 'Please enter the tender notice issued - target date.',
        })
      ) {
        return false;
      }
      if (
        upTo >= 5 &&
        !requirePrior(r4, r5, r4.notApplicable, {
          actual: 'Please enter the technical evaluation completed - actual date.',
          planned: 'Please enter the technical evaluation completed - target date.',
        })
      ) {
        return false;
      }
      if (
        upTo >= 6 &&
        !requirePrior(r5, r6, r5.notApplicable, {
          actual: 'Please enter the financial evaluation completed - actual date.',
          planned: 'Please enter the financial evaluation completed - target date.',
        })
      ) {
        return false;
      }
      if (
        upTo >= 7 &&
        !requirePrior(r6, r7, r6.notApplicable, {
          actual:
            'Please enter the sanction of competent authority obtained for award - actual date.',
          planned:
            'Please enter the sanction of competent authority obtained for award - target date.',
        })
      ) {
        return false;
      }
    }

    if (
      upTo >= 8 &&
      !requirePrior(r7, r8, false, {
        actual: 'Please enter the work awarded / LOA issued - actual date.',
        planned: 'Please enter the work awarded / LOA issued - target date.',
      })
    ) {
      return false;
    }
    return true;
  };

  const handleActualDateChange = (rowId, value) => {
    const nextRows = rows.map((row) =>
      Number(row.id) === Number(rowId) ? { ...row, actualDate: value } : row
    );
    updateRow(rowId, { actualDate: value });
    if (Number(rowId) <= 1) return;
    checkActualDateChain(nextRows, onNominationBasisAwarded, rowId);
  };

  const onUploadForRow = async (rowId, file) => {
    if (!file || !projectID) return;
    const folderName = DOC_FOLDER_BY_ROW_ID[rowId];
    if (!folderName) return;

    const isPdf =
      /\.pdf$/i.test(file.name) ||
      String(file.type || '').toLowerCase() === 'application/pdf';
    if (!isPdf) {
      notify?.('Only PDF files are allowed.', 'error');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      notify?.(
        `"${file.name}" (${formatFileSize(file.size)}) exceeds 20 MB limit.`,
        'error'
      );
      return;
    }

    setUploadPreviewByRowId((prev) => ({
      ...prev,
      [rowId]: { name: file.name, size: file.size },
    }));
    setUploadingByRowId((prev) => ({ ...prev, [rowId]: true }));
    try {
      const formData = new FormData();
      formData.append('projectID', projectID);
      formData.append('subProjectID', subProjectID || '-1');
      formData.append('folderName', folderName);
      formData.append('projectDocument', file);
      await uploadUnderTenderingDocument(formData);
      notify?.('Tendering document uploaded successfully.', 'success');
      await refreshExistingDocs();
    } catch (error) {
      console.error(error);
      notify?.('Failed to upload tendering document.', 'error');
    } finally {
      setUploadingByRowId((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const onDownloadForRow = async (rowId) => {
    const folderName = DOC_FOLDER_BY_ROW_ID[rowId];
    if (!folderName || !docKey) return;
    try {
      const response = await downloadUnderTenderingDocument(folderName, docKey);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docKey}_${folderName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      notify?.('Failed to download tendering document.', 'error');
    }
  };

  const closeDeleteConfirmModal = () => {
    if (deletingDocument) return;
    setDeleteConfirmModal({ open: false, rowId: null });
  };

  const onDeleteForRow = (rowId) => {
    const folderName = DOC_FOLDER_BY_ROW_ID[rowId];
    if (!folderName || !docKey) return;
    setDeleteConfirmModal({ open: true, rowId });
  };

  const confirmDeleteForRow = async () => {
    const rowId = deleteConfirmModal.rowId;
    const folderName = DOC_FOLDER_BY_ROW_ID[rowId];
    if (!folderName || !docKey) {
      closeDeleteConfirmModal();
      return;
    }
    try {
      setDeletingDocument(true);
      await deleteUnderTenderingDocument(folderName, docKey);
      notify?.('Tendering document deleted successfully.', 'success');
      setDeleteConfirmModal({ open: false, rowId: null });
      await refreshExistingDocs();
    } catch (error) {
      console.error(error);
      notify?.('Failed to delete tendering document.', 'error');
    } finally {
      setDeletingDocument(false);
    }
  };

  const onReviseRow = async (rowId) => {
    if (disabled) return;
    try {
      const historyRes = await fetchUnderTenderingRevisionHistory(projectID, uiIdToSubStageId(rowId), subProjectID);
      const historyRows = Array.isArray(historyRes?.data) ? historyRes.data : [];
      if (historyRows.length >= 3) {
        notify?.('Maximum number of revisions (3) has been reached. This sub-stage cannot be revised further', 'error');
        return;
      }

      setRevisionModal({
        open: true,
        rowId,
        date: '',
        remarks: '',
        error: '',
      });
    } catch (error) {
      console.error(error);
      notify?.('Failed to save revision.', 'error');
    }
  };

  const executeRevisionSave = async ({ rowId, revisedDate, remarks }) => {
    try {
      setRevisionSaving(true);
      await saveUnderTenderingRevision({
        projectID,
        subProjectID,
        projectSubStageID: uiIdToSubStageId(rowId),
        revisionStartDate: revisedDate,
        revisionRemarks: remarks,
      });
      updateRow(rowId, { revisedDate });
      notify?.('Project dates updated successfully.', 'success');
      setRevisionModal({ open: false, rowId: null, date: '', remarks: '', error: '' });
      setPreponeConfirmModal({ open: false });
      setPendingRevisionPayload(null);
    } catch (error) {
      console.error(error);
      setRevisionModal((prev) => ({
        ...prev,
        error: 'Something went wrong while updating the project dates. Please try later.',
      }));
    } finally {
      setRevisionSaving(false);
    }
  };

  const submitRevisionModal = async () => {
    if (!revisionModal.rowId) return;
    const revisedDate = String(revisionModal.date || '').trim();
    const remarks = String(revisionModal.remarks || '').trim();
    if (!revisedDate || !remarks) {
      setRevisionModal((prev) => ({
        ...prev,
        error: 'Please fill all required fields.',
      }));
      return;
    }
    if (countWords(remarks) > 20) {
      setRevisionModal((prev) => ({
        ...prev,
        error: 'Revision remarks should not exceed 20 words',
      }));
      return;
    }

    const payload = {
      rowId: revisionModal.rowId,
      revisedDate,
      remarks,
    };

    const row = rows.find((r) => r.id === revisionModal.rowId);
    if (row?.plannedDate && new Date(row.plannedDate) > new Date(revisedDate)) {
      setPendingRevisionPayload(payload);
      setPreponeConfirmModal({ open: true });
      return;
    }

    await executeRevisionSave(payload);
  };

  const confirmPreponeRevision = async () => {
    if (!pendingRevisionPayload) {
      setPreponeConfirmModal({ open: false });
      return;
    }
    await executeRevisionSave(pendingRevisionPayload);
  };

  const closePreponeConfirmModal = () => {
    if (revisionSaving) return;
    setPreponeConfirmModal({ open: false });
    setPendingRevisionPayload(null);
  };

  const onShowHistory = async (rowId) => {
    try {
      const res = await fetchUnderTenderingRevisionHistory(projectID, uiIdToSubStageId(rowId), subProjectID);
      const rowsData = Array.isArray(res?.data) ? res.data : [];
      if (!rowsData.length) {
        notify?.('No revision history available for this row.', 'info');
        return;
      }
      setHistoryModal({
        open: true,
        title: ROW_TITLE_BY_ID[rowId] || 'Revision History',
        rows: rowsData,
      });
    } catch (error) {
      console.error(error);
      notify?.('Failed to load revision history.', 'error');
    }
  };

  const validateBeforeSubmit = () => {
    const byId = (id) => rows.find((row) => Number(row.id) === id) || {};

    const r1 = byId(1);
    const r2 = byId(2);
    const r3 = byId(3);
    const r4 = byId(4);
    const r5 = byId(5);
    const r6 = byId(6);
    const r7 = byId(7);
    const r8 = byId(8);

    if (!nominationMode && !String(r1.cost ?? '').trim()) {
      notify?.('Please enter Tech. Sanction Cost (In Cr).', 'error');
      return false;
    }
    if (!String(r7.cost ?? '').trim()) {
      notify?.('Please enter Awarded Project Cost (In Cr).', 'error');
      return false;
    }

    if (!nominationMode) {
      if (!r1.notApplicable && !r1.plannedDate && r2.plannedDate) {
        notify?.('Please fill the technical sanction obtained target dates.', 'error');
        return false;
      }
      if (!r2.notApplicable && !r2.plannedDate && r3.plannedDate) {
        notify?.('Please fill the tender document approved target dates.', 'error');
        return false;
      }
      if (!r3.notApplicable && !r3.plannedDate && r4.plannedDate) {
        notify?.('Please fill the tender notice issued target dates.', 'error');
        return false;
      }
      if (!r4.notApplicable && !r4.plannedDate && r5.plannedDate) {
        notify?.('Please fill the techcnical evaluation completed target dates.', 'error');
        return false;
      }
      if (!r5.notApplicable && !r5.plannedDate && r6.plannedDate) {
        notify?.('Please fill the financial evaluation completed target dates.', 'error');
        return false;
      }
      if (!r6.notApplicable && !r6.plannedDate && r7.plannedDate) {
        notify?.('Please fill the sanction of competent authority target dates.', 'error');
        return false;
      }

      if (!r1.notApplicable && !r1.actualDate && r2.actualDate) {
        notify?.('Please fill the technical sanction obtained actual dates.', 'error');
        return false;
      }
      if (!r2.notApplicable && !r2.actualDate && r3.actualDate) {
        notify?.('Please fill the tender document approved actual dates.', 'error');
        return false;
      }
      if (!r3.notApplicable && !r3.actualDate && r4.actualDate) {
        notify?.('Please fill the tender notice approved actual dates.', 'error');
        return false;
      }
      if (!r4.notApplicable && !r4.actualDate && r5.actualDate) {
        notify?.('Please fill the techcnical evaluation completed actual dates.', 'error');
        return false;
      }
      if (!r5.notApplicable && !r5.actualDate && r6.actualDate) {
        notify?.('Please fill the financial evaluation completed actual dates.', 'error');
        return false;
      }
      if (!r6.notApplicable && !r6.actualDate && r7.actualDate) {
        notify?.('Please fill the sanction of competent authority actual dates.', 'error');
        return false;
      }

      if (compareDates(r2.plannedDate, r1.plannedDate)) {
        notify?.('Tender Document Planned Date cannot be less than Tech Sanction Planned Date.', 'error');
        return false;
      }
      if (compareDates(r2.actualDate, r1.actualDate)) {
        notify?.('Tender Document Actual Date cannot be less than Tech Sanction Actual Date.', 'error');
        return false;
      }
      if (!r2.notApplicable && compareDates(r3.plannedDate, r2.plannedDate)) {
        notify?.('Tender Notice Planned Date cannot be less than Tender Document Planned Date.', 'error');
        return false;
      }
      if (!r2.notApplicable && compareDates(r3.actualDate, r2.actualDate)) {
        notify?.('Tender Notice Actual Date cannot be less than Tender Document Actual Date.', 'error');
        return false;
      }
      if (!r3.notApplicable && compareDates(r4.plannedDate, r3.plannedDate)) {
        notify?.('Tech Evaluation Planned Date cannot be less than Tender Notice Planned Date.', 'error');
        return false;
      }
      if (!r3.notApplicable && compareDates(r4.actualDate, r3.actualDate)) {
        notify?.('Tech Evaluation Actual Date cannot be less than Tender Notice Actual Date.', 'error');
        return false;
      }
      if (!r4.notApplicable && compareDates(r5.plannedDate, r4.plannedDate)) {
        notify?.('Financial Evaluation Planned Date cannot be less than Tech Evaluation Planned Date.', 'error');
        return false;
      }
      if (!r4.notApplicable && compareDates(r5.actualDate, r4.actualDate)) {
        notify?.('Financial Evaluation Actual Date cannot be less than Tech Evaluation Actual Date.', 'error');
        return false;
      }
      if (!r5.notApplicable && compareDates(r6.plannedDate, r5.plannedDate)) {
        notify?.('Sanction Competent Authority Planned Date cannot be less than Financial Evaluation Planned Date.', 'error');
        return false;
      }
      if (!r5.notApplicable && compareDates(r6.actualDate, r5.actualDate)) {
        notify?.('Sanction Competent Authority Actual Date cannot be less than Financial Evaluation Actual Date.', 'error');
        return false;
      }
    }

    if (!r7.plannedDate && r8.plannedDate) {
      notify?.('Please fill the work awarded target Date.', 'error');
      return false;
    }
    if (!r7.actualDate && r8.actualDate) {
      notify?.('Please fill the work awarded actual dates.', 'error');
      return false;
    }
    if (!nominationMode && !r6.notApplicable) {
      if (compareDates(r7.plannedDate, r6.plannedDate)) {
        notify?.('Work Awarded Planned Date cannot be less than Sanction Competent Authority Planned Date.', 'error');
        return false;
      }
      if (compareDates(r7.actualDate, r6.actualDate)) {
        notify?.('Work Awarded Actual Date cannot be less than Sanction Competent Authority Actual Date.', 'error');
        return false;
      }
    }
    if (compareDates(r8.plannedDate, r7.plannedDate)) {
      notify?.('Contract Signed Planned Date cannot be less than Work Awarded Planned Date.', 'error');
      return false;
    }
    if (compareDates(r8.actualDate, r7.actualDate)) {
      notify?.('Contract Signed Actual Date cannot be less than Work Awarded Actual Date.', 'error');
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="text-xs font-semibold text-slate-500">Loading tendering details...</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-800">Is the project awarded on nomination basis?</p>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="1" checked={onNominationBasisAwarded === '1'} disabled={disabled} onChange={(e) => setOnNominationBasisAwarded(e.target.value)} /> Yes
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="0" checked={onNominationBasisAwarded === '0'} disabled={disabled} onChange={(e) => setOnNominationBasisAwarded(e.target.value)} /> No
            </label>
          </div>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <label className="block text-xs font-bold text-slate-800 mb-2">Number of Tender Calls till Date</label>
          <input
            type="number"
            value={numberOfTenderCalls}
            onChange={(e) => setNumberOfTenderCalls(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
          />
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead
            className="sticky z-30 bg-[#0f417a] text-white shadow-sm"
            style={{ top: 'var(--stage-table-sticky-top, 42px)' }}
          >
            <tr>
              <th className="text-left px-3 py-2.5 bg-[#0f417a]">Stage</th>
              <th className="text-left px-3 py-2.5 bg-[#0f417a]">Targeted Completion Date</th>
              <th className="text-left px-3 py-2.5 bg-[#0f417a]">Revised Date</th>
              <th className="text-center px-3 py-2.5 bg-[#0f417a]">Revise</th>
              <th className="text-center px-3 py-2.5 bg-[#0f417a]">History</th>
              <th className="text-left px-3 py-2.5 bg-[#0f417a]">
                Actual Date<span className="text-rose-300">*</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3 min-w-[240px]">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id={`tender-row-upload-${row.id}`}
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={disabled || uploadingByRowId[row.id] || (nominationMode && row.id <= 6)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadForRow(row.id, file);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`tender-row-upload-${row.id}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                        disabled || uploadingByRowId[row.id] || (nominationMode && row.id <= 6)
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer'
                      }`}
                    >
                      <span>{uploadingByRowId[row.id] ? 'Uploading PDF...' : 'Upload PDF'}</span>
                      <span className="text-[10px] font-semibold text-slate-500">(max 20 MB)</span>
                    </label>
                    <button
                      type="button"
                      disabled={!docFoldersPresent.has(DOC_FOLDER_BY_ROW_ID[row.id])}
                      onClick={() => onDownloadForRow(row.id)}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold disabled:opacity-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      disabled={disabled || !docFoldersPresent.has(DOC_FOLDER_BY_ROW_ID[row.id])}
                      onClick={() => onDeleteForRow(row.id)}
                      className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                  {uploadPreviewByRowId[row.id] ? (
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 truncate" title={`${uploadPreviewByRowId[row.id].name} (${formatFileSize(uploadPreviewByRowId[row.id].size)})`}>
                      {uploadingByRowId[row.id] ? 'Uploading: ' : 'Selected: '}
                      {uploadPreviewByRowId[row.id].name} ({formatFileSize(uploadPreviewByRowId[row.id].size)})
                    </p>
                  ) : null}
                  {row.id >= 2 && row.id <= 6 ? (
                    <label className="inline-flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-semibold">
                      <input
                        type="checkbox"
                        checked={row.notApplicable}
                        disabled={disabled}
                        onChange={(e) => updateRow(row.id, { notApplicable: e.target.checked })}
                      />
                      (Not Applicable)
                    </label>
                  ) : null}
                  {row.hasCost && (
                    <div className="mt-2 max-w-[220px]">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {row.id === 1 ? 'Tech. Sanction Cost (In Cr)' : 'Awarded Project Cost (In Cr)'}
                        <span className="text-rose-600"> *</span>
                      </label>
                      <input
                        type="number"
                        value={row.cost}
                        onChange={(e) => updateRow(row.id, { cost: e.target.value })}
                        disabled={disabled || (nominationMode && row.id === 1)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-3"><input type="date" value={row.plannedDate} disabled={rowDisabled(row)} onChange={(e) => updateRow(row.id, { plannedDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                <td className="px-3 py-3"><input type="date" value={row.revisedDate} disabled className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-100" /></td>
                <td className="px-3 py-3 text-center"><button type="button" disabled={rowDisabled(row)} onClick={() => onReviseRow(row.id)} className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold disabled:opacity-50">Revise</button></td>
                <td className="px-3 py-3 text-center"><button type="button" disabled={rowDisabled(row)} onClick={() => onShowHistory(row.id)} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold disabled:opacity-50">History</button></td>
                <td className="px-3 py-3"><input type="date" value={row.actualDate} max={today} disabled={rowDisabled(row)} onChange={(e) => handleActualDateChange(row.id, e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-800">Whether project foundation is Laid?</p>
        <div className="flex gap-6 text-xs font-semibold text-slate-700">
          <label className="inline-flex items-center gap-2"><input type="radio" value="yes" checked={foundationLaid === 'yes'} disabled={disabled} onChange={(e) => setFoundationLaid(e.target.value)} /> Yes</label>
          <label className="inline-flex items-center gap-2"><input type="radio" value="no" checked={foundationLaid === 'no'} disabled={disabled} onChange={(e) => setFoundationLaid(e.target.value)} /> No</label>
        </div>

        {foundationLaid === 'yes' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date of laying of foundation</label>
            <input type="date" value={foundationLaidDate} disabled={disabled} onChange={(e) => setFoundationLaidDate(e.target.value)} className="w-full md:w-72 text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white" />
          </div>
        )}

        {foundationLaid === 'no' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tentative date of laying of foundation</label>
            <input type="date" value={foundationTentativeDate} disabled={disabled} onChange={(e) => setFoundationTentativeDate(e.target.value)} className="w-full md:w-72 text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!validateBeforeSubmit()) return;
            onSubmitStage?.('tendering', {
              onNominationBasisAwarded,
              numberOfTenderCalls,
              rows,
              foundationLaid,
              foundationLaidDate,
              foundationTentativeDate,
            });
          }}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Under Tendering
        </button>
      </div>

      {revisionModal.open ? renderInBody(
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">Revised Date</h3>
              <p className="text-xs text-slate-500 mt-1">
                {ROW_TITLE_BY_ID[revisionModal.rowId] || 'Update revised date'}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Revised Date</label>
                <input
                  type="date"
                  value={revisionModal.date}
                  onChange={(e) =>
                    setRevisionModal((prev) => ({ ...prev, date: e.target.value, error: '' }))
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={revisionModal.remarks}
                  onChange={(e) =>
                    setRevisionModal((prev) => ({ ...prev, remarks: e.target.value, error: '' }))
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">Max 20 words.</p>
              </div>
              {revisionModal.error ? (
                <p className="text-xs font-semibold text-rose-600">{revisionModal.error}</p>
              ) : null}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRevisionModal({ open: false, rowId: null, date: '', remarks: '', error: '' })
                }
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitRevisionModal}
                disabled={revisionSaving}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {revisionSaving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyModal.open ? renderInBody(
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">Revision History</h3>
              <p className="text-xs text-slate-500 mt-1">{historyModal.title}</p>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Sl. No.</th>
                      <th className="px-3 py-2 text-left">Revised Date</th>
                      <th className="px-3 py-2 text-left">Remarks</th>
                      <th className="px-3 py-2 text-left">Revised On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal.rows.map((item, idx) => (
                      <tr key={`${idx}-${item.revised_on || ''}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">
                          {item.revised_date ? String(item.revised_date).slice(0, 10) : '-'}
                        </td>
                        <td className="px-3 py-2">{item.remarks || '-'}</td>
                        <td className="px-3 py-2">
                          {item.revised_on ? String(item.revised_on).slice(0, 10) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModal({ open: false, title: '', rows: [] })}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmModal.open
        ? renderInBody(
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Delete Document</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete this document?
                  </p>
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteConfirmModal}
                    disabled={deletingDocument}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteForRow}
                    disabled={deletingDocument}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deletingDocument ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )
        : null}

      {preponeConfirmModal.open
        ? renderInBody(
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Prepone Planned Date</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Do you want to prepone the Planned Date?
                  </p>
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePreponeConfirmModal}
                    disabled={revisionSaving}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmPreponeRevision}
                    disabled={revisionSaving}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {revisionSaving ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
