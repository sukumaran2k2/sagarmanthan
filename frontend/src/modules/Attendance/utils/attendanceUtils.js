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
