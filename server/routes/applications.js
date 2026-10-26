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
    rr.original_card_id,
    orig_a.type    AS original_card_type,
    sh_hist.history_logs
  FROM applications a
  LEFT JOIN student_profiles sp ON sp.id = a.student_id
  LEFT JOIN users su             ON su.id = sp.user_id
  LEFT JOIN admin_profiles ap    ON ap.id = a.assigned_to
  LEFT JOIN users au             ON au.id = ap.user_id
  LEFT JOIN uploaded_files uf    ON uf.id = a.photo_file_id
  LEFT JOIN cards c              ON c.application_id = a.id
  LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
  LEFT JOIN cards orig_c        ON orig_c.id = rr.original_card_id
  LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(json_build_object(
      'id', sh.id,
      'application_id', sh.application_id,
      'from_status', sh.from_status,
      'to_status', sh.to_status,
      'remarks', sh.remarks,
      'changed_at', sh.changed_at,
      'changer_role', u.role,
      'changer_email', u.email
    ) ORDER BY sh.changed_at ASC), '[]'::json) AS history_logs
    FROM status_history sh
    LEFT JOIN users u ON u.id = sh.changed_by
    WHERE sh.application_id = a.id
  ) sh_hist ON true
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
    history:        row.history_logs || [],
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
      original_card_type: row.original_card_type === 'Access Card' ? 'Access Card' : 'Student ID',
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
      // Never return soft-deleted applications in student tracking
      conditions.push('a.deleted_at IS NULL');
    } else {
      if (student_id) {
        values.push(Number(student_id));
        conditions.push(`a.student_id = $${values.length}`);
      }
      if (req.query.archived === 'true') {
        conditions.push('a.deleted_at IS NOT NULL');
      } else if (req.query.archived === 'false') {
        conditions.push('a.deleted_at IS NULL');
      }
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
router.post('/', async (req, res) => {
  const { photo_file_id } = req.body;
  const isStudent = req.user.role === 'student';
  const student_id = isStudent ? req.user.profileId : req.body.student_id;
  const requestedType = req.body.type;
  const allowedTypes = ['New ID', 'Access Card', 'Replacement', 'Renewal'];
  const type = allowedTypes.includes(requestedType) ? requestedType : 'New ID';
  if (!student_id) return res.status(400).json({ message: 'student_id is required' });

  // A photo is required for New ID, Access Card, or Renewal if newly requested
  if ((type === 'New ID' || type === 'Access Card' || type === 'Renewal') && !photo_file_id) {
    return res.status(400).json({ message: `A photo is required for a ${type} application` });
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

    if (type === 'New ID') {
      const { rows } = await client.query(
        `SELECT
           EXISTS (SELECT 1 FROM applications WHERE student_id = $1 AND type = 'New ID' AND status != 'rejected') AS has_app,
           EXISTS (SELECT 1 FROM cards        WHERE student_id = $1) AS has_card`,
        [Number(student_id)]
      );
      if (rows[0].has_app || rows[0].has_card) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'First-time Student ID has already been applied. You can only request a reissuance for lost/destroyed ID, renew your card if expired, or apply for an Access Card.' });
      }
    }

    if (type === 'Renewal') {
      const { rows } = await client.query(
        `SELECT EXISTS (SELECT 1 FROM applications WHERE student_id = $1 AND type = 'Renewal' AND status IN ('submitted', 'processing', 'ready')) AS in_progress`,
        [Number(student_id)]
      );
      if (rows[0].in_progress) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'You already have a Card Renewal application in progress.' });
      }

      // Card validation check: student can only renew once the valid until is over
      const cardRes = await client.query(
        `SELECT * FROM cards WHERE student_id = $1`,
        [Number(student_id)]
      );
      const hasExpiredCard = cardRes.rows.some(c => {
        if (c.status === 'expired') return true;
        if (!c.valid_until) return false;
        const validDate = new Date(c.valid_until);
        return !isNaN(validDate.getTime()) && validDate.getTime() < Date.now();
      });

      if (!hasExpiredCard) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'You can only renew your card once the valid until date is over.' });
      }
    }

    if (type === 'Replacement') {
      const { rows } = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM applications 
           WHERE student_id = $1 AND type IN ('Replacement', 'Renewal') AND status IN ('submitted', 'processing', 'ready')
         ) AS in_progress`,
        [Number(student_id)]
      );
      if (rows[0].in_progress) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'You already have an active reissue request in progress. You can only submit one reissue request at a time across both access and ID cards.'
        });
      }
    }

    if (type === 'Access Card') {
      const { rows } = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM applications 
           WHERE student_id = $1 AND type = 'Access Card' AND status IN ('submitted', 'processing', 'ready')
         ) AS in_progress`,
        [Number(student_id)]
      );
      if (rows[0].in_progress) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'You already have an Access Card application in progress.'
        });
      }

      const activeCardRes = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM cards c
           LEFT JOIN applications a ON a.id = c.application_id
           LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
           LEFT JOIN cards orig_c ON orig_c.id = rr.original_card_id
           LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
           WHERE c.student_id = $1 AND c.status = 'active'
             AND (a.type = 'Access Card' OR orig_a.type = 'Access Card')
         ) AS has_active`,
        [Number(student_id)]
      );
      if (activeCardRes.rows[0].has_active) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'You already have an active Access Card. Students can only hold one active Access Card at a time.'
        });
      }
    }

    // photo must exist and (for students) belong to the caller if photo_file_id is provided
    if (photo_file_id) {
      const f = await client.query('SELECT uploaded_by FROM uploaded_files WHERE id = $1', [Number(photo_file_id)]);
      if (!f.rows.length || (isStudent && f.rows[0].uploaded_by !== req.user.id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid photo' });
      }
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
  const { status, remarks } = req.body;
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

    const cleanRemarks = typeof remarks === 'string' && remarks.trim().length > 0 ? remarks.trim() : null;

    await client.query(
      'UPDATE applications SET status = $1, remarks = COALESCE($2, remarks), updated_at = NOW() WHERE id = $3',
      [status, cleanRemarks, appId]
    );

    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [appId, oldStatus, status, req.user.id, cleanRemarks]
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

        if (app.type === 'Renewal' || app.type === 'Replacement') {
          const rrRes = await client.query(
            'SELECT original_card_id FROM reissuance_requests WHERE application_id = $1',
            [appId]
          );
          if (rrRes.rows.length) {
            await client.query(
              "UPDATE cards SET status = 'expired' WHERE id = $1",
              [rrRes.rows[0].original_card_id]
            );
          } else {
            await client.query(
              "UPDATE cards SET status = 'expired' WHERE student_id = $1 AND status = 'active'",
              [app.student_id]
            );
          }
        }

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

    // Sync status with reissuance_requests if this is a replacement or renewal
    if (status === 'released') {
      await client.query(
        "UPDATE reissuance_requests SET status = 'released' WHERE application_id = $1",
        [appId]
      );
    } else if (status === 'rejected') {
      await client.query(
        "UPDATE reissuance_requests SET status = 'rejected' WHERE application_id = $1",
        [appId]
      );
    } else if (status === 'processing') {
      await client.query(
        "UPDATE reissuance_requests SET status = 'processing' WHERE application_id = $1",
        [appId]
      );
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
  if (!Number.isInteger(appId)) {
    return res.status(400).json({ message: 'Invalid application id' });
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

// DELETE /api/applications/:id
router.delete('/:id', async (req, res) => {
  const appId = Number(req.params.id);
  if (!Number.isInteger(appId)) {
    return res.status(400).json({ message: 'Invalid application id' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [appId]);
    const app = rows[0];
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (req.user.role === 'student' && app.student_id !== req.user.profileId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (app.status !== 'released' && app.status !== 'rejected') {
      return res.status(400).json({
        message: 'Only finished (released or rejected) applications can be deleted from tracking.'
      });
    }

    await pool.query('UPDATE applications SET deleted_at = NOW() WHERE id = $1', [appId]);
    res.json({ message: 'Application removed from tracking successfully', id: appId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
