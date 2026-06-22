CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  image_url TEXT,
  section TEXT,
  display_order INTEGER DEFAULT 0,
  instagram TEXT,
  facebook TEXT,
  twitter TEXT,
  linkedin TEXT,
  reddit TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content (
  id SERIAL PRIMARY KEY,
  page_path TEXT NOT NULL UNIQUE,
  html TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial members if the table is empty
INSERT INTO members (name, role, image_url, section, display_order)
SELECT 'Aarav Mehta', 'Overall Coordinator', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', 'team', 0
WHERE NOT EXISTS (SELECT 1 FROM members WHERE name = 'Aarav Mehta');

INSERT INTO members (name, role, image_url, section, display_order)
SELECT 'Ananya Sharma', 'Head of Operations', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', 'team', 1
WHERE NOT EXISTS (SELECT 1 FROM members WHERE name = 'Ananya Sharma');

INSERT INTO members (name, role, image_url, section, display_order)
SELECT 'Kabir Singh', 'Marketing Lead', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', 'team', 2
WHERE NOT EXISTS (SELECT 1 FROM members WHERE name = 'Kabir Singh');
