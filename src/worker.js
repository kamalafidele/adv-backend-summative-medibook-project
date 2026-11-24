// The WORKER process. Start it separately from the web server:   npm run worker
//  - promotion jobs    : a cancellation freed a slot -> book the next person on the waitlist
//  - notification jobs : a booking was confirmed     -> write the confirmation message to the audit log
const { createRedis } = require('./queue/redis');
const jobQueue = require('./queue/jobQueue');
const waitlist = require('./queue/waitlist');
const waitlistController = require('./controllers/waitlistController');
const notificationController = require('./controllers/notificationController');

let running = true;

function sleep(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

async function main() {
  const client = createRedis();

  // put back anybody left "in progress" by a crash of a previous worker
  await waitlist.recoverProcessing(client);
  console.log('Worker started, waiting for jobs...');

  while (running) {
    let item;
    try {
      // wait up to 5 seconds for a job from either queue
      item = await client.brpop(jobQueue.PROMOTION_QUEUE, jobQueue.NOTIFICATION_QUEUE, 5);
    } catch (err) {
      console.error('Redis problem: ' + err.message);
      await sleep(1000);
      continue;
    }
    if (item === null) {
      continue; // nothing arrived in 5 seconds, wait again
    }

    const queueName = item[0];
    const job = JSON.parse(item[1]);

    try {
      if (queueName === jobQueue.PROMOTION_QUEUE) {
        const message = await waitlistController.promoteFromWaitlist(client, job.data);
        console.log('promotion job done: ' + message);
      } else {
        await notificationController.sendConfirmation(job.data);
        console.log('notification job done');
      }
    } catch (err) {
      console.error('Job failed: ' + err.message);
      await jobQueue.retryJob(client, queueName, job, err.message);
    }
  }

  await client.quit();
  console.log('Worker stopped');
}

// Ctrl+C: finish the current job, then stop
process.on('SIGINT', function () {
  running = false;
});
process.on('SIGTERM', function () {
  running = false;
});

main().catch(function (err) {
  console.error('Worker crashed: ' + err.message);
  process.exit(1);
});
