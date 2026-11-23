import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

import { sendOtpEmail } from '../mailer.js';
const router = express.Router();

const otpSecret = () => process.env.JWT_SECRET + '-otp';

const signToken = (user) =>
    jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });

async function startOtp(userId, email) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await pool.query('UPDATE email_otps SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await pool.query(
    `INSERT INTO email_otps (user_id, code_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
    [userId, await bcrypt.hash(code, 10)]
  );
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
    console.error('OTP email delivery failed in development:', err.message);
    console.log(`[DEV] OTP for ${email}: ${code}`);
  }
  return {
    otpRequired: true,
    challenge: jwt.sign({ uid: userId, purpose: 'otp' }, otpSecret(), { expiresIn: '10m' }),
    email: email.replace(/^(.).*(@.*)$/, '$1***$2'),
  };
}

async function getFullUser(userId) {
    const { rows } = await pool.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1', [userId]
    );
    const user = rows[0];
    if (!user) return null;

    const table = user.role === 'student' ? 'student_profiles' : 'admin_profiles';
    const p = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [user.id]);

    let photoUrl = '/assets/Arle.png';
    if (user.role === 'student' && p.rows[0]) {
        const photoRes = await pool.query(`
            SELECT uf.storage_path
            FROM applications a
            JOIN uploaded_files uf ON uf.id = a.photo_file_id
            WHERE a.student_id = $1
            ORDER BY a.submitted_at DESC
            LIMIT 1
        `, [p.rows[0].id]);
        if (photoRes.rows[0]) {
            photoUrl = photoRes.rows[0].storage_path;
        }
    } else if (user.role === 'admin') {
        photoUrl = '/assets/Arle.png';
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        profile: p.rows[0] ? { ...p.rows[0], photo_url: photoUrl } : null,
    };
}

router.post('/verify-otp', async (req, res) => {
  try {
    const { challenge, code } = req.body;
    if (typeof challenge !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter the 6-digit code' });
    }
    let payload;
    try { payload = jwt.verify(challenge, otpSecret()); }
    catch { return res.status(401).json({ message: 'Verification expired. Please log in again.' }); }
    if (payload.purpose !== 'otp') return res.status(401).json({ message: 'Invalid request' });

    const { rows } = await pool.query(
      `SELECT * FROM email_otps
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`, [payload.uid]);
    const otp = rows[0];
    if (!otp) return res.status(401).json({ message: 'Code expired. Please log in again.' });
    if (otp.attempts >= 5) {
      await pool.query('UPDATE email_otps SET used_at = NOW() WHERE id = $1', [otp.id]);
      return res.status(429).json({ message: 'Too many attempts. Please log in again.' });
    }
    if (!(await bcrypt.compare(code, otp.code_hash))) {
      await pool.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
      return res.status(401).json({ message: 'Incorrect code' });
    }
    await pool.query('UPDATE email_otps SET used_at = NOW() WHERE id = $1', [otp.id]);

    const u = await pool.query('SELECT id, role, is_active FROM users WHERE id = $1', [payload.uid]);
    if (!u.rows[0]?.is_active) return res.status(403).json({ message: 'Account is deactivated' });
    res.json({ ...(await getFullUser(u.rows[0].id)), token: signToken(u.rows[0]) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

                if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Email and password must be text' });
        }
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]
        );
        const user = rows[0];

        //messages for wrong info typed by user 
        const valid = user && await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ message: 'Invalid email or password' });
        if (!user.is_active) return res.status(403).json({ message: 'Account is deactivated' });

        await pool.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
          VALUES ($1, 'login', 'user', $1, jsonb_build_object('email', $2::text, 'role', $3::text))`, [user.id, user.email, user.role]);

        // Email OTP is completed when the account is registered. Existing
        // students and staff sign in directly with their registered email and password.
        res.json({ ...(await getFullUser(user.id)), token: signToken(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/register', async (req, res) => {
    const { email, password, student_number, first_name, middle_name, last_name, program, year_level, college, cor_image } = req.body;

        const required = [email, password, student_number, first_name, last_name];
    const optional = [middle_name, program, year_level, college];
    if (!required.every(v => typeof v === 'string') ||
        optional.some(v => v != null && typeof v !== 'string')) {
        return res.status(400).json({ message: 'All fields must be text' });
    }
    if (password.length > 72) {
        return res.status(400).json({ message: 'Password is too long (max 72 characters)' });
    }

    if (!email || !password || !student_number || !first_name || !last_name) {
        return res.status(400).json({ message: 'All required fields must be provided' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ message: 'Enter a valid email address for OTP verification' });
    }

    // valid id numbers only ex. 2025-12345
    const cleanStudentNo = String(student_number).trim();
    if (!/^\d{4}-\d{5}$/.test(cleanStudentNo)) {
        return res.status(400).json({ message: 'Student number must look like 2026-12345' });
    }

    const cleanMiddle = String(middle_name ?? '').trim() || null;
if (cleanMiddle && cleanMiddle.length > 100) {
    return res.status(400).json({ message: 'Middle name is too long' });
}
    const cleanCollege = String(college ?? '').trim();
    if (!cleanCollege) return res.status(400).json({ message: 'College is required' });
    const corMatch = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(typeof cor_image === 'string' ? cor_image : '');
    if (!corMatch) return res.status(400).json({ message: 'A PNG or JPEG image of your current COR is required' });
    const corBytes = Buffer.from(corMatch[2], 'base64');
    if (corBytes.length === 0 || corBytes.length > 2 * 1024 * 1024) return res.status(413).json({ message: 'COR image must be 2 MB or smaller' });

    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash(password, 10);
        await client.query('BEGIN');
            
            //roles are hardcoded for the student 
        const u = await client.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id, role`,
            [cleanEmail.trim().toLowerCase(), hash]
        );
        const cor = await client.query(
          `INSERT INTO uploaded_files (uploaded_by, kind, storage_path, media_type, original_name)
           VALUES ($1, 'cor', $2, $3, 'COR registration document') RETURNING id`,
          [u.rows[0].id, cor_image, corMatch[1]]
        );
        await client.query(
          `INSERT INTO student_profiles (user_id, student_number, first_name, middle_name, last_name, program, year_level, college, cor_file_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [u.rows[0].id, cleanStudentNo, first_name.trim(), cleanMiddle, last_name.trim(), program || 'Undecided', year_level || '1st Year', cleanCollege, cor.rows[0].id]
        );
        await client.query('COMMIT');

        res.status(201).json(await startOtp(u.rows[0].id, cleanEmail));
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {     //this is unique violations if the user exists then it will like basta di pwede ganun logic na yun
            return res.status(409).json({ message: 'Email or student number is already registered' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Administrators provision validation officers; public registration can only create students.
router.post('/staff', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const { email, password, employee_no, office = 'UPRESS Validation Desk' } = req.body;
  if (![email, password, employee_no].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ message: 'Email, password, and employee number are required' });
  if (password.length < 12 || password.length > 72) return res.status(400).json({ message: 'Staff password must be 12–72 characters' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const user = await pool.query(`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'validator') RETURNING id, email, role`, [email.trim().toLowerCase(), hash]);
    await pool.query('INSERT INTO admin_profiles (user_id, employee_no, office) VALUES ($1, $2, $3)', [user.rows[0].id, employee_no.trim(), office.trim().slice(0, 100)]);
    res.status(201).json(user.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email or employee number is already in use' });
    console.error(err); res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout  — client calls this when ending the session
router.post('/logout', requireAuth, (req, res) => {
    // JWT is stateless; the client must discard its token.
    // This endpoint exists so the client can signal session-end
    // (e.g. via navigator.sendBeacon) and for future token-blocklist support.
    res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req, res) => {
    const user = await getFullUser(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                   sp.id AS student_profile_id, sp.student_number, sp.first_name, sp.middle_name, sp.last_name, sp.program, sp.year_level,
                   ap.id AS admin_profile_id, ap.employee_no, ap.office
            FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN admin_profiles ap   ON ap.user_id = u.id
            ORDER BY u.id ASC
        `);
        res.json(rows.map(r => ({
            id: r.id,
            email: r.email,
            role: r.role,
            isActive: r.is_active,
            createdAt: r.created_at,
            profile: r.role === 'student' ? {
                id: r.student_profile_id,
                student_number: r.student_number,
                first_name: r.first_name,
                middle_name: r.middle_name,
                last_name: r.last_name,
                program: r.program,
                year_level: r.year_level,
            } : {
                id: r.admin_profile_id,
                employee_no: r.employee_no,
                office: r.office,
                photo_url: '/assets/Arle.png',
            }
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.patch('/users/:id/active', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id === req.user.id) return res.status(400).json({ message: 'Invalid account' });
  const active = req.body.active === true;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!active && !reason) return res.status(400).json({ message: 'A reason is required to deactivate an account' });
  if (reason.length > 300) return res.status(400).json({ message: 'Reason must be 300 characters or fewer' });
  try {
    const result = await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, role, is_active', [active, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Account not found' });
    await pool.query('INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, \'user\', $3, $4)', [req.user.id, active ? 'account_activated' : 'account_deactivated', id, JSON.stringify(active ? { targetEmail: result.rows[0].email } : { targetEmail: result.rows[0].email, reason })]);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

router.delete('/users/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const targetId = Number(req.params.id);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!Number.isInteger(targetId) || targetId === req.user.id) {
    return res.status(400).json({ message: 'Invalid account' });
  }
  if (!password) return res.status(400).json({ message: 'Enter your admin password to permanently delete this account' });

  const client = await pool.connect();
  try {
    const admin = await client.query('SELECT password_hash FROM users WHERE id = $1 AND role = $2', [req.user.id, 'admin']);
    if (!admin.rows.length || !(await bcrypt.compare(password, admin.rows[0].password_hash))) {
      return res.status(401).json({ message: 'Admin password is incorrect' });
    }

    await client.query('BEGIN');
    const target = await client.query('SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE', [targetId]);
    if (!target.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Account not found' });
    }
    if (target.rows[0].role !== 'student') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only student accounts can be permanently deleted here' });
    }

    const profile = await client.query('SELECT id FROM student_profiles WHERE user_id = $1', [targetId]);
    const profileId = profile.rows[0]?.id;
    if (profileId) {
      await client.query(
        `DELETE FROM audit_logs
         WHERE actor_id = $1
            OR (entity_type = 'application' AND entity_id IN (SELECT id FROM applications WHERE student_id = $2))
            OR (entity_type = 'card' AND entity_id IN (SELECT id FROM cards WHERE student_id = $2))
            OR (entity_type = 'user' AND entity_id = $1)`,
        [targetId, profileId]
      );
      await client.query('DELETE FROM reissuance_requests rr USING applications a WHERE rr.application_id = a.id AND a.student_id = $1', [profileId]);
      await client.query('DELETE FROM cards WHERE student_id = $1', [profileId]);
      await client.query('DELETE FROM applications WHERE student_id = $1', [profileId]);
      await client.query('DELETE FROM student_profiles WHERE id = $1', [profileId]);
    }
    await client.query('DELETE FROM uploaded_files WHERE uploaded_by = $1', [targetId]);
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'account_permanently_deleted', 'user', $2, $3::jsonb)`,
      [req.user.id, targetId, JSON.stringify({ accountRole: 'student' })]
    );
    await client.query('DELETE FROM users WHERE id = $1', [targetId]);
    await client.query('COMMIT');
    res.json({ ok: true, message: 'Student account and associated records were permanently deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Could not permanently delete the account' });
  } finally {
    client.release();
  }
});

router.get('/audit-logs', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  try {
    const { rows } = await pool.query(`SELECT l.id, l.action, l.entity_type, l.entity_id, l.details, l.created_at, u.email AS actor_email, u.role AS actor_role
      FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;
