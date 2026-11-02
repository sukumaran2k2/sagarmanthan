CREATE OR ALTER PROCEDURE dbo.usp_ProjectExpenditureLogsExport
    @OrganisationId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

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
        ISNULL(
            CHOOSE(
                tbl_project_expenditure.month,
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ),
            'Unknown'
        ) AS [Month],
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
    LEFT JOIN tbl_project
        ON tbl_project.project_id = tbl_project_expenditure.project_id
    LEFT JOIN tbl_sub_project
        ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id
    INNER JOIN mmt_organisation
        ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
    WHERE
        (@OrganisationId IS NULL
            OR ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @OrganisationId)
    ORDER BY
        tbl_project_expenditure.project_id,
        tbl_project_expenditure.sub_project_id,
        tbl_project_expenditure.expenditure_date;
END;
GO
