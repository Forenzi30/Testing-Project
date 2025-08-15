require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL if available, otherwise use individual PG* variables
const pool = new Pool(
    {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        user: process.env.PGUSERNAME,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false }
      }
);

module.exports = pool;
