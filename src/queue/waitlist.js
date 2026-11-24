// The waitlist. There is one Redis list for every doctor and day:
//    waitlist:<doctorId>:<day>              people waiting (newest at the start, oldest at the end)
//    waitlist:processing:<doctorId>:<day>   the person the worker is busy booking right now
//    waitlist:failed                        people who can never be booked (with the reason)
const { redis } = require('./redis');

function queueKey(doctorId, day) {
  return 'waitlist:' + doctorId + ':' + day;
}

function processingKey(doctorId, day) {
  return 'waitlist:processing:' + doctorId + ':' + day;
}

// Adds a patient. Returns { added: true/false, position }
async function addToWaitlist(patientId, doctorId, day, requestedSlot) {
  const key = queueKey(doctorId, day);

  // the same patient cannot join twice
  const waiting = await redis.lrange(key, 0, -1);
  for (let i = 0; i < waiting.length; i++) {
    const entry = JSON.parse(waiting[i]);
    if (entry.patientId === patientId) {
      return { added: false, position: waiting.length - i };
    }
  }

  const newEntry = { patientId: patientId, doctorId: doctorId, day: day, requestedSlot: requestedSlot };
  const length = await redis.lpush(key, JSON.stringify(newEntry));
  return { added: true, position: length };
}

// Takes the oldest waiting person and moves them to the processing list.
async function takeNext(client, doctorId, day) {
  return await client.rpoplpush(queueKey(doctorId, day), processingKey(doctorId, day));
}

// The booking worked: remove the person from the processing list
async function confirmDone(client, doctorId, day, entryText) {
  await client.lrem(processingKey(doctorId, day), 1, entryText);
}

// The booking did not work: put the person back at the FRONT of the line (the end of the list)
async function putBack(client, doctorId, day, entryText) {
  await client.lrem(processingKey(doctorId, day), 1, entryText);
  await client.rpush(queueKey(doctorId, day), entryText);
}


async function moveToFailed(client, doctorId, day, entryText, reason) {
  await client.lrem(processingKey(doctorId, day), 1, entryText);
  const entry = JSON.parse(entryText);
  entry.reason = reason;
  await client.lpush('waitlist:failed', JSON.stringify(entry));
}

// When the worker starts, anything left in a processing list is reprocessed
async function recoverProcessing(client) {
  const keys = await client.keys('waitlist:processing:*');
  for (let i = 0; i < keys.length; i++) {
    const waitlistKey = keys[i].replace('waitlist:processing:', 'waitlist:');
    let entryText = await client.rpop(keys[i]);
    while (entryText) {
      await client.rpush(waitlistKey, entryText);
      entryText = await client.rpop(keys[i]);
    }
  }
}

module.exports = { addToWaitlist, takeNext, confirmDone, putBack, moveToFailed, recoverProcessing };
