import { useEffect, useMemo, useState } from 'react';
import { Search, X, Filter, ChevronDown, AlertCircle, RefreshCw, UserPlus, Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import ConfirmModal from '../../../components/ConfirmModal';
import EmployeeFormModal from '../components/EmployeeFormModal';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { EOFFICE_TOASTS } from '../toastMessages';
import { EMPLOYEE_LEVELS, levelLabel } from '../utils/employeeLevels';
import { useEOfficeStore } from '../store/useEOfficeStore';

const NO_LEVEL = 'NONE';

// Columns for the table, search, copy and export
const COLUMNS = [
  { key: 'empId', label: 'Employee ID', value: (r) => r.empId || '', minWidth: 130 },
  { key: 'empName', label: 'Employee Name', value: (r) => r.empName || '', flex: 2, minWidth: 180 },
  { key: 'designation', label: 'Designation', value: (r) => r.designation || '', flex: 1.5, minWidth: 150 },
  { key: 'wingName', label: 'Wing', value: (r) => r.wingName || '', flex: 1.5, minWidth: 150 },
  { key: 'divisionName', label: 'Division', value: (r) => r.divisionName || '', flex: 1.5, minWidth: 150 },
  { key: 'level', label: 'Level', value: (r) => levelLabel(r.level), flex: 1.5, minWidth: 170 },
];

// The employee list E-Office and Attendance sheets are matched against (by Emp Id): filter,
// search, add, edit and delete. Applies to every E-Office sheet, so it has no category.
export default function EmployeeInfoPage({ notify, crud }) {
  const filters = useEOfficeStore((state) => state.employeeFilters);
  const searchTerm = useEOfficeStore((state) => state.employeeSearch);
  const showFilterPanel = useEOfficeStore((state) => state.showFilterPanel);
  const pageSize = useEOfficeStore((state) => state.pageSize);
  const setEmployeeFilters = useEOfficeStore((state) => state.setEmployeeFilters);
  const resetEmployeeFilters = useEOfficeStore((state) => state.resetEmployeeFilters);
  const setEmployeeSearch = useEOfficeStore((state) => state.setEmployeeSearch);
  const setShowFilterPanel = useEOfficeStore((state) => state.setShowFilterPanel);
  const setPageSize = useEOfficeStore((state) => state.setPageSize);

  // Rows tagged with the request they answer; a save, delete or Retry bumps loadKey
  const [loadKey, setLoadKey] = useState(0);
  const [result, setResult] = useState(null); // { key, rows, failed }
  useEffect(() => {
    let cancelled = false;
    api.get('/eoffice-employees')
      .then((res) => { if (!cancelled) setResult({ key: loadKey, rows: Array.isArray(res.data) ? res.data : [] }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('E-Office employees could not be loaded:', err);
        setResult({ key: loadKey, rows: [], failed: true });
        notify(COMMON_TOASTS.loadFailed('The employee list'));
      });
    return () => { cancelled = true; };
  }, [loadKey, notify]);
  const loading = result?.key !== loadKey;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result]);

  // Wing / division units, for the filters and the form
  const [units, setUnits] = useState([]);
  const [unitsError, setUnitsError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api.get('/eoffice-employee-org-units')
      .then((res) => { if (!cancelled) setUnits(Array.isArray(res.data) ? res.data : []); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Wing / division list could not be loaded:', err);
        setUnitsError('The wing and division list could not be loaded. Close this window and refresh the page.');
      });
    return () => { cancelled = true; };
  }, []);

  const wingChoices = useMemo(() => [...new Map(units.map((u) => [String(u.wing_id), u.wing_name])).entries()], [units]);
  const divisionChoices = useMemo(() => units
    .filter((u) => filters.wing === 'All' || String(u.wing_id) === filters.wing)
    .map((u) => [String(u.division_id), u.division_name]), [units, filters.wing]);

  const activeFilters = Object.values(filters).filter((v) => v !== 'All').length;

  const shownRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.wing !== 'All' && String(r.wingId) !== filters.wing) return false;
      if (filters.division !== 'All' && String(r.divisionId) !== filters.division) return false;
      if (filters.level !== 'All' && (filters.level === NO_LEVEL ? !!r.level : String(r.level || '').toUpperCase() !== filters.level)) return false;
      if (term && !COLUMNS.some((c) => String(c.value(r)).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [rows, filters, searchTerm]);

  // Add / edit form (null = closed, { employee: null } = add) and delete confirmation
  const [formAsk, setFormAsk] = useState(null);
  const [deleteAsk, setDeleteAsk] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canAct = crud.update || crud.delete;

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', width: 90, minWidth: 90, pinned: 'left',
      valueGetter: (p) => p.node.rowIndex + 1,
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    ...COLUMNS.map((c) => ({
      colId: c.key,
      headerName: c.label,
      flex: c.flex ?? 1,
      minWidth: c.minWidth,
      wrapText: true,
      autoHeight: true,
      cellClass: 'flex items-center',
      valueGetter: (p) => (p.data ? c.value(p.data) : ''),
    })),
    ...(canAct ? [{
      headerName: 'Actions', colId: 'actions', width: 120, minWidth: 120, sortable: false, pinned: 'right',
      cellClass: 'flex items-center justify-center gap-1.5',
      cellRenderer: (p) => (
        <>
          {crud.update && (
            <button type="button" onClick={() => setFormAsk({ employee: p.data })} title="Update Employee" className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer">
              <Edit size={15} />
            </button>
          )}
          {crud.delete && (
            <button type="button" onClick={() => setDeleteAsk(p.data)} title="Delete Employee" className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg transition cursor-pointer">
              <Trash2 size={15} />
            </button>
          )}
        </>
      ),
    }] : []),
  ], [canAct, crud.update, crud.delete]);

  const save = async (form) => {
    const isEdit = !!formAsk.employee;
    const body = { empName: form.empName, designation: form.designation, level: form.level, wing: Number(form.wing), division: Number(form.division) };
    try {
      if (isEdit) await api.put(`/eoffice-employees/${formAsk.employee.id}`, body);
      else await api.post('/eoffice-employee-data', { ...body, empId: form.empId });
    } catch (err) {
      console.error('E-Office employee save failed:', err);
      throw new Error(getErrorMessage(err) || 'The employee could not be saved. Please try again.', { cause: err });
    }
    notify(isEdit ? EOFFICE_TOASTS.employeeUpdated(form.empId) : EOFFICE_TOASTS.employeeAdded(form.empId));
    setFormAsk(null);
    setLoadKey((k) => k + 1);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/eoffice-employees/${deleteAsk.id}`);
      notify(EOFFICE_TOASTS.employeeDeleted(deleteAsk.empId));
      setDeleteAsk(null);
      setLoadKey((k) => k + 1);
    } catch (err) {
      console.error('E-Office employee delete failed:', err);
      notify(EOFFICE_TOASTS.employeeDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = (type) => exportTableRows(type, {
    columns: COLUMNS,
    rows: shownRows,
    fileName: 'EOffice_Employee_Info',
    title: 'E-Office Employee Information',
    notify,
  });

  const clearFilters = () => {
    resetEmployeeFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const select = (label, key, list) => (
    <div>
      <label className="module-form-label">{label}</label>
      <select aria-label={label} value={filters[key]} onChange={(e) => setEmployeeFilters({ [key]: e.target.value, ...(key === 'wing' ? { division: 'All' } : {}) })} className="module-form-select">
        <option value="All">All</option>
        {list.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );

  return (
    <div className="module-card space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFilterPanel((open) => !open)}
            className={`module-filter-btn ${showFilterPanel || activeFilters > 0 ? 'active' : ''}`}
          >
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
            <span>Filter</span>
            {activeFilters > 0 && (
              <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">{activeFilters}</span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, name, wing..."
              value={searchTerm}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full module-search-input"
            />
          </div>
          {(activeFilters > 0 || searchTerm) && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-end">

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{loading ? '...' : shownRows.length}</span>
          </div>

          <CopyButton onCopy={() => handleExport('copy')} color="#0f417a" />
          <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#0f417a" hoverColor="#0c3361" />
          {crud.create && (
            <button
              type="button"
              onClick={() => setFormAsk({ employee: null })}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#0f417a] text-white hover:bg-[#0c3361] transition shadow-sm cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      <p className="-mt-2 text-[11px] font-semibold italic text-slate-500">This employee information is used by both the Attendance and E-Office modules.</p>

      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {select('Wing', 'wing', wingChoices)}
            {select('Division', 'division', divisionChoices)}
            {select('Level of Designation', 'level', [...EMPLOYEE_LEVELS.map((l) => [l.value, l.label]), [NO_LEVEL, 'No Level Set']])}
          </div>
        </div>
      )}

      {!loading && result.failed && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span className="text-xs font-semibold">The employee list could not be loaded.</span>
          </div>
          <button type="button" onClick={() => setLoadKey((k) => k + 1)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5">
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      <div className="module-datalist-grid">
        <Table
          rowData={shownRows}
          columnDefs={columnDefs}
          loading={loading}
          pagination={true}
          paginationPageSize={pageSize}
          color="#0f417a"
        />
      </div>

      {formAsk && (
        <EmployeeFormModal
          employee={formAsk.employee}
          units={units}
          unitsError={unitsError}
          onSave={save}
          onClose={() => setFormAsk(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteAsk}
        onClose={() => setDeleteAsk(null)}
        onConfirm={confirmDelete}
        title="Delete Employee?"
        message={`Delete ${deleteAsk?.empName || 'this employee'} (${deleteAsk?.empId || ''}) from the employee list? This can't be undone.`}
        loading={deleting}
      />
    </div>
  );
}
