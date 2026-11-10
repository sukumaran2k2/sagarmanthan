import jwt from "jsonwebtoken";

// Tokens that may no longer be used (signed out, or replaced by a refresh), each kept until it
// would have expired anyway; expired entries are pruned as entries are added, so there is no
// timer per entry (QC R-04). Kept in this process's memory: after a restart, or on another
// instance, a signed-out refresh cookie works again until it expires (at most a day).
const blocked = new Map(); // token -> { expiresAt, usableUntil } (ms)
const DAY_MS = 24 * 60 * 60 * 1000;
let lastPrune = 0;

function prune(now) {
    if (now - lastPrune < 60 * 1000) return;
    lastPrune = now;
    for (const [token, entry] of blocked) if (entry.expiresAt <= now) blocked.delete(token);
}

// graceMs: how long the token may still be used (a refreshed cookie stays valid briefly, so two
// tabs refreshing at the same moment don't sign each other out); 0 = blocked at once
export const addToBlacklist = (token, { graceMs = 0 } = {}) => {
    if (!token) return;
    const now = Date.now();
    const exp = jwt.decode(token)?.exp;
    blocked.set(token, { expiresAt: exp ? exp * 1000 : now + DAY_MS, usableUntil: now + graceMs });
    prune(now);
};

export const isBlacklisted = (token) => {
    const entry = blocked.get(token);
    return !!entry && Date.now() >= entry.usableUntil;
};

// MIKR: the tokens issued to each user (set at MIKR token generation, removed at MIKR logout).
// QC R-17: this declaration was dropped by mistake in 241376a.
const userTokenMap = new Map();

export const storeUserTokens = (userId, tokens) => {
    userTokenMap.set(userId, tokens);
    console.log(`Stored tokens for user ${userId}`);
};

export const getUserTokens = (userId) => {
    return userTokenMap.get(userId);
};

export const removeUserTokens = (userId) => {
    if (userTokenMap.has(userId)) {
        userTokenMap.delete(userId);
        console.log(`Removed tokens for user ${userId}`);
    }
};
