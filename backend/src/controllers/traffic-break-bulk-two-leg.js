import { pool } from "../db.js";
import bcrypt from "bcrypt";


export async function getBreakBulkTwoLeg(req, res) {
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
            DECLARE @cols NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Step 1: Build dynamic column list
            SELECT @cols = STRING_AGG(CAST(QUOTENAME(pivot_col) AS NVARCHAR(MAX)), ',')
            FROM (
                SELECT DISTINCT
                    cat.category_name + '_' + subcat.commodity_name + '_inbound' AS pivot_col
                FROM [sagarmanthan_revamp].[dbo].[tbl_commodity_data] cd
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_subcategories] subcat 
                    ON cd.commodity_subcategory_id = subcat.id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_category] cat 
                    ON cd.category_id = cat.category_id
                WHERE 
                    cd.commodity_group_id = 3
                    AND cd.commodity_subcategory_id IN (23, 24, 25, 26)
                    AND cd.category_id IN (4, 5, 6)

                UNION

                SELECT DISTINCT
                    cat.category_name + '_' + subcat.commodity_name + '_outbound'
                FROM [sagarmanthan_revamp].[dbo].[tbl_commodity_data] cd
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_subcategories] subcat 
                    ON cd.commodity_subcategory_id = subcat.id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_category] cat 
                    ON cd.category_id = cat.category_id
                WHERE 
                    cd.commodity_group_id = 3
                    AND cd.commodity_subcategory_id IN (23, 24, 25, 26)
                    AND cd.category_id IN (4, 5, 6)
            ) AS pivot_names;

            -- Step 2: Construct dynamic SQL
            SET @sql = '
            SELECT 
                fiscal_year AS [year],
                month,
                organisation_id,
                organisation_name,
                ' + @cols + '
            FROM (
                SELECT 
                    cd.fiscal_year,
                    cd.month,
                    cd.organisation_id,
                    org.organisation_name,
                    cat.category_name + ''_'' + subcat.commodity_name + ''_inbound'' AS pivot_col,
                    cd.inbound AS value
                FROM [sagarmanthan_revamp].[dbo].[tbl_commodity_data] cd
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_subcategories] subcat 
                    ON cd.commodity_subcategory_id = subcat.id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_category] cat 
                    ON cd.category_id = cat.category_id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_organisation] org 
                    ON cd.organisation_id = org.organisation_id
                WHERE 
                    cd.commodity_group_id = 3
                    AND cd.commodity_subcategory_id IN (23, 24, 25, 26)
                    AND cd.category_id IN (4, 5, 6)

                UNION ALL

                SELECT 
                    cd.fiscal_year,
                    cd.month,
                    cd.organisation_id,
                    org.organisation_name,
                    cat.category_name + ''_'' + subcat.commodity_name + ''_outbound'' AS pivot_col,
                    cd.outbound AS value
                FROM [sagarmanthan_revamp].[dbo].[tbl_commodity_data] cd
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_subcategories] subcat 
                    ON cd.commodity_subcategory_id = subcat.id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_commodity_category] cat 
                    ON cd.category_id = cat.category_id
                JOIN [sagarmanthan_revamp].[dbo].[mmt_organisation] org 
                    ON cd.organisation_id = org.organisation_id
                WHERE 
                    cd.commodity_group_id = 3
                    AND cd.commodity_subcategory_id IN (23, 24, 25, 26)
                    AND cd.category_id IN (4, 5, 6)
            ) AS src
            PIVOT (
                SUM(value)
                FOR pivot_col IN (' + @cols + ')
            ) AS pvt
            ORDER BY fiscal_year, month, organisation_id;
            ';

            -- Step 3: Execute the dynamic SQL
            EXEC sp_executesql @sql;


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
