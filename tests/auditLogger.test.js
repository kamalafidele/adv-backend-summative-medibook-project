const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit } = require('../src/utils/auditLogger');

test('creates the logs folder and writes one JSON line per event', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'medibook-'));
  process.env.AUDIT_LOG_PATH = path.join(folder, 'logs', 'audit.log'); // "logs" does not exist yet

  await audit('appointment_booked', { appointmentId: 1 });
  await audit('appointment_cancelled', { appointmentId: 1 });

  const lines = fs.readFileSync(process.env.AUDIT_LOG_PATH, 'utf8').trim().split('\n');
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[0]).event).toBe('appointment_booked');

  delete process.env.AUDIT_LOG_PATH;
  fs.rmSync(folder, { recursive: true, force: true });
});

test('a logging failure does not throw, it just returns false', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'medibook-'));
  const aFile = path.join(folder, 'i-am-a-file');
  fs.writeFileSync(aFile, 'x');
  process.env.AUDIT_LOG_PATH = path.join(aFile, 'audit.log'); // a file cannot contain a folder -> error

  const result = await audit('test', {});
  expect(result).toBe(false);

  delete process.env.AUDIT_LOG_PATH;
  fs.rmSync(folder, { recursive: true, force: true });
});
