import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await axios.get(`${API_BASE}/refresh-token`, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  const next = res.data?.accessToken;
  if (!next) throw new Error('Refresh failed');
  localStorage.setItem('accessToken', next);
  return next;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return Promise.reject(error);
    }
  }
);

// ---- Vessels Built (K-4.1) ----
export function fetchVesselsBuilt(userId) {
  return api.get(`/vessel-list/${userId}`);
}

export function fetchVesselsBuiltById(cslVesselId) {
  return api.get(`/update-CSL-vessel-built/${cslVesselId}`);
}

export function createVesselsBuilt(payload) {
  return api.post('/vessels-built', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateVesselsBuilt(payload) {
  return api.put('/csl-vessel-Built-edit', payload);
}

export function deleteVesselsBuilt(cslVesselId, userId) {
  return api.delete(`/csl-vessels-built/${cslVesselId}/${userId}`);
}

export function fetchVesselsBuiltReport() {
  return api.get('/get-csl-year-wise-report');
}

// ---- Ship Building Orders (K-4.2) ----
export function fetchShipBuildingOrders(userId) {
  return api.get(`/shipbuilding-list/${userId}`);
}

export function fetchShipBuildingOrdersById(cslShipbuildingId) {
  return api.get(`/update-CSL-ship-built/${cslShipbuildingId}`);
}

export function createShipBuildingOrders(payload) {
  return api.post('/csl-ship-building', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateShipBuildingOrders(payload) {
  return api.put('/csl-ship-Built-edit', payload);
}

export function fetchShipBuildingOrdersReport() {
  return api.get('/get-csl-shipbuilding-year-wise-report');
}

export function deleteShipBuildingOrders(cslShipbuildingId, userId) {
  return api.delete(`/csl-ship-building/${cslShipbuildingId}/${userId}`);
}

// ---- Ship Delivery Performance (K-4.3) ----
export function fetchShipDeliveryPerformance(userId) {
  return api.get(`/shipdelivery-list/${userId}`);
}

export function fetchShipDeliveryPerformanceById(cslShipdeliveryId) {
  return api.get(`/update-CSL-delivery-data/${cslShipdeliveryId}`);
}

export function createShipDeliveryPerformance(payload) {
  return api.post('/csl-ship-delivery', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateShipDeliveryPerformance(payload) {
  return api.put('/csl-ship-delivery-edit', payload);
}

export function fetchShipDeliveryPerformanceReport() {
  return api.get('/get-csl-delivery-year-wise-report');
}

export function deleteShipDeliveryPerformance(cslShipdeliveryId, userId) {
  return api.delete(`/csl-ship-delivery/${cslShipdeliveryId}/${userId}`);
}

// ---- Capacity Utilization (K-4.4) ----
export function fetchCapacityUtilization(userId) {
  return api.get(`/capacityUtilization-list/${userId}`);
}

export function fetchCapacityUtilizationById(cslCapacityUtilizationId) {
  return api.get(`/update-CSL-capcity-utilization-data/${cslCapacityUtilizationId}`);
}

export function createCapacityUtilization(payload) {
  return api.post('/csl-capacity-utilization', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateCapacityUtilization(payload) {
  return api.put('/csl-capacity-utilization-edit', payload);
}

export function fetchCapacityUtilizationReport() {
  return api.get('/get-csl-capacity-utilization-report');
}

export function deleteCapacityUtilization(cslCapacityUtilizationId, userId) {
  return api.delete(`/csl-capacity-utilization/${cslCapacityUtilizationId}/${userId}`);
}

// ---- Fabrication of Steels (K-4.5) ----
export function fetchFabricationOfSteels(userId) {
  return api.get(`/fabrication-list/${userId}`);
}

export function fetchFabricationOfSteelsById(cslFabricationId) {
  return api.get(`/update-CSL-fabrication-data/${cslFabricationId}`);
}

export function createFabricationOfSteels(payload) {
  return api.post('/csl-fabrication-steels', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateFabricationOfSteels(payload) {
  return api.put('/csl-fabrication-edit', payload);
}

export function fetchFabricationOfSteelsReport() {
  return api.get('/get-csl-fabrication-of-steels-report');
}

export function deleteFabricationOfSteels(cslFabricationId, userId) {
  return api.delete(`/csl-fabrication-steels/${cslFabricationId}/${userId}`);
}

// ---- Ships Repaired (K-4.6) ----
export function fetchShipsRepaired(userId) {
  return api.get(`/ships-reapired-list/${userId}`);
}

export function fetchShipsRepairedById(cslReapiredId) {
  return api.get(`/update-ships-reapired-data/${cslReapiredId}`);
}

export function createShipsRepaired(payload) {
  return api.post('/csl-ships-repaired', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateShipsRepaired(payload) {
  return api.put('/csl-repaired-edit', payload);
}

export function fetchShipsRepairedReport() {
  return api.get('/get-csl-ships-repaired-report');
}

export function deleteShipsRepaired(cslShipsRepairedId, userId) {
  return api.delete(`/csl-ships-repaired/${cslShipsRepairedId}/${userId}`);
}

export default api;
