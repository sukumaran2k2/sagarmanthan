import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// ---- Vessels Built (K-4.1) ----
export function fetchVesselsBuilt(params = {}) {
  return api.get(`/vessel-list`, { params });
}

export function fetchVesselsBuiltById(cslVesselId) {
  return api.get(`/update-CSL-vessel-built/${cslVesselId}`);
}

export function createVesselsBuilt(payload) {
  return api.post('/vessels-built', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateVesselsBuilt(payload) {
  return api.put('/csl-vessel-Built-edit', payload);
}

export function deleteVesselsBuilt(cslVesselId) {
  return api.delete(`/csl-vessels-built/${cslVesselId}`);
}

export function fetchVesselsBuiltReport() {
  return api.get('/get-csl-year-wise-report');
}

// ---- Ship Building Orders (K-4.2) ----
export function fetchShipBuildingOrders(params = {}) {
  return api.get(`/shipbuilding-list`, { params });
}

export function fetchShipBuildingOrdersById(cslShipbuildingId) {
  return api.get(`/update-CSL-ship-built/${cslShipbuildingId}`);
}

export function createShipBuildingOrders(payload) {
  return api.post('/csl-ship-building', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateShipBuildingOrders(payload) {
  return api.put('/csl-ship-Built-edit', payload);
}

export function fetchShipBuildingOrdersReport() {
  return api.get('/get-csl-shipbuilding-year-wise-report');
}

export function deleteShipBuildingOrders(cslShipbuildingId) {
  return api.delete(`/csl-ship-building/${cslShipbuildingId}`);
}

// ---- Ship Delivery Performance (K-4.3) ----
export function fetchShipDeliveryPerformance(params = {}) {
  return api.get(`/shipdelivery-list`, { params });
}

export function fetchShipDeliveryPerformanceById(cslShipdeliveryId) {
  return api.get(`/update-CSL-delivery-data/${cslShipdeliveryId}`);
}

export function createShipDeliveryPerformance(payload) {
  return api.post('/csl-ship-delivery', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateShipDeliveryPerformance(payload) {
  return api.put('/csl-ship-delivery-edit', payload);
}

export function fetchShipDeliveryPerformanceReport() {
  return api.get('/get-csl-delivery-year-wise-report');
}

export function deleteShipDeliveryPerformance(cslShipdeliveryId) {
  return api.delete(`/csl-ship-delivery/${cslShipdeliveryId}`);
}

// ---- Capacity Utilization (K-4.4) ----
export function fetchCapacityUtilization(params = {}) {
  return api.get(`/capacityUtilization-list`, { params });
}

export function fetchCapacityUtilizationById(cslCapacityUtilizationId) {
  return api.get(`/update-CSL-capcity-utilization-data/${cslCapacityUtilizationId}`);
}

export function createCapacityUtilization(payload) {
  return api.post('/csl-capacity-utilization', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateCapacityUtilization(payload) {
  return api.put('/csl-capacity-utilization-edit', payload);
}

export function fetchCapacityUtilizationReport() {
  return api.get('/get-csl-capacity-utilization-report');
}

export function deleteCapacityUtilization(cslCapacityUtilizationId) {
  return api.delete(`/csl-capacity-utilization/${cslCapacityUtilizationId}`);
}

// ---- Fabrication of Steels (K-4.5) ----
export function fetchFabricationOfSteels(params = {}) {
  return api.get(`/fabrication-list`, { params });
}

export function fetchFabricationOfSteelsById(cslFabricationId) {
  return api.get(`/update-CSL-fabrication-data/${cslFabricationId}`);
}

export function createFabricationOfSteels(payload) {
  return api.post('/csl-fabrication-steels', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateFabricationOfSteels(payload) {
  return api.put('/csl-fabrication-edit', payload);
}

export function fetchFabricationOfSteelsReport() {
  return api.get('/get-csl-fabrication-of-steels-report');
}

export function deleteFabricationOfSteels(cslFabricationId) {
  return api.delete(`/csl-fabrication-steels/${cslFabricationId}`);
}

// ---- Ships Repaired (K-4.6) ----
export function fetchShipsRepaired(params = {}) {
  return api.get(`/ships-reapired-list`, { params });
}

export function fetchShipsRepairedById(cslReapiredId) {
  return api.get(`/update-ships-reapired-data/${cslReapiredId}`);
}

export function createShipsRepaired(payload) {
  return api.post('/csl-ships-repaired', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateShipsRepaired(payload) {
  return api.put('/csl-repaired-edit', payload);
}

export function fetchShipsRepairedReport() {
  return api.get('/get-csl-ships-repaired-report');
}

export function deleteShipsRepaired(cslShipsRepairedId) {
  return api.delete(`/csl-ships-repaired/${cslShipsRepairedId}`);
}

export default api;
