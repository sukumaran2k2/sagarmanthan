import PerformanceWizardForm from './components/PerformanceWizardForm';

/** Add a new port performance period, or update the one passed in editData. */
export default function PortPerformanceInputForm({
  editData,
  organisationName,
  onOpenExisting,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  return (
    <PerformanceWizardForm
      editData={editData}
      organisationName={organisationName}
      onOpenExisting={onOpenExisting}
      onBack={onBack}
      onSuccess={onSuccess}
      triggerNotification={triggerNotification}
    />
  );
}
