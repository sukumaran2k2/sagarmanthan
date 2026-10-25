import VesselAvailabilityOwnShipsDataList from '../components/VesselAvailabilityOwnShipsDataList';
import TimeVoyageBulkDataList from '../components/TimeVoyageBulkDataList';
import TimeVoyageTankerDataList from '../components/TimeVoyageTankerDataList';
import TimeVoyageOffshoreDataList from '../components/TimeVoyageOffshoreDataList';
import VesselAvailabilityLinerDataList from '../components/VesselAvailabilityLinerDataList';
import VesselProcurementDataList from '../components/VesselProcurementDataList';
import VesselProcurementSecondhandDataList from '../components/VesselProcurementSecondhandDataList';
import ShipDryDockingDataList from '../components/ShipDryDockingDataList';
import RepairAndMaintenanceDataList from '../components/RepairAndMaintenanceDataList';
import SaleAndRecyclingDataList from '../components/SaleAndRecyclingDataList';
import SaleAndGreenRecyclingDataList from '../components/SaleAndGreenRecyclingDataList';
import ManningOfOwnedShipsDataList from '../components/ManningOfOwnedShipsDataList';
import ShipManagementBusinessDataList from '../components/ShipManagementBusinessDataList';

const LIST_VIEW_REGISTRY = {
  vesselAvailOwnShips: VesselAvailabilityOwnShipsDataList,
  timeVoyageBulk: TimeVoyageBulkDataList,
  timeVoyageTanker: TimeVoyageTankerDataList,
  timeVoyageOffshore: TimeVoyageOffshoreDataList,
  vesselAvailLiner: VesselAvailabilityLinerDataList,
  vesselProcurement: VesselProcurementDataList,
  secondhandVesselProcurement: VesselProcurementSecondhandDataList,
  shipDryDocking: ShipDryDockingDataList,
  repairAndMaintenance: RepairAndMaintenanceDataList,
  saleAndRecycling: SaleAndRecyclingDataList,
  saleAndGreenRecycling: SaleAndGreenRecyclingDataList,
  manningOwnedShips: ManningOfOwnedShipsDataList,
  shipManagementBusiness: ShipManagementBusinessDataList,
};

export function resolveSCIListView(sectionId) {
  return LIST_VIEW_REGISTRY[sectionId] || null;
}

export default resolveSCIListView;
