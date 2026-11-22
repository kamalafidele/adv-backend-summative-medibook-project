// Clinic rules in one place, so the numbers are not scattered around the code
module.exports = {
  DAILY_CAP: 12,        // max appointments per doctor per day
  OPEN_HOUR: 9,         // clinic opens 09:00
  CLOSE_HOUR: 17,       // clinic closes 17:00 (so the last slot starts at 16:30)
  SLOT_MINUTES: 30,
  BUSY_PERCENT: 80,     // "busy day" = more than 80% of the daily cap
  STATS_DAYS: 7,
};
