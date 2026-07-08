import { pool } from "../../db.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function projectFolderDownloadLog(req, res) 
{
    const userID = req.params.userID;
    const emailId = req.params.emailId;


    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);
    request.input("emailId", emailId);

   
    try {
     
            const query = ` INSERT INTO tbl_project_folder_download_log ( user_id, email_id, requested_datetime) 
            VALUES ( @userID, @emailId, CURRENT_TIMESTAMP ) `;

        const result = await request.query(query);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function projectMediaLinkDownload(req, res) {
    try {
        const fileName = req.params.fileName + ".zip";

        const conn = await pool;
        const request = conn.request();
        request.input('fileName', fileName);

        // console.log(fileName, "fileName")

        const file_path = path.join(__dirname, "../../../fileuploads/project-media-files-download", fileName);
        const staticFileName = "Project Media Files.zip";  // Desired filename for download

        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${staticFileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);
         
            res.on("finish", () => {
                fs.rm(file_path, () => {});
            })
                     
            // // Listen for the "finish" event to know when the file has been fully downloaded
            // fileStream.on('end', () => {
            //     console.log('Download complete, removing the file.');
            //     fs.rm(file_path, (err) => {
            //         if (err) {
            //             console.error('Error removing file:', err);
            //         }
            //     });
            // });

            // // Listen for the "close" event to handle download cancellation
            // res.on('close', () => {
            //     console.log('Download canceled, file will not be removed.');
            //     // You can optionally handle cleanup if needed, but for now, we just log that the download was canceled.
            // });

        } else {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }
      
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getProjectList(req, res) {
    const conn = await pool;
    const userID = req.params.userID;

    try {
        const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id } = userResult.recordset[0];

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            const result = await conn.query(`SELECT 
            tbl_project.project_id,
            tbl_project.sagarmala_project_id,
            tbl_sub_project.sub_project_id,
            project_name,
            sub_project_name,
            tbl_project.project_category_id,
            tbl_sub_project.sub_project_category_id,
            (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.project_category_id)), ',') AS ps
                JOIN mmt_project_category AS mpc ON TRY_CAST(ps.value AS int) = mpc.project_category_id
            ) AS project_category_names,
            (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_project_category_id)), ',') AS sps
                JOIN mmt_project_category AS mpc ON TRY_CAST(sps.value AS int) = mpc.project_category_id
            ) AS sub_project_category_names,
            initiative_id,
            sub_initiative_id,
            (
                SELECT STRING_AGG(mi.initiative_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.initiative_id)), ',') AS pi
                JOIN mmt_initiative AS mi ON TRY_CAST(pi.value AS int) = mi.initiative_id
            ) AS initiative_names,
            (
                SELECT STRING_AGG(mi.initiative_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_initiative_id)), ',') AS si
                JOIN mmt_initiative AS mi ON TRY_CAST(si.value AS int) = mi.initiative_id
            ) AS sub_initiative_names,
            source_of_funding_id,
            sub_source_of_funding_id,
            (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.source_of_funding_id)), ',') AS sf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(sf.value AS int) = msf.source_of_funding_id
            ) AS source_of_funding_names,
            (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_source_of_funding_id)), ',') AS ssf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(ssf.value AS int) = msf.source_of_funding_id
            ) AS sub_source_of_funding_names,
            project_brief,
            sanctioned_cost,
            sub_sanctioned_cost,
            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, organisation_name,            
            ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
            ISNULL(tbl_sub_project.sub_implememtation_type, tbl_project.implememtation_type) AS implememtation_type,
            ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id) AS primary_ia_id,
            ISNULL(tbl_sub_project.sub_secondary_ia_id, tbl_project.secondary_ia_id) AS secondary_ia_id,
            ISNULL(sec_imp_agency_sub.ia_name, sec_imp_agency.ia_name) AS sec_imp_agency,
            ISNULL(tbl_sub_project.sub_target_completion_date, tbl_project.target_completion_date) AS target_completion_date,
            ISNULL(mmt_implementing_agency.ia_name, '') AS primary_ia_name,
            tbl_project.scheme_id,
            ISNULL(tbl_sub_project.sub_gbs_components, gbs_components) AS gbs_components,
            ISNULL(tbl_sub_project.sub_iebr_components, iebr_components) AS iebr_components,
            ISNULL(tbl_sub_project.sub_ppp_components, ppp_components) AS ppp_components,
            ISNULL(tbl_sub_project.sub_loans_components, loans_components) AS loans_components,
            ISNULL(tbl_sub_project.sub_multilateral_components, multilateral_components) AS multilateral_components,
            ISNULL(tbl_sub_project.sub_state_gov_fund_components, state_gov_fund_components) AS state_gov_fund_components,
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
            state_name, mpc_name, ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) AS current_project_stage_id,
            stageName.stage_name AS stage_name,
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
            ISNULL(tbl_sub_project.sub_taluka_id, taluka_id) AS taluka_id,
            ISNULL(tbl_sub_project.sub_village_id, village_id) AS village_id,
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
            ISNULL(tbl_sub_project.sub_award_project_cost, award_project_cost) AS award_project_cost,
            ISNULL(sub_scheme.scheme_name,  mmt_scheme.scheme_name) AS scheme_name,
            ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) AS is_sagarmala_funded,
            physicalProgress.physical_progress, financialProgress.financial_progress,
            ISNULL(tbl_sub_project.sub_submitted_by, tbl_project.submitted_by) AS submitted_by,
            ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated) AS last_updated_date
        FROM tbl_project           
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id)
        LEFT JOIN (SELECT ia_id, ia_name FROM mmt_implementing_agency) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
        LEFT JOIN mmt_implementing_agency AS mmt_implementing_agency_sub ON mmt_implementing_agency_sub.ia_id = tbl_sub_project.sub_primary_ia_id
        LEFT JOIN (SELECT ia_id, ia_name FROM mmt_implementing_agency) sec_imp_agency_sub ON sec_imp_agency_sub.ia_id = tbl_sub_project.sub_secondary_ia_id
        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
        LEFT JOIN mmt_scheme AS sub_scheme ON sub_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        LEFT JOIN mmt_state ON mmt_state.state_id = TRY_CAST(ISNULL(tbl_sub_project.sub_state_id, tbl_project.state_id) AS int)
        LEFT JOIN mmt_mp_constituency ON mmt_mp_constituency.mpc_id = TRY_CAST(ISNULL(tbl_sub_project.sub_mp_constituency_id, tbl_project.mp_constituency_id) AS int)
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

        LEFT JOIN 
        (
            SELECT tbl_project_physical_progress.project_id, 
            MAX(physical_progress) AS physical_progress
            FROM tbl_project
            LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id
            WHERE tbl_project_physical_progress.sub_project_id = '-1'
            GROUP BY tbl_project_physical_progress.project_id
            UNION
            SELECT tbl_project_physical_progress.sub_project_id,                     
            MAX(physical_progress) AS physical_progress
            FROM tbl_sub_project
            LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.sub_project_id = tbl_sub_project.sub_project_id
            WHERE tbl_project_physical_progress.sub_project_id != '-1'  
            GROUP BY tbl_project_physical_progress.sub_project_id
        ) AS physicalProgress ON physicalProgress.project_id = ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)

        LEFT JOIN 
        (
            SELECT 
                tbl_project_expenditure.project_id, 
                (SUM(
                    ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                    ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                    ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                    ISNULL(tbl_project_expenditure.loans_components, 0) + 
                    ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) + 
                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                ) / NULLIF(tbl_project.award_project_cost, 0)) * 100 AS financial_progress
            FROM tbl_project_expenditure
            LEFT JOIN tbl_project 
                ON tbl_project_expenditure.project_id = tbl_project.project_id
            WHERE tbl_project_expenditure.sub_project_id = '-1'
            GROUP BY tbl_project_expenditure.project_id, tbl_project.award_project_cost
            UNION
            SELECT 
                tbl_project_expenditure.sub_project_id, 
                (SUM(
                    ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                    ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                    ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                    ISNULL(tbl_project_expenditure.loans_components, 0) + 
                    ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) + 
                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                ) / NULLIF(tbl_sub_project.sub_award_project_cost, 0)) * 100 AS financial_progress
            FROM tbl_project_expenditure
            LEFT JOIN tbl_sub_project 
                ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
            WHERE tbl_project_expenditure.sub_project_id != '-1'  
            GROUP BY tbl_project_expenditure.sub_project_id, tbl_sub_project.sub_award_project_cost
        ) AS financialProgress ON financialProgress.project_id = ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)

        LEFT JOIN (
            SELECT MAX(tbl_project_stage.stage_name) AS stage_name,
                tbl_project_stage.stage_id
            FROM tbl_project
            LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_project.current_project_stage_id
            GROUP BY tbl_project_stage.stage_id
            UNION
            SELECT MAX(tbl_project_stage.stage_name) AS stage_name,
                tbl_project_stage.stage_id
            FROM tbl_sub_project
            LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_sub_project.sub_current_project_stage_id
            WHERE tbl_sub_project.sub_project_id != '-1'  
            GROUP BY tbl_project_stage.stage_id
        ) AS stageName ON stageName.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)
        WHERE (
            (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
            OR (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
        )
        ORDER BY current_project_stage_id 

        ;`);

            // LEFT JOIN 
            // (
            //     SELECT tbl_project_activity.project_id, tbl_project_activity.updated_date
            //     FROM tbl_project
            //     LEFT JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
            //     WHERE tbl_project_activity.sub_project_id = '-1'

            //     UNION 

            //     SELECT tbl_project_activity.sub_project_id, tbl_project_activity.updated_date
            //     FROM tbl_sub_project
            //     LEFT JOIN tbl_project_activity ON tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id
            //     WHERE tbl_project_activity.sub_project_id != '-1'

            // ) AS lastUpdatedProject_activity ON lastUpdatedProject_activity.project_id = ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)

            res.json(result.recordset);
        }
        else {
            const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            const result = await conn.query(`SELECT 
                tbl_project.project_id,
                tbl_project.sagarmala_project_id,
                tbl_sub_project.sub_project_id,
                project_name,
                sub_project_name,
                project_brief,
                sanctioned_cost,
                sub_sanctioned_cost,
                tbl_project.project_category_id,
                tbl_sub_project.sub_project_category_id,
                (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.project_category_id)), ',') AS ps
                JOIN mmt_project_category AS mpc ON TRY_CAST(ps.value AS int) = mpc.project_category_id
            ) AS project_category_names,
            (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_project_category_id)), ',') AS sps
                JOIN mmt_project_category AS mpc ON TRY_CAST(sps.value AS int) = mpc.project_category_id
            ) AS sub_project_category_names,
                initiative_id,
                sub_initiative_id,
                (
                SELECT STRING_AGG(mi.initiative_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.initiative_id)), ',') AS pi
                JOIN mmt_initiative AS mi ON TRY_CAST(pi.value AS int) = mi.initiative_id
            ) AS initiative_names,
            (
                SELECT STRING_AGG(mi.initiative_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_initiative_id)), ',') AS si
                JOIN mmt_initiative AS mi ON TRY_CAST(si.value AS int) = mi.initiative_id
            ) AS sub_initiative_names,
                source_of_funding_id,
                sub_source_of_funding_id,
                (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.source_of_funding_id)), ',') AS sf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(sf.value AS int) = msf.source_of_funding_id
            ) AS source_of_funding_names,
            (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_source_of_funding_id)), ',') AS ssf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(ssf.value AS int) = msf.source_of_funding_id
            ) AS sub_source_of_funding_names,
                ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
                ISNULL(tbl_sub_project.sub_implememtation_type, tbl_project.implememtation_type) AS implememtation_type,
                ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id) AS primary_ia_id,
                ISNULL(tbl_sub_project.sub_secondary_ia_id, tbl_project.secondary_ia_id) AS secondary_ia_id,
                ISNULL(sec_imp_agency_sub.ia_name, sec_imp_agency.ia_name) AS sec_imp_agency,
                ISNULL(tbl_sub_project.sub_target_completion_date, tbl_project.target_completion_date) AS target_completion_date,
          
                ISNULL(mmt_implementing_agency.ia_name, '') AS primary_ia_name, tbl_project.scheme_id,
                ISNULL(tbl_sub_project.sub_gbs_components, gbs_components) AS gbs_components,
                ISNULL(tbl_sub_project.sub_iebr_components, iebr_components) AS iebr_components,
                ISNULL(tbl_sub_project.sub_ppp_components, ppp_components) AS ppp_components,
                ISNULL(tbl_sub_project.sub_loans_components, loans_components) AS loans_components,
                ISNULL(tbl_sub_project.sub_multilateral_components, multilateral_components) AS multilateral_components,
                ISNULL(tbl_sub_project.sub_state_gov_fund_components, state_gov_fund_components) AS state_gov_fund_components,
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
            ISNULL(tbl_sub_project.sub_taluka_id, taluka_id) AS taluka_id,
            ISNULL(tbl_sub_project.sub_village_id, village_id) AS village_id,
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
                ISNULL(tbl_sub_project.sub_award_project_cost, award_project_cost) AS award_project_cost,
                ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, organisation_name,
                ISNULL(sub_scheme.scheme_name,  mmt_scheme.scheme_name) AS scheme_name,
                ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) AS is_sagarmala_funded,
                physicalProgress.physical_progress, financialProgress.financial_progress,
                ISNULL(tbl_sub_project.sub_submitted_by, tbl_project.submitted_by) AS submitted_by,
                ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated) AS last_updated_date,                   
                ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) AS current_project_stage_id, 
                stageName.stage_name AS stage_name
                  
                FROM tbl_project           
                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id)
                LEFT JOIN (SELECT ia_id, ia_name FROM mmt_implementing_agency) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                LEFT JOIN mmt_implementing_agency AS mmt_implementing_agency_sub ON mmt_implementing_agency_sub.ia_id = tbl_sub_project.sub_primary_ia_id
                LEFT JOIN (SELECT ia_id, ia_name FROM mmt_implementing_agency) sec_imp_agency_sub ON sec_imp_agency_sub.ia_id = tbl_sub_project.sub_secondary_ia_id
                --LEFT JOIN mmt_project_category ON mmt_project_category.project_category_id = tbl_project.project_category_id
                --LEFT JOIN mmt_project_category AS sub_project_category ON sub_project_category.project_category_id = tbl_sub_project.sub_project_category_id
                LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
                LEFT JOIN mmt_scheme AS sub_scheme ON sub_scheme.scheme_id = tbl_sub_project.sub_scheme_id
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
              
                LEFT JOIN 
                (
                    SELECT tbl_project_physical_progress.project_id, MAX(physical_progress) AS physical_progress
                    FROM tbl_project
                   
                    LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id
                    WHERE tbl_project_physical_progress.sub_project_id = '-1'
                    GROUP BY tbl_project_physical_progress.project_id
                    
                    UNION

                    SELECT tbl_project_physical_progress.sub_project_id,MAX(physical_progress) AS physical_progress
                    FROM tbl_sub_project

                    LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.sub_project_id = tbl_sub_project.sub_project_id
                    WHERE tbl_project_physical_progress.sub_project_id != '-1'  
                    GROUP BY tbl_project_physical_progress.sub_project_id
    
                ) AS physicalProgress ON physicalProgress.project_id = ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)
              
                LEFT JOIN 
                (
                    SELECT 
                        tbl_project_expenditure.project_id, 
                        (SUM(
                            COALESCE(tbl_project_expenditure.gbs_components, 0) + 
                            COALESCE(tbl_project_expenditure.iebr_components, 0) + 
                            COALESCE(tbl_project_expenditure.ppp_components, 0) + 
                            COALESCE(tbl_project_expenditure.loans_components, 0) + 
                            COALESCE(tbl_project_expenditure.multilateral_components, 0) + 
                            COALESCE(tbl_project_expenditure.state_gov_fund_components, 0) +
                            COALESCE(tbl_project_expenditure.pmmsy_components, 0) + 
                            COALESCE(tbl_project_expenditure.sagarmala_components, 0) + 
                            COALESCE(tbl_project_expenditure.other_source_funding_comp, 0)
                        ) / NULLIF(tbl_project.award_project_cost, 0)) * 100 AS financial_progress

                    FROM tbl_project_expenditure
                    LEFT JOIN tbl_project 
                        ON tbl_project_expenditure.project_id = tbl_project.project_id
                    WHERE tbl_project_expenditure.sub_project_id = '-1'
                    GROUP BY tbl_project_expenditure.project_id, tbl_project.award_project_cost
                    
                    UNION

                    SELECT 
                        tbl_project_expenditure.sub_project_id, 
                        (SUM(
                            COALESCE(tbl_project_expenditure.gbs_components, 0) + 
                            COALESCE(tbl_project_expenditure.iebr_components, 0) + 
                            COALESCE(tbl_project_expenditure.ppp_components, 0) + 
                            COALESCE(tbl_project_expenditure.loans_components, 0) + 
                            COALESCE(tbl_project_expenditure.multilateral_components, 0) + 
                            COALESCE(tbl_project_expenditure.state_gov_fund_components, 0) + 
                            COALESCE(tbl_project_expenditure.pmmsy_components, 0) + 
                            COALESCE(tbl_project_expenditure.sagarmala_components, 0) + 
                            COALESCE(tbl_project_expenditure.other_source_funding_comp, 0)
                        ) / NULLIF(tbl_sub_project.sub_award_project_cost, 0)) * 100 AS financial_progress
                    FROM tbl_project_expenditure
                    LEFT JOIN tbl_sub_project 
                        ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
                    WHERE tbl_project_expenditure.sub_project_id != '-1'  
                    GROUP BY tbl_project_expenditure.sub_project_id, tbl_sub_project.sub_award_project_cost
                )AS financialProgress ON financialProgress.project_id = ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)
              
                LEFT JOIN 
                (
                    SELECT MAX(tbl_project_stage.stage_name) AS stage_name, tbl_project_stage.stage_id
                    FROM tbl_project
                    LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_project.current_project_stage_id
                    GROUP BY tbl_project_stage.stage_id
                
                    UNION
                
                    SELECT MAX(tbl_project_stage.stage_name) AS stage_name, tbl_project_stage.stage_id
                    FROM tbl_sub_project
                    LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_sub_project.sub_current_project_stage_id
                    WHERE tbl_sub_project.sub_project_id != '-1'  
                    GROUP BY tbl_project_stage.stage_id
                ) AS stageName ON stageName.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)                

                WHERE ISNULL(tbl_sub_project.sub_submitted_by, tbl_project.submitted_by) IN (${userIDs.join(',')}) AND 
                    ((sub_project_id is not null and tbl_sub_project.sub_status = 1) 
                    OR (sub_project_id is null and tbl_project.status = 1))
                
				ORDER BY current_project_stage_id 
            ;`);

            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getProjectAllData(req, res) {
    const conn = await pool;
    const userID = req.params.userID;
    try {
        const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id } = userResult.recordset[0];

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        let financialYear;
        if (currentDate.getMonth() >= 3 && currentDate.getDate() >= 1) {
            financialYear = `${currentYear}-${currentYear + 1}`;
        } else {
            financialYear = `${currentYear - 1}-${currentYear}`;
        }

        let firstDateCurrentFy, todayDate;
        let currentMonth = currentDate.getMonth() + 1;
        
        if (currentMonth <= 3 && currentMonth >= 1) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
            todayDate =  currentDate.toISOString().split('T')[0]; // Current date.

        }
        else {
            firstDateCurrentFy = (currentYear) + "-04-01";
            todayDate =  currentDate.toISOString().split('T')[0]; // Current date.
        }
        // cozznsole.log(currentMonth, firstDateCurrentFy, todayDate, "firstDateCurrentFy, todayDate")

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            // const result = await conn.query(`Select * from projectExportAll`);
            const result = await conn.query(`
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
                    tbl_project_expenditure.expenditure_date BETWEEN '${firstDateCurrentFy}' AND '${todayDate}'
                GROUP BY
                    tbl_project_expenditure.project_id, 
                    tbl_project_expenditure.sub_project_id
            ),

            
            ExpenditureTillPreviousFY AS 
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
                ) AS expenditure_till_PreviousFY
                
                FROM 
                    tbl_project_expenditure
                Inner JOIN 
                    tbl_project ON tbl_project.project_id = tbl_project_expenditure.project_id
                Inner JOIN 
                    tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                WHERE 
                    tbl_project_expenditure.expenditure_date < '${firstDateCurrentFy}' 
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
                    tbl_project_expenditure_outlay.year = '${financialYear}'
                GROUP BY
                    tbl_project.project_id,tbl_sub_project.sub_project_id,tbl_project_expenditure_outlay.expenditure_outlay
            ),


            RevisedTargetDates AS (
                SELECT 
                    project_id,
                    sub_project_id,
                    MAX(CASE WHEN rn = 1 THEN revised_target_completion_date END) AS revised_target_date_1,
                    MAX(CASE WHEN rn = 2 THEN revised_target_completion_date END) AS revised_target_date_2,
                    MAX(CASE WHEN rn = 3 THEN revised_target_completion_date END) AS revised_target_date_3
                FROM (
                    SELECT *,
                        ROW_NUMBER() OVER (PARTITION BY project_id, sub_project_id ORDER BY revised_on) AS rn
                    FROM tbl_project_target_date_history
                ) t
                GROUP BY project_id, sub_project_id
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
                expenditureFY.expenditure_till_date_currentFY_only, expenditurePreviousFY.expenditure_till_PreviousFY, OO.expenditure_outlay,
                RTD.revised_target_date_1, RTD.revised_target_date_2, RTD.revised_target_date_3, MD.delay_reason

			FROM 
				ProjectDetails PD
			LEFT JOIN ProjectProgress PP ON PD.project_id = PP.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(PP.sub_project_id, -1)
			LEFT JOIN MilestoneDates MD ON PD.project_id = MD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(MD.sub_project_id, -1)
            LEFT JOIN Outlays OO ON PD.project_id = OO.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(OO.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDate ETD ON PD.project_id = ETD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(ETD.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDateFY expenditureFY ON PD.project_id = expenditureFY.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(expenditureFY.sub_project_id, -1)
            LEFT JOIN ExpenditureTillPreviousFY expenditurePreviousFY ON PD.project_id = expenditurePreviousFY.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(expenditurePreviousFY.sub_project_id, -1)
            LEFT JOIN RevisedTargetDates RTD ON PD.project_id = RTD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(RTD.sub_project_id, -1)
           
            WHERE ((PD.sub_project_id IS NOT NULL AND PD.sub_status = 1) OR (PD.sub_project_id IS NULL AND PD.status = 1));  
                
        `);
            res.json(result.recordset);
        }
        else {
            const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            // const result = await conn.query (organsationBased );

            //NOTE : Query table details
            // Heading          Aliasing    Related Tables
            // ProjectDetails   PD          tbl_project,tbl_sub_project
            // ProjectProgress  PP          tbl_project,tbl_sub_project,tbl_project_date
            // MilestoneDates   AD          tbl_project,tbl_sub_project,tbl_project_date 
            // Outlays          OO          tbl_project,tbl_sub_project,tbl_project_expenditure_outlay 

            const result = await conn.query(` WITH ProjectDetails AS 
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
            ( SELECT 
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
                    tbl_project_expenditure.expenditure_date BETWEEN '${firstDateCurrentFy}' AND '${todayDate}'
                GROUP BY
                    tbl_project_expenditure.project_id, 
                    tbl_project_expenditure.sub_project_id
            ),

            
            ExpenditureTillPreviousFY AS 
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
                ) AS expenditure_till_PreviousFY
                
                FROM 
                    tbl_project_expenditure
                LEFT JOIN 
                    tbl_project ON tbl_project.project_id = tbl_project_expenditure.project_id
                LEFT JOIN 
                    tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                WHERE 
                    tbl_project_expenditure.expenditure_date < '${firstDateCurrentFy}' 
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
                    tbl_project_expenditure_outlay.year = '${financialYear}'
                GROUP BY
                    tbl_project.project_id,tbl_sub_project.sub_project_id,tbl_project_expenditure_outlay.expenditure_outlay
            ),

            RevisedTargetDates AS (
                SELECT 
                    project_id,
                    sub_project_id,
                    MAX(CASE WHEN rn = 1 THEN revised_target_completion_date END) AS revised_target_date_1,
                    MAX(CASE WHEN rn = 2 THEN revised_target_completion_date END) AS revised_target_date_2,
                    MAX(CASE WHEN rn = 3 THEN revised_target_completion_date END) AS revised_target_date_3
                FROM (
                    SELECT *,
                        ROW_NUMBER() OVER (PARTITION BY project_id, sub_project_id ORDER BY revised_on) AS rn
                    FROM tbl_project_target_date_history
                ) t
                GROUP BY project_id, sub_project_id
            )


            SELECT 
                PD.organisation_id, PD.organisation_name, PD.project_id, PD.sub_project_id, PD.project_name, PD.sub_project_name, 
                PD.sagarmala_project_id, PD.project_brief, PD.estimated_cost,PD.sanctioned_cost,PD.technical_sanction_cost, 
                PD.project_type,PD.mode_of_implememtation, PD.implememtation_type, PD.project_intiated_date,PD.target_completion_date,
                PD.prefeasibility_actual_date, PD.dpr_actual_date, PD.chairman_approval_date, PD.ministry_submission_date,
                PD.da_approval_date, PD.ifw_approval_date, PD.imc_approval_date, PD.response_com_rec_approval_date, 
                PD.sfc_approval_date, PD.admin_approval_approval_date, PD.primary_ia_name, PD.sec_imp_agency, PD.primary_fa_name,
                PD.secondary_fa_name, PD.actual_date_of_completion, PD.closure_cost,  PD.state_names, PD.sub_state_names, PD.district_names, 
                PD.sub_district_names, PD.taluka_id, PD.village_id, PD.mp_constituency_names, PD.sub_mp_constituency_names, PD.project_category_names, 
                PD.initiative_names, PD.is_sagarmala_funded, PD.source_of_funding_names, PD.gbs_components, PD.iebr_components, 
                PD.ppp_components,PD.loans_components,PD.multilateral_components, PD.state_gov_fund_components, PD.pmmsy_components, PD.sagarmala_components, 
                PD.other_source_funding_comp, PD.capacity_addition, PD.foundation_laid, PD.foundation_laid_date, PD.foundation_tentative_date,
                PD.inauguration_value, PD.inauguration_date, PD.tentative_inauguration_date, PD.on_land_acquisition, PD.project_output_name, 
                PD.project_outcome_name, PD.land_area_req, PD.on_acquisition_completed,PD.percent_land_acq,PD.status, PD.sub_status, 
                PD.submitted_by, PD.sub_submitted_by, PD.scheme_name,PD.stage_name,PD.last_updated_date, PD.num_ut_tender_calls, 
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
                expenditureFY.expenditure_till_date_currentFY_only, expenditurePreviousFY.expenditure_till_PreviousFY, OO.expenditure_outlay, 
                RTD.revised_target_date_1, RTD.revised_target_date_2, RTD.revised_target_date_3, MD.delay_reason
			FROM 
				ProjectDetails PD

			LEFT JOIN ProjectProgress PP ON PD.project_id = PP.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(PP.sub_project_id, -1)
			LEFT JOIN MilestoneDates MD ON PD.project_id = MD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(MD.sub_project_id, -1)
            LEFT JOIN Outlays OO ON PD.project_id = OO.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(OO.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDate ETD ON PD.project_id = ETD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(ETD.sub_project_id, -1)
            LEFT JOIN ExpenditureTillDateFY expenditureFY ON PD.project_id = expenditureFY.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(expenditureFY.sub_project_id, -1)
        
            LEFT JOIN ExpenditureTillPreviousFY expenditurePreviousFY ON PD.project_id = expenditurePreviousFY.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(expenditurePreviousFY.sub_project_id, -1)
            LEFT JOIN RevisedTargetDates RTD ON PD.project_id = RTD.project_id AND ISNULL(PD.sub_project_id, -1) = ISNULL(RTD.sub_project_id, -1)

            WHERE ISNULL(PD.sub_submitted_by, PD.submitted_by)  IN (${userIDs.join(',')}) AND 
                ((PD.sub_project_id IS NOT NULL AND PD.sub_status = 1) OR (PD.sub_project_id IS NULL AND PD.status = 1));        
            `);

            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getProjectCategoryName(req, res) {
    const projectCategoryID = req.params.projectCategoryID;
    const conn = await pool;
    const request = conn.request();
    request.input("projectCategoryID", projectCategoryID);

    try {

        const result = await request.query(`SELECT project_category_name FROM mmt_project_category WHERE project_category_id = @projectCategoryID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getProjectInitiativeName(req, res) {
    const projectInitiativeID = req.params.projectInitiativeID;
    const conn = await pool;
    const request = conn.request();
    request.input("projectInitiativeID", projectInitiativeID);

    try {

        const result = await request.query(`SELECT initiative_name FROM mmt_initiative WHERE initiative_id = @projectInitiativeID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getSourceOfFundingName(req, res) {
    const sourceOfFundingID = req.params.sourceOfFundingID;
    const conn = await pool;
    const request = conn.request();
    request.input("sourceOfFundingID", sourceOfFundingID);

    try {

        const result = await request.query(`SELECT source_of_funding_name FROM mmt_source_of_funding WHERE source_of_funding_id = @sourceOfFundingID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ------------------------------------------------------------------------------------------------------------------------------

async function getExpLogsData(req, res) {
    
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);

    try {
        const userResult = await request.query(` SELECT role_id FROM tbl_user WHERE user_id = @userID `);
        const { role_id } = userResult.recordset[0];

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        let financialYear;
        if (currentDate.getMonth() >= 3 && currentDate.getDate() >= 1) {
            financialYear = `${currentYear}-${currentYear + 1}`;
        } else {
            financialYear = `${currentYear - 1}-${currentYear}`;
        }

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            // const result = await conn.query(`Select * from projectExportAll`);
            const result = await conn.query(` 
                    SELECT
                    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS [Organization ID], 
                    mmt_organisation.organisation_name AS [Organization Name],
                    tbl_project_expenditure.project_id AS [Project Id],
                    tbl_project_expenditure.sub_project_id AS [Sub Project Id],
                    ISNULL(tbl_sub_project.sub_project_name, tbl_project.project_name) AS [Project Name], 
                    tbl_project_expenditure.sagarmala_project_id AS [Sagarmala Project Id],
                    tbl_project_expenditure.sub_sagarmala_project_id,
                    tbl_project_expenditure.year AS [Year],
                    tbl_project_expenditure.financial_year AS [Financial Year],
                    CASE
                        WHEN tbl_project_expenditure.month = 1 THEN 'January'
                        WHEN tbl_project_expenditure.month = 2 THEN 'February'
                        WHEN tbl_project_expenditure.month = 3 THEN 'March'
                        WHEN tbl_project_expenditure.month = 4 THEN 'April'
                        WHEN tbl_project_expenditure.month = 5 THEN 'May'
                        WHEN tbl_project_expenditure.month = 6 THEN 'June'
                        WHEN tbl_project_expenditure.month = 7 THEN 'July'
                        WHEN tbl_project_expenditure.month = 8 THEN 'August'
                        WHEN tbl_project_expenditure.month = 9 THEN 'September'
                        WHEN tbl_project_expenditure.month = 10 THEN 'October'
                        WHEN tbl_project_expenditure.month = 11 THEN 'November'
                        WHEN tbl_project_expenditure.month = 12 THEN 'December'
                        ELSE 'Unknown'
                    END AS [Month],
                
                    tbl_project_expenditure.gbs_components AS [GBS Components (In Cr.)],
                    tbl_project_expenditure.iebr_components AS [IEBR Components (In Cr.)],
                    tbl_project_expenditure.ppp_components AS [PPP Components (In Cr.)],
                    tbl_project_expenditure.loans_components AS [Loan Components (In Cr.)],
                    tbl_project_expenditure.multilateral_components AS [Multilateral Components (In Cr.)],
                    tbl_project_expenditure.state_gov_fund_components AS [State Govt.Fund Components (In Cr.)],
                    tbl_project_expenditure.pmmsy_components AS [PMMSY Components (In Cr.)],
                    tbl_project_expenditure.sagarmala_components AS [Sagarmala Components (In Cr.)],
                    tbl_project_expenditure.other_source_funding_comp AS [Others Components (In Cr.)],
                    tbl_project_expenditure.financial_progress AS [Financial Progress],
                    tbl_project_expenditure.expenditure_date AS [Expenditure Date]
                    FROM tbl_project_expenditure
                    LEFT JOIN tbl_project ON tbl_project_expenditure.project_id = tbl_project.project_id
                    LEFT JOIN tbl_sub_project ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
                    INNER JOIN  mmt_organisation ON tbl_project.organisation_id = mmt_organisation.organisation_id 
                    ORDER BY tbl_project_expenditure.project_id, tbl_project_expenditure.sub_project_id, tbl_project_expenditure.expenditure_date;
        `);
            res.json(result.recordset);
        }
        else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            const result = await conn.query(`  SELECT
                    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS [Organization ID], 
                    mmt_organisation.organisation_name AS [Organization Name],
                    tbl_project_expenditure.project_id AS [Project Id],
                    tbl_project_expenditure.sub_project_id AS [Sub Project Id],
                    ISNULL(tbl_sub_project.sub_project_name, tbl_project.project_name) AS [Project Name], 
                    tbl_project_expenditure.sagarmala_project_id AS [Sagarmala Project Id],
                    tbl_project_expenditure.sub_sagarmala_project_id,
                    tbl_project_expenditure.year AS [Year],
                    tbl_project_expenditure.financial_year AS [Financial Year],
                    CASE
                        WHEN tbl_project_expenditure.month = 1 THEN 'January'
                        WHEN tbl_project_expenditure.month = 2 THEN 'February'
                        WHEN tbl_project_expenditure.month = 3 THEN 'March'
                        WHEN tbl_project_expenditure.month = 4 THEN 'April'
                        WHEN tbl_project_expenditure.month = 5 THEN 'May'
                        WHEN tbl_project_expenditure.month = 6 THEN 'June'
                        WHEN tbl_project_expenditure.month = 7 THEN 'July'
                        WHEN tbl_project_expenditure.month = 8 THEN 'August'
                        WHEN tbl_project_expenditure.month = 9 THEN 'September'
                        WHEN tbl_project_expenditure.month = 10 THEN 'October'
                        WHEN tbl_project_expenditure.month = 11 THEN 'November'
                        WHEN tbl_project_expenditure.month = 12 THEN 'December'
                        ELSE 'Unknown'
                    END AS [Month],
                
                    tbl_project_expenditure.gbs_components AS [GBS Components (In Cr.)],
                    tbl_project_expenditure.iebr_components AS [IEBR Components (In Cr.)],
                    tbl_project_expenditure.ppp_components AS [PPP Components (In Cr.)],
                    tbl_project_expenditure.loans_components AS [Loan Components (In Cr.)],
                    tbl_project_expenditure.multilateral_components AS [Multilateral Components (In Cr.)],
                    tbl_project_expenditure.state_gov_fund_components AS [State Govt.Fund Components (In Cr.)],
                    tbl_project_expenditure.pmmsy_components AS [PMMSY Components (In Cr.)],
                    tbl_project_expenditure.sagarmala_components AS [Sagarmala Components (In Cr.)],
                    tbl_project_expenditure.other_source_funding_comp AS [Others Components (In Cr.)],
                    tbl_project_expenditure.financial_progress AS [Financial Progress],
                    tbl_project_expenditure.expenditure_date AS [Expenditure Date]
                    FROM tbl_project_expenditure

                    LEFT JOIN tbl_project ON tbl_project_expenditure.project_id = tbl_project.project_id
                    LEFT JOIN tbl_sub_project ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
                    INNER JOIN  mmt_organisation ON tbl_project.organisation_id = mmt_organisation.organisation_id
                    
                    WHERE ISNULL(tbl_sub_project.sub_submitted_by, tbl_project.submitted_by)  IN (${userIDs.join(',')}) 
                    ORDER BY tbl_project_expenditure.project_id, tbl_project_expenditure.sub_project_id, tbl_project_expenditure.expenditure_date                 
              ;        
            `);

            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// -----------------------------------------------------------------------------------------------------------------------------
async function viewProjectData(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let editProjectDetailsData;
    if (subProjectID == -1) {
        // console.log(subProjectID, "nosubproject")

        editProjectDetailsData = (`SELECT tbl_project.organisation_id, organisation_name, tbl_project.project_id, tbl_project.sagarmala_project_id, project_name,
            tbl_project.current_project_stage_id, stage_name, project_type, implememtation_type, 
            tbl_project.project_category_id,          
            (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.project_category_id)), ',') AS ps
                JOIN mmt_project_category AS mpc ON TRY_CAST(ps.value AS int) = mpc.project_category_id
            ) AS project_category_names,
            physicalProgress.physical_progress, financialProgress.financial_progress, expenditure_till_date.total_expenditure,
			project_brief, 
      
            is_sagarmala_funded, mode_of_implememtation, primary_ia_id,  mmt_implementing_agency.ia_name AS primary_ia_name,
            secondary_ia_id, tbl_project.scheme_id, scheme_name, 
            
            tbl_project.initiative_id,
            (
                SELECT STRING_AGG(mi.initiative_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.initiative_id)), ',') AS pi
                JOIN mmt_initiative AS mi ON TRY_CAST(pi.value AS int) = mi.initiative_id
            ) AS initiative_names,
            tbl_project.source_of_funding_id,
            (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_project.source_of_funding_id)), ',') AS ssf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(ssf.value AS int) = msf.source_of_funding_id
            ) AS source_of_funding_names,
            estimated_cost, sanctioned_cost, technical_sanction_cost, award_project_cost, closure_cost, last_updated,

            target_completion_date, project_output_id, project_outcome_id,tbl_project.gbs_components, tbl_project.iebr_components, 
            tbl_project.ppp_components, tbl_project.loans_components, tbl_project.multilateral_components, tbl_project.state_gov_fund_components,
            tbl_project.pmmsy_components, tbl_project.sagarmala_components, tbl_project.other_source_funding_comp,  
            primary_funding_agency_id, secondary_funding_agency_id, tbl_project.state_id,
            tbl_project.district_id, taluka_id, village_id, mp_constituency_id, on_land_acquisition, land_area_req, 
            on_acquisition_completed, percent_land_acq, submitted_by, project_intiated_date
            
            FROM tbl_project
            LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id =  tbl_project.primary_ia_id
            LEFT JOIN (SELECT ia_id, ia_name FROM mmt_implementing_agency) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id

            LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id =  tbl_project.organisation_id
            LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id =  tbl_project.current_project_stage_id 
            LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id =  tbl_project.scheme_id   

            LEFT JOIN 
            (
                SELECT tbl_project_physical_progress.project_id, MAX(physical_progress) AS physical_progress
                FROM tbl_project
                
                LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id
                WHERE tbl_project_physical_progress.sub_project_id = '-1'
                GROUP BY tbl_project_physical_progress.project_id
                
            ) AS physicalProgress ON physicalProgress.project_id = tbl_project.project_id

            LEFT JOIN 
            (
                SELECT 
                    tbl_project_expenditure.project_id, 
                    (SUM(
                        ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                        ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                        ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                        ISNULL(tbl_project_expenditure.loans_components, 0) + 
                        ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                        ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                        ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                         
                        ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                        ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                    ) / NULLIF(tbl_project.award_project_cost, 0)) * 100 AS financial_progress
                        FROM tbl_project_expenditure
                        LEFT JOIN tbl_project 
                            ON tbl_project_expenditure.project_id = tbl_project.project_id
                        WHERE tbl_project_expenditure.sub_project_id = '-1'
                        GROUP BY tbl_project_expenditure.project_id, tbl_project.award_project_cost
            ) AS financialProgress ON financialProgress.project_id =  tbl_project.project_id



			LEFT JOIN 
            (
              
                SELECT 
                    tbl_project_expenditure.project_id, 
            SUM(tbl_project_expenditure.gbs_components) AS gbs_components,
            SUM(tbl_project_expenditure.iebr_components) AS iebr_components,
            SUM(tbl_project_expenditure.ppp_components) AS ppp_components,
            SUM(tbl_project_expenditure.loans_components) AS loans_components,
            SUM(tbl_project_expenditure.multilateral_components) AS multilateral_components,
            SUM(tbl_project_expenditure.state_gov_fund_components) AS state_gov_fund_components,            
            SUM(tbl_project_expenditure.pmmsy_components) AS pmmsy_components,
            SUM(tbl_project_expenditure.sagarmala_components) AS sagarmala_components,
            SUM(tbl_project_expenditure.other_source_funding_comp) AS other_source_funding_components,
            SUM(tbl_project_expenditure.gbs_components) + 
                SUM(tbl_project_expenditure.iebr_components) + 
                SUM(tbl_project_expenditure.ppp_components) + 
                SUM(tbl_project_expenditure.loans_components) + 
                SUM(tbl_project_expenditure.multilateral_components) +
                SUM(tbl_project_expenditure.state_gov_fund_components) + 
                SUM(tbl_project_expenditure.pmmsy_components) + 
                SUM(tbl_project_expenditure.sagarmala_components) + 
                SUM(tbl_project_expenditure.other_source_funding_comp) AS total_expenditure
  
                    FROM tbl_project_expenditure
                    LEFT JOIN tbl_project 
                        ON tbl_project_expenditure.project_id = tbl_project.project_id
                    WHERE tbl_project_expenditure.sub_project_id = '-1'
                    GROUP BY tbl_project_expenditure.project_id
            ) AS expenditure_till_date ON expenditure_till_date.project_id =  tbl_project.project_id
                    
               
            WHERE tbl_project.project_id = @projectID;`)
    }

    // project_intiated_date, removed
    else {
        // console.log(subProjectID, "have subproject")

        editProjectDetailsData = (`SELECT tbl_sub_project.sub_organisation_id, organisation_name, tbl_sub_project.sub_project_id, 
            tbl_sub_project.project_id, tbl_sub_project.sub_sagarmala_project_id AS sagarmala_project_id, 
            sub_project_name AS project_name, tbl_sub_project.sub_current_project_stage_id AS current_project_stage_id, stage_name,
            sub_project_type AS project_type, sub_implememtation_type AS implememtation_type, 
            tbl_sub_project.sub_project_category_id,
            (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_project_category_id)), ',') AS sps
                JOIN mmt_project_category AS mpc ON TRY_CAST(sps.value AS int) = mpc.project_category_id
            ) AS project_category_names,
            physicalProgress.physical_progress, financialProgress.financial_progress, expenditure_till_date.total_expenditure,
			sub_project_brief AS project_brief, 
            sub_estimated_cost AS estimated_cost, sub_sanctioned_cost AS sanctioned_cost,
            sub_technical_sanction_cost AS technical_sanction_cost, sub_award_project_cost AS award_project_cost,
            sub_closure_cost AS closure_cost, sub_last_updated AS last_updated,

            
            sub_mode_of_implememtation AS mode_of_implememtation, sub_is_sagarmala_funded AS is_sagarmala_funded,
            sub_primary_ia_id AS primary_ia_id,  mmt_implementing_agency.ia_name AS primary_ia_name,
            sub_secondary_ia_id AS secondary_ia_id, tbl_sub_project.sub_scheme_id AS scheme_id, scheme_name, 
            tbl_sub_project.sub_initiative_id AS initiative_id, 
            (
            SELECT STRING_AGG(mi.initiative_name, ', ')
            FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_initiative_id)), ',') AS si
            JOIN mmt_initiative AS mi ON TRY_CAST(si.value AS int) = mi.initiative_id
            ) AS initiative_names,
            tbl_sub_project.sub_source_of_funding_id AS source_of_funding_id,
            (
                SELECT STRING_AGG(msf.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_sub_project.sub_source_of_funding_id)), ',') AS ssf
                JOIN mmt_source_of_funding AS msf ON TRY_CAST(ssf.value AS int) = msf.source_of_funding_id
            ) AS source_of_funding_names, 

              

            sub_target_completion_date AS target_completion_date, sub_project_output_id AS project_output_id,
            sub_project_outcome_id AS project_outcome_id,
            sub_gbs_components AS gbs_components, sub_iebr_components AS iebr_components, 
            sub_ppp_components AS ppp_components, sub_loans_components AS loans_components, sub_multilateral_components AS multilateral_components, 
            sub_state_gov_fund_components AS state_gov_fund_components, sub_pmmsy_components AS pmmsy_components,
            sub_sagarmala_components AS sagarmala_components,  sub_other_source_funding_comp AS other_source_funding_comp, 
            sub_primary_funding_agency_id AS primary_funding_agency_id, sub_secondary_funding_agency_id AS secondary_funding_agency_id,
            tbl_sub_project.sub_state_id AS state_id, tbl_sub_project.sub_district_id AS district_id, 
            sub_taluka_id AS taluka_id, sub_village_id AS village_id, sub_mp_constituency_id AS mp_constituency_id, sub_on_land_acquisition AS on_land_acquisition, 
            sub_land_area_req AS land_area_req, sub_on_acquisition_completed AS on_acquisition_completed, sub_percent_land_acq AS percent_land_acq,
            sub_project_intiated_date AS project_intiated_date



            FROM tbl_sub_project
            LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
            LEFT JOIN mmt_implementing_agency AS mmt_implementing_agency_sub ON mmt_implementing_agency_sub.ia_id = tbl_sub_project.sub_primary_ia_id

            LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id =  tbl_sub_project.sub_organisation_id
            LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id =  tbl_sub_project.sub_current_project_stage_id           
            LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id =  tbl_sub_project.sub_scheme_id   
        


            LEFT JOIN 
            (
                SELECT tbl_project_physical_progress.sub_project_id,MAX(physical_progress) AS physical_progress
                FROM tbl_sub_project

                LEFT JOIN tbl_project_physical_progress ON tbl_project_physical_progress.sub_project_id = tbl_sub_project.sub_project_id
                WHERE tbl_project_physical_progress.sub_project_id != '-1'  
                GROUP BY tbl_project_physical_progress.sub_project_id

            ) AS physicalProgress ON physicalProgress.sub_project_id = tbl_sub_project.sub_project_id

            LEFT JOIN 
            (
                SELECT 
                tbl_project_expenditure.sub_project_id, 
                (SUM(
                    ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                    ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                    ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                    ISNULL(tbl_project_expenditure.loans_components, 0) + 
                    ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                  ) / NULLIF(tbl_sub_project.sub_award_project_cost, 0)) * 100 AS financial_progress
                FROM tbl_project_expenditure
                LEFT JOIN tbl_sub_project 
                    ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
                WHERE tbl_project_expenditure.sub_project_id != '-1'  
                GROUP BY tbl_project_expenditure.sub_project_id, tbl_sub_project.sub_award_project_cost
            ) AS financialProgress ON financialProgress.sub_project_id = tbl_sub_project.sub_project_id

              

			   LEFT JOIN 
            (
                SELECT 
                tbl_project_expenditure.sub_project_id, 
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
                SUM(other_source_funding_comp) AS total_expenditure 
				
			
       
                FROM tbl_project_expenditure
                LEFT JOIN tbl_sub_project 
                    ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
                WHERE tbl_project_expenditure.sub_project_id != '-1'  
                GROUP BY tbl_project_expenditure.sub_project_id
            ) AS expenditure_till_date ON expenditure_till_date.sub_project_id = tbl_sub_project.sub_project_id

           
            WHERE tbl_sub_project.sub_project_id = @subProjectID;
        `)
    }

    try {
        const result = await request.query(editProjectDetailsData);

        // const result = await request.query(`SELECT * from tbl_project WHERE tbl_project.project_id = @projectID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// async function viewProjectImages(req, res) {
//     const projectID = req.params.projectID;
//     const subProjectID = req.params.subProjectID;

//     const conn = await pool;
//     const request = conn.request();

//     try {
//         const baseFolder = './fileuploads/Project_Documents/project_images';
//         const projectFolder = subProjectID === '-1' ? 'mainProject' : 'subProject';
        
//         const query = `
//             SELECT document_name
//             FROM tbl_project_document
//             WHERE project_id = @projectID
//             AND sub_project_id = @subProjectID
//             AND document_type = 'project_images'
//         `;

//         request.input('projectID', projectID);
//         request.input('subProjectID', subProjectID);

//         const result = await request.query(query);

//         if (result.recordset.length === 0) {
//             return res.json({ message: 'No images found for this project' });
//         }
//         const images = [];

//         for (const row of result.recordset) {
//             const imagePath = path.join(baseFolder, projectFolder, row.document_name);
            
//             if (fs.existsSync(imagePath)) {
//                 const imageBuffer = fs.readFileSync(imagePath);
//                 const base64Image = imageBuffer.toString('base64');
//                 images.push({
//                     name: row.document_name,
//                     data: base64Image
//                 });
//             }
//         }

//         res.json(images);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// }

async function viewProjectImages(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();

    try {
        const baseFolder = './fileuploads/Project_Documents/project_images';
        const pptFolder = './fileuploads/Project_Documents/project_ppt';
        const pertFolder = './fileuploads/Project_Documents/project_pert';
        const projectFolder = subProjectID === '-1' ? 'mainProject' : 'subProject';
        
        const query = `
            SELECT document_name
            FROM tbl_project_document
            WHERE project_id = @projectID
            AND sub_project_id = @subProjectID
            AND document_type = 'project_images'
        `;

        request.input('projectID', projectID);
        request.input('subProjectID', subProjectID);

        const result = await request.query(query);
        const pptQuery =  `SELECT document_name,created_date
            FROM tbl_project_document
            WHERE project_id = @projectID
            AND sub_project_id = @subProjectID
            AND document_type = 'project_ppt'`;

        const pptResult = await request.query(pptQuery);
        const pertQuery =  `SELECT document_name,created_date
            FROM tbl_project_document
            WHERE project_id = @projectID
            AND sub_project_id = @subProjectID
            AND document_type = 'project_pert'`;

        const pertResult = await request.query(pertQuery);

        const images = [];
        const ppt = []; 
        const pert = []; 

        for (const row of result.recordset) {
            const imagePath = path.join(baseFolder, projectFolder, row.document_name);
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                images.push({
                    name: row.document_name,
                    createdDate : row.created_date,
                    data: base64Image
                });
            }
        }

        for (const row of pptResult.recordset) {
            const docPath = path.join(pptFolder, projectFolder, row.document_name); 
            if (fs.existsSync(docPath)) {
                const docBuffer = fs.readFileSync(docPath);
                const base64Doc = docBuffer.toString('base64');
                ppt.push({
                    name: row.document_name,
                    createdDate : row.created_date,
                    data: base64Doc
                });
            }
        }

        for (const row of pertResult.recordset) {
            const docPath = path.join(pertFolder, projectFolder, row.document_name);   
            if (fs.existsSync(docPath)) {
                const docBuffer = fs.readFileSync(docPath);
                const base64Doc = docBuffer.toString('base64');
                pert.push({
                    name: row.document_name,
                    data: base64Doc
                });
            }
        }
        
        res.json({ images, ppt, pert });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function getUnderTenderingDate(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`  SELECT sub_stage_id, not_applicable_date, CONVERT(VARCHAR,planned_date, 106) as planned_date,
            CONVERT(VARCHAR,actual_date, 106) as actual_date

            FROM tbl_project_date
            WHERE project_id = @projectID;
                `);
        } else {
            result = await request.query(` SELECT sub_stage_id, not_applicable_date,CONVERT(VARCHAR,planned_date, 106) as planned_date,
            CONVERT(VARCHAR,actual_date, 106) as actual_date
            
            FROM tbl_project_date
            WHERE sub_project_id = @subProjectID;
                `);
        }

        if (result.recordset.length === 0) {
            res.json([{ sub_stage_id: null, not_applicable_date: null, planned_date: null, actual_date: null }]);
        } else {
            res.json(result.recordset);
        }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUnderImplementationDate(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`  SELECT milestone_id, CONVERT(VARCHAR,start_date, 106) as start_date,
            CONVERT(VARCHAR,end_date, 106) as end_date
          
            FROM tbl_project_activity
            WHERE project_id = @projectID;
                `);
        } else {
            result = await request.query(` SELECT milestone_id, CONVERT(VARCHAR,start_date, 106) as start_date,
            CONVERT(VARCHAR,end_date, 106) as end_date
            FROM tbl_project_activity
            WHERE sub_project_id = @subProjectID;
                `);
        }

        if (result.recordset.length === 0) {
            res.json([{ milestone_id: null, start_date: null, end_date: null }]);
        } else {
            res.json(result.recordset);
        }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function submitCapexProjectData(req, res) {
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const capexProjects = req.body.capexProjects;
    const totalExpenditure = req.body.totalExpenditure;
    const expenditureTillDate = req.body.expenditureTillDate;
    const userId = req.body.userId;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("capexProjects", capexProjects);
    request.input("totalExpenditure", totalExpenditure);
    request.input("expenditureTillDate", expenditureTillDate);
    request.input("userId", userId);

    try {
        const result = await request.query(`INSERT INTO tbl_project_capex (financial_year, organisation_id, projects_less_than_5cr, total_expenditure_planned, expenditure_till_date, created_by, created_date)
        VALUES (@financialYear, @organisationId, @capexProjects, @totalExpenditure, @expenditureTillDate, @userId, getDate());`);
        
        res.sendStatus(201); 
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCapexProjectsData(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
           SELECT 
            tbl_project_capex.financial_year,
            tbl_project_capex.organisation_id,
            mmt_organisation.organisation_name,
            tbl_project_capex.projects_less_than_5cr,
            tbl_project_capex.total_expenditure_planned,
            tbl_project_capex.expenditure_till_date
        FROM 
            tbl_project_capex
        INNER JOIN 
            mmt_organisation ON tbl_project_capex.organisation_id = mmt_organisation.organisation_id;

        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
};

async function getUpdateCapexProjectsData(req, res) {
    const { financialYear, organisationId } = req.query;
    const conn = await pool;
    const request = conn.request();

    try {
        const query = `
            SELECT 
                tbl_project_capex.financial_year,
                tbl_project_capex.organisation_id,
                mmt_organisation.organisation_name,
                tbl_project_capex.projects_less_than_5cr,
                tbl_project_capex.total_expenditure_planned,
                tbl_project_capex.expenditure_till_date
            FROM 
                tbl_project_capex
            INNER JOIN 
                mmt_organisation ON tbl_project_capex.organisation_id = mmt_organisation.organisation_id
            WHERE 
                tbl_project_capex.financial_year = @financialYear AND tbl_project_capex.organisation_id = @organisationId;
        `;

        request.input('financialYear', financialYear);
        request.input('organisationId', organisationId);
        const result = await request.query(query);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
}

async function updateCapexProjectData(req, res) {
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const capexProjects = req.body.capexProjects;
    const totalExpenditure = req.body.totalExpenditure;
    const expenditureTillDate = req.body.expenditureTillDate;
    const userId = req.body.userId;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("capexProjects", capexProjects);
    request.input("totalExpenditure", totalExpenditure);
    request.input("expenditureTillDate", expenditureTillDate);
    request.input("userId", userId);

    try {
        const result = await request.query(`UPDATE tbl_project_capex
        SET projects_less_than_5cr = @capexProjects, total_expenditure_planned = @totalExpenditure,
        expenditure_till_date = @expenditureTillDate, updated_by = @userId, updated_date = getDate() WHERE financial_year = @financialYear AND organisation_id = @organisationId;`);
        
        res.sendStatus(201); 
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


export default { getProjectList, projectFolderDownloadLog, projectMediaLinkDownload, getProjectAllData, getProjectCategoryName, getProjectInitiativeName, getSourceOfFundingName,
    getExpLogsData, viewProjectData, viewProjectImages, getUnderTenderingDate, getUnderImplementationDate, submitCapexProjectData, 
    getCapexProjectsData, getUpdateCapexProjectsData, updateCapexProjectData 
 };