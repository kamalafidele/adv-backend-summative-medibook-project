// All SQL for doctors (including the statistics queries).
const pool = require('./db');

async function getAllDoctors() {
  const [rows] = await pool.execute('SELECT id, name, specialty, consultation_fee, room, created_at FROM doctors ORDER BY id');
  return rows;
}

async function getDoctorById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, specialty, consultation_fee, room, created_at FROM doctors WHERE id = ?',
    [id]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

async function createDoctor(name, specialty, fee, room) {
  const [result] = await pool.execute(
    'INSERT INTO doctors (name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [name, specialty, fee, room]
  );
  return result.insertId;
}

async function updateDoctor(id, name, specialty, fee, room) {
  await pool.execute(
    'UPDATE doctors SET name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE id = ?',
    [name, specialty, fee, room, id]
  );
}

async function deleteDoctor(id) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Statistics for one doctor. Everything is calculated by MySQL.
async function getDoctorStats(doctorId, nowText, todayText, dailyCap, days) {
  // 1) revenue collected = money paid minus money refunded, and number of upcoming appointments
  const [totals] = await pool.execute(
    `SELECT COALESCE(SUM(amount_paid - COALESCE(refund_amount, 0)), 0) AS revenue_collected,
            COALESCE(SUM(status = 'booked' AND appt_datetime > ?), 0) AS upcoming_appointments
       FROM appointments
      WHERE doctor_id = ?`,
    [nowText, doctorId]
  );

  // 2) appointments for each of the next 7 days.
  //    The WITH RECURSIVE part creates one row per day, so days with 0 appointments still show up.
  const [perDay] = await pool.execute(
    `WITH RECURSIVE days AS (
        SELECT CAST(? AS DATE) AS day_date, 1 AS n
        UNION ALL
        SELECT DATE_ADD(day_date, INTERVAL 1 DAY), n + 1 FROM days WHERE n < ?
     )
     SELECT days.day_date AS date,
            COUNT(a.id) AS appointments,
            ROUND(COUNT(a.id) * 100 / ?, 1) AS utilization_pct
       FROM days
       LEFT JOIN appointments a
              ON a.doctor_id = ?
             AND a.status = 'booked'
             AND a.appt_datetime >= days.day_date
             AND a.appt_datetime < DATE_ADD(days.day_date, INTERVAL 1 DAY)
      GROUP BY days.day_date
      ORDER BY days.day_date`,
    [todayText, days, dailyCap, doctorId]
  );

  // 3) utilization over the whole window = booked slots / (12 slots x 7 days)
  const [window] = await pool.execute(
    `SELECT COUNT(*) AS booked_slots,
            ROUND(COUNT(*) * 100 / (? * ?), 1) AS utilization_pct
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'booked'
        AND appt_datetime >= CAST(? AS DATE)
        AND appt_datetime < DATE_ADD(CAST(? AS DATE), INTERVAL ? DAY)`,
    [dailyCap, days, doctorId, todayText, todayText, days]
  );

  return {
    revenue_collected: totals[0].revenue_collected,
    upcoming_appointments: Number(totals[0].upcoming_appointments),
    per_day: perDay,
    booked_slots: window[0].booked_slots,
    utilization_pct: window[0].utilization_pct,
  };
}

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, getDoctorStats };
