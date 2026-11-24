function calculateRefund(amountPaid, apptDate, cancelDate) {
  const milliseconds = apptDate.getTime() - cancelDate.getTime();
  const hours = milliseconds / (1000 * 60 * 60);

  let percent;
  if (hours > 48) {
    percent = 100;
  } else if (hours >= 24) {
    percent = 50;
  } else {
    percent = 0;
  }

  // work in cents so we avoid decimal rounding problems (0.1 + 0.2 etc.)
  const cents = Math.round(amountPaid * 100);
  const refundCents = Math.round((cents * percent) / 100);
  const refundAmount = refundCents / 100;

  return { percent: percent, hours: hours, refundAmount: refundAmount };
}

module.exports = { calculateRefund };