import { parseDate } from './format';
import { countBy } from './aggregate';

export function countLabel(count, singular, plural = `${singular}s`) {
  return `${Number(count).toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;
}

export function joinList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function projectQuote(row) {
  if (!row?.projectName) return null;
  return row.organisationName
    ? `“${row.projectName}” under ${row.organisationName}`
    : `“${row.projectName}”`;
}

export function isSingleOrganisation(rows, audience) {
  if (audience === 'organisation') return true;
  return new Set(rows.map((row) => String(row.organisationName || '').trim()).filter(Boolean)).size <= 1;
}

export function stageBreakdown(rows) {
  const entries = [...countBy(rows, 'currentStage').entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (!entries.length) return '';
  return joinList(entries.map(([stage, count]) => `${count} ${count === 1 ? 'is' : 'are'} “${stage}”`));
}

export function fyCompletionPhrase(rows, fy) {
  let current = 0;
  let next = 0;
  let other = 0;

  rows.forEach((row) => {
    const date = parseDate(row.targetCompletionDate);
    if (!date) {
      other += 1;
      return;
    }
    if (date >= fy.start && date <= fy.end) current += 1;
    else if (date >= fy.nextStart && date <= fy.nextEnd) next += 1;
    else other += 1;
  });

  const parts = [];
  if (current) parts.push(`${current} in FY ${fy.label}`);
  if (next) parts.push(`${next} in the next financial year`);
  if (other) parts.push(`${other} outside these two years`);
  return parts.length ? `Scheduled completion: ${joinList(parts)}.` : '';
}
