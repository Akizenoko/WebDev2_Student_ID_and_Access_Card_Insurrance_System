import pg from 'pg';
import { readFileSync } from 'fs';

// Load .env manually
const envPath = new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const env = readFileSync('C:/Users/carlm/OneDrive/Documents/Codez/Webdev/Student ID and Access Card Insurrance System/.env', 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const col = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='applications' AND column_name='deleted_at'`);
console.log('deleted_at column exists:', col.rows.length > 0);

const apps = await pool.query(`SELECT id, status, deleted_at, student_id FROM applications WHERE status IN ('released','rejected') LIMIT 5`);
console.log('Released/Rejected apps:', JSON.stringify(apps.rows, null, 2));

await pool.end();
