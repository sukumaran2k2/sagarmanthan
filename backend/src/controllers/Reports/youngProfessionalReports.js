
import { pool } from "../../db.js";

async function getYoungProfessionalReport (req, res) 
{
    const conn = await pool;

    try 
    {
        const result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id AS [Wing ID],
            mmt_wings.wing_name AS [Wing],
            SUM(
                CASE
                    WHEN yp.post_status = 'Filled' THEN 1
                    WHEN yp.post_status = 'Vacant' THEN 1
                    ELSE 0
                END
            ) AS [Total No of Post],
            SUM(CASE WHEN yp.post_status = 'Filled' THEN 1 ELSE 0 END) AS [No of Vacancy Filled Up],
            SUM(CASE WHEN yp.post_status = 'Vacant' THEN 1 ELSE 0 END) AS [No of Vacancy In Process]
        FROM
            mmt_wings 
        LEFT JOIN
            tbl_young_professional yp ON mmt_wings.wing_id = yp.wing
        GROUP BY
            mmt_wings.wing_id, mmt_wings.wing_name
        ORDER BY
            mmt_wings.wing_id;
        ;`);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Wing ID",
                field: "Wing ID",
                
            },
            {
                headerName: "Wing",
                field: "Wing",
            },
            {
                headerName: "Total No of Post",
                field: "Total No of Post",
            },
            {
                headerName: "Status of Vacant Posts",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "No of Vacancy Filled Up",
                        field: "No of Vacancy Filled Up",
                        width : 350
                    },
                    {
                        headerName: "No of Vacancy In Process",
                        field: "No of Vacancy In Process",
                        width : 350
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function ypDivisionWiseReport (req, res) 
{
    const ypID = req.params.ypID;
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("ypID", ypID);
    request.input("wingID", wingID);

    try 
    {
        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
                mmt_wings.wing_name AS [Wing Name],
                mmt_division.division_id AS [Division ID],
                mmt_division.division_name AS [Division Name],
                SUM(
                    CASE
                        WHEN yp.post_status = 'Filled' THEN 1
                        WHEN yp.post_status = 'Vacant' THEN 1
                        ELSE 0
                    END
                ) AS [Total No of Post],
                SUM(CASE WHEN yp.post_status = 'Filled' THEN 1 ELSE 0 END) AS [No of Vacancy Filled Up],
                SUM(CASE WHEN yp.post_status = 'Vacant' THEN 1 ELSE 0 END) AS [No of Vacancy In Process]
            FROM 
                mmt_division
            LEFT JOIN 
                tbl_young_professional yp ON mmt_division.division_id = yp.division
            LEFT JOIN 
                mmt_wings ON mmt_wings.wing_id = yp.wing
            WHERE 
                mmt_division.wing_id = @wingID
            GROUP BY 
                mmt_wings.wing_name, mmt_division.division_name, mmt_division.division_id
            order BY 
                mmt_division.division_id;
            `);
            const rowData = result.recordset;  
    
            if (rowData.length === 0) {
                return res.status(404).json({ error: 'No data available' });
            }
    
            let columnDefs = [
                {
                    headerName: "S No",
                    field: "S No",
                    cellStyle: {textAlign: 'center'}
                },
                {
                    headerName: "Wing Name",
                    field: "Wing Name",
                    
                },
                {
                    headerName: "Division Name",
                    field: "Division Name",
                },
                {
                    headerName: "Total No of Post",
                    field: "Total No of Post",
                },
                {
                    headerName: "Status of Vacant Posts",
                    headerClass: 'parent-header',
                    children: [
                        {
                            headerName: "No of Vacancy Filled Up",
                            field: "No of Vacancy Filled Up",
                            width : 350
                        },
                        {
                            headerName: "No of Vacancy In Process",
                            field: "No of Vacancy In Process",
                            width : 350
                        }
                    ]
                }
            ];
    
            res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getYpWingWiseCandidate (req, res) 
{
    const ypID = req.params.ypID;
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("ypID", ypID);
    request.input("wingID", wingID);

    try 
    {

        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY name) AS [S No],
                mmt_wings.wing_name As [Wing Name],
                mmt_division.division_name As [Division Name],
                name AS [Name], 
                qualification AS Qualification,
                category AS [Category],
                experience AS [Work Experience (In years)],
                skill AS [Skill Set],
                salary AS [Salary],
                CONVERT(VARCHAR(10), tbl_yp_candidate.date_of_appointment, 103) AS [Appointment Date],
                CONVERT(VARCHAR(10), tbl_young_professional.updated_date, 103) AS [Last Updated Date]
            FROM tbl_yp_candidate
            INNER JOIN tbl_young_professional ON tbl_young_professional.young_professional_id = tbl_yp_candidate.young_professional_id           
            INNER JOIN mmt_wings ON mmt_wings.wing_id = tbl_young_professional.wing
            INNER JOIN mmt_division ON mmt_division.division_id = tbl_young_professional.division
            WHERE (wing = @wingID) 
            ORDER BY name, experience, tbl_yp_candidate.date_of_appointment

            ;`);

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


//No of vacancy process final
async function getYpWingWiseReport(req, res) {
    const ypID = req.params.ypID;
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("ypID", ypID);
    request.input("wingID", wingID);

    try {
        const result = await conn.query(`
            SELECT yp.post_id, w.wing_name, yp.division, yp.post_status, yp.wing, yp.date_of_arise_in_vacancy, yp.date_of_vacancy_advertised, yp.date_of_appointment
            FROM tbl_young_professional yp
            INNER JOIN mmt_wings w ON yp.wing = w.wing_id
            WHERE yp.date_of_arise_in_vacancy IS NOT NULL;
        `);

        const currentDate = new Date();
        const dataWithVacancyAge = result.recordset.map(row => {
            const ariseDate = new Date(row.date_of_arise_in_vacancy);
            const diffTime = currentDate - ariseDate;
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
            const diffMonths = diffDays / 30; // Approximate calculation for months

            let vacancyAgeDescription;
            if (diffMonths > 6) {
                vacancyAgeDescription = 'vacants for more than 6 months';
            } else if (diffMonths > 3) {
                vacancyAgeDescription = 'vacants since 6 months';
            } else {
                vacancyAgeDescription = 'vacants since 3 months';
            }

            // Formatting date_of_arise_in_vacancy as dd/mm/yyyy
            const formattedDateOfArise = ariseDate.getDate().toString().padStart(2, '0') + '/'
                                       + (ariseDate.getMonth() + 1).toString().padStart(2, '0') + '/'
                                       + ariseDate.getFullYear();

            return {
                ...row,
                wingName: row.wing_name,
                postID: row.post_id, 
                vacancyAgeDescription, // Add the calculated description to each row
                formattedDateOfArise // Include the formatted date_of_arise_in_vacancy
            };
        });

        res.json(dataWithVacancyAge);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getYpDivisionWiseCandidate (req, res) 
{
    const ypID = req.params.ypID;
    const divisionID = req.params.divisionID;

    const conn = await pool;
    const request = conn.request();
    request.input("ypID", ypID);
    request.input("divisionID", divisionID);

    try 
    {
        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY name) AS [S No],
                mmt_wings.wing_name AS [Wing Name], 
                mmt_division.division_name AS [Division Name], 
                name, qualification AS [Qualification], 
                category AS [Category], 
                salary AS [Salary], 
                experience AS [Experience], 
                skill AS [Skill],
                CONVERT(VARCHAR(10), tbl_yp_candidate.date_of_appointment, 103) AS [Appointment Date],
                CONVERT(VARCHAR(10), tbl_young_professional.updated_date, 103) AS [Last Updated Date]
            FROM tbl_yp_candidate
                    INNER JOIN tbl_young_professional on tbl_young_professional.young_professional_id = tbl_yp_candidate.young_professional_id           
                    INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_young_professional.wing
                    INNER JOIN mmt_division on mmt_division.division_id = tbl_young_professional.division
                WHERE (division = @divisionID) 
            ORDER BY name, experience

            ;`);
            
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};
export default { getYoungProfessionalReport, ypDivisionWiseReport, getYpWingWiseReport, getYpWingWiseCandidate, getYpDivisionWiseCandidate };