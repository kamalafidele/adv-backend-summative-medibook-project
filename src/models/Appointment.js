// All SQL for appointments.
const pool = require('./db');

async function getAppointmentById(id) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.patient_id, a.doctor_id, a.appt_datetime, a.amount_paid, a.status,
            a.booked_on, a.cancelled_at, a.refund_amount,
            p.name AS patient_name, p.email AS patient_email, p.phone AS patient_phone,
            d.name AS doctor_name, d.specialty, d.room
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.id = ?`,
    [id]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

// Books a slot inside ONE transaction.

async function bookAppointment(patientId, doctorId, apptDatetime, day, dailyCap) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [doctors] = await connection.execute(
      'SELECT id, consultation_fee FROM doctors WHERE id = ? FOR UPDATE',
      [doctorId]
    );
    if (doctors.length === 0) {
      await connection.rollback();
      return { error: 'DOCTOR_NOT_FOUND' };
    }

    const [patients] = await connection.execute('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (patients.length === 0) {
      await connection.rollback();
      return { error: 'PATIENT_NOT_FOUND' };
    }

    // is this exact slot already taken?
    const [taken] = await connection.execute(
      "SELECT id FROM appointments WHERE doctor_id = ? AND appt_datetime = ? AND status = 'booked'",
      [doctorId, apptDatetime]
    );
    if (taken.length > 0) {
      await connection.rollback();
      return { error: 'SLOT_TAKEN' };
    }

    // how many appointments does the doctor already have that day?
    const [counted] = await connection.execute(
      `SELECT COUNT(*) AS total FROM appointments
        WHERE doctor_id = ? AND status = 'booked'
          AND appt_datetime >= CAST(? AS DATE)
          AND appt_datetime < DATE_ADD(CAST(? AS DATE), INTERVAL 1 DAY)`,
      [doctorId, day, day]
    );
    if (counted[0].total >= dailyCap) {
      await connection.rollback();
      return { error: 'DAY_FULL' };
    }

    // the price paid is the doctor's fee at the time of booking
    const [result] = await connection.execute(
      'INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES (?, ?, ?, ?)',
      [patientId, doctorId, apptDatetime, doctors[0].consultation_fee]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return { error: 'SLOT_TAKEN' };
    }
    throw err;
  } finally {
    connection.release();
  }
}

// Cancels an appointment and stores the refund. The row is NOT deleted (refund history),
// we only change its status. Both changes happen in one transaction.
// Returns 'OK', 'NOT_FOUND' or 'ALREADY_CANCELLED'.
async function cancelAppointment(id, refundAmount, cancelledAt) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT status FROM appointments WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return 'NOT_FOUND';
    }
    if (rows[0].status === 'cancelled') {
      await connection.rollback();
      return 'ALREADY_CANCELLED';
    }

    await connection.execute(
      "UPDATE appointments SET status = 'cancelled', cancelled_at = ?, refund_amount = ? WHERE id = ?",
      [cancelledAt, refundAmount, id]
    );

    await connection.commit();
    return 'OK';
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Does the patient already have an active appointment with this doctor on this day?
async function hasBookingOnDay(patientId, doctorId, day) {
  const [rows] = await pool.execute(
    `SELECT id FROM appointments
      WHERE patient_id = ? AND doctor_id = ? AND status = 'booked'
        AND appt_datetime >= CAST(? AS DATE)
        AND appt_datetime < DATE_ADD(CAST(? AS DATE), INTERVAL 1 DAY)`,
    [patientId, doctorId, day, day]
  );
  return rows.length > 0;
}

module.exports = { getAppointmentById, bookAppointment, cancelAppointment, hasBookingOnDay };
