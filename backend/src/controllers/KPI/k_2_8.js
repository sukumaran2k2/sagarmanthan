import { pool } from "../../db.js";

async function submitVesselSurveyData(req, res) {
    const { year, month, mmdId, surveyorsPosted, targetVessels, actualVessels, percentageAchieved, userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("year", year);
        request.input("month", month);
        request.input("mmdId", mmdId);
        request.input("surveyorsPosted", surveyorsPosted);
        request.input("targetVessels", targetVessels);
        request.input("actualVessels", actualVessels);
        request.input("percentageAchieved", percentageAchieved);
        request.input("userId", userId);

        const result = await request.query(`
            INSERT INTO tbl_vessel_survey 
            (year, month, mmd_id, no_of_surveyors_posted, target_no_of_vessels, actual_no_of_vessels, percent_vessel_survey_achieved, created_by, created_date) 
            VALUES (@year, @month, @mmdId, @surveyorsPosted, @targetVessels, @actualVessels, @percentageAchieved, @userId, getDate())
        `);

        if (result.rowsAffected[0] > 0) {
            const checkRequest = conn.request();
            checkRequest.input("year", year);
            checkRequest.input("month", month);

            const checkResult = await checkRequest.query(`
                SELECT id, total_survey_carried 
                FROM tbl_vessel_survey_log 
                WHERE year = @year AND month = @month
            `);

            if (checkResult.recordset.length > 0) {
                const currentTotal = parseInt(checkResult.recordset[0].total_survey_carried, 10) || 0;
                const updatedTotal = currentTotal + parseInt(actualVessels, 10);

                const updateRequest = conn.request();
                updateRequest.input("id", checkResult.recordset[0].id);
                updateRequest.input("updatedTotal", updatedTotal);
                updateRequest.input("userId", userId);

                await updateRequest.query(`
                    UPDATE tbl_vessel_survey_log 
                    SET total_survey_carried = @updatedTotal, 
                        updated_by = @userId, 
                        updated_date = getDate() 
                    WHERE id = @id
                `);
            } else {
                const insertLogRequest = conn.request();
                insertLogRequest.input("year", year);
                insertLogRequest.input("month", month);
                insertLogRequest.input("totalSurveyCarried", parseInt(actualVessels, 10));
                insertLogRequest.input("userId", userId);

                await insertLogRequest.query(`
                    INSERT INTO tbl_vessel_survey_log 
                    (year, month, total_survey_carried, created_by, created_date) 
                    VALUES (@year, @month, @totalSurveyCarried, @userId, getDate())
                `);
            }

            return res.status(201).send("Vessel survey data added and logged successfully.");
        } else {
            return res.status(400).send("Error adding vessel survey data.");
        }
    } catch (error) {
        console.error("Error submitting vessel survey data:", error);
        return res.sendStatus(500);
    }
}


async function getVesselSurveyData(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();
        const query = `
            SELECT 
                vs.id,
                vs.year,
                vs.month,
                mmd.mmd_name,
                vs.no_of_surveyors_posted,
                vs.target_no_of_vessels,
                vs.actual_no_of_vessels,
                vs.percent_vessel_survey_achieved
            FROM 
                tbl_vessel_survey vs
            INNER JOIN 
                mmt_mmd_name mmd ON vs.mmd_id = mmd.mmd_id
            ORDER BY year DESC, month ASC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching vessel survey data:", error);
        res.sendStatus(500);
    }
}


async function updateVesselSurveyData(req, res) {
    const { vesselSurveyId, year, month, mmdId, surveyorsPosted, targetVessels, actualVessels, percentageAchieved, userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("vesselSurveyId", vesselSurveyId);
        request.input("year", year);
        request.input("month", month);
        request.input("mmdId", mmdId);
        request.input("surveyorsPosted", surveyorsPosted);
        request.input("targetVessels", targetVessels);
        request.input("actualVessels", actualVessels);
        request.input("percentageAchieved", percentageAchieved);
        request.input("userId", userId);

        const existingRequest = conn.request();
        existingRequest.input("vesselSurveyId", vesselSurveyId);

        const existingResult = await existingRequest.query(`
            SELECT actual_no_of_vessels 
            FROM tbl_vessel_survey 
            WHERE id = @vesselSurveyId
        `);

        if (existingResult.recordset.length === 0) {
            return res.status(404).json({ message: 'No record found to update.' });
        }

        const previousActualVessels = parseInt(existingResult.recordset[0].actual_no_of_vessels, 10) || 0;
        const difference = parseInt(actualVessels, 10) - previousActualVessels;

        const result = await request.query(`
            UPDATE tbl_vessel_survey
            SET 
                year = @year, 
                month = @month, 
                mmd_id = @mmdId, 
                no_of_surveyors_posted = @surveyorsPosted, 
                target_no_of_vessels = @targetVessels, 
                actual_no_of_vessels = @actualVessels, 
                percent_vessel_survey_achieved = @percentageAchieved, 
                updated_by = @userId, 
                updated_date = getDate()
            WHERE id = @vesselSurveyId
        `);

        if (result.rowsAffected[0] > 0) {
            const checkRequest = conn.request();
            checkRequest.input("year", year);
            checkRequest.input("month", month);

            const checkResult = await checkRequest.query(`
                SELECT id, total_survey_carried 
                FROM tbl_vessel_survey_log 
                WHERE year = @year AND month = @month
            `);

            if (checkResult.recordset.length > 0) {
                const currentTotal = parseInt(checkResult.recordset[0].total_survey_carried, 10) || 0;
                const updatedTotal = currentTotal + difference;

                const updateLogRequest = conn.request();
                updateLogRequest.input("id", checkResult.recordset[0].id);
                updateLogRequest.input("updatedTotal", updatedTotal);
                updateLogRequest.input("userId", userId);

                await updateLogRequest.query(`
                    UPDATE tbl_vessel_survey_log 
                    SET total_survey_carried = @updatedTotal, 
                        updated_by = @userId, 
                        updated_date = getDate() 
                    WHERE id = @id
                `);
            } else {
                const insertLogRequest = conn.request();
                insertLogRequest.input("year", year);
                insertLogRequest.input("month", month);
                insertLogRequest.input("totalSurveyCarried", parseInt(actualVessels, 10));
                insertLogRequest.input("userId", userId);

                await insertLogRequest.query(`
                    INSERT INTO tbl_vessel_survey_log 
                    (year, month, total_survey_carried, created_by, created_date) 
                    VALUES (@year, @month, @totalSurveyCarried, @userId, getDate())
                `);
            }

            return res.status(200).json({ message: 'Vessel survey data updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating vessel survey data:", error);
        return res.status(500).json({ message: 'Error updating vessel survey data.' });
    }
}



async function deleteDgsKpi2_8_Data(req, res) 
{
    const id = req.params.id;
   
    const conn = await pool;
    const request = conn.request();
    request.input("id", id);
 
    try {
        const result = await request.query(`
            DELETE FROM tbl_vessel_survey WHERE id = @id;        
        `);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getVesselSurveyDataById(req, res) {
    const { id } = req.params;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("vesselSurveyId", id);

        const result = await request.query(`
            SELECT * FROM tbl_vessel_survey
            WHERE id = @vesselSurveyId
        `);

        if (result.recordset.length > 0) {
            return res.status(200).json(result.recordset[0]);
        } else {
            return res.status(404).json({ message: 'No data found for this ID.' });
        }
    } catch (error) {
        console.error("Error fetching vessel survey data:", error);
        return res.status(500).json({ message: 'Error fetching vessel survey data.' });
    }
}


const VesselSurveyTab = { submitVesselSurveyData, getVesselSurveyData, updateVesselSurveyData, deleteDgsKpi2_8_Data,
    getVesselSurveyDataById };
export default VesselSurveyTab;
