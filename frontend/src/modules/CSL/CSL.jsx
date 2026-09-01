import { useState, useEffect } from 'react';
import { Ship, Anchor, Truck, Gauge, Hammer, Wrench, Construction } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import VesselsBuiltDataList from './pages/VesselsBuilt/DataList';
import VesselsBuiltInputForm from './pages/VesselsBuilt/InputForm';
import VesselsBuiltReports from './pages/VesselsBuilt/Reports';
import ShipBuildingOrdersDataList from './pages/ShipBuildingOrders/DataList';
import ShipBuildingOrdersInputForm from './pages/ShipBuildingOrders/InputForm';
import ShipBuildingOrdersReports from './pages/ShipBuildingOrders/Reports';
import ShipDeliveryPerformanceDataList from './pages/ShipDeliveryPerformance/DataList';
import ShipDeliveryPerformanceInputForm from './pages/ShipDeliveryPerformance/InputForm';
import ShipDeliveryPerformanceReports from './pages/ShipDeliveryPerformance/Reports';
import CapacityUtilizationDataList from './pages/CapacityUtilization/DataList';
import CapacityUtilizationInputForm from './pages/CapacityUtilization/InputForm';
import CapacityUtilizationReports from './pages/CapacityUtilization/Reports';
import FabricationOfSteelsDataList from './pages/FabricationOfSteels/DataList';
import FabricationOfSteelsInputForm from './pages/FabricationOfSteels/InputForm';
import FabricationOfSteelsReports from './pages/FabricationOfSteels/Reports';
import ShipsRepairedDataList from './pages/ShipsRepaired/DataList';
import ShipsRepairedInputForm from './pages/ShipsRepaired/InputForm';
import ShipsRepairedReports from './pages/ShipsRepaired/Reports';
import { useCSLPermissions } from './hooks/useCSLPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchVesselsBuilt, deleteVesselsBuilt,
  fetchShipBuildingOrders, deleteShipBuildingOrders,
  fetchShipDeliveryPerformance, deleteShipDeliveryPerformance,
  fetchCapacityUtilization, deleteCapacityUtilization,
  fetchFabricationOfSteels, deleteFabricationOfSteels,
  fetchShipsRepaired, deleteShipsRepaired,
} from './api';

// The 6 real CSL KPI sections (K-4.1 through K-4.6), confirmed against the
// legacy site's cslMenuList.html and the backend's fully-routed CRUD +
// report endpoints for all 6. Built out one section at a time -- only
// Vessels Built (K-4.1) is wired up so far.
const SECTIONS = [
  { id: 'vesselsBuilt', code: 'K-4.1', label: 'CSL - Vessels Built', icon: Ship, ready: true },
  { id: 'shipBuildingOrders', code: 'K-4.2', label: 'CSL - Ship Building Orders', icon: Anchor, ready: true },
  { id: 'shipDelivery', code: 'K-4.3', label: 'CSL - Ship Delivery Performance', icon: Truck, ready: true },
  { id: 'capacityUtilization', code: 'K-4.4', label: 'CSL - Capacity Utilization', icon: Gauge, ready: true },
  { id: 'fabricationOfSteels', code: 'K-4.5', label: 'CSL - Fabrication of Steels', icon: Hammer, ready: true },
  { id: 'shipsRepaired', code: 'K-4.6', label: 'CSL - Ships Repaired', icon: Wrench, ready: true },
];

export default function CSLView({ activeTab, triggerNotification }) {
  const permissions = useCSLPermissions();
  const { canAdd, canEdit, canView, canRemove } = permissions;

  const [activeSection, setActiveSection] = useState('vesselsBuilt');
  const [activeSubTab, setActiveSubTab] = useState(activeTab === 'CSL Reports' ? 'report' : 'list');

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  if (canView) tabs.push({ id: 'report', label: 'Reports' });

  const fetchData = () => {
    if (activeSection === 'vesselsBuilt') {
      setLoading(true);
      fetchVesselsBuilt(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Vessels Built data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'shipBuildingOrders') {
      setLoading(true);
      fetchShipBuildingOrders(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Ship Building Orders data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'shipDelivery') {
      setLoading(true);
      fetchShipDeliveryPerformance(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Ship Delivery Performance data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'capacityUtilization') {
      setLoading(true);
      fetchCapacityUtilization(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Capacity Utilization data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'fabricationOfSteels') {
      setLoading(true);
      fetchFabricationOfSteels(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Fabrication of Steels data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'shipsRepaired') {
      setLoading(true);
      fetchShipsRepaired(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Ships Repaired data:', err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    setEditData(null);
    setActiveSubTab('list');
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
    if (activeSection === 'vesselsBuilt') {
      if (!window.confirm(`Delete the Vessels Built entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteVesselsBuilt(row.csl_vessel_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Vessels Built entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Vessels Built entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'shipBuildingOrders') {
      if (!window.confirm(`Delete the Ship Building Orders entry for ${row.financial_year} ${row.financial_quater}? This cannot be undone.`)) return;
      deleteShipBuildingOrders(row.csl_shipbuilding_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Ship Building Orders entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Ship Building Orders entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'shipDelivery') {
      if (!window.confirm(`Delete the Ship Delivery Performance entry for ${row.financial_year} ${row.financial_quater}? This cannot be undone.`)) return;
      deleteShipDeliveryPerformance(row.csl_shipdelivery_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Ship Delivery Performance entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Ship Delivery Performance entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'capacityUtilization') {
      if (!window.confirm(`Delete the Capacity Utilization entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteCapacityUtilization(row.csl_capacity_utilization_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Capacity Utilization entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Capacity Utilization entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'fabricationOfSteels') {
      if (!window.confirm(`Delete the Fabrication of Steels entry for ${row.financial_year}${row.month ? ' ' + row.month : ''}? This cannot be undone.`)) return;
      deleteFabricationOfSteels(row.csl_fabrication_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Fabrication of Steels entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Fabrication of Steels entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'shipsRepaired') {
      if (!window.confirm(`Delete the Ships Repaired entry for ${row.financial_year} ${row.financial_quater}? This cannot be undone.`)) return;
      deleteShipsRepaired(row.csl_ships_reapired_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Ships Repaired entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Ships Repaired entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    }
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - CSL" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col gap-5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
              KPI - CSL
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Cochin Shipyard Limited -- track KPI data across all sections.
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mt-2">
        {!currentSection.ready ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currentSection.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This section is coming soon.</p>
          </div>
        ) : activeSection === 'vesselsBuilt' ? (
          activeSubTab === 'report' ? (
            <VesselsBuiltReports />
          ) : activeSubTab === 'add' ? (
            <VesselsBuiltInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <VesselsBuiltDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'shipBuildingOrders' ? (
          activeSubTab === 'report' ? (
            <ShipBuildingOrdersReports />
          ) : activeSubTab === 'add' ? (
            <ShipBuildingOrdersInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <ShipBuildingOrdersDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'shipDelivery' ? (
          activeSubTab === 'report' ? (
            <ShipDeliveryPerformanceReports />
          ) : activeSubTab === 'add' ? (
            <ShipDeliveryPerformanceInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <ShipDeliveryPerformanceDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'capacityUtilization' ? (
          activeSubTab === 'report' ? (
            <CapacityUtilizationReports />
          ) : activeSubTab === 'add' ? (
            <CapacityUtilizationInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <CapacityUtilizationDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'fabricationOfSteels' ? (
          activeSubTab === 'report' ? (
            <FabricationOfSteelsReports />
          ) : activeSubTab === 'add' ? (
            <FabricationOfSteelsInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <FabricationOfSteelsDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'shipsRepaired' ? (
          activeSubTab === 'report' ? (
            <ShipsRepairedReports />
          ) : activeSubTab === 'add' ? (
            <ShipsRepairedInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <ShipsRepairedDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
