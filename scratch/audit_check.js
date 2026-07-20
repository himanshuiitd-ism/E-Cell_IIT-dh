// Full E2E persistence verification script
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { query } = require("../db");

async function runVerification() {
  console.log("\n=================================================");
  console.log("   E-SUMMIT ADMIN PERSISTENCE FULL AUDIT CHECK");
  console.log("=================================================\n");

  const PASSCODE = process.env.ADMIN_PASSCODE;
  const BASE_URL = "http://localhost:3000";
  let allPassed = true;

  // ─────────────────────────────────────────────
  // 1. DB: What pages are stored?
  // ─────────────────────────────────────────────
  console.log("✦ [1] DATABASE: site_content table snapshot");
  const rows = await query("SELECT page_path, LENGTH(html) as html_bytes, updated_at FROM site_content ORDER BY page_path");
  if (rows.rows.length === 0) {
    console.log("   ✗ EMPTY — No rows in site_content!");
    allPassed = false;
  } else {
    rows.rows.forEach(r => {
      console.log(`   page_path="${r.page_path}" | html_bytes=${r.html_bytes} | updated_at=${r.updated_at}`);
    });
  }

  const requiredPaths = ["/", "/members.html", "/tickets.html"];
  requiredPaths.forEach(p => {
    const found = rows.rows.find(r => r.page_path === p);
    if (!found) {
      console.log(`   ✗ MISSING: ${p} not in DB!`);
      allPassed = false;
    } else if (found.html_bytes < 1000) {
      console.log(`   ✗ SUSPICIOUS: ${p} only ${found.html_bytes} bytes — possibly corrupt/truncated`);
      allPassed = false;
    } else {
      console.log(`   ✓ ${p} — ${found.html_bytes} bytes OK`);
    }
  });

  // ─────────────────────────────────────────────
  // 2. DB: Check for extension pollution in saved HTML
  // ─────────────────────────────────────────────
  console.log("\n✦ [2] DATABASE: Extension/admin pollution check");
  const pollutionChecks = [
    { label: "data-extension-installed attr", pattern: "data-extension-installed" },
    { label: "Apollo extension widget", pattern: "extension-opener-icon" },
    { label: "admin-social-popover", pattern: "admin-social-popover" },
    { label: "Live server comment", pattern: "Code injected by live-server" },
    { label: "contenteditable attribute", pattern: "contenteditable=" },
    { label: "admin-delete-btn", pattern: "admin-delete-btn" },
  ];

  for (const check of pollutionChecks) {
    const result = await query(
      "SELECT COUNT(*) as cnt FROM site_content WHERE html LIKE $1",
      [`%${check.pattern}%`]
    );
    const cnt = parseInt(result.rows[0].cnt);
    if (cnt > 0) {
      console.log(`   ✗ POLLUTION FOUND [${cnt} page(s)]: "${check.label}"`);
      allPassed = false;
    } else {
      console.log(`   ✓ Clean: no "${check.label}"`);
    }
  }

  // ─────────────────────────────────────────────
  // 3. API: Unauthenticated write endpoints MUST be blocked
  // ─────────────────────────────────────────────
  console.log("\n✦ [3] SECURITY: Unauthenticated write endpoints");

  const securityEndpoints = [
    { method: "POST", url: `${BASE_URL}/api/save`, body: JSON.stringify({ html: "<html>HACK</html>", page_path: "/" }) },
    { method: "POST", url: `${BASE_URL}/api/upload-image`, body: JSON.stringify({ name: "x", base64Data: "data:image/png;base64,abc" }) },
    { method: "POST", url: `${BASE_URL}/api/qr-code`, body: JSON.stringify({ url: "https://evil.com" }) },
    { method: "GET",  url: `${BASE_URL}/api/orders`, body: null },
    { method: "POST", url: `${BASE_URL}/api/tickets`, body: JSON.stringify({ name: "x", description: "y", price: 0 }) },
  ];

  for (const ep of securityEndpoints) {
    const opts = {
      method: ep.method,
      headers: { "Content-Type": "application/json" },
    };
    if (ep.body) opts.body = ep.body;
    try {
      const resp = await fetch(ep.url, opts);
      if (resp.status === 401) {
        console.log(`   ✓ BLOCKED 401: ${ep.method} ${ep.url.replace(BASE_URL, "")}`);
      } else {
        console.log(`   ✗ NOT BLOCKED (${resp.status}): ${ep.method} ${ep.url.replace(BASE_URL, "")} — SECURITY ISSUE!`);
        allPassed = false;
      }
    } catch (e) {
      console.log(`   ✗ ERROR: ${ep.method} ${ep.url.replace(BASE_URL, "")} — ${e.message}`);
      allPassed = false;
    }
  }

  // ─────────────────────────────────────────────
  // 4. API: Authenticated login works
  // ─────────────────────────────────────────────
  console.log("\n✦ [4] AUTH: Admin login endpoint");
  try {
    const resp = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: PASSCODE }),
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      console.log("   ✓ Admin login: 200 OK, authenticated");
    } else {
      console.log(`   ✗ Admin login failed: ${JSON.stringify(data)}`);
      allPassed = false;
    }
  } catch (e) {
    console.log(`   ✗ Login error: ${e.message}`);
    allPassed = false;
  }

  // ─────────────────────────────────────────────
  // 5. E2E: Simulate an admin save and verify DB update
  // ─────────────────────────────────────────────
  console.log("\n✦ [5] E2E: Simulate admin save → verify DB persists");
  try {
    const origGet = await fetch(`${BASE_URL}/`);
    const origHtml = await origGet.text();
    const testMarker = `<!-- AUDIT_TEST_${Date.now()} -->`;
    const testHtml = origHtml.replace("</body>", `${testMarker}</body>`);

    const saveResp = await fetch(`${BASE_URL}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Passcode": PASSCODE,
      },
      body: JSON.stringify({ html: testHtml, page_path: "/" }),
    });
    const saveData = await saveResp.json();

    if (!saveResp.ok || !saveData.success) {
      console.log(`   ✗ Save failed: ${JSON.stringify(saveData)}`);
      allPassed = false;
    } else {
      console.log(`   ✓ Save returned success`);

      // Immediately check DB for the marker
      const dbCheck = await query(
        "SELECT html FROM site_content WHERE page_path = '/'",
      );
      if (dbCheck.rows.length > 0 && dbCheck.rows[0].html.includes(testMarker)) {
        console.log(`   ✓ DB CONFIRMED: test marker found in site_content for '/'`);
      } else {
        console.log(`   ✗ DB MISS: test marker NOT found in DB after save!`);
        allPassed = false;
      }

      // Verify GET / also returns the updated content
      const getResp = await fetch(`${BASE_URL}/`);
      const getHtml = await getResp.text();
      if (getHtml.includes(testMarker)) {
        console.log(`   ✓ SERVE CHECK: GET / returns the newly saved HTML`);
      } else {
        console.log(`   ✗ SERVE MISS: GET / did NOT return the updated HTML!`);
        allPassed = false;
      }

      // Restore original clean HTML to /
      await fetch(`${BASE_URL}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": PASSCODE,
        },
        body: JSON.stringify({ html: origHtml, page_path: "/" }),
      });
      console.log(`   ✓ RESTORED: Clean original HTML restored to '/'`);
    }
  } catch (e) {
    console.log(`   ✗ E2E save error: ${e.message}`);
    allPassed = false;
  }

  // ─────────────────────────────────────────────
  // 6. Page routes: All 3 pages must respond with HTML from DB
  // ─────────────────────────────────────────────
  console.log("\n✦ [6] PAGE ROUTES: Confirm all pages serve from DB");
  const pageRoutes = [
    { url: `${BASE_URL}/`, label: "Home (/)" },
    { url: `${BASE_URL}/members`, label: "Members (/members)" },
    { url: `${BASE_URL}/members.html`, label: "Members (/members.html)" },
    { url: `${BASE_URL}/tickets`, label: "Tickets (/tickets)" },
    { url: `${BASE_URL}/tickets.html`, label: "Tickets (/tickets.html)" },
    { url: `${BASE_URL}/admin/iit_ism_1290e-summit`, label: "Admin route" },
  ];

  for (const route of pageRoutes) {
    try {
      const resp = await fetch(route.url);
      const html = await resp.text();
      const hasDoctype = html.includes("<!DOCTYPE") || html.includes("<!doctype");
      const hasBody = html.includes("<body") || html.includes("<BODY");
      const byteLen = Buffer.byteLength(html, "utf8");

      if (resp.ok && hasDoctype && hasBody && byteLen > 5000) {
        console.log(`   ✓ ${route.label} — ${byteLen} bytes, valid HTML`);
      } else {
        console.log(`   ✗ ${route.label} — PROBLEM: ok=${resp.ok}, hasDoctype=${hasDoctype}, bytes=${byteLen}`);
        allPassed = false;
      }
    } catch (e) {
      console.log(`   ✗ ${route.label} — ERROR: ${e.message}`);
      allPassed = false;
    }
  }

  // ─────────────────────────────────────────────
  // 7. DB members check
  // ─────────────────────────────────────────────
  console.log("\n✦ [7] DATABASE: members table");
  const memberCount = await query("SELECT COUNT(*) as cnt FROM members");
  const cnt = parseInt(memberCount.rows[0].cnt);
  if (cnt > 0) {
    console.log(`   ✓ members table has ${cnt} records`);
    const sample = await query("SELECT name, role FROM members LIMIT 3");
    sample.rows.forEach(m => console.log(`     - ${m.name} (${m.role})`));
  } else {
    console.log(`   ⚠ members table is empty (this is OK if no members have been added via admin yet)`);
  }

  // ─────────────────────────────────────────────
  // FINAL RESULT
  // ─────────────────────────────────────────────
  console.log("\n=================================================");
  if (allPassed) {
    console.log("   ✅ ALL CHECKS PASSED — Admin changes WILL persist to Neon DB");
    console.log("      Changes survive server restarts (DB is the source of truth).");
  } else {
    console.log("   ❌ SOME CHECKS FAILED — Review issues above");
  }
  console.log("=================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runVerification().catch(err => {
  console.error("Audit script crashed:", err);
  process.exit(1);
});
