import { pool } from "../../db.js";


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
    return `${financialYearStart}-${financialYearEnd}`;
};


async function createFinancialParameter(req, res) {
    const organisationId = req.body.organisationId;
    const year = req.body.financialYear;
    const month = req.body.month;
    const operatingIncome = req.body.operatingIncome;
    const operatingExpenditure = req.body.operatingExpenditure;
    const totalIncome = req.body.totalIncome;
    const totalExpenditure = req.body.totalExpenditure;
    const perTonneHandlingCost = req.body.perTonneHandlingCost;
    const operatingSurplus = req.body.operatingSurplus;
    const netSurplus = req.body.netSurplus;
    const operatingRatio = req.body.operatingRatio;
    const operatingProfit = req.body.operatingProfit;
    const teuContainer = req.body.teuContainer;
    const tonneofDrybulk = req.body.tonneofDrybulk;
    const tonneofBreakbulk = req.body.tonneofBreakbulk;
    const tonneofLiquidbulk = req.body.tonneofLiquidbulk;
    const userID = req.body.userID;
    const financialYear = getFinancialYear(year, month);

    const conn = await pool;
    // console.log(financialYear);
    const request = conn.request();
    request.input("organisationId", organisationId);
    request.input("year", year);
    request.input("month", month);
    request.input("operatingIncome", operatingIncome);
    request.input("operatingExpenditure", operatingExpenditure);
    request.input("totalIncome", totalIncome);
    request.input("totalExpenditure", totalExpenditure);
    request.input("perTonneHandlingCost", perTonneHandlingCost);
    request.input("operatingSurplus", operatingSurplus);
    request.input("netSurplus", netSurplus);
    request.input("operatingRatio", operatingRatio);
    request.input("operatingProfit", operatingProfit);
    request.input("teuContainer", teuContainer);
    request.input("tonneofDrybulk", tonneofDrybulk);
    request.input("tonneofBreakbulk", tonneofBreakbulk);
    request.input("tonneofLiquidbulk", tonneofLiquidbulk);
    request.input("userID", userID);
    request.input("financialYear", financialYear);

    try {

        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_financial_parameter
            WHERE organisation_id = @organisationId
            AND year = @year
            AND month = @month;
        `);
        if (checkResult.recordset[0].count > 0) {
            return res.status(202).json({ error: "Record already exists for the specified financialYear and organisationId." });
        }
        const result = await request.query(`
            INSERT INTO tbl_financial_parameter (
                organisation_id, year, month, operating_income, operating_expenditure, total_income, total_expenditure,
                per_tonne_handling_cost, operating_surplus, net_surplus, operating_ratio,operating_profit_tonne,teu_container,tonne_dry_bulk,tonne_break_bulk,tonne_liquid_bulk, created_by, created_date, annually_financial_year
            )
            VALUES (
                @organisationId, @year, @month, @operatingIncome, @operatingExpenditure, @totalIncome, @totalExpenditure,
                @perTonneHandlingCost, @operatingSurplus, @netSurplus, @operatingRatio, @operatingProfit, @teuContainer, @tonneofDrybulk, @tonneofBreakbulk, @tonneofLiquidbulk, @userID, GETDATE(), @financialYear
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

/*
async function getFinancialParameter(req, res) {
    const conn = await pool;
    const request = conn.request();

    const userID = req.params.userID;
    request.input("userID", userID);

    try {
        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);
            
        const { role_id } = userResult.recordset[0];
       
        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            query = `SELECT * from tbl_financial_parameter ORDER BY year DESC`;
        } else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            // const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            // const userIDs = usersResult.recordset.map(user => user.user_id);

            request.input('organisationID', organisationID);
            query = `SELECT * from tbl_financial_parameter  WHERE organisation_id = @organisationID ORDER BY year DESC`;
        }
        console.log('userID-sun1', userID)
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
*/

async function getFinancialParameter(req, res) {
    const conn = await pool;
    const request = conn.request();

    const userID = req.params.userID;
    request.input("userID", userID);

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    try {
        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);
            
        const { role_id } = userResult.recordset[0];
       
        let query;
        let countQuery = "";

        if (page && limit) {
            const offset = (page - 1) * limit;
            request.input('offset', offset);
            request.input('limit', limit);

            if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
                query = `
                    SELECT 
                        tf.*, 
                        org.organisation_name,
                        COUNT(*) OVER() AS total_count
                    FROM tbl_financial_parameter tf
                    LEFT JOIN mmt_organisation org ON tf.organisation_id = org.organisation_id
                    ORDER BY tf.year DESC, tf.month
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `;
            } else {
                const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
                const organisationID = orgResult.recordset[0].organisation_id;

                request.input('organisationID', organisationID);
                query = `
                    SELECT 
                        tf.*, 
                        org.organisation_name,
                        COUNT(*) OVER() AS total_count
                    FROM tbl_financial_parameter tf
                    LEFT JOIN mmt_organisation org ON tf.organisation_id = org.organisation_id
                    WHERE tf.organisation_id = @organisationID
                    ORDER BY tf.year DESC, tf.month
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `;
            }

            const result = await request.query(query);
            const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;
            return res.status(200).json({
                data: result.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } else {
            if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
                query = `
                    SELECT 
                        tf.*, 
                        org.organisation_name
                    FROM tbl_financial_parameter tf
                    LEFT JOIN mmt_organisation org ON tf.organisation_id = org.organisation_id
                    ORDER BY tf.year DESC, tf.month
                `;
            } else {
                const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
                const organisationID = orgResult.recordset[0].organisation_id;

                request.input('organisationID', organisationID);
                query = `
                    SELECT 
                        tf.*, 
                        org.organisation_name
                    FROM tbl_financial_parameter tf
                    LEFT JOIN mmt_organisation org ON tf.organisation_id = org.organisation_id
                    WHERE tf.organisation_id = @organisationID
                    ORDER BY tf.year DESC, tf.month
                `;
            }

            const result = await request.query(query);
            return res.status(200).json(result.recordset);
        }
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyFinancialParameter(req, res) {
    const conn = await pool;
    const userID = req.params.userID;
    
    const request = conn.request();
    request.input("userID", userID);
    try {
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id, organisation_id } = userResult.recordset[0];
      
        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8 || organisation_id == 16) {
            query = `
            SELECT
                organisation_id,
                annually_financial_year,
                month,
                SUM(financial_parameter_id) AS financial_parameter_id,
                SUM(operating_income) AS operating_income,
                SUM(operating_expenditure) AS operating_expenditure,
                SUM(operating_surplus) AS operating_surplus,
                SUM(total_income) AS total_income,
                SUM(total_expenditure) AS total_expenditure,
                SUM(net_surplus) AS net_surplus,
                SUM(operating_ratio) AS operating_ratio,
                SUM(per_tonne_handling_cost) AS per_tonne_handling_cost,
                SUM(operating_profit_tonne) AS operating_profit_tonne,
                SUM(teu_container) AS teu_container,
                SUM(tonne_dry_bulk) AS tonne_dry_bulk,
                SUM(tonne_break_bulk) AS tonne_break_bulk,
                SUM(tonne_liquid_bulk) AS tonne_liquid_bulk,
                MAX(created_date) AS created_date
            FROM tbl_financial_parameter
            GROUP BY organisation_id, annually_financial_year, month
            ORDER BY annually_financial_year DESC, month DESC`;
        } else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            // const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            // const userIDs = usersResult.recordset.map(user => user.user_id);

            request.input("organisationID", organisationID);
            query = `SELECT
                organisation_id,
                annually_financial_year,
                month,
                financial_parameter_id,
                operating_income,
                operating_expenditure,
                operating_surplus,
                total_income,
                total_expenditure,
                net_surplus,
                operating_ratio,
                per_tonne_handling_cost,
                operating_profit_tonne,
                teu_container,
                tonne_dry_bulk,
                tonne_break_bulk,
                tonne_liquid_bulk,
                created_by,
                created_date
            FROM tbl_financial_parameter
            WHERE organisation_id = @organisationID
            ORDER BY annually_financial_year DESC, month DESC`;
        }

        const result = await request.query(query);
        res.json(result.recordset);
        
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getQuarterlyFinancialParameter(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input("userID", userID);
    try {
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8 || organisation_id == 16) {
            query = `SELECT
            annually_financial_year, organisation_id,month,
            CASE
                WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
            END AS quarter_number,
            SUM(operating_income) AS operating_income,
                    SUM(operating_expenditure) AS operating_expenditure,
                    SUM(operating_surplus) AS operating_surplus,
                    SUM(total_income) AS total_income,
                    SUM(total_expenditure) AS total_expenditure,
                    SUM(net_surplus) AS net_surplus,
                    AVG(operating_ratio) AS operating_ratio,
                    SUM(per_tonne_handling_cost) AS per_tonne_handling_cost,
                    SUM(operating_profit_tonne) AS operating_profit_tonne,
                    SUM(teu_container) AS teu_container,
                    SUM(tonne_dry_bulk) AS tonne_dry_bulk,
                    SUM(tonne_break_bulk) AS tonne_break_bulk,
                    SUM(tonne_liquid_bulk) AS tonne_liquid_bulk
        FROM tbl_financial_parameter
        WHERE organisation_id IS NOT NULL
        GROUP BY annually_financial_year, organisation_id,month,
            CASE
                WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
            END
        ORDER BY annually_financial_year DESC, quarter_number,month DESC;`;
        } else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            // const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            // const userIDs = usersResult.recordset.map(user => user.user_id);

            request.input("organisationID", organisationID);

            query = `
            SELECT
                annually_financial_year, organisation_id, month,
            CASE
                WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
            END AS quarter_number,
            SUM(operating_income) AS operating_income,
                SUM(operating_expenditure) AS operating_expenditure,
                SUM(operating_surplus) AS operating_surplus,
                SUM(total_income) AS total_income,
                SUM(total_expenditure) AS total_expenditure,
                SUM(net_surplus) AS net_surplus,
                AVG(operating_ratio) AS operating_ratio,
                SUM(per_tonne_handling_cost) AS per_tonne_handling_cost,
                SUM(operating_profit_tonne) AS operating_profit_tonne,
                SUM(teu_container) AS teu_container,
                SUM(tonne_dry_bulk) AS tonne_dry_bulk,
                SUM(tonne_break_bulk) AS tonne_break_bulk,
                SUM(tonne_liquid_bulk) AS tonne_liquid_bulk
            FROM tbl_financial_parameter
            WHERE organisation_id = @organisationID
            GROUP BY annually_financial_year, organisation_id,month,
                CASE
                    WHEN month IN ('1', '2', '3') THEN 'Quarter 4'
                    WHEN month IN ('4', '5', '6') THEN 'Quarter 1'
                    WHEN month IN ('7', '8', '9') THEN 'Quarter 2'
                    WHEN month IN ('10', '11', '12') THEN 'Quarter 3'
                END
            ORDER BY annually_financial_year DESC, quarter_number, month DESC;`;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyFinancialParameter(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input("userID", userID);
    try {
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8 || organisation_id == 16) {
            query = `
                SELECT
                    annually_financial_year, organisation_id,month,
                    SUM(operating_income) AS operating_income,
                    SUM(operating_expenditure) AS operating_expenditure,
                    SUM(operating_surplus) AS operating_surplus,
                    SUM(total_income) AS total_income,
                    SUM(total_expenditure) AS total_expenditure,
                    SUM(net_surplus) AS net_surplus,
                    AVG(operating_ratio) AS operating_ratio,
                    SUM(per_tonne_handling_cost) AS per_tonne_handling_cost,
                    SUM(operating_profit_tonne) AS operating_profit_tonne,
                    SUM(teu_container) AS teu_container,
                    SUM(tonne_dry_bulk) AS tonne_dry_bulk,
                    SUM(tonne_break_bulk) AS tonne_break_bulk,
                    SUM(tonne_liquid_bulk) AS tonne_liquid_bulk

                FROM
                    tbl_financial_parameter
                    WHERE organisation_id IS NOT NULL
                GROUP BY
                    organisation_id, annually_financial_year, month
                ORDER BY
                    annually_financial_year DESC,month DESC;
            `;
        } else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            // const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            // const userIDs = usersResult.recordset.map(user => user.user_id);

            request.input("organisationID", organisationID);

            query = `
            SELECT
                annually_financial_year, organisation_id, month,
                SUM(operating_income) AS operating_income,
                SUM(operating_expenditure) AS operating_expenditure,
                SUM(operating_surplus) AS operating_surplus,
                SUM(total_income) AS total_income,
                SUM(total_expenditure) AS total_expenditure,
                SUM(net_surplus) AS net_surplus,
                SUM(operating_ratio) AS operating_ratio,
                SUM(per_tonne_handling_cost) AS per_tonne_handling_cost,
                SUM(operating_profit_tonne) AS operating_profit_tonne,
                SUM(teu_container) AS teu_container,
                SUM(tonne_dry_bulk) AS tonne_dry_bulk,
                SUM(tonne_break_bulk) AS tonne_break_bulk,
                SUM(tonne_liquid_bulk) AS tonne_liquid_bulk
            FROM
                tbl_financial_parameter
                WHERE organisation_id = @organisationID
            GROUP BY
                organisation_id, annually_financial_year, month
            ORDER BY
                annually_financial_year DESC,month DESC;
                `;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
async function getOrganisationName(req, res) {
    const organisationID = req.params.organisationID;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);

    try {

        const result = await request.query(`SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisationID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getFilteredFinancialReport(req, res) {
    const conn = await pool;
    const request = conn.request();
  
    try {

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
  
    //   console.log("FromFirstMonthCompare:", FromFirstMonthCompare);
    //   console.log("FromFirstYearCompare:", FromFirstYearCompare);
    //   console.log("TofirstMonthCompare:", TofirstMonthCompare);
    //   console.log("TofirstYearCompare:", TofirstYearCompare);
    //   console.log("frmSecMonthCompare:", frmSecMonthCompare);
    //   console.log("frmSecYearCompare:", frmSecYearCompare);
    //   console.log("ToSecMonthCompare:", ToSecMonthCompare);
    //   console.log("ToSecYearCompare:", ToSecYearCompare);
    //   console.log("userID:", userID);
  
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
  
      console.log(userID);
      request.input('userID', userID);
      const userResult = await request.query(`
        SELECT role_id
        FROM tbl_user
        WHERE user_id = @userID
      `);
  
      const { role_id } = userResult.recordset[0];
  
    //   const request = conn.request();
  
      request.input("FromFirstYearCompare", FromFirstYearCompare);
      request.input("FromFirstMonthCompare", FromFirstMonthCompare);
      request.input("TofirstYearCompare", TofirstYearCompare);
      request.input("TofirstMonthCompare", TofirstMonthCompare);
      request.input("frmSecYearCompare", frmSecYearCompare);
      request.input("frmSecMonthCompare", frmSecMonthCompare);
      request.input("ToSecYearCompare", ToSecYearCompare);
      request.input("ToSecMonthCompare", ToSecMonthCompare);
  
      let query1, query2;
  
      if (role_id == 2 || role_id == 3 || role_id == 4|| role_id == 5 || role_id == 8) {
        console.log('Query worked 1');
        query1 = `
          SELECT
            year, 
            organisation_id,
            SUM(operating_income) AS operating_income,
            SUM(operating_expenditure) AS operating_expenditure,
            SUM(operating_surplus) AS operating_surplus,
            SUM(total_income) AS total_income,
            SUM(total_expenditure) AS total_expenditure,
            SUM(net_surplus) AS net_surplus,
            AVG(operating_ratio) AS operating_ratio,
            SUM(per_tonne_handling_cost) AS per_tonne_handling_cost
          FROM 
            tbl_financial_parameter
          WHERE 
            ((year = @FromFirstYearCompare AND month >= @FromFirstMonthCompare)
            OR 
            (year = @TofirstYearCompare AND month <= @TofirstMonthCompare))
          GROUP BY
            organisation_id, year;
        `;
        query2 = `
          SELECT
            year, 
            organisation_id,
            SUM(operating_income) AS operating_income,
            SUM(operating_expenditure) AS operating_expenditure,
            SUM(operating_surplus) AS operating_surplus,
            SUM(total_income) AS total_income,
            SUM(total_expenditure) AS total_expenditure,
            SUM(net_surplus) AS net_surplus,
            AVG(operating_ratio) AS operating_ratio,
            SUM(per_tonne_handling_cost) AS per_tonne_handling_cost
          FROM 
            tbl_financial_parameter
          WHERE 
            ((year = @frmSecYearCompare AND month >= @frmSecMonthCompare)
            OR 
            (year = @ToSecYearCompare AND month <= @ToSecMonthCompare))
          GROUP BY
            organisation_id, year;
        `;
      } else {
        console.log('Query Worked 2');
        const orgResult = await request.query(`
          SELECT organisation_id 
          FROM tbl_user 
          WHERE user_id = @userID`
        );
        const organisationID = orgResult.recordset[0].organisation_id;
  
        request.input("organisationID", organisationID);
        const usersResult = await request.query(`
          SELECT user_id 
          FROM tbl_user 
          WHERE organisation_id = @organisationID`
        );
        const userIDs = usersResult.recordset.map((user) => user.user_id);
  
        query1 = `
          SELECT
            year,
            organisation_id,
            SUM(operating_income) AS operating_income,
            SUM(operating_expenditure) AS operating_expenditure,
            SUM(operating_surplus) AS operating_surplus,
            SUM(total_income) AS total_income,
            SUM(total_expenditure) AS total_expenditure,
            SUM(net_surplus) AS net_surplus,
            AVG(operating_ratio) AS operating_ratio,
            SUM(per_tonne_handling_cost) AS per_tonne_handling_cost
          FROM 
            tbl_financial_parameter
            WHERE 
            organisation_id = @organisationID
            AND
            ((year = @FromFirstYearCompare AND month >= @FromFirstMonthCompare)
            OR 
            (year = @TofirstYearCompare AND month <= @TofirstMonthCompare))
          GROUP BY
            organisation_id, year;
        `;
  
        query2 = `
          SELECT
            year,
            organisation_id,
            SUM(operating_income) AS operating_income,
            SUM(operating_expenditure) AS operating_expenditure,
            SUM(operating_surplus) AS operating_surplus,
            SUM(total_income) AS total_income,
            SUM(total_expenditure) AS total_expenditure,
            SUM(net_surplus) AS net_surplus,
            AVG(operating_ratio) AS operating_ratio,
            SUM(per_tonne_handling_cost) AS per_tonne_handling_cost
          FROM 
            tbl_financial_parameter
            WHERE 
            organisation_id = @organisationID
            AND
            ((year = @frmSecYearCompare AND month >= @frmSecMonthCompare)
            OR 
            (year = @ToSecYearCompare AND month <= @ToSecMonthCompare))
          GROUP BY
            organisation_id, year;
        `;
      }
  
      const result1 = await request.query(query1);
      const result2 = await request.query(query2);
  
      console.log(result1);
      console.log(result2);
  
      res.json({ result1: result1.recordset, result2: result2.recordset });
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
}

async function getFinancialChartData(req, res) {
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
                SUM(fp.operating_income) AS total_operating_income,
                SUM(fp.operating_expenditure) AS total_operating_expenditure,
                SUM(fp.operating_surplus) AS total_operating_surplus,
                SUM(fp.total_income) AS total_income,
                SUM(fp.total_expenditure) AS total_expenditure,
                SUM(fp.net_surplus) AS net_surplus,
                SUM(fp.operating_ratio) AS operating_ratio,
                SUM(fp.per_tonne_handling_cost) AS per_tonne_handling_cost
            FROM
                mmt_organisation o
            LEFT JOIN
                tbl_financial_parameter fp ON o.organisation_id = fp.organisation_id AND fp.annually_financial_year = @financialYear
            WHERE
                o.organisation_category_id = 1
                AND o.organisation_id IS NOT NULL
            GROUP BY
                o.organisation_id, o.organisation_name, o.organisation_code
            ORDER BY
                o.organisation_id ASC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getFinancialFinYearChartData(req, res){
    const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT 
                annually_financial_year, 
                SUM(operating_income) AS total_operating_income,
                SUM(operating_expenditure) AS total_operating_expenditure,
                SUM(operating_surplus) AS total_operating_surplus,
                SUM(total_income) AS total_income,
                SUM(total_expenditure) AS total_expenditure,
                SUM(net_surplus) AS net_surplus,
                SUM(operating_ratio) AS operating_ratio,
                SUM(per_tonne_handling_cost) AS per_tonne_handling_cost
            FROM tbl_financial_parameter
        WHERE annually_financial_year IS NOT NULL
        GROUP BY annually_financial_year;
    `);
    // console.log('getFinancialChartData',result);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function createMopswFinancialParameters(req, res) {
    const {organisationId,financialYear,userID,targetOperatingProfit,targetTeuContainer,targetTonofDrybulk,targetTonofBreakbulk,targetTonofLiquidbulk,targetOperatingSurplus
          } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("financialYear", financialYear);

        // Check if financial year already exists
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_financial_paramaters_mopsw_target 
            WHERE annually_financial_year = @financialYear
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.sendStatus(205); // Data already exists
        }

        request.input("organisationId", organisationId);
        request.input("targetOperatingProfit", targetOperatingProfit);
        request.input("targetTeuContainer", targetTeuContainer);
        request.input("targetTonofDrybulk", targetTonofDrybulk);
        request.input("targetTonofBreakbulk", targetTonofBreakbulk);
        request.input("targetTonofLiquidbulk", targetTonofLiquidbulk);
        request.input("targetOperatingSurplus", targetOperatingSurplus);
        request.input("userID", userID);

        await request.query(`
            INSERT INTO tbl_financial_paramaters_mopsw_target (
                organisation_id, annually_financial_year,
                target_operating_profit, target_teu_container, target_tonof_drybulk, target_tonof_Breakbulk,
                target_tonof_liquidbulk, target_operating_surplus, created_by, created_date
            ) VALUES (
                @organisationId, @financialYear, @targetOperatingProfit, @targetTeuContainer,
                @targetTonofDrybulk, @targetTonofBreakbulk, @targetTonofLiquidbulk, @targetOperatingSurplus, @userID, GETDATE()
            )
        `);

        res.status(201).json({ message: "Inserted successfully" });
    } catch (err) {
        console.error("Error in createMopswFinancialParameters:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getMonthlyFinancialTargetData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.request().query(`
            SELECT 
                tfpt.organisation_id,
                tfpt.annually_financial_year,
                mo.organisation_name,
                tfpt.target_operating_profit AS target_operating_profit_per_tonne,
                tfpt.target_teu_container AS target_operating_profit_per_teu,
                tfpt.target_tonof_drybulk AS target_profit_dry_bulk,
                tfpt.target_tonof_Breakbulk AS target_profit_break_bulk,
                tfpt.target_tonof_liquidbulk AS target_profit_liquid_bulk,
                tfpt.target_operating_surplus,
                COALESCE(tfpt.update_date, tfpt.created_date) AS updated_date
            FROM tbl_financial_paramaters_mopsw_target tfpt
            LEFT JOIN mmt_organisation mo ON tfpt.organisation_id = mo.organisation_id
            ORDER BY tfpt.year DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching monthly financial target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getQuaterlyFinancialTargetData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.request().query(`
            SELECT 
                tfpt.organisation_id,
                tfpt.annually_financial_year,
                mo.organisation_name,
                tfpt.target_operating_profit AS target_operating_profit_per_tonne,
                tfpt.target_teu_container AS target_operating_profit_per_teu,
                tfpt.target_tonof_drybulk AS target_profit_dry_bulk,
                tfpt.target_tonof_Breakbulk AS target_profit_break_bulk,
                tfpt.target_tonof_liquidbulk AS target_profit_liquid_bulk,
                tfpt.target_operating_surplus
            FROM tbl_financial_paramaters_mopsw_target tfpt
            LEFT JOIN mmt_organisation mo ON tfpt.organisation_id = mo.organisation_id
            ORDER BY tfpt.year DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching monthly financial target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getAnnuallyFinancialTargetData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.request().query(`
            SELECT 
                tfpt.organisation_id,
                tfpt.annually_financial_year,
                mo.organisation_name,
                tfpt.target_operating_profit AS target_operating_profit_per_tonne,
                tfpt.target_teu_container AS target_operating_profit_per_teu,
                tfpt.target_tonof_drybulk AS target_profit_dry_bulk,
                tfpt.target_tonof_Breakbulk AS target_profit_break_bulk,
                tfpt.target_tonof_liquidbulk AS target_profit_liquid_bulk,
                tfpt.target_operating_surplus
            FROM tbl_financial_paramaters_mopsw_target tfpt
            LEFT JOIN mmt_organisation mo ON tfpt.organisation_id = mo.organisation_id
            ORDER BY tfpt.year DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching monthly financial target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

function getFinancialYears() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    let startYear = month >= 4 ? year : year - 1;

    return {
        currentFY: `${startYear}-${startYear + 1}`,   
        lastFY: `${startYear - 1}-${startYear}`       
    };
}

async function getKPIFinancialDashboard(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID) || 0;
        const fyParam = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;
        const monthsParam =  req.params.months && req.params.months !== "all" ? req.params.months.split(",").map(Number) : null;

        const conn = await pool;
        const request = conn.request();

        let currentFY, lastFY;

        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        function getFYMonths() {
            if (monthsParam && monthsParam.length) return monthsParam;

            const today = new Date();
            let currentMonth = today.getMonth() + 1;

            let endMonth = currentMonth - 1;
            if (endMonth === 0) endMonth = 12;

            let months = [];

            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) months.push(m);
            } else {
                for (let m = 4; m <= 12; m++) months.push(m);
                for (let m = 1; m <= endMonth; m++) months.push(m);
            }

            return months;
        }

        const monthsList = getFYMonths();

        monthsList.forEach((m, i) => {
            request.input(`month${i}`, m);
        });

        const monthParamList = monthsList
            .map((_, i) => `@month${i}`)
            .join(",");

        const allOrgs = [1,2,3,4,5,6,7,8,9,10,11,12,54,55];

        const orgFilter = organisationID ? [organisationID] : allOrgs;

        orgFilter.forEach((id, i) => {
            request.input(`org${i}`, id);
        });

        const orgParamList = orgFilter.map((_, i) => `@org${i}`).join(",");

        const query = `
        WITH finance_agg AS (
            SELECT
                f.organisation_id,

                CASE 
                    WHEN f.month >= 4 
                        THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END AS fiscal_year,

                SUM(f.operating_income) AS operating_income,
                SUM(f.operating_expenditure) AS operating_expenditure,
                SUM(f.total_income) AS total_income,
                SUM(f.total_expenditure) AS total_expenditure,
                SUM(f.operating_surplus) AS operating_surplus,
                SUM(f.net_surplus) AS net_surplus,
                AVG(f.operating_ratio) AS operating_ratio,
                SUM(f.per_tonne_handling_cost) AS per_tonne_handling_cost

            FROM tbl_financial_parameter f
            WHERE f.organisation_id IN (${orgParamList})
              AND f.month IN (${monthParamList})

              AND (
                  CASE 
                      WHEN f.month >= 4 
                          THEN CONCAT(f.year, '-', f.year + 1)
                      ELSE CONCAT(f.year - 1, '-', f.year)
                  END
              ) IN (@currentFY, @lastFY)

            GROUP BY 
                f.organisation_id,
                CASE 
                    WHEN f.month >= 4 
                        THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END
        )

        SELECT

        -- ================= OPERATING INCOME =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_income ELSE 0 END) AS op_income_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END) AS op_income_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_income ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END), 0),
        0) AS op_income_yoy,

        -- ================= OPERATING EXPENDITURE =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_expenditure ELSE 0 END) AS operating_expenditure_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END) AS operating_expenditure_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_expenditure ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END), 0),
        0) AS operating_expenditure_yoy,

        -- ================= TOTAL INCOME =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN total_income ELSE 0 END) AS total_income_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END) AS total_income_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_income ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END), 0),
        0) AS total_income_yoy,

        -- ================= TOTAL EXPENDITURE =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN total_expenditure ELSE 0 END) AS total_expenditure_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END) AS total_expenditure_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_expenditure ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END), 0),
        0) AS total_expenditure_yoy,

        -- ================= OPERATING SURPLUS =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_surplus ELSE 0 END) AS operating_surplus_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END) AS operating_surplus_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_surplus ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END), 0),
        0) AS operating_surplus_yoy,

        -- ================= NET SURPLUS =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN net_surplus ELSE 0 END) AS net_surplus_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END) AS net_surplus_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN net_surplus ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END), 0),
        0) AS net_surplus_yoy,

        -- ================= OPERATING RATIO =================
        ROUND(AVG(CASE WHEN fiscal_year = @currentFY THEN operating_ratio END), 2) AS op_ratio_current,
        ROUND(AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END), 2) AS op_ratio_last,

        COALESCE(
            ROUND(
                (
                    AVG(CASE WHEN fiscal_year = @currentFY THEN operating_ratio END) -
                    AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END)
                ) * 100.0 /
                NULLIF(AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END), 0),
            2),
        0) AS op_ratio_yoy,

        -- ================= PER TONNE COST =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN per_tonne_handling_cost ELSE 0 END) AS per_tonne_handling_cost_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END) AS per_tonne_handling_cost_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN per_tonne_handling_cost ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END), 0),
        0) AS per_tonne_handling_cost_yoy

        FROM finance_agg;
        `;

        const result = await request.query(query);

        return res.status(200).json(result.recordset[0]);

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Error fetching data." });
    }
}

async function getTopFinancialPerformingPorts(req, res) {
    try {
        let kpiParam = req.params.kpi && req.params.kpi !== "all" ? req.params.kpi : null;
        let fy = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;

        const conn = await pool;
        const request = conn.request();

        // KPI mapping
        function mapKPI(kpi) {
            switch (parseInt(kpi)) {
                case 4: return "operating_income";
                case 5: return "operating_expenditure";
                case 6: return "total_income";
                case 7: return "total_expenditure";
                case 8: return "operating_surplus";
                case 9: return "net_surplus";
                case 10: return "operating_ratio";
                case 11: return "per_tonne_handling_cost";
                default: return null;
            }
        }

        let kpi = mapKPI(kpiParam);

        // FY default
        if (!fy) {
            const fyData = getFinancialYears();
            fy = fyData.currentFY;
        }

        const [startYear, endYear] = fy.split("-").map(Number);

        request.input("startYear", startYear);
        request.input("endYear", endYear);
        request.input("lastStartYear", startYear - 1);
        request.input("lastEndYear", endYear - 1);

        const query = `
        WITH finance_agg AS (
            SELECT
                f.organisation_id,
                mmt.organisation_label,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_income END) AS operating_income_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_income END) AS operating_income_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_expenditure END) AS operating_expenditure_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_expenditure END) AS operating_expenditure_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.total_income END) AS total_income_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.total_income END) AS total_income_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.total_expenditure END) AS total_expenditure_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.total_expenditure END) AS total_expenditure_last,
                
                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_surplus END) AS operating_surplus_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_surplus END) AS operating_surplus_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.net_surplus END) AS net_surplus_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.net_surplus END) AS net_surplus_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_ratio END) AS operating_ratio_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_ratio END) AS operating_ratio_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.per_tonne_handling_cost END) AS per_tonne_handling_cost_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.per_tonne_handling_cost END) AS per_tonne_handling_cost_last

            FROM tbl_financial_parameter f
            LEFT JOIN mmt_organisation mmt ON f.organisation_id = mmt.organisation_id
            GROUP BY f.organisation_id,mmt.organisation_label
        ),

        scored AS (
            SELECT
                organisation_id,
                organisation_label,

                ${kpi ? `
                CASE 
                    WHEN ISNULL(${kpi}_last,0) = 0 THEN 0
                    ELSE (
                        (ISNULL(${kpi}_current,0) - ISNULL(${kpi}_last,0)) * 100.0 /
                        ${kpi}_last
                    )
                END AS yoy_growth
                ` : `
                (
                    (ISNULL(net_surplus_current,0) - ISNULL(net_surplus_last,0)) * 0.4 +
                    (ISNULL(total_income_current,0) - ISNULL(total_income_last,0)) * 0.3 +
                    (ISNULL(operating_income_current,0) - ISNULL(operating_income_last,0)) * 0.3
                ) AS yoy_growth
                `}
            FROM finance_agg
        )

        SELECT TOP 3
            organisation_id,
            organisation_label,
            yoy_growth,
            ROW_NUMBER() OVER (ORDER BY yoy_growth DESC) AS rank_no
        FROM scored
        ORDER BY yoy_growth DESC;
        `;

        const result = await request.query(query);

        return res.status(200).json({
            kpi: kpi || "composite",
            fy,
            top3: result.recordset
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error fetching top financial performing ports"
        });
    }
}

async function getLeastFinancialPerformingPorts(req, res) {
    try {
        let kpiParam = req.params.kpi && req.params.kpi !== "all" ? req.params.kpi : null;
        let fy = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;

        const conn = await pool;
        const request = conn.request();

        // KPI mapping
        function mapKPI(kpi) {
            switch (parseInt(kpi)) {
                case 4: return "operating_income";
                case 5: return "operating_expenditure";
                case 6: return "total_income";
                case 7: return "total_expenditure";
                case 8: return "operating_surplus";
                case 9: return "net_surplus";
                case 10: return "operating_ratio";
                case 10: return "per_tonne_handling_cost";
                default: return null;
            }
        }

        let kpi = mapKPI(kpiParam);

        // FY default
        if (!fy) {
            const fyData = getFinancialYears();
            fy = fyData.currentFY;
        }

        const [startYear, endYear] = fy.split("-").map(Number);

        request.input("startYear", startYear);
        request.input("endYear", endYear);
        request.input("lastStartYear", startYear - 1);
        request.input("lastEndYear", endYear - 1);

        const query = `
        WITH finance_agg AS (
            SELECT
                f.organisation_id,
                mmt.organisation_label,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_income END) AS operating_income_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_income END) AS operating_income_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_expenditure END) AS operating_expenditure_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_expenditure END) AS operating_expenditure_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.total_income END) AS total_income_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.total_income END) AS total_income_last,

                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.total_expenditure END) AS total_expenditure_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.total_expenditure END) AS total_expenditure_last,
                
                -- CURRENT FY
                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_surplus END) AS operating_surplus_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_surplus END) AS operating_surplus_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.net_surplus END) AS net_surplus_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.net_surplus END) AS net_surplus_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.operating_ratio END) AS operating_ratio_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.operating_ratio END) AS operating_ratio_last,

                SUM(CASE 
                    WHEN (f.year = @startYear AND f.month >= 4)
                      OR (f.year = @endYear AND f.month <= 3)
                    THEN f.per_tonne_handling_cost END) AS per_tonne_handling_cost_current,

                SUM(CASE 
                    WHEN (f.year = @lastStartYear AND f.month >= 4)
                      OR (f.year = @lastEndYear AND f.month <= 3)
                    THEN f.per_tonne_handling_cost END) AS per_tonne_handling_cost_last

            FROM tbl_financial_parameter f
            LEFT JOIN mmt_organisation mmt ON f.organisation_id = mmt.organisation_id
            GROUP BY f.organisation_id,mmt.organisation_label
        ),

        scored AS (
            SELECT
                organisation_id,
                organisation_label,

                ${kpi ? `
                CASE 
                    WHEN ISNULL(${kpi}_last,0) = 0 THEN 0
                    ELSE (
                        (ISNULL(${kpi}_current,0) - ISNULL(${kpi}_last,0)) * 100.0 /
                        ${kpi}_last
                    )
                END AS yoy_growth
                ` : `
                (
                    (ISNULL(net_surplus_current,0) - ISNULL(net_surplus_last,0)) * 0.4 +
                    (ISNULL(total_income_current,0) - ISNULL(total_income_last,0)) * 0.3 +
                    (ISNULL(operating_income_current,0) - ISNULL(operating_income_last,0)) * 0.3
                ) AS yoy_growth
                `}
            FROM finance_agg
        )

        SELECT TOP 3
            organisation_id,
            organisation_label,
            yoy_growth,
            ROW_NUMBER() OVER (ORDER BY yoy_growth DESC) AS rank_no
        FROM scored
        ORDER BY yoy_growth ASC;
        `;

        const result = await request.query(query);

        return res.status(200).json({
            kpi: kpi || "composite",
            fy,
            top3: result.recordset
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error fetching top financial performing ports"
        });
    }
}
       
   async function getKpifinancialparameterData(req, res) {

        const conn = await pool;
        const request = conn.request();
        const finanacialparameterID = req.params.finanacialparameterID;

        request.input("finanacialparameterID", finanacialparameterID);

        const result = await request.query(`
            SELECT * FROM tbl_financial_parameter where financial_parameter_id = @finanacialparameterID
        `);

        res.json(result.recordset);
    } 
            async function updatecslShipbuildingData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefinancialQuater = req.body.updatefinancialQuater;
            const updateShiporderReceived = req.body.updateShiporderReceived;
            const updateValueofship = req.body.updateValueofship;
            const CslshipbuildingIdOrg  = req.body.CslshipbuildingIdOrg ;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updateShiporderReceived',updateShiporderReceived);
            request.input('updateValueofship',updateValueofship);
            request.input("userID", userID);
            request.input("CslshipbuildingIdOrg",CslshipbuildingIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_csl_ship_building_orders SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,ship_orders_received = @updateShiporderReceived,value_of_ship_orders_received = @updateValueofship,updated_by = @userID,updated_date = getDate() WHERE csl_shipbuilding_id  = @CslshipbuildingIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }

        async function updateFinanacialkpidataupdate(req,res){
        
            const data = req.body;
            
            const updateoperatingIncome  = req.body.updateoperatingIncome ;
            const updateoperatingExpenditure = req.body.updateoperatingExpenditure;
            const updateoperatingSurplus = req.body.updateoperatingSurplus;
            const updatetotalIncome = req.body.updatetotalIncome;
            const updatetotalExpenditure = req.body.updatetotalExpenditure;
            const updatenetSurplus  = req.body.updatenetSurplus ;
            const updateoperatingRatio = req.body.updateoperatingRatio;
            const updateperTonneHandlingCost  = req.body.updateperTonneHandlingCost ;
            const updateoperatingProfit = req.body.updateoperatingProfit;
            const updateteuContainer  = req.body.updateteuContainer ;
            const updatetonneofDrybulk = req.body.updatetonneofDrybulk;
            const updatetonneofBreakbulk  = req.body.updatetonneofBreakbulk ;
            const updatetonneofLiquidbulk  = req.body.updatetonneofLiquidbulk ;
            const finanacialparameterID  = req.body.finanacialparameterID ;
            const userID = req.body.userID;
            console.log(userID,"date")
        


        
            const conn = await pool;
            const request = conn.request();
            request.input('updateoperatingIncome', updateoperatingIncome );
            request.input('updateoperatingExpenditure',updateoperatingExpenditure);
            request.input('updateoperatingSurplus',updateoperatingSurplus);
            request.input('updatetotalIncome',updatetotalIncome);
            request.input('updatetotalExpenditure', updatetotalExpenditure);
            request.input('updatenetSurplus',updatenetSurplus);
            request.input("updateoperatingRatio", updateoperatingRatio);
            request.input('updateperTonneHandlingCost',updateperTonneHandlingCost);
            request.input('updateoperatingProfit', updateoperatingProfit);
            request.input('updateteuContainer',updateteuContainer);
            request.input('updatetonneofDrybulk',updatetonneofDrybulk);
            request.input('updatetonneofBreakbulk',updatetonneofBreakbulk);
            request.input("updatetonneofLiquidbulk",updatetonneofLiquidbulk);  
            request.input('finanacialparameterID',finanacialparameterID);
            request.input("userID", userID);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_financial_parameter SET operating_income = @updateoperatingIncome, operating_expenditure = @updateoperatingExpenditure,operating_surplus = @updateoperatingSurplus,total_income = @updatetotalIncome,total_expenditure = @updatetotalExpenditure,net_surplus = @updatenetSurplus,operating_ratio = @updateoperatingRatio,per_tonne_handling_cost = @updateperTonneHandlingCost,operating_profit_tonne = @updateoperatingProfit,teu_container = @updateteuContainer ,tonne_dry_bulk = @updatetonneofDrybulk,tonne_break_bulk = @updatetonneofBreakbulk,tonne_liquid_bulk = @updatetonneofLiquidbulk,updated_by = @userID,updated_date = getDate() WHERE financial_parameter_id  = @finanacialparameterID`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }

async function detailedKPIFinancialCardDashboard(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
 
        const organisationID = parseInt(req.query.organisationID) || 0;
        const fyParam = req.query.fy && req.query.fy !== "all" ? req.query.fy : null;
        const kpi = req.query.kpi || "operating_income";
 
        let currentFY, lastFY;
 
        if (fyParam) {
            currentFY = fyParam;
 
            const [start, end] = fyParam.split("-").map(Number);
 
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
 
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }
 
        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);
 
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
 
        let ytdMonths = [];
 
        if (currentMonth >= 4) {
            ytdMonths = Array.from(
                { length: currentMonth - 3 },
                (_, i) => i + 4
            );
        } else {
            ytdMonths = [
                4,5,6,7,8,9,10,11,12,
                ...Array.from(
                    { length: currentMonth },
                    (_, i) => i + 1
                )
            ];
        }
 
        const fullMonths = [
            1,2,3,4,5,6,7,8,9,10,11,12
        ];
 
        ytdMonths.forEach((m, i) =>
            request.input(`ytd${i}`, m)
        );
 
        fullMonths.forEach((m, i) =>
            request.input(`full${i}`, m)
        );
 
        const ytdParams = ytdMonths.map((_, i) => `@ytd${i}`) .join(",");
        const fullParams = fullMonths.map((_, i) => `@full${i}`).join(",");
 
        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];
        const orgFilter = organisationID ? [organisationID]: allOrgs;
 
        orgFilter.forEach((id, i) =>
            request.input(`org${i}`, id)
        );
 
        const orgParams = orgFilter.map((_, i) => `@org${i}`).join(",");
            
        const kpiColumn = kpi;
 
        const query = `
        WITH base AS (
 
            SELECT
                f.organisation_id,
                f.month,
                f.year,
 
                CASE
                    WHEN f.month >= 4
                        THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END AS fiscal_year,
 
                f.${kpiColumn} AS value
 
            FROM tbl_financial_parameter f
            WHERE f.organisation_id IN (${orgParams})
        ),
 
        last_full AS (
            SELECT
                organisation_id,
                SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams})
            GROUP BY organisation_id
        ),
 
        current_ytd AS (
            SELECT
                organisation_id,
                SUM(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams})
            GROUP BY organisation_id
        ),
 
        last_ytd AS (
            SELECT
                organisation_id,
                SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams})
            GROUP BY organisation_id
        ),
 
        smpa_full AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams}) AND organisation_id IN (54,55)
        ),
 
        smpa_current AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams}) AND organisation_id IN (54,55)
        ),
 
        smpa_last AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams}) AND organisation_id IN (54,55)
        ),
 
        overall_full AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams}) AND organisation_id IN (${orgParams})
        ),
 
        overall_current AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams}) AND organisation_id IN (${orgParams})
        ),
 
        overall_last AS (
            SELECT SUM(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams}) AND organisation_id IN (${orgParams})
        )
 
        SELECT
            org.organisation_id,
            org.organisation_name,
 
            ROUND(lf.value,2) AS last_fy_full,
            ROUND(cy.value,2) AS current_fy_ytd,
            ROUND(ly.value,2) AS last_fy_ytd,
 
            ROUND(
                (cy.value - ly.value) * 100.0
                / NULLIF(ly.value,0),
            2) AS yoy_ytd
 
        FROM mmt_organisation org
 
        LEFT JOIN last_full lf ON org.organisation_id = lf.organisation_id
        LEFT JOIN current_ytd cy ON org.organisation_id = cy.organisation_id
        LEFT JOIN last_ytd ly ON org.organisation_id = ly.organisation_id
        WHERE org.organisation_id IN (${orgParams})
 
        UNION ALL
 
        SELECT
            '' AS organisation_id,
            'SMPA Total' AS organisation_name,
 
            ROUND(sf.value,2) AS last_fy_full,
            ROUND(sc.value,2) AS current_fy_ytd,
            ROUND(sl.value,2) AS last_fy_ytd,
 
            ROUND(
                (sc.value - sl.value) * 100.0
                / NULLIF(sl.value,0),
            2) AS yoy_ytd
 
        FROM smpa_current sc
        CROSS JOIN smpa_last sl
        CROSS JOIN smpa_full sf
 
        UNION ALL
 
        SELECT
            '' AS organisation_id,
            'Overall Total' AS organisation_name,
 
            ROUND(ofu.value,2) AS last_fy_full,
            ROUND(oc.value,2) AS current_fy_ytd,
            ROUND(ol.value,2) AS last_fy_ytd,
 
            ROUND(
                (oc.value - ol.value) * 100.0
                / NULLIF(ol.value,0),
            2) AS yoy_ytd
 
        FROM overall_current oc
        CROSS JOIN overall_last ol
        CROSS JOIN overall_full ofu
 
        ORDER BY organisation_name;
        `;
 
        const result = await request.query(query);
 
        res.json(result.recordset);
 
    } catch (err) {
        console.error(err);
 
        res.status(500).send(
            "Error fetching financial KPI data"
        );
    }
}

export default { createFinancialParameter, getFinancialParameter, getMonthlyFinancialParameter, getQuarterlyFinancialParameter, getAnnuallyFinancialParameter, getOrganisationName, getFilteredFinancialReport,getFinancialChartData, getFinancialFinYearChartData,
    createMopswFinancialParameters, getMonthlyFinancialTargetData, getQuaterlyFinancialTargetData,getAnnuallyFinancialTargetData,getKPIFinancialDashboard,getTopFinancialPerformingPorts,getLeastFinancialPerformingPorts,getKpifinancialparameterData,updateFinanacialkpidataupdate,
    detailedKPIFinancialCardDashboard
 };