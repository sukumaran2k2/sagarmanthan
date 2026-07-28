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

    const dotTimeMatch = cleanVal.match(/^(\d{1,2})[\.:](\d{2})[\.:](\d{2})$/);
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

export function getKpiPrefix(kpi) {
  switch (kpi) {
    case "file-pendency":
      return "file-pendancy";
    case "receipt-pendency":
      return "receipt-pendancy";
    case "file-disposal":
      return "file-disposal";
    default:
      return "file-pendancy";
  }
}

export function getReportTitle(kpi) {
  switch (kpi) {
    case "file-pendency":
      return "File Pendency Abstract Summary Report";
    case "receipt-pendency":
      return "Receipt Pendency Abstract Summary Report";
    case "file-disposal":
      return "File Disposal Abstract Summary Report";
    default:
      return "E-Office Abstract Summary Report";
  }
}
