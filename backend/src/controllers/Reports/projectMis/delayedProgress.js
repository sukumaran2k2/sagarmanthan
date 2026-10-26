import { pendingResult } from "./pending.js";

export async function queryDelayedProgress(conn, scope) {
  return pendingResult();
}
