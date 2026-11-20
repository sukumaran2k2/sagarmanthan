import { create } from "zustand";
import { fetchCourtCaseReport } from "../api";

export const useReportStore = create((set) => ({
  data: null,
  loading: true,
  error: null,

  load: async (userID) => {
    if (!userID) return set({ loading: false });
    set({ loading: true, error: null });
    try {
      const res = await fetchCourtCaseReport(userID);
      set({ data: res.data });
    } catch (err) {
      set({ error: err.message || "Failed to load report" });
    } finally {
      set({ loading: false });
    }
  },
}));
