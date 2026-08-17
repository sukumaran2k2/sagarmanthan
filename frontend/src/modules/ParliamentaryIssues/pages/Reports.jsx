import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportTable from '../../../components/ReportTable';
import {
  buildDrilldownStageMap,
  canonicalizeIssueType,
  isAssuranceType,
  isPscType,
  issueTypesFromStages,
} from '../utils/stageHelpers';
import {
  fetchAssuranceDivisionDetail,
  fetchAssuranceDivisionWiseReport,
  fetchAssuranceWingDetail,
  fetchAssuranceWingWiseReport,
  fetchMatterDivisionDetail,
  fetchMatterDivisionWiseReport,
  fetchMatterWingDetail,
  fetchMatterWingWiseReport,
  fetchParliamentaryStages,
  fetchPscDivisionDetail,
  fetchPscDivisionWiseReport,
  fetchPscWingDetail,
  fetchPscWingWiseReport,
} from '../api';

function linkButton(label, onClick) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-transparent border-0 text-[#4b2424] dark:text-[#eadede] font-extrabold underline cursor-pointer text-[13px] p-0"
    >
      {label}
    </button>
  );
}

function tabsFromStages(stages) {
  const types = issueTypesFromStages(stages);
  return types.map((t) => {
    if (isAssuranceType(t)) {
      return { id: 'assurance', label: t, issueType: t, family: 'assurance' };
    }
    if (isPscType(t)) {
      return { id: 'psc', label: t, issueType: t, family: 'psc' };
    }
    return {
      id: canonicalizeIssueType(t).replace(/\s+/g, '_').toLowerCase(),
      label: t,
      issueType: t,
      family: 'matter',
    };
  });
}

function issueTypeParen(family, issueType) {
  if (family === 'assurance') return '(Assurance)';
  if (family === 'psc') return '(PSC Report)';
  return `(Matter Raised - ${issueType})`;
}

function form82Title(level, family, issueType) {
  return `Form No.:8.2 - ${level} - Parliamentary Issues ${issueTypeParen(family, issueType)}`;
}

function buildRootView(tab) {
  const title = form82Title('Abstract Wing Wise', tab.family, tab.issueType);
  if (tab.family === 'assurance') {
    return {
      type: 'wing',
      family: 'assurance',
      issueType: tab.issueType,
      title,
      fetcher: fetchAssuranceWingWiseReport,
    };
  }
  if (tab.family === 'psc') {
    return {
      type: 'wing',
      family: 'psc',
      issueType: tab.issueType,
      title,
      fetcher: fetchPscWingWiseReport,
    };
  }
  return {
    type: 'wing',
    family: 'matter',
    issueType: tab.issueType,
    title,
    fetcher: () => fetchMatterWingWiseReport(tab.issueType),
  };
}

function formatAsOnDate(date = new Date()) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function formatReportMonth(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function ParliamentaryIssuesReports({ notify }) {
  const [stages, setStages] = useState([]);
  const [reportTabs, setReportTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [drillDownPath, setDrillDownPath] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  useEffect(() => {
    fetchParliamentaryStages()
      .then((res) => {
        const stageRows = Array.isArray(res.data) ? res.data : [];
        setStages(stageRows);
        const tabs = tabsFromStages(stageRows);
        setReportTabs(tabs);
        if (tabs.length) {
          setActiveTabId(tabs[0].id);
          setDrillDownPath([buildRootView(tabs[0])]);
        }
      })
      .catch((err) => {
        console.error(err);
        notify?.('Failed to load parliamentary stages.', 'error');
      });
  }, [notify]);

  const activeTab =
    reportTabs.find((t) => t.id === activeTabId) || reportTabs[0] || null;
  const currentView = drillDownPath[drillDownPath.length - 1];

  useEffect(() => {
    if (!activeTab) return;
    setDrillDownPath([buildRootView(activeTab)]);
  }, [activeTab?.id]);

  const stageMap = useMemo(() => {
    if (!activeTab) return {};
    return buildDrilldownStageMap(stages, activeTab.issueType);
  }, [stages, activeTab]);

  const fetchReportData = useCallback(async () => {
    if (!currentView?.fetcher) return;
    setLoading(true);
    try {
      const response = await currentView.fetcher();
      const payload = response.data || {};
      if (Array.isArray(payload)) {
        setReportData([]);
        setReportCols([]);
      } else {
        setReportData(payload.rowData || []);
        setReportCols(payload.columnDefs || []);
      }
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to load report.', 'error');
      setReportData([]);
      setReportCols([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, notify]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const mapColumnRenderers = useCallback(
    (cols) =>
      cols.map((col) => {
        if (col.children) {
          return { ...col, children: mapColumnRenderers(col.children) };
        }

        const field = col.field || '';
        const header = col.headerName || '';
        const family = currentView?.family;

        if (
          field === 'S No' ||
          field === 'S.No' ||
          header === 'S No' ||
          header === 'S.No'
        ) {
          return {
            ...col,
            pinned: 'left',
            lockPinned: true,
            suppressMovable: true,
            width: col.width || 70,
            minWidth: 60,
            cellRenderer: (p) => (
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#4b2424',
                }}
              >
                {p.value}
              </span>
            ),
          };
        }

        if (
          (field === 'Wing Name' || field === 'Wing') &&
          currentView?.type === 'wing'
        ) {
          return {
            ...col,
            pinned: 'left',
            cellRenderer: (p) => {
              const wingId = p.data?.['Wing Id'] ?? p.data?.['Wing ID'];
              const wingName = p.value;
              if (!wingId || wingName === 'Total') return p.value;
              return linkButton(wingName, () => {
                setDrillDownPath((prev) => [
                  ...prev,
                  {
                    type: 'division',
                    family,
                    issueType: currentView.issueType,
                    wingId,
                    wingName,
                    title: form82Title(
                      'Abstract Division Wise',
                      family,
                      currentView.issueType
                    ),
                    fetcher:
                      family === 'assurance'
                        ? () => fetchAssuranceDivisionWiseReport(wingId)
                        : family === 'psc'
                          ? () => fetchPscDivisionWiseReport(wingId)
                          : () =>
                              fetchMatterDivisionWiseReport(
                                wingId,
                                currentView.issueType
                              ),
                  },
                ]);
              });
            },
          };
        }

        const stageId = stageMap[field];
        if (stageId == null) return col;

        return {
          ...col,
          cellRenderer: (p) => {
            const countVal = Number(p.value);
            if (!Number.isFinite(countVal) || countVal <= 0) {
              return <span className="text-slate-400 dark:text-slate-500">-</span>;
            }
            const wingId =
              p.data?.['Wing Id'] ?? p.data?.['Wing ID'] ?? currentView.wingId;
            const divisionId =
              p.data?.['Division Id'] ?? p.data?.['Division ID'];
            const label = field;

            return linkButton(String(countVal), () => {
              if (currentView.type === 'division' && divisionId) {
                const divName = p.data?.['Division Name'] || 'Division';
                setDrillDownPath((prev) => [
                  ...prev,
                  {
                    type: 'detail',
                    family,
                    wingName: currentView.wingName,
                    divisionName: divName,
                    stageLabel: label,
                    title: form82Title(
                      'Detailed Division Wise',
                      family,
                      currentView.issueType
                    ),
                    fetcher:
                      family === 'assurance'
                        ? () => fetchAssuranceDivisionDetail(divisionId, stageId)
                        : family === 'psc'
                          ? () => fetchPscDivisionDetail(divisionId, stageId)
                          : () =>
                              fetchMatterDivisionDetail(
                                divisionId,
                                stageId,
                                currentView.issueType
                              ),
                  },
                ]);
                return;
              }

              if (!wingId) return;
              const wingName = p.data?.['Wing Name'] || p.data?.Wing || 'Wing';
              setDrillDownPath((prev) => [
                ...prev,
                {
                  type: 'detail',
                  family,
                  wingName,
                  stageLabel: label,
                  title: form82Title(
                    'Detailed Wing Wise',
                    family,
                    currentView.issueType
                  ),
                  fetcher:
                    family === 'assurance'
                      ? () => fetchAssuranceWingDetail(wingId, stageId)
                      : family === 'psc'
                        ? () => fetchPscWingDetail(wingId, stageId)
                        : () =>
                            fetchMatterWingDetail(
                              wingId,
                              stageId,
                              currentView.issueType
                            ),
                },
              ]);
            });
          },
        };
      }),
    [currentView, stageMap]
  );

  const columns = useMemo(() => {
    const mapped = mapColumnRenderers(reportCols);
    const isSerial = (col) => {
      const field = col.field || '';
      const header = col.headerName || '';
      return (
        field === 'S No' ||
        field === 'S.No' ||
        header === 'S No' ||
        header === 'S.No'
      );
    };
    const serial = mapped.filter(isSerial);
    const rest = mapped.filter((col) => !isSerial(col));
    return [...serial, ...rest];
  }, [mapColumnRenderers, reportCols]);

  const reportSubtitle = useMemo(() => {
    const asOn = formatAsOnDate();
    const month = formatReportMonth();
    return (
      <>
        {currentView?.wingName && (
          <>
            <span>
              For Wing:{' '}
              <strong className="text-[#4b2424] dark:text-[#eadede]">{currentView.wingName}</strong>
            </span>
            <span className="text-[#eadede] dark:text-slate-600">•</span>
          </>
        )}
        <span>
          As On date:{' '}
          <strong className="text-[#4b2424] dark:text-[#eadede] underline">{asOn}</strong>
        </span>
        <span className="text-[#eadede] dark:text-slate-600">•</span>
        <span>
          (Report for the Month -{' '}
          <strong className="text-[#4b2424] dark:text-[#eadede]">{month}</strong>)
        </span>
      </>
    );
  }, [currentView?.wingName]);

  if (!activeTab || !currentView) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-sm text-slate-500 dark:text-slate-400">
        Loading report masters…
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2 select-none px-1 overflow-x-auto">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTabId === tab.id
                ? 'border-[#4b2424] text-[#4b2424] dark:border-[#eadede] dark:text-[#eadede] bg-[#f7f3f3] dark:bg-slate-800 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <ReportTable
          title={currentView.title}
          eyebrow={currentView.title}
          subtitle={reportSubtitle}
          showBackButton={drillDownPath.length > 1}
          onBack={() => setDrillDownPath((prev) => prev.slice(0, -1))}
          rawData={reportData}
          viewData={reportData}
          columns={columns}
          loading={loading}
          onRefresh={fetchReportData}
          pagination
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#f8faf6"
          themeClass="yp-pro-grid"
        />
      </div>
    </div>
  );
}
