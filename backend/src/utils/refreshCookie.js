import jwt from "jsonwebtoken";
import crypto from "crypto";

// The httpOnly refresh-token cookie of a portal session (set at login and on every refresh).
// Secure (HTTPS only) follows COOKIE_SECURE=true|false in .env when set, else NODE_ENV=production:
// a deployment served over plain HTTP sets COOKIE_SECURE=false, or the browser drops the cookie
// and the session can never be renewed (QC R-06).
const DAY_MS = 24 * 60 * 60 * 1000;

const cookieOptions = () => {
    const configured = String(process.env.COOKIE_SECURE ?? '').trim().toLowerCase();
    const secure = configured ? configured === 'true' : process.env.NODE_ENV === 'production';
    return { httpOnly: true, secure, sameSite: 'Strict' };
};

// The token only names the user: a refresh rebuilds the session from the database. jwtid makes
// every token unique, so a replaced one can be retired even if issued in the same second.
export const signRefreshToken = (userId) =>
    jwt.sign({ userId, kind: 'portal' }, process.env.MIKR_REFRESH_SECRET, { expiresIn: '1d', jwtid: crypto.randomUUID() });

export const setRefreshCookie = (res, userId) =>
    res.cookie('refreshToken', signRefreshToken(userId), { ...cookieOptions(), maxAge: DAY_MS });

export const clearRefreshCookie = (res) => res.clearCookie('refreshToken', cookieOptions());
