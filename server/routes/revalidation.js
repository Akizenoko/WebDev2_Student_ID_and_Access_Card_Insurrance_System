import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

const SEMESTER = /^\d{4}-(First|Second|Summer)$/;
const DECISIONS = ['verified', 'for_review', 'ineligible'];

// GET /api/revalidation
router.get('/', async (req, res) => {
  try {
    const values = [];
    const conditions = [];
    if (req.user.role === 'student') {
      values.push(req.user.profileId);
      conditions.push(`rv.student_id = $${values.length}`);
    }
    const { status, semester } = req.query;
    if (status && status !== 'all') { values.push(status); conditions.push(`rv.status = $${values.length}`); }
    if (semester && semester !== 'all') { values.push(semester); conditions.push(`rv.semester = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT rv.*, sp.student_number, sp.first_name, sp.last_name, sp.program, sp.year_level, sp.college,
             uf.storage_path AS cor_path, uf.original_name AS cor_name,
             u.email AS reviewer_email,
             (SELECT COUNT(*) FROM cards c WHERE c.student_id = rv.student_id AND c.status IN ('active','issued')) AS active_cards
      FROM revalidations rv
      JOIN student_profiles sp ON sp.id = rv.student_id
      LEFT JOIN uploaded_files uf ON uf.id = rv.cor_file_id
      LEFT JOIN users u ON u.id = rv.reviewed_by
      ${where}
      ORDER BY rv.created_at DESC`, values);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/revalidation — student submits or confirms the current semester COR
router.post('/', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  const { semester, cor_file_id } = req.body;
  if (typeof semester !== 'string' || !SEMESTER.test(semester)) {
    return res.status(400).json({ message: 'Choose a valid semester, such as 2026-First' });
  }
  if (!Number.isInteger(Number(cor_file_id))) return res.status(400).json({ message: 'Upload your current COR first' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const file = await client.query(
      `SELECT id FROM uploaded_files WHERE id = $1 AND uploaded_by = $2 AND kind = 'cor'`,
      [Number(cor_file_id), req.user.id]
    );
    if (!file.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Select a COR you uploaded' }); }

    const existing = await client.query(
      `SELECT id, status FROM revalidations WHERE student_id = $1 AND semester = $2`,
      [req.user.profileId, semester]
    );
    if (existing.rows.length && existing.rows[0].status === 'verified') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This semester is already verified' });
    }
    const { rows } = existing.rows.length
      ? await client.query(
          `UPDATE revalidations SET cor_file_id = $2, status = 'pending', remarks = NULL,
             reviewed_by = NULL, reviewed_at = NULL, created_at = NOW()
           WHERE id = $1 RETURNING *`, [existing.rows[0].id, Number(cor_file_id)])
      : await client.query(
          `INSERT INTO revalidations (student_id, semester, cor_file_id) VALUES ($1, $2, $3) RETURNING *`,
          [req.user.profileId, semester, Number(cor_file_id)]);

    await client.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'revalidation_submitted', 'student', $2, $3::jsonb)`,
      [req.user.id, req.user.profileId, JSON.stringify({ semester })]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ message: 'Server error' }); }
  finally { client.release(); }
});

// PATCH /api/revalidation/:id/review — admin / validator decision
router.patch('/:id/review', requireRole('admin', 'validator'), async (req, res) => {
  const id = Number(req.params.id);
  const { status, remarks } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid revalidation record' });
  if (!DECISIONS.includes(status)) return res.status(400).json({ message: 'Invalid revalidation decision' });
  if (status === 'ineligible' && typeof remarks !== 'string') {
    return res.status(400).json({ message: 'State why the student is no longer eligible' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM revalidations WHERE id = $1 FOR UPDATE', [id]);
    const record = current.rows[0];
    if (!record) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Revalidation record not found' }); }

    const { rows } = await client.query(`
      UPDATE revalidations SET status = $2, remarks = $3, reviewed_by = $4, reviewed_at = NOW()
      WHERE id = $1 RETURNING *`, [id, status, remarks?.trim() || null, req.user.id]);

    if (status === 'verified') {
      await client.query(`
        UPDATE cards SET validated_semester = $2, validated_at = NOW(),
          valid_until = CURRENT_DATE + INTERVAL '5 months'
        WHERE student_id = $1 AND status IN ('active','issued')`, [record.student_id, record.semester]);
    } else if (status === 'ineligible') {
      const cards = await client.query(
        `SELECT id, access_status FROM cards WHERE student_id = $1 AND status IN ('active','issued')`, [record.student_id]);
      for (const card of cards.rows) {
        await client.query(`UPDATE cards SET access_status = 'revoked' WHERE id = $1`, [card.id]);
        await client.query(`INSERT INTO card_status_history
          (card_id, from_status, to_status, from_access_status, to_access_status, changed_by, reason)
          VALUES ($1, NULL, NULL, $2, 'revoked', $3, $4)`,
          [card.id, card.access_status, req.user.id, `Semester revalidation: ${remarks.trim()}`]);
      }
    }
    await client.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'revalidation_reviewed', 'student', $2, $3::jsonb)`,
      [req.user.id, record.student_id, JSON.stringify({ semester: record.semester, status, remarks: remarks?.trim() || null })]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ message: 'Server error' }); }
  finally { client.release(); }
});

export default router;
