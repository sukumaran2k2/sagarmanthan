import PortsDashboardView from './PortsDashboardView';
import PortsInputFormView from './PortsInputFormView';
import PortsReportsView from './PortsReportsView';

export { PortsDashboardView, PortsInputFormView, PortsReportsView };
export default function MajorPorts({ subView }) {
  if (subView === 'dashboard') return <PortsDashboardView />;
  if (subView === 'input') return <PortsInputFormView />;
  if (subView === 'reports') return <PortsReportsView />;
  return <PortsDashboardView />;
}
