import { PERMS } from './constants';

/** Empty CRUD draft for a list of modules: { [moduleId]: { create, read, update, delete } } */
export function emptyCrudDraft(modules = []) {
  const draft = {};
  modules.forEach((m) => {
    draft[m.id] = { create: false, read: false, update: false, delete: false };
  });
  return draft;
}

/** Map API CRUD rows onto modules → draft */
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

/** Payload rows for saveUserModuleCrud */
export function permissionsFromDraft(modules = [], draft = {}) {
  return modules.map((m) => ({
    moduleId: m.id,
    canCreate: !!draft[m.id]?.create,
    canRead: !!draft[m.id]?.read,
    canUpdate: !!draft[m.id]?.update,
    canDelete: !!draft[m.id]?.delete,
  }));
}

/**
 * Toggle one permission. Create / Update / Delete auto-enable Read.
 * Unchecking Read also clears Create / Update / Delete.
 */
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

/** Grant or revoke all CRUD flags for one module row */
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
