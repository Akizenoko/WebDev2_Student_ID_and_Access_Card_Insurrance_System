import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // look the user up in the DB so role and active status can't be faked
    const { rows } = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // find the student/admin profile id (this is what applications.student_id uses)
    const table = user.role === 'student' ? 'student_profiles' : 'admin_profiles';
    const p = await pool.query(`SELECT id FROM ${table} WHERE user_id = $1`, [user.id]);

    req.user = { id: user.id, role: user.role, profileId: p.rows[0]?.id ?? null };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'Forbidden' });