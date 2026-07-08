
import path from "path";
import fs from "fs";
import express from "express";
import { pool } from "../../db.js";


async function trackerList(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT year, month
                FROM tbl_mopsw_tracker              
                
                GROUP BY year, month
                
                ORDER BY year DESC,  
                CASE 
                    WHEN month = '1' THEN 1
                    WHEN month = '2' THEN 2
                    WHEN month = '3' THEN 3
                    WHEN month = '4' THEN 4
                    WHEN month = '5' THEN 5
                    WHEN month = '6' THEN 6
                    WHEN month = '7' THEN 7
                    WHEN month = '8' THEN 8
                    WHEN month = '9' THEN 9
                    WHEN month = '10' THEN 10
                    WHEN month = '11' THEN 11
                    WHEN month = '12' THEN 12
                END DESC; 
        ;`);

        res.json(result.recordset);
        // }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function checkDataMopswTracker(req, res) {
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);

    // Check if year, month are provided
    if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required." });
    }
    
    try {
        const result = await request.query(` SELECT COUNT(*) as count
            FROM tbl_mopsw_tracker 
            WHERE year = @year AND month = @month
        `); 
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};

async function getAddTrackerMasterdata(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    console.log(year, month)

    try {

        let result;

        let isExists = await request.query(`SELECT tracker_id from tbl_mopsw_tracker 
                where year = @year AND month = @month ;`);

        if (isExists.recordset.length > 0) {
            result = await request.query(` SELECT 
                        tracker_id AS trackerId, 
                        year, 
                        month, 
                        tbl_mopsw_tracker.code_id AS codeId, 
                        mmt_mopsw_tracker_code.code_name AS codeName,  
                        tbl_mopsw_tracker.indicator_name AS indicatorName, 
                        tbl_mopsw_tracker.concerned_mopsw_official AS concernedName,
                        value AS value
                    FROM tbl_mopsw_tracker
                    INNER JOIN mmt_mopsw_tracker_code ON mmt_mopsw_tracker_code.code_id = tbl_mopsw_tracker.code_id
                    WHERE year = @year AND month = @month` );
        }

//         SELECT  
//     c.code_id,
//     c.code_name,
//     i.indicator_id,
//     i.indicator_name,
//     i.concerned_name
// FROM mmt_mopsw_tracker_code c
// LEFT JOIN mmt_mopsw_tracker_indicator i
//     ON i.code_id = c.code_id
// WHERE c.status = 1
// ORDER BY c.code_id, i.indicator_id
        else {
            result = await request.query(`SELECT  
                    mmt_mopsw_tracker_code.code_id AS codeId, mmt_mopsw_tracker_code.code_name AS codeName, 
                    mmt_mopsw_tracker_indicator.indicator_name AS indicatorName, 
                    mmt_mopsw_tracker_indicator.concerned_name AS concernedName

                    FROM mmt_mopsw_tracker_code
                    LEFT JOIN mmt_mopsw_tracker_indicator ON mmt_mopsw_tracker_indicator.code_id = mmt_mopsw_tracker_code.code_id
            ` );
        }

        // console.log(result, "result")
        const rowData = result.recordset;
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            { headerName: "Tracker ID", field: "trackerId", sortable: true, filter: true, width: 50, hide: true },          
            { headerName: "Code Id", field: "codeId", sortable: true, filter: true, width: 300, hide: true, },
            { headerName: "Code", field: "codeName", sortable: true, filter: true, width: 300, rowGroup: true, hide: true, pinned: true,},
            { headerName: "Indicator (KPI)", field: "indicatorName", sortable: true, filter: true, width: 170 },
            { headerName: "Concerned MoPSW Official", field: "concernedName", sortable: true, filter: true, width: 130 },
            { headerName: "Input Value", field: "value", editable: true, filter: true, width: 270, editable:true },                    
                
        ]

        const collapsedData = collapseSingleChildGroups(rowData, "codeName");

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

function collapseSingleChildGroups(data, groupField) {
  const grouped = {};
  data.forEach(row => {
    const key = row[groupField];
    grouped[key] = grouped[key] || [];
    grouped[key].push(row);
  });

  const result = [];
  Object.entries(grouped).forEach(([key, rows]) => {
    if (rows.length === 1) {
      // Replace child with just the parent row
      result.push({ [groupField]: key });
    } else {
      result.push(...rows);
    }
  });

  return result;
}



async function createMopswTracker(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const rowData = req.body.rowData;

    const conn = await pool;
    console.log(year, rowData)
    try {

        for (let p = 0; p < rowData.length; p++) {
            const trackerId = rowData[p].trackerId
            let codeId = rowData[p].codeId
            let codeName = rowData[p].codeName
            let indicatorName = rowData[p].indicatorName || codeName;
            let concernedName = rowData[p].concernedName
            let value = rowData[p].value ;

            console.log(value, trackerId, 'value')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);
            request.input("trackerId", trackerId);
            // request.input("typeId", typeId);
            // request.input("gradeId", gradeId);
            request.input("codeId", codeId);
            request.input("codeName", codeName);
            request.input("indicatorName", indicatorName);
            request.input("concernedName", concernedName);
            request.input("value", value);

            const query = `IF NOT EXISTS (
                    SELECT tbl_mopsw_tracker.tracker_id 
                    FROM tbl_mopsw_tracker 
                    WHERE year = @year AND month = @month AND tracker_id = @trackerId
                )

                BEGIN
                    INSERT INTO tbl_mopsw_tracker (year, month, code_id, indicator_name, concerned_mopsw_official, 
                        value) 
                    VALUES (
                        @year, 
                        @month,
                        @codeId, 
                        @indicatorName, 
                        @concernedName, 
                        @value
                    )
                END
                ELSE
                BEGIN
                    UPDATE tbl_mopsw_tracker
                    SET 
                        code_id = @codeId,
                        indicator_name = @indicatorName,                             
                        concerned_mopsw_official = @concernedName,
                        value = @value
                    WHERE 
                        year = @year 
                        AND month = @month 
                        AND tracker_id = @trackerId;
                END   `;

            const result = await request.query(query);
        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


// async function createMopswTracker(req, res) {
//     const year = req.body.year;
//     const month = req.body.month;
//     const rowData = req.body.rowData;

//     const conn = await pool;
//     console.log(year, rowData)
//     try {

//         for (let p = 0; p < rowData.length; p++) {
//             const trackerId = rowData[p].trackerId
//             let codeId = rowData[p].codeId
//             let codeName = rowData[p].codeName
//             let indicatorName = rowData[p].indicatorName
//             let concernedName = rowData[p].concernedName
//             let value = rowData[p].value

//             console.log(value, trackerId, 'value')

//             const request = conn.request();
//             request.input("year", year);
//             request.input("month", month);
//             request.input("trackerId", trackerId);
//             // request.input("typeId", typeId);
//             // request.input("gradeId", gradeId);
//             request.input("codeId", codeId);
//             request.input("codeName", codeName);
//             request.input("indicatorName", indicatorName);
//             request.input("concernedName", concernedName);
//             request.input("value", value);

//             const query = `IF NOT EXISTS (
//                     SELECT tbl_mopsw_tracker.tracker_id 
//                     FROM tbl_mopsw_tracker 
//                     WHERE year = @year AND month = @month AND tracker_id = @trackerId
//                 )

//                 BEGIN
//                     INSERT INTO tbl_mopsw_tracker (year, month, code_id, indicator_name, concerned_mopsw_official, 
//                         value) 
//                     VALUES (
//                         @year, 
//                         @month,
//                         @codeId, 
//                         @indicatorName, 
//                         @concernedName, 
//                         @value
//                     )
//                 END
//                 ELSE
//                 BEGIN
//                     UPDATE tbl_mopsw_tracker
//                     SET 
//                         code_id = @codeId,
//                         indicator_name = @indicatorName,                             
//                         concerned_mopsw_official = @concernedName,
//                         value = @value
//                     WHERE 
//                         year = @year 
//                         AND month = @month 
//                         AND tracker_id = @trackerId;
//                 END   `;

//             const result = await request.query(query);
//         }
//         res.sendStatus(201);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

async function downloadTrackerExcel(req, res) {
     const filePath = path.join("fileuploads", "Mopsw_Tracker", "MoPSW_Tracker.xlsx");

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    res.download(filePath, "MoPSW_Tracker.xlsx"); // forces download

};

async function getmopswTrackermonthlyReport(req, res) {
    const conn = await pool;
    try {
        let { currentMonth, selectedFY } = req.query;

        if (!currentMonth) {
            return res.status(400).json({ error: "Month is required" });
        }

        currentMonth = parseInt(currentMonth, 10);
        const today = new Date();
        const currentYear = today.getFullYear();

        // --- Determine Fiscal Years ---
        let currentFYStart, currentFYEnd;

        if (selectedFY) {
            [currentFYStart, currentFYEnd] = selectedFY.split('-').map(Number);
        } else {
            currentFYStart = currentMonth >= 4 ? currentYear : currentYear - 1;
            currentFYEnd = currentFYStart + 1;
        }

        const previousFYStart = currentFYStart - 1;
        const previousFYEnd = currentFYEnd - 1;

        // Previous month calculation
        const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

        // --- Fetch indicators ---
        const indicatorQuery = `
          SELECT 
            c.code_id, 
            c.code_name AS section,
            i.indicator_name AS kpi,
            i.concerned_name AS official
        FROM mmt_mopsw_tracker_code AS c
        LEFT JOIN mmt_mopsw_tracker_indicator AS i
            ON c.code_id = i.code_id
        WHERE c.status = 1
        ORDER BY c.code_id, i.indicator_id;

        `;
        const indicatorsResult = await conn.request().query(indicatorQuery);
        const indicators = indicatorsResult.recordset;

        if (!indicators.length) return res.status(404).json({ error: "No indicators found" });

        // --- Fetch tracker values ---
        const trackerQuery = `SELECT tracker_id, code_id, indicator_name, [value], month, [year] FROM tbl_mopsw_tracker`;
        const trackerResult = await conn.request().query(trackerQuery);
        const trackerValues = trackerResult.recordset;

        const sectionsMap = {};

        indicators.forEach((indicator, index) => {
            const key = `${indicator.code_id}_${indicator.kpi}`;
            const relatedTrackers = trackerValues.filter(t => `${t.code_id}_${t.indicator_name}` === key);

            // --- fy_2014_15 column ---
            const fy2014_15Trackers = relatedTrackers.filter(t =>
            (t.year === 2014 && t.month >= 4) || (t.year === 2015 && t.month <= 3)
            );

        let fy_2014_15 = null;
        if (fy2014_15Trackers.length > 0) {
            const total = fy2014_15Trackers.reduce((sum, t) => sum + (t.value || 0), 0);
            if (["M13", "M14", "M15", "M16", "M17"].includes(indicator.kpi.split(" ")[0])) {
                fy_2014_15 = total / fy2014_15Trackers.length; // average
            } else {
                fy_2014_15 = total; // sum
            }
        }
            // --- Determine years for columns A, C, D ---
            let aYear, cYear, dYear;

            // Column D = current month selected FY
        if (currentMonth >= 4) {
         // Apr–Dec → belongs to FY start year
            dYear = currentFYStart;
            } else {
                // Jan–Mar → belongs to FY end year
                dYear = currentFYEnd;
        }
            // Column A = same month previous FY
        if (currentMonth >= 4) {
            // Apr–Dec → previous FY start year
            aYear = previousFYStart;
            } else {
                // Jan–Mar → previous FY end year
                aYear = previousFYEnd;
        }

            // Column C = previous month
        if (currentMonth === 4) {
            // April → previous month = March of previous FY
            cYear = previousFYEnd;
            } else if (currentMonth > 4) {
                // May–Dec → previous month same FY
                cYear = currentFYStart;
            } else {
                // Jan–Mar → previous month same FY end year
                cYear = currentFYEnd;
        }

        // --- Get values for Columns A, C, D ---
        const aValueObj = relatedTrackers.find(t => t.month === currentMonth && t.year === aYear);
        const aValue = aValueObj?.value ?? null;

        const cValueObj = relatedTrackers.find(t => t.month === previousMonth && t.year === cYear);
        const cValue = cValueObj?.value ?? null;

        const dValueObj = relatedTrackers.find(t => t.month === currentMonth && t.year === dYear);
        const dValue = dValueObj?.value ?? null;

            // Column B: YTD previous FY (Apr → Mar)
        // --- Column B: YTD previous FY (Apr → Mar)
            const ytdTrackers = relatedTrackers.filter(t =>
                (t.year === previousFYStart && t.month >= 4) ||
                (t.year === previousFYEnd && t.month <= 3)
            );

            let ytdValue = null;
            if (ytdTrackers.length > 0) {
                const total = ytdTrackers.reduce((sum, t) => sum + (t.value || 0), 0);

                if (["M13", "M14", "M15", "M16", "M17"].includes(indicator.kpi.split(" ")[0])) {
                    ytdValue = total / ytdTrackers.length; // average
                } else {
                    ytdValue = total; // sum
                }
            }


         // --- Column E: YTD selected FY (Apr → currentMonth)
        const currentYtdTrackers = relatedTrackers.filter(t =>
            (t.year === currentFYStart && t.month >= 4 && t.month <= currentMonth) ||
            (t.year === currentFYEnd && currentMonth <= 3 && t.month <= currentMonth)
        );

        let currentYtdValue = null;
        if (currentYtdTrackers.length > 0) {
            const total = currentYtdTrackers.reduce((sum, t) => sum + (t.value || 0), 0);

            if (["M13", "M14", "M15", "M16", "M17"].includes(indicator.kpi.split(" ")[0])) {
                currentYtdValue = total / currentYtdTrackers.length; // average
            } else {
                currentYtdValue = total; // sum
            }
        }
            // MoM Growth
            let momGrowth = null;
            if (cValue !== null && cValue !== 0 && dValue !== null) {
                momGrowth = ((dValue - cValue) / cValue) * 100;
                momGrowth = Number(momGrowth.toFixed(2));
            }

            // YoY Growth
            let yoyGrowth = null;
            if (ytdValue !== null && ytdValue !== 0 && currentYtdValue !== null) {
                yoyGrowth = ((currentYtdValue - ytdValue) / ytdValue) * 100;
                yoyGrowth = Number(yoyGrowth.toFixed(2));
            }

            // --- Sections Map ---
            if (!sectionsMap[indicator.section]) sectionsMap[indicator.section] = { section: indicator.section, children: [] };

            sectionsMap[indicator.section].children.push({
                sno: `M${index + 1}`,
                kpi: indicator.kpi,
                official: indicator.official,
                fy_2014_15: fy_2014_15,
                march_lastFY: aValue,
                previous_2024_25: cValue,
                current_2024_25: dValue,
                ytd_value: ytdValue,
                current_ytd_value: currentYtdValue,
                mom_growth: momGrowth,
                yoy_growth: yoyGrowth
            });
        });

        const rowData = Object.values(sectionsMap);

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching MoPSW tracker report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}







export default { downloadTrackerExcel,trackerList,  checkDataMopswTracker, getAddTrackerMasterdata, createMopswTracker, getmopswTrackermonthlyReport};