import express from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';
const router = express.Router();

router.get('/today', requireRole('admin'), async (req, res) => {
  try {
    const day = `(changed_at AT TIME ZONE 'Asia/Manila')::date = (NOW() AT TIME ZONE 'Asia/Manila')::date`;
    const t = await pool.query(`
      SELECT
        to_char(NOW() AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE to_status = 'submitted')  AS submitted,
        COUNT(*) FILTER (WHERE to_status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE to_status = 'ready')      AS ready,
        COUNT(*) FILTER (WHERE to_status = 'released')   AS released,
        COUNT(*) FILTER (WHERE to_status = 'rejected')   AS rejected
      FROM status_history WHERE ${day}`);
    const p = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM applications
          WHERE status IN ('submitted','processing','ready') AND deleted_at IS NULL) AS open_queue,
        (SELECT COUNT(*) FROM cards WHERE access_status = 'requested') AS pending_activations`);
    const n = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'date' ? v : Number(v)]));
    res.json({ ...n(t.rows[0]), ...n(p.rows[0]) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;