

import { pool } from "../../db.js";
import { getDataScope } from "../../middleware/dataScope.js";
import { isSuperAdminUser } from "../../middleware/userAdmin.js";
import sql from 'mssql';

async function getLumpSumProjectList(req, res) {
    try {
        const {
    organisationId,
    isWide,
    isOrganisation
} = getDataScope(req.user);

// Ministry / Master users see all eligible projects.
// Organisation users see only their organisation's projects.
if (
    !isWide &&
    (
        !isOrganisation ||
        !Number.isFinite(organisationId) ||
        organisationId <= 0
    )
) {
    return res.json([]);
}

        const conn = await pool;
        const request = conn.request();

        if (!isWide) {
    request.input(
        'organisationID',
        sql.Int,
        organisationId
    );
}

//         console.log("LumpSum Project Scope:", {
//     organisationId: scope.organisationId,
//     denied: scope.denied
// });
       const result = await request.query(`
    SELECT
        p.project_id,
        p.project_name
    FROM tbl_project p
    WHERE
        p.on_sub_project_available = 0
        AND p.status = 1
        AND ISNULL(p.project_stage_id, 0) != 14
        ${isWide ? '' : 'AND p.organisation_id = @organisationID'}

    UNION

    SELECT DISTINCT
        p.project_id,
        p.project_name
    FROM tbl_project p
    INNER JOIN tbl_sub_project sp
        ON sp.project_id = p.project_id
    WHERE
        p.on_sub_project_available = 1
        AND ISNULL(sp.sub_status, 1) = 1
        AND ISNULL(sp.sub_project_stage_id, 0) != 14
        ${isWide ? '' : 'AND sp.sub_organisation_id = @organisationID'}

    ORDER BY project_id DESC;
`);

      const rows = (result.recordset || []).map(row => ({
    value: row.project_id,
    projectName: row.project_name,
    label: `${row.project_id} - ${row.project_name}`
}));

return res.json(rows);
    }
    // catch (err) {
    //     console.error("Error in getLumpSumProjectList:", err);
    //     return res.status(500).json({
    //         message: "Unable to load LumpSum project list"
    //     });
    // }
    catch (err) {
    console.error("Error in getLumpSumProjectList:", {
        message: err.message,
        code: err.code,
        number: err.number,
        state: err.state,
        lineNumber: err.lineNumber,
        stack: err.stack
    });

    return res.status(500).json({
        message: "Unable to load LumpSum project list",
        error: err.message
    });
}
}

async function createLumpSumData(req, res) {
    try {
        console.log("========== LUMPSUM API ==========");
        console.log("Request Body:", JSON.stringify(req.body, null, 2));
        console.log("Authenticated User:", req.user);

        const conn = await pool;

        // const projectID = req.body.projectID;
        const projectID = String(req.body.projectID || '').trim();
        if (!projectID) {
    return res.status(400).json({
        success: false,
        message: "Project ID is required."
    });
}

        const userID =
            req.user?.userID ??
            req.user?.userId ??
            req.user?.id;

        const lumpSumDataTab = req.body.lumpSumDataTab;

        if (!projectID) {
            return res.status(400).json({
                success: false,
                error: "PROJECT_ID_MISSING",
                message: "Project ID is required.",
                received: req.body.projectID
            });
        }

        if (!userID) {
            return res.status(401).json({
                success: false,
                error: "USER_ID_MISSING",
                message: "User ID not found."
            });
        }

        if (!Array.isArray(lumpSumDataTab)) {
            return res.status(400).json({
                success: false,
                error: "INVALID_ACTIVITY_DATA",
                message: "lumpSumDataTab must be an array.",
                received: lumpSumDataTab
            });
        }

        if (lumpSumDataTab.length === 0) {
            return res.status(400).json({
                success: false,
                error: "EMPTY_ACTIVITY_DATA",
                message: "At least one activity is required."
            });
        }

        for (let p = 0; p < lumpSumDataTab.length; p++) {
            const row = lumpSumDataTab[p];

            console.log(`Activity Row ${p + 1}:`, row);

            if (!row.projectName?.trim()) {
                return res.status(400).json({
                    message: `Project name missing at row ${p + 1}`
                });
            }

            if (!row.activityName?.trim()) {
                return res.status(400).json({
                    message: `Activity name missing at row ${p + 1}`
                });
            }

            if (
                row.activityCost === undefined ||
                row.activityCost === null ||
                row.activityCost === "" ||
                !Number.isFinite(Number(row.activityCost)) ||
                Number(row.activityCost) <= 0
            ) {
                return res.status(400).json({
                    message: `Invalid activity cost at row ${p + 1}`,
                    received: row.activityCost
                });
            }

            if (!row.activityDate) {
                return res.status(400).json({
                    message: `Activity date missing at row ${p + 1}`
                });
            }

            const request = conn.request();

            request.input("projectID", projectID);
            request.input("userID", userID);
            request.input("projectName", row.projectName);
            request.input("activityName", row.activityName);
            request.input("activityCost", Number(row.activityCost));
            request.input("activityDate", row.activityDate);

            await request.query(`
                INSERT INTO tbl_lump_sum
                (
                    project_id,
                    project_name,
                    activity_name,
                    activity_cost,
                    activity_date,
                    created_by
                )
                VALUES
                (
                    @projectID,
                    @projectName,
                    @activityName,
                    @activityCost,
                    @activityDate,
                    @userID
                )
            `);
        }

        return res.status(201).json({
            success: true,
            message: "LumpSum added successfully."
        });

    } catch (err) {
        console.error("LumpSum Insert Error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

// async function createLumpSumData(req, res) 
// {
//     const projectID = req.body.projectID;
//     const userID = req.body.userID;
//     const lumpSumDataTab = JSON.parse(req.body.lumpSumDataTab);

//     const conn = await pool;

//     try {
//         for (let p = 0; p < lumpSumDataTab.length; p++) {
//             let projectName = lumpSumDataTab[p].projectName
//             let activityName = lumpSumDataTab[p].activityName
//             let activityCost = lumpSumDataTab[p].activityCost
//             let activityDate = lumpSumDataTab[p].activityDate

//             const request = conn.request();

//             request.input("projectID", projectID);
//             request.input("userID", userID);            
//             request.input("projectName", projectName);
//             request.input("activityName", activityName);
//             request.input("activityCost", activityCost);
//             request.input("activityDate", activityDate);

//             const query = ` INSERT INTO tbl_lump_sum ( project_id, project_name, activity_name, activity_cost, activity_date, created_by) 
//                     VALUES ( @projectID, @projectName, @activityName, @activityCost, @activityDate, @userID) `;

//             const result = await request.query(query);
//         }
//         res.sendStatus(201);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

// Organisation users only see lumpsum of their own organisation's projects (QC PRJ-BE-08),
// using the same rule as getLumpSumProjectList; Ministry / Master users and the superadmin see all.
// Returns { denied } when the user has no usable scope, else the SQL filter to add.
function lumpSumScope(user, request) {
    if (isSuperAdminUser(user)) return { denied: false, whereSql: '' };
    const { organisationId, isWide, isOrganisation } = getDataScope(user || {});
    if (isWide) return { denied: false, whereSql: '' };
    if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) {
        return { denied: true, whereSql: '' };
    }
    request.input('scopeOrganisationID', sql.Int, organisationId);
    return {
        denied: false,
        whereSql: ` AND project_id IN (
            SELECT p.project_id FROM tbl_project p WHERE p.organisation_id = @scopeOrganisationID
            UNION
            SELECT sp.project_id FROM tbl_sub_project sp WHERE sp.sub_organisation_id = @scopeOrganisationID
        )`,
    };
}

async function getLumpSumList(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const scope = lumpSumScope(req.user, request);
        if (scope.denied) return res.json([]);

        const result = await request.query(`
            SELECT
                MAX(updated_date) AS updated_date,
                project_id,
                project_name,
                SUM(activity_cost) AS activity_cost
            FROM tbl_lump_sum
            WHERE 1 = 1 ${scope.whereSql}
            GROUP BY project_id, project_name
            ORDER BY project_id;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getLumpSumData(req, res) {
  try {
    const projectID = req.params.projectID;

    const conn = await pool;

    const request = conn.request();
    const scope = lumpSumScope(req.user, request);
    if (scope.denied) return res.json([]);

    request.input('projectID', projectID);

    const result = await request.query(`
      SELECT
        lumpsum_activity_id,
        project_id,
        project_name,
        activity_name,
        activity_cost,
        activity_date
      FROM tbl_lump_sum
      WHERE project_id = @projectID ${scope.whereSql}
      ORDER BY lumpsum_activity_id ASC
    `);

    return res.json(result.recordset);

  } catch (err) {
    console.error('Get LumpSum Data Error:', err);
    return res.sendStatus(500);
  }
}

async function editLumpSumData(req, res) {
  try {
    const projectID = req.body.projectID;
    const userID = req.body.userID;

    const lumpSumDataTab =
      typeof req.body.lumpSumDataTab === 'string'
        ? JSON.parse(req.body.lumpSumDataTab)
        : req.body.lumpSumDataTab;

    if (!projectID || !Array.isArray(lumpSumDataTab)) {
      return res.status(400).json({
        message: 'Invalid LumpSum data.'
      });
    }

    // Same row checks as createLumpSumData (QC PRJ-BE-07)
    for (let p = 0; p < lumpSumDataTab.length; p++) {
      const row = lumpSumDataTab[p] || {};
      if (!String(row.projectName ?? '').trim()) {
        return res.status(400).json({ message: `Project name missing at row ${p + 1}` });
      }
      if (!String(row.activityName ?? '').trim()) {
        return res.status(400).json({ message: `Activity name missing at row ${p + 1}` });
      }
      const cost = Number(row.activityCost);
      if (row.activityCost === undefined || row.activityCost === null || row.activityCost === ''
        || !Number.isFinite(cost) || cost <= 0) {
        return res.status(400).json({ message: `Invalid activity cost at row ${p + 1}` });
      }
      if (!row.activityDate) {
        return res.status(400).json({ message: `Activity date missing at row ${p + 1}` });
      }
    }

    const conn = await pool;

    for (const item of lumpSumDataTab) {
        if (item.lumpsumId) {
            // Existing activity - UPDATE
            await conn.request()
            .input('projectID', sql.NVarChar, projectID)
            .input('lumpsumId', sql.Int, item.lumpsumId)
            .input('projectName', sql.NVarChar, item.projectName)
            .input('activityName', sql.NVarChar, item.activityName)
            .input('activityCost', sql.Decimal(18, 2), item.activityCost)
            .input('activityDate', sql.Date, item.activityDate)
            .input('userID', sql.Int, userID)
            .query(`
                UPDATE dbo.tbl_lump_sum
                SET
                project_name = @projectName,
                activity_name = @activityName,
                activity_cost = @activityCost,
                activity_date = @activityDate,
                updated_date = GETDATE(),
                updated_by = @userID
                WHERE project_id = @projectID
                AND lumpsum_activity_id = @lumpsumId
            `);
        } else {
            // New activity - INSERT
            await conn.request()
            .input('projectID', sql.NVarChar, projectID)
            .input('projectName', sql.NVarChar, item.projectName)
            .input('activityName', sql.NVarChar, item.activityName)
            .input('activityCost', sql.Decimal(18, 2), item.activityCost)
            .input('activityDate', sql.Date, item.activityDate)
            .input('userID', sql.Int, userID)
            .query(`
                INSERT INTO dbo.tbl_lump_sum
                (
                project_id,
                project_name,
                activity_name,
                activity_cost,
                activity_date,
                created_date,
                created_by
                )
                VALUES
                (
                @projectID,
                @projectName,
                @activityName,
                @activityCost,
                @activityDate,
                GETDATE(),
                @userID
                )
            `);
        }
        }

    return res.status(200).json({
      success: true,
      message: 'LumpSum details updated successfully.'
    });

  } catch (err) {
    console.error('Edit LumpSum Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to update LumpSum details.',
      error: err.message
    });
  }
}


// async function editLumpSumData(req, res) 
// {
//     const projectID = req.body.projectID;
//     const userID = req.body.userID;

//     const lumpSumDataTab = JSON.parse(req.body.lumpSumDataTab);

//     const conn = await pool;

//     try {
//         for (let p = 0; p < lumpSumDataTab.length; p++) {
//             let lumpsumId = lumpSumDataTab[p].lumpsumId
//             let projectName = lumpSumDataTab[p].projectName
//             let activityName = lumpSumDataTab[p].activityName
//             let activityCost = lumpSumDataTab[p].activityCost
//             let activityDate = lumpSumDataTab[p].activityDate


//             const request = conn.request();

//             request.input("lumpsumId", lumpsumId);
//             request.input("projectID", projectID);
//             request.input("userID", userID);            
//             request.input("projectName", projectName);
//             request.input("activityName", activityName);
//             request.input("activityCost", activityCost);
//             request.input("activityDate", activityDate);

//             if (lumpsumId) {
//                 // If lumpsumId exists, we perform an UPDATE operation
//                 const query = `UPDATE tbl_lump_sum 
//                                 SET activity_name = @activityName, activity_cost = @activityCost, activity_date = @activityDate,
//                                 updated_date = getDate(), updated_by = @userID  
//                                 WHERE project_id = @projectID AND lumpsum_activity_id = @lumpsumId`;

//                 await request.query(query);
//             } else {
//                 // If lumpsumId doesn't exist, we perform an INSERT operation
//                 const query = `INSERT INTO tbl_lump_sum (project_id, project_name, activity_name, activity_cost, activity_date, created_by) 
//                                VALUES (@projectID, @projectName, @activityName, @activityCost, @activityDate, @userID)`;

//                 await request.query(query);
//             }
//         }
//         res.sendStatus(200);

//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

async function deleteLumpSumData(req, res) {
  try {
    const lumpsumId = Number(req.params.lumpsumId);
console.log(lumpsumId, "FDGDF")
    if (!Number.isInteger(lumpsumId) || lumpsumId <= 0) {
      return res.status(400).json({
        message: "Invalid LumpSum activity ID.",
      });
    }

    const conn = await pool;

    const result = await conn
      .request()
      .input("lumpsumId", sql.Int, lumpsumId)
      .query(`
        DELETE FROM tbl_lump_sum
        WHERE lumpsum_activity_id = @lumpsumId
      `);

    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({
        message: "LumpSum activity not found.",
      });
    }

    return res.status(200).json({
      message: "LumpSum activity deleted successfully.",
    });
  } catch (err) {
    console.error("Delete LumpSum activity error:", err);

    return res.status(500).json({
      message: "Failed to delete LumpSum activity.",
    });
  }
}


// async function deleteLumpSumData(req, res) 
// {
//     const lumpsumId = req.params.lumpsumId;

//     const conn = await pool;
//     const request = conn.request();

//     request.input("lumpsumId", lumpsumId);
//     console.log(lumpsumId)

//     try {
//         const query = `DELETE tbl_lump_sum WHERE lumpsum_activity_id = @lumpsumId`;

//         await request.query(query);
//         res.sendStatus(200);

//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };


// --------------------------------------------------------------------------------------------------------------------------

async function getActivityNameData(req, res) {
    const projectID = req.params.projectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`SELECT * FROM tbl_lump_sum
            WHERE project_id = @projectID 
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function createLumpSumActivityData(req, res) {
    const projectID = req.body.projectID; // Project ID
    const lumpSumActivityTab = JSON.parse(req.body.lumpSumActivityTab); // Array of activity data

    const conn = await pool;
    // console.log(projectID, lumpSumDataTab)

    try {
        for (let p = 0; p < lumpSumActivityTab.length; p++) {
            let subProjectId = lumpSumActivityTab[p].subProjectId;  // Sub-project ID
            let subProjectName = lumpSumActivityTab[p].subProjectName;  // Sub-project Name
            let subSantionedDate = lumpSumActivityTab[p].subSantionedDate;  // Sub-sanctioned Date
            let activityId = lumpSumActivityTab[p].activityId;  // Activity ID
            let activityCost = lumpSumActivityTab[p].activityCost;  // Activity Cost
            let subProjectLumpsumID = lumpSumActivityTab[p].subProjectLumpsumID;  // Activity Cost


            // If subSantionedDate is an empty string or invalid, set it to null
            if (!subSantionedDate || subSantionedDate === "") {
                subSantionedDate = null;
            }
            // console.log(subSantionedDate, "subSantionedDate")

            // Create a new request object for each activity data
            const request = conn.request();

            // Add inputs for SQL query
            request.input("projectID", projectID);
            request.input("subProjectId", subProjectId);
            request.input("subProjectName", subProjectName);
            request.input("subSantionedDate", subSantionedDate);
            request.input("activityId", activityId);
            request.input("activityCost", activityCost);
            request.input("subProjectLumpsumID", subProjectLumpsumID);

            console.log(subProjectLumpsumID, "subProjectLumpsumID")
            if(subProjectLumpsumID)
            {
                console.log( "update")
                const query = ` UPDATE tbl_lumpsum_activity
                    SET 
                        lumpsum_activity_cost = @activityCost
                    WHERE 
                        sub_project_lumpsum_id = @subProjectLumpsumID
                   
                `;

                const result = await request.query(query);
                
            }
            else
            {
                if (activityId && activityCost) 
                {
                    console.log( "activityCostactivityCost", "insert")
                    const query = `INSERT INTO tbl_lumpsum_activity (project_id, sub_project_id, sub_project_name, sub_santioned_date,
                    lumpsum_activity_id, lumpsum_activity_cost)
                    VALUES (@projectID, @subProjectId, @subProjectName, @subSantionedDate, @activityId, @activityCost) `;
    
                    const result = await request.query(query);
                }

            }
          

        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};



async function getSubProActivityData(req, res) 
{
    const projectID = req.params.projectID;
    console.log(projectID, "projectID")

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    // `SELECT * FROM tbl_lumpsum_activity
    //         WHERE project_id = @projectID  

    

    try {
        const result = await request.query(`
            
        SELECT 
            lsa.sub_project_lumpsum_id,
            lsa.lumpsum_activity_id,
            lsa.project_id,
            lsa.sub_project_id,
            lsa.sub_project_name,
            lsa.sub_santioned_date,
            lsa.lumpsum_activity_cost,
            ls.project_name,
            ls.activity_name,
            ls.activity_cost
        FROM tbl_lumpsum_activity lsa
        LEFT JOIN tbl_lump_sum ls
            ON lsa.lumpsum_activity_id = ls.lumpsum_activity_id
            --AND lsa.project_id = ls.project_id

            
         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};




export default { getLumpSumProjectList, createLumpSumData, getLumpSumList, getLumpSumData, editLumpSumData, deleteLumpSumData, getActivityNameData, 
    createLumpSumActivityData, getSubProActivityData };