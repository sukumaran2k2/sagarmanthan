import { runHrMonthlySnapshot, listHrSnapshotRuns } from "../../jobs/hrMonthlySnapshot.js";
import { parseSnapshotPeriod } from "../../jobs/hrSnapshotPeriod.js";

async function getSnapshotRuns(req, res) {
    try {
        res.json(await listHrSnapshotRuns());
    } catch (err) {
        console.error("Error fetching HR snapshot runs:", err);
        res.status(500).json({ message: "Error occurred while fetching HR snapshot runs", error: err.message });
    }
}

// Body: { year, month, force }
async function runSnapshot(req, res) {
    const period = parseSnapshotPeriod(req.body?.year, req.body?.month);
    if (!period) return res.status(400).json({ message: "Invalid year or month." });

    try {
        const outcome = await runHrMonthlySnapshot({
            ...period,
            source: "MANUAL",
            force: req.body?.force === true,
            userId: Number(req.user?.userId) || null,
        });
        if (outcome.result === "BUSY") {
            return res.status(409).json({ ...outcome, message: "A snapshot is already running. Try again in a minute." });
        }
        res.json(outcome);
    } catch (err) {
        console.error("Error taking HR snapshot:", err);
        res.status(500).json({ message: "Error occurred while taking the HR snapshot", error: err.message });
    }
}

export default { getSnapshotRuns, runSnapshot };
