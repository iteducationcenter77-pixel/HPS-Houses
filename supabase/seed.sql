-- ============================================
-- HPS House Management System — Seed Data
-- ============================================

-- Insert the 4 houses
INSERT INTO houses (name, color_hex, motto, total_points) VALUES
  ('Orion', '#f0c244', 'Shine Bright Like the Stars', 0),
  ('Titans', '#2ecc71', 'Strength in Unity', 0),
  ('Phoenix', '#e74c3c', 'Rise from the Ashes', 0),
  ('Spartans', '#3498db', 'Courage and Honor', 0)
ON CONFLICT (name) DO NOTHING;

-- Insert default admin (password: admin123 — change after first login)
-- Using simple hash for demo; in production use proper bcrypt
INSERT INTO admin_settings (id, admin_password_hash)
VALUES (1, 'admin123')
ON CONFLICT (id) DO NOTHING;
