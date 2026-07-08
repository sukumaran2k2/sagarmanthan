import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getProjectProposal(req, res) {
    const { email, password } = req.query;
    if (!email || !password) {
        return res.status(401).json({ message: "Please enter your email and password" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("email", email);

    const result = await request.query(`SELECT password FROM tbl_user WHERE email = @email`);
    const user = result.recordset[0];

    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });;
    }

    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    const query = `
        DECLARE
                @financialYear nvarchar(50), @firstDateCurrentFy date ,  @todayDate date
               
                SET @firstDateCurrentFy = '2024-04-01';
                SET @financialYear = '2024-2025';
				SET @todayDate = '2025-02-27';
      
        WITH ProjectDetails AS 
            (   SELECT
                    mmt_organisation.organisation_name,
                    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                    tbl_project.project_id, tbl_sub_project.sub_project_id,
                    tbl_project.project_name,tbl_sub_project.sub_project_name,
                    ISNULL(tbl_sub_project.sub_sagarmala_project_id,tbl_project.sagarmala_project_id) AS sagarmala_project_id,
                    ISNULL(tbl_sub_project.sub_project_brief,tbl_project.project_brief) AS project_brief,
                    ISNULL(tbl_sub_project.sub_estimated_cost,tbl_project.estimated_cost) AS estimated_cost,
                    ISNULL(tbl_sub_project.sub_sanctioned_cost,tbl_project.sanctioned_cost) AS sanctioned_cost,
                    ISNULL(tbl_sub_project.sub_technical_sanction_cost, technical_sanction_cost) AS technical_sanction_cost,
                    ISNULL(tbl_sub_project.sub_award_project_cost, award_project_cost) AS award_project_cost,
                    ISNULL(tbl_sub_project.sub_project_type,tbl_project.project_type) AS project_type,
                    ISNULL(tbl_sub_project.sub_closure_cost,tbl_project.closure_cost) AS closure_cost,
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion,tbl_project.actual_date_of_completion) AS actual_date_of_completion,
                    ISNULL(tbl_sub_project.sub_mode_of_implememtation,tbl_project.mode_of_implememtation) AS mode_of_implememtation,
                    ISNULL(tbl_sub_project.sub_implememtation_type,tbl_project.implememtation_type) AS implememtation_type,
                    ISNULL(tbl_sub_project.sub_project_intiated_date,tbl_project.project_intiated_date) AS project_intiated_date,
                    ISNULL(tbl_sub_project.sub_target_completion_date,tbl_project.target_completion_date) AS target_completion_date,
                    ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date,tbl_project.prefeasiblity_actual_date) AS prefeasibility_actual_date,
                    ISNULL(tbl_sub_project.sub_dpr_actual_date,tbl_project.dpr_actual_date) AS dpr_actual_date,
                    ISNULL(tbl_sub_project.sub_chairman_approval_date,tbl_project.chairman_approval_date) AS chairman_approval_date,
                    ISNULL(tbl_sub_project.sub_ministry_submission_date,tbl_project.ministry_submission_date) AS ministry_submission_date,
                    ISNULL(tbl_sub_project.sub_da_approval_date,tbl_project.da_approval_date) AS da_approval_date,
                    ISNULL(tbl_sub_project.sub_ifw_approval_date,tbl_project.ifw_approval_date) AS ifw_approval_date,
                    ISNULL(tbl_sub_project.sub_imc_approval_date,tbl_project.imc_approval_date) AS imc_approval_date,
                    ISNULL(tbl_sub_project.sub_response_com_rec_approval_date,tbl_project.response_com_rec_approval_date) AS response_com_rec_approval_date,
                    ISNULL(tbl_sub_project.sub_sfc_approval_date,tbl_project.sfc_approval_date) AS sfc_approval_date,
                    ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date) AS admin_approval_approval_date,
                    mmt_implementing_agency.ia_name AS primary_ia_name, 
                    sec_imp_agency.ia_name AS sec_imp_agency, num_ut_tender_calls,
                    ISNULL((
                        SELECT STRING_AGG(mpc.project_category_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_project_category_id)), ',') AS sps
                        JOIN mmt_project_category AS mpc ON TRY_CAST(sps.value AS int) = mpc.project_category_id
                    ), (
                        SELECT STRING_AGG(mpc.project_category_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.project_category_id)), ',') AS ps
                        JOIN mmt_project_category AS mpc ON TRY_CAST(ps.value AS int) = mpc.project_category_id
                    )) AS project_category_names ,
                    ISNULL((
                        SELECT STRING_AGG(mi.initiative_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.initiative_id)), ',') AS pi
                        JOIN mmt_initiative AS mi ON TRY_CAST(pi.value AS int) = mi.initiative_id
                    ), (
                        SELECT STRING_AGG(mi.initiative_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_initiative_id)), ',') AS si
                        JOIN mmt_initiative AS mi ON TRY_CAST(si.value AS int) = mi.initiative_id
                    ) ) AS initiative_names,
					ISNULL((
						SELECT STRING_AGG(msf.source_of_funding_name, ', ')
						FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_source_of_funding_id)), ',') AS ssf
						JOIN mmt_source_of_funding AS msf ON TRY_CAST(ssf.value AS int) = msf.source_of_funding_id
					),(
						SELECT STRING_AGG(msf.source_of_funding_name, ', ')
						FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.source_of_funding_id)), ',') AS sf
						JOIN mmt_source_of_funding AS msf ON TRY_CAST(sf.value AS int) = msf.source_of_funding_id
					)) AS source_of_funding_names, 
                    mmt_funding_agency.fa_name AS primary_fa_name, secondary_funding_agency_name.fa_name AS secondary_fa_name,
                     tbl_project.state_id,      
                    tbl_sub_project.sub_state_id,
                    (
                        SELECT STRING_AGG(st1.state_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.state_id)), ',') AS st
                        JOIN mmt_state AS st1 ON TRY_CAST(st.value AS int) = st1.state_id
                    ) AS state_names,
                    (
                        SELECT STRING_AGG(sst1.state_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_state_id)), ',') AS sst
                        JOIN mmt_state AS sst1 ON TRY_CAST(sst.value AS int) = sst1.state_id
                    ) AS sub_state_names, 
                    tbl_project.district_id,
                    tbl_sub_project.sub_district_id,
                    (
                        SELECT STRING_AGG(dt1.district_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.district_id)), ',') AS dt
                        JOIN mmt_district AS dt1 ON TRY_CAST(dt.value AS int) = dt1.district_id
                    ) AS district_names,
                    (
                        SELECT STRING_AGG(sdt1.district_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_district_id)), ',') AS sdt
                        JOIN mmt_district AS sdt1 ON TRY_CAST(sdt.value AS int) = sdt1.district_id
                    ) AS sub_district_names,
                    tbl_project.mp_constituency_id,
                    tbl_sub_project.sub_mp_constituency_id,
                    (
                        SELECT STRING_AGG(mp1.mpc_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.mp_constituency_id)), ',') AS mp
                        JOIN mmt_mp_constituency AS mp1 ON TRY_CAST(mp.value AS int) = mp1.mpc_id
                    ) AS mp_constituency_names,
                    (
                        SELECT STRING_AGG(smp1.mpc_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_mp_constituency_id)), ',') AS smp
                        JOIN mmt_mp_constituency AS smp1 ON TRY_CAST(smp.value AS int) = smp1.mpc_id
                    ) AS sub_mp_constituency_names, 
                    mmt_outcome.project_outcome_name AS project_outcome_name,
					mmt_output.project_output_name AS project_output_name,
                    ISNULL(tbl_sub_project.sub_taluka_id, tbl_project.taluka_id) AS taluka_id,
                    ISNULL(tbl_sub_project.sub_village_id, tbl_project.village_id) AS village_id,
                    ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) AS is_sagarmala_funded,
                    ISNULL(tbl_sub_project.sub_gbs_components, tbl_project.gbs_components) AS gbs_components,
                    ISNULL(tbl_sub_project.sub_iebr_components, tbl_project.iebr_components) AS iebr_components,
                    ISNULL(tbl_sub_project.sub_ppp_components, tbl_project.ppp_components) AS ppp_components,
                    ISNULL(tbl_sub_project.sub_loans_components,tbl_project.loans_components) AS loans_components,
                    ISNULL(tbl_sub_project.sub_multilateral_components, tbl_project.multilateral_components) AS multilateral_components,
                    ISNULL(tbl_sub_project.sub_state_gov_fund_components, tbl_project.state_gov_fund_components) AS state_gov_fund_components,          
                    ISNULL(tbl_sub_project.sub_pmmsy_components, tbl_project.pmmsy_components) AS pmmsy_components,
                    ISNULL(tbl_sub_project.sub_sagarmala_components, tbl_project.sagarmala_components) AS sagarmala_components,
                    ISNULL(tbl_sub_project.sub_other_source_funding_comp, tbl_project.other_source_funding_comp) AS other_source_funding_comp,
                    ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,
                    ISNULL(tbl_sub_project.sub_foundation_laid, tbl_project.foundation_laid) AS foundation_laid,
                    ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date) AS foundation_laid_date,
                    ISNULL(tbl_sub_project.sub_foundation_tentative_date, tbl_project.foundation_tentative_date) AS foundation_tentative_date,
                    ISNULL(tbl_sub_project.sub_inauguration_value, tbl_project.inauguration_value) AS inauguration_value,
                    ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date) AS inauguration_date,
                    ISNULL(tbl_sub_project.sub_tentative_inauguration_date, tbl_project.tentative_inauguration_date) AS tentative_inauguration_date,
                    CASE WHEN tbl_sub_project.sub_on_land_acquisition = 1 THEN 'Yes' 
                        WHEN tbl_project.on_land_acquisition = 1 THEN 'Yes' ELSE 'No' END AS on_land_acquisition,
                    ISNULL(tbl_sub_project.sub_land_area_req, tbl_project.land_area_req) AS land_area_req,
                    CASE WHEN tbl_sub_project.sub_on_acquisition_completed = 1 THEN 'Yes' 
                        WHEN tbl_project.on_acquisition_completed = 1 THEN 'Yes' ELSE 'No' END AS on_acquisition_completed,
                    ISNULL(tbl_sub_project.sub_percent_land_acq, tbl_project.percent_land_acq) AS percent_land_acq,
                    mmt_scheme.scheme_name AS scheme_name,tbl_project.submitted_by, tbl_sub_project.sub_submitted_by,
                    tbl_project_stage.stage_name AS stage_name, tbl_project.status,tbl_sub_project.sub_status, 
                    ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated) AS last_updated_date   
                FROM 
                    tbl_project

                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id 
                LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id)
                LEFT JOIN mmt_implementing_agency AS sec_imp_agency ON sec_imp_agency.ia_id = ISNULL(tbl_project.secondary_ia_id, tbl_sub_project.sub_secondary_ia_id)
                LEFT JOIN mmt_funding_agency ON mmt_funding_agency.fa_id = ISNULL(tbl_sub_project.sub_primary_funding_agency_id, tbl_project.primary_funding_agency_id)
                LEFT JOIN (SELECT fa_id, fa_name FROM mmt_funding_agency) secondary_funding_agency_name ON secondary_funding_agency_name.fa_id = ISNULL(tbl_sub_project.sub_secondary_funding_agency_id,tbl_project.secondary_funding_agency_id)
                LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = ISNULL(tbl_sub_project.sub_scheme_id,tbl_project.scheme_id)
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
                LEFT JOIN mmt_state ON mmt_state.state_id = TRY_CAST(ISNULL(tbl_sub_project.sub_state_id, tbl_project.state_id) AS int)
                LEFT JOIN mmt_district ON mmt_district.district_id = TRY_CAST(ISNULL(tbl_sub_project.sub_district_id, tbl_project.district_id) AS int)
                LEFT JOIN mmt_mp_constituency ON mmt_mp_constituency.mpc_id = TRY_CAST(ISNULL(tbl_sub_project.sub_mp_constituency_id, tbl_project.mp_constituency_id) AS int)
                LEFT JOIN tbl_project_stage AS tbl_project_stage ON tbl_project_stage.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id,tbl_project.current_project_stage_id)
				LEFT JOIN mmt_outcome AS mmt_outcome ON mmt_outcome.project_outcome_id = ISNULL(tbl_sub_project.sub_project_outcome_id,tbl_project.project_outcome_id)
				LEFT JOIN mmt_output AS mmt_output ON mmt_output.project_output_id = ISNULL(tbl_sub_project.sub_project_output_id,tbl_project.project_output_id)),
            
            ProjectProgress AS 
            ( SELECT 
                    tbl_project.project_id, tbl_sub_project.sub_project_id AS sub_project_id,
                    MAX(tbl_project_physical_progress.physical_progress) AS physical_progress,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 3 THEN tbl_project_date.actual_date ELSE NULL END) AS tech_sanction_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 4 THEN tbl_project_date.actual_date ELSE NULL END) AS tender_doc_approved_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 5 THEN tbl_project_date.actual_date ELSE NULL END) AS tender_notice_issued_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 6 THEN tbl_project_date.actual_date ELSE NULL END) AS technical_evaluation_completed_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 7 THEN tbl_project_date.actual_date ELSE NULL END) AS financial_evaluation_completed_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 8 THEN tbl_project_date.actual_date ELSE NULL END) AS sanction_of_authority_obtained_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 9 THEN tbl_project_date.actual_date ELSE NULL END) AS work_awarded_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 10 THEN tbl_project_date.actual_date ELSE NULL END) AS contract_sign_date,

                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 3 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_tech_sanction_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 4 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_tender_doc_approved_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 5 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_tender_notice_issued_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 6 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_technical_evaluation_completed_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 7 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_financial_evaluation_completed_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 8 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_sanction_of_authority_obtained_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 9 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_work_awarded_date,
                    MAX(CASE WHEN tbl_project_date.sub_stage_id = 10 THEN tbl_project_date.planned_date ELSE NULL END) AS planned_contract_sign_date
                FROM 
                    tbl_project
                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id AND tbl_project_physical_progress.sub_project_id = ISNULL(tbl_sub_project.sub_project_id, -1)
                LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id AND tbl_project_date.sub_project_id = ISNULL(tbl_sub_project.sub_project_id, -1)
                GROUP BY 
                    tbl_project.project_id,tbl_sub_project.sub_project_id
            ),

			MilestoneDates AS 
            ( SELECT 
                    tbl_project.project_id, tbl_sub_project.sub_project_id AS sub_project_id,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 0 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_0_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 0 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_0_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 1 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_1_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 1 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_1_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 2 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_2_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 2 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_2_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 3 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_3_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 3 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_3_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 4 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_4_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 4 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_4_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 5 THEN tbl_project_activity.start_date ELSE NULL END) AS milestone_5_target_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 5 THEN tbl_project_activity.end_date ELSE NULL END) AS milestone_5_actual_date,
                    MAX(CASE WHEN tbl_project_activity.milestone_id = 1 THEN tbl_project_activity.delay_reason ELSE NULL END) AS delay_reason
                FROM 
                    tbl_project
                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                LEFT JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id AND tbl_project_activity.sub_project_id = ISNULL(tbl_sub_project.sub_project_id, -1)
                GROUP BY 
                    tbl_project.project_id,	tbl_sub_project.sub_project_id
            ),

            ExpenditureTillDate AS 
            (SELECT 
            tbl_project_expenditure.project_id, 
            tbl_project_expenditure.sub_project_id, 
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
            ) AS expenditure_till_date,
            CASE
                WHEN (COALESCE(tbl_project.award_project_cost, 0) + COALESCE(tbl_sub_project.sub_award_project_cost, 0)) = 0 THEN 0
                ELSE (SUM(
                    COALESCE(tbl_project_expenditure.gbs_components, 0) + 
                    COALESCE(tbl_project_expenditure.iebr_components, 0) + 
                    COALESCE(tbl_project_expenditure.ppp_components, 0) + 
                    COALESCE(tbl_project_expenditure.loans_components, 0) + 
                    COALESCE(tbl_project_expenditure.multilateral_components, 0) + 
                    COALESCE(tbl_project_expenditure.state_gov_fund_components, 0) +                     
                    COALESCE(tbl_project_expenditure.pmmsy_components, 0) + 
                    COALESCE(tbl_project_expenditure.sagarmala_components, 0) + 
                    COALESCE(tbl_project_expenditure.other_source_funding_comp, 0)
                ) / NULLIF((COALESCE(tbl_project.award_project_cost, 0) + COALESCE(tbl_sub_project.sub_award_project_cost, 0)), 0)) * 100
            END AS financial_progress
        FROM 
            tbl_project_expenditure
        LEFT JOIN 
            tbl_project ON tbl_project.project_id = tbl_project_expenditure.project_id
        LEFT JOIN 
            tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id
        GROUP BY
            tbl_project_expenditure.project_id, 
            tbl_project_expenditure.sub_project_id, 
            tbl_project.award_project_cost, 
            tbl_sub_project.sub_award_project_cost
            ),

            ExpenditureTillDateFY AS 
            (
                SELECT 
                    tbl_project_expenditure.project_id, 
                    tbl_project_expenditure.sub_project_id, 
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
                ) AS expenditure_till_date_currentFY_only
                
                FROM 
                    tbl_project_expenditure
                LEFT JOIN 
                    tbl_project ON tbl_project.project_id = tbl_project_expenditure.project_id
                LEFT JOIN 
                    tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                WHERE 
                    tbl_project_expenditure.expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
                GROUP BY
                    tbl_project_expenditure.project_id, 
                    tbl_project_expenditure.sub_project_id
            ),

            Outlays AS 
            ( SELECT 
                    tbl_project.project_id,tbl_sub_project.sub_project_id,tbl_project_expenditure_outlay.expenditure_outlay
                FROM 
                    tbl_project_expenditure_outlay
                LEFT JOIN 
                    tbl_project ON tbl_project.project_id = tbl_project_expenditure_outlay.project_id
                LEFT JOIN 
                    tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_expenditure_outlay.sub_project_id
                WHERE 
                    tbl_project_expenditure_outlay.year = @financialYear
                GROUP BY
                    tbl_project.project_id,tbl_sub_project.sub_project_id,tbl_project_expenditure_outlay.expenditure_outlay
            )


            SELECT 
                PD.organisation_id, PD.organisation_name, PD.project_id, PD.sub_project_id, PD.project_name, PD.sub_project_name, 
                PD.sagarmala_project_id, PD.project_brief, PD.estimated_cost,PD.sanctioned_cost, PD.technical_sanction_cost, 
                PD.project_type, PD.mode_of_implememtation, PD.implememtation_type, PD.project_intiated_date,PD.target_completion_date,
                PD.prefeasibility_actual_date, PD.dpr_actual_date, PD.chairman_approval_date, PD.ministry_submission_date,
                PD.da_approval_date, PD.ifw_approval_date, PD.imc_approval_date, PD.response_com_rec_approval_date, PD.sfc_approval_date,
                PD.admin_approval_approval_date, PD.primary_ia_name, PD.sec_imp_agency, PD.primary_fa_name,PD.secondary_fa_name, 
                PD.actual_date_of_completion, PD.closure_cost, PD.state_names, PD.sub_state_names, PD.district_names, 
                PD.sub_district_names, PD.taluka_id, PD.village_id, PD.mp_constituency_names, PD.sub_mp_constituency_names, 
                PD.project_category_names, PD.initiative_names, PD.is_sagarmala_funded, PD.source_of_funding_names, 
                PD.gbs_components, PD.iebr_components, PD.ppp_components,PD.loans_components,PD.multilateral_components, 
                PD.state_gov_fund_components, PD.pmmsy_components, PD.sagarmala_components, PD.other_source_funding_comp, 
                PD.capacity_addition, PD.foundation_laid, PD.foundation_laid_date, PD.foundation_tentative_date,
                PD.inauguration_value, PD.inauguration_date, PD.tentative_inauguration_date, PD.on_land_acquisition, PD.project_output_name, PD.project_outcome_name,
                PD.land_area_req, PD.on_acquisition_completed,PD.percent_land_acq,PD.status, PD.sub_status, PD.submitted_by,
                 PD.sub_submitted_by, PD.scheme_name,PD.stage_name,PD.last_updated_date, PD.num_ut_tender_calls, 
                PD.award_project_cost, PP.tech_sanction_date,PP.tender_doc_approved_date,PP.tender_notice_issued_date,
                PP.technical_evaluation_completed_date,PP.financial_evaluation_completed_date, PP.sanction_of_authority_obtained_date,
                PP.work_awarded_date,PP.contract_sign_date, 
                PP.planned_tech_sanction_date,PP.planned_tender_doc_approved_date,PP.planned_tender_notice_issued_date,
                PP.planned_technical_evaluation_completed_date,PP.planned_financial_evaluation_completed_date,
                PP.planned_sanction_of_authority_obtained_date, PP.planned_work_awarded_date,PP.planned_contract_sign_date, 
                
                
                PP.physical_progress, MD.milestone_0_target_date,MD.milestone_0_actual_date,
                MD.milestone_1_target_date,MD.milestone_1_actual_date, MD.milestone_2_target_date,MD.milestone_2_actual_date,
                MD.milestone_3_target_date,MD.milestone_3_actual_date, MD.milestone_4_target_date,MD.milestone_4_actual_date,
                MD.milestone_5_target_date,MD.milestone_5_actual_date, ETD.expenditure_till_date, ETD.financial_progress, 
                expenditureFY.expenditure_till_date_currentFY_only, 
                OO.expenditure_outlay, MD.delay_reason

			FROM 
				ProjectDetails PD
			LEFT JOIN ProjectProgress PP ON PD.project_id = PP.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(PP.sub_project_id, -1)
			LEFT JOIN MilestoneDates MD ON PD.project_id = MD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(MD.sub_project_id, -1)
            LEFT JOIN Outlays OO ON PD.project_id = OO.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(OO.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDate ETD ON PD.project_id = ETD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(ETD.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDateFY expenditureFY ON PD.project_id = expenditureFY.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(expenditureFY.sub_project_id, -1)

            WHERE ((PD.sub_project_id IS NOT NULL AND PD.sub_status = 1) OR (PD.sub_project_id IS NULL AND PD.status = 1));   
        `;

    try {
        const queryResult = await request.query(query);
        res.json(queryResult.recordset);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong. Please try later" });
    }
}
