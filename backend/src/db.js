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
        requestTimeout: 1000 * 60
    },
    connectionTimeout: 1000 * 60,
    requestTimeout: 1000 * 60
});

const pool = connection.connect().then(pool => {
    console.log("DB Connected");
    return pool;
}).catch(err => console.log(err));

export { pool };