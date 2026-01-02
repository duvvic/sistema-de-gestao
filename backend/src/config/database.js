const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Supabase requires SSL, this might need adjustment for local
    }
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL Database');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
