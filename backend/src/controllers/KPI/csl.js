import { pool } from "../../db.js";
import { checkEdit, refuseEdit, deleteKpiEntry } from "./kpiEditChecks.js";




    async function addVesselsBuilt(req, res) {
        const { financialYear, vesselsBuilt, tonnageVessels, valueofVessels } = req.body;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)

        const conn = await pool;

        try {
            const request = conn.request();
            request.input("financialYear", financialYear);
            
            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_csl_vessels_built WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(409).json({ error: "An entry for this period already exists." });
            }

            // If no duplicate, proceed with insert
            request.input("vesselsBuilt", vesselsBuilt);
            request.input("tonnageVessels", tonnageVessels);
            request.input("valueofVessels", valueofVessels);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_csl_vessels_built (financial_year, no_of_vessels_built, tonnage_of_vessels_built, value_of_vessels_built, created_by, created_date)
                OUTPUT INSERTED.csl_vessel_id
                VALUES (@financialYear, @vesselsBuilt, @tonnageVessels, @valueofVessels, @userID, GETDATE())
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].csl_vessel_id });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

            
    async function getVesselBuiltList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR CAST(no_of_vessels_built AS VARCHAR(50)) LIKE @search OR CAST(tonnage_of_vessels_built AS VARCHAR(50)) LIKE @search OR CAST(value_of_vessels_built AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_vessels_built ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_vessels_built
                ${whereClause}
                ORDER BY financial_year DESC, csl_vessel_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

    async function getUpdateVesselBuiltdata(req, res) 
    {

        const CslVesselId = req.params.CslVesselId;
        const conn = await pool;
        const request = conn.request();
        request.input("CslVesselId", CslVesselId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_csl_vessels_built
                    WHERE csl_vessel_id  = @CslVesselId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        }
    async function updatecslVesselBuiltData(req,res){

        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updatenoofVesselsBuilt = req.body.updatenoofVesselsBuilt;
        const updateTonnageVessels = req.body.updateTonnageVessels;
        const updateValueofVessels = req.body.updateValueofVessels;
        const  VesselIdOrg  = req.body. VesselIdOrg ;
        const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updatenoofVesselsBuilt',updatenoofVesselsBuilt);
        request.input('updateTonnageVessels',updateTonnageVessels);
        request.input('updateValueofVessels',updateValueofVessels);
        request.input("userID", userID);
        request.input("VesselIdOrg", VesselIdOrg);

        try {
            // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
            const editCheck = await checkEdit({ table: "tbl_csl_vessels_built", idColumn: "csl_vessel_id", id: VesselIdOrg, period: { financial_year: updatefinancialYear } });
            if (editCheck) return refuseEdit(res, editCheck);
            const result = await request.query(`UPDATE tbl_csl_vessels_built SET financial_year = @updatefinancialYear, no_of_vessels_built = @updatenoofVesselsBuilt,tonnage_of_vessels_built = @updateTonnageVessels,value_of_vessels_built  = @updateValueofVessels,updated_by = @userID,updated_date = getDate() WHERE csl_vessel_id  = @VesselIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.error(err);
            return res.sendStatus(500);
        }
    }

    async function deleteVesselsBuilt(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_vessels_built", idColumn: "csl_vessel_id", idParam: "csl_vessel_id", logFolder: "CSL_Vessels_Built" });
}


    async function addShipBuildingOrders(req, res) {
        try {
            const { financialYear, financialQuater, shipOrdersreceived, valueOfshipOrder } = req.body;
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
            const conn = await pool;
            const request = conn.request();
    
            // Bind inputs
            request.input("financialYear", financialYear);
            request.input("financialQuater", financialQuater);
            request.input("shipOrdersreceived", shipOrdersreceived);
            request.input("valueOfshipOrder", valueOfshipOrder);
            request.input("userID", userID);
    
            // Check if a record exists for the same financial year and quarter
            const checkDuplicate = await request.query(`
                SELECT COUNT(*) AS count 
                FROM tbl_csl_ship_building_orders 
                WHERE financial_year = @financialYear AND financial_quater = @financialQuater
            `);
    
            if (checkDuplicate.recordset[0].count > 0) {
                return res.status(409).json({ error: "An entry for this period already exists." });
            }
    
            const insertResult = await request.query(`
                INSERT INTO tbl_csl_ship_building_orders 
                    (financial_year, financial_quater, ship_orders_received, value_of_ship_orders_received, created_by, created_date)
                OUTPUT INSERTED.csl_shipbuilding_id
                VALUES 
                    (@financialYear, @financialQuater, @shipOrdersreceived, @valueOfshipOrder, @userID, GETDATE())
            `);
    
            const insertedId = insertResult.recordset[0].csl_shipbuilding_id;

            res.status(201).json({ insertedId });

        } catch (error) {
            console.error("Error adding shipbuilding order:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
       
   async function getshipbildingList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR financial_quater LIKE @search OR CAST(ship_orders_received AS VARCHAR(50)) LIKE @search OR CAST(value_of_ship_orders_received AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_ship_building_orders ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_ship_building_orders
                ${whereClause}
                ORDER BY financial_year DESC, csl_shipbuilding_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

    async function getUpdateshipBuildingdata(req, res) 
            {
            
                const CslshipbuildingId = req.params.CslshipbuildingId;
                const conn = await pool;
                const request = conn.request();
                request.input("CslshipbuildingId", CslshipbuildingId);
            
                try {
                    const result = await request.query(`
                        SELECT 
                            *
                        FROM 
                            tbl_csl_ship_building_orders
                            WHERE csl_shipbuilding_id  = @CslshipbuildingId
                    `);
            
                    res.json(result.recordset);
                } catch (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
        }
 
        async function updatecslShipbuildingData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefinancialQuater = req.body.updatefinancialQuater;
            const updateShiporderReceived = req.body.updateShiporderReceived;
            const updateValueofship = req.body.updateValueofship;
            const CslshipbuildingIdOrg  = req.body.CslshipbuildingIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updateShiporderReceived',updateShiporderReceived);
            request.input('updateValueofship',updateValueofship);
            request.input("userID", userID);
            request.input("CslshipbuildingIdOrg",CslshipbuildingIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_csl_ship_building_orders", idColumn: "csl_shipbuilding_id", id: CslshipbuildingIdOrg, period: { financial_year: updatefinancialYear, financial_quater: updatefinancialQuater } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_csl_ship_building_orders SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,ship_orders_received = @updateShiporderReceived,value_of_ship_orders_received = @updateValueofship,updated_by = @userID,updated_date = getDate() WHERE csl_shipbuilding_id  = @CslshipbuildingIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        async function deleteShipBuildingOrders(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_ship_building_orders", idColumn: "csl_shipbuilding_id", idParam: "csl_shipbuilding_id", logFolder: "CSL_Ship_Building_Orders" });
}
        
    async function  addShipdelivery(req, res) {
        try {
            const { financialYear, financialQuater, noOfshipsReceived, noOfshipsDeleivered } = req.body;
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
            const conn = await pool;
            const request = conn.request();
    
            // Bind inputs
            request.input("financialYear", financialYear);
            request.input("financialQuater", financialQuater);
            request.input("noOfshipsReceived", noOfshipsReceived);
            request.input("noOfshipsDeleivered", noOfshipsDeleivered);
            request.input("userID", userID);

            const checkDuplicate = await request.query(`
                SELECT COUNT(*) AS count 
                FROM tbl_csl_ship_delivery_performance 
                WHERE financial_year = @financialYear AND financial_quater = @financialQuater
            `);
    
            if (checkDuplicate.recordset[0].count > 0) {
                return res.status(409).json({ error: "An entry for this period already exists." });
            }
    
            const insertResult = await request.query(`
                INSERT INTO tbl_csl_ship_delivery_performance 
                    (financial_year, financial_quater, total_no_ship_orders_received, no_of_ships_delivered, created_by, created_date)
                OUTPUT INSERTED.csl_shipdelivery_id
                VALUES 
                    (@financialYear, @financialQuater, @noOfshipsReceived, @noOfshipsDeleivered, @userID, GETDATE())
            `);
    
            const insertedId = insertResult.recordset[0].csl_shipdelivery_id;
    
            res.status(201).json({ insertedId });
    
        } catch (error) {
            console.error("Error adding ship delivery record:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    
        async function getdeliveryList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR financial_quater LIKE @search OR CAST(total_no_ship_orders_received AS VARCHAR(50)) LIKE @search OR CAST(no_of_ships_delivered AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_ship_delivery_performance ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_ship_delivery_performance
                ${whereClause}
                ORDER BY financial_year DESC, csl_shipdelivery_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

        async function getUpdateshipdeliverydata(req, res) 
        {
    try {
            
                const CslshipdeliveryId = req.params.CslshipdeliveryId;
                const conn = await pool;
                const request = conn.request();
                request.input("CslshipdeliveryId", CslshipdeliveryId);
            
                    const result = await request.query(`
                        SELECT 
                            *
                        FROM 
                            tbl_csl_ship_delivery_performance
                            WHERE csl_shipdelivery_id  = @CslshipdeliveryId
                    `);
            
                    res.json(result.recordset);
            
    } catch (err) {
        console.error("getUpdateshipdeliverydata error:", err);
        if (!res.headersSent) return res.sendStatus(500);
    }
} 

        async function updatecslShipdeliveryData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefinancialQuater = req.body.updatefinancialQuater;
            const updateShiporders = req.body.updateShiporders;
            const updateShipsdelivered = req.body.updateShipsdelivered;
            const CslshipdeliveryIdOrg  = req.body.CslshipdeliveryIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updateShiporders',updateShiporders);
            request.input('updateShipsdelivered',updateShipsdelivered);
            request.input("userID", userID);
            request.input("CslshipdeliveryIdOrg",CslshipdeliveryIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_csl_ship_delivery_performance", idColumn: "csl_shipdelivery_id", id: CslshipdeliveryIdOrg, period: { financial_year: updatefinancialYear, financial_quater: updatefinancialQuater } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_csl_ship_delivery_performance SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,total_no_ship_orders_received = @updateShiporders,no_of_ships_delivered = @updateShipsdelivered,updated_by = @userID,updated_date = getDate() WHERE csl_shipdelivery_id  = @CslshipdeliveryIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        
        async function deleteShipDeliveryPerformance(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_ship_delivery_performance", idColumn: "csl_shipdelivery_id", idParam: "csl_shipdelivery_id", logFolder: "CSL_Ship_Delivery_Performance" });
}



        async function addcapacityUtilization(req, res) {
    try {
                const financialYear = req.body.financialYear;
                const shipbuildingCapacity = req.body.shipbuildingCapacity;
                const tonnageOfVesselsBuilt = req.body.tonnageofVesselsBuilt;
                const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
            
                const conn = await pool;
            
                    const checkRequest = conn.request();
                    checkRequest.input("financialYear", financialYear);
                    
                    // Check if financial year already exists
                    const checkResult = await checkRequest.query(`
                        SELECT COUNT(*) AS count FROM tbl_csl_capacity_utilization WHERE financial_year = @financialYear
                    `);
            
                    if (checkResult.recordset[0].count > 0) {
                        return res.status(409).json({ error: "An entry for this period already exists." });
                    }
            
                    // If no duplicate, proceed with insert
                    const request = conn.request();
                    request.input("financialYear", financialYear);
                    request.input("shipbuildingCapacity", shipbuildingCapacity);
                    request.input("tonnageOfVesselsBuilt", tonnageOfVesselsBuilt);
                    request.input("userID", userID);
            
                    const result = await request.query(`
                        INSERT INTO tbl_csl_capacity_utilization (financial_year, total_shipbuilding_capacity, tonnage_of_vessels, created_by, created_date)
                        OUTPUT INSERTED.csl_capacity_utilization_id
                        VALUES (@financialYear, @shipbuildingCapacity, @tonnageOfVesselsBuilt, @userID, GETDATE())
                    `);
            
                    const insertedYPId = result.recordset[0].csl_capacity_utilization_id;
                    res.status(201).json({ insertedYPId });
            
             
    } catch (err) {
        console.error("addcapacityUtilization error:", err);
        if (!res.headersSent) return res.sendStatus(500);
    }
} 
        

        async function getcapacityUtilizationList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR CAST(total_shipbuilding_capacity AS VARCHAR(50)) LIKE @search OR CAST(tonnage_of_vessels AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_capacity_utilization ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_capacity_utilization
                ${whereClause}
                ORDER BY financial_year DESC, csl_capacity_utilization_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

        async function getUpdatecapacityUtilizationdata(req, res) 
        {
        
            const CslcapacityUtilizationId = req.params.CslcapacityUtilizationId;
            const conn = await pool;
            const request = conn.request();
            request.input("CslcapacityUtilizationId", CslcapacityUtilizationId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_csl_capacity_utilization
                        WHERE csl_capacity_utilization_id  = @CslcapacityUtilizationId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        async function updatecslCapacityutilizationgData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updateshipbuildingCapacity = req.body.updateshipbuildingCapacity;
            const updatetonnageofVesselsBuilt = req.body.updatetonnageofVesselsBuilt;
            const CslcapacityUtilizationIdOrg  = req.body.CslcapacityUtilizationIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updateshipbuildingCapacity',updateshipbuildingCapacity);
            request.input('updatetonnageofVesselsBuilt',updatetonnageofVesselsBuilt);
            request.input("userID", userID);
            request.input("CslcapacityUtilizationIdOrg",CslcapacityUtilizationIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_csl_capacity_utilization", idColumn: "csl_capacity_utilization_id", id: CslcapacityUtilizationIdOrg, period: { financial_year: updatefinancialYear } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_csl_capacity_utilization SET financial_year = @updatefinancialYear,total_shipbuilding_capacity = @updateshipbuildingCapacity,tonnage_of_vessels = @updatetonnageofVesselsBuilt,updated_by = @userID,updated_date = getDate() WHERE csl_capacity_utilization_id  = @CslcapacityUtilizationIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        async function deleteCapacityUtilization(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_capacity_utilization", idColumn: "csl_capacity_utilization_id", idParam: "csl_capacity_utilization_id", logFolder: "CSL_Capacity_Utilization" });
}
        async function addfabricationofsteels(req, res) {
            try {
                const { financialYear, fabricationmonth, fabricationOfSteels, fabrigationinTonns } = req.body;
                const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
                // Log received data to debug
        
                // Check if userID is missing
                if (!userID) {
                    return res.status(400).json({ error: "User ID is required" });
                }
        
                const conn = await pool;
                const request = conn.request();
        
                request.input("financialYear", financialYear);
                request.input("fabricationOfSteels", fabricationOfSteels);
                request.input("fabrigationinTonns",fabrigationinTonns);
                request.input("userID", userID);
        
                // One entry per year and month (a yearly entry: one per year) - QC KPI-04
                if (fabricationmonth) request.input("fabricationmonth", fabricationmonth);
                const taken = await request.query(fabricationmonth
                    ? `SELECT COUNT(*) AS count FROM tbl_csl_fabrication_of_steels WHERE financial_year = @financialYear AND month = @fabricationmonth`
                    : `SELECT COUNT(*) AS count FROM tbl_csl_fabrication_of_steels_update WHERE financial_year = @financialYear`);
                if (taken.recordset[0].count > 0) {
                    return res.status(409).json({ error: "An entry for this period already exists." });
                }

                if (fabricationmonth) {
                    const result = await request.query(`
                        INSERT INTO tbl_csl_fabrication_of_steels 
                            (financial_year, month, fabrication_of_steel_targets, fabrication_of_steel_actual, created_by, created_date, updated_date)
                        OUTPUT INSERTED.csl_fabrication_id
                        VALUES 
                            (@financialYear, @fabricationmonth, @fabricationOfSteels, @fabrigationinTonns, @userID, GETDATE(), GETDATE())
                    `);
        
                    return res.status(201).json({ insertedId: result.recordset[0].csl_fabrication_id });
                } else {
                    const result = await request.query(`
                        INSERT INTO tbl_csl_fabrication_of_steels_update 
                            (financial_year, fabrication_of_steel_targets,fabrication_of_steel_actual, created_by, created_date, updated_date)
                        OUTPUT INSERTED.csl_fabrication_id
                        VALUES 
                            (@financialYear,@fabricationOfSteels,@fabrigationinTonns, @userID, GETDATE(), GETDATE())
                    `);
        
                    return res.status(201).json({ insertedId: result.recordset[0].csl_fabrication_id });
                }
            } catch (error) {
                console.error("Error adding fabrication of steel record:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
        
        
        async function getfabricationList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR month LIKE @search OR CAST(fabrication_of_steel_targets AS VARCHAR(50)) LIKE @search OR CAST(fabrication_of_steel_actual AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_fabrication_of_steels ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_fabrication_of_steels
                ${whereClause}
                ORDER BY financial_year DESC, csl_fabrication_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

        async function getUpdatefabricationofsteeldata(req, res) 
        {
        
            const CslfabricationId = req.params.CslfabricationId;
            const conn = await pool;
            const request = conn.request();
            request.input("CslfabricationId", CslfabricationId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_csl_fabrication_of_steels
                        WHERE csl_fabrication_id  = @CslfabricationId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        async function updatecslFabricationupdateData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefabricationmonth = req.body.updatefabricationmonth;
            const updatefabrigationOfsteels = req.body.updatefabrigationOfsteels;
            const updatefabrigationinTonns = req.body.updatefabrigationinTonns;
            const CslfabricationIdOrg  = req.body.CslfabricationIdOrg ;
        
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefabricationmonth',updatefabricationmonth);
            request.input('updatefabrigationOfsteels',updatefabrigationOfsteels);
            request.input('updatefabrigationinTonns',updatefabrigationinTonns);
            request.input("userID", userID);
            request.input("CslfabricationIdOrg",CslfabricationIdOrg);
        
            
        
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_csl_fabrication_of_steels", idColumn: "csl_fabrication_id", id: CslfabricationIdOrg, period: { financial_year: updatefinancialYear, month: updatefabricationmonth } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_csl_fabrication_of_steels SET financial_year = @updatefinancialYear, month = @updatefabricationmonth,fabrication_of_steel_targets = @updatefabrigationOfsteels,fabrication_of_steel_actual = @updatefabrigationinTonns,updated_by = @userID,updated_date = getDate() WHERE csl_fabrication_id  = @CslfabricationIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        async function deleteFabricationOfSteels(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_fabrication_of_steels", idColumn: "csl_fabrication_id", idParam: "csl_fabrication_id", logFolder: "CSL_Fabrication_Of_Steels" });
}
    
        async function addShipRepaired(req, res) {
            try {
                const { financialYear, financialQuater, noOfshipsrepaired, valueOfshipsrepaired } = req.body;
                const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
                const conn = await pool;
                const request = conn.request();
        
                // Bind inputs
                request.input("financialYear", financialYear);
                request.input("financialQuater", financialQuater);
                request.input("noOfshipsrepaired", noOfshipsrepaired);
                request.input("valueOfshipsrepaired",valueOfshipsrepaired);
                request.input("userID", userID);
        
                // Check if a record exists for the same financial year and quarter
                const checkDuplicate = await request.query(`
                    SELECT COUNT(*) AS count 
                    FROM tbl_csl_ships_repaired 
                    WHERE financial_year = @financialYear AND financial_quater = @financialQuater
                `);
        
                if (checkDuplicate.recordset[0].count > 0) {
                    return res.status(409).json({ error: "An entry for this period already exists." });
                }
        
                // Insert into tbl_csl_ship_building_orders
                const insertResult = await request.query(`
                    INSERT INTO tbl_csl_ships_repaired  
                        (financial_year, financial_quater, no_of_ships_repaired,value_of_ships_repaired, created_by, created_date)
                    OUTPUT INSERTED.csl_ships_reapired_id
                    VALUES 
                        (@financialYear, @financialQuater, @noOfshipsrepaired, @valueOfshipsrepaired, @userID, GETDATE())
                `);
        
                const insertedId = insertResult.recordset[0].csl_ships_reapired_id;
    
                res.status(201).json({ insertedId });
    
            } catch (error) {
                console.error("Error adding shipbuilding order:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
        
        
        async function getshipRepairedList(req, res) {
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
            whereClause = 'WHERE (financial_year LIKE @search OR financial_quater LIKE @search OR CAST(no_of_ships_repaired AS VARCHAR(50)) LIKE @search OR CAST(value_of_ships_repaired AS VARCHAR(50)) LIKE @search)';
        }
        // Financial year dropdown: exact match, combined with the free-text search
        const financialYear = (req.query.financialYear || '').trim();
        if (financialYear) {
            countRequest.input("financialYear", financialYear);
            pageRequest.input("financialYear", financialYear);
            whereClause = whereClause ? `${whereClause} AND financial_year = @financialYear` : 'WHERE financial_year = @financialYear';
        }

        const [countResult, pageResult] = await Promise.all([
            countRequest.query(`SELECT COUNT(*) AS total FROM tbl_csl_ships_repaired ${whereClause}`),
            pageRequest.query(`
                SELECT * FROM tbl_csl_ships_repaired
                ${whereClause}
                ORDER BY financial_year DESC, csl_ships_reapired_id DESC
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
        return res.status(500).json({ message: 'Internal Server Error' });
    }
} 

        async function getUpdateshiptrapireddata(req, res) 
        {
        
            const CslreapiredId = req.params.CslreapiredId;
            const conn = await pool;
            const request = conn.request();
            request.input("CslreapiredId", CslreapiredId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_csl_ships_repaired
                        WHERE csl_ships_reapired_id  = @CslreapiredId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        async function updatecslshipData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefinancialQuater = req.body.updatefinancialQuater;
            const updatenoOfshipsrepaired = req.body.updatenoOfshipsrepaired;
            const updatevalueOfshipsrepaired = req.body.updatevalueOfshipsrepaired;
            const CslreapiredIdOrg  = req.body.CslreapiredIdOrg ;
            const userID = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updatenoOfshipsrepaired',updatenoOfshipsrepaired);
            request.input('updatevalueOfshipsrepaired',updatevalueOfshipsrepaired);
            request.input("userID", userID);
            request.input("CslreapiredIdOrg",CslreapiredIdOrg);
    
            try {
                // The entry must still exist, and its new period must not be another entry's (QC KPI-05 / KPI-09)
                const editCheck = await checkEdit({ table: "tbl_csl_ships_repaired", idColumn: "csl_ships_reapired_id", id: CslreapiredIdOrg, period: { financial_year: updatefinancialYear, financial_quater: updatefinancialQuater } });
                if (editCheck) return refuseEdit(res, editCheck);
                const result = await request.query(`UPDATE tbl_csl_ships_repaired SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,no_of_ships_repaired = @updatenoOfshipsrepaired,value_of_ships_repaired = @updatevalueOfshipsrepaired,updated_by = @userID,updated_date = getDate() WHERE csl_ships_reapired_id  = @CslreapiredIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.error(err);
                return res.sendStatus(500);
            }
        }

        async function deleteShipRepaired(req, res) {
    return deleteKpiEntry(req, res, { table: "tbl_csl_ships_repaired", idColumn: "csl_ships_reapired_id", idParam: "csl_ships_reapired_id", logFolder: "CSL_Ships_Repaired" });
}
    




export default{addVesselsBuilt,getVesselBuiltList,getUpdateVesselBuiltdata,updatecslVesselBuiltData,deleteVesselsBuilt,
    addShipBuildingOrders,getshipbildingList,getUpdateshipBuildingdata,updatecslShipbuildingData,deleteShipBuildingOrders,addShipdelivery,
    getdeliveryList,getUpdateshipdeliverydata,updatecslShipdeliveryData,deleteShipDeliveryPerformance,addcapacityUtilization,getcapacityUtilizationList,
    getUpdatecapacityUtilizationdata,updatecslCapacityutilizationgData,deleteCapacityUtilization,addfabricationofsteels,getfabricationList,
    getUpdatefabricationofsteeldata,updatecslFabricationupdateData,deleteFabricationOfSteels,addShipRepaired,getshipRepairedList,
    getUpdateshiptrapireddata,updatecslshipData,deleteShipRepaired}




