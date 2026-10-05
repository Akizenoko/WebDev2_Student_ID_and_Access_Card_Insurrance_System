CREATE DATABASE StudentIdSystem;


/*
vscode terminal command to create the tables and access them within terminal
psql -U postgres -d StudentIdSystem -f server/sql/database.sql
*/
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  student_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  student_number VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  course VARCHAR(100),
  year_level INT
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  admin_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  employee_number VARCHAR(30) UNIQUE NOT NULL,
  office VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS applications (
  application_id SERIAL PRIMARY KEY,
  application_number VARCHAR(30) UNIQUE NOT NULL,
  student_id INT NOT NULL REFERENCES student_profiles(student_id),
  handled_by INT REFERENCES admin_profiles(admin_id),
  type VARCHAR(10) NOT NULL DEFAULT 'new' CHECK (type IN ('new', 'reissue')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'released')),
  remarks TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS uploaded_files (
  file_id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('photo', 'requirement')),
  file_path TEXT NOT NULL,
  original_name VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  card_id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES student_profiles(student_id),
  application_id INT UNIQUE REFERENCES applications(application_id),
  card_number VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'lost', 'expired')),
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at DATE
);

CREATE TABLE IF NOT EXISTS reissuance_requests (
  request_id SERIAL PRIMARY KEY,
  card_id INT NOT NULL REFERENCES cards(card_id),
  new_application_id INT UNIQUE REFERENCES applications(application_id),
  reason TEXT NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_history (
  history_id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by INT REFERENCES users(user_id),
  remarks TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);