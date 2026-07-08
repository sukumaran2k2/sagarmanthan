import { pool } from "../db.js";

export async function getKrDocumentData(req, res) {
     try {

            const conn = await pool;
            const request = conn.request();
          
            // Optional query filters (add more as needed)
            const { Document_Type, Published_Year, trained_status } = req.body;

            if (Document_Type) request.input("Document_Type", Document_Type);
            if (Published_Year) request.input("Published_Year", Published_Year);
            // if (trained_status) request.input("trained_status", trained_status);

            // Build WHERE clause dynamically
            const whereClause = [];
            // if (Document_Type) whereClause.push("Document_Type = @Document_Type");
            // if (Published_Year) whereClause.push("Published_Year = @Published_Year");
        
            // if (trained_status) whereClause.push("trained_status = @trained_status"); // only if 'trained' column exists
            if (trained_status !== undefined && trained_status !== null) {
                request.input("trained_status", trained_status);
                whereClause.push("trained_status = @trained_status");
            }

            const filterSQL = whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : "";
            // const filterSQL = whereClause.length ? `WHERE ` : "";

            console.log(filterSQL)
            const query = `
                SELECT TOP (5000)
                    [ID],
                    [Title],
                    [Document_Type],
                    [Description],
                    [MoPSW_Organisations],
                    [MoPSW_Wings],
                    [Functional_Cells],
                    [Vision_Document],
                    [Document_Name],
                    [Published_Month],
                    [Published_Year],
                    [Keywords],
                    [Access],
                    [Format],
                    [trained_status],
                    [Frequency],
                    [URL],
                    [created_by],
                    [created_date]
                FROM [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
            ${filterSQL}
            `;


            const docsResult = await request.query(query);
            const data = docsResult.recordset.map(row => ({
                ...row,
                download_url: row.Document_Name
                    ? `${process.env.BASE_URL}/download-document?file=${encodeURIComponent(row.Document_Name)}`
                    : null
            }));
            res.status(200).json({ data });
        
    } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}