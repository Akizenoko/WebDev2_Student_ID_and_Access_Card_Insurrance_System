import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

function audit(actorId, action, entityType, entityId, details = {}) {
  return pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(details)]
  );
}

function cleanDate(value) {
  if (value === undefined || value === null || value === '') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : false;
}

// GET /api/facilities
router.get('/', async (req, res) => {
  try {
    const studentFilter = req.user.role === 'student'
      ? `WHERE f.is_active = TRUE AND EXISTS (
           SELECT 1 FROM card_permissions cp
           JOIN cards c ON c.id = cp.card_id
           WHERE cp.facility_id = f.id AND c.student_id = $1
             AND cp.is_active = TRUE AND cp.valid_from <= CURRENT_DATE
             AND (cp.valid_until IS NULL OR cp.valid_until >= CURRENT_DATE))`
      : '';
    const { rows } = await pool.query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM card_permissions cp
          WHERE cp.facility_id = f.id AND cp.is_active = TRUE) AS active_permissions
      FROM facilities f
      ${studentFilter}
      ORDER BY f.is_active DESC, f.name ASC`, req.user.role === 'student' ? [req.user.profileId] : []);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/facilities/permissions
router.get('/permissions', async (req, res) => {
  try {
    const values = [];
    const conditions = [];
    if (req.user.role === 'student') {
      values.push(req.user.profileId);
      conditions.push(`c.student_id = $${values.length}`);
    }
    const { card_id, facility_id } = req.query;
    if (req.user.role !== 'student' && card_id) { values.push(Number(card_id)); conditions.push(`cp.card_id = $${values.length}`); }
    if (facility_id) { values.push(Number(facility_id)); conditions.push(`cp.facility_id = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT cp.*, f.name AS facility_name, f.code AS facility_code, f.location,
             c.card_number, c.credential_ref, c.status AS card_status, c.access_status,
             sp.student_number, sp.first_name, sp.last_name
      FROM card_permissions cp
      JOIN facilities f ON f.id = cp.facility_id
      JOIN cards c ON c.id = cp.card_id
      JOIN student_profiles sp ON sp.id = c.student_id
      ${where}
      ORDER BY cp.is_active DESC, f.name ASC`, values);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/facilities — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, code, location, description } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ message: 'Facility name and code are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO facilities (name, code, location, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim().slice(0, 120), code.trim().toUpperCase().slice(0, 30), location?.trim() || null, description?.trim() || null]
    );
    await audit(req.user.id, 'facility_created', 'facility', rows[0].id, { code: rows[0].code });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A facility with that name or code already exists' });
    console.error(err); res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/facilities/:id — admin only
router.patch('/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, code, location, description, is_active } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid facility' });
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return res.status(400).json({ message: 'Invalid facility name' });
  if (code !== undefined && (typeof code !== 'string' || !code.trim())) return res.status(400).json({ message: 'Invalid facility code' });
  try {
    const { rows } = await pool.query(`
      UPDATE facilities SET
        name = COALESCE($2, name),
        code = COALESCE($3, code),
        location = COALESCE($4, location),
        description = COALESCE($5, description),
        is_active = COALESCE($6, is_active)
      WHERE id = $1 RETURNING *`,
      [id, name?.trim() || null, code?.trim().toUpperCase() || null, location?.trim() || null, description?.trim() || null,
        typeof is_active === 'boolean' ? is_active : null]
    );
    if (!rows.length) return res.status(404).json({ message: 'Facility not found' });
    await audit(req.user.id, 'facility_updated', 'facility', id, { code: rows[0].code, is_active: rows[0].is_active });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A facility with that name or code already exists' });
    console.error(err); res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/facilities/:id — deactivate, never delete history
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid facility' });
  try {
    const { rows } = await pool.query('UPDATE facilities SET is_active = FALSE WHERE id = $1 RETURNING id, code', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Facility not found' });
    await audit(req.user.id, 'facility_deactivated', 'facility', id, { code: rows[0].code });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/facilities/:id/permissions — grant or renew a facility permission
router.post('/:id/permissions', requireRole('admin', 'validator'), async (req, res) => {
  const facilityId = Number(req.params.id);
  const cardId = Number(req.body.card_id);
  const validFrom = cleanDate(req.body.valid_from) || new Date().toISOString().slice(0, 10);
  const validUntil = cleanDate(req.body.valid_until);
  if (!Number.isInteger(facilityId) || !Number.isInteger(cardId)) return res.status(400).json({ message: 'Card and facility are required' });
  if (validFrom === false || validUntil === false) return res.status(400).json({ message: 'Use YYYY-MM-DD for permission dates' });
  if (validUntil && validUntil < validFrom) return res.status(400).json({ message: 'End date must be after the start date' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query(`
      SELECT f.id AS facility_id, c.id AS card_id, c.card_number, c.status AS card_status
      FROM facilities f, cards c WHERE f.id = $1 AND c.id = $2 AND f.is_active = TRUE`, [facilityId, cardId]);
    if (!check.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Active facility or card not found' }); }
    const { rows } = await client.query(`
      INSERT INTO card_permissions (card_id, facility_id, valid_from, valid_until, is_active, granted_by)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      ON CONFLICT (card_id, facility_id) DO UPDATE
        SET valid_from = EXCLUDED.valid_from, valid_until = EXCLUDED.valid_until,
            is_active = TRUE, granted_by = EXCLUDED.granted_by
      RETURNING *`, [cardId, facilityId, validFrom, validUntil, req.user.id]);
    await client.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'facility_permission_granted', 'card', $2, $3::jsonb)`,
      [req.user.id, cardId, JSON.stringify({ facility_id: facilityId, valid_from: validFrom, valid_until: validUntil })]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ message: 'Server error' }); }
  finally { client.release(); }
});

// PATCH /api/facilities/permissions/:id — update validity or active flag
router.patch('/permissions/:id', requireRole('admin', 'validator'), async (req, res) => {
  const id = Number(req.params.id);
  const validFrom = cleanDate(req.body.valid_from);
  const validUntil = cleanDate(req.body.valid_until);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid permission' });
  if (validFrom === false || validUntil === false) return res.status(400).json({ message: 'Use YYYY-MM-DD for permission dates' });
  try {
    const { rows } = await pool.query(`
      UPDATE card_permissions SET
        valid_from = COALESCE($2, valid_from),
        valid_until = CASE WHEN $3::boolean THEN $4 ELSE valid_until END,
        is_active = COALESCE($5, is_active)
      WHERE id = $1 RETURNING *`,
      [id, validFrom, validUntil !== null, validUntil, typeof req.body.is_active === 'boolean' ? req.body.is_active : null]);
    if (!rows.length) return res.status(404).json({ message: 'Permission not found' });
    await audit(req.user.id, 'facility_permission_updated', 'permission', id, { is_active: rows[0].is_active });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/facilities/permissions/:id — revoke, keep the record
router.delete('/permissions/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid permission' });
  try {
    const { rows } = await pool.query('UPDATE card_permissions SET is_active = FALSE WHERE id = $1 RETURNING id, card_id, facility_id', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Permission not found' });
    await audit(req.user.id, 'facility_permission_revoked', 'permission', id, { card_id: rows[0].card_id, facility_id: rows[0].facility_id });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;
