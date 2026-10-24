import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// POST /api/files/upload
const MAX_BYTES = 2 * 1024 * 1024;                       // 2 MB
const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;
const ALLOWED_KINDS = ['id_photo', 'proof_of_loss'];

// real file signatures ("magic bytes")
const isPng  = (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
const isJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

router.post('/upload', async (req, res) => {
  const { kind = 'id_photo', storage_path, original_name } = req.body;

  if (!ALLOWED_KINDS.includes(kind)) {
    return res.status(400).json({ message: 'Invalid file kind' });
  }

  // must be a PNG/JPEG data URL
  const m = DATA_URL.exec(typeof storage_path === 'string' ? storage_path : '');
  if (!m) return res.status(400).json({ message: 'Only PNG or JPEG images are allowed' });

  const claimedType = m[1];
  const buffer = Buffer.from(m[2], 'base64');

  // size limit
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ message: 'Image too large (max 2 MB)' });
  }

  // the bytes must really be that image type
  const ok = claimedType === 'image/png' ? isPng(buffer) : isJpeg(buffer);
  if (!ok) return res.status(400).json({ message: 'File content does not match its type' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO uploaded_files (uploaded_by, kind, storage_path, media_type, original_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, kind, media_type, original_name, uploaded_at`,
      [
        req.user.id,                                       
        kind,
        storage_path,
        claimedType,                                       
        typeof original_name === 'string' ? original_name.slice(0, 255) : null,
      ]
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
