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
    id: 7,
    key: 'dcmbeenApproved',
    label: 'Has DCM been approved?',
    dateKey: 'dcmbeenApprovedDate',
    remarkKey: 'dcmbeenApprovedRemark',
  },
  {
    id: 8,
    key: 'advanceCopySentToPmo',
    label: 'Advance Copy Sent to PMO & Cab',
    dateKey: 'advanceCopySentToPmoDate',
    remarkKey: 'advanceCopySentToPmoRemark',
  },
  {
    id: 9,
    key: 'cabinetApproved',
    label: 'Approved by Cabinet',
    dateKey: 'cabinetApprovedDate',
    remarkKey: 'cabinetApprovedRemark',
  },
  {
    id: 10,
    key: 'onHold',
    label: 'On Hold',
    dateKey: 'onHoldDate',
    remarkKey: 'onHoldRemark',
  },
  {
    id: 11,
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

export function statusNamesFromStages(stages = []) {
  const seen = new Set();
  const names = [];
  stages.forEach((s) => {
    const name = String(s.mopsw_stage_name || '').trim();
    if (!name || seen.has(name)) return;
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
    }
  });
  return map;
}

function isYes(value) {
  if (value === true || value === 1) return true;
  const n = String(value || '')
    .trim()
    .toLowerCase();
  return n === 'yes' || n === '1' || n === 'true';
}

function answered(yesNo, date) {
  return yesNo === 'Yes' || yesNo === 'No' || !!date;
}

/** Highest Yes stage wins (legacy addMopswCabinetNotes.html). */
export function computeStageId(form) {
  for (let i = STAGE_FIELDS.length - 1; i >= 0; i--) {
    const stage = STAGE_FIELDS[i];
    if (isYes(form[stage.key])) {
      return String(stage.id);
    }
  }
  return '0';
}

/** Which stages are unlocked based on prior Yes/No or date. */
export function computeUnlockedStages(form, isEdit = false) {
  const unlocked = { [STAGE_FIELDS[0].key]: true };

  for (let i = 1; i < STAGE_FIELDS.length; i++) {
    const prev = STAGE_FIELDS[i - 1];
    const curr = STAGE_FIELDS[i];
    const prevDone = answered(form[prev.key], form[prev.dateKey]);
    unlocked[curr.key] = prevDone;

    if (isEdit && answered(form[curr.key], form[curr.dateKey])) {
      unlocked[curr.key] = true;
      // Unlock all previous too
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
    payload[s.dateKey] = isYes(form[s.key]) ? form[s.dateKey] || '' : '';
    payload[s.remarkKey] = form[s.remarkKey] || '';
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
    form[s.key] = '';
    form[s.dateKey] = '';
    form[s.remarkKey] = '';
  });
  return form;
}
