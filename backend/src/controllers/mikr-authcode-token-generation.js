import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { storeUserTokens } from "../utils/tokenStore.js";

const authStore = {}; // in-memory storage

// Step 1: Generate authCode (ephemeral)
export async function getAuthCode(req, res) {
    try {
        const userID = req.user.userId
        // console.log(req.user)

        const conn = await pool;
        const request = conn.request();
        request.input("userID", userID);

        const userRes = await request.query(`
                SELECT user_id, email, tbl_user.role_id, tbl_role.role_name
                FROM tbl_user
                INNER JOIN tbl_role ON tbl_role.role_id = tbl_user.role_id
                WHERE user_id = @userID
            `);

        const user = userRes.recordset[0];
        if (!user) return res.status(401).json({ message: "User not found" });

        // const payload = {
        //   userId: user.user_id,
        //   email: user.email,
        //   roleId: user.role_id,
        //   roleName: user.role_name

        // };

        const authCode = uuidv4();
        const expiresAt = Date.now() + 30 * 1000; // 30 sec

        // authStore[authCode] = { userID, email, roleName, expiresAt };

        // ✅ use email & roleName from DB result
        authStore[authCode] = {
            userID: user.user_id,
            email: user.email,
            roleName: user.role_name,
            expiresAt
        };

        console.log("Generated authCode:", authCode, "Expires in 5m");
        res.json({ authCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

// Step 2: Verify and issue tokens
export async function getToken(req, res) {
    try {
        const clientId = req.query.client_id;
        const clientSecret = req.query.client_secret;
        const authCode = req.query.code ? req.query.code.trim() : null;

        console.log(`[Token Gen] Request for code: ${authCode}`);
        console.log(`[Token Gen] Active codes in memory: ${Object.keys(authStore).length}`);

        // const { authCode, clientId, clientSecret } = req.query;
        if (!authCode) return res.status(400).json({ message: "Missing AuthCode" });

        const record = authStore[authCode];
        if (!record) {
            console.log(`[Token Gen] Code not found in store. Store keys: ${Object.keys(authStore).join(', ')}`);
            return res.status(401).json({ message: "Invalid AuthCode" });
        }

        if (Date.now() > record.expiresAt) {
            delete authStore[authCode];
            return res.status(401).json({ message: "Expired AuthCode" });
        }

        if (clientId !== process.env.MIKR_CLIENT_ID) {
            return res.status(401).json({ message: "Invalid Client ID" });
        }

        if (clientSecret !== process.env.MIKR_CLIENT_SECRET) {
            return res.status(401).json({ message: "Invalid Client Secret" });
        }

        const payload = {
            userId: record.userID,
            email: record.email,
            roleId: record.roleId,
            roleName: record.roleName,
        };

        const accessToken = jwt.sign(payload, process.env.MIKR_SECRET, { expiresIn: "30m" });
        const refreshToken = jwt.sign(payload, process.env.MIKR_REFRESH_SECRET, { expiresIn: "1d" });

        // Store tokens for active session management
        storeUserTokens(payload.userId, { accessToken, refreshToken });

        // Delete from memory
        delete authStore[authCode];

        return res.json({
            // message: "verified",
            // user: payload,
            accessToken,
            refreshToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server_error" });
    }
}

// Clean up expired codes
setInterval(() => {
    const now = Date.now();
    for (const code in authStore) {
        if (now > authStore[code].expiresAt) delete authStore[code];
    }
}, 5000);
