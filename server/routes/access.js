import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/access/check — simulated card scan used for the prototype.
router.post('/check', requireRole('admin', 'validator'), async (req, res) => {
  const rfidUid = typeof req.body.rfid_uid === 'string' ? req.body.rfid_uid.trim().toUpperCase() : '';
  const facilityCode = typeof req.body.facility_code === 'string' ? req.body.facility_code.trim().toUpperCase() : '';
  const facilityId = Number(req.body.facility_id);

  if (!rfidUid || (!facilityCode && !Number.isInteger(facilityId))) {
    return res.status(400).json({ message: 'A card tap and a facility are required' });
  }

  try {
    const cardResult = await pool.query(`SELECT c.*, sp.first_name, sp.last_name, sp.student_number
      FROM cards c JOIN student_profiles sp ON sp.id = c.student_id
      WHERE c.rfid_uid = $1`, [rfidUid]);

    const card = cardResult.rows[0];
    const facilityResult = facilityCode
      ? await pool.query('SELECT * FROM facilities WHERE UPPER(code) = $1', [facilityCode])
      : await pool.query('SELECT * FROM facilities WHERE id = $1', [facilityId]);
    const facility = facilityResult.rows[0];

    let result = 'denied';
    let reason = '';
    if (!card) {
      reason = 'Card is not registered';
    } else if (!facility) {
      reason = 'Facility is not registered';
    } else if (!facility.is_active) {
      reason = 'Facility is inactive';
    } else if (!['active', 'issued'].includes(card.status)) {
      reason = `ID record is ${card.status}`;
    } else if (card.access_status !== 'active') {
      reason = `Access card is ${card.access_status}`;
    } else if (card.valid_until && card.valid_until < today()) {
      reason = 'Credential validity period has ended';
    } else {
      const permission = await pool.query(`
        SELECT cp.id FROM card_permissions cp
        WHERE cp.card_id = $1 AND cp.facility_id = $2 AND cp.is_active = TRUE
          AND cp.valid_from <= CURRENT_DATE
          AND (cp.valid_until IS NULL OR cp.valid_until >= CURRENT_DATE)
        LIMIT 1`, [card.id, facility.id]);
      reason = permission.rows.length ? '' : 'No active permission for this facility';
      if (!reason) result = 'granted';
    }

    const attempt = await pool.query(`
      INSERT INTO access_attempts
        (card_id, facility_id, credential_ref, facility_code, result, reason, scanned_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [card?.id || null, facility?.id || null, card?.credential_ref || rfidUid,
        facilityCode || facility?.code || null, result, reason || null, req.user.id]);

    res.json({
      result,
      reason,
      scanned_at: attempt.rows[0].scanned_at,
      card: card ? {
        id: card.id,
        card_number: card.card_number,
        credential_ref: card.credential_ref,
        student_number: card.student_number,
        name: `${card.first_name} ${card.last_name}`.trim(),
        access_status: card.access_status,
      } : null,
      facility: facility ? { id: facility.id, name: facility.name, code: facility.code } : null,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/access/attempts/mine — a student's own scan history
router.get('/attempts/mine', async (req, res) => {
  if (req.user.role !== 'student') return res.json([]);
  try {
    const { rows } = await pool.query(`
      SELECT aa.*, f.name AS facility_name, f.code AS facility_code, c.card_number
      FROM access_attempts aa
      LEFT JOIN facilities f ON f.id = aa.facility_id
      LEFT JOIN cards c ON c.id = aa.card_id
      WHERE c.student_id = $1 ORDER BY aa.scanned_at DESC LIMIT 100`, [req.user.profileId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/access/attempts
router.get('/attempts', requireRole('admin', 'validator'), async (req, res) => {
  try {
    const values = [];
    const conditions = [];
    const { result, facility_id, credential_ref, from, to } = req.query;
    if (result) { values.push(result); conditions.push(`aa.result = $${values.length}`); }
    if (facility_id) { values.push(Number(facility_id)); conditions.push(`aa.facility_id = $${values.length}`); }
    if (credential_ref) { values.push(`%${credential_ref}%`); conditions.push(`aa.credential_ref ILIKE $${values.length}`); }
    if (from) { values.push(from); conditions.push(`aa.scanned_at::date >= $${values.length}::date`); }
    if (to) { values.push(to); conditions.push(`aa.scanned_at::date <= $${values.length}::date`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT aa.*, f.name AS facility_name, f.code AS facility_code,
             c.card_number, c.credential_ref AS current_credential_ref,
             sp.student_number, sp.first_name, sp.last_name,
             u.email AS scanned_by_email
      FROM access_attempts aa
      LEFT JOIN facilities f ON f.id = aa.facility_id
      LEFT JOIN cards c ON c.id = aa.card_id
      LEFT JOIN student_profiles sp ON sp.id = c.student_id
      LEFT JOIN users u ON u.id = aa.scanned_by
      ${where}
      ORDER BY aa.scanned_at DESC LIMIT 300`, values);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;
