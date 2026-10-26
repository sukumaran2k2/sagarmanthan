import { getDataScope } from "../../middleware/dataScope.js";
import Legacy from "./trafficDashboardLegacy.js";

/**
 * KPI Major Ports — Traffic dashboard endpoints.
 *
 * The numbers come from the earlier portal's dashboard handlers (trafficDashboardLegacy.js,
 * copied verbatim). Those handlers trust their inputs and build parts of their SQL from the
 * year and month text, so every request passes through here first:
 *  - inputs are reduced to known shapes (year "2025-2026", month numbers, known KPI keys);
 *  - organisation users always get their own organisation, whatever they ask for;
 *    ministry users may pick any organisation (0 = all).
 * Routes add login and KPI_MAJOR_PORTS read permission (see routes.js).
 */

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/** "2025-2026" (consecutive years) or "all" (the running year vs the one before). */
export function cleanFiscalYear(value) {
    const match = String(value ?? "").trim().match(/^(\d{4})-(\d{4})$/);
    return match && Number(match[2]) === Number(match[1]) + 1 ? `${match[1]}-${match[2]}` : "all";
}

/** "4,5,6" (unique months 1-12) or "all" (April to the last completed month). */
export function cleanMonths(value) {
    const months = [...new Set(
        String(value ?? "").split(",").map((m) => Number(m.trim())).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    )];
    return months.length ? months.join(",") : "all";
}

const cleanKey = (value, pattern) => {
    const text = String(value ?? "").trim();
    return pattern.test(text) ? text : "";
};

/** Own organisation for organisation users; the requested one (0 = all) for ministry users. */
export function resolveOrganisation(req) {
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    if (isWide) {
        const requested = Number.parseInt(req.query.organisationId, 10);
        return { ok: true, organisationId: Number.isInteger(requested) && requested > 0 ? requested : 0 };
    }
    if (isOrganisation && Number.isInteger(organisationId) && organisationId > 0) return { ok: true, organisationId };
    return { ok: false };
}

/**
 * Wraps a legacy handler: validated values are handed over as both req.params and
 * req.query, the two places the earlier handlers read from.
 */
function legacyHandler(handler) {
    return (req, res) => {
        const scope = resolveOrganisation(req);
        if (!scope.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

        const commodity = Number.parseInt(req.query.commodity, 10);
        const subcategoryId = Number.parseInt(req.query.subcategoryId, 10);
        const values = {
            organisationID: String(scope.organisationId),
            fy: cleanFiscalYear(req.query.fy),
            months: cleanMonths(req.query.months),
            // KPI keys and cargo codes are matched against the handlers' own whitelists
            kpi: cleanKey(req.query.kpi, /^[A-Za-z0-9_-]{1,80}$/),
            cargo: cleanKey(req.query.cargo, /^[A-Za-z]{1,60}$/),
            commodity: Number.isInteger(commodity) && commodity >= 1 && commodity <= 6 ? String(commodity) : "4",
            subcategoryId: Number.isInteger(subcategoryId) && subcategoryId > 0 ? String(subcategoryId) : "none",
        };
        return handler({ user: req.user, params: { ...values }, query: { ...values } }, res);
    };
}

const TrafficDashboard = {
    // Panels
    traffic: legacyHandler(Legacy.getKPITrafficDashboard),
    cargo: legacyHandler(Legacy.getKPICargoDashboard),
    performance: legacyHandler(Legacy.getAllTrafficDashboardKPIs),
    coastal: legacyHandler(Legacy.getTrafficCoastalCommodityWise),
    summary: legacyHandler(Legacy.getEximTrafficDashboard),
    // Drill-downs ("Detail of KPI")
    drillTraffic: legacyHandler(Legacy.detailedKPITrafficCardDashboard),
    drillCargo: legacyHandler(Legacy.detailedKPICargoCardDashboard),
    drillPerformance: legacyHandler(Legacy.detailedAllTrafficDashboardKPIs),
    drillCoastal: legacyHandler(Legacy.detailedTrafficCoastalCommodityWise),
    drillCargoWise: legacyHandler(Legacy.drilldetailedTrafficCargoWise),
};

export default TrafficDashboard;
