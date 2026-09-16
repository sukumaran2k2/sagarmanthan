import { useState, useEffect } from 'react';
import { Ship, Anchor, MapPin, Landmark, Wrench, Recycle, Users2, Building, Construction } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import VesselAvailabilityOwnShipsDataList from './pages/VesselAvailabilityOwnShips/DataList';
import VesselAvailabilityOwnShipsInputForm from './pages/VesselAvailabilityOwnShips/InputForm';
import VesselAvailabilityOwnShipsReports from './pages/VesselAvailabilityOwnShips/Reports';
import TimeVoyageBulkDataList from './pages/TimeVoyageBulk/DataList';
import TimeVoyageBulkInputForm from './pages/TimeVoyageBulk/InputForm';
import TimeVoyageBulkReports from './pages/TimeVoyageBulk/Reports';
import TimeVoyageTankerDataList from './pages/TimeVoyageTanker/DataList';
import TimeVoyageTankerInputForm from './pages/TimeVoyageTanker/InputForm';
import TimeVoyageTankerReports from './pages/TimeVoyageTanker/Reports';
import TimeVoyageOffshoreDataList from './pages/TimeVoyageOffshore/DataList';
import TimeVoyageOffshoreInputForm from './pages/TimeVoyageOffshore/InputForm';
import TimeVoyageOffshoreReports from './pages/TimeVoyageOffshore/Reports';
import VesselAvailabilityLinerDataList from './pages/VesselAvailabilityLiner/DataList';
import VesselAvailabilityLinerInputForm from './pages/VesselAvailabilityLiner/InputForm';
import VesselAvailabilityLinerReports from './pages/VesselAvailabilityLiner/Reports';
import VesselProcurementDataList from './pages/VesselProcurement/DataList';
import VesselProcurementInputForm from './pages/VesselProcurement/InputForm';
import VesselProcurementReports from './pages/VesselProcurement/Reports';
import SecondhandVesselProcurementDataList from './pages/VesselProcurementSecondhand/DataList';
import SecondhandVesselProcurementInputForm from './pages/VesselProcurementSecondhand/InputForm';
import SecondhandVesselProcurementReports from './pages/VesselProcurementSecondhand/Reports';
import ShipDryDockingDataList from './pages/ShipDryDocking/DataList';
import ShipDryDockingInputForm from './pages/ShipDryDocking/InputForm';
import ShipDryDockingReports from './pages/ShipDryDocking/Reports';
import RepairAndMaintenanceDataList from './pages/RepairAndMaintenance/DataList';
import RepairAndMaintenanceInputForm from './pages/RepairAndMaintenance/InputForm';
import RepairAndMaintenanceReports from './pages/RepairAndMaintenance/Reports';
import SaleAndRecyclingDataList from './pages/SaleAndRecycling/DataList';
import SaleAndRecyclingInputForm from './pages/SaleAndRecycling/InputForm';
import SaleAndRecyclingReports from './pages/SaleAndRecycling/Reports';
import SaleAndGreenRecyclingDataList from './pages/SaleAndGreenRecycling/DataList';
import SaleAndGreenRecyclingInputForm from './pages/SaleAndGreenRecycling/InputForm';
import SaleAndGreenRecyclingReports from './pages/SaleAndGreenRecycling/Reports';
import ManningOfOwnedShipsDataList from './pages/ManningOfOwnedShips/DataList';
import ManningOfOwnedShipsInputForm from './pages/ManningOfOwnedShips/InputForm';
import ManningOfOwnedShipsReports from './pages/ManningOfOwnedShips/Reports';
import ShipManagementBusinessDataList from './pages/ShipManagementBusiness/DataList';
import ShipManagementBusinessInputForm from './pages/ShipManagementBusiness/InputForm';
import ShipManagementBusinessReports from './pages/ShipManagementBusiness/Reports';
import { useSCIPermissions } from './hooks/useSCIPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchVesselAvailabilityOwnShips, deleteVesselAvailabilityOwnShips,
  fetchTimeVoyageBulk, deleteTimeVoyageBulk,
  fetchTimeVoyageTanker, deleteTimeVoyageTanker,
  fetchTimeVoyageOffshore, deleteTimeVoyageOffshore,
  fetchVesselAvailabilityLiner, deleteVesselAvailabilityLiner,
  fetchVesselProcurement, deleteVesselProcurement,
  fetchSecondhandVesselProcurement, deleteSecondhandVesselProcurement,
  fetchShipDryDocking, deleteShipDryDocking,
  fetchRepairAndMaintenance, deleteRepairAndMaintenance,
  fetchSaleAndRecycling, deleteSaleAndRecycling,
  fetchSaleAndGreenRecycling, deleteSaleAndGreenRecycling,
  fetchManningOfOwnedShips, deleteManningOfOwnedShips,
  fetchShipManagementBusiness, deleteShipManagementBusiness,
} from './api';

// K-6.1 (Vessel Availability/Utilization) is genuinely one umbrella topic
// with 5 sub-forms, confirmed against the legacy site's report form
// numbers (K-6.1.1 through K-6.1.5). K-6.2 through K-6.6 (Vessel
// Procurement, Ship Drydocking/Repair, Sale & Recycling, Manning, Ship
// Management Business) are separate top-level sections, not yet built.
const SECTIONS = [
  { id: 'vesselAvailOwnShips', code: 'K-6.1.1', label: 'SCI - Vessel Availability - Own Ships', icon: Ship, ready: true },
  { id: 'timeVoyageBulk', code: 'K-6.1.2', label: 'SCI - Time & Voyage Chartered - Bulk', icon: Anchor, ready: true },
  { id: 'timeVoyageTanker', code: 'K-6.1.3', label: 'SCI - Time & Voyage Chartered - Tanker', icon: Anchor, ready: true },
  { id: 'timeVoyageOffshore', code: 'K-6.1.4', label: 'SCI - Time & Voyage Chartered - Offshore', icon: Anchor, ready: true },
  { id: 'vesselAvailLiner', code: 'K-6.1.5', label: 'SCI - Vessel Availability - Liner', icon: MapPin, ready: true },
  { id: 'vesselProcurement', code: 'K-6.2.1', label: 'SCI - Vessel Procurement', icon: Landmark, ready: true },
  { id: 'secondhandVesselProcurement', code: 'K-6.2.2', label: 'SCI - Vessel Procurement - Secondhand', icon: Landmark, ready: true },
  { id: 'shipDryDocking', code: 'K-6.3.1', label: 'SCI - Ship Dry-Docking (Own Ships)', icon: Wrench, ready: true },
  { id: 'repairAndMaintenance', code: 'K-6.3.2', label: 'SCI - Repair & Maintenance Costs', icon: Wrench, ready: true },
  { id: 'saleAndRecycling', code: 'K-6.4.1', label: 'SCI - Sale & Recycling of Old Vessels', icon: Recycle, ready: true },
  { id: 'saleAndGreenRecycling', code: 'K-6.4.2', label: 'SCI - Sale & Green Recycling', icon: Recycle, ready: true },
  { id: 'manningOwnedShips', code: 'K-6.5.1', label: 'SCI - Manning of Owned Ships', icon: Users2, ready: true },
  { id: 'shipManagementBusiness', code: 'K-6.6.1', label: 'SCI - Ship Management Business', icon: Building, ready: true },
];

export default function SCIView({ activeTab, triggerNotification }) {
  const permissions = useSCIPermissions();
  const { canAdd, canEdit, canView, canRemove } = permissions;

  const VALID_SECTION_IDS = SECTIONS.map((s) => s.id);

  const getInitialStateFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const urlSection = params.get('section');
    const urlTab = params.get('tab');
    return {
      section: VALID_SECTION_IDS.includes(urlSection) ? urlSection : 'vesselAvailOwnShips',
      subTab: ['add', 'list', 'report'].includes(urlTab)
        ? urlTab
        : (activeTab === 'SCI Reports' ? 'report' : 'list'),
    };
  };

  const [activeSection, setActiveSection] = useState(() => getInitialStateFromURL().section);
  const [activeSubTab, setActiveSubTab] = useState(() => getInitialStateFromURL().subTab);

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);

  // Keep the URL's ?section=&tab= query params in sync with the current view,
  // so refreshing, bookmarking, or using browser back/forward preserves the
  // exact section and tab the user was on.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('section', activeSection);
    params.set('tab', activeSubTab);
    const newSearch = `?${params.toString()}`;
    if (window.location.search !== newSearch) {
      window.history.pushState(null, '', `${window.location.pathname}${newSearch}`);
    }
  }, [activeSection, activeSubTab]);

  // Restore state when the user navigates via the browser's back/forward buttons.
  useEffect(() => {
    const handlePopState = () => {
      const { section, subTab } = getInitialStateFromURL();
      setActiveSection(section);
      setActiveSubTab(subTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  if (canView) tabs.push({ id: 'report', label: 'Reports' });

  const fetchData = () => {
    if (activeSection === 'vesselAvailOwnShips') {
      setLoading(true);
      fetchVesselAvailabilityOwnShips(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'timeVoyageBulk') {
      setLoading(true);
      fetchTimeVoyageBulk(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'timeVoyageTanker') {
      setLoading(true);
      fetchTimeVoyageTanker(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'timeVoyageOffshore') {
      setLoading(true);
      fetchTimeVoyageOffshore(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'vesselAvailLiner') {
      setLoading(true);
      fetchVesselAvailabilityLiner(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'vesselProcurement') {
      setLoading(true);
      fetchVesselProcurement(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'secondhandVesselProcurement') {
      setLoading(true);
      fetchSecondhandVesselProcurement(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'shipDryDocking') {
      setLoading(true);
      fetchShipDryDocking(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'repairAndMaintenance') {
      setLoading(true);
      fetchRepairAndMaintenance(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'saleAndRecycling') {
      setLoading(true);
      fetchSaleAndRecycling(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'saleAndGreenRecycling') {
      setLoading(true);
      fetchSaleAndGreenRecycling(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'manningOwnedShips') {
      setLoading(true);
      fetchManningOfOwnedShips(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'shipManagementBusiness') {
      setLoading(true);
      fetchShipManagementBusiness(1)
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading data:', err))
        .finally(() => setLoading(false));
    }
  };

    useEffect(() => {
    setEditData(null);
    fetchData();
  }, [activeSection]);

  const handleEdit = (row) => {
    setEditData(row);
    setActiveSubTab('add');
  };

  const handleSuccess = () => {
    setEditData(null);
    setActiveSubTab('list');
    fetchData();
  };

  const handleDelete = (row) => {
    if (activeSection === 'vesselAvailOwnShips') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteVesselAvailabilityOwnShips(row.sci_vessel_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Vessel Availability (Own Ships) entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'timeVoyageBulk') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteTimeVoyageBulk(row.sci_time_voyage_bulk_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Time & Voyage Chartered (Bulk) entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'timeVoyageTanker') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteTimeVoyageTanker(row.sci_time_voyage_tanker_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Time & Voyage Chartered (Tanker) entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'timeVoyageOffshore') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteTimeVoyageOffshore(row.sci_time_voyage_offshore_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Time & Voyage Chartered (Offshore) entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'vesselAvailLiner') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteVesselAvailabilityLiner(row.sci_vessel_availability_bulk_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Vessel Availability (Liner) entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'vesselProcurement') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteVesselProcurement(row.sci_procurement_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Vessel Procurement entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'secondhandVesselProcurement') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteSecondhandVesselProcurement(row.sci_secondhand_procurement_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Secondhand Vessel Procurement entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'shipDryDocking') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteShipDryDocking(row.sci_ship_dry_docking_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Ship Dry-Docking entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'repairAndMaintenance') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteRepairAndMaintenance(row.sci_repair_and_maintanace_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Repair & Maintenance entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'saleAndRecycling') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteSaleAndRecycling(row.sci_sale_recycling_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Sale & Recycling of Old Vessels entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'saleAndGreenRecycling') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteSaleAndGreenRecycling(row.sci_sale_green_recycling_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Sale & Green Recycling entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'manningOwnedShips') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteManningOfOwnedShips(row.sci_manning_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Manning of Owned Ships entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    } else if (activeSection === 'shipManagementBusiness') {
      if (!window.confirm(`Delete the entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteShipManagementBusiness(row.sci_ship_management_id, getCurrentUserId())
        .then(() => { triggerNotification && triggerNotification('Ship Management Business entry deleted successfully', 'success'); fetchData(); })
        .catch((err) => { console.error('Error deleting entry:', err); triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.'); });
    }
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - SCI" />;
  }

  const renderSection = () => {
    const commonListProps = { rowData, loading, onEdit: handleEdit, onDelete: handleDelete, canEdit, canRemove };
    const commonFormProps = { editData, onBack: () => { setEditData(null); setActiveSubTab('list'); }, onSuccess: handleSuccess, triggerNotification };

    if (activeSection === 'vesselAvailOwnShips') {
      if (activeSubTab === 'report') return <VesselAvailabilityOwnShipsReports />;
      if (activeSubTab === 'add') return <VesselAvailabilityOwnShipsInputForm {...commonFormProps} />;
      return <VesselAvailabilityOwnShipsDataList {...commonListProps} />;
    }
    if (activeSection === 'timeVoyageBulk') {
      if (activeSubTab === 'report') return <TimeVoyageBulkReports />;
      if (activeSubTab === 'add') return <TimeVoyageBulkInputForm {...commonFormProps} />;
      return <TimeVoyageBulkDataList {...commonListProps} />;
    }
    if (activeSection === 'timeVoyageTanker') {
      if (activeSubTab === 'report') return <TimeVoyageTankerReports />;
      if (activeSubTab === 'add') return <TimeVoyageTankerInputForm {...commonFormProps} />;
      return <TimeVoyageTankerDataList {...commonListProps} />;
    }
    if (activeSection === 'timeVoyageOffshore') {
      if (activeSubTab === 'report') return <TimeVoyageOffshoreReports />;
      if (activeSubTab === 'add') return <TimeVoyageOffshoreInputForm {...commonFormProps} />;
      return <TimeVoyageOffshoreDataList {...commonListProps} />;
    }
    if (activeSection === 'vesselAvailLiner') {
      if (activeSubTab === 'report') return <VesselAvailabilityLinerReports />;
      if (activeSubTab === 'add') return <VesselAvailabilityLinerInputForm {...commonFormProps} />;
      return <VesselAvailabilityLinerDataList {...commonListProps} />;
    }
    if (activeSection === 'vesselProcurement') {
      if (activeSubTab === 'report') return <VesselProcurementReports />;
      if (activeSubTab === 'add') return <VesselProcurementInputForm {...commonFormProps} />;
      return <VesselProcurementDataList {...commonListProps} />;
    }
    if (activeSection === 'secondhandVesselProcurement') {
      if (activeSubTab === 'report') return <SecondhandVesselProcurementReports />;
      if (activeSubTab === 'add') return <SecondhandVesselProcurementInputForm {...commonFormProps} />;
      return <SecondhandVesselProcurementDataList {...commonListProps} />;
    }
    if (activeSection === 'shipDryDocking') {
      if (activeSubTab === 'report') return <ShipDryDockingReports />;
      if (activeSubTab === 'add') return <ShipDryDockingInputForm {...commonFormProps} />;
      return <ShipDryDockingDataList {...commonListProps} />;
    }
    if (activeSection === 'repairAndMaintenance') {
      if (activeSubTab === 'report') return <RepairAndMaintenanceReports />;
      if (activeSubTab === 'add') return <RepairAndMaintenanceInputForm {...commonFormProps} />;
      return <RepairAndMaintenanceDataList {...commonListProps} />;
    }
    if (activeSection === 'saleAndRecycling') {
      if (activeSubTab === 'report') return <SaleAndRecyclingReports />;
      if (activeSubTab === 'add') return <SaleAndRecyclingInputForm {...commonFormProps} />;
      return <SaleAndRecyclingDataList {...commonListProps} />;
    }
    if (activeSection === 'saleAndGreenRecycling') {
      if (activeSubTab === 'report') return <SaleAndGreenRecyclingReports />;
      if (activeSubTab === 'add') return <SaleAndGreenRecyclingInputForm {...commonFormProps} />;
      return <SaleAndGreenRecyclingDataList {...commonListProps} />;
    }
    if (activeSection === 'manningOwnedShips') {
      if (activeSubTab === 'report') return <ManningOfOwnedShipsReports />;
      if (activeSubTab === 'add') return <ManningOfOwnedShipsInputForm {...commonFormProps} />;
      return <ManningOfOwnedShipsDataList {...commonListProps} />;
    }
    if (activeSection === 'shipManagementBusiness') {
      if (activeSubTab === 'report') return <ShipManagementBusinessReports />;
      if (activeSubTab === 'add') return <ShipManagementBusinessInputForm {...commonFormProps} />;
      return <ShipManagementBusinessDataList {...commonListProps} />;
    }
    return null;
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col gap-5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
              KPI - SCI
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Shipping Corporation of India -- track KPI data across all sections.
            </p>
          </div>

          <InternalNavigation
            tabs={tabs}
            currentTab={activeSubTab}
            onTabChange={(tabId) => {
              setEditData(null);
              setActiveSubTab(tabId);
            }}
          />
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700" />

        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Section</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer border flex-shrink-0 ${
                    activeSection === s.id ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a]/30 dark:border-blue-500/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{s.code}</span>
                    <span className={`text-xs font-bold whitespace-nowrap ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</span>
                  </div>
                  {!s.ready && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">Soon</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">Scroll for more sections →</p>
        </div>
      </div>
<div className={(activeSubTab === 'report' || activeSubTab === 'add') ? 'mt-2' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mt-2'}>
      
        {!currentSection.ready ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currentSection.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This section is coming soon.</p>
          </div>
        ) : renderSection()}
      </div>
    </div>
  );
}
