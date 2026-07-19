const pool = require('../db');

async function check() {
  try {
    const res = await pool.query("SELECT page_path, html FROM site_content WHERE page_path = '/'");
    if (res.rows.length > 0) {
      const html = res.rows[0].html;
      console.log('DB HTML Length:', html.length);
      console.log('Contains admin-go-tickets:', html.includes('admin-go-tickets'));
      console.log('Contains /tickets.html:', html.includes('/tickets.html'));
      console.log('Contains Tickets nav link:', html.includes('>Tickets</a>'));
      
      const navIdx = html.indexOf('<nav class="site-nav');
      if (navIdx !== -1) {
        console.log('--- NAV BAR IN DB ---');
        console.log(html.substring(navIdx, navIdx + 600));
      }

      const footerIdx = html.indexOf('<footer');
      if (footerIdx !== -1) {
        console.log('--- FOOTER IN DB ---');
        console.log(html.substring(footerIdx, footerIdx + 600));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
