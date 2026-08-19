function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateOnlyFromDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function formatReportDate(value) {
  if (value == null || value === '') return value;
  if (typeof value === 'number') return value;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateOnlyFromDate(value);
  }

  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, mm, dd, yyyy] = slash;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  if (s.includes('T') || /\d{1,2}:\d{2}/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return toDateOnlyFromDate(d);
    return s.split(/[ T]/)[0];
  }

  return s;
}

export function isReportDateField(key) {
  const n = String(key || '').toLowerCase();
  if (n.includes('date') || n === 'last updated') return true;
  return (
    n.includes('received at ministry') ||
    n.includes('comments sought') ||
    n.includes('comments received') ||
    n.includes('extension of time') ||
    n.includes('extension sought') ||
    n.includes('implementation report') ||
    n.includes('matter disposed') ||
    n.includes('debated in parliament') ||
    n.includes('reply sent') ||
    n.includes('reply send') ||
    n.includes('replay sent') ||
    n.includes('dcn prepared') ||
    n.includes('dcn approved') ||
    n.includes('circulated for imc') ||
    n.includes('imc comments') ||
    n.includes('dcm been approved') ||
    n.includes('has dcm been approved') ||
    n.includes('advance copy') ||
    n.includes('cabinet approved') ||
    n === 'on hold' ||
    n === 'completed'
  );
}

export function looksLikeDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}/.test(s)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/.test(s)) return true;
  return false;
}

export function stripTimesFromReportRows(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const next = { ...row };
    Object.keys(next).forEach((key) => {
      if (!isReportDateField(key) && !looksLikeDateTime(next[key])) return;
      next[key] = formatReportDate(next[key]);
    });
    return next;
  });
}
