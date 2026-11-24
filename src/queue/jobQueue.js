// A very simple job queue using Redis lists.
//   addJob   -> LPUSH puts a job at the start of the list
const { redis } = require('./redis');

const PROMOTION_QUEUE = 'jobs:promotion';
const NOTIFICATION_QUEUE = 'jobs:notification';
const FAILED_QUEUE = 'jobs:failed';
const MAX_ATTEMPTS = 3;

async function addJob(queueName, data) {
  const job = { data: data, attempts: 0 };
  await redis.lpush(queueName, JSON.stringify(job));
}

// Called by the worker when a job crashed: try again, or give up after 3 attempts
async function retryJob(client, queueName, job, errorMessage) {
  job.attempts = job.attempts + 1;
  if (job.attempts >= MAX_ATTEMPTS) {
    const failed = { queue: queueName, job: job, error: errorMessage };
    await client.lpush(FAILED_QUEUE, JSON.stringify(failed));
  } else {
    await client.lpush(queueName, JSON.stringify(job));
  }
}

module.exports = { PROMOTION_QUEUE, NOTIFICATION_QUEUE, addJob, retryJob };
