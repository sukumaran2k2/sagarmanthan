import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db.js";
import { isBlacklisted, addToBlacklist } from "../utils/tokenStore.js";
import { buildSessionPayload, SESSION_USER_SQL } from "./login.js";

export async function getRefreshToken(req, res) {
    try {
        // 1. Read refresh token from httpOnly cookie (set by /login-validation)
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing or invalid" });
        }

        if (isBlacklisted(refreshToken)) {
            return res.status(403).json({ message: "Refresh token invalidated" });
        }

        // 2. Verify the refresh token using the REFRESH secret
        const decoded = jwt.verify(refreshToken, process.env.MIKR_REFRESH_SECRET);
        const { iat, exp, ...payload } = decoded;

        // Portal refresh tokens are { userId, kind: 'portal' } (older ones carried the whole session,
        // with allowedModules). MIKR tokens carry their own payload and are re-signed as they are.
        const isPortal = payload.kind === 'portal' || payload.allowedModules !== undefined;
        if (!isPortal) {
            const newAccessToken = jwt.sign(payload, process.env.MIKR_SECRET, { expiresIn: "30m" });
            return res.json({ accessToken: newAccessToken });
        }

        // 3. Portal sessions are rebuilt from the database, so a changed role, organisation,
        // module access or CRUD matrix - or a deactivated account - applies at the next refresh
        // instead of lasting until the refresh token expires (QC CSR-35)
        const request = (await pool).request();
        request.input("userId", Number(payload.userId));
        const result = await request.query(`${SESSION_USER_SQL} WHERE tbl_user.user_id = @userId`);
        const userData = result.recordset[0];
        if (!userData || Number(userData.status) !== 1) {
            return res.status(403).json({ message: "Account is inactive or no longer exists" });
        }

        const newAccessToken = jwt.sign(await buildSessionPayload(request, userData), process.env.JWT_SECRET, {
            expiresIn: "30m",
        });
        return res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error("Refresh Token Error:", err.message);
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }
        // e.g. the database is unreachable: not the user's fault, so don't treat it as a bad token
        return res.status(503).json({ message: "Could not refresh the session. Please try again." });
    }
}

// Ends the portal session: the refresh-token cookie (and the access token, if sent) can no longer
// be used, and the cookie is removed, so a signed-out browser can't be signed back in by a
// refresh. Needs no valid access token, since it only switches a session off.
export function endSession(req, res) {
    addToBlacklist(req.cookies?.refreshToken);
    addToBlacklist(req.headers.authorization?.split(" ")[1]);
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
    });
    return res.sendStatus(204);
}
