import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// GET /api/reissuance
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         rr.*,
         c.card_number, c.status AS card_status,
         CASE
           WHEN orig_a.type = 'Access Card' THEN 'Access Card'
           ELSE 'Student ID'
         END AS original_card_type,
         sp.first_name, sp.middle_name, sp.last_name, sp.student_number,
         a.application_no, a.status AS application_status, a.type,
         COALESCE(
           CASE
             WHEN a.status = 'released' THEN 'released'
             WHEN a.status = 'rejected' THEN 'rejected'
             WHEN a.status = 'processing' THEN 'processing'
             ELSE rr.status
           END, 'pending'
         ) AS display_status
       FROM reissuance_requests rr
       LEFT JOIN cards c              ON c.id  = rr.original_card_id
       LEFT JOIN applications orig_a  ON orig_a.id = c.application_id
       LEFT JOIN applications a       ON a.id  = rr.application_id
       LEFT JOIN student_profiles sp  ON sp.id = a.student_id
       ${req.user.role === 'student' ? 'WHERE a.student_id = $1' : ''}
       ORDER BY rr.created_at DESC`,
      req.user.role === 'student' ? [req.user.profileId] : []
    );
    res.json(rows.map(r => ({
      id:               r.id,
      original_card_id: r.original_card_id,
      original_card_type: r.original_card_type,
      application_id:   r.application_id,
      reason:           r.reason,
      fee_amount:       r.fee_amount,
      status:           r.display_status || r.status,
      created_at:       r.created_at,
      card: {
        card_number: r.card_number,
        status:      r.card_status,
      },
      student: {
        first_name:     r.first_name,
        middle_name:    r.middle_name,
        last_name:      r.last_name,
        student_number: r.student_number,
      },
      application: {
        application_no: r.application_no,
        status:         r.application_status,
        type:           r.type,
      },
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reissuance
router.post('/', async (req, res) => {
    const { original_card_id, reason, photo_file_id } = req.body;
  const fee_amount = 150.00; 
  const student_id = req.user.role === 'student' ? req.user.profileId : req.body.student_id;

  if (!student_id || !original_card_id || !reason) {
    return res.status(400).json({ message: 'student_id, original_card_id, and reason are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify card exists and belongs to this student, and determine if it's an Access Card or Student ID
    const cardRes = await client.query(
      `SELECT
         c.*,
         CASE
           WHEN a.type = 'Access Card' THEN true
           WHEN orig_a.type = 'Access Card' THEN true
           ELSE false
         END AS is_access_card
       FROM cards c
       LEFT JOIN applications a ON a.id = c.application_id
       LEFT JOIN reissuance_requests rr ON rr.application_id = a.id
       LEFT JOIN cards orig_c ON orig_c.id = rr.original_card_id
       LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
       WHERE c.id = $1 AND c.student_id = $2`,
      [Number(original_card_id), Number(student_id)]
    );

    if (!cardRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Original card not found' });
    }

    const card = cardRes.rows[0];
    const isAccessCard = Boolean(card.is_access_card);

    // 2. Check if this specific card already has an in-progress reissuance request
    const pendingCardReissueRes = await client.query(
      `SELECT rr.id, a.application_no
       FROM reissuance_requests rr
       JOIN applications a ON a.id = rr.application_id
       WHERE rr.original_card_id = $1 AND a.status IN ('submitted', 'processing', 'ready')
       LIMIT 1`,
      [Number(original_card_id)]
    );

    if (pendingCardReissueRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: `This ${isAccessCard ? 'Access Card' : 'ID Card'} already has a pending reissuance request in progress.`
      });
    }

    // 3. One-at-a-time enforcement per card category:
    // If reissuing an Access Card, check if there is an active Access Card reissue
    // If reissuing an ID Card, check if there is an active ID Card reissue (or Renewal)
    const activeReissuesRes = await client.query(
      `SELECT a.id, a.application_no, a.status, a.type,
         CASE
           WHEN orig_a.type = 'Access Card' THEN true
           ELSE false
         END AS is_access_reissue
       FROM applications a
       JOIN reissuance_requests rr ON rr.application_id = a.id
       JOIN cards orig_c ON orig_c.id = rr.original_card_id
       LEFT JOIN applications orig_a ON orig_a.id = orig_c.application_id
       WHERE a.student_id = $1 AND a.status IN ('submitted', 'processing', 'ready')`,
      [Number(student_id)]
    );

    const hasActiveSameType = activeReissuesRes.rows.some(
      r => Boolean(r.is_access_reissue) === isAccessCard
    );

    if (hasActiveSameType) {
      await client.query('ROLLBACK');
      const activeApp = activeReissuesRes.rows.find(r => Boolean(r.is_access_reissue) === isAccessCard);
      return res.status(409).json({
        message: `You already have an active reissue request in progress for your ${isAccessCard ? 'Access Card' : 'Student ID'} (${activeApp?.application_no} - ${activeApp?.status?.toUpperCase()}). Reissue requests for ${isAccessCard ? 'Access Cards' : 'ID Cards'} must be processed one at a time.`
      });
    }

    // For Student ID, also check for any direct in-progress Renewal application
    if (!isAccessCard) {
      const activeRenewalRes = await client.query(
        `SELECT id, application_no, status FROM applications
         WHERE student_id = $1 AND type = 'Renewal' AND status IN ('submitted', 'processing', 'ready')
         LIMIT 1`,
        [Number(student_id)]
      );
      if (activeRenewalRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: `You already have an ID Card Renewal in progress (${activeRenewalRes.rows[0].application_no}). You cannot submit another ID reissue until it is completed.`
        });
      }
    }

    // Check reason and old card status
    const isRenew = reason.toLowerCase().includes('renew') || reason.toLowerCase().includes('validation') || reason.toLowerCase().includes('expired');
    const isShift = reason.toLowerCase().includes('shift') || reason.toLowerCase().includes('transfer');

    if (isRenew) {
      const validUntil = card.valid_until ? new Date(card.valid_until) : null;
      const isOver = card.status === 'expired' || (validUntil && !isNaN(validUntil.getTime()) && validUntil.getTime() < Date.now());
      if (!isOver) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'You can only renew a card once the valid until date is over.' });
      }
    } else if (card.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Card is already marked as ${card.status}. You can only submit a reissue request for an active card.`
      });
    }

    const newCardStatus = reason.toLowerCase().includes('lost') || reason.toLowerCase().includes('stolen')
      ? 'lost'
      : isRenew || isShift
        ? 'expired'
        : 'damaged';
    await client.query('UPDATE cards SET status = $1 WHERE id = $2', [newCardStatus, Number(original_card_id)]);

    // get default admin
    const adminRes = await client.query('SELECT id FROM admin_profiles LIMIT 1');
    const assignedTo = adminRes.rows[0]?.id || null;

    const year = new Date().getFullYear();

    // create replacement or renewal application
    const appType = isRenew ? 'Renewal' : 'Replacement';
    const appRes = await client.query(
      `INSERT INTO applications (application_no, student_id, assigned_to, photo_file_id, type, status)
       VALUES ('TEMP', $1, $2, $3, $4, 'submitted') RETURNING id`,
      [Number(student_id), assignedTo, photo_file_id ? Number(photo_file_id) : null, appType]
    );
    const appId = appRes.rows[0].id;
    const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;
    await client.query('UPDATE applications SET application_no = $1 WHERE id = $2', [appNo, appId]);

    // create reissuance record
    const rrRes = await client.query(
      `INSERT INTO reissuance_requests (original_card_id, application_id, reason, fee_amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [Number(original_card_id), appId, reason, Number(fee_amount) || 150.00]
    );

    // status history
    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'submitted', $2)`,
      [appId, req.user?.id || 1]
    );

    await client.query('COMMIT');

    res.status(201).json({
      reissuance:  rrRes.rows[0],
      application: { id: appId, application_no: appNo, status: 'submitted', type: appType },
      card:        { ...card, status: newCardStatus },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
