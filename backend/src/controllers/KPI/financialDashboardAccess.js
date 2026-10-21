import Legacy from "./financialDashboardLegacy.js";
import { cleanFiscalYear, cleanMonths, resolveOrganisation } from "./trafficDashboardAccess.js";

/**
 * KPI Major Ports — Financial dashboard endpoints.
 *
 * The numbers come from the earlier portal's financial dashboard handlers
 * (financialDashboardLegacy.js, copied verbatim). The detail handler builds its SQL column
 * from the KPI name, so every request passes through here first:
 *  - the year and months are reduced to known shapes, the KPI to one of the eight cards;
 *  - organisation users always get their own organisation, whatever they ask for;
 *    ministry users may pick any organisation (0 = all).
 * Routes add login and KPI_MAJOR_PORTS read permission (see routes.js).
 */

// The eight cards of the earlier Financial Dashboard (tbl_financial_parameter columns)
export const FINANCIAL_DASHBOARD_KPIS = [
    "operating_income",
    "operating_expenditure",
    "total_income",
    "total_expenditure",
    "operating_surplus",
    "net_surplus",
    "operating_ratio",
    "per_tonne_handling_cost",
];

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/** Validated values are handed over as both req.params and req.query, as the earlier handlers read both. */
function legacyHandler(handler, { needsKpi = false } = {}) {
    return (req, res) => {
        const scope = resolveOrganisation(req);
        if (!scope.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

        const kpi = String(req.query.kpi ?? "").trim();
        if (needsKpi && !FINANCIAL_DASHBOARD_KPIS.includes(kpi)) return sendError(res, 400, "Unknown financial KPI.");

        const values = {
            organisationID: String(scope.organisationId),
            fy: cleanFiscalYear(req.query.fy),
            months: cleanMonths(req.query.months),
            ...(needsKpi ? { kpi } : {}),
        };
        return handler({ user: req.user, params: { ...values }, query: { ...values } }, res);
    };
}

const FinancialDashboard = {
    // The eight cards: current FY YTD, last FY YTD and YoY
    summary: legacyHandler(Legacy.getKPIFinancialDashboard),
    // "Detail of KPI Financial Dashboard": organisation-wise table for one card
    drill: legacyHandler(Legacy.detailedKPIFinancialCardDashboard, { needsKpi: true }),
};

export default FinancialDashboard;
