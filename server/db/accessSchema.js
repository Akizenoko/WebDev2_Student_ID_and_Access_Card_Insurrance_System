// Runtime upgrades for the assurance / access-control module.
// schema.sql is the canonical definition for fresh databases; these statements
// keep an existing local database compatible on startup.
export async function ensureAccessSchema(pool) {
  const statements = [
    `ALTER TABLE applications DROP COLUMN IF EXISTS pickup_notice_at`,
    `ALTER TABLE applications DROP COLUMN IF EXISTS pickup_code`,
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS card_id INT REFERENCES cards(id) ON DELETE CASCADE`,
    `ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check`,
    `ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN (
       'submitted', 'processing', 'ready', 'released', 'rejected', 'needs_correction'))`,
    `ALTER TABLE cards ADD COLUMN IF NOT EXISTS credential_ref VARCHAR(40) UNIQUE`,
    `UPDATE cards SET credential_ref = 'CRD-' || UPPER(SUBSTRING(MD5(RANDOM()::text || id::text) FROM 1 FOR 12)) WHERE credential_ref IS NULL`,
    `ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_status_check`,
    `ALTER TABLE cards ADD CONSTRAINT cards_status_check CHECK (status IN (
       'pending_production', 'ready_for_release', 'issued', 'active', 'lost',
       'damaged', 'replaced', 'expired', 'suspended', 'revoked'))`,
    `ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_access_status_check`,
    `ALTER TABLE cards ADD CONSTRAINT cards_access_status_check CHECK (access_status IN (
       'unregistered', 'registered', 'requested', 'pending_activation', 'active',
       'suspended', 'inactive', 'revoked'))`,
    `CREATE TABLE IF NOT EXISTS facilities (
       id SERIAL PRIMARY KEY,
       name VARCHAR(120) NOT NULL UNIQUE,
       code VARCHAR(30) NOT NULL UNIQUE,
       location VARCHAR(160),
       description TEXT,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `INSERT INTO facilities (name, code, location, description) VALUES
       ('Main Gate', 'GATE-MAIN', 'Main entrance', 'Campus entrance control'),
       ('University Library', 'LIB-MAIN', 'Library building', 'Library reading and borrowing areas'),
       ('Registrar Office', 'REG-OFFICE', 'Administration building', 'Student records and ID services'),
       ('Science Laboratory', 'LAB-SCI', 'Science building', 'Controlled laboratory access')
     ON CONFLICT (code) DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS card_permissions (
       id SERIAL PRIMARY KEY,
       card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
       facility_id INT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
       valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
       valid_until DATE,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       granted_by INT REFERENCES users(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (card_id, facility_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_card_permissions_card ON card_permissions (card_id)`,
    `CREATE TABLE IF NOT EXISTS access_attempts (
       id BIGSERIAL PRIMARY KEY,
       card_id INT REFERENCES cards(id) ON DELETE SET NULL,
       facility_id INT REFERENCES facilities(id) ON DELETE SET NULL,
       credential_ref VARCHAR(40),
       facility_code VARCHAR(30),
       result VARCHAR(10) NOT NULL CHECK (result IN ('granted', 'denied')),
       reason TEXT,
       scanned_by INT REFERENCES users(id) ON DELETE SET NULL,
       scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_access_attempts_time ON access_attempts (scanned_at DESC)`,
    `CREATE TABLE IF NOT EXISTS card_status_history (
       id BIGSERIAL PRIMARY KEY,
       card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
       from_status VARCHAR(25),
       to_status VARCHAR(25),
       from_access_status VARCHAR(25),
       to_access_status VARCHAR(25),
       changed_by INT REFERENCES users(id) ON DELETE SET NULL,
       reason TEXT,
       changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_card_status_history_card ON card_status_history (card_id, changed_at DESC)`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS proof_file_id INT REFERENCES uploaded_files(id)`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS original_card_number VARCHAR(40)`,
    `UPDATE reissuance_requests rr SET original_card_number = c.card_number
       FROM cards c WHERE rr.original_card_id = c.id AND rr.original_card_number IS NULL`,
    `ALTER TABLE reissuance_requests ALTER COLUMN original_card_id DROP NOT NULL`,
    `ALTER TABLE reissuance_requests DROP CONSTRAINT IF EXISTS reissuance_requests_original_card_id_fkey`,
    `ALTER TABLE reissuance_requests ADD CONSTRAINT reissuance_requests_original_card_id_fkey
       FOREIGN KEY (original_card_id) REFERENCES cards(id) ON DELETE SET NULL`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS date_lost DATE`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS circumstances TEXT`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS payment_file_id INT REFERENCES uploaded_files(id)`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verified_by INT REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
    `ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verification_remarks TEXT`,
    `CREATE TABLE IF NOT EXISTS revalidations (
       id SERIAL PRIMARY KEY,
       student_id INT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
       semester VARCHAR(30) NOT NULL,
       cor_file_id INT REFERENCES uploaded_files(id),
       status VARCHAR(20) NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending', 'verified', 'for_review', 'ineligible')),
       remarks TEXT,
       reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
       reviewed_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (student_id, semester)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_revalidations_status ON revalidations (status, semester)`,
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }
}
