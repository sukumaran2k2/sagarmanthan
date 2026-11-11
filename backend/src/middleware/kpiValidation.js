// Server-side checks for the DGLL / CSL / IMU / SCI forms (QC KPI-03): the same rules the input forms
// apply, so a request sent past the form can't save an empty, negative or malformed value.
// One rule set per route, keyed "METHOD /path"; rules name the body field and its kind:
//   fy        financial year "2024-2025" (consecutive years)     quarter  Q1..Q4
//   month     a month name as the form saves it (monthOpt: may be empty)
//   id        positive whole number (idOpt: may be empty)          num      number >= 0 (numOpt: may be empty)
//   pct       number 0..100                                       text     non-empty, <= 255 characters (textOpt: may be empty)
//   date      a valid date                                        latOpt / lngOpt  latitude / longitude when given
// Only the listed fields are checked; anything else in the body is left to the handler.

// The fabrication form saves the legacy site's month spellings ("Febraury", "Jully", "Auguet"); both
// those and the correct names are accepted.
const MONTHS = new Set(["January", "February", "Febraury", "March", "April", "May", "June", "July", "Jully",
    "August", "Auguet", "September", "October", "November", "December"]);

const empty = (v) => v === undefined || v === null || String(v).trim() === "";
const isFy = (v) => /^\d{4}-\d{4}$/.test(String(v).trim()) && Number(String(v).trim().slice(5)) === Number(String(v).trim().slice(0, 4)) + 1;
const number = (v) => (typeof v === "number" ? v : /^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? Number(v) : NaN);

const CHECKS = {
    fy: (v) => (isFy(v) ? null : "must be in the form 2024-2025"),
    quarter: (v) => (/^Q[1-4]$/.test(String(v).trim()) ? null : "must be Q1, Q2, Q3 or Q4"),
    month: (v) => (MONTHS.has(String(v).trim()) ? null : "must be one of the listed months"),
    id: (v) => (Number.isInteger(number(v)) && number(v) > 0 ? null : "is not a valid record"),
    num: (v) => (Number.isFinite(number(v)) && number(v) >= 0 ? null : "must be a number of 0 or more"),
    pct: (v) => (Number.isFinite(number(v)) && number(v) >= 0 && number(v) <= 100 ? null : "must be a percentage from 0 to 100"),
    text: (v) => (String(v).trim().length <= 255 ? null : "is too long (at most 255 characters)"),
    date: (v) => (!Number.isNaN(new Date(String(v)).getTime()) && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? null : "must be a valid date"),
    lat: (v) => (Number.isFinite(number(v)) && Math.abs(number(v)) <= 90 ? null : "must be a latitude from -90 to 90"),
    lng: (v) => (Number.isFinite(number(v)) && Math.abs(number(v)) <= 180 ? null : "must be a longitude from -180 to 180"),
};

// Field names as people read them in the message ("updateTonnageVessels" -> "tonnage vessels")
const label = (field) => {
    if (/month$/i.test(field)) return "month";
    if (/quater$|quarter$/i.test(field)) return "quarter";
    if (/financialyears?$|^(update)?year$/i.test(field)) return "financial year";
    return field.replace(/^update/, "").replace(/IdOrg$|RowId$|Id$/, " record")
        .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim().toLowerCase()
        .replace(/\bnais\b/g, "NAIS").replace(/\bvtms\b/g, "VTMS").replace(/\bsci\b/g, "SCI");
};

export const KPI_RULES = {
    "POST /light-house-master": { alol: "text", lightsName: "text", status: "textOpt", dateOfCommissioning: "date", state: "id", district: "id", latitude: "latOpt", longitude: "lngOpt" },
    "PUT /Light-House-edit": { alolName: "text", lightHouseName: "text", status: "textOpt", updateDateOfCommissioning: "date", updateState: "id", updateDistrict: "id", updateLatitude: "latOpt", updateLongitude: "lngOpt", lightHouseIdIdOrg: "id" },
    "POST /vtms-Integration": { financialYear: "fy", vtmsIntegration: "num" },
    "PUT /vtms-edit": { updatevtmsfinancialYear: "fy", updateVtmsSystem: "num", VtmsIdOrg: "id" },
    "POST /nais-uptime": { financialYear: "fy", naisAvailability: "pct" },
    "PUT /nais-edit": { updatenaisfinancialYear: "fy", updateNaisUptime: "pct", NaisIdOrg: "id" },
    "POST /nais-integration": { financialYear: "fy", NAISintegration: "pct", NAISupgraded: "num" },
    "PUT /nais-integration-edit": { updateFinancialYear: "fy", updateNAISintegrationdata: "pct", updateNAISystem: "num", NaisIntegrationIdOrg: "id" },
    "POST /lighthose-tourist-destination": { financialYears: "fy", lighthouseDeveloped: "num", annualTourist: "num" },
    "POST /target-Details-lighthouse": { year: "fy", collectionLightDue: "num", footFallLighthouse: "num" },
    "PUT /edit-lighthouse-tourist-destination": { updateFinancialYears: "fy", updateLighthouseDeveloped: "num", updateAnnualTourist: "num", TouristDestinationsRowId: "id" },
    "PUT /edit-target-Details-lighthouse": { TouristDestinationsRowId: "id", updateYear: "fy", updateCollectionLightDue: "num", updateFootFallLighthouse: "num" },
    "POST /dgll-submit-financial-performance": { financialId: "idOpt", financialYear: "fy", lightDuesCollect: "num", revenueFromTourism: "num", subsidesFromGovt: "num", operatingCoasts: "num", capitalExpenditure: "num", tourismDevelopmentCosts: "num" },
    "POST /vessels-built": { financialYear: "fy", vesselsBuilt: "num", tonnageVessels: "num", valueofVessels: "num" },
    "PUT /csl-vessel-Built-edit": { updatefinancialYear: "fy", updatenoofVesselsBuilt: "num", updateTonnageVessels: "num", updateValueofVessels: "num", VesselIdOrg: "id" },
    "POST /csl-ship-building": { financialYear: "fy", financialQuater: "quarter", shipOrdersreceived: "num", valueOfshipOrder: "num" },
    "PUT /csl-ship-Built-edit": { updatefinancialYear: "fy", updatefinancialQuater: "quarter", updateShiporderReceived: "num", updateValueofship: "num", CslshipbuildingIdOrg: "id" },
    "POST /csl-ship-delivery": { financialYear: "fy", financialQuater: "quarter", noOfshipsReceived: "num", noOfshipsDeleivered: "num" },
    "PUT /csl-ship-delivery-edit": { updatefinancialYear: "fy", updatefinancialQuater: "quarter", updateShiporders: "num", updateShipsdelivered: "num", CslshipdeliveryIdOrg: "id" },
    "POST /csl-capacity-utilization": { financialYear: "fy", shipbuildingCapacity: "num", tonnageofVesselsBuilt: "num" },
    "PUT /csl-capacity-utilization-edit": { updatefinancialYear: "fy", updateshipbuildingCapacity: "num", updatetonnageofVesselsBuilt: "num", CslcapacityUtilizationIdOrg: "id" },
    "POST /csl-fabrication-steels": { financialYear: "fy", fabricationmonth: "monthOpt", fabricationOfSteels: "num", fabrigationinTonns: "num" },
    "PUT /csl-fabrication-edit": { updatefinancialYear: "fy", updatefabricationmonth: "monthOpt", updatefabrigationOfsteels: "num", updatefabrigationinTonns: "num", CslfabricationIdOrg: "id" },
    "POST /csl-ships-repaired": { financialYear: "fy", financialQuater: "quarter", noOfshipsrepaired: "num", valueOfshipsrepaired: "num" },
    "PUT /csl-repaired-edit": { updatefinancialYear: "fy", updatefinancialQuater: "quarter", updatenoOfshipsrepaired: "num", updatevalueOfshipsrepaired: "num", CslreapiredIdOrg: "id" },
    "POST /add-imu-k-5-1": { studentId: "idOpt", financialYear: "fy", noOfStdCapacity: "num", noOfStdEnrolled: "num", studentsAdmission: "pct", studentsonRoll: "num", studentsFinalyear: "num", studentsPassed: "num", noOfStdPlaced: "num", percentagePlacement: "pct" },
    "POST /add-imu-k-5-2": { courseId: "idOpt", financialYear: "fy", noOfCourseOffered: "num", noOfCourseUpgraded: "num" },
    "POST /add-imu-k-5-3": { facilitiesId: "idOpt", financialYear: "fy", noOfClassrooms: "num", noOfLabs: "num", noOfSimulators: "num", noOfWorkshops: "num", noOfLibrarybooks: "num", noOfEbooks: "num", noOfEjournals: "num", noOfEdatabases: "num", noOfacadamicSoftware: "num", totalEresources: "num" },
    "POST /add-imu-k-5-4": { partnershipId: "idOpt", financialYear: "fy", academicMoUsDomestic: "num", academicMoUsInternational: "num", industryMoUsDomestic: "num", industryMoUsInternational: "num" },
    "POST /add-imu-k-5-5": { researchId: "idOpt", financialYear: "fy", domesticJournals: "num", internationalJournals: "num", phdAwarded: "num", patentsFiled: "num", startupsFunded: "num", researchAwarded: "num" },
    "POST /add-imu-k-5-1-1": { programme: "text", Batch: "text", appeared: "num", passed: "num", passPercentage: "pct" },
    "POST /add-vessel-avail-ability": { scifinancialYear: "fy", operatedShips: "num", shipUtilization: "pct" },
    "PUT /sci-vessel-built-edit": { updatescifinancialYear: "fy", updateoperatedShips: "num", updateshipUtilization: "pct", SciVesselIdOrg: "id" },
    "POST /add-sci-time-voyage": { financialYear: "fy", bulkCarriers: "num", timeCharter: "num", voyageCharter: "num", revenue: "num", earnings: "num" },
    "PUT /sci-time-voyage-bulk-edit": { updatefinancialYear: "fy", updatebulkCarriers: "num", updateTimecharter: "num", updateVoyagecharter: "num", updateRevenue: "num", updateAverage: "num", ScitimeVoyageBuiklIdOrg: "id" },
    "POST /add-sci-time-voyage-tanker": { financialYear: "fy", totalTankersFleet: "num", daysTimeCharter: "num", daysVoyageCharter: "num", totalRevenue: "num", averageEarnings: "num" },
    "PUT /sci-time-voyage-tanker-edit": { updatefinancialYear: "fy", updatetotalTankersFleet: "num", updatedaysTimeCharter: "num", updatedaysVoyageCharter: "num", updateRevenue: "num", updateTanker: "num", ScitimeVoyageTankerlIdOrg: "id" },
    "POST /add-sci-time-voyage-offshore": { financialYear: "fy", offshoreFleet: "num", timeCharter: "num", voyageCharter: "num", revenue: "num", average: "num" },
    "PUT /sci-time-voyage-offshore-edit": { updatefinancialYear: "fy", updateoffshoreFleet: "num", updatetimeCharter: "num", updatevoyageCharter: "num", updateRevenue: "num", updateAverage: "num", ScitimeVoyageoffshoreIdOrg: "id" },
    "POST /add-sci-vessel-availability-linear": { financialYear: "fy", totallinearfleet: "num", totalrevenue: "num", averageEarnings: "num" },
    "PUT /sci-linear-vessel-edit": { updatefinancialYear: "fy", updatelinearfleet: "num", updateRevenue: "num", updateAverage: "num", SciLinearvesselIdOrg: "id" },
    "POST /add-sci-vessel-procurement": { financialYear: "fy", newBuiltships: "num", valueOfnewbuiltShips: "num" },
    "PUT /sci-vessel-procurement-edit": { updateFinancialyear: "fy", updateShipsProcured: "num", updateValueshipsprocured: "num", SciProcurementIdOrg: "id" },
    "POST /add-sci-vessel-procurement-secondhand": { financialYear: "fy", noofSecondhandships: "num", averageageofSecondhandships: "numOpt", grossvalueOfsecondhandships: "num" },
    "PUT /sci-secondhand-vessel-procurement-edit": { updateFinancialyear: "fy", updateNoofSecondhandships: "num", updateaverageageofSecondhandships: "numOpt", updateGrossvalueofSecondhandships: "num", ScisecondhandProcurementIdOrg: "id" },
    "POST /add-sci-ship-dry-docking": { financialYear: "fy", dryDockingscheduled: "num", dryDockingscompleted: "num" },
    "PUT /sci-dry-docking-edit": { updatefinancialYear: "fy", updatedryDockingscheduled: "num", updatedryDockingscompleted: "num", SciDrydockIdOrg: "id" },
    "POST /add-sci-ship-repair-maintanace": { financialYear: "fy", repairCosts: "num", operationalRevenue: "num", repairPercentage: "num" },
    "PUT /sci-repair-maintance-edit": { updatefinancialYear: "fy", updaterepairCosts: "num", updateoperationalRevenue: "num", updaterepairPercentage: "num", ScirepairandMaintanaceIdOrg: "id" },
    "POST /add-sci-sale-recycling-oldvessels": { financialYear: "fy", noOfoldvessels: "num", valueOfsale: "num", averageAge: "num" },
    "PUT /sci-sale-recycling-edit": { updateFinancialyear: "fy", updatenoOfoldvessels: "num", updatevalueOfsale: "num", updateaverageAge: "num", ScisaleRecyclingIdOrg: "id" },
    "POST /add-sci-sale-recycling-oldvessels-green-recycling": { financialYear: "fy", vesselssold: "num", valueofVessels: "num", adherencetoGreenrecycling: "pct" },
    "PUT /sci-sale-greenrecycling-edit": { updateFinancialyear: "fy", updatevesselssold: "num", updatevalueofVessels: "num", updateadherencetoGreenrecycling: "pct", ScisaleGreenrecyclingIdOrg: "id" },
    "POST /add-sci-manning-of-owned-ships": { financialYear: "fy", noofVesselsaudited: "num", noofShipsfullycomplaint: "num" },
    "PUT /sci-manning-of-ownedships-edit": { updatefinancialYear: "fy", updatenoofVesselsaudited: "num", updatenoofShipsfullycomplaint: "num", ScimanningIdOrg: "id" },
    "POST /add-sci-ship-management-business": { financialYear: "fy", noofShipsManaged: "num", totalManagementcost: "num", revenue: "num", costtoRevenueratio: "num" },
    "PUT /sci-ship-management-business": { updateFinancialyear: "fy", updatenoofShipsManaged: "num", updatetotalManagementcost: "num", updaterevenue: "num", updatecosttoRevenueratio: "num", ScishipmanagementIdOrg: "id" },
};

// Problems with the body for these rules, as one message per field ([] when it is fine)
export function kpiProblems(rules, body = {}) {
    const problems = [];
    for (const [field, rule] of Object.entries(rules)) {
        const optional = rule.endsWith("Opt");
        const kind = optional ? rule.slice(0, -3) : rule;
        const value = body[field];
        if (empty(value)) {
            if (!optional) problems.push(`${label(field)} is required`);
            continue;
        }
        const problem = CHECKS[kind](value);
        if (problem) problems.push(`${label(field)} ${problem}`);
    }
    return problems;
}

// Middleware: checks the body against the rules for this route; 400 with every problem found
export function validateKpiBody(req, res, next) {
    const rules = KPI_RULES[`${req.method} ${req.route.path}`];
    if (!rules) return next();
    const problems = kpiProblems(rules, req.body);
    if (problems.length) {
        const message = problems.map((p) => p[0].toUpperCase() + p.slice(1)).join(". ") + ".";
        return res.status(400).json({ message, problems });
    }
    return next();
}
