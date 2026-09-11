import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteExpenditureLogRow,
  editExpenditureComponentsDetails,
  fetchDelayReason,
  fetchExpenditureDetails,
  fetchFundingComponents,
  fetchInaugurationDates,
  fetchPhysicalProgress,
  fetchUnderImplementationMilestones,
} from '../api';
import { getProjectIdentity } from '../utils/mapProject';
import { DEFAULT_MILESTONES, mapMilestonesFromApi, sliceDate } from '../utils/stageMappers';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';

const COMPONENT_KEYS = [
  { key: 'gbsComponents', label: 'GBS Components (In Cr.)', apiField: 'gbs_components' },
  { key: 'iebrComponents', label: 'IEBR Components (In Cr.)', apiField: 'iebr_components' },
  { key: 'pppComponents', label: 'PPP-Private Components (In Cr.)', apiField: 'ppp_components' },
  { key: 'loansComponents', label: 'Loans Components (In Cr.)', apiField: 'loans_components' },
  { key: 'multilateralComponents', label: 'Multilateral Funding Components (In Cr.)', apiField: 'multilateral_components' },
  { key: 'stateGovFundComponents', label: 'State Govt. Fund Components (In Cr.)', apiField: 'state_gov_fund_components' },
  { key: 'pmmsyComponents', label: 'PMMSY Components (In Cr.)', apiField: 'pmmsy_components' },
  { key: 'sagarmalaComponents', label: 'Sagarmala Components (In Cr.)', apiField: 'sagarmala_components' },
  { key: 'otherSourceFunding', label: 'Other Components (In Cr.)', apiField: 'other_source_funding_comp' },
];

const SECTION_ORDER = ['physical', 'financial'];
const MONTH_NAME_BY_VALUE = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

const buildEmptyComponents = () =>
  COMPONENT_KEYS.reduce((acc, item) => ({ ...acc, [item.key]: '' }), {});

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCrores = (value) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export default function UnderImplementationStage({
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
  const [progressDate, setProgressDate] = useState('');
  const [progressValue, setProgressValue] = useState('0');
  const [previousProgressValue, setPreviousProgressValue] = useState(null);
  const [progressLocked, setProgressLocked] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [inauguration, setInauguration] = useState('');
  const [inaugurationDate, setInaugurationDate] = useState('');
  const [tentativeInaugurationDate, setTentativeInaugurationDate] = useState('');
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [components, setComponents] = useState(buildEmptyComponents);
  const [visibleComponents, setVisibleComponents] = useState(() =>
    COMPONENT_KEYS.reduce((acc, item) => ({ ...acc, [item.key]: true }), {})
  );
  const [awardProjectCost, setAwardProjectCost] = useState(0);
  const [expenditureLogs, setExpenditureLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('physical');
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [editingFinancialRow, setEditingFinancialRow] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    row: null,
  });
  const [financialGridApi, setFinancialGridApi] = useState(null);
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleGridCols, setVisibleGridCols] = useState({
    sNo: true,
    financialYear: true,
    month: true,
    components: true,
    update: true,
    delete: true,
  });

  const disabled = !canSubmit || readOnly;
  const progressDisabled = disabled || progressLocked;

  const visibleFields = useMemo(
    () => COMPONENT_KEYS.filter((item) => visibleComponents[item.key]),
    [visibleComponents]
  );
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColumnDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const hasAnyComponentValue = useMemo(
    () => Object.values(components).some((value) => String(value || '').trim() !== ''),
    [components]
  );
  const hasPendingFinancialEntry = !editingFinancialRow && Boolean(financialYear || month || hasAnyComponentValue);
  const financialGridRows = useMemo(() => {
    const rows = [];
    const toComponentsText = (source) =>
      COMPONENT_KEYS.map((item) => {
        const raw = source[item.key];
        const val = toNumber(raw);
        if (!raw || val === 0) return null;
        return `${item.label}: ${val}`;
      })
        .filter(Boolean)
        .join(', ');

    if (hasPendingFinancialEntry) {
      const pendingSource = {};
      COMPONENT_KEYS.forEach((item) => {
        pendingSource[item.key] = components[item.key];
      });
      const pendingRow = {
        sNo: 1,
        financialYear: financialYear || '-',
        month: displayMonth(month),
        components: toComponentsText(pendingSource) || '-',
        rawFinancialYear: financialYear || '',
        rawMonth: month || '',
        rawComponents: pendingSource,
        rowState: 'pending',
      };
      rows.push(pendingRow);
    }

    expenditureLogs.forEach((row) => {
      const source = {};
      COMPONENT_KEYS.forEach((item) => {
        source[item.key] = row[item.apiField];
      });
      const savedRow = {
        sNo: rows.length + 1,
        financialYear: row.year || row.financial_year || '-',
        month: displayMonth(row.month),
        components: toComponentsText(source) || '-',
        rawFinancialYear: row.financial_year || row.year || '',
        rawMonth: row.month || '',
        rawComponents: source,
        rowState: 'saved',
      };
      rows.push(savedRow);
    });

    return rows;
  }, [
    hasPendingFinancialEntry,
    financialYear,
    month,
    components,
    expenditureLogs,
    visibleFields,
  ]);

  const financialColumnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 90,
        hide: !visibleGridCols.sNo,
        exportable: true,
        cellClass: 'font-mono text-slate-600 text-center',
        headerClass: 'text-center',
      },
      {
        field: 'financialYear',
        headerName: 'Financial Year',
        minWidth: 140,
        cellClass: 'text-slate-700 font-semibold',
        hide: !visibleGridCols.financialYear,
        exportable: true,
      },
      {
        field: 'month',
        headerName: 'Month',
        minWidth: 120,
        cellClass: 'text-slate-700 font-semibold',
        hide: !visibleGridCols.month,
        exportable: true,
      },
      {
        field: 'components',
        headerName: 'Components (In Cr.)',
        minWidth: 420,
        hide: !visibleGridCols.components,
        exportable: true,
        cellClass: 'text-slate-700',
      },
      {
        field: 'update',
        headerName: 'Update',
        minWidth: 110,
        maxWidth: 130,
        hide: !visibleGridCols.update,
        exportable: false,
        sortable: false,
        filter: false,
        cellClass: 'text-center',
        cellRenderer: (params) =>
          params.data?.rowState === 'saved' ? (
            <button
              type="button"
              onClick={() => handleEditExpenditureLog(params.data)}
              className="inline-flex items-center justify-center p-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              title="Update row"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
      {
        field: 'delete',
        headerName: 'Delete',
        minWidth: 110,
        maxWidth: 130,
        hide: !visibleGridCols.delete,
        exportable: false,
        sortable: false,
        filter: false,
        cellClass: 'text-center',
        cellRenderer: (params) =>
          params.data?.rowState === 'saved' ? (
            <button
              type="button"
              onClick={() => handleDeleteExpenditureLog(params.data)}
              className="inline-flex items-center justify-center p-1.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              title="Delete row"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
    ];
    return cols;
  }, [visibleGridCols]);

  const totalExpenditureTillDate = useMemo(
    () =>
      expenditureLogs.reduce(
        (sum, row) =>
          sum +
          COMPONENT_KEYS.reduce(
            (inner, item) => inner + toNumber(row?.[item.apiField]),
            0
          ),
        0
      ),
    [expenditureLogs]
  );

  const handleFinancialExport = (type) => {
    if (!financialGridRows.length) {
      notify?.('No financial progress rows available to export.', 'info');
      return;
    }

    const activeCols = financialColumnDefs.filter(
      (col) => col.field && col.headerName && !col.hide && col.exportable !== false
    );

    if (type === 'Copy') {
      let tsv = `${activeCols.map((col) => col.headerName).join('\t')}\n`;
      financialGridRows.forEach((row) => {
        const line = activeCols.map((col) => {
          const val = row[col.field] ?? '';
          return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        });
        tsv += `${line.join('\t')}\n`;
      });
      navigator.clipboard
        .writeText(tsv)
        .then(() => notify?.('Financial progress copied to clipboard!', 'success'))
        .catch(() => notify?.('Failed to copy financial progress.', 'error'));
      return;
    }

    if (type === 'Excel') {
      if (financialGridApi) {
        financialGridApi.exportDataAsCsv({
          fileName: 'Under_Implementation_Financial_Progress.csv',
          columnKeys: activeCols.map((col) => col.field),
        });
        notify?.('Financial progress exported to CSV successfully!', 'success');
      } else {
        notify?.('Exporting financial progress...', 'info');
      }
      return;
    }

    if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const headersHtml = activeCols
        .map(
          (col) =>
            `<th style="border:1px solid #cbd5e1;padding:10px;text-align:left;background:#0f417a;color:#fff;font-size:11px;font-weight:bold;text-transform:uppercase;">${col.headerName}</th>`
        )
        .join('');
      const rowsHtml = financialGridRows
        .map((row) => {
          const cells = activeCols
            .map((col) => {
              const val = row[col.field] ?? '';
              return `<td style="border:1px solid #e2e8f0;padding:8px;font-size:11px;">${val}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      printWindow.document.write(`
        <html><head><title>Under Implementation Financial Progress</title>
        <style>body{font-family:system-ui,sans-serif;color:#1e293b;padding:20px}h1{font-size:18px;color:#0f417a}table{width:100%;border-collapse:collapse;margin-top:15px}</style>
        </head><body>
        <h1>Under Implementation Financial Progress</h1>
        <p style="font-size:11px;color:#64748b">Generated on: ${new Date().toLocaleDateString()}</p>
        <table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <script>window.onload=function(){window.print();window.close()}</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [milestoneRes, progressRes, delayRes, inaugRes, fundRes, expRes] = await Promise.all([
          fetchUnderImplementationMilestones(projectID, subProjectID),
          fetchPhysicalProgress(projectID, subProjectID),
          fetchDelayReason(projectID, subProjectID),
          fetchInaugurationDates(projectID, subProjectID),
          fetchFundingComponents(projectID, subProjectID),
          fetchExpenditureDetails(projectID, subProjectID),
        ]);
        if (!mounted) return;

        setMilestones(mapMilestonesFromApi(Array.isArray(milestoneRes?.data) ? milestoneRes.data : []));

        const progressRow = Array.isArray(progressRes?.data) ? progressRes.data[0] : null;
        if (progressRow) {
          setProgressDate(sliceDate(progressRow.progress_date || progressRow.as_on_date));
          setProgressValue(String(progressRow.physical_progress ?? progressRow.progress_value ?? '0'));
          setPreviousProgressValue(
            Number(progressRow.physical_progress ?? progressRow.progress_value ?? 0)
          );
          setProgressLocked(true);
        }

        const delayRow = Array.isArray(delayRes?.data) ? delayRes.data[0] : null;
        if (delayRow) setDelayReason(delayRow.delay_reason || delayRow.reason || '');

        const inaugRow = Array.isArray(inaugRes?.data) ? inaugRes.data[0] : null;
        if (inaugRow) {
          if (inaugRow.inauguration_value === 1 || inaugRow.inauguration_value === true) {
            setInauguration('yes');
            setInaugurationDate(sliceDate(inaugRow.inauguration_date));
          } else if (inaugRow.inauguration_value === 0 || inaugRow.inauguration_value === false) {
            setInauguration('no');
            setTentativeInaugurationDate(sliceDate(inaugRow.tentative_inauguration_date));
          }
        }

        const fundRow = Array.isArray(fundRes?.data) ? fundRes.data[0] : null;
        if (fundRow) {
          setAwardProjectCost(Number(fundRow.award_project_cost || 0));
          const visibility = {};
          COMPONENT_KEYS.forEach((item) => {
            const val = fundRow[item.apiField];
            visibility[item.key] = val != null && val !== '' && Number(val) > 0;
          });
          if (!Object.values(visibility).some(Boolean)) {
            COMPONENT_KEYS.forEach((item) => {
              visibility[item.key] = true;
            });
          }
          setVisibleComponents(visibility);
        }

        setExpenditureLogs(Array.isArray(expRes?.data) ? expRes.data : []);
      } catch (error) {
        console.error(error);
        notify?.('Failed to load under implementation details.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, refreshKey, notify]);

  const updateMilestone = (id, patch) => {
    setMilestones((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = () => {
    const progressNum = Number(progressValue);
    if (progressDate) {
      if (Number.isNaN(progressNum) || progressNum > 100 || progressNum < 0) {
        notify?.('The physical progress must be less than or equal to 100 %.', 'error');
        return;
      }
      if (
        previousProgressValue != null &&
        !Number.isNaN(previousProgressValue) &&
        progressNum <= Number(previousProgressValue)
      ) {
        notify?.(
          'The physical progress percentage must always be greater the previous value.',
          'error'
        );
        return;
      }
    } else if (String(progressValue || '').trim() && String(progressValue) !== '0') {
      notify?.('Please select a physical progress as on date.', 'error');
      return;
    }

    onSubmitStage?.('implementation', {
      progressDate,
      progressValue: progressDate ? progressValue : '',
      milestones,
      delayReason,
      inauguration,
      inaugurationDate,
      tentativeInaugurationDate,
      financialYear,
      month,
      components,
      awardProjectCost,
    });
  };

  const goToSection = (targetSection) => {
    if (!SECTION_ORDER.includes(targetSection)) return;
    setActiveSection(targetSection);
  };

  const openFinancialModal = () => {
    setEditingFinancialRow(null);
    setFinancialModalOpen(true);
  };

  const closeFinancialModal = () => {
    setFinancialModalOpen(false);
    if (editingFinancialRow) {
      clearFinancialDraft();
    }
    setEditingFinancialRow(null);
  };

  function handleEditExpenditureLog(row) {
    if (row?.rowState !== 'saved') return;
    setEditingFinancialRow({
      financialYear: row.rawFinancialYear,
      month: String(row.rawMonth),
    });
    setFinancialYear(String(row.rawFinancialYear || ''));
    setMonth(String(row.rawMonth || ''));
    setComponents((prev) => {
      const next = { ...prev };
      COMPONENT_KEYS.forEach((item) => {
        next[item.key] = String(row.rawComponents?.[item.key] ?? '');
      });
      return next;
    });
    setFinancialModalOpen(true);
  }

  function handleDeleteExpenditureLog(row) {
    if (row?.rowState !== 'saved') {
      clearFinancialDraft();
      return;
    }
    setDeleteConfirmModal({ open: true, row });
  }

  const closeDeleteConfirmModal = () => {
    setDeleteConfirmModal({ open: false, row: null });
  };

  const confirmDeleteExpenditureLog = async () => {
    const row = deleteConfirmModal.row;
    if (!row || row.rowState !== 'saved') {
      closeDeleteConfirmModal();
      return;
    }

    try {
      await deleteExpenditureLogRow({
        projectID,
        subProjectID,
        year: row.rawFinancialYear,
        month: row.rawMonth,
      });
      setExpenditureLogs((prev) =>
        prev.filter(
          (item) =>
            !(
              String(item.financial_year || item.year) === String(row.rawFinancialYear) &&
              String(item.month) === String(row.rawMonth)
            )
        )
      );
      if (
        editingFinancialRow &&
        String(editingFinancialRow.financialYear) === String(row.rawFinancialYear) &&
        String(editingFinancialRow.month) === String(row.rawMonth)
      ) {
        closeFinancialModal();
        clearFinancialDraft();
      }
      closeDeleteConfirmModal();
      notify?.('Expenditure log deleted successfully.', 'success');
    } catch (error) {
      console.error(error);
      notify?.('Failed to delete expenditure log row.', 'error');
    }
  };

  const saveFinancialDraft = async () => {
    if (!financialYear) {
      notify?.('Please enter a financial year.', 'error');
      return;
    }
    if (!month) {
      notify?.('Please enter a month.', 'error');
      return;
    }
    if (!hasAnyComponentValue) {
      notify?.('Please enter at least one expenditure component.', 'error');
      return;
    }

    if (editingFinancialRow) {
      const payload = {
        projectID,
        subProjectID,
        year: financialYear,
        month,
      };
      COMPONENT_KEYS.forEach((item) => {
        payload[item.apiField] = String(components[item.key] || '0');
      });

      try {
        await editExpenditureComponentsDetails(payload);
        setExpenditureLogs((prev) =>
          prev.map((item) => {
            const isMatch =
              String(item.financial_year || item.year) === String(financialYear) &&
              String(item.month) === String(month);
            if (!isMatch) return item;
            const updated = { ...item };
            COMPONENT_KEYS.forEach((keyItem) => {
              updated[keyItem.apiField] = Number(components[keyItem.key] || 0);
            });
            return updated;
          })
        );
        closeFinancialModal();
        clearFinancialDraft();
        notify?.('Expenditure details updated successfully.', 'success');
      } catch (error) {
        console.error(error);
        notify?.('Failed to update expenditure details.', 'error');
      }
      return;
    }

    setFinancialModalOpen(false);
  };

  const clearFinancialDraft = () => {
    setFinancialYear('');
    setMonth('');
    setComponents(buildEmptyComponents());
  };

  function displayMonth(value) {
    const key = Number(value);
    return MONTH_NAME_BY_VALUE[key] || value || '-';
  }

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="text-xs font-semibold text-slate-500">Loading implementation details...</div>
      ) : null}

      <div className="flex items-center border-b border-slate-200 select-none overflow-x-auto scrollbar-none">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => goToSection('physical')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'physical'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              activeSection === 'physical'
                ? 'bg-[#0f417a] text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
              1
            </span>
            <span>Physical Progress</span>
          </button>
          <button
            type="button"
            onClick={() => goToSection('financial')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'financial'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              activeSection === 'financial'
                ? 'bg-[#0f417a] text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
              2
            </span>
            <span>Financial Progress</span>
          </button>
        </div>
      </div>

      {activeSection === 'physical' && (
        <>
          <div className="border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress as on</label>
                <input type="date" max={today} value={progressDate} disabled={progressDisabled} onChange={(e) => setProgressDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress (%)</label>
                <input type="number" min="0" max="100" value={progressValue} disabled={progressDisabled} onChange={(e) => setProgressValue(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setProgressLocked(false)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 bg-blue-50 disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setProgressLocked(true)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-rose-200 text-rose-700 bg-rose-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-[#0f417a] text-white">
                <tr>
                  <th className="text-left px-3 py-2.5">Milestone</th>
                  <th className="text-left px-3 py-2.5">Targeted End Date</th>
                  <th className="text-left px-3 py-2.5">Actual End Date</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{row.milestone}</td>
                    <td className="px-3 py-2.5"><input type="date" value={row.targetedEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { targetedEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                    <td className="px-3 py-2.5"><input type="date" max={today} value={row.actualEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { actualEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl bg-white p-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Reasons for Delay (if any)</label>
              <input type="text" value={delayReason} disabled={disabled} onChange={(e) => setDelayReason(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
            </div>

            <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Whether the Project is Inaugurated?</p>
              <div className="flex gap-6 text-xs font-semibold text-slate-700">
                <label className="inline-flex items-center gap-2"><input type="radio" value="yes" checked={inauguration === 'yes'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> Yes</label>
                <label className="inline-flex items-center gap-2"><input type="radio" value="no" checked={inauguration === 'no'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> No</label>
              </div>
              {inauguration === 'yes' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Date of Inauguration</label>
                  <input type="date" max={today} value={inaugurationDate} disabled={disabled} onChange={(e) => setInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
                </div>
              )}
              {inauguration === 'no' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tentative Date of Inauguration</label>
                  <input type="date" value={tentativeInaugurationDate} disabled={disabled} onChange={(e) => setTentativeInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeSection === 'financial' && (
        <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f417a] uppercase">Expenditure Logs</h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rows</span>
                <span className="text-xs font-bold text-slate-700">{financialGridRows.length}</span>
              </div>
              <CopyButton
                onCopy={() => handleFinancialExport('Copy')}
                color="#0f417a"
                hoverBg="#f1f5f9"
              />
              <ExportDropdown
                onExportExcel={() => handleFinancialExport('Excel')}
                onExportPdf={() => handleFinancialExport('PDF')}
                color="#0f417a"
                hoverColor="#1d5594"
              />
              <div className="relative" ref={colDropdownRef}>
                <button
                  type="button"
                  onClick={() => setColumnDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0f417a] hover:bg-slate-50"
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Columns
                </button>
                {columnDropdownOpen ? (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 max-h-64 overflow-y-auto">
                    {[
                      { key: 'sNo', label: 'S.No' },
                      { key: 'financialYear', label: 'Financial Year' },
                      { key: 'month', label: 'Month' },
                      { key: 'components', label: 'Components (In Cr.)' },
                      { key: 'update', label: 'Update' },
                      { key: 'delete', label: 'Delete' },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleGridCols[col.key])}
                          onChange={() =>
                            setVisibleGridCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                          }
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
              {hasPendingFinancialEntry && !editingFinancialRow ? (
                <button
                  type="button"
                  onClick={clearFinancialDraft}
                  disabled={disabled}
                  className="px-3 py-1.5 text-xs font-bold border border-rose-200 rounded-lg text-rose-700 bg-rose-50 disabled:opacity-60"
                >
                  Clear Pending
                </button>
              ) : null}
              <button
                type="button"
                onClick={openFinancialModal}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-lg text-white bg-[#0f417a] hover:bg-[#1d5594] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                {hasPendingFinancialEntry ? 'Edit Pending Entry' : 'Add Financial Progress'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Project Cost
              </p>
              <p className="mt-1 text-base font-black text-emerald-800">
                Rs. {formatCrores(awardProjectCost)} Cr
              </p>
              <p className="text-[11px] font-semibold text-emerald-700/80">
                Awarded project cost
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Expenditure Till Date
              </p>
              <p className="mt-1 text-base font-black text-amber-800">
                Rs. {formatCrores(totalExpenditureTillDate)} Cr
              </p>
              <p className="text-[11px] font-semibold text-amber-700/80">
                Total saved expenditure
              </p>
            </div>
          </div>

          <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <Table
              rowData={financialGridRows}
              columnDefs={financialColumnDefs}
              loading={loading}
              pagination={false}
              enableExport={false}
              color="#0f417a"
              defaultColDef={{
                minWidth: 120,
                sortable: true,
                filter: true,
                resizable: true,
              }}
              onGridReady={(params) => setFinancialGridApi(params.api)}
            />
          </div>
          {!financialGridRows.length ? (
            <p className="text-xs text-slate-500">No expenditure logs found.</p>
          ) : null}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {activeSection === 'financial' ? (
          <button
            type="button"
            onClick={() => goToSection('physical')}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white"
          >
            Back to Physical Progress
          </button>
        ) : null}
        {activeSection === 'physical' ? (
          <button
            type="button"
            onClick={() => goToSection('financial')}
            className="px-4 py-2 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-lg"
          >
            Continue to Financial Progress
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
          >
            Submit Under Implementation
          </button>
        )}
      </div>

      {financialModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-slate-900/45 flex items-center justify-center p-4">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">
                {editingFinancialRow ? 'Update Financial Progress' : 'Add Financial Progress'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {editingFinancialRow
                  ? 'Update expenditure values for the selected row.'
                  : 'Enter financial year, month and expenditure values.'}
              </p>
            </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
                  <select value={financialYear} disabled={disabled || Boolean(editingFinancialRow)} onChange={(e) => setFinancialYear(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
                    <option value="">--Select Financial Year--</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
                  <select value={month} disabled={disabled || Boolean(editingFinancialRow)} onChange={(e) => setMonth(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
                    <option value="">--Select Month--</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={components[field.key]}
                      disabled={disabled}
                      onChange={(e) => setComponents((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>
                ))}
              </div>
            </div>

              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeFinancialModal}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={saveFinancialDraft}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {editingFinancialRow ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {deleteConfirmModal.open
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Delete Expenditure Log</h3>
                  <p className="text-xs text-slate-500 mt-1">Are you sure you want to delete this expenditure log row?</p>
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteConfirmModal}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteExpenditureLog}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
