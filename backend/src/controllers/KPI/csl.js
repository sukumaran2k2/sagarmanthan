import { pool } from "../../db.js";
import path from 'path';
import fs from 'fs';




    async function addVesselsBuilt(req, res) {
        const { financialYear, vesselsBuilt, tonnageVessels, valueofVessels, userID } = req.body;

        const conn = await pool;

        try {
            const request = conn.request();
            request.input("financialYear", financialYear);
            
            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_csl_vessels_built WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.sendStatus(205); // Data already exists
            }

            // If no duplicate, proceed with insert
            request.input("vesselsBuilt", vesselsBuilt);
            request.input("tonnageVessels", tonnageVessels);
            request.input("valueofVessels", valueofVessels);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_csl_vessels_built (financial_year, no_of_vessels_built, tonnage_of_vessels_built, value_of_vessels_built, created_by)
                OUTPUT INSERTED.csl_vessel_id
                VALUES (@financialYear, @vesselsBuilt, @tonnageVessels, @valueofVessels, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].csl_vessel_id });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

            
    async function getVesselBuiltList(req, res) {

            const conn = await pool;
            const request = conn.request();

            const result = await request.query(`
                SELECT * FROM tbl_csl_vessels_built
                ORDER BY financial_year DESC;
            `);

            res.json(result.recordset);
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
            console.log(err);
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
        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updatenoofVesselsBuilt',updatenoofVesselsBuilt);
        request.input('updateTonnageVessels',updateTonnageVessels);
        request.input('updateValueofVessels',updateValueofVessels);
        request.input("userID", userID);
        request.input("VesselIdOrg", VesselIdOrg);

        try {
            const result = await request.query(`UPDATE tbl_csl_vessels_built SET financial_year = @updatefinancialYear, no_of_vessels_built = @updatenoofVesselsBuilt,tonnage_of_vessels_built = @updateTonnageVessels,value_of_vessels_built  = @updateValueofVessels,updated_by = @userID,updated_date = getDate() WHERE csl_vessel_id  = @VesselIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }


    async function addShipBuildingOrders(req, res) {
        try {
            const { financialYear, financialQuater, shipOrdersreceived, valueOfshipOrder, userID } = req.body;
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
                return res.sendStatus(205); // Data already exists
            }
    
            const insertResult = await request.query(`
                INSERT INTO tbl_csl_ship_building_orders 
                    (financial_year, financial_quater, ship_orders_received, value_of_ship_orders_received, created_by)
                OUTPUT INSERTED.csl_shipbuilding_id
                VALUES 
                    (@financialYear, @financialQuater, @shipOrdersreceived, @valueOfshipOrder, @userID)
            `);
    
            const insertedId = insertResult.recordset[0].csl_shipbuilding_id;
            await request.query(`
                MERGE INTO tbl_csl_ship_building_orders_update AS target
                USING (SELECT @financialYear AS financial_year) AS source
                ON target.financial_year = source.financial_year
                WHEN MATCHED THEN
                    UPDATE SET 
                        target.ship_orders_received = target.ship_orders_received + @shipOrdersreceived,
                        target.value_of_ship_orders_received = target.value_of_ship_orders_received + @valueOfshipOrder,
                        target.updated_by = @userID,
                        target.updated_date = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (financial_year, ship_orders_received, value_of_ship_orders_received, updated_by, updated_date)
                    VALUES (@financialYear, @shipOrdersreceived, @valueOfshipOrder, @userID, GETDATE());
            `);

            res.status(201).json({ insertedId });

        } catch (error) {
            console.error("Error adding shipbuilding order:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
       
   async function getshipbildingList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_csl_ship_building_orders
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
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
                    console.log(err);
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
        
    async function  addShipdelivery(req, res) {
        try {
            const { financialYear, financialQuater, noOfshipsReceived, noOfshipsDeleivered, userID } = req.body;
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
                return res.sendStatus(205); // Data already exists
            }
    
            const insertResult = await request.query(`
                INSERT INTO tbl_csl_ship_delivery_performance 
                    (financial_year, financial_quater, total_no_ship_orders_received, no_of_ships_delivered, created_by)
                OUTPUT INSERTED.csl_shipdelivery_id
                VALUES 
                    (@financialYear, @financialQuater, @noOfshipsReceived, @noOfshipsDeleivered, @userID)
            `);
    
            const insertedId = insertResult.recordset[0].csl_shipdelivery_id;
            await request.query(`
                MERGE INTO tbl_csl_ship_delivery_performance_update AS target
                USING (SELECT @financialYear AS financial_year) AS source
                ON target.financial_year = source.financial_year
                WHEN MATCHED THEN
                    UPDATE SET 
                        target.total_no_ship_orders_received = target.total_no_ship_orders_received + @noOfshipsReceived,
                        target.no_of_ships_delivered = target.no_of_ships_delivered + @noOfshipsDeleivered,
                        target.updated_by = @userID,
                        target.updated_date =  GETDATE()-- Store only date
                WHEN NOT MATCHED THEN
                    INSERT (financial_year, total_no_ship_orders_received, no_of_ships_delivered, updated_by, updated_date)
                    VALUES (@financialYear, @noOfshipsReceived, @noOfshipsDeleivered, @userID,  GETDATE());
            `);
    
            res.status(201).json({ insertedId });
    
        } catch (error) {
            console.error("Error adding ship delivery record:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    
        async function getdeliveryList(req, res) {

            const conn = await pool;
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_csl_ship_delivery_performance
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
        } 

        async function getUpdateshipdeliverydata(req, res) 
        {
        
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
        } 

        async function updatecslShipdeliveryData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatefinancialQuater = req.body.updatefinancialQuater;
            const updateShiporders = req.body.updateShiporders;
            const updateShipsdelivered = req.body.updateShipsdelivered;
            const CslshipdeliveryIdOrg  = req.body.CslshipdeliveryIdOrg ;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updateShiporders',updateShiporders);
            request.input('updateShipsdelivered',updateShipsdelivered);
            request.input("userID", userID);
            request.input("CslshipdeliveryIdOrg",CslshipdeliveryIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_csl_ship_delivery_performance SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,total_no_ship_orders_received = @updateShiporders,no_of_ships_delivered = @updateShipsdelivered,updated_by = @userID,updated_date = getDate() WHERE csl_shipdelivery_id  = @CslshipdeliveryIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
        


        async function addcapacityUtilization(req, res) {
            const financialYear = req.body.financialYear;
            const shipbuildingCapacity = req.body.shipbuildingCapacity;
            const tonnageOfVesselsBuilt = req.body.tonnageofVesselsBuilt;
            const userID = req.body.userID;
        
            const conn = await pool;
        
                const checkRequest = conn.request();
                checkRequest.input("financialYear", financialYear);
                
                // Check if financial year already exists
                const checkResult = await checkRequest.query(`
                    SELECT COUNT(*) AS count FROM tbl_csl_capacity_utilization WHERE financial_year = @financialYear
                `);
        
                if (checkResult.recordset[0].count > 0) {
                    return res.status(205).json({ error: "Data already exists for the selected financial year!" });
                }
        
                // If no duplicate, proceed with insert
                const request = conn.request();
                request.input("financialYear", financialYear);
                request.input("shipbuildingCapacity", shipbuildingCapacity);
                request.input("tonnageOfVesselsBuilt", tonnageOfVesselsBuilt);
                request.input("userID", userID);
        
                const result = await request.query(`
                    INSERT INTO tbl_csl_capacity_utilization (financial_year, total_shipbuilding_capacity, tonnage_of_vessels, created_by)
                    OUTPUT INSERTED.csl_capacity_utilization_id
                    VALUES (@financialYear, @shipbuildingCapacity, @tonnageOfVesselsBuilt, @userID)
                `);
        
                const insertedYPId = result.recordset[0].csl_capacity_utilization_id;
                res.status(201).json({ insertedYPId });
        
         } 
        

        async function getcapacityUtilizationList(req, res) {

                const conn = await pool;
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_csl_capacity_utilization
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
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
                console.log(err);
                return res.sendStatus(500);
            }
        }
        async function updatecslCapacityutilizationgData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updateshipbuildingCapacity = req.body.updateshipbuildingCapacity;
            const updatetonnageofVesselsBuilt = req.body.updatetonnageofVesselsBuilt;
            const CslcapacityUtilizationIdOrg  = req.body.CslcapacityUtilizationIdOrg ;
        
            const userID = req.body.userID;
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updateshipbuildingCapacity',updateshipbuildingCapacity);
            request.input('updatetonnageofVesselsBuilt',updatetonnageofVesselsBuilt);
            request.input("userID", userID);
            request.input("CslcapacityUtilizationIdOrg",CslcapacityUtilizationIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_csl_capacity_utilization SET financial_year = @updatefinancialYear,total_shipbuilding_capacity = @updateshipbuildingCapacity,tonnage_of_vessels = @updatetonnageofVesselsBuilt,updated_by = @userID,updated_date = getDate() WHERE csl_capacity_utilization_id  = @CslcapacityUtilizationIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
        async function addfabricationofsteels(req, res) {
            try {
                const { financialYear, fabricationmonth, fabricationOfSteels,fabrigationinTonns, userID } = req.body;
        
                // Log received data to debug
                console.log("Received Data:", req.body);
        
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
        
                if (fabricationmonth) {
                    request.input("fabricationmonth", fabricationmonth);
                    
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

                const conn = await pool;
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_csl_fabrication_of_steels
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
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
                console.log(err);
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
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefabricationmonth',updatefabricationmonth);
            request.input('updatefabrigationOfsteels',updatefabrigationOfsteels);
            request.input('updatefabrigationinTonns',updatefabrigationinTonns);
            request.input("userID", userID);
            request.input("CslfabricationIdOrg",CslfabricationIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_csl_fabrication_of_steels SET financial_year = @updatefinancialYear, month = @updatefabricationmonth,fabrication_of_steel_targets = @updatefabrigationOfsteels,fabrication_of_steel_actual = @updatefabrigationinTonns,updated_by = @userID,updated_date = getDate() WHERE csl_fabrication_id  = @CslfabricationIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
    
        async function addShipRepaired(req, res) {
            try {
                const { financialYear, financialQuater, noOfshipsrepaired, valueOfshipsrepaired, userID } = req.body;
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
                    return res.sendStatus(205); // Data already exists
                }
        
                // Insert into tbl_csl_ship_building_orders
                const insertResult = await request.query(`
                    INSERT INTO tbl_csl_ships_repaired  
                        (financial_year, financial_quater, no_of_ships_repaired,value_of_ships_repaired, created_by)
                    OUTPUT INSERTED.csl_ships_reapired_id
                    VALUES 
                        (@financialYear, @financialQuater, @noOfshipsrepaired, @valueOfshipsrepaired, @userID)
                `);
        
                const insertedId = insertResult.recordset[0].csl_ships_reapired_id;
               // Update or insert into tbl_csl_ships_repaired_UPDATE (cumulative table)
                await request.query(`
                    MERGE INTO tbl_csl_ships_repaired_UPDATE AS target
                    USING (SELECT @financialYear AS financial_year) AS source
                    ON target.financial_year = source.financial_year
                    WHEN MATCHED THEN
                        UPDATE SET 
                            target.no_of_ships_repaired = target.no_of_ships_repaired+ @noOfshipsrepaired,
                            target.value_of_ships_repaired = target.value_of_ships_repaired + @valueOfshipsrepaired,
                            target.updated_by = @userID,
                            target.updated_date = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (financial_year, no_of_ships_repaired, value_of_ships_repaired, updated_by, updated_date)
                        VALUES (@financialYear, @noOfshipsrepaired, @valueOfshipsrepaired, @userID, GETDATE());
                `);
    
                res.status(201).json({ insertedId });
    
            } catch (error) {
                console.error("Error adding shipbuilding order:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
        
        
        async function getshipRepairedList(req, res) {

                const conn = await pool;
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_csl_ships_repaired
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
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
                console.log(err);
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
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatefinancialQuater',updatefinancialQuater);
            request.input('updatenoOfshipsrepaired',updatenoOfshipsrepaired);
            request.input('updatevalueOfshipsrepaired',updatevalueOfshipsrepaired);
            request.input("userID", userID);
            request.input("CslreapiredIdOrg",CslreapiredIdOrg);
    
            try {
                const result = await request.query(`UPDATE tbl_csl_ships_repaired SET financial_year = @updatefinancialYear, financial_quater = @updatefinancialQuater,no_of_ships_repaired = @updatenoOfshipsrepaired,value_of_ships_repaired = @updatevalueOfshipsrepaired,updated_by = @userID,updated_date = getDate() WHERE csl_ships_reapired_id  = @CslreapiredIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
    




export default{addVesselsBuilt,getVesselBuiltList,getUpdateVesselBuiltdata,updatecslVesselBuiltData,
    addShipBuildingOrders,getshipbildingList,getUpdateshipBuildingdata,updatecslShipbuildingData,addShipdelivery,
    getdeliveryList,getUpdateshipdeliverydata,updatecslShipdeliveryData,addcapacityUtilization,getcapacityUtilizationList,
    getUpdatecapacityUtilizationdata,updatecslCapacityutilizationgData,addfabricationofsteels,getfabricationList,
    getUpdatefabricationofsteeldata,updatecslFabricationupdateData,addShipRepaired,getshipRepairedList,
    getUpdateshiptrapireddata,updatecslshipData}




