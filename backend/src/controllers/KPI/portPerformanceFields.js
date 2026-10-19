/**
 * KPI Major Ports — Port Performance fields (tbl_kpi_time_performance).
 *
 * The only columns the API reads or writes. Each input step saves exactly its own
 * columns; each Actuals view returns exactly its own columns. The frontend mirrors this
 * in modules/MajorPorts/pages/PortPerformance/portPerformanceConfig.js (labels, units, help).
 *
 * kind: "decimal" (non-negative), "count" (non-negative whole number), "percent" (0–100)
 */

const CARGO_TYPES = ["dry_bulk", "break_bulk", "liquid_bulk", "container"];

export const CALL_SIZES = [
    "less_than_251", "251_to_500", "501_to_1000", "1001_to_1500", "1501_to_2000",
    "2001_to_2500", "2501_to_3000", "3001_to_4000", "4001_to_6000", "greater_than_6000",
];

const fields = (columns, kind = "decimal") => columns.map((column) => ({ column, kind }));
const byCargo = (pattern) => CARGO_TYPES.map((cargo) => pattern.replace("{cargo}", cargo));
const byCallSize = (pattern) => CALL_SIZES.map((size) => pattern.replace("{size}", size));

/** The 14 input steps of the earlier portal, in the same order. */
export const PORT_PERFORMANCE_SECTIONS = [
    {
        id: "avgTrt",
        label: "Average Turnaround Time",
        fields: fields([...byCargo("average_{cargo}_trt"), "average_trt_overall", ...byCallSize("avg_container_trt_{size}")]),
    },
    {
        id: "medianTrt",
        label: "Median Turnaround Time",
        fields: fields([...byCargo("median_{cargo}_trt"), "median_trt_overall", ...byCallSize("median_container_trt_{size}")]),
    },
    {
        id: "ytdMedianTrt",
        label: "YTD Median Turnaround Time",
        fields: fields([...byCargo("ytd_median_{cargo}_trt"), "ytd_median_trt_overall", ...byCallSize("ytd_median_container_trt_{size}")]),
    },
    {
        id: "osbd",
        label: "Average Ship Berth Day Output",
        fields: fields([...byCargo("{cargo}_osbd"), "osbd_overall", "container_osbd_teus"]),
    },
    {
        id: "effectiveOsbd",
        label: "Effective OSBD",
        fields: fields([...byCargo("effective_{cargo}_osbd"), "effective_osbd_overall", "effective_container_osbd_teus"]),
    },
    {
        id: "idleTime",
        label: "Percentage of Idle Time at Berth",
        fields: fields([...byCargo("average_{cargo}_idle_time"), "overall_average_idle_time"], "percent"),
    },
    {
        id: "preBerthing",
        label: "Pre-Berthing Waiting Time",
        fields: fields([
            ...byCargo("average_{cargo}_waiting_time_port"), "overall_waiting_time_port",
            ...byCargo("average_{cargo}_waiting_time_non_port"), "overall_waiting_time_non_port",
        ]),
    },
    {
        id: "vessels",
        label: "Vessels Handled",
        fields: fields([...byCargo("{cargo}_vessel_handled"), "total_sailed_vessel_handled", ...byCallSize("vessel_container_{size}")], "count"),
    },
    {
        id: "dwellTime",
        label: "Port Dwell Time (Container)",
        fields: fields(["export_dwell_time", "import_dwell_time"]),
    },
    {
        id: "efficiency",
        label: "Loading / Unloading Efficiency",
        fields: fields([
            "dry_bulk_efficiency", "break_bulk_efficiency", "liquid_bulk_efficiency",
            "unloading_dry_bulk_efficiency", "unloading_break_bulk_efficiency", "unloading_liquid_bulk_efficiency",
        ]),
    },
    {
        id: "craneProductivity",
        label: "Gross Crane Productivity",
        fields: [{ column: "gross_crane_productivity", kind: "decimal" }, { column: "total_moves", kind: "count" }],
    },
    {
        id: "containerSize",
        label: "Average Container Size",
        fields: fields(byCallSize("avg_{size}")),
    },
    {
        id: "cppiTrt",
        label: "Average Container TRT (as per CPPI)",
        fields: fields(byCallSize("avg_{size}_cppi")),
    },
    {
        id: "cargoHandled",
        label: "Cargo Handled by Sailed Vessels",
        fields: fields([
            ...byCargo("{cargo}_cargo_handled"), "total_cargo_handled",
            "dry_bulk_cargo_loaded", "break_bulk_cargo_loaded", "liquid_bulk_cargo_loaded",
            "container_bulk_cargo_loaded", "container_bulk_cargo_loaded_teu", "total_cargo_loaded",
            "dry_bulk_cargo_unloaded", "break_bulk_cargo_unloaded", "liquid_bulk_cargo_unloaded",
            "container_bulk_cargo_unloaded", "container_bulk_cargo_unloaded_teu", "total_cargo_unloaded",
        ]),
    },
];

export const SECTION_BY_ID = new Map(PORT_PERFORMANCE_SECTIONS.map((s) => [s.id, s]));

export const ALL_FIELDS = PORT_PERFORMANCE_SECTIONS.flatMap((s) => s.fields);
export const ALL_COLUMNS = ALL_FIELDS.map((f) => f.column);

const columnsOf = (sectionId, filter = () => true) =>
    SECTION_BY_ID.get(sectionId).fields.map((f) => f.column).filter(filter);
const notCallSize = (column) => !CALL_SIZES.some((size) => column.endsWith(size) || column.includes(`_${size}_`));
const isCallSize = (column) => !notCallSize(column);

/** Columns returned by each Actuals view (GET /kpi/port-performance/actuals?view=). */
export const LIST_VIEW_COLUMNS = {
    turnaround: [
        ...columnsOf("avgTrt", notCallSize),
        ...columnsOf("medianTrt", notCallSize),
        ...columnsOf("ytdMedianTrt", notCallSize),
    ],
    berthOutput: [...columnsOf("osbd"), ...columnsOf("effectiveOsbd")],
    timeAtPort: [...columnsOf("idleTime"), ...columnsOf("preBerthing"), ...columnsOf("dwellTime")],
    vesselsCargo: [...columnsOf("vessels", notCallSize), ...columnsOf("cargoHandled")],
    productivity: [...columnsOf("efficiency"), ...columnsOf("craneProductivity")],
    callSize: [
        ...columnsOf("avgTrt", isCallSize),
        ...columnsOf("medianTrt", isCallSize),
        ...columnsOf("ytdMedianTrt", isCallSize),
        ...columnsOf("vessels", isCallSize),
        ...columnsOf("containerSize"),
        ...columnsOf("cppiTrt"),
    ],
};

// Columns are inlined into SQL, so they must be plain identifiers from this file
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]*$/;
if (!ALL_COLUMNS.every((c) => SAFE_IDENTIFIER.test(c)) || new Set(ALL_COLUMNS).size !== ALL_COLUMNS.length) {
    throw new Error("portPerformanceFields: column list must hold unique, plain identifiers.");
}
