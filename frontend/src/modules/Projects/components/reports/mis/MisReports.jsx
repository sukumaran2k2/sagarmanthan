import { useCallback, useEffect, useState } from 'react';
import { fetchProjectsMisReport, fetchProjectsMisSummary } from '../../../api';
import { getMisReport } from '../../../utils/mis/catalog';
import { mergeMisPack, applyReport } from '../../../utils/mis/pack';
import MisOverview from './MisOverview';
import MisReportDetail from './MisReportDetail';

function emptyPack() {
  return mergeMisPack({ audience: 'ministry', reports: [] });
}

export default function MisReports() {
  const [pack, setPack] = useState(() => emptyPack());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  const loadPack = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProjectsMisSummary();
      setPack(mergeMisPack(res.data));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Project MIS reports could not be loaded.');
      setPack(emptyPack());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetchProjectsMisSummary();
        if (cancelled) return;
        setPack(mergeMisPack(res.data));
        setError('');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err?.response?.data?.message || 'Project MIS reports could not be loaded.');
        setPack(emptyPack());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReport = useCallback(async (reportId) => {
    setRefreshingId(reportId);
    try {
      const res = await fetchProjectsMisReport(reportId);
      const meta = getMisReport(reportId);
      if (!meta) return;
      const financialYear = res.data?.financialYear;
      const audience = res.data?.audience;
      const next = applyReport(meta, res.data?.report, { financialYear, audience });
      setPack((prev) => ({
        ...prev,
        asOnDate: res.data?.asOnDate || prev.asOnDate,
        financialYear: financialYear || prev.financialYear,
        audience: audience || prev.audience,
        reports: prev.reports.map((report) => (report.id === reportId ? next : report)),
      }));
      setError('');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'This annexure could not be refreshed.');
    } finally {
      setRefreshingId(null);
    }
  }, []);

  const active = pack.reports.find((report) => report.id === activeId) || null;

  if (active) {
    return (
      <MisReportDetail
        report={active}
        pack={pack}
        loading={loading || refreshingId === active.id}
        error={error}
        onBack={() => setActiveId(null)}
        onOpen={setActiveId}
        onRefresh={() => refreshReport(active.id)}
      />
    );
  }

  return (
    <MisOverview
      pack={pack}
      loading={loading}
      error={error}
      onOpen={setActiveId}
      onRefresh={loadPack}
    />
  );
}
