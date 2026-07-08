
import { pool } from "../../db.js";

async function capexReportData (req, res) 
{
    const selectedYear = req.params.selectedYear;
    const conn = await pool;
    const request = conn.request();    
    request.input("selectedYear", selectedYear); 
    try 
    {
        // For Major ports  
        const majorPortsQuery = await request.query(`
            SELECT
            mmt_organisation.organisation_id,
            tbl_capex.capex_id,
            tbl_capex.capex_financial_year,
            tbl_capex.capex_organisation_id,
            ISNULL(tbl_capex.capex_gbs_value, 0) AS capex_gbs_value,
            ISNULL(tbl_capex.capex_iebr_value, 0) AS capex_iebr_value,
            ISNULL(tbl_capex.capex_ppp_value, 0) AS capex_ppp_value,
            ISNULL(tbl_capex.capex_total_value, 0) AS capex_total_value,
            tbl_capex.updated_by,
            tbl_capex.updated_date,
            mmt_organisation.organisation_name,
            mmt_organisation.organisation_category_id,
            ISNULL(tbl_capex_monthly.total_GBS, 0) AS total_GBS,
            ISNULL(tbl_capex_monthly.total_IEBR, 0) AS total_IEBR,
            ISNULL(tbl_capex_monthly.total_PPP, 0) AS total_PPP,
            ISNULL(tbl_capex_monthly.total_Capex, 0) AS total_Capex,

            CASE
            WHEN ISNULL(tbl_capex.capex_iebr_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_IEBR, 0) * 100.0)
                / ISNULL(tbl_capex.capex_iebr_value, 0),
                2
            )
            END AS exp_ir,
            CASE
            WHEN ISNULL(tbl_capex.capex_ppp_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_PPP, 0) * 100.0)
                / ISNULL(tbl_capex.capex_ppp_value, 0),
                2
                )
            END AS exp_ppp,

            tbl_capex_monthly.updated_date AS monthly_updated_date
        FROM
            sagarmanthan_revamp.dbo.mmt_organisation
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id AND (tbl_capex.capex_financial_year = @selectedYear)
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex_monthly ON tbl_capex.capex_id = tbl_capex_monthly.capex_id
        WHERE
            mmt_organisation.organisation_category_id = 1
        ORDER BY
            mmt_organisation.organisation_id;      
        `);
           

        // For Other Organisations
        const shippingsectorOrganisationsQuery = await request.query(`SELECT
            mmt_organisation.organisation_id,
            tbl_capex.capex_id,
            tbl_capex.capex_financial_year,
            tbl_capex.capex_organisation_id,
            ISNULL(tbl_capex.capex_gbs_value, 0) AS capex_gbs_value,
            ISNULL(tbl_capex.capex_iebr_value, 0) AS capex_iebr_value,
            ISNULL(tbl_capex.capex_ppp_value, 0) AS capex_ppp_value,
            ISNULL(tbl_capex.capex_total_value, 0) AS capex_total_value,
            tbl_capex.updated_by,
            tbl_capex.updated_date,
            mmt_organisation.organisation_name,
            mmt_organisation.organisation_category_id,
            ISNULL(tbl_capex_monthly.total_GBS, 0) AS total_GBS,
            ISNULL(tbl_capex_monthly.total_IEBR, 0) AS total_IEBR,
            ISNULL(tbl_capex_monthly.total_PPP, 0) AS total_PPP,
            ISNULL(tbl_capex_monthly.total_Capex, 0) AS total_Capex,
               CASE
            WHEN ISNULL(tbl_capex.capex_iebr_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_IEBR, 0) * 100.0)
                / ISNULL(tbl_capex.capex_iebr_value, 0),
                2
                )
            END AS exp_ir,
                CASE
            WHEN ISNULL(tbl_capex.capex_ppp_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_PPP, 0) * 100.0)
                / ISNULL(tbl_capex.capex_ppp_value, 0),
                2
                )
            END AS exp_ppp,
            tbl_capex_monthly.updated_date AS monthly_updated_date
        FROM
            sagarmanthan_revamp.dbo.mmt_organisation
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id AND (tbl_capex.capex_financial_year = @selectedYear)
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex_monthly ON tbl_capex.capex_id = tbl_capex_monthly.capex_id
        WHERE
            mmt_organisation.organisation_category_id = 3
        ORDER BY
            mmt_organisation.organisation_id;  
        `);    

        
        // For Sagarmala + ALHW Projects *
        const otherOrganisations = await request.query(`SELECT
            mmt_organisation.organisation_id,
            tbl_capex.capex_id,
            tbl_capex.capex_financial_year,
            tbl_capex.capex_organisation_id,
            ISNULL(tbl_capex.capex_gbs_value, 0) AS capex_gbs_value,
            ISNULL(tbl_capex.capex_iebr_value, 0) AS capex_iebr_value,
            ISNULL(tbl_capex.capex_ppp_value, 0) AS capex_ppp_value,
            ISNULL(tbl_capex.capex_total_value, 0) AS capex_total_value,
            tbl_capex.updated_by,
            tbl_capex.updated_date,
            mmt_organisation.organisation_name,
            mmt_organisation.organisation_category_id,
            ISNULL(tbl_capex_monthly.total_GBS, 0) AS total_GBS,
            ISNULL(tbl_capex_monthly.total_IEBR, 0) AS total_IEBR,
            ISNULL(tbl_capex_monthly.total_PPP, 0) AS total_PPP,
            ISNULL(tbl_capex_monthly.total_Capex, 0) AS total_Capex,
            CASE
            WHEN ISNULL(tbl_capex.capex_iebr_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_IEBR, 0) * 100.0)
                / ISNULL(tbl_capex.capex_iebr_value, 0),
                2
            )
        END AS exp_ir,
                 CASE
            WHEN ISNULL(tbl_capex.capex_ppp_value, 0) = 0 THEN 0
            ELSE ROUND(
                (ISNULL(tbl_capex_monthly.total_PPP, 0) * 100.0)
                / ISNULL(tbl_capex.capex_ppp_value, 0),
                2
                )
            END AS exp_ppp,
            tbl_capex_monthly.updated_date AS monthly_updated_date
        FROM
            sagarmanthan_revamp.dbo.mmt_organisation
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id AND (tbl_capex.capex_financial_year = @selectedYear)
        LEFT JOIN
            sagarmanthan_revamp.dbo.tbl_capex_monthly ON tbl_capex.capex_id = tbl_capex_monthly.capex_id
        WHERE
            mmt_organisation.organisation_category_id IN (3,6,5)
        ORDER BY
            mmt_organisation.organisation_id;  
        `);

     
        ;
        
        const response = { majorPorts:  majorPortsQuery.recordset, 
            otherOrganisations:  otherOrganisations.recordset,    
            shippingsectorOrganisations:  shippingsectorOrganisationsQuery.recordset, 
        }
        res.json(response);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { capexReportData };