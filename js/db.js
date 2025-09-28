require('dotenv').config();
const mysql = require('mysql2/promise');

// Use Railway or XAMPP config based on USE_RAILWAY in .env
const useRailway = process.env.USE_RAILWAY === 'true';

const pool = mysql.createPool(
    useRailway
        ? {
            host: process.env.MYSQLHOST,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLNAME,
            port: process.env.MYSQLPORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        }
        : {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        }
);

module.exports = pool;
