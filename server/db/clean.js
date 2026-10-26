import pool from './pool.js';

async function clean() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM reissuance_requests');
    await client.query('DELETE FROM status_history');
    await client.query('DELETE FROM cards');
    await client.query('DELETE FROM applications');
    await client.query('DELETE FROM uploaded_files WHERE id > 1');
    await client.query('DELETE FROM users WHERE id NOT IN (1, 2)');
    await client.query(`
      UPDATE student_profiles
      SET first_name = 'The', middle_name = 'of', last_name = 'Knave', student_number = '2025-01190', program = 'BS Computer Science', year_level = '3rd Year'
      WHERE user_id = 1
    `);
    await client.query("SELECT setval('applications_id_seq', 1, false)");
    await client.query("SELECT setval('cards_id_seq', 1, false)");
    await client.query("SELECT setval('reissuance_requests_id_seq', 1, false)");
    await client.query("SELECT setval('status_history_id_seq', 1, false)");
    await client.query("SELECT setval('uploaded_files_id_seq', (SELECT COALESCE(MAX(id), 1) FROM uploaded_files))");
    await client.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    await client.query("SELECT setval('student_profiles_id_seq', (SELECT MAX(id) FROM student_profiles))");
    await client.query("SELECT setval('admin_profiles_id_seq', (SELECT MAX(id) FROM admin_profiles))");
    await client.query('COMMIT');
    console.log('Database cleanup succeeded!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database cleanup failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();
