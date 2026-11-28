import { createApiClient } from '../../api';

const api = createApiClient({ timeout: 60000 });

/** Data entry status for the signed-in user's scope (Ministry: everything; organisation: its own). */
export function fetchHomeDashboard() {
  return api.get('/home-dashboard');
}
