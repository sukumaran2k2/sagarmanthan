import { request } from "express";
import { pool } from "../../db.js";
// import sql from 'mssql';

async function addMarinePrevIncident(req, res) {
  
    const  year = req.body.year;
    let casualtyType = req.body.casualtyType;
    const  incidents = req.body.incidents;
    const  createdBy = req.body.userID;

    const conn = await pool;

    try {
        const checkRequest = conn.request();
        checkRequest.input('year', year);
        checkRequest.input('casualtyType', casualtyType);
        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) AS count FROM tbl_kpi_incident_prev_curr_year WHERE year = @year  AND casualty_type = @casualtyType
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.sendStatus(409);
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }

    for (const incident of incidents) { 
        const { type, incidentValue } = incident; 

        const request = conn.request(); 

        request.input('year', year); 
        request.input('casualtyType', casualtyType); 
        request.input('type_of_incident', type); 
        request.input('createdBy',createdBy);

        for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
            request.input(`${month}_incidents`, incidentValue[month]); 
        }

        try {
            const insertResult = await request.query(`
                INSERT INTO tbl_kpi_incident_prev_curr_year 
                (year,casualty_type,type_of_incident, april_incidents, may_incidents, june_incidents, july_incidents, 
                 august_incidents, september_incidents, october_incidents, november_incidents, 
                 december_incidents, january_incidents, february_incidents, march_incidents,created_date,created_by)
                VALUES
                (@year,@casualtyType, @type_of_incident, @april_incidents, @may_incidents, @june_incidents, 
                 @july_incidents, @august_incidents, @september_incidents, @october_incidents, 
                 @november_incidents, @december_incidents, @january_incidents, @february_incidents, 
                 @march_incidents, GETDATE(),@createdBy)
            `);
        } catch (error) {
            return res.status(500);
        }
    }
    return res.sendStatus(201);
}

async function updateMarinePrevIncident(req, res) {
    const year = req.body.year;
    let casualtyType = req.body.casualtyType;
    const prevIncidentData = req.body.incidents;
    const updatedBy = req.body.userID;

    const conn = await pool;
    try {
        const existingTypesRequest = conn.request();
        existingTypesRequest.input('year', year);
        existingTypesRequest.input('casualtyType', casualtyType);
        const existingTypesQuery = `
            SELECT type_of_incident,created_date FROM tbl_kpi_incident_prev_curr_year 
            WHERE year = @year AND casualty_type = @casualtyType
        `;
        const existingTypesResult = await existingTypesRequest.query(existingTypesQuery);
        const existingTypes = existingTypesResult.recordset.map(row => row.type_of_incident);
        const existingCreatedDate = existingTypesResult.recordset[0]?.created_date;

        for (const incident of prevIncidentData) {
            const { type, incidentValue } = incident;

            const updateRequest = conn.request();
            updateRequest.input('year', year);
            updateRequest.input('casualtyType', casualtyType);
            updateRequest.input('typeOfIncident', type);
            updateRequest.input('updatedBy', updatedBy);

            const checkQuery = `
                SELECT COUNT(*) AS count FROM tbl_kpi_incident_prev_curr_year 
                WHERE year = @year AND casualty_type = @casualtyType AND type_of_incident = @typeOfIncident
            `;
            const checkResult = await updateRequest.query(checkQuery);

            if (checkResult.recordset[0].count > 0) {
                for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
                    updateRequest.input(`${month}_incidents`, incidentValue[month]);
                }

                await updateRequest.query(`
                    UPDATE tbl_kpi_incident_prev_curr_year 
                    SET 
                        april_incidents = @april_incidents,
                        may_incidents = @may_incidents,
                        june_incidents = @june_incidents,
                        july_incidents = @july_incidents,
                        august_incidents = @august_incidents,
                        september_incidents = @september_incidents,
                        october_incidents = @october_incidents,
                        november_incidents = @november_incidents,
                        december_incidents = @december_incidents,
                        january_incidents = @january_incidents,
                        february_incidents = @february_incidents,
                        march_incidents = @march_incidents,
                        updated_date = GETDATE(),
                        updated_by = @updatedBy 
                    WHERE year = @year AND casualty_type = @casualtyType AND type_of_incident = @typeOfIncident
                `);
            } else {
                const insertRequest = conn.request();
                insertRequest.input('year', year);
                insertRequest.input('casualtyType', casualtyType);
                insertRequest.input('typeOfIncident', type);
                insertRequest.input('createdBy', updatedBy);
                insertRequest.input('createdDate', existingCreatedDate || new Date());
                
                for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
                    insertRequest.input(`${month}_incidents`, incidentValue[month]);
                }
                
                await insertRequest.query(`
                    INSERT INTO [tbl_kpi_incident_prev_curr_year] 
                    (year, casualty_type, type_of_incident, april_incidents, may_incidents, june_incidents, july_incidents, 
                     august_incidents, september_incidents, october_incidents, november_incidents, 
                     december_incidents, january_incidents, february_incidents, march_incidents, created_date, created_by,updated_date,updated_by)
                    VALUES
                    (@year, @casualtyType, @typeOfIncident, @april_incidents, @may_incidents, @june_incidents, 
                     @july_incidents, @august_incidents, @september_incidents, @october_incidents, 
                     @november_incidents, @december_incidents, @january_incidents, @february_incidents, 
                     @march_incidents, @createdDate, @createdBy, GETDATE(),@createdBy)
                `);
            }
        }
        const typesToDelete = existingTypes.filter(type => !prevIncidentData.some(incident => incident.type === type));
        for (const typeToDelete of typesToDelete) {
            const deleteRequest = conn.request();
            deleteRequest.input('year', year);
            deleteRequest.input('casualtyType', casualtyType);
            deleteRequest.input('typeOfIncident', typeToDelete);

            await deleteRequest.query(`
                DELETE FROM tbl_kpi_incident_prev_curr_year 
                WHERE year = @year AND casualty_type = @casualtyType AND type_of_incident = @typeOfIncident
            `);
        }

        return res.status(200).json({ message: "Data updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function addMarineYearWise(req, res) {
  
    const  year = req.body.year;
    const  missingDesertion = req.body.missingDesertion;
    const  accidentalDeath = req.body.accidentalDeath;
    const  naturalDeath = req.body.naturalDeath;
    const  suicides = req.body.suicides;
    const  injuries = req.body.injuries;
    const  manOverboard = req.body.manOverboard;
    const  missingOnboard = req.body.missingOnboard;
    const  createdBy = req.body.userID;

    const conn = await pool;
    const request = conn.request();

    request.input('year',year);
    request.input('missingDesertion',missingDesertion);
    request.input('accidentalDeath',accidentalDeath);
    request.input('naturalDeath',naturalDeath);
    request.input('suicides',suicides);
    request.input('injuries',injuries);
    request.input('manOverboard',manOverboard);
    request.input('missingOnboard',missingOnboard);
    request.input('createdBy',createdBy);

    try {
        const checkRequest = conn.request();
        checkRequest.input('year', year);
        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) AS count FROM tbl_kpi_incident_year_wise WHERE year = @year
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.sendStatus(409);
        }
    } catch (error) {
        //console.error('Error checking existing data:', error);
        return res.status(500);
    }

    try {
        const insertResult = await request.query(`
            INSERT INTO tbl_kpi_incident_year_wise
            (year, missing_desertion, accidental_death, natural_death, suicides, injuries, 
             man_overboard, missing_onboard,created_date,created_by)
            VALUES
            (@year, @missingDesertion, @accidentalDeath, @naturalDeath, @suicides, 
             @injuries, @manOverboard, @missingOnboard, GETDATE(),@createdBy)
        `);
        return res.sendStatus(201);
    } catch (error) {
        //console.error('Error inserting incident data:', error);
        res.status(500);
    }
}

async function updateMarineYearWise(req, res) {
    const year = req.body.year;
    const missingDesertion = req.body.missingDesertion;
    const accidentalDeath = req.body.accidentalDeath;
    const naturalDeath = req.body.naturalDeath;
    const suicides = req.body.suicides;
    const injuries = req.body.injuries;
    const manOverboard = req.body.manOverboard;
    const missingOnboard = req.body.missingOnboard;
    const updatedBy = req.body.userID;

    const conn = await pool;
    const request = conn.request();

    request.input('year', year);
    request.input('missingDesertion', missingDesertion);
    request.input('accidentalDeath', accidentalDeath);
    request.input('naturalDeath', naturalDeath);
    request.input('suicides', suicides);
    request.input('injuries', injuries);
    request.input('manOverboard', manOverboard);
    request.input('missingOnboard', missingOnboard);
    request.input('updatedBy', updatedBy);

    try {
        const updateResult = await request.query(`
            UPDATE tbl_kpi_incident_year_wise
            SET 
                missing_desertion = @missingDesertion,
                accidental_death = @accidentalDeath,
                natural_death = @naturalDeath,
                suicides = @suicides,
                injuries = @injuries,
                man_overboard = @manOverboard,
                missing_onboard = @missingOnboard,
                updated_date = GETDATE(),
                updated_by = @updatedBy
            WHERE year = @year
        `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "No record found for the given year." });
        }

        return res.status(200).json({ message: "Data updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getMarineCasultyDataByYear(req, res) {
    const type = req.params.type;
    const year = req.params.year;
    const casualtyType = req.params.casualtyType;

    if (!['tbl_kpi_incident_prev_curr_year', 'tbl_kpi_incident_year_wise'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type parameter' }); 
    }
    if (!year || isNaN(year)) {
        return res.status(400).json({ error: 'Invalid year parameter' }); 
    }

    if(type == 'tbl_kpi_incident_prev_curr_year' && (!casualtyType || casualtyType == '')){
        return res.status(400).json({ error: 'Missing Casualty Type parameter' }); 
    }

    const conn = await pool;
    const request = conn.request();

    request.input('type', type);
    request.input('year', year);
    request.input('casualtyType', casualtyType);

    let marineQuery;

    try {
        if (type === "tbl_kpi_incident_prev_curr_year") {
            marineQuery = `SELECT * FROM tbl_kpi_incident_prev_curr_year WHERE year = @year  AND casualty_type = @casualtyType`;
        } else if (type === "tbl_kpi_incident_year_wise") {
            marineQuery = `SELECT * FROM tbl_kpi_incident_year_wise WHERE year = @year`;
        }

        const result = await request.query(marineQuery);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'No data found for the given ID' }); 
        }

        res.json(result.recordset);

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    } 
}

async function getMarineCasultyData(req, res) {
    const type = req.params.type;

    if (!['tbl_kpi_incident_prev_curr_year', 'tbl_kpi_incident_year_wise'].includes(type)) {
        return res.sendStatus(400).json({ error: 'Invalid type parameter' });
    }

    const conn = await pool;
    const request = conn.request();

    request.input('type', type);
    let marineQuery;

    try {
        if (type == "tbl_kpi_incident_prev_curr_year") {
            marineQuery = `SELECT [year],[casualty_type],
                            SUM(ISNULL(april_incidents, 0) + 
                            ISNULL(may_incidents, 0) + 
                            ISNULL(june_incidents, 0) + 
                            ISNULL(july_incidents, 0) + 
                            ISNULL(august_incidents, 0) + 
                            ISNULL(september_incidents, 0) + 
                            ISNULL(october_incidents, 0) + 
                            ISNULL(november_incidents, 0) + 
                            ISNULL(december_incidents, 0) + 
                            ISNULL(january_incidents, 0) + 
                            ISNULL(february_incidents, 0) + 
                            ISNULL(march_incidents, 0)) AS total_incidents,
                            created_date,updated_date  FROM [tbl_kpi_incident_prev_curr_year] GROUP BY [year],[casualty_type],[created_date],[updated_date] ORDER BY [year]  DESC`;
        } else if (type == "tbl_kpi_incident_year_wise") {
            marineQuery = `SELECT 
                                [year],
                                SUM([accidental_death] + 
                                    [missing_desertion] + 
                                    [natural_death] + 
                                    [suicides] + 
                                    [injuries] + 
                                    [man_overboard] + 
                                    [missing_onboard]
                                ) AS total_incidents,
                                 created_date,updated_date
                            FROM [tbl_kpi_incident_year_wise] GROUP BY [year],[created_date],[updated_date] ORDER BY [year] DESC;`;
        }

        const result = await request.query(marineQuery);

        res.json(result.recordset);

    } catch (error) {
        //console.error('Error fetching marine casualty data:', error);
        res.status(500).json({ error: 'Internal server error' });
    } 
};

async function getMarinePrevCurrYrReport(req,res){
    const currentYear = new Date().getFullYear();
    const previousYear = new Date().getFullYear() - 1;
    const financialYear = `${previousYear}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');

    const conn = await pool;
    const request = conn.request();
    request.input("startYear", startYear);
    request.input("endYear", endYear); 

    try {
        const query = `
        SELECT 
            casualty_type,
            [type_of_incident],

            SUM(CASE WHEN [year] = @startYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) 

                ELSE 0 END) AS [January-March '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October-December '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) 

                ELSE 0 END

            ) AS [Total Incidents in '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) ELSE 0 END) AS [January-March '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October - December '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0)

                ELSE 0 END

            ) AS [Total Incidents in '${endYear.slice(-2)}]

        FROM 

            [sagarmanthan_revamp].[dbo].[tbl_kpi_incident_prev_curr_year]

        GROUP BY 
            casualty_type,type_of_incident
        ORDER BY casualty_type;

    `;

        const result = await request.query(query);

        const rowData = result.recordset;  

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available' });
        // }
        
        let columnDefs = [
            {
                headerName: "Casualty Type",
                field: "casualty_type",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Type Of Incident",
                field: "type_of_incident",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: `January-March '${startYear.slice(-2)}`,
                field: `January-March '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${startYear.slice(-2)}`,
                field: `April-June '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${startYear.slice(-2)}`,
                field: `July-September '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October-December '${startYear.slice(-2)}`,
                field: `October-December '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${startYear.slice(-2)}`,
                field: `Total Incidents in '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `January-March '${endYear.slice(-2)}`,
                field: `January-March '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${endYear.slice(-2)}`,
                field: `April-June '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${endYear.slice(-2)}`,
                field: `July-September '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October - December '${endYear.slice(-2)}`,
                field: `October - December '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${endYear.slice(-2)}`,
                field: `Total Incidents in '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            }
        ];

        // Adjusting column definitions for the last two columns to span
        // columnDefs.forEach(col => {
        //     if (col.children && col.children[0].headerName === 'No of vacancies') {
        //         col.headerName = 'No of vacancies';
        //         col.colSpan = 2;
        //     }
        // });

        res.json({ columnDefs, rowData });
    }catch(error){
        //console.error('Error fetching marine casualty data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getMarineCountryWiseReport(req,res){
    const currentYear = new Date().getFullYear();
    const previousYear = new Date().getFullYear() - 1;
    const financialYear = `${previousYear}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');

    const conn = await pool;
    const request = conn.request();
    request.input("startYear", startYear);
    request.input("endYear", endYear);

    try {
        const query = `
           SELECT 
                [casualty_type],
                [country_name],

            SUM(CASE WHEN [year] = @startYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) 

                ELSE 0 END) AS [January-March '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October-December '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) 

                ELSE 0 END

            ) AS [Total Incidents in '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) ELSE 0 END) AS [January-March '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October - December '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0)

                ELSE 0 END

            ) AS [Total Incidents in '${endYear.slice(-2)}]

        FROM 

            [sagarmanthan_revamp].[dbo].[tbl_kpi_incident_country_wise]

        GROUP BY 
            [casualty_type],
            [country_name] 
        ORDER BY 
            [casualty_type];`;

        const result = await request.query(query);

        const rowData = result.recordset;  

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available' });
        // }
        
        let columnDefs = [
            {
                headerName: "Casualty Type",
                field: "casualty_type",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Country Name",
                field: "country_name",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: `January-March '${startYear.slice(-2)}`,
                field: `January-March '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${startYear.slice(-2)}`,
                field: `April-June '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${startYear.slice(-2)}`,
                field: `July-September '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October-December '${startYear.slice(-2)}`,
                field: `October-December '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${startYear.slice(-2)}`,
                field: `Total Incidents in '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `January-March '${endYear.slice(-2)}`,
                field: `January-March '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${endYear.slice(-2)}`,
                field: `April-June '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${endYear.slice(-2)}`,
                field: `July-September '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October - December '${endYear.slice(-2)}`,
                field: `October - December '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${endYear.slice(-2)}`,
                field: `Total Incidents in '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            }
        ];
            
            
        // Adjusting column definitions for the last two columns to span
        // columnDefs.forEach(col => {
        //     if (col.children && col.children[0].headerName === 'No of vacancies') {
        //         col.headerName = 'No of vacancies';
        //         col.colSpan = 2;
        //     }
        // });

        res.json({ columnDefs, rowData });
    }catch(error){
        console.error('Error fetching marine casualty data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getMarineVesselWiseReport(req,res){
    const currentYear = new Date().getFullYear();
    const previousYear = new Date().getFullYear() - 1;
    const financialYear = `${previousYear}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');

    const conn = await pool;
    const request = conn.request();
    request.input("startYear", startYear);
    request.input('endYear',endYear);

    try {
        const query = `
            SELECT 
                [casualty_type],
                [vessel_name],

            SUM(CASE WHEN [year] = @startYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) 

                ELSE 0 END) AS [January-March '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October-December '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @startYear  THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) 

                ELSE 0 END

            ) AS [Total Incidents in '${startYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) ELSE 0 END) AS [January-March '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) ELSE 0 END) AS [April-June '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) ELSE 0 END) AS [July-September '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0) ELSE 0 END) AS [October - December '${endYear.slice(-2)}],

            SUM(CASE WHEN [year] = @endYear THEN 

                ISNULL([january_incidents], 0) + ISNULL([february_incidents], 0) + ISNULL([march_incidents], 0) +

                ISNULL([april_incidents], 0) + ISNULL([may_incidents], 0) + ISNULL([june_incidents], 0) +

                ISNULL([july_incidents], 0) + ISNULL([august_incidents], 0) + ISNULL([september_incidents], 0) +

                ISNULL([october_incidents], 0) + ISNULL([november_incidents], 0) + ISNULL([december_incidents], 0)

                ELSE 0 END

            ) AS [Total Incidents in '${endYear.slice(-2)}]

        FROM 

            [sagarmanthan_revamp].[dbo].[tbl_kpi_vessel_incident]

        GROUP BY 
            [casualty_type],
            [vessel_name]
        ORDER BY
            [casualty_Type]`;

        const result = await request.query(query);

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.sendStatus(404).json({ error: 'No data available' });
        }
        
        let columnDefs = [
            {
                headerName: "Casualty Type",
                field: "casualty_type",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Vessel Name",
                field: "vessel_name",
                headerClass: "headercenter",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: `January-March '${startYear.slice(-2)}`,
                field: `January-March '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${startYear.slice(-2)}`,
                field: `April-June '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${startYear.slice(-2)}`,
                field: `July-September '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October-December '${startYear.slice(-2)}`,
                field: `October-December '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${startYear.slice(-2)}`,
                field: `Total Incidents in '${startYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `January-March '${endYear.slice(-2)}`,
                field: `January-March '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `April-June '${endYear.slice(-2)}`,
                field: `April-June '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `July-September '${endYear.slice(-2)}`,
                field: `July-September '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `October - December '${endYear.slice(-2)}`,
                field: `October - December '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            },
            {
                headerName: `Total Incidents in '${endYear.slice(-2)}`,
                field: `Total Incidents in '${endYear.slice(-2)}`,
                headerClass: "headercenter"
            }
        ];
            
            
        // Adjusting column definitions for the last two columns to span
        // columnDefs.forEach(col => {
        //     if (col.children && col.children[0].headerName === 'No of vacancies') {
        //         col.headerName = 'No of vacancies';
        //         col.colSpan = 2;
        //     }
        // });

        res.json({ columnDefs, rowData });
    }catch(error){
        //console.error('Error fetching marine casualty data:', error);
        res.status(500).json({ error: 'Internal server error',error });
    }
};

async function getMarineYearWiseReport(req,res){
    const conn = await pool;
    const request = conn.request();

    try {
        const query = `
            SELECT 
                  [year] AS 'Year'
                  ,[accidental_death] AS 'Accidental Death'
                  ,[missing_desertion] AS 'Missing Desertion'
                  ,[natural_death] AS 'Natural Death'
                  ,[suicides] AS 'Suicides'
                  ,[injuries] AS 'Injuries'
                  ,[man_overboard] AS 'Man Overboard'
                  ,[missing_onboard] AS 'Missing Overboard'
            	  ,SUM([accidental_death] + [missing_desertion] + [natural_death] + [suicides] + [injuries] + [man_overboard] + [missing_onboard]) AS 'Total Incidents'
              FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_incident_year_wise]
              GROUP BY year,[accidental_death],[missing_desertion],[natural_death],[suicides],[injuries],[man_overboard],[missing_onboard]
            `;

        const result = await request.query(query);

        const rowData = result.recordset;  

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available' });
        // }
        
            let columnDefs = [
                {
                    headerName: "Year",
                    field: "Year",
                    headerClass: "headercenter",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: `Accidental Death`,
                    field: "Accidental Death",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Missing Desertion`,
                    field: "Missing Desertion",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Natural Death`,
                    field: "Natural Death",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Suicides`,
                    field: "Suicides",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Injuries`,
                    field: "Injuries",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Man Overboard`,
                    field: "Man Overboard",
                    headerClass: "headercenter"
                },
                {
                    headerName: `Total Incidents`,
                    field: "Total Incidents",
                    headerClass: "headercenter"
                }
            ];
            
            
        // Adjusting column definitions for the last two columns to span
        // columnDefs.forEach(col => {
        //     if (col.children && col.children[0].headerName === 'No of vacancies') {
        //         col.headerName = 'No of vacancies';
        //         col.colSpan = 2;
        //     }
        // });

        res.json({ columnDefs, rowData });
    }catch(error){
        //console.error('Error fetching marine casualty data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function submitIncidentVesselWise(req, res) {
    const { year, casualtyType, incidents, userId } = req.body;
    const conn = await pool;

    try {
        const checkRequest = conn.request();
        checkRequest.input('year', year);
        checkRequest.input('casualtyType', casualtyType);
        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) AS count FROM tbl_kpi_vessel_incident 
            WHERE year = @year AND casualty_type = @casualtyType
        `);

        if (checkResult.recordset[0].count > 0) {
            const existingTypesRequest = conn.request();
            existingTypesRequest.input('year', year);
            existingTypesRequest.input('casualtyType', casualtyType);
            const existingTypesQuery = `
                SELECT vessel_name, created_date FROM tbl_kpi_vessel_incident 
                WHERE year = @year AND casualty_type = @casualtyType
            `;
            const existingTypesResult = await existingTypesRequest.query(existingTypesQuery);
            const existingTypes = existingTypesResult.recordset.map(row => row.vessel_name);
            const existingCreatedDate = existingTypesResult.recordset[0]?.created_date;
    
            for (const incident of incidents) {
                const { type, incidentValue } = incident;
    
                const updateRequest = conn.request();
                updateRequest.input('year', year);
                updateRequest.input('casualtyType', casualtyType);
                updateRequest.input('vesselName', type);
                updateRequest.input('updatedBy', userId);
    
                const checkQuery = `
                    SELECT COUNT(*) AS count FROM tbl_kpi_vessel_incident 
                    WHERE year = @year AND casualty_type = @casualtyType AND vessel_name = @vesselName
                `;
                const checkResult = await updateRequest.query(checkQuery);
    
                if (checkResult.recordset[0].count > 0) {
                    for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
                        updateRequest.input(`${month}_incidents`, incidentValue[month]);
                    }
    
                    await updateRequest.query(`
                        UPDATE tbl_kpi_vessel_incident 
                        SET 
                            april_incidents = @april_incidents,
                            may_incidents = @may_incidents,
                            june_incidents = @june_incidents,
                            july_incidents = @july_incidents,
                            august_incidents = @august_incidents,
                            september_incidents = @september_incidents,
                            october_incidents = @october_incidents,
                            november_incidents = @november_incidents,
                            december_incidents = @december_incidents,
                            january_incidents = @january_incidents,
                            february_incidents = @february_incidents,
                            march_incidents = @march_incidents,
                            updated_date = GETDATE(),
                            updated_by = @updatedBy
                        WHERE year = @year AND casualty_type = @casualtyType AND vessel_name = @vesselName
                    `);
                } else {
                    const insertRequest = conn.request();
                    insertRequest.input('year', year);
                    insertRequest.input('casualtyType', casualtyType);
                    insertRequest.input('vesselName', type);
                    insertRequest.input('createdBy', userId);
                    insertRequest.input('createdDate', existingCreatedDate || new Date());
    
                    for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
                        insertRequest.input(`${month}_incidents`, incidentValue[month]);
                    }
    
                    await insertRequest.query(`
                        INSERT INTO [tbl_kpi_vessel_incident] 
                        (year, casualty_type, vessel_name, april_incidents, may_incidents, june_incidents, july_incidents, 
                         august_incidents, september_incidents, october_incidents, november_incidents, 
                         december_incidents, january_incidents, february_incidents, march_incidents, 
                         created_date, created_by, updated_date, updated_by)
                        VALUES
                        (@year, @casualtyType, @vesselName, @april_incidents, @may_incidents, @june_incidents, 
                         @july_incidents, @august_incidents, @september_incidents, @october_incidents, 
                         @november_incidents, @december_incidents, @january_incidents, @february_incidents, 
                         @march_incidents, @createdDate, @createdBy, GETDATE(), @createdBy)
                    `);
                }
            }
            const typesToDelete = existingTypes.filter(type => !incidents.some(incident => incident.type === type));
            for (const typeToDelete of typesToDelete) {
                const deleteRequest = conn.request();
                deleteRequest.input('year', year);
                deleteRequest.input('casualtyType', casualtyType);
                deleteRequest.input('vesselName', typeToDelete);
    
                await deleteRequest.query(`
                    DELETE FROM tbl_kpi_vessel_incident 
                    WHERE year = @year AND casualty_type = @casualtyType AND vessel_name = @vesselName
                `);
            }
    
            return res.status(201).json({ message: "Data updated successfully" });
        } else {
            for (const incident of incidents) { 
                const { type, incidentValue } = incident; 
                const insertRequest = conn.request(); 
                insertRequest.input('year', year); 
                insertRequest.input('casualtyType', casualtyType); 
                insertRequest.input('vesselName', type); 
                insertRequest.input('createdBy', userId);

                for (const month of ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march']) {
                    insertRequest.input(`${month}_incidents`, incidentValue[month]); 
                }

                await insertRequest.query(`
                    INSERT INTO [tbl_kpi_vessel_incident] 
                    (year, casualty_type, vessel_name, april_incidents, may_incidents, june_incidents, july_incidents, 
                     august_incidents, september_incidents, october_incidents, november_incidents, 
                     december_incidents, january_incidents, february_incidents, march_incidents, created_date, created_by)
                    VALUES
                    (@year, @casualtyType, @vesselName, @april_incidents, @may_incidents, @june_incidents, 
                     @july_incidents, @august_incidents, @september_incidents, @october_incidents, 
                     @november_incidents, @december_incidents, @january_incidents, @february_incidents, 
                     @march_incidents, GETDATE(), @createdBy)
                `);
            }

            return res.status(201).json({ message: 'Record inserted successfully' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function getVesselWise(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT [year],[casualty_type],
            SUM(ISNULL(april_incidents, 0) + 
            ISNULL(may_incidents, 0) + 
            ISNULL(june_incidents, 0) + 
            ISNULL(july_incidents, 0) + 
            ISNULL(august_incidents, 0) + 
            ISNULL(september_incidents, 0) + 
            ISNULL(october_incidents, 0) + 
            ISNULL(november_incidents, 0) + 
            ISNULL(december_incidents, 0) + 
            ISNULL(january_incidents, 0) + 
            ISNULL(february_incidents, 0) + 
            ISNULL(march_incidents, 0)) AS total_incidents,
            created_date,updated_date  FROM [tbl_kpi_vessel_incident] GROUP BY [year],[casualty_type] ,[created_date],[updated_date] ORDER BY [year]  DESC
         `);
        const rowData = result.recordset;  

        //  if (rowData.length === 0) {
        //      return res.status(404).json({ error: 'No data available' });
        //  }

        res.json(result.recordset);
    }
    catch (err) {
        // console.log(err);
        return res.sendStatus(500);
    }
};


async function submitIncidentCountryWise(req, res) {

    const {year,casualtyType,incidentCountryWise,userID} = req.body;

    const conn = await pool;
    const request = conn.request(); 

    try {
        const checkRequestData = `
            SELECT * FROM tbl_kpi_incident_country_wise
            WHERE year = @year AND casualty_type = @casualtyType;
        `;

        request.input("year", year);
        request.input('casualtyType',casualtyType);

        const checkResult = await request.query(checkRequestData);
    
        if(checkResult.recordset.length!==0){
            const existingRequest = conn.request();
            existingRequest.input('year', year);
            existingRequest.input('casualtyType', casualtyType);
            const existingQuery = `
                SELECT country_name FROM tbl_kpi_incident_country_wise 
                WHERE year = @year AND casualty_type = @casualtyType
            `;
            const existingResult = await existingRequest.query(existingQuery);
            const existingValues = existingResult.recordset.map(row => row.country_name);
          
        for (const incident of incidentCountryWise) { 
            const { type, incidentValue } = incident; 
                
            const updateRequest = conn.request();
            updateRequest.input("year", year);
            updateRequest.input("casualtyType", casualtyType);
            updateRequest.input('countryName', type); 
            updateRequest.input("userID", userID) 

        const checkQuery= `
        SELECT COUNT(*) AS count FROM tbl_kpi_incident_country_wise
        WHERE year = @year AND casualty_type = @casualtyType AND country_name=@countryName;
        `;

        const checkResult = await updateRequest.query(checkQuery);

        if (checkResult.recordset[0].count > 0) {
            for (const month of [ 'january', 'february', 'march','april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']) {
                updateRequest.input(`${month}_incidents`, incidentValue[month]); 
            }

            await updateRequest.query(`
            UPDATE tbl_kpi_incident_country_wise 
            SET 
            january_incidents =@january_incidents , 
            february_incidents = @february_incidents, 
            march_incidents = @march_incidents, 
            april_incidents = @april_incidents, 
            may_incidents = @may_incidents, 
            june_incidents = @june_incidents, 
            july_incidents = @july_incidents,                 
            august_incidents = @august_incidents, 
            september_incidents = @september_incidents, 
            october_incidents = @october_incidents, 
            november_incidents = @november_incidents, 
            december_incidents = @december_incidents,
            updated_date = GETDATE(),
            updated_by = @userID
            WHERE year = @year AND casualty_type = @casualtyType AND country_name=@countryName
            `);      
        }else{
            const insertRequest = conn.request();

            insertRequest.input('year', year); 
            insertRequest.input('casualtyType', casualtyType); 
            insertRequest.input('countryName', type); 
            insertRequest.input('userID', userID);

            for (const month of ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']) {
                request.input(`${month}_incidents`, incidentValue[month]); 
            }
            await insertRequest.query(`
                INSERT INTO tbl_kpi_incident_country_wise (
                country_name, january_incidents, february_incidents, march_incidents, april_incidents, may_incidents, june_incidents, july_incidents, 
                august_incidents, september_incidents, october_incidents, november_incidents, 
                december_incidents, updated_date,updated_by)
                VALUES (
                @countryName, @january_incidents, @february_incidents, @march_incidents, @april_incidents, @may_incidents, @june_incidents, @july_incidents, 
                @august_incidents, @september_incidents, @october_incidents, @november_incidents, 
                @december_incidents, GETDATE(),@userID
                );
            `);         
         } 
         const deleteToValues = existingValues.filter(type => ! incidentCountryWise.some(incident => incident.type === type));
         for(const deleteToValue of deleteToValues ){
            const deleteRequest = conn.request();
            deleteRequest.input('year', year);
            deleteRequest.input('casualtyType', casualtyType);
            deleteRequest.input('countryName', deleteToValue);
            await deleteRequest.query(`
                 DELETE FROM tbl_kpi_incident_country_wise 
                        WHERE year = @year AND casualty_type = @casualtyType AND country_name = @countryName
                `);
          }
        }
            // console.log("updated query 2")
            return res.status(201).json({ message: "Record updated successfully" });
        }else{
            for (const incident of incidentCountryWise) { 
                const { type, incidentValue } = incident; 

                const insertRequest = conn.request(); 
                insertRequest.input('year', year); 
                insertRequest.input('casualtyType', casualtyType); 
                insertRequest.input('countryName', type); 
                insertRequest.input('userID', userID);

                for (const month of ['january', 'february', 'march','april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']) {
                    insertRequest.input(`${month}_incidents`, incidentValue[month]); 
                 }
                await insertRequest.query(`
                INSERT INTO tbl_kpi_incident_country_wise (
                year,casualty_type,country_name, january_incidents, february_incidents, march_incidents, april_incidents, may_incidents, june_incidents, july_incidents, 
                august_incidents, september_incidents, october_incidents, november_incidents, 
                december_incidents, created_date,created_by )
                VALUES (
                @year,@casualtyType,@countryName, @january_incidents, @february_incidents, @march_incidents, @april_incidents, @may_incidents, @june_incidents, @july_incidents, 
                @august_incidents, @september_incidents, @october_incidents, @november_incidents, 
                @december_incidents, GETDATE(),@userID
                    );
            `);
            
    }
    // console.log("record inserted ")
        return res.status(201).json({ message: 'Record inserted successfully' });
    }
        }catch(error){
            // console.log("error ",error.message);
            return res.status(500).json({ message: error.message});
        }
    }




async function getCountryWise(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT
            year,
            casualty_type,
            SUM(ISNULL(april_incidents, 0) + 
            ISNULL(may_incidents, 0) + 
            ISNULL(june_incidents, 0) + 
            ISNULL(july_incidents, 0) + 
            ISNULL(august_incidents, 0) + 
            ISNULL(september_incidents, 0) + 
            ISNULL(october_incidents, 0) + 
            ISNULL(november_incidents, 0) + 
            ISNULL(december_incidents, 0) + 
            ISNULL(january_incidents, 0) + 
            ISNULL(february_incidents, 0) + 
            ISNULL(march_incidents, 0)) AS total_incidents,
            MAX(created_date) AS created_date,
              MAX(updated_date) AS updated_date
            FROM 
                tbl_kpi_incident_country_wise
            GROUP BY
	            year, casualty_type
            ORDER BY 
                year DESC;
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.status(500);
    }
};

async function getDataCountryWisebyYearAndCasualty(req, res) {
    const casualtyType = req.params.casualtyType;
    const year = req.params.year;
 
    // Validate year and month
    if (!year || !casualtyType) {
        return res.status(400).json({ error: "Invalid year or casualtyType" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("casualtyType", casualtyType);
    request.input("year", year);
    
    
    let IncidentsQuery;
    try {
        IncidentsQuery = `SELECT * FROM tbl_kpi_incident_country_wise WHERE year = @year AND casualty_type = @casualtyType`;
        const result = await request.query(IncidentsQuery);

        res.json(result.recordset);

    } catch (err) {
        //console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getDataVesselWisebyYearAndCasualty(req, res) {
    const casualtyType = req.params.casualtyType;
    const year = req.params.year;

    if (!year || !casualtyType) {
        return res.status(400).json({ error: "Invalid year or casualty type" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("casualtyType", casualtyType);
    request.input("year", year);
    

    let IncidentsQuery;
    try {
        IncidentsQuery = `SELECT  casualty_type, year FROM tbl_kpi_vessel_incident WHERE casualty_type = @casualtyType AND year = @year`;
        const result = await request.query(IncidentsQuery);

        return res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.sendStatus(500);
    }
}

async function getCoutryWiseYearAndCasualty(req,res) {

    const year = req.params.year;
    const casualtyType = req.params.casualtyType;
    

    if (!year || !casualtyType) {
        return res.status(400).json({ error: "Invalid year or casualty type" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("casualtyType", casualtyType);
   
    
    let IncidentsQuery;
    try {
        IncidentsQuery = `SELECT  year,casualty_type FROM tbl_kpi_incident_country_wise WHERE year = @year AND casualty_type = @casualtyType`;
        const result = await request.query(IncidentsQuery);
        
        return res.json(result.recordset);
    } catch (err) {
        // //console.log(err); 
        return res.sendStatus(500);
    }
    
}

async function getIncidentsVesselDataByYearAndType(req,res) {

    const year = req.params.year;
    const casualtyType = req.params.casualtyType;
    

    if (!year || !casualtyType) {
        return res.status(400).json({ error: "Invalid year or casualty type" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("casualtyType", casualtyType);
   
    
    let IncidentsQuery;
    try {
        IncidentsQuery = `SELECT  * FROM tbl_kpi_vessel_incident WHERE year = @year AND casualty_type = @casualtyType`;
        const result = await request.query(IncidentsQuery);
        const rowData = result.recordset; 

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        return res.json(result.recordset);
    } catch (err) {
        // //console.log(err); 
        return res.sendStatus(500);
    }
    
}

const marineTab = {
    addMarinePrevIncident,
    addMarineYearWise,
    getMarineCasultyData,
    getMarineCasultyDataByYear,
    updateMarinePrevIncident,
    updateMarineYearWise,
    getMarinePrevCurrYrReport,
    getMarineCountryWiseReport,
    getMarineYearWiseReport,
    getMarineVesselWiseReport,
    submitIncidentVesselWise,
    getVesselWise,
    submitIncidentCountryWise,
    getCountryWise,
    getDataVesselWisebyYearAndCasualty,
    getIncidentsVesselDataByYearAndType,
    getDataCountryWisebyYearAndCasualty,
    getCoutryWiseYearAndCasualty
};


export default marineTab;


