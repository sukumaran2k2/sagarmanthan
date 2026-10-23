import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  Loader2,
  Sliders,
  Save,
  Building,
  Award,
  Hash
} from 'lucide-react';
import Table from '../../../components/Table';
import Notification from '../../../components/Notification';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import VacancyActivityModal from '../components/VacancyActivityModal';
import { EditActionButton, CodeText, PostCodeTag } from '../components/HrFormControls';
import { toInputDate } from '../vacancyActivity/form';
import { fetchHrVacancyDetails, updateAllVacancies, fetchHrPostDetails } from '../api';
import { alignHrColumns } from '../utils/tableAlignment';
import { createTableExporter } from '../utils/exportTable';

/* ────────────────────────────────────────────────────────────────────────────
   Constants
──────────────────────────────────────────────────────────────────────────── */


const EXPECTED_METHODS = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Promotion',
  'Composite Method',
  'Deputation In',
  'Transfer In'
];

const ACTUAL_MODES = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Promotion',
  'Deputation In',
  'Composite Method',
  'Transfer In',
  'Redeployed-in',
  'Redeployed from CHD Category',
  'Promotion-in by Direct Recruitment'
];

const EXEMPTION_REASONS = ['Statutory Post', 'Reservation for SC/ST', 'OBC'];


const COL_LABELS = {
  sNo: 'S.No',
  post_code: 'Post Code',
  to_be_filled_through: 'Expected Method of Filling (as per RR)',
  method_of_appointment: 'Actual Mode of Filling',
  date_of_arise_in_vacancy: 'Date of Arise in Vacancy',
  reason_for_exemption: 'Reason for Exemption from Abolition',
  action: 'Update'
};

function ExemptionHeaderComponent(props) {
  const onHeaderClick = (e) => {
    if (props.enableSorting && typeof props.progressSort === 'function') {
      props.progressSort(e.shiftKey);
    }
  };

  return (
    <div
      onClick={onHeaderClick}
      className="flex flex-col items-center justify-center text-center w-full leading-tight py-1 select-none cursor-pointer"
      title="User have to select only if the post is abolished"
    >
      <span className="font-extrabold uppercase tracking-wide text-white text-[11px] sm:text-xs text-center">
        Reason for Exemption from Abolition
      </span>
      <span
        style={{ color: '#ff9999' }}
        className="text-[10px] sm:text-[11px] font-bold mt-0.5 normal-case tracking-normal drop-shadow-xs text-center"
      >
        (Select only if post is abolished)
      </span>
    </div>
  );
}


/* ────────────────────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────────────────────── */

export default function VacantDetails({
  postId: propPostId,
  postName: propPostName,
  departmentName: propDeptName,
  className: propClassName,
  isLive: propIsLive,
  onBack,
  onAddEmployee,
  notify,
  triggerNotification,
  permissions
}) {
  const params = useParams();
  const navigate = useNavigate();

  const postId = propPostId || params.postId;
  const isLive = propIsLive !== undefined ? propIsLive : params.isLive != null ? Number(params.isLive) : 1;
  // Abolished vacancies are history: shown as plain values with no editing or activity updates.
  const readOnly = Number(isLive) === 0;

  const { orgId } = permissions;
  const userCanEdit = permissions.canEdit;

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // The shell's notifiers change identity on every App render; read them through a ref
  // so data loaders that report errors are not re-created (and re-run) after each toast.
  const notifierRef = useRef({ notify, triggerNotification });
  useEffect(() => {
    notifierRef.current = { notify, triggerNotification };
  }, [notify, triggerNotification]);

  const sendNotification = useCallback((msg, type = 'success') => {
    const { notify: n, triggerNotification: t } = notifierRef.current;
    if (typeof n === 'function') return n(msg, type);
    if (typeof t === 'function') return t(msg, type);
    // Standalone route without a shell notifier: show the local toast.
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    return undefined;
  }, []);

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else navigate('/hr/hr-management/vacancy-management');
  };

  // Post meta (auto-fetched if the page was opened directly)
  const [remotePostMeta, setRemotePostMeta] = useState(null);

  useEffect(() => {
    if (!propPostName || !propDeptName) {
      if (postId && orgId) {
        fetchHrPostDetails(orgId)
          .then((r) => {
            const posts = r.data?.data?.posts || r.data || [];
            const match = posts.find((p) => String(p.post_id) === String(postId));
            if (match) {
              setRemotePostMeta({
                postName: match.post_name || `Post ${postId}`,
                departmentName: match.department || '--',
                className: match.class || 'General'
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [postId, orgId, propPostName, propDeptName]);

  const postMeta = useMemo(() => {
    if (propPostName && propDeptName) {
      return {
        postName: propPostName,
        departmentName: propDeptName,
        className: propClassName || 'General'
      };
    }
    return remotePostMeta || {
      postName: propPostName || '',
      departmentName: propDeptName || '',
      className: propClassName || 'General'
    };
  }, [propPostName, propDeptName, propClassName, remotePostMeta]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    post_code: true,
    to_be_filled_through: true,
    method_of_appointment: true,
    date_of_arise_in_vacancy: true,
    reason_for_exemption: true,
    action: true
  });
  const [abolishRows, setAbolishRows] = useState([]);

  // Row whose activity popup is open (the popup loads its own data)
  const [activityRow, setActivityRow] = useState(null);

  // Load vacancy rows
  // keepEditsExcept: after a popup save, keep unsaved inline edits on other rows.
  const loadVacancyDetails = useCallback(async ({ keepEditsExcept } = {}) => {
    if (!postId) return;
    setLoading(true);
    try {
      const r = await fetchHrVacancyDetails(postId, isLive);
      let list = [];
      if (r.data?.vacancies && Array.isArray(r.data.vacancies)) list = r.data.vacancies;
      else if (Array.isArray(r.data)) list = r.data;
      else if (r.data?.data && Array.isArray(r.data.data)) list = r.data.data;
      setData(list);

      const abolitions = Array.isArray(r.data?.exceptionPost) ? r.data.exceptionPost : [];
      setAbolishRows(abolitions);

      if (Array.isArray(r.data?.abolishStatus) && r.data.abolishStatus.length > 0) {
        const req = r.data.abolishStatus[0]?.abolish_required !== false;
        if (!req) {
          setVisibleCols((prev) => ({
            ...prev,
            reason_for_exemption: false
          }));
        }
      }

      if (keepEditsExcept === undefined) {
        setRowEdits({});
      } else {
        setRowEdits((prev) => {
          const next = { ...prev };
          delete next[keepEditsExcept];
          return next;
        });
      }
    } catch {
      sendNotification('Failed to load vacancy details.', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [postId, isLive, sendNotification]);

  useEffect(() => {
    loadVacancyDetails();
  }, [loadVacancyDetails]);

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(h);
  }, [searchTerm]);


  // Inline table edits
  const handleInlineChange = (rowId, field, value) => {
    setRowEdits((prev) => {
      const updated = { ...(prev[rowId] || {}), [field]: value };
      if (field === 'reason_for_exemption') {
        updated.exception_abolish = value && value.trim() !== '' ? 1 : 0;
      }
      return { ...prev, [rowId]: updated };
    });
  };

  const handleSaveInlineEdits = async () => {
    const editKeys = Object.keys(rowEdits);
    if (editKeys.length === 0) {
      sendNotification('No unsaved changes.', 'info');
      return;
    }

    // Exemption validation matching legacy flow
    for (const key of editKeys) {
      const orig = data.find((d) => String(d.id || d.post_code) === String(key)) || {};
      const edit = rowEdits[key] || {};
      const reason =
        edit.reason_for_exemption !== undefined ? edit.reason_for_exemption : orig.reason_for_exemption || '';
      const isExempt =
        edit.exception !== undefined
          ? edit.exception
          : (orig.exception_abolish === 1 || (!!reason && reason.trim() !== ''));
      if (isExempt && !reason.trim()) {
        sendNotification('Please select reason for exemption!', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = editKeys.map((key) => {
        const orig = data.find((d) => String(d.id || d.post_code) === String(key)) || {};
        const edit = rowEdits[key] || {};
        const reason =
          edit.reason_for_exemption !== undefined ? edit.reason_for_exemption : orig.reason_for_exemption || '';
        const isExempt =
          edit.exception !== undefined
            ? edit.exception
            : (orig.exception_abolish === 1 || (!!reason && reason.trim() !== ''));

        const chosenExpected =
          edit.to_be_filled_through !== undefined
            ? edit.to_be_filled_through
            : edit.vacancy_type !== undefined
              ? edit.vacancy_type
              : (orig.to_be_filled_through || orig.vacancy_type);

        return {
          id: orig.id,
          post_code: orig.post_code,
          vacancy_type: chosenExpected || null,
          to_be_filled_through: chosenExpected || null,
          method_of_appointment:
            edit.method_of_appointment !== undefined ? edit.method_of_appointment : orig.method_of_appointment,
          vacancy_arise_date:
            edit.date_of_arise_in_vacancy !== undefined
              ? edit.date_of_arise_in_vacancy
              : orig.date_of_arise_in_vacancy
                ? toInputDate(orig.date_of_arise_in_vacancy)
                : null,
          exemption: isExempt ? 1 : 0,
          reasonForExemption: reason || null,
          abolish_date: orig.date_of_abolish || null
        };
      });

      await updateAllVacancies(payload);
      sendNotification("Vacant Post's Updated successfully", 'success');
      loadVacancyDetails();
    } catch {
      sendNotification("Failed to Update Vacant Post's", 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Open the activity popup for the row's Actual Mode of Filling ── */
  const handleOpenActivityModal = useCallback(
    async (row) => {
      const code = row.post_code;
      // Get the effective mode - prioritizing any row edit that was just chosen in the dropdown
      const rowKey = row.rowKey || row.post_code || row.id;
      const edits = rowEdits[rowKey] || {};

      const effectiveExpected =
        edits.to_be_filled_through !== undefined
          ? edits.to_be_filled_through
          : edits.vacancy_type !== undefined
            ? edits.vacancy_type
            : (row.to_be_filled_through || row.vacancy_type || '');

      const effectiveActual =
        edits.method_of_appointment !== undefined
          ? edits.method_of_appointment
          : (row.method_of_appointment || '');

      const rawMode = String(effectiveActual).trim();

      const effectiveDate =
        edits.date_of_arise_in_vacancy !== undefined
          ? edits.date_of_arise_in_vacancy
          : row.date_of_arise_in_vacancy;

      const effectiveReason =
        edits.reason_for_exemption !== undefined
          ? edits.reason_for_exemption
          : (row.reason_for_exemption || '');

      const isExempt =
        edits.exception !== undefined
          ? edits.exception
          : (row.exception_abolish === 1 || (!!effectiveReason && effectiveReason.trim() !== ''));

      const isModeEmpty =
        !rawMode ||
        rawMode.toLowerCase() === '-- select actual mode of filling --' ||
        rawMode.toLowerCase().startsWith('-- select') ||
        rawMode.toLowerCase() === 'null' ||
        rawMode.toLowerCase() === 'undefined';

      const isExpectedEmpty =
        !effectiveExpected ||
        effectiveExpected.toLowerCase().startsWith('-- select');

      const missingFields = [];
      if (!code) missingFields.push('Post Code');
      if (isExpectedEmpty) missingFields.push('Expected Method of Filling (as per RR)');
      if (isModeEmpty) missingFields.push('Actual Mode of Filling');
      if (!effectiveDate) missingFields.push('Date of Arise in Vacancy');

      if (missingFields.length > 0) {
        sendNotification(`Please fill in the following fields: ${missingFields.join(', ')}`, 'warning');
        return;
      }

      if (isExempt && !effectiveReason.trim()) {
        sendNotification('Please select reason for exemption!', 'error');
        return;
      }

      setActivityRow({
        rowKey,
        postCode: code,
        postName: row.post_name || postMeta.postName || '',
        method: rawMode,
        expectedMethod: effectiveExpected,
        dateOfVacancy: effectiveDate,
        reasonForExemption: effectiveReason,
      });
    },
    [sendNotification, postMeta.postName, rowEdits]
  );


  /* ── Table data ── */
  const filteredData = useMemo(() => {
    return data
      .filter((row) => {
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          if (
            !String(row.post_code || '').toLowerCase().includes(q) &&
            !String(row.vacancy_type || row.to_be_filled_through || '').toLowerCase().includes(q) &&
            !String(row.method_of_appointment || '').toLowerCase().includes(q) &&
            !String(row.reason_for_exemption || '').toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .map((item, i) => {
        const rowId = item.id || item.post_code;
        const edits = rowEdits[rowId] || {};
        const isExpiringThisMonth =
          Array.isArray(abolishRows) &&
          abolishRows.some(
            (a) =>
              a.post_code === item.post_code &&
              (a.abolished_post === 'Live till this month' || a.abolished_post === 'Abolished this month')
          );
        const isAbolished =
          Array.isArray(abolishRows) &&
          abolishRows.some(
            (a) =>
              a.post_code === item.post_code &&
              (a.abolished_post === 'Yes' || a.abolished_post === 'Abolished this month')
          );
        return {
          ...item,
          ...edits,
          sNo: i + 1,
          rowKey: rowId,
          isExpiringThisMonth,
          isAbolished,
          postStatus: isAbolished ? 'Abolished' : 'Live'
        };
      });
  }, [data, debouncedSearch, rowEdits, abolishRows]);

  const totalCount = filteredData.length;

  // Copy / Export: the searched rows, visible data columns only.
  // Built on click: sendNotification reads the notifier ref, which must not happen during render.
  const runExport = (kind) => {
    const fields = {
      post_code: {},
      to_be_filled_through: { value: (r) => r.vacancy_type || r.to_be_filled_through || '' },
      method_of_appointment: {},
      date_of_arise_in_vacancy: {
        value: (r) => {
          const iso = toInputDate(r.date_of_arise_in_vacancy);
          return iso ? iso.split('-').reverse().join('-') : '';
        },
      },
      reason_for_exemption: {},
    };
    const title = `${readOnly ? 'Abolished' : 'Live'} Vacancies - ${postMeta.postName || 'Post'}`;
    return createTableExporter({
      loadRows: () => filteredData,
      getColumns: () => Object.keys(fields)
        .filter((f) => visibleCols[f])
        .map((f) => ({ field: f, label: COL_LABELS[f], ...fields[f] })),
      notify: sendNotification,
      title,
      fileName: title,
      sheetName: 'Vacancies',
      label: 'Vacancy list',
    })[kind]();
  };

  const hasUnsavedEdits = Object.keys(rowEdits).length > 0;

  const inlineCtl =
    'w-full text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  const plainValue = (value) => (
    <span className="text-sm text-slate-700 dark:text-slate-200 whitespace-normal break-words">{value || '—'}</span>
  );
  const plainDate = (value) => {
    const iso = toInputDate(value);
    return plainValue(iso ? iso.split('-').reverse().join('-') : '');
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'sNo', headerName: 'S.No', flex: 0.5, minWidth: 80, maxWidth: 95, pinned: 'left',
        sortable: true, filter: false, suppressMenu: true,
        headerClass: 'text-center font-extrabold no-header-wrap', cellClass: 'text-center font-bold flex items-center justify-center',
        hide: !visibleCols.sNo,
        cellRenderer: (p) => {
          const row = p.data;
          return (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-center font-bold text-slate-700 dark:text-slate-300">{row?.sNo}</span>
              {row?.isExpiringThisMonth && (
                <span
                  title="Expiring/Abolishing this month"
                  className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"
                />
              )}
            </div>
          );
        }
      },
      {
        field: 'post_code', headerName: 'Post Code', flex: 0.9, minWidth: 150, maxWidth: 180, pinned: 'left',
        headerClass: 'text-center font-extrabold', cellClass: 'text-center flex items-center justify-center',
        hide: !visibleCols.post_code,
        cellRenderer: (p) => (
          <PostCodeTag>{p.value}</PostCodeTag>
        )
      },
      {
        field: 'to_be_filled_through', headerName: 'Expected Method of Filling (as per RR)', flex: 2.2, minWidth: 290,
        valueGetter: (p) => p.data?.vacancy_type || p.data?.to_be_filled_through || '',
        headerClass: 'text-center font-extrabold', cellClass: 'text-center flex items-center justify-center p-1',
        hide: !visibleCols.to_be_filled_through,
        cellRenderer: (p) => {
          const row = p.data;
          if (!row) return null;
          if (readOnly) return plainValue(row.vacancy_type || row.to_be_filled_through);
          return (
            <select
              value={row.vacancy_type || row.to_be_filled_through || ''}
              disabled={!userCanEdit}
              onChange={(e) => {
                handleInlineChange(row.rowKey, 'vacancy_type', e.target.value);
                handleInlineChange(row.rowKey, 'to_be_filled_through', e.target.value);
              }}
              className={inlineCtl}
            >
              <option value="">-- Select Expected Method of Filling --</option>
              {EXPECTED_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          );
        }
      },
      {
        field: 'method_of_appointment', headerName: 'Actual Mode of Filling', flex: 2.0, minWidth: 250,
        headerClass: 'text-center font-extrabold', cellClass: 'text-center flex items-center justify-center p-1',
        hide: !visibleCols.method_of_appointment,
        cellRenderer: (p) => {
          const row = p.data;
          if (!row) return null;
          if (readOnly) return plainValue(row.method_of_appointment);
          return (
            <select
              value={row.method_of_appointment || ''}
              disabled={!userCanEdit}
              onChange={(e) => handleInlineChange(row.rowKey, 'method_of_appointment', e.target.value)}
              className={inlineCtl}
            >
              <option value="">-- Select Actual Mode of Filling --</option>
              {ACTUAL_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          );
        }
      },
      {
        field: 'date_of_arise_in_vacancy', headerName: 'Date of Arise in Vacancy', flex: 1.0, minWidth: 160, maxWidth: 185,
        headerClass: 'text-center font-extrabold', cellClass: 'text-center flex items-center justify-center p-1',
        hide: !visibleCols.date_of_arise_in_vacancy,
        cellRenderer: (p) => {
          const row = p.data;
          if (!row) return null;
          if (readOnly) return plainDate(row.date_of_arise_in_vacancy);
          return (
            <input
              type="date"
              value={toInputDate(row.date_of_arise_in_vacancy)}
              disabled={!userCanEdit}
              onChange={(e) => handleInlineChange(row.rowKey, 'date_of_arise_in_vacancy', e.target.value)}
              className={inlineCtl}
            />
          );
        }
      },
      {
        field: 'reason_for_exemption',
        headerName: 'Reason for Exemption from Abolition',
        headerComponent: readOnly ? undefined : ExemptionHeaderComponent,
        flex: 2.3,
        minWidth: 280,
        headerClass: 'text-center font-extrabold',
        cellClass: 'text-center flex items-center justify-center p-1',
        hide: !visibleCols.reason_for_exemption,
        cellRenderer: (p) => {
          const row = p.data;
          if (!row) return null;
          if (readOnly) return plainValue(row.reason_for_exemption);
          return (
            <select
              value={row.reason_for_exemption || ''}
              disabled={!userCanEdit}
              onChange={(e) => handleInlineChange(row.rowKey, 'reason_for_exemption', e.target.value)}
              className={inlineCtl}
            >
              <option value="">-- Select Reason for Exemption --</option>
              {EXEMPTION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          );
        }
      },
      {
        field: 'action', headerName: 'Update', flex: 0.6, minWidth: 95, maxWidth: 110, pinned: 'right',
        sortable: false, filter: false, suppressMenu: true,
        headerClass: 'text-center font-extrabold no-header-wrap', cellClass: 'text-center flex items-center justify-center py-1',
        hide: readOnly || !visibleCols.action,
        cellRenderer: (p) => {
          const row = p.data;
          if (!row) return null;
          return (
            <EditActionButton
              label={`Update stages & post activity for ${row.post_code}`}
              onClick={() => handleOpenActivityModal(row)}
            />
          );
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plainValue/plainDate are pure formatters
    [visibleCols, userCanEdit, handleOpenActivityModal, readOnly]
  );


  /* ────────────────────────────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────────────────────────────── */

  // Text columns left, numeric/code/date columns centred (see utils/tableAlignment)
  const alignedColumns = useMemo(() => ({ columnDefs: alignHrColumns(columnDefs) }), [columnDefs]);

  if (!orgId) {
    return (
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm font-semibold text-slate-500">
        Your session does not include an organisation, so vacancy details cannot be loaded. Please sign in again.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in relative text-slate-800 dark:text-slate-100 font-sans">
      <Notification message={toast} onDismiss={() => setToast(null)} />

      {/* ── Post Header & Details Card ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs group"
            title="Back to Vacancy Management"
            aria-label="Back to Vacancy Management"
          >
            <ArrowLeft size={16} className="text-slate-600 dark:text-slate-300 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight shrink-0">
            {postMeta.postName || `Post ${postId}`}
          </h1>

          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

          <div className="flex flex-wrap items-center gap-2">
            {/* Department */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs text-xs">
              <Building size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span>
              <span className="font-bold text-blue-950 dark:text-blue-100">
                {postMeta.departmentName || 'Not Assigned'}
              </span>
            </div>

            {/* Class */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs text-xs">
              <Award size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Class:</span>
              <span className="font-bold text-purple-950 dark:text-purple-100">
                {postMeta.className || 'General'}
              </span>
            </div>

            {/* Post ID */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs text-xs">
              <Hash size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Post ID:</span>
              <CodeText>{postId}</CodeText>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Table Card ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 dark:bg-slate-950 dark:border-slate-800">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>Total Posts: {totalCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search post code, method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageSize(val);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Sliders size={12} className="text-slate-500" />
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800 max-h-72 overflow-y-auto">
                  {Object.keys(visibleCols).filter((col) => !(readOnly && col === 'action')).map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{COL_LABELS[col] || col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* Table grid */}
        <div className="relative min-h-[300px]">
          <style>{`
            .no-header-wrap .ag-header-cell-text,
            .no-header-wrap .ag-header-cell-label {
              white-space: nowrap !important;
              word-break: keep-all !important;
            }
          `}</style>
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20 rounded-xl">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 text-[#0f417a] dark:text-blue-400 animate-spin" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading vacancy records...</span>
              </div>
            </div>
          )}

          <Table
            rowData={filteredData}
            columnDefs={alignedColumns.columnDefs}
            pagination={true}
            paginationPageSize={pageSize}
            headerHeight={54}
            rowHeight={48}
            rowClassRules={{
              'opacity-60 bg-slate-50/60 dark:bg-slate-900/60': (p) => !!p.data?.isAbolished
            }}
          />
        </div>

        {/* Actions below datatable */}
        {!readOnly && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div>
            {hasUnsavedEdits ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                You have unsaved changes in {Object.keys(rowEdits).length} post{Object.keys(rowEdits).length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">All changes saved</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveInlineEdits}
            disabled={loading || !hasUnsavedEdits}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer ${
              hasUnsavedEdits
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            } disabled:opacity-60`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Save Changes</span>
          </button>
        </div>
        )}
      </div>

      {activityRow && (
        <VacancyActivityModal
          key={activityRow.rowKey}
          target="vacant"
          onClose={() => setActivityRow(null)}
          post={{ code: activityRow.postCode, name: activityRow.postName, id: postId }}
          method={activityRow.method}
          expectedMethod={activityRow.expectedMethod}
          dateOfVacancy={activityRow.dateOfVacancy}
          reasonForExemption={activityRow.reasonForExemption}
          userCanEdit={userCanEdit}
          notify={sendNotification}
          onAddEmployee={onAddEmployee}
          onSuccess={() => loadVacancyDetails({ keepEditsExcept: activityRow.rowKey })}
        />
      )}
    </div>
  );
}