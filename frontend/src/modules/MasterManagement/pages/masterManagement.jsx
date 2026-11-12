import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { Home, Edit,Eye, X  } from 'lucide-react';
import { rbacApi } from '../../UserManagement/rbacApi';
import '../../UserManagement/UserMatrix.css';
import InputForm from './InputForm';
import InternalNavigation from '../../../components/InternalNavigation';
import { TAB_USER_MASTER_MANAGEMENT } from '../../../utils/moduleAccess';



const HIDDEN_FIELDS = [
  'source_of_funding_id', 'sof_id',
  'project_category_id', 'category_id',
  'wing_id', 'division_id', 'section_id', 'department_id',
  'initiative_id', 'state_id',
  'mpc_id', 'mp_constituency_id',
  'fa_id', 'funding_agency_id',
  'ia_id', 'implementing_agency_id',
  'scheme_id',
  'project_output_id', 'output_id',
  'clearance_id', 'clearence_id',
  'organisation_id', 'organisation_category_id',
  'ovd_status',
  'ministry_code',
  'district_id',
  
];

const BASE = '/admin/user-master-management';

const mmt = (table) => ({ table, load: () => rbacApi.getMmtList(table) });

const MASTERS = {
   sourceOfFunding:      { label: 'Source of Funding',        note: 'Sources from which projects are funded.',    ...mmt('mmt_source_of_funding') },
   projectCategory: {
    label: 'Project Category',
    note: 'Categories used to classify projects.',
    ...mmt('mmt_project_category'),
    hideColumns: ['broad_category_id', 'project_core_category'],   // <-- ADD
    fields: [
      { name: 'name', label: 'Project Category Name', type: 'text', required: true },
    ],
  },
  wings:                { label: 'Wings',                    note: 'Wings of the Ministry.',                     ...mmt('mmt_wings') },
  divisions:            { label: 'Divisions',                note: 'Divisions under each wing.',                 ...mmt('mmt_division') },
    sections: {
    label: 'Sections',
    note: 'Sections under each division.',
    ...mmt('mmt_section'),
    fields: [
      { name: 'division_id', label: 'Division', type: 'select', required: true,
        optionsFrom: 'mmt_division', optionValue: 'division_id', optionLabel: 'division_name',
        placeholder: '--Select Division--' },
      { name: 'section_name', label: 'Section Name', type: 'text', required: true, placeholder: 'Enter section name' },
      { name: 'section_code', label: 'Section Code', type: 'text', required: true,
        placeholder: 'Enter section code', maxLength: 10, uppercase: true },
    ],
    load: async () => {
      const [list, divisions] = await Promise.all([
        rbacApi.getMmtList('mmt_section'),
        rbacApi.getMmtData('mmt_division'),
      ]);
      const divMap = Object.fromEntries(
        (divisions.data || []).map((d) => [String(d.division_id), d.division_name])
      );
      const rows = (Array.isArray(list.data) ? list.data : []).map((r) => {
        const { status, ...rest } = r;
        return { ...rest, division_name: divMap[String(r.division_id)] ?? '', status };
      });
      return { data: rows };
    },
  },
  departments: {
  label: 'Departments',
  note: 'Departments of the Ministry.',
  ...mmt('mmt_department'),
  fields: [
    { name: 'department_name', label: 'Department Name', type: 'text', required: true, placeholder: 'Enter department name' },
    { name: 'department_code', label: 'Department Code', type: 'text', required: true, placeholder: 'Enter department code' },
  ],
},
  initiatives: {
  label: 'Initiatives',
  note: 'Ministry initiatives.',...mmt('mmt_initiative'),
  fields: [{ name: 'initiative_name', label: 'Initiative Name', type: 'text', required: true },],
},
states: {
  label: 'States',
  note: 'List of states.',
  ...mmt('mmt_state'),
  fields: [
    { name: 'state_name', label: 'State Name', type: 'text', required: true },
  ],
},
districts: {
  label: 'Districts',
  note: 'Districts under each state.',
  table: 'mmt_district',
  load: () => rbacApi.getMmtList('mmt_district'),
  fields: [
    { name: 'state_id', label: 'State', type: 'select', required: true,
      optionsFrom: 'mmt_state', optionValue: 'state_id', optionLabel: 'state_name',
      placeholder: '--Select State--' },
    { name: 'district_name', label: 'District Name', type: 'text', required: true },
  ],
},

    sourceOfFunding: {
  label: 'Source of Funding',
  note: 'Sources from which projects are funded.',
  ...mmt('mmt_source_of_funding'),
  fields: [
    { name: 'source_of_funding_name', label: 'Source of Funding Name', type: 'text', required: true, placeholder: 'Enter source of funding name' },
  ],
},
mpConstituency: {
  label: 'MP Constituency',
  note: 'Parliamentary constituencies.',
  ...mmt('mmt_mp_constituency'),
  fields: [
    { name: 'mpc_name', label: 'MP Constituency Name', type: 'text', required: true, placeholder: 'Enter MP constituency name' },
    { name: 'state_id', label: 'State', type: 'select', required: true,
      optionsFrom: 'mmt_state', optionValue: 'state_id', optionLabel: 'state_name', placeholder: '--Select State--' },
  ],
  load: async () => {
  },
}, 
mpConstituency: {
  label: 'MP Constituency',
  note: 'Parliamentary constituencies.',
  ...mmt('mmt_mp_constituency'),
  load: async () => {
    const [list, states] = await Promise.all([
      rbacApi.getMmtList('mmt_mp_constituency'),
      rbacApi.getMmtData('mmt_state'),
    ]);
    const stateMap = Object.fromEntries(
      (states.data || []).map((s) => [String(s.state_id), s.state_name])
    );
    const rows = (Array.isArray(list.data) ? list.data : []).map((r) => {
      const { status, ...rest } = r;
      return { ...rest, state_name: stateMap[String(r.state_id)] ?? '', status };
    });
    return { data: rows };
  },
},
  fundingAgencies:      { label: 'Funding Agencies',         note: 'Agencies that fund projects.',               ...mmt('mmt_funding_agency') },
  implementingAgencies: { label: 'Implementing Agencies',    note: 'Agencies that implement projects.',          ...mmt('mmt_implementing_agency') },
  schemes:              { label: 'Schemes',                  note: 'Government schemes.',                        ...mmt('mmt_scheme') },
   projectOutputs:       { label: 'Project Output & Outcome', note: 'Outputs and outcomes tracked for projects.', ...mmt('mmt_output') },
    projectOutcomes: {
    label: 'Project Outcome',
    note: 'Outcomes under the selected project output.',
    hidden: true,                      // not shown in the Master dropdown
    ...mmt('mmt_outcome'),
     hideColumns: ['project_outcome_id'],
    fields: [
      { name: 'project_output_id', label: 'Project Output', type: 'select', required: true,
        optionsFrom: 'mmt_output', optionValue: 'project_output_id', optionLabel: 'project_output_name',
        placeholder: '--Select Project Output--' },
      { name: 'project_outcome_name', label: 'Project Outcome Name', type: 'text', required: true, placeholder: 'Enter project outcome name' },
      { name: 'project_outcome_units', label: 'Project Outcome Units', type: 'text', required: true, placeholder: 'Enter units' },
    ],
  },
  clearances: {
  label: 'Clearances',
  note: 'Clearances required for projects.',
  ...mmt('mmt_clearance'),
  fields: [
    { name: 'clearance_name', label: 'Clearance Name', type: 'text', required: true, placeholder: 'Enter clearance name' },
  ],
},
schemes: {
  label: 'Schemes',
  note: 'Government schemes.',
  ...mmt('mmt_scheme'),
  fields: [
    { name: 'scheme_name', label: 'Scheme Name', type: 'text', required: true, placeholder: 'Enter scheme name' },
  ],
},
  organisations: {
    label: 'Organisations',
    note: 'All organisations registered on the portal.',
    table: 'mmt_organisation',      
    load: () => rbacApi.getOrganisations(),
    categoryFilter: true,
  },
};

const TABS = [
  { id: 'input-form', label: 'Input Form' },
  { id: 'data-list', label: 'Data List' },
];

const HIDDEN_KEYS = /(^|_)(created|updated|modified)(_|$)|password|token/i;
const prettify = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const HEADER_LABELS = {
  ia_name: 'Implementing Agency Name',
  ia_code: 'Implementing Agency Code',
  mpc_name: 'MP Constituency Name',
  state_name: 'State',
  district_name: 'District Name',
  fa_name: 'Funding Agency Name', 
  project_outcome_name: 'Project Outcome Name',
  project_outcome_units: 'Project Outcome Units',
};



export default function MasterManagement({ onGoHome, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [activeMainTab, setActiveMainTab] = useState('sourceOfFunding');
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState('list');
  const [formData, setFormData] = useState(null);
  const meta = MASTERS[activeMainTab];

  const handleEdit = useCallback(
  async (row) => {
    const idField = Object.keys(row)[0]; // first column is the primary key
    try {
      // meta.load() calls rbacApi.getMmtData(table), or getOrganisations() for Organisations
      const res = await meta.load();
      const list = Array.isArray(res.data) ? res.data : [];
      const record = list.find((r) => String(r[idField]) === String(row[idField])) || row;
      setFormData(record);
      setMode('form');
    } catch (err) {
      console.error(err);
      triggerNotification?.(`Failed to load ${meta.label} for edit`, 'error');
    }
  },
  [meta, triggerNotification]
);
  const closeForm = () => {
    setMode('list');
    setFormData(null);
  };

const handleStatusToggle = useCallback(
  async (row) => {
    const idField = Object.keys(row)[0];
    const oldStatus = row.status;
    const newStatus = Number(oldStatus) === 1 ? 0 : 1;

    const setStatus = (value) =>
      setRowData((rows) =>
        rows.map((r) => (r[idField] === row[idField] ? { ...r, status: value } : r))
      );

    setStatus(newStatus);

    try {
      await rbacApi.updateMmtData(meta.table, row[idField], { ...row, status: newStatus });
    } catch (err) {
      console.error(err);
      setStatus(oldStatus);
      triggerNotification?.('Failed to update status', 'error');
    }
  },
  [meta, triggerNotification]
);

  // Tab comes from the URL, same as VIPReference
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/data-list')) return 'data-list';
    return 'input-form';
  }, [location.pathname]);

  const goTab = (tabId) => { closeForm(); navigate(`${BASE}/${tabId}`); };
  const fetchData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    rbacApi.getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRowData([]);
    setSearchTerm('');
    setSelectedCategory('all');

    MASTERS[activeMainTab]
      .load()
      .then((res) => {  
        if (!cancelled) setRowData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled && typeof triggerNotification === 'function') {
          triggerNotification(`Failed to load ${MASTERS[activeMainTab].label}`, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMainTab, refreshKey, triggerNotification]);
  const [outputFilter, setOutputFilter] = useState(null); // { id, name }

  const handleViewOutcomes = useCallback((row) => {
    setOutputFilter({ id: row.project_output_id, name: row.project_output_name });
    setActiveMainTab('projectOutcomes');
  }, []);

  const backToOutputs = () => {
    closeForm();
    setOutputFilter(null);
    setActiveMainTab('projectOutputs');
  };
    const [stateFilter, setStateFilter] = useState(null);

  const handleViewDistricts = useCallback((row) => {
    setStateFilter({ id: row.state_id, name: row.state_name });
    setActiveMainTab('districts');
  }, []);

  const backToStates = () => {
    closeForm();
    setStateFilter(null);
    setActiveMainTab('states');
  };
const filteredRows = useMemo(() => {
  if (meta.table === 'mmt_outcome' && outputFilter) {
    return rowData.filter((r) => String(r.project_output_id) === String(outputFilter.id));
  }
    if (meta.table === 'mmt_district' && stateFilter) {
    return rowData.filter((r) => String(r.state_id) === String(stateFilter.id));
  }

  if (!meta.categoryFilter || selectedCategory === 'all') return rowData;
  return rowData.filter((r) => String(r.category_id) === String(selectedCategory));
}, [rowData, selectedCategory, meta, outputFilter, stateFilter]);

  const columnDefs = useMemo(() => {
    const dropped = meta.hideColumns || [];

    // empty table: use the columns defined in the master's fields
    if (!rowData.length) {
      return (meta.fields || []).map((f) => ({
        field: f.name,
        headerName: HEADER_LABELS[f.name] || f.label || prettify(f.name),
      }));
    }

    return Object.keys(rowData[0])
      .filter((k) => !HIDDEN_KEYS.test(k) && !dropped.includes(k))
      .map((k) => ({
        field: k,
        headerName: HEADER_LABELS[k] || prettify(k),
        hide: HIDDEN_FIELDS.includes(k),
      }));
  }, [rowData, meta]);
  const gridColumnDefs = useMemo(() => {
  if (!columnDefs.length) return [];
  const cols = [
    {
      headerName: 'S.No',
      valueGetter: (p) => p.node.rowIndex + 1,
      width: 90, minWidth: 80, flex: 0,
      sortable: false, filter: false, resizable: false,
    },
    ...columnDefs.map((c) =>
  c.field === 'status'
    ? {
        ...c,
        headerName: 'Status',
        width: 140, minWidth: 120, flex: 0,
        filter: false,
        cellClass: 'text-center',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          if (!params.data) return null;
          const on = Number(params.value) === 1;
          return (
            <div className="flex items-center justify-center h-full w-full">
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => handleStatusToggle(params.data)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  on ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        },
      }
    : c
),
 ...(meta.table === 'mmt_output'
      ? [{
          headerName: 'Project Outcome',
          field: 'outcome',
          width: 150, minWidth: 130, flex: 0,
          sortable: false, filter: false, resizable: false,
          headerClass: 'text-center',
          cellRenderer: (params) => {
            if (!params.data) return null;
            return (
              <div className="flex items-center justify-center h-full w-full">
                <button
                  type="button"
                  onClick={() => handleViewOutcomes(params.data)}
                  title="View outcomes"
                  className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            );
          },
        }]
      : []),
       ...(meta.table === 'mmt_state'
      ? [{
          headerName: 'Districts',
          field: 'districts',
          width: 130, minWidth: 110, flex: 0,
          sortable: false, filter: false, resizable: false,
          headerClass: 'text-center',
          cellRenderer: (params) => {
            if (!params.data) return null;
            return (
              <div className="flex items-center justify-center h-full w-full">
                <button
                  type="button"
                  onClick={() => handleViewDistricts(params.data)}
                  title="View districts"
                  className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            );
          },
        }]
      : []),
    {
      headerName: 'Update',
      field: 'actions',
      width: 110, minWidth: 110, flex: 0,
      pinned: 'right',
      sortable: false, filter: false, resizable: false,
      headerClass: 'text-center',
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-center h-full w-full py-1">
            <button
              type="button"
              onClick={() => handleEdit(params.data)}
              title="Edit"
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];
      if (meta.table === 'mmt_outcome' || meta.table === 'mmt_district') {
    const s = cols.findIndex((c) => c.field === 'status');
    if (s !== -1) cols.push(cols.splice(s, 1)[0]);   // Status goes last
    const u = cols.find((c) => c.field === 'actions');
    if (u) delete u.pinned;                          // so Update sits before Status
  }
  return cols;
}, [columnDefs, meta, handleEdit, handleStatusToggle, handleViewOutcomes, handleViewDistricts]);

  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 120 }),
    []
  );

  // 👇 replace your existing formMeta with this
  const formMeta = useMemo(() => {
    const lock = (name) => ({
      ...meta,
      fields: meta.fields.map((f) => (f.name === name ? { ...f, readOnly: true } : f)),
    });
    if (meta.table === 'mmt_outcome' && outputFilter) return lock('project_output_id');
    if (meta.table === 'mmt_district' && stateFilter) return lock('state_id');
    return meta;
  }, [meta, outputFilter, stateFilter]);

  const formDefaults = useMemo(() => {
    if (meta.table === 'mmt_outcome' && outputFilter) return { project_output_id: String(outputFilter.id) };
    if (meta.table === 'mmt_district' && stateFilter) return { state_id: String(stateFilter.id) };
    return null;
  }, [meta, outputFilter, stateFilter]);

  const parentBanner = useMemo(() => {
    if (meta.table === 'mmt_outcome' && outputFilter)
      return { label: 'Project Output', name: outputFilter.name, back: backToOutputs, backText: '← Back to Outputs', addText: '+ Add Outcome' };
    if (meta.table === 'mmt_district' && stateFilter)
            return { label: 'Selected State', name: stateFilter.name, inputOnly: true };
    return null;
  }, [meta, outputFilter, stateFilter]);



  return (
    <div className="user-matrix-page animate-fade-in">
      <div className="um-page-header">
        <div className="um-breadcrumb">
          <Home
            className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            onClick={onGoHome}
          />
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-blue-800 dark:text-blue-300 font-bold">
            {TAB_USER_MASTER_MANAGEMENT}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Master Management
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Add and manage master data used across the portal.
          </p>
        </div>
        <InternalNavigation tabs={TABS} currentTab={currentTab} onTabChange={goTab} />
      </div>

      <div className={`user-matrix-container w-full ${currentTab === 'data-list' ? 'h-[85vh]' : 'h-auto'} bg-[#F8FAFC] dark:bg-[#0b0f19] text-[#1E293B] dark:text-slate-100 flex flex-col font-sans relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700`}>
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-brand">
              <div className="dot"></div>
              <h1>{meta.label} Master</h1>
            </div>
            <p className="topbar-note">{meta.note}</p>
          </div>

          <div className="topbar-filters">
            <div className="filter-field">
              <label htmlFor="mm-master">Master</label>
              <select
              id="mm-master"
              value={activeMainTab}
              onChange={(e) => { closeForm(); setOutputFilter(null); setStateFilter(null); setActiveMainTab(e.target.value); }}
            >
              {Object.entries(MASTERS)
            .filter(([key, m]) => !m.hidden || key === activeMainTab || currentTab === 'input-form')
            .map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
            </select>
            </div>

            {currentTab === 'data-list' && meta.categoryFilter && (
              <div className="filter-field">
                <label htmlFor="mm-filter-category">Category</label>
                <select
                  id="mm-filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentTab === 'data-list' && (
              <div className="filter-field">
                <label htmlFor="mm-search">Search</label>
                <input
                  id="mm-search"
                  type="text"
                  value={searchTerm}
                  placeholder="Search this list..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="layout" style={{ overflow: 'auto' }}>
          <Routes>
 <Route
  path="data-list"
  element={
    mode === 'form' ? (
      <InputForm
        key={`${activeMainTab}-edit`}
        meta={formMeta}
        columns={columnDefs}
        initialForm={formData}
        idField={Object.keys(rowData[0] || {})[0]}
        onBack={closeForm}
        onSuccess={() => { closeForm(); fetchData(); }}
        triggerNotification={triggerNotification}
      />
    ) : loading ? (
      <p className="w-full text-center text-sm text-slate-500 py-16">Loading...</p>
    ) : (
            <div className="w-full">

        {parentBanner && (
          <div className="flex items-end gap-3 px-4 pt-4 pb-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {parentBanner.label}
              </label>
              <input
                type="text"
                value={parentBanner.name}
                readOnly
                className="w-[28rem] max-w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700"
              />
            </div>

            {!parentBanner.inputOnly && (
              <>
                <button type="button" onClick={parentBanner.back}
                  className="h-[38px] px-4 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">
                  {parentBanner.backText}
                </button>
                <button type="button" onClick={() => goTab('input-form')}
                  className="h-[38px] px-4 rounded-lg text-xs font-bold bg-[#0f417a] hover:bg-blue-800 text-white">
                  {parentBanner.addText}
                </button>
              </>
            )}
          </div>
        )}

        <div className="ag-theme-quartz w-full">
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={filteredRows}
            columnDefs={gridColumnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchTerm}
            pagination={true}
            paginationPageSize={10}
            domLayout="autoHeight"
            overlayNoRowsTemplate="No outcomes found."
          />
        </div>
      </div>
    )
  }
/>
            <Route
              path="input-form"
              element={
                <InputForm
                key={`${activeMainTab}-${outputFilter?.id ?? stateFilter?.id ?? 'none'}`}
                meta={formMeta}
                columns={columnDefs}
                defaultValues={formDefaults}
                fetchData={fetchData}
                onBack={() => goTab('data-list')}
                triggerNotification={triggerNotification}
              />
              }
            />
            <Route index element={<Navigate to="input-form" replace />} />
            <Route path="*" element={<Navigate to="input-form" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}