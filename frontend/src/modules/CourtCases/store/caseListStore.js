import { create } from "zustand";
import { fetchCourtCases, deleteCourtCase } from "../api";

/**
 * List-page state (rows, tab, filters, search, page, hidden columns).
 * Because it lives in a store, filters/page survive leaving to the edit form and coming back.
 */
export function createCaseListStore({ select, hiddenByDefault = [], errorMessage = "Failed to load cases. Please try again." }) {
  return create((set, get) => ({
    rows: [],
    loading: true,
    error: "",
    tab: "active",
    org: "",
    status: "",
    query: "",
    page: 1,
    hidden: hiddenByDefault,
    deletingId: null,

    setTab: (tab) => set({ tab, status: "", page: 1 }),
    setOrg: (org) => set({ org, page: 1 }),
    setStatus: (status) => set({ status, page: 1 }),
    setQuery: (query) => set({ query, page: 1 }),
    setPage: (p) => set((s) => ({ page: typeof p === "function" ? p(s.page) : p })),
    toggleColumn: (key) =>
      set((s) => ({
        hidden: s.hidden.includes(key) ? s.hidden.filter((k) => k !== key) : [...s.hidden, key],
      })),

    load: async (roleID, organisationID) => {
      set({ loading: true, error: "" });
      try {
        const res = await fetchCourtCases(roleID, organisationID);
        const data = res?.data ?? res;
        const all = Array.isArray(data) ? data : data?.data || [];
        set({ rows: select(all) });
      } catch {
        set({ error: errorMessage });
      } finally {
        set({ loading: false });
      }
    },

    // resolves true on success so the component can show its own alert
    deleteCase: async (caseID, userID) => {
      set({ deletingId: caseID });
      try {
        await deleteCourtCase(caseID, userID);
        set((s) => ({ rows: s.rows.filter((r) => r.case_id !== caseID) }));
        return true;
      } catch {
        return false;
      } finally {
        set({ deletingId: null });
      }
    },
  }));
}

const byPrefix = (prefix) => (all) =>
  all
    .filter((r) => String(r.case_id || "").toUpperCase().startsWith(prefix))
    .sort((a, b) => String(a.case_id).localeCompare(String(b.case_id), undefined, { numeric: true }));

export const useArbitrationListStore = createCaseListStore({ select: byPrefix("AR") });
export const useConciliationListStore = createCaseListStore({ select: byPrefix("CO") });

export const useLitigationListStore = createCaseListStore({
  select: (all) =>
    all.filter((r) => r.case_id?.startsWith("LI")).map((r) => ({ ...r, caseType: "Litigation" })),
  hiddenByDefault: ["domain", "sub_domain", "caseType", "created_date", "updated_date"],
  errorMessage: "Failed to load litigation cases.",
});
