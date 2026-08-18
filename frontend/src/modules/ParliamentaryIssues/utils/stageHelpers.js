const COMMENT_WING_FIELD_KEYS = [
  { key: 'shipping', match: 'shipping', remarkColumn: 'shipping_remarks' },
  { key: 'vigilance', match: 'vigilance', remarkColumn: 'vigilance_remarks' },
  { key: 'ports', match: 'ports', remarkColumn: 'ports_remarks' },
  { key: 'iwt', match: 'iwt', remarkColumn: 'iwt_remarks' },
  { key: 'administration', match: 'administration', remarkColumn: 'administration_remarks' },
  { key: 'coordI', match: 'coord-i', remarkColumn: 'coord_I_remarks' },
  { key: 'coordII', match: 'coord-ii', remarkColumn: 'coord_II_remarks' },
  { key: 'dgll', match: 'dgll', remarkColumn: 'dgll_parliament_and_trw_remarks' },
  { key: 'development', match: 'development', remarkColumn: 'development_remarks' },
  { key: 'finance', match: 'finance', remarkColumn: 'finance_remarks' },
  { key: 'sagarmala', match: 'sagarmala', remarkColumn: 'sagarmala_remarks' },
];

export const STAGE_REMARK_FIELDS = [
  { dateKey: 'receivedDate', remarkKey: 'receivedRemark', dbRemark: 'received_at_ministry_remarks' },
  {
    dateKey: 'debatedInParliamentDate',
    remarkKey: 'debatedInParliamentRemark',
    dbRemark: 'debated_in_parliament_remarks',
  },
  { dateKey: 'commentSoughtDate', remarkKey: 'commentSoughtRemark', dbRemark: 'comment_soughted_remarks' },
  {
    dateKey: 'commentsReceivedDate',
    remarkKey: 'commentsReceivedRemark',
    dbRemark: 'comment_received_remarks',
  },
  {
    dateKey: 'extensionTimeSoughtDate',
    remarkKey: 'extensionTimeSoughtRemark',
    dbRemark: 'extension_time_soughted_remarks',
  },
  {
    dateKey: 'impReportFurnishedDate',
    remarkKey: 'impReportFurnishedRemark',
    dbRemark: 'implementation_report_furnished_remarks',
  },
  { dateKey: 'matterDisposedDate', remarkKey: 'matterDisposedRemark', dbRemark: 'matter_disposed_remarks' },
  { dateKey: 'replySendDate', remarkKey: 'replySendRemark', dbRemark: 'reply_send_remarks' },
  ...COMMENT_WING_FIELD_KEYS.map((f) => ({
    dateKey: `${f.key}Date`,
    remarkKey: `${f.key}Remark`,
    dbRemark: f.remarkColumn,
  })),
];

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

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

export function isCompletedStageName(name) {
  const n = normalizeText(name);
  if (!n) return false;
  if (n.includes('matter disposed')) return true;
  if ((n.includes('reply') || n.includes('replay')) && (n.includes('sent') || n.includes('send'))) {
    return true;
  }
  return n === 'completed';
}

export function isCompletedParliamentaryIssue(row = {}) {
  if (isCompletedStageName(row.status || row.parlia_stage_name)) return true;
  const raw = row.raw || row;
  if (raw.matter_disposed_date) return true;
  if (raw.reply_send_date) return true;
  return false;
}

export function stagesForIssueType(stages = [], issueType) {
  const canonical = canonicalizeIssueType(issueType);
  return stages
    .filter((s) => canonicalizeIssueType(s.parlia_issue_type) === canonical)
    .sort((a, b) => Number(a.parlia_stage_id) - Number(b.parlia_stage_id));
}

export function stageNamesForIssueType(stages = [], issueType, { excludeCompleted = false } = {}) {
  const seen = new Set();
  const names = [];
  stagesForIssueType(stages, issueType).forEach((s) => {
    const name = String(s.parlia_stage_name || '').trim();
    if (!name || seen.has(name)) return;
    if (excludeCompleted && isCompletedStageName(name)) return;
    seen.add(name);
    names.push(name);
  });
  return names;
}

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
        dateKey: `${field.key}Date`,
        remarkKey: `${field.key}Remark`,
      };
    })
    .filter(Boolean);
}

export function hasDate(value) {
  return Boolean(String(value || '').trim());
}

function anyWingCommentDate(form, commentFields = []) {
  if (commentFields.length) {
    return commentFields.some((f) => hasDate(form[`${f.key}Date`]));
  }
  return [
    form.shippingDate,
    form.vigilanceDate,
    form.portsDate,
    form.iwtDate,
    form.administrationDate,
    form.coordIDate,
    form.coordIIDate,
    form.dgllDate,
    form.developmentDate,
    form.financeDate,
    form.sagarmalaDate,
  ].some(hasDate);
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

export function computeStageId(form, stages = []) {
  const typeStages = stagesForIssueType(stages, form.issueType);
  if (!typeStages.length) return '0';

  const canonical = canonicalizeIssueType(form.issueType);

  if (isAssuranceType(canonical)) {
    if (hasDate(form.matterDisposedDate)) {
      return findStageIdByName(typeStages, 'matter disposed') || '6';
    }
    if (hasDate(form.impReportFurnishedDate)) {
      return findStageIdByName(typeStages, 'implementation') || '5';
    }
    if (hasDate(form.extensionTimeSoughtDate)) {
      return findStageIdByName(typeStages, 'extension') || '4';
    }
    if (anyWingCommentDate(form) || hasDate(form.commentsReceivedDate)) {
      return findStageIdByName(typeStages, 'comments received') || '3';
    }
    if (hasDate(form.commentSoughtDate)) {
      return findStageIdByName(typeStages, 'comments sought') || '2';
    }
    if (hasDate(form.receivedDate)) {
      return findStageIdByName(typeStages, 'received at ministry') || '1';
    }
    return emptyStageId(typeStages);
  }

  if (isMatterType(canonical)) {
    if (hasDate(form.replySendDate)) {
      return findStageIdByName(typeStages, 'reply', 'replay') || emptyStageId(typeStages);
    }
    if (anyWingCommentDate(form) || hasDate(form.commentsReceivedDate)) {
      return findStageIdByName(typeStages, 'comments received') || emptyStageId(typeStages);
    }
    if (hasDate(form.commentSoughtDate)) {
      return findStageIdByName(typeStages, 'comments sought') || emptyStageId(typeStages);
    }
    if (hasDate(form.debatedInParliamentDate)) {
      return findStageIdByName(typeStages, 'debated') || emptyStageId(typeStages);
    }
    if (hasDate(form.receivedDate)) {
      return findStageIdByName(typeStages, 'received at ministry') || emptyStageId(typeStages);
    }
    return emptyStageId(typeStages);
  }

  if (isPscType(canonical)) {
    if (hasDate(form.replySendDate)) {
      return findStageIdByName(typeStages, 'reply', 'replay') || emptyStageId(typeStages);
    }
    if (anyWingCommentDate(form) || hasDate(form.commentsReceivedDate)) {
      return findStageIdByName(typeStages, 'comments received') || emptyStageId(typeStages);
    }
    if (hasDate(form.commentSoughtDate)) {
      return findStageIdByName(typeStages, 'comments sought') || emptyStageId(typeStages);
    }
    if (hasDate(form.receivedDate)) {
      return findStageIdByName(typeStages, 'received at ministry') || emptyStageId(typeStages);
    }
    return emptyStageId(typeStages);
  }

  return emptyStageId(typeStages);
}

export function computeUnlockedStages(form, { isEdit = false, commentFields = [] } = {}) {
  const isAssurance = isAssuranceType(form.issueType);
  const isPsc = isPscType(form.issueType);
  const isMatter = isMatterType(form.issueType);

  const receivedDone = hasDate(form.receivedDate);
  const debatedDone = hasDate(form.debatedInParliamentDate);
  const commentSoughtDone = hasDate(form.commentSoughtDate);
  const wingCommentDone =
    hasDate(form.commentsReceivedDate) || anyWingCommentDate(form, commentFields);
  const extensionDone = hasDate(form.extensionTimeSoughtDate);
  const impDone = hasDate(form.impReportFurnishedDate);

  if (isAssurance) {
    const base = {
      received: true,
      debated: false,
      commentSought: receivedDone,
      commentsReceived: commentSoughtDone,
      extension: wingCommentDone,
      implementation: extensionDone,
      disposed: impDone,
      reply: false,
    };
    if (isEdit) {
      if (hasDate(form.commentSoughtDate)) base.commentSought = true;
      if (hasDate(form.commentsReceivedDate) || anyWingCommentDate(form, commentFields)) {
        base.commentSought = true;
        base.commentsReceived = true;
      }
      if (hasDate(form.extensionTimeSoughtDate)) {
        base.commentSought = true;
        base.commentsReceived = true;
        base.extension = true;
      }
      if (hasDate(form.impReportFurnishedDate)) {
        base.commentSought = true;
        base.commentsReceived = true;
        base.extension = true;
        base.implementation = true;
      }
      if (hasDate(form.matterDisposedDate)) {
        base.commentSought = true;
        base.commentsReceived = true;
        base.extension = true;
        base.implementation = true;
        base.disposed = true;
      }
    }
    return base;
  }

  if (isMatter) {
    const base = {
      received: true,
      debated: receivedDone,
      commentSought: debatedDone,
      commentsReceived: commentSoughtDone,
      extension: false,
      implementation: false,
      disposed: false,
      reply: wingCommentDone,
    };
    if (isEdit) {
      if (hasDate(form.debatedInParliamentDate)) base.debated = true;
      if (hasDate(form.commentSoughtDate)) {
        base.debated = true;
        base.commentSought = true;
      }
      if (hasDate(form.commentsReceivedDate) || anyWingCommentDate(form, commentFields)) {
        base.debated = true;
        base.commentSought = true;
        base.commentsReceived = true;
      }
      if (hasDate(form.replySendDate)) {
        base.debated = true;
        base.commentSought = true;
        base.commentsReceived = true;
        base.reply = true;
      }
    }
    return base;
  }

  if (isPsc) {
    const base = {
      received: true,
      debated: false,
      commentSought: receivedDone,
      commentsReceived: commentSoughtDone,
      extension: false,
      implementation: false,
      disposed: false,
      reply: wingCommentDone,
    };
    if (isEdit) {
      if (hasDate(form.commentSoughtDate)) base.commentSought = true;
      if (hasDate(form.commentsReceivedDate) || anyWingCommentDate(form, commentFields)) {
        base.commentSought = true;
        base.commentsReceived = true;
      }
      if (hasDate(form.replySendDate)) {
        base.commentSought = true;
        base.commentsReceived = true;
        base.reply = true;
      }
    }
    return base;
  }

  return {
    received: true,
    debated: false,
    commentSought: false,
    commentsReceived: false,
    extension: false,
    implementation: false,
    disposed: false,
    reply: false,
  };
}

export function buildIssuePayload(form, userId, stages = []) {
  const payload = {
    wing: form.wing,
    division: form.division,
    parliamentarySubject: form.parliamentarySubject,
    fileNumber: form.fileNumber,
    issueType: canonicalizeIssueType(form.issueType) || form.issueType,
    remarks: form.remarks || '',
    assuranceNumber: form.assuranceNumber,
    parliamentHouse: form.parliamentHouse,
    nameOfMP: form.nameOfMP,
    extensionSought: form.extensionSought || '',
    receivedDate: form.receivedDate || '',
    receivedRemark: form.receivedRemark || '',
    commentSoughtDate: form.commentSoughtDate || '',
    commentSoughtRemark: form.commentSoughtRemark || '',
    wings: Array.isArray(form.wings) ? form.wings : [],
    commentsReceivedDate: form.commentsReceivedDate || '',
    commentsReceivedRemark: form.commentsReceivedRemark || '',
    shippingDate: form.shippingDate || '',
    shippingRemark: form.shippingRemark || '',
    vigilanceDate: form.vigilanceDate || '',
    vigilanceRemark: form.vigilanceRemark || '',
    portsDate: form.portsDate || '',
    portsRemark: form.portsRemark || '',
    iwtDate: form.iwtDate || '',
    iwtRemark: form.iwtRemark || '',
    administrationDate: form.administrationDate || '',
    administrationRemark: form.administrationRemark || '',
    coordIDate: form.coordIDate || '',
    coordIRemark: form.coordIRemark || '',
    coordIIDate: form.coordIIDate || '',
    coordIIRemark: form.coordIIRemark || '',
    dgllDate: form.dgllDate || '',
    dgllRemark: form.dgllRemark || '',
    developmentDate: form.developmentDate || '',
    developmentRemark: form.developmentRemark || '',
    financeDate: form.financeDate || '',
    financeRemark: form.financeRemark || '',
    sagarmalaDate: form.sagarmalaDate || '',
    sagarmalaRemark: form.sagarmalaRemark || '',
    extensionTimeSoughtDate: form.extensionTimeSoughtDate || '',
    extensionTimeSoughtRemark: form.extensionTimeSoughtRemark || '',
    replySendDate: form.replySendDate || '',
    replySendRemark: form.replySendRemark || '',
    debatedInParliamentDate: form.debatedInParliamentDate || '',
    debatedInParliamentRemark: form.debatedInParliamentRemark || '',
    impReportFurnishedDate: form.impReportFurnishedDate || '',
    impReportFurnishedRemark: form.impReportFurnishedRemark || '',
    matterDisposedDate: form.matterDisposedDate || '',
    matterDisposedRemark: form.matterDisposedRemark || '',
    parlia_stage_id: computeStageId(form, stages),
    userID: userId,
  };

  return payload;
}

export function emptyIssueForm() {
  const form = {
    wing: '',
    division: '',
    parliamentarySubject: '',
    fileNumber: '',
    issueType: '',
    remarks: '',
    assuranceNumber: '',
    parliamentHouse: '',
    nameOfMP: '',
    extensionSought: '',
    wings: [],
  };

  STAGE_REMARK_FIELDS.forEach(({ dateKey, remarkKey }) => {
    form[dateKey] = '';
    form[remarkKey] = '';
  });

  return form;
}

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
