import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// ---- Vessel Availability - Own Ships (K-6.1.1) ----
export function fetchVesselAvailabilityOwnShips() {
  return api.get(`/sci-Vessel-list`);
}
export function fetchVesselAvailabilityOwnShipsById(sciVesselId) {
  return api.get(`/update-sci-vessel-data/${sciVesselId}`);
}
export function createVesselAvailabilityOwnShips(payload) {
  return api.post('/add-vessel-avail-ability', payload, { validateStatus: (s) => s === 201 || s === 409 });
}
export function updateVesselAvailabilityOwnShips(payload) {
  return api.put('/sci-vessel-built-edit', payload);
}
export function fetchVesselAvailabilityOwnShipsReport() {
  return api.get('/kpi-sci-6-1-1-report');
}
export function deleteVesselAvailabilityOwnShips(sciVesselId) {
  return api.delete(`/delete-sci-vessel-availability/${sciVesselId}`);
}

// ---- Time & Voyage Chartered - Bulk (K-6.1.2) ----
export function fetchTimeVoyageBulk() {
  return api.get(`/sci-time-voyage-bulk-list`);
}
export function fetchTimeVoyageBulkById(id) {
  return api.get(`/update-sci-time-voyage-data/${id}`);
}
export function createTimeVoyageBulk(payload) {
  return api.post('/add-sci-time-voyage', payload, { validateStatus: (s) => s === 201 || s === 409 });
}
export function updateTimeVoyageBulk(payload) {
  return api.put('/sci-time-voyage-bulk-edit', payload);
}
export function fetchTimeVoyageBulkReport() {
  return api.get('/kpi-sci-6-1-2-report');
}
export function deleteTimeVoyageBulk(id) {
  return api.delete(`/delete-sci-time-voyage-bulk/${id}`);
}

// ---- Time & Voyage Chartered - Tanker (K-6.1.3) ----
export function fetchTimeVoyageTanker() {
  return api.get(`/sci-time-voyage-tanker-list`);
}
export function fetchTimeVoyageTankerById(id) {
  return api.get(`/update-sci-time-voyage-tanker-data/${id}`);
}
export function createTimeVoyageTanker(payload) {
  return api.post('/add-sci-time-voyage-tanker', payload, { validateStatus: (s) => s === 201 || s === 409 });
}
export function updateTimeVoyageTanker(payload) {
  return api.put('/sci-time-voyage-tanker-edit', payload);
}
export function fetchTimeVoyageTankerReport() {
  return api.get('/kpi-sci-6-1-3-report');
}
export function deleteTimeVoyageTanker(id) {
  return api.delete(`/delete-sci-time-voyage-tanker/${id}`);
}

// ---- Time & Voyage Chartered - Offshore (K-6.1.4) ----
export function fetchTimeVoyageOffshore() {
  return api.get(`/sci-time-voyage-offshore-list`);
}
export function fetchTimeVoyageOffshoreById(id) {
  return api.get(`/update-sci-time-voyage-offshore-data/${id}`);
}
export function createTimeVoyageOffshore(payload) {
  return api.post('/add-sci-time-voyage-offshore', payload, { validateStatus: (s) => s === 201 || s === 409 });
}
export function updateTimeVoyageOffshore(payload) {
  return api.put('/sci-time-voyage-offshore-edit', payload);
}
export function fetchTimeVoyageOffshoreReport() {
  return api.get('/kpi-sci-6-1-4-report');
}
export function deleteTimeVoyageOffshore(id) {
  return api.delete(`/delete-sci-time-voyage-offshore/${id}`);
}

// ---- Vessel Availability - Liner (K-6.1.5) ----
export function fetchVesselAvailabilityLiner() {
  return api.get(`/sci-linear-vessel-list`);
}
export function fetchVesselAvailabilityLinerById(id) {
  return api.get(`/update-sci-linear-vessel-data/${id}`);
}
export function createVesselAvailabilityLiner(payload) {
  return api.post('/add-sci-vessel-availability-linear', payload, { validateStatus: (s) => s === 201 || s === 409 });
}
export function updateVesselAvailabilityLiner(payload) {
  return api.put('/sci-linear-vessel-edit', payload);
}
export function fetchVesselAvailabilityLinerReport() {
  return api.get('/kpi-sci-6-1-5-report');
}
export function deleteVesselAvailabilityLiner(id) {
  return api.delete(`/delete-sci-vessel-availability-linear/${id}`);
}

// ---- Vessel Procurement - New (K-6.2.1) ----
export function fetchVesselProcurement() {
  return api.get(`/sci-vessel-procurement-list`);
}

export function fetchVesselProcurementById(id) {
  return api.get(`/update-sci-vessel-procurement-data/${id}`);
}

export function createVesselProcurement(payload) {
  return api.post('/add-sci-vessel-procurement', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateVesselProcurement(payload) {
  return api.put('/sci-vessel-procurement-edit', payload);
}

export function fetchVesselProcurementReport() {
  return api.get('/get-sci-vessel-procurement-year-wise-report');
}

export function deleteVesselProcurement(id) {
  return api.delete(`/delete-sci-vessel-procurement/${id}`);
}

// ---- Vessel Procurement - Secondhand (K-6.2.2) ----
export function fetchSecondhandVesselProcurement() {
  return api.get(`/sci-secondhand-vessel-procurement-list`);
}

export function fetchSecondhandVesselProcurementById(id) {
  return api.get(`/update-sci-secondhand-vessel-procurement-data/${id}`);
}

export function createSecondhandVesselProcurement(payload) {
  return api.post('/add-sci-vessel-procurement-secondhand', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateSecondhandVesselProcurement(payload) {
  return api.put('/sci-secondhand-vessel-procurement-edit', payload);
}

export function fetchSecondhandVesselProcurementReport() {
  return api.get('/get-sci-vessel-procurement-secondhand-year-wise-report');
}

export function deleteSecondhandVesselProcurement(id) {
  return api.delete(`/delete-sci-secondhand-vessel-procurement/${id}`);
}

// ---- Ship Dry Docking (K-6.3.1) ----
export function fetchShipDryDocking() {
  return api.get(`/sci-ship-dry-dock-list`);
}

export function fetchShipDryDockingById(id) {
  return api.get(`/update-sci-ship-dry-docking-data/${id}`);
}

export function createShipDryDocking(payload) {
  return api.post('/add-sci-ship-dry-docking', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateShipDryDocking(payload) {
  return api.put('/sci-dry-docking-edit', payload);
}

export function fetchShipDryDockingReport() {
  return api.get('/get-sci-ship-dry-docking-year-wise-report');
}

export function deleteShipDryDocking(id) {
  return api.delete(`/delete-sci-ship-dry-docking/${id}`);
}

// ---- Repair & Maintenance (K-6.3.2) ----
export function fetchRepairAndMaintenance() {
  return api.get(`/sci-ship-repair-list`);
}

export function fetchRepairAndMaintenanceById(id) {
  return api.get(`/update-sci-ship-repair-maintanace-data/${id}`);
}

export function createRepairAndMaintenance(payload) {
  return api.post('/add-sci-ship-repair-maintanace', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateRepairAndMaintenance(payload) {
  return api.put('/sci-repair-maintance-edit', payload);
}

export function fetchRepairAndMaintenanceReport() {
  return api.get('/get-sci-repair-maintance-report');
}

export function deleteRepairAndMaintenance(id) {
  return api.delete(`/delete-sci-ship-repair-maintanace/${id}`);
}

// ---- Sale & Recycling of Old Vessels (K-6.4.1) ----
export function fetchSaleAndRecycling() {
  return api.get(`/sci-sale-and-recycling-list`);
}

export function fetchSaleAndRecyclingById(id) {
  return api.get(`/update-sci-sale-recycling-data/${id}`);
}

export function createSaleAndRecycling(payload) {
  return api.post('/add-sci-sale-recycling-oldvessels', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateSaleAndRecycling(payload) {
  return api.put('/sci-sale-recycling-edit', payload);
}

export function fetchSaleAndRecyclingReport() {
  return api.get('/get-sci-sale-recycling-old-vessels-report');
}

export function deleteSaleAndRecycling(id) {
  return api.delete(`/delete-sci-sale-recycling-oldvessels/${id}`);
}

// ---- Sale & Green Recycling of Old Vessels (K-6.4.2) ----
export function fetchSaleAndGreenRecycling() {
  return api.get(`/sci-sale-and-green-recycling-list`);
}

export function fetchSaleAndGreenRecyclingById(id) {
  return api.get(`/update-sci-sale-recycling-green-data/${id}`);
}

export function createSaleAndGreenRecycling(payload) {
  return api.post('/add-sci-sale-recycling-oldvessels-green-recycling', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateSaleAndGreenRecycling(payload) {
  return api.put('/sci-sale-greenrecycling-edit', payload);
}

export function fetchSaleAndGreenRecyclingReport() {
  return api.get('/get-sci-sale-green-recycling-old-vessels-report');
}

export function deleteSaleAndGreenRecycling(id) {
  return api.delete(`/delete-sci-sale-recycling-oldvessels-green-recycling/${id}`);
}

// ---- Manning of Owned Ships (K-6.5.1) ----
export function fetchManningOfOwnedShips() {
  return api.get(`/sci-manning-list`);
}

export function fetchManningOfOwnedShipsById(id) {
  return api.get(`/update-sci-manning-of-old-ships-data/${id}`);
}

export function createManningOfOwnedShips(payload) {
  return api.post('/add-sci-manning-of-owned-ships', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateManningOfOwnedShips(payload) {
  return api.put('/sci-manning-of-ownedships-edit', payload);
}

export function fetchManningOfOwnedShipsReport() {
  return api.get('/get-sci-manning-of-owned-ships-report');
}

export function deleteManningOfOwnedShips(id) {
  return api.delete(`/delete-sci-manning-of-owned-ships/${id}`);
}

// ---- Ship Management Business (K-6.6.1) ----
export function fetchShipManagementBusiness() {
  return api.get(`/sci-ship-management-list`);
}

export function fetchShipManagementBusinessById(id) {
  return api.get(`/update-sci-ship-management-data/${id}`);
}

export function createShipManagementBusiness(payload) {
  return api.post('/add-sci-ship-management-business', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateShipManagementBusiness(payload) {
  return api.put('/sci-ship-management-business', payload);
}

export function fetchShipManagementBusinessReport() {
  return api.get('/get-sci-ship-management-business-report');
}

export function deleteShipManagementBusiness(id) {
  return api.delete(`/delete-sci-ship-management-business/${id}`);
}

export default api;
