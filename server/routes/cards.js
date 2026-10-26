import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// GET /api/cards?student_id=X
router.get('/', async (req, res) => {
  try {
    const { student_id } = req.query;
    const conditions = [];
    const values = [];

    if (student_id) {
      values.push(Number(student_id));
      conditions.push(`c.student_id = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         c.*,
         sp.student_number, sp.first_name, sp.middle_name, sp.last_name, sp.program, sp.year_level,
         a.application_no, a.type AS application_type,
         uf.storage_path, uf.media_type
       FROM cards c
       LEFT JOIN student_profiles sp ON sp.id = c.student_id
       LEFT JOIN applications a      ON a.id  = c.application_id
       LEFT JOIN uploaded_files uf   ON uf.id = a.photo_file_id
       ${where}
       ORDER BY c.issue_date DESC`,
      values
    );

    res.json(rows.map(r => ({
      id:             r.id,
      card_number:    r.card_number,
      status:         r.status,
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
         a.application_no, a.type AS application_type,
         uf.storage_path, uf.media_type
       FROM cards c
       LEFT JOIN student_profiles sp ON sp.id = c.student_id
       LEFT JOIN applications a      ON a.id  = c.application_id
       LEFT JOIN uploaded_files uf   ON uf.id = a.photo_file_id
       WHERE c.id = $1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Card not found' });

    const r = rows[0];
    res.json({
      id:             r.id,
      card_number:    r.card_number,
      status:         r.status,
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
