const DRAFT_STORAGE_KEY = 'sagarmanthan.projects.basicInfo.draft';

export function loadProjectBasicInfoDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.formData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProjectBasicInfoDraft(formData) {
  const payload = {
    savedAt: new Date().toISOString(),
    formData,
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearProjectBasicInfoDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}
