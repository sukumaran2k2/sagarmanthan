import VesselsBuiltDataList from '../components/VesselsBuiltDataList';
import ShipBuildingOrdersDataList from '../components/ShipBuildingOrdersDataList';
import ShipDeliveryPerformanceDataList from '../components/ShipDeliveryPerformanceDataList';
import CapacityUtilizationDataList from '../components/CapacityUtilizationDataList';
import FabricationOfSteelsDataList from '../components/FabricationOfSteelsDataList';
import ShipsRepairedDataList from '../components/ShipsRepairedDataList';

const LIST_VIEW_REGISTRY = {
  vesselsBuilt: VesselsBuiltDataList,
  shipBuildingOrders: ShipBuildingOrdersDataList,
  shipDelivery: ShipDeliveryPerformanceDataList,
  capacityUtilization: CapacityUtilizationDataList,
  fabricationOfSteels: FabricationOfSteelsDataList,
  shipsRepaired: ShipsRepairedDataList,
};

export function resolveCSLListView(sectionId) {
  return LIST_VIEW_REGISTRY[sectionId] || null;
}

export default resolveCSLListView;
