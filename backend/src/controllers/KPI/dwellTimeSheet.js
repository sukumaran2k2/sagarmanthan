import xlsx from "xlsx";
import { MONTH_NAMES } from "./kpiEntryCommon.js";

/**
 * KPI Major Ports — Port Performance: the monthly Dwell Time Excel sheet.
 *
 * Reads and checks one uploaded sheet; no database access, so the same rules serve the
 * upload preview, the upload save and the edit form. The frontend lists the same rules to
 * users in modules/MajorPorts/pages/PortPerformance/dwellTimeConfig.js (DWELL_UPLOAD_RULES).
 *
 * Layout (the Ministry's format, also produced by buildDwellTemplate):
 *   Dwell Time (in hrs.) - September 2026
 *   Sr. No. | Port | MONTHLY IMPORT | MONTHLY EXPORT | MONTHLY OVERALL | YTD IMPORT | YTD EXPORT | YTD Overall
 *   1       | Chennai Port Authority | 37.05 | 99.56 | 62.24 | 36.93 | 90.01 | 57.06
 *   ...     | SMPA Overall | ...      (the Ministry's own SMPA figure, kept as its own row)
 *   ...     | All Major Ports (Overall) | ...
 */

export const DWELL_VALUE_COLUMNS = [
    { key: "monthly_import", label: "Monthly Import" },
    { key: "monthly_export", label: "Monthly Export" },
    { key: "monthly_overall", label: "Monthly Overall" },
    { key: "ytd_import", label: "YTD Import" },
    { key: "ytd_export", label: "YTD Export" },
    { key: "ytd_overall", label: "YTD Overall" },
];
export const DWELL_VALUE_KEYS = DWELL_VALUE_COLUMNS.map((c) => c.key);

/** Overall must lie between import and export; these are the triples it is checked on. */
const OVERALL_CHECKS = [
    { label: "Monthly", importKey: "monthly_import", exportKey: "monthly_export", overallKey: "monthly_overall" },
    { label: "YTD", importKey: "ytd_import", exportKey: "ytd_export", overallKey: "ytd_overall" },
];

export const DWELL_MAX_HOURS = 10000;
export const DWELL_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const OVERALL_ROW_KEY = "overall";
export const OVERALL_ROW_LABEL = "All Major Ports (Overall)";
export const TOTAL_SMPA_ROW_KEY = "total-smpa";
export const TOTAL_SMPA_ROW_LABEL = "SMPA Overall";

// Rounding of the overall figure in the sheet may put it a hair outside import..export
const OVERALL_TOLERANCE = 0.01;
// Only the first rows are parsed: the sheet has ~20, so anything far beyond is not this format
const MAX_SHEET_ROWS = 200;
const MAX_ERRORS = 50;

const NO_DATA_TOKENS = new Set(["", "-", "na", "n/a", "nil", "none"]);
const MONTH_BY_NAME = new Map(
    MONTH_NAMES.flatMap((name, i) => [[name.toLowerCase(), i + 1], [name.slice(0, 3).toLowerCase(), i + 1]])
        .concat([["sept", 9]])
);

// ---------------------------------------------------------------------------
// Cleaning
// ---------------------------------------------------------------------------

/** Trims, turns non-breaking / zero-width spaces and long dashes into plain ones, collapses spaces. */
export function cleanText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .normalize("NFKC")
        .replace(/[​-‍﻿]/g, "")
        .replace(/[‐-―−]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

/** Comparable form of a heading or port name: case, spaces, dots and dashes are ignored. */
export function matchKey(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Parses one dwell time value (hours). Returns { value } (null for "-" / blank) or { error }.
 * Accepts numbers and numeric text ("1,234.5"); rounds to 2 decimals.
 */
export function parseHours(raw) {
    let n;
    if (typeof raw === "number") {
        n = raw;
    } else {
        const text = cleanText(raw).toLowerCase();
        if (NO_DATA_TOKENS.has(text)) return { value: null };
        const plain = text.replace(/,/g, "");
        if (!/^\d+(\.\d+)?$/.test(plain)) {
            return { error: plain.startsWith("-") ? "cannot be negative" : "is not a number" };
        }
        n = Number(plain);
    }
    if (!Number.isFinite(n)) return { error: "is not a number" };
    if (n < 0) return { error: "cannot be negative" };
    if (n > DWELL_MAX_HOURS) return { error: `is more than ${DWELL_MAX_HOURS.toLocaleString("en-IN")} hours` };
    return { value: Math.round(n * 100) / 100 };
}

/** Messages for overall figures that are not between import and export. */
export function checkOverall(values) {
    const problems = [];
    for (const { label, importKey, exportKey, overallKey } of OVERALL_CHECKS) {
        const [imp, exp, overall] = [values[importKey], values[exportKey], values[overallKey]];
        if (imp === null || exp === null || overall === null) continue;
        const low = Math.min(imp, exp) - OVERALL_TOLERANCE;
        const high = Math.max(imp, exp) + OVERALL_TOLERANCE;
        if (overall < low || overall > high) {
            problems.push(`${label} Overall (${overall}) must be between ${label} Import (${imp}) and ${label} Export (${exp})`);
        }
    }
    return problems;
}

/** Parses the six values of one row; returns { values, errors: [{ column, message }] }. */
export function parseRowValues(rawValues) {
    const values = {};
    const errors = [];
    for (const { key, label } of DWELL_VALUE_COLUMNS) {
        const result = parseHours(rawValues[key]);
        if (result.error) errors.push({ column: label, message: `${label} ${result.error}` });
        values[key] = result.value ?? null;
    }
    if (!errors.length) checkOverall(values).forEach((message) => errors.push({ column: null, message }));
    return { values, errors };
}

// ---------------------------------------------------------------------------
// Port rows
// ---------------------------------------------------------------------------

/**
 * Row slots the sheet must fill: every major port, SMPA Overall and All Major Ports.
 * ports: [{ organisation_id, organisation_name }] (major ports, in sheet order).
 */
export function buildRowSlots(ports) {
    return [
        ...ports.map((p) => ({ rowKey: `org-${p.organisation_id}`, organisationId: p.organisation_id, label: p.organisation_name })),
        { rowKey: TOTAL_SMPA_ROW_KEY, organisationId: null, label: TOTAL_SMPA_ROW_LABEL },
        { rowKey: OVERALL_ROW_KEY, organisationId: null, label: OVERALL_ROW_LABEL },
    ];
}

/** Maps a port cell of the sheet to its slot, or null when the name is not recognised. */
function resolveSlot(portCell, slots) {
    const key = matchKey(portCell);
    if (!key) return null;
    if (/^all major\w* ports?\b/.test(key)) return slots.find((s) => s.rowKey === OVERALL_ROW_KEY);
    return slots.find((s) => matchKey(s.label) === key) || null;
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

/** "Dwell Time (in hrs.) - September 2026" → { month: 9, fiscalYear: "2026-2027" } or null. */
export function parseTitlePeriod(text) {
    const match = cleanText(text).toLowerCase().match(/([a-z]+)\.?[\s,'-]*(\d{4})\b/g);
    if (!match) return null;
    for (const part of match) {
        const [, name, year] = part.match(/([a-z]+)\.?[\s,'-]*(\d{4})/);
        const month = MONTH_BY_NAME.get(name);
        if (!month) continue;
        const y = Number(year);
        const start = month >= 4 ? y : y - 1;
        return { month, fiscalYear: `${start}-${start + 1}` };
    }
    return null;
}

/** Reads the first sheet into rows of cells; returns { rows, firstRow } or { error }. */
function readGrid(buffer) {
    let workbook;
    try {
        workbook = xlsx.read(buffer, {
            type: "buffer",
            sheetRows: MAX_SHEET_ROWS,
            cellFormula: false,
            cellHTML: false,
            cellStyles: false,
        });
    } catch {
        return { error: "The file could not be read. Save it as an Excel workbook (.xlsx) and try again." };
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet || !sheet["!ref"]) return { error: "The first sheet of the file is empty." };
    const firstRow = xlsx.utils.decode_range(sheet["!ref"]).s.r + 1;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true });
    return { rows, firstRow };
}

const EXPECTED_HEADERS = ["port", ...DWELL_VALUE_COLUMNS.map((c) => matchKey(c.label))];

/**
 * Parses and checks an uploaded sheet for the selected period.
 * Returns { rows, errors }; errors are [{ row, column, message }] (row = Excel row number).
 * rows (only meaningful when errors is empty): one per slot, in slot order.
 */
export function parseDwellSheet(buffer, { fiscalYear, month, ports }) {
    const grid = readGrid(buffer);
    if (grid.error) return { rows: [], errors: [{ row: null, column: null, message: grid.error }] };
    const { rows: cells, firstRow } = grid;
    const errors = [];
    const addError = (row, column, message) => {
        if (errors.length < MAX_ERRORS) errors.push({ row, column, message });
    };

    // Heading row: the first row with a "Port" cell
    const headerIndex = cells.findIndex((r) => r.some((c) => matchKey(c) === "port"));
    if (headerIndex < 0) {
        addError(null, null, "The heading row (Sr. No. | Port | Monthly Import | ... | YTD Overall) was not found. Use the template.");
        return { rows: [], errors };
    }
    const header = cells[headerIndex];
    const portCol = header.findIndex((c) => matchKey(c) === "port");
    const found = EXPECTED_HEADERS.map((_, i) => matchKey(header[portCol + i]));
    if (found.some((h, i) => h !== EXPECTED_HEADERS[i])) {
        addError(firstRow + headerIndex, null,
            `Column headings must be: Port, ${DWELL_VALUE_COLUMNS.map((c) => c.label).join(", ")} (in this order).`);
        return { rows: [], errors };
    }

    // Title above the headings must name the selected month
    const titleText = cells.slice(0, headerIndex).flat().filter(Boolean).map(cleanText).join(" ");
    const titlePeriod = parseTitlePeriod(titleText);
    const selectedLabel = `${MONTH_NAMES[month - 1]} (${fiscalYear})`;
    if (!/dwell\s*time/i.test(titleText) || !titlePeriod) {
        addError(null, null, `The title row "Dwell Time (in hrs.) - <Month> <Year>" is missing above the headings. It must name ${selectedLabel}.`);
    } else if (titlePeriod.month !== month || titlePeriod.fiscalYear !== fiscalYear) {
        addError(null, null,
            `The sheet is for ${MONTH_NAMES[titlePeriod.month - 1]} (${titlePeriod.fiscalYear}) but ${selectedLabel} is selected.`);
    }

    // Port rows
    const slots = buildRowSlots(ports);
    const filled = new Map(); // rowKey -> { values, sheetRow }
    for (let i = headerIndex + 1; i < cells.length; i += 1) {
        const line = cells[i];
        const sheetRow = firstRow + i;
        const portCell = cleanText(line[portCol]);
        const rawValues = Object.fromEntries(DWELL_VALUE_KEYS.map((k, j) => [k, line[portCol + 1 + j]]));
        const hasValues = Object.values(rawValues).some((v) => cleanText(v) !== "");
        if (!portCell) {
            if (hasValues) addError(sheetRow, "Port", "The port name is missing.");
            continue;
        }

        const slot = resolveSlot(portCell, slots);
        if (!slot) {
            addError(sheetRow, "Port", `"${portCell}" is not a major port of the template. Keep the port names as in the template.`);
            continue;
        }
        const { values, errors: valueErrors } = parseRowValues(rawValues);
        valueErrors.forEach((e) => addError(sheetRow, e.column, `${portCell}: ${e.message}.`));

        const earlier = filled.get(slot.rowKey);
        if (earlier) {
            addError(sheetRow, "Port", `${slot.label} appears more than once (also row ${earlier.sheetRow}).`);
            continue;
        }
        filled.set(slot.rowKey, { values, sheetRow });
    }

    const missing = slots.filter((s) => !filled.has(s.rowKey)).map((s) => s.label);
    if (missing.length) addError(null, "Port", `These rows are missing: ${missing.join(", ")}.`);

    const rows = slots
        .filter((s) => filled.has(s.rowKey))
        .map((s) => ({ ...s, sheetRow: filled.get(s.rowKey).sheetRow, values: filled.get(s.rowKey).values }));
    if (!errors.length && rows.every((r) => DWELL_VALUE_KEYS.every((k) => r.values[k] === null))) {
        addError(null, null, "The sheet has no dwell time values. Fill in the hours, or \"-\" where a port has no data.");
    }
    return { rows, errors };
}

/** Blank template for a period, in the layout parseDwellSheet reads. Returns an .xlsx buffer. */
export function buildDwellTemplate({ fiscalYear, month, ports }) {
    const startYear = Number(fiscalYear.slice(0, 4));
    const calendarYear = month >= 4 ? startYear : startYear + 1;
    const names = buildRowSlots(ports).map((s) => s.label);

    const aoa = [
        [`Dwell Time (in hrs.) - ${MONTH_NAMES[month - 1]} ${calendarYear}`],
        ["Sr. No.", "Port", ...DWELL_VALUE_COLUMNS.map((c) => c.label)],
        ...names.map((name, i) => [i + 1, name, ...DWELL_VALUE_KEYS.map(() => null)]),
    ];
    const sheet = xlsx.utils.aoa_to_sheet(aoa);
    sheet["!cols"] = [{ wch: 8 }, { wch: 38 }, ...DWELL_VALUE_KEYS.map(() => ({ wch: 16 }))];
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 + DWELL_VALUE_KEYS.length } }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, "Dwell Time");
    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}
