// CSR amounts are stored in lakh (as in 2.0 and the report queries) and shown in crore.
// 1 crore = 100 lakh. Up to 4 decimals on screen, so a ₹50,000 project (0.5 lakh) still
// reads ₹0.005 Cr instead of rounding away.
export const lakhToCrore = (lakh) => Number(lakh) / 100;

// Crore typed in a form -> lakh to store, to the paisa-level 2 decimals the columns hold
export const croreToLakh = (crore) => Math.round(Number(crore) * 10000) / 100;

// Stored lakh -> "1,234.56" crore text, '-' when missing
export const formatCrore = (lakh) => (lakh != null && lakh !== ''
  ? lakhToCrore(lakh).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  : '-');

// Stored lakh -> crore value for a form input ('' when missing)
export const croreInput = (lakh) => (lakh != null && lakh !== '' ? String(Number(lakhToCrore(lakh).toFixed(4))) : '');
