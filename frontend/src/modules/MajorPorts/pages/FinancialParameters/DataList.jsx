import SectionPlaceholder from '../../components/SectionPlaceholder';
import { MAJOR_PORTS_SECTIONS } from '../../constants';

const SECTION = MAJOR_PORTS_SECTIONS.find((s) => s.id === 'financialParameters');

export default function FinancialParametersDataList({ onSwitchTab }) {
  return <SectionPlaceholder section={SECTION} mode="list" onSwitchTab={onSwitchTab} />;
}
