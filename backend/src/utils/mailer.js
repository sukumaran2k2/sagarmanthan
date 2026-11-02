import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Mail accounts come from .env, never from the code:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS                   the Sagarmanthan support mailbox
//   ALERT_SMTP_HOST, ALERT_SMTP_PORT, ALERT_SMTP_USER, ALERT_SMTP_PASS   the scheduled-alert mailbox
//                                                                (falls back to the support one)

export function supportMailer() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.office365.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

export function alertMailer() {
    return nodemailer.createTransport({
        host: process.env.ALERT_SMTP_HOST || process.env.SMTP_HOST || 'smtp.office365.com',
        port: parseInt(process.env.ALERT_SMTP_PORT || process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
            user: process.env.ALERT_SMTP_USER || process.env.SMTP_USER,
            pass: process.env.ALERT_SMTP_PASS || process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
}

// A random temporary password for a new account (the user changes it at first login):
// 12 characters with upper and lower case letters, a digit and a symbol
export function temporaryPassword() {
    const pick = (chars) => chars[crypto.randomInt(chars.length)];
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#$%&*!';
    const all = upper + lower + digits + symbols;
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < 12) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}
