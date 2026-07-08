
const blacklist = new Set();
const userTokenMap = new Map();

export const addToBlacklist = (token) => {
    if (token) {
        blacklist.add(token);
        // Optional: Remove from memory after 24 hours (approx max life of refresh token)
        // to prevent memory leak
        setTimeout(() => blacklist.delete(token), 24 * 60 * 60 * 1000);
    }
};

export const isBlacklisted = (token) => {
    return blacklist.has(token);
};

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
