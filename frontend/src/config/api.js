export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const API_BASE = API_BASE_URL;

// SagarBot AI Module Query API (Dynamic Report Generation Engine)
export const AI_QUERY_API_BASE = import.meta.env.VITE_AI_QUERY_API_URL || 'https://89f7-14-98-112-142.ngrok-free.app';
export const AI_MODULE_QUERY_ENDPOINT = `${AI_QUERY_API_BASE}/api/module-query`;

export default API_BASE_URL;



