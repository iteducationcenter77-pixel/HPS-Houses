-- ============================================
-- HPS House Management System — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Houses Table ──
CREATE TABLE IF NOT EXISTS houses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color_hex VARCHAR(7) NOT NULL,
  logo_url TEXT,
  motto VARCHAR(255),
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Students Table ──
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  class VARCHAR(20) NOT NULL,
  roll_number INTEGER NOT NULL,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  contact_number VARCHAR(15),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class, roll_number)
);

-- ── Competitions Table ──
CREATE TABLE IF NOT EXISTS competitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Other',
  description TEXT,
  competition_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Participation Table ──
CREATE TABLE IF NOT EXISTS participation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  position INTEGER,
  points_earned INTEGER DEFAULT 0,
  remarks TEXT,
  UNIQUE(competition_id, student_id)
);

-- ── Admin Settings Table ──
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  admin_password_hash TEXT NOT NULL,
  school_logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_students_house ON students(house_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(competition_date);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_participation_competition ON participation(competition_id);
CREATE INDEX IF NOT EXISTS idx_participation_student ON participation(student_id);
CREATE INDEX IF NOT EXISTS idx_participation_house ON participation(house_id);

-- ── Row Level Security ──
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read houses" ON houses FOR SELECT USING (true);
CREATE POLICY "Public read students" ON students FOR SELECT USING (true);
CREATE POLICY "Public read competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public read participation" ON participation FOR SELECT USING (true);

-- Admin full access (using anon key for simplicity — password checked in app)
CREATE POLICY "Admin manage houses" ON houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage participation" ON participation FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage settings" ON admin_settings FOR ALL USING (true) WITH CHECK (true);
