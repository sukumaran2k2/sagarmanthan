import axios from 'axios';
import { decodeAccessToken } from '../../utils/authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

export const getUserIdFromToken = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  if (!token) return '1';
  try {
    const decoded = decodeAccessToken(token);
    return decoded?.userId || decoded?.user_id || decoded?.id || '1';
  } catch {
    return '1';
  }
};

/**
 * Fetch 8 Metric Stat Card Counts for OVOD Dashboard
 */
export const fetchOvdDashboardCounts = async ({
  wingID = 0,
  orgID = 0,
  vision = 0,
  priority = 0,
  vibhasID = 0,
  userID = '1',
  mivChapterSelect = '0',
  makvThemeSelect = '0'
} = {}) => {
  const url = `${API_BASE_URL}/OVD-data-count/${wingID}/${orgID}/${vision}/${priority}/${vibhasID}/${userID}/${mivChapterSelect}/${makvThemeSelect}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Main Intervention Tree / Report List for Dashboard
 */
export const fetchOvdInterventionsReport = async ({
  wingID = 0,
  orgID = 0,
  vision = 0,
  priority = 0,
  vibhasID = 0,
  userID = '1',
  mivChapterSelect = '0',
  makvThemeSelect = '0',
  statusCurrent = '0'
} = {}) => {
  const url = `${API_BASE_URL}/OVD-data-report/${wingID}/${orgID}/${vision}/${priority}/${vibhasID}/${userID}/${mivChapterSelect}/${makvThemeSelect}/${statusCurrent}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Full Grid Data for Input Form / Data List
 */
export const fetchOvdOrgListData = async (userID) => {
  const uId = userID || getUserIdFromToken();
  const url = `${API_BASE_URL}/ovod-org-list-data/${uId}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Status Report Data (Wing / Port / Other Org)
 */
export const fetchOvdStatusReport = async (type = '1') => {
  const url = `${API_BASE_URL}/OVD-status-data/${type}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};
export const fetchOvdStatusData = fetchOvdStatusReport;

/**
 * Save new Action Item (B2 / B3)
 */
export const saveOvdB2B3Action = async (payload) => {
  const url = `${API_BASE_URL}/save-ovod-b2-b3`;
  const response = await axios.post(url, payload, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Dynamic Dropdown Hierarchy
 */
export const fetchOvdDropDownData = async (tid = 1, orgId = 0) => {
  const url = `${API_BASE_URL}/ovod-org-filter/${tid}/${orgId}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Add OVD Hierarchy Data
 */
export const fetchOvdAddData = async (goalA1, a2Intervention, goalB1, interventionB2, type, impId) => {
  const url = `${API_BASE_URL}/get-ovod-add-data/${goalA1 || 0}/${a2Intervention || 0}/${goalB1 || 0}/${interventionB2 || 0}/${type || '0'}/${impId || 0}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Update Action Item
 */
export const updateOvdAction = async (payload) => {
  const url = `${API_BASE_URL}/update-ovod-action`;
  const response = await axios.put(url, payload, getAuthHeaders());
  return response.data;
};

/**
 * Delete Action Item
 */
export const deleteOvdAction = async (id, userID) => {
  const uId = userID || getUserIdFromToken();
  const url = `${API_BASE_URL}/delete-ovod-action/${id}/${uId}`;
  const response = await axios.delete(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Master Organisations
 */
export const fetchOrganisations = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/mmt-dropdown/mmt_organisation`, getAuthHeaders());
    const data = res.data?.data || res.data || [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching organisations in OVOD:', err);
    return [];
  }
};

