import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchContractDetailsReport, fetchMmtDropdown } from '../api';
import { useHRPermissions } from '../hooks/useHRPermissions';
import ReportLayout, { FilterSelect } from './ReportLayout';
import { CONTRACT_FINANCIAL_YEARS, asList, totalRow } from './reportUtils';
import { COMMON_TOASTS } from '../../../utils/notify';

const serialColumn = () => ({ headerName: 'S.No', minWidth: 56, value: (_row, i) => i + 1 });

const contains = (value, part) => String(value ?? '').toLowerCase().includes(String(part).toLowerCase());

// Report H-3.1, ported from pages/HR/contractualReports.html.
export default function ContractualDetailsReport({ report, onBack, notify }) {
  const { roleId, orgId, isMinistryView } = useHRPermissions();
  // Ministry users see every organisation (0); organisation users their own. The server
  // applies the same rule from the token, so these values only shape the request.
  const scopeOrgId = isMinistryView ? 0 : orgId;

  const [data, setData] = useState({ columnDefs: [], rowData: [] });
  const [loading, setLoading] = useState(true);
  const [organisations, setOrganisations] = useState([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [fyFilter, setFyFilter] = useState('');

  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  useEffect(() => {
    if (!isMinistryView) return undefined;
    let alive = true;
    fetchMmtDropdown('mmt_organisation')
      .then((res) => { if (alive) setOrganisations(asList(res)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isMinistryView]);

  const load = useCallback(async () => {
    if (!roleId || scopeOrgId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchContractDetailsReport(roleId, scopeOrgId);
      setData({
        columnDefs: Array.isArray(res.data?.columnDefs) ? res.data.columnDefs : [],
        rowData: Array.isArray(res.data?.rowData) ? res.data.rowData : [],
      });
    } catch {
      setData({ columnDefs: [], rowData: [] });
      notifyRef.current?.(COMMON_TOASTS.loadFailed('The contractual details report'));
    } finally {
      setLoading(false);
    }
  }, [roleId, scopeOrgId]);

  // Deferred a tick so the load's setState does not run synchronously in the effect.
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const columns = useMemo(
    () =>
      data.columnDefs.map((c) =>
        c.field === 'S.No' ? serialColumn() : c.field === 'Organisation' ? { ...c, minWidth: 220, align: 'left', emphasis: true } : c
      ),
    [data.columnDefs]
  );

  // The legacy filters are "contains" matches on the organisation name and financial year.
  const rows = useMemo(
    () =>
      data.rowData.filter(
        (r) => (!orgFilter || contains(r.Organisation, orgFilter)) && (!fyFilter || contains(r.financial_year, fyFilter))
      ),
    [data.rowData, orgFilter, fyFilter]
  );

  const getTotals = useCallback(
    (shown) => totalRow(shown, { labelKey: 'Organisation', exclude: ['S.No', 'financial_year', 'organisation_id'] }),
    []
  );

  const resetFilters = () => {
    setOrgFilter('');
    setFyFilter('');
  };

  const filters = (
    <>
      {isMinistryView && (
        <FilterSelect
          label="Organisation"
          value={orgFilter}
          onChange={setOrgFilter}
          options={organisations.map((o) => ({ value: o.organisation_name, label: o.organisation_name }))}
        />
      )}
      <FilterSelect
        label="Financial Year"
        value={fyFilter}
        onChange={setFyFilter}
        options={CONTRACT_FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
      />
    </>
  );

  return (
    <ReportLayout
      report={report}
      meta={isMinistryView ? 'All organisations' : 'Your organisation'}
      onBack={onBack}
      filtersActive={Boolean(orgFilter || fyFilter)}
      rows={rows}
      columns={columns}
      getTotals={getTotals}
      loading={loading}
      onRefresh={load}
      filters={filters}
      onResetFilters={resetFilters}
      notify={notify}
      emptyMessage={!roleId || orgId == null ? 'Your role could not be read from the session. Please sign in again.' : 'No contractual data available.'}
    />
  );
}
