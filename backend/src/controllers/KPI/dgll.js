import { pool } from "../../db.js";
import { checkEdit, refuseEdit, deleteKpiEntry } from "./kpiEditChecks.js";

async function addLightsHouseMaster(req, res) 
{
    const alol = req.body.alol;
    const lightsName = req.body.lightsName;
    const status = req.body.status;
    const dateOfCommissioning = req.body.dateOfCommissioning;
    const state = req.body.state;
    const district = req.body.district;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)

    const conn = await pool;
    const request = conn.request();
    request.input("alol", alol);
    request.input("lightsName", lightsName);
    request.input("status", status);
    request.input("dateOfCommissioning",dateOfCommissioning);
    request.input("state", state);
    request.input("district", district);
    request.input("latitude", latitude);
    request.input("longitude", longitude);
    request.input("userID", userID);

    try {
        // One entry per lighthouse name (QC KPI-13)
        const taken = await request.query(`SELECT COUNT(*) AS count FROM tbl_light_house_master
            WHERE LTRIM(RTRIM(light_house_name)) = LTRIM(RTRIM(@lightsName))`);
        if (taken.recordset[0].count > 0) {
            return res.status(409).json({ message: "A lighthouse with this name is already listed." });
        }

        const result = await request.query(`
            INSERT INTO tbl_light_house_master (alol,light_house_name,light_status,commisioned_date,state_id,district_id,latitude,longitude,created_by,created_date)
            OUTPUT INSERTED.lights_house_id
            VALUES (@alol, @lightsName, @status, @dateOfCommissioning, @state, @district, @latitude, @longitude, @userID, GETDATE())
        `);

        const insertedYPId = result.recordset[0].lights_house_id;
        return res.status(201).json({ insertedYPId });
    } catch (err) {
        console.error("Lighthouse add error:", err);
        return res.sendStatus(500);
    }
} 

async function getLightHouseMaster(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = String(req.query.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';
        const statusValue = status === 'active' ? 1 : 0;

        const FROM_SQL = `
            FROM tbl_light_house_master
            LEFT JOIN mmt_state ON mmt_state.state_id = tbl_light_house_master.state_id
            LEFT JOIN mmt_district ON mmt_district.district_id = tbl_light_house_master.district_id
        `;

        const countsRequest = conn.request();
        const totalRequest = conn.request();
        const pageRequest = conn.request();
        totalRequest.input("statusValue", statusValue);
        pageRequest.input("statusValue", statusValue);
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let searchClause = '';
        if (search) {
            totalRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            searchClause = ` AND (tbl_light_house_master.alol LIKE @search OR tbl_light_house_master.light_house_name LIKE @search OR mmt_state.state_name LIKE @search OR mmt_district.district_name LIKE @search)`;
        }

        const [countsResult, totalResult, pageResult] = await Promise.all([
            countsRequest.query(`
                SELECT
                    SUM(CASE WHEN light_status = 1 THEN 1 ELSE 0 END) AS active_count,
                    SUM(CASE WHEN light_status = 1 THEN 0 ELSE 1 END) AS inactive_count
                FROM tbl_light_house_master
            `),
            totalRequest.query(`SELECT COUNT(*) AS total ${FROM_SQL} WHERE tbl_light_house_master.light_status = @statusValue ${searchClause}`),
            pageRequest.query(`
                SELECT tbl_light_house_master.lights_house_id, tbl_light_house_master.alol, tbl_light_house_master.light_house_name,
                       tbl_light_house_master.light_status, tbl_light_house_master.commisioned_date,
                       tbl_light_house_master.state_id, tbl_light_house_master.district_id,
                       mmt_state.state_name, mmt_district.district_name,
                       tbl_light_house_master.latitude, tbl_light_house_master.longitude,
                       tbl_light_house_master.created_by, tbl_light_house_master.updated_date
                ${FROM_SQL}
                WHERE tbl_light_house_master.light_status = @statusValue ${searchClause}
                ORDER BY tbl_light_house_master.lights_house_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const countsRow = countsResult.recordset?.[0] || {};
        const total = Number(totalResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            counts: {
                active: Number(countsRow.active_count) || 0,
                inactive: Number(countsRow.inactive_count) || 0,
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
    
async function getUpdatelightHouseData(req, res) 
{

    const lightHouseId = req.params.lightHouseId;
    const conn = await pool;
    const request = conn.request();
    request.input("lightHouseId", lightHouseId);

    try {
        const result = await request.query(`
            SELECT 
                *
            FROM 
                tbl_light_house_master
                WHERE lights_house_id  = @lightHouseId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
};

async function updateLightsHousedata(req,res){
    
    const data = req.body;
    
    const alolName = req.body.alolName;
    const lightHouseName = req.body.lightHouseName;
    const status = req.body.status;
    const updateDateOfCommissioning = req.body.updateDateOfCommissioning;
    const updateState = req.body.updateState;
    const updateDistrict  = req.body.updateDistrict ;
    const updateLatitude = req.body.updateLatitude;
    const updateLongitude = req.body.updateLongitude;
    const lightHouseIdIdOrg = req.body.lightHouseIdIdOrg;
    const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)

    const conn = await pool;
    const request = conn.request();
    request.input('alolName', alolName);
    request.input('lightHouseName', lightHouseName);
    request.input('status', status);
    request.input('updateDateOfCommissioning',updateDateOfCommissioning);
    request.input('updateState', updateState);
    request.input('updateDistrict', updateDistrict );
    request.input('updateLatitude', updateLatitude);
    request.input('updateLongitude', updateLongitude);
    request.input("userID", userID);
    request.input("lightHouseIdIdOrg", lightHouseIdIdOrg);

    try {
        // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
        const editCheck = await checkEdit({ table: "tbl_light_house_master", idColumn: "lights_house_id", id: lightHouseIdIdOrg, period: { light_house_name: lightHouseName } });
        if (editCheck) return refuseEdit(res, editCheck);
        const result = await request.query(`UPDATE tbl_light_house_master SET alol = @alolName, light_house_name = @lightHouseName,
        light_status = @status, commisioned_date = @updateDateOfCommissioning,state_id = @updateState, district_id = @updateDistrict ,latitude = @updateLatitude,longitude = @updateLongitude,updated_by = @userID,updated_date = getDate() WHERE lights_house_id  = @lightHouseIdIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteLightHouseMaster(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_light_house_master", idColumn: "lights_house_id", idParam: "lights_house_id", logFolder: "Light_House_Master" });
}

async function addVtmsIntegration(req, res) {
    const { financialYear, vtmsIntegration } = req.body;
    const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);

        const result = await request.query(`
            SELECT COUNT(*) as count FROM tbl_vtms_integration 
            WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.status(409).json({ error: "An entry for this period already exists." });
        } else {
            // If no data exists, proceed with insertion
            request.input("vtmsIntegration", vtmsIntegration);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_vtms_integration (financial_year, no_of_ports_vtms_integrated, created_by, created_date)
                OUTPUT INSERTED.vtms_id
                VALUES (@financialYear, @vtmsIntegration, @userID, GETDATE())
            `);

            res.sendStatus(201);
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "An error occurred while checking the data." });
    }
}

    
async function getVtmsIntegration(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (financial_year LIKE @search OR CAST(no_of_ports_vtms_integrated AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_vtms_integration ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_vtms_integration
                ${whereClause}
                ORDER BY financial_year DESC, vtms_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getUpdateVtmsdata(req, res) 
{

    const VtmsId = req.params.VtmsId;
    const conn = await pool;
    const request = conn.request();
    request.input("VtmsId", VtmsId);

    try {
        const result = await request.query(`
            SELECT 
                *
            FROM 
                tbl_vtms_integration
                WHERE vtms_id  = @VtmsId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
};
    
async function updateVtmsData(req,res){
    
    const data = req.body;
    
    const updatevtmsfinancialYear = req.body.updatevtmsfinancialYear;
    const updateVtmsSystem = req.body.updateVtmsSystem;
    const  VtmsIdOrg  = req.body. VtmsIdOrg ;

    const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)

    const conn = await pool;
    const request = conn.request();
    request.input('updatevtmsfinancialYear', updatevtmsfinancialYear);
    request.input('updateVtmsSystem',updateVtmsSystem);
    request.input("userID", userID);
    request.input("VtmsIdOrg",  VtmsIdOrg );

    

    try {
        // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
        const editCheck = await checkEdit({ table: "tbl_vtms_integration", idColumn: "vtms_id", id: VtmsIdOrg, period: { financial_year: updatevtmsfinancialYear } });
        if (editCheck) return refuseEdit(res, editCheck);
        const result = await request.query(`UPDATE tbl_vtms_integration SET financial_year = @updatevtmsfinancialYear, no_of_ports_vtms_integrated = @updateVtmsSystem,updated_by = @userID,updated_date = getDate() WHERE vtms_id  = @VtmsIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteVtmsIntegration(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_vtms_integration", idColumn: "vtms_id", idParam: "vtms_id", logFolder: "VTMS_Integration" });
}

async function addNaisUptime(req, res) {
    const { financialYear, naisAvailability } = req.body;
    const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);

        // Check if financial year already exists
        const result = await request.query(`
            SELECT COUNT(*) AS count FROM tbl_nais_uptime WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.status(409).json({ error: "An entry for this period already exists." });
        }

        // Proceed with insert if no conflict
        request.input("naisAvailability", naisAvailability);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_nais_uptime (financial_year, availability_of_nais, created_by, created_date)
            OUTPUT INSERTED.nais_id
            VALUES (@financialYear, @naisAvailability, @userID, GETDATE())
        `);

        res.status(201).json({ insertedId: insertResult.recordset[0].nais_id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

    

        async function getnaisList(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (financial_year LIKE @search OR CAST(availability_of_nais AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_nais_uptime ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_nais_uptime
                ${whereClause}
                ORDER BY financial_year DESC, nais_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
        async function getUpdateNaisdata(req, res) 
        {
        
            const NaisId = req.params.NaisId;
            const conn = await pool;
            const request = conn.request();
            request.input("NaisId", NaisId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_nais_uptime
                        WHERE nais_id  = @NaisId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        };
    
        async function updateNaisData(req,res){
        
            const data = req.body;
            
            const updatenaisfinancialYear = req.body.updatenaisfinancialYear;
            const updateNaisUptime = req.body.updateNaisUptime;
            const NaisIdOrg  = req.body.NaisIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatenaisfinancialYear', updatenaisfinancialYear);
            request.input('updateNaisUptime',updateNaisUptime);
            request.input("userID", userID);
            request.input("NaisIdOrg",NaisIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_nais_uptime", idColumn: "nais_id", id: NaisIdOrg, period: { financial_year: updatenaisfinancialYear } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_nais_uptime SET financial_year = @updatenaisfinancialYear, availability_of_nais = @updateNaisUptime,updated_by = @userID,updated_date = getDate() WHERE nais_id  = @NaisIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        async function deleteNaisUptime(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_nais_uptime", idColumn: "nais_id", idParam: "nais_id", logFolder: "NAIS_Uptime" });
}
        
        async function addNAISIntegration(req, res) {
            const { financialYear, NAISintegration, NAISupgraded } = req.body;
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
            try {
                const conn = await pool;
                const request = conn.request();
                request.input("financialYear", financialYear);
        
                // Check if the financial year already exists
                const result = await request.query(`
                    SELECT COUNT(*) AS count FROM tbl_nais_integration WHERE financial_year = @financialYear
                `);
        
                if (result.recordset[0].count > 0) {
                    return res.status(409).json({ error: "An entry for this period already exists." });
                }
        
                // Proceed with insert if no conflict
                request.input("NAISintegration", NAISintegration);
                request.input("NAISupgraded", NAISupgraded);
                request.input("userID", userID);
        
                const insertResult = await request.query(`
                    INSERT INTO tbl_nais_integration (financial_year, nais_integrated_with_nmda, no_of_nais_upgraded, created_by, created_date)
                    OUTPUT INSERTED.nais_integration_id
                    VALUES (@financialYear, @NAISintegration, @NAISupgraded, @userID, GETDATE())
                `);
        
                res.status(201).json({ insertedId: insertResult.recordset[0].nais_integration_id });
        
            } catch (error) {
                console.error("Error in addNAISIntegration:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        }
        
            
        async function getnaisIntegrationList(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (financial_year LIKE @search OR CAST(nais_integrated_with_nmda AS VARCHAR(50)) LIKE @search OR CAST(no_of_nais_upgraded AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_nais_integration ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_nais_integration
                ${whereClause}
                ORDER BY financial_year DESC, nais_integration_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

        async function getUpdateNaisIntegrationdata(req, res) 
        {
        
            const NaisIntegrationId = req.params.NaisIntegrationId;
            const conn = await pool;
            const request = conn.request();
            request.input("NaisIntegrationId", NaisIntegrationId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_nais_integration
                        WHERE nais_integration_id  = @NaisIntegrationId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        
        async function updateNaisIntegrationData(req,res){
        
            const data = req.body;
            
            const updateFinancialYear = req.body.updateFinancialYear;
            const updateNAISintegrationdata = req.body.updateNAISintegrationdata;
            const updateNAISystem = req.body.updateNAISystem;
            const NaisIntegrationIdOrg  = req.body.NaisIntegrationIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updateFinancialYear', updateFinancialYear);
            request.input('updateNAISintegrationdata',updateNAISintegrationdata);
            request.input('updateNAISystem',updateNAISystem);
            request.input("userID", userID);
            request.input("NaisIntegrationIdOrg",NaisIntegrationIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_nais_integration", idColumn: "nais_integration_id", id: NaisIntegrationIdOrg, period: { financial_year: updateFinancialYear } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query('UPDATE tbl_nais_integration SET financial_year = @updateFinancialYear, nais_integrated_with_nmda = @updateNAISintegrationdata,no_of_nais_upgraded = @updateNAISystem,updated_by = @userID,updated_date = getDate() WHERE nais_integration_id  = @NaisIntegrationIdOrg');
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        async function deleteNaisIntegration(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_nais_integration", idColumn: "nais_integration_id", idParam: "nais_integration_id", logFolder: "NAIS_Integration" });
}

        async function addTouristDestinations(req, res) {
            const { financialYears, lighthouseDeveloped, annualTourist } = req.body;
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
            const conn = await pool;
            const request = conn.request();
            
            try {
                request.input("financialYears", financialYears);

                const result = await request.query(`
                    SELECT COUNT(*) AS count FROM tbl_kpi_dgll_3_5_1 WHERE finacial_year = @financialYears
                `);
                
                request.input("lighthouseDeveloped", lighthouseDeveloped);
                request.input('annualTourist', annualTourist);
                request.input("userID", userID);

                const insertResult = await request.query (`
                    INSERT INTO tbl_kpi_dgll_3_5_1 (finacial_year, no_lighthouses_developed_tourist_destination, annual_tourist_footfall, created_by, created_date)
                    OUTPUT INSERTED.tourist_destination_id
                    VALUES (@financialYears, @lighthouseDeveloped, @annualTourist, @userID, GETDATE())
                    `);
                    res.status(201).json({insertedID: insertResult.recordset[0].tourist_destination_id})
            
        } catch (error){
                res.status(500).json({ error: "Internal server error" });
            }
        }

       async function getTouristDestinations(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (finacial_year LIKE @search OR CAST(no_lighthouses_developed_tourist_destination AS VARCHAR(50)) LIKE @search OR CAST(annual_tourist_footfall AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND finacial_year = @financialYear` : 'WHERE finacial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_kpi_dgll_3_5_1 ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_kpi_dgll_3_5_1
                ${whereClause}
                ORDER BY finacial_year DESC, tourist_destination_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

       async function addTargetDetails(req, res) {
        
        const data = req.body;
        
        const { year, collectionLightDue, footFallLighthouse } = req.body;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        const conn = await pool;
        const request = conn.request();

        try {
            request.input("year", year);
            
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_kpi_dgll_3_5_2 WHERE year = @year
            `);
                
            if (result.recordset[0].count > 0) {
              return res.status(409).json({ error: "An entry for this period already exists." });
            }
            else{
            request.input("collectionLightDue", collectionLightDue);
            request.input('footFallLighthouse', footFallLighthouse);
            request.input("userID", userID);

            const insertresult = await request.query (`
                INSERT INTO tbl_kpi_dgll_3_5_2 (year, collection_of_light_dues, footfall_in_the_lighthouses, created_by, created_date)
                OUTPUT INSERTED.tourist_destination_target_id
                VALUES (@year, @collectionLightDue, @footFallLighthouse, @userID, GETDATE())
                `);
                res.status(201).json({insertedID: insertresult.recordset[0].tourist_destination_id})
        } 
    } catch (error){
            res.status(500).json({ error: "Internal server error" });
            console.error("err", error);
        }

       }

       async function getTargetDetails(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (year LIKE @search OR CAST(collection_of_light_dues AS VARCHAR(50)) LIKE @search OR CAST(footfall_in_the_lighthouses AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND year = @financialYear` : 'WHERE year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_kpi_dgll_3_5_2 ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_kpi_dgll_3_5_2
                ${whereClause}
                ORDER BY year DESC, tourist_destination_target_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

       async function getByIdTouristDestinations(req, res) {
        
        const TouristDestinationsId = req.params.TouristDestinationsId
        const conn = await pool;
        const request = conn.request();
        request.input("TouristDestinationsId",  TouristDestinationsId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_kpi_dgll_3_5_1
                    WHERE tourist_destination_id  = @TouristDestinationsId ORDER BY finacial_year ASC
            `);
                
            res.json(result.recordset);
        } catch (err) {
            console.error(err);
            return res.status(500);
        }
       }

       async function UpdateTouristDestinations(req, res) {

        const { updateFinancialYears, updateLighthouseDeveloped, updateAnnualTourist, TouristDestinationsRowId } = req.body;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)

        const conn = await pool;
        const request = conn.request();

        request.input('TouristDestinationsRowId',TouristDestinationsRowId);
        request.input("updateFinancialYears", updateFinancialYears);
        request.input("updateLighthouseDeveloped", updateLighthouseDeveloped);
        request.input("updateAnnualTourist", updateAnnualTourist);
        request.input("userID", userID);

        try{
            // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
            const editCheck = await checkEdit({ table: "tbl_kpi_dgll_3_5_1", idColumn: "tourist_destination_id", id: TouristDestinationsRowId, period: { finacial_year: updateFinancialYears } });
            if (editCheck) return refuseEdit(res, editCheck);
            const result = await request.query('UPDATE tbl_kpi_dgll_3_5_1 SET finacial_year = @updateFinancialYears, no_lighthouses_developed_tourist_destination = @updateLighthouseDeveloped, annual_tourist_footfall = @updateAnnualTourist, updated_by = @userID, updated_date = getDate() WHERE tourist_destination_id  = @TouristDestinationsRowId');
            return res.status(200).json({ message: "Updated successfully" });
        } catch(err) {
            console.error(err);
                return res.status(500);
        }
       }

       async function getByIdTargetDestinations(req, res) {
        
        const TouristDestinationsId = req.params.TouristDestinationsId;
        const conn = await pool;
        const request = conn.request();
        request.input("TouristDestinationsId",  TouristDestinationsId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_kpi_dgll_3_5_2
                    WHERE tourist_destination_target_id  = @TouristDestinationsId ORDER BY year ASC
            `);
                
            res.json(result.recordset);
        } catch (err) {
            console.error(err);
            return res.status(500);
        }
       }

       async function updateTargetDestinationData(req, res) {
        
        const { TouristDestinationsRowId, updateYear, updateCollectionLightDue, updateFootFallLighthouse } = req.body;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        

        const conn = await pool;
        const request = conn.request();

        request.input('TouristDestinationsRowId',TouristDestinationsRowId);
        request.input("updateYear", updateYear);
        request.input("updateCollectionLightDue", updateCollectionLightDue);
        request.input("updateFootFallLighthouse", updateFootFallLighthouse);
        request.input("userID", userID);

        try{
            // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
            const editCheck = await checkEdit({ table: "tbl_kpi_dgll_3_5_2", idColumn: "tourist_destination_target_id", id: TouristDestinationsRowId, period: { year: updateYear } });
            if (editCheck) return refuseEdit(res, editCheck);
            const result = await request.query('UPDATE tbl_kpi_dgll_3_5_2 SET year = @updateYear, collection_of_light_dues = @updateCollectionLightDue, footfall_in_the_lighthouses = @updateFootFallLighthouse, updated_by = @userID, updated_date = getDate() WHERE tourist_destination_target_id  = @TouristDestinationsRowId');
            return res.status(200).json({message: "Updated successfully"});
               
        } catch(err) {
            console.error(err);
                return res.status(500);
        }
       }

       async function deleteTouristDestination(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_kpi_dgll_3_5_1", idColumn: "tourist_destination_id", idParam: "tourist_destination_id", logFolder: "Tourist_Destinations" });
}

       async function deleteTargetDetail(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_kpi_dgll_3_5_2", idColumn: "tourist_destination_target_id", idParam: "tourist_destination_target_id", logFolder: "Target_Details" });
}

       async function checkFinancialYear(req, res) {
        const financialYears = req.params.financialYears;
        const conn = await pool;
        const request = conn.request();
        request.input("financialYears", financialYears);

        try {
            const result = await request.query(`
                SELECT COUNT(*) as count
                FROM tbl_kpi_dgll_3_5_1 
                WHERE finacial_year = @financialYears 
            `);
        
            // Whether an entry for that year exists (QC KPI-12: was 205 / 200)
            res.json({ exists: result.recordset[0].count > 0 });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "An error occurred while checking the data."});
        }
        
       }

    
async function submitFinancialPerformance(req,res) {
   
        const { financialId, financialYear, lightDuesCollect, revenueFromTourism, subsidesFromGovt, operatingCoasts, capitalExpenditure, tourismDevelopmentCosts } = req.body;
        // A new entry belongs to the signed-in user's organisation; an edit keeps the saved one (QC KPI-02)
        const organisationID = req.user.organisationId ?? null;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
      
        const conn = await pool;
        const existingRequest = conn.request();

        const checkFinancialYear = `SELECT * FROM tbl_dgll_k_3_6 WHERE financialyear = @financialYear`
        existingRequest.input("financialYear",financialYear);

        try {

        const checkResult = await existingRequest.query(checkFinancialYear);

        if(checkResult.recordset.length !==0){
            const updateQuery = `
            UPDATE tbl_dgll_k_3_6 SET 
            revenue_light_dues_collection = @lightDuesCollect,
            revenue_from_tourism = @revenueFromTourism,
            subsidies_from_govt = @subsidesFromGovt,
            operating_costs = @operatingCoasts,
            capital_expenditure = @capitalExpenditure,
            tourism_develop_cost = @tourismDevelopmentCosts,
            updated_date = GETDATE(),
            updated_by = @userID
        WHERE financialyear = @financialYear
            `;
            await existingRequest
            .input("lightDuesCollect",lightDuesCollect)
            .input("revenueFromTourism",revenueFromTourism)
            .input("subsidesFromGovt",subsidesFromGovt)
            .input("operatingCoasts",operatingCoasts)
            .input("capitalExpenditure",capitalExpenditure)
            .input("tourismDevelopmentCosts",tourismDevelopmentCosts)
            .input("userID", userID)
            .query(updateQuery);
            res.status(201).json({ message: "Updated successfully" });
        }else{

            const insertQuery = `
                INSERT INTO tbl_dgll_k_3_6 (financialyear,revenue_light_dues_collection,revenue_from_tourism,subsidies_from_govt,operating_costs,capital_expenditure,tourism_develop_cost,created_by,created_date,organisation_id,organisation_name)
                OUTPUT INSERTED.financial_id
                VALUES (@financialYear, @lightDuesCollect, @revenueFromTourism, @subsidesFromGovt, @operatingCoasts, @capitalExpenditure, @tourismDevelopmentCosts, @userID,GETDATE(),@organisationID,@organisationName)
            `;

            const insertRequest = conn.request();
            const orgName = organisationID ? (await conn.request().input("orgId", organisationID)
                .query("SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @orgId")).recordset[0]?.organisation_name ?? null : null;
            insertRequest.input("financialYear", financialYear);
            insertRequest.input("lightDuesCollect", lightDuesCollect);
            insertRequest.input("revenueFromTourism", revenueFromTourism);
            insertRequest.input("subsidesFromGovt", subsidesFromGovt);
            insertRequest.input("operatingCoasts", operatingCoasts);
            insertRequest.input("capitalExpenditure", capitalExpenditure);
            insertRequest.input("tourismDevelopmentCosts", tourismDevelopmentCosts);
            insertRequest.input("organisationID",organisationID);
            insertRequest.input("organisationName", orgName);
            insertRequest.input("userID", userID);

            const result = await insertRequest.query(insertQuery);
            return res.status(201).json({ message: "Data successfully submitted", insertedId: result.recordset[0].financial_id });   
        }
     } catch (error) {
            console.error("error:", error);
            return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getFinancialPerfomanceData(req, res) {
    try {
        const conn = await pool;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();

        const countRequest = conn.request();
        const pageRequest = conn.request();
        pageRequest.input("offset", offset);
        pageRequest.input("limit", limit);

        let whereClause = '';
        if (search) {
            countRequest.input("search", `%${search}%`);
            pageRequest.input("search", `%${search}%`);
            whereClause = 'WHERE (organisation_name LIKE @search OR financialyear LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financialyear = @financialYear` : 'WHERE financialyear = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_dgll_k_3_6 ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_dgll_k_3_6
                ${whereClause}
                ORDER BY financialyear DESC, financial_id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `),
        ]);

        const total = Number(countResult.recordset?.[0]?.total) || 0;
        res.json({
            data: pageResult.recordset || [],
            pagination: {
                total,
                page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getFinancialPerformanceDataByID(req,res) {

    const financialId = req.params.financialId;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input('financialId', financialId);
    
        const result = await request.query(`SELECT * FROM tbl_dgll_k_3_6 WHERE financial_id = @financialId`);
    
        res.json(result.recordset);
        } catch (error) {
            console.error("error", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
}

async function deleteFinancialPerformance(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_dgll_k_3_6", idColumn: "financial_id", idParam: "financial_id", logFolder: "Financial_Performance" });
}

export default {addLightsHouseMaster,getLightHouseMaster,getUpdatelightHouseData,updateLightsHousedata,deleteLightHouseMaster,
    addVtmsIntegration,getVtmsIntegration,getUpdateVtmsdata,updateVtmsData,deleteVtmsIntegration,
    addNaisUptime,getnaisList,getUpdateNaisdata,updateNaisData,deleteNaisUptime,addNAISIntegration,getnaisIntegrationList,
    getUpdateNaisIntegrationdata, updateNaisIntegrationData, deleteNaisIntegration, addTouristDestinations, getTouristDestinations, addTargetDetails, 
    getTargetDetails, getByIdTouristDestinations, UpdateTouristDestinations,getByIdTargetDestinations, updateTargetDestinationData, 
    deleteTouristDestination, deleteTargetDetail,
    checkFinancialYear, submitFinancialPerformance,getFinancialPerfomanceData,getFinancialPerformanceDataByID,deleteFinancialPerformance
};