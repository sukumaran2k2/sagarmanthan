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

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

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

const implementationProgressCellStyle = (params) => {
  const rawValue = params.value;

  const value = Number(
    String(rawValue ?? '')
      .replace('%', '')
      .trim()
  );

  let backgroundColor = '#fee2e2'; // < 50 = Red
  let color = '#b91c1c';

  if (Number.isFinite(value)) {
    if (value > 100) {
      backgroundColor = '#dbeafe';
      color = '#1d4ed8';
    } else if (value >= 75) {
      backgroundColor = '#dcfce7';
      color = '#15803d';
    } else if (value >= 50) {
      backgroundColor = '#ffedd5';
      color = '#c2410c';
    }
  }

  return {
    backgroundColor,
    color,
    fontWeight: 800,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
};

const centerCellStyle = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});

const stageColumns = [
  {
    headerName: 'Yet To be Started',
    field: 'Yet To be Started',
    width: 150,
    cellClass:'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
    cellStyle: centerCellStyle,
  },

  {
    headerName: 'Feasibility / DPR / Planning / Study Phase',
    field: 'Feasibility / DPR / Planning / Study Phase',
    width: 230,
    cellClass: 'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Approval Phase',
    field: 'Approval Phase',
    width: 140,
    cellClass:'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Tendering Stage',
    field: 'Tendering Stage',
    width: 140,
    cellClass:'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Under Implementation',
    field: 'Work Under Implementation',
    width: 190,
    cellClass:'text-center text-slate-700',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Work Completed',
    field: 'Work Completed',
    width: 150,
    cellClass: 'text-center text-slate-700 ',
    headerClass: 'text-center',
    valueFormatter: numberFormatter,
  },

  {
    headerName: 'Dropped',
    field: 'Dropped',
    width: 120,
    cellClass:'text-center text-slate-700',
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

  const [selectedReport, setSelectedReport] = useState('report-1');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedOrganisation, setSelectedOrganisation] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const gridApiRef = useRef(null);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    params.api.autoSizeAllColumns();
  }, []);

  const [drillDownPath, setDrillDownPath] =
    useState([
      {
        type: 'abstract',
        title:
          'Report No.: 1.1 - GMIS MoU Event-wise Summary',
      },
    ]);

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
          res = await getorgWisePerformanceRankingReport( userId );
          break;

        case 'report-3':
          res = await getVibascellWiseSummary(userId);
          break;

        case 'report-4':
          res = await getCategoryWiseSummary(userId);
          break;

        case 'report-5':
          res = await getPhysicalAndFinancialProgressWise( userId );
          break;

        case 'report-6':
          res = await getDroppedMousReport(userId);
          break;

        default:
          res = {
            data: {
              rows: [],
            },
          };
      }

      const rows = res?.data?.rows || [];
      setReportData(rows);

    } catch (err) {
      console.error( `Failed to load ${selectedReport}:`, err );
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
  if (selectedReport === 'report-5') {
    setIsFilterOpen(true);
  } else {
    setIsFilterOpen(false);
    setSelectedOrganisation('');
  }
}, [selectedReport]);

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

  const organisationOptions = useMemo(() => {

    if (selectedReport !== 'report-5') {
      return [];
    }

    const orgSet = new Set();

    reportData.forEach((row) => {
      const org = row['Organisation'];
      if (org) {
        orgSet.add(org);
      }
    });

    return Array.from(orgSet).sort((a, b) =>
      String(a).localeCompare(String(b))
    );

  }, [
    selectedReport,
    reportData,
  ]);

  const filteredReportData = useMemo(() => {

    let data = reportData;

    if (
      selectedReport === 'report-5' &&
      selectedOrganisation
    ) {
      data = data.filter(
        (row) =>
          row['Organisation'] === selectedOrganisation
      );
    }

    if (!quickFilter.trim()) {
      return data;
    }

    const term =
      quickFilter
        .trim()
        .toLowerCase();

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term)
      )
    );

  }, [
    reportData,
    quickFilter,
    selectedReport,
    selectedOrganisation,
  ]);

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

  const report1Columns = useMemo(
    () => [

      {
        headerName: 'S.No',
        field: 'sNo',
        width: 75,
        pinned: 'left',
        cellClass:'font-mono text-center font-bold text-slate-600 dark:text-slate-400',
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
        cellClass: 'p-2 border border-[#d7c4b7] font-bold text-[#4b2424] text-left',
      },

      {
        headerName: 'Total MoUs',
        field: 'Total MoUs',
        width: 130,
        cellClass: 'p-2 border border-[#d7c4b7] text-right ',
        headerClass: 'text-center',

        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Cost (₹ Cr.)',
        field: 'Total Amount',
        width: 180,
        cellClass: 'p-2 border text-right text-slate-700',
        headerClass: 'text-right',

        valueFormatter: currencyFormatter,
      },

      groupedStageColumns,

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

    const keys =
      Object.keys(reportData[0]);

    return [
      {
        headerName: 'S.No',
        field: '__sno',
        width: 90,
        minWidth: 90,
        pinned: 'left',
        headerClass: 'text-center',
        cellClass:'font-mono text-center font-bold text-slate-600',

        valueGetter: (params) => {
          if (params.node?.rowPinned) {
            return '';
          }

          return params.node.rowIndex + 1;
        },
      },

      ...keys.map((key) => {

        const isOrgColumn =
          key.toLowerCase().includes('organisation') ||
          key.toLowerCase().includes('organization');

        const isImplementationProgress =
          key.trim().toLowerCase() === 'implementation progress';

        const isPerformanceRank =
          key.trim().toLowerCase() === 'performance rank';

        if (isImplementationProgress) {

          return {
            headerName: 'Implementation Progress (%)',
            field: key,
            width: 220,
            minWidth: 220,
            headerClass: 'text-center',

            cellStyle: implementationProgressCellStyle,

            valueFormatter: (params) => {

              if (
                params.value === null ||
                params.value === undefined ||
                params.value === ''
              ) {
                return '0.00%';
              }

              const value = Number(
                String(params.value)
                  .replace('%', '')
                  .trim()
              );

              return Number.isFinite(value)
                ? `${value.toFixed(2)}%`
                : '0.00%';
            },
          };
        }

        if (isPerformanceRank) {

          return {
            headerName: 'Performance Rank',
            field: key,
            width: 170,
            minWidth: 170,
            headerClass: 'text-center',

            cellRenderer: (params) => {

              const value = params.value;

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

              let badgeClass = 'bg-slate-50 text-slate-700';

              if (value <= 3) {
                badgeClass = 'bg-emerald-50 text-emerald-800';
              } else if (value <= 10) {
                badgeClass = 'bg-amber-50 text-amber-800';
              } else {
                badgeClass = 'bg-rose-50 text-rose-800';
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
          };
        }

        return {

          headerName: key.toLowerCase() === 'total cost' ? 'Total Cost (₹ Cr.)' : key,
          field: key,
          width: isOrgColumn ? 240 : 160,
          minWidth: isOrgColumn ? 240 : 160,
          pinned: isOrgColumn ? 'left' : undefined,

          wrapText: true,
          autoHeight: true,

          valueFormatter: (params) => {

            if (
              params.value === null ||
              params.value === undefined ||
              params.value === ''
            ) {
              return '-';
            }

            if (typeof params.value === 'number') {
              if (key.toLowerCase() === 'total cost') {
                return `₹ ${params.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              }

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

  const report3Columns = useMemo(
    () => [

      {
        headerName: 'S.No',
        field: 'sNo',
        width: 90,
        minWidth: 90,
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
        headerName: 'Vibhas/NAVIC Cell Name',
        field: 'Navic / Vibhas Name',
        width: 260,
        minWidth: 260,
        pinned: 'left',
        cellClass: 'font-bold text-[#4b2424] dark:text-amber-200',

        valueFormatter: (params) => params.value || '-',
      },

      {
        headerName: 'Total MoUs',
        field: 'Total MoUs',
        width: 130,
        headerClass: 'text-center',
        cellClass:'font-black text-center text-[#4b2424] dark:text-amber-200',

        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Cost (₹ Cr.)',
        field: 'Total Cost',
        width: 180,
        headerClass: 'text-right',
        cellClass:'text-right text-slate-700',

        valueFormatter: currencyFormatter,
      },

      groupedStageColumns,

     {
      headerName: 'Implementation Progress (%)',
      field: 'Implementation Progress (%)',
      width: 210,
      headerClass: 'text-center',

      cellStyle: implementationProgressCellStyle,

      valueFormatter: (params) => {
      if (
        params.value === null ||
        params.value === undefined ||
        params.value === ''
      ) {
        return '0.00%';
      }

      const value = Number(
        String(params.value)
          .replace('%', '')
          .trim()
      );

      return Number.isFinite(value)
        ? `${value.toFixed(2)}%`
        : '0.00%';
    },
    },

      {
        headerName:'Performance Rank',
        field:'Performance Rank',
        width: 170,
        headerClass:'text-center',

        cellRenderer: (params) => {

          const value = params.value;

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

          let badgeClass = 'bg-slate-50 text-slate-700';

          if (value <= 3) {
            badgeClass = 'bg-emerald-50 text-emerald-800';

          } else if (value <= 10) {
            badgeClass = 'bg-amber-50 text-amber-800';

          } else {
            badgeClass = 'bg-rose-50 text-rose-800';

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

  const report4Columns = useMemo(
    () => [
      {
      headerName: 'S.No',
        field: 'sNo',
        width: 90,
        minWidth: 90,
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
        headerName: 'MoU Category',
        field: 'MoU Category',
        flex: 1.8,
        minWidth: 250,
        pinned: 'left',
        cellClass: 'font-bold text-[#4b2424] dark:text-amber-200',

        valueFormatter: (params) => params.value || '-',
      },

      {
        headerName: 'No. of MoUs',
        field:'Total MoUs',
        width: 140,
        headerClass: 'text-center',
        cellClass: 'text-right text-slate-700',

        valueFormatter: numberFormatter,
      },

      {
        headerName: 'Total Amount (₹ Cr.)',
        field: 'Total Amount',
        width: 180,
        headerClass: 'text-right',
        cellClass: 'text-right text-slate-700',

        valueFormatter: currencyFormatter,
      },

      groupedStageColumns,

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
        headerName:'MoU / Project',
        field: 'MoU / Project',
        flex: 2,
        minWidth: 250,
        cellClass: 'font-semibold text-slate-800 dark:text-slate-200',
      },

      {
        headerName: 'Current Status',
        field: 'Current Status',
        width: 180,
        cellClass: 'text-slate-700 dark:text-slate-300',
      },

      {
        headerName: 'Original Amount (₹ Cr.)',
        field: 'Original Amount (₹ Cr)',
        width: 180,
        headerClass:'text-right',
        cellClass:'text-right text-slate-700',

        valueFormatter: currencyFormatter,
      },

      {
        headerName: 'Revised Amount (₹ Cr.)',
        field: 'Revised Amount (₹ Cr)',
        width: 180,
        headerClass: 'text-right',
        cellClass: 'text-right text-slate-700',

        valueFormatter: currencyFormatter,
      },

      {
        headerName: 'Financial Progress (%)',
        field: 'Financial Progress (%)',
        width: 170,
        headerClass: 'text-center',

        cellStyle: percentageCellStyle,
        valueFormatter: percentageFormatter,
      },

      {
        headerName: 'Physical Progress (%)',
        field: 'Physical Progress (%)',
        width: 170,
        headerClass: 'text-center',

        cellStyle: percentageCellStyle,
        valueFormatter: percentageFormatter,
      },

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
        headerName: key.toLowerCase() === 'amount'? 'Amount (₹ Cr.)': key,
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

          if (typeof params.value === 'number') {
            if (key.toLowerCase() === 'amount') {
              return `₹ ${params.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            }

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

      if (selectedReport === 'report-2') {
        const totalRow = {
          __sno: '',
        };

        if (reportData.length > 0) {
          Object.keys(reportData[0]).forEach((key) => {
            const values = reportData.map((row) => row[key]);

            const numericValues = values
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value));

            if (numericValues.length > 0) {
              const lowerKey = key.toLowerCase();

              if (
                lowerKey.includes('percentage') ||
                lowerKey.includes('progress') ||
                lowerKey.includes('rank')
              ) {
                return;
              }

              totalRow[key] = numericValues.reduce(
                (sum, value) => sum + value,
                0
              );
            }
          });
        }

        const totalLabelKey = Object.keys(reportData[0] || {}).find(
          (key) =>
            key.toLowerCase().includes('organisation') ||
            key.toLowerCase().includes('organization')
        );

        if (totalLabelKey) {
          totalRow[totalLabelKey] = 'Total';
        }

        return [totalRow];
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

      if (selectedReport === 'report-5') {
        const totalRow = {
          sNo: '',
          Organisation: 'Total',
          'MoU / Project': '',
          'Current Status': '',
        };

        totalRow['Original Amount (₹ Cr)'] = reportData.reduce(
          (sum, row) =>
            sum + Number(row['Original Amount (₹ Cr)'] || 0),
          0
        );

        totalRow['Revised Amount (₹ Cr)'] = reportData.reduce(
          (sum, row) =>
            sum + Number(row['Revised Amount (₹ Cr)'] || 0),
          0
        );

        const financialValues = reportData
          .map((row) => Number(row['Financial Progress (%)']))
          .filter((value) => Number.isFinite(value));

        const physicalValues = reportData
          .map((row) => Number(row['Physical Progress (%)']))
          .filter((value) => Number.isFinite(value));

        totalRow['Financial Progress (%)'] =
          financialValues.length
            ? Number(
                (
                  financialValues.reduce((a, b) => a + b, 0) /
                  financialValues.length
                ).toFixed(2)
              )
            : 0;

        totalRow['Physical Progress (%)'] =
          physicalValues.length
            ? Number(
                (
                  physicalValues.reduce((a, b) => a + b, 0) /
                  physicalValues.length
                ).toFixed(2)
              )
            : 0;

        return [totalRow];
      }

    if (selectedReport === 'report-6') {
      const totalRow = {
        __sno: '',
      };

      if (reportData.length > 0) {
        const keys = Object.keys(reportData[0]);

        keys.forEach((key) => {
          const lowerKey = key.trim().toLowerCase();

          const isTextColumn =
            lowerKey.includes('first party') ||
            lowerKey.includes('second party') ||
            lowerKey.includes('organisation') ||
            lowerKey.includes('organization') ||
            lowerKey.includes('mou') ||
            lowerKey.includes('project') ||
            lowerKey.includes('status') ||
            lowerKey.includes('event') ||
            lowerKey.includes('category');

          const isNonTotalColumn =
            lowerKey.includes('percentage') ||
            lowerKey.includes('progress') ||
            lowerKey.includes('rank');

          if (isTextColumn || isNonTotalColumn) {
            totalRow[key] = '';
            return;
          }

          const numericValues = reportData
            .map((row) => Number(row[key]))
            .filter((value) => Number.isFinite(value));

          if (numericValues.length > 0) {
            totalRow[key] = numericValues.reduce(
              (sum, value) => sum + value,
              0
            );
          } else {
            totalRow[key] = '';
          }
        });

        // Show "Total" in the first suitable text column
        const textKey = keys.find((key) => {
          const lowerKey = key.trim().toLowerCase();

          return (
            lowerKey.includes('organisation') ||
            lowerKey.includes('organization') ||
            lowerKey.includes('mou') ||
            lowerKey.includes('project')
          );
        });

        if (textKey) {
          totalRow[textKey] = 'Total';
        }
      }

      return [totalRow];
    }
    return undefined;

    }, [
      reportData,
      selectedReport,
      totalStats,
    ]);

  const defaultColDef =
    useMemo(
      () => ({
        sortable: true,
        filter: true,
        resizable: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
      []
    );

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

  const hasActiveFilters =
    Boolean(quickFilter.trim()) ||
    Boolean(selectedOrganisation);


  const handleResetFilters = () => {
    setQuickFilter('');
    setSelectedOrganisation('');
  };

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
                  setSelectedOrganisation('');
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

        </div>


        {/* ---- Filter panel ---- */}
        {selectedReport === 'report-5' && (
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
                className={`
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  ${selectedReport === 'report-5' ? 'lg:grid-cols-3' : ''}
                  gap-4
                `}
              >


                {/* ---- NEW: Organisation filter (Report 1.5 only) ---- */}

                {selectedReport === 'report-5' && (

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
                      Organisation
                    </label>

                    <select
                      value={selectedOrganisation}
                      onChange={(e) =>
                        setSelectedOrganisation(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        px-3
                        py-2
                        text-xs
                        rounded-[10px]
                        font-semibold
                        outline-none
                        cursor-pointer
                      "
                      style={{
                        background:
                          '#fcf9f7',
                        border:
                          '1px solid #d7c4b7',
                        color: BRAND,
                      }}
                    >

                      <option value="">
                        All Organisations
                      </option>

                      {organisationOptions.map(
                        (org) => (
                          <option
                            key={org}
                            value={org}
                          >
                            {org}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                )}

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

        )}
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
            suppressHorizontalScroll={false}     
            alwaysShowHorizontalScroll={true}   
            domLayout="normal"     

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

    </div>
  );
}