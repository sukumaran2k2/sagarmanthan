import * as XLSX from 'xlsx';
import { COMMON_TOASTS } from '../../../utils/notify';
import { toDdMmYyyy } from './hrDashboard';

// Chart colours, tooltips and Excel export shared by the Major Port and non-port HR dashboards.

export const GENDER_COLORS = ['#6366f1', '#ec4899', '#cbd5e1'];
export const EX_SERVICE_COLORS = ['#f97316', '#10b981', '#94a3b8'];
export const PWBD_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9'];
export const COMMUNITY_COLORS = ['#0f417a', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#9333ea', '#be123c', '#64748b'];
export const EX_SERVICE_TOOLTIP = '{category}: {value}\nMale: {male}, Female: {female}, Unknown: {unknown}';
export const PWBD_TOOLTIP = '{category}: {value}\nMale: {male}, Female: {female}, Transgender: {transgender}';

/** Downloads rows as an Excel sheet; columns: [{ label, value: (row) => cell }]. */
export function exportRows(rows, columns, sheetName, notify) {
  const data = rows.map((r, i) => Object.fromEntries([['S.No', i + 1], ...columns.map((c) => [c.label, c.value(r)])]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName.slice(0, 31));
  const fileName = `${sheetName} ${toDdMmYyyy(new Date())}.xlsx`;
  XLSX.writeFile(wb, fileName);
  notify?.(COMMON_TOASTS.excelExported(fileName));
}
