import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { Home } from 'lucide-react';
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
];

const BASE = '/admin/user-master-management';

const mmt = (table) => ({ table, load: () => rbacApi.getMmtData(table) });

const MASTERS = {
  sourceOfFunding:      { label: 'Source of Funding',        note: 'Sources from which projects are funded.',    ...mmt('mmt_source_of_funding') },
  projectCategory: {label: 'Project Category',note: 'Categories used to classify projects.',...mmt('mmt_project_category'),fields: [
    { name: 'name', label: 'Project Category Name', type: 'text', required: true },
  ],
},
  wings:                { label: 'Wings',                    note: 'Wings of the Ministry.',                     ...mmt('mmt_wings') },
  divisions:            { label: 'Divisions',                note: 'Divisions under each wing.',                 ...mmt('mmt_division') },
  sections:             { label: 'Sections',                 note: 'Sections under each division.',              ...mmt('mmt_section') },
  departments:          { label: 'Departments',              note: 'Departments of the Ministry.',               ...mmt('mmt_department') },
  initiatives:          { label: 'Initiatives',              note: 'Ministry initiatives.',                      ...mmt('mmt_initiative') },
  states:               { label: 'States & Districts',       note: 'States and their districts.',                ...mmt('mmt_state') },
  mpConstituency: {
  label: 'MP Constituency',
  note: 'Parliamentary constituencies.',
  ...mmt('mmt_mp_constituency'),
  fields: [
    { name: 'mp_constituency_name', label: 'MP Constituency Name', type: 'text', required: true },
    {
      name: 'state_id',
      label: 'State',
      type: 'select',
      required: true,
      placeholder: '--Select State--',
      optionsFrom: 'mmt_state',
      optionValue: 'state_id',
      optionLabel: 'state_name',
    },
  ],
},
  fundingAgencies:      { label: 'Funding Agencies',         note: 'Agencies that fund projects.',               ...mmt('mmt_funding_agency') },
  implementingAgencies: { label: 'Implementing Agencies',    note: 'Agencies that implement projects.',          ...mmt('mmt_implementing_agency') },
  schemes:              { label: 'Schemes',                  note: 'Government schemes.',                        ...mmt('mmt_scheme') },
  projectOutputs:       { label: 'Project Output & Outcome', note: 'Outputs and outcomes tracked for projects.', ...mmt('mmt_output') },
  clearances:           { label: 'Clearances',               note: 'Clearances required for projects.',          ...mmt('mmt_clearance') },
  organisations: {
    label: 'Organisations',
    note: 'All organisations registered on the portal.',
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

  const meta = MASTERS[activeMainTab];

  // Tab comes from the URL, same as VIPReference
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/data-list')) return 'data-list';
    return 'input-form';
  }, [location.pathname]);

  const goTab = (tabId) => navigate(`${BASE}/${tabId}`);
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

  const filteredRows = useMemo(() => {
    if (!meta.categoryFilter || selectedCategory === 'all') return rowData;
    return rowData.filter((r) => String(r.category_id) === String(selectedCategory));
  }, [rowData, selectedCategory, meta]);

 const columnDefs = useMemo(() => {
  if (!rowData.length) return [];
  return Object.keys(rowData[0])
    .filter((k) => !HIDDEN_KEYS.test(k))
    .map((k) => ({
      field: k,
      headerName: prettify(k),
      hide: HIDDEN_FIELDS.includes(k),
    }));
}, [rowData]);
  const gridColumnDefs = useMemo(() => {
  if (!columnDefs.length) return [];
  return [
    {
      headerName: 'S.No',
      valueGetter: (p) => p.node.rowIndex + 1,
      width: 90,
      minWidth: 80,
      flex: 0,
      sortable: false,
      filter: false,
      resizable: false,
    },
    ...columnDefs,
  ];
}, [columnDefs]);

  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 120 }),
    []
  );

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

      <div className="user-matrix-container w-full h-[85vh] bg-[#F8FAFC] dark:bg-[#0b0f19] text-[#1E293B] dark:text-slate-100 flex flex-col font-sans relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
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
                onChange={(e) => setActiveMainTab(e.target.value)}
              >
                {Object.entries(MASTERS).map(([key, m]) => (
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
                loading ? (
                  <p className="w-full text-center text-sm text-slate-500 py-16">Loading...</p>
                ) : (
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
                      overlayNoRowsTemplate="No records found."
                    />
                  </div>
                )
              }
            />
            <Route
              path="input-form"
              element={
                <InputForm
                  key={activeMainTab}
                  meta={meta}
                  columns={columnDefs}
                  
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