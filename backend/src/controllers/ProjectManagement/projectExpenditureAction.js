import { pool } from "../../db.js";

async function getSourceOfFundingComponent(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT * from tbl_project where project_id = @projectID;`);
        }
        else
        {       
            result = await request.query(`SELECT sub_project_id, 
            sub_project_name as project_name, sub_project_brief as project_brief, sub_sanctioned_cost as sanctioned_cost,
            sub_mode_of_implememtation as mode_of_implememtation,
            sub_implememtation_type as implememtation_type, sub_primary_ia_id as primary_ia_id, 
            sub_secondary_ia_id as secondary_ia_id, sub_project_category_id as project_category_id, 
            sub_scheme_id as scheme_id, 
            sub_initiative_id as initiative_id, sub_target_completion_date as target_completion_date,
            sub_project_output_id as project_output_id, sub_project_outcome_id as project_outcome_id,
            sub_source_of_funding_id as source_of_funding_id, 
            sub_gbs_components as gbs_components, sub_iebr_components as iebr_components, 
            sub_ppp_components as ppp_components, sub_loans_components as loans_components, 
            sub_multilateral_components as multilateral_components, sub_state_gov_fund_components as state_gov_fund_components,
            sub_pmmsy_components as pmmsy_components, sub_sagarmala_components AS sagarmala_components,
            sub_other_source_funding_comp as other_source_funding_comp, sub_primary_funding_agency_id as primary_funding_agency_id, 
            sub_secondary_funding_agency_id as secondary_funding_agency_id, sub_state_id as state_id, 
            sub_district_id as district_id, sub_taluka_id as taluka_id, sub_village_id as village_id,
            sub_mp_constituency_id as mp_constituency_id, sub_on_land_acquisition as on_land_acquisition, 
            sub_land_area_req as land_area_req, 
            sub_on_acquisition_completed as on_acquisition_completed, sub_percent_land_acq, 
            sub_award_project_cost as award_project_cost

            FROM tbl_sub_project
            WHERE tbl_sub_project.sub_project_id = @subProjectID;`);
        }
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function addExpenditureDetails(req, res) {
    const projectId = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const year = req.body.financialYear;
    const financialYear = req.body.financialYearOriginal;
    const month = req.body.month;
    const gbsComponents = parseFloat(req.body.gbsComponents);
    const iebrComponents = parseFloat(req.body.iebrComponents);
    const pppComponents = parseFloat(req.body.pppComponents);
    const loansComponents = parseFloat(req.body.loansComponents);
    const multilateralComponents = parseFloat(req.body.multilateralComponents);
    const stateGovFundComponents = parseFloat(req.body.stateGovFundComponents);
    const pmmsyComponents = parseFloat(req.body.pmmsyComponents);
    const sagarmalaComponents = parseFloat(req.body.sagarmalaComponents);
    const otherSourceFunding = parseFloat(req.body.otherSourceFunding);
    
    const financialProgress = req.body.financialProgress;
    const day = 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const firstDateOfMonth = new Date(dateString);

    const conn = await pool;
    const request = conn.request();
    request.input("projectId", projectId);
    request.input("subProjectId", subProjectID);
    request.input("year", year);
    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("gbsComponents", gbsComponents || 0);
    request.input("iebrComponents", iebrComponents || 0);
    request.input("pppComponents", pppComponents || 0);
    request.input("loansComponents", loansComponents || 0);
    request.input("multilateralComponents", multilateralComponents || 0);
    request.input("stateGovFundComponents", stateGovFundComponents || 0);
    request.input("pmmsyComponents", pmmsyComponents || 0);
    request.input("sagarmalaComponents", sagarmalaComponents || 0);
    request.input("otherSourceFunding", otherSourceFunding || 0);
    request.input("financialProgress", financialProgress);
    request.input("firstDateOfMonth", firstDateOfMonth);

    try {

        const result = await request.query(`
            INSERT INTO tbl_project_expenditure (project_id, sub_project_id, year, financial_year, month, gbs_components, 
            iebr_components, ppp_components, loans_components, multilateral_components, state_gov_fund_components, pmmsy_components, 
            sagarmala_components, other_source_funding_comp, financial_progress, expenditure_date)
            VALUES (@projectId, @subProjectID, @year, @financialYear, @month, @gbsComponents, @iebrComponents, 
                @pppComponents, @loansComponents, @multilateralComponents, @stateGovFundComponents, @pmmsyComponents,
                @sagarmalaComponents, @otherSourceFunding, @financialProgress, @firstDateOfMonth)
        `);

   
        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getExpenditureDetails(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT * FROM tbl_project_expenditure WHERE tbl_project_expenditure.project_id = @projectID;`);
        }
        else
        {       
            result = await request.query(`SELECT * FROM tbl_project_expenditure WHERE tbl_project_expenditure.sub_project_id = @subProjectID;`);
        }

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getTotalExpenditureDetails(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT 
            SUM(gbs_components) AS gbs_components,
            SUM(iebr_components) AS iebr_components,
            SUM(ppp_components) AS ppp_components,
            SUM(loans_components) AS loans_components,
            SUM(multilateral_components) AS multilateral_components,
            SUM(state_gov_fund_components) AS state_gov_fund_components,
            SUM(pmmsy_components) AS pmmsy_components,
            SUM(sagarmala_components) AS sagarmala_components,
            SUM(other_source_funding_comp) AS other_source_funding_components,
            SUM(gbs_components) + 
                SUM(iebr_components) + 
                SUM(ppp_components) + 
                SUM(loans_components) + 
                SUM(multilateral_components) +
                SUM(state_gov_fund_components) + 
                SUM(pmmsy_components) + 
                SUM(sagarmala_components) + 
                SUM(other_source_funding_comp) AS total_expenditure FROM tbl_project_expenditure WHERE tbl_project_expenditure.project_id = @projectID;`);
        }
        else
        {       
            result = await request.query(`SELECT 
            SUM(gbs_components) AS gbs_components,
            SUM(iebr_components) AS iebr_components,
            SUM(ppp_components) AS ppp_components,
            SUM(loans_components) AS loans_components,
            SUM(multilateral_components) AS multilateral_components,
            SUM(state_gov_fund_components) AS state_gov_fund_components,
            SUM(pmmsy_components) AS pmmsy_components,
            SUM(sagarmala_components) AS sagarmala_components,
            SUM(other_source_funding_comp) AS other_source_funding_components,
            SUM(gbs_components) + 
                SUM(iebr_components) + 
                SUM(ppp_components) + 
                SUM(loans_components) + 
                SUM(multilateral_components) +
                SUM(state_gov_fund_components) + 
                SUM(pmmsy_components) + 
                SUM(sagarmala_components) + 
                SUM(other_source_funding_comp) AS total_expenditure FROM tbl_project_expenditure WHERE tbl_project_expenditure.sub_project_id = @subProjectID;`);
        }
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getTotalExpenditureValue(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT 
            SUM(gbs_components) + 
            SUM(iebr_components) + 
            SUM(ppp_components) + 
            SUM(loans_components) + 
            SUM(multilateral_components) +
            SUM(state_gov_fund_components) + 
            SUM(pmmsy_components) + 
            SUM(other_source_funding_comp) AS total_expenditure FROM tbl_project_expenditure WHERE tbl_project_expenditure.project_id = @projectID;`);
        }
        else
        {    
            result = await request.query(`SELECT 
            SUM(gbs_components) + 
            SUM(iebr_components) + 
            SUM(ppp_components) + 
            SUM(loans_components) + 
            SUM(multilateral_components) +
            SUM(state_gov_fund_components) +  
            SUM(pmmsy_components) + 
            SUM(other_source_funding_comp) AS total_expenditure FROM tbl_project_expenditure WHERE tbl_project_expenditure.sub_project_id = @subProjectID;`);
        }
        console.log(result.recordset);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function addExpenditureOutlay(req, res) 
{
    const projectId = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const financialYear = req.body.financialYear;
    const expenditureOutlayValue = req.body.expenditureOutlayValue;

    const conn = await pool;
    const request = conn.request();
    request.input("projectId", projectId);
    request.input("subProjectID", subProjectID);
    request.input("financialYear", financialYear);
    request.input("expenditureOutlayValue", expenditureOutlayValue);

    try 
    {

        let checkQuery;
        if (subProjectID === '-1') 
            {
                checkQuery = `
                    SELECT COUNT(*) AS count 
                    FROM tbl_project_expenditure_outlay 
                    WHERE project_id = @projectID AND year = @financialYear`;
            } else
            {
                checkQuery = `
                    SELECT COUNT(*) AS count 
                    FROM tbl_project_expenditure_outlay 
                    WHERE sub_project_id = @subProjectID AND year = @financialYear`;
            }

            const checkResult = await request.query(checkQuery);
            console.log(checkResult, "checkResultcheckResult")
            const recordExists = checkResult.recordset[0].count > 0;
            console.log(recordExists, "recordExists")


                 // if we need to update or insert based on the record existence
                 if (recordExists) 
                    {
                        let updateQuery;
                        if (subProjectID === '-1') 
                        {
                            // Update for projectID when subProjectID is -1
                            updateQuery = `
                                UPDATE tbl_project_expenditure_outlay 
                                SET expenditure_outlay = @expenditureOutlayValue 
                                WHERE project_id = @projectID AND year = @financialYear`;
                        } else {
                            // Update for subProjectID when subProjectID is not -1
                            updateQuery = `
                                UPDATE tbl_project_expenditure_outlay 
                                SET expenditure_outlay = @expenditureOutlayValue 
                                WHERE sub_project_id = @subProjectID AND year = @financialYear`;
                        }
                        
                        await request.query(updateQuery);
        
                    } else {
                        // Insert new record based on projectID or subProjectID
                        let insertQuery;
                        if (subProjectID === '-1') {
                            // Insert for projectID when subProjectID is -1
                            insertQuery = `
                                INSERT INTO tbl_project_expenditure_outlay 
                                (project_id, sub_project_id, year, expenditure_outlay) 
                                VALUES (@projectID, -1, @financialYear, @expenditureOutlayValue)`;
                        } else {
                            // Insert for subProjectID when subProjectID is not -1
                            insertQuery = `
                                INSERT INTO tbl_project_expenditure_outlay 
                                (project_id, sub_project_id, year, expenditure_outlay) 
                                VALUES (@projectID, @subProjectID, @financialYear, @expenditureOutlayValue)`;
                        }
                        await request.query(insertQuery);
                    }
        res.sendStatus(201);
    } 
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getExpenditureFinancialYear(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const financialYear = req.params.financialYear;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("financialYear", financialYear);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT COUNT(*) AS yearCount FROM tbl_project_expenditure_outlay WHERE tbl_project_expenditure_outlay.project_id = @projectID AND year = @financialYear;`);
        }
        else
        {       
            result = await request.query(`SELECT COUNT(*) AS yearCount FROM tbl_project_expenditure_outlay WHERE tbl_project_expenditure_outlay.sub_project_id = @subProjectID AND year = @financialYear;`);
        }
        
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getExpenditureMainFinancialYear(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const financialYear = req.params.financialYear;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("financialYear", financialYear);
    request.input("month", month);

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT COUNT(*) AS yearCount FROM tbl_project_expenditure WHERE tbl_project_expenditure.project_id = @projectID AND financial_year = @financialYear AND month = @month;`);
        }
        else
        {       
            result = await request.query(`SELECT COUNT(*) AS yearCount FROM tbl_project_expenditure WHERE tbl_project_expenditure.sub_project_id = @subProjectID AND financial_year = @financialYear AND month = @month;`);
        }
        
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editExpenditureComponentsDetails(req, res) {
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const year = req.body.year;
    const month = req.body.month;
	const gbs_components = req.body.gbs_components || '0.00';
	const iebr_components = req.body.iebr_components || '0.00';
	const ppp_components = req.body.ppp_components || '0.00';
	const loans_components = req.body.loans_components || '0.00';
	const multilateral_components = req.body.multilateral_components || '0.00';
	const state_gov_fund_components = req.body.state_gov_fund_components || '0.00';
	const pmmsy_components = req.body.pmmsy_components || '0.00';
	const sagarmala_components = req.body.sagarmala_components || '0.00';
	const other_source_funding_comp = req.body.other_source_funding_comp || '0.00';
	
    const conn = await pool;
    const request = conn.request();

		request.input("projectID", projectID);
        request.input("subProjectID", subProjectID);
        request.input("year", year);
        request.input("month", month);
        request.input("gbs_components", gbs_components);
        request.input("iebr_components", iebr_components);
        request.input("ppp_components", ppp_components);
        request.input("loans_components", loans_components);
        request.input("multilateral_components", multilateral_components);
        request.input("state_gov_fund_components", state_gov_fund_components);
        request.input("pmmsy_components", pmmsy_components);
        request.input("sagarmala_components", sagarmala_components);
        request.input("other_source_funding_comp", other_source_funding_comp);
    try {
        const query = `
		UPDATE tbl_project_expenditure
		SET gbs_components = CAST(@gbs_components AS decimal(18,2)),
			iebr_components = CAST(@iebr_components AS decimal(18,2)),
			ppp_components = CAST(@ppp_components AS decimal(18,2)),
			loans_components = CAST(@loans_components AS decimal(18,2)),
			multilateral_components = CAST(@multilateral_components AS decimal(18,2)),
			state_gov_fund_components = CAST(@state_gov_fund_components AS decimal(18,2)),
			pmmsy_components = CAST(@pmmsy_components AS decimal(18,2)),
			sagarmala_components = CAST(@sagarmala_components AS decimal(18,2)),
			other_source_funding_comp = CAST(@other_source_funding_comp AS decimal(18,2))
		WHERE project_id = @projectID
		  AND sub_project_id = @subProjectID
		  AND financial_year = @year
		  AND month = @month;
		
        `;

        

        await request.query(query);

        res.sendStatus(200);
    } catch (error) {
        console.error('Error updating expenditure components details:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function deleteExpenditureLogRow(req, res) 
{
    const { projectID, subProjectID, year, month } = req.body;
    console.log("projectID:", projectID);
    console.log("subProjectID:", subProjectID);
    console.log("year:", year);
    console.log("month:", month);

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("projectID", projectID);
        request.input("subProjectID", subProjectID);
        request.input("year", year);
        request.input("month", month);

        const query = `
            DELETE FROM tbl_project_expenditure
            WHERE project_id = @projectID
              AND sub_project_id = @subProjectID
              AND financial_year = @year
              AND month = @month;
        `;

        await request.query(query);

        res.sendStatus(200);
    } catch (error) {
        console.error("Error deleting expenditure log row:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getExpenditureOutlayCost(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    // const year = req.params.financialYear;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    // request.input("year",year)

    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT * FROM tbl_project_expenditure_outlay 
                WHERE tbl_project_expenditure_outlay.project_id = @projectID ORDER BY year;`);
        }
        else
        {       
            result = await request.query(`SELECT * FROM tbl_project_expenditure_outlay 
                WHERE tbl_project_expenditure_outlay.sub_project_id = @subProjectID ORDER BY year;`);
        }

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function sumOfExpIncurredFy(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const year = req.params.year;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("year",year)

    console.log(year, "year", subProjectID, "subProjectID")
    let result;
    try {
        if(subProjectID == -1)
        {
            result = await request.query(`SELECT 
            SUM(
                COALESCE(tbl_project_expenditure.gbs_components, 0) + 
                COALESCE(tbl_project_expenditure.iebr_components, 0) + 
                COALESCE(tbl_project_expenditure.ppp_components, 0) + 
                COALESCE(tbl_project_expenditure.loans_components, 0) + 
                COALESCE(tbl_project_expenditure.multilateral_components, 0) + 
                COALESCE(tbl_project_expenditure.state_gov_fund_components, 0) + 
                COALESCE(tbl_project_expenditure.pmmsy_components, 0) + 
                COALESCE(tbl_project_expenditure.sagarmala_components, 0) + 
                COALESCE(tbl_project_expenditure.other_source_funding_comp, 0)
            ) AS sum_of_finyear_incured 
            FROM tbl_project_expenditure 
            WHERE tbl_project_expenditure.project_id =  @projectID AND financial_year = @year`);
        }
        else
        {    
            result = await request.query(`SELECT 
            SUM(
                COALESCE(tbl_project_expenditure.gbs_components, 0) + 
                COALESCE(tbl_project_expenditure.iebr_components, 0) + 
                COALESCE(tbl_project_expenditure.ppp_components, 0) + 
                COALESCE(tbl_project_expenditure.loans_components, 0) + 
                COALESCE(tbl_project_expenditure.multilateral_components, 0) + 
                COALESCE(tbl_project_expenditure.state_gov_fund_components, 0) + 
                COALESCE(tbl_project_expenditure.pmmsy_components, 0) + 
                COALESCE(tbl_project_expenditure.sagarmala_components, 0) + 
                COALESCE(tbl_project_expenditure.other_source_funding_comp, 0)
            ) AS sum_of_finyear_incured 
            FROM tbl_project_expenditure 
            WHERE tbl_project_expenditure.sub_project_id =  @subProjectID AND financial_year = @year`);
        }
        // console.log(result.recordset);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.status(500);
    }
}

export default { getSourceOfFundingComponent, addExpenditureDetails, getExpenditureDetails, getTotalExpenditureDetails,
     getTotalExpenditureValue, addExpenditureOutlay, getExpenditureOutlayCost, 
     getExpenditureFinancialYear, getExpenditureMainFinancialYear, editExpenditureComponentsDetails, 
    deleteExpenditureLogRow, sumOfExpIncurredFy }; 