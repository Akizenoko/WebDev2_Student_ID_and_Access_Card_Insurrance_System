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
        COUNT(*) FILTER (WHERE to_status = 'rejected')   AS rejected,
        COUNT(*) FILTER (WHERE to_status = 'needs_correction') AS needs_correction
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

// GET /api/reports/summary — assurance / access-control dashboard counts
router.get('/summary', requireRole('admin', 'validator'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM applications WHERE status IN ('submitted','processing','ready') AND deleted_at IS NULL) AS open_applications,
        (SELECT COUNT(*) FROM cards WHERE access_status = 'requested') AS pending_access_requests,
        (SELECT COUNT(*) FROM reissuance_requests WHERE verification_status = 'pending') AS pending_loss_reports,
        (SELECT COUNT(*) FROM revalidations WHERE status = 'pending') AS pending_revalidations,
        (SELECT COUNT(*) FROM revalidations WHERE status = 'for_review') AS revalidations_for_review,
        (SELECT COUNT(*) FROM cards WHERE access_status = 'active') AS active_access_cards,
        (SELECT COUNT(*) FROM cards WHERE access_status IN ('suspended','revoked')) AS blocked_access_cards,
        (SELECT COUNT(*) FROM facilities WHERE is_active = TRUE) AS active_facilities,
        (SELECT COUNT(*) FROM access_attempts WHERE (scanned_at AT TIME ZONE 'Asia/Manila')::date = (NOW() AT TIME ZONE 'Asia/Manila')::date) AS scans_today,
        (SELECT COUNT(*) FROM access_attempts WHERE result = 'denied' AND (scanned_at AT TIME ZONE 'Asia/Manila')::date = (NOW() AT TIME ZONE 'Asia/Manila')::date) AS denied_today`);
    const cards = await pool.query(`SELECT status, COUNT(*)::int AS count FROM cards GROUP BY status ORDER BY status`);
    const revalidations = await pool.query(`SELECT status, COUNT(*)::int AS count FROM revalidations GROUP BY status ORDER BY status`);
    const applications = await pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM applications
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY status`);
    const monthly = await pool.query(`
      SELECT to_char(date_trunc('month', submitted_at) AT TIME ZONE 'Asia/Manila', 'Mon') AS month,
             to_char(date_trunc('month', submitted_at) AT TIME ZONE 'Asia/Manila', 'YYYY-MM') AS sort_key,
             COUNT(*)::int AS count
      FROM applications
      WHERE deleted_at IS NULL AND submitted_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2`);
    const facilities = await pool.query(`
      SELECT COALESCE(f.name, a.facility_code, 'Unassigned') AS label, COUNT(*)::int AS count
      FROM access_attempts a
      LEFT JOIN facilities f ON f.id = a.facility_id
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 6`);
    const out = Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)]));
    res.json({
      ...out,
      card_statuses: cards.rows,
      revalidation_statuses: revalidations.rows,
      application_statuses: applications.rows,
      monthly_applications: monthly.rows,
      facility_scans: facilities.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;