import dotenv from "dotenv";
import mssql from "mssql";

dotenv.config();

const connection = new mssql.ConnectionPool({
    server: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    pool: {
        max: 100,
        idleTimeoutMillis: 1000 * 60,
    },
    options: {
        trustServerCertificate: true,
        requestTimeout: 1000 * 60,
        enableArithAbort: true,
    },
    connectionTimeout: 1000 * 60,
    requestTimeout: 1000 * 60
});

// If the database isn't reachable yet (e.g. SQL Server still starting), keep retrying instead of
// leaving `pool` undefined for good; requests made meanwhile wait for the connection
const RETRY_MS = 10 * 1000;
function connectWithRetry() {
    return connection.connect().then(pool => {
        console.log("DB Connected");
        return pool;
    }).catch(err => {
        console.log(`DB connection failed (${err.message}); retrying in ${RETRY_MS / 1000} s`);
        return new Promise((resolve) => setTimeout(resolve, RETRY_MS)).then(connectWithRetry);
    });
}

const pool = connectWithRetry();

export { pool };