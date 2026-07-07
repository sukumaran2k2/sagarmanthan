import { pool } from "../../db.js";
import fs from 'fs';

const getFinancialYear = (year, month) => {
  let financialYearStart;
  let financialYearEnd;

  year = Number(year);

  if (month >= 4) {
      financialYearStart = `${year}`;
      financialYearEnd = `${year + 1}`;
  } else {
      financialYearStart = `${year - 1}`;
      financialYearEnd = `${year}`;
  }

  // console.log(`Start: ${financialYearStart}, End: ${financialYearEnd}`);

  return `${financialYearStart} - ${financialYearEnd}`;
};

async function addTrafficData(req, res) {
  try {
    const {
      Year,
      Month,
      Organisation,
      organisationID,
      polTonnes,
      otherLiquids,
      ironOreTonnes,
      fertilizerFinishedTonnes,
      fertilizerRawMaterialTonnes,
      thermalCoalTonnes,
      cookingCoalTonnes,
      containerTonnage,
      containerTeus,
      miscCargo,
      totalTraffics,
      userID,
    } = req.body;
    const financialYear = getFinancialYear(req.body.Year, req.body.Month);
    
    const conn = await pool;
    const request = conn.request();

    request.input("Year", Year);
    request.input("Month", Month);
    request.input("Organisation", Organisation);
    request.input("organisationID", organisationID);
    request.input("polTonnes", polTonnes);
    request.input("otherLiquids", otherLiquids);
    request.input("ironOreTonnes", ironOreTonnes);
    request.input("fertilizerFinishedTonnes", fertilizerFinishedTonnes);
    request.input("fertilizerRawMaterialTonnes", fertilizerRawMaterialTonnes);
    request.input("thermalCoalTonnes", thermalCoalTonnes);
    request.input("cookingCoalTonnes", cookingCoalTonnes);
    request.input("containerTonnage", containerTonnage);
    request.input("containerTeus", containerTeus);
    request.input("miscCargo", miscCargo);
    request.input("totalTraffics", totalTraffics);
    request.input("userID", userID);
    request.input("financialYear", financialYear);

    const checkResult = await request.query(`
        SELECT COUNT(*) AS count
        FROM tbl_traffic
        WHERE organisation_id = @Organisation
        AND financial_year = @year
        AND month = @Month;
    `);
    // console.log("checkresut", checkResult);

    if (checkResult.recordset[0].count > 0) {
        return res.sendStatus(302);
    }

    await request.query(`
            INSERT INTO tbl_traffic (
                user_organisation_id, financial_year, month, organisation_id, pol_tonnes,other_liquids, iron_ore_tonnes, fertilizer_finished_tonnes,
                fertilizer_raw_material_tonnes, thermal_coal_tonnes, cooking_coal_tonnes, container_tonnage,container_teus, misc_cargo, total_traffic,
                created_by, created_date, annually_financial_year
            ) VALUES (
                @organisationID, @Year, @Month, @Organisation, @polTonnes, @otherLiquids, @ironOreTonnes, @fertilizerFinishedTonnes,
                @fertilizerRawMaterialTonnes, @thermalCoalTonnes, @cookingCoalTonnes, @containerTonnage,
                @containerTeus, @miscCargo, @totalTraffics,
                @userID,GETDATE(), @financialYear
            )
        `);

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

async function getTrafficData(req, res) {
  const conn = await pool;
  const userID = req.params.userID;

  try {
    const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

    const { role_id } = userResult.recordset[0];

    let query;

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
      query = `
                SELECT
                financial_year, organisation_id,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END AS quarter_number,
                    SUM(pol_tonnes) AS total_pol_tonnes,
                    SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
                    SUM(container_tonnage) AS total_container_tonnage,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                WHERE organisation_id IS NOT NULL
                GROUP BY
                    organisation_id, financial_year,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END
                ORDER BY
                financial_year DESC, quarter_number;
            `;
    } else {
      const orgResult = await conn.query(
        `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
      );
      const organisationID = orgResult.recordset[0].organisation_id;

      const usersResult = await conn.query(
        `SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`
      );
      const userIDs = usersResult.recordset.map((user) => user.user_id);

      query = `
                SELECT
                financial_year,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END AS quarter_number,
                    SUM(pol_tonnes) AS total_pol_tonnes,
                    SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
                    SUM(container_tonnage) AS total_container_tonnage,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                    WHERE organisation_id = ${organisationID}
                GROUP BY
                    financial_year,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END
                ORDER BY
                financial_year DESC, quarter_number;
            `;
    }

    const result = await conn.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getQuarterlyTrafficData(req, res) {
  const conn = await pool;
  const userID = req.params.userID;

  try {
    const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

    const { role_id } = userResult.recordset[0];

    let query;

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
      query = `
                SELECT
                annually_financial_year, organisation_id,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END AS quarter_number,
                    SUM(pol_tonnes) AS total_pol_tonnes,
                    SUM(other_liquids) AS total_other_liquids,
                    SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
                    SUM(container_tonnage) AS total_container_tonnage,
                    SUM(container_teus) AS total_container_teus,
                    SUM(misc_cargo) AS total_misc_cargo,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                WHERE organisation_id IS NOT NULL
                GROUP BY
                    organisation_id, annually_financial_year,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END
                ORDER BY
                annually_financial_year DESC, quarter_number;
            `;
    } else {
      const orgResult = await conn.query(
        `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
      );
      const organisationID = orgResult.recordset[0].organisation_id;

      const usersResult = await conn.query(
        `SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`
      );
      const userIDs = usersResult.recordset.map((user) => user.user_id);

      query = `
                SELECT
                annually_financial_year,
                organisation_id,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END AS quarter_number,
                    SUM(pol_tonnes) AS total_pol_tonnes,
                    SUM(other_liquids) AS total_other_liquids,
                    SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
                    SUM(container_tonnage) AS total_container_tonnage,
                    SUM(container_teus) AS total_container_teus,
                    SUM(misc_cargo) AS total_misc_cargo,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                    WHERE organisation_id = ${organisationID}
                GROUP BY
                    annually_financial_year,
                    organisation_id,
                    CASE
                        WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                        WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                        WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                        WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                    END
                ORDER BY
                annually_financial_year DESC, quarter_number;
            `;
    }

    const result = await conn.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getAnnuallyTrafficData(req, res) {

  const conn = await pool;
  const userID = req.params.userID;

  try {
    const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

    const { role_id } = userResult.recordset[0];
    // console.log('role' , role_id);
    let query;

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
      query = `
        SELECT
            annually_financial_year,
            organisation_id,
            SUM(pol_tonnes) AS total_pol_tonnes,
            SUM(other_liquids) AS total_other_liquids,
            SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
            SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
            SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
            SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
            SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
            SUM(container_tonnage) AS total_container_tonnage,
            SUM(container_teus) AS total_container_teus,
            SUM(misc_cargo) AS total_misc_cargo,
            SUM(total_traffic) AS total_traffic
        FROM
            tbl_traffic
        WHERE
            organisation_id IS NOT NULL
        GROUP BY
            organisation_id, annually_financial_year
        ORDER BY
            annually_financial_year DESC;        
            `;
    } else {
      const orgResult = await conn.query(
        `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
      );
      const organisationID = orgResult.recordset[0].organisation_id;

      // const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
      // const userIDs = usersResult.recordset.map(user => user.user_id);

      query = `
              SELECT
                annually_financial_year,
                organisation_id,
                    SUM(pol_tonnes) AS total_pol_tonnes,
                    SUM(other_liquids) AS total_other_liquids,
                    SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
                    SUM(container_tonnage) AS total_container_tonnage,
                    SUM(container_teus) AS total_container_teus,
                    SUM(misc_cargo) AS total_misc_cargo,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                    WHERE organisation_id = ${organisationID}
                GROUP BY
                    organisation_id, annually_financial_year,
                ORDER BY
                  annually_financial_year DESC, quarter_number;
            `;
    }

    const result = await conn.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getMonthlyTrafficData(req, res) {
  const conn = await pool;
  const userID = req.params.userID;

  try {
    const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

    const { role_id } = userResult.recordset[0];

    let query;

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
      query = `
                SELECT
                    id,
                    financial_year,
                    month,
                    organisation_id,
                    SUM(pol_tonnes) AS pol_tonnes,
                    SUM(other_liquids) AS total_other_liquids,
                    SUM(iron_ore_tonnes) AS iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS cooking_coal_tonnes,
                    SUM(container_tonnage) AS container_tonnage,
                    SUM(container_teus) AS total_container_teus,
                    SUM(misc_cargo) AS total_misc_cargo,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                WHERE organisation_id IS NOT NULL
                GROUP BY
                    id, organisation_id, financial_year, month
                ORDER BY
                    financial_year DESC, month DESC;
            `;
    } else {
      const orgResult = await conn.query(
        `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
      );
      const organisationID = orgResult.recordset[0].organisation_id;
      query = `
                SELECT
                    id,
                    financial_year,
                    month,
                    organisation_id,
                    SUM(pol_tonnes) AS pol_tonnes,
                    SUM(other_liquids) AS total_other_liquids,
                    SUM(iron_ore_tonnes) AS iron_ore_tonnes,
                    SUM(fertilizer_finished_tonnes) AS fertilizer_finished_tonnes,
                    SUM(fertilizer_raw_material_tonnes) AS fertilizer_raw_material_tonnes,
                    SUM(thermal_coal_tonnes) AS thermal_coal_tonnes,
                    SUM(cooking_coal_tonnes) AS cooking_coal_tonnes,
                    SUM(container_tonnage) AS container_tonnage,
                    SUM(container_teus) AS total_container_teus,
                    SUM(misc_cargo) AS total_misc_cargo,
                    SUM(total_traffic) AS total_traffic
                FROM
                    tbl_traffic
                WHERE organisation_id = ${organisationID}
                GROUP BY
                    id, organisation_id, financial_year, month
                ORDER BY
                    financial_year DESC, month DESC;
            `;
    }

    const result = await conn.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getFilteredTrafficReport(req, res) {
  const conn = await pool;

  try {
    // console.log('getFilteredTrafficReport function worked');

    const {
      FromFirstMonthCompare,
      FromFirstYearCompare,
      TofirstMonthCompare,
      TofirstYearCompare,
      frmSecMonthCompare,
      frmSecYearCompare,
      ToSecMonthCompare,
      ToSecYearCompare,
      userID
    } = req.body;

    // console.log("FromFirstMonthCompare:", FromFirstMonthCompare);
    // console.log("FromFirstYearCompare:", FromFirstYearCompare);
    // console.log("TofirstMonthCompare:", TofirstMonthCompare);
    // console.log("TofirstYearCompare:", TofirstYearCompare);
    // console.log("frmSecMonthCompare:", frmSecMonthCompare);
    // console.log("frmSecYearCompare:", frmSecYearCompare);
    // console.log("ToSecMonthCompare:", ToSecMonthCompare);
    // console.log("ToSecYearCompare:", ToSecYearCompare);
    // console.log("userID:", userID);

    if (
      !FromFirstMonthCompare ||
      !FromFirstYearCompare ||
      !TofirstMonthCompare ||
      !TofirstYearCompare ||
      !frmSecMonthCompare ||
      !frmSecYearCompare ||
      !ToSecMonthCompare ||
      !ToSecYearCompare
    ) {
      return res
        .status(400)
        .json({ error: "Please fill all the filter fields." });
    }

    // console.log(userID);

    const userResult = await conn.query(`
      SELECT role_id
      FROM tbl_user
      WHERE user_id = ${userID}
    `);

    const { role_id } = userResult.recordset[0];

    const request = conn.request();

    request.input("FromFirstYearCompare", FromFirstYearCompare);
    request.input("FromFirstMonthCompare", FromFirstMonthCompare);
    request.input("TofirstYearCompare", TofirstYearCompare);
    request.input("TofirstMonthCompare", TofirstMonthCompare);
    request.input("frmSecYearCompare", frmSecYearCompare);
    request.input("frmSecMonthCompare", frmSecMonthCompare);
    request.input("ToSecYearCompare", ToSecYearCompare);
    request.input("ToSecMonthCompare", ToSecMonthCompare);

    let query1, query2;

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5) {
      // console.log('Query Qorked 1');
      query1 = `
        SELECT
          financial_year,
          organisation_id,
          SUM(pol_tonnes) AS total_pol_tonnes,
          SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
          SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
          SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
          SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
          SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
          SUM(container_tonnage) AS total_container_tonnage,
          SUM(total_traffic) AS total_traffic,
          SUM(other_liquids) AS other_liquids,
          SUM(container_teus) AS total_container_teus,
          SUM(misc_cargo) AS total_misc_cargo
        FROM 
          tbl_traffic
        WHERE 
          ((financial_year = @FromFirstYearCompare AND month >= @FromFirstMonthCompare)
          OR 
          (financial_year = @TofirstYearCompare AND month <= @TofirstMonthCompare))
        GROUP BY
          organisation_id , financial_year;
        
      `;
      query2 = `
        SELECT
          financial_year,
          organisation_id,
          SUM(pol_tonnes) AS total_pol_tonnes,
          SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
          SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
          SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
          SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
          SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
          SUM(container_tonnage) AS total_container_tonnage,
          SUM(total_traffic) AS total_traffic,
          SUM(other_liquids) AS other_liquids,
          SUM(container_teus) AS total_container_teus,
          SUM(misc_cargo) AS total_misc_cargo
        FROM 
          tbl_traffic
        WHERE 
          ((financial_year = @frmSecYearCompare AND month >= @frmSecMonthCompare)
          OR 
          (financial_year = @ToSecYearCompare AND month <= @ToSecMonthCompare))
        GROUP BY
          organisation_id, financial_year;
      `;
    } else {
      // console.log('Query Qorked 2');
      const orgResult = await conn.query(`
        SELECT organisation_id 
        FROM tbl_user 
        WHERE user_id = ${userID}`
      );
      const organisationID = orgResult.recordset[0].organisation_id;

      const usersResult = await conn.query(`
        SELECT user_id 
        FROM tbl_user 
        WHERE organisation_id = ${organisationID}`
      );
      const userIDs = usersResult.recordset.map((user) => user.user_id);

      query1 = `
        SELECT
          financial_year,
          organisation_id,
          SUM(pol_tonnes) AS total_pol_tonnes,
          SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
          SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
          SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
          SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
          SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
          SUM(container_tonnage) AS total_container_tonnage,
          SUM(total_traffic) AS total_traffic,
          SUM(other_liquids) AS other_liquids,
          SUM(container_teus) AS total_container_teus,
          SUM(misc_cargo) AS total_misc_cargo
        FROM 
          tbl_traffic
          WHERE 
          ((financial_year = @FromFirstYearCompare AND month >= @FromFirstMonthCompare)
          OR
          (financial_year = @TofirstYearCompare AND month <= @TofirstMonthCompare))
        GROUP BY
          organisation_id, financial_year;
      `;

      query2 = `
        SELECT
          financial_year,
          organisation_id,
          SUM(pol_tonnes) AS total_pol_tonnes,
          SUM(iron_ore_tonnes) AS total_iron_ore_tonnes,
          SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished_tonnes,
          SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw_material_tonnes,
          SUM(thermal_coal_tonnes) AS total_thermal_coal_tonnes,
          SUM(cooking_coal_tonnes) AS total_cooking_coal_tonnes,
          SUM(container_tonnage) AS total_container_tonnage,
          SUM(total_traffic) AS total_traffic,
          SUM(other_liquids) AS other_liquids,
          SUM(container_teus) AS total_container_teus,
          SUM(misc_cargo) AS total_misc_cargo
        FROM 
          tbl_traffic
          WHERE 
          ((financial_year = @frmSecYearCompare AND month >= @frmSecMonthCompare)
          OR 
          (financial_year = @ToSecYearCompare AND month <= @ToSecMonthCompare))
        GROUP BY
          organisation_id, financial_year;
      `;
    }

    const result1 = await request.query(query1);
    const result2 = await request.query(query2);

    // console.log(result1);
    // console.log(result2);

    res.json({ result1: result1.recordset, result2: result2.recordset });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

//Traffic Chart 
async function getPortWiseChartData(req, res){
  const financialYear = req.params.getCurrentFinancialYear;
  const conn = await pool;

  // console.log('getCurrentFinancialYear', financialYear);

  try {
    const request = conn.request();
    request.input("financialYear", financialYear);  // Pass the parameter without specifying the type

    const result = await request.query(`
    SELECT
      o.organisation_id,
      o.organisation_name,
      o.organisation_code,
      SUM(tc.pol_tonnes) AS total_pol_tonnes,
      SUM(tc.iron_ore_tonnes) AS total_iron_ore,
      SUM(tc.fertilizer_finished_tonnes) AS total_fertilizer_finished,
      SUM(tc.fertilizer_raw_material_tonnes) AS total_fertilizer_raw,
      SUM(tc.thermal_coal_tonnes) AS total_thermal_coal,
      SUM(tc.cooking_coal_tonnes) AS total_cooking_coal,
      SUM(tc.container_tonnage) AS total_container_tonnage,
      SUM(tc.container_teus) AS total_container_teus,
      SUM(tc.other_liquids) AS total_other_liquids
    FROM
      mmt_organisation o
    LEFT JOIN
      tbl_traffic tc ON o.organisation_id = tc.organisation_id AND tc.annually_financial_year = @financialYear
    WHERE
      o.organisation_category_id = 1
      AND o.organisation_id IS NOT NULL
    GROUP BY
      o.organisation_id, o.organisation_name, o.organisation_code
    ORDER BY
      o.organisation_id ASC;
    `);

    res.json(result.recordset);
  } catch (err) 
  {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getFinYearChartData(req, res){
  const conn = await pool;
  try {
    const result = await conn.query(`
    SELECT 
      annually_financial_year, 
        SUM(pol_tonnes) AS total_pol_tonnes,
        SUM(iron_ore_tonnes) AS total_iron_ore,
        SUM(fertilizer_finished_tonnes) AS total_fertilizer_finished,
        SUM(fertilizer_raw_material_tonnes) AS total_fertilizer_raw,
        SUM(thermal_coal_tonnes) AS total_thermal_coal,
        SUM(cooking_coal_tonnes) AS total_cooking_coal,
        SUM(container_tonnage) AS total_container,
        SUM(container_teus) AS total_container_teus,
        SUM(other_liquids) AS total_other_liquids
      FROM tbl_traffic
      WHERE annually_financial_year IS NOT NULL
    GROUP BY annually_financial_year;
    `);
    // console.log('getFinancialChartData',result);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}     getPortWiseChartData, getFinYearChartData

async function deleteMonthlyTrafficData(req, res) {
  const Id = req.params.id;
  const userID = req.params.userID;
  console.log('userID',userID);
  // console.log(Id);

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
  const hourPart = String(now.getHours()).padStart(2, '0'); 
  const minutePart = String(now.getMinutes()).padStart(2, '0'); 
  const secondPart = String(now.getSeconds()).padStart(2, '0'); 
  const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
  const logFolder = `./delete_log/Traffic`;
  const logFileName = `${logFolder}/deleted_traffic_log_${timestamp}.txt`;

  const conn = await pool;
  const request = conn.request();
  request.input("Id", Id);
  try {

    const dataToDelete = await conn.query(`SELECT * FROM tbl_traffic WHERE tbl_traffic.id = ${Id}`);
    const dataJSON = JSON.stringify(dataToDelete.recordset[0]);

    const result = await request.query(`DELETE FROM tbl_traffic WHERE tbl_traffic.id = @Id;`);
      
    // console.log('console.log', result);
    
    if (result.rowsAffected[0] > 0) {

      const logMessage = `User '${userID}' deleted monthly traffic data with ID '${Id}'. Deleted Data: ${dataJSON}\n`;

      // Append the log message to the log file
      fs.appendFile(logFileName, logMessage, (err) => {
        if (err) {
          console.error('Error writing to delete_logs.txt:', err);
        }
      });

      return res.sendStatus(201);

    } else {
        return res.status(404).send("Data not found");
    }

  }
  catch (err) {
      console.log(err);
      return res.sendStatus(500);
  }
};


const TrafficTab = { addTrafficData, getQuarterlyTrafficData,
    getAnnuallyTrafficData, getMonthlyTrafficData, getTrafficData,getFilteredTrafficReport,
    deleteMonthlyTrafficData,
    getPortWiseChartData, getFinYearChartData
};

export default TrafficTab;
