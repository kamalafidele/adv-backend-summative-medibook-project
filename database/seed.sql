-- Sample data. Dates are relative to CURDATE() so the data is always "upcoming".
USE medibook;

INSERT INTO patients (id, name, email, phone) VALUES
  (1, 'Kalisa Ahmed',    'kalisa@alueducation.com',    '0788-111-222'),
  (2, 'King David',    'kingdav@gmail.com',   '0797-333-444'),
  (3, 'Mugisha Obed',   'mobed@gmail.com',   '0783-555-666'),
  (4, 'Keza Alice',     'keza@alueducation.com',    '0739-888-999'),
  (5, 'Angel Mutoni', 'mangel@gmail.com',  '0788-000-111');

INSERT INTO doctors (id, name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Aline', 'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Nyirinkwaya',   'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Karenzi', 'Cardiology',  200.00, 'R-07');   -- no appointments (report must still list)

-- Dr. Aline, CURDATE()+7: 12 appointments = AT the daily cap (full day -> waitlist demo)
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '09:00:00'), 150.00),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '09:30:00'), 120.00),  -- discounted, as in the spreadsheet
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '10:00:00'), 150.00),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '10:30:00'), 150.00),
  (5, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '11:00:00'), 150.00),
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '11:30:00'), 150.00),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '12:00:00'), 150.00),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '12:30:00'), 150.00),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '13:00:00'), 150.00),
  (5, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '13:30:00'), 150.00),
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '14:00:00'), 150.00),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 7 DAY, '14:30:00'), 150.00);

-- Other doctors / days
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
  (1, 2, TIMESTAMP(CURDATE() + INTERVAL 5 DAY, '10:00:00'), 100.00),
  (3, 2, TIMESTAMP(CURDATE() + INTERVAL 5 DAY, '10:30:00'), 100.00),
  (4, 2, TIMESTAMP(CURDATE() + INTERVAL 6 DAY, '15:00:00'), 100.00),
  (5, 1, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '09:00:00'), 150.00);

-- A past (already attended) appointment and a cancelled one that keeps its refund record
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  (2, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '11:00:00'), 100.00, NOW() - INTERVAL 10 DAY);

INSERT INTO appointments
  (patient_id, doctor_id, appt_datetime, amount_paid, status, cancelled_at, refund_amount) VALUES
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '16:00:00'), 150.00, 'cancelled', NOW(), 75.00);
