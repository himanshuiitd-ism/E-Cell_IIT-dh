require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool, query } = require("./db");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Cloudinary Node SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Database Table on server startup
const initDb = async () => {
  try {
    const sqlPath = path.join(__dirname, "db", "init.sql");
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, "utf8");
      await query(sqlContent);

      // Perform database schema migrations if necessary (add page_path column dynamically)
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_content' AND column_name='page_path') THEN
            ALTER TABLE site_content ADD COLUMN page_path TEXT;
            UPDATE site_content SET page_path = '/' WHERE page_path IS NULL;
            ALTER TABLE site_content ALTER COLUMN page_path SET NOT NULL;
            ALTER TABLE site_content ADD CONSTRAINT site_content_page_path_key UNIQUE (page_path);
          END IF;
        END $$;
      `);

      // Migration for social media columns
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='instagram') THEN
            ALTER TABLE members ADD COLUMN instagram TEXT DEFAULT '';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='facebook') THEN
            ALTER TABLE members ADD COLUMN facebook TEXT DEFAULT '';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='twitter') THEN
            ALTER TABLE members ADD COLUMN twitter TEXT DEFAULT '';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='linkedin') THEN
            ALTER TABLE members ADD COLUMN linkedin TEXT DEFAULT '';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='reddit') THEN
            ALTER TABLE members ADD COLUMN reddit TEXT DEFAULT '';
          END IF;
        END $$;
      `);

      // Migration for featured member columns
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='is_featured') THEN
            ALTER TABLE members ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='featured_order') THEN
            ALTER TABLE members ADD COLUMN featured_order INTEGER DEFAULT 0;
          END IF;
        END $$;
      `);

      // Seed index.html if missing in site_content
      const resHome = await query(
        "SELECT 1 FROM site_content WHERE page_path = '/'",
      );
      if (resHome.rows.length === 0) {
        console.log(
          "Database missing index.html. Seeding with local index.html...",
        );
        const freshHtml = fs.readFileSync(
          path.join(__dirname, "index.html"),
          "utf8",
        );
        await query(
          "INSERT INTO site_content (page_path, html) VALUES ('/', $1) ON CONFLICT (page_path) DO NOTHING",
          [freshHtml],
        );
      }

      // Seed members.html if missing in site_content
      const resMembers = await query(
        "SELECT 1 FROM site_content WHERE page_path = '/members.html'",
      );
      if (resMembers.rows.length === 0) {
        console.log(
          "Database missing members.html. Seeding with local members.html...",
        );
        const freshHtml = fs.readFileSync(
          path.join(__dirname, "members.html"),
          "utf8",
        );
        await query(
          "INSERT INTO site_content (page_path, html) VALUES ('/members.html', $1) ON CONFLICT (page_path) DO NOTHING",
          [freshHtml],
        );
      }

      // Seed tickets.html if missing in site_content
      const resTickets = await query(
        "SELECT 1 FROM site_content WHERE page_path = '/tickets.html'",
      );
      if (resTickets.rows.length === 0) {
        const ticketsPath = path.join(__dirname, "tickets.html");
        if (fs.existsSync(ticketsPath)) {
          console.log(
            "Database missing tickets.html. Seeding with local tickets.html...",
          );
          const freshHtml = fs.readFileSync(ticketsPath, "utf8");
          await query(
            "INSERT INTO site_content (page_path, html) VALUES ('/tickets.html', $1) ON CONFLICT (page_path) DO NOTHING",
            [freshHtml],
          );
        }
      }

      console.log(
        "Database initialized and migrated successfully.",
      );
    } else {
      console.warn(
        "db/init.sql not found. Skipping database auto-initialization.",
      );
    }
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};
initDb();

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for static servers (like VS Code Live Server on port 5501)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, X-Admin-Passcode",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Admin authentication middleware — rejects mutating API calls without a valid passcode.
// The passcode can be sent in the JSON body ({ passcode: "..." }) OR via the
// X-Admin-Passcode request header so all admin write calls are protected.
const requireAdmin = (req, res, next) => {
  const correctPasscode = process.env.ADMIN_PASSCODE;
  if (!correctPasscode) {
    // Server is misconfigured — don't allow anything
    return res.status(500).json({ success: false, message: "Server configuration error: ADMIN_PASSCODE not set." });
  }
  const supplied =
    (req.body && req.body.passcode) ||
    req.headers["x-admin-passcode"] ||
    "";
  if (supplied !== correctPasscode) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or missing admin passcode." });
  }
  next();
};


// Serve static assets from public folder
app.use("/public", express.static(path.join(__dirname, "public")));

// Serve root static files except index.html (so we can intercept it)
app.use(express.static(__dirname, { index: false }));

// Fallback routes for resources requested relative to /admin/iit sub-routes
app.get("/admin/styles.css", (req, res) =>
  res.sendFile(path.join(__dirname, "styles.css")),
);
app.get("/admin/script.js", (req, res) =>
  res.sendFile(path.join(__dirname, "script.js")),
);
app.get("/admin/public/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", req.params[0]));
});

// Login validation endpoint
app.post("/api/login", (req, res) => {
  const { passcode } = req.body;
  const correctPasscode = process.env.ADMIN_PASSCODE;

  if (passcode === correctPasscode) {
    return res.json({ success: true, message: "Authenticated successfully" });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Invalid passcode" });
  }
});


// Image upload endpoint (admin-only)
app.post("/api/upload-image", requireAdmin, async (req, res) => {
  const { name, base64Data } = req.body;
  if (!name || !base64Data) {
    return res
      .status(400)
      .json({ success: false, message: "Name and base64Data are required" });
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Data, {
      folder: "e-summit-members",
      public_id: `member_${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}`,
    });

    return res.json({ success: true, url: uploadResponse.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload image to Cloudinary: " + err.message,
      });
  }
});

// Helper function to upload base64 images in HTML to Cloudinary and replace them with secure URLs
async function saveBase64ImagesToCloudinary(html) {
  // Matches src="data:image/[ext];base64,[data]" or src='data:image/[ext];base64,[data]'
  const base64Regex =
    /src=["']data:image\/([A-Za-z-+\/]+);base64,([^"']+)["']/g;
  const matches = [];
  let match;

  while ((match = base64Regex.exec(html)) !== null) {
    matches.push({
      full: match[0],
      base64: `data:image/${match[1]};base64,${match[2]}`,
    });
  }

  let updatedHtml = html;
  for (const m of matches) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(m.base64, {
        folder: "e-summit-members",
      });
      console.log(
        `Uploaded base64 image to Cloudinary: ${uploadResponse.secure_url}`,
      );
      updatedHtml = updatedHtml.replace(
        m.full,
        `src="${uploadResponse.secure_url}"`,
      );
    } catch (err) {
      console.error("Cloudinary upload failed for base64 image:", err);
    }
  }
  return updatedHtml;
}

// Helper function to extract members from HTML string
function extractMembers(html) {
  const cards = [];
  const parts = html.split('<div class="member-card"');
  let order = 0;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const closingBracketIndex = part.indexOf(">");
    if (closingBracketIndex === -1) continue;

    const attributes = part.substring(0, closingBracketIndex);
    const content = part.substring(closingBracketIndex + 1);

    // Extract Name
    const nameMatch = content.match(/class="member-name"[^>]*>([^<]*)</);
    const name = nameMatch ? nameMatch[1].trim() : "";

    // Extract Role
    const roleMatch = content.match(/class="member-role"[^>]*>([^<]*)</);
    const role = roleMatch ? roleMatch[1].trim() : "";

    // Extract Image URL
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    const image_url = imgMatch ? imgMatch[1] : "";

    // Extract social attributes
    const extractAttr = (attrName) => {
      const match = attributes.match(
        new RegExp(`data-${attrName}=["']([^"']*)["']`),
      );
      return match ? match[1] : "";
    };

    const instagram = extractAttr("instagram");
    const facebook = extractAttr("facebook");
    const twitter = extractAttr("twitter");
    const linkedin = extractAttr("linkedin");
    const reddit = extractAttr("reddit");

    // Extract featured attributes
    const featuredMatch = attributes.match(/data-featured=["']([^"']*)["']/);
    const is_featured = featuredMatch ? featuredMatch[1] === "true" : false;
    const featuredOrderMatch = attributes.match(/data-featured-order=["']([^"']*)["']/);
    const featured_order = featuredOrderMatch ? parseInt(featuredOrderMatch[1], 10) || 0 : 0;

    if (name) {
      cards.push({
        name,
        role,
        image_url,
        instagram,
        facebook,
        twitter,
        linkedin,
        reddit,
        is_featured,
        featured_order,
        section: "team",
        display_order: order++,
      });
    }
  }
  return cards;
}

// Save updated members endpoint (admin-only)
app.post("/api/save", requireAdmin, async (req, res) => {
  let { html, page_path } = req.body;
  if (!html) {
    return res
      .status(400)
      .json({ success: false, message: "HTML content is required" });
  }

  if (!page_path) page_path = "/";
  // Normalize admin routes and extension routes to match schema layout keys
  if (page_path === "/admin/iit_ism_1290e-summit") page_path = "/";
  if (page_path === "/members" || page_path === "/admin/members")
    page_path = "/members.html";
  if (page_path === "/tickets") page_path = "/tickets.html";

  try {
    // 1. Process base64 images inside HTML and upload them to Cloudinary
    html = await saveBase64ImagesToCloudinary(html);

    // 2. Check if the saved HTML contains the team section before modifying the members list
    const hasTeamSection =
      html.includes('id="team-track"') || html.includes('id="team"');

    // 3. Upsert members into Neon database if team section is present
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (hasTeamSection) {
        const members = extractMembers(html);
        console.log(`Parsed ${members.length} members from HTML.`);
        await client.query("DELETE FROM members WHERE section = 'team'");

        for (const m of members) {
          await client.query(
            "INSERT INTO members (name, role, image_url, section, display_order, instagram, facebook, twitter, linkedin, reddit, is_featured, featured_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [
              m.name,
              m.role,
              m.image_url,
              m.section,
              m.display_order,
              m.instagram || "",
              m.facebook || "",
              m.twitter || "",
              m.linkedin || "",
              m.reddit || "",
              m.is_featured || false,
              m.featured_order || 0,
            ],
          );
        }
      }

      // Also persist the site layout HTML to the database keyed by the normalized page path
      await client.query(
        "INSERT INTO site_content (page_path, html) VALUES ($1, $2) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
        [page_path, html],
      );

      await client.query("COMMIT");
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    // Write content back to local file as fallback and sync for local git
    const localFileMap = {
      "/": "index.html",
      "/members.html": "members.html",
      "/tickets.html": "tickets.html",
    };
    const localFilename = localFileMap[page_path] || null;
    if (localFilename) {
      const filePath = path.join(__dirname, localFilename);
      fs.writeFile(filePath, html, "utf8", (err) => {
        if (err) {
          console.error(`Error writing ${localFilename} locally:`, err);
        } else {
          console.log(`${localFilename} updated successfully locally.`);
        }
      });
    }

    return res.json({
      success: true,
      message: "Members and site layout saved successfully",
    });
  } catch (err) {
    console.error("Error saving members to database:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save members to database: " + err.message,
    });
  }
});

// Fetch all members endpoint
app.get("/api/members", async (req, res) => {
  try {
    const result = await query(
      "SELECT name, role, image_url, section, display_order, instagram, facebook, twitter, linkedin, reddit, is_featured, featured_order FROM members ORDER BY display_order ASC",
    );
    return res.json({ success: true, members: result.rows });
  } catch (err) {
    console.error("Error fetching members:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch members" });
  }
});

// Serve index.html from DB or fallback to file system
const serveIndex = async (req, res) => {
  try {
    const result = await query(
      "SELECT html FROM site_content WHERE page_path = '/'",
    );
    if (result.rows.length > 0) {
      return res.send(result.rows[0].html);
    }
  } catch (err) {
    console.error(
      "Failed to query HTML from database, serving local file:",
      err,
    );
  }
  res.sendFile(path.join(__dirname, "index.html"));
};

// Serve members.html from DB or fallback to file system
const serveMembersPage = async (req, res) => {
  try {
    const result = await query(
      "SELECT html FROM site_content WHERE page_path = '/members.html'",
    );
    if (result.rows.length > 0) {
      return res.send(result.rows[0].html);
    }
  } catch (err) {
    console.error(
      "Failed to query Members HTML from database, serving local file:",
      err,
    );
  }
  res.sendFile(path.join(__dirname, "members.html"));
};

app.get("/", serveIndex);
app.get("/admin/iit_ism_1290e-summit", serveIndex);

app.get("/members", serveMembersPage);
app.get("/members.html", serveMembersPage);
app.get("/admin/members", serveMembersPage);

// Ticket endpoints
app.get("/api/tickets", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM tickets ORDER BY display_order ASC",
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tickets" });
  }
});

app.post("/api/tickets", requireAdmin, async (req, res) => {
  const { name, description, price, features, availability } = req.body;

  if (!name || !description || !price) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await query(
      "INSERT INTO tickets (name, description, price, features, availability) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description, price, features || [], availability || "available"],
    );
    return res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error("Error creating ticket:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create ticket" });
  }
});

app.put("/api/tickets/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, features, availability } = req.body;

  try {
    const result = await query(
      "UPDATE tickets SET name = $1, description = $2, price = $3, features = $4, availability = $5, updated_at = NOW() WHERE id = $6 RETURNING *",
      [
        name,
        description,
        price,
        features || [],
        availability || "available",
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    return res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error("Error updating ticket:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update ticket" });
  }
});

app.delete("/api/tickets/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      "DELETE FROM tickets WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    return res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete ticket" });
  }
});

// QR Code endpoints
app.get("/api/qr-code", async (req, res) => {
  try {
    const result = await query(
      "SELECT html FROM site_content WHERE page_path = 'qr_code_url'",
    );
    if (result.rows.length > 0) {
      return res.json({ success: true, url: result.rows[0].html });
    }
    return res.json({
      success: true,
      url: "https://via.placeholder.com/250x250/111111/ff7600?text=Scan+%26+Pay+UPI+QR",
    });
  } catch (err) {
    console.error("Error fetching QR code:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch QR code URL" });
  }
});

app.post("/api/qr-code", requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res
      .status(400)
      .json({ success: false, message: "QR Code URL is required" });
  }

  try {
    await query(
      "INSERT INTO site_content (page_path, html) VALUES ('qr_code_url', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
      [url],
    );
    return res.json({
      success: true,
      message: "QR Code URL saved successfully",
      url,
    });
  } catch (err) {
    console.error("Error saving QR code URL:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to save QR code URL: " + err.message,
      });
  }
});

// Helper to create Nodemailer Transporter
function createEmailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes("your_gmail") || pass.includes("your_gmail")) {
    console.warn("[Nodemailer] SMTP credentials missing or placeholder in .env. Skipping actual email dispatch.");
    return null;
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: {
      user: user,
      pass: pass,
    },
  });
}

// Helper to send order notification emails (Admin notification + Payer confirmation)
async function sendOrderNotificationEmails(orderData) {
  const transporter = createEmailTransporter();
  const adminEmail = process.env.ADMIN_EMAIL || "outreach.iic@iitdh.ac.in";
  const senderEmail = process.env.SMTP_USER || "noreply@iitdh.ac.in";

  const {
    order_id,
    full_name,
    email,
    college_name,
    gender,
    tickets_summary,
    total_amount,
    order_reference,
  } = orderData;

  // 1. Admin Email Notification Template
  const adminMailOptions = {
    from: `"E-Summit 2026 Systems" <${senderEmail}>`,
    to: adminEmail,
    subject: `🚨 New Ticket Submission [${order_id}] - ${full_name}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d12; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 650px; margin: 0 auto; border: 1px solid #ff7600;">
        <h2 style="color: #ff7600; border-bottom: 2px solid #ff7600; padding-bottom: 10px; margin-top: 0;">New Ticket Order Received (Review Required)</h2>
        <p style="font-size: 15px; color: #d1d1d1;">A new ticket purchase and payment reference has been submitted. Details below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold; width: 35%;">Order ID:</td><td style="padding: 12px; color: #fff; font-weight: bold;">${order_id}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Payer Full Name:</td><td style="padding: 12px; color: #fff;">${full_name}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Payer Email:</td><td style="padding: 12px; color: #fff;"><a href="mailto:${email}" style="color: #ff7600;">${email}</a></td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">College / Institution:</td><td style="padding: 12px; color: #fff;">${college_name}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Gender:</td><td style="padding: 12px; color: #fff;">${gender || "Not specified"}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Tickets Purchased:</td><td style="padding: 12px; color: #fff;">${tickets_summary || "E-Summit Pass"}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Total Amount Paid:</td><td style="padding: 12px; color: #ff7600; font-size: 18px; font-weight: bold;">₹${total_amount}</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 12px; color: #ff7600; font-weight: bold;">Transaction Ref / UTR:</td><td style="padding: 12px; color: #28a745; font-weight: bold;">${order_reference}</td></tr>
          <tr><td style="padding: 12px; color: #ff7600; font-weight: bold;">Status:</td><td style="padding: 12px; color: #ffc107; font-weight: bold;">Pending Admin Review</td></tr>
        </table>

        <div style="margin-top: 25px; padding: 15px; background: rgba(255, 118, 0, 0.1); border-left: 4px solid #ff7600; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #e0e0e0;">Please verify the UTR payment reference in the bank account records and issue final confirmation to the attendee.</p>
        </div>
        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 25px;">E-Summit 2026 | Institute Innovation Council (IIC) IIT ISM Dhanbad</p>
      </div>
    `,
  };

  // 2. Payer Acknowledgment Email Template
  const payerMailOptions = {
    from: `"E-Summit 2026 IIT ISM Dhanbad" <${senderEmail}>`,
    to: email,
    subject: `Payment Received - Under Review [${order_id}] | E-Summit 2026`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d12; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 650px; margin: 0 auto; border: 1px solid #ff7600;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ff7600; margin: 0; font-size: 26px;">E-SUMMIT 2026</h1>
          <p style="color: #aaa; margin: 5px 0 0 0; font-size: 14px;">IIT ISM Dhanbad</p>
        </div>

        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Hello ${full_name},</h2>
          <p style="font-size: 15px; color: #d1d1d1; line-height: 1.6;">
            We have successfully received your payment submission for <strong>E-Summit 2026</strong>. Your transaction is currently <strong>under review</strong> by our finance and admin team.
          </p>

          <div style="background: rgba(255, 118, 0, 0.1); border-left: 4px solid #ff7600; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #ff7600; font-weight: bold; font-size: 16px;">Order ID: ${order_id}</p>
            <p style="margin: 5px 0 0 0; color: #ddd; font-size: 14px;">Status: <span style="color: #ffc107; font-weight: bold;">Payment Under Review</span></p>
          </div>

          <h3 style="color: #ff7600; font-size: 16px; margin-top: 20px;">Order Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; color: #eee; font-size: 14px;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0; color: #aaa;">Tickets:</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${tickets_summary || "E-Summit Pass"}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0; color: #aaa;">Amount Paid:</td><td style="padding: 8px 0; text-align: right; color: #ff7600; font-weight: bold;">₹${total_amount}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0; color: #aaa;">Transaction UTR / Ref:</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">${order_reference}</td></tr>
            <tr><td style="padding: 8px 0; color: #aaa;">Institution:</td><td style="padding: 8px 0; text-align: right;">${college_name}</td></tr>
          </table>

          <p style="font-size: 14px; color: #d1d1d1; line-height: 1.6; margin-top: 25px;">
            Our admin team is verifying your payment reference number. Once verified, you will receive a final confirmation email with your pass details.
          </p>
        </div>

        <div style="margin-top: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
          <p style="font-size: 13px; color: #888; margin: 0;">Have questions? Contact us at <a href="mailto:outreach.iic@iitdh.ac.in" style="color: #ff7600;">outreach.iic@iitdh.ac.in</a></p>
          <p style="font-size: 12px; color: #666; margin-top: 8px;">&copy; 2026 Institute Innovation Council, IIT ISM Dhanbad. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  if (!transporter) {
    console.log(`[Email Notice] SMTP credentials unconfigured/placeholder. Order [${order_id}] recorded. Simulated notification sent to Admin (${adminEmail}) & Payer (${email}).`);
    return false;
  }

  try {
    const adminRes = await transporter.sendMail(adminMailOptions);
    console.log(`[Nodemailer] Admin notification sent to ${adminEmail}: ${adminRes.messageId}`);

    const payerRes = await transporter.sendMail(payerMailOptions);
    console.log(`[Nodemailer] Payer confirmation sent to ${email}: ${payerRes.messageId}`);
    return true;
  } catch (err) {
    console.error("[Nodemailer Error] Failed to send notification emails:", err);
    return false;
  }
}

// Orders endpoint
app.post("/api/orders", async (req, res) => {
  const {
    order_id,
    ticket_id,
    full_name,
    email,
    college_name,
    gender,
    quantity,
    tickets_summary,
    total_amount,
    order_reference,
  } = req.body;

  if (!full_name || !email || !college_name || !order_reference) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const generatedOrderId = order_id || 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  try {
    const result = await query(
      "INSERT INTO orders (ticket_id, full_name, email, college_name, gender, quantity, total_amount, order_reference, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        ticket_id || null,
        full_name,
        email,
        college_name,
        gender || "Not specified",
        quantity || 1,
        total_amount || 0,
        order_reference,
        "pending",
      ],
    );

    const savedOrder = result.rows[0];

    // Dispatch Nodemailer notifications (Admin + Payer)
    const emailSent = await sendOrderNotificationEmails({
      order_id: generatedOrderId,
      full_name,
      email,
      college_name,
      gender,
      tickets_summary: tickets_summary || `${quantity || 1}x E-Summit Ticket`,
      total_amount,
      order_reference,
    });

    return res.json({
      success: true,
      message: "Order created successfully and confirmation emails dispatched",
      order: { ...savedOrder, order_id: generatedOrderId },
      email_sent: emailSent,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order: " + err.message });
  }
});

app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM orders ORDER BY created_at DESC",
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching orders:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders" });
  }
});

// Serve tickets.html from DB or fallback to file system
const serveTicketsPage = async (req, res) => {
  try {
    const result = await query(
      "SELECT html FROM site_content WHERE page_path = '/tickets.html'",
    );
    if (result.rows.length > 0) {
      return res.send(result.rows[0].html);
    }
  } catch (err) {
    console.error(
      "Failed to query tickets HTML from database, serving local file:",
      err,
    );
  }
  res.sendFile(path.join(__dirname, "tickets.html"));
};

app.get("/tickets", serveTicketsPage);
app.get("/tickets.html", serveTicketsPage);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(
    `Admin Mode accessible at http://localhost:${PORT}/admin/iit_ism_1290e-summit`,
  );
});
