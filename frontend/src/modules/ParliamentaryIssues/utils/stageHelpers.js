const COMMENT_WING_FIELD_KEYS = [
  { key: 'shipping', match: 'shipping' },
  { key: 'vigilance', match: 'vigilance' },
  { key: 'ports', match: 'ports' },
  { key: 'iwt', match: 'iwt' },
  { key: 'administration', match: 'administration' },
  { key: 'coordI', match: 'coord-i' },
  { key: 'coordII', match: 'coord-ii' },
  { key: 'dgll', match: 'dgll' },
  { key: 'development', match: 'development' },
  { key: 'finance', match: 'finance' },
  { key: 'sagarmala', match: 'sagarmala' },
];

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical labels stored in tbl_parliamentary_issue / report APIs.
export function canonicalizeIssueType(raw) {
  const n = normalizeText(raw);
  if (!n) return '';
  if (n.includes('assurance')) return 'Assurance';
  if (n.includes('zero')) return 'Matter Raised In Zero Hours';
  if (n.includes('377')) return 'Matter Raised Under Rule 377';
  if (n.includes('special mention')) return 'Special Mention In Rajya Sabha';
  if (n.includes('psc')) return 'PSC Report';
  return String(raw).trim();
}

export function isAssuranceType(issueType) {
  return canonicalizeIssueType(issueType) === 'Assurance';
}

export function isPscType(issueType) {
  return canonicalizeIssueType(issueType) === 'PSC Report';
}

export function isMatterType(issueType) {
  const c = canonicalizeIssueType(issueType);
  return (
    c === 'Matter Raised In Zero Hours' ||
    c === 'Matter Raised Under Rule 377' ||
    c === 'Special Mention In Rajya Sabha'
  );
}

export function issueTypesFromStages(stages = []) {
  const seen = new Set();
  const types = [];
  stages.forEach((s) => {
    const c = canonicalizeIssueType(s.parlia_issue_type);
    if (!c || seen.has(c)) return;
    seen.add(c);
    types.push(c);
  });
  return types.sort((a, b) => a.localeCompare(b));
}

export function statusNamesFromStages(stages = []) {
  const seen = new Set();
  const names = [];
  stages.forEach((s) => {
    const name = String(s.parlia_stage_name || '').trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  });
  return names;
}

export function stagesForIssueType(stages = [], issueType) {
  const canonical = canonicalizeIssueType(issueType);
  return stages
    .filter((s) => canonicalizeIssueType(s.parlia_issue_type) === canonical)
    .sort((a, b) => Number(a.parlia_stage_id) - Number(b.parlia_stage_id));
}

// Assurance uses stage_id; Matter/PSC use 1-based ordinal (legacy report APIs).
export function buildDrilldownStageMap(stages = [], issueType) {
  const typeStages = stagesForIssueType(stages, issueType).filter(
    (s) => normalizeText(s.parlia_stage_name) !== 'no status'
  );
  const map = {};
  const canonical = canonicalizeIssueType(issueType);
  typeStages.forEach((s, index) => {
    const name = String(s.parlia_stage_name || '').trim();
    if (!name) return;
    if (canonical === 'Assurance') {
      map[name] = Number(s.parlia_stage_id);
    } else {
      map[name] = index + 1;
    }
    const n = normalizeText(name);
    if (n.includes('reply') || n.includes('replay')) {
      map['Reply Sent'] = map[name];
      map['Reply sent'] = map[name];
      map['Reply Send'] = map[name];
      map['Replay Sent'] = map[name];
      map['Replay sent'] = map[name];
    }
    if (n.includes('extension')) {
      map['Extension Of Time Sought'] = map[name];
    }
    if (n.includes('implementation')) {
      map['Implementation Report Furnished / Request For Dropping'] = map[name];
    }
  });
  return map;
}

export function commentFieldsForWings(wings = []) {
  return wings
    .map((w) => {
      const name = normalizeText(w.wing_name);
      const field = COMMENT_WING_FIELD_KEYS.find((f) => name.includes(f.match));
      if (!field) return null;
      return {
        key: field.key,
        label: w.wing_name,
        wingId: w.wing_id,
        match: field.match,
      };
    })
    .filter(Boolean);
}

function isYes(value) {
  if (value === true || value === 1) return true;
  const n = String(value || '').trim().toLowerCase();
  return n === 'yes' || n === '1' || n === 'true';
}

function anyWingCommentYes(form) {
  return [
    form.shipping,
    form.vigilance,
    form.ports,
    form.iwt,
    form.administration,
    form.coordI,
    form.coordII,
    form.dgll,
    form.development,
    form.finance,
    form.sagarmala,
  ].some(isYes);
}

function findStageIdByName(typeStages, ...nameParts) {
  const hit = typeStages.find((s) => {
    const n = normalizeText(s.parlia_stage_name);
    return nameParts.some((p) => n.includes(normalizeText(p)));
  });
  return hit ? String(hit.parlia_stage_id) : null;
}

function emptyStageId(typeStages) {
  const noStatus = typeStages.find(
    (s) => normalizeText(s.parlia_stage_name) === 'no status'
  );
  if (noStatus) return String(noStatus.parlia_stage_id);
  return typeStages.length ? String(typeStages[0].parlia_stage_id) : '0';
}

// Same stage progression as legacy addParliamentaryIssue.html.
export function computeStageId(form, stages = []) {
  const typeStages = stagesForIssueType(stages, form.issueType);
  if (!typeStages.length) return '0';

  const canonical = canonicalizeIssueType(form.issueType);

  if (isAssuranceType(canonical)) {
    if (isYes(form.matterDisposed)) {
      return findStageIdByName(typeStages, 'matter disposed') || '6';
    }
    if (isYes(form.impReportFurnished)) {
      return findStageIdByName(typeStages, 'implementation') || '5';
    }
    if (isYes(form.extensionTimeSought)) {
      return findStageIdByName(typeStages, 'extension') || '4';
    }
    if (anyWingCommentYes(form) || isYes(form.commentsReceived)) {
      return findStageIdByName(typeStages, 'comments received') || '3';
    }
    if (isYes(form.commentSought)) {
      return findStageIdByName(typeStages, 'comments sought') || '2';
    }
    if (isYes(form.received)) {
      return findStageIdByName(typeStages, 'received at ministry') || '1';
    }
    return emptyStageId(typeStages);
  }

  if (isMatterType(canonical)) {
    if (isYes(form.replySend)) {
      return findStageIdByName(typeStages, 'reply', 'replay') || emptyStageId(typeStages);
    }
    if (anyWingCommentYes(form) || isYes(form.commentsReceived)) {
      return findStageIdByName(typeStages, 'comments received') || emptyStageId(typeStages);
    }
    if (isYes(form.commentSought)) {
      return findStageIdByName(typeStages, 'comments sought') || emptyStageId(typeStages);
    }
    if (isYes(form.debatedInParliament)) {
      return findStageIdByName(typeStages, 'debated') || emptyStageId(typeStages);
    }
    if (isYes(form.received)) {
      return findStageIdByName(typeStages, 'received at ministry') || emptyStageId(typeStages);
    }
    return emptyStageId(typeStages);
  }

  if (isPscType(canonical)) {
    if (isYes(form.replySend)) {
      return findStageIdByName(typeStages, 'reply', 'replay') || emptyStageId(typeStages);
    }
    if (anyWingCommentYes(form) || isYes(form.commentsReceived)) {
      return findStageIdByName(typeStages, 'comments received') || emptyStageId(typeStages);
    }
    if (isYes(form.commentSought)) {
      return findStageIdByName(typeStages, 'comments sought') || emptyStageId(typeStages);
    }
    if (isYes(form.received)) {
      return findStageIdByName(typeStages, 'received at ministry') || emptyStageId(typeStages);
    }
    return emptyStageId(typeStages);
  }

  return emptyStageId(typeStages);
}

export function buildIssuePayload(form, userId, stages = []) {
  return {
    wing: form.wing,
    division: form.division,
    parliamentarySubject: form.parliamentarySubject,
    fileNumber: form.fileNumber,
    issueType: canonicalizeIssueType(form.issueType) || form.issueType,
    assuranceNumber: form.assuranceNumber,
    parliamentHouse: form.parliamentHouse,
    nameOfMP: form.nameOfMP,
    extensionSought: form.extensionSought || '',
    received: form.received || '',
    receivedDate: form.receivedDate || '',
    commentSought: form.commentSought || '',
    commentSoughtDate: form.commentSoughtDate || '',
    wings: Array.isArray(form.wings) ? form.wings : [],
    commentsReceived: form.commentsReceived || '',
    commentsReceivedDate: form.commentsReceivedDate || '',
    shipping: form.shipping || '',
    shippingDate: form.shippingDate || '',
    vigilance: form.vigilance || '',
    vigilanceDate: form.vigilanceDate || '',
    ports: form.ports || '',
    portsDate: form.portsDate || '',
    iwt: form.iwt || '',
    iwtDate: form.iwtDate || '',
    administration: form.administration || '',
    administrationDate: form.administrationDate || '',
    coordI: form.coordI || '',
    coordIDate: form.coordIDate || '',
    coordII: form.coordII || '',
    coordIIDate: form.coordIIDate || '',
    dgll: form.dgll || '',
    dgllDate: form.dgllDate || '',
    development: form.development || '',
    developmentDate: form.developmentDate || '',
    finance: form.finance || '',
    financeDate: form.financeDate || '',
    sagarmala: form.sagarmala || '',
    sagarmalaDate: form.sagarmalaDate || '',
    extensionTimeSought: form.extensionTimeSought || '',
    extensionTimeSoughtDate: form.extensionTimeSoughtDate || '',
    replySend: form.replySend || '',
    replySendDate: form.replySendDate || '',
    debatedInParliament: form.debatedInParliament || '',
    debatedInParliamentDate: form.debatedInParliamentDate || '',
    impReportFurnished: form.impReportFurnished || '',
    impReportFurnishedDate: form.impReportFurnishedDate || '',
    matterDisposed: form.matterDisposed || '',
    matterDisposedDate: form.matterDisposedDate || '',
    remarks: form.remarks || '',
    parlia_stage_id: computeStageId(form, stages),
    userID: userId,
  };
}

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
