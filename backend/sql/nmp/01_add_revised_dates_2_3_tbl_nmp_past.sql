/* ---------------------------------------------------------------------------
   NMP · Past Monetised Land
   Adds the 2nd and 3rd revised target dates for each milestone
   (NIT, Agreement, Completion of construction). The UI allows a maximum of
   3 revised dates per milestone; the 1st already exists as
   nit_reversed_date / agreement_revised_date / completion_revised_date.

   Safe to re-run: every column is added only if it is missing.
--------------------------------------------------------------------------- */

IF COL_LENGTH('dbo.tbl_nmp_past', 'nit_reversed_date_2') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD nit_reversed_date_2 DATE NULL;
GO

IF COL_LENGTH('dbo.tbl_nmp_past', 'nit_reversed_date_3') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD nit_reversed_date_3 DATE NULL;
GO

IF COL_LENGTH('dbo.tbl_nmp_past', 'agreement_revised_date_2') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD agreement_revised_date_2 DATE NULL;
GO

IF COL_LENGTH('dbo.tbl_nmp_past', 'agreement_revised_date_3') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD agreement_revised_date_3 DATE NULL;
GO

IF COL_LENGTH('dbo.tbl_nmp_past', 'completion_revised_date_2') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD completion_revised_date_2 DATE NULL;
GO

IF COL_LENGTH('dbo.tbl_nmp_past', 'completion_revised_date_3') IS NULL
    ALTER TABLE dbo.tbl_nmp_past ADD completion_revised_date_3 DATE NULL;
GO
