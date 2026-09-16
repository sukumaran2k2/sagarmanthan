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

// ---- Vessel Availability - Own Ships (K-6.1.1) ----
export function fetchVesselAvailabilityOwnShips(userId) {
  return api.get(`/sci-Vessel-list/${userId}`);
}
export function fetchVesselAvailabilityOwnShipsById(sciVesselId) {
  return api.get(`/update-sci-vessel-data/${sciVesselId}`);
}
export function createVesselAvailabilityOwnShips(payload) {
  return api.post('/add-vessel-avail-ability', payload, { validateStatus: (s) => s === 201 || s === 205 });
}
export function updateVesselAvailabilityOwnShips(payload) {
  return api.put('/sci-vessel-built-edit', payload);
}
export function fetchVesselAvailabilityOwnShipsReport() {
  return api.get('/kpi-sci-6-1-1-report');
}
export function deleteVesselAvailabilityOwnShips(sciVesselId, userId) {
  return api.delete(`/delete-sci-vessel-availability/${sciVesselId}/${userId}`);
}

// ---- Time & Voyage Chartered - Bulk (K-6.1.2) ----
export function fetchTimeVoyageBulk(userId) {
  return api.get(`/sci-time-voyage-bulk-list/${userId}`);
}
export function fetchTimeVoyageBulkById(id) {
  return api.get(`/update-sci-time-voyage-data/${id}`);
}
export function createTimeVoyageBulk(payload) {
  return api.post('/add-sci-time-voyage', payload, { validateStatus: (s) => s === 201 || s === 205 });
}
export function updateTimeVoyageBulk(payload) {
  return api.put('/sci-time-voyage-bulk-edit', payload);
}
export function fetchTimeVoyageBulkReport() {
  return api.get('/kpi-sci-6-1-2-report');
}
export function deleteTimeVoyageBulk(id, userId) {
  return api.delete(`/delete-sci-time-voyage-bulk/${id}/${userId}`);
}

// ---- Time & Voyage Chartered - Tanker (K-6.1.3) ----
export function fetchTimeVoyageTanker(userId) {
  return api.get(`/sci-time-voyage-tanker-list/${userId}`);
}
export function fetchTimeVoyageTankerById(id) {
  return api.get(`/update-sci-time-voyage-tanker-data/${id}`);
}
export function createTimeVoyageTanker(payload) {
  return api.post('/add-sci-time-voyage-tanker', payload, { validateStatus: (s) => s === 201 || s === 205 });
}
export function updateTimeVoyageTanker(payload) {
  return api.put('/sci-time-voyage-tanker-edit', payload);
}
export function fetchTimeVoyageTankerReport() {
  return api.get('/kpi-sci-6-1-3-report');
}
export function deleteTimeVoyageTanker(id, userId) {
  return api.delete(`/delete-sci-time-voyage-tanker/${id}/${userId}`);
}

// ---- Time & Voyage Chartered - Offshore (K-6.1.4) ----
export function fetchTimeVoyageOffshore(userId) {
  return api.get(`/sci-time-voyage-offshore-list/${userId}`);
}
export function fetchTimeVoyageOffshoreById(id) {
  return api.get(`/update-sci-time-voyage-offshore-data/${id}`);
}
export function createTimeVoyageOffshore(payload) {
  return api.post('/add-sci-time-voyage-offshore', payload, { validateStatus: (s) => s === 201 || s === 205 });
}
export function updateTimeVoyageOffshore(payload) {
  return api.put('/sci-time-voyage-offshore-edit', payload);
}
export function fetchTimeVoyageOffshoreReport() {
  return api.get('/kpi-sci-6-1-4-report');
}
export function deleteTimeVoyageOffshore(id, userId) {
  return api.delete(`/delete-sci-time-voyage-offshore/${id}/${userId}`);
}

// ---- Vessel Availability - Liner (K-6.1.5) ----
export function fetchVesselAvailabilityLiner(userId) {
  return api.get(`/sci-linear-vessel-list/${userId}`);
}
export function fetchVesselAvailabilityLinerById(id) {
  return api.get(`/update-sci-linear-vessel-data/${id}`);
}
export function createVesselAvailabilityLiner(payload) {
  return api.post('/add-sci-vessel-availability-linear', payload, { validateStatus: (s) => s === 201 || s === 205 });
}
export function updateVesselAvailabilityLiner(payload) {
  return api.put('/sci-linear-vessel-edit', payload);
}
export function fetchVesselAvailabilityLinerReport() {
  return api.get('/kpi-sci-6-1-5-report');
}
export function deleteVesselAvailabilityLiner(id, userId) {
  return api.delete(`/delete-sci-vessel-availability-linear/${id}/${userId}`);
}

// ---- Vessel Procurement - New (K-6.2.1) ----
export function fetchVesselProcurement(userId) {
  return api.get(`/sci-vessel-procurement-list/${userId}`);
}

export function fetchVesselProcurementById(id) {
  return api.get(`/update-sci-vessel-procurement-data/${id}`);
}

export function createVesselProcurement(payload) {
  return api.post('/add-sci-vessel-procurement', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateVesselProcurement(payload) {
  return api.put('/sci-vessel-procurement-edit', payload);
}

export function fetchVesselProcurementReport() {
  return api.get('/get-sci-vessel-procurement-year-wise-report');
}

export function deleteVesselProcurement(id, userId) {
  return api.delete(`/delete-sci-vessel-procurement/${id}/${userId}`);
}

// ---- Vessel Procurement - Secondhand (K-6.2.2) ----
export function fetchSecondhandVesselProcurement(userId) {
  return api.get(`/sci-secondhand-vessel-procurement-list/${userId}`);
}

export function fetchSecondhandVesselProcurementById(id) {
  return api.get(`/update-sci-secondhand-vessel-procurement-data/${id}`);
}

export function createSecondhandVesselProcurement(payload) {
  return api.post('/add-sci-vessel-procurement-secondhand', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateSecondhandVesselProcurement(payload) {
  return api.put('/sci-secondhand-vessel-procurement-edit', payload);
}

export function fetchSecondhandVesselProcurementReport() {
  return api.get('/get-sci-vessel-procurement-secondhand-year-wise-report');
}

export function deleteSecondhandVesselProcurement(id, userId) {
  return api.delete(`/delete-sci-secondhand-vessel-procurement/${id}/${userId}`);
}

// ---- Ship Dry Docking (K-6.3.1) ----
export function fetchShipDryDocking(userId) {
  return api.get(`/sci-ship-dry-dock-list/${userId}`);
}

export function fetchShipDryDockingById(id) {
  return api.get(`/update-sci-ship-dry-docking-data/${id}`);
}

export function createShipDryDocking(payload) {
  return api.post('/add-sci-ship-dry-docking', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateShipDryDocking(payload) {
  return api.put('/sci-dry-docking-edit', payload);
}

export function fetchShipDryDockingReport() {
  return api.get('/get-sci-ship-dry-docking-year-wise-report');
}

export function deleteShipDryDocking(id, userId) {
  return api.delete(`/delete-sci-ship-dry-docking/${id}/${userId}`);
}

// ---- Repair & Maintenance (K-6.3.2) ----
export function fetchRepairAndMaintenance(userId) {
  return api.get(`/sci-ship-repair-list/${userId}`);
}

export function fetchRepairAndMaintenanceById(id) {
  return api.get(`/update-sci-ship-repair-maintanace-data/${id}`);
}

export function createRepairAndMaintenance(payload) {
  return api.post('/add-sci-ship-repair-maintanace', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateRepairAndMaintenance(payload) {
  return api.put('/sci-repair-maintance-edit', payload);
}

export function fetchRepairAndMaintenanceReport() {
  return api.get('/get-sci-repair-maintance-report');
}

export function deleteRepairAndMaintenance(id, userId) {
  return api.delete(`/delete-sci-ship-repair-maintanace/${id}/${userId}`);
}

// ---- Sale & Recycling of Old Vessels (K-6.4.1) ----
export function fetchSaleAndRecycling(userId) {
  return api.get(`/sci-sale-and-recycling-list/${userId}`);
}

export function fetchSaleAndRecyclingById(id) {
  return api.get(`/update-sci-sale-recycling-data/${id}`);
}

export function createSaleAndRecycling(payload) {
  return api.post('/add-sci-sale-recycling-oldvessels', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateSaleAndRecycling(payload) {
  return api.put('/sci-sale-recycling-edit', payload);
}

export function fetchSaleAndRecyclingReport() {
  return api.get('/get-sci-sale-recycling-old-vessels-report');
}

export function deleteSaleAndRecycling(id, userId) {
  return api.delete(`/delete-sci-sale-recycling-oldvessels/${id}/${userId}`);
}

// ---- Sale & Green Recycling of Old Vessels (K-6.4.2) ----
export function fetchSaleAndGreenRecycling(userId) {
  return api.get(`/sci-sale-and-green-recycling-list/${userId}`);
}

export function fetchSaleAndGreenRecyclingById(id) {
  return api.get(`/update-sci-sale-recycling-green-data/${id}`);
}

export function createSaleAndGreenRecycling(payload) {
  return api.post('/add-sci-sale-recycling-oldvessels-green-recycling', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateSaleAndGreenRecycling(payload) {
  return api.put('/sci-sale-greenrecycling-edit', payload);
}

export function fetchSaleAndGreenRecyclingReport() {
  return api.get('/get-sci-sale-green-recycling-old-vessels-report');
}

export function deleteSaleAndGreenRecycling(id, userId) {
  return api.delete(`/delete-sci-sale-recycling-oldvessels-green-recycling/${id}/${userId}`);
}

// ---- Manning of Owned Ships (K-6.5.1) ----
export function fetchManningOfOwnedShips(userId) {
  return api.get(`/sci-manning-list/${userId}`);
}

export function fetchManningOfOwnedShipsById(id) {
  return api.get(`/update-sci-manning-of-old-ships-data/${id}`);
}

export function createManningOfOwnedShips(payload) {
  return api.post('/add-sci-manning-of-owned-ships', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateManningOfOwnedShips(payload) {
  return api.put('/sci-manning-of-ownedships-edit', payload);
}

export function fetchManningOfOwnedShipsReport() {
  return api.get('/get-sci-manning-of-owned-ships-report');
}

export function deleteManningOfOwnedShips(id, userId) {
  return api.delete(`/delete-sci-manning-of-owned-ships/${id}/${userId}`);
}

// ---- Ship Management Business (K-6.6.1) ----
export function fetchShipManagementBusiness(userId) {
  return api.get(`/sci-ship-management-list/${userId}`);
}

export function fetchShipManagementBusinessById(id) {
  return api.get(`/update-sci-ship-management-data/${id}`);
}

export function createShipManagementBusiness(payload) {
  return api.post('/add-sci-ship-management-business', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateShipManagementBusiness(payload) {
  return api.put('/sci-ship-management-business', payload);
}

export function fetchShipManagementBusinessReport() {
  return api.get('/get-sci-ship-management-business-report');
}

export function deleteShipManagementBusiness(id, userId) {
  return api.delete(`/delete-sci-ship-management-business/${id}/${userId}`);
}

export default api;
