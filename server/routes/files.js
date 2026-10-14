import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// POST /api/files/upload
router.post('/upload', async (req, res) => {
  const { uploaded_by, kind = 'id_photo', storage_path, media_type = 'image/png', original_name } = req.body;

  if (!storage_path) {
    return res.status(400).json({ message: 'File storage path or data URL is required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO uploaded_files (uploaded_by, kind, storage_path, media_type, original_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uploaded_by ? Number(uploaded_by) : null, kind, storage_path, media_type, original_name || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/files/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM uploaded_files WHERE id = $1',
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'File not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
