import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Edit,
  Filter,
  Info,
  Plus,
  Search,
  X,
} from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import CopyButton from '../../../../components/CopyButton';
import ExportDropdown from '../../../../components/ExportDropdown';
import {
  fetchFiscalYearTargetList,
  fetchOrganisationsForEntry,
  fetchRoroTrafficActualData,
  fetchTrafficActualData,
  fetchTrafficCommodityGroups,
  fetchCommoditiesByGroup,
} from '../../api';
import { useMajorPortsPermissions } from '../../hooks/useMajorPortsPermissions';
import {
  ACTUALS_SUB_VIEWS,
  LIST_VIEW_MODES,
  TRAFFIC_CATEGORIES,
  TRAFFIC_CELL_DIMENSIONS,
  TRAFFIC_COMMODITY_GROUPS,
  TRAFFIC_DIRECTIONS,
  TRAFFIC_FLAG_TYPES,
  buildFinancialYearOptions,
  trafficDimensionColKey,
} from './trafficConstants';
import {
  buildCommodityDetailRows,
  formatMonthLabel,
  parseMonthToNumber,
} from './trafficUtils';
import TargetFormModal from './components/TargetFormModal';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';
import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../../../utils/tableCellWrap';

const FY_OPTIONS = buildFinancialYearOptions(8);

const filterSelectClass =
  'w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer';

function formatNum(value) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '-';
}

function wrapCol(headerName, field, opts = {}) {
  const {
    flex = 1,
    minWidth = 120,
    pinned,
    cellClass = 'font-semibold text-slate-700 text-center',
    valueFormatter,
    valueGetter,
    cellRenderer,
  } = opts;
  return {
    headerName,
    field,
    flex,
    minWidth,
    ...(pinned ? { pinned } : {}),
    ...(valueFormatter ? { valueFormatter } : {}),
    ...(valueGetter ? { valueGetter } : {}),
    ...getWrapColumnProps(cellClass),
    cellRenderer:
      cellRenderer ||
      ((params) =>
        renderWrappedText(
          params.valueFormatted ?? params.value,
          cellClass,
          '-'
        )),
  };
}

function numCol(headerName, field, opts = {}) {
  const {
    flex = 1,
    minWidth = 130,
    cellClass = 'font-bold text-slate-800 text-center',
  } = opts;
  return {
    headerName,
    field,
    flex,
    minWidth,
    valueFormatter: (p) => formatNum(p.value),
    ...getWrapColumnProps(cellClass),
    cellRenderer: (params) =>
      renderWrappedText(
        params.valueFormatted ?? params.value,
        cellClass,
        '-'
      ),
  };
}

function ViewToggle({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-sm">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-[#0f417a] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function buildCommodityDimensionGroups() {
  const leaf = (category, direction, flag) => {
    const dim = TRAFFIC_CELL_DIMENSIONS.find(
      (d) =>
        d.categoryId === category.id &&
        d.directionId === direction.id &&
        d.flagTypeId === flag.id
    );
    const field = trafficDimensionColKey(dim);
    return {
      headerName: flag.name,
      field,
      minWidth: 100,
      width: 108,
      suppressSizeToFit: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellClass:
        'text-center font-semibold text-slate-700 dark:text-slate-200 text-[11px] tabular-nums',
      valueFormatter: (p) => formatNum(p.value),
    };
  };

  const categoryGroup = (category) => ({
    headerName: category.name,
    marryChildren: true,
    children: TRAFFIC_DIRECTIONS.map((direction) => ({
      headerName: direction.name,
      marryChildren: true,
      children: TRAFFIC_FLAG_TYPES.map((flag) => leaf(category, direction, flag)),
    })),
  });

  const directCats = TRAFFIC_CATEGORIES.filter((c) => !c.transhipment);
  const transCats = TRAFFIC_CATEGORIES.filter((c) => c.transhipment);

  return [
    {
      headerName: 'Direct',
      marryChildren: true,
      children: directCats.map(categoryGroup),
    },
    {
      headerName: 'Transhipment',
      marryChildren: true,
      children: transCats.map(categoryGroup),
    },
  ];
}

export default function TrafficDataList({
  onEdit,
  onSwitchTab: _onSwitchTab,
  triggerNotification,
  refreshKey = 0,
}) {
  const permissions = useMajorPortsPermissions();
  const {
    canAdd,
    canEdit,
    canView,
    isMinistryView,
    organisationId: sessionOrgId,
  } = permissions;

  const [viewMode, setViewMode] = useState('actuals');
  const [actualsSubView, setActualsSubView] = useState('periods');
  const [loading, setLoading] = useState(false);
  const [commodityRows, setCommodityRows] = useState([]);
  const [periodRows, setPeriodRows] = useState([]);
  const [roroRows, setRoroRows] = useState([]);
  const [targetRows, setTargetRows] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [commodityGroupOptions, setCommodityGroupOptions] = useState([]);
  const [commodityMasterOptions, setCommodityMasterOptions] = useState([]);
  const [serverPagination, setServerPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const [yearFilter, setYearFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [targetModal, setTargetModal] = useState({ open: false, mode: 'add', record: null });

  const gridRef = useRef(null);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMeta = useCallback(async () => {
    if (!canView) return;
    try {
      const [roroRes, targetRes, orgRes, groupRes] = await Promise.allSettled([
        fetchRoroTrafficActualData(!isMinistryView && sessionOrgId ? sessionOrgId : undefined),
        fetchFiscalYearTargetList(),
        fetchOrganisationsForEntry(),
        fetchTrafficCommodityGroups(),
      ]);

      if (groupRes.status === 'fulfilled') {
        const groups = Array.isArray(groupRes.value.data) ? groupRes.value.data : [];
        const byId = new Map();
        TRAFFIC_COMMODITY_GROUPS.forEach((g) => {
          byId.set(Number(g.id), { id: g.id, name: g.label });
        });
        groups.forEach((g) => {
          const id = Number(g.commodity_group_id ?? g.id);
          const name = g.commodity_group_name || g.name;
          if (!id || !name) return;
          byId.set(id, { id, name });
        });
        setCommodityGroupOptions(Array.from(byId.values()));
      } else {
        setCommodityGroupOptions(
          TRAFFIC_COMMODITY_GROUPS.map((g) => ({ id: g.id, name: g.label }))
        );
      }

      if (roroRes.status === 'fulfilled') {
        let list = Array.isArray(roroRes.value.data) ? roroRes.value.data : [];
        if (!isMinistryView && sessionOrgId) {
          list = list.filter((r) => Number(r.organisation_id) === Number(sessionOrgId));
        }
        setRoroRows(
          list.map((r) => ({
            ...r,
            month: parseMonthToNumber(r.month),
            month_label: formatMonthLabel(r.month),
          }))
        );
      } else {
        setRoroRows([]);
      }

      if (targetRes.status === 'fulfilled') {
        let list = Array.isArray(targetRes.value.data) ? targetRes.value.data : [];
        if (!isMinistryView && sessionOrgId) {
          list = list.filter((r) => Number(r.organisation_id) === Number(sessionOrgId));
        }
        setTargetRows(list);
      } else {
        setTargetRows([]);
      }

      if (orgRes.status === 'fulfilled') {
        const data = orgRes.value.data;
        const orgs = data?.organisations || (Array.isArray(data) ? data : []);
        setOrganisations(orgs);
      }
    } catch (err) {
      console.error(err);
    }
  }, [canView, isMinistryView, sessionOrgId]);

  const loadPagedActuals = useCallback(
    async (signal) => {
      if (!canView || viewMode !== 'actuals') return;
      if (actualsSubView === 'roro') return;

      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          view: actualsSubView === 'periods' ? 'period' : 'commodity-row',
        };
        if (!isMinistryView && sessionOrgId) {
          params.organisationId = sessionOrgId;
        } else if (orgFilter) {
          params.organisationId = orgFilter;
        }
        if (yearFilter) params.fiscalYear = yearFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        if (actualsSubView === 'commodity' && groupFilter) {
          const group =
            commodityGroupOptions.find((g) => g.name === groupFilter) ||
            TRAFFIC_COMMODITY_GROUPS.find((g) => g.label === groupFilter);
          const groupId = group?.id ?? group?.commodity_group_id;
          if (groupId) params.commodityGroupId = groupId;
        }
        if (actualsSubView === 'commodity' && commodityFilter) {
          const match = commodityMasterOptions.find((c) => c.name === commodityFilter);
          if (match?.id) params.commodityId = match.id;
        }

        const res = await fetchTrafficActualData(params, { signal });
        if (signal?.aborted) return;

        const payload = res?.data || {};
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        const paginationPayload = payload?.pagination || {
          total: list.length,
          page,
          limit: pageSize,
          totalPages: Math.ceil(list.length / pageSize) || 0,
        };

        setServerPagination({
          total: Number(paginationPayload.total) || 0,
          page: Number(paginationPayload.page) || page,
          limit: Number(paginationPayload.limit) || pageSize,
          totalPages: Number(paginationPayload.totalPages) || 0,
        });

        if (actualsSubView === 'periods') {
          setPeriodRows(
            list.map((r) => ({
              fiscal_year: r.fiscal_year,
              month: r.month_num ?? parseMonthToNumber(r.month),
              month_label: formatMonthLabel(r.month_num ?? r.month),
              organisation_id: r.organisation_id,
              organisation_name: r.organisation_name,
              total_value: Number(r.total_value || 0),
              total_teu: Number(r.total_teu || 0),
              commodity_count: Number(r.commodity_count || 0),
            }))
          );
          setCommodityRows([]);
        } else {
          setCommodityRows(buildCommodityDetailRows(list));
          setPeriodRows([]);
        }
      } catch (err) {
        if (err?.code === 'ERR_CANCELED') return;
        console.error(err);
        setCommodityRows([]);
        setPeriodRows([]);
        setServerPagination({ total: 0, page: 1, limit: pageSize, totalPages: 0 });
        triggerNotification?.(
          err?.response?.data?.message || 'Failed to load traffic data list.',
          'error'
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      canView,
      viewMode,
      actualsSubView,
      page,
      pageSize,
      isMinistryView,
      sessionOrgId,
      orgFilter,
      yearFilter,
      debouncedSearch,
      groupFilter,
      commodityFilter,
      commodityMasterOptions,
      commodityGroupOptions,
      triggerNotification,
    ]
  );

  useEffect(() => {
    loadMeta();
  }, [loadMeta, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    loadPagedActuals(controller.signal);
    return () => controller.abort();
  }, [loadPagedActuals, refreshKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setYearFilter('');
    setOrgFilter('');
    setGroupFilter('');
    setCommodityFilter('');
    setSearchQuery('');
    setPage(1);
  }, [viewMode, actualsSubView]);

  useEffect(() => {
    setPage(1);
  }, [yearFilter, orgFilter, groupFilter, commodityFilter, searchQuery, pageSize]);

  const isServerPagedView =
    viewMode === 'actuals' && (actualsSubView === 'commodity' || actualsSubView === 'periods');

  const activeRows = useMemo(() => {
    if (viewMode === 'targets') return targetRows;
    if (actualsSubView === 'roro') return roroRows;
    if (actualsSubView === 'periods') return periodRows;
    return commodityRows;
  }, [viewMode, actualsSubView, commodityRows, periodRows, roroRows, targetRows]);

  const orgOptions = useMemo(() => {
    const map = new Map();
    organisations.forEach((o) => {
      const id = o.organisation_id || o.id;
      if (id != null) map.set(String(id), o.organisation_name || o.name);
    });
    activeRows.forEach((r) => {
      if (r.organisation_id != null && !map.has(String(r.organisation_id))) {
        map.set(String(r.organisation_id), r.organisation_name || String(r.organisation_id));
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [activeRows, organisations]);

  const groupOptions = useMemo(() => {
    if (commodityGroupOptions.length) {
      return commodityGroupOptions.map((g) => g.name).sort((a, b) => a.localeCompare(b));
    }
    return TRAFFIC_COMMODITY_GROUPS.map((g) => g.label);
  }, [commodityGroupOptions]);

  useEffect(() => {
    let cancelled = false;
    async function loadCommodities() {
      if (!groupFilter) {
        setCommodityMasterOptions([]);
        return;
      }
      const group = commodityGroupOptions.find((g) => g.name === groupFilter);
      const groupId =
        group?.id ||
        TRAFFIC_COMMODITY_GROUPS.find((g) => g.label === groupFilter)?.id;
      if (!groupId) {
        setCommodityMasterOptions([]);
        return;
      }
      try {
        const res = await fetchCommoditiesByGroup(groupId);
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setCommodityMasterOptions(
          list
            .map((c) => ({
              id: c.commodity_id ?? c.id,
              name: c.commodity_name || c.name,
            }))
            .filter((c) => c.id && c.name)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch {
        if (!cancelled) setCommodityMasterOptions([]);
      }
    }
    loadCommodities();
    return () => {
      cancelled = true;
    };
  }, [groupFilter, commodityGroupOptions]);

  const commodityOptions = useMemo(() => {
    if (commodityMasterOptions.length) {
      return commodityMasterOptions.map((c) => c.name);
    }
    const set = new Set();
    commodityRows.forEach((r) => {
      if (groupFilter && r.commodity_group_name !== groupFilter) return;
      if (r.commodity_name) set.add(r.commodity_name);
    });
    return Array.from(set).sort();
  }, [commodityMasterOptions, commodityRows, groupFilter]);

  const filteredData = useMemo(() => {
    let data = activeRows;
    if (!isServerPagedView) {
      if (yearFilter) {
        data = data.filter(
          (r) => String(r.fiscal_year || r.financial_year) === String(yearFilter)
        );
      }
      if (orgFilter) {
        data = data.filter((r) => String(r.organisation_id) === String(orgFilter));
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter((r) =>
          [
            r.fiscal_year,
            r.financial_year,
            r.month_label,
            r.organisation_name,
            r.ro_ro_traffic,
            r.ro_pax_traffic,
            r.fiscal_year_target,
          ]
            .filter((v) => v != null)
            .some((v) => String(v).toLowerCase().includes(q))
        );
      }
    }
    return data;
  }, [
    activeRows,
    isServerPagedView,
    yearFilter,
    orgFilter,
    searchQuery,
  ]);

  const pagination = useMemo(() => {
    if (isServerPagedView) {
      return {
        total: serverPagination.total,
        page: serverPagination.page || page,
        limit: pageSize,
        totalPages: serverPagination.totalPages || 0,
      };
    }
    const total = filteredData.length;
    const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));
    const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
    return { total, page: safePage, limit: pageSize, totalPages };
  }, [isServerPagedView, serverPagination, filteredData.length, page, pageSize]);

  const pagedData = useMemo(() => {
    if (isServerPagedView) return filteredData;
    if (!pagination.total) return [];
    const start = (pagination.page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [isServerPagedView, filteredData, pagination.page, pagination.total, pageSize]);

  useEffect(() => {
    if (!isServerPagedView && page !== pagination.page) setPage(pagination.page);
  }, [isServerPagedView, page, pagination.page]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (yearFilter) count += 1;
    if (isMinistryView && orgFilter) count += 1;
    if (viewMode === 'actuals' && actualsSubView === 'commodity') {
      if (groupFilter) count += 1;
      if (commodityFilter) count += 1;
    }
    return count;
  }, [
    yearFilter,
    orgFilter,
    groupFilter,
    commodityFilter,
    isMinistryView,
    viewMode,
    actualsSubView,
  ]);

  const clearFilters = () => {
    setYearFilter('');
    setOrgFilter('');
    setGroupFilter('');
    setCommodityFilter('');
  };

  const handleEditPeriod = useCallback(
    (row) => {
      if (!canEdit) return;
      onEdit?.({
        fiscal_year: row.fiscal_year,
        month: row.month ?? parseMonthToNumber(row.month_label),
        organisation_id: row.organisation_id,
        organisation_name: row.organisation_name,
      });
    },
    [canEdit, onEdit]
  );

  const showUpdateColumn =
    canEdit &&
    (viewMode === 'targets' ||
      (viewMode === 'actuals' &&
        (actualsSubView === 'periods' || actualsSubView === 'roro')));

  const updateColDef = useMemo(() => {
    if (!showUpdateColumn) return null;
    return {
      headerName: 'Update',
      field: 'actions',
      flex: 1,
      minWidth: 110,
      maxWidth: 140,
      pinned: 'right',
      lockPinned: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        const row = params.data;
        if (!row) return null;
        return (
          <div className="flex items-center justify-center gap-1 w-full h-full py-1">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'targets') {
                  setTargetModal({ open: true, mode: 'update', record: row });
                } else {
                  handleEditPeriod(row);
                }
              }}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
              title={viewMode === 'targets' ? 'Update Target' : 'Update Traffic'}
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        );
      },
    };
  }, [showUpdateColumn, viewMode, handleEditPeriod]);

  const colDefs = useMemo(() => {
    const sno = {
      headerName: 'S.No',
      pinned: 'left',
      flex: 0.6,
      minWidth: 70,
      sortable: false,
      valueGetter: (p) => (pagination.page - 1) * pageSize + p.node.rowIndex + 1,
      cellClass:
        'font-bold text-slate-500 text-center flex items-center justify-center',
    };

    if (viewMode === 'targets') {
      return [
        sno,
        wrapCol('Financial Year', 'financial_year', {
          flex: 1.2,
          minWidth: 130,
          cellClass: 'font-semibold text-slate-700 text-center',
        }),
        ...(isMinistryView
          ? [
              wrapCol('Organisation', 'organisation_name', {
                flex: 2,
                minWidth: 220,
                cellClass: 'font-bold text-slate-800 text-left',
              }),
            ]
          : []),
        numCol('Target (MMT)', 'fiscal_year_target', {
          flex: 1.5,
          minWidth: 140,
          cellClass: 'font-black text-[#0f417a] text-center',
        }),
        numCol('Actual (MMT)', 'fiscal_year_actual', {
          flex: 1.5,
          minWidth: 140,
          cellClass: 'font-black text-blue-700 text-center',
        }),
        {
          headerName: 'Achievement %',
          field: 'achievement_percentage',
          flex: 1.3,
          minWidth: 140,
          valueFormatter: (p) =>
            p.value != null && p.value !== ''
              ? `${Number(p.value).toFixed(2)}%`
              : '-',
          ...getWrapColumnProps('font-bold text-slate-800 text-center'),
          cellRenderer: (params) =>
            renderWrappedText(
              params.valueFormatted ?? params.value,
              'font-bold text-slate-800 text-center',
              '-'
            ),
        },
        ...(updateColDef ? [updateColDef] : []),
      ];
    }

    if (actualsSubView === 'roro') {
      return [
        sno,
        wrapCol('Financial Year', 'fiscal_year', {
          flex: 1.2,
          minWidth: 130,
          cellClass: 'font-semibold text-slate-700 text-center',
        }),
        wrapCol('Month', 'month_label', {
          flex: 1,
          minWidth: 110,
          cellClass: 'font-semibold text-slate-700 text-center',
        }),
        ...(isMinistryView
          ? [
              wrapCol('Organisation Name', 'organisation_name', {
                flex: 2,
                minWidth: 220,
                cellClass: 'font-bold text-slate-800 text-left',
              }),
            ]
          : []),
        numCol('Total Ro-Ro Traffic (In 000 Tonnes)', 'ro_ro_traffic', {
          flex: 2,
          minWidth: 200,
          cellClass: 'font-black text-[#0f417a] text-center',
        }),
        numCol('Total Ro-Pax Traffic (In 000 Tonnes / Number)', 'ro_pax_traffic', {
          flex: 2,
          minWidth: 220,
          cellClass: 'font-black text-blue-700 text-center',
        }),
        ...(updateColDef ? [updateColDef] : []),
      ];
    }

    if (actualsSubView === 'periods') {
      return [
        sno,
        wrapCol('Financial Year', 'fiscal_year', {
          flex: 1.2,
          minWidth: 130,
          cellClass: 'font-semibold text-slate-700 text-center',
        }),
        wrapCol('Month', 'month_label', {
          flex: 1,
          minWidth: 110,
          cellClass: 'font-semibold text-slate-700 text-center',
        }),
        ...(isMinistryView
          ? [
              wrapCol('Organisation', 'organisation_name', {
                flex: 2,
                minWidth: 220,
                cellClass: 'font-bold text-slate-800 text-left',
              }),
            ]
          : []),
        numCol("Total ('000 Tonnes)", 'total_value', {
          flex: 1.6,
          minWidth: 160,
          cellClass: 'font-black text-[#0f417a] text-center',
        }),
        numCol("Total (TEU's)", 'total_teu', {
          flex: 1.4,
          minWidth: 140,
          cellClass: 'font-black text-blue-700 text-center',
        }),
        {
          headerName: 'Commodities',
          field: 'commodity_count',
          flex: 1.1,
          minWidth: 120,
          ...getWrapColumnProps('font-bold text-slate-800 text-center'),
          cellRenderer: (params) =>
            renderWrappedText(params.value, 'font-bold text-slate-800 text-center', '-'),
        },
        ...(updateColDef ? [updateColDef] : []),
      ];
    }

    return [
      {
        ...sno,
        minWidth: 78,
        maxWidth: 90,
      },
      wrapCol('Financial Year', 'fiscal_year', {
        flex: 1.1,
        minWidth: 120,
        pinned: 'left',
        cellClass: 'font-semibold text-slate-700 text-center',
      }),
      wrapCol('Month', 'month_label', {
        flex: 0.9,
        minWidth: 100,
        pinned: 'left',
        cellClass: 'font-semibold text-slate-700 text-center',
      }),
      ...(isMinistryView
        ? [
            wrapCol('Organisation Name', 'organisation_name', {
              flex: 1.6,
              minWidth: 180,
              pinned: 'left',
              cellClass: 'font-bold text-slate-800 text-left',
            }),
          ]
        : []),
      wrapCol('Commodity Group', 'commodity_group_name', {
        flex: 1.2,
        minWidth: 130,
        pinned: 'left',
        cellClass: 'font-semibold text-slate-700 text-center',
      }),
      {
        headerName: 'Commodity',
        field: 'commodity_name',
        flex: 1.5,
        minWidth: 160,
        pinned: 'left',
        ...getWrapColumnProps('font-bold text-slate-800 text-left'),
        cellRenderer: (params) => {
          const name = params.data?.commodity_name || '-';
          const isTeu = params.data?.is_teu;
          return (
            <div className="w-full max-w-full whitespace-normal break-words leading-snug py-0.5 text-left">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-[12px]">
                {name}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {isTeu ? '(TEUs)' : '(000 Tonnes)'}
              </div>
            </div>
          );
        },
      },
      ...buildCommodityDimensionGroups(),
    ];
  }, [viewMode, actualsSubView, isMinistryView, updateColDef, pagination.page, pageSize]);

  const toggleableCols = useMemo(() => {
    const list = [];
    const walk = (cols) => {
      cols.forEach((col) => {
        if (col.children) {
          walk(col.children);
          return;
        }
        if (
          !col.headerName ||
          col.headerName === 'S.No' ||
          col.headerName === 'Update'
        ) {
          return;
        }
        const key = col.field || col.headerName;
        if (key) list.push({ key, label: col.headerName });
      });
    };
    walk(colDefs);
    return list;
  }, [colDefs]);

  const [visibleCols, setVisibleCols] = useState({});

  useEffect(() => {
    setVisibleCols((prev) => {
      const next = { ...prev };
      let changed = false;
      toggleableCols.forEach(({ key }) => {
        if (next[key] === undefined) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [toggleableCols]);

  const displayColDefs = useMemo(() => {
    const applyHide = (col) => {
      if (col.children) {
        return {
          ...col,
          children: col.children.map(applyHide),
        };
      }
      const key = col.field || col.headerName;
      if (!key || col.headerName === 'S.No' || col.headerName === 'Update') return col;
      return {
        ...col,
        hide: visibleCols[key] === false,
      };
    };
    return colDefs.map(applyHide);
  }, [colDefs, visibleCols]);

  const handleExport = (type) => {
    if (type === 'Copy') {
      if (viewMode === 'actuals' && actualsSubView === 'commodity') {
        const dimKeys = TRAFFIC_CELL_DIMENSIONS.map((d) => trafficDimensionColKey(d));
        const headers = [
          'S.No',
          'Financial Year',
          'Month',
          'Organisation',
          'Commodity Group',
          'Commodity',
          ...dimKeys,
        ];
        let tsv = `${headers.join('\t')}\n`;
        filteredData.forEach((row, i) => {
          tsv +=
            [
              i + 1,
              row.fiscal_year,
              row.month_label,
              row.organisation_name,
              row.commodity_group_name,
              row.commodity_name,
              ...dimKeys.map((k) => row[k] ?? ''),
            ].join('\t') + '\n';
        });
        navigator.clipboard.writeText(tsv);
        triggerNotification?.('Copied to clipboard.', 'success');
        return;
      }
      const lines = filteredData.map((r, i) =>
        [
          i + 1,
          r.fiscal_year || r.financial_year,
          r.month_label,
          r.organisation_name,
          r.ro_ro_traffic,
          r.ro_pax_traffic,
          r.fiscal_year_target,
          r.fiscal_year_actual,
          r.achievement_percentage,
        ]
          .filter((v) => v != null && v !== '')
          .join('\t')
      );
      navigator.clipboard.writeText(lines.join('\n'));
      triggerNotification?.('Copied to clipboard.', 'success');
      return;
    }
    if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'traffic_data_list' });
      return;
    }
    if (type === 'PDF') {
      let labels;
      if (viewMode === 'targets') {
        labels = {
          financial_year: 'Financial Year',
          organisation_name: 'Organisation',
          fiscal_year_target: 'Target (MMT)',
          fiscal_year_actual: 'Actual (MMT)',
          achievement_percentage: 'Achievement %',
        };
      } else if (actualsSubView === 'roro') {
        labels = {
          fiscal_year: 'Financial Year',
          month_label: 'Month',
          organisation_name: 'Organisation',
          ro_ro_traffic: 'Total Ro-Ro Traffic (In 000 Tonnes)',
          ro_pax_traffic: 'Total Ro-Pax Traffic (In 000 Tonnes / Number)',
        };
      } else if (actualsSubView === 'periods') {
        labels = {
          fiscal_year: 'Financial Year',
          month_label: 'Month',
          organisation_name: 'Organisation',
          total_value: "Total ('000 Tonnes)",
          total_teu: "Total (TEU's)",
          commodity_count: 'Commodities',
        };
      } else {
        const dimKeys = TRAFFIC_CELL_DIMENSIONS.map((d) => trafficDimensionColKey(d));
        labels = {
          fiscal_year: 'Financial Year',
          month_label: 'Month',
          organisation_name: 'Organisation',
          commodity_group_name: 'Commodity Group',
          commodity_name: 'Commodity',
          ...Object.fromEntries(dimKeys.map((k) => [k, k.replace(/_/g, ' ')])),
        };
      }
      const visible = Object.fromEntries(Object.keys(labels).map((k) => [k, true]));
      exportDataListToPdf({
        title: 'Traffic Data List',
        columnLabels: labels,
        visibleCols: visible,
        rowData: filteredData,
        fileName: 'traffic_data_list',
      });
    }
  };

  const showAddTarget = viewMode === 'targets' && canAdd && isMinistryView;
  const isCommodityView = viewMode === 'actuals' && actualsSubView === 'commodity';
  const isPeriodView = viewMode === 'actuals' && actualsSubView === 'periods';

  const refreshList = useCallback(() => {
    loadMeta();
    const controller = new AbortController();
    loadPagedActuals(controller.signal);
  }, [loadMeta, loadPagedActuals]);

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
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
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
            />
          </button>

          {activeFiltersCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          ) : null}

          <ViewToggle
            options={LIST_VIEW_MODES}
            value={viewMode}
            onChange={(next) => {
              setViewMode(next);
              if (next === 'targets') setActualsSubView('periods');
            }}
          />
          {viewMode === 'actuals' ? (
            <ViewToggle
              options={ACTUALS_SUB_VIEWS}
              value={actualsSubView}
              onChange={(next) => {
                setActualsSubView(next);
                setPage(1);
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                isCommodityView || isPeriodView
                  ? 'Search organisation, commodity, year...'
                  : 'Search traffic records...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total:{' '}
            <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">
              {loading ? '…' : pagination.total}
            </span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {dropdownOpen ? (
              <div className="absolute right-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Toggle Columns
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const all = {};
                      toggleableCols.forEach(({ key }) => {
                        all[key] = true;
                      });
                      setVisibleCols(all);
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
                {toggleableCols.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[key] !== false}
                      onChange={() =>
                        setVisibleCols((prev) => ({
                          ...prev,
                          [key]: prev[key] === false,
                        }))
                      }
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <CopyButton
            onCopy={() => handleExport('Copy')}
            color="#0f417a"
            hoverBg="#f1f5f9"
          />
          <ExportDropdown
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />
          {showAddTarget ? (
            <button
              type="button"
              onClick={() => setTargetModal({ open: true, mode: 'add', record: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Target
            </button>
          ) : null}
        </div>
      </div>

      {showFilterPanel ? (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Filter Traffic
              </span>
            </div>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            ) : null}
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              isCommodityView ? 'lg:grid-cols-4' : 'lg:grid-cols-2'
            } gap-3`}
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Financial Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className={filterSelectClass}
              >
                <option value="">Show All</option>
                {FY_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {isMinistryView ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Organisation
                </label>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="">Show All</option>
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isCommodityView ? (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Commodity Group
                  </label>
                  <select
                    value={groupFilter}
                    onChange={(e) => {
                      setGroupFilter(e.target.value);
                      setCommodityFilter('');
                    }}
                    className={filterSelectClass}
                  >
                    <option value="">Show All</option>
                    {groupOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Commodity
                  </label>
                  <select
                    value={commodityFilter}
                    onChange={(e) => setCommodityFilter(e.target.value)}
                    className={filterSelectClass}
                  >
                    <option value="">Show All</option>
                    {commodityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold italic flex items-center space-x-1.5 pt-1">
            <Info size={14} className="text-blue-600 flex-shrink-0" />
            <span>
              {isCommodityView
                ? 'Commodity Data shows the Direct + Transhipment matrix. Use Period Summary or Ro-Ro / Ro-Pax to open Update.'
                : isPeriodView
                  ? 'Period Summary lists monthly totals with Update to edit the full traffic period.'
                  : viewMode === 'targets'
                    ? 'Fiscal year targets are maintained by the MoPSW Admin team.'
                    : 'Ro-Ro / Ro-Pax lists monthly totals. Use Update to edit the traffic period.'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[380px] capex-grid border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <Table
          ref={gridRef}
          rowData={pagedData}
          columnDefs={displayColDefs}
          loading={loading}
          pagination={false}
          color="#0f417a"
          {...(isCommodityView ? { autoSizeStrategy: null } : {})}
          defaultColDef={{
            minWidth: 90,
            filter: false,
            sortable: true,
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
          }}
        />
        {pagination.totalPages > 0 ? (
          <TablePagination
            currentPage={Math.max(0, pagination.page - 1)}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            pageSize={pageSize}
            onPageChange={(pageIndex) => setPage(pageIndex + 1)}
            onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() =>
              setPage((p) => Math.min(pagination.totalPages || 1, p + 1))
            }
            color="#0f417a"
          />
        ) : null}
      </div>

      <TargetFormModal
        open={targetModal.open}
        mode={targetModal.mode}
        record={targetModal.record}
        organisations={organisations}
        defaultOrganisationId={sessionOrgId || ''}
        onClose={() => setTargetModal({ open: false, mode: 'add', record: null })}
        onSuccess={refreshList}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
