import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { stripTimesFromReportRows } from '../../../utils/formatReportDate';
import {
  buildDrilldownStageMap,
  canonicalizeIssueType,
  isAssuranceType,
  isPscType,
  issueTypesFromStages,
  lookupDrilldownStageId,
} from '../utils/stageHelpers';
import {
  fetchAssuranceDivisionDetail,
  fetchAssuranceDivisionWiseReport,
  fetchAssuranceWingDetail,
  fetchAssuranceWingDivisionReport,
  fetchAssuranceWingWiseReport,
  fetchMatterDivisionDetail,
  fetchMatterDivisionWiseReport,
  fetchMatterWingDetail,
  fetchMatterWingDivisionReport,
  fetchMatterWingWiseReport,
  fetchParliamentaryStages,
  fetchPscDivisionDetail,
  fetchPscDivisionWiseReport,
  fetchPscWingDetail,
  fetchPscWingDivisionReport,
  fetchPscWingWiseReport,
} from '../api';

const WING_FIELDS = new Set(['Wing Id', 'Wing ID', 'Wing Name', 'Wing']);
const DIVISION_FIELDS = new Set(['Division Id', 'Division ID', 'Division Name', 'Division']);
const ID_FIELDS = new Set(['Wing Id', 'Wing ID', 'Division Id', 'Division ID']);
const META_FIELDS = new Set(['S No', 'S.No', ...WING_FIELDS, ...DIVISION_FIELDS]);

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

function abstractLevel(reportView) {
  if (reportView === 'wing') return 'Abstract Wing Wise';
  if (reportView === 'division') return 'Abstract Division Wise';
  return 'Abstract Wing & Division Wise';
}

function form82Title(level, family, issueType) {
  return `Form No.:8.2 - ${level} - Parliamentary Issues ${issueTypeParen(family, issueType)}`;
}

function combinedFetcher(tab) {
  if (tab.family === 'assurance') return fetchAssuranceWingDivisionReport;
  if (tab.family === 'psc') return fetchPscWingDivisionReport;
  return () => fetchMatterWingDivisionReport(tab.issueType);
}

function wingWiseFetcher(tab) {
  if (tab.family === 'assurance') return fetchAssuranceWingWiseReport;
  if (tab.family === 'psc') return fetchPscWingWiseReport;
  return () => fetchMatterWingWiseReport(tab.issueType);
}

function summaryFetcher(tab, reportView) {
  if (reportView === 'wing') return wingWiseFetcher(tab);
  return combinedFetcher(tab);
}

function buildRootView(tab) {
  return {
    type: 'summary',
    family: tab.family,
    issueType: tab.issueType,
    fetcher: combinedFetcher(tab),
  };
}

function formatAsOnDate(date = new Date()) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function formatReportMonth(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function wingIdOf(row = {}) {
  return row['Wing Id'] ?? row['Wing ID'];
}

function divisionIdOf(row = {}) {
  return row['Division Id'] ?? row['Division ID'];
}

function isNumericKey(key) {
  return !META_FIELDS.has(key);
}

function aggregateBy(rows, idGetter, seedRow) {
  const grouped = {};
  rows.forEach((row) => {
    const id = idGetter(row);
    if (id == null || id === '') return;
    if (!grouped[id]) {
      grouped[id] = seedRow(row);
      Object.keys(row).forEach((key) => {
        if (isNumericKey(key)) grouped[id][key] = 0;
      });
    }
    Object.keys(row).forEach((key) => {
      if (!isNumericKey(key)) return;
      grouped[id][key] += Number(row[key]) || 0;
    });
  });
  return Object.values(grouped).map((item, idx) => ({ ...item, 'S No': idx + 1 }));
}

function flattenColumns(cols = []) {
  return cols.flatMap((col) => (col.children ? flattenColumns(col.children) : [col]));
}

export default function ParliamentaryIssuesReports({ notify }) {
  const [stages, setStages] = useState([]);
  const [reportTabs, setReportTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [reportView, setReportView] = useState('wing');
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
  const isSummary = currentView?.type === 'summary';

  useEffect(() => {
    if (!activeTab) return;
    setDrillDownPath([buildRootView(activeTab)]);
  }, [activeTab?.id]);

  const stageMap = useMemo(() => {
    if (!activeTab) return {};
    return buildDrilldownStageMap(stages, activeTab.issueType);
  }, [stages, activeTab]);

  const fetchReportData = useCallback(async () => {
    const fetcher =
      currentView?.type === 'summary' && activeTab
        ? summaryFetcher(activeTab, reportView)
        : currentView?.fetcher;
    if (!fetcher) return;
    setLoading(true);
    try {
      const response = await fetcher();
      const payload = response.data || {};
      if (Array.isArray(payload)) {
        setReportData(stripTimesFromReportRows(payload));
        setReportCols(
          payload[0]
            ? Object.keys(payload[0]).map((key) => ({ headerName: key, field: key }))
            : []
        );
      } else {
        setReportData(stripTimesFromReportRows(payload.rowData || []));
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
  }, [activeTab, currentView, notify, reportView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const viewData = useMemo(() => {
    if (!isSummary) return reportData;
    if (reportView === 'wing') {
      const hasDivision = reportData.some((row) => divisionIdOf(row) != null && divisionIdOf(row) !== '');
      if (!hasDivision) {
        return reportData.map((row, idx) => ({ ...row, 'S No': idx + 1 }));
      }
      return aggregateBy(reportData, wingIdOf, (row) => ({
        'Wing Id': wingIdOf(row),
        'Wing Name': row['Wing Name'] || row.Wing || '',
      }));
    }
    if (reportView === 'division') {
      return aggregateBy(reportData, divisionIdOf, (row) => ({
        'Division Id': divisionIdOf(row),
        'Division Name': row['Division Name'] || row.Division || '',
      }));
    }
    return reportData.map((row, idx) => ({ ...row, 'S No': idx + 1 }));
  }, [isSummary, reportData, reportView]);

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
          isSummary &&
          reportView === 'wing'
        ) {
          return {
            ...col,
            pinned: 'left',
            cellRenderer: (p) => {
              const wingId = wingIdOf(p.data);
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

        if (currentView?.type === 'detail') return col;

        const stageId = lookupDrilldownStageId(stageMap, field, header);
        if (stageId == null) return col;

        return {
          ...col,
          cellRenderer: (p) => {
            const countVal = Number(p.value);
            if (!Number.isFinite(countVal) || countVal <= 0) {
              return <span className="text-slate-400 dark:text-slate-500">-</span>;
            }
            const wingId = wingIdOf(p.data) ?? currentView.wingId;
            const divisionId = divisionIdOf(p.data);
            const label = field;

            return linkButton(String(countVal), () => {
              if (
                (currentView.type === 'division' ||
                  (isSummary && (reportView === 'division' || reportView === 'all'))) &&
                divisionId
              ) {
                const divName = p.data?.['Division Name'] || p.data?.Division || 'Division';
                const wingName =
                  p.data?.['Wing Name'] || p.data?.Wing || currentView.wingName;
                setDrillDownPath((prev) => [
                  ...prev,
                  {
                    type: 'detail',
                    family,
                    wingName,
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
    [currentView, stageMap, isSummary, reportView]
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
    const hideCol = (col) => {
      const field = col.field || '';
      if (!isSummary) return false;
      if (ID_FIELDS.has(field)) return true;
      if (reportView === 'wing' && DIVISION_FIELDS.has(field)) return true;
      if (reportView === 'division' && WING_FIELDS.has(field)) return true;
      return false;
    };
    const visible = flattenColumns(mapped).filter((col) => !hideCol(col));
    const serial = visible.filter(isSerial);
    const rest = visible.filter((col) => !isSerial(col)).map((col) => {
      const field = String(col.field || '');
      if (!/implementation report furnished/i.test(field)) return col;
      return {
        ...col,
        width: 160,
        minWidth: 140,
        maxWidth: 170,
        wrapHeaderText: true,
        autoHeaderHeight: true,
      };
    });
    return [...serial, ...rest];
  }, [mapColumnRenderers, reportCols, isSummary, reportView]);

  const reportTitle = isSummary
    ? form82Title(abstractLevel(reportView), currentView?.family, currentView?.issueType)
    : currentView?.title;

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
        {currentView?.divisionName && (
          <>
            <span>
              For Division:{' '}
              <strong className="text-[#4b2424] dark:text-[#eadede]">
                {currentView.divisionName}
              </strong>
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
  }, [currentView?.wingName, currentView?.divisionName]);

  const reportViewSelect = isSummary ? (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/60 dark:border-indigo-500/60 text-xs shadow-sm">
      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
        <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
          Report View:
        </span>
      </div>
      <select
        value={reportView}
        onChange={(e) => setReportView(e.target.value)}
        className="bg-transparent border-none text-xs font-extrabold text-indigo-950 dark:text-indigo-100 outline-none cursor-pointer pr-1 max-w-[200px]"
      >
        <option value="wing" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">
          Wing
        </option>
        <option value="division" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">
          Division
        </option>
        <option value="all" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">
          Wing and Division
        </option>
      </select>
    </div>
  ) : null;

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
          title={reportTitle}
          eyebrow={reportTitle}
          subtitle={reportSubtitle}
          showBackButton={drillDownPath.length > 1}
          onBack={() => setDrillDownPath((prev) => prev.slice(0, -1))}
          rawData={viewData}
          viewData={viewData}
          columns={columns}
          loading={loading}
          onRefresh={fetchReportData}
          pagination
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#f8faf6"
          themeClass="yp-pro-grid"
          toolbarExtra={reportViewSelect}
          autoHeaderHeight
        />
      </div>
    </div>
  );
}
