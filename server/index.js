import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import reissuanceRoutes from './routes/reissuance.js';
import cardsRoutes from './routes/cards.js';
import filesRoutes from './routes/files.js';
import reportsRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import facilityRoutes from './routes/facilities.js';
import accessRoutes from './routes/access.js';
import revalidationRoutes from './routes/revalidation.js';
import { ensureAccessSchema } from './db/accessSchema.js';
import 'dotenv/config';
import { requireAuth } from './middleware/auth.js';
import pool from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/auth', authRoutes);                       //login/register
app.use('/api/applications', requireAuth, applicationRoutes);
app.use('/api/reissuance', requireAuth, reissuanceRoutes);
app.use('/api/cards', requireAuth, cardsRoutes);
app.use('/api/files', requireAuth, filesRoutes);
app.use('/api/facilities', requireAuth, facilityRoutes);
app.use('/api/access', requireAuth, accessRoutes);
app.use('/api/revalidation', requireAuth, revalidationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



async function start() {
  await ensureAccessSchema(pool);
  // Keep existing local databases compatible with the current reissuance flow.
  await pool.query(
    'ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS proof_file_id INT REFERENCES uploaded_files(id)'
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id INT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(40),
      entity_id INT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC)');
  await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS access_status VARCHAR(15) NOT NULL DEFAULT 'inactive' CHECK (access_status IN ('inactive', 'requested', 'active', 'suspended'))");
  await pool.query('ALTER TABLE cards ADD COLUMN IF NOT EXISTS access_activated_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE cards ADD COLUMN IF NOT EXISTS validated_semester VARCHAR(30)');
  await pool.query('ALTER TABLE cards ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS original_card_number VARCHAR(40)');
  await pool.query(`
    UPDATE reissuance_requests rr SET original_card_number = c.card_number
    FROM cards c WHERE rr.original_card_id = c.id AND rr.original_card_number IS NULL
  `);
  await pool.query('ALTER TABLE reissuance_requests ALTER COLUMN original_card_id DROP NOT NULL');
  await pool.query('ALTER TABLE reissuance_requests DROP CONSTRAINT IF EXISTS reissuance_requests_original_card_id_fkey');
  await pool.query(`
    ALTER TABLE reissuance_requests ADD CONSTRAINT reissuance_requests_original_card_id_fkey
    FOREIGN KEY (original_card_id) REFERENCES cards(id) ON DELETE SET NULL
  `);
  await pool.query(`
    UPDATE cards
    SET valid_until = (COALESCE(validated_at::date, issue_date) + INTERVAL '5 months')::date
    WHERE valid_until > (COALESCE(validated_at::date, issue_date) + INTERVAL '5 months')::date
  `);
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
