import express from 'express';
import { db, nextId } from '../data/store.js';

const router = express.Router();

export const populateApplication = (app) => {
  const student = db.studentProfiles.find(sp => sp.id === app.student_id);
  const studentUser = student ? db.users.find(u => u.id === student.user_id) : null;
  const admin = app.assigned_to ? db.adminProfiles.find(ap => ap.id === app.assigned_to) : null;
  const adminUser = admin ? db.users.find(u => u.id === admin.user_id) : null;
  const photo = app.photo_file_id ? db.uploadedFiles.find(f => f.id === app.photo_file_id) : null;
  const card = db.cards.find(c => c.application_id === app.id);
  const reissuance = db.reissuanceRequests.find(r => r.application_id === app.id);
  
  const history = db.statusHistory
    .filter(h => h.application_id === app.id)
    .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
    .map(h => {
      const changer = db.users.find(u => u.id === h.changed_by);
      return {
        ...h,
        changer_email: changer?.email || 'System',
        changer_role: changer?.role || 'system',
      };
    });

  return {
    ...app,
    student: student ? {
      ...student,
      email: studentUser?.email,
    } : null,
    assignedAdmin: admin ? {
      ...admin,
      email: adminUser?.email,
    } : null,
    photo,
    card,
    reissuance,
    history,
  };
};

router.get('/', (req, res) => {
  const { student_id, status, type, search } = req.query;

  let results = db.applications.map(populateApplication);

  if (student_id) {
    results = results.filter(a => a.student_id === Number(student_id));
  }

  if (status && status !== 'all') {
    results = results.filter(a => a.status.toLowerCase() === status.toLowerCase());
  }

  if (type && type !== 'all') {
    results = results.filter(a => a.type.toLowerCase() === type.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(a => 
      a.application_no.toLowerCase().includes(q) ||
      a.student?.first_name.toLowerCase().includes(q) ||
      a.student?.last_name.toLowerCase().includes(q) ||
      a.student?.student_number.toLowerCase().includes(q) ||
      a.student?.program.toLowerCase().includes(q)
    );
  }

  results.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

  res.json(results);
});

router.get('/:id', (req, res) => {
  const app = db.applications.find(a => a.id === Number(req.params.id));
  if (!app) return res.status(404).json({ message: 'Application not found' });
  res.json(populateApplication(app));
});

router.post('/', (req, res) => {
  const { student_id, photo_file_id, type = 'New ID', user_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: 'student_id is required' });
  }

  const student = db.studentProfiles.find(s => s.id === Number(student_id));
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const appId = nextId();
  const year = new Date().getFullYear();
  const appNo = `APP-${year}-${String(appId).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const newApp = {
    id: appId,
    application_no: appNo,
    student_id: Number(student_id),
    assigned_to: 1,
    photo_file_id: photo_file_id ? Number(photo_file_id) : null,
    type,
    status: 'submitted',
    submitted_at: now,
  };

  db.applications.push(newApp);

  const historyRecord = {
    id: nextId(),
    application_id: appId,
    from_status: null,
    to_status: 'submitted',
    changed_by: Number(user_id) || student.user_id,
    changed_at: now,
  };
  db.statusHistory.push(historyRecord);

  res.status(201).json(populateApplication(newApp));
});

router.patch('/:id/status', (req, res) => {
  const { status, changed_by } = req.body;
  const app = db.applications.find(a => a.id === Number(req.params.id));
  if (!app) return res.status(404).json({ message: 'Application not found' });

  const oldStatus = app.status;
  app.status = status;
  const now = new Date().toISOString();

  const historyEntry = {
    id: nextId(),
    application_id: app.id,
    from_status: oldStatus,
    to_status: status,
    changed_by: Number(changed_by) || 2,
    changed_at: now,
  };
  db.statusHistory.push(historyEntry);

  if (status === 'released') {
    let existingCard = db.cards.find(c => c.application_id === app.id);
    if (!existingCard) {
      const issueDate = new Date();
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 4);

      const student = db.studentProfiles.find(sp => sp.id === app.student_id);
      const studentCode = student?.student_number?.replace('-', '') || 'CRD';

      const newCard = {
        id: nextId(),
        card_number: `WMSU-${new Date().getFullYear()}-${studentCode}-${Math.floor(100 + Math.random() * 900)}`,
        student_id: app.student_id,
        application_id: app.id,
        status: 'active',
        issue_date: issueDate.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
      };
      db.cards.push(newCard);
    }
  }

  res.json(populateApplication(app));
});

router.patch('/:id/assign', (req, res) => {
  const { assigned_to } = req.body;
  const app = db.applications.find(a => a.id === Number(req.params.id));
  if (!app) return res.status(404).json({ message: 'Application not found' });

  app.assigned_to = assigned_to ? Number(assigned_to) : null;
  res.json(populateApplication(app));
});

export default router;
