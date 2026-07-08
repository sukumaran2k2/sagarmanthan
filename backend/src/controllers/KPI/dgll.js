import { pool } from "../../db.js";
import path from 'path';
import fs from 'fs';

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
    const userID = req.body.userID;

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

    const result = await request.query(`
        INSERT INTO tbl_light_house_master (alol,light_house_name,light_status,commisioned_date,state_id,district_id,latitude,longitude,created_by)
        OUTPUT INSERTED.lights_house_id
        VALUES (@alol, @lightsName, @status, @dateOfCommissioning, @state, @district, @latitude, @longitude, @userID)
    `);

    const insertedYPId = result.recordset[0].lights_house_id;
    res.status(201).json({ insertedYPId });

} 

async function getLightHouseMaster(req, res) {
    const userID = req.params.userID;
    console.log(userID,"userID")
    const conn = await pool; 
    const request = conn.request();

    try {
    
        request.input('userID', userID);
        const result = await conn.query(`SELECT lights_house_id, alol,light_house_name,light_status,commisioned_date, mmt_state.state_name, mmt_district.district_name ,
        latitude, longitude,created_by,updated_date
        
        from tbl_light_house_master
        Left JOIN mmt_state on mmt_state.state_id = tbl_light_house_master.state_id
        Left JOIN mmt_district on mmt_district.district_id = tbl_light_house_master.district_id;`);
        // console.log(result.recordset);
        res.json(result.recordset);
    }
    
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
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
        console.log(err);
        return res.sendStatus(500);
    }
};


async function updateLightsHousedata(req,res){
    
    const data = req.body;
    // console.log("data",data);
    
    const alolName = req.body.alolName;
    const lightHouseName = req.body.lightHouseName;
    const status = req.body.status;
    const updateDateOfCommissioning = req.body.updateDateOfCommissioning;
    const updateState = req.body.updateState;
    const updateDistrict  = req.body.updateDistrict ;
    const updateLatitude = req.body.updateLatitude;
    const updateLongitude = req.body.updateLongitude;
    const lightHouseIdIdOrg = req.body.lightHouseIdIdOrg;
    const userID = req.body.userID;


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
        const result = await request.query(`UPDATE tbl_light_house_master SET alol = @alolName, light_house_name = @lightHouseName,
        light_status = @status, commisioned_date = @updateDateOfCommissioning,state_id = @updateState, district_id = @updateDistrict ,latitude = @updateLatitude,longitude = @updateLongitude,updated_by = @userID,updated_date = getDate() WHERE lights_house_id  = @lightHouseIdIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function addHydrographicSurvey(req, res) 
{   

    const financialYear = req.body.financialYear;
    const hydrographicSurveys = req.body.hydrographicSurveys;
    const navigationalCharts = req.body.navigationalCharts;
    const userID = req.body.userID;
    
   
    console.log(userID,"userID")

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);
    request.input("hydrographicSurveys", hydrographicSurveys);
    request.input("navigationalCharts", navigationalCharts);
    request.input("userID", userID);
  
    const result = await request.query(`
        INSERT INTO tbl_hydrographic_surveys (financial_year,number_of_hydrograpic_surveys,number_of_navigation_chart,created_by)
        OUTPUT INSERTED.hydrographic_id
        VALUES (@financialYear, @hydrographicSurveys, @navigationalCharts,@userID)
    `);

    const insertedYPId = result.recordset[0].hydrographic_id;
    res.status(201).json({ insertedYPId });

} 

async function getHydrographicsurvey(req, res) 
{
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_hydrographic_surveys;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching hydrographic surveys:", err);
        res.sendStatus(500);
    }
}

async function getUpdatehydrographicdata(req, res) 
{

    const HydrographicId = req.params.HydrographicId;
    const conn = await pool;
    const request = conn.request();
    request.input("HydrographicId", HydrographicId);

    try {
        const result = await request.query(`
            SELECT 
                *
            FROM 
                tbl_hydrographic_surveys
                WHERE hydrographic_id  = @HydrographicId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

    
async function updateHydrographicSurveyData(req,res){
    // const HydrographicId = req.params.HydrographicId;
    const data = req.body;
    console.log("data",data);
    
    const updateFinancialYear = req.body.updateFinancialYear;
    const updateHydrographicData = req.body.updateHydrographicData;
    const updateNavigationalCharts = req.body.updateNavigationalCharts;
    const HydrographicIdOrg = req.body.HydrographicIdOrg;

    const userID = req.body.userID;


    const conn = await pool;
    const request = conn.request();
    // request.input('HydrographicId',HydrographicId);
    request.input('updateFinancialYear', updateFinancialYear);
    request.input('updateHydrographicData', updateHydrographicData);
    request.input('updateNavigationalCharts', updateNavigationalCharts);
    request.input("userID", userID);
    request.input("HydrographicIdOrg", HydrographicIdOrg);

    

    try {
        const result = await request.query(`UPDATE tbl_hydrographic_surveys SET financial_year = @updateFinancialYear, number_of_hydrograpic_surveys = @updateHydrographicData,
        number_of_navigation_chart = @updateNavigationalCharts, updated_by = @userID,updated_date = getDate() WHERE hydrographic_id  = @HydrographicIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function addVesselAccidents(req, res) {
    const financialYear = req.body.financialYear;
    const vesselAccidents = req.body.vesselAccidents;
    const userID = req.body.userID;
    console.log(userID,"user")

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);
    request.input("vesselAccidents", vesselAccidents);
    request.input("userID", userID);

    const result = await request.query(`
        INSERT INTO tbl_vessel_accidents (financial_year,number_of_vessel_accidents,created_by)
        OUTPUT INSERTED.vessel_id
        VALUES (@financialYear, @vesselAccidents,@userID)
    `);

    const insertedYPId = result.recordset[0].vessel_id;
    res.status(201).json({ insertedYPId });

} 

async function getVesselAccidents(req, res) 
{
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_vessel_accidents;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching Vessel Accidents:", err);
        res.sendStatus(500);
    }
}
   
async function getUpdateVesselAccidentsdata(req, res) 
{    
    const VesselId = req.params.VesselId;
    const conn = await pool;
    const request = conn.request();
    request.input("VesselId", VesselId);

    try {
        const result = await request.query(`
            SELECT 
                *
            FROM 
                tbl_vessel_accidents
                WHERE vessel_id  = @VesselId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateVesselData(req,res)
{        
    const data = req.body;
    console.log("data",data);
    
    const updateVesselFinancialYear = req.body.updateVesselFinancialYear;
    const updateVesselAccidentsdata = req.body.updateVesselAccidentsdata;
    const  VesselIdOrg = req.body. VesselIdOrg;

    const userID = req.body.userID;


    const conn = await pool;
    const request = conn.request();
    // request.input('HydrographicId',HydrographicId);
    request.input('updateVesselFinancialYear', updateVesselFinancialYear);
    request.input('updateVesselAccidentsdata', updateVesselAccidentsdata);
    request.input("userID", userID);
    request.input("VesselIdOrg",  VesselIdOrg);

    try {
        const result = await request.query(`UPDATE tbl_vessel_accidents SET financial_year = @updateVesselFinancialYear, number_of_vessel_accidents = @updateVesselAccidentsdata,updated_by = @userID,updated_date = getDate() WHERE vessel_id  = @VesselIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



async function addVtmsIntegration(req, res) {
    const { financialYear, vtmsIntegration, userID } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);

        const result = await request.query(`
            SELECT COUNT(*) as count FROM tbl_vtms_integration 
            WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            // If data already exists, return a 205 response
            res.sendStatus(205);
        } else {
            // If no data exists, proceed with insertion
            request.input("vtmsIntegration", vtmsIntegration);
            request.input("userID", userID);

            const insertResult = await request.query(`
                INSERT INTO tbl_vtms_integration (financial_year, no_of_ports_vtms_integrated, created_by)
                OUTPUT INSERTED.vtms_id
                VALUES (@financialYear, @vtmsIntegration, @userID)
            `);

            res.sendStatus(201);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data." });
    }
}

    
async function getVtmsIntegration(req, res) 
{ 

    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_vtms_integration
            ORDER BY financial_year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching Vtms Integration:", err);
        res.sendStatus(500);
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
        console.log(err);
        return res.sendStatus(500);
    }
};
    
async function updateVtmsData(req,res){
    
    const data = req.body;
    console.log("data",data);
    
    const updatevtmsfinancialYear = req.body.updatevtmsfinancialYear;
    const updateVtmsSystem = req.body.updateVtmsSystem;
    const  VtmsIdOrg  = req.body. VtmsIdOrg ;

    const userID = req.body.userID;


    const conn = await pool;
    const request = conn.request();
    request.input('updatevtmsfinancialYear', updatevtmsfinancialYear);
    request.input('updateVtmsSystem',updateVtmsSystem);
    request.input("userID", userID);
    request.input("VtmsIdOrg",  VtmsIdOrg );

    

    try {
        const result = await request.query(`UPDATE tbl_vtms_integration SET financial_year = @updatevtmsfinancialYear, no_of_ports_vtms_integrated = @updateVtmsSystem,updated_by = @userID,updated_date = getDate() WHERE vtms_id  = @VtmsIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function addNaisUptime(req, res) {
    const { financialYear, naisAvailability, userID } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);

        // Check if financial year already exists
        const result = await request.query(`
            SELECT COUNT(*) AS count FROM tbl_nais_uptime WHERE financial_year = @financialYear
        `);

        if (result.recordset[0].count > 0) {
            return res.sendStatus(205); // Data already exists
        }

        // Proceed with insert if no conflict
        request.input("naisAvailability", naisAvailability);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_nais_uptime (financial_year, availability_of_nais, created_by)
            OUTPUT INSERTED.nais_id
            VALUES (@financialYear, @naisAvailability, @userID)
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
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_nais_uptime
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error("Error fetching NAIS Uptime:", err);
                res.sendStatus(500);
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
                console.log(err);
                return res.sendStatus(500);
            }
        };
    
        async function updateNaisData(req,res){
        
            const data = req.body;
            console.log("data",data);
            
            const updatenaisfinancialYear = req.body.updatenaisfinancialYear;
            const updateNaisUptime = req.body.updateNaisUptime;
            const NaisIdOrg  = req.body.NaisIdOrg ;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updatenaisfinancialYear', updatenaisfinancialYear);
            request.input('updateNaisUptime',updateNaisUptime);
            request.input("userID", userID);
            request.input("NaisIdOrg",NaisIdOrg);
        
            
        
            try {
                const result = await request.query(`UPDATE tbl_nais_uptime SET financial_year = @updatenaisfinancialYear, availability_of_nais = @updateNaisUptime,updated_by = @userID,updated_date = getDate() WHERE nais_id  = @NaisIdOrg`);
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
        
        async function addNAISIntegration(req, res) {
            const { financialYear, NAISintegration, NAISupgraded, userID } = req.body;
            console.log("User ID:", userID);
        
            try {
                const conn = await pool;
                const request = conn.request();
                request.input("financialYear", financialYear);
        
                // Check if the financial year already exists
                const result = await request.query(`
                    SELECT COUNT(*) AS count FROM tbl_nais_integration WHERE financial_year = @financialYear
                `);
        
                if (result.recordset[0].count > 0) {
                    return res.sendStatus(205); // Data already exists
                }
        
                // Proceed with insert if no conflict
                request.input("NAISintegration", NAISintegration);
                request.input("NAISupgraded", NAISupgraded);
                request.input("userID", userID);
        
                const insertResult = await request.query(`
                    INSERT INTO tbl_nais_integration (financial_year, nais_integrated_with_nmda, no_of_nais_upgraded, created_by)
                    OUTPUT INSERTED.nais_integration_id
                    VALUES (@financialYear, @NAISintegration, @NAISupgraded, @userID)
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
                const request = conn.request();
        
                const result = await request.query(`
                    SELECT * FROM tbl_nais_integration
                    ORDER BY financial_year DESC;
                `);
        
                res.json(result.recordset);
            } catch (err) {
                console.error("Error fetching NAIS Integration:", err);
                res.sendStatus(500);
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
                console.log(err);
                return res.sendStatus(500);
            }
        }

        
        async function updateNaisIntegrationData(req,res){
        
            const data = req.body;
            
            const updateFinancialYear = req.body.updateFinancialYear;
            const updateNAISintegrationdata = req.body.updateNAISintegrationdata;
            const updateNAISystem = req.body.updateNAISystem;
            const NaisIntegrationIdOrg  = req.body.NaisIntegrationIdOrg ;
        
            const userID = req.body.userID;
        
        
            const conn = await pool;
            const request = conn.request();
            request.input('updateFinancialYear', updateFinancialYear);
            request.input('updateNAISintegrationdata',updateNAISintegrationdata);
            request.input('updateNAISystem',updateNAISystem);
            request.input("userID", userID);
            request.input("NaisIntegrationIdOrg",NaisIntegrationIdOrg);
        
            
        
            try {
                const result = await request.query('UPDATE tbl_nais_integration SET financial_year = @updateFinancialYear, nais_integrated_with_nmda = @updateNAISintegrationdata,no_of_nais_upgraded = @updateNAISystem,updated_by = @userID,updated_date = getDate() WHERE nais_integration_id  = @NaisIntegrationIdOrg');
                return res.sendStatus(200);
            }
            catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        }
        async function addTouristDestinations(req, res) {
            const {financialYears, lighthouseDeveloped, annualTourist, userID} = req.body;
            console.log("response", financialYears);
            const conn = await pool;
            const request = conn.request();
            
            try {
                console.log("userID", userID);
                request.input("financialYears", financialYears);

                const result = await request.query(`
                    SELECT COUNT(*) AS count FROM tbl_kpi_dgll_3_5_1 WHERE finacial_year = @financialYears
                `);
                    console.log('result', result);
                
                request.input("lighthouseDeveloped", lighthouseDeveloped);
                request.input('annualTourist', annualTourist);
                request.input("userID", userID);

                const insertResult = await request.query (`
                    INSERT INTO tbl_kpi_dgll_3_5_1 (finacial_year, no_lighthouses_developed_tourist_destination, annual_tourist_footfall, created_by)
                    OUTPUT INSERTED.tourist_destination_id
                    VALUES (@financialYears, @lighthouseDeveloped, @annualTourist, @userID)
                    `);
                    res.status(201).json({insertedID: insertResult.recordset[0].tourist_destination_id})
            
        } catch (error){
                res.status(500).json({ error: "Internal server error" });
            }
        }



       async function getTouristDestinations(req, res) {
        
        try{
            const conn =await pool;
            const request = conn.request();

            const result = await request.query (`SELECT * FROM tbl_kpi_dgll_3_5_1 ORDER BY finacial_year DESC`);
            res.json(result.recordset);
        } catch(err){
            res.status(500);
            console.log("err", err);
        }
       }



       async function addTargetDetails(req, res) {
        
        const data = req.body;
        console.log("response", data);
        
        const {year, collectionLightDue, footFallLighthouse, userID} = req.body;
        const conn = await pool;
        const request = conn.request();

        try {
            request.input("year", year);
            
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_kpi_dgll_3_5_2 WHERE year = @year
            `);
                
            if (result.recordset[0].count > 0) {
              res.sendStatus(205); // Data already exists
            }
            else{
            request.input("collectionLightDue", collectionLightDue);
            request.input('footFallLighthouse', footFallLighthouse);
            request.input("userID", userID);

            const insertresult = await request.query (`
                INSERT INTO tbl_kpi_dgll_3_5_2 (year, collection_of_light_dues, footfall_in_the_lighthouses, created_by)
                OUTPUT INSERTED.tourist_destination_target_id
                VALUES (@year, @collectionLightDue, @footFallLighthouse, @userID)
                `);
                res.status(201).json({insertedID: insertresult.recordset[0].tourist_destination_id})
        } 
    } catch (error){
            res.status(500).json({ error: "Internal server error" });
            console.log("err", error);
        }

       }




       async function getTargetDetails(req, res) {
        try{
            const conn =await pool;
            const request = conn.request();

            const result = await request.query (`SELECT * FROM tbl_kpi_dgll_3_5_2 ORDER BY year DESC`);
            res.json(result.recordset);
            console.log("result targeted", result);
        } catch(err){
            res.status(500);
            console.log("err", err);
        }
       }







       async function getByIdTouristDestinations(req, res) {
        
        const TouristDestinationsId = req.params.TouristDestinationsId
        console.log("suncheck", TouristDestinationsId);
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
                
            // console.log("from update",result.recordset);
            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.status(500);
        }
       }






       async function UpdateTouristDestinations(req, res) {

        const { userID, updateFinancialYears, updateLighthouseDeveloped, updateAnnualTourist, TouristDestinationsRowId} = req.body;

        console.log("req.body",req.body);

        const conn = await pool;
        const request = conn.request();

        request.input('TouristDestinationsRowId',TouristDestinationsRowId);
        request.input("updateFinancialYears", updateFinancialYears);
        request.input("updateLighthouseDeveloped", updateLighthouseDeveloped);
        request.input("updateAnnualTourist", updateAnnualTourist);
        request.input("userID", userID);

        try{
            const result = await request.query('UPDATE tbl_kpi_dgll_3_5_1 SET finacial_year = @updateFinancialYears, no_lighthouses_developed_tourist_destination = @updateLighthouseDeveloped, annual_tourist_footfall = @updateAnnualTourist, updated_by = @userID, updated_date = getDate() WHERE tourist_destination_id  = @TouristDestinationsRowId');
            console.log("res-sun", result);   
            return res.status(200).json({ message: "Updated successfully" });
        } catch(err) {
            console.log(err);
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
                
            console.log("from update",result.recordset);
            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.status(500);
        }
       }





       async function updateTargetDestinationData(req, res) {
        
        const {TouristDestinationsRowId, updateYear,updateCollectionLightDue,updateFootFallLighthouse, userID}= req.body;
        
        console.log("req.body-targeted", req.body);

        const conn = await pool;
        const request = conn.request();

        request.input('TouristDestinationsRowId',TouristDestinationsRowId);
        request.input("updateYear", updateYear);
        request.input("updateCollectionLightDue", updateCollectionLightDue);
        request.input("updateFootFallLighthouse", updateFootFallLighthouse);
        request.input("userID", userID);

        try{
            const result = await request.query('UPDATE tbl_kpi_dgll_3_5_2 SET year = @updateYear, collection_of_light_dues = @updateCollectionLightDue, footfall_in_the_lighthouses = @updateFootFallLighthouse, updated_by = @userID, updated_date = getDate() WHERE tourist_destination_target_id  = @TouristDestinationsRowId');
            console.log("res-sun", result);    
            return res.status(200).json({message: "Updated successfully"});
               
        } catch(err) {
            console.log(err);
                return res.status(500);
        }
       }



       async function checkFinancialYear(req, res) {
        const financialYears = req.params.financialYears;
        // console.log("financial year sun ", req);
        console.log("financial year sun ", financialYears);
        const conn = await pool;
        const request = conn.request();
        request.input("financialYears", financialYears);

        try {
            const result = await request.query(`
                SELECT COUNT(*) as count
                FROM tbl_kpi_dgll_3_5_1 
                WHERE finacial_year = @financialYears 
            `);
        
            if (result.recordset[0].count > 0) {
                // If data already exists, return a 400 response with an error message
                res.sendStatus(205);
            } 
        
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "An error occurred while checking the data."});
        }
        
       }




       async function checkYear(req, res) {
        
        const year = req.params.year;
        const conn = await pool;
        const request = conn.request();
        request.input("year", year);

        try {
            const result = await request.query (`
                SELECT COUNT(*) as count 
                FROM tbl_kpi_dgll_3_5_2
                WHERE year=@year`);

        if(result.recordset[0].count > 0) {
            res.sendStatus(205);
        } 

        } catch(error){
            console.log(err);
            return res.status(500).json({ message: "An error occurred while checking the data."});
        }
    }

    
async function submitFinancialPerformance(req,res) {
   
        const {financialId,financialYear,lightDuesCollect,revenueFromTourism,subsidesFromGovt,operatingCoasts,capitalExpenditure,tourismDevelopmentCosts,userID,organisationID,organisationName} = req.body;
      
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
            organisation_id = @organisationID,
            organisation_name = @organisationName,
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
            .input("organisationID",organisationID)
            .input("organisationName",organisationName)
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
            insertRequest.input("financialYear", financialYear);
            insertRequest.input("lightDuesCollect", lightDuesCollect);
            insertRequest.input("revenueFromTourism", revenueFromTourism);
            insertRequest.input("subsidesFromGovt", subsidesFromGovt);
            insertRequest.input("operatingCoasts", operatingCoasts);
            insertRequest.input("capitalExpenditure", capitalExpenditure);
            insertRequest.input("tourismDevelopmentCosts", tourismDevelopmentCosts);
            insertRequest.input("organisationID",organisationID);
            insertRequest.input("organisationName",organisationName);
            insertRequest.input("userID", userID);

            const result = await insertRequest.query(insertQuery);
            return res.status(201).json({ message: "Data successfully submitted", insertedId: result.recordset[0].financial_id });   
        }
     } catch (error) {
            console.log("error:", error);
            return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getFinancialPerfomanceData(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`SELECT * FROM tbl_dgll_k_3_6   ORDER BY 
                financialyear DESC 
                `);
    
        res.json(result.recordset);
        } catch (error) {
            console.log("error", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
}

async function getFinancialPerformanceDataByID(req,res) {

    const financialId = req.params.financialId;
    console.log("financialId",financialId)

    try {
        const conn = await pool;
        const request = conn.request();
        request.input('financialId', financialId);
    
        const result = await request.query(`SELECT * FROM tbl_dgll_k_3_6 WHERE financial_id = @financialId`);
    
        res.json(result.recordset);
        } catch (error) {
            console.log("error", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
}

export default {addLightsHouseMaster,getLightHouseMaster,getUpdatelightHouseData,updateLightsHousedata,addHydrographicSurvey,
    getHydrographicsurvey,getUpdatehydrographicdata,updateHydrographicSurveyData,addVesselAccidents,getVesselAccidents,
    getUpdateVesselAccidentsdata,updateVesselData,addVtmsIntegration,getVtmsIntegration,getUpdateVtmsdata,updateVtmsData,
    addNaisUptime,getnaisList,getUpdateNaisdata,updateNaisData,addNAISIntegration,getnaisIntegrationList,
    getUpdateNaisIntegrationdata, updateNaisIntegrationData, addTouristDestinations, getTouristDestinations, addTargetDetails, 
    getTargetDetails, getByIdTouristDestinations, UpdateTouristDestinations,getByIdTargetDestinations, updateTargetDestinationData, 
    checkFinancialYear, checkYear,submitFinancialPerformance,getFinancialPerfomanceData,getFinancialPerformanceDataByID
};