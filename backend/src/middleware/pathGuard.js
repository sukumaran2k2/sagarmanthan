import path from "path";

const FILE_FIELD = /file|path|folder|doc/i;

export function escapesFolder(value) {
    if (typeof value !== "string") return false;
    return value.includes("\0")
        || value.split(/[\\/]/).includes("..")
        || path.posix.isAbsolute(value)
        || path.win32.isAbsolute(value);
}

function hasBadSegment(urlPath) {
    return urlPath.split("/").some((segment) => {
        try {
            return escapesFolder(decodeURIComponent(segment));
        } catch {
            return true;
        }
    });
}

function hasBadValue(value, check) {
    if (Array.isArray(value)) return value.some((item) => hasBadValue(item, check));
    if (value && typeof value === "object") {
        return Object.entries(value).some(([key, item]) => hasBadValue(item, check || FILE_FIELD.test(key)));
    }
    return check && escapesFolder(value);
}

export function rejectPathTraversal(req, res, next) {
    const query = Object.values(req.query).some((value) => hasBadValue(value, true));
    if (hasBadSegment(req.path) || query || hasBadValue(req.body, false)) {
        return res.status(400).json({ status: "fail", message: "Invalid file name." });
    }
    next();
}
