import { pool } from "../db.js";
import bcrypt from "bcrypt";

export async function getUpdateDocStatus(req, res) {
     try {

            // Step 1: Authenticate user
            // const { email, password } = req.query;
            // if (!email || !password) {
            //     return res.status(401).json({ message: "Please enter your email and password" });
            // }

            const conn = await pool;
            // const request = conn.request();
            // request.input("email", email);

            // const result = await request.query(`SELECT password FROM tbl_user WHERE email = @email`);
            // const user = result.recordset[0];

            // if (!user) {
            //     return res.status(401).json({ message: "Invalid username or password" });;
            // }

            // const isPasswordMatch = bcrypt.compareSync(password, user.password);
            // if (!isPasswordMatch) {
            //     return res.status(401).json({ message: "Invalid username or password" });
            // }


            // Step 2: Update trained_status
            const { ID, trained_status } = req.body;
            console.log("Updating ID:", ID); // ✅ Now safe

                const updateReq = conn.request();
                updateReq.input("ID", ID);
                updateReq.input("trained_status", trained_status);

                const updateResult = await updateReq.query(`
                    UPDATE [sagarmanthan_revamp].[dbo].[tbl_kr_category_upload]
                    SET trained_status = @trained_status
                    WHERE ID = @ID
                `);

                if (updateResult.rowsAffected[0] === 0) {
                    return res.status(404).json({ message: "Document not found or not updated" });
                }

                res.status(200).json({ message: "Training status updated successfully" });
        } catch (err) {
            console.error("Update error:", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
}