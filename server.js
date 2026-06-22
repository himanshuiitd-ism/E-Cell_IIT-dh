require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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
app.post("/api/upload-image", (req, res) => {
  const { name, base64Data } = req.body;
  if (!name || !base64Data) {
    return res
      .status(400)
      .json({ success: false, message: "Name and base64Data are required" });
  }

  // Extract base64 encoding matches
  const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid image format" });
  }

  const ext = matches[1];
  const dataBuffer = Buffer.from(matches[2], "base64");

  // Clean up name for filename safety
  const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `member_${safeName}_${Date.now()}.${ext}`;
  const filePath = path.join(__dirname, "public", filename);

  // Write image file
  fs.writeFile(filePath, dataBuffer, (err) => {
    if (err) {
      console.error("Error saving image:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to write image file" });
    }
    return res.json({ success: true, url: `/public/${filename}` });
  });
});

// Helper function to extract base64 images from HTML, save them to files, and replace references
function saveBase64Images(html) {
  // Matches src="data:image/[ext];base64,[data]" or src='data:image/[ext];base64,[data]'
  const base64Regex = /src=["']data:image\/([A-Za-z-+\/]+);base64,([^"']+)["']/g;
  
  return html.replace(base64Regex, (match, ext, base64Content) => {
    try {
      if (ext === "jpeg") ext = "jpg";
      if (ext === "svg+xml") ext = "svg";
      
      const dataBuffer = Buffer.from(base64Content, "base64");
      const filename = `member_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      const filePath = path.join(__dirname, "public", filename);
      
      fs.writeFileSync(filePath, dataBuffer);
      console.log(`Saved base64 image: public/${filename}`);
      return `src="public/${filename}"`;
    } catch (err) {
      console.error("Error writing base64 image to file:", err);
      return match;
    }
  });
}

// Save updated HTML endpoint
app.post("/api/save", (req, res) => {
  let { html } = req.body;
  if (!html) {
    return res
      .status(400)
      .json({ success: false, message: "HTML content is required" });
  }

  // Save any base64 images written to the DOM
  try {
    html = saveBase64Images(html);
  } catch (err) {
    console.error("Failed to process base64 images:", err);
  }

  // Write content back to index.html
  const filePath = path.join(__dirname, "index.html");
  fs.writeFile(filePath, html, "utf8", (err) => {
    if (err) {
      console.error("Error saving file:", err);
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to save changes to index.html",
        });
    }
    console.log("index.html updated successfully.");
    return res.json({
      success: true,
      message: "Changes saved successfully to index.html",
    });
  });
});

// Serve index.html for main route and admin route
const serveIndex = (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
};

app.get("/", serveIndex);
app.get("/admin/iit", serveIndex);

// Catch-all route to serve index.html (useful for SPA behavior if needed)
app.get("*", serveIndex);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Admin Mode accessible at http://localhost:${PORT}/admin/iit`);
});
