import express from 'express';
import { db, nextId } from '../data/store.js';

const router = express.Router();

export const getFullUserProfile = (userId) => {
  const user = db.users.find(u => u.id === Number(userId));
  if (!user) return null;

  let profile = null;
  if (user.role === 'student') {
    profile = db.studentProfiles.find(sp => sp.user_id === user.id) || null;
  } else if (user.role === 'admin') {
    profile = db.adminProfiles.find(ap => ap.user_id === user.id) || null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    profile,
  };
};

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // If password is 'admin123', allow access to admin role using the same email/gmail
  if (password === 'admin123') {
    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      const newUserId = nextId();
      user = {
        id: newUserId,
        email: email.trim(),
        password: 'admin123',
        role: 'admin',
        isActive: true,
      };
      db.users.push(user);
    }

    let adminProfile = db.adminProfiles.find(ap => ap.user_id === user.id);
    if (!adminProfile) {
      adminProfile = {
        id: nextId(),
        user_id: user.id,
        employee_no: `EMP-${user.id.toString().padStart(4, '0')}`,
        office: 'Office of the University Registrar',
      };
      db.adminProfiles.push(adminProfile);
    }

    return res.json({
      id: user.id,
      email: user.email,
      role: 'admin',
      isActive: true,
      profile: adminProfile,
    });
  }

  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Account is deactivated' });
  }

  const fullUser = getFullUserProfile(user.id);
  res.json(fullUser);
});

router.post('/register', (req, res) => {
  const { email, password, student_number, first_name, last_name, program, year_level } = req.body;

  if (!email || !password || !student_number || !first_name || !last_name) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  if (db.users.some(u => u.email === email)) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const newUserId = nextId();
  const newUser = {
    id: newUserId,
    email,
    password,
    role: 'student',
    isActive: true,
  };
  db.users.push(newUser);

  const newProfileId = nextId();
  const newProfile = {
    id: newProfileId,
    user_id: newUserId,
    student_number,
    first_name,
    last_name,
    program: program || 'Undecided',
    year_level: year_level || '1st Year',
  };
  db.studentProfiles.push(newProfile);

  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    isActive: newUser.isActive,
    profile: newProfile,
  });
});

router.get('/users', (req, res) => {
  const list = db.users.map(u => getFullUserProfile(u.id));
  res.json(list);
});

router.get('/me/:id', (req, res) => {
  const user = getFullUserProfile(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

export default router;
