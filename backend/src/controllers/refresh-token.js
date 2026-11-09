import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db.js";
import { isBlacklisted, addToBlacklist } from "../utils/tokenStore.js";
import { setRefreshCookie, clearRefreshCookie } from "../utils/refreshCookie.js";
import { buildSessionPayload, SESSION_USER_SQL } from "./login.js";

// A refreshed cookie stays usable this long, so two tabs refreshing at the same moment don't
// sign each other out
const ROTATION_GRACE_MS = 60 * 1000;

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
        // A password change ends every session started before it (QC R-05). Compared on the
        // database's own clock (password_updated_on is mostly written with GETDATE()), so the
        // server's time zone can't shift it: changed after "now minus the token's age"?
        request.input("tokenAgeSec", Math.max(0, Math.floor(Date.now() / 1000) - iat));
        const result = await request.query(`${SESSION_USER_SQL} WHERE tbl_user.user_id = @userId;
            SELECT CASE WHEN password_updated_on > DATEADD(second, -@tokenAgeSec, GETDATE()) THEN 1 ELSE 0 END AS changed
            FROM tbl_user WHERE user_id = @userId;`);
        const userData = result.recordsets[0][0];
        if (!userData || Number(userData.status) !== 1) {
            return res.status(403).json({ message: "Account is inactive or no longer exists" });
        }
        if (result.recordsets[1][0]?.changed === 1) {
            clearRefreshCookie(res);
            return res.status(403).json({ message: "The password was changed. Please sign in again." });
        }

        const newAccessToken = jwt.sign(await buildSessionPayload(request, userData), process.env.JWT_SECRET, {
            expiresIn: "30m",
        });
        // A new refresh cookie each time; the old one stops working after a short grace (QC R-05)
        addToBlacklist(refreshToken, { graceMs: ROTATION_GRACE_MS });
        setRefreshCookie(res, userData.user_id);
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
// refresh. Needs no valid access token, since it only switches a session off. Only tokens this
// server signed are recorded, so anonymous calls can't fill the list (QC R-04).
const verified = (token, secret) => {
    try {
        return token && jwt.verify(token, secret) ? token : null;
    } catch {
        return null;
    }
};

export function endSession(req, res) {
    addToBlacklist(verified(req.cookies?.refreshToken, process.env.MIKR_REFRESH_SECRET));
    addToBlacklist(verified(req.headers.authorization?.split(" ")[1], process.env.JWT_SECRET));
    clearRefreshCookie(res);
    return res.sendStatus(204);
}
