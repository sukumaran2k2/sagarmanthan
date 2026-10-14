import TrafficWizardForm from './components/TrafficWizardForm';

export default function TrafficInputForm({
  onSwitchTab,
  onSuccess,
  triggerNotification,
}) {
  return (
    <TrafficWizardForm
      mode="add"
      onBack={onSwitchTab ? () => onSwitchTab('list') : undefined}
      onSuccess={() => {
        onSuccess?.();
        onSwitchTab?.('list');
      }}
      triggerNotification={triggerNotification}
    />
  );
}
