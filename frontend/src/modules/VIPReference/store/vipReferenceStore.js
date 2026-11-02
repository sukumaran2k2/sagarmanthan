import { create } from 'zustand';

import {
  fetchWings,
  fetchDivisions,
  fetchVIPReferences,
  createVIPReference as createVIPReferenceAPI,
  updateVIPReference as updateVIPReferenceAPI,
} from '../api';

const formatDate = (date) =>
  date ? new Date(date).toISOString().split('T')[0] : '';

const mapVIPReference = (r, idx) => {
  const stageSteps = {
    1: r.received_at_ministry_date ? 'Yes' : 'No',
    2: r.submitted_for_approval_date ? 'Yes' : 'No',
    3: r.comments_sought_date ? 'Yes' : 'No',
    4: r.comments_received_date ? 'Yes' : 'No',
    5: r.reply_furnished_date ? 'Yes' : 'No',
    6: r.disposed_date ? 'Yes' : 'No',
  };

  const statusDates = {
    1: formatDate(r.received_at_ministry_date),
    2: formatDate(r.submitted_for_approval_date),
    3: formatDate(r.comments_sought_date),
    4: formatDate(r.comments_received_date),
    5: formatDate(r.reply_furnished_date),
    6: formatDate(r.disposed_date),
  };

  const statusRemarks = {
    1: r.vip_received_ministry_remark || '',
    2: r.vip_submitted_for_approval_remark || '',
    3: r.vip_comments_sought_remark || '',
    4: r.vip_comments_received_remark || '',
    5: r.vip_reply_furnished_remark || '',
    6: r.vip_disposed_remark || '',
  };

  return {
    sNo: idx + 1,
    id: r.vip_reference_id,
    subject: r.subject || '',
    eofficeFile: r.eoffice_file_number || '',
    wing: r.wing_name || '',
    division: r.division_name || '',
    refNumber: r.ref_letter_num || '',
    receivedFrom: r.received_from || '',
    remarks: r.remarks || '',
    deadline: formatDate(r.deadline),
    stageSteps,
    statusSteps: stageSteps,
    statusDates,
    statusRemarks,
    lastUpdated: formatDate(r.updated_date),
  };
};

export const useVIPReferenceStore = create((set, get) => ({
  // Shared state
  vipReferences: [],
  wings: [],
  divisions: [],
  editData: null,
  loading: false,
  error: null,

  // Fetch dropdown data
  fetchDropdowns: async () => {
    try {
      const [wingsRes, divisionsRes] = await Promise.all([
        fetchWings(),
        fetchDivisions(),
      ]);

      set({
        wings: Array.isArray(wingsRes.data) ? wingsRes.data : [],
        divisions: Array.isArray(divisionsRes.data) ? divisionsRes.data : [],
        error: null,
      });
    } catch (error) {
      console.error('Error loading VIP dropdowns:', error);
      set({ error: 'Failed to load dropdown data.' });
    }
  },

  // Fetch VIP reference records
  fetchData: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetchVIPReferences();

      const dataArray = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      const mapped = dataArray.map(mapVIPReference);

      set({ vipReferences: mapped, loading: false });

      return mapped;
    } catch (error) {
      console.error('Error fetching VIP References:', error);
      set({ error: 'Failed to fetch VIP references.', loading: false });
      throw error;
    }
  },

  // Create a VIP reference (payload is the full request body)
  createVIPReference: async (payload) => {
    try {
      const response = await createVIPReferenceAPI(payload);
      await get().fetchData();
      return response;
    } catch (error) {
      console.error('Error creating VIP Reference:', error);
      throw error;
    }
  },

  // Update a VIP reference.
  // The API expects ONE payload object that already contains vipReferenceID,
  // exactly as InputForm built it before.
  updateVIPReference: async (payload) => {
    try {
      const response = await updateVIPReferenceAPI(payload);
      await get().fetchData();
      return response;
    } catch (error) {
      console.error('Error updating VIP Reference:', error);
      throw error;
    }
  },

  // Set the record being edited
  setEditData: (row) => set({ editData: row }),

  // Clear the record being edited
  clearEditData: () => set({ editData: null }),
}));

// Keep default export for files that use the default-import style.
export default useVIPReferenceStore;
