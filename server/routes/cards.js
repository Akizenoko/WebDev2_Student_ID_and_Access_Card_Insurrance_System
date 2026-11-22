import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

async function logCardChange(cardId, actorId, before, after, reason) {
  await pool.query(`
    INSERT INTO card_status_history
      (card_id, from_status, to_status, from_access_status, to_access_status, changed_by, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [cardId, before.status, after.status, before.access_status, after.access_status, actorId, reason || null]);
  await pool.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES ($1, 'card_status_changed', 'card', $2, $3::jsonb)`,
    [actorId, cardId, JSON.stringify({ before, after, reason: reason || null })]);
}

async function expireCardsAndNotify() {
  const due = await pool.query(`
    SELECT id, status, access_status FROM cards
    WHERE status = 'active' AND valid_until < (NOW() AT TIME ZONE 'Asia/Manila')::date`);
  const { rows } = await pool.query(`
    UPDATE cards c SET status = 'expired', access_status = 'inactive'
    WHERE c.status = 'active' AND c.valid_until < (NOW() AT TIME ZONE 'Asia/Manila')::date
    RETURNING c.id, c.application_id, c.student_id`);
  for (const old of due.rows) {
    await logCardChange(old.id, null, old, { status: 'expired', access_status: 'inactive' }, 'Automatic expiry');
  }
  for (const card of rows) {
    await pool.query(`
      INSERT INTO notifications (user_id, application_id, card_id, message)
      SELECT sp.user_id, $1, $3, 'Your university ID has expired. Please submit a renewal request to validate it for the new semester.'
      FROM student_profiles sp WHERE sp.id = $2
        AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.card_id = $3 AND n.message = 'Your university ID has expired. Please submit a renewal request to validate it for the new semester.')`,
    [card.application_id, card.student_id, card.id]);
  }
}

// GET /api/cards?student_id=X
router.get('/', async (req, res) => {
  try {
    await expireCardsAndNotify();
    const { student_id, college, status, date_from, date_to, search } = req.query;
    const conditions = [];
    const values = [];

        if (req.user.role === 'student') {
      values.push(req.user.profileId);
      conditions.push(`c.student_id = $${values.length}`);
    } else if (student_id) {
      values.push(Number(student_id));
      conditions.push(`c.student_id = $${values.length}`);
    }
    if (req.user.role !== 'student') {
      if (college && college !== 'all') { values.push(college); conditions.push(`sp.college = $${values.length}`); }
      if (status && status !== 'all') { values.push(status); conditions.push(`c.status = $${values.length}`); }
      if (date_from) { values.push(date_from); conditions.push(`c.issue_date >= $${values.length}::date`); }
      if (date_to) { values.push(date_to); conditions.push(`c.issue_date <= $${values.length}::date`); }
      if (search) { values.push(`%${search.toLowerCase()}%`); conditions.push(`(LOWER(sp.first_name || ' ' || sp.last_name) LIKE $${values.length} OR LOWER(sp.student_number) LIKE $${values.length} OR LOWER(c.card_number) LIKE $${values.length})`); }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         c.*,
         sp.student_number, sp.first_name, sp.middle_name, sp.last_name, sp.program, sp.year_level,
         sp.college,
         a.application_no, a.type AS application_type,
         CASE
           WHEN a.type = 'Access Card' THEN 'Access Card'
           WHEN orig_a.type = 'Access Card' THEN 'Access Card'
           ELSE 'Student ID'
         END AS card_type,
         uf.storage_path, uf.media_type
       FROM cards c
       LEFT JOIN student_profiles sp ON sp.id = c.student_id
       LEFT JOIN applications a      ON a.id  = c.application_id
       LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
       LEFT JOIN cards orig_c        ON orig_c.id = rr.original_card_id
       LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
       LEFT JOIN uploaded_files uf   ON uf.id = a.photo_file_id
       ${where}
       ORDER BY c.issue_date DESC`,
      values
    );

    res.json(rows.map(r => ({
      id:             r.id,
      card_number:    r.card_number,
      credential_ref: r.credential_ref,
      card_type:      r.card_type,
      status:         r.status,
      access_status:  r.access_status,
      validated_semester: r.validated_semester,
      validated_at: r.validated_at,
      issue_date:     r.issue_date,
      valid_until:    r.valid_until,
      student_id:     r.student_id,
      application_id: r.application_id,
      student: {
        student_number: r.student_number,
        first_name:     r.first_name,
        middle_name:    r.middle_name,
        last_name:      r.last_name,
        program:        r.program,
        college:        r.college,
        year_level:     r.year_level,
      },
      application: r.application_no ? {
        application_no: r.application_no,
        type:           r.application_type,
      } : null,
      photo: r.storage_path ? {
        storage_path: r.storage_path,
        media_type:   r.media_type,
      } : null,
      orientation: 'landscape',
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         c.*,
         sp.student_number, sp.first_name, sp.middle_name, sp.last_name, sp.program, sp.year_level,
         sp.college,
         a.application_no, a.type AS application_type,
         CASE
           WHEN a.type = 'Access Card' THEN 'Access Card'
           WHEN orig_a.type = 'Access Card' THEN 'Access Card'
           ELSE 'Student ID'
         END AS card_type,
         uf.storage_path, uf.media_type
       FROM cards c
       LEFT JOIN student_profiles sp ON sp.id = c.student_id
       LEFT JOIN applications a      ON a.id  = c.application_id
       LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
       LEFT JOIN cards orig_c        ON orig_c.id = rr.original_card_id
       LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
       LEFT JOIN uploaded_files uf   ON uf.id = a.photo_file_id
       WHERE c.id = $1`,
      [Number(req.params.id)]
    );
        const r = rows[0];
    if (!r || (req.user.role === 'student' && r.student_id !== req.user.profileId)) {
      return res.status(404).json({ message: 'Card not found' });
    }
    res.json({
      id:             r.id,
      card_number:    r.card_number,
      credential_ref: r.credential_ref,
      card_type:      r.card_type,
      status:         r.status,
      access_status:  r.access_status,
      validated_semester: r.validated_semester,
      validated_at: r.validated_at,
      issue_date:     r.issue_date,
      valid_until:    r.valid_until,
      student_id:     r.student_id,
      application_id: r.application_id,
      student: {
        student_number: r.student_number,
        first_name:     r.first_name,
        middle_name:    r.middle_name,
        last_name:      r.last_name,
        program:        r.program,
        college:        r.college,
        year_level:     r.year_level,
      },
      application: r.application_no ? {
        application_no: r.application_no,
        type:           r.application_type,
      } : null,
      photo: r.storage_path ? {
        storage_path: r.storage_path,
        media_type:   r.media_type,
      } : null,
      orientation: 'landscape',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/access-request', async (req, res) => {
  const cardId = Number(req.params.id);
  if (!Number.isInteger(cardId)) return res.status(400).json({ message: 'Invalid card id' });
  const values = req.user.role === 'student' ? [cardId, req.user.profileId] : [cardId];
  const owned = req.user.role === 'student' ? 'AND student_id = $2' : '';
  const result = await pool.query(
    `UPDATE cards SET access_status = 'requested' WHERE id = $1 ${owned} AND status = 'active' AND access_status IN ('inactive', 'unregistered') RETURNING id, access_status`, values
  );
  if (!result.rows.length) return res.status(409).json({ message: 'Only an active card awaiting registration can request access activation' });

  const card = await pool.query(
    `SELECT c.card_number, sp.first_name, sp.last_name
     FROM cards c JOIN student_profiles sp ON sp.id = c.student_id
     WHERE c.id = $1`, [cardId]
  );
  const student = card.rows[0];
  const name = student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : 'a student';
  await pool.query(
    `INSERT INTO notifications (user_id, card_id, message)
     SELECT id, $1, $2
     FROM users
     WHERE role IN ('admin', 'validator') AND is_active = TRUE`,
    [cardId, `Access activation requested for ${name} (${student?.card_number || cardId}).`]
  );

  res.json(result.rows[0]);
});

const ACCESS_STATES = ['unregistered', 'registered', 'pending_activation', 'requested', 'active', 'suspended', 'inactive', 'revoked'];

// GET /api/cards/credential/:ref — duplicate check before registering a credential
router.get('/credential/:ref', requireRole('admin', 'validator'), async (req, res) => {
  const ref = req.params.ref.trim().toUpperCase();
  const { rows } = await pool.query(`
    SELECT c.id, c.card_number, c.credential_ref, c.status, c.access_status,
           sp.student_number, sp.first_name, sp.last_name
    FROM cards c JOIN student_profiles sp ON sp.id = c.student_id
    WHERE UPPER(c.credential_ref) = $1`, [ref]);
  const card = rows[0];
  res.json({
    reference: ref,
    available: !card,
    card: card || null,
    message: card
      ? `Already assigned to ${card.student_number} (${card.card_number})`
      : 'Reference is available',
  });
});

router.patch('/:id/access-status', requireRole('admin', 'validator'), async (req, res) => {
  const cardId = Number(req.params.id);
  const { access_status, reason } = req.body;
  if (!Number.isInteger(cardId) || !ACCESS_STATES.includes(access_status)) return res.status(400).json({ message: 'Invalid access status' });
  const before = await pool.query('SELECT id, status, access_status FROM cards WHERE id = $1', [cardId]);
  if (!before.rows.length) return res.status(404).json({ message: 'Card not found' });
  const result = await pool.query(
    `UPDATE cards SET access_status = $1::varchar, access_activated_at = CASE WHEN $1::varchar = 'active' THEN NOW() ELSE access_activated_at END WHERE id = $2 RETURNING id, status, access_status`,
    [access_status, cardId]
  );
  await logCardChange(cardId, req.user.id, before.rows[0], result.rows[0], reason);
  res.json(result.rows[0]);
});

// PATCH /api/cards/:id/status — physical lifecycle change, history is preserved
router.patch('/:id/status', requireRole('admin', 'validator'), async (req, res) => {
  const cardId = Number(req.params.id);
  const { status, reason } = req.body;
  const PHYSICAL_STATES = ['pending_production', 'ready_for_release', 'issued', 'active', 'lost', 'damaged', 'replaced', 'expired', 'suspended', 'revoked'];
  if (!Number.isInteger(cardId) || !PHYSICAL_STATES.includes(status)) return res.status(400).json({ message: 'Invalid card status' });
  if (['lost', 'replaced', 'suspended', 'revoked'].includes(status) && typeof reason !== 'string') {
    return res.status(400).json({ message: 'A reason is required for this status change' });
  }
  const before = await pool.query('SELECT id, status, access_status FROM cards WHERE id = $1', [cardId]);
  if (!before.rows.length) return res.status(404).json({ message: 'Card not found' });
  const after = await pool.query('UPDATE cards SET status = $1 WHERE id = $2 RETURNING id, status, access_status', [status, cardId]);
  await logCardChange(cardId, req.user.id, before.rows[0], after.rows[0], reason);
  res.json(after.rows[0]);
});

// GET /api/cards/:id/history
router.get('/:id/history', requireRole('admin', 'validator'), async (req, res) => {
  const cardId = Number(req.params.id);
  if (!Number.isInteger(cardId)) return res.status(400).json({ message: 'Invalid card id' });
  const { rows } = await pool.query(`
    SELECT h.*, u.email AS changed_by_email
    FROM card_status_history h LEFT JOIN users u ON u.id = h.changed_by
    WHERE h.card_id = $1 ORDER BY h.changed_at DESC`, [cardId]);
  res.json(rows);
});

router.patch('/:id/validate-semester', requireRole('admin', 'validator'), async (req, res) => {
  const cardId = Number(req.params.id);
  const { semester } = req.body;
  if (!Number.isInteger(cardId) || typeof semester !== 'string' || !/^\d{4}-(First|Second|Summer)$/.test(semester)) {
    return res.status(400).json({ message: 'Choose a valid academic semester, such as 2026-First' });
  }
  const result = await pool.query(
    `UPDATE cards SET validated_semester = $1, validated_at = NOW(),
       valid_until = CURRENT_DATE + INTERVAL '5 months'
     WHERE id = $2 AND status = 'active' RETURNING id, validated_semester, validated_at, valid_until`,
    [semester, cardId]
  );
  if (!result.rows.length) return res.status(409).json({ message: 'Only an active ID can be validated' });
  res.json(result.rows[0]);
});

router.delete('/:id/validate-semester', requireRole('admin'), async (req, res) => {
  const cardId = Number(req.params.id);
  if (!Number.isInteger(cardId)) return res.status(400).json({ message: 'Invalid card id' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT id, status, access_status FROM cards WHERE id = $1', [cardId]);
    if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'ID not found' }); }
    const result = await client.query(`UPDATE cards SET validated_semester = NULL, validated_at = NULL,
      valid_until = CURRENT_DATE - INTERVAL '1 day', access_status = 'inactive'
      WHERE id = $1 RETURNING id, student_id, status, access_status`, [cardId]);
    await logCardChange(cardId, req.user.id, before.rows[0], result.rows[0], 'Semester validation revoked');
    await client.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'id_validation_revoked', 'card', $2, '{}'::jsonb)`, [req.user.id, cardId]);
    await client.query('COMMIT');
    res.json({ ok: true, id: cardId });
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ message: 'Server error' }); }
  finally { client.release(); }
});

export default router;
