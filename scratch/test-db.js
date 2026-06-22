require("dotenv").config();
const pool = require("../db");

const run = async () => {
  try {
    const res = await pool.query("SELECT * FROM members");
    console.log("MEMBERS IN DB:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error("DB Query failed:", err);
    process.exit(1);
  }
};

run();
