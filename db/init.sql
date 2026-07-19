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

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  features TEXT[], 
  availability TEXT DEFAULT 'available',
  quantity_available INTEGER DEFAULT -1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  college_name TEXT NOT NULL,
  gender TEXT,
  quantity INTEGER DEFAULT 1,
  total_amount INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  order_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW()
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

-- Seed initial tickets if the table is empty
INSERT INTO tickets (name, description, price, features, availability, quantity_available, display_order)
SELECT 'Day 1+ Accommodation', 'Access to all Day 1 events + Accommodation on Day 1', 700, 
  ARRAY['Access to all Day 1 events', 'Keynote & sessions', 'Exam floor access', 'Meals included', 'Hostel stay (Night 1)'], 
  'available', -1, 1
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE name = 'Day 1+ Accommodation');

INSERT INTO tickets (name, description, price, features, availability, quantity_available, display_order)
SELECT 'Both Days Pass', 'Access to all Day 1 & Day 2 events with meals', 800, 
  ARRAY['Access to all Day 1 & Day 2 events', 'Keynote & sessions', 'Exam floor access', 'Refreshments', 'Networking opportunities'], 
  'available', -1, 2
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE name = 'Both Days Pass');

INSERT INTO tickets (name, description, price, features, availability, quantity_available, display_order)
SELECT 'Day 2+ Accommodation', 'Access to all Day 2 events + Accommodation on Day 2', 800, 
  ARRAY['Access to all Day 2 events', 'Keynote & sessions', 'Exam floor access', 'Meals included', 'Hostel stay (Night 2)'], 
  'available', -1, 3
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE name = 'Day 2+ Accommodation');
