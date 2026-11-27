import { pool } from "../../db.js";

const TABLE = 'tbl_kpi_dgs_2_1';
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const ymOf = (d) => d.getFullYear() * 100 + (d.getMonth() + 1);
const round2 = (x) => Math.round(x * 100) / 100;

// All reports have same dynamic dates (Nov 2026 example)
function getReportDates(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const fyStart = m >= 3 ? y : y - 1;           // 2026
  const asOn    = new Date(y, m, 0);            // 31-10-2026
  const cutoff  = new Date(y, m - 1, 0);        // 30-09-2026 (2 month lag)
  const monthDt = new Date(y, m - 1, 1);        // October 2026
  return {
    now, fyStart, asOn, cutoff, monthDt,
    prevLabel: `${fyStart - 1}-${fyStart}`,
    prevStart: (fyStart - 1) * 100 + 4,
    prevEnd: fyStart * 100 + 3,
    currStart: fyStart * 100 + 4,
    currEnd: ymOf(cutoff),
    monthYm: ymOf(monthDt),
    totalEnd: ymOf(asOn),
    monthLabel: monthDt.toLocaleString('en-GB', { month: 'long', year: 'numeric' }).replace(' ', '-'),
    reportMonth: now.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
  };
}

/* ---------- K-2.1.1 & K-2.1.2 (Addition / Deletion) ---------- */
async function buildFlaggingReport(res, prefix) {
  try {
    const d = getReportDates();
    const colApp = `[${prefix}_application_received]`;   // prefix: 'addition' | 'deletion' only
    const colReg = `[${prefix}_registered_ship]`;
    const colTon = `[${prefix}_total_tonnage]`;

    const conn = await pool;
    const result = await conn.request()
      .input('prevStart', d.prevStart).input('prevEnd', d.prevEnd)
      .input('currStart', d.currStart).input('currEnd', d.currEnd)
      .input('monthYm', d.monthYm)
      .query(`
        SELECT [type] AS mmd_name,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @prevStart AND @prevEnd THEN ${colApp} ELSE 0 END) AS prev_received,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @prevStart AND @prevEnd THEN ${colReg} ELSE 0 END) AS prev_registered,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @prevStart AND @prevEnd THEN ${colTon} ELSE 0 END) AS prev_tonnage,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @currStart AND @currEnd THEN ${colApp} ELSE 0 END) AS curr_received,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @currStart AND @currEnd THEN ${colReg} ELSE 0 END) AS curr_registered,
          SUM(CASE WHEN ([year]*100+[month]) BETWEEN @currStart AND @currEnd THEN ${colTon} ELSE 0 END) AS curr_tonnage,
          SUM(CASE WHEN ([year]*100+[month]) = @monthYm THEN ${colApp} ELSE 0 END) AS month_received,
          SUM(CASE WHEN ([year]*100+[month]) = @monthYm THEN ${colReg} ELSE 0 END) AS month_registered,
          SUM(CASE WHEN ([year]*100+[month]) = @monthYm THEN ${colTon} ELSE 0 END) AS month_tonnage
        FROM ${TABLE}
        GROUP BY [type]
        ORDER BY [type];
      `);

   const rowData = result.recordset.map((r) => {
    const prev_pending = r.prev_received - r.prev_registered;
    const curr_pending = r.curr_received - r.curr_registered;
    const month_pending = r.month_received - r.month_registered;

    return {
        ...r,

        prev_pending,
        curr_pending,
        month_pending,

        // Total up to 30-10-2026
        total_registered: r.curr_registered + r.month_registered,
        total_pending: curr_pending + month_pending,
        total_tonnage: r.curr_tonnage + r.month_tonnage,
    };
});
    res.json({
      rowData,
      prevFyLabel: d.prevLabel,
      currFyUpto: fmt(d.cutoff),
      monthLabel: d.monthLabel,
      totalUpto: fmt(d.asOn),
      asOnDate: fmt(d.asOn),
      reportMonth: d.reportMonth,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getKpiDgsFlaggingAddition(req, res) { return buildFlaggingReport(res, 'addition'); }
async function getKpiDgsFlaggingDeletion(req, res) { return buildFlaggingReport(res, 'deletion'); }

/* ---------- K-2.1.3 Cumulative Active Ships & Tonnage (flat array) ---------- */
async function getKpiDgs1_3(req, res) {
  try {
    const d = getReportDates();
    const conn = await pool;
    const result = await conn.request()
      .input('prevEnd', d.prevEnd).input('currEnd', d.currEnd)
      .input('monthYm', d.monthYm).input('totalEnd', d.totalEnd)
      .query(`
        SELECT [type] AS mmd_name,
          SUM(CASE WHEN ([year]*100+[month]) <= @prevEnd  THEN addition_registered_ship - deletion_registered_ship ELSE 0 END) AS prev_ships,
          SUM(CASE WHEN ([year]*100+[month]) <= @prevEnd  THEN addition_total_tonnage   - deletion_total_tonnage   ELSE 0 END) AS prev_ton,
          SUM(CASE WHEN ([year]*100+[month]) <= @currEnd  THEN addition_registered_ship - deletion_registered_ship ELSE 0 END) AS curr_ships,
          SUM(CASE WHEN ([year]*100+[month]) <= @currEnd  THEN addition_total_tonnage   - deletion_total_tonnage   ELSE 0 END) AS curr_ton,
          SUM(CASE WHEN ([year]*100+[month]) =  @monthYm  THEN addition_registered_ship - deletion_registered_ship ELSE 0 END) AS month_ships,
          SUM(CASE WHEN ([year]*100+[month]) =  @monthYm  THEN addition_total_tonnage   - deletion_total_tonnage   ELSE 0 END) AS month_ton,
          SUM(CASE WHEN ([year]*100+[month]) <= @totalEnd THEN addition_registered_ship - deletion_registered_ship ELSE 0 END) AS total_ships,
          SUM(CASE WHEN ([year]*100+[month]) <= @totalEnd THEN addition_total_tonnage   - deletion_total_tonnage   ELSE 0 END) AS total_ton
        FROM ${TABLE}
        GROUP BY [type]
        ORDER BY [type];
      `);

    const P = `During the Previous FY (${d.prevLabel})`;
    const C = `During the Current FY-upto ${fmt(d.cutoff)}`;
    const M = `During the Month (${d.monthLabel})`;
    const T = `Total upto ${fmt(d.asOn)}`;

    const rows = result.recordset.map((r) => ({
      'MMD Name': r.mmd_name,
      [`${P} - Ships`]: r.prev_ships,   [`${P} - Tonnage`]: r.prev_ton,
      [`${C} - Ships`]: r.curr_ships,   [`${C} - Tonnage`]: r.curr_ton,
      [`${M} - Ships`]: r.month_ships,  [`${M} - Tonnage`]: r.month_ton,
      [`${T} - Ships`]: r.total_ships,  [`${T} - Tonnage`]: r.total_ton,
    }));

      res.json({
      data: rows,
      asOnDate: fmt(d.asOn),
      reportMonth: d.reportMonth,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

/* ---------- K-2.1.4 Monthly Trends (current FY) ---------- */
async function getKpiDgs1_4(req, res) {
  try {
    const d = getReportDates();
    const fyStart = d.fyStart;
    const NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July',
                   'August', 'September', 'October', 'November', 'December'];
    const ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

    const conn = await pool;
    const result = await conn.request()
      .input('fyFrom', fyStart * 100 + 4).input('fyTo', (fyStart + 1) * 100 + 3)
      .query(`
        SELECT [year], [month],
          SUM(addition_registered_ship) AS add_ship, SUM(addition_total_tonnage) AS add_ton,
          SUM(deletion_registered_ship) AS del_ship, SUM(deletion_total_tonnage) AS del_ton
        FROM ${TABLE}
        WHERE ([year]*100+[month]) BETWEEN @fyFrom AND @fyTo
        GROUP BY [year], [month];
      `);

    const byYm = {};
    result.recordset.forEach((r) => { byYm[r.year * 100 + r.month] = r; });

    const cats = {
      reg:  { Category: 'No of Registered Ships' },
      dereg:{ Category: 'No of Deregistered Ships' },
      net:  { Category: 'No of Net Ships Added' },
      cum:  { Category: 'Cumulative Registered Ships' },
    };

    let cumShip = 0, cumTon = 0;
    ORDER.forEach((mo) => {
      const yr = mo >= 4 ? fyStart : fyStart + 1;
      const label = `${NAMES[mo]}-${String(yr).slice(-2)}`;
      const r = byYm[yr * 100 + mo];
      const kS = `${label} - Ships`, kT = `${label} - Tonnage`;
      if (!r) {
        [cats.reg, cats.dereg, cats.net, cats.cum].forEach((c) => { c[kS] = null; c[kT] = null; });
        return;
      }
      cumShip += (r.add_ship || 0) - (r.del_ship || 0);
      cumTon  += (r.add_ton  || 0) - (r.del_ton  || 0);
      cats.reg[kS] = r.add_ship;   cats.reg[kT] = r.add_ton;
      cats.dereg[kS] = r.del_ship; cats.dereg[kT] = r.del_ton;
      cats.net[kS] = (r.add_ship || 0) - (r.del_ship || 0);
      cats.net[kT] = (r.add_ton || 0) - (r.del_ton || 0);
      cats.cum[kS] = cumShip;      cats.cum[kT] = cumTon;
    });

      res.json({
      data: [cats.reg, cats.dereg, cats.net, cats.cum],
      asOnDate: fmt(d.asOn),
      reportMonth: d.reportMonth,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

/* ---------- K-2.1.5 Yearly Trends ---------- */
async function getKpiDgs1_5(req, res) {
  try {
    const now = new Date();
    const d = getReportDates();
    const fyNow = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleString('en-GB', { month: 'long' });

    const conn = await pool;
    const result = await conn.request().query(`
      SELECT [year], [month],
        SUM(addition_registered_ship) AS add_ship, SUM(addition_total_tonnage) AS add_ton,
        SUM(deletion_registered_ship) AS del_ship, SUM(deletion_total_tonnage) AS del_ton
      FROM ${TABLE}
      WHERE [year] >= 2022
      GROUP BY [year], [month];
    `);

    const byFy = {};
    result.recordset.forEach((r) => {
      const s = r.month >= 4 ? r.year : r.year - 1;
      if (s < 2022) return;
      if (!byFy[s]) byFy[s] = { add_ship: 0, add_ton: 0, del_ship: 0, del_ton: 0 };
      byFy[s].add_ship += r.add_ship || 0;
      byFy[s].add_ton  += r.add_ton  || 0;
      byFy[s].del_ship += r.del_ship || 0;
      byFy[s].del_ton  += r.del_ton  || 0;
    });

    const reg   = { Metric: 'No of Registered Ships & Tonnage' };
    const dereg = { Metric: 'No of Deregistered Ships & Tonnage' };
    const net   = { Metric: 'Net Registered Ships & Tonnage' };
    const cum   = { Metric: 'No of Cumulative Ships & Tonnage' };

    // Fixed history (FY2013-14 to FY2021-22) - same values as old code
    const HIST = [
      [2013, 1199, 10383], [2014, 1204, 10309], [2015, 1246, 10508], [2016, 1301, 11425],
      [2017, 1371, 12352], [2018, 1400, 12683], [2019, 1429, 12746], [2020, 1463, 13011],
      [2021, 1491, 12995],
    ];
    HIST.forEach(([s, ships, ton]) => {
      const fy = `FY${s}-${s + 1}`;
      [reg, dereg, net].forEach((o) => { o[`${fy} - Ships`] = 0; o[`${fy} - Tonnage`] = 0; });
      cum[`${fy} - Ships`] = ships; cum[`${fy} - Tonnage`] = ton;
    });

    let cumShips = 1491, cumTon = 12995;   // opening balance at end of FY2021-22
    for (let s = 2022; s <= fyNow; s++) {
      const base = `FY${s}-${s + 1}`;
      const fy = s === fyNow ? `${base} (upto ${prevMonthName})` : base;
      const v = byFy[s] || { add_ship: 0, add_ton: 0, del_ship: 0, del_ton: 0 };
      const addTon = round2(v.add_ton / 1000), delTon = round2(v.del_ton / 1000);
      const netShips = v.add_ship - v.del_ship, netTon = round2(addTon - delTon);
      cumShips += netShips; cumTon = round2(cumTon + netTon);

      reg[`${fy} - Ships`] = v.add_ship;   reg[`${fy} - Tonnage`] = addTon;
      dereg[`${fy} - Ships`] = v.del_ship; dereg[`${fy} - Tonnage`] = delTon;
      net[`${fy} - Ships`] = netShips;     net[`${fy} - Tonnage`] = netTon;
      cum[`${fy} - Ships`] = cumShips;     cum[`${fy} - Tonnage`] = cumTon;
    }

    res.json({
      data: [reg, dereg, net, cum],
      asOnDate: fmt(d.asOn),
      reportMonth: d.reportMonth,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

export default {
  getKpiDgsFlaggingAddition,
  getKpiDgsFlaggingDeletion,   
  getKpiDgs1_3,
  getKpiDgs1_4,
  getKpiDgs1_5,
};