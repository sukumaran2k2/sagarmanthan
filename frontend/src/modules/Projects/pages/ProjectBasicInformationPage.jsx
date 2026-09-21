import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProjectStageWorkbench from '../components/ProjectStageWorkbench';
import {
  createProjectBasicInformation,
  submitPlanningSanctioning,
  submitProjectCompletion,
  submitUnderImplementationMilestones,
  submitUnderImplementationProgress,
  submitUnderTenderingCostAndCalls,
  submitUnderTenderingDates,
  updateProjectBasicInformation,
  fetchEditProjectData,
  fetchProjectDocuments,
  uploadProjectDocuments,
  deleteProjectDocumentByName,
  downloadProjectDocumentFile,
  fetchPlanningCheckPoints,
  fetchUnderTenderingCheckPoints,
  fetchUnderImplementationCheckPoints,
} from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import { getProjectIdentity, mapProjectBasicInfoPayload } from '../utils/mapProject';
import {
  formatFileSize,
  getProjectDocumentTypeConfig,
  getProjectDocumentTypeLabel,
} from '../utils/constants';
import {
  isImplementationCheckpointMet,
  isPlanningCheckpointMet,
  isTenderingCheckpointMet,
  nextActiveStageAfterSave,
  stageLabelFromStageId,
} from '../utils/stageProgress';

function toBit(value) {
  return value ? 1 : 0;
}

function computePlanningStageId(payload) {
  if (payload.chairmanApprovalDate) return '3';
  if (payload.adminApprovalApprovalDate) return '11';
  if (payload.approvedBySfcDate) return '10';
  if (payload.responseToComRecApprovalDate) return '9';
  if (payload.ciruculatedImcApprovalDate) return '8';
  if (payload.ifwConcurrenceApprovalDate) return '7';
  if (payload.daConcurrenceApprovalDate) return '6';
  if (payload.submittedMinistryDate) return '5';
  if (payload.dprActualDate) return '2';
  if (payload.preFeasibilityActualDate) return '1';
  return '0';
}

function normalizeDocumentName(docOrName) {
  if (!docOrName) return '';
  if (typeof docOrName === 'string') return docOrName;
  return docOrName.document_name || docOrName.name || docOrName.file_name || '';
}

function buildEditDataFromRow(row, previous = null) {
  const stageId = row?.current_project_stage_id;
  const stageLabel =
    stageLabelFromStageId(stageId) ||
    previous?.stage ||
    previous?.raw?.stage_name ||
    'Project Initiated';

  return {
    ...(previous || {}),
    stage: stageLabel,
    selectedStage: stageLabel,
    raw: {
      ...(previous?.raw || {}),
      ...row,
      stage_name: stageLabel,
      project_stage: stageLabel,
      current_project_stage_id: stageId,
    },
  };
}

export default function ProjectBasicInformationPage({
  initialData,
  onBack,
  onSuccess,
  notify,
  forceReadOnly = false,
}) {
  const permissions = useProjectsPermissions();
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [editData, setEditData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [stageRefreshKey, setStageRefreshKey] = useState(0);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    documentName: '',
  });
  const [deletingDocument, setDeletingDocument] = useState(false);

  const identity = getProjectIdentity(editData || initialData || {});
  const isUpdateMode = Boolean(
    identity.projectID &&
      (initialData?.id || editData?.id || editData?.projectId || editData?.raw?.project_id)
  );
  const canSubmit =
    !forceReadOnly &&
    !permissions.isViewOnlyAdmin &&
    ((isUpdateMode && permissions.canEdit) || (!isUpdateMode && permissions.canAdd));
  const readOnly = forceReadOnly || permissions.isViewOnlyAdmin || !canSubmit;

  const [activeStage, setActiveStage] = useState(() => {
    if (!isUpdateMode) return 'basic';
    const s =
      initialData?.stage ||
      initialData?.selectedStage ||
      initialData?.raw?.stage_name ||
      initialData?.raw?.project_stage ||
      '';
    const text = String(s).toLowerCase();
    if (text.includes('complete')) return 'completion';
    if (text.includes('implement')) return 'implementation';
    if (text.includes('tender')) return 'tendering';
    if (text.includes('planning') || text.includes('sanction')) return 'planning';
    return 'basic';
  });

  const loadDocuments = async (customProjectID, customSubProjectID) => {
    const pId =
      customProjectID ||
      identity.projectID ||
      editData?.projectId ||
      initialData?.project_id ||
      initialData?.projectId;
    const sId =
      customSubProjectID ||
      identity.subProjectID ||
      editData?.subProjectId ||
      initialData?.sub_project_id ||
      initialData?.subProjectId ||
      '-1';

    if (!pId) {
      setDocuments([]);
      return;
    }

    setDocumentsLoading(true);
    try {
      const response = await fetchProjectDocuments(pId, sId);
      setDocuments(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setDocuments([]);
      notify?.('Failed to load project documents.', 'error');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadEditData = async () => {
      if (!isUpdateMode) {
        setEditData(initialData || null);
        setDocuments([]);
        return;
      }

      setHydrating(true);
      try {
        const [response, docsResponse] = await Promise.all([
          fetchEditProjectData(identity.projectID, identity.subProjectID),
          fetchProjectDocuments(identity.projectID, identity.subProjectID),
        ]);

        const row = Array.isArray(response?.data) ? response.data[0] : null;
        const docs = Array.isArray(docsResponse?.data) ? docsResponse.data : [];

        if (!mounted) return;

        if (row) {
          setEditData(buildEditDataFromRow(row, initialData || null));
        } else {
          setEditData(initialData || null);
        }

        setDocuments(docs);
      } catch (error) {
        console.error(error);
        if (!mounted) return;
        setEditData(initialData || null);
        setDocuments([]);
        notify?.('Failed to load full project details for update. Showing available data.', 'error');
      } finally {
        if (mounted) setHydrating(false);
      }
    };

    loadEditData();

    return () => {
      mounted = false;
    };
  }, [initialData, isUpdateMode, identity.projectID, identity.subProjectID, notify]);

  const handleUploadDocuments = async ({ folderName, files, projectID: customProjectId, subProjectID: customSubProjectId } = {}) => {
    if (!permissions.canEdit && !permissions.canCreate) {
      notify?.('You do not have permission to upload documents.', 'error');
      return;
    }
    const targetProjectId = customProjectId || identity.projectID || editData?.projectId;
    const targetSubProjectId = customSubProjectId || identity.subProjectID || editData?.subProjectId || '-1';

    if (!targetProjectId) {
      notify?.('Please fill in Project ID in General Details first before uploading.', 'error');
      return;
    }

    if (!folderName || !Array.isArray(files) || !files.length) {
      notify?.('Please choose document type and at least one file.', 'error');
      return;
    }

    const docConfig = getProjectDocumentTypeConfig(folderName);
    if (!docConfig) {
      notify?.('Invalid document type. Allowed: Project PPT, PERT Chart, Project Images.', 'error');
      return;
    }

    if (files.length > docConfig.maxFiles) {
      notify?.(
        `${docConfig.label}: maximum ${docConfig.maxFiles} files can be uploaded at once.`,
        'error'
      );
      return;
    }

    for (const file of files) {
      const name = String(file?.name || '').toLowerCase();
      const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
      const allowedByExt = docConfig.acceptExtensions.includes(ext);
      const allowedByMime =
        folderName === 'project_images'
          ? String(file?.type || '').startsWith('image/')
          : folderName === 'project_ppt'
            ? ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(
                String(file?.type || '')
              ) || allowedByExt
            : String(file?.type || '') === 'application/pdf' || allowedByExt;

      if (!allowedByExt && !allowedByMime) {
        notify?.(
          `${docConfig.label}: invalid file "${file.name}". Allowed: ${docConfig.acceptExtensions.join(', ')}`,
          'error'
        );
        return;
      }

      if (file.size > docConfig.maxBytes) {
        notify?.(
          `${docConfig.label}: "${file.name}" (${formatFileSize(file.size)}) exceeds 20 MB limit.`,
          'error'
        );
        return;
      }
    }

    setUploadingDocuments(true);
    try {
      const formData = new FormData();
      formData.append('projectID', targetProjectId);
      formData.append('subProjectID', targetSubProjectId);
      formData.append('folderName', folderName);
      files.forEach((file) => formData.append('projectDocument', file));

      await uploadProjectDocuments(formData);
      notify?.(`${getProjectDocumentTypeLabel(folderName)} uploaded successfully.`, 'success');
      await loadDocuments(targetProjectId, targetSubProjectId);
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to upload project document(s).', 'error');
    } finally {
      setUploadingDocuments(false);
    }
  };

  useEffect(() => {
    if (!deleteConfirmModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [deleteConfirmModal.open]);

  const closeDeleteConfirmModal = () => {
    if (deletingDocument) return;
    setDeleteConfirmModal({ open: false, documentName: '' });
  };

  const handleDeleteDocument = (docOrName) => {
    if (!permissions.canEdit || readOnly) {
      notify?.('You do not have permission to delete documents.', 'error');
      return;
    }
    const documentName = normalizeDocumentName(docOrName);
    if (!documentName) return;
    setDeleteConfirmModal({ open: true, documentName });
  };

  const confirmDeleteDocument = async () => {
    const documentName = deleteConfirmModal.documentName;
    if (!documentName) {
      closeDeleteConfirmModal();
      return;
    }

    try {
      setDeletingDocument(true);
      await deleteProjectDocumentByName(identity.projectID, identity.subProjectID, documentName);
      notify?.('Project document deleted successfully.', 'success');
      setDeleteConfirmModal({ open: false, documentName: '' });
      await loadDocuments();
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to delete project document.', 'error');
    } finally {
      setDeletingDocument(false);
    }
  };

  const handleDownloadDocument = async (docOrName) => {
    const documentName = normalizeDocumentName(docOrName);
    if (!documentName) {
      notify?.('Document name is missing.', 'error');
      return;
    }
    try {
      const response = await downloadProjectDocumentFile(
        identity.projectID,
        identity.subProjectID,
        documentName
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', documentName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      notify?.('Failed to download project document.', 'error');
    }
  };

  const handleSubmit = async (formData) => {
    if (!canSubmit) {
      notify?.('You do not have permission to submit project details.', 'error');
      return false;
    }

    setSaving(true);
    try {
      const payload = mapProjectBasicInfoPayload(formData, {
        userId: permissions.userId,
        organisationId: permissions.organisationId,
        wingId: permissions.wingId,
        isUpdate: isUpdateMode,
        initialData: editData || initialData,
      });

      let res;
      if (isUpdateMode) {
        res = await updateProjectBasicInformation(payload);
        notify?.('Project basic information updated successfully.', 'success');
      } else {
        res = await createProjectBasicInformation(payload);
        notify?.('Project basic information saved successfully.', 'success');
      }

      const createdId =
        String(res?.data?.project_id || res?.data?.projectID || res?.data?.id || payload.projectID || '').trim();
      const createdSubId =
        res?.data?.sub_project_id != null
          ? String(res.data.sub_project_id)
          : res?.data?.subProjectID != null
            ? String(res.data.subProjectID)
            : res?.data?.subProjectId != null
              ? String(res.data.subProjectId)
              : payload.subProjectID
                ? String(payload.subProjectID)
                : '-1';

      setEditData((prev) => ({
        ...(prev || {}),
        id: prev?.id || createdId,
        projectId: createdId,
        subProjectId: createdSubId,
        projectName: formData.projectName,
        stage:
          prev?.stage && !String(prev.stage).toLowerCase().includes('initiated')
            ? prev.stage
            : 'Planning & Sanctioning',
        raw: {
          ...(prev?.raw || {}),
          ...(res?.data || {}),
          project_id: createdId,
          sub_project_id: createdSubId,
          project_name: formData.projectName,
          stage_name: prev?.raw?.stage_name || 'Planning & Sanctioning',
        },
      }));

      if (!isUpdateMode && formData.pendingFilesByType) {
        let uploadSuccessCount = 0;
        let uploadErrorCount = 0;
        for (const [folderName, files] of Object.entries(formData.pendingFilesByType)) {
          if (Array.isArray(files) && files.length > 0) {
            try {
              const uploadFd = new FormData();
              uploadFd.append('projectID', createdId);
              uploadFd.append('subProjectID', String(createdSubId || '-1'));
              uploadFd.append('folderName', folderName);
              files.forEach((file) => uploadFd.append('projectDocument', file));
              await uploadProjectDocuments(uploadFd);
              uploadSuccessCount += files.length;
            } catch (err) {
              console.error(`Failed to upload ${folderName}:`, err);
              uploadErrorCount++;
            }
          }
        }
        if (uploadSuccessCount > 0) {
          notify?.(`${uploadSuccessCount} document(s) uploaded successfully.`, 'success');
        }
        if (uploadErrorCount > 0) {
          notify?.('Some document(s) failed to upload. You can re-upload them in edit mode.', 'warning');
        }
        await loadDocuments(createdId, createdSubId);
      }

      if (isUpdateMode) {
        setActiveStage('planning');
      } else {
        onSuccess?.();
      }
      return true;
    } catch (error) {
      console.error(error);
      notify?.(
        error?.response?.data?.message || 'Unable to save project details. Please try again.',
        'error'
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const refreshProjectStageState = async (projectID, subProjectID) => {
    const response = await fetchEditProjectData(projectID, subProjectID);
    const row = Array.isArray(response?.data) ? response.data[0] : null;
    if (!row) {
      return { stageId: null };
    }
    setEditData((prev) => buildEditDataFromRow(row, prev || initialData));
    return { stageId: row.current_project_stage_id };
  };

  const syncWorkbenchAfterStageSave = async (savedStageId, projectID, subProjectID) => {
    setStageRefreshKey((prev) => prev + 1);

    let planningUnlocked = false;
    let tenderingUnlocked = false;
    let implementationUnlocked = false;

    try {
      if (savedStageId === 'planning') {
        const res = await fetchPlanningCheckPoints(projectID, subProjectID);
        planningUnlocked = isPlanningCheckpointMet(res?.data);
      } else if (savedStageId === 'tendering') {
        const res = await fetchUnderTenderingCheckPoints(projectID, subProjectID);
        tenderingUnlocked = isTenderingCheckpointMet(res?.data);
      } else if (savedStageId === 'implementation') {
        const res = await fetchUnderImplementationCheckPoints(projectID, subProjectID);
        implementationUnlocked = isImplementationCheckpointMet(res?.data);
      } else if (savedStageId === 'completion') {
        implementationUnlocked = true;
      }
    } catch (error) {
      console.error(error);
    }

    await refreshProjectStageState(projectID, subProjectID);

    const nextTab = nextActiveStageAfterSave(savedStageId, {
      planningUnlocked,
      tenderingUnlocked,
      implementationUnlocked,
    });
    setActiveStage(nextTab);

    if (savedStageId === 'planning' && !planningUnlocked) {
      notify?.(
        'Planning saved. Complete Admin/Chairman approval with sanctioned cost to unlock Under Tendering.',
        'info'
      );
    } else if (savedStageId === 'tendering' && !tenderingUnlocked) {
      notify?.(
        'Tendering saved. Contract signed actual date and awarded project cost are required to unlock Under Implementation.',
        'info'
      );
    } else if (savedStageId === 'implementation' && !implementationUnlocked) {
      notify?.(
        'Implementation saved. Final milestone actual end date is required to unlock Completion.',
        'info'
      );
    }

    return nextTab;
  };

  const handleStageSubmit = async (stageId, stageData = {}) => {
    if (!canSubmit) {
      notify?.('You do not have permission to submit stage details.', 'error');
      return false;
    }

    const liveIdentity = getProjectIdentity(editData || initialData || {});
    if (!liveIdentity.projectID) {
      notify?.('Please save basic information first before submitting stage details.', 'error');
      return false;
    }

    setSaving(true);
    try {
      if (stageId === 'planning') {
        const rows = stageData.rows || [];
        const byKey = (key) => rows.find((row) => row.key === key) || {};
        const hasAnyPlanningDate = rows.some(
          (row) => String(row?.actualDate || '').trim() && !row?.notApplicable
        );
        if (!hasAnyPlanningDate) {
          notify?.('Enter at least one planning actual date before submit.', 'error');
          return false;
        }

        const payload = {
          projectID: liveIdentity.projectID,
          subProjectID: liveIdentity.subProjectID,
          isDprNotApplicable: toBit(byKey('dpr').notApplicable),
          dprActualDate: byKey('dpr').actualDate || '',
          dprRemarks: byKey('dpr').remarks || '',
          isPreFeasibilityNotApplicable: toBit(byKey('preFeasibility').notApplicable),
          preFeasibilityActualDate: byKey('preFeasibility').actualDate || '',
          preFeasibilityRemarks: byKey('preFeasibility').remarks || '',
          submittedMinistryDate: byKey('submittedToMinistry').actualDate || '',
          submittedMinistryRemarks: byKey('submittedToMinistry').remarks || '',
          daConcurrenceApprovalDate: byKey('daConcurrence').actualDate || '',
          daConcurrenceRemarks: byKey('daConcurrence').remarks || '',
          ifwConcurrenceApprovalDate: byKey('ifwConcurrence').actualDate || '',
          ifwConcurrenceRemarks: byKey('ifwConcurrence').remarks || '',
          ciruculatedImcApprovalDate: byKey('imcApproval').actualDate || '',
          ciruculatedImcApprovalRemarks: byKey('imcApproval').remarks || '',
          responseToComRecApprovalDate: byKey('responseComments').actualDate || '',
          responseToComRecRemarks: byKey('responseComments').remarks || '',
          approvedBySfcDate: byKey('approvedSfc').actualDate || '',
          approvedBySfcRemarks: byKey('approvedSfc').remarks || '',
          adminApprovalApprovalDate: byKey('adminApproval').actualDate || '',
          adminApprovalRemarks: byKey('adminApproval').remarks || '',
          adminSanctionCost: byKey('adminApproval').sanctionedCost || '',
          chairmanApprovalDate: byKey('chairmanApproval').actualDate || '',
          chairmanRemarks: byKey('chairmanApproval').remarks || '',
          chairmanSanctionCost: byKey('chairmanApproval').sanctionedCost || '',
        };

        payload.selectedStage = computePlanningStageId(payload);
        await submitPlanningSanctioning(payload);
        notify?.('Planning & Sanctioning details updated successfully.', 'success');
        await syncWorkbenchAfterStageSave('planning', liveIdentity.projectID, liveIdentity.subProjectID);
        return true;
      }

      if (stageId === 'tendering') {
        const rows = stageData.rows || [];
        const byId = (id) => rows.find((row) => Number(row.id) === id) || {};

        await submitUnderTenderingDates({
          projectID: liveIdentity.projectID,
          subProjectID: liveIdentity.subProjectID,
          userID: permissions.userId,
          onNominationBasisAwarded: stageData.onNominationBasisAwarded || '0',

          isTechSancNotApplicable: toBit(byId(1).notApplicable),
          techSanctionPlannedDate: byId(1).plannedDate || '',
          techSanctionActualDate: byId(1).actualDate || '',

          isTenderDocAppNotApplicable: toBit(byId(2).notApplicable),
          tenderDocumentPlannedDate: byId(2).plannedDate || '',
          tenderDocumentActualDate: byId(2).actualDate || '',

          isTenderNotIssNotApplicable: toBit(byId(3).notApplicable),
          tenderNoticePlannedDate: byId(3).plannedDate || '',
          tenderNoticeActualDate: byId(3).actualDate || '',

          isTechEvaCompNotApplicable: toBit(byId(4).notApplicable),
          techEvalPlannedDate: byId(4).plannedDate || '',
          techEvalActualDate: byId(4).actualDate || '',

          isFinEvaCompNotApplicable: toBit(byId(5).notApplicable),
          finEvalPlannedDate: byId(5).plannedDate || '',
          finEvalActualDate: byId(5).actualDate || '',

          isSocAuthorityNotApplicable: toBit(byId(6).notApplicable),
          sanctCompetentAuthPlannedDate: byId(6).plannedDate || '',
          sanctCompetentAuthActualDate: byId(6).actualDate || '',

          workAwardedPlannedDate: byId(7).plannedDate || '',
          workAwardedActualDate: byId(7).actualDate || '',

          contractSignedPlannedDate: byId(8).plannedDate || '',
          contractSignedActualDate: byId(8).actualDate || '',
        });

        await submitUnderTenderingCostAndCalls({
          projectID: liveIdentity.projectID,
          subProjectID: liveIdentity.subProjectID,
          techSanctionCost: byId(1).cost || '',
          awardProjectCost: byId(7).cost || '',
          noOfTenderCalls: stageData.numberOfTenderCalls || '',
          onNominationBasisAwarded: stageData.onNominationBasisAwarded || '0',
          foundationLaid:
            stageData.foundationLaid === 'yes'
              ? 1
              : stageData.foundationLaid === 'no'
                ? 0
                : null,
          foundationLaidDate: stageData.foundationLaidDate || '',
          foundationTentativeDate: stageData.foundationTentativeDate || '',
        });

        notify?.('Under Tendering details updated successfully.', 'success');
        await syncWorkbenchAfterStageSave('tendering', liveIdentity.projectID, liveIdentity.subProjectID);
        return true;
      }

      if (stageId === 'implementation') {
        if (stageData.progressValue !== '' && stageData.progressValue != null) {
          const progressNum = Number(stageData.progressValue);
          if (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
            notify?.('Physical progress must be between 0 and 100.', 'error');
            return false;
          }
        }

        if (stageData.progressDate || stageData.progressValue) {
          await submitUnderImplementationProgress({
            projectID: liveIdentity.projectID,
            subProjectID: liveIdentity.subProjectID,
            userID: permissions.userId,
            progressDate: stageData.progressDate || '',
            progressValue: stageData.progressValue || '0',
          });
        }

        const activityTab = (stageData.milestones || []).map((m) => ({
          activityPlannedDate: m.targetedEndDate || '',
          activityActualDate: m.actualEndDate || '',
          activityID: m.activityId || '',
          delayReason: stageData.delayReason || '',
        }));

        await submitUnderImplementationMilestones({
          projectID: liveIdentity.projectID,
          subProjectID: liveIdentity.subProjectID,
          userID: permissions.userId,
          activityTab,
          inaugurationValue:
            stageData.inauguration === 'yes' ? 1 : stageData.inauguration === 'no' ? 0 : null,
          inaugurationDate: stageData.inaugurationDate || '',
          tentativeInaugurationDate: stageData.tentativeInaugurationDate || '',
        });

        notify?.('Under Implementation details updated successfully.', 'success');
        await syncWorkbenchAfterStageSave(
          'implementation',
          liveIdentity.projectID,
          liveIdentity.subProjectID
        );
        return true;
      }

      if (stageId === 'completion') {
        if (!String(stageData.actualCompletionDate || '').trim()) {
          notify?.('Please enter a actual completion date', 'error');
          return false;
        }
        if (!String(stageData.closureCost || '').trim()) {
          notify?.('Please enter a closure cost ', 'error');
          return false;
        }
        const closureCost = Number(stageData.closureCost);
        if (Number.isNaN(closureCost)) {
          notify?.('Please enter a closure cost ', 'error');
          return false;
        }
        await submitProjectCompletion({
          projectID: liveIdentity.projectID,
          subProjectID: liveIdentity.subProjectID,
          actualCompletionDate: stageData.actualCompletionDate || '',
          closureCost: stageData.closureCost || '',
          projectStageID: 14,
        });
        notify?.('Project completion details updated successfully.', 'success');
        await syncWorkbenchAfterStageSave('completion', liveIdentity.projectID, liveIdentity.subProjectID);
        onSuccess?.();
        return true;
      }

      notify?.('Unsupported stage payload.', 'error');
      return false;
    } catch (error) {
      console.error(error);
      notify?.(
        error?.response?.data?.message || 'Unable to save stage details. Please try again.',
        'error'
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const liveIdentity = getProjectIdentity(editData || initialData || {});
  const workbenchKey = isUpdateMode
    ? `${liveIdentity.projectID}-${liveIdentity.subProjectID}-${
        editData?.raw?.latest_revised_target_completion_date || ''
      }-${editData?.raw?.project_intiated_date || ''}-${editData?.raw?.target_completion_date || ''}`
    : 'new-project-basic-info';

  return (
    <>
      <ProjectStageWorkbench
        key={workbenchKey}
        initialData={editData || initialData}
        activeStage={activeStage}
        onActiveStageChange={setActiveStage}
        canSubmit={canSubmit}
        readOnly={readOnly}
        loading={saving || hydrating}
        onBack={onBack}
        onSubmit={handleSubmit}
        onSubmitStage={handleStageSubmit}
        notify={notify}
        stageRefreshKey={stageRefreshKey}
        documentRows={documents}
        documentsLoading={documentsLoading}
        uploadingDocuments={uploadingDocuments}
        onUploadDocuments={handleUploadDocuments}
        onDeleteDocument={handleDeleteDocument}
        onDownloadDocument={handleDownloadDocument}
        outlayProps={
          isUpdateMode
            ? {
                projectID: liveIdentity.projectID,
                subProjectID: liveIdentity.subProjectID,
                canSubmit,
                readOnly,
                notify,
              }
            : null
        }
      />

      {deleteConfirmModal.open
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Delete Document</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete this document?
                  </p>
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteConfirmModal}
                    disabled={deletingDocument}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteDocument}
                    disabled={deletingDocument}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deletingDocument ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
