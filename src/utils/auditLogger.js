const fs = require('fs').promises;
const path = require('path');

function getLogFile() {
  if (process.env.AUDIT_LOG_PATH) {
    return process.env.AUDIT_LOG_PATH;
  }
  return path.join(process.cwd(), 'logs', 'audit.log');
}

// if writing fails print a message and return false,
// so a logging problem can never make the user's request fail.
async function audit(event, details) {
  try {
    const file = getLogFile();
    await fs.mkdir(path.dirname(file), { recursive: true });

    const entry = Object.assign({ timestamp: new Date().toISOString(), event: event }, details);
    await fs.appendFile(file, JSON.stringify(entry) + '\n');
    return true;
  } catch (err) {
    console.error('Could not write to the audit log: ' + err.message);
    return false;
  }
}

module.exports = { audit };