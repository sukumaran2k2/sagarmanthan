import axios from 'axios';
import jwt from 'jsonwebtoken';
import { addToBlacklist, getUserTokens, removeUserTokens } from "../utils/tokenStore.js";

export const mikrLogout = async (req, res) => {
    try {
        // Step 1: Get user ID from authenticated user (populated by auth middleware)
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        console.log(`Starting logout process for user ID: ${userId}`);

        // Step 2: Fetch stored tokens (Access & Refresh) using User ID
        const storedTokens = getUserTokens(userId);
        let mikrLogoutAttempted = false;

        if (storedTokens) {
            console.log(`✓ Found stored MIKR tokens for user ${userId}`);
            const { accessToken, refreshToken } = storedTokens;

            // Step 3: Invalidate tokens locally
            if (accessToken) {
                addToBlacklist(accessToken);
                console.log("✓ MIKR Access token blacklisted locally");
            }
            if (refreshToken) {
                addToBlacklist(refreshToken);
                console.log("✓ MIKR Refresh token blacklisted locally");
            }

            // Remove user from active MIKR users list
            removeUserTokens(userId);

            // Step 4: Call MIKR logout API
            console.log("Attempting MIKR logout API call...");
            try {
                const response = await axios.post(
                    "https://mikr.belai.in/api/auth/logout",
                    {},
                    {
                        headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 5000
                    }
                );
                console.log("✓ MIKR logout API successful:", response.status);
                mikrLogoutAttempted = true;
            } catch (mikrError) {
                console.error("✗ MIKR logout API failed:", mikrError.message);
                // We proceed anyway since local invalidation is done
            }
        } else {
            console.log(`ℹ No stored MIKR tokens found for user ${userId}. Skipping MIKR logout.`);
        }

        // Add the current request token to blacklist as well (The Sagarmanthan Token)
        const currentToken = req.headers.authorization?.split(" ")[1];
        if (currentToken) {
            addToBlacklist(currentToken);
            console.log("✓ Current session token blacklisted");
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
            userId: userId,
            mikrLogoutAttempted
        });

    } catch (error) {
        console.error("Backend: Logout error:", error.message);
        console.error("Stack trace:", error.stack);

        return res.status(500).json({
            success: false,
            message: "Logout failed",
            error: error.message
        });
    }
};
