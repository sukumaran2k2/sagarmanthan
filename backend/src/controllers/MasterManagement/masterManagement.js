
import { pool } from "../../db.js";

async function createMmt(req, res) {
    const name = req.body.name;
    const tid = req.body.TID;

    const conn = await pool;
    const request = conn.request();
    request.input("name", name);

    let wingCode, departmentCode;
    let query;
    let wingId, divisionId, divisionCode, sectionCode, stateId, iaCode, units, projectOutputId;
    let organisationName, organisationCode, organisationCategory, district, portalCategory;
    let type, nationalWaterway, state, latitude, longitude;

    switch (tid) {
        case "mmt_source_of_funding":
            query = "INSERT into mmt_source_of_funding (source_of_funding_name) values (@name)";
            break;

        case "mmt_cargo":
            query = "INSERT into mmt_cargo (cargo_name) values (@name)";
            break;

        case "mmt_digital_portals":
            portalCategory = req.body.portalCategory;
            request.input("portalCategory", portalCategory);
            query = "INSERT into mmt_digital_portals (portal_name, portal_category) values (@name, @portalCategory)";
            break;

        case "mmt_nationalwaterways":
            query = "INSERT into mmt_nationalwaterways (nationalwaterways_name) values (@name)";
            break;

        case "mmt_terminal_jetty":
            type = req.body.type;
            nationalWaterway = req.body.nationalWaterway;
            state = req.body.state;
            district = req.body.district;
            latitude = req.body.latitude;
            longitude = req.body.longitude;

            request.input("type", type);
            request.input("nationalWaterway", nationalWaterway);
            request.input("state", state);
            request.input("district", district);
            request.input("latitude", latitude);
            request.input("longitude", longitude);

            query = "INSERT into mmt_terminal_jetty (terminal_name, type, national_waterway_id, state_id, district_id, latitude, longitude) OUTPUT INSERTED.terminal_id values (@name, @type, @nationalWaterway, @state, @district, @latitude, @longitude)";
            break;

        case "mmt_project_category":
            query = "INSERT into mmt_project_category (project_category_name) values (@name)";
            break;

        case "mmt_wings":
            wingCode = req.body.wingCode;
            request.input("wingCode", wingCode);

            query = "INSERT into mmt_wings (wing_name, wing_code) values (@name, @wingCode)";
            break;

        case "mmt_department":
            departmentCode = req.body.departmentCode;
            request.input("departmentCode", departmentCode);

            query = "INSERT into mmt_department (department_name, department_code) values (@name, @departmentCode)";
            break;

        case "mmt_scheme":
            query = "INSERT into mmt_scheme (scheme_name) values (@name)";
            break;

        case "mmt_initiative":
            query = "INSERT into mmt_initiative (initiative_name) values (@name)";
            break;

        case "mmt_division":
            wingId = req.body.wingId;
            divisionCode = req.body.divisionCode;
            request.input("wingId", wingId);
            request.input("divisionCode", divisionCode);
            query = "INSERT into mmt_division (division_name, wing_id, division_code) values (@name, @wingId, @divisionCode)";
            break;

        case "mmt_section":
            divisionId = req.body.divId;
            sectionCode = req.body.sectionCode;
            request.input("divisionId", divisionId);
            request.input("sectionCode", sectionCode);
            query = "INSERT into mmt_section (section_name, division_id, section_code) values (@name, @divisionId, @sectionCode)";
            break;

        case "mmt_mp_constituency":
            stateId = req.body.stateId;
            request.input("stateId", stateId);
            query = "INSERT into mmt_mp_constituency (mpc_name, state_id) values (@name, @stateId)";
            break;

        case "mmt_project_category":
            query = "INSERT into mmt_project_category (project_category_name) values (@name)";
            break;

        case "mmt_funding_agency":
            query = "INSERT into mmt_funding_agency (fa_name) values (@name)";
            break;

        case "mmt_implementing_agency":
            iaCode = req.body.iaCode;
            request.input("iaCode", iaCode);
            query = "INSERT into mmt_implementing_agency (ia_name, ia_code) values (@name, @iaCode)";
            break;

        case "mmt_state":
            query = "INSERT into mmt_state (state_name) values (@name)";
            break;

        case "mmt_district":
            stateId = req.body.stateId;
            request.input("stateId", stateId);
            query = "INSERT into mmt_district (district_name, state_id) values (@name, @stateId)";
            break;

        case "mmt_output":
            units = req.body.units;
            request.input("units", units);
            query = "INSERT into mmt_output (project_output_name, project_output_units) values (@name, @units)";
            break;

        case "mmt_outcome":
            units = req.body.units;
            projectOutputId = req.body.projectOutputId;
            request.input("units", units);
            request.input("projectOutputId", projectOutputId);
            query = "INSERT into mmt_outcome (project_outcome_name, project_outcome_units, project_output_id) values (@name, @units, @projectOutputId)";
            break;

        case "mmt_clearance":
            query = "INSERT into mmt_clearance (clearance_name) values (@name)";
            break;

        case "mmt_dredger":
            query = "INSERT into mmt_dredger (dredger_name) values (@name)";
            break;

        case "mmt_survey_vessel":
            query = "INSERT into mmt_survey_vessel (surveyVessel_name) values (@name)";
            break;

        case "mmt_shipyard":
            query = "INSERT into mmt_shipyard (shipyard_name) values (@name)";
            break;

        case "mmt_ministry":
            query = "INSERT into mmt_ministry (ministry_name) values (@name)";
            break;
        case "mmt_organisation":
            organisationName = req.body.organisationName;
            organisationCode = req.body.organisationCode;
            organisationCategory = req.body.organisationCategory;
            stateId = req.body.state;
            district = req.body.district;
            wingId = req.body.wing;
            divisionCode = req.body.division;

            request.input("organisationName", organisationName);
            request.input("organisationCode", organisationCode);
            request.input("organisationCategory", organisationCategory);
            request.input("stateId", stateId);
            request.input("district", district);
            request.input("wingId", wingId);
            request.input("divisionCode", divisionCode);

            query = `
                    INSERT INTO mmt_organisation (organisation_name, organisation_code, organisation_category_id, state_id, district_id, wing_id, division_id)
                    VALUES (@organisationName, @organisationCode, @organisationCategory, @stateId, @district, @wingId, @divisionCode);
                `;
            break;

        case "mmt_kr_wing":
            query = "INSERT into mmt_kr_wing (Wing) values (@name)";
            break;

        case "mmt_kr_vision_doc":
            query = "INSERT into mmt_kr_vision_doc (vision_document) values (@name)";
            break;

        case "mmt_kr_organisation":
            query = "INSERT into mmt_kr_organisation (organisation) values (@name)";
            break;

        case "mmt_kr_function_cell":
            query = "INSERT into mmt_kr_function_cell (function_cell) values (@name)";
            break;

        case "mmt_kr_document_type":
            query = "INSERT into mmt_kr_document_type (document_type) values (@name)";
            break;
            
        case "mmt_employee_info":
            const empID = req.body.empID;
            const Designation = req.body.Designation;
            const designationLevel = req.body.designationLevel;
            wingId = req.body.wingId;
            divisionId = req.body.divisionId;
            
            request.input("empID", empID);
            request.input("Designation", Designation);
            request.input("designationLevel", designationLevel);
            request.input("wingId", wingId);
            request.input("divisionId", divisionId);

            const employeeID = await request.query(`
                SELECT COUNT(*) AS Emp_Id 
                FROM mmt_employee_info  
                WHERE Emp_Id = '${empID}';
            `);
            const replaceFileID = employeeID.recordset[0].Emp_Id;
    
            if (replaceFileID > 0) {
                return res.status(409).json({ error: "Record already exists for this Employee ID.", replaceFileID: replaceFileID });
            }

            const orgIDResult = await request.query(`
                SELECT organization_id from mmt_organization_info 
                WHERE wing_id = @wingId AND division_id = @divisionId
            `);

            const organizationID = orgIDResult.recordset[0].organization_id;

            request.input("organizationID", organizationID);
            query = `
            INSERT INTO mmt_employee_info (Emp_Id, Emp_Name, Designation, organization_id, level)
            VALUES (@empID, @name, @Designation, @organizationID, @designationLevel );`;            
            break;
}

    try {
        const result = await request.query(query);

        if (tid === "mmt_terminal_jetty") {
            const terminal_id = result.recordset[0].terminal_id;
            res.status(201).json({ terminal_id });
        } else {
            res.sendStatus(201);
        }
        // const result = await request.query(`INSERT INTO ${tid} (source_of_funding_name) VALUES (@name)`);
        // res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDropDownData(req, res) {
    const conn = await pool;
    const tid = req.params.tid;

    let query;
    switch (tid) {
        case "mmt_department":
            query = "SELECT department_id, department_name FROM mmt_department WHERE status = 1 ORDER BY department_name";
            break;

        case "mmt_mmd_name":
            query = "SELECT mmd_id, mmd_name FROM mmt_mmd_name WHERE status = 1";
            break;

        case "mmt_digital_portals":
            query = "SELECT digital_portal_id, portal_name, portal_category FROM mmt_digital_portals WHERE status = 1";
            break;

        case "mmt_cargo":
            query = "SELECT cargo_id, cargo_name FROM mmt_cargo WHERE status = 1";
            break;

        case "mmt_nationalwaterways":
            query = "SELECT nationalwaterways_id, nationalwaterways_name FROM mmt_nationalwaterways WHERE status = 1";
            break;

        case "mmt_terminal_jetty":
            query = "SELECT terminal_id, terminal_name FROM mmt_terminal_jetty WHERE status = 1";
            break;

        case "mmt_state":
            query = "SELECT state_id, state_name FROM mmt_state WHERE status = 1 ORDER BY state_name";
            break;

        case "mmt_district":
            query = "SELECT district_id, district_name, state_id FROM mmt_district WHERE status = 1 ORDER BY district_name";
            break;

        case "mmt_mp_constituency":
            query = "SELECT mpc_id, mpc_name, state_id FROM mmt_mp_constituency WHERE status = 1 ORDER BY mpc_name";
            break;

        case "mmt_wings":
            query = "SELECT wing_id, wing_name FROM mmt_wings WHERE status = 1 ORDER BY wing_name";
            break;

        case "mmt_division":
            query = "SELECT division_id, division_name, wing_id FROM mmt_division WHERE status = 1 ORDER BY division_name";
            break;

        case "mmt_section":
            query = "SELECT section_id, section_name, division_id FROM mmt_section WHERE status = 1 ORDER BY section_name";
            break;

        case "mmt_project_category":
            query = "SELECT project_category_id, project_category_name FROM mmt_project_category WHERE status = 1 ORDER BY project_category_name";
            break;

        case "mmt_scheme":
            query = "SELECT scheme_id, scheme_name FROM mmt_scheme WHERE status = 1 ORDER BY scheme_name";
            break;

        case "mmt_source_of_funding":
            query = "SELECT source_of_funding_id, source_of_funding_name FROM mmt_source_of_funding WHERE status = 1 ORDER BY source_of_funding_name";
            break;

        // case "mmt_vip_reference_status":
        //     query = "SELECT vip_reference_status_id, vip_reference_status_name FROM mmt_vip_reference_status WHERE status = 1";
        //     break;

        case "mmt_initiative":
            query = "SELECT initiative_id, initiative_name FROM mmt_initiative WHERE status = 1 ORDER BY initiative_name";
            break;

        case "mmt_funding_agency":
            query = "SELECT fa_id, fa_name FROM mmt_funding_agency WHERE status = 1 ORDER BY fa_name";
            break;

        case "mmt_clearance":
            query = "SELECT clearance_id, clearance_name FROM mmt_clearance WHERE status = 1 ORDER BY clearance_name";
            break;

        case "tbl_role":
            query = "SELECT role_id, role_name FROM tbl_role";
            break;

        case "mmt_organisation_category":
            query = "SELECT organisation_category_id, organisation_category_name FROM mmt_organisation_category WHERE status = 1 ORDER BY organisation_category_name";
            break;

        case "mmt_organisation":
            query = "SELECT organisation_id, organisation_name, organisation_code, organisation_label, organisation_category_id FROM mmt_organisation WHERE status = 1 ORDER BY organisation_name";
            break;

        case "tbl_project_stage":
            query = "SELECT stage_id, stage_name FROM tbl_project_stage ORDER BY stage_id";
            break;

        case "mmt_implementing_agency":
            query = "SELECT ia_id, ia_name FROM mmt_implementing_agency WHERE status = 1 ORDER BY ia_name";
            break;

        case "mmt_output":
            query = "SELECT project_output_id, project_output_name FROM mmt_output WHERE status = 1 ORDER BY project_output_name";
            break;

        case "mmt_outcome":
            query = "SELECT project_outcome_id, project_outcome_name, project_output_id FROM mmt_outcome WHERE status = 1 ORDER BY project_outcome_name";
            break;

        case "mmt_domain":
            query = "SELECT domain_id, domain_name FROM mmt_domain WHERE status = 1 ORDER BY domain_name";
            break;

        case "mmt_sub_domain":
            query = "SELECT sub_domain_id, sub_domain_name, domain_id FROM mmt_sub_domain WHERE status = 1 ORDER BY sub_domain_name";
            break;
    
        case "mmt_ministry":
            query = "SELECT ministry_id, ministry_name FROM mmt_ministry WHERE status = 1 ORDER BY ministry_name";
            break;

        case "mmt_traffic_category":
            query = "SELECT category_id, category_name FROM mmt_traffic_category ORDER BY category_name";
            break;

        case "mmt_traffic_direction":
            query = "SELECT direction_id, direction_name FROM mmt_traffic_direction ORDER BY direction_name";
            break;

        case "mmt_traffic_flag_type":
            query = "SELECT flag_type_id, flag_type_name FROM mmt_traffic_flag_type ORDER BY flag_type_name";
            break;

        case "mmt_new_initiatives":
            query = "SELECT Initiaitive_ID, Initiaitive_name FROM mmt_new_initiatives";
            break;

        case "mmt_dredger":
            query = "SELECT dredger_id, dredger_name FROM mmt_dredger WHERE status = 1 ORDER BY dredger_name";
            break;

        case "mmt_survey_vessel":
            query = "SELECT surveyVessel_id, surveyVessel_name FROM mmt_survey_vessel WHERE status = 1 ORDER BY surveyVessel_name";
            break;

        case "mmt_class":
            query = "SELECT class_id, class FROM mmt_class WHERE status = 1 ORDER BY class";
            break;

        case "mmt_kr_wing":
            query = "SELECT Wing FROM mmt_kr_wing";
            break;

        case "mmt_kr_vision_doc":
            query = "SELECT vision_document FROM mmt_kr_vision_doc";
            break;

        case "mmt_kr_organisation":
            query = "SELECT organisation FROM mmt_kr_organisation ";
            break;

        case "mmt_kr_function_cell":
            query = "SELECT function_cell FROM mmt_kr_function_cell";
            break;
        case "mmt_kr_document_type":
            query = "SELECT ID,document_type FROM mmt_kr_document_type ";
            break;
        case "mmt_a1":
            query = "SELECT id,(a1_code + ' : ' + goals) AS goals FROM mmt_a1";
            break;
        case "mmt_a2":
            query = "SELECT id,primary_id_of_a1,(a2_code + ' : ' + intervension_name) AS intervension_name FROM mmt_a2";
            break;
        case "mmt_a3":
            query = "SELECT id,primary_id_of_a2,(a3_code + ' : ' + action_name) AS action_name, action_name AS main_action_name FROM mmt_a3";
            break;
        case "mmt_b1":
            query = "SELECT id,primary_id_a2,(b1_code + ' : ' + b1_goals) AS b1_goals FROM mmt_b1";
            break;
        case "mmt_b2_b3":
            query = "SELECT id,primary_id_of_b1,(b2_code + ' : ' + intervention) AS intervention, intervention AS main_intervention FROM mmt_b2_b3";
            break;
        case "mmt_b3":
            query = "SELECT  id,(b3_code + ' : ' + b3_actions) AS b3_actions, b3_actions AS main_b3_actions  FROM mmt_b3";
            break;
        case "mmt_a1_filter":
            query = "SELECT DISTINCT goals FROM mmt_a1";
            break;
        case "mmt_a2_filter":
            query = "SELECT DISTINCT intervension_name FROM mmt_a2";
            break;
        case "mmt_a3_filter":
            query = "SELECT DISTINCT action_name FROM mmt_a3";
            break;
        case "mmt_b1_filter":
            query = "SELECT DISTINCT b1_goals FROM mmt_b1";
            break;
        case "mmt_b2_b3_filter":
            query = "SELECT DISTINCT intervention FROM mmt_b2_b3";
            break;
        case "mmt_b3_filter":
            query = "SELECT DISTINCT b3_actions FROM mmt_b3";
            break;
        case "mmt_organization_info":
            query = "SELECT * FROM mmt_organization_info";
            break;  
        case "mmt_navic_vibhas":
            query = "SELECT * FROM mmt_navic_vibhas ORDER BY navic_name";
            break; 
        case "mmt_implementing_agency_ovd":
            query = "SELECT ia_id, ia_name FROM mmt_implementing_agency WHERE ovd_status = 1 ORDER BY ia_name";
            break; 
        case "mmt_ovd_category":
            query = "SELECT * FROM mmt_ovd_category";
            break;         
        case "mmt_country":
            query = "SELECT * FROM mmt_country";
            break;  
        case "mmt_ofv_visit_type":
            query = "SELECT * FROM mmt_ofv_visit_type";
            break;   
        case "mmt_designation":
            query = "SELECT * FROM mmt_designation";
            break;
        case "mmt_court_type":
            query = "SELECT * FROM mmt_court_type";
            break;
        case "mmt_court_sub_type":
            query = "SELECT * FROM mmt_court_sub_type";
            break;
        case "mmt_court_case_type":
            query = "SELECT * FROM mmt_court_case_type";
            break;
        case "tbl_court_case_departments":
            query = "SELECT * FROM tbl_court_case_departments";
            break;
        case "tbl_court_case_organisations":
            query = "SELECT * FROM tbl_court_case_organisations";
            break;
        case "tbl_major_modules":
            query = "SELECT * FROM tbl_major_modules";
            break;
        case "mmt_bench_seat":
            query = "SELECT * FROM mmt_bench_seat";
            break;
        case "mmt_kpi_dgs_grade":
            query = "SELECT * FROM mmt_kpi_dgs_grade";
            break;
        case "mmt_conciliation_first_party":
            query = "SELECT * FROM mmt_conciliation_first_party";
            break;
        case "mmt_conciliation_second_party":
            query = "SELECT * FROM mmt_conciliation_second_party";
            break;
        case "tbl_official_foreign_visit_officers":
            query = "SELECT name FROM tbl_official_foreign_visit ORDER BY name";
            break;
        case "mmt_city_country":
            query = "SELECT DISTINCT country_name FROM mmt_city ORDER BY country_name";
            break; 
        case "mmt_city_by_country":
            const countries = req.query.countries ? JSON.parse(req.query.countries) : []; 
            const countryList = countries.map(country => `'${country.replace(/'/g, "''")}'`).join(',');
            query = `SELECT * FROM mmt_city WHERE country_name IN (${countryList})`;
            break;
        case "mmt_arbitration_claimant":
            query = "select * from mmt_arbitration_claimant";
            break;
        case "mmt_arbitration_respondent":
            query = "SELECT * FROM mmt_arbitration_respondent";
            break;

        case "mmt_shipyard":
            query = "SELECT shipyard_id, shipyard_name FROM mmt_shipyard where status = 1 ORDER BY shipyard_name";
            break;

        case "mmt_csr_focusarea":
            query = "SELECT focus_id, focus_name FROM mmt_csr_focusarea where status = 1 ORDER BY focus_name";
            break;
        case "mmt_hr_cluster":
            query = "SELECT * FROM mmt_hr_cluster";
            break;
        case "mmt_akv_initiatives":
            query = "SELECT * FROM mmt_akv_initiatives";
            break;

        // case "tbl_project":
        //     query = "SELECT project_id, project_name FROM tbl_project WHERE status = 1 AND project_stage_id != 14 ORDER BY project_name";
        //     break;

    }
    try {
        const result = await conn.query(query);
        res.json(result.recordset);
        // const result = await conn.query(`SELECT * FROM ${tid};`);
        // res.json(result.recordset);
        console.log(result.recordset)
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDropDownProjectList(req, res) 
{
    const conn = await pool;
    const tid = req.params.tid;
    const organisationID = req.params.organisationID;

    let query;
    switch (tid) 
    {
        case "tbl_project":
            query = `SELECT project_id, project_name FROM tbl_project WHERE status = 1 AND project_stage_id != 14  
                AND on_sub_project_available = 0 AND organisation_id = ${organisationID} 
                
                UNION

                SELECT DISTINCT tbl_project.project_id, tbl_project.project_name
                FROM tbl_project
                INNER JOIN  tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                WHERE sub_status = 1 AND sub_project_stage_id != 14
                AND sub_organisation_id = ${organisationID}
            `;
            break;
    }
    try {
        const result = await conn.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getDropDownSubProjectList(req, res) 
{
    const conn = await pool;
    const tid = req.params.tid;
    const organisationID = req.params.organisationID;
    const projectId = req.params.projectId;

    let query;
    switch (tid) 
    {
        case "tbl_project":
            query = `SELECT project_id, project_name FROM tbl_project 
                    WHERE on_sub_project_available = 0 and status = 1 AND project_stage_id != 14 
                    AND organisation_id = 17  

                UNION
            
                    SELECT DISTINCT tbl_project.project_id, tbl_project.project_name
                    FROM tbl_project
                    INNER JOIN  tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                    WHERE on_sub_project_available = 1 AND sub_status = 1 AND sub_project_stage_id != 14 
                    AND sub_organisation_id = 17
            `;
            break;
        
        case "tbl_sub_project":
            query = `
               SELECT 
                project_id, 
                sub_project_id, 
                sub_project_name,
                ISNULL(sub_chairman_approval_date, sub_admin_approval_approval_date) AS sub_sanctioned_date
            FROM 
                tbl_sub_project 
            WHERE 
                sub_status = 1 
                AND sub_project_stage_id != 14
                AND project_id = '${projectId}' 
                               
            `;
            break;
    }
    try {
        const result = await conn.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getMmt(req, res) {
    const conn = await pool;
    const tid = req.params.tid;

    let query;
    switch (tid) {
        case "mmt_source_of_funding":
            query = "SELECT * FROM mmt_source_of_funding";
            break;

        case "mmt_nationalwaterways":
            query = "SELECT * FROM mmt_nationalwaterways";
            break;

        case "mmt_digital_portals":
            query = "SELECT * FROM mmt_digital_portals";
            break;

        case "mmt_cargo":
            query = "SELECT * FROM mmt_cargo";
            break;

        case "mmt_terminal_jetty":
            query = "SELECT * FROM mmt_terminal_jetty";
            break;

        case "mmt_project_category":
            query = "SELECT * FROM mmt_project_category";
            break;

        case "mmt_wings":
            // wingCode = req.body.wingCode;
            // request.input("wingCode", wingCode);
            query = "SELECT * FROM mmt_wings";
            break;

        case "mmt_department":
            query = "SELECT * FROM mmt_department";
            break;

        case "mmt_scheme":
            query = "SELECT * FROM mmt_scheme";
            break;

        case "mmt_initiative":
            query = "SELECT * FROM mmt_initiative";
            break;

        case "mmt_division":
            query = "SELECT * FROM mmt_division";
            break;

        case "mmt_section":
            query = "SELECT * FROM mmt_section";
            break;

        case "mmt_mp_constituency":
            query = "SELECT * FROM mmt_mp_constituency";
            break;

        case "mmt_project_category":
            query = "SELECT * FROM mmt_project_category";
            break;

        case "mmt_funding_agency":
            query = "SELECT * FROM mmt_funding_agency";
            break;

        case "mmt_implementing_agency":
            query = "SELECT * FROM mmt_implementing_agency";
            break;

        case "mmt_state":
            query = "SELECT * FROM mmt_state";
            break;

        case "mmt_district":
            query = "SELECT * FROM mmt_district";
            break;

        case "mmt_output":
            query = "SELECT * FROM mmt_output";
            break;

        case "mmt_outcome":
            query = "SELECT * FROM mmt_outcome";
            break;

        case "mmt_clearance":
            query = "SELECT * FROM mmt_clearance";
            break;

        case "mmt_ministry":
            query = "SELECT * FROM mmt_ministry";
            break;

        case "mmt_dredger":
            query = "SELECT * FROM mmt_dredger";
            break;

        case "mmt_survey_vessel":
            query = "SELECT * FROM mmt_survey_vessel";
            break;

        case "mmt_organisation":
            query = `SELECT 
            mmt_organisation.organisation_id,
            mmt_organisation.organisation_name,
            mmt_organisation.organisation_code,
            mmt_organisation.organisation_category_id,
            mmt_organisation.state_id,
            mmt_organisation.district_id,
            mmt_organisation.wing_id,
            mmt_organisation.division_id,
            mmt_organisation.status,
            mmt_district.district_name,
            mmt_division.division_name,
            mmt_division.division_code,
            mmt_state.state_name,
            mmt_wings.wing_name,
            mmt_wings.wing_code,
            mmt_organisation_category.organisation_category_name
                FROM mmt_organisation
                LEFT JOIN mmt_district ON mmt_organisation.district_id = mmt_district.district_id
                LEFT JOIN mmt_division ON mmt_organisation.division_id = mmt_division.division_id
                LEFT JOIN mmt_state ON mmt_organisation.state_id = mmt_state.state_id
                LEFT JOIN mmt_wings ON mmt_organisation.wing_id = mmt_wings.wing_id
                LEFT JOIN mmt_organisation_category ON mmt_organisation.organisation_category_id = mmt_organisation_category.organisation_category_id;`;
            break;

        case "mmt_organisation_category":
            query = "SELECT * FROM mmt_organisation_category";
            break;

        case "mmt_cabinet_mopsw_stage":
            query = "SELECT * FROM mmt_cabinet_mopsw_stage";
            break;

        case "mmt_cabinet_ministry_stage":
            query = "SELECT * FROM mmt_cabinet_ministry_stage";
            break;

        case "mmt_consultant_appointment_stage":
            query = "SELECT * FROM mmt_consultant_appointment_stage";
            break;

        case "mmt_vip_stage":
            query = "SELECT * FROM mmt_vip_stage";
            break;
        case "mmt_akv_initiatives":
            query = "SELECT * FROM mmt_akv_initiatives";
            break;
        case "mmt_employee_info":
            query = `
            SELECT 
            mmt_employee_info.ID,Emp_Id,Emp_Name,Designation,mmt_employee_info.organization_id,level,wing_id,division_id,wing_name,division_name
            FROM mmt_employee_info
            LEFT JOIN mmt_organization_info ON mmt_organization_info.organization_id  = mmt_employee_info.organization_id;`;
            break;
        case "mmt_designation":
            query = "SELECT * FROM mmt_designation";
            break;

        case "mmt_shipyard":
            query = "SELECT * FROM mmt_shipyard";
            break;

    }

    try {
        const result = await conn.query(query);
        res.json(result.recordset);

        // const result = await conn.query(`SELECT * FROM ${tid};`);
        // res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateMmt(req, res) 
{
    const tid = req.body.TID;
    const ID = req.body.rowID;
    const name = req.body.name;
    const wingId = req.body.wingId;
    const divId = req.body.divId;
    const stateId = req.body.stateId;
    const units = req.body.units;
    const projectOutputId = req.body.projectOutputId;
    const division = req.body.division;
    const district = req.body.district;
    const category = req.body.category;
    const code = req.body.code;
    const portalCategory = req.body.portalCategory;
    const empID = req.body.empID;
    const Designation = req.body.Designation;
    const designationLevel = req.body.designationLevel;


    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);
    request.input("name", name);

    request.input("divId", divId);
    request.input("wingId", wingId);

    let query;
    switch (tid) {
        case "mmt_source_of_funding":
            query = "UPDATE mmt_source_of_funding SET source_of_funding_name = @name WHERE source_of_funding_id = @ID";
            break;

        case "mmt_nationalwaterways":
            query = "UPDATE mmt_nationalwaterways SET nationalwaterways_name = @name WHERE nationalwaterways_id = @ID";
            break;

        case "mmt_digital_portals":
            request.input("portalCategory", portalCategory);
            query = "UPDATE mmt_digital_portals SET portal_name = @name, portal_category = @portalCategory WHERE digital_portal_id = @ID";
            break;

        case "mmt_cargo":
            query = "UPDATE mmt_cargo SET cargo_name = @name WHERE cargo_id = @ID";
            break;

        case "mmt_terminal_jetty":
            const type = req.body.type;
            const nationalWaterway = req.body.nationalWaterway;
            const state = req.body.state;
            const latitude = req.body.latitude;
            const longitude = req.body.longitude;

            request.input("type", type);
            request.input("nationalWaterway", nationalWaterway);
            request.input("state", state);
            request.input("district", district);
            request.input("latitude", latitude);
            request.input("longitude", longitude);
            query = "UPDATE mmt_terminal_jetty SET terminal_name = @name, type = @type, national_waterway_id = @nationalWaterway, state_id = @state, district_id = @district, latitude = @latitude, longitude = @longitude WHERE terminal_id = @ID";
            break;

        case "mmt_project_category":
            query = "UPDATE mmt_project_category SET project_category_name = @name WHERE project_category_id = @ID";
            break;

        case "mmt_wings":
            query = "UPDATE mmt_wings SET wing_name = @name WHERE wing_id = @ID";
            break;

        case "mmt_department":
            query = "UPDATE mmt_department SET department_name = @name WHERE department_id = @ID";
            break;

        case "mmt_scheme":
            query = "UPDATE mmt_scheme SET scheme_name = @name WHERE scheme_id = @ID";
            break;

        case "mmt_initiative":
            query = "UPDATE mmt_initiative SET initiative_name = @name WHERE initiative_id = @ID";
            break;

        case "mmt_division":
            query = "UPDATE mmt_division SET division_name = @name, wing_id = @wingId WHERE division_id = @ID";
            break;

        case "mmt_section":
            query = "UPDATE mmt_section SET section_name = @name, division_id = @divId WHERE section_id = @ID";
            break;

        case "mmt_mp_constituency":
            request.input("stateId", stateId);
            query = "UPDATE mmt_mp_constituency SET mpc_name = @name, state_id = @stateId WHERE mpc_id = @ID";
            break;

        case "mmt_project_category":
            query = "UPDATE mmt_project_category SET project_category_name = @name WHERE project_category_id = @ID";
            break;

        case "mmt_funding_agency":
            query = "UPDATE mmt_funding_agency SET fa_name = @name WHERE fa_id = @ID";
            break;

        case "mmt_implementing_agency":
            query = "UPDATE mmt_implementing_agency SET ia_name = @name WHERE ia_id = @ID";
            break;

        case "mmt_state":
            query = "UPDATE mmt_state SET state_name = @name WHERE state_id = @ID";
            break;

        case "mmt_district":
            request.input("stateId", stateId);
            query = "UPDATE mmt_district SET district_name = @name, state_id = @stateId WHERE district_id = @ID";
            break;

        case "mmt_output":
            request.input("units", units);
            query = "UPDATE mmt_output SET project_output_name = @name, project_output_units = @units WHERE project_output_id = @ID";
            break;

        case "mmt_outcome":
            request.input("units", units);
            request.input("projectOutputId", projectOutputId);
            query = "UPDATE mmt_outcome SET project_outcome_name = @name, project_outcome_units = @units, project_output_id = @projectOutputId WHERE project_outcome_id = @ID";
            break;

        case "mmt_clearance":
            query = "UPDATE mmt_clearance SET clearance_name = @name WHERE clearance_id = @ID";
            break;

        case "mmt_ministry":
            query = "UPDATE mmt_ministry SET ministry_name = @name WHERE ministry_id = @ID";
            break;

        case "mmt_dredger":
            query = "UPDATE mmt_dredger SET dredger_name = @name WHERE dredger_id = @ID";
            break;

        case "mmt_survey_vessel":
            query = "UPDATE mmt_survey_vessel SET surveyVessel_name = @name WHERE surveyVessel_id = @ID";
            break;

        case "mmt_shipyard":
            query = "UPDATE mmt_shipyard SET shipyard_name = @name WHERE shipyard_id = @ID";
            break;

        case "mmt_organisation":
            request.input("stateId", stateId);
            request.input("division", division);
            request.input("district", district);
            request.input("category", category);
            request.input("code", code);
            query = "UPDATE mmt_organisation SET organisation_name = @name, organisation_code = @code, organisation_category_id = @category, state_id = @stateId, district_id = @district, wing_id = @wingId, division_id = @division WHERE organisation_id = @ID";
            break;

        case "mmt_employee_info":
            request.input("empID", empID);
            request.input("Designation", Designation);
            request.input("designationLevel", designationLevel);
            request.input("division", division);

            const orgIDResult = await request.query(`
                SELECT organization_id from mmt_organization_info 
                WHERE wing_id = @wingId AND division_id = @division
            `);

            const organizationID = orgIDResult.recordset[0].organization_id;

            request.input("organizationID", organizationID);
            query = "UPDATE mmt_employee_info SET Emp_Name = @name, organization_id = @organizationID, Designation = @Designation, level = @designationLevel WHERE Emp_Id = @empID";
            break;
    }

    try {
        const result = await request.query(query);
        // const result = await request.query(`UPDATE ${tid} SET source_of_funding_name = @name WHERE source_of_funding_id = @ID`);
        // console.log(result);
        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


// async function deleteMmt (req, res) {
//     const conn = await pool;

//     try {
//         const result = await conn.query(`DELETE FROM ${tid};`);
//         console.log(result);
//         res.sendStatus(200);
//     }
//     catch(err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

async function toggleStatusMmt(req, res) {
    const rowID = req.body.rowID;
    const status = req.body.status;
    const tid = req.body.TID;

    const conn = await pool;
    const request = conn.request();
    request.input("status", status);
    request.input("rowID", rowID);
    // request.input("tid", tid);

    let query;
    switch (tid) {
        case "mmt_source_of_funding":
            query = "UPDATE mmt_source_of_funding SET source_of_funding_name = @name WHERE source_of_funding_id = @rowID";
            break;

        case "mmt_nationalwaterways":
            query = "UPDATE mmt_nationalwaterways SET status = @status WHERE nationalwaterways_id = @rowID";
            break;

        case "mmt_digital_portals":
            query = "UPDATE mmt_digital_portals SET status = @status WHERE digital_portal_id = @rowID";
            break;

        case "mmt_cargo":
            query = "UPDATE mmt_cargo SET status = @status WHERE cargo_id = @rowID";
            break;

        case "mmt_terminal_jetty":
            query = "UPDATE mmt_terminal_jetty SET status = @status WHERE terminal_id = @rowID";
            break;

        case "mmt_project_category":
            query = "UPDATE mmt_project_category SET status = @status WHERE project_category_id = @rowID";
            break;

        case "mmt_wings":
            query = "UPDATE mmt_wings SET status = @status WHERE wing_id = @rowID";
            break;

        case "mmt_department":
            query = "UPDATE mmt_department SET status = @status WHERE department_id = @rowID";
            break;

        case "mmt_scheme":
            query = "UPDATE mmt_scheme SET status = @status WHERE scheme_id = @rowID";
            break;

        case "mmt_initiative":
            query = "UPDATE mmt_initiative SET status = @status WHERE initiative_id = @rowID";
            break;

        case "mmt_division":
            query = "UPDATE mmt_division SET status = @status WHERE division_id = @rowID";
            break;

        case "mmt_section":
            query = "UPDATE mmt_section SET status = @status WHERE section_id = @rowID";
            break;

        case "mmt_mp_constituency":
            query = "UPDATE mmt_mp_constituency SET status = @status WHERE mpc_id = @rowID";
            break;

        case "mmt_project_category":
            query = "UPDATE mmt_project_category SET project_category_name = @name WHERE project_category_id = @rowID";
            break;

        case "mmt_organisation":
            query = "UPDATE mmt_organisation SET status = @status WHERE organisation_id = @rowID";
            break;
        case "mmt_funding_agency":
            query = "UPDATE mmt_funding_agency SET status = @status WHERE fa_id = @rowID";
            break;

        case "mmt_implementing_agency":
            query = "UPDATE mmt_implementing_agency SET status = @status WHERE ia_id = @rowID";
            break;

        case "mmt_state":
            query = "UPDATE mmt_state SET status = @status WHERE state_id = @rowID";
            break;

        case "mmt_district":
            query = "UPDATE mmt_district SET status = @status WHERE district_id = @rowID";
            break;

        case "mmt_output":
            query = "UPDATE mmt_output SET status = @status WHERE project_output_id = @rowID";
            break;

        case "mmt_outcome":
            query = "UPDATE mmt_outcome SET status = @status WHERE project_outcome_id = @rowID";
            break;

        case "mmt_clearance":
            query = "UPDATE mmt_clearance SET status = @status WHERE clearance_id = @rowID";
            break;

        case "mmt_ministry":
            query = "UPDATE mmt_ministry SET status = @status WHERE ministry_id = @rowID";
            break;

        case "mmt_dredger":
            query = "UPDATE mmt_dredger SET status = @status WHERE dredger_id = @rowID";
            break;

        case "mmt_survey_vessel":
            query = "UPDATE mmt_survey_vessel SET status = @status WHERE surveyVessel_id = @rowID";
            break;
            
        case "mmt_shipyard":
            query = "UPDATE mmt_shipyard SET status = @status WHERE shipyard_id = @rowID";
            break;
    }

    try {
        const result = await request.query(query);
        console.log(result);
        // const result = await request.query(`UPDATE ${tid} SET status = @status WHERE source_of_funding_id = @rowID`);
        // console.log(result);
        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDropDownAllValues(req, res) {
    const conn = await pool;
    const tid = req.params.tid;

    let query;
    switch (tid) {
        case "mmt_department":
            query = "SELECT department_id, department_name FROM mmt_department WHERE status = 1 ORDER BY department_name";
            break;

        case "mmt_state":
            query = "SELECT state_id, state_name FROM mmt_state WHERE status = 1 ORDER BY state_name";
            break;

        case "mmt_district":
            query = "SELECT district_id, district_name, state_id FROM mmt_district WHERE status = 1";
            break;

        case "mmt_mp_constituency":
            query = "SELECT mpc_id, mpc_name, state_id FROM mmt_mp_constituency WHERE status = 1 ORDER BY mpc_name";
            break;

        case "mmt_wings":
            query = "SELECT wing_id, wing_name FROM mmt_wings WHERE status = 1 ORDER BY wing_name";
            break;

        case "mmt_division":
            query = "SELECT division_id, division_name FROM mmt_division WHERE status = 1 ORDER BY division_name";
            break;

        case "mmt_section":
            query = "SELECT section_id, section_name FROM mmt_section WHERE status = 1 ORDER BY section_name";
            break;

        case "mmt_project_category":
            query = "SELECT project_category_id, project_category_name FROM mmt_project_category WHERE status = 1 ORDER BY project_category_name";
            break;

        case "mmt_scheme":
            query = "SELECT scheme_id, scheme_name FROM mmt_scheme WHERE status = 1 ORDER BY scheme_name";
            break;

        case "mmt_source_of_funding":
            query = "SELECT source_of_funding_id, source_of_funding_name FROM mmt_source_of_funding WHERE status = 1 ORDER BY source_of_funding_name ";
            break;

        // case "mmt_vip_reference_status":
        //     query = "SELECT vip_reference_status_id, vip_reference_status_name FROM mmt_vip_reference_status WHERE status = 1";
        //     break;

        case "mmt_initiative":
            query = "SELECT initiative_id, initiative_name FROM mmt_initiative WHERE status = 1 ORDER BY initiative_name";
            break;

        case "mmt_funding_agency":
            query = "SELECT fa_id, fa_name FROM mmt_funding_agency WHERE status = 1 ORDER BY fa_name ";
            break;

        case "mmt_clearance":
            query = "SELECT clearance_id, clearance_name FROM mmt_clearance WHERE status = 1 ORDER BY clearance_name";
            break;

        case "tbl_role":
            query = "SELECT role_id, role_name FROM tbl_role";
            break;

        case "mmt_organisation":
            query = "SELECT organisation_id, organisation_name FROM mmt_organisation WHERE status = 1 ORDER BY organisation_name";
            break;

        case "mmt_implementing_agency":
            query = "SELECT ia_id, ia_name FROM mmt_implementing_agency WHERE status = 1 ORDER BY ia_name";
            break;

        case "mmt_output":
            query = "SELECT project_output_id, project_output_name FROM mmt_output WHERE status = 1 ORDER BY project_output_name";
            break;

        case "mmt_outcome":
            query = "SELECT project_outcome_id, project_outcome_name, project_output_id FROM mmt_outcome WHERE status = 1 ORDER BY project_outcome_name ";
            break;

        case "mmt_organisation":
            query = "SELECT organisation_id, organisation_name FROM mmt_organisation WHERE status = 1 ORDER BY organisation_name";
            break;

        case "mmt_organisation_category":
            query = "SELECT organisation_category_id, organisation_category_name FROM mmt_organisation_category WHERE status = 1 ORDER BY ";
            break;

        case "mmt_ministry":
            query = "SELECT ministry_id, ministry_name FROM mmt_ministry WHERE status = 1 ORDER BY ministry_name";
            break;

        case "mmt_new_initiatives":
            query = "SELECT Initiaitive_ID, Initiaitive_name FROM mmt_new_initiatives";
            break;

        case "mmt_dredger":
            query = "SELECT dredger_id, dredger_name FROM mmt_dredger WHERE status = 1 ORDER BY dredger_name";
            break;

        case "mmt_survey_vessel":
            query = "SELECT surveyVessel_id, surveyVessel_name FROM mmt_survey_vessel WHERE status = 1 ORDER BY surveyVessel_name";
            break;

        case "mmt_cabinet_mopsw_stage":
            query = "SELECT * FROM mmt_cabinet_mopsw_stage";
            break;
        case "mmt_cabinet_mopsw_stage":
            query = "SELECT * FROM mmt_cabinet_mopsw_stage ORDER BY mopsw_stage_id";
            break;

        case "mmt_cabinet_ministry_stage":
            query = "SELECT * FROM mmt_cabinet_ministry_stage  ";
            break;

        case "mmt_consultant_appointment_stage":
            query = "SELECT * FROM mmt_consultant_appointment_stage  ";
            break;

        case "mmt_vip_stage":
            query = "SELECT * FROM mmt_vip_stage";
            break;
            
        case "mmt_organization_info":
            query = "SELECT * FROM mmt_organization_info";
            break;         
    }
    try {
        const result = await conn.query(query);
        res.json(result.recordset);
        // const result = await conn.query(`SELECT * FROM ${tid};`);
        // res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getFilterDependecyDropDown(req, res) {
    const conn = await pool;
    const tid = req.params.tid;

    let query;
    switch (tid) {

        case "mmt_state":
            query = "SELECT state_id, state_name FROM mmt_state WHERE status = 1 ORDER BY state_name";
            break;

        case "mmt_district":
            query = "SELECT district_id, district_name, state_id FROM mmt_district WHERE status = 1";
            break;

        case "mmt_wings":
            query = "SELECT wing_id, wing_name FROM mmt_wings WHERE status = 1 ORDER BY wing_name";
            break;

        case "mmt_division":
            query = "SELECT division_id, division_name, wing_id FROM mmt_division WHERE status = 1 ORDER BY division_name";
            break;

        case "tbl_role":
            query = "SELECT role_id, role_name FROM tbl_role";
            break;

        case "mmt_organisation_category":
            query = "SELECT organisation_category_id, organisation_category_name FROM mmt_organisation_category WHERE status = 1";
            break;

        case "mmt_organisation":
            query = `SELECT organisation_name, mmt_organisation_category.organisation_category_name FROM mmt_organisation 
                INNER JOIN mmt_organisation_category on mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id 
                WHERE mmt_organisation.status = 1`;
            break;

        case "mmt_implementing_agency":
            query = "SELECT ia_id, ia_name FROM mmt_implementing_agency WHERE status = 1";
            break;

        case "mmt_output":
            query = "SELECT project_output_id, project_output_name FROM mmt_output WHERE status = 1";
            break;

        case "mmt_outcome":
            query = "SELECT project_outcome_id, project_outcome_name, project_output_id FROM mmt_outcome WHERE status = 1";
            break;

        case "mmt_ministry":
            query = "SELECT ministry_id, ministry_name FROM mmt_ministry WHERE status = 1 ORDER BY ministry_name";
            break;

    }
    try {
        const result = await conn.query(query);
        res.json(result.recordset);
        // const result = await conn.query(`SELECT * FROM ${tid};`);
        // res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default {
    createMmt, updateMmt, getMmt, getDropDownData, getDropDownProjectList,  getDropDownSubProjectList, 
    toggleStatusMmt, getDropDownAllValues, getFilterDependecyDropDown
};