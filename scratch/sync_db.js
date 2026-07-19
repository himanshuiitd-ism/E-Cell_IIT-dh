const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function syncDb() {
  try {
    console.log('Synchronizing Neon PostgreSQL database site_content with disk HTML files...');

    const freshIndex = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const freshMembers = fs.readFileSync(path.join(__dirname, '..', 'members.html'), 'utf8');

    await pool.query(
      "INSERT INTO site_content (page_path, html) VALUES ('/', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
      [freshIndex]
    );
    console.log("Successfully updated '/' in site_content table.");

    await pool.query(
      "INSERT INTO site_content (page_path, html) VALUES ('/members.html', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
      [freshMembers]
    );
    console.log("Successfully updated '/members.html' in site_content table.");

    // Verify database state
    const res = await pool.query("SELECT page_path, length(html) as len, html FROM site_content");
    res.rows.forEach(r => {
      console.log(`Page: ${r.page_path} | Length: ${r.len} | Contains /tickets.html: ${r.html.includes('/tickets.html')} | Contains admin-go-tickets: ${r.html.includes('admin-go-tickets')} | Contains QUICK LINKS: ${r.html.includes('QUICK LINKS')}`);
    });

  } catch (err) {
    console.error('Error syncing DB:', err);
  } finally {
    process.exit(0);
  }
}

syncDb();
