import { useEffect, useState } from 'react';
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
} from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import { getProjectIdentity, mapProjectBasicInfoPayload } from '../utils/mapProject';

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

export default function ProjectBasicInformationPage({
  initialData,
  onBack,
  onSuccess,
  notify,
}) {
  const permissions = useProjectsPermissions();
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [editData, setEditData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  const identity = getProjectIdentity(initialData || {});
  const isUpdateMode = Boolean(initialData?.id && identity.projectID);

  const loadDocuments = async () => {
    if (!isUpdateMode || !identity.projectID) {
      setDocuments([]);
      return;
    }

    setDocumentsLoading(true);
    try {
      const response = await fetchProjectDocuments(identity.projectID, identity.subProjectID);
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
          setEditData({
            ...(initialData || {}),
            raw: { ...(initialData?.raw || {}), ...row },
          });
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

  const handleUploadDocuments = async ({ folderName, files }) => {
    if (!isUpdateMode || !identity.projectID) {
      notify?.('Please save basic information first before uploading documents.', 'error');
      return;
    }

    if (!folderName || !Array.isArray(files) || !files.length) {
      notify?.('Please choose document type and at least one file.', 'error');
      return;
    }

    setUploadingDocuments(true);
    try {
      const formData = new FormData();
      formData.append('projectID', identity.projectID);
      formData.append('subProjectID', identity.subProjectID);
      formData.append('folderName', folderName);
      files.forEach((file) => formData.append('projectDocument', file));

      await uploadProjectDocuments(formData);
      notify?.('Project document(s) uploaded successfully.', 'success');
      await loadDocuments();
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to upload project document(s).', 'error');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleDeleteDocument = async (documentName) => {
    if (!documentName) return;
    const ok = window.confirm('Are you sure you want to delete this document?');
    if (!ok) return;

    try {
      await deleteProjectDocumentByName(identity.projectID, identity.subProjectID, documentName);
      notify?.('Project document deleted successfully.', 'success');
      await loadDocuments();
    } catch (error) {
      console.error(error);
      notify?.(error?.response?.data?.message || 'Failed to delete project document.', 'error');
    }
  };

  const handleDownloadDocument = async (documentName) => {
    try {
      const response = await downloadProjectDocumentFile(identity.projectID, identity.subProjectID, documentName);
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
    if (!permissions.canAdd && !permissions.canEdit) {
      notify?.('You do not have permission to submit project details.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = mapProjectBasicInfoPayload(formData, {
        userId: permissions.userId,
        organisationId: permissions.organisationId,
        isUpdate: isUpdateMode,
        initialData: editData || initialData,
      });

      if (isUpdateMode) {
        await updateProjectBasicInformation(payload);
        notify?.('Project basic information updated successfully.', 'success');
      } else {
        await createProjectBasicInformation(payload);
        notify?.('Project basic information saved successfully.', 'success');
      }

      onSuccess?.();
    } catch (error) {
      console.error(error);
      notify?.(
        error?.response?.data?.message || 'Unable to save project details. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStageSubmit = async (stageId, stageData = {}) => {
    if (!permissions.canAdd && !permissions.canEdit) {
      notify?.('You do not have permission to submit stage details.', 'error');
      return;
    }

    if (!identity.projectID) {
      notify?.('Please save basic information first before submitting stage details.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (stageId === 'planning') {
        const rows = stageData.rows || [];
        const byKey = (key) => rows.find((row) => row.key === key) || {};

        const payload = {
          projectID: identity.projectID,
          subProjectID: identity.subProjectID,
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
        return;
      }

      if (stageId === 'tendering') {
        const rows = stageData.rows || [];
        const byId = (id) => rows.find((row) => row.id === id) || {};

        await submitUnderTenderingDates({
          projectID: identity.projectID,
          subProjectID: identity.subProjectID,
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
          projectID: identity.projectID,
          subProjectID: identity.subProjectID,
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
        return;
      }

      if (stageId === 'implementation') {
        if (stageData.progressDate || stageData.progressValue) {
          await submitUnderImplementationProgress({
            projectID: identity.projectID,
            subProjectID: identity.subProjectID,
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
          projectID: identity.projectID,
          subProjectID: identity.subProjectID,
          userID: permissions.userId,
          activityTab,
          inaugurationValue:
            stageData.inauguration === 'yes' ? 1 : stageData.inauguration === 'no' ? 0 : null,
          inaugurationDate: stageData.inaugurationDate || '',
          tentativeInaugurationDate: stageData.tentativeInaugurationDate || '',
        });

        notify?.('Under Implementation details updated successfully.', 'success');
        return;
      }

      if (stageId === 'completion') {
        await submitProjectCompletion({
          projectID: identity.projectID,
          subProjectID: identity.subProjectID,
          actualCompletionDate: stageData.actualCompletionDate || '',
          closureCost: stageData.closureCost || '',
          projectStageID: 14,
        });
        notify?.('Project completion details updated successfully.', 'success');
        return;
      }

      notify?.('Unsupported stage payload.', 'error');
    } catch (error) {
      console.error(error);
      notify?.(
        error?.response?.data?.message || 'Unable to save stage details. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const workbenchKey = isUpdateMode
    ? `${identity.projectID}-${identity.subProjectID}-${
        editData?.raw?.latest_revised_target_completion_date || ''
      }-${editData?.raw?.project_intiated_date || ''}-${editData?.raw?.target_completion_date || ''}`
    : 'new-project-basic-info';

  return (
    <ProjectStageWorkbench
      key={workbenchKey}
      initialData={editData || initialData}
      canSubmit={permissions.canAdd || permissions.canEdit}
      readOnly={permissions.isViewOnlyAdmin}
      loading={saving || hydrating}
      onBack={onBack}
      onSubmit={handleSubmit}
      onSubmitStage={handleStageSubmit}
      basicInfoProps={{
        documentRows: documents,
        documentsLoading,
        uploadingDocuments,
        onUploadDocuments: handleUploadDocuments,
        onDeleteDocument: handleDeleteDocument,
        onDownloadDocument: handleDownloadDocument,
      }}
    />
  );
}
