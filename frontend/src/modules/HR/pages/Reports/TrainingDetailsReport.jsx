import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTrainingDetailsReport } from '../../api';
import { useHRPermissions } from '../../hooks/useHRPermissions';
import ReportLayout from './components/ReportLayout';
import { totalRow } from './reportUtils';
import { COMMON_TOASTS } from '../../../../utils/notify';

export default function TrainingDetailsReport({ report, onBack, notify }) {
  const { roleId, orgId, isMinistryView } = useHRPermissions();
  const scopeOrgId = isMinistryView ? 0 : orgId;

  const [data, setData] = useState({ columnDefs: [], rowData: [] });
  const [loading, setLoading] = useState(true);

  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const load = useCallback(async () => {
    if (!roleId || scopeOrgId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchTrainingDetailsReport(roleId, scopeOrgId);
      setData({
        columnDefs: Array.isArray(res.data?.columnDefs) ? res.data.columnDefs : [],
        rowData: Array.isArray(res.data?.rowData) ? res.data.rowData : [],
      });
    } catch {
      setData({ columnDefs: [], rowData: [] });
      notifyRef.current?.(COMMON_TOASTS.loadFailed('The training details report'));
    } finally {
      setLoading(false);
    }
  }, [roleId, scopeOrgId]);

  // Deferred a tick so the load's setState does not run synchronously in the effect.
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const { columns, rows } = useMemo(() => {
    const orgCols = data.columnDefs.filter((c) => c.headerName !== 'S.No' && c.field !== 'Training_Type' && c.field !== 'Total');
    const orgFields = orgCols.map((c) => c.field);
    return {
      columns: [
        { headerName: 'S.No', minWidth: 56, value: (_row, i) => i + 1 },
        { headerName: 'Training Type', field: 'Training_Type', minWidth: 220, align: 'left', emphasis: true },
        ...orgCols.map((c) => ({ headerName: c.headerName, field: c.field, minWidth: 140 })),
        { headerName: 'Total', field: 'Total', minWidth: 90, emphasis: true },
      ],
      rows: data.rowData.map((r) => {
        const row = { ...r };
        let total = 0;
        orgFields.forEach((f) => {
          row[f] = Number(r[f]) || 0;
          total += row[f];
        });
        row.Total = total;
        return row;
      }),
    };
  }, [data]);

  const getTotals = useCallback((shown) => totalRow(shown, { labelKey: 'Training_Type' }), []);

  return (
    <ReportLayout
      report={report}
      headerHeight={72}
      meta="Participants by training type and organisation"
      onBack={onBack}
      note="The Total column adds each training type's participants across organisations; the Total row adds each organisation's participants across training types."
      rows={rows}
      columns={columns}
      getTotals={getTotals}
      loading={loading}
      onRefresh={load}
      notify={notify}
      emptyMessage={!roleId || orgId == null ? 'Your role could not be read from the session. Please sign in again.' : 'No training data available.'}
    />
  );
}
