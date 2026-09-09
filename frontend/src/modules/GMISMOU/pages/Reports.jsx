import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import {
  FileText,
  Building2,
  FolderTree,
  BarChart3,
  Layers,
  Archive,
  RefreshCw,
  Search,
  Download,
  ChevronDown,
} from 'lucide-react';

import ReportTable from '../../../components/ReportTable';

import {
  getEventWiseSummary,
  getorgWisePerformanceRankingReport,
  getVibascellWiseSummary,
  getCategoryWiseSummary,
  getPhysicalAndFinancialProgressWise,
  getDroppedMousReport,
} from '../api';

import { getCurrentUserId } from '../../../utils/authSession';

const REPORT_TABS = [
  {
    id: 'report-1',
    label: 'REPORT 1.1: Event-wise',
    title: 'GMIS MoU Event-wise Summary',
    icon: Building2,
  },
  {
    id: 'report-2',
    label: 'REPORT 1.2: Organisation-wise',
    title: 'Organisation-wise Performance Ranking Report',
    icon: FolderTree,
  },
  {
    id: 'report-3',
    label: 'REPORT 1.3: Vibhas/NAVIC Cell-wise',
    title: 'Vibhas/NAVIC Cell-wise Summary',
    icon: BarChart3,
  },
  {
    id: 'report-4',
    label: 'REPORT 1.4: MoU Category-wise ',
    title: 'MoU Category-wise Summary',
    icon: Layers,
  },
  {
    id: 'report-5',
    label: 'REPORT 1.5: Physical & Financial Progress',
    title: 'Physical and Financial Progress Report',
    icon: FileText,
  },
  {
    id: 'report-6',
    label: 'REPORT 1.6: Dropped',
    title: 'Dropped MoUs Report',
    icon: Archive,
  },
];
const numberFormatter = (params) => {
  if (
    params.value === null ||
    params.value === undefined ||
    params.value === ''
  ) {
    return '0';
  }

  return Number(params.value).toLocaleString();
};

const currencyFormatter = (params) => {
  if (
    params.value === null ||
    params.value === undefined ||
    params.value === ''
  ) {
    return '₹ 0.00';
  }

  return `₹ ${Number(params.value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const percentageFormatter = (params) => {
  if (
    params.value === null ||
    params.value === undefined ||
    params.value === ''
  ) {
    return '0%';
  }

  return `${Number(params.value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const stageColumns = [
  {
    headerName: 'Yet To be Started',
    field: 'Yet To be Started',
    width: 150,
    cellClass:
      'font-bold text-center text-amber-700 dark:text-amber-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Feasibility / DPR / Planning / Study Phase',
    field: 'Feasibility / DPR / Planning / Study Phase',
    width: 230,
    cellClass:
      'font-bold text-center text-purple-700 dark:text-purple-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Approval Phase',
    field: 'Approval Phase',
    width: 140,
    cellClass:
      'font-bold text-center text-blue-700 dark:text-blue-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Tendering Stage',
    field: 'Tendering Stage',
    width: 140,
    cellClass:
      'font-bold text-center text-orange-700 dark:text-orange-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Under Implementation',
    field: 'Work Under Implementation',
    width: 190,
    cellClass:
      'font-bold text-center text-[#4b2424] dark:text-amber-300',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Completed',
    field: 'Work Completed',
    width: 150,
    cellClass:
      'font-bold text-center text-emerald-700 dark:text-emerald-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Dropped',
    field: 'Dropped',
    width: 120,
    cellClass:
      'font-bold text-center text-rose-700 dark:text-rose-400',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },
];

export default function GMISReports({
  triggerNotification,
}) {
  const [selectedReport, setSelectedReport] =
    useState('report-1');

  const [loading, setLoading] = useState(false);

  const [reportData, setReportData] = useState([]);

  const [drillDownPath, setDrillDownPath] =
    useState([
      {
        type: 'abstract',
        title:
          'Report No.: 1.1 - GMIS MoU Event-wise Summary',
      },
    ]);

  const [detailData, setDetailData] = useState([]);
  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath((prev) =>
        prev.slice(0, -1)
      );
    }
  };

  const loadReportData = useCallback(async () => {
    setLoading(true);

    try {
      const userId = getCurrentUserId() || 1;
      let res;

      switch (selectedReport) {
        case 'report-1':
          res = await getEventWiseSummary(userId);
          break;

        case 'report-2':
          res = await getorgWisePerformanceRankingReport( userId);
          break;

        case 'report-3':
          res = await getVibascellWiseSummary(userId);
          break;

        case 'report-4':
          res = await getCategoryWiseSummary(userId);
          break;

        case 'report-5':
          res = await getPhysicalAndFinancialProgressWise(userId );
          break;

        case 'report-6':
          res = await getDroppedMousReport(userId);
          break;

        default:
          res = {
            data: { rows: [], }, 
          };
      }

      console.log(
        `${selectedReport} API Response:`,
        res
      );

      const rows = res?.data?.rows || [];

      console.log(
        `${selectedReport} Rows:`,
        rows
      );

      setReportData(rows);
    } catch (err) {
      console.error(
        `Failed to load ${selectedReport}:`,
        err
      );

      setReportData([]);

      if (triggerNotification) {
        triggerNotification(
          'Failed to generate report'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedReport,
    triggerNotification,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const report1Columns = useMemo(
    () => [
      {
        headerName: 'S.No',
        field: 'sNo',
        width: 75,
        pinned: 'left',
        cellClass:
          'font-mono text-center font-bold text-slate-600 dark:text-slate-400',
        headerClass: 'text-center',

        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      {
        headerName: 'GMIS Event',
        field: 'GMIS Event',
        flex: 1.5,
        minWidth: 180,
        pinned: 'left',
        cellClass:
          'font-bold text-[#4b2424] dark:text-amber-200',
      },

      {
        headerName: 'Total MoUs',
        field: 'Total MoUs',
        width: 130,
        cellClass:
          'font-black text-center text-[#4b2424] dark:text-amber-200',
        headerClass: 'text-center',
        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Cost (₹ Cr.)',
        field: 'Total Cost (₹ Cr.)',
        width: 180,
        cellClass:
          'font-black text-right text-emerald-700 dark:text-emerald-400',
        headerClass: 'text-right',
        valueFormatter: currencyFormatter,
      },

      ...stageColumns,
    ],
    []
  );

  const report2Columns = useMemo(() => {
    if (
      selectedReport !== 'report-2' ||
      !reportData.length
    ) {
      return [];
    }

    const keys = Object.keys(reportData[0]);

    return [
      {
        headerName: 'S.No',
        field: '__sno',
        width: 75,
        pinned: 'left',
        headerClass: 'text-center',
        cellClass:
          'font-mono text-center font-bold text-slate-600',
        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      ...keys.map((key) => ({
        headerName: key,
        field: key,
        minWidth: 150,
        flex: 1,

        valueFormatter: (params) => {
          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ''
          ) {
            return '-';
          }

          if (
            typeof params.value === 'number'
          ) {
            return params.value.toLocaleString();
          }

          return String(params.value);
        },

        cellClass:
          'text-slate-700 dark:text-slate-300',
      })),
    ];
  }, [
    selectedReport,
    reportData,
  ]);

  const report3Columns = useMemo(
    () => [
      {
        headerName: 'S.No',
        field: 'sNo',
        width: 75,
        pinned: 'left',
        headerClass: 'text-center',
        cellClass:
          'font-mono text-center font-bold text-slate-600 dark:text-slate-400',

        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      {
        headerName: 'Vibhas/NAVIC Cell Name',
        field: 'Navic / Vibhas Name',
        flex: 1.8,
        minWidth: 250,
        pinned: 'left',

        cellClass:
          'font-bold text-[#4b2424] dark:text-amber-200',

        valueFormatter: (params) =>
          params.value || '-',
      },

      {
        headerName: 'Total MoUs',
        field: 'Total MoUs',
        width: 130,
        headerClass: 'text-center',

        cellClass:
          'font-black text-center text-[#4b2424] dark:text-amber-200',

        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Cost (₹ Cr.)',
        field: 'Total Cost',
        width: 180,
        headerClass: 'text-right',

        cellClass:
          'font-black text-right text-emerald-700 dark:text-emerald-400',

        valueFormatter: currencyFormatter,
      },

      ...stageColumns,

      {
        headerName: 'Implementation Progress (%)',
        field: 'Implementation Progress (%)',
        width: 210,
        headerClass: 'text-center',

        cellClass:
          'font-black text-center text-blue-700 dark:text-blue-400',

        valueFormatter: (params) => {
          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ''
          ) {
            return '0.00%';
          }

          return params.value;
        },
      },

      {
        headerName: 'Performance Rank',
        field: 'Performance Rank',
        width: 170,
        headerClass: 'text-center',

        cellClass:
          'font-black text-center text-purple-700 dark:text-purple-400',

        valueFormatter: (params) => {
          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ''
          ) {
            return '-';
          }

          return ` ${params.value}`;
        },
      },
    ],
    [stageColumns]
  );
  const report4Columns = useMemo(
    () => [
      {
        headerName: 'MoU Category',
        field: 'MoU Category',
        flex: 1.8,
        minWidth: 250,
        pinned: 'left',
        cellClass:'font-bold text-[#4b2424] dark:text-amber-200',
        valueFormatter: (params) =>
          params.value || '-',
      },

      {
        headerName: 'No. of MoUs',
        field: 'No. of MoUs',
        width: 140,
        headerClass: 'text-center',
        cellClass:'font-black text-center text-[#4b2424] dark:text-amber-200',
        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Amount (₹ Cr.)',
        field: 'Total Amount',
        width: 180,
        headerClass: 'text-right',
        cellClass: 'font-black text-right text-emerald-700 dark:text-emerald-400',
        valueFormatter: currencyFormatter,
      },

      ...stageColumns,
    ],
    []
  );

  const report5Columns = useMemo(
    () => [
      {
        headerName: 'S.No',
        field: 'sNo',
        width: 75,
        pinned: 'left',
        headerClass: 'text-center',
        cellClass: 'font-mono text-center font-bold text-slate-600 dark:text-slate-400',
        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      {
        headerName: 'Organisation',
        field: 'Organisation',
        flex: 1.4,
        minWidth: 180,
        cellClass: 'font-bold text-[#4b2424] dark:text-amber-200',
      },

      {
        headerName: 'MoU / Project',
        field: 'MoU / Project',
        flex: 2,
        minWidth: 250,
        cellClass:'font-semibold text-slate-800 dark:text-slate-200',
      },

      {
        headerName: 'Current Status',
        field: 'Current Status',
        width: 180,
        cellClass:'text-slate-700 dark:text-slate-300',
      },

      {
        headerName: 'Original Amount (₹ Cr.)',
        field: 'Original Amount (₹ Cr)',
        width: 180,
        headerClass: 'text-right',
        cellClass: 'font-bold text-right text-emerald-700 dark:text-emerald-400',
        valueFormatter: currencyFormatter,
      },

      {
        headerName: 'Revised Amount (₹ Cr.)',
        field: 'Revised Amount (₹ Cr)',
        width: 180,
        headerClass: 'text-right',
        cellClass:'font-bold text-right text-emerald-700 dark:text-emerald-400',
        valueFormatter: currencyFormatter,
      },

      {
        headerName: 'Financial Progress (%)',
        field: 'Financial Progress (%)',
        width: 170,
        headerClass: 'text-center',
        cellClass:'font-bold text-center text-blue-700 dark:text-blue-400',
        valueFormatter: percentageFormatter,
      },

      {
        headerName: 'Physical Progress (%)',
        field: 'Physical Progress (%)',
        width: 170,
        headerClass: 'text-center',
        cellClass:'font-bold text-center text-purple-700 dark:text-purple-400',
        valueFormatter: percentageFormatter,
      },

      // {
      //   headerName: 'Timeline Status',
      //   field: 'Timeline Status',
      //   width: 180,
      //   cellClass:
      //     'font-bold text-center',

      //   cellRenderer: (params) => {
      //     const value = String(
      //       params.value || ''
      //     );

      //     const lower = value.toLowerCase();

      //     let badgeClass =
      //       'bg-slate-50 text-slate-700 border-slate-300';

      //     if (lower.includes('on time')) {
      //       badgeClass =
      //         'bg-emerald-50 text-emerald-800 border-emerald-300';
      //     } else if (
      //       lower.includes('delay')
      //     ) {
      //       badgeClass =
      //         'bg-rose-50 text-rose-800 border-rose-300';
      //     }

      //     return (
      //       <span
      //         className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${badgeClass}`}
      //       >
      //         {value || '-'}
      //       </span>
      //     );
      //   },
      // },
    ],
    []
  );

  const report6Columns = useMemo(() => {
    if (
      selectedReport !== 'report-6' ||
      !reportData.length
    ) {
      return [];
    }

    const keys = Object.keys(reportData[0]);

    return [
      {
        headerName: 'S.No',
        field: '__sno',
        width: 75,
        pinned: 'left',
        headerClass: 'text-center',
        cellClass:
          'font-mono text-center font-bold text-slate-600',

        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      ...keys.map((key) => ({
        headerName: key,
        field: key,
        minWidth: 150,
        flex: 1,

        valueFormatter: (params) => {
          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ''
          ) {
            return '-';
          }

          if (
            typeof params.value === 'number'
          ) {
            return params.value.toLocaleString();
          }

          return String(params.value);
        },

        cellClass:
          'text-slate-700 dark:text-slate-300',
      })),
    ];
  }, [
    selectedReport,
    reportData,
  ]);

  const columnsByReport = useMemo(
    () => ({
      'report-1': report1Columns,
      'report-2': report2Columns,
      'report-3': report3Columns,
      'report-4': report4Columns,
      'report-5': report5Columns,
      'report-6': report6Columns,
    }),
    [
      report1Columns,
      report2Columns,
      report3Columns,
      report4Columns,
      report5Columns,
      report6Columns,
    ]
  );

  const totalStats = useMemo(() => {
    return reportData.reduce(
      (acc, r) => ({
        count:
          acc.count +
          Number(
            r['Total MoUs'] ??
              r['No. of MoUs'] ??
              0
          ),

        amount:
          acc.amount +
          Number(
            r['Total Cost (₹ Cr.)'] ??
              r['Total Amount (₹ Cr.)'] ??
              r['Total Cost'] ??
              0
          ),

        ui:
          acc.ui +
          Number(
            r['Work Under Implementation'] || 0
          ),

        completed:
          acc.completed +
          Number(
            r['Work Completed'] || 0
          ),

        yetToStart:
          acc.yetToStart +
          Number(
            r['Yet To be Started'] || 0
          ),

        dropped:
          acc.dropped +
          Number(
            r['Dropped'] || 0
          ),

        feasibility:
          acc.feasibility +
          Number(
            r[
              'Feasibility / DPR / Planning / Study Phase'
            ] || 0
          ),

        approval:
          acc.approval +
          Number(
            r['Approval Phase'] || 0
          ),

        tendering:
          acc.tendering +
          Number(
            r['Tendering Stage'] || 0
          ),
      }),
      {
        count: 0,
        amount: 0,
        ui: 0,
        completed: 0,
        yetToStart: 0,
        dropped: 0,
        feasibility: 0,
        approval: 0,
        tendering: 0,
      }
    );
  }, [reportData]);

  const pinnedBottomRowData = useMemo(() => {
    if (
      !reportData ||
      reportData.length === 0
    ) {
      return undefined;
    }

    if (selectedReport === 'report-1') {
      return [
        {
          sNo: '',

          'GMIS Event': 'Total',
          'Total MoUs': totalStats.count,

          'Total Cost (₹ Cr.)':
            Math.round(
              totalStats.amount * 100
            ) / 100,

          'Yet To be Started': totalStats.yetToStart,
          'Feasibility / DPR / Planning / Study Phase': totalStats.feasibility,
          'Approval Phase': totalStats.approval,
          'Tendering Stage': totalStats.tendering,
          'Work Under Implementation': totalStats.ui,
          'Work Completed': totalStats.completed,
          Dropped: totalStats.dropped,
        },
      ];
    }

    if (selectedReport === 'report-3') {
      return [
        {
          sNo: '',

          'Vibhas/NAVIC Cell Name':
          'Total',
          'Total MoUs': totalStats.count,
          'Total Cost (₹ Cr.)':
            Math.round(
              totalStats.amount * 100
            ) / 100,

          'Yet To be Started': totalStats.yetToStart,
          'Feasibility / DPR / Planning / Study Phase': totalStats.feasibility,
          'Approval Phase': totalStats.approval,
          'Tendering Stage': totalStats.tendering,
          'Work Under Implementation': totalStats.ui,
          'Work Completed': totalStats.completed,
          Dropped: totalStats.dropped,
        },
      ];
    }

    if (selectedReport === 'report-4') {
      return [
        {
          'MoU Category': 'Total',
          'No. of MoUs': totalStats.count,
          'Total Amount (₹ Cr.)':
            Math.round(
              totalStats.amount * 100
            ) / 100,

          'Yet To be Started': totalStats.yetToStart,
          'Feasibility / DPR / Planning / Study Phase': totalStats.feasibility,
          'Approval Phase': totalStats.approval,
          'Tendering Stage':  totalStats.tendering,
          'Work Under Implementation': totalStats.ui,
          'Work Completed': totalStats.completed,
          Dropped: totalStats.dropped,
        },
      ];
    }

    return undefined;
  }, [
    reportData,
    selectedReport,
    totalStats,
  ]);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,

      cellStyle: {
        display: 'flex',
        alignItems: 'center',
      },
    }),
    []
  );

  const subtitle = useMemo(() => {
    const isStageReport =
      selectedReport === 'report-1' ||
      selectedReport === 'report-3' ||
      selectedReport === 'report-4';

    return (
      <>
        <span>
          Report:
          <strong
            style={{
              color: '#4b2424',
              marginLeft: '4px',
            }}
          >
            {
              REPORT_TABS.find(
                (r) =>
                  r.id === selectedReport
              )?.label
            }
          </strong>
        </span>

        <span
          style={{
            color: '#eadede',
          }}
        >
          •
        </span>

        <span>
          Total Rows:
          <strong
            style={{
              color: '#4b2424',
              marginLeft: '4px',
            }}
          >
            {reportData.length}
          </strong>
        </span>

        {isStageReport && (
          <>
            <span
              style={{
                color: '#eadede',
              }}
            >
              •
            </span>

            <span>
              Total MoUs:
              <strong
                style={{
                  color: '#4b2424',
                  marginLeft: '4px',
                }}
              >
                {totalStats.count.toLocaleString()}
              </strong>
            </span>

            <span
              style={{
                color: '#eadede',
              }}
            >
              •
            </span>

            <span>
              Total Value:
              <strong
                style={{
                  color: '#4b2424',
                  marginLeft: '4px',
                }}
              >
                ₹{' '}
                {totalStats.amount.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}{' '}
                Cr
              </strong>
            </span>
          </>
        )}
      </>
    );
  }, [
    selectedReport,
    reportData.length,
    totalStats,
  ]);

  return (
    <div className="space-y-6 animate-fade-in">

    {currentView.type === 'abstract' && (
  <div className="w-full border-b border-[#dfe5ec] dark:border-slate-800 select-none">
    <div className="flex items-center gap-1 overflow-x-auto">

      {REPORT_TABS.map((report) => {
        const Icon = report.icon;
        const isActive = selectedReport === report.id;

        return (
          <button
            key={report.id}
            type="button"
            onClick={() => {
              setReportData([]);
              setDetailData([]);
              setSelectedReport(report.id);

              setDrillDownPath([
                {
                  type: 'abstract',
                  title: `Report No.: ${report.label} - ${report.title}`,
                },
              ]);
            }}
            style={{
              borderBottom: isActive
                ? '3px solid #4b2424'
                : '3px solid transparent',

              color: isActive
                ? '#4b2424'
                : '#8da0b8',

              backgroundColor: isActive
                ? '#f7f3f3'
                : 'transparent',

              marginBottom: '-1px',
            }}
            className="
              flex
              items-center
              gap-2
              whitespace-nowrap
              px-4
              py-3
              text-[12px]
              font-extrabold
              uppercase
              tracking-wide
              transition-all
              duration-200
              cursor-pointer
              rounded-t-lg
              hover:text-[#4b2424]
              hover:bg-[#faf7f7]
            "
          >
            <Icon
              size={17}
              strokeWidth={2}
              style={{
                color: isActive
                  ? '#4b2424'
                  : '#91a5be',
              }}
            />

            <span>{report.label}</span>
          </button>
        );
      })}

    </div>
  </div>
)}

      {currentView.type === 'abstract' &&
        (
          selectedReport === 'report-1' ||
          selectedReport === 'report-3' ||
          selectedReport === 'report-4'
        ) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Total MoUs
              </span>

              <span className="text-lg font-black text-[#4b2424] dark:text-amber-200 mt-0.5 block">
                {totalStats.count.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Total Value
              </span>

              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                ₹{' '}
                {totalStats.amount.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}{' '}
                Cr
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Under Implementation
              </span>

              <span className="text-lg font-black text-[#6b3535] dark:text-amber-300 mt-0.5 block">
                {totalStats.ui.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Completed
              </span>

              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {totalStats.completed.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Yet to Start
              </span>

              <span className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5 block">
                {totalStats.yetToStart.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Dropped
              </span>

              <span className="text-lg font-black text-rose-700 dark:text-rose-400 mt-0.5 block">
                {totalStats.dropped.toLocaleString()}
              </span>
            </div>

          </div>
        )}

      <ReportTable
        title={currentView.title}
        subtitle={subtitle}
        onBack={handleBack}
        showBackButton={
          drillDownPath.length > 1
        }

        rawData={
          currentView.type ===
          'abstract'
            ? reportData
            : detailData
        }

        viewData={
          currentView.type ===
          'abstract'
            ? reportData
            : detailData
        }

        columns={
          currentView.type ===
          'abstract'
            ? columnsByReport[
                selectedReport
              ] || []
            : []
        }

        defaultColDef={
          defaultColDef
        }

        pinnedBottomRowData={
          pinnedBottomRowData
        }

        loading={loading}

        onRefresh={
          loadReportData
        }

        triggerNotification={
          triggerNotification
        }

        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f7f3f3"
        oddRowColor="#f8faf6"
        totalLabel="Total Rows"
      />

    </div>
  );
}