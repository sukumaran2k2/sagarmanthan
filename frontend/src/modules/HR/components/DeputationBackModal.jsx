import { useMemo, useState } from 'react';
import { useHRPermissions } from '../hooks/useHRPermissions';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import { HrModal, FormRow, DateInput, SelectInput, ModalButtons, MandatoryHint } from './HrFormControls';
import {
  DEPUTATION_BACK_ACTIVITY,
  buildDeputationBackPayload,
  formatDisplayDate,
  validateDeputationBackForm,
} from '../utils/hrAdministration';
import {
  fetchDeputationEndEmployeeDetails,
  fetchHrPostsByDepartment,
  fetchPromotionVacantPostCode,
  updateDeputationBackActivity,
} from '../api';

const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

const EMPTY_FORM = { activityName: '', departmentId: '', postId: '', postCode: '', joiningDate: '' };

// Records what happens to an employee whose deputation has ended:
// promoted into a vacant post, or brought back to their original post.
export default function DeputationBackModal({
  isOpen,
  employee,
  departments = [],
  orgId,
  onClose,
  onSuccess,
  notify,
}) {
  const { userId } = useHRPermissions();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [posts, setPosts] = useState([]);
  const [postCodes, setPostCodes] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.department_id), label: d.department_name })),
    [departments]
  );
  const postOptions = useMemo(
    () => posts.map((p) => ({ value: String(p.post_id), label: p.post_name })),
    [posts]
  );
  const postCodeOptions = useMemo(
    () => postCodes.map((c) => ({
      value: c.post_code,
      label: c.date_of_arise_in_vacancy
        ? `${c.post_code} - Date of vacancy (${formatDisplayDate(c.date_of_arise_in_vacancy)})`
        : c.post_code,
    })),
    [postCodes]
  );

  const fieldsLocked = !form.activityName || loadingDetails;

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const loadPosts = async (departmentId) => {
    if (!departmentId) return [];
    try {
      const rows = asList(await fetchHrPostsByDepartment(departmentId, orgId));
      setPosts(rows);
      return rows;
    } catch {
      notify?.(HR_TOASTS.postsLoadFailed());
      return [];
    }
  };

  const loadPostCodes = async (postId, keepCode) => {
    if (!postId) return;
    try {
      let rows = asList(await fetchPromotionVacantPostCode(postId));
      // The employee's own post code (deputation back) is not a promotion vacancy; keep it selectable.
      if (keepCode && !rows.some((r) => r.post_code === keepCode)) {
        rows = [{ post_code: keepCode }, ...rows];
      }
      setPostCodes(rows);
      if (!rows.length) {
        notify?.(HR_TOASTS.vacantPostsNotReady());
      }
    } catch {
      notify?.(HR_TOASTS.postsLoadFailed());
    }
  };

  const handleActivityChange = async (activityName) => {
    setErrors({});
    setPosts([]);
    setPostCodes([]);
    setForm({ ...EMPTY_FORM, activityName });
    if (activityName !== DEPUTATION_BACK_ACTIVITY.DEPUTATION_BACK) return;

    setLoadingDetails(true);
    try {
      const res = await fetchDeputationEndEmployeeDetails(
        employee.employee_id,
        employee.emp_master_id,
        employee.emp_reference_id
      );
      const data = res?.data || {};
      if (String(data.status || '').toUpperCase() === 'FILLED') {
        notify?.(HR_TOASTS.originalPostFilled());
        return;
      }
      const departmentId = data.emp_department_id ? String(data.emp_department_id) : '';
      const postId = data.emp_post_id ? String(data.emp_post_id) : '';
      await loadPosts(departmentId);
      await loadPostCodes(postId, data.emp_post_code);
      setForm((prev) => ({
        ...prev,
        departmentId,
        postId,
        postCode: data.emp_post_code || '',
      }));
    } catch (err) {
      console.error(err);
      notify?.(COMMON_TOASTS.loadFailed('The employee details'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async () => {
    const found = validateDeputationBackForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const departmentName = deptOptions.find((d) => d.value === form.departmentId)?.label || '';
    const postName = postOptions.find((p) => p.value === form.postId)?.label || '';
    if (!userId) {
      notify?.(HR_TOASTS.sessionExpired());
      return;
    }
    setSaving(true);
    try {
      await updateDeputationBackActivity(
        buildDeputationBackPayload(form, employee, { departmentName, postName, organisationID: orgId, userID: userId })
      );
      notify?.(HR_TOASTS.employeeActivityUpdated(employee.emp_name));
      onSuccess?.();
      onClose?.();
    } catch (err) {
      notify?.(HR_TOASTS.employeeActivityFailed(getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <HrModal
      isOpen={isOpen}
      title="Deputation ended: record activity"
      subtitle={`${employee.emp_name || 'Employee'} · ${employee.emp_reference_id || ''}`}
      onClose={onClose}
      busy={saving}
      maxWidth="max-w-[640px]"
      footer={
        <>
          <MandatoryHint />
          <ModalButtons onCancel={onClose} onSubmit={handleSubmit} busy={saving} submitDisabled={loadingDetails} />
        </>
      }
    >
      <FormRow label="Activity" required error={errors.activityName}>
        <SelectInput
          value={form.activityName}
          onChange={handleActivityChange}
          options={Object.values(DEPUTATION_BACK_ACTIVITY).map((a) => ({ value: a, label: a }))}
          placeholder="Select activity"
          error={errors.activityName}
        />
      </FormRow>

      {loadingDetails && (
        <div className="py-2 text-xs text-slate-500">
          Loading the employee's original post…
        </div>
      )}

      <FormRow label="Department" required error={errors.departmentId}>
        <SelectInput
          value={form.departmentId}
          onChange={(v) => {
            update({ departmentId: v, postId: '', postCode: '' });
            setPosts([]);
            setPostCodes([]);
            loadPosts(v);
          }}
          options={deptOptions}
          disabled={fieldsLocked}
          placeholder="Select department"
          error={errors.departmentId}
        />
      </FormRow>
      <FormRow label="Post Name" required error={errors.postId}>
        <SelectInput
          value={form.postId}
          onChange={(v) => {
            update({ postId: v, postCode: '' });
            setPostCodes([]);
            loadPostCodes(v);
          }}
          options={postOptions}
          disabled={fieldsLocked || !form.departmentId}
          placeholder="Select post"
          error={errors.postId}
        />
      </FormRow>
      <FormRow label="Post Code" required error={errors.postCode}>
        <SelectInput
          value={form.postCode}
          onChange={(v) => update({ postCode: v })}
          options={postCodeOptions}
          disabled={fieldsLocked || !form.postId}
          placeholder="Select post code"
          error={errors.postCode}
        />
      </FormRow>
      <FormRow label="Employee Joining Date" required error={errors.joiningDate}>
        <DateInput
          value={form.joiningDate}
          onChange={(v) => update({ joiningDate: v })}
          disabled={fieldsLocked}
          error={errors.joiningDate}
        />
      </FormRow>
    </HrModal>
  );
}
