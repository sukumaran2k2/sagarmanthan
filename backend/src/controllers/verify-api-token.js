import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// getVerifyToken()
export async function getVerifyToken(req, res) {
   try {
        // const authHeader = req.headers.authorization;

        // // 1. Check if Authorization header is present
        // if (!authHeader || !authHeader.startsWith("Bearer ")) {
        //     return res.status(401).json({ message: "Access token missing or invalid" });
        // }

        // // 2. Extract token from header
        // const token = authHeader.split(" ")[1];

        // // 3. Verify token
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("Decoded token:", decoded); // print the payload

        const userId = req.user.userId;
        const roleName = req.user.roleName;

        return res.json({ userId, roleName });

        // 4. Return userId and roleName
        // return res.json({
        //     userId: decoded.userId,
        //     roleName: decoded.roleName,

            
        // });

    } catch (err) {
        console.error("Token Verification Error:", err);
        return res.status(403).json({ message: "Invalid or expired access token" });
    }
}

