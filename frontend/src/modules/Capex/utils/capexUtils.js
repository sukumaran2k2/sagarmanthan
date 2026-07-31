/**
 * Utility functions for Capex Module
 */

export function calculateCapexTotal(gbs = 0, iebr = 0, ppp = 0) {
  const g = parseFloat(gbs) || 0;
  const i = parseFloat(iebr) || 0;
  const p = parseFloat(ppp) || 0;
  return Number((g + i + p).toFixed(2));
}

export function calculateCapexExpenditurePercentage(expenditure = 0, totalTarget = 0) {
  const exp = parseFloat(expenditure) || 0;
  const target = parseFloat(totalTarget) || 0;
  if (target <= 0) return "0.00";
  return ((exp / target) * 100).toFixed(2);
}

export function formatCurrencyINR(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}
