// The two report queries. All the calculating is done by MySQL (JOIN, GROUP BY, HAVING).
const pool = require('./db');

// Every doctor with total appointments and revenue.
// LEFT JOIN keeps doctors that have no appointments.
async function getDoctorsReport() {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctor_id, d.name, d.specialty,
            COUNT(a.id) AS total_appointments,
            COALESCE(SUM(a.status = 'booked'), 0) AS booked_appointments,
            COALESCE(SUM(a.status = 'cancelled'), 0) AS cancelled_appointments,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.name, d.specialty
      ORDER BY revenue_collected DESC, d.id`
  );
  return rows;
}

// Every (doctor, date) where MORE than 80% of the 12 slots are booked (so 10, 11 or 12 slots).
async function getBusyDays(dailyCap, busyPercent) {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctor_id, d.name AS doctor_name,
            DATE(a.appt_datetime) AS appt_date,
            COUNT(*) AS booked_slots,
            ROUND(COUNT(*) * 100 / ?, 1) AS utilization_pct
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.status = 'booked'
      GROUP BY d.id, d.name, DATE(a.appt_datetime)
     HAVING COUNT(*) * 100 / ? > ?
      ORDER BY appt_date, d.id`,
    [dailyCap, dailyCap, busyPercent]
  );
  return rows;
}

module.exports = { getDoctorsReport, getBusyDays };
