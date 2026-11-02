/**
 * Helper utility functions for E-Office module
 */

export function formatTimeStr(val) {
  if (val === null || val === undefined || val === "") return "—";

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "—";
    const hours = String(val.getHours()).padStart(2, "0");
    const minutes = String(val.getMinutes()).padStart(2, "0");
    const seconds = String(val.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  if (typeof val === "number") {
    if (isNaN(val)) return "—";
    const absVal = Math.abs(val);
    if (absVal === 0) return "00:00:00";
    if (absVal > 0 && absVal < 1) {
      const totalSeconds = Math.round(absVal * 24 * 60 * 60);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    }
    if (absVal <= 24) {
      const totalSeconds = Math.round(absVal * 3600);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    }
    return String(absVal);
  }

  if (typeof val === "string") {
    let cleanVal = val.trim();
    if (!cleanVal || cleanVal === "-" || cleanVal === "—") return "—";

    if (cleanVal.startsWith("-")) {
      cleanVal = cleanVal.substring(1).trim();
    }

    const dotTimeMatch = cleanVal.match(/^(\d{1,2})[.:](\d{2})[.:](\d{2})$/);
    if (dotTimeMatch) {
      const hours = String(parseInt(dotTimeMatch[1], 10)).padStart(2, "0");
      const minutes = dotTimeMatch[2];
      const seconds = dotTimeMatch[3];
      return `${hours}:${minutes}:${seconds}`;
    }

    const ampmMatch = cleanVal.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const seconds = ampmMatch[3] || "00";
      const period = ampmMatch[4].toUpperCase();

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
    }

    const timeMatch = cleanVal.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
      const minutes = timeMatch[2];
      const seconds = timeMatch[3] || "00";
      return `${hours}:${minutes}:${seconds}`;
    }

    return cleanVal || "—";
  }

  return String(val);
}

/**
 * Validates uploaded Excel file headers against official template requirements
 * Checks for Emp ID, 0 - 3 Days, 4 - 6 Days, 7 - 15 Days, 16 - 30 Days, > 30 days, Total Pendency
 */
export function validateEOfficeHeaders(firstRow, activeKpi = "file-pendency") {
  if (!firstRow || typeof firstRow !== "object") {
    return { valid: false, missing: ["Header row not found"] };
  }

  const keys = Object.keys(firstRow).map((k) => k.trim().toLowerCase());

  const hasEmpId = keys.some(
    (k) =>
      k.includes("empid") ||
      k.includes("emp id") ||
      k.includes("emp_id") ||
      k.includes("s.no") ||
      k.includes("emp") ||
      k === "id",
  );

  const missing = [];
  if (!hasEmpId) missing.push("Emp ID");

  if (activeKpi === "file-disposal") {
    const hasDataCol = keys.some(
      (k) => k.includes("transaction") || k.includes("file") || k.includes("count") || k.includes("response"),
    );
    if (!hasDataCol) missing.push("Count of Transactions / Files");
  } else {
    const hasPendencyCol = keys.some(
      (k) => k.includes("0") || k.includes("day") || k.includes("total") || k.includes("pendency"),
    );
    if (!hasPendencyCol) missing.push("Pendency Days Columns");
  }

  return { valid: missing.length === 0, missing };
}

// Finds the actual column key in a row object that matches one of the
// canonical field names, since uploaded sheets can use varying header text.
function findKey(row, candidates) {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const match = rowKeys.find(k => k.trim() === candidate);
    if (match) return match;
  }
  const normCandidate = candidates[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normCandidate));
}

function isValidInteger(val) {
  if (val === null || val === undefined || val === '') return false;
  const n = Number(val);
  return Number.isInteger(n);
}

const summarizeRows = (rowNums, max = 8) => {
  if (rowNums.length <= max) return rowNums.join(', ');
  return `${rowNums.slice(0, max).join(', ')} and ${rowNums.length - max} more`;
};

// Row-level validation mirroring the backend's confirmed, active rules per
// KPI type (checked directly against eOfficeFilePendancy.js,
// eOfficeReceiptPendancy.js, and eOfficeFileDisposal.js):
//  - file-pendency / receipt-pendency: 6 numeric pendency-day columns must
//    all be integers; a row whose Emp Id is exactly "Total" is exempt
//    (both KPIs expect a trailing summary row).
//  - file-disposal: 2 numeric columns (Count of Transactions, Counts of
//    Files) must be integers. Confirmed the backend for this KPI has no
//    "Total" row exception at all, unlike the other two -- so none is
//    applied here either, to stay accurate to what the server will
//    actually accept.
//  - All three: duplicate Emp Ids are rejected.
// Returns every distinct failing condition found, not just the first.
export function validateEOfficeRows(rows, activeKpi = 'file-pendency') {
  const issues = [];
  if (!rows || rows.length === 0) return issues;

  const empIdKey = findKey(rows[0], ['Emp Id', 'EmpId', 'Emp_Id']);

  const seenEmpIds = new Map();
  const duplicateEmpIds = new Set();
  const invalidEmpIdRows = [];

  if (activeKpi === 'file-disposal') {
    const transKey = findKey(rows[0], ['Count of Transactions', 'CountOfTransactions']);
    const filesKey = findKey(rows[0], ['Counts of Files', 'CountsOfFiles']);
    const invalidTransRows = [];
    const invalidFilesRows = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const empIdRaw = empIdKey ? row[empIdKey] : undefined;
      const empIdStr = String(empIdRaw ?? '').trim();

      if (!empIdStr || typeof empIdRaw !== 'string') {
        invalidEmpIdRows.push(rowNum);
      } else if (seenEmpIds.has(empIdStr)) {
        duplicateEmpIds.add(empIdStr);
      } else {
        seenEmpIds.set(empIdStr, rowNum);
      }

      if (!isValidInteger(transKey ? row[transKey] : undefined)) invalidTransRows.push(rowNum);
      if (!isValidInteger(filesKey ? row[filesKey] : undefined)) invalidFilesRows.push(rowNum);
    });

    if (invalidEmpIdRows.length > 0) {
      issues.push({ field: 'Emp Id', message: `Must be text, not a number. Invalid in row(s): ${summarizeRows(invalidEmpIdRows)}.` });
    }
    if (duplicateEmpIds.size > 0) {
      issues.push({ field: 'Emp Id (duplicates)', message: `Duplicate Emp Id(s) found: ${summarizeRows([...duplicateEmpIds])}. Each Emp Id must appear only once.` });
    }
    if (invalidTransRows.length > 0) {
      issues.push({ field: 'Count of Transactions', message: `Must be a whole number. Invalid in row(s): ${summarizeRows(invalidTransRows)}.` });
    }
    if (invalidFilesRows.length > 0) {
      issues.push({ field: 'Counts of Files', message: `Must be a whole number. Invalid in row(s): ${summarizeRows(invalidFilesRows)}.` });
    }
    return issues;
  }

  // file-pendency / receipt-pendency: 6 numeric pendency-day columns
  const cols = [
    { key: findKey(rows[0], ['0 - 3 Days', '0-3 Days']), label: '0 - 3 Days' },
    { key: findKey(rows[0], ['4 - 6 Days', '4-6 Days']), label: '4 - 6 Days' },
    { key: findKey(rows[0], ['7 - 15 Days', '7-15 Days']), label: '7 - 15 Days' },
    { key: findKey(rows[0], ['16 - 30 Days', '16-30 Days']), label: '16 - 30 Days' },
    { key: findKey(rows[0], ['> 30 days', '>30 days']), label: '> 30 days' },
    { key: findKey(rows[0], ['Total Pendency']), label: 'Total Pendency' },
  ];
  const invalidByCol = cols.map(() => []);

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const empIdRaw = empIdKey ? row[empIdKey] : undefined;
    const empIdStr = String(empIdRaw ?? '').trim();
    const isTotalRow = empIdStr === 'Total';

    if (!isTotalRow) {
      if (!empIdStr || typeof empIdRaw !== 'string') {
        invalidEmpIdRows.push(rowNum);
      } else if (seenEmpIds.has(empIdStr)) {
        duplicateEmpIds.add(empIdStr);
      } else {
        seenEmpIds.set(empIdStr, rowNum);
      }

      cols.forEach((col, i) => {
        if (!isValidInteger(col.key ? row[col.key] : undefined)) invalidByCol[i].push(rowNum);
      });
    }
  });

  if (invalidEmpIdRows.length > 0) {
    issues.push({ field: 'Emp Id', message: `Must be text, not a number. Invalid in row(s): ${summarizeRows(invalidEmpIdRows)}.` });
  }
  if (duplicateEmpIds.size > 0) {
    issues.push({ field: 'Emp Id (duplicates)', message: `Duplicate Emp Id(s) found: ${summarizeRows([...duplicateEmpIds])}. Each Emp Id must appear only once (the "Total" summary row is exempt).` });
  }
  cols.forEach((col, i) => {
    if (invalidByCol[i].length > 0) {
      issues.push({ field: col.label, message: `Must be a whole number. Invalid in row(s): ${summarizeRows(invalidByCol[i])}.` });
    }
  });

  return issues;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The tables store the calendar year: January-March belong to the second year of the
// financial year ("2026-2027" + "January" -> 2027)
export function calendarYear(financialYear, month) {
  const [start, end] = String(financialYear).split('-').map(Number);
  return MONTHS.indexOf(month) < 3 ? end : start;
}

// Field readers: the report and data-list endpoints name some fields differently
const pick = (row, keys) => {
  for (const k of keys) if (row?.[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  return undefined;
};
const text = (keys) => (r) => pick(r, keys) ?? '—';
const count = (keys) => (r) => Number(pick(r, keys)) || 0;

export const rowWing = (r) => pick(r, ['Wing']);
export const rowWeek = (r) => Number(String(pick(r, ['Week', 'WeekName', 'week']) ?? '').replace(/\D/g, '')) || null;
export const rowPeriod = (r) => `${r.Month} ${r.Year}, Week ${rowWeek(r)}`;

// Columns per category. value() is shared by the grid and the exports; columns with
// total: true are summed in the grid's Total row.
const PERSON_COLUMNS = [
  { key: 'EmpId', label: 'Emp ID', value: text(['Emp ID', 'Emp Id']), width: 110 },
  { key: 'EmpName', label: 'Employee Name', value: text(['Emp Name', 'EMP Name']), flex: 2, minWidth: 180 },
  { key: 'Designation', label: 'Designation', value: text(['Designation']), flex: 1.5, minWidth: 150 },
  { key: 'Wing', label: 'Wing', value: text(['Wing']), flex: 1.5, minWidth: 150 },
  { key: 'Division', label: 'Division', value: text(['Division']), flex: 1.5, minWidth: 150 },
];

const PENDENCY_COLUMNS = [
  ...PERSON_COLUMNS,
  { key: 'Days0to3', label: '0-3 Days', value: count(['0-3 Days']), total: true },
  { key: 'Days4to6', label: '4-6 Days', value: count(['4-6 Days']), total: true },
  { key: 'Days7to15', label: '7-15 Days', value: count(['7-15 Days']), total: true },
  { key: 'Days16to30', label: '16-30 Days', value: count(['16-30 Days']), total: true },
  { key: 'Over30', label: '> 30 Days', value: count(['Greater than 30 days', 'Greater Than 30 days']), total: true },
  { key: 'TotalPendency', label: 'Total Pendency', value: count(['Total Pendency']), total: true },
];

const DISPOSAL_COLUMNS = [
  ...PERSON_COLUMNS,
  { key: 'Transactions', label: 'Count of Transactions', value: count(['Count of Transactions']), total: true, minWidth: 130 },
  { key: 'Files', label: 'Counts of Files', value: count(['Counts of Files']), total: true, minWidth: 120 },
  { key: 'ResponseTime', label: 'Average Response Time', value: (r) => formatTimeStr(pick(r, ['Average Response Time'])), minWidth: 140 },
];

// The three E-Office sheets. id is the URL segment; prefix is the server's route prefix.
export const CATEGORIES = {
  'file-pendency': {
    id: 'file-pendency',
    label: 'File Pendency',
    prefix: 'file-pendancy',
    sampleFile: 'File_Pendency_Sample.xlsx',
    columns: PENDENCY_COLUMNS,
  },
  'receipt-pendency': {
    id: 'receipt-pendency',
    label: 'Receipt Pendency',
    prefix: 'receipt-pendancy',
    sampleFile: 'Receipt_Pendency_Sample.xlsx',
    columns: PENDENCY_COLUMNS,
  },
  'file-disposal': {
    id: 'file-disposal',
    label: 'File Disposal',
    prefix: 'file-disposal',
    sampleFile: 'File_Disposal_Sample.xlsx',
    columns: DISPOSAL_COLUMNS,
  },
};
export const CATEGORY_LIST = Object.values(CATEGORIES);

// The grid's Total row: the summed columns, labelled in the name column
export function totalsRow(columns, rows) {
  const total = { EmpName: 'Total' };
  columns.filter((c) => c.total).forEach((c) => {
    total[c.key] = rows.reduce((sum, r) => sum + c.value(r), 0);
  });
  return total;
}

// Hands a downloaded blob to the browser as a file
export function saveBlob(data, fileName) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
