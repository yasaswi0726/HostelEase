
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "hostel_management"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    return;
  }

  console.log("MySQL database connected successfully!");
});

module.exports = db;
