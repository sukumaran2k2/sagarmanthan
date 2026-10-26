import { pendingResult } from "./pending.js";

export async function queryStalledStage(conn, scope) {
  return pendingResult();
}
