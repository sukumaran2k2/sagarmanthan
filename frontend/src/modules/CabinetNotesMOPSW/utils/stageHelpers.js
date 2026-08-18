/** Ordered stage ladder for Cabinet Notes – MoPSW (matches legacy + DB). */
export const STAGE_FIELDS = [
  {
    id: 1,
    key: 'preliDcnPrepared',
    label: 'Preliminary DCN Prepared',
    dateKey: 'preliDcnPreparedDate',
    remarkKey: 'preliDcnPreparedRemark',
  },
  {
    id: 2,
    key: 'preliDcnApproved',
    label: 'Preliminary DCN Approved by Minister',
    dateKey: 'preliDcnApprovedDate',
    remarkKey: 'preliDcnApprovedRemark',
  },
  {
    id: 3,
    key: 'circulatedForImc',
    label: 'Circulated for IMC',
    dateKey: 'circulatedForImcDate',
    remarkKey: 'circulatedForImcRemark',
  },
  {
    id: 4,
    key: 'imcCommentsRec',
    label: 'IMC Comments Received',
    dateKey: 'imcCommentsRecDate',
    remarkKey: 'imcCommentsRecRemark',
  },
  {
    id: 5,
    key: 'finalDcnPrepared',
    label: 'Final DCN to be Prepared',
    dateKey: 'finalDcnPreparedDate',
    remarkKey: 'finalDcnPreparedRemark',
  },
  {
    id: 6,
    key: 'finalDcnApproved',
    label: 'Final DCN Approved by Minister',
    dateKey: 'finalDcnApprovedDate',
    remarkKey: 'finalDcnApprovedRemark',
  },
  {
    id: 11,
    key: 'dcmbeenApproved',
    label: 'Has DCM been approved?',
    dateKey: 'dcmbeenApprovedDate',
    remarkKey: 'dcmbeenApprovedRemark',
  },
  {
    id: 7,
    key: 'advanceCopySentToPmo',
    label: 'Advance copy sent to PMO',
    dateKey: 'advanceCopySentToPmoDate',
    remarkKey: 'advanceCopySentToPmoRemark',
  },
  {
    id: 8,
    key: 'cabinetApproved',
    label: 'Cabinet Approved',
    dateKey: 'cabinetApprovedDate',
    remarkKey: 'cabinetApprovedRemark',
  },
  {
    id: 9,
    key: 'onHold',
    label: 'On hold',
    dateKey: 'onHoldDate',
    remarkKey: 'onHoldRemark',
  },
  {
    id: 10,
    key: 'completed',
    label: 'Completed',
    dateKey: 'completedDate',
    remarkKey: 'completedRemark',
  },
];

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCompletedStageName(name) {
  return normalizeText(name) === 'completed';
}

export function isCompletedCabinetNote(row = {}) {
  if (isCompletedStageName(row.status || row.mopsw_stage_name)) return true;
  const raw = row.raw || row;
  if (Number(raw.stage_id) === 10) return true;
  if (raw.completed_date) return true;
  return false;
}

export function statusNamesFromStages(stages = [], { excludeCompleted = false } = {}) {
  const seen = new Set();
  const names = [];
  stages.forEach((s) => {
    const name = String(s.mopsw_stage_name || '').trim();
    if (!name || seen.has(name)) return;
    if (excludeCompleted && isCompletedStageName(name)) return;
    seen.add(name);
    names.push(name);
  });
  return names;
}

/** Map stage column header → stage_id for report drilldown. */
export function buildStageDrilldownMap(stages = []) {
  const map = {};
  STAGE_FIELDS.forEach((s) => {
    map[s.label] = s.id;
  });
  stages.forEach((s) => {
    const name = String(s.mopsw_stage_name || '').trim();
    const id = Number(s.mopsw_stage_id);
    if (name && Number.isFinite(id)) {
      map[name] = id;
      map[normalizeText(name)] = id;
    }
  });
  map['Advance Copy Sent to PMO & Cab'] = 7;
  map['Advance Copy Sent to PMO'] = 7;
  map['Approved by Cabinet'] = 8;
  map['On Hold'] = 9;
  map['Has DCM been approved?'] = 11;
  map['DCM Been Approved'] = 11;
  map['DCM Approved'] = 11;
  STAGE_FIELDS.forEach((s) => {
    map[normalizeText(s.label)] = s.id;
  });
  return map;
}

export function lookupStageDrilldownId(stageMap = {}, ...labels) {
  for (const label of labels) {
    if (label == null || label === '') continue;
    if (stageMap[label] != null) return stageMap[label];
    const n = normalizeText(label);
    if (stageMap[n] != null) return stageMap[n];
    const hit = Object.keys(stageMap).find((k) => normalizeText(k) === n);
    if (hit) return stageMap[hit];
  }
  return null;
}

export function hasDate(value) {
  return Boolean(String(value || '').trim());
}

export function computeStageId(form) {
  for (let i = STAGE_FIELDS.length - 1; i >= 0; i--) {
    const stage = STAGE_FIELDS[i];
    if (hasDate(form[stage.dateKey])) {
      return String(stage.id);
    }
  }
  return '0';
}

export function computeUnlockedStages(form, isEdit = false) {
  const unlocked = { [STAGE_FIELDS[0].key]: true };

  for (let i = 1; i < STAGE_FIELDS.length; i++) {
    const prev = STAGE_FIELDS[i - 1];
    const curr = STAGE_FIELDS[i];
    unlocked[curr.key] = hasDate(form[prev.dateKey]);

    if (isEdit && hasDate(form[curr.dateKey])) {
      for (let j = 0; j <= i; j++) {
        unlocked[STAGE_FIELDS[j].key] = true;
      }
    }
  }

  return unlocked;
}

export function buildNotePayload(form, userId) {
  const payload = {
    subject: form.subject,
    wing: form.wing,
    division: form.division,
    remarks: form.remarks || '',
    selectedCabinetNotesStage: computeStageId(form),
    userID: userId,
  };

  STAGE_FIELDS.forEach((s) => {
    const dated = hasDate(form[s.dateKey]);
    payload[s.dateKey] = dated ? form[s.dateKey] : '';
    payload[s.remarkKey] = dated ? form[s.remarkKey] || '' : '';
  });

  if (form.mopswCabinetID) {
    payload.mopswCabinetID = form.mopswCabinetID;
  }

  return payload;
}

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function emptyForm() {
  const form = {
    mopswCabinetID: null,
    wing: '',
    division: '',
    subject: '',
    remarks: '',
  };
  STAGE_FIELDS.forEach((s) => {
    form[s.dateKey] = '';
    form[s.remarkKey] = '';
  });
  return form;
}
