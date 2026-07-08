import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { isBlacklisted } from "../utils/tokenStore.js";

export async function getRefreshToken(req, res) {
    try {
        const authHeader = req.headers.authorization;

        // 1. Validate presence of token
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Refresh token missing or invalid" });
        }

        // 2. Extract refresh token
        const refreshToken = authHeader.split(" ")[1];

        if (isBlacklisted(refreshToken)) {
            return res.status(403).json({ message: "Refresh token invalidated" });
        }

        // 3. Verify the refresh token using the REFRESH secret
        const decoded = jwt.verify(refreshToken, process.env.MIKR_REFRESH_SECRET);

        // 4. Create new access token preserving the full payload
        const { iat, exp, ...payload } = decoded;

        const secret = payload.allowedModules !== undefined ? process.env.JWT_SECRET : process.env.MIKR_SECRET;

        const newAccessToken = jwt.sign(payload, secret, {
            expiresIn: "30m",
        });

        // 5. Send the new access token
        return res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error("Refresh Token Error:", err.message);
        return res.status(403).json({ message: "Invalid or expired refresh token" });
    }
}
