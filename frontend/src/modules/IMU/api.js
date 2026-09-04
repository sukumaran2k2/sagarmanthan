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

// ---- Student Enrollment (K-5.1) ----
// createStudentEnrollment on the backend is itself an upsert (keyed on
// financial_year) -- there's no separate update endpoint, so the frontend
// always calls this same create function for both add and edit.
export function fetchStudentEnrollment() {
  return api.get('/get-imu-k-5-1');
}

export function fetchStudentEnrollmentById(studentId) {
  return api.get(`/get-imu-k-5-1/${studentId}`);
}

export function saveStudentEnrollment(payload) {
  return api.post('/add-imu-k-5-1', payload);
}

export function fetchStudentEnrollmentReport() {
  return api.get('/get-imu-k-5-1-report');
}

export function fetchStudentEnrollmentLinegraphReport() {
  return api.get('/get-imu-k-5-1-linegraph-report');
}

export function deleteStudentEnrollment(studentId, userId) {
  return api.delete(`/delete-imu-k-5-1/${studentId}/${userId}`);
}

// ---- Final Year Pass Percentage (K-5.1.1) ----
// createimuFinalYearpassPercentage is also an upsert, keyed on
// (programme, batch).
export function fetchFinalYearPassPercentage() {
  return api.get('/get-student-perecntage-list/1');
}

export function fetchFinalYearPassPercentageById(studentId) {
  return api.get(`/update-student-perecntage-data/${studentId}`);
}

export function saveFinalYearPassPercentage(payload) {
  return api.post('/add-imu-k-5-1-1', payload);
}

export function fetchFinalYearPassPercentageReport() {
  return api.get('/get-imu-k-5-1-1-report');
}

export function deleteFinalYearPassPercentage(studentId, userId) {
  return api.delete(`/delete-imu-k-5-1-1/${studentId}/${userId}`);
}

// ---- New Course Upgradation (K-5.2) ----
// createimunewCourseUpgradation is an upsert keyed on financial_year.
export function fetchNewCourseUpgradation() {
  return api.get('/get-imu-k-5-2');
}

export function fetchNewCourseUpgradationById(courseId) {
  return api.get(`/get-imu-k-5-2/${courseId}`);
}

export function saveNewCourseUpgradation(payload) {
  return api.post('/add-imu-k-5-2', payload);
}

export function fetchNewCourseUpgradationReport() {
  return api.get('/get-imu-k-5-2-report');
}

export function deleteNewCourseUpgradation(courseId, userId) {
  return api.delete(`/delete-imu-k-5-2/${courseId}/${userId}`);
}

// ---- Facilities (K-5.3) ----
// createimuFacilities is an upsert keyed on financial_year.
export function fetchFacilities() {
  return api.get('/get-imu-k-5-3');
}

export function fetchFacilitiesById(facilitiesId) {
  return api.get(`/get-imu-k-5-3/${facilitiesId}`);
}

export function saveFacilities(payload) {
  return api.post('/add-imu-k-5-3', payload);
}

export function fetchFacilitiesReport() {
  return api.get('/get-imu-k-5-3-report');
}

export function deleteFacilities(facilitiesId, userId) {
  return api.delete(`/delete-imu-k-5-3/${facilitiesId}/${userId}`);
}

// ---- Partnership (K-5.4) ----
// createimuPartnership is an upsert keyed on financial_year.
export function fetchPartnership() {
  return api.get('/get-imu-k-5-4');
}

export function fetchPartnershipById(partnershipId) {
  return api.get(`/get-imu-k-5-4/${partnershipId}`);
}

export function savePartnership(payload) {
  return api.post('/add-imu-k-5-4', payload);
}

export function fetchPartnershipReport() {
  return api.get('/get-imu-k-5-4-report');
}

export function deletePartnership(partnershipId, userId) {
  return api.delete(`/delete-imu-k-5-4/${partnershipId}/${userId}`);
}

// ---- Research, Innovation & Startups (K-5.5) ----
// createImuResearch is an upsert keyed on financial_year.
export function fetchResearch() {
  return api.get('/get-imu-k-5-5');
}

export function fetchResearchById(researchId) {
  return api.get(`/get-imu-k-5-5/${researchId}`);
}

export function saveResearch(payload) {
  return api.post('/add-imu-k-5-5', payload);
}

export function fetchResearchReport() {
  return api.get('/get-imu-k-5-5-report');
}

export function deleteResearch(researchId, userId) {
  return api.delete(`/delete-imu-k-5-5/${researchId}/${userId}`);
}

export default api;
