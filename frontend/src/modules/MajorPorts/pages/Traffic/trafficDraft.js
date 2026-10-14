const DRAFT_STORAGE_KEY = 'sagarmanthan.majorPorts.traffic.wizard.draft';

// Draft is keyed by organisation so ports don't overwrite each other
export function loadTrafficWizardDraft(organisationId) {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.formData) return null;
    if (
      organisationId != null &&
      parsed.formData.organisationId != null &&
      String(parsed.formData.organisationId) !== String(organisationId)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveTrafficWizardDraft(formData) {
  const payload = {
    savedAt: new Date().toISOString(),
    formData,
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearTrafficWizardDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}
