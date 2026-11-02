import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, Layers, RefreshCw, Save } from 'lucide-react';
import { createSubProjects, fetchSubProjectParentList } from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';

const MAX_SUB_PROJECTS = 20;

function getApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  return data?.message || data?.error || fallbackMessage;
}

function Label({ children, required = false }) {
  return (
    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1 animate-fade-in">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
      <span>{error}</span>
    </p>
  );
}

function getInputClass(hasError, extra = '') {
  return `w-full rounded-xl border ${
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 dark:bg-slate-800'
  } px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none transition ${extra}`;
}

export default function AddSubProjectPage({ notify, onBack, onSuccess }) {
  const permissions = useProjectsPermissions();
  const canSubmit = Boolean(permissions.canAdd && !permissions.isViewOnlyAdmin);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectID, setProjectID] = useState('');
  const [subProjectNames, setSubProjectNames] = useState(['']);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    const loadProjects = async () => {
      setLoading(true);
      try {
        const res = await fetchSubProjectParentList();
        if (isMounted) setProjects(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load projects for sub-project creation:', err);
        notify?.(getApiErrorMessage(err, 'Unable to load project list.'), 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [notify]);

  const selectedProject = useMemo(
    () => projects.find((row) => row.projectID === projectID) || null,
    [projects, projectID]
  );

  const setSubProjectCount = (nextCount) => {
    const count = Math.min(MAX_SUB_PROJECTS, Math.max(0, Number(nextCount) || 0));
    setSubProjectNames((prev) => Array.from({ length: count }, (_, idx) => prev[idx] || ''));
    setErrors((prev) => ({ ...prev, subProjectNum: undefined }));
  };

  const updateSubProjectName = (index, value) => {
    setSubProjectNames((prev) => prev.map((name, idx) => (idx === index ? value : name)));
    setErrors((prev) => ({ ...prev, subProjectsTab: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!projectID) {
      nextErrors.projectID = 'Please select the project';
    }
    if (subProjectNames.length < 1) {
      nextErrors.subProjectNum = `Enter between 1 and ${MAX_SUB_PROJECTS} sub-projects`;
    }

    const trimmed = subProjectNames.map((name) => name.trim());
    if (trimmed.some((name) => !name)) {
      nextErrors.subProjectsTab = 'All sub-project names are required';
    } else {
      const existing = new Set(
        (selectedProject?.subProjects || []).map((sp) => String(sp.subProjectName || '').trim().toLowerCase())
      );
      const seen = new Set();
      for (const name of trimmed) {
        const key = name.toLowerCase();
        if (seen.has(key)) {
          nextErrors.subProjectsTab = `Sub-project name "${name}" is entered more than once`;
          break;
        }
        if (existing.has(key)) {
          nextErrors.subProjectsTab = `Sub-project "${name}" already exists for this project`;
          break;
        }
        seen.add(key);
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!canSubmit) {
      notify?.('You do not have permission to add sub-projects.', 'error');
      return;
    }
    if (!validate()) {
      notify?.('Please fix the highlighted fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await createSubProjects({
        projectID,
        subProjectsTab: subProjectNames.map((name) => ({ subProjectName: name.trim() })),
        userID: permissions.userId,
      });
      const createdIds = (res?.data?.subProjects || []).map((sp) => sp.subProjectID).join(', ');
      notify?.(
        createdIds ? `Sub-project(s) ${createdIds} created successfully.` : 'Sub-project(s) created successfully.',
        'success'
      );
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create sub-projects:', err);
      notify?.(getApiErrorMessage(err, 'There was an error while creating the sub-project. Please try later.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm text-slate-800 dark:text-slate-100 animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] via-[#164e8a] to-[#0284c7] p-5 text-white select-none border-b border-white/10 rounded-t-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-white/20 text-blue-100 font-mono border border-white/15">
              New Sub-project
            </span>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
              {selectedProject ? selectedProject.projectName : 'Add Sub-projects to an Existing Project'}
            </h1>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 transition cursor-pointer backdrop-blur-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <form id="add-sub-project-form" onSubmit={handleSubmit} className="p-5 space-y-6">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
            Sub-project Details
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Label required>Project</Label>
              <select
                value={projectID}
                onChange={(e) => {
                  setProjectID(e.target.value);
                  setErrors({});
                }}
                disabled={!canSubmit || saving}
                className={getInputClass(Boolean(errors.projectID))}
              >
                <option value="">Select Project</option>
                {projects.map((row) => (
                  <option key={row.projectID} value={row.projectID}>
                    {`${row.projectID} - ${row.projectName || ''}`}
                  </option>
                ))}
              </select>
              <FieldError error={errors.projectID} />
              {projects.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                  No active projects are available for adding sub-projects.
                </p>
              ) : null}
            </div>

            {selectedProject ? (
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                <Label>Existing Sub-projects</Label>
                {selectedProject.subProjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.subProjects.map((sp) => (
                      <span
                        key={sp.subProjectID}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="font-mono text-[#0f417a] dark:text-blue-300">{sp.subProjectID}</span>
                        {' - '}
                        {sp.subProjectName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                    <span>
                      This project has no sub-projects yet. After saving, the project will be listed and updated
                      through its sub-projects.
                    </span>
                  </p>
                )}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <Label required>Number of Sub-projects</Label>
              <input
                type="number"
                min="1"
                max={MAX_SUB_PROJECTS}
                value={subProjectNames.length || ''}
                disabled={!canSubmit || saving}
                onChange={(e) => setSubProjectCount(e.target.value.replace(/-/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className={getInputClass(Boolean(errors.subProjectNum), 'md:w-40')}
              />
              <FieldError error={errors.subProjectNum} />
            </div>

            {subProjectNames.map((name, idx) => (
              <div key={`sp-${idx}`}>
                <Label required>{`Sub-project ${idx + 1} Name`}</Label>
                <input
                  type="text"
                  value={name}
                  disabled={!canSubmit || saving}
                  onChange={(e) => updateSubProjectName(idx, e.target.value)}
                  className={getInputClass(Boolean(errors.subProjectsTab) && !name.trim())}
                />
              </div>
            ))}
            {errors.subProjectsTab ? (
              <div className="md:col-span-2 -mt-3">
                <FieldError error={errors.subProjectsTab} />
              </div>
            ) : null}
          </div>
        )}

        {canSubmit && !loading ? (
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Sub-projects</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
