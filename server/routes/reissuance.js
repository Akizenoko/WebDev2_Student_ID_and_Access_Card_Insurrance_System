import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reissuance
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         rr.*,
         c.card_number, c.status AS card_status,
         COALESCE(rr.original_card_number, c.card_number) AS original_card_number,
         CASE
           WHEN orig_a.type = 'Access Card' THEN 'Access Card'
           ELSE 'Student ID'
         END AS original_card_type,
         sp.first_name, sp.middle_name, sp.last_name, sp.student_number,
         a.application_no, a.status AS application_status, a.type,
          uf.storage_path AS payment_path, pf.storage_path AS proof_path,
          verifier.email AS verified_by_email,
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
        LEFT JOIN uploaded_files uf    ON uf.id = rr.payment_file_id
        LEFT JOIN uploaded_files pf    ON pf.id = rr.proof_file_id
        LEFT JOIN users verifier       ON verifier.id = rr.verified_by
       ${req.user.role === 'student' ? 'WHERE a.student_id = $1' : ''}
       ORDER BY rr.created_at DESC`,
      req.user.role === 'student' ? [req.user.profileId] : []
    );
    res.json(rows.map(r => ({
      id:               r.id,
      original_card_id: r.original_card_id,
      original_card_number: r.original_card_number,
      original_card_type: r.original_card_type,
      application_id:   r.application_id,
      reason:           r.reason,
      fee_amount:       r.fee_amount,
      status:           r.display_status || r.status,
      created_at:       r.created_at,
      date_lost:        r.date_lost,
      circumstances:    r.circumstances,
      payment_reference: r.payment_reference,
      payment_path:     r.payment_path,
      proof_path:       r.proof_path,
      verification_status: r.verification_status,
      verified_at:      r.verified_at,
      verified_by_email: r.verified_by_email,
      verification_remarks: r.verification_remarks,
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
    const { original_card_id, reason, proof_file_id, photo_choice = 'new',
      date_lost, circumstances, payment_reference, payment_file_id } = req.body;
  const isLoss = /lost|stolen/i.test(String(reason || ''));
  if (isLoss && !/^\d{4}-\d{2}-\d{2}$/.test(String(date_lost || ''))) {
    return res.status(400).json({ message: 'Provide the date the ID was lost' });
  }
  const fee_amount = 150.00; 
  const student_id = req.user.role === 'student' ? req.user.profileId : req.body.student_id;

  if (!student_id || !original_card_id || !reason || !proof_file_id) {
    return res.status(400).json({ message: 'Card, reason, and the required supporting document are required' });
  }
  if (!['old', 'new'].includes(photo_choice)) return res.status(400).json({ message: 'Choose whether to reuse the current photo or take a new one' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const proof = await client.query(
      `SELECT id FROM uploaded_files WHERE id = $1 AND uploaded_by = $2 AND kind = $3`,
      [Number(proof_file_id), req.user.id, isLoss ? 'affidavit_of_loss' : 'proof_of_loss']
    );
    if (!proof.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: isLoss ? 'Upload an Affidavit of Loss before submitting reissuance' : 'Upload a damage photo before submitting reissuance' });
    }
    if (payment_file_id) {
      const payment = await client.query(
        `SELECT id FROM uploaded_files WHERE id = $1 AND uploaded_by = $2 AND kind = 'payment_receipt'`,
        [Number(payment_file_id), req.user.id]
      );
      if (!payment.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Select a valid payment confirmation upload' });
      }
    }

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
    const originalPhoto = await client.query(
      `SELECT a.photo_file_id FROM cards c JOIN applications a ON a.id = c.application_id WHERE c.id = $1`,
      [Number(original_card_id)]
    );
    if (photo_choice === 'old' && !originalPhoto.rows[0]?.photo_file_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This ID has no saved photo. Choose a new photo captured at UPRESS.' });
    }
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
      [Number(student_id), assignedTo, photo_choice === 'old' ? originalPhoto.rows[0].photo_file_id : null, appType]
    );
    const appId = appRes.rows[0].id;
    const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;
    await client.query('UPDATE applications SET application_no = $1 WHERE id = $2', [appNo, appId]);

    // create reissuance record
    const rrRes = await client.query(
      `INSERT INTO reissuance_requests
         (original_card_id, application_id, reason, fee_amount, proof_file_id,
          date_lost, circumstances, payment_reference, payment_file_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [Number(original_card_id), appId, reason, Number(fee_amount) || 150.00, Number(proof_file_id),
        isLoss ? date_lost : null, circumstances?.trim() || null,
        payment_reference?.trim() || null, payment_file_id ? Number(payment_file_id) : null]
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

// PATCH /api/reissuance/:id/verify — staff confirms a lost-ID report
router.patch('/:id/verify', requireRole('admin', 'validator'), async (req, res) => {
  const id = Number(req.params.id);
  const { decision, remarks } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid report' });
  if (!['verified', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose verify or reject' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT rr.*, a.student_id FROM reissuance_requests rr
       JOIN applications a ON a.id = rr.application_id WHERE rr.id = $1 FOR UPDATE`, [id]);
    const report = current.rows[0];
    if (!report) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Report not found' }); }

    const { rows } = await client.query(`
      UPDATE reissuance_requests SET verification_status = $2::varchar, verified_by = $3,
        verified_at = NOW(),
        status = CASE WHEN $2::varchar = 'verified' THEN 'verified' ELSE 'rejected' END,
        verification_remarks = COALESCE($4, verification_remarks)
      WHERE id = $1 RETURNING *`, [id, decision, req.user.id, remarks?.trim() || null]);

    if (decision === 'verified' && report.original_card_id) {
      const before = await client.query('SELECT id, status, access_status FROM cards WHERE id = $1', [report.original_card_id]);
      if (before.rows.length && before.rows[0].access_status !== 'revoked') {
        await client.query("UPDATE cards SET access_status = 'revoked' WHERE id = $1", [report.original_card_id]);
        await client.query(`
          INSERT INTO card_status_history
            (card_id, from_status, to_status, from_access_status, to_access_status, changed_by, reason)
          VALUES ($1, NULL, NULL, $2, 'revoked', $3, $4)`,
          [report.original_card_id, before.rows[0].access_status, req.user.id,
            `Lost-ID report verified${remarks ? `: ${remarks.trim()}` : ''}`]);
      }
    }
    await client.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'loss_report_verified', 'reissuance', $2, $3::jsonb)`,
      [req.user.id, id, JSON.stringify({ decision, remarks: remarks?.trim() || null })]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ message: 'Server error' }); }
  finally { client.release(); }
});

export default router;
