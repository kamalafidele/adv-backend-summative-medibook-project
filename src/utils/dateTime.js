// Small helpers for dates. Times are the clinic's local time, written as 'YYYY-MM-DD HH:mm:ss'.

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return String(number);
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function formatDateTime(date) {
  return formatDate(date) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

// Turns 'YYYY-MM-DD HH:mm:ss' into a Date object
function parseDateTime(text) {
  const parts = text.split(/[- :T]/);
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1; // JavaScript months start at 0
  const day = Number(parts[2]);
  const hour = Number(parts[3]);
  const minute = Number(parts[4]);
  const second = Number(parts[5] || 0);
  return new Date(year, month, day, hour, minute, second);
}

module.exports = { formatDate, formatDateTime, parseDateTime };
