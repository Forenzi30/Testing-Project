const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:xabVzSgZVvaxFEpIsSnoepZNDkoNBsQu@shuttle.proxy.rlwy.net:25968/railway',
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
;

module.exports = pool;
