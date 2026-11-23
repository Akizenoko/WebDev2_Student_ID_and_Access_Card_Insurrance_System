


CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('student', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_number VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  program VARCHAR(100) NOT NULL DEFAULT 'Undecided',
  year_level VARCHAR(20) NOT NULL DEFAULT '1st Year'
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_no VARCHAR(30) UNIQUE NOT NULL,
  office VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id SERIAL PRIMARY KEY,
  uploaded_by INT REFERENCES users(id),
  kind VARCHAR(30) NOT NULL DEFAULT 'id_photo',
  storage_path TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL DEFAULT 'image/png',
  original_name VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A student account is only eligible for processing after its current COR is on file.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS college VARCHAR(150);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS cor_file_id INT REFERENCES uploaded_files(id);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  application_no VARCHAR(30) UNIQUE NOT NULL,
  student_id INT NOT NULL REFERENCES student_profiles(id),
  assigned_to INT REFERENCES admin_profiles(id),
  photo_file_id INT REFERENCES uploaded_files(id),
  type VARCHAR(20) NOT NULL DEFAULT 'New ID'
    CHECK (type IN ('New ID', 'Access Card', 'Replacement', 'Renewal')),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'processing', 'ready', 'released', 'rejected')),
  remarks TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES student_profiles(id),
  application_id INT UNIQUE REFERENCES applications(id),
  card_number VARCHAR(40) UNIQUE NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'lost', 'damaged', 'expired')),
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL
);

-- The university ID is the credential. Building access is activated separately by staff.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS access_status VARCHAR(15) NOT NULL DEFAULT 'inactive'
  CHECK (access_status IN ('inactive', 'requested', 'active', 'suspended'));
ALTER TABLE cards ADD COLUMN IF NOT EXISTS access_activated_at TIMESTAMPTZ;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS validated_semester VARCHAR(30);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS rfid_uid VARCHAR(40) UNIQUE;
UPDATE cards
  SET valid_until = (COALESCE(validated_at::date, issue_date) + INTERVAL '5 months')::date
  WHERE valid_until > (COALESCE(validated_at::date, issue_date) + INTERVAL '5 months')::date;

CREATE TABLE IF NOT EXISTS reissuance_requests (
  id SERIAL PRIMARY KEY,
  original_card_id INT REFERENCES cards(id) ON DELETE SET NULL,
  original_card_number VARCHAR(40),
  application_id INT UNIQUE NOT NULL REFERENCES applications(id),
  reason TEXT NOT NULL,
  fee_amount NUMERIC(8,2) NOT NULL DEFAULT 150.00,
  status VARCHAR(15) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A loss/damage report is kept with the request for staff confirmation.
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS proof_file_id INT REFERENCES uploaded_files(id);
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS original_card_number VARCHAR(40);
UPDATE reissuance_requests rr SET original_card_number = c.card_number
  FROM cards c WHERE rr.original_card_id = c.id AND rr.original_card_number IS NULL;
ALTER TABLE reissuance_requests ALTER COLUMN original_card_id DROP NOT NULL;
ALTER TABLE reissuance_requests DROP CONSTRAINT IF EXISTS reissuance_requests_original_card_id_fkey;
ALTER TABLE reissuance_requests ADD CONSTRAINT reissuance_requests_original_card_id_fkey
  FOREIGN KEY (original_card_id) REFERENCES cards(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by INT NOT NULL REFERENCES users(id),
  remarks TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INT REFERENCES applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS card_id INT REFERENCES cards(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40),
  entity_id INT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- Validators are staff accounts restricted to identity/photo/access validation work.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'admin', 'validator'));

CREATE INDEX IF NOT EXISTS idx_applications_queue
  ON applications (status, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- Assurance, reassurance and access-control module
-- ---------------------------------------------------------------------------

-- Staff can return an application for correction without losing its history.
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN (
  'submitted', 'processing', 'ready', 'released', 'rejected', 'needs_correction'
));

-- The electronic credential must never be the student number.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS credential_ref VARCHAR(40) UNIQUE;
UPDATE cards SET credential_ref = 'CRD-' || UPPER(SUBSTRING(MD5(RANDOM()::text || id::text) FROM 1 FOR 12))
  WHERE credential_ref IS NULL;

-- Preserve the full physical and electronic lifecycle, including revoked.
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_status_check;
ALTER TABLE cards ADD CONSTRAINT cards_status_check CHECK (status IN (
  'pending_production', 'ready_for_release', 'issued', 'active', 'lost',
  'damaged', 'replaced', 'expired', 'suspended', 'revoked'
));
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_access_status_check;
ALTER TABLE cards ADD CONSTRAINT cards_access_status_check CHECK (access_status IN (
  'unregistered', 'registered', 'requested', 'pending_activation', 'active',
  'suspended', 'inactive', 'revoked'
));

CREATE TABLE IF NOT EXISTS facilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL UNIQUE,
  location VARCHAR(160),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A small default set keeps the simulated access desk usable out of the box.
INSERT INTO facilities (name, code, location, description) VALUES
  ('Main Gate', 'GATE-MAIN', 'Main entrance', 'Campus entrance control'),
  ('University Library', 'LIB-MAIN', 'Library building', 'Library reading and borrowing areas'),
  ('Registrar Office', 'REG-OFFICE', 'Administration building', 'Student records and ID services'),
  ('Science Laboratory', 'LAB-SCI', 'Science building', 'Controlled laboratory access')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS card_permissions (
  id SERIAL PRIMARY KEY,
  card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  facility_id INT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, facility_id)
);
CREATE INDEX IF NOT EXISTS idx_card_permissions_card ON card_permissions (card_id);

CREATE TABLE IF NOT EXISTS access_attempts (
  id BIGSERIAL PRIMARY KEY,
  card_id INT REFERENCES cards(id) ON DELETE SET NULL,
  facility_id INT REFERENCES facilities(id) ON DELETE SET NULL,
  credential_ref VARCHAR(40),
  facility_code VARCHAR(30),
  result VARCHAR(10) NOT NULL CHECK (result IN ('granted', 'denied')),
  reason TEXT,
  scanned_by INT REFERENCES users(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_access_attempts_time ON access_attempts (scanned_at DESC);

CREATE TABLE IF NOT EXISTS card_status_history (
  id BIGSERIAL PRIMARY KEY,
  card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_status VARCHAR(25),
  to_status VARCHAR(25),
  from_access_status VARCHAR(25),
  to_access_status VARCHAR(25),
  changed_by INT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_card_status_history_card ON card_status_history (card_id, changed_at DESC);

-- Structured lost-ID report data attached to the existing reissuance request.
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS date_lost DATE;
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS circumstances TEXT;
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS payment_file_id INT REFERENCES uploaded_files(id);
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verified_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE reissuance_requests ADD COLUMN IF NOT EXISTS verification_remarks TEXT;

-- Semester reassurance / revalidation records.
CREATE TABLE IF NOT EXISTS revalidations (
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
);
CREATE INDEX IF NOT EXISTS idx_revalidations_status ON revalidations (status, semester);
