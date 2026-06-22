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
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Initialize Database Table on server startup
const initDb = async () => {
  try {
    const sqlPath = path.join(__dirname, "db", "init.sql");
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, "utf8");
      await pool.query(sqlContent);
      console.log("Database initialized successfully.");
    } else {
      console.warn("db/init.sql not found. Skipping database auto-initialization.");
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
app.get("/admin/styles.css", (req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/admin/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));
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
      public_id: `member_${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}`
    });

    return res.json({ success: true, url: uploadResponse.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload image to Cloudinary: " + err.message });
  }
});

// Helper function to upload base64 images in HTML to Cloudinary and replace them with secure URLs
async function saveBase64ImagesToCloudinary(html) {
  // Matches src="data:image/[ext];base64,[data]" or src='data:image/[ext];base64,[data]'
  const base64Regex = /src=["']data:image\/([A-Za-z-+\/]+);base64,([^"']+)["']/g;
  const matches = [];
  let match;
  
  while ((match = base64Regex.exec(html)) !== null) {
    matches.push({
      full: match[0],
      base64: `data:image/${match[1]};base64,${match[2]}`
    });
  }

  let updatedHtml = html;
  for (const m of matches) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(m.base64, {
        folder: "e-summit-members"
      });
      console.log(`Uploaded base64 image to Cloudinary: ${uploadResponse.secure_url}`);
      updatedHtml = updatedHtml.replace(m.full, `src="${uploadResponse.secure_url}"`);
    } catch (err) {
      console.error("Cloudinary upload failed for base64 image:", err);
    }
  }
  return updatedHtml;
}

// Helper function to extract members from HTML string
function extractMembers(html) {
  const cards = [];
  const cardRegex = /<div class="member-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  let order = 0;
  
  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[1];
    
    // Extract Image URL
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/);
    const image_url = imgMatch ? imgMatch[1] : '';
    
    // Extract Name
    const nameMatch = block.match(/class="member-name"[^>]*>([^<]*)</);
    const name = nameMatch ? nameMatch[1].trim() : '';
    
    // Extract Role
    const roleMatch = block.match(/class="member-role"[^>]*>([^<]*)</);
    const role = roleMatch ? roleMatch[1].trim() : '';
    
    if (name) {
      cards.push({
        name,
        role,
        image_url,
        section: 'team',
        display_order: order++
      });
    }
  }
  return cards;
}

// Save updated members endpoint
app.post("/api/save", async (req, res) => {
  let { html } = req.body;
  if (!html) {
    return res
      .status(400)
      .json({ success: false, message: "HTML content is required" });
  }

  try {
    // 1. Process base64 images inside HTML and upload them to Cloudinary
    html = await saveBase64ImagesToCloudinary(html);

    // 2. Extract member cards from HTML
    const members = extractMembers(html);
    console.log(`Parsed ${members.length} members from HTML.`);

    // 3. Upsert members into Neon database (delete existing team members and insert new ones)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM members WHERE section = 'team'");
      
      for (const m of members) {
        await client.query(
          "INSERT INTO members (name, role, image_url, section, display_order) VALUES ($1, $2, $3, $4, $5)",
          [m.name, m.role, m.image_url, m.section, m.display_order]
        );
      }

      // Also persist the site layout HTML to the database so that non-member changes are saved statefully
      await client.query("DELETE FROM site_content");
      await client.query("INSERT INTO site_content (html) VALUES ($1)", [html]);

      await client.query("COMMIT");
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    // Write content back to local file as fallback and sync for local git
    const filePath = path.join(__dirname, "index.html");
    fs.writeFile(filePath, html, "utf8", (err) => {
      if (err) {
        console.error("Error writing index.html locally:", err);
      } else {
        console.log("index.html updated successfully locally.");
      }
    });

    return res.json({
      success: true,
      message: "Members and site layout saved successfully",
    });
  } catch (err) {
    console.error("Error saving members to database:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to save members to database: " + err.message,
      });
  }
});

// Fetch all members endpoint
app.get("/api/members", async (req, res) => {
  try {
    const result = await pool.query("SELECT name, role, image_url, section, display_order FROM members ORDER BY display_order ASC");
    return res.json({ success: true, members: result.rows });
  } catch (err) {
    console.error("Error fetching members:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch members" });
  }
});

// Serve index.html from DB or fallback to file system
const serveIndex = async (req, res) => {
  try {
    const result = await pool.query("SELECT html FROM site_content ORDER BY id DESC LIMIT 1");
    if (result.rows.length > 0) {
      return res.send(result.rows[0].html);
    }
  } catch (err) {
    console.error("Failed to query HTML from database, serving local file:", err);
  }
  res.sendFile(path.join(__dirname, "index.html"));
};

app.get("/", serveIndex);
app.get("/admin/iit", serveIndex);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Admin Mode accessible at http://localhost:${PORT}/admin/iit`);
});
