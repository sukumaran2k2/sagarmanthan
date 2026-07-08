import { pool } from "../../db.js";

async function getAddKpi2_3_Masterdata(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const type = req.params.type;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("type", type);

    try {

        let result;

        let isExists = await request.query(`SELECT dgs_2_3_2_id from tbl_kpi_dgs_2_3_2 
                where year = @year AND month = @month AND type_id = @type ;`);

        if (isExists.recordset.length > 0) {
            result = await request.query(`SELECT dgs_2_3_2_id AS dgs_2_3_2_ID, year, month, 
                    tbl_kpi_dgs_2_3_2.type_id AS typeId, type_name AS typeName, 
                    tbl_kpi_dgs_2_3_2.grade_id AS gradeId, grade_name AS gradeName, 
                    tbl_kpi_dgs_2_3_2.code_id AS codeId, code_name AS codeName,  
                    tbl_kpi_dgs_2_3_2.subject_id  AS subjectId, subject_name AS subjectName, 
                    tbl_kpi_dgs_2_3_2.frequency_id AS frequencyId, frequency_name AS frequencyName,
                    candidates_appeared AS candidatesAppeared, candidate_passed AS candidatesPassed, pass_percentage AS passPercentage
    
                    FROM tbl_kpi_dgs_2_3_2
                    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = tbl_kpi_dgs_2_3_2.type_id
                    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = tbl_kpi_dgs_2_3_2.grade_id
                    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = tbl_kpi_dgs_2_3_2.code_id
                    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = tbl_kpi_dgs_2_3_2.subject_id
                    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = tbl_kpi_dgs_2_3_2.frequency_id
                    
                    WHERE year = @year and month = @month and tbl_kpi_dgs_2_3_2.type_id = @type ` );
        }
        else {
            result = await request.query(`SELECT id, mmt_kpi_2_3_data.type_id AS typeId, type_name AS typeName, 
                    mmt_kpi_2_3_data.grade_id AS gradeId, grade_name AS gradeName, 
                    mmt_kpi_2_3_data.code_id AS codeId, code_name AS codeName, 
                    mmt_kpi_2_3_data.subject_id AS subjectId, subject_name AS subjectName, 
                    mmt_kpi_2_3_data.frequency_id AS frequencyId, frequency_name AS frequencyName

                    FROM mmt_kpi_2_3_data
                    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = mmt_kpi_2_3_data.code_id
                    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = mmt_kpi_2_3_data.frequency_id
                    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = mmt_kpi_2_3_data.grade_id
                    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = mmt_kpi_2_3_data.subject_id
                    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = mmt_kpi_2_3_data.type_id 
                    WHERE mmt_kpi_2_3_data.type_id = @type ` );
        }

        // console.log(result, "result")
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            { headerName: "dgs_2_3_2 ID", field: "dgs_2_3_2_ID", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Type ID", field: "typeId", sortable: true, filter: true, width: 100, hide: true },
            {
                headerName: 'Type',
                field: 'typeName',
                headerClass: "headercenter",
                pinned: true,
                sortable: true,
                filter: true,
                width: 180,
                rowGroup: true,
                hide: true,

            },
            { headerName: "Grade Id", field: "gradeId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Grade", field: "gradeName", sortable: true, filter: true, width: 120, rowGroup: true, hide: true, pinned: true,},
            { headerName: "Code Id", field: "codeId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Code", field: "codeName", sortable: true, filter: true, width: 130 },
            { headerName: "Subject Id", field: "subjectId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Subject", field: "subjectName", sortable: true, filter: true, width: 170 },
            { headerName: "Frequency Id", field: "frequencyId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Frequency", field: "frequencyName", sortable: true, filter: true, width: 130 },

            {
                headerName: "Input Data", headerClass: "headercenter", children: [
                    { headerName: "No. of Candidates Appeared", field: "candidatesAppeared", editable: true, filter: true, width: 270 },
                    { headerName: "No. of Candidates Passed", field: "candidatesPassed", editable: true, filter: true, width: 270 },
                    {
                        headerName: "Pass Percentage", 
                        field: "passPercentage",
                        editable: false, // Changed to non-editable                        
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        filter: true,
                        width: 180,
                        hide: true,
                        valueGetter: (params) => {
                            if (!params.data) return ''; // Check if data is defined
                            const appeared = params.data.candidatesAppeared || 0; // Get candidatesAppeared or default to 0
                            const passed = params.data.candidatesPassed || 0; // Get candidatesPassed or default to 0
                            return appeared > 0 ? ((passed / appeared) * 100).toFixed(2) + '%' : ''; // Calculate percentage or return empty
                        }
                    }
                ]
            },
        ]
        // console.log(columnDefs,  "columnDefs, rowData")

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function checkData_2_3_1(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    
    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);

    // Check if year, month are provided
    if (!year || !month ) {
        return res.status(400).json({ message: "Year and month are required." });
    }
    
    try {
        const result = await request.query(` SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_3_1 
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

async function createDgsKpi2_3_1Data(req, res) {
    const year = req.body.year;
    const month = req.body.month
    const type = req.body.type
    const totalExamNautical = req.body.totalExamNautical;
    const totalExamEngineering = req.body.totalExamEngineering;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("type", type);
    request.input("totalExamNautical", totalExamNautical);
    request.input("totalExamEngineering", totalExamEngineering);

    try {

        const result = await request.query(`INSERT INTO tbl_kpi_dgs_2_3_1 (year, month, type, total_exam_nautical, total_exam_engineering )
            OUTPUT INSERTED.dgs_2_3_1_id
            VALUES ( @year, @month, @type, @totalExamNautical, @totalExamEngineering )`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getKpi2_3_1_List(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT year, month, SUM(total_exam_nautical) AS total_exam_nautical, 
                SUM(total_exam_engineering) AS total_exam_engineering 
                FROM tbl_kpi_dgs_2_3_1              
                
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

async function getUpdateMmd_2_3_1Data(req, res) {
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_3_1 
            WHERE year = @year AND month = @month;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_3_1Data(req, res) 
{
    const year = req.body.year;
    const month = req.body.month;
    const totalExamNautical = req.body.totalExamNautical;
    const totalExamEngineering = req.body.totalExamEngineering;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("totalExamNautical", totalExamNautical);
    request.input("totalExamEngineering", totalExamEngineering);

    try {
        const result = await request.query(`UPDATE tbl_kpi_dgs_2_3_1 
            SET 
                total_exam_nautical = @totalExamNautical, 
                total_exam_engineering = @totalExamEngineering 
 
        WHERE year = @year AND month = @month`);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ------------------------------------------------------------------------------------------------------------------------------

async function checkData_2_3_2(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    const onType = req.params.onType;

    
    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("onType", onType);

    // Check if year, month are provided
    if (!year || !month || !onType) {
        return res.status(400).json({ message: "Year, month, and type are required." });
    }
    
    try {
        const result = await request.query(` SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_3_2 
            WHERE year = @year AND month = @month AND type_id = @onType
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

async function createDgsKpi2_3_2Data(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const rowData = req.body.rowData;

    const conn = await pool;
    console.log(year, rowData)
    try {

        for (let p = 0; p < rowData.length; p++) {
            const dgs_2_3_2_ID = rowData[p].dgs_2_3_2_ID
            let typeId = rowData[p].typeId
            let gradeId = rowData[p].gradeId
            let codeId = rowData[p].codeId
            let subjectId = rowData[p].subjectId
            let frequencyId = rowData[p].frequencyId
            let candidatesAppeared = rowData[p].candidatesAppeared
            let candidatesPassed = rowData[p].candidatesPassed

            console.log(typeId, year, dgs_2_3_2_ID, 'type, year')
            console.log(gradeId, 'gradeId')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);
            request.input("dgs_2_3_2_ID", dgs_2_3_2_ID);
            request.input("typeId", typeId);
            request.input("gradeId", gradeId);
            request.input("codeId", codeId);
            request.input("subjectId", subjectId);
            request.input("frequencyId", frequencyId);
            request.input("candidatesAppeared", candidatesAppeared);
            request.input("candidatesPassed", candidatesPassed);

            const query = `IF NOT EXISTS (
                    SELECT tbl_kpi_dgs_2_3_2.dgs_2_3_2_id 
                    FROM tbl_kpi_dgs_2_3_2 
                    WHERE year = @year AND month = @month AND dgs_2_3_2_id = @dgs_2_3_2_ID
                )

                BEGIN
                    INSERT INTO tbl_kpi_dgs_2_3_2 (year, month, type_id, grade_id, code_id, subject_id, frequency_id, 
                        candidates_appeared, candidate_passed, pass_percentage) 
                    VALUES (
                        @year, 
                        @month, 
                        @typeId, 
                        @gradeId, 
                        @codeId, 
                        @subjectId, 
                        @frequencyId, 
                        @candidatesAppeared, 
                        @candidatesPassed, 
                        ROUND((@candidatesPassed * 100.0) / NULLIF(@candidatesAppeared, 0), 2)
                    )
                END
                ELSE
                BEGIN
                    UPDATE tbl_kpi_dgs_2_3_2
                    SET 
                        type_id = @typeId,
                        grade_id = @gradeId,
                        code_id = @codeId,
                        subject_id = @subjectId,
                        frequency_id = @frequencyId,                             
                        candidates_appeared = @candidatesAppeared,
                        candidate_passed = @candidatesPassed,
                        pass_percentage = ROUND((@candidatesPassed * 100.0) / NULLIF(@candidatesAppeared, 0), 2)
                    WHERE 
                        year = @year 
                        AND month = @month 
                        AND dgs_2_3_2_id = @dgs_2_3_2_ID;
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

async function getKpi2_3_2_List(req, res) {
    const conn = await pool;
    // const userID = req.params.userID;

    try {
        const result = await conn.query(`SELECT year, month, tbl_kpi_dgs_2_3_2.type_id, type_name, SUM(candidates_appeared) AS candidatesAppeared, 
            SUM(candidate_passed) AS candidatesPassed, 
            ROUND((SUM(candidate_passed) * 100.0) / NULLIF(SUM(candidates_appeared), 0), 2) AS passPercentage

            FROM tbl_kpi_dgs_2_3_2
            INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = tbl_kpi_dgs_2_3_2.type_id
            GROUP BY year, month, tbl_kpi_dgs_2_3_2.type_id, type_name
            
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
                END DESC, 
                tbl_kpi_dgs_2_3_2.type_id ; 
          
        ;`);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getEditKpi2_3_Masterdata(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const typeId = req.params.typeId;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("typeId", typeId);

    try {

        let result;

        let isExists = await request.query(`SELECT dgs_2_3_2_id from tbl_kpi_dgs_2_3_2 
            where year = @year AND month = @month and type_id = @typeId;`);

        if (isExists.recordset.length > 0) {
            result = await request.query(`SELECT dgs_2_3_2_id AS dgs_2_3_2_ID, year, month, 
                    tbl_kpi_dgs_2_3_2.type_id AS typeId, type_name AS typeName, 
                    tbl_kpi_dgs_2_3_2.grade_id AS gradeId, grade_name AS gradeName, 
                    tbl_kpi_dgs_2_3_2.code_id AS codeId, code_name AS codeName,  
                    tbl_kpi_dgs_2_3_2.subject_id  AS subjectId, subject_name AS subjectName, 
                    tbl_kpi_dgs_2_3_2.frequency_id AS frequencyId, frequency_name AS frequencyName,
                    candidates_appeared AS candidatesAppeared, candidate_passed AS candidatesPassed, pass_percentage AS passPercentage
    
                    FROM tbl_kpi_dgs_2_3_2
                    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = tbl_kpi_dgs_2_3_2.type_id
                    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = tbl_kpi_dgs_2_3_2.grade_id
                    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = tbl_kpi_dgs_2_3_2.code_id
                    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = tbl_kpi_dgs_2_3_2.subject_id
                    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = tbl_kpi_dgs_2_3_2.frequency_id
                    
                    WHERE year = @year and month = @month and tbl_kpi_dgs_2_3_2.type_id = @typeId ` );
        }
        else {
            result = await request.query(`SELECT id, mmt_kpi_2_3_data.type_id AS typeId, type_name AS typeName, 
                    mmt_kpi_2_3_data.grade_id AS gradeId, grade_name AS gradeName, 
                    mmt_kpi_2_3_data.code_id AS codeId, code_name AS codeName, 
                    mmt_kpi_2_3_data.subject_id AS subjectId, subject_name AS subjectName, 
                    mmt_kpi_2_3_data.frequency_id AS frequencyId, frequency_name AS frequencyName

                    FROM mmt_kpi_2_3_data
                    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = mmt_kpi_2_3_data.code_id
                    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = mmt_kpi_2_3_data.frequency_id
                    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = mmt_kpi_2_3_data.grade_id
                    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = mmt_kpi_2_3_data.subject_id
                    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = mmt_kpi_2_3_data.type_id 
                    WHERE mmt_kpi_2_3_data.type_id = @typeId  ` );
        }

        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            { headerName: "dgs_2_3_2 ID", field: "dgs_2_3_2_ID", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Type ID", field: "typeId", sortable: true, filter: true, width: 100, hide: true },
            {
                headerName: 'Type',
                field: 'typeName',
                headerClass: "headercenter",
                pinned: true,
                sortable: true,
                filter: true,
                width: 180,
                rowGroup: true,
                hide: true,

            },
            { headerName: "Grade Id", field: "gradeId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Grade", field: "gradeName", sortable: true, filter: true, width: 120, rowGroup: true, hide: true, pinned: true,},
            { headerName: "Code Id", field: "codeId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Code", field: "codeName", sortable: true, filter: true, width: 130 },
            { headerName: "Subject Id", field: "subjectId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Subject", field: "subjectName", sortable: true, filter: true, width: 170 },
            { headerName: "Frequency Id", field: "frequencyId", sortable: true, filter: true, width: 50, hide: true },
            { headerName: "Frequency", field: "frequencyName", sortable: true, filter: true, width: 130 },

            {
                headerName: "Input Data", headerClass: "headercenter", children: [
                    { headerName: "No. of Candidates Appeared", field: "candidatesAppeared", editable: true, filter: true, width: 270 },
                    { headerName: "No. of Candidates Passed", field: "candidatesPassed", editable: true, filter: true, width: 270 },
                    {
                        headerName: "Pass Percentage", 
                        field: "passPercentage",
                        editable: false, // Changed to non-editable                        
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        filter: true,
                        width: 180,
                        valueGetter: (params) => {
                            if (!params.data) return ''; // Check if data is defined
                            const appeared = params.data.candidatesAppeared || 0; // Get candidatesAppeared or default to 0
                            const passed = params.data.candidatesPassed || 0; // Get candidatesPassed or default to 0
                            return appeared > 0 ? ((passed / appeared) * 100).toFixed(2) + '%' : ''; // Calculate percentage or return empty
                        }
                    }
                ]
            },
        ]

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// -------------------------------------------------------------------------------------------------------------------------------


export default { getKpi2_3_1_List, checkData_2_3_1,createDgsKpi2_3_1Data, getUpdateMmd_2_3_1Data, 
    editDgsKpi2_3_1Data, getAddKpi2_3_Masterdata,  checkData_2_3_2,
    createDgsKpi2_3_2Data, getKpi2_3_2_List, getEditKpi2_3_Masterdata,
};
