import { PERMS } from './constants';

export function emptyCrudDraft(modules = []) {
  const draft = {};
  modules.forEach((m) => {
    draft[m.id] = { create: false, read: false, update: false, delete: false };
  });
  return draft;
}

export function draftFromCrudRows(modules = [], rows = []) {
  const byModule = {};
  rows.forEach((row) => {
    byModule[row.module_id] = {
      create: !!row.can_create,
      read: !!row.can_read,
      update: !!row.can_update,
      delete: !!row.can_delete,
    };
  });

  const draft = emptyCrudDraft(modules);
  modules.forEach((m) => {
    if (byModule[m.id]) draft[m.id] = byModule[m.id];
  });
  return draft;
}

export function permissionsFromDraft(modules = [], draft = {}) {
  return modules.map((m) => ({
    moduleId: m.id,
    canCreate: !!draft[m.id]?.create,
    canRead: !!draft[m.id]?.read,
    canUpdate: !!draft[m.id]?.update,
    canDelete: !!draft[m.id]?.delete,
  }));
}

/** Create/Update/Delete imply Read; clearing Read clears the other three. */
export function toggleCrudPerm(draft, moduleId, perm, value) {
  const current = draft[moduleId] || {
    create: false,
    read: false,
    update: false,
    delete: false,
  };
  const next = { ...current, [perm]: value };

  if (value && (perm === 'create' || perm === 'update' || perm === 'delete')) {
    next.read = true;
  }
  if (!value && perm === 'read') {
    next.create = false;
    next.update = false;
    next.delete = false;
  }

  return { ...draft, [moduleId]: next };
}

export function setRowCrudPerms(draft, moduleId, value) {
  return {
    ...draft,
    [moduleId]: {
      create: value,
      read: value,
      update: value,
      delete: value,
    },
  };
}

export function setAllCrudPerms(modules, draft, value) {
  const next = { ...draft };
  modules.forEach((m) => {
    next[m.id] = {
      create: value,
      read: value,
      update: value,
      delete: value,
    };
  });
  return next;
}

export function isRowFullyGranted(row) {
  return PERMS.every((p) => row?.[p] === true);
}
