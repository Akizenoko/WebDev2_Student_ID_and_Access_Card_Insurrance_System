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
         sp.first_name, sp.middle_name, sp.last_name, sp.student_number,
         a.application_no, a.status AS application_status, a.type
       FROM reissuance_requests rr
       LEFT JOIN cards c              ON c.id  = rr.original_card_id
       LEFT JOIN applications a       ON a.id  = rr.application_id
       LEFT JOIN student_profiles sp  ON sp.id = a.student_id
       ${req.user.role === 'student' ? 'WHERE a.student_id = $1' : ''}
       ORDER BY rr.created_at DESC`,
      req.user.role === 'student' ? [req.user.profileId] : []
    );
    res.json(rows.map(r => ({
      id:               r.id,
      original_card_id: r.original_card_id,
      application_id:   r.application_id,
      reason:           r.reason,
      fee_amount:       r.fee_amount,
      status:           r.status,
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

    // verify card exists
        const cardRes = await client.query(
      'SELECT * FROM cards WHERE id = $1 AND student_id = $2',
      [Number(original_card_id), Number(student_id)]
    );

    // mark old card as lost or damaged
    const newCardStatus = reason.toLowerCase().includes('lost') || reason.toLowerCase().includes('stolen')
      ? 'lost' : 'damaged';
    await client.query('UPDATE cards SET status = $1 WHERE id = $2', [newCardStatus, Number(original_card_id)]);

    // get default admin
    const adminRes = await client.query('SELECT id FROM admin_profiles LIMIT 1');
    const assignedTo = adminRes.rows[0]?.id || null;

    const year = new Date().getFullYear();

    // create replacement application
    const appRes = await client.query(
      `INSERT INTO applications (application_no, student_id, assigned_to, photo_file_id, type, status)
       VALUES ('TEMP', $1, $2, $3, 'Replacement', 'submitted') RETURNING id`,
      [Number(student_id), assignedTo, photo_file_id ? Number(photo_file_id) : null]
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
      [appId, Number(user_id) || req.user?.id || 1]
    );

    await client.query('COMMIT');

    res.status(201).json({
      reissuance:  rrRes.rows[0],
      application: { id: appId, application_no: appNo, status: 'submitted', type: 'Replacement' },
      card:        { ...cardRes.rows[0], status: newCardStatus },
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
