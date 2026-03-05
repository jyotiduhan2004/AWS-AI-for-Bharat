const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
// No dotenv needed, using node --env-file

const pool = new Pool({
  host: process.env.NEXT_PUBLIC_DB_HOST,
  database: process.env.NEXT_PUBLIC_DB_NAME,
  user: process.env.NEXT_PUBLIC_DB_USER,
  password: process.env.NEXT_PUBLIC_DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const sqlPath = path.join(__dirname, '../../seed/messages_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Got SQL file, length:', sql.length);
    
    console.log('Executing SQL...');
    await pool.query(sql);
    console.log('✅ Successfully created messages and notifications tables!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await pool.end();
  }
}

main();
