import SectionPlaceholder from '../../components/SectionPlaceholder';
import { MAJOR_PORTS_SECTIONS } from '../../constants';

const SECTION = MAJOR_PORTS_SECTIONS.find((s) => s.id === 'traffic');

export default function TrafficDataList({ onSwitchTab }) {
  return <SectionPlaceholder section={SECTION} mode="list" onSwitchTab={onSwitchTab} />;
}
