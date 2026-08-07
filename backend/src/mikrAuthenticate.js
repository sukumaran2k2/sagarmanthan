import jwt from "jsonwebtoken";
import { isBlacklisted } from "./utils/tokenStore.js";

const mikrAuthenticate = (req, res, next) => {
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

    if (isBlacklisted(token)) {
        return res.status(401).json({
            status: "fail",
            message: "Token invalidated",
        });
    }

    try {
        const user = jwt.verify(token, process.env.MIKR_SECRET);
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
        });
    }
};

export default mikrAuthenticate;
