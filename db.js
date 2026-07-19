const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err, client) => {
  console.error('[PostgreSQL Pool] Idle client error:', err.message);
});

// Resilient query wrapper with auto-retry for Neon DB
async function query(text, params) {
  let retries = 3;
  while (retries > 0) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      retries--;
      if ((err.code === 'ECONNRESET' || err.code === '57P01' || err.message.includes('ECONNRESET')) && retries > 0) {
        console.warn(`[PostgreSQL Retry] Connection reset. Retrying query (${3 - retries}/3)...`);
        await new Promise(r => setTimeout(r, 500));
      } else {
        throw err;
      }
    }
  }
}

module.exports = {
  pool,
  query,
};
