import bcrypt from 'bcrypt';
import pool from './pool.js';

const client = await pool.connect();

try {
  const existing = await client.query('SELECT COUNT(*) FROM users');
  if (Number(existing.rows[0].count) > 0) {
    console.log('users table is not empty. Seed skipped.');
    process.exit(0);
  }

  const studentHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await client.query('BEGIN');

  await client.query(
    `INSERT INTO users (id, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
    [1, 'student@wmsu.edu.ph', studentHash, 'student', true,
     2, 'admin@wmsu.edu.ph', adminHash, 'admin', true]
  );

  await client.query(
    `INSERT INTO student_profiles
       (id, user_id, student_number, first_name, last_name, program, year_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [1, 1, '2025-01190', 'The', 'Knave', 'BS Computer Science', '3rd Year']
  );

  await client.query(
    `INSERT INTO admin_profiles (id, user_id, employee_no, office)
     VALUES ($1, $2, $3, $4)`,
    [1, 2, 'EMP-2023-042', 'Office of the University Registrar']
  );

  await client.query(
    `INSERT INTO uploaded_files (id, uploaded_by, kind, storage_path, media_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [1, 1, 'id_photo', '/assets/Arle.png', 'image/png']
  );

  await client.query(
    `INSERT INTO applications
       (id, application_no, student_id, assigned_to, photo_file_id, type, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [1, 'APP-2025-0010', 1, 1, 1, 'New ID', 'released', '2025-08-10T09:30:00.000Z']
  );

  const history = [
    [1, 1, null, 'submitted', 1, '2025-08-10T09:30:00.000Z'],
    [2, 1, 'submitted', 'processing', 2, '2025-08-11T10:00:00.000Z'],
    [3, 1, 'processing', 'ready', 2, '2025-08-14T11:20:00.000Z'],
    [4, 1, 'ready', 'released', 2, '2025-08-15T15:00:00.000Z'],
  ];
  for (const row of history) {
    await client.query(
      `INSERT INTO status_history
         (id, application_id, from_status, to_status, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      row
    );
  }

  await client.query(
    `INSERT INTO cards
       (id, student_id, application_id, card_number, status, issue_date, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [1, 1, 1, 'WMSU-2025-01190-CRD', 'active', '2025-08-15', '2029-08-15']
  );

  // Explicit ids don't advance the auto-numbering, so move each counter past the max id.
  // These table names are hardcoded constants, not user input.
  const tables = ['users', 'student_profiles', 'admin_profiles', 'uploaded_files',
                  'applications', 'status_history', 'cards'];
  for (const table of tables) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`
    );
  }

  await client.query('COMMIT');
  console.log('Seed complete.');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed failed, rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}