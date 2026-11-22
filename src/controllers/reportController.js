const reportModel = require('../models/Report');
const constants = require('../utils/constants');

async function getDoctorsReport(req, res, next) {
  try {
    const doctors = await reportModel.getDoctorsReport();
    res.json({ doctors: doctors });
  } catch (err) {
    next(err);
  }
}

async function getBusyDays(req, res, next) {
  try {
    const rows = await reportModel.getBusyDays(constants.DAILY_CAP, constants.BUSY_PERCENT);
    res.json({ daily_cap: constants.DAILY_CAP, threshold_pct: constants.BUSY_PERCENT, busy_days: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDoctorsReport, getBusyDays };
