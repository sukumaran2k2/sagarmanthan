/**
 * Helper utility functions for Employee Attendance module
 */

export function colorFromString(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export function getInits(n = '') {
  return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
}

export function formatTimeStr(val) {
  if (val === null || val === undefined || val === '') return '—';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '—';
    const hours = String(val.getHours()).padStart(2, '0');
    const minutes = String(val.getMinutes()).padStart(2, '0');
    const seconds = String(val.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return '—';
    const absVal = Math.abs(val);
    if (absVal === 0) return '00:00:00';
    if (absVal > 0 && absVal < 1) {
      const totalSeconds = Math.round(absVal * 24 * 60 * 60);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    if (absVal <= 24) {
      const totalSeconds = Math.round(absVal * 3600);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    const frac = absVal % 1;
    if (frac > 0) {
      const totalSeconds = Math.round(frac * 24 * 60 * 60);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return String(absVal);
  }

  if (typeof val === 'string') {
    let cleanVal = val.trim();
    if (!cleanVal || cleanVal === '-' || cleanVal === '—') return '—';

    if (cleanVal.startsWith('-')) {
      cleanVal = cleanVal.substring(1).trim();
    }

    const parsedNum = Number(cleanVal);
    if (!isNaN(parsedNum) && cleanVal.indexOf(':') === -1) {
      return formatTimeStr(parsedNum);
    }

    if (cleanVal.includes('T')) {
      const timePart = cleanVal.split('T')[1];
      if (timePart) {
        cleanVal = timePart.split('.')[0].slice(0, 8);
      }
    } else if (cleanVal.includes(' ') && !cleanVal.toUpperCase().includes('AM') && !cleanVal.toUpperCase().includes('PM')) {
      const timePart = cleanVal.split(' ')[1];
      if (timePart && timePart.includes(':')) {
        cleanVal = timePart;
      }
    }

    const ampmMatch = cleanVal.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const seconds = ampmMatch[3] || '00';
      const period = ampmMatch[4].toUpperCase();

      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
    }

    const dotTimeMatch = cleanVal.match(/^(\d{1,2})[\.:](\d{2})[\.:](\d{2})$/);
    if (dotTimeMatch) {
      const hours = String(parseInt(dotTimeMatch[1], 10)).padStart(2, '0');
      const minutes = dotTimeMatch[2];
      const seconds = dotTimeMatch[3];
      return `${hours}:${minutes}:${seconds}`;
    }

    const timeMatch = cleanVal.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
      const minutes = timeMatch[2];
      const seconds = timeMatch[3] || '00';
      return `${hours}:${minutes}:${seconds}`;
    }

    return cleanVal || '—';
  }

  return String(val);
}

export function calculateWorkingHoursDifference(inTimeStr, outTimeStr, existingWorkHours) {
  const inTimeFormatted = formatTimeStr(inTimeStr);
  const outTimeFormatted = formatTimeStr(outTimeStr);

  if (inTimeFormatted && outTimeFormatted && inTimeFormatted.includes(':') && outTimeFormatted.includes(':')) {
    const inParts = inTimeFormatted.split(':').map(Number);
    const outParts = outTimeFormatted.split(':').map(Number);

    if (inParts.length >= 2 && outParts.length >= 2 && !isNaN(inParts[0]) && !isNaN(outParts[0])) {
      const inSec = (inParts[0] || 0) * 3600 + (inParts[1] || 0) * 60 + (inParts[2] || 0);
      const outSec = (outParts[0] || 0) * 3600 + (outParts[1] || 0) * 60 + (outParts[2] || 0);

      if (outSec >= inSec) {
        const diffSec = outSec - inSec;
        const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
        const s = String(diffSec % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
    }
  }

  return formatTimeStr(existingWorkHours);
}

export function validateAttendanceHeaders(firstRow) {
  if (!firstRow || typeof firstRow !== 'object') {
    return { valid: false, missing: ['Header row not found'] };
  }

  const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const hasEmpId = keys.some(k => k.includes('empid') || k.includes('emp') || k.includes('id'));
  const hasAttendanceMarked = keys.some(k => k.includes('attendancemarked') || k.includes('daysmarked') || k.includes('attendance') || k.includes('marked'));
  const hasInTime = keys.some(k => k.includes('intimeavg') || k.includes('intime') || k.includes('in'));
  const hasOutTime = keys.some(k => k.includes('outtimeavg') || k.includes('outtime') || k.includes('out'));
  const hasWorkingHours = keys.some(k => k.includes('workinghours') || k.includes('averageworkinghours') || k.includes('working') || k.includes('hours'));

  const missing = [];
  if (!hasEmpId) missing.push('Emp ID');
  if (!hasAttendanceMarked) missing.push('Days Marked / Attendance Marked');
  if (!hasInTime) missing.push('In Time Avg');
  if (!hasOutTime) missing.push('Out Time Avg');
  if (!hasWorkingHours) missing.push('Working Hours');

  return { valid: missing.length === 0, missing };
}

// Finds the actual column key in a row object that matches one of the
// canonical field names, since uploaded sheets can use varying header
// text ("Emp Id", "EmpId", "Employee ID", etc).
function findKey(row, candidates) {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const normCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normCandidate);
    if (match) return match;
  }
  // fallback: partial match on the first (most specific) candidate's core term
  const core = candidates[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(core));
}

// Row-level validation mirroring the backend's exact checks in
// createEmpAttendance/updateEmpAttendance: numeric Emp Id, no duplicate
// Emp Ids across the file, and HH:MM:SS time format for In/Out/Working
// Hours. Returns every distinct failing condition found in the file
// (not just the first), each itemized with the specific row(s) affected,
// so the person can see everything wrong with their file at once rather
// than fixing issues one upload attempt at a time.
export function validateAttendanceRows(rows) {
  const issues = [];
  if (!rows || rows.length === 0) return issues;

  const empIdKey = findKey(rows[0], ['Emp Id', 'EmpId', 'Employee ID']);
  const inTimeKey = findKey(rows[0], ['In Time Avg', 'InTimeAvg', 'In Time']);
  const outTimeKey = findKey(rows[0], ['Out Time Avg', 'OutTimeAvg', 'Out Time']);
  const workHoursKey = findKey(rows[0], ['Average Working Hours', 'Working Hours', 'WorkingHours']);

  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;

  const invalidEmpIdRows = [];
  const invalidInTimeRows = [];
  const invalidOutTimeRows = [];
  const invalidWorkHoursRows = [];
  const seenEmpIds = new Map(); // empId -> first row number seen
  const duplicateEmpIds = new Set();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row, matching what a person sees in Excel

    const empIdRaw = empIdKey ? row[empIdKey] : undefined;
    if (empIdRaw === undefined || empIdRaw === null || empIdRaw === '' || isNaN(Number(empIdRaw))) {
      invalidEmpIdRows.push(rowNum);
    } else {
      const empIdStr = String(empIdRaw).trim();
      if (seenEmpIds.has(empIdStr)) {
        duplicateEmpIds.add(empIdStr);
      } else {
        seenEmpIds.set(empIdStr, rowNum);
      }
    }

    const inTimeFormatted = formatTimeStr(inTimeKey ? row[inTimeKey] : undefined);
    if (!timeRegex.test(inTimeFormatted)) invalidInTimeRows.push(rowNum);

    const outTimeFormatted = formatTimeStr(outTimeKey ? row[outTimeKey] : undefined);
    if (!timeRegex.test(outTimeFormatted)) invalidOutTimeRows.push(rowNum);

    const workHoursFormatted = formatTimeStr(workHoursKey ? row[workHoursKey] : undefined);
    if (!timeRegex.test(workHoursFormatted)) invalidWorkHoursRows.push(rowNum);
  });

  const summarizeRows = (rowNums, max = 8) => {
    if (rowNums.length <= max) return rowNums.join(', ');
    return `${rowNums.slice(0, max).join(', ')} and ${rowNums.length - max} more`;
  };

  if (invalidEmpIdRows.length > 0) {
    issues.push({
      field: 'Emp Id',
      message: `Emp Id must be a number. Invalid in row(s): ${summarizeRows(invalidEmpIdRows)}.`,
    });
  }
  if (duplicateEmpIds.size > 0) {
    issues.push({
      field: 'Emp Id (duplicates)',
      message: `Duplicate Emp Id(s) found: ${summarizeRows([...duplicateEmpIds])}. Each Emp Id must appear only once.`,
    });
  }
  if (invalidInTimeRows.length > 0) {
    issues.push({
      field: 'In Time Avg',
      message: `Must be in HH:MM:SS format. Invalid in row(s): ${summarizeRows(invalidInTimeRows)}.`,
    });
  }
  if (invalidOutTimeRows.length > 0) {
    issues.push({
      field: 'Out Time Avg',
      message: `Must be in HH:MM:SS format. Invalid in row(s): ${summarizeRows(invalidOutTimeRows)}.`,
    });
  }
  if (invalidWorkHoursRows.length > 0) {
    issues.push({
      field: 'Average Working Hours',
      message: `Must be in HH:MM:SS format. Invalid in row(s): ${summarizeRows(invalidWorkHoursRows)}.`,
    });
  }

  return issues;
}
