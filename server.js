require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const cloudinary = require("cloudinary").v2;

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
      await pool.query(sqlContent);

      // Perform database schema migrations if necessary (add page_path column dynamically)
      await pool.query(`
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
      await pool.query(`
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

      // Keep database HTML content synchronized with disk for the new features
      const resHome = await pool.query(
        "SELECT html FROM site_content WHERE page_path = '/'",
      );
      if (resHome.rows.length > 0) {
        const dbHtml = resHome.rows[0].html;
        if (!dbHtml.includes("/members.html") || dbHtml.includes('id="team"')) {
          console.log(
            "Database HTML is outdated or contains removed team section. Overwriting with fresh index.html...",
          );
          const freshHtml = fs.readFileSync(
            path.join(__dirname, "index.html"),
            "utf8",
          );
          await pool.query(
            "INSERT INTO site_content (page_path, html) VALUES ('/', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
            [freshHtml],
          );
        }
      } else {
        console.log(
          "Database missing index.html. Seeding with local index.html...",
        );
        const freshHtml = fs.readFileSync(
          path.join(__dirname, "index.html"),
          "utf8",
        );
        await pool.query(
          "INSERT INTO site_content (page_path, html) VALUES ('/', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
          [freshHtml],
        );
      }

      const resMembers = await pool.query(
        "SELECT html FROM site_content WHERE page_path = '/members.html'",
      );
      if (resMembers.rows.length === 0) {
        console.log(
          "Database missing members.html. Seeding with local members.html...",
        );
        const freshHtml = fs.readFileSync(
          path.join(__dirname, "members.html"),
          "utf8",
        );
        await pool.query(
          "INSERT INTO site_content (page_path, html) VALUES ('/members.html', $1) ON CONFLICT (page_path) DO UPDATE SET html = EXCLUDED.html, updated_at = NOW()",
          [freshHtml],
        );
      }

      console.log(
        "Database initialized, migrated, and synchronized successfully.",
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
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

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

// Image upload endpoint
app.post("/api/upload-image", async (req, res) => {
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
        section: "team",
        display_order: order++,
      });
    }
  }
  return cards;
}

// Save updated members endpoint
app.post("/api/save", async (req, res) => {
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
            "INSERT INTO members (name, role, image_url, section, display_order, instagram, facebook, twitter, linkedin, reddit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
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
    const localFilename = page_path === "/" ? "index.html" : "members.html";
    const filePath = path.join(__dirname, localFilename);
    fs.writeFile(filePath, html, "utf8", (err) => {
      if (err) {
        console.error(`Error writing ${localFilename} locally:`, err);
      } else {
        console.log(`${localFilename} updated successfully locally.`);
      }
    });

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
    const result = await pool.query(
      "SELECT name, role, image_url, section, display_order, instagram, facebook, twitter, linkedin, reddit FROM members ORDER BY display_order ASC",
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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

app.post("/api/tickets", async (req, res) => {
  const { name, description, price, features, availability } = req.body;

  if (!name || !description || !price) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
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

app.put("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, price, features, availability } = req.body;

  try {
    const result = await pool.query(
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

app.delete("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
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

// Orders endpoint
app.post("/api/orders", async (req, res) => {
  const {
    ticket_id,
    full_name,
    email,
    college_name,
    gender,
    quantity,
    total_amount,
    order_reference,
  } = req.body;

  if (!ticket_id || !full_name || !email || !college_name) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO orders (ticket_id, full_name, email, college_name, gender, quantity, total_amount, order_reference, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        ticket_id,
        full_name,
        email,
        college_name,
        gender || "Not specified",
        quantity || 1,
        total_amount,
        order_reference,
        "pending",
      ],
    );
    return res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error("Error creating order:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
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

// Serve tickets.html
app.get("/tickets", (req, res) => {
  res.sendFile(path.join(__dirname, "tickets.html"));
});

app.get("/tickets.html", (req, res) => {
  res.sendFile(path.join(__dirname, "tickets.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(
    `Admin Mode accessible at http://localhost:${PORT}/admin/iit_ism_1290e-summit`,
  );
});
