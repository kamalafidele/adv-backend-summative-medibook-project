// Creates the MySQL connection pool that all models share.
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,     // dates come back as text like '2026-12-01 09:30:00' (no timezone surprises)
  decimalNumbers: true,  // DECIMAL columns come back as numbers instead of strings
});

module.exports = pool;
