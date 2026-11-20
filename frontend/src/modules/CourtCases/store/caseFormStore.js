import { create } from "zustand";
import { arbitrationSchema } from "../forms/arbitration.schema";
import { litigationSchema } from "../forms/litigation.schema";
import { conciliationSchema } from "../forms/conciliation.schema";

export const buildInitialValues = (schema) => {
  const v = {};
  schema.steps.forEach((s) =>
    s.fields.forEach((f) => {
      if (f.type === "table") v[f.name] = [{}];
      else if (f.type === "list") v[f.name] = [""];
      else if (f.type === "chips") v[f.name] = [];
      else v[f.name] = "";
    })
  );
  return v;
};

/**
 * One store per form type, so Arbitration / Litigation / Conciliation never share state.
 * Holds everything the wizard needs: current step, field values, validation text,
 * saving flag, the saved caseID and the dependent dropdown options.
 */
export function createCaseFormStore(schema) {
  const fresh = (caseID = "") => ({
    step: 0,
    values: buildInitialValues(schema),
    errors: "",
    saving: false,
    caseID,
    loading: !!caseID, // true while an edit-mode case is being fetched
    opts: {},          // dependent dropdowns (sub domain, benches, case types ...)
  });

  return create((set) => ({
    ...fresh(),

    reset: (caseID = "") => set(fresh(caseID)),

    setStep: (step) => set({ step }),
    setErrors: (errors) => set({ errors }),
    setSaving: (saving) => set({ saving }),
    setCaseID: (caseID) => set({ caseID }),
    setLoading: (loading) => set({ loading }),

    setValue: (name, val) => set((s) => ({ values: { ...s.values, [name]: val } })),
    mergeValues: (v) => set((s) => ({ values: { ...s.values, ...v } })),

    setOpt: (key, list) => set((s) => ({ opts: { ...s.opts, [key]: list } })),
  }));
}

export const useArbitrationFormStore = createCaseFormStore(arbitrationSchema);
export const useLitigationFormStore = createCaseFormStore(litigationSchema);
export const useConciliationFormStore = createCaseFormStore(conciliationSchema);
