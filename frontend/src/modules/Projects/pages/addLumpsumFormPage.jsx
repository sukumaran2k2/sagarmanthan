import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';
import { createLumpSum, updateLumpSum, fetchLumpSumProjectList, fetchLumpSumData, deleteLumpSumActivity,} from '../api';
import { useSearchParams } from 'react-router-dom';

const blockInvalidKeys = (e) => {
  if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
};

const newRow = (projectName = '', data = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

  lumpsumId: data.lumpsum_activity_id ?? '',

  projectName: data.project_name ?? projectName,
  activityName: data.activity_name ?? '',
  activityCost: data.activity_cost ?? '',
  expenditureDate: toInputDate(data.activity_date),
});

function toInputDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


function getInitialState(initialData) {
  if (!initialData) {
    return {
      projectId: '',
      rows: [newRow()],
    };
  }

  const raw = initialData.raw || initialData;

  return {
    projectId: String(
      raw.project_id ?? raw.projectID ?? initialData.projectId ?? ''
    ),
    rows: [newRow(
      raw.project_name ?? initialData.projectName ?? '',
      raw
    )],
  };
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

/**
 * Props
 * - initialData: edit panna row (optional). Edit mode la single activity mattum.
 * - projectOptions: [{ value, label }] Project List dropdown ku
 * - onSave: async ({ projectId, isEdit, id, rows }) => void  (API call inga)
 * - notify, onBack, onSuccess
 */
export default function LumpsumFormPage({
  initialData = null,
  notify,
  onBack,
  onSuccess,
}) {
  // const isEditMode = Boolean(initialData);

  // const initial = useMemo(
  //   () => getInitialState(initialData),
  //   [initialData]
  // );

  // const [projectId, setProjectId] = useState(initial.projectId);
  // const [rows, setRows] = useState(initial.rows);
  const [searchParams] = useSearchParams();

  const routeProjectId = searchParams.get('projectId');

  const rawInitialData = initialData?.raw || initialData;

  const resolvedProjectId =
    rawInitialData?.project_id ??
    rawInitialData?.projectID ??
    initialData?.projectId ??
    routeProjectId ??
    '';

  const isEditMode = Boolean(resolvedProjectId);

  const initial = useMemo(
    () => getInitialState(initialData),
    [initialData]
  );

  const [projectId, setProjectId] = useState(
    String(resolvedProjectId || initial.projectId || '')
  );

  const [rows, setRows] = useState(initial.rows);
  const [originalFormData, setOriginalFormData] = useState(null);

  const normalizeRows = (items) =>
    items.map((row) => ({
      lumpsumId: String(row.lumpsumId ?? ''),
      projectName: String(row.projectName ?? ''),
      activityName: String(row.activityName ?? ''),
      activityCost: String(row.activityCost ?? ''),
      expenditureDate: String(row.expenditureDate ?? ''),
    }));

  const currentFormData = useMemo(
    () =>
      JSON.stringify({
        projectId: String(projectId ?? ''),
        rows: normalizeRows(rows),
      }),
    [projectId, rows]
  );

  const isFormChanged =
    originalFormData !== null &&
    currentFormData !== originalFormData;

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
    
  useEffect(() => {
    if (!isEditMode || !resolvedProjectId) return;

    let isMounted = true;

    const loadLumpSumDetails = async () => {
      try {
        const res = await fetchLumpSumData(resolvedProjectId);

        const responseData = res.data;

        const activityList = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.data)
            ? responseData.data
            : Array.isArray(responseData?.recordset)
              ? responseData.recordset
              : [];

        if (!isMounted) return;

        const projectName =
          activityList[0]?.project_name ||
          rawInitialData?.project_name ||
          initialData?.projectName ||
          '';

        setProjectId(String(resolvedProjectId));

        if (activityList.length > 0) {
          const loadedRows = activityList.map((item) =>
            newRow(projectName, item)
          );

          setRows(loadedRows);

          setOriginalFormData(
            JSON.stringify({
              projectId: String(resolvedProjectId),
              rows: normalizeRows(loadedRows),
            })
          );
        } else if (rawInitialData?.lumpsum_activity_id) {
          const loadedRows = [newRow(projectName, rawInitialData)];

          setRows(loadedRows);

          setOriginalFormData(
            JSON.stringify({
              projectId: String(resolvedProjectId),
              rows: normalizeRows(loadedRows),
            })
          );
        } else {
          setRows([]);
          setOriginalFormData(
            JSON.stringify({
              projectId: String(resolvedProjectId),
              rows: [],
            })
          );
        }
      } catch (error) {
        console.error(
          'Failed to load LumpSum activity details:',
          error.response?.data || error
        );

        if (isMounted) {
          notify?.('Unable to load LumpSum details.', 'error');
        }
      }
    };

    loadLumpSumDetails();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, resolvedProjectId]);

  useEffect(() => {
    // if (isEditMode) return;

    let isMounted = true;

    const loadProjects = async () => {
      setLoadingProjects(true);

      try {
        const res = await fetchLumpSumProjectList();
        const responseData = res.data;

        const projectList = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.data)
            ? responseData.data
            : Array.isArray(responseData?.projects)
              ? responseData.projects
              : Array.isArray(responseData?.recordset)
                ? responseData.recordset
                : [];

        const formattedProjects = projectList
          .map((project) => {
            const id =
              project.value ??
              project.projectId ??
              project.project_id ??
              project.projectID ??
              project.id;

            const name =
              project.projectName ??
              project.project_name ??
              project.projectTitle ??
              project.project_title ??
              project.name;

            return {
              value: id,
              label: project.label ?? (name ? `${id} - ${name}` : ''),
              projectName: name,
            };
          })
          .filter((project) => project.value != null && project.label);

        if (isMounted) {
          setProjectOptions(formattedProjects);
        }
      } catch (error) {
        console.error(
          'Failed to load LumpSum projects:',
          error.response?.data || error
        );

        if (isMounted) {
          notify?.(
            error.response?.data?.message ||
              error.response?.data?.error ||
              'Unable to load project list.',
            'error'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingProjects(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const getInputClass = (hasErr, extra = '') =>
    `w-full rounded-xl border ${
      hasErr
        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
        : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 dark:bg-slate-800'
    } px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none transition disabled:opacity-60 ${extra}`;

  const totalCost = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const n = Number(row.activityCost);
        return Number.isFinite(n) && n > 0 ? sum + n : sum;
      }, 0),
    [rows]
  );

  const handleProjectChange = (value) => {
    setProjectId(value);

    const selected = projectOptions.find(
      (opt) => String(opt.value) === String(value)
    );

    const name = selected?.projectName || '';

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        projectName: name,
      }))
    );

    setErrors((prev) => {
      const next = { ...prev };

      Object.keys(next).forEach((key) => {
        if (key.endsWith('.projectName')) {
          delete next[key];
        }
      });

      delete next.projectId;

      return next;
    });
  };
  
  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    const key = `${index}.${field}`;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const addRow = () => { const selected = projectOptions.find((opt) => String(opt.value) === String(projectId));

    setRows((prev) => [
      ...prev,
      newRow(selected?.projectName || ''),
    ]);
  };

  const removeRow = async (index) => {
    if (saving) return;

    if (rows.length <= 1) {
      notify?.('At least one activity is required.', 'error');
      return;
    }

    const row = rows[index];

    // Newly added row: DB-ல் இன்னும் save ஆகவில்லை.
    if (!row.lumpsumId) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      setErrors({});
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this activity? This will permanently remove it from the database.'
    );

    if (!confirmDelete) return;

    try {
      setSaving(true);

      await deleteLumpSumActivity(row.lumpsumId);

      setRows((prev) => prev.filter((_, i) => i !== index));
      setErrors({});

      notify?.('Activity deleted successfully.', 'success');
    } catch (error) {
      console.error(
        'Failed to delete LumpSum activity:',
        error.response?.data || error
      );

      notify?.(
        error.response?.data?.message ||
          'Failed to delete activity.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    const next = {};
    rows.forEach((row, i) => {
      if (!String(row.projectName || '').trim()) {
        next[`${i}.projectName`] = 'Project name is required';
      }
      if (!String(row.activityName || '').trim()) {
        next[`${i}.activityName`] = 'Activity name is required';
      }
      const cost = Number(row.activityCost);
      if (
        row.activityCost === '' ||
        String(row.activityCost).includes('-') ||
        !Number.isFinite(cost) ||
        cost <= 0
      ) {
        next[`${i}.activityCost`] = 'Activity cost must be greater than 0 (no negative values)';
      }
      if (!row.expenditureDate) {
        next[`${i}.expenditureDate`] = 'Date of expenditure is required';
      }
    });
    setErrors(next);
    return next;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (saving) return;
if (isEditMode) {
  setOriginalFormData(
    JSON.stringify({
      projectId: String(projectId),
      rows: normalizeRows(rows),
    })
  );
}
  const nextErrors = validate();

  if (Object.keys(nextErrors).length > 0) {
    setErrors(nextErrors);
    notify?.('Please fill all required fields.', 'error');
    return;
  }

  if (!projectId) {
    notify?.('Please select a project.', 'error');
    return;
  }

  if (isEditMode && String(projectId) !== String(resolvedProjectId)) {
    notify?.('Project Id cannot be changed in Update mode.', 'error');
    return;
  }
  setSaving(true);

  try {
    const payload = {
      projectID: String(projectId).trim(),

      lumpSumDataTab: rows.map((row) => ({
        lumpsumId: row.lumpsumId || null,

        projectName: row.projectName.trim(),

        activityName: row.activityName.trim(),

        activityCost: Number(row.activityCost),

        activityDate: row.expenditureDate,
      })),
    };

    console.log('LumpSum Submit Payload:', payload);

    let response;

    if (isEditMode) {
      response = await updateLumpSum(payload);
    } else {
      response = await createLumpSum(payload);
    }

    notify?.(
      isEditMode
        ? 'LumpSum updated successfully.'
        : 'LumpSum added successfully.',
      'success'
    );

    onSuccess?.(response);

  }  catch (error) {
    console.error("LumpSum save error:", error);
    console.error("Backend response:", error.response?.data);
    console.error("HTTP status:", error.response?.status);

    notify?.(
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Failed to save LumpSum.',
      'error'
    );
} finally {
    setSaving(false);
  }
};


return (
  <div className="module-form-card !p-0 overflow-hidden">
    {/* Header Banner */}
    <div className="module-form-banner">
      <div>
        <h3 className="module-form-banner-title">
          {isEditMode ? 'Update LumpSum' : 'Add LumpSum'}
        </h3>
        <p className="module-form-banner-subtext">
          Activity-wise LumpSum Expenditure (₹ in Cr)
        </p>
      </div>
    </div>

    <form
      id="lumpsum-form"
      onSubmit={handleSubmit}
      className="p-6 space-y-6"
      noValidate
    >
      {/* Project Details */}
      <div className="space-y-5">
        <h4 className="module-form-section-title">
          Project Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="module-form-label">
              Project List <span className="text-red-500">*</span>
            </label>

            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isEditMode || loadingProjects || saving}
              className={`module-form-select ${
                errors.projectId ? '!border-red-500' : ''
              }`}
            >
              <option value="">
                {loadingProjects
                  ? 'Loading Projects...'
                  : '-- Select Project --'}
              </option>

              {projectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {!loadingProjects && projectOptions.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">
                No active projects available.
              </p>
            )}

            <FieldError error={errors.projectId} />
          </div>
        </div>
      </div>

      {/* Activity Details */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="module-form-section-title">
            Activity Details
          </h4>

          {/* {!isEditMode && ( */}
            <button
              type="button"
              onClick={addRow}
              disabled={saving || (isEditMode && !isFormChanged)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Activity
            </button>
          {/* )} */}
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="bg-[#0f417a] text-white select-none">
                <tr>
                  <th className="py-3 px-4 font-bold w-16 text-center">
                    S.No
                  </th>
                  <th className="py-3 px-4 font-bold">
                    Project Name <span className="text-red-300">*</span>
                  </th>
                  <th className="py-3 px-4 font-bold">
                    Activity Name <span className="text-red-300">*</span>
                  </th>
                  <th className="py-3 px-4 font-bold w-40">
                    Cost (₹ Cr) <span className="text-red-300">*</span>
                  </th>
                  <th className="py-3 px-4 font-bold w-44">
                    Date of Expenditure <span className="text-red-300">*</span>
                  </th>
                  {/* {!isEditMode && ( */}
                    <th className="py-3 px-4 font-bold w-24 text-center">
                      Action
                    </th>
                  {/* )} */}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="py-3 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4 min-w-[220px]">
                      <input
                        type="text"
                        value={row.projectName}
                        onChange={(e) =>
                          updateRow(index, 'projectName', e.target.value)
                        }
                        placeholder="Project Name"
                        className={`module-form-input ${
                          errors[`${index}.projectName`]
                            ? '!border-red-500'
                            : ''
                        }`}
                      />
                      <FieldError error={errors[`${index}.projectName`]} />
                    </td>

                    <td className="py-3 px-4 min-w-[220px]">
                      <input
                        type="text"
                        value={row.activityName}
                        onChange={(e) =>
                          updateRow(index, 'activityName', e.target.value)
                        }
                        placeholder="Enter Activity Name"
                        className={`module-form-input ${
                          errors[`${index}.activityName`]
                            ? '!border-red-500'
                            : ''
                        }`}
                      />
                      <FieldError error={errors[`${index}.activityName`]} />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.activityCost}
                        onChange={(e) =>
                          updateRow(
                            index,
                            'activityCost',
                            e.target.value.replace(/-/g, '')
                          )
                        }
                        onKeyDown={blockInvalidKeys}
                        placeholder="0.00"
                        className={`module-form-input ${
                          errors[`${index}.activityCost`]
                            ? '!border-red-500'
                            : ''
                        }`}
                      />
                      <FieldError error={errors[`${index}.activityCost`]} />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="date"
                        value={row.expenditureDate}
                        onChange={(e) =>
                          updateRow(index, 'expenditureDate', e.target.value)
                        }
                        className={`module-form-input ${
                          errors[`${index}.expenditureDate`]
                            ? '!border-red-500'
                            : ''
                        }`}
                      />
                      <FieldError error={errors[`${index}.expenditureDate`]} />
                    </td>

                    {/* {!isEditMode && ( */}
                      <td className="py-3 px-4 text-center">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={saving}
                            title="Remove Activity"
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg transition cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    {/* )} */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Cost */}
        {rows.length > 1 && (
          <div className="flex justify-end">
            <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
              <span className="text-xs font-bold text-[#0f417a] dark:text-blue-300">
                Total Expenditure: ₹ {totalCost.toFixed(2)} Cr
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs text-rose-500 font-bold italic">
          * Asterisks marked with red are mandatory fields
        </span>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Exit
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>
              {saving
                ? 'Submitting...'
                : isEditMode
                  ? 'Update LumpSum'
                  : 'Submit LumpSum'}
            </span>
          </button>
        </div>
      </div>
    </form>
  </div>
);



  // return (
  //   <form
  //     id="lumpsum-form"
  //     onSubmit={handleSubmit}
  //     className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100"
  //   >
  //     <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
  //       <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
  //         <Layers className="h-5 w-5" />
  //       </div>
  //       <div>
  //         <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
  //           {isEditMode ? 'Edit LumpSum' : 'Add LumpSum'}
  //         </h3>
  //         <p className="text-xs text-slate-500">
  //           Select a project and record activity-wise LumpSum expenditure
  //         </p>
  //       </div>
  //     </div>

  //     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //         <div>
  //           <Label required>Project List</Label>

  //           <select
  //               value={projectId}
  //               onChange={(e) => handleProjectChange(e.target.value)}
  //               disabled={isEditMode || loadingProjects || saving}
  //               className={getInputClass(Boolean(errors.projectId))}
  //           >
  //               <option value="">
  //                   {loadingProjects
  //                       ? 'Loading Projects...'
  //                       : '--Select Project List--'}
  //               </option>

  //               {projectOptions.map((opt) => (
  //                   <option
  //                       key={opt.value}
  //                       value={opt.value}
  //                   >
  //                       {opt.label}
  //                   </option>
  //               ))}
  //           </select>

  //           {!loadingProjects && projectOptions.length === 0 && (
  //               <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">
  //                   No active projects available.
  //               </p>
  //           )}

  //           <FieldError error={errors.projectId} />
  //       </div>
  //     </div>

 

  //     {/* Activity Details Section */}
  //     <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">

  //       {/* Header */}
  //       <div className="flex items-center justify-between gap-3">
  //         <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
  //           Activity Details (₹ in Cr)
  //         </h4>

  //         {!isEditMode && (
  //           <button
  //             type="button"
  //             onClick={addRow}
  //             className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer whitespace-nowrap"
  //           >
  //             <Plus className="h-3.5 w-3.5" />
  //             Add Activity
  //           </button>
  //         )}
  //       </div>

  //       {/* Activity Rows */}
  //       <div className="space-y-3">
  //         {rows.map((row, index) => (
  //           <div
  //             key={row.id}
  //             className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3"
  //           >
  //             <div className="flex items-end gap-3 min-w-0">

  //               {/* Activity Number */}
  //               <div className="flex items-center gap-2 shrink-0 pb-2">
  //                 <span className="w-6 h-6 rounded-full bg-[#0f417a] text-white text-[10px] font-black flex items-center justify-center dark:bg-blue-500">
  //                   {index + 1}
  //                 </span>

  //                 <span className="text-[10px] font-black uppercase tracking-wide text-[#0f417a] dark:text-blue-300 whitespace-nowrap">
  //                   Activity {index + 1}
  //                 </span>
  //               </div>

  //               {/* Project Name */}
  //               <div className="flex-1 min-w-0">
  //                 <Label required>Project Name</Label>
  //                 <input
  //                   type="text"
  //                   value={row.projectName}
  //                   onChange={(e) =>
  //                     updateRow(index, 'projectName', e.target.value)
  //                   }
  //                   placeholder="Project Name"
  //                   className={getInputClass(
  //                     errors[`${index}.projectName`]
  //                   )}
  //                 />
  //                 <FieldError error={errors[`${index}.projectName`]} />
  //               </div>

  //               {/* Activity Name */}
  //               <div className="flex-1 min-w-0">
  //                 <Label required>Activity Name</Label>
  //                 <input
  //                   type="text"
  //                   value={row.activityName}
  //                   onChange={(e) =>
  //                     updateRow(index, 'activityName', e.target.value)
  //                   }
  //                   placeholder="Activity Name"
  //                   className={getInputClass(
  //                     errors[`${index}.activityName`]
  //                   )}
  //                 />
  //                 <FieldError error={errors[`${index}.activityName`]} />
  //               </div>

  //               {/* Activity Cost */}
  //               <div className="w-32 shrink-0">
  //                 <Label required>Cost (Cr.)</Label>
  //                 <input
  //                   type="number"
  //                   step="0.01"
  //                   min="0"
  //                   value={row.activityCost}
  //                   onChange={(e) =>
  //                     updateRow(
  //                       index,
  //                       'activityCost',
  //                       e.target.value.replace(/-/g, '')
  //                     )
  //                   }
  //                   onKeyDown={blockInvalidKeys}
  //                   placeholder="0.00"
  //                   className={getInputClass(
  //                     errors[`${index}.activityCost`]
  //                   )}
  //                 />
  //                 <FieldError error={errors[`${index}.activityCost`]} />
  //               </div>

  //               {/* Expenditure Date */}
  //               <div className="w-40 shrink-0">
  //                 <Label required>Date of Expenditure</Label>
  //                 <input
  //                   type="date"
  //                   value={row.expenditureDate}
  //                   onChange={(e) =>
  //                     updateRow(index, 'expenditureDate', e.target.value)
  //                   }
  //                   className={getInputClass(
  //                     errors[`${index}.expenditureDate`]
  //                   )}
  //                 />
  //                 <FieldError error={errors[`${index}.expenditureDate`]} />
  //               </div>

  //               {/* Remove Activity */}
  //               {!isEditMode && rows.length > 1 && (
  //                 <button
  //                   type="button"
  //                   onClick={() => removeRow(index)}
  //                   className="inline-flex items-center gap-1 px-2 py-2 mb-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-bold transition cursor-pointer shrink-0"
  //                   title="Remove activity"
  //                 >
  //                   <Trash2 className="h-3.5 w-3.5" />
  //                   Remove
  //                 </button>
  //               )}

  //             </div>
  //           </div>
  //         ))}
  //       </div>

  //       {/* Total Cost */}
  //       {rows.length > 1 && (
  //         <div className="flex justify-end">
  //           <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1">
  //             Total: ₹ {totalCost.toFixed(2)} Cr
  //           </span>
  //         </div>
  //       )}

  //     </div>

  //     <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
  //       <button
  //         type="button"
  //         onClick={onBack}
  //         disabled={saving}
  //         className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60"
  //       >
  //         <ChevronLeft className="h-4 w-4" />
  //         <span>Back to Data List</span>
  //       </button>

  //       <button
  //         type="submit"
  //         disabled={saving}
  //         className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60"
  //       >
  //         <Save className="h-4 w-4" />
  //         <span>
  //           {saving ? 'Saving...' : isEditMode ? 'Save & Update LumpSum' : 'Submit LumpSum'}
  //         </span>
  //       </button>
  //     </div>
  //   </form>
  // );
}
