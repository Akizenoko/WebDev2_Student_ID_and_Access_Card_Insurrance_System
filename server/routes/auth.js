import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const signToken = (user) =>
    jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });

async function getFullUser(userId) {
    const { rows } = await pool.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1', [userId]
    );
    const user = rows[0];
    if (!user) return null;

    const table = user.role === 'student' ? 'student_profiles' : 'admin_profiles';
    const p = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [user.id]);

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        profile: p.rows[0] || null,
    };
}


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

        const full = await getFullUser(user.id);
        res.json({ ...full, token: signToken(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/register', async (req, res) => {
    const { email, password, student_number, first_name, middle_name, last_name, program, year_level } = req.body;

        const required = [email, password, student_number, first_name, last_name];
    const optional = [middle_name, program, year_level];
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
    // wmsu emails only
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@wmsu\.edu\.ph$/.test(cleanEmail)) {
        return res.status(400).json({ message: 'Only @wmsu.edu.ph email addresses can sign up' });
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

    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash(password, 10);
        await client.query('BEGIN');
            
            //roles are hardcoded for the student 
        const u = await client.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id, role`,
            [cleanEmail.trim().toLowerCase(), hash]
        );
        await client.query(
            `INSERT INTO student_profiles (user_id, student_number, first_name, middle_name, last_name, program, year_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [u.rows[0].id, cleanStudentNo, first_name.trim(), cleanMiddle, last_name.trim(), program || 'Undecided', year_level || '1st Year']
        );
        await client.query('COMMIT');

        const full = await getFullUser(u.rows[0].id);
        res.status(201).json({ ...full, token: signToken(u.rows[0]) });
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

router.get('/me', requireAuth, async (req, res) => {
    const user = await getFullUser(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

export default router;