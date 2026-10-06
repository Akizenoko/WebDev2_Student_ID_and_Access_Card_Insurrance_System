


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

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  application_no VARCHAR(30) UNIQUE NOT NULL,
  student_id INT NOT NULL REFERENCES student_profiles(id),
  assigned_to INT REFERENCES admin_profiles(id),
  photo_file_id INT REFERENCES uploaded_files(id),
  type VARCHAR(20) NOT NULL DEFAULT 'New ID'
    CHECK (type IN ('New ID', 'Replacement')),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'processing', 'ready', 'released')),
  remarks TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES student_profiles(id),
  application_id INT UNIQUE REFERENCES applications(id),
  card_number VARCHAR(40) UNIQUE NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'lost', 'damaged')),
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS reissuance_requests (
  id SERIAL PRIMARY KEY,
  original_card_id INT NOT NULL REFERENCES cards(id),
  application_id INT UNIQUE NOT NULL REFERENCES applications(id),
  reason TEXT NOT NULL,
  fee_amount NUMERIC(8,2) NOT NULL DEFAULT 150.00,
  status VARCHAR(15) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by INT NOT NULL REFERENCES users(id),
  remarks TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);