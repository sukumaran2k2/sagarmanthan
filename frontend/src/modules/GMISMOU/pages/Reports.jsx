import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,   
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
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
  Copy,
  Download,
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


/* =========================================================
   BRAND CONFIG
========================================================= */

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';


/* =========================================================
   REPORT TABS
========================================================= */

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
    label: 'REPORT 1.4: MoU Category-wise',
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

/* =========================================================
   FORMATTERS
========================================================= */

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


/* =========================================================
   PERCENTAGE COLOR-CODING (mirrors the red/yellow/green
   "% of BE Achieved" badge styling from the reference UI)
========================================================= */

const percentageCellStyle = (params) => {
  if (
    params.value === null ||
    params.value === undefined ||
    params.value === ''
  ) {
    return {
      textAlign: 'center',
      fontWeight: 800,
    };
  }

  const value = Number(params.value) || 0;

  let background = '#fee2e2';
  let color = '#b91c1c';

  if (value >= 70) {
    background = '#dcfce7';
    color = '#15803d';
  } else if (value >= 40) {
    background = '#fef9c3';
    color = '#a16207';
  }

  return {
    backgroundColor: background,
    color,
    fontWeight: 800,
    textAlign: 'center',
    borderRadius: '6px',
  };
};

const centerCellStyle = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});
/* =========================================================
   COMMON STAGE COLUMNS
========================================================= */

const stageColumns = [
  {
    headerName: 'Yet To be Started',
    field: 'Yet To be Started',
    width: 150,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
    cellStyle: centerCellStyle,
  },

  {
    headerName: 'Feasibility / DPR / Planning / Study Phase',
    field: 'Feasibility / DPR / Planning / Study Phase',
    width: 230,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Approval Phase',
    field: 'Approval Phase',
    width: 140,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Tendering Stage',
    field: 'Tendering Stage',
    width: 140,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Under Implementation',
    field: 'Work Under Implementation',
    width: 190,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Completed',
    field: 'Work Completed',
    width: 150,
    cellClass:
      'text-center text-slate-700 ',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Dropped',
    field: 'Dropped',
    width: 120,
    cellClass:
      'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },
];

const groupedStageColumns = {
  headerName: 'MoU Stage-wise Distribution',
  headerClass: 'text-center font-extrabold',
  children: stageColumns,
};

export default function GMISReports({
  triggerNotification,
}) {

  const [selectedReport, setSelectedReport] =
    useState('report-1');

  const [loading, setLoading] =
    useState(false);

  const [reportData, setReportData] =
    useState([]);

  const [detailData, setDetailData] =
    useState([]);

  const [quickFilter, setQuickFilter] =
    useState('');

  const [isFilterOpen, setIsFilterOpen] =
    useState(true);

  const [isExportOpen, setIsExportOpen] =
    useState(false);

  const gridApiRef = useRef(null);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    params.api.autoSizeAllColumns();
  }, []);



  /* =======================================================
     DRILL DOWN
  ======================================================= */

  const [drillDownPath, setDrillDownPath] =
    useState([
      {
        type: 'abstract',
        title:
          'Report No.: 1.1 - GMIS MoU Event-wise Summary',
      },
    ]);

  const currentView =
    drillDownPath[drillDownPath.length - 1];


  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath((prev) =>
        prev.slice(0, -1)
      );
    }
  };


  /* =======================================================
     LOAD REPORT
  ======================================================= */

  const loadReportData = useCallback(async () => {

    setLoading(true);

    try {

      const userId =
        getCurrentUserId() || 1;

      let res;

      switch (selectedReport) {

        case 'report-1':
          res =
            await getEventWiseSummary(userId);
          break;

        case 'report-2':
          res =
            await getorgWisePerformanceRankingReport(
              userId
            );
          break;

        case 'report-3':
          res =
            await getVibascellWiseSummary(userId);
          break;

        case 'report-4':
          res =
            await getCategoryWiseSummary(userId);
          break;

        case 'report-5':
          res =
            await getPhysicalAndFinancialProgressWise(
              userId
            );
          break;

        case 'report-6':
          res =
            await getDroppedMousReport(userId);
          break;

        default:
          res = {
            data: {
              rows: [],
            },
          };
      }


      console.log(
        `${selectedReport} API Response:`,
        res
      );


      const rows =
        res?.data?.rows || [];


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

  useEffect(() => {
    if (gridApiRef.current && reportData.length) {
      setTimeout(() => {
        gridApiRef.current.autoSizeAllColumns();
      }, 0);
    }
  }, [reportData, selectedReport]);

 
  /* =======================================================
     SEARCHED DATA
  ======================================================= */

  const filteredReportData = useMemo(() => {

    if (!quickFilter.trim()) {
      return reportData;
    }

    const term =
      quickFilter
        .trim()
        .toLowerCase();

    return reportData.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term)
      )
    );

  }, [
    reportData,
    quickFilter,
  ]);
  


  /* =======================================================
     COPY / EXPORT HELPERS
  ======================================================= */

  const buildTabularExport = useCallback(() => {

    if (!filteredReportData.length) {
      return { headers: [], rows: [] };
    }

    const headers =
      Object.keys(filteredReportData[0]);

    const rows =
      filteredReportData.map((row) =>
        headers.map((h) => row[h] ?? '')
      );

    return { headers, rows };

  }, [filteredReportData]);


  const handleCopy = useCallback(async () => {

    const { headers, rows } =
      buildTabularExport();

    if (!headers.length) {
      if (triggerNotification) {
        triggerNotification(
          'No data to copy'
        );
      }
      return;
    }

    const tsv = [
      headers.join('\t'),
      ...rows.map((r) => r.join('\t')),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(tsv);

      if (triggerNotification) {
        triggerNotification(
          'Report copied to clipboard'
        );
      }
    } catch (err) {
      console.error(
        'Copy failed:',
        err
      );

      if (triggerNotification) {
        triggerNotification(
          'Failed to copy report'
        );
      }
    }

  }, [
    buildTabularExport,
    triggerNotification,
  ]);

  const handleExportCSV = useCallback(() => {

    const { headers, rows } =
      buildTabularExport();

    if (!headers.length) {
      if (triggerNotification) {
        triggerNotification(
          'No data to export'
        );
      }
      return;
    }

    const escapeCell = (value) => {
      const str = String(value ?? '');
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) =>
        r.map(escapeCell).join(',')
      ),
    ].join('\n');

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `${selectedReport}-${Date.now()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setIsExportOpen(false);

  }, [
    buildTabularExport,
    selectedReport,
    triggerNotification,
  ]);


  /* =======================================================
     REPORT 1
  ======================================================= */

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
          'p-2 border border-[#d7c4b7] font-bold text-[#4b2424] text-left',
      },

      {
        headerName: 'Total MoUs',
        field: 'Total MoUs',
        width: 130,

        cellClass:
          'p-2 border border-[#d7c4b7] text-right ',

        headerClass: 'text-center',

        valueFormatter:
          numberFormatter,
      },

      {
        headerName: 'Total Cost (₹ Cr.)',
        field: 'Total Amount',
        width: 180,

        cellClass:
          'p-2 border text-right text-slate-700',

        headerClass: 'text-right',

        valueFormatter:
          currencyFormatter,
      },

      groupedStageColumns,

    ],
    []
  );


  /* =======================================================
     REPORT 2
  ======================================================= */

  const report2Columns = useMemo(() => {

    if (
      selectedReport !== 'report-2' ||
      !reportData.length
    ) {
      return [];
    }

    const keys =
      Object.keys(reportData[0]);

    return [

      {
        headerName: 'S.No',
        field: '__sno',
        width: 90,
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

      ...keys.map((key) => {

        // Detect the organisation-name-like column so it can be
        // pinned and styled distinctly, same as the other reports.
        const isOrgColumn =
          key.toLowerCase().includes('organisation') ||
          key.toLowerCase().includes('organization');

        return {

          headerName: key,
          field: key,
          minWidth: isOrgColumn ? 220 : 150,
          flex: isOrgColumn ? 1.8 : 1,

          // Pin the organisation column to the left, right after S.No
          pinned: isOrgColumn ? 'left' : undefined,

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

          cellClass: isOrgColumn
            ? 'font-bold text-[#4b2424] dark:text-amber-200'
            : 'text-slate-700 dark:text-slate-300',

        };

      }),

    ];

  }, [
    selectedReport,
    reportData,
  ]);

  /* =======================================================
     REPORT 3
  ======================================================= */

  const report3Columns = useMemo(
    () => [

      {
        headerName: 'S.No',
        field: 'sNo',
        width: 90,
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
        headerName:
          'Vibhas/NAVIC Cell Name',

        field:
          'Navic / Vibhas Name',

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

        valueFormatter:
          numberFormatter,
      },

      {
        headerName:
          'Total Cost (₹ Cr.)',

        field:
          'Total Cost',

        width: 180,

        headerClass: 'text-right',

        cellClass:
          'text-right text-slate-700',

        valueFormatter:
          currencyFormatter,
      },

      groupedStageColumns,

      {
        headerName:
          'Implementation Progress (%)',

        field:
          'Implementation Progress Value',

        width: 210,

        headerClass:
          'text-center',

        cellStyle: percentageCellStyle,

        valueFormatter: (params) => {

          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ''
          ) {
            return '0.00%';
          }

          return `${Number(
            params.value
          ).toFixed(2)}%`;

        },
      },

      {
        headerName:'Performance Rank',
        field:'Performance Rank',
        width: 170,
        headerClass:'text-center',

        cellRenderer: (params) => {

          const value =
            params.value;

          if (
            value === null ||
            value === undefined ||
            value === ''
          ) {
            return (
              <span className="text-slate-400">
                -
              </span>
            );
          }

          let badgeClass =
            'bg-slate-50 text-slate-700';

          if (value <= 3) {

            badgeClass =
              'bg-emerald-50 text-emerald-800';

          } else if (value <= 10) {

            badgeClass =
              'bg-amber-50 text-amber-800';

          } else {

            badgeClass =
              'bg-rose-50 text-rose-800';

          }

          return (
            <span
              className={`
                px-2.5
                py-1
                rounded-full
                text-[11px]
                font-black
                ${badgeClass}
              `}
            >
              {value}
            </span>
          );

        },
      },

    ],
    []
  );


  /* =======================================================
     REPORT 4
  ======================================================= */

  const report4Columns = useMemo(
    () => [

      {
        headerName:
          'MoU Category',

        field:
          'MoU Category',

        flex: 1.8,
        minWidth: 250,
        pinned: 'left',

        cellClass:
          'font-bold text-[#4b2424] dark:text-amber-200',

        valueFormatter: (params) =>
          params.value || '-',
      },

      {
        headerName:
          'No. of MoUs',

        field:
          'Total MoUs',

        width: 140,

        headerClass:
          'text-center',

        cellClass:
          'text-right text-slate-700',

        valueFormatter:
          numberFormatter,
      },

      {
        headerName:
          'Total Amount (₹ Cr.)',

        field:
          'Total Amount',

        width: 180,

        headerClass:
          'text-right',

        cellClass:
          'text-right text-slate-700',

        valueFormatter:
          currencyFormatter,
      },

      groupedStageColumns,

    ],
    []
  );


  /* =======================================================
     REPORT 5
  ======================================================= */

  const report5Columns = useMemo(
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
        headerName:
          'Organisation',

        field:
          'Organisation',

        flex: 1.4,
        minWidth: 180,

        cellClass:
          'font-bold text-[#4b2424] dark:text-amber-200',
      },

      {
        headerName:
          'MoU / Project',

        field:
          'MoU / Project',

        flex: 2,
        minWidth: 250,

        cellClass:
          'font-semibold text-slate-800 dark:text-slate-200',
      },

      {
        headerName:
          'Current Status',

        field:
          'Current Status',

        width: 180,

        cellClass:
          'text-slate-700 dark:text-slate-300',
      },

      {
        headerName:
          'Original Amount (₹ Cr.)',

        field:
          'Original Amount (₹ Cr)',

        width: 180,

        headerClass:
          'text-right',

        cellClass:
          'text-right text-slate-700',

        valueFormatter:
          currencyFormatter,
      },

      {
        headerName:
          'Revised Amount (₹ Cr.)',

        field:
          'Revised Amount (₹ Cr)',

        width: 180,

        headerClass:
          'text-right',

        cellClass:
          'text-right text-slate-700',

        valueFormatter:
          currencyFormatter,
      },

      {
        headerName:
          'Financial Progress (%)',

        field:
          'Financial Progress (%)',

        width: 170,

        headerClass:
          'text-center',

        cellStyle: percentageCellStyle,

        valueFormatter:
          percentageFormatter,
      },

      {
        headerName:
          'Physical Progress (%)',

        field:
          'Physical Progress (%)',

        width: 170,

        headerClass:
          'text-center',

        cellStyle: percentageCellStyle,

        valueFormatter:
          percentageFormatter,
      },

    ],
    []
  );


  /* =======================================================
     REPORT 6
  ======================================================= */

  const report6Columns = useMemo(() => {

    if (
      selectedReport !== 'report-6' ||
      !reportData.length
    ) {
      return [];
    }

    const keys =
      Object.keys(reportData[0]);

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


  /* =======================================================
     COLUMN MAP
  ======================================================= */

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


  /* =======================================================
     TOTAL STATISTICS
  ======================================================= */

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
            r['Total Amount'] ??
            r['Total Cost'] ??
            0
          ),

        ui:
          acc.ui +
          Number(
            r['Work Under Implementation'] ||
            0
          ),

        completed:
          acc.completed +
          Number(
            r['Work Completed'] ||
            0
          ),

        yetToStart:
          acc.yetToStart +
          Number(
            r['Yet To be Started'] ||
            0
          ),

        dropped:
          acc.dropped +
          Number(
            r['Dropped'] ||
            0
          ),

        feasibility:
          acc.feasibility +
          Number(
            r[
              'Feasibility / DPR / Planning / Study Phase'
            ] ||
            0
          ),

        approval:
          acc.approval +
          Number(
            r['Approval Phase'] ||
            0
          ),

        tendering:
          acc.tendering +
          Number(
            r['Tendering Stage'] ||
            0
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


  /* =======================================================
     PINNED TOTAL
  ======================================================= */

  const pinnedBottomRowData =
    useMemo(() => {

      if (
        !reportData ||
        reportData.length === 0
      ) {
        return undefined;
      }


      if (
        selectedReport === 'report-1'
      ) {

        return [
          {
            sNo: '',

            'GMIS Event':
              'Total',

            'Total MoUs':
              totalStats.count,

            'Total Amount':
              Number(
                totalStats.amount.toFixed(2)
              ),

            'Yet To be Started':
              totalStats.yetToStart,

            'Feasibility / DPR / Planning / Study Phase':
              totalStats.feasibility,

            'Approval Phase':
              totalStats.approval,

            'Tendering Stage':
              totalStats.tendering,

            'Work Under Implementation':
              totalStats.ui,

            'Work Completed':
              totalStats.completed,

            Dropped:
              totalStats.dropped,
          },
        ];

      }


      if (
        selectedReport === 'report-3'
      ) {

        return [
          {
            sNo: '',

            'Navic / Vibhas Name':
              'Total',

            'Total MoUs':
              totalStats.count,

            'Total Cost':
              Number(
                totalStats.amount.toFixed(2)
              ),

            'Yet To be Started':
              totalStats.yetToStart,

            'Feasibility / DPR / Planning / Study Phase':
              totalStats.feasibility,

            'Approval Phase':
              totalStats.approval,

            'Tendering Stage':
              totalStats.tendering,

            'Work Under Implementation':
              totalStats.ui,

            'Work Completed':
              totalStats.completed,

            Dropped:
              totalStats.dropped,
          },
        ];

      }


      if (
        selectedReport === 'report-4'
      ) {

        return [
          {
            'MoU Category':
              'Total',

            'Total MoUs':
              totalStats.count,

            'Total Amount':
              Number(
                totalStats.amount.toFixed(2)
              ),

            'Yet To be Started':
              totalStats.yetToStart,

            'Feasibility / DPR / Planning / Study Phase':
              totalStats.feasibility,

            'Approval Phase':
              totalStats.approval,

            'Tendering Stage':
              totalStats.tendering,

            'Work Under Implementation':
              totalStats.ui,

            'Work Completed':
              totalStats.completed,

            Dropped:
              totalStats.dropped,
          },
        ];

      }


      return undefined;

    }, [
      reportData,
      selectedReport,
      totalStats,
    ]);


  /* =======================================================
     DEFAULT GRID
  ======================================================= */

  const defaultColDef =
    useMemo(
      () => ({
        sortable: true,
        filter: true,
        resizable: true,

        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
      []
    );


  /* =======================================================
     REPORT META
  ======================================================= */

  const selectedReportMeta =
    useMemo(
      () =>
        REPORT_TABS.find(
          (r) =>
            r.id === selectedReport
        ) || REPORT_TABS[0],
      [selectedReport]
    );


  const isStageReport =
    selectedReport === 'report-1' ||
    selectedReport === 'report-3' ||
    selectedReport === 'report-4';


  /* =======================================================
     FILTER STATE
  ======================================================= */

  const hasActiveFilters =
    Boolean(quickFilter.trim());


  const handleResetFilters = () => {
    setQuickFilter('');
  };


  /* =======================================================
     AS-ON-DATE LINE (mirrors "As on date / Report for the
     month" line from the reference UI)
  ======================================================= */

  const asOnDateLabel = useMemo(() => {

    const now = new Date();

    const asOnDate =
      now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

    const reportMonth =
      now.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });

    return { asOnDate, reportMonth };

  }, []);


  /* =======================================================
     SUBTITLE
  ======================================================= */

  const subtitle = useMemo(() => {

    return (
      <>

     
      </>
    );

  }, [
    selectedReportMeta,
    filteredReportData.length,
    isStageReport,
    totalStats,
  ]);


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div
      className="
        space-y-4
        animate-fade-in
        select-none
      "
    >

      {/* ===================================================
          REPORT TABS
          (kept as its own strip, OUTSIDE the content card,
          so switching reports doesn't disturb the card below)
      =================================================== */}

      <div
        className="
          overflow-hidden
          border-b
        "
        style={{
          borderColor: BORDER,
          background: '#ffffff',
        }}
      >

        <div
          className="
            flex
            items-center
            overflow-x-auto
            px-2
            gap-1
          "
        >

          {REPORT_TABS.map((report) => {

            const Icon =
              report.icon;

            const isActive =
              selectedReport ===
              report.id;

            return (

              <button
                key={report.id}
                type="button"
                onClick={() => {

                  setReportData([]);
                  setDetailData([]);
                  setQuickFilter('');
                  setIsExportOpen(false);

                  setSelectedReport(
                    report.id
                  );

                  setDrillDownPath([
                    {
                      type: 'abstract',
                      title:
                        `Report No.: ${report.label} - ${report.title}`,
                    },
                  ]);

                }}

                style={{
                  color: isActive
                    ? BRAND
                    : '#9AA9BF',

                  backgroundColor:
                    isActive
                      ? ACCENT
                      : 'transparent',

                  borderBottomColor:
                    isActive
                      ? BRAND
                      : 'transparent',
                }}

                className="
                  flex
                  items-center
                  gap-2
                  whitespace-nowrap
                  px-4
                  py-3
                  text-[11px]
                  font-extrabold
                  uppercase
                  tracking-wide
                  transition-all
                  duration-200
                  cursor-pointer
                  border-b-[3px]
                  border-x-0
                  border-t-0
                  rounded-t-[8px]
                  hover:bg-[#f5eeea]
                  hover:text-[#4b2424]
                "
              >

                <Icon
                  size={16}
                  strokeWidth={2.2}
                />

                <span>
                  {report.label}
                </span>

              </button>

            );

          })}

        </div>

      </div>


      {/* ===================================================
          KPI CARDS
          (kept OUTSIDE the content card, as its own row)
      =================================================== */}

      {currentView.type === 'abstract' &&
        isStageReport && (

          <div
            className="
              grid
              grid-cols-2
              sm:grid-cols-3
              lg:grid-cols-6
              gap-3
            "
          >

            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Total MoUs
              </span>

              <span
                className="
                  text-lg
                  font-black
                  mt-0.5
                  block
                "
                style={{
                  color: BRAND,
                }}
              >
                {totalStats.count.toLocaleString()}
              </span>

            </div>


            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Total Value
              </span>

              <span
                className="
                  text-lg
                  font-black
                  text-emerald-700
                  dark:text-emerald-400
                  mt-0.5
                  block
                "
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
              </span>

            </div>


            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Under Implementation
              </span>

              <span
                className="
                  text-lg
                  font-black
                  mt-0.5
                  block
                  text-[#6b3535]
                "
              >
                {totalStats.ui.toLocaleString()}
              </span>

            </div>


            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Completed
              </span>

              <span
                className="
                  text-lg
                  font-black
                  text-emerald-700
                  dark:text-emerald-400
                  mt-0.5
                  block
                "
              >
                {totalStats.completed.toLocaleString()}
              </span>

            </div>


            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Yet to Start
              </span>

              <span
                className="
                  text-lg
                  font-black
                  text-amber-700
                  dark:text-amber-400
                  mt-0.5
                  block
                "
              >
                {totalStats.yetToStart.toLocaleString()}
              </span>

            </div>


            <div
              className="
                p-3.5
                bg-white
                dark:bg-slate-900
                rounded-xl
                border
                shadow-xs
              "
              style={{
                borderColor: '#eadede',
              }}
            >

              <span
                className="
                  text-[10px]
                  text-slate-400
                  font-bold
                  uppercase
                  block
                "
              >
                Dropped
              </span>

              <span
                className="
                  text-lg
                  font-black
                  text-rose-700
                  dark:text-rose-400
                  mt-0.5
                  block
                "
              >
                {totalStats.dropped.toLocaleString()}
              </span>

            </div>

          </div>

        )}


      {/* ===================================================
          REPORT CONTENT WRAPPER
          Everything below (header strip, filter panel, note,
          table) sits inside ONE bordered/rounded card, matching
          the screenshot's single-container layout.
      =================================================== */}

      <div
        className="
          rounded-2xl
          border
          shadow-sm
          overflow-hidden
          bg-white
        "
        style={{
          borderColor: BORDER,
        }}
      >

        {/* ---- Header strip ---- */}

        <div
          className="
            relative
            flex
            flex-wrap
            items-center
            justify-between
            gap-4
            px-[26px]
            py-5
          "
          style={{
            background:
              'linear-gradient(to right, #fdfcfc, #f7f3f3)',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >

          <div
            className="
              flex
              items-center
              gap-3
              flex-1
              min-w-[280px]
            "
          >

            <div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mb-1
                "
              >

                <TrendingUp
                  size={14}
                  style={{
                    color: BRAND_SOFT,
                  }}
                  strokeWidth={2.5}
                />

                <span
                  className="
                    text-[10.5px]
                    uppercase
                    tracking-[0.12em]
                    font-extrabold
                  "
                  style={{
                    color: BRAND_SOFT,
                  }}
                >
                  GMIS Reports
                </span>

              </div>


              <h3
                className="
                  m-0
                  text-xl
                  font-bold
                  tracking-wide
                "
                style={{
                  color: BRAND,
                }}
              >
                {selectedReportMeta.title}
              </h3>


              <div
                className="
                  flex
                  items-center
                  gap-2
                  mt-1.5
                  text-xs
                  font-semibold
                  flex-wrap
                "
                style={{
                  color: BRAND_SOFT,
                }}
              >

                <span>
                  As on date:
                  <strong
                    style={{
                      color: BRAND,
                      marginLeft: '4px',
                    }}
                  >
                    {asOnDateLabel.asOnDate}
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
                  Report for the month —
                  <strong
                    style={{
                      color: BRAND,
                      marginLeft: '4px',
                    }}
                  >
                    {asOnDateLabel.reportMonth}
                  </strong>
                </span>

                <span
                  style={{
                    color: '#eadede',
                  }}
                >
                  •
                </span>

              </div>

            </div>

          </div>


          {/* ACTIONS */}

          <div
            className="
              flex
              items-center
              gap-2.5
              flex-wrap
            "
          >

            {/* SEARCH */}

            <div
              className="
                relative
                w-60
              "
            >

              <Search
                size={14}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  pointer-events-none
                "
                style={{
                  color: BRAND_SOFT,
                }}
              />

              <input
                type="text"
                placeholder="Search report..."
                value={quickFilter}
                onChange={(e) =>
                  setQuickFilter(
                    e.target.value
                  )
                }
                className="
                  w-full
                  pl-9
                  pr-8
                  py-2
                  text-[13.5px]
                  font-medium
                  rounded-[9px]
                  outline-none
                  border
                  bg-white
                  transition
                  focus:ring-[3px]
                  focus:ring-[#4b2424]/10
                "
                style={{
                  color: BRAND,
                  borderColor: '#eadede',
                }}
              />

              {quickFilter && (
                <button
                  type="button"
                  onClick={() =>
                    setQuickFilter('')
                  }
                  className="
                    absolute
                    right-2
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                    hover:text-[#4b2424]
                    cursor-pointer
                    bg-transparent
                    border-0
                  "
                >
                  ×
                </button>
              )}

            </div>


            {/* COPY */}

            <button
              type="button"
              onClick={handleCopy}
              className="
                inline-flex
                items-center
                gap-1.5
                px-3.5
                py-2
                rounded-[9px]
                bg-white
                border
                text-xs
                font-bold
                text-slate-600
                hover:text-[#4b2424]
                hover:border-[#4b2424]
                transition
                cursor-pointer
              "
              style={{
                borderColor: '#eadede',
              }}
              title="Copy report data"
            >
              <Copy size={14} />
              Copy
            </button>


            {/* EXPORT */}

            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setIsExportOpen((open) => !open)
                }
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  px-3.5
                  py-2
                  rounded-[9px]
                  text-xs
                  font-bold
                  text-white
                  transition
                  cursor-pointer
                  border
                "
                style={{
                  background: BRAND,
                  borderColor: BRAND,
                }}
                title="Export report"
              >
                <Download size={14} />
                Export
                <ChevronDown size={13} />
              </button>

              {isExportOpen && (

                <div
                  className="
                    absolute
                    right-0
                    mt-1.5
                    w-40
                    bg-white
                    rounded-[10px]
                    border
                    shadow-lg
                    z-10
                    overflow-hidden
                  "
                  style={{
                    borderColor: '#eadede',
                  }}
                >

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="
                      w-full
                      text-left
                      px-3.5
                      py-2.5
                      text-xs
                      font-semibold
                      text-slate-700
                      hover:bg-[#f5eeea]
                      cursor-pointer
                      bg-transparent
                      border-0
                    "
                  >
                    Export as CSV
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="
                      w-full
                      text-left
                      px-3.5
                      py-2.5
                      text-xs
                      font-semibold
                      text-slate-700
                      hover:bg-[#f5eeea]
                      cursor-pointer
                      bg-transparent
                      border-0
                      border-t
                    "
                    style={{
                      borderColor: '#eadede',
                    }}
                  >
                    Export as Excel
                  </button>

                </div>

              )}

            </div>


            {/* REFRESH */}

            <button
              type="button"
              onClick={loadReportData}
              className="
                inline-flex
                items-center
                justify-center
                w-9
                h-9
                rounded-[9px]
                bg-white
                border
                text-slate-500
                hover:text-[#4b2424]
                hover:border-[#4b2424]
                transition
                cursor-pointer
              "
              style={{
                borderColor: '#eadede',
              }}
              title="Refresh Data"
            >

              <RefreshCw
                size={15}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />

            </button>

          </div>

        </div>


        {/* ---- Filter panel ---- */}

        <div>

          <button
            type="button"
            onClick={() =>
              setIsFilterOpen(
                (open) => !open
              )
            }
            className="
              w-full
              px-[18px]
              py-3
              flex
              items-center
              justify-between
              text-xs
              font-extrabold
              cursor-pointer
              transition
            "
            style={{
              background: ACCENT,
              color: BRAND,
              border: 'none',
              borderBottom: isFilterOpen
                ? `1px solid ${BORDER}`
                : 'none',
            }}
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <Filter
                size={15}
                color={BRAND}
              />

              <span>
                Filter Report Parameters
              </span>

              {hasActiveFilters && (
                <span
                  className="
                    px-2
                    py-0.5
                    bg-[#A6B3C7]
                    text-white
                    text-[10px]
                    rounded-full
                    font-bold
                  "
                >
                  Active
                </span>
              )}

            </div>


            {isFilterOpen ? (
              <ChevronUp
                size={16}
                color={BRAND}
              />
            ) : (
              <ChevronDown
                size={16}
                color={BRAND}
              />
            )}

          </button>


          {isFilterOpen && (

            <div
              className="
                p-4
                space-y-3
                animate-fade-in
                bg-white
              "
              style={{
                borderBottom: `1px solid ${BORDER}`,
              }}
            >

              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-4
                "
              >

                <div>

                  <label
                    className="
                      block
                      text-[11.5px]
                      font-extrabold
                      mb-1.5
                    "
                    style={{
                      color: BRAND,
                    }}
                  >
                    Selected Report
                  </label>

                  <div
                    className="
                      w-full
                      text-xs
                      px-3
                      py-2
                      rounded-[10px]
                      font-bold
                    "
                    style={{
                      background:
                        '#fcf9f7',
                      border:
                        '1px solid #d7c4b7',
                      color: BRAND,
                    }}
                  >
                    {selectedReportMeta.title}
                  </div>

                </div>


                <div>

                  <label
                    className="
                      block
                      text-[11.5px]
                      font-extrabold
                      mb-1.5
                    "
                    style={{
                      color: BRAND,
                    }}
                  >
                    Quick Search
                  </label>

                  <div
                    className="
                      relative
                    "
                  >

                    <Search
                      size={13}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                      "
                      style={{
                        color: BRAND_SOFT,
                      }}
                    />

                    <input
                      type="text"
                      value={quickFilter}
                      onChange={(e) =>
                        setQuickFilter(
                          e.target.value
                        )
                      }
                      placeholder="Search report data..."
                      className="
                        w-full
                        pl-9
                        pr-3
                        py-2
                        text-xs
                        rounded-[10px]
                        font-semibold
                        outline-none
                      "
                      style={{
                        background:
                          '#fcf9f7',
                        border:
                          '1px solid #d7c4b7',
                        color: BRAND,
                      }}
                    />

                  </div>

                </div>

              </div>


              {hasActiveFilters && (

                <div
                  className="
                    flex
                    justify-end
                    pt-2
                    border-t
                    border-[#eadede]
                  "
                >

                  <button
                    type="button"
                    onClick={
                      handleResetFilters
                    }
                    className="
                      px-3
                      py-1.5
                      rounded-lg
                      text-xs
                      font-extrabold
                      transition
                      cursor-pointer
                      inline-flex
                      items-center
                      gap-1.5
                    "
                    style={{
                      background:
                        ACCENT,
                      color: BRAND,
                    }}
                  >

                    <RotateCcw
                      size={12}
                    />

                    Reset Filters

                  </button>

                </div>

              )}

            </div>

          )}

        </div>


        {/* ---- Note ---- */}

        {isStageReport && (

          <div
            className="
              p-3.5
              text-xs
              font-bold
              text-left
            "
            style={{
              background: '#fcf9f7',
              borderBottom: `1px solid ${BORDER}`,
              color: BRAND,
            }}
          >

            Note : The summary values shown above
            are calculated from the currently loaded
            GMIS MoU report data.

          </div>

        )}


        {/* ---- Table ---- */}

        <div>

          <ReportTable
            title={
              currentView.title
            }

            subtitle={
              subtitle
            }

            onBack={
              handleBack
            }

            showBackButton={
              drillDownPath.length > 1
            }

            rawData={
              currentView.type ===
              'abstract'
                ? filteredReportData
                : detailData
            }

            viewData={
              currentView.type ===
              'abstract'
                ? filteredReportData
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

            loading={
              loading
            }

            onRefresh={
              loadReportData
            }

            triggerNotification={
              triggerNotification
            }

            pagination={
              true
            }

            themeClass={
              'yp-pro-grid'
            }

            brandColor={
              BRAND
            }

            brandColorHover={
              BRAND_HOVER
            }

            accentColor={
              '#f7f3f3'
            }

            oddRowColor={
              '#f8faf6'
            }

            totalLabel={
              'Total Rows'
            }
            onGridReady={onGridReady} 
          />

        </div>

      </div>


      {/* ===================================================
          FOOTER STATUS
      =================================================== */}

      <div
        className="
          flex
          flex-wrap
          gap-3
          text-[11px]
          text-slate-600
        "
      >

        <span
          className="
            inline-flex
            items-center
            gap-1.5
          "
        >

          <span
            className="
              h-2.5
              w-2.5
              rounded-full
              bg-emerald-500
            "
          />

          Completed / Good

        </span>


        <span
          className="
            inline-flex
            items-center
            gap-1.5
          "
        >

          <span
            className="
              h-2.5
              w-2.5
              rounded-full
              bg-amber-500
            "
          />

          In Progress

        </span>


        <span
          className="
            inline-flex
            items-center
            gap-1.5
          "
        >

          <span
            className="
              h-2.5
              w-2.5
              rounded-full
              bg-rose-500
            "
          />

          Dropped

        </span>

      </div>

    </div>
  );
}
