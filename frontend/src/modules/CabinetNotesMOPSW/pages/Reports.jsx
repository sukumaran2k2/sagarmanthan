import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportTable from '../../../components/ReportTable';
import { buildStageDrilldownMap, STAGE_FIELDS } from '../utils/stageHelpers';
import {
  fetchCabinetDivisionDetail,
  fetchCabinetDivisionWiseReport,
  fetchCabinetStages,
  fetchCabinetWingDetail,
  fetchCabinetWingWiseReport,
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

function formatAsOnDate(date = new Date()) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function formatReportMonth(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function CabinetNotesReports({ notify }) {
  const [stages, setStages] = useState([]);
  const [drillDownPath, setDrillDownPath] = useState([
    {
      type: 'wing',
      title: 'Form No.:1.1 - Abstract Wing Wise - Cabinet Notes MoPSW',
      fetcher: fetchCabinetWingWiseReport,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  useEffect(() => {
    fetchCabinetStages()
      .then((res) => setStages(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error(err);
        notify?.('Failed to load cabinet stages.', 'error');
      });
  }, [notify]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const stageMap = useMemo(() => buildStageDrilldownMap(stages), [stages]);

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

        if ((field === 'Wing Name' || field === 'Wing') && currentView?.type === 'wing') {
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
                    wingId,
                    wingName,
                    title: 'Form No.:1.1 - Abstract Division Wise - Cabinet Notes MoPSW',
                    fetcher: () => fetchCabinetDivisionWiseReport(wingId),
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
                    wingName: currentView.wingName,
                    divisionName: divName,
                    stageLabel: label,
                    title: 'Form No.:1.1 - Detailed Division Wise - Cabinet Notes MoPSW',
                    fetcher: () => fetchCabinetDivisionDetail(divisionId, stageId),
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
                  wingName,
                  stageLabel: label,
                  title: 'Form No.:1.1 - Detailed Wing Wise - Cabinet Notes MoPSW',
                  fetcher: () => fetchCabinetWingDetail(wingId, stageId),
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
              <strong className="text-[#4b2424] dark:text-[#eadede]">
                {currentView.wingName}
              </strong>
            </span>
            <span className="text-[#eadede] dark:text-slate-600">•</span>
          </>
        )}
        {currentView?.stageLabel && (
          <>
            <span>
              Stage:{' '}
              <strong className="text-[#4b2424] dark:text-[#eadede]">
                {currentView.stageLabel}
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
  }, [currentView?.wingName, currentView?.stageLabel]);

  return (
    <div className="space-y-4 animate-fade-in">
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
      <p className="text-[10px] text-slate-400 px-1">
        Stages tracked: {STAGE_FIELDS.map((s) => s.label).join(' · ')}
      </p>
    </div>
  );
}
