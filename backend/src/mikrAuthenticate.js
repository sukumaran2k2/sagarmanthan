import jwt from "jsonwebtoken";
import { isBlacklisted } from "./utils/tokenStore.js";

const mikrAuthenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({
            status: 'fail',
            message: 'Unauthorized!',
        });
    }

    const token = authHeader.split(' ')[1];

    if (isBlacklisted(token)) {
        return res.status(401).json({
            status: 'fail',
            message: 'Token invalidated',
        });
    }

    try {
        const user = jwt.verify(token, process.env.MIKR_SECRET);
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({
            status: 'fail',
            message: 'Unauthorized!',
        });
    }
};

export default mikrAuthenticate;