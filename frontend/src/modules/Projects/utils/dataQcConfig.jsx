import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../../utils/tableCellWrap';

function slNoCol(page = 1, pageSize = 10) {
  return {
    headerName: 'Sl. No.',
    headerTooltip: 'Sl. No.',
    valueGetter: (params) =>
      params.node ? (page - 1) * pageSize + params.node.rowIndex + 1 : '',
    flex: 0.55,
    minWidth: 72,
    maxWidth: 90,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
  };
}

function textCol({
  field,
  headerName,
  flex = 1,
  minWidth = 120,
  maxWidth,
  align = 'left',
  bold = false,
}) {
  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : 'text-left';
  const weightClass = bold ? 'font-bold text-slate-800' : 'font-semibold text-slate-700';
  const className = `${weightClass} ${alignClass}`;

  return {
    field,
    headerName,
    headerTooltip: headerName,
    flex,
    minWidth,
    ...(maxWidth ? { maxWidth } : {}),
    ...getWrapColumnProps(className),
    cellRenderer: (params) =>
      renderWrappedText(params.value, className, '—'),
  };
}

function buildIdentityCols(page, pageSize) {
  return [
    slNoCol(page, pageSize),
    textCol({
      field: 'organisation',
      headerName: 'Port/Organisation',
      flex: 1.5,
      minWidth: 180,
      bold: true,
    }),
    textCol({
      field: 'projectCode',
      headerName: 'Project ID / Sub Project ID',
      flex: 1.1,
      minWidth: 150,
      maxWidth: 220,
      align: 'center',
      bold: true,
    }),
    textCol({
      field: 'projectName',
      headerName: 'Project Name',
      flex: 2.1,
      minWidth: 220,
    }),
    textCol({
      field: 'stage',
      headerName: 'Project Stage/Status',
      flex: 1.15,
      minWidth: 150,
      align: 'center',
    }),
    textCol({
      field: 'milestones',
      headerName: 'Relevant Stage/Milestone',
      flex: 1.7,
      minWidth: 190,
    }),
  ];
}

function issueActionCols() {
  return [
    textCol({
      field: 'issue',
      headerName: 'Current Status/Issue',
      flex: 2,
      minWidth: 230,
    }),
    textCol({
      field: 'action',
      headerName: 'Required Action/Update',
      flex: 1.7,
      minWidth: 210,
    }),
  ];
}

export function buildDataQcColumnDefs(checkId, { page = 1, pageSize = 10 } = {}) {
  const identity = buildIdentityCols(page, pageSize);

  switch (checkId) {
    case 'tendering-missing':
    case 'tendering-overdue':
      return [
        ...identity,
        textCol({
          field: 'targetDate',
          headerName: 'Existing Target Date',
          flex: 1.25,
          minWidth: 160,
          align: 'center',
        }),
        textCol({
          field: 'actualDate',
          headerName: 'Actual Date',
          flex: 0.95,
          minWidth: 120,
          maxWidth: 150,
          align: 'center',
        }),
        ...issueActionCols(),
      ];

    case 'tendering-foundation':
    case 'implementation-inauguration':
      return [
        ...identity,
        textCol({
          field: 'targetDate',
          headerName: 'Target Date',
          flex: 1,
          minWidth: 130,
          align: 'center',
        }),
        ...issueActionCols(),
      ];

    case 'implementation-missing':
      return [...identity, ...issueActionCols()];

    case 'implementation-overdue':
      return [
        ...identity,
        textCol({
          field: 'targetDate',
          headerName: 'Existing Target Date',
          flex: 1.3,
          minWidth: 170,
          align: 'center',
        }),
        ...issueActionCols(),
      ];

    case 'target-completion':
      return [
        ...identity,
        textCol({
          field: 'targetDate',
          headerName: 'Existing Target Date',
          flex: 1.15,
          minWidth: 150,
          align: 'center',
        }),
        textCol({
          field: 'revisedDate',
          headerName: 'Revised Target Date',
          flex: 1.15,
          minWidth: 150,
          align: 'center',
        }),
        ...issueActionCols(),
      ];

    case 'project-category':
      return [
        ...identity,
        textCol({
          field: 'existingCategory',
          headerName: 'Existing Category',
          flex: 1.15,
          minWidth: 140,
          align: 'center',
        }),
        textCol({
          field: 'suggestedCategory',
          headerName: 'Suggested Category',
          flex: 1.15,
          minWidth: 140,
          align: 'center',
        }),
        ...issueActionCols(),
      ];

    default:
      return [...identity, ...issueActionCols()];
  }
}

export const DATA_QC_CHECK_META = [
  {
    id: 'tendering-missing',
    group: 'Tendering',
    shortLabel: '1. Tendering-Missing Dates',
    title: '1. Projects under Tendering – Missing Stage Target Dates',
    severity: 'warning',
    description: 'Target dates not entered for one or more tendering stages.',
  },
  {
    id: 'tendering-overdue',
    group: 'Tendering',
    shortLabel: '2. Tendering-Overdue Dates',
    title: '2. Projects under Tendering – Overdue Stage Target Dates',
    severity: 'critical',
    description: 'Stage target dates have expired with no actual completion recorded.',
  },
  {
    id: 'tendering-foundation',
    group: 'Tendering',
    shortLabel: '3. Tendering-Foundation',
    title:
      '3. Projects under Tendering – Foundation Not Laid & Foundation-Laying Date Missing',
    severity: 'attention',
    description: 'Foundation not laid and/or foundation-laying date missing.',
  },
  {
    id: 'implementation-missing',
    group: 'Implementation',
    shortLabel: '4. Implementation-Missing',
    title: '4. Projects under Implementation – Missing Stage/Milestone Target Dates',
    severity: 'warning',
    description: 'Milestone target end dates not entered for projects under implementation.',
  },
  {
    id: 'implementation-overdue',
    group: 'Implementation',
    shortLabel: '5. Implementation-Overdue',
    title: '5. Projects under Implementation – Overdue Stage/Milestone Target Dates',
    severity: 'critical',
    description: 'Milestone targets expired with no actual end date recorded.',
  },
  {
    id: 'implementation-inauguration',
    group: 'Implementation',
    shortLabel: '6. Implementation-Inauguration',
    title:
      '6. Projects under Implementation – Not Yet Inaugurated & Inauguration Date Missing',
    severity: 'attention',
    description: 'Project not yet inaugurated and/or inauguration date needs confirmation.',
  },
  {
    id: 'target-completion',
    group: 'Overall Project',
    shortLabel: '7. Target Completion Date',
    title:
      '7. Projects – Missing or Expired Target Completion Date (all active, non-completed projects)',
    severity: 'critical',
    description: 'Overall target completion missing, expired, or revised date also expired.',
  },
  {
    id: 'project-category',
    group: 'Master Data',
    shortLabel: '8. Project Category',
    title: '8. Projects – Project Category Not Filled / Possibly Mismatched',
    severity: 'attention',
    description: 'Master data: category blank or possibly mismatched with project scope.',
  },
];

export const SEVERITY_META = {
  critical: {
    label: 'Critical',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-900/60',
    bar: 'bg-rose-500',
    soft: 'bg-rose-50/80 dark:bg-rose-950/20',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  warning: {
    label: 'Needs data',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-900/60',
    bar: 'bg-amber-500',
    soft: 'bg-amber-50/80 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  attention: {
    label: 'Attention',
    badge: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-900/60',
    bar: 'bg-sky-500',
    soft: 'bg-sky-50/80 dark:bg-sky-950/20',
    icon: 'text-sky-600 dark:text-sky-400',
  },
};

export function getCheckMetaById(id) {
  return DATA_QC_CHECK_META.find((c) => c.id === id) || null;
}

export function mergeSummaryWithMeta(summary) {
  const apiChecks = Array.isArray(summary?.checks) ? summary.checks : [];
  const byId = new Map(apiChecks.map((c) => [c.id, c]));

  const checks = DATA_QC_CHECK_META.map((meta) => {
    const api = byId.get(meta.id);
    return {
      ...meta,
      available: Boolean(api?.available),
      count: typeof api?.count === 'number' ? api.count : null,
    };
  });

  const bySeverity = checks.reduce(
    (acc, c) => {
      if (typeof c.count !== 'number') return acc;
      acc[c.severity] = (acc[c.severity] || 0) + c.count;
      return acc;
    },
    { critical: 0, warning: 0, attention: 0 }
  );

  const totalIssues = checks.reduce(
    (sum, c) => sum + (typeof c.count === 'number' ? c.count : 0),
    0
  );

  return {
    totalIssues: typeof summary?.totalIssues === 'number' ? summary.totalIssues : totalIssues,
    bySeverity: summary?.bySeverity || bySeverity,
    checkCount: checks.length,
    availableCheckCount: checks.filter((c) => c.available).length,
    groups: [...new Set(checks.map((c) => c.group))],
    checks,
  };
}
