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
 * Ministry dashboard analytics - A level (A1/A2/A3 totals, A2 category + progress split)
 */
export const fetchOvdMinistryChart = async ({
  wingID = 0,
  orgID = 0,
  vision = 0,
  priority = 0,
  vibhasID = 0,
  mivChapterSelect = '0',
  makvThemeSelect = '0'
} = {}) => {
  const url = `${API_BASE_URL}/OVD-ministry-chart/${wingID}/${orgID}/${vision}/${priority}/${vibhasID}/${mivChapterSelect}/${makvThemeSelect}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Ministry dashboard analytics - B level (B1/B2/B3 totals, B2 category + progress split)
 */
export const fetchOvdMinistryChartB2 = async ({
  wingID = 0,
  orgID = 0,
  vision = 0,
  priority = 0,
  vibhasID = 0,
  mivChapterSelect = '0',
  makvThemeSelect = '0'
} = {}) => {
  const url = `${API_BASE_URL}/OVD-ministry-b2-chart/${wingID}/${orgID}/${vision}/${priority}/${vibhasID}/${mivChapterSelect}/${makvThemeSelect}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Not Applicable / Dropped counts (A3 / B3 items) for the dashboard
 */
export const fetchOvdStatusCounts = async ({
  wingID = 0,
  orgID = 0,
  vision = 0,
  priority = 0,
  vibhasID = 0,
  mivChapterSelect = '0',
  makvThemeSelect = '0',
  userID = '1'
} = {}) => {
  const url = `${API_BASE_URL}/OVD-init-drop/${wingID}/${orgID}/${vision}/${priority}/${vibhasID}/${mivChapterSelect}/${makvThemeSelect}/${userID}`;
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
 * Fetch Status Report Data (Ministry / Organisation / Vibhas)
 */
export const fetchOvdStatusReport = async (type = 'Ministry') => {
  let param = type;
  const lower = String(type || '').trim().toLowerCase();
  if (lower === 'organisation' || lower === 'organization' || lower === 'org') {
    param = 'Organisation';
  } else if (lower === 'vibhas') {
    param = 'Vibhas';
  } else {
    param = 'Ministry';
  }
  const url = `${API_BASE_URL}/OVD-status-data/${param}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};
export const fetchOvdStatusData = fetchOvdStatusReport;

/**
 * Save new Action Item (B2 / B3)
 */
export const saveOvdB2B3Action = async (payload) => {
  const url = `${API_BASE_URL}/OVD-L2-data`;
  const response = await axios.post(url, payload, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Dynamic Dropdown Hierarchy
 */
export const fetchOvdDropDownData = async (tid = 'org_a1_filter', orgId = 0) => {
  const url = `${API_BASE_URL}/ovod-org-filter/${tid}/${orgId}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Fetch Add OVD Hierarchy Data
 */
export const fetchOvdAddData = async (goalA1 = 0, a2Intervention = 0, goalB1 = 0, interventionB2 = 0, type = 'B2', impId = 0) => {
  const url = `${API_BASE_URL}/get-ovod-add-data/${goalA1 || 0}/${a2Intervention || 0}/${goalB1 || 0}/${interventionB2 || 0}/${type || 'B2'}/${impId || 0}`;
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
 * Fetch Implementing Agencies for OVOD
 */
export const fetchImplementingAgencies = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/mmt-dropdown/mmt_implementing_agency_ovd`, getAuthHeaders());
    const data = res.data?.data || res.data || [];
    if (Array.isArray(data) && data.length > 0) return data;
    const fallback = await axios.get(`${API_BASE_URL}/mmt-dropdown/mmt_implementing_agency`, getAuthHeaders());
    return fallback.data?.data || fallback.data || [];
  } catch (err) {
    console.error('Error fetching implementing agencies in OVOD:', err);
    return [];
  }
};
export const fetchOrganisations = fetchImplementingAgencies;


/**
 * Fetch Full Item Details for Update Initiative
 */
export const fetchOvdItemDetails = async (id) => {
  const url = `${API_BASE_URL}/OVD-datas/${id}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

/**
 * Update Full Initiative Data (PUT /OVD-datas)
 */
export const updateOvdFullItem = async (payload) => {
  const url = `${API_BASE_URL}/OVD-datas`;
  const response = await axios.put(url, payload, getAuthHeaders());
  return response.data;
};

/**
 * Upload OVD Document
 */
export const uploadOvdDocument = async (formData) => {
  const url = `${API_BASE_URL}/ovd-document`;
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const response = await axios.post(url, formData, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Fetch Uploaded Documents for Initiative
 */
export const fetchOvdDocuments = async (id) => {
  const url = `${API_BASE_URL}/get-intervention-documents/${id}`;
  const response = await axios.get(url, getAuthHeaders());
  return response.data;
};

