import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit,
  Filter,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  ArrowLeft,
  Save,
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import {
  fetchCapexProjectsData,
  fetchUpdateCapexProjectsData,
  submitCapexProjectData,
  updateCapexProjectData,
  fetchMmtDropdown,
} from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';

const FINANCIAL_YEARS = [
  '2021-2022',
  '2022-2023',
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
];

const EMPTY_FORM = {
  financialYear: '',
  capexProjects: '',
  totalExpenditure: '',
  expenditureTillDate: '',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(val) {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '--';
  let year;
  let month;
  let day;

  if (typeof val === 'string') {
    const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]) - 1;
      day = Number(match[3]);
    }
  }

  if (year === undefined) {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  return `${String(day).padStart(2, '0')} ${MONTH_NAMES[month] || 'Jan'} ${year}`;
}

function LessThan5CrForm({
  initialData = null,
  notify,
  onBack,
  onSuccess,
}) {
  const permissions = useProjectsPermissions();
  const isOrgScope = Boolean(permissions.isOrgScope || permissions.isOrganisationUser);
  const isEdit = Boolean(initialData?.financial_year);
  const canSubmit = isEdit
    ? Boolean(permissions.canEdit && !permissions.isViewOnlyAdmin)
    : Boolean(permissions.canAdd && isOrgScope && !permissions.isViewOnlyAdmin);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editOrgId, setEditOrgId] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialData?.financial_year) {
      setForm({
        financialYear: initialData.financial_year || '',
        capexProjects: initialData.projects_less_than_5cr ?? '',
        totalExpenditure: initialData.total_expenditure_planned ?? '',
        expenditureTillDate: initialData.expenditure_till_date ?? '',
      });
      setEditOrgId(initialData.organisation_id || null);
    } else {
      setForm(EMPTY_FORM);
      setEditOrgId(permissions.organisationId || null);
    }
    setErrors({});
  }, [initialData, permissions.organisationId]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const validateForm = () => {
    const next = {};
    if (!form.financialYear) next.financialYear = 'Financial Year is required.';
    if (form.capexProjects === '' || form.capexProjects == null || Number.isNaN(Number(form.capexProjects))) {
      next.capexProjects = 'Number of CAPEX projects is required.';
    } else if (Number(form.capexProjects) < 0) {
      next.capexProjects = 'Must be a non-negative number.';
    }
    if (form.totalExpenditure === '' || form.totalExpenditure == null || Number.isNaN(Number(form.totalExpenditure))) {
      next.totalExpenditure = 'Total expenditure planned is required.';
    } else if (Number(form.totalExpenditure) < 0) {
      next.totalExpenditure = 'Must be a non-negative number.';
    }
    if (form.expenditureTillDate === '' || form.expenditureTillDate == null || Number.isNaN(Number(form.expenditureTillDate))) {
      next.expenditureTillDate = 'Expenditure till date is required.';
    } else if (Number(form.expenditureTillDate) < 0) {
      next.expenditureTillDate = 'Must be a non-negative number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      notify?.('You do not have permission to save.', 'error');
      return;
    }
    if (!validateForm()) return;

    const organisationId = isEdit ? editOrgId : permissions.organisationId;
    if (!organisationId) {
      setErrors({ form: 'Organisation is required.' });
      return;
    }

    setBusy(true);
    try {
      if (!isEdit) {
        const check = await fetchUpdateCapexProjectsData({
          financialYear: form.financialYear,
          organisationId,
        });
        if (Array.isArray(check.data) && check.data.length > 0) {
          setErrors({ form: 'Data for this Financial Year already exists.' });
          setBusy(false);
          return;
        }

        await submitCapexProjectData({
          financialYear: form.financialYear,
          organisationId,
          capexProjects: Number(form.capexProjects),
          totalExpenditure: Number(form.totalExpenditure),
          expenditureTillDate: Number(form.expenditureTillDate),
          userId: permissions.userId,
        });
        notify?.('Details added successfully.', 'success');
      } else {
        await updateCapexProjectData({
          financialYear: form.financialYear,
          organisationId,
          capexProjects: Number(form.capexProjects),
          totalExpenditure: Number(form.totalExpenditure),
          expenditureTillDate: Number(form.expenditureTillDate),
          userId: permissions.userId,
        });
        notify?.('Details updated successfully.', 'success');
      }

      onSuccess?.();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message
        || (status === 409 ? 'Data for this Financial Year already exists.' : null)
        || (isEdit ? 'Failed to update details.' : 'Failed to add details.');
      setErrors({ form: message });
      notify?.(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-[#0f417a] dark:text-blue-400 uppercase tracking-wide">
            {isEdit ? 'Update Project Details (Less Than 5 Cr)' : 'Add Project Details (Less Than 5 Cr)'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter yearly CAPEX summary for projects under ₹5 Cr.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            Financial Year <span className="text-red-500">*</span>
          </label>
          <select
            value={form.financialYear}
            disabled={isEdit || busy || !canSubmit}
            onChange={(e) => onChange('financialYear', e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60 cursor-pointer"
          >
            <option value="">--Select Financial Year--</option>
            {FINANCIAL_YEARS.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
          {errors.financialYear ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.financialYear}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            Number of CAPEX Projects (Less Than 5 Cr) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.capexProjects}
            disabled={busy || !canSubmit}
            onChange={(e) => onChange('capexProjects', e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60"
          />
          {errors.capexProjects ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.capexProjects}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            Total Expenditure Planned (In Cr) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={form.totalExpenditure}
            disabled={busy || !canSubmit}
            onChange={(e) => onChange('totalExpenditure', e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60"
          />
          {errors.totalExpenditure ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.totalExpenditure}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            Expenditure Till Date (In Cr) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={form.expenditureTillDate}
            disabled={busy || !canSubmit}
            onChange={(e) => onChange('expenditureTillDate', e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60"
          />
          {errors.expenditureTillDate ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.expenditureTillDate}</p>
          ) : null}
        </div>
      </div>

      {errors.form ? (
        <p className="text-xs font-semibold text-red-600">{errors.form}</p>
      ) : null}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Fields marked with <span className="text-red-500">*</span> are mandatory
      </p>

      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-60"
        >
          Cancel
        </button>
        {canSubmit ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0f417a] hover:bg-[#1e5ea8] transition shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {busy ? 'Saving...' : isEdit ? 'Update' : 'Submit'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LessThan5CrList({ notify, onEdit }) {
  const permissions = useProjectsPermissions();
  const isOrgScope = Boolean(permissions.isOrgScope || permissions.isOrganisationUser);
  const canEdit = Boolean(permissions.canEdit && !permissions.isViewOnlyAdmin);

  const [rows, setRows] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterOrg, setFilterOrg] = useState('');
  const [filterFy, setFilterFy] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    sno: true,
    org: true,
    financial_year: true,
    projects_count: true,
    planned: true,
    till_date: true,
    updated: true,
    actions: true,
  });

  const load = useCallback(async () => {
    if (!permissions.canView) return;
    setLoading(true);
    try {
      const res = await fetchCapexProjectsData();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      notify?.('Failed to load CAPEX projects less than 5 Cr.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [permissions.canView, notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isOrgScope || !permissions.canView) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchMmtDropdown('mmt_organisation');
        if (!cancelled) {
          setOrganisations(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOrgScope, permissions.canView]);

  useEffect(() => {
    if (!colDropdownOpen) return undefined;
    const onClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [colDropdownOpen]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterOrg && String(row.organisation_id) !== String(filterOrg)) return false;
      if (filterFy && String(row.financial_year) !== String(filterFy)) return false;
      if (!q) return true;
      const haystack = [
        row.organisation_name,
        row.financial_year,
        row.projects_less_than_5cr,
        row.total_expenditure_planned,
        row.expenditure_till_date,
      ].map((v) => String(v ?? '').toLowerCase()).join(' ');
      return haystack.includes(q);
    });
  }, [rows, filterOrg, filterFy, searchTerm]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterOrg) count += 1;
    if (filterFy) count += 1;
    return count;
  }, [filterOrg, filterFy]);

  const handleResetFilters = () => {
    setFilterOrg('');
    setFilterFy('');
    setSearchTerm('');
  };

  const exportHeaders = useMemo(() => ([
    'S.No',
    ...(!isOrgScope ? ['Organisation Name'] : []),
    'Financial Year',
    'No. of CAPEX Projects (Less Than 5 Cr)',
    'Total Expenditure Planned (In Cr)',
    'Expenditure Till Date (In Cr)',
    'Last Updated Date',
  ]), [isOrgScope]);

  const exportData = useMemo(() => (
    filteredRows.map((row, index) => ([
      index + 1,
      ...(!isOrgScope ? [row.organisation_name || '-'] : []),
      row.financial_year || '-',
      row.projects_less_than_5cr ?? '-',
      row.total_expenditure_planned ?? '-',
      row.expenditure_till_date ?? '-',
      fmtDate(row.updated_date || row.created_date),
    ]))
  ), [filteredRows, isOrgScope]);

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        width: 80,
        maxWidth: 90,
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.sno,
      },
      {
        headerName: 'Organisation Name',
        field: 'organisation_name',
        flex: 1.4,
        minWidth: 160,
        hide: isOrgScope || !visibleCols.org,
        cellClass: 'font-semibold text-[#0f417a] dark:text-blue-400',
      },
      {
        headerName: 'Financial Year',
        field: 'financial_year',
        flex: 1,
        minWidth: 120,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.financial_year,
      },
      {
        headerName: 'No. of CAPEX Projects (Less Than 5 Cr)',
        field: 'projects_less_than_5cr',
        flex: 1.3,
        minWidth: 160,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.projects_count,
      },
      {
        headerName: 'Total Expenditure Planned (In Cr)',
        field: 'total_expenditure_planned',
        flex: 1.2,
        minWidth: 150,
        cellClass: 'text-center font-semibold text-[#0f417a] dark:text-blue-400',
        headerClass: 'text-center',
        hide: !visibleCols.planned,
      },
      {
        headerName: 'Expenditure Till Date (In Cr)',
        field: 'expenditure_till_date',
        flex: 1.2,
        minWidth: 150,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.till_date,
      },
      {
        headerName: 'Last Updated Date',
        flex: 1,
        minWidth: 130,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.updated,
        valueGetter: (params) => fmtDate(params.data?.updated_date || params.data?.created_date),
      },
    ];

    if (canEdit) {
      cols.push({
        headerName: 'Update',
        width: 100,
        pinned: 'right',
        sortable: false,
        filter: false,
        hide: !visibleCols.actions,
        cellClass: 'text-center flex items-center justify-center',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          if (!params.data) return null;
          if (isOrgScope && Number(params.data.organisation_id) !== Number(permissions.organisationId)) {
            return null;
          }
          return (
            <button
              type="button"
              title="Edit"
              onClick={() => onEdit?.(params.data)}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </button>
          );
        },
      });
    }

    return cols;
  }, [canEdit, isOrgScope, permissions.organisationId, visibleCols, onEdit]);

  const visibilityOptions = [
    { key: 'sno', label: 'S.No' },
    ...(!isOrgScope ? [{ key: 'org', label: 'Organisation Name' }] : []),
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'projects_count', label: 'No. of CAPEX Projects' },
    { key: 'planned', label: 'Total Expenditure Planned' },
    { key: 'till_date', label: 'Expenditure Till Date' },
    { key: 'updated', label: 'Last Updated Date' },
    ...(canEdit ? [{ key: 'actions', label: 'Update' }] : []),
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
            <span>Filter</span>
            {activeFiltersCount > 0 ? (
              <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {activeFiltersCount}
              </span>
            ) : null}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>

          {activeFiltersCount > 0 ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search organisation, financial year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
            >
              {[10, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredRows.length}</span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              type="button"
              onClick={() => setColDropdownOpen(!colDropdownOpen)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {colDropdownOpen ? (
              <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                  <button
                    type="button"
                    onClick={() => setVisibleCols({
                      sno: true,
                      org: true,
                      financial_year: true,
                      projects_count: true,
                      planned: true,
                      till_date: true,
                      updated: true,
                      actions: true,
                    })}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
                {visibilityOptions.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(visibleCols[key])}
                      onChange={() => setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <CopyButton
            headers={exportHeaders}
            data={exportData}
            color="#0f417a"
            triggerNotification={(msg) => notify?.(msg, 'success')}
          />
          <ExportDropdown
            headers={exportHeaders}
            data={exportData}
            fileName="Projects_Less_Than_5_Cr"
            title="CAPEX Projects Less Than 5 Cr"
            color="#0f417a"
            hoverColor="#1e5ea8"
            triggerNotification={(msg) => notify?.(msg, 'success')}
          />
        </div>
      </div>

      {showFilterPanel ? (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className={`grid gap-3 ${!isOrgScope ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {!isOrgScope ? (
              <div className="min-w-0 w-full">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Organisation
                </label>
                <select
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Organisations ({organisations.length})</option>
                  {organisations.map((org) => (
                    <option key={org.organisation_id} value={org.organisation_id}>
                      {org.organisation_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="min-w-0 w-full">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Financial Year
              </label>
              <select
                value={filterFy}
                onChange={(e) => setFilterFy(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Financial Years</option>
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <Table
        rowData={filteredRows}
        columnDefs={columnDefs}
        loading={loading}
        loadingMessage="Fetching CAPEX projects less than 5 Cr..."
        pagination
        paginationPageSize={pageSize}
        color="#0f417a"
        exportFileName="Projects_Less_Than_5_Cr"
      />
    </div>
  );
}

export default function ProjectsLessThan5CrPage({
  notify,
  view = 'list',
  initialData = null,
  onEdit,
  onBack,
  onSuccess,
}) {
  const permissions = useProjectsPermissions();

  if (!permissions.canView) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          You do not have permission to view Projects Less Than 5 Cr.
        </p>
      </div>
    );
  }

  if (view === 'form') {
    return (
      <LessThan5CrForm
        initialData={initialData}
        notify={notify}
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );
  }

  return <LessThan5CrList notify={notify} onEdit={onEdit} />;
}
