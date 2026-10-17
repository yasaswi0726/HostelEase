
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
    minVersion: "TLSv1.2"
}

db.connect((err) => {
   if (err) {
    console.error("Database connection failed:", err);
    return;
}

    console.log("TiDB Cloud database connected successfully!");
});

module.exports = db;
