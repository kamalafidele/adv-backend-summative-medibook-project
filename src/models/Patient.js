// All SQL for patients. Every query uses ? placeholders (parameterized queries).
const pool = require('./db');

async function getAllPatients() {
  const [rows] = await pool.execute('SELECT id, name, email, phone, created_at FROM patients ORDER BY id');
  return rows;
}

async function getPatientById(id) {
  const [rows] = await pool.execute('SELECT id, name, email, phone, created_at FROM patients WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

async function createPatient(name, email, phone) {
  const [result] = await pool.execute(
    'INSERT INTO patients (name, email, phone) VALUES (?, ?, ?)',
    [name, email, phone]
  );
  return result.insertId;
}

async function updatePatient(id, name, email, phone) {
  await pool.execute(
    'UPDATE patients SET name = ?, email = ?, phone = ? WHERE id = ?',
    [name, email, phone, id]
  );
}

async function deletePatient(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };
