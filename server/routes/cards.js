import express from 'express';
import { db } from '../data/store.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { student_id } = req.query;

  let results = db.cards.map(c => {
    const student = db.studentProfiles.find(s => s.id === c.student_id);
    const app = db.applications.find(a => a.id === c.application_id);
    const photo = app?.photo_file_id ? db.uploadedFiles.find(f => f.id === app.photo_file_id) : null;
    return {
      ...c,
      student,
      application: app,
      photo,
    };
  });

  if (student_id) {
    results = results.filter(c => c.student_id === Number(student_id));
  }

  res.json(results);
});

router.get('/:id', (req, res) => {
  const card = db.cards.find(c => c.id === Number(req.params.id));
  if (!card) return res.status(404).json({ message: 'Card not found' });

  const student = db.studentProfiles.find(s => s.id === card.student_id);
  const app = db.applications.find(a => a.id === card.application_id);
  const photo = app?.photo_file_id ? db.uploadedFiles.find(f => f.id === app.photo_file_id) : null;

  res.json({
    ...card,
    student,
    application: app,
    photo,
  });
});

export default router;
