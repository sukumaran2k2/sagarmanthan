import LightHouseMasterDataList from '../components/LightHouseMasterDataList';
import VTMSIntegrationDataList from '../components/VTMSIntegrationDataList';
import NAISUptimeDataList from '../components/NAISUptimeDataList';
import NAISIntegrationDataList from '../components/NAISIntegrationDataList';
import TouristDestinationsDataList from '../components/TouristDestinationsDataList';
import FinancialPerformanceDataList from '../components/FinancialPerformanceDataList';

const LIST_VIEW_REGISTRY = {
  lightHouseMaster: LightHouseMasterDataList,
  vtmsIntegration: VTMSIntegrationDataList,
  naisUptime: NAISUptimeDataList,
  naisIntegration: NAISIntegrationDataList,
  touristDestinations: TouristDestinationsDataList,
  financialPerformance: FinancialPerformanceDataList,
};

export function resolveDGLLListView(sectionId) {
  return LIST_VIEW_REGISTRY[sectionId] || null;
}

export default resolveDGLLListView;
