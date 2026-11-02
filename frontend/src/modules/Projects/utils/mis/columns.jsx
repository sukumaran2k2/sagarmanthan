import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../../../utils/tableCellWrap';
import {
  formatCrore,
  formatDays,
  formatNumber,
  formatPercent,
  formatTableDate,
  num,
  parseDate,
} from './format';

function dateComparator(left, right) {
  return (parseDate(left)?.getTime() ?? 0) - (parseDate(right)?.getTime() ?? 0);
}

function numberComparator(left, right) {
  return (num(left) ?? Number.NEGATIVE_INFINITY) - (num(right) ?? Number.NEGATIVE_INFINITY);
}

function formatByType(type, value) {
  if (type === 'money') return formatCrore(value);
  if (type === 'percent') return formatPercent(value);
  if (type === 'days') return formatDays(value);
  if (type === 'number') return formatNumber(value);
  if (type === 'date') return formatTableDate(value);
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

function slNoCol(page, pageSize) {
  return {
    headerName: 'Sl. No.',
    headerTooltip: 'Sl. No.',
    valueGetter: (params) => (params.node ? (page - 1) * pageSize + params.node.rowIndex + 1 : ''),
    flex: 0.45,
    minWidth: 72,
    maxWidth: 88,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
  };
}

export function buildMisColumnDefs(report, page = 1, pageSize = 10) {
  const sortField = report.defaultSortField;
  const sortDir = report.defaultSortDir || 'desc';
  const dataCols = report.columns.map((column) => {
    const alignClass = column.align === 'right'
      ? 'text-right'
      : column.align === 'center'
        ? 'text-center'
        : 'text-left';
    const weightClass = column.bold ? 'font-bold text-slate-800' : 'font-semibold text-slate-700';
    const numeric = ['money', 'percent', 'days', 'number', 'date'].includes(column.type);
    return {
      field: column.field,
      headerName: column.headerName,
      headerTooltip: column.headerTooltip || column.headerName,
      flex: column.flex || 1,
      minWidth: column.minWidth || 120,
      ...(column.maxWidth ? { maxWidth: column.maxWidth } : {}),
      ...(numeric ? { comparator: column.type === 'date' ? dateComparator : numberComparator } : {}),
      ...(column.field === sortField ? { sort: sortDir } : {}),
      ...getWrapColumnProps(`${weightClass} ${alignClass}`),
      cellRenderer: (params) => renderWrappedText(
        formatByType(column.type, params.value),
        `${weightClass} ${alignClass}`,
        '—'
      ),
    };
  });

  return [slNoCol(page, pageSize), ...dataCols];
}
