import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Reusable query that joins all related tables for a full application object
const FULL_APPLICATION_QUERY = `
  SELECT
    a.*,
    sp.id          AS student_prof_id,
    sp.student_number,
    sp.first_name,
    sp.last_name,
    sp.program,
    sp.year_level,
    su.email       AS student_email,
    ap.id          AS admin_prof_id,
    ap.employee_no,
    ap.office,
    au.email       AS admin_email,
    uf.id          AS photo_id,
    uf.storage_path,
    uf.media_type,
    c.id           AS card_id,
    c.card_number,
    c.status       AS card_status,
    c.issue_date,
    c.valid_until,
    rr.id          AS reissuance_id,
    rr.reason,
    rr.fee_amount
  FROM applications a
  LEFT JOIN student_profiles sp ON sp.id = a.student_id
  LEFT JOIN users su             ON su.id = sp.user_id
  LEFT JOIN admin_profiles ap    ON ap.id = a.assigned_to
  LEFT JOIN users au             ON au.id = ap.user_id
  LEFT JOIN uploaded_files uf    ON uf.id = a.photo_file_id
  LEFT JOIN cards c              ON c.application_id = a.id
  LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
`;

function shapeApplication(row) {
  return {
    id:             row.id,
    application_no: row.application_no,
    student_id:     row.student_id,
    assigned_to:    row.assigned_to,
    photo_file_id:  row.photo_file_id,
    type:           row.type,
    status:         row.status,
    remarks:        row.remarks,
    submitted_at:   row.submitted_at,
    updated_at:     row.updated_at,
    student: row.student_prof_id ? {
      id:             row.student_prof_id,
      student_number: row.student_number,
      first_name:     row.first_name,
      last_name:      row.last_name,
      program:        row.program,
      year_level:     row.year_level,
      email:          row.student_email,
    } : null,
    assignedAdmin: row.admin_prof_id ? {
      id:          row.admin_prof_id,
      employee_no: row.employee_no,
      office:      row.office,
      email:       row.admin_email,
    } : null,
    photo: row.photo_id ? {
      id:           row.photo_id,
      storage_path: row.storage_path,
      media_type:   row.media_type,
    } : null,
    card: row.card_id ? {
      id:           row.card_id,
      card_number:  row.card_number,
      status:       row.card_status,
      issue_date:   row.issue_date,
      valid_until:  row.valid_until,
    } : null,
    reissuance: row.reissuance_id ? {
      id:         row.reissuance_id,
      reason:     row.reason,
      fee_amount: row.fee_amount,
    } : null,
  };
}

// GET /api/applications
router.get('/', async (req, res) => {
  try {
    const { student_id, status, type, search } = req.query;
    const conditions = [];
    const values = [];

    if (student_id) {
      values.push(Number(student_id));
      conditions.push(`a.student_id = $${values.length}`);
    }
    if (status && status !== 'all') {
      values.push(status.toLowerCase());
      conditions.push(`LOWER(a.status) = $${values.length}`);
    }
    if (type && type !== 'all') {
      values.push(type.toLowerCase());
      conditions.push(`LOWER(a.type) = $${values.length}`);
    }
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      const i = values.length;
      conditions.push(`(
        LOWER(a.application_no) LIKE $${i} OR
        LOWER(sp.first_name)    LIKE $${i} OR
        LOWER(sp.last_name)     LIKE $${i} OR
        LOWER(sp.student_number) LIKE $${i} OR
        LOWER(sp.program)       LIKE $${i}
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `${FULL_APPLICATION_QUERY} ${where} ORDER BY a.submitted_at DESC`,
      values
    );

    res.json(rows.map(shapeApplication));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/applications/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${FULL_APPLICATION_QUERY} WHERE a.id = $1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Application not found' });

    // fetch status history separately
    const hist = await pool.query(
      `SELECT sh.*, u.email AS changer_email, u.role AS changer_role
       FROM status_history sh
       LEFT JOIN users u ON u.id = sh.changed_by
       WHERE sh.application_id = $1
       ORDER BY sh.changed_at ASC`,
      [Number(req.params.id)]
    );

    res.json({ ...shapeApplication(rows[0]), history: hist.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/applications
router.post('/', async (req, res) => {
  const { student_id, photo_file_id, type = 'New ID', user_id } = req.body;
  if (!student_id) return res.status(400).json({ message: 'student_id is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // verify student exists
    const sp = await client.query('SELECT id FROM student_profiles WHERE id = $1', [Number(student_id)]);
    if (!sp.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // get default admin to assign to
    const adminRes = await client.query('SELECT id FROM admin_profiles LIMIT 1');
    const assignedTo = adminRes.rows[0]?.id || null;

    const year = new Date().getFullYear();

    // insert application (app_no generated after we get the id)
    const appRes = await client.query(
      `INSERT INTO applications (application_no, student_id, assigned_to, photo_file_id, type, status)
       VALUES ('TEMP', $1, $2, $3, $4, 'submitted') RETURNING id`,
      [Number(student_id), assignedTo, photo_file_id ? Number(photo_file_id) : null, type]
    );
    const appId = appRes.rows[0].id;
    const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;

    await client.query('UPDATE applications SET application_no = $1 WHERE id = $2', [appNo, appId]);

    // record initial status history
    const changedBy = Number(user_id) || sp.rows[0].id;
    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'submitted', $2)`,
      [appId, changedBy]
    );

    await client.query('COMMIT');

    const { rows } = await pool.query(`${FULL_APPLICATION_QUERY} WHERE a.id = $1`, [appId]);
    res.status(201).json(shapeApplication(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/applications/:id/status  (admin only)
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  const { status, changed_by } = req.body;
  const appId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query('SELECT * FROM applications WHERE id = $1', [appId]);
    if (!appRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Application not found' });
    }
    const oldStatus = appRes.rows[0].status;

    await client.query(
      'UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, appId]
    );

    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [appId, oldStatus, status, Number(changed_by) || req.user.id]
    );

    // auto-create card when released
    if (status === 'released') {
      const existing = await client.query('SELECT id FROM cards WHERE application_id = $1', [appId]);
      if (!existing.rows.length) {
        const app = appRes.rows[0];
        const sp = await client.query('SELECT student_number FROM student_profiles WHERE id = $1', [app.student_id]);
        const studentCode = sp.rows[0]?.student_number?.replace('-', '') || 'CRD';
        const issueDate = new Date().toISOString().split('T')[0];
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 4);

        await client.query(
          `INSERT INTO cards (student_id, application_id, card_number, status, issue_date, valid_until)
           VALUES ($1, $2, $3, 'active', $4, $5)`,
          [
            app.student_id,
            appId,
            `WMSU-${new Date().getFullYear()}-${studentCode}-${Math.floor(100 + Math.random() * 900)}`,
            issueDate,
            validUntil.toISOString().split('T')[0],
          ]
        );
      }
    }

    await client.query('COMMIT');

    const { rows } = await pool.query(`${FULL_APPLICATION_QUERY} WHERE a.id = $1`, [appId]);
    res.json(shapeApplication(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/applications/:id/assign  (admin only)
router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  const { assigned_to } = req.body;
  const appId = Number(req.params.id);
  try {
    const result = await pool.query(
      'UPDATE applications SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [assigned_to ? Number(assigned_to) : null, appId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Application not found' });

    const { rows } = await pool.query(`${FULL_APPLICATION_QUERY} WHERE a.id = $1`, [appId]);
    res.json(shapeApplication(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
