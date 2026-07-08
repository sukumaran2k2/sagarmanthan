import { pool } from "../../db.js";


async function getMainSchemeDropdown(req, res) {
	const conn = await pool;
	const request = conn.request();


	let result;
	try {

		result = await request.query(`SELECT * FROM tbl_expenditure_scheme_main;`);
		res.json(result.recordset);
	}
	catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
}

async function getSubSchemeDropdown(req, res) {
	const conn = await pool;
	const request = conn.request();


	let result;
	try {

		result = await request.query(`SELECT * FROM tbl_expenditure_scheme_sub;`);
		res.json(result.recordset);
	}
	catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
}

async function getFinancialYearDropdown(req, res) {
	const conn = await pool;
	const request = conn.request();


	let result;
	try {

		result = await request.query(`SELECT * FROM tbl_expenditure_year_main;`);
		res.json(result.recordset);
	}
	catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
}

async function getSchemeData(req, res) {
	const financialYearValue = req.params.financialYearValue;
	const subSchemeValue = req.params.subSchemeValue;

	const conn = await pool;
	const request = conn.request();

	request.input("financialYearValue", financialYearValue);
	request.input("subSchemeValue", subSchemeValue);

	try {
		const dataIdQuery = `
            SELECT data_id
            FROM tbl_expenditure_data_main
            WHERE year_id = @financialYearValue AND scheme_id = @subSchemeValue`;

		const dataIdResult = await request.query(dataIdQuery);

		if (dataIdResult.recordset.length === 0) {
			return res.json([]);
		}

		const dataId = dataIdResult.recordset[0].data_id;

		const schemeDataQuery = `
		SELECT 
		esd.*,
		tel.exp_up_to_revenue,
		tel.exp_up_to_capital
	FROM tbl_expenditure_scheme_data esd
	INNER JOIN (
		SELECT 
			data_id,
			row_id,
			exp_up_to_revenue,
			exp_up_to_capital,
			updated_date_time,
			ROW_NUMBER() OVER(PARTITION BY data_id, row_id ORDER BY exp_up_to_date DESC, updated_date_time DESC) AS rn
		FROM tbl_expenditure_log_table
	) tel ON esd.data_id = tel.data_id AND esd.row_id = tel.row_id AND tel.rn = 1
	WHERE esd.data_id = @dataId
	`;

		request.input("dataId", dataId);
		const schemeDataResult = await request.query(schemeDataQuery);

		res.json(schemeDataResult.recordset);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
}


async function submitExpenditureData(req, res) {
	const { financialYearValue, subSchemeValue, expenditureData, expUpToDate } = req.body;

	const conn = await pool;

	try {
		const dataIdQuery = `
            SELECT data_id
            FROM tbl_expenditure_data_main
            WHERE year_id = @financialYearValue AND scheme_id = @subSchemeValue`;

		const dataIdRequest = conn.request();
		dataIdRequest.input("financialYearValue", financialYearValue);
		dataIdRequest.input("subSchemeValue", subSchemeValue);
		dataIdRequest.input("expUpToDate", expUpToDate);

		const dataIdResult = await dataIdRequest.query(dataIdQuery);
		if (dataIdResult.recordset.length === 0) {
			return res.status(404).json({ error: "Data not found for the provided year and scheme." });
		}

		const dataId = dataIdResult.recordset[0].data_id;
		for (const data of expenditureData) {

			const request = conn.request();
			const checkQuery = `
                SELECT TOP 1 1
                FROM [sagarmanthan_revamp].[dbo].[tbl_expenditure_scheme_data]
                WHERE row_id = @rowId AND data_id = ${dataId};`;

			request.input("rowId", data.rowId);
			// request.input("headOfAccount", data.headOfAccount);
			const headResult = await request.query(checkQuery);

			if (headResult.recordset.length > 0) {
				const updateQuery = `
                    UPDATE tbl_expenditure_scheme_data
                    SET BE_revenue = ISNULL(@beRevenue, 0),
                        BE_capital =  ISNULL(@beCapital, 0), 
                        RE_revenue =  ISNULL(@reRevenue, 0),
                        RE_capital = ISNULL(@reCapital, 0),
						scheme_name = @schemeName
                    OUTPUT INSERTED.id
                    WHERE data_id = @dataId AND row_id = @rowId`;

				request.input("schemeName", data.schemeName);
				request.input("beRevenue", parseFloat(data.beRevenue));
				request.input("beCapital", parseFloat(data.beCapital));
				request.input("reRevenue", parseFloat(data.reRevenue));
				request.input("reCapital", parseFloat(data.reCapital));
				request.input("dataId", dataId);

				const result = await request.query(updateQuery);
				const id = result.recordset[0].row_id;
			} else {
				const insertQuery = `
                    INSERT INTO tbl_expenditure_scheme_data (data_id, row_id, scheme_name, BE_revenue, BE_capital, RE_revenue, RE_capital)
                    OUTPUT INSERTED.id
                    VALUES (
                        @dataId, 
						@rowId,
                        @schemeName, 
                        ISNULL(@beRevenue, 0), 
                        ISNULL(@beCapital, 0), 
                        ISNULL(@reRevenue, 0), 
                        ISNULL(@reCapital, 0)
                    )`;

				request.input("schemeName", data.schemeName);
				request.input("beRevenue", parseFloat(data.beRevenue));
				request.input("beCapital", parseFloat(data.beCapital));
				request.input("reRevenue", parseFloat(data.reRevenue));
				request.input("reCapital", parseFloat(data.reCapital));
				// request.input("expThroughLOA", data.expThroughLOA ? 1 : 0);
				request.input("dataId", dataId);

				const result = await request.query(insertQuery);
				const id = result.recordset[0].row_id;
			}

			// Insert into tbl_expenditure_log_table
			const logInsertQuery = `
                INSERT INTO tbl_expenditure_log_table (data_id, row_id, updated_date_time, exp_up_to_revenue, exp_up_to_capital, exp_up_to_date)
                VALUES (
                    @dataId, 
                    @rowId, 
                    GETDATE(), 
                    ISNULL(@expenditureRevenue, 0),
                    ISNULL(@expenditureCapital, 0),
                    @expUpToDate
                )`;

			request.input("expenditureRevenue", parseFloat(data.expenditureRevenue));
			request.input("expenditureCapital", parseFloat(data.expenditureCapital));
			request.input("expUpToDate", expUpToDate);

			await request.query(logInsertQuery);
		}

		res.sendStatus(201);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
}



async function addMainScheme(req, res) {
	const name = req.body.name;

	const conn = await pool;
	const request = conn.request();

	try {
		const latestIdResult = await request.query(`
            SELECT TOP 1 main_id
            FROM tbl_expenditure_scheme_main
            ORDER BY main_id DESC
        `);

		const latestMainId = latestIdResult.recordset[0].main_id;
		const nextCharCode = latestMainId.charCodeAt(0) + 1;
		const nextMainId = String.fromCharCode(nextCharCode);

		const insertQuery = `
            INSERT INTO tbl_expenditure_scheme_main (main_name, main_id)
            VALUES (@name, @mainId)
        `;

		request.input("name", name);
		request.input("mainId", nextMainId);

		await request.query(insertQuery);

		res.sendStatus(201);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
}

async function addSubScheme(req, res) {
	const name = req.body.name;
	const mainSchemeId = req.body.mainSchemeId;

	const conn = await pool;
	const request = conn.request();

	request.input("name", name);
	request.input("mainSchemeId", mainSchemeId);

	try {
		const latestSchemeIdResult = await request.query(`
            SELECT TOP 1 scheme_id
            FROM tbl_expenditure_scheme_sub
            WHERE main_id = @mainSchemeId
            ORDER BY scheme_id DESC
        `, {
			mainSchemeId: mainSchemeId
		});

		let nextSchemeId = '1';
		if (latestSchemeIdResult.recordset.length > 0) {
			const latestSchemeId = latestSchemeIdResult.recordset[0].scheme_id;
			const nextSchemeNumber = parseInt(latestSchemeId.substr(1)) + 1;
			nextSchemeId = nextSchemeNumber.toString();
		}

		const newSchemeId = mainSchemeId + nextSchemeId;
		request.input("newSchemeId", newSchemeId);

		const insertQuery = `
            INSERT INTO tbl_expenditure_scheme_sub (scheme_name, scheme_id, main_id)
            VALUES (@name, @newSchemeId, @mainSchemeId)
        `;

		await request.query(insertQuery, {
			name: name,
			newSchemeId: newSchemeId,
			mainSchemeId: mainSchemeId
		});

		const yearIdsResult = await request.query(`
		SELECT year_id
		FROM tbl_expenditure_year_main
	`);
		for (const yearRecord of yearIdsResult.recordset) {
			const yearId = yearRecord.year_id;
			const maxDataIdResult = await request.query(`
        SELECT MAX(data_id) AS maxDataId
        FROM tbl_expenditure_data_main
    `);
			const maxDataId = maxDataIdResult.recordset[0].maxDataId || 0;
			const nextDataId = maxDataId + 1;

			const insertrequest = conn.request();
			insertrequest.input('nextDataId', nextDataId);
			insertrequest.input('yearId', yearId);
			insertrequest.input('newSchemeId', newSchemeId);

			const insertQuery = `
			INSERT INTO tbl_expenditure_data_main (scheme_id, year_id, data_id)
			VALUES (@newSchemeId, @yearId, @nextDataId)
		`;


			await insertrequest.query(insertQuery);
		}

		res.sendStatus(201);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
}

async function addExpFinancialYear(req, res) {
	const year = req.body.financialYear;

	const conn = await pool;
	const request = conn.request();

	request.input("year", year);

	try {
		const countResult = await request.query(`
            SELECT COUNT(*) AS yearCount
            FROM tbl_expenditure_year_main
        `);

		if (countResult.recordset.length === 0) {
			throw new Error("Failed to retrieve the count of existing financial years");
		}

		const nextYearId = 'y' + (countResult.recordset[0].yearCount + 1);
		request.input("nextYearId", nextYearId);

		await request.query(`
            INSERT INTO tbl_expenditure_year_main (year, year_id)
            VALUES (@year, @nextYearId)
        `, {
			year: year,
			nextYearId: nextYearId
		});

		const yearIdResult = await request.query(`
            SELECT year_id
            FROM tbl_expenditure_year_main
            WHERE year = @year
        `, {
			year: year
		});

		if (yearIdResult.recordset.length === 0) {
			throw new Error("Failed to retrieve the newly added year ID");
		}

		const yearId = yearIdResult.recordset[0].year_id;

		const schemeIdsResult = await request.query(`
            SELECT scheme_id
            FROM tbl_expenditure_scheme_sub
        `);

		for (const schemeRecord of schemeIdsResult.recordset) {
			const schemeId = schemeRecord.scheme_id;

			const maxDataIdResult = await request.query(`
			SELECT MAX(data_id) AS maxDataId
			FROM tbl_expenditure_data_main
            `, {
				schemeId: schemeId,
				yearId: yearId
			});

			const maxDataId = maxDataIdResult.recordset[0].maxDataId || 0;
			const nextDataId = maxDataId + 1;

			const insertDataRequest = conn.request();
			insertDataRequest.input("schemeId", schemeId);
			insertDataRequest.input("yearId", yearId);
			insertDataRequest.input("nextDataId", nextDataId);
			await insertDataRequest.query(`
                INSERT INTO tbl_expenditure_data_main (scheme_id, year_id, data_id)
                VALUES (@schemeId, @yearId, @nextDataId)
            `, {
				schemeId: schemeId,
				yearId: yearId,
				nextDataId: nextDataId
			});
		}

		res.sendStatus(201);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
}

async function getMainSchemes(req, res) {
	try {
		const conn = await pool;
		const request = conn.request();

		const query = `
            SELECT id, main_name, main_id
            FROM tbl_expenditure_scheme_main;
        `;

		const result = await request.query(query);
		res.json(result.recordset);
	} catch (error) {
		console.error("Error fetching main schemes:", error);
		return res.sendStatus(500);
	}
}

async function getSubSchemes(req, res) {
	const mainSchemeId = req.params.mainSchemeId;
	try {
		const conn = await pool;
		const request = conn.request();

		request.input("mainSchemeId", mainSchemeId);

		const query = `
            SELECT *
            FROM tbl_expenditure_scheme_sub WHERE main_id = @mainSchemeId;
        `;

		const result = await request.query(query);
		res.json(result.recordset);
	} catch (error) {
		console.error("Error fetching sub schemes:", error);
		return res.sendStatus(500);
	}
}

async function getSchemeYearData(req, res) {
	const schemeId = req.params.schemeId;
	const financialYearId = req.params.financialYearId;

	try {
		const conn = await pool;
		const request = conn.request();

		const dataIdQuery = `
            SELECT data_id
            FROM tbl_expenditure_data_main
            WHERE scheme_id = @schemeId AND year_id = @financialYearId;
        `;
		request.input("schemeId", schemeId);
		request.input("financialYearId", financialYearId);
		const dataIdResult = await request.query(dataIdQuery);

		if (dataIdResult.recordset.length === 0) {
			return res.json([]);
		}

		const dataId = dataIdResult.recordset[0].data_id;

		const schemeDataQuery = `
        SELECT 
            esd.*,
            tel.exp_up_to_revenue,
            tel.exp_up_to_capital,
            CASE 
                WHEN (esd.BE_revenue + esd.BE_capital) <> 0 
                THEN (tel.exp_up_to_revenue + tel.exp_up_to_capital) * 100.0 
                     / (esd.BE_revenue + esd.BE_capital)
                ELSE 0
            END AS percent_wrt_BE,
            CASE 
                WHEN (esd.RE_revenue + esd.RE_capital) <> 0 
                THEN (tel.exp_up_to_revenue + tel.exp_up_to_capital) * 100.0 
                     / (esd.RE_revenue + esd.RE_capital)
                ELSE 0
            END AS percent_wrt_RE
        FROM tbl_expenditure_scheme_data esd
        INNER JOIN (
            SELECT 
                data_id,
                row_id,
                exp_up_to_revenue,
                exp_up_to_capital,
                updated_date_time,
                ROW_NUMBER() OVER(PARTITION BY data_id, row_id ORDER BY exp_up_to_date DESC, updated_date_time DESC) AS rn
            FROM tbl_expenditure_log_table
        ) tel ON esd.data_id = tel.data_id AND esd.row_id = tel.row_id AND tel.rn = 1
        WHERE esd.data_id = @dataId;
        `;

		request.input("dataId", dataId);
		const schemeDataResult = await request.query(schemeDataQuery);

		res.json(schemeDataResult.recordset);
	} catch (error) {
		console.error("Error fetching scheme year data:", error);
		return res.sendStatus(500);
	}
}

async function getSchemeYearLastWeekData(req, res) {
	const schemeId = req.params.schemeId;
	const financialYearId = req.params.financialYearId;

	try {
		const conn = await pool;
		const request = conn.request();

		const dataIdQuery = `
            SELECT data_id
            FROM tbl_expenditure_data_main
            WHERE scheme_id = @schemeId AND year_id = @financialYearId;
        `;
		request.input("schemeId", schemeId);
		request.input("financialYearId", financialYearId);
		const dataIdResult = await request.query(dataIdQuery);

		if (dataIdResult.recordset.length === 0) {
			return res.json([]);
		}

		const dataId = dataIdResult.recordset[0].data_id;

		const schemeDataQuery = `
		SELECT 
		esd.*,
		tel.exp_up_to_revenue,
		tel.exp_up_to_capital,
		tel.exp_up_to_date,
		CASE 
			WHEN esd.RE_revenue <> 0 THEN tel.exp_up_to_revenue * (100.0 / esd.RE_revenue)
			WHEN esd.RE_revenue = 0 AND esd.RE_capital = 0 THEN tel.exp_up_to_revenue * (CASE WHEN esd.BE_revenue <> 0 THEN 100.0 / esd.BE_revenue ELSE 0 END)
			ELSE 0
		END AS percent_wrt_revenue,
		CASE 
			WHEN esd.RE_capital <> 0 THEN tel.exp_up_to_capital * (100.0 / esd.RE_capital)
			WHEN esd.RE_revenue = 0 AND esd.RE_capital = 0 THEN tel.exp_up_to_capital * (CASE WHEN esd.BE_capital <> 0 THEN 100.0 / esd.BE_capital ELSE 0 END)
			ELSE 0
		END AS percent_wrt_capital,
		CASE 
			WHEN (esd.RE_capital + esd.RE_revenue) <> 0 THEN 
				(tel.exp_up_to_capital + tel.exp_up_to_revenue) * (100.0 / (esd.RE_capital + esd.RE_revenue))
			WHEN esd.RE_revenue = 0 AND esd.RE_capital = 0 THEN 
				(tel.exp_up_to_capital + tel.exp_up_to_revenue) * (CASE WHEN (esd.BE_capital + esd.BE_revenue) <> 0 THEN 100.0 / (esd.BE_capital + esd.BE_revenue) ELSE 0 END)
			ELSE 0
		END AS percent_wrt_total
	FROM tbl_expenditure_scheme_data esd
	INNER JOIN (
		SELECT 
			data_id,
			row_id,
			exp_up_to_revenue,
			exp_up_to_capital,
			updated_date_time,
			exp_up_to_date,
			ROW_NUMBER() OVER(PARTITION BY data_id, row_id ORDER BY exp_up_to_date DESC, updated_date_time DESC) AS rn
		FROM tbl_expenditure_log_table
		WHERE exp_up_to_date > DATEADD(day, -6, GETDATE()) -- Filter for records updated 6 days ago
	) tel ON esd.data_id = tel.data_id AND esd.row_id = tel.row_id AND tel.rn = 1
	WHERE esd.data_id = @dataId;	
        `;
		request.input("dataId", dataId);
		const schemeDataResult = await request.query(schemeDataQuery);

		res.json(schemeDataResult.recordset);
	} catch (error) {
		console.error("Error fetching scheme year data:", error);
		return res.sendStatus(500);
	}
}

async function deleteRowdata(req, res) {

    const { dataId, rowId } = req.params;
    try {
        const conn = await pool;

        const checkRequest = conn.request();
        checkRequest.input("dataId", dataId);
        checkRequest.input("rowId", rowId);

        const checkQuery = `
            SELECT data_id 
            FROM tbl_expenditure_scheme_data
            WHERE data_id = @dataId 
            AND row_id = @rowId
        `;

        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({message: "Record not found"});
        }

        const deleteRequest = conn.request();
        deleteRequest.input("dataId", dataId);
        deleteRequest.input("rowId", rowId);

        const deleteQuery = `
            DELETE FROM tbl_expenditure_scheme_data
            WHERE data_id = @dataId 
            AND row_id = @rowId
        `;

        await deleteRequest.query(deleteQuery);

        return res.status(200).json({
            message: "Scheme deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting scheme:", error);
        return res.status(500).json({ message: "Internal Server Error"});
    }
}

async function getLastExpUpdate(req, res) {
    const { financialYear } = req.query;

    const conn = await pool;
    const request = conn.request();

    try {

        let query = `
            SELECT MAX(log.exp_up_to_date) AS expUpDate
            FROM tbl_expenditure_log_table log
            LEFT JOIN tbl_expenditure_data_main exp ON log.data_id = exp.data_id
        `;

        if (financialYear) {
            request.input('financialYear', financialYear);
            query += ` WHERE exp.year_id = @financialYear`;
        }

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export default {
	getMainSchemeDropdown, getSubSchemeDropdown, getFinancialYearDropdown, getSchemeData,
	submitExpenditureData, addMainScheme, addSubScheme, addExpFinancialYear,
	getMainSchemes, getSubSchemes, getSchemeYearData, getSchemeYearLastWeekData,deleteRowdata,getLastExpUpdate
};
