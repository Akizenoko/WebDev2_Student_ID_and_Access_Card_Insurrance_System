import express from 'express';
import { db, nextId } from '../data/store.js';
import { populateApplication } from './applications.js';

const router = express.Router();

router.get('/', (req, res) => {
  const list = db.reissuanceRequests.map(r => {
    const card = db.cards.find(c => c.id === r.original_card_id);
    const app = db.applications.find(a => a.id === r.application_id);
    const student = app ? db.studentProfiles.find(s => s.id === app.student_id) : null;
    return {
      ...r,
      card,
      application: app ? populateApplication(app) : null,
      student,
    };
  });
  res.json(list);
});

router.post('/', (req, res) => {
  const {
    student_id,
    original_card_id,
    reason,
    fee_amount = 150.00,
    photo_file_id,
    user_id
  } = req.body;

  if (!student_id || !original_card_id || !reason) {
    return res.status(400).json({ message: 'student_id, original_card_id, and reason are required' });
  }

  const originalCard = db.cards.find(c => c.id === Number(original_card_id));
  if (!originalCard) {
    return res.status(404).json({ message: 'Original card not found' });
  }

  if (reason.toLowerCase().includes('lost') || reason.toLowerCase().includes('stolen')) {
    originalCard.status = 'lost';
  } else {
    originalCard.status = 'damaged';
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const appId = nextId();
  const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;

  const newApp = {
    id: appId,
    application_no: appNo,
    student_id: Number(student_id),
    assigned_to: 1,
    photo_file_id: photo_file_id ? Number(photo_file_id) : null,
    type: 'Replacement',
    status: 'submitted',
    submitted_at: now,
  };
  db.applications.push(newApp);

  const reissuanceRecord = {
    id: nextId(),
    original_card_id: Number(original_card_id),
    application_id: appId,
    reason,
    fee_amount: Number(fee_amount) || 150.00,
  };
  db.reissuanceRequests.push(reissuanceRecord);

  const historyRecord = {
    id: nextId(),
    application_id: appId,
    from_status: null,
    to_status: 'submitted',
    changed_by: Number(user_id) || 1,
    changed_at: now,
  };
  db.statusHistory.push(historyRecord);

  res.status(201).json({
    reissuance: reissuanceRecord,
    application: populateApplication(newApp),
    card: originalCard,
  });
});

export default router;
