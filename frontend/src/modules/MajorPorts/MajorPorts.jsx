import PortsDashboardView from './PortsDashboardView';
import PortsInputFormView from './PortsInputFormView';
import PortsReportsView from './PortsReportsView';

export { PortsDashboardView, PortsInputFormView, PortsReportsView };

/**
 * Legacy subView switch kept for any callers that still use the barrel default.
 * App routes render the named views directly (Dashboard / Input Form).
 */
export default function MajorPorts({ subView, triggerNotification }) {
  if (subView === 'dashboard') return <PortsDashboardView />;
  if (subView === 'input') return <PortsInputFormView triggerNotification={triggerNotification} />;
  if (subView === 'reports') return <PortsReportsView />;
  return <PortsDashboardView />;
}
