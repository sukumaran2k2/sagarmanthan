import { pool } from "../../db.js";
import path from 'path';
import fs from 'fs';


async function addVesselAvailabiltydata(req, res) {
    const { scifinancialYear, operatedShips, shipUtilization, userID } = req.body;
    console.log("Received data:", req.body);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("scifinancialYear", scifinancialYear);

        // Check if financial year already exists
        const result = await request.query(`
            SELECT COUNT(*) AS count FROM tbl_sci_vessel_availability WHERE financial_year = @scifinancialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.status(205).json({ error: "Data already exists for the selected financial year!" });
        }

        
        request.input("operatedShips", operatedShips);
        request.input("shipUtilization", shipUtilization);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_sci_vessel_availability 
            (financial_year, total_no_of_own_operated, ship_utilization, created_by)
            OUTPUT INSERTED.sci_vessel_id
            VALUES (@scifinancialYear, @operatedShips, @shipUtilization, @userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_vessel_id });

    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

       
async function getsciVesselList(req, res) {

    const conn = await pool;
    const request = conn.request();

    const result = await request.query(`
        SELECT * FROM tbl_sci_vessel_availability
        ORDER BY financial_year DESC;
    `);

    res.json(result.recordset);
} 


async function getUpdatesciVesseldata(req, res) 
        {
        
            const SciVesselId = req.params.SciVesselId;
            const conn = await pool;
            const request = conn.request();
            request.input("SciVesselId", SciVesselId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_sci_vessel_availability
                        WHERE sci_vessel_id  = @SciVesselId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
 
        async function updatesciVesselData(req,res){
        
            const data = req.body;
            
            const updatescifinancialYear = req.body.updatescifinancialYear;
            const updateoperatedShips = req.body.updateoperatedShips;
            const  updateshipUtilization = req.body. updateshipUtilization;
            
            const SciVesselIdOrg  = req.body.SciVesselIdOrg ;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatescifinancialYear', updatescifinancialYear);
            request.input('updateoperatedShips',updateoperatedShips);
            request.input('updateshipUtilization', updateshipUtilization);
            request.input("userID", userID);
            request.input("SciVesselIdOrg",SciVesselIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_sci_vessel_availability SET financial_year = @updatescifinancialYear, total_no_of_own_operated = @updateoperatedShips,ship_utilization = @updateshipUtilization,updated_by = @userID,updated_date = getDate() WHERE sci_vessel_id  = @SciVesselIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }

        
async function addscitimeVoyageydata(req, res) {
    const { financialYear, bulkCarriers, timeCharter,voyageCharter,revenue,earnings, userID } = req.body;
    console.log("Received data:", req.body);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear);

        // Check if financial year already exists
        const result = await request.query(`
            SELECT COUNT(*) AS count FROM tbl_sci_time_voyage_bulk WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.status(205).json({ error: "Data already exists for the selected financial year!" });
        }

        
        request.input("bulkCarriers", bulkCarriers);
        request.input("timeCharter", timeCharter);
        request.input("voyageCharter", voyageCharter);
        request.input("revenue", revenue);
        request.input("earnings", earnings);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_sci_time_voyage_bulk 
            (financial_year, total_bulk_carriers_fleet, total_bulk_carriers_time_charter,total_bulk_carriers_voyage_charter,total_revenue_bulk_carriers,average_earnings_bulk_carriers,created_by)
            OUTPUT INSERTED.sci_time_voyage_bulk_id
            VALUES (@financialYear, @bulkCarriers, @timeCharter,@voyageCharter,@revenue,@earnings, @userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_time_voyage_bulk_id });

    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

       
async function getscitimeVoyageList(req, res) {

    const conn = await pool;
    const request = conn.request();

    const result = await request.query(`
        SELECT * FROM tbl_sci_time_voyage_bulk
        ORDER BY financial_year DESC;
    `);

    res.json(result.recordset);
} 
async function getUpdatescitimeVoyageBulkdata(req, res) 
        {
        
            const ScitimeVoyageBuiklId = req.params.ScitimeVoyageBuiklId;
            const conn = await pool;
            const request = conn.request();
            request.input("ScitimeVoyageBuiklId", ScitimeVoyageBuiklId);
        
            try {
                const result = await request.query(`
                    SELECT 
                        *
                    FROM 
                        tbl_sci_time_voyage_bulk
                        WHERE sci_time_voyage_bulk_id  = @ScitimeVoyageBuiklId
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }

async function updatescitimeVoyageBulkData(req,res){
        
            const data = req.body;
            
            const updatefinancialYear = req.body.updatefinancialYear;
            const updatebulkCarriers = req.body.updatebulkCarriers;
            const updateTimecharter = req.body.updateTimecharter;
            const updateVoyagecharter = req.body. updateVoyagecharter;
            const updateRevenue = req.body.updateRevenue;
            const  updateAverage = req.body.  updateAverage;
            const ScitimeVoyageBuiklIdOrg  = req.body.ScitimeVoyageBuiklIdOrg ;
            const userID = req.body.userID;
            const conn = await pool;
            const request = conn.request();
            
            
            request.input('updatefinancialYear', updatefinancialYear);
            request.input('updatebulkCarriers',updatebulkCarriers);
            request.input('updateTimecharter', updateTimecharter);
            request.input('updateVoyagecharter', updateVoyagecharter);
            request.input('updateRevenue',updateRevenue);
            request.input('updateAverage',  updateAverage);
            request.input("userID", userID);
            request.input("ScitimeVoyageBuiklIdOrg",ScitimeVoyageBuiklIdOrg);
        
            try {
                const result = await request.query(`UPDATE tbl_sci_time_voyage_bulk SET financial_year = @updatefinancialYear, total_bulk_carriers_fleet = @updatebulkCarriers,total_bulk_carriers_time_charter = @updateTimecharter,total_bulk_carriers_voyage_charter = @updateVoyagecharter,total_revenue_bulk_carriers= @updateRevenue,average_earnings_bulk_carriers = @updateAverage,updated_by = @userID,updated_date = getDate() WHERE sci_time_voyage_bulk_id  = @ScitimeVoyageBuiklIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
    }

    async function addscitimeVoyagetankers(req, res) {
        const { financialYear, totalTankersFleet, daysTimeCharter,daysVoyageCharter,totalRevenue,averageEarnings, userID } = req.body;
        console.log("Received data:", req.body);
    
        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);
    
            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_time_voyage_tanker WHERE financial_year = @financialYear
            `);
    
            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }
            request.input("totalTankersFleet", totalTankersFleet);
            request.input("daysTimeCharter", daysTimeCharter);
            request.input("daysVoyageCharter", daysVoyageCharter);
            request.input("totalRevenue", totalRevenue);
            request.input("averageEarnings", averageEarnings);
            request.input("userID", userID);
    
            const insertResult = await request.query(`
                INSERT INTO tbl_sci_time_voyage_tanker 
                (financial_year, total_no_of_tankers_in_fleet, total_no_days_on_time_charter,total_no_days_on_voyage_charter,total_revenue_tankers,average_earnings_tankers,created_by)
                OUTPUT INSERTED.sci_time_voyage_tanker_id
                VALUES (@financialYear, @totalTankersFleet, @daysTimeCharter,@daysVoyageCharter,@totalRevenue,@averageEarnings, @userID)
            `);
    
            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_time_voyage_tanker_id });
    
        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getscitimeList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_sci_time_voyage_tanker
            ORDER BY financial_year DESC;
        `);
    
        res.json(result.recordset);
    } 

    
async function getUpdatesciVessetankerldata(req, res) 
{

    const ScitimeVoyageTankerlId = req.params.ScitimeVoyageTankerlId;
    const conn = await pool;
    const request = conn.request();
    request.input("ScitimeVoyageTankerlId", ScitimeVoyageTankerlId);

    try {
        const result = await request.query(`
            SELECT 
                *
            FROM 
                tbl_sci_time_voyage_tanker
                WHERE sci_time_voyage_tanker_id  = @ScitimeVoyageTankerlId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
async function updateTimeVoyagetankerData(req,res){
        
    const data = req.body;
    
    const updatefinancialYear = req.body.updatefinancialYear;
    const updatetotalTankersFleet = req.body.updatetotalTankersFleet;
    const updatedaysTimeCharter = req.body.updatedaysTimeCharter;
    const updatedaysVoyageCharter = req.body. updatedaysVoyageCharter;
    const updateRevenue = req.body.updateRevenue;
    const  updateTanker = req.body.  updateTanker;
    
    const ScitimeVoyageTankerlIdOrg  = req.body.ScitimeVoyageTankerlIdOrg ;

    const userID = req.body.userID;


    const conn = await pool;
    const request = conn.request();
    request.input('updatefinancialYear', updatefinancialYear);
    request.input('updatetotalTankersFleet',updatetotalTankersFleet);
    request.input('updatedaysTimeCharter', updatedaysTimeCharter);
    request.input('updatedaysVoyageCharter', updatedaysVoyageCharter);
    request.input('updateRevenue',updateRevenue);
    request.input('updateTanker', updateTanker);
    request.input("userID", userID);
    request.input("ScitimeVoyageTankerlIdOrg",ScitimeVoyageTankerlIdOrg);

    

    try {
        const result = await request.query(`UPDATE tbl_sci_time_voyage_tanker SET financial_year = @updatefinancialYear, total_no_of_tankers_in_fleet = @updatetotalTankersFleet,total_no_days_on_time_charter = @updatedaysTimeCharter,total_no_days_on_voyage_charter = @updatedaysVoyageCharter,total_revenue_tankers= @updateRevenue,average_earnings_tankers = @updateTanker,updated_by = @userID,updated_date = getDate() WHERE sci_time_voyage_tanker_id  = @ScitimeVoyageTankerlIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


    async function addscitimeVoyageoffshore(req, res) {
        const { financialYear, offshoreFleet, timeCharter,voyageCharter,revenue,average, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_time_voyage_offshore WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("offshoreFleet", offshoreFleet);
            request.input("timeCharter", timeCharter);
            request.input("voyageCharter", voyageCharter);
            request.input("revenue", revenue);
            request.input("average", average);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_time_voyage_offshore 
                (financial_year, total_no_of_offshore_in_fleet, total_no_days_on_offshore_time_charter,total_no_days_on_offshore_voyage_charter,total_revenue_offshore,average_earnings_offshore,created_by)
                OUTPUT INSERTED.sci_time_voyage_offshore_id
                VALUES (@financialYear, @offshoreFleet, @timeCharter,@voyageCharter,@revenue,@average, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_time_voyage_offshore_id});

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
        
    async function getscioffshoreList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_time_voyage_offshore
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    } 

    async function getUpdatesciVesseoffshoreldata(req, res) 
    {

        const ScitimeVoyageoffshorelId = req.params.ScitimeVoyageoffshorelId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScitimeVoyageoffshorelId", ScitimeVoyageoffshorelId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_time_voyage_offshore
                    WHERE sci_time_voyage_offshore_id  = @ScitimeVoyageoffshorelId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
    async function updateTimeVoyageoffshoreData(req,res){
            
        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updateoffshoreFleet = req.body.updateoffshoreFleet;
        const updatetimeCharter = req.body.updatetimeCharter;
        const updatevoyageCharter = req.body. updatevoyageCharter;
        const updateRevenue = req.body.updateRevenue;
        const  updateAverage = req.body.  updateAverage;
        
        const ScitimeVoyageoffshoreIdOrg  = req.body.ScitimeVoyageoffshoreIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updateoffshoreFleet',updateoffshoreFleet);
        request.input('updatetimeCharter', updatetimeCharter);
        request.input('updatevoyageCharter', updatevoyageCharter);
        request.input('updateRevenue',updateRevenue);
        request.input('updateAverage', updateAverage);
        request.input("userID", userID);
        request.input("ScitimeVoyageoffshoreIdOrg",ScitimeVoyageoffshoreIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_time_voyage_offshore SET financial_year = @updatefinancialYear, total_no_of_offshore_in_fleet = @updateoffshoreFleet,total_no_days_on_offshore_time_charter = @updatetimeCharter,total_no_days_on_offshore_voyage_charter = @updatevoyageCharter,total_revenue_offshore= @updateRevenue,average_earnings_offshore = @updateAverage,updated_by = @userID,updated_date = getDate() WHERE sci_time_voyage_offshore_id = @ScitimeVoyageoffshoreIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
    async function addscilinearVesselavailability(req, res) {
        const { financialYear, totallinearfleet, totalrevenue,averageEarnings, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_vessel_availability_linear WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("totallinearfleet", totallinearfleet);
            request.input("totalrevenue", totalrevenue);
            request.input("averageEarnings", averageEarnings);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_vessel_availability_linear 
                (financial_year, total_no_of_linear_vessels_in_fleet, total_revenue_of_linear_vessels,average_earnings_linear_vessels_perday,created_by)
                OUTPUT INSERTED.sci_vessel_availability_bulk_id
                VALUES (@financialYear, @totallinearfleet, @totalrevenue,@averageEarnings,@userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_vessel_availability_bulk_id});

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getscilinearvesselList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_vessel_availability_linear
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }
    async function getUpdatescilinearvesseldata(req, res) 
    {

        const SciLinearvesselId = req.params.SciLinearvesselId;
        const conn = await pool;
        const request = conn.request();
        request.input("SciLinearvesselId", SciLinearvesselId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_vessel_availability_linear
                    WHERE sci_vessel_availability_bulk_id  = @SciLinearvesselId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }  
    async function updatescilinearvesselAvailabilityData(req,res){
            
        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updatelinearfleet  = req.body.updatelinearfleet ;
        const updateRevenue = req.body.updateRevenue;
        const  updateAverage = req.body.updateAverage;
        
        const SciLinearvesselIdOrg  = req.body.SciLinearvesselIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updatelinearfleet',updatelinearfleet );
        request.input('updateRevenue',updateRevenue);
        request.input('updateAverage', updateAverage);
        request.input("userID", userID);
        request.input("SciLinearvesselIdOrg",SciLinearvesselIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_vessel_availability_linear SET financial_year = @updatefinancialYear, total_no_of_linear_vessels_in_fleet = @updatelinearfleet ,total_revenue_of_linear_vessels = @updateRevenue,average_earnings_linear_vessels_perday = @updateAverage,updated_by = @userID,updated_date = getDate() WHERE sci_vessel_availability_bulk_id = @SciLinearvesselIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 


    async function addvesselprocurementdata(req, res) {
        const { financialYear, newBuiltships, valueOfnewbuiltShips, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_vessel_procurement WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("newBuiltships", newBuiltships);
            request.input("valueOfnewbuiltShips", valueOfnewbuiltShips);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_vessel_procurement
                (financial_year, total_no_of_new_built_ships_procured, value_of_new_built_ships_procured, created_by)
                OUTPUT INSERTED.sci_procurement_id
                VALUES (@financialYear, @newBuiltships, @valueOfnewbuiltShips, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_procurement_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getsciprocurementList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_vessel_procurement
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }

    async function getUpdatesciVesselprocurementdata(req, res) 
    {

        const SciProcurementId = req.params.SciProcurementId;
        const conn = await pool;
        const request = conn.request();
        request.input("SciProcurementId", SciProcurementId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_vessel_procurement
                    WHERE sci_procurement_id  = @SciProcurementId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
    async function submitVesselProcurementdata(req,res){
            
        const data = req.body;
        
        const updateFinancialyear = req.body.updateFinancialyear;
        const updateShipsProcured  = req.body.updateShipsProcured ;
        const updateValueshipsprocured = req.body.updateValueshipsprocured;
        const SciProcurementIdOrg  = req.body.SciProcurementIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updateFinancialyear', updateFinancialyear);
        request.input('updateShipsProcured',updateShipsProcured );
        request.input('updateValueshipsprocured',updateValueshipsprocured);
        request.input("userID", userID);
        request.input("SciProcurementIdOrg",SciProcurementIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_vessel_procurement SET financial_year = @updateFinancialyear, total_no_of_new_built_ships_procured = @updateShipsProcured ,value_of_new_built_ships_procured = @updateValueshipsprocured,updated_by = @userID,updated_date = getDate() WHERE sci_procurement_id = @SciProcurementIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 
    async function addSecondhandvesselprocurementdata(req, res) {
        const {  financialYear, noofSecondhandships, averageageofSecondhandships,grossvalueOfsecondhandships, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear",  financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_secondhand_vessel_procurement WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("noofSecondhandships", noofSecondhandships);
            request.input("averageageofSecondhandships", averageageofSecondhandships);
            request.input("grossvalueOfsecondhandships", grossvalueOfsecondhandships);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_secondhand_vessel_procurement
                (financial_year, total_no_of_secondhand_ships_procured, average_age_of_secondhand_ships_procured,gross_value_of_secondhand_ships_procured, created_by)
                OUTPUT INSERTED.sci_secondhand_procurement_id
                VALUES (@financialYear, @noofSecondhandships, @averageageofSecondhandships,@grossvalueOfsecondhandships, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_secondhand_procurement_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    async function getsecondhandsciprocurementList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_secondhand_vessel_procurement
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }

    async function getUpdatescisecondhandVesselprocurementdata(req, res) 
    {

        const ScisecondhandProcurementId = req.params.ScisecondhandProcurementId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScisecondhandProcurementId", ScisecondhandProcurementId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_secondhand_vessel_procurement
                    WHERE sci_secondhand_procurement_id  = @ScisecondhandProcurementId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }

    async function updatesecondhandVesselProcurementdata(req,res){
            
        const data = req.body;
        
        const updateFinancialyear = req.body.updateFinancialyear;
        const updateNoofSecondhandships  = req.body.updateNoofSecondhandships ;
        const updateaverageageofSecondhandships = req.body.updateaverageageofSecondhandships;
        const updateGrossvalueofSecondhandships = req.body.updateGrossvalueofSecondhandships;
        const ScisecondhandProcurementIdOrg  = req.body.ScisecondhandProcurementIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updateFinancialyear', updateFinancialyear);
        request.input('updateNoofSecondhandships',updateNoofSecondhandships );
        request.input('updateaverageageofSecondhandships',updateaverageageofSecondhandships);
        request.input('updateGrossvalueofSecondhandships',updateGrossvalueofSecondhandships);
        request.input("userID", userID);
        request.input("ScisecondhandProcurementIdOrg",ScisecondhandProcurementIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_secondhand_vessel_procurement SET financial_year = @updateFinancialyear, total_no_of_secondhand_ships_procured = @updateNoofSecondhandships ,average_age_of_secondhand_ships_procured = @updateaverageageofSecondhandships,gross_value_of_secondhand_ships_procured = @updateGrossvalueofSecondhandships, updated_by = @userID,updated_date = getDate() WHERE sci_secondhand_procurement_id = @ScisecondhandProcurementIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 

    async function addshipDrydocking(req, res) {
        const { financialYear, dryDockingscheduled, dryDockingscompleted, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_ship_dry_docking WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("dryDockingscheduled", dryDockingscheduled);
            request.input("dryDockingscompleted", dryDockingscompleted);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_ship_dry_docking 
                (financial_year, total_dry_docking_scheduled, total_dry_docking_completed, created_by)
                OUTPUT INSERTED.sci_ship_dry_docking_id
                VALUES (@financialYear, @dryDockingscheduled, @dryDockingscompleted, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_ship_dry_docking_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getShipdrydockList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_ship_dry_docking
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }
    async function getUpdateshipdrydockdata(req, res) 
    {

        const SciDrydockId = req.params.SciDrydockId;
        const conn = await pool;
        const request = conn.request();
        request.input("SciDrydockId", SciDrydockId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_ship_dry_docking
                    WHERE sci_ship_dry_docking_id  = @SciDrydockId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 
    async function updatesciDrydockingtData(req,res){
            
        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updatedryDockingscheduled  = req.body.updatedryDockingscheduled ;
        const updatedryDockingscompleted = req.body.updatedryDockingscompleted;
        const SciDrydockIdOrg  = req.body.SciDrydockIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updatedryDockingscheduled',updatedryDockingscheduled );
        request.input('updatedryDockingscompleted',updatedryDockingscompleted);
        request.input("userID", userID);
        request.input("SciDrydockIdOrg",SciDrydockIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_ship_dry_docking SET financial_year = @updatefinancialYear, total_dry_docking_scheduled = @updatedryDockingscheduled ,total_dry_docking_completed = @updatedryDockingscompleted, updated_by = @userID,updated_date = getDate() WHERE sci_ship_dry_docking_id = @SciDrydockIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 
    async function addshipRepaiandMaintanace(req, res) {
        const {  financialYear, repairCosts, operationalRevenue,repairPercentage, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_repair_and_maintanace WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }
        
            request.input("repairCosts", repairCosts);
            request.input("operationalRevenue", operationalRevenue);
            request.input("repairPercentage", repairPercentage);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_repair_and_maintanace 
                (financial_year, total_repair_and_maintanace_cost, total_operational_revenue,percentage_repair_and_maintanace_cost, created_by)
                OUTPUT INSERTED.sci_repair_and_maintanace_id
                VALUES (@financialYear, @repairCosts, @operationalRevenue,@repairPercentage, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_repair_and_maintanace_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getShiprepairandMaintanaceList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_repair_and_maintanace
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }
    async function getUpdateshiprepairandMaintanacedata(req, res) 
    {

        const ScirepairandMaintanaceId = req.params.ScirepairandMaintanaceId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScirepairandMaintanaceId", ScirepairandMaintanaceId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_repair_and_maintanace
                    WHERE sci_repair_and_maintanace_id  = @ScirepairandMaintanaceId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 
    async function updaterepairandMaintanceData(req,res){
            
        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updaterepairCosts  = req.body.updaterepairCosts ;
        const updateoperationalRevenue = req.body.updateoperationalRevenue;
        const updaterepairPercentage = req.body.updaterepairPercentage;
        const ScirepairandMaintanaceIdOrg  = req.body.ScirepairandMaintanaceIdOrg ;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear', updatefinancialYear);
        request.input('updaterepairCosts',updaterepairCosts);
        request.input('updateoperationalRevenue',updateoperationalRevenue);
        request.input('updaterepairPercentage',updaterepairPercentage);
        request.input("userID", userID);
        request.input("ScirepairandMaintanaceIdOrg",ScirepairandMaintanaceIdOrg);

        

        try {
            const result = await request.query(`UPDATE tbl_sci_repair_and_maintanace SET financial_year = @updatefinancialYear, total_repair_and_maintanace_cost = @updaterepairCosts ,total_operational_revenue = @updateoperationalRevenue,percentage_repair_and_maintanace_cost = @updaterepairPercentage, updated_by = @userID,updated_date = getDate() WHERE sci_repair_and_maintanace_id = @ScirepairandMaintanaceIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 

    async function addsaleandRecycling(req, res) {
        const {  financialYear, noOfoldvessels, valueOfsale,averageAge, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_sale_and_recycling_oldvessels WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }

            
            request.input("noOfoldvessels", noOfoldvessels);
            request.input("valueOfsale", valueOfsale);
            request.input("averageAge", averageAge);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_sale_and_recycling_oldvessels
                (financial_year, no_of_old_vessels_sold, value_of_sale_proceeds,avg_age_of_old_vessels_sold, created_by)
                OUTPUT INSERTED.sci_sale_recycling_id
                VALUES (@financialYear, @noOfoldvessels, @valueOfsale,@averageAge, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_sale_recycling_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getSaleandrecyclingList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_sale_and_recycling_oldvessels
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }
    async function getUpdatescisaleandRecyclingdata(req, res) 
    {

        const ScisaleRecyclingId= req.params.ScisaleRecyclingId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScisaleRecyclingId", ScisaleRecyclingId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_sale_and_recycling_oldvessels
                    WHERE sci_sale_recycling_id  = @ScisaleRecyclingId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 
    async function updatesaleandRecyclingData(req,res){
            
        const data = req.body;
        
        const  updateFinancialyear = req.body.updateFinancialyear;
        const updatenoOfoldvessels  = req.body.updatenoOfoldvessels ;
        const updatevalueOfsale = req.body.updatevalueOfsale;
        const updateaverageAge = req.body.updateaverageAge;
        const ScisaleRecyclingIdOrg  = req.body.ScisaleRecyclingIdOrg;

        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('updateFinancialyear',updateFinancialyear);
        request.input('updatenoOfoldvessels',updatenoOfoldvessels);
        request.input('updatevalueOfsale',updatevalueOfsale);
        request.input('updateaverageAge',updateaverageAge);
        request.input("userID", userID);
        request.input("ScisaleRecyclingIdOrg",ScisaleRecyclingIdOrg);  

        try {
            const result = await request.query(`UPDATE tbl_sci_sale_and_recycling_oldvessels SET financial_year = @updateFinancialyear,no_of_old_vessels_sold = @updatenoOfoldvessels ,value_of_sale_proceeds = @updatevalueOfsale,avg_age_of_old_vessels_sold = @updateaverageAge, updated_by = @userID,updated_date = getDate() WHERE sci_sale_recycling_id = @ScisaleRecyclingIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    } 

    async function addsaleandRecyclingofgreenRecycling(req, res) {
        const {  financialYear, vesselssold, valueofVessels,adherencetoGreenrecycling, userID } = req.body;
        console.log("Received data:", req.body);

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);

            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling WHERE financial_year = @financialYear
            `);

            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            }     
        
            request.input("vesselssold", vesselssold);
            request.input("valueofVessels",valueofVessels);
            request.input("adherencetoGreenrecycling", adherencetoGreenrecycling);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_sci_sale_and_recycling_oldvessels_green_recycling
                (financial_year, no_of_old_vessels_sold_for_recycling, value_of_recycled_vessels,adherence_green_recycling, created_by)
                OUTPUT INSERTED.sci_sale_green_recycling_id
                VALUES (@financialYear, @vesselssold, @valueofVessels,@adherencetoGreenrecycling, @userID)
            `);

            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_sale_green_recycling_id });

        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getSaleandGreenrecyclingList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    }

    async function getUpdatescisaleandGreenrecyclingdata(req, res) 
            {
            
                const ScisaleGreenrecyclingId = req.params.ScisaleGreenrecyclingId;
                const conn = await pool;
                const request = conn.request();
                request.input("ScisaleGreenrecyclingId", ScisaleGreenrecyclingId);
            
                try {
                    const result = await request.query(`
                        SELECT 
                            *
                        FROM 
                            tbl_sci_sale_and_recycling_oldvessels_green_recycling
                            WHERE sci_sale_green_recycling_id = @ScisaleGreenrecyclingId
                    `);
            
                    res.json(result.recordset);
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
       }
   async function updatesaleandGreenrecyclingData(req,res){
        
            const data = req.body;
            
            const  updateFinancialyear = req.body.updateFinancialyear;
            const updatevesselssold  = req.body.updatevesselssold;
            const updatevalueofVessels = req.body.updatevalueofVessels;
            const updateadherencetoGreenrecycling = req.body.updateadherencetoGreenrecycling;
            const ScisaleGreenrecyclingIdOrg  = req.body.ScisaleGreenrecyclingIdOrg;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updateFinancialyear',updateFinancialyear);
            request.input('updatevesselssold',updatevesselssold);
            request.input('updatevalueofVessels',updatevalueofVessels);
            request.input('updateadherencetoGreenrecycling',updateadherencetoGreenrecycling);
            request.input("userID", userID);
            request.input("ScisaleGreenrecyclingIdOrg",ScisaleGreenrecyclingIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_sci_sale_and_recycling_oldvessels_green_recycling SET financial_year = @updateFinancialyear,no_of_old_vessels_sold_for_recycling = @updatevesselssold ,value_of_recycled_vessels = @updatevalueofVessels,adherence_green_recycling = @updateadherencetoGreenrecycling, updated_by = @userID,updated_date = getDate() WHERE sci_sale_green_recycling_id = @ScisaleGreenrecyclingIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
   } 
  
//     async function addmanningofOwnedships(req, res) {

//             const {  financialYear, noofVesselsaudited, noofShipsfullycomplaint,compliance, userID } = req.body;
//             console.log("Received data:", req.body);
        
//             try {
//                 const conn = await pool;
//                 const request = conn.request();
//                 request.input("financialYear", financialYear);
        
//                 // Check if financial year already exists
//                 const result = await request.query(`
//                     SELECT COUNT(*) AS count FROM tbl_sci_manning_of_owned_ships WHERE financial_year = @financialYear
//                 `);
        
//                 if (result.recordset[0].count > 0) {
//                     return res.status(205).json({ error: "Data already exists for the selected financial year!" });
//                 }
        
                
              
//                 request.input("noofVesselsaudited", noofVesselsaudited);
//                 request.input("noofShipsfullycomplaint",noofShipsfullycomplaint);
//                 request.input("compliance", compliance);
//                 request.input("userID", userID);
        
//                 const insertResult = await request.query(`
//                     INSERT INTO tbl_sci_manning_of_owned_ships
//                     (financial_year, no_of_old_vessels_audited_compliance, no_of_ships_fully_complaint_stwc_and_mlc,compliance, created_by)
//                     OUTPUT INSERTED.sci_manning_id
//                     VALUES (@financialYear, @noofVesselsaudited, @noofShipsfullycomplaint,@compliance, @userID)
//                 `);
        
//                 res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_manning_id });
        
//             } catch (error) {
//                 console.error("Error inserting data:", error);
//                 res.status(500).json({ error: "Internal server error" });
//             }
//    }
async function addmanningofOwnedships(req, res) {
    const { financialYear, noofVesselsaudited, noofShipsfullycomplaint, userID } = req.body;
    console.log("Received data:", req.body);

    try {
        // Calculate compliance percentage
        const compliance = (noofShipsfullycomplaint / noofVesselsaudited) * 100;
        console.log(`Calculated compliance: ${compliance}%`);

        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear);

        // Check if financial year already exists
        const result = await request.query(`
            SELECT COUNT(*) AS count FROM tbl_sci_manning_of_owned_ships WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.status(205).json({ error: "Data already exists for the selected financial year!" });
        }

        request.input("noofVesselsaudited", noofVesselsaudited);
        request.input("noofShipsfullycomplaint", noofShipsfullycomplaint);
        request.input("compliance", compliance);
        request.input("userID", userID);
        console.log();

        const insertResult = await request.query(`
            INSERT INTO tbl_sci_manning_of_owned_ships
            (financial_year, no_of_old_vessels_audited_compliance, no_of_ships_fully_complaint_stwc_and_mlc, compliance, created_by)
            OUTPUT INSERTED.sci_manning_id
            VALUES (@financialYear, @noofVesselsaudited, @noofShipsfullycomplaint, @compliance, @userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_manning_id });

    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


    async function getscimanningdataList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_sci_manning_of_owned_ships
            ORDER BY financial_year DESC;
        `);
    
        res.json(result.recordset);
    }
    async function getUpdatescimanningodOwnedshipsdata(req, res) 
    {

        const ScimanningId = req.params.ScimanningId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScimanningId", ScimanningId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_manning_of_owned_ships
                    WHERE sci_manning_id  = @ScimanningId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
    async function updatemanningofOwnedshipsData(req, res) {
        try {
            const { updatefinancialYear, updatenoofVesselsaudited, updatenoofShipsfullycomplaint, ScimanningIdOrg, userID } = req.body;
            
            console.log("Received update request:", req.body);

            // Calculate compliance percentage dynamically
            const updatecompliance = (updatenoofShipsfullycomplaint / updatenoofVesselsaudited) * 100;
            console.log(`Calculated updatecompliance: ${updatecompliance}%`);
    
            const conn = await pool;
            const request = conn.request();
    
            request.input("updatefinancialYear", updatefinancialYear);
            request.input("updatenoofVesselsaudited", updatenoofVesselsaudited);
            request.input("updatenoofShipsfullycomplaint", updatenoofShipsfullycomplaint);
            request.input("updatecompliance", updatecompliance);
            request.input("userID", userID);
            request.input("ScimanningIdOrg", ScimanningIdOrg);
    
            console.log("Updating data in database...");
            const result = await request.query(`
                UPDATE tbl_sci_manning_of_owned_ships 
                SET financial_year = @updatefinancialYear, 
                    no_of_old_vessels_audited_compliance = @updatenoofVesselsaudited, 
                    no_of_ships_fully_complaint_stwc_and_mlc = @updatenoofShipsfullycomplaint, 
                    compliance = @updatecompliance, 
                    updated_by = @userID, 
                    updated_date = GETDATE() 
                WHERE sci_manning_id = @ScimanningIdOrg
            `);
    
            console.log("Update successful.");
            return res.sendStatus(200);
        } catch (err) {
            console.error("Error updating data:", err);
            return res.sendStatus(500);
        }
    }
    
    async function addshipManagementBusiness(req, res) {
        const {  financialYear, noofShipsManaged, totalManagementcost,revenue,costtoRevenueratio, userID } = req.body;
        console.log("Received data:", req.body);
    
        try {
            const conn = await pool;
            const request = conn.request();
            request.input("financialYear", financialYear);
    
            // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_sci_ship_management_business WHERE financial_year = @financialYear
            `);
    
            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            } 
        
            request.input("noofShipsManaged", noofShipsManaged);
            request.input("totalManagementcost",totalManagementcost);
            request.input("revenue", revenue);
            request.input("costtoRevenueratio", costtoRevenueratio);
            request.input("userID", userID);
    
            const insertResult = await request.query(`
                INSERT INTO tbl_sci_ship_management_business
                (financial_year, no_of_ships_managed_by_sci, total_management_cost,revenue_from_managing_ships,cost_to_revenue_ratio, created_by)
                OUTPUT INSERTED.sci_ship_management_id
                VALUES (@financialYear, @noofShipsManaged, @totalManagementcost,@revenue,@costtoRevenueratio, @userID)
            `);
    
            res.status(201).json({ insertedYPId: insertResult.recordset[0].sci_ship_management_id });
    
        } catch (error) {
            console.error("Error inserting data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async function getshipmanagementList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_sci_ship_management_business
            ORDER BY financial_year DESC;
        `);
    
        res.json(result.recordset);
    }

    async function getUpdatescishipManagementdata(req, res) 
    {

        const ScishipmanagementId = req.params.ScishipmanagementId;
        const conn = await pool;
        const request = conn.request();
        request.input("ScishipmanagementId", ScishipmanagementId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_sci_ship_management_business
                    WHERE sci_ship_management_id  = @ScishipmanagementId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
        
    async function updateshipManagementbusinessData(req,res){
    
        const data = req.body;
        
        const updateFinancialyear = req.body.updateFinancialyear;
        const updatenoofShipsManaged = req.body.updatenoofShipsManaged;
        const  updatetotalManagementcost = req.body.updatetotalManagementcost;
        const  updaterevenue = req.body.updaterevenue;
        const  updatecosttoRevenueratio = req.body.updatecosttoRevenueratio;
        const ScishipmanagementIdOrg  = req.body.ScishipmanagementIdOrg ;
    
        const userID = req.body.userID;
    
    
        const conn = await pool;
        const request = conn.request();
        request.input('updateFinancialyear',updateFinancialyear);
        request.input('updatenoofShipsManaged',updatenoofShipsManaged);
        request.input('updatetotalManagementcost',updatetotalManagementcost);
        request.input('updaterevenue',updaterevenue);
        request.input('updatecosttoRevenueratio',updatecosttoRevenueratio);
        request.input("userID", userID);
        request.input("ScishipmanagementIdOrg",ScishipmanagementIdOrg);
    
        
    
        try {
            const result = await request.query(`UPDATE tbl_sci_ship_management_business SET financial_year = @updateFinancialyear, no_of_ships_managed_by_sci = @updatenoofShipsManaged,total_management_cost = @updatetotalManagementcost,revenue_from_managing_ships = @updaterevenue,cost_to_revenue_ratio = @updatecosttoRevenueratio,updated_by = @userID,updated_date = getDate() WHERE sci_ship_management_id  = @ScishipmanagementIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
export default {addVesselAvailabiltydata,getsciVesselList,getUpdatesciVesseldata,updatesciVesselData,addscitimeVoyageydata,getscitimeVoyageList,getUpdatescitimeVoyageBulkdata,updatescitimeVoyageBulkData,addscitimeVoyagetankers,getscitimeList,getUpdatesciVessetankerldata,updateTimeVoyagetankerData,addscitimeVoyageoffshore,getscioffshoreList,getUpdatesciVesseoffshoreldata,updateTimeVoyageoffshoreData,
    addscilinearVesselavailability,getscilinearvesselList,getUpdatescilinearvesseldata,updatescilinearvesselAvailabilityData,addvesselprocurementdata,getsciprocurementList,getUpdatesciVesselprocurementdata,submitVesselProcurementdata,addSecondhandvesselprocurementdata,getsecondhandsciprocurementList,getUpdatescisecondhandVesselprocurementdata,updatesecondhandVesselProcurementdata,addshipDrydocking,
    getShipdrydockList,getUpdateshipdrydockdata,updatesciDrydockingtData,addshipRepaiandMaintanace,getShiprepairandMaintanaceList,getUpdateshiprepairandMaintanacedata,updaterepairandMaintanceData,addsaleandRecycling,getSaleandrecyclingList,getUpdatescisaleandRecyclingdata,updatesaleandRecyclingData,addsaleandRecyclingofgreenRecycling,getSaleandGreenrecyclingList,getUpdatescisaleandGreenrecyclingdata,
    updatesaleandGreenrecyclingData,addmanningofOwnedships,getscimanningdataList,getUpdatescimanningodOwnedshipsdata,updatemanningofOwnedshipsData,addshipManagementBusiness,getshipmanagementList,getUpdatescishipManagementdata,updateshipManagementbusinessData};