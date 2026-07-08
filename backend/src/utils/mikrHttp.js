import https from "https";

// MIKR uses a certificate Node does not trust. This applies only to outbound MIKR calls.
export function getMikrAxiosConfig(config = {}) {
    const strictTls = process.env.MIKR_TLS_REJECT_UNAUTHORIZED === "1";

    return {
        httpsAgent: new https.Agent({
            rejectUnauthorized: strictTls,
        }),
        timeout: 15000,
        ...config,
    };
}
