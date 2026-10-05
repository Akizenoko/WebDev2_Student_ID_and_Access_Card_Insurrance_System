import express from 'express';
import { db, nextId } from '../data/store.js';

const router = express.Router();

router.post('/upload', (req, res) => {
  const { uploaded_by, kind = 'id_photo', storage_path, media_type = 'image/png' } = req.body;

  if (!storage_path) {
    return res.status(400).json({ message: 'File storage path or data URL is required' });
  }

  const fileRecord = {
    id: nextId(),
    uploaded_by: Number(uploaded_by) || null,
    kind,
    storage_path,
    media_type,
  };

  db.uploadedFiles.push(fileRecord);
  res.status(201).json(fileRecord);
});

router.get('/:id', (req, res) => {
  const file = db.uploadedFiles.find(f => f.id === Number(req.params.id));
  if (!file) return res.status(404).json({ message: 'File not found' });
  res.json(file);
});

export default router;
