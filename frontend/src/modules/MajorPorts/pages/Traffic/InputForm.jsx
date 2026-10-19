import TrafficWizardForm from './components/TrafficWizardForm';

/** Add a new traffic period, or update the one passed in editData. */
export default function TrafficInputForm({
  editData,
  commodities,
  organisationName,
  onOpenExisting,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  return (
    <TrafficWizardForm
      editData={editData}
      commodities={commodities}
      organisationName={organisationName}
      onOpenExisting={onOpenExisting}
      onBack={onBack}
      onSuccess={onSuccess}
      triggerNotification={triggerNotification}
    />
  );
}
