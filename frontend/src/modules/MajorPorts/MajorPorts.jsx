import PortsDashboardView from './PortsDashboardView';
import PortsEntryAccessView from './PortsEntryAccessView';
import PortsInputFormView from './PortsInputFormView';
import PortsReportsView from './PortsReportsView';

export { PortsDashboardView, PortsEntryAccessView, PortsInputFormView, PortsReportsView };

export default function MajorPorts({ subView, triggerNotification }) {
  if (subView === 'dashboard') return <PortsDashboardView triggerNotification={triggerNotification} />;
  if (subView === 'entry-access') return <PortsEntryAccessView triggerNotification={triggerNotification} />;
  if (subView === 'input') return <PortsInputFormView triggerNotification={triggerNotification} />;
  if (subView === 'reports') return <PortsReportsView />;
  return <PortsDashboardView />;
}
