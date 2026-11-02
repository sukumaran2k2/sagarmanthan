import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmOverlay from '../../../components/ConfirmOverlay';
import { useHRPermissions } from '../hooks/useHRPermissions';
import { getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import {
  HrModal,
  ContextStrip,
  SectionTitle,
  FormRow,
  DateInput,
  SelectInput,
  RadioGroup,
  ModalButtons,
  MandatoryHint,
  Note,
} from './HrFormControls';
import {
  ACTIVITY,
  SEPARATION_REASONS,
  SVRS_REASON,
  activityOptionsFor,
  buildActivityPayload,
  emptyActivityForm,
  formatDisplayDate,
  isDeputationStartRequired,
  isRetirementReason,
  separationConfirmMessage,
  shiftDate,
  toDateInput,
  validateActivityForm,
} from '../utils/hrAdministration';
import {
  fetchHrPostsByDepartment,
  fetchPromotionVacantPostCode,
  updateEmployeeActivity,
} from '../api';

const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

export default function EmployeeActivityModal({
  isOpen,
  employee,
  organisations = [],
  departments = [],
  orgId,
  onClose,
  onSuccess,
  notify,
}) {
  const { userId } = useHRPermissions();
  // The parent mounts this modal per employee (keyed), so state starts fresh each time.
  const [form, setForm] = useState(() => ({
    ...emptyActivityForm(),
    retirementDate: toDateInput(employee?.emp_dor),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postCodes, setPostCodes] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const methodOfAppointment = employee?.method_of_appointment;
  const activityOptions = useMemo(() => activityOptionsFor(methodOfAppointment), [methodOfAppointment]);
  const startRequired = isDeputationStartRequired(methodOfAppointment);

  const orgOptions = useMemo(
    () => organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })),
    [organisations]
  );
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
      label: `${c.post_code} - Date of vacancy (${formatDisplayDate(c.date_of_arise_in_vacancy)})`,
    })),
    [postCodes]
  );
  const selectedCode = postCodes.find((c) => c.post_code === form.promotionPostCode);
  const postCodeReady = Number(selectedCode?.flag) === 1;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadPosts = async (departmentId) => {
    setPosts([]);
    setPostCodes([]);
    if (!departmentId) return;
    setLoadingPosts(true);
    try {
      setPosts(asList(await fetchHrPostsByDepartment(departmentId, orgId)));
    } catch {
      notify?.(HR_TOASTS.postsLoadFailed());
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadPostCodes = async (postId) => {
    setPostCodes([]);
    if (!postId) return;
    setLoadingCodes(true);
    try {
      const rows = asList(await fetchPromotionVacantPostCode(postId));
      setPostCodes(rows);
      if (!rows.length) {
        notify?.(HR_TOASTS.vacantPostsNotReady());
      }
    } catch {
      notify?.(HR_TOASTS.postsLoadFailed());
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleActivityChange = (value) => {
    setErrors({});
    setPosts([]);
    setPostCodes([]);
    const next = { ...emptyActivityForm(), activityName: value, retirementDate: toDateInput(employee?.emp_dor) };
    // Promotion starts from the employee's current department, as in the legacy page.
    if (value === ACTIVITY.PROMOTION && employee?.department_id) {
      next.promotionDepartment = String(employee.department_id);
      loadPosts(employee.department_id);
    }
    setForm(next);
  };

  const handleSeparationReason = (value) => {
    setForm((prev) => ({
      ...prev,
      separationReason: value,
      separationDate: '',
      deleteSVRS: '',
      retirementDate: toDateInput(employee?.emp_dor),
    }));
    setErrors({});
  };

  const save = async () => {
    if (!userId) {
      notify?.(HR_TOASTS.sessionExpired());
      return;
    }
    setSaving(true);
    try {
      const payload = buildActivityPayload(form, {
        employeeId: employee.employee_id,
        empMasterId: employee.emp_master_id,
        organisationID: orgId,
        userID: userId,
      });
      const res = await updateEmployeeActivity(payload);
      if (res.status === 201) {
        notify?.(HR_TOASTS.employeeActivityUpdated(employee.emp_name));
        onSuccess?.();
        onClose?.();
      } else {
        notify?.(HR_TOASTS.employeeActivityNotRecorded());
      }
    } catch (err) {
      notify?.(HR_TOASTS.employeeActivityFailed(getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    const found = validateActivityForm(form, { methodOfAppointment, postCodeReady });
    setErrors(found);
    if (Object.keys(found).length) return;
    const message = separationConfirmMessage(form, employee?.emp_dor);
    if (message) {
      setConfirmMessage(message);
      return;
    }
    save();
  };

  const renderFields = () => {
    switch (form.activityName) {
      case ACTIVITY.DEPUTATION_OUT:
        return (
          <>
            <FormRow label="Organisation to be Deputed" required error={errors.orgToBeDeputed}>
              <SelectInput
                value={form.orgToBeDeputed}
                onChange={(v) => setField('orgToBeDeputed', v)}
                options={orgOptions}
                placeholder="Select organisation"
                error={errors.orgToBeDeputed}
              />
            </FormRow>
            <FormRow label="Deputation Start Date" required={startRequired} error={errors.deputationStartDate}>
              <DateInput
                value={form.deputationStartDate}
                onChange={(v) => setField('deputationStartDate', v)}
                error={errors.deputationStartDate}
              />
            </FormRow>
            <FormRow label="Deputation End Date" error={errors.deputationEndDate}>
              <DateInput
                value={form.deputationEndDate}
                min={shiftDate(form.deputationStartDate, 1)}
                onChange={(v) => setField('deputationEndDate', v)}
                error={errors.deputationEndDate}
              />
            </FormRow>
            <FormRow label="Date of Deputing Out" required error={errors.dateOfDeputingOut}>
              <DateInput
                value={form.dateOfDeputingOut}
                max={shiftDate(form.deputationStartDate, -1)}
                onChange={(v) => setField('dateOfDeputingOut', v)}
                error={errors.dateOfDeputingOut}
              />
            </FormRow>
          </>
        );

      case ACTIVITY.TRANSFER_OUT:
        return (
          <>
            <FormRow label="Organisation to be Transferred" required error={errors.orgToBeTransferred}>
              <SelectInput
                value={form.orgToBeTransferred}
                onChange={(v) => setField('orgToBeTransferred', v)}
                options={orgOptions}
                placeholder="Select organisation"
                error={errors.orgToBeTransferred}
              />
            </FormRow>
            <FormRow label="Date of Transfer Out" required error={errors.dateOfTransferOut}>
              <DateInput
                value={form.dateOfTransferOut}
                onChange={(v) => setField('dateOfTransferOut', v)}
                error={errors.dateOfTransferOut}
              />
            </FormRow>
          </>
        );

      case ACTIVITY.ABSORPTION:
        return (
          <div className="space-y-3">
            <FormRow label="Date of Absorption" required error={errors.absorptionDate}>
              <DateInput
                value={form.absorptionDate}
                onChange={(v) => setField('absorptionDate', v)}
                error={errors.absorptionDate}
              />
            </FormRow>
            <Note>The employee will be absorbed permanently into the deputed organisation with a newly generated Employee ID.</Note>
          </div>
        );

      case ACTIVITY.END_OF_DEPUTATION:
        return (
          <div className="space-y-3">
            <FormRow label="Date of Deputation End" required error={errors.deputationCompleteDate}>
              <DateInput
                value={form.deputationCompleteDate}
                onChange={(v) => setField('deputationCompleteDate', v)}
                error={errors.deputationCompleteDate}
              />
            </FormRow>
            <Note>The deputation period will conclude, and the post will become vacant on the subsequent day.</Note>
          </div>
        );

      case ACTIVITY.SEPARATION:
        return (
          <>
            <FormRow label="Reason for Separation" required error={errors.separationReason}>
              <SelectInput
                value={form.separationReason}
                onChange={handleSeparationReason}
                options={SEPARATION_REASONS.map((r) => ({ value: r, label: r }))}
                placeholder="Select reason"
                error={errors.separationReason}
              />
            </FormRow>
            {form.separationReason && isRetirementReason(form.separationReason) && (
              <FormRow label="Confirm the Date of Retirement" required error={errors.retirementDate}>
                <DateInput
                  value={form.retirementDate}
                  onChange={(v) => setField('retirementDate', v)}
                  error={errors.retirementDate}
                />
              </FormRow>
            )}
            {form.separationReason === SVRS_REASON && (
              <div className="space-y-2">
                <FormRow label="Do you want to delete the post?" required error={errors.deleteSVRS}>
                  <RadioGroup
                    name="deleteSVRS"
                    value={form.deleteSVRS}
                    onChange={(v) => setField('deleteSVRS', v)}
                    options={[{ value: '1', label: 'Yes, delete post' }, { value: '0', label: 'No, retain post' }]}
                  />
                </FormRow>
                <Note>If deleted, the post is permanently removed and the sanctioned strength is reduced by one.</Note>
              </div>
            )}
            {form.separationReason && !isRetirementReason(form.separationReason) && (
              <FormRow label={`Date of ${form.separationReason}`} required error={errors.separationDate}>
                <DateInput
                  value={form.separationDate}
                  onChange={(v) => setField('separationDate', v)}
                  error={errors.separationDate}
                />
              </FormRow>
            )}
          </>
        );

      case ACTIVITY.PROMOTION:
        return (
          <>
            <FormRow label="Department" required error={errors.promotionDepartment}>
              <SelectInput
                value={form.promotionDepartment}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, promotionDepartment: v, promotionPostId: '', promotionPostCode: '' }));
                  loadPosts(v);
                }}
                options={deptOptions}
                placeholder="Select department"
                error={errors.promotionDepartment}
              />
            </FormRow>
            <FormRow label="Post Name" required error={errors.promotionPostId}>
              <SelectInput
                value={form.promotionPostId}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, promotionPostId: v, promotionPostCode: '' }));
                  loadPostCodes(v);
                }}
                options={postOptions}
                disabled={!form.promotionDepartment || loadingPosts}
                placeholder={loadingPosts ? 'Loading posts…' : 'Select post'}
                error={errors.promotionPostId}
              />
            </FormRow>
            <FormRow label="Post Code" required error={errors.promotionPostCode}>
              <SelectInput
                value={form.promotionPostCode}
                onChange={(v) => setField('promotionPostCode', v)}
                options={postCodeOptions}
                disabled={!form.promotionPostId || loadingCodes}
                placeholder={loadingCodes ? 'Loading post codes…' : 'Select post code'}
                error={errors.promotionPostCode}
              />
              {/* Early notice on choosing the code; once Save is pressed the field error says the same */}
              {selectedCode && !postCodeReady && !errors.promotionPostCode && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Vacancy activities for this post code are incomplete in Vacancy Management. Complete them before promoting.
                </p>
              )}
            </FormRow>
            <FormRow label="Employee Joining Date" required error={errors.dateOfPromotion}>
              <DateInput
                value={form.dateOfPromotion}
                onChange={(v) => setField('dateOfPromotion', v)}
                error={errors.dateOfPromotion}
              />
            </FormRow>
          </>
        );

      default:
        return null;
    }
  };

  if (!employee) return null;

  return (
    <>
      <HrModal
        isOpen={isOpen}
        title="Employee activity"
        subtitle={`${employee.emp_name || 'Employee'} · ${employee.emp_post_code || ''}`}
        onClose={onClose}
        busy={saving || Boolean(confirmMessage)}
        maxWidth="max-w-[760px]"
        footer={
          <>
            <MandatoryHint />
            <ModalButtons onCancel={onClose} onSubmit={handleSubmit} busy={saving} />
          </>
        }
      >
        <ContextStrip
          items={[
            { label: 'Employee', value: employee.emp_name },
            { label: 'Reference / personnel no.', value: employee.reference_id },
            { label: 'Current post', value: employee.post_name },
            { label: 'Method of appointment', value: methodOfAppointment },
          ]}
        />

        <FormRow label="Activity" required error={errors.activityName}>
          <SelectInput
            value={form.activityName}
            onChange={handleActivityChange}
            options={activityOptions}
            placeholder="Select activity"
            error={errors.activityName}
          />
        </FormRow>

        {form.activityName && (
          <>
            <SectionTitle>{form.activityName} details</SectionTitle>
            {renderFields()}
          </>
        )}
      </HrModal>

      <ConfirmOverlay
        isOpen={Boolean(confirmMessage)}
        title="Confirm Separation"
        description={confirmMessage}
        icon={AlertTriangle}
        iconColor="text-amber-600"
        iconBgColor="bg-amber-100"
        confirmText="Yes, continue"
        cancelText="No"
        onCancel={() => setConfirmMessage(null)}
        onConfirm={() => {
          setConfirmMessage(null);
          save();
        }}
      />
    </>
  );
}
