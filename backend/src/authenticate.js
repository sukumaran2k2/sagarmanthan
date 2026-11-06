import jwt from "jsonwebtoken";
import { isBlacklisted } from "./utils/tokenStore.js";

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
        });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
        });
    }

    // A signed-out session's token stops working at once, not when it expires
    if (isBlacklisted(token)) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
        });
    }

    try {
        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtErr) {
            // A MIKR token identifies the user (e.g. for /mikr-logout) but carries no portal
            // role, so it never counts as the superadmin
            const { roleId, roleCode, role_id, ...mikrUser } = jwt.verify(token, process.env.MIKR_SECRET);
            user = { ...mikrUser, isMikrToken: true };
        }
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
        });
    }
};

export default authenticate;
