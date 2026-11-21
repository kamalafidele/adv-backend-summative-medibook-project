-- MediBook schema (MySQL 8.0.16+ required: CHECK constraints are enforced from that version)
CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;

-- ---------------------------------------------------------------- patients
CREATE TABLE patients (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL,
  phone       VARCHAR(20)   NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_patients_email UNIQUE (email),
  CONSTRAINT ck_patients_name  CHECK (CHAR_LENGTH(TRIM(name)) >= 2)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------- doctors
CREATE TABLE doctors (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name             VARCHAR(100)  NOT NULL,
  specialty        VARCHAR(80)   NOT NULL,
  consultation_fee DECIMAL(8,2)  NOT NULL,
  room             VARCHAR(10)   NOT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ck_doctors_fee  CHECK (consultation_fee >= 0),
  CONSTRAINT ck_doctors_name CHECK (CHAR_LENGTH(TRIM(name)) >= 2)
) ENGINE=InnoDB;

-- ------------------------------------------------------------ appointments
-- A cancelled appointment is KEPT (refund history); only status flips.
-- active_slot is NULL for cancelled rows, so UNIQUE(doctor_id, active_slot)
-- forbids two *active* bookings for the same doctor/date/time, while any
-- number of cancelled rows (NULLs never collide in a UNIQUE index) can exist.
CREATE TABLE appointments (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  patient_id     INT UNSIGNED  NOT NULL,
  doctor_id      INT UNSIGNED  NOT NULL,
  appt_datetime  DATETIME      NOT NULL,
  amount_paid    DECIMAL(8,2)  NOT NULL,
  status         ENUM('booked','cancelled') NOT NULL DEFAULT 'booked',
  booked_on      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at   DATETIME      NULL,
  refund_amount  DECIMAL(8,2)  NULL,
  active_slot    DATETIME      GENERATED ALWAYS AS
                   (IF(status = 'booked', appt_datetime, NULL)) STORED,
  PRIMARY KEY (id),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- BUSINESS RULE: a doctor cannot have two (active) appointments at the same date/time
  CONSTRAINT uq_doctor_active_slot UNIQUE (doctor_id, active_slot),
  -- BUSINESS RULE: 30-minute boundaries, 09:00-17:00 (last start 16:30 so the slot ends by 17:00)
  CONSTRAINT ck_appt_slot CHECK (
    MINUTE(appt_datetime) IN (0, 30) AND SECOND(appt_datetime) = 0
    AND TIME(appt_datetime) BETWEEN '09:00:00' AND '16:30:00'),
  CONSTRAINT ck_appt_amount CHECK (amount_paid >= 0),
  CONSTRAINT ck_appt_refund CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount_paid)),
  -- status / cancellation columns must agree
  CONSTRAINT ck_appt_cancel_state CHECK (
    (status = 'booked'    AND cancelled_at IS NULL     AND refund_amount IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND refund_amount IS NOT NULL)),
  KEY idx_appt_patient (patient_id),
  KEY idx_appt_doctor_day (doctor_id, status, appt_datetime)
) ENGINE=InnoDB;
