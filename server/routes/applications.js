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
    sp.middle_name,
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
    rr.fee_amount,
    rr.original_card_id
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
      middle_name:    row.middle_name,
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
      original_card_id: row.original_card_id,
    } : null,
  };
}

// GET /api/applications
router.get('/', async (req, res) => {
  try {
    const { student_id, status, type, search } = req.query;
    const conditions = [];
    const values = [];

        if (req.user.role === 'student') {
      // students ALWAYS see only their own, no matter what they send
      values.push(req.user.profileId);
      conditions.push(`a.student_id = $${values.length}`);
    } else if (student_id) {
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
        LOWER(sp.middle_name)    LIKE $${i} OR
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
   const row = rows[0];

    // 404 for both "doesn't exist" and "not yours"
    if (!row || (req.user.role === 'student' && row.student_id !== req.user.profileId)) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(shapeApplication(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/applications
// POST /api/applications
router.post('/', async (req, res) => {
  const { photo_file_id } = req.body;
  const isStudent = req.user.role === 'student';
  const student_id = isStudent ? req.user.profileId : req.body.student_id;
  const type = isStudent ? 'New ID' : (req.body.type || 'New ID');
  if (!student_id) return res.status(400).json({ message: 'student_id is required' });

  // FIX 11: a New ID needs a photo (checked first, before touching the DB)
  if (type === 'New ID' && !photo_file_id) {
    return res.status(400).json({ message: 'A photo is required for a New ID application' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // verify student exists; FOR UPDATE locks the row so two simultaneous
    // requests from the same student can't both pass the duplicate check
    const sp = await client.query(
      'SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE',
      [Number(student_id)]
    );
    if (!sp.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // FIX 10: only New ID is blocked, so Replacement/reissuance is unaffected
    if (type === 'New ID') {
      const { rows } = await client.query(
        `SELECT
           EXISTS (SELECT 1 FROM applications WHERE student_id = $1) AS has_app,
           EXISTS (SELECT 1 FROM cards        WHERE student_id = $1) AS has_card`,
        [Number(student_id)]
      );
      if (rows[0].has_app || rows[0].has_card) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'You already have an ID application or card' });
      }
    }

    // photo must exist and (for students) belong to the caller
    const f = await client.query('SELECT uploaded_by FROM uploaded_files WHERE id = $1', [Number(photo_file_id)]);
    if (!f.rows.length || (isStudent && f.rows[0].uploaded_by !== req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid photo' });
    }

    // get default admin to assign to
    const adminRes = await client.query('SELECT id FROM admin_profiles LIMIT 1');
    const assignedTo = adminRes.rows[0]?.id || null;

    const year = new Date().getFullYear();

    const appRes = await client.query(
      `INSERT INTO applications (application_no, student_id, assigned_to, photo_file_id, type, status)
       VALUES ('TEMP', $1, $2, $3, $4, 'submitted') RETURNING id`,
      [Number(student_id), assignedTo, Number(photo_file_id), type]
    );
    const appId = appRes.rows[0].id;
    const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;
    await client.query('UPDATE applications SET application_no = $1 WHERE id = $2', [appNo, appId]);

    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'submitted', $2)`,
      [appId, req.user.id]
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
const STATUSES = ['submitted', 'processing', 'ready', 'released', 'rejected'];
const ALLOWED_NEXT = {
  submitted:  ['processing', 'rejected'],
  processing: ['ready', 'rejected'],
  ready:      ['released', 'rejected'],
  released:   [],
  rejected:   [],
};

router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const appId = Number(req.params.id);

  if (!Number.isInteger(appId)) {
    return res.status(400).json({ message: 'Invalid application id' });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query(
      'SELECT * FROM applications WHERE id = $1 FOR UPDATE', [appId]
    );
    if (!appRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Application not found' });
    }
    const oldStatus = appRes.rows[0].status;

    if (!ALLOWED_NEXT[oldStatus]?.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `Cannot move from ${oldStatus} to ${status}` });
    }

    await client.query(
      'UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, appId]
    );

    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [appId, oldStatus, status, req.user.id]
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
    if (!['submitted', 'processing', 'ready', 'released', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
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
